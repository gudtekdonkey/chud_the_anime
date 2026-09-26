import { zoneAt, emit } from '../ledger.js';
import { hash } from '../rng.js';
import { CLASSES } from '../cultures.js';
import { AGE, CAP, FEEDS, HARVEST, FAMINE_AT, KEEP, HOUSE_PLOTS, worth } from './rules.js';
import { alive, age, zk, zkey, idKey } from './kin.js';

// ---- Settlements: who lives where, what the land feeds, and people moving to where there is room ----
// L.sys.people.settle[key]: { kind, region, cap (people its land feeds; a fort, camp or shrine: its garrison's target), pop, fed, danger }
// L.sys.people.res[key]: the living people whose home is that zone (key "x,y"): rebuilt each season, kept up by births, deaths and moves.
export const SETTLED = new Set(['town', 'village']);
export const KEPT = new Set(['fort', 'camp', 'shrine']);

export function initSettlements(L) {
  const P = L.sys.people; P.settle = {}; P.harvest = {};
  for (const g of L.regions) P.harvest[g.id] = 1;
  for (const z of L.zones) {
    if (!SETTLED.has(z.kind) && !KEPT.has(z.kind)) continue;
    let camps = 0;
    for (let dy = -3; dy <= 3; dy++) for (let dx = -3; dx <= 3; dx++) { const n = zoneAt(L, z.x + dx, z.y + dy); if (n && n.kind === 'camp' && n !== z) camps++; }
    const cap = SETTLED.has(z.kind) ? Math.round(CAP[z.kind] * (FEEDS[z.biome] || 1)) : 0;
    P.settle[z.x + ',' + z.y] = { kind: z.kind, region: z.region, cap, pop: 0, fed: 1, danger: +Math.min(1, camps * .3).toFixed(2) };
  }
  rebuildResidents(L);
}
// every living person with a home, by zone (deterministic: actor ids in the ledger's order). Once a year in full, to catch homes other
// systems changed; each season only the people other systems made since (P.seen: the last actor number looked at)
export function rebuildResidents(L) {
  const P = L.sys.people, res = {}; let homeless = 0;
  for (let n = 1, max = L.ids.a || 0; n <= max; n++) { const id = idKey(n), a = L.actors[id]; if (!a || !a.alive) continue; if (!a.home) { homeless++; continue; } const k = zk(a.home[0], a.home[1]); (res[k] || (res[k] = [])).push(id); }
  P.res = res; P.seen = L.ids.a || 0; P.homeless = homeless;
  for (const k in P.settle) P.settle[k].pop = res[k] ? res[k].length : 0;
}
export function adoptNewcomers(L) {
  const P = L.sys.people, max = L.ids.a || 0;
  for (let n = (P.seen || 0) + 1; n <= max; n++) { const a = L.actors[idKey(n)]; if (a && a.alive && a.home) { const ids = P.res[zkey(a.home)]; if (!ids || !ids.includes(a.id)) addResident(L, a); } }
  P.seen = max;
}
// the settlements of each region, by key (one pass, for the seasonal steps that work region by region)
export function byRegion(L) {
  const P = L.sys.people, out = {};
  for (const k in P.settle) { const s = P.settle[k]; if (SETTLED.has(s.kind)) (out[s.region] || (out[s.region] = [])).push(k); }
  return out;
}
export function residents(L, key) {
  const ids = L.sys.people.res[key], out = [];
  if (ids) for (let i = 0; i < ids.length; i++) { const a = L.actors[ids[i]]; if (a && a.alive) out.push(a); }
  return out;
}
export function addResident(L, a) { if (!a.home) return; const k = zkey(a.home), P = L.sys.people; (P.res[k] || (P.res[k] = [])).push(a.id); if (P.settle[k]) P.settle[k].pop++; }
export function dropResident(L, a) {
  if (!a.home) return; const k = zkey(a.home), P = L.sys.people, ids = P.res[k]; if (!ids) return;
  const i = ids.indexOf(a.id); if (i >= 0) { ids.splice(i, 1); if (P.settle[k]) P.settle[k].pop = Math.max(0, P.settle[k].pop - 1); }
}
export function moveHome(L, a, home) { dropResident(L, a); a.home = home ? [home[0], home[1]] : null; addResident(L, a); }

// the harvest: each region's yield for the year (a blight now and then), then each settlement's fed ratio from it and its crowding
export function rollHarvests(L, r) {
  const P = L.sys.people;
  for (const g of L.regions) { let y = HARVEST.mean + (r.next() + r.next() + r.next() - 1.5) * HARVEST.spread * 2;
    if (r.chance(HARVEST.blight)) y *= HARVEST.blightCut; P.harvest[g.id] = +Math.max(.2, y).toFixed(2); }
}
export function feedSettlements(L) {
  const P = L.sys.people;
  for (const k in P.settle) {
    const s = P.settle[k], h = P.harvest[s.region] ?? 1;
    let fed = SETTLED.has(s.kind) ? h * s.cap / Math.max(1, s.pop) : Math.min(1, h / FAMINE_AT);
    if (s.fedCap && s.fedCap.until > L.hour) fed = Math.min(fed, s.fedCap.fed);   // the economy lane's famine (econ.famine)
    const was = s.fed; s.fed = +Math.max(0, Math.min(1.3, fed)).toFixed(2);
    if (SETTLED.has(s.kind) && s.fed < FAMINE_AT && was >= FAMINE_AT) { const [x, y] = k.split(',').map(Number); emit(L, 'people.hunger', { zone: [x, y], region: s.region, fed: s.fed }); }
  }
}
// another system says a place is starving: cap its fed for a season (docs/sim-people.md: econ.famine)
export function starve(L, key, fed, hours) { const s = L.sys.people.settle[key]; if (s) s.fedCap = { fed, until: L.hour + hours }; }

// a free plot in a settlement zone: never titled to a living person (the lord's own land, or nature)
export function freePlot(L, z) {
  const reg = L.regions[z.region];
  for (let n = 1; n <= HOUSE_PLOTS; n++) {
    const pid = `${z.x},${z.y}:${n}`, rec = L.plots[pid];
    if (!rec) return pid;
    const t = rec.title != null ? L.actors[rec.title] : null;
    if ((!t || !t.alive || (reg && rec.title === reg.lord)) && (rec.holder == null || rec.holder === rec.title)) return pid;
  }
  return null;
}
export function grantPlot(L, pid, a) {
  const old = L.plots[pid], was = old && old.title != null ? L.actors[old.title] : null;
  if (was && was.holds) { const i = was.holds.indexOf(pid); if (i >= 0) was.holds.splice(i, 1); }
  L.plots[pid] = { ...(old || {}), title: a.id, holder: a.id };
  if (!a.holds.includes(pid)) a.holds.push(pid);
}

// ---- moving: crowded settlements send young people and landless households to places in their region (then their culture) with room;
// they arrive landless (tenants) and want land ----
export function migrate(L, r) {
  const P = L.sys.people, keys = Object.keys(P.settle).filter(k => SETTLED.has(P.settle[k].kind));
  const room = k => { const s = P.settle[k]; return s.pop / Math.max(1, s.cap); };
  for (const k of keys) {
    const s = P.settle[k]; if (s.pop <= s.cap * 1.12) continue;
    let over = Math.ceil(s.pop - s.cap * 1.02);
    const z = zoneAt(L, ...k.split(',').map(Number)), cult = L.regions[z.region].culture;
    const dests = keys.filter(d => d !== k && room(d) < .9 && (P.settle[d].region === s.region || L.regions[P.settle[d].region].culture === cult))
      .sort((a, b) => (P.settle[a].region === s.region ? 0 : 1) - (P.settle[b].region === s.region ? 0 : 1) || room(a) - room(b));
    if (!dests.length) continue;
    // who goes: landless households whole, then young unmarried adults on their own; never a landholder or the house's heir
    const people = residents(L, k), goers = [];
    for (const a of people) if (a.household === a.id && !a.holds.length && a.lord == null && a.id !== L.player) goers.push([a, people.filter(m => m.household === a.id)]);
    for (const a of people) { const ag = age(L, a); if (a.household !== a.id && a.spouse == null && ag >= AGE.ADULT && ag < 30 && !a.holds.length && a.lord == null) goers.push([a, [a]]); }
    let di = 0, moved = 0;
    for (const [head, group] of r.shuffle(goers)) {
      if (over <= 0 || di >= dests.length) break;
      const d = dests[di], dz = zoneAt(L, ...d.split(',').map(Number)), home = [dz.x, dz.y];
      if (group.some(m => m.home[0] !== z.x || m.home[1] !== z.y)) continue;   // already moved with another group
      for (const m of group) moveHome(L, m, home);
      if (head.household !== head.id) head.household = head.id;
      if (!head.ambition) head.ambition = { kind: 'land', since: L.hour };
      over -= group.length; moved += group.length;
      if (room(d) >= .9) di++;
    }
    if (moved) { P.stats.migrated += moved; emit(L, 'people.migrated', { zone: [z.x, z.y], region: z.region, n: moved }); }
  }
}

// ---- new houses: a married man still in his father's (or brother's) house founds his own once he holds land (the economy lane sells it;
// owner 2026-09-26: no free plots from the lord), or, landless, as a tenant once he has a child of his own. His wife and unmarried children
// come with him; the house's heir stays ----
export function foundHouses(L) {
  const P = L.sys.people;
  for (const k in P.settle) {
    const s = P.settle[k]; if (!SETTLED.has(s.kind)) continue;
    for (const a of residents(L, k)) {
      if (a.sex !== 'm' || a.spouse == null || a.household === a.id || a.household == null || a.id === L.player) continue;
      const head = alive(L, a.household);
      if (head && head.heir === a.id) continue;   // taken in as the house's heir
      if (!a.holds.length) {
        if (!a.children.some(c => L.actors[c] && L.actors[c].alive)) continue;
        if (head && a.parents[0] === head.id && !head.children.some(c => c !== a.id && L.actors[c] && L.actors[c].alive && L.actors[c].sex === 'm' && L.actors[c].born < a.born)) continue;   // the eldest son stays
        P.stats.tenants++;
      } else { P.stats.founded++; if (a.ambition && a.ambition.kind === 'land') a.ambition = null; }
      a.household = a.id;
      for (const m of residents(L, k)) if (m.id !== a.id && (m.id === a.spouse || (m.parents.includes(a.id) && m.spouse == null))) m.household = a.id;
    }
  }
}

// ---- garrisons, bands and temples keep their numbers from their region's young (a hungry, broke young man turns bandit) ----
export function recruit(L, r) {
  const P = L.sys.people; let regions = null;
  for (const k in P.settle) {
    const s = P.settle[k]; if (!KEPT.has(s.kind)) continue;
    const [x, y] = k.split(',').map(Number), z = zoneAt(L, x, y);
    if (z.kind !== s.kind) continue;                     // a base destroyed or taken is no longer kept
    if (s.pop >= KEEP[s.kind][0]) continue;
    const need = r.int(...KEEP[s.kind]) - s.pop, pool = [];
    // the region's villages first; a band or a temple with too few there draws on its whole culture
    for (const kk of (regions || (regions = byRegion(L)))[s.region] || []) pool.push(...residents(L, kk));
    if (pool.length < 40) for (const g of L.cultures[L.regions[s.region].culture].regions) if (g !== s.region) for (const kk of regions[g] || []) pool.push(...residents(L, kk));
    const fits = pool.filter(a => {
      const ag = age(L, a); if (a.spouse != null || a.holds.length || a.lord != null || a.household === a.id || a.id === L.player || a.dynasty) return false;
      if (s.kind === 'shrine') return ag >= AGE.ADULT && ag < 40;
      return a.sex === 'm' && ag >= AGE.ADULT && ag < 32 && (s.kind === 'camp' || ['commoner', 'ashigaru', 'rebel', 'retainer'].includes(a.cls));
    });
    if (s.kind === 'camp') fits.sort((a, b) => worth(a.money) - worth(b.money) || (a.id < b.id ? -1 : 1));   // the broke go first
    else r.shuffle(fits);
    const chief = s.kind === 'camp' ? z.holder : null;
    for (let i = 0; i < need && fits.length; i++) {
      const a = fits.shift();
      if (s.kind === 'fort') { if (a.cls !== 'retainer') { a.cls = 'ashigaru'; a.rank = CLASSES.ashigaru.rank; } a.job = a.cls === 'retainer' ? 'retainer' : 'ashigaru'; a.household = null; }
      if (s.kind === 'camp') { a.cls = 'outlaw'; a.rank = CLASSES.outlaw.rank; a.job = 'bandit'; a.household = chief || null; emit(L, 'people.turnedOutlaw', { actor: a.id, zone: [x, y], region: s.region }); }
      if (s.kind === 'shrine') { a.cls = 'monk'; a.rank = CLASSES.monk.rank; a.job = 'monk'; a.household = null; }
      moveHome(L, a, [x, y]); P.stats.recruited++;
      if (s.kind === 'camp' && !z.holder) { z.holder = a.id; a.chief = true; }
    }
  }
}
// a grave's tile: every settlement buries its dead in one corner of its zone (seeded per zone); anyone else where they fell
export function graveTile(L, zone, id) {
  const h = hash(L.seed, 'graveyard', zone[0], zone[1]), n = hash(id);
  return [6 + h % 8 + n % 6, 48 + (h >> 8) % 8 + (n >> 4) % 4];
}
