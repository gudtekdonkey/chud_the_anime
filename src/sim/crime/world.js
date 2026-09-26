import { emit, newId, zoneAt } from '../ledger.js';
import { ageOf } from '../actors.js';
import { TIME } from '../time.js';
import { WORLD, K, CRIMES } from './rules.js';
import { crimeState, commit, kill, isPlayer, honourOf, bountyOf, clearBounty, spend, purse, WEEK } from './law.js';
import { seize, takePlotByMurder } from './land.js';

// ---- The world without him: NPC crime and justice, off screen, once a game day (docs/sim-crime.md) ----
// Worked by region (100) and camp (~90), never by person or tile: a few dice per region a day, so a day costs well under a millisecond.

// ---- who lives where: derived from the ledger, rebuilt each year (a cache, not state: nothing here is saved; the dead are skipped) ----
const INDEX = new WeakMap();
function index(L, year) {
  let X = INDEX.get(L);
  if (X && X.year === year) return X;
  const w = L.size.w, byRegion = L.regions.map(() => []), heads = L.regions.map(() => []), byZone = new Map();
  for (const id in L.actors) { const a = L.actors[id]; if (!a.alive || !a.home || isPlayer(L, id)) continue;
    const z = zoneAt(L, a.home[0], a.home[1]); if (!z || z.region < 0) continue; const zi = z.y * w + z.x;
    byRegion[z.region].push(id); (byZone.get(zi) || byZone.set(zi, []).get(zi)).push(id);
    if (a.holds.length && a.holds.some(p => L.plots[p]?.holder === id)) heads[z.region].push(id); }
  const places = L.zones.filter(z => z.kind === 'town' || z.kind === 'village');
  const camps = L.zones.filter(z => z.kind === 'camp').map(z => ({ zi: z.y * w + z.x,
    targets: places.filter(v => Math.abs(v.x - z.x) + Math.abs(v.y - z.y) <= WORLD.RAID_REACH).map(v => v.y * w + v.x) })).filter(c => c.targets.length);
  X = { year, byRegion, heads, byZone, camps };
  INDEX.set(L, X); return X;
}
const living = (L, r, ids, not = []) => { if (!ids || !ids.length) return null;
  for (let i = 0; i < 6; i++) { const id = r.pick(ids), a = L.actors[id]; if (a.alive && !not.includes(id) && ageOf(L, a) >= 14) return id; } return null; };
// who turns to crime: of a few, the one most likely to (an outlaw, low karma, poor, little honour)
function culprit(L, r, ids, not = []) {
  let best = null, bw = -1e9;
  for (let i = 0; i < 3; i++) { const id = living(L, r, ids, not); if (id == null) continue; const a = L.actors[id];
    const w = (a.cls === 'outlaw' ? 3 : a.cls === 'shinobi' ? 1.5 : 1) * (1 + Math.max(0, -(a.karma || 0)) / 30) * (purse(a) < 30 ? 1.5 : 1) - honourOf(a) * .5 + r.next() * .3;
    if (w > bw) { bw = w; best = id; } }
  return best;
}
// who saw it: people of the zone, by the place and the hour
function witnesses(L, r, X, zone, not) {
  const z = zoneAt(L, zone[0], zone[1]), hour = r.int(0, 23), night = hour >= TIME.DUSK || hour < TIME.DAWN;
  const p = (WORLD.SEEN[z.kind] ?? WORLD.SEEN.wild) * (night ? .5 : 1);
  if (!r.chance(p)) return [];
  const ids = X.byZone.get(z.y * L.size.w + z.x), out = [];
  for (let i = 0, n = r.int(1, 3); i < n; i++) { const w = living(L, r, ids, not); if (w != null && !out.includes(w)) out.push(w); }
  return out;
}
const masked = (L, r, id) => r.chance(WORLD.MASK[L.actors[id].cls] ?? WORLD.MASK_ELSE);

function one(L, r, X, kind, perp, victim, o = {}) {
  const v = L.actors[victim], zone = v.home;
  return commit(L, kind, { by: perp, victim, zone, witnesses: witnesses(L, r, X, zone, [perp, victim]), masked: masked(L, r, perp), ...o });
}

export function worldDay(L, cal, r) {
  const C = crimeState(L), X = index(L, cal.year);
  for (const g of L.regions) {
    const ids = X.byRegion[g.id]; if (!ids.length) continue;
    const f = ids.length / WORLD.NORM * (WORLD.KIND[L.cultures[g.culture].kind] ?? 1);
    if (r.chance(WORLD.THEFT * f)) { const p = culprit(L, r, ids), v = p && living(L, r, ids, [p]); if (v) one(L, r, X, 'theft', p, v, { value: L.actors[v].money.mon * r.range(.1, .4) }); }
    if (r.chance(WORLD.ASSAULT * f)) { const p = culprit(L, r, ids), v = p && living(L, r, ids, [p]); if (v) one(L, r, X, 'assault', p, v); }
    if (r.chance(WORLD.MURDER * f)) { const p = culprit(L, r, ids), v = p && living(L, r, ids, [p]); if (v) one(L, r, X, 'murder', p, v); }
    if (r.chance(WORLD.PLOT_MURDER * f)) {   // a man who wants his neighbour's land
      const v = living(L, r, X.heads[g.id]), p = v && culprit(L, r, ids, [v]), pid = v && L.actors[v].holds.find(q => L.plots[q]?.holder === v);
      if (p && pid && !L.actors[p].holds.length) takePlotByMurder(L, p, v, pid, { witnesses: witnesses(L, r, X, L.actors[v].home, [p, v]), masked: masked(L, r, p) }); }
    if (r.chance(WORLD.REGICIDE) && g.lord != null && L.actors[g.lord]?.alive) { const p = culprit(L, r, ids, [g.lord]); if (p) one(L, r, X, 'murder', p, g.lord); }
    if (r.chance(WORLD.FEUD * f)) { const a = living(L, r, X.heads[g.id]), b = a && living(L, r, X.heads[g.id], [a]);
      if (b) { C.feuds.push({ a, b, region: g.id, heat: 1, since: L.hour }); C.stats.feuds++; emit(L, 'crime.feud', { actor: a, victim: b, region: g.id }); } }
  }
  feudDay(L, r, X);
  for (const c of X.camps) if (r.chance(WORLD.RAID)) raid(L, r, X, c);
  catchDay(L, r, cal.day);
}

// a feud flares now and then; a killing passes it to the dead man's kin (kill a man and his brother remembers)
function feudDay(L, r, X) {
  const C = crimeState(L);
  C.feuds = C.feuds.filter(fd => {
    const A = L.actors[fd.a], B = L.actors[fd.b];
    if (!A?.alive || !B?.alive || (fd.heat -= WORLD.FEUD_COOL) <= 0) return false;
    if (!r.chance(WORLD.FEUD_ACT)) return true;
    const [p, v] = r.chance(.5) ? [fd.a, fd.b] : [fd.b, fd.a];
    if (!r.chance(WORLD.FEUD_MURDER)) { one(L, r, X, 'assault', p, v); return true; }
    one(L, r, X, 'murder', p, v);
    const kin = (L.actors[v].children || []).find(k => L.actors[k]?.alive && ageOf(L, L.actors[k]) >= 16) ?? (L.actors[v].spouse != null && L.actors[L.actors[v].spouse]?.alive ? L.actors[v].spouse : null);
    if (kin == null) return false;
    fd.b = kin; fd.a = p; fd.heat = .6; return true;
  });
}

// bandits raid a village within reach: rob households, kill some, now and then seize a plot (possession, never the title)
function raid(L, r, X, camp) {
  const z = L.zones[camp.zi], chief = L.actors[z.holder]; if (!chief?.alive) return;
  const band = (X.byZone.get(camp.zi) || []).filter(id => L.actors[id].alive).slice(0, 4), tz = L.zones[r.pick(camp.targets)];
  const folk = X.byZone.get(tz.y * L.size.w + tz.x) || [];
  if (!band.length || !folk.length) return;
  const C = crimeState(L); C.stats.raids++;
  const heads = folk.filter(id => L.actors[id].alive && L.actors[id].holds.length), n = Math.min(heads.length, r.int(1, 3)), hit = [];
  for (let i = 0; i < n; i++) { const v = r.pick(heads), raider = r.pick(band); if (hit.includes(v)) continue; hit.push(v);
    const wit = witnesses(L, r, X, [tz.x, tz.y], [raider, v]);
    commit(L, 'theft', { by: chief.id, victim: v, zone: [tz.x, tz.y], witnesses: wit, victimSaw: true, value: L.actors[v].money.mon * r.range(...WORLD.RAID_TAKE) });
    if (r.chance(WORLD.RAID_KILL)) commit(L, 'murder', { by: raider, victim: v, zone: [tz.x, tz.y], witnesses: wit }); }
  emit(L, 'crime.raid', { actor: chief.id, zone: [tz.x, tz.y], from: [z.x, z.y], victims: hit, culture: L.regions[tz.region].culture });
  if (r.chance(WORLD.RAID_SEIZE)) { const v = L.actors[r.pick(hit)], pid = v && v.holds.find(q => L.plots[q]?.holder === v.id);
    if (pid) seize(L, pid, chief.id, { how: 'raid', witnesses: folk.slice(0, 5) }); }
}

// magistrates and hunters catch some of the wanted: a fine for the light crimes, the sword for killers (most of the time)
// (once a WEEK, the chance compounded, to keep the day cheap)
function catchDay(L, r, day) {
  const C = crimeState(L); if (day % WEEK) return;
  for (const id in C.bounty) { if (isPlayer(L, id)) continue; const a = L.actors[id];
    if (!a?.alive) { delete C.bounty[id]; continue; }
    for (const c in C.bounty[id]) { const b = C.bounty[id][c];
      const p = (WORLD.CATCH + (L.cultures[c] && a.culture === +c ? WORLD.CATCH_HOME : 0)) * (a.chief ? WORLD.CATCH_CHIEF : 1);
      if (!r.chance(1 - (1 - p) ** WEEK)) continue;
      C.stats.caught++;
      if (CRIMES[b.worst].rank >= CRIMES.murder.rank && r.chance(WORLD.EXECUTE)) {
        kill(L, a, 'executed'); C.stats.executed++; delete C.bounty[id];
        emit(L, 'crime.executed', { actor: id, culture: +c, worst: b.worst, zone: a.home }); break; }
      const fine = Math.min(purse(a), Math.round(b.mon)); spend(a, fine); C.stats.fined++; clearBounty(L, id, c);
      emit(L, 'crime.caught', { actor: id, culture: +c, worst: b.worst, fine, zone: a.home }); break; }
  }
}

// ---- hunters: a big enough bounty on him sends someone looking. They walk a zone a day toward where he is ----
export function huntersDay(L, cal, r) {
  const X = index(L, cal.year), C = crimeState(L), me = L.actors[L.player]; if (!me) return;
  C.hunters = C.hunters.filter(h => {
    const a = L.actors[h.actor];
    if (!a?.alive || !me.alive || bountyOf(L, me.id, h.culture) < K.HUNT_GIVE_UP || L.hour - h.since > K.HUNT_DAYS * 24) {
      emit(L, 'crime.hunterGone', { actor: h.actor, target: me.id }); return false; }
    if (!me.at) return true;
    h.at = [h.at[0] + Math.sign(me.at[0] - h.at[0]), h.at[1] + Math.sign(me.at[1] - h.at[1])];
    const here = h.at[0] === me.at[0] && h.at[1] === me.at[1];
    if (here && !h.found) emit(L, 'crime.hunterFound', { actor: h.actor, target: me.id, culture: h.culture, zone: h.at });
    h.found = here; return true;
  });
  for (const c in C.bounty[me.id] || {}) {
    const mon = C.bounty[me.id][c].mon;
    if (mon < K.HUNT_BOUNTY || C.hunters.length >= K.HUNT_MAX || C.hunters.some(h => h.culture === +c) || !r.chance(Math.min(K.HUNT_CAP, mon * K.HUNT_PER_MON))) continue;
    const cult = L.cultures[c], seat = L.regions[r.pick(cult.regions)].seat;
    // a bounty hunter of that people, else a ronin, else any fighting man
    const all = cult.regions.flatMap(g => X.byRegion[g]).filter(id => L.actors[id].alive && L.actors[id].culture === +c && ageOf(L, L.actors[id]) >= 16);
    const hunters = all.filter(id => L.actors[id].job === 'bounty hunter'), ronin = all.filter(id => L.actors[id].cls === 'ronin');
    const fighters = all.filter(id => L.actors[id].rank >= 2 && L.actors[id].cls !== 'monk');
    const pool = hunters.length ? hunters : ronin.length ? ronin : fighters;
    if (!pool.length) continue;
    const hunter = r.pick(pool);
    const h = { id: newId(L, 'hunt'), actor: hunter, target: me.id, culture: +c, at: seat.slice(), since: L.hour, found: false };
    C.hunters.push(h); C.stats.hunters++;
    emit(L, 'crime.hunterSent', { actor: hunter, target: me.id, culture: +c, mon: Math.round(mon), zone: h.at });
  }
}
