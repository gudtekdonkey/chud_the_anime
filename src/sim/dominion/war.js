import { emit, zoneAt } from '../ledger.js';
import { marry, ageOf } from '../actors.js';
import { plotId } from '../zone.js';
import { N, TRAIT, traitSum } from './data.js';
import { D, key, unkey, alive, lordOf, setZone, top, sameSide, fealtyChanged, landOf, landOfKey } from './land.js';
import { damage, passBuildings } from './build.js';
import { officeQ, swear } from './govern.js';
import { menOf, strength, armiesAt, march, atWar, moveDay } from './army.js';
import { addKarma, addStanding, gain, spend, worth, killActor, transferTitle } from './seams.js';

// ---- War: a reason or a karma cost, campaigns along the roads, sieges, battles resolved in the ledger when he is absent, possession
// changing hands, and peace treaties that transfer titles (cession, tribute, marriage, hostages, fealty) (docs/dominion.md section 6) ----
// A war (L.sys.dominion.wars[id]): { id, a (attacker: the top of his chain), d (defender), reason, goal "x,y" | null, started, score (from a's side,
//   -100..100), battles: [{ h, k, win: 'a' | 'd', la, ld }], taken: ["x,y"], end (hour) | null, how, treaty }
export const sideOf = (L, w, lord) => sameSide(L, w.a, lord) ? 'a' : sameSide(L, w.d, lord) ? 'd' : null;
export const activeWars = L => D(L).active.map(id => D(L).wars[id]);   // the wars still being fought (L.sys.dominion.active: their ids)

// a reason to go to war: a claim (his title, their possession), a grudge, a culture's hatred, a rising against a liege
export function reasonFor(L, a, b) {
  const d = D(L), la = d.lords[a], lb = d.lords[b]; if (!la || !lb) return null;
  if (la.liege === b) return 'rebellion';
  if (la.titles.some(k => d.zt[k].holder && sameSide(L, d.zt[k].holder, b)) || la.claims.some(k => d.zt[k] && sameSide(L, d.zt[k].holder, b))) return 'claim';
  if ((la.grudges[b] || 0) >= .4 || (la.grudges[top(L, b)] || 0) >= .4) return 'grudge';
  const ca = L.actors[a].culture, cb = L.actors[b].culture;
  if (ca != null && cb != null && ca !== cb && (L.cultures[ca].relations[cb] ?? 0) <= -.5) return 'hatred';
  return null;
}
export function declareWar(L, a, b, { reason, goal = null, story = false } = {}) {
  const d = D(L); if (!alive(L, a) || !alive(L, b) || a === b) return { error: 'no one to fight' };
  const la = lordOf(L, a); let ta = top(L, a), tb = top(L, b);
  const why = reason || reasonFor(L, a, b);
  if (why === 'rebellion' || la.liege === b) { emit(L, 'dom.fealty', { actor: a, liege: null, was: la.liege, how: 'broke' }); la.liege = null; fealtyChanged(L); ta = a; tb = top(L, b); }
  else if (la.liege) return { error: 'a vassal cannot declare war; his liege does' };
  if (ta === tb) return { error: 'they are on the same side' };
  if (atWar(L, ta, tb)) return { error: 'already at war' };
  if ((la.truce[tb] || 0) > L.hour && !story) return { error: 'a truce holds' };
  if (!why) { addKarma(L, a, -25); addStanding(L, a, L.actors[tb].culture, -.3); }   // war without a reason costs karma and standing
  const id = `war${(L.ids.war = (L.ids.war || 0) + 1)}`, w = { id, a: ta, d: tb, reason: why || 'none', goal, started: L.hour, score: 0, battles: [], taken: [], end: null, how: null, treaty: null, story };
  d.wars[id] = w; d.active.push(id); lordOf(L, ta).wars.push(id); lordOf(L, tb).wars.push(id);
  const lb = lordOf(L, tb); lb.grudges[ta] = +Math.min(1, (lb.grudges[ta] || 0) + .3).toFixed(2);
  emit(L, 'war.declared', { war: id, a: ta, d: tb, reason: w.reason, goal: goal ? unkey(goal) : null, story, zone: goal ? unkey(goal) : null });
  return w;
}

// every settlement a side holds (for targets)
function sideZones(L, t) { const out = []; for (const l of Object.values(D(L).lords)) if (l.zones.length && alive(L, l.id) && top(L, l.id) === t) for (const k of l.zones) if (D(L).set[k]) out.push(k); return out; }
const dist = (a, [x, y]) => { const [ax, ay] = unkey(a); return Math.abs(ax - x) + Math.abs(ay - y); };

// ---- every day: NPC armies take orders, march, meet, besiege; wars end in peace ----
export function warDay(L, cal, r) {
  const d = D(L), wars = activeWars(L); let byTop = null;
  for (const w of wars) {
    if ((cal.day + hashId(w.id)) % 3) continue;
    if (!byTop) { byTop = new Map(); for (const id in d.armies) { const a = d.armies[id]; if (alive(L, a.lord)) { const t = top(L, a.lord); (byTop.get(t) || byTop.set(t, []).get(t)).push(a); } } }
    const as = (byTop.get(w.a) || []).concat(byTop.get(w.d) || []), idle = as.filter(a => !a.go && !a.siege && a.lord !== L.player && !(a.rest > L.hour));
    if (!idle.length) continue;
    const side = {}; for (const a of as) side[a.id] = sideOf(L, w, a.lord);
    const lost = { a: [], d: [] }; for (const k of occupied(L)) { const z = d.zt[k]; const ts = sideOf(L, w, z.title), hs = sideOf(L, w, z.holder); if (ts && hs && ts !== hs) lost[ts].push(k); }
    const ctx = { as, side, lost, targets: { a: sideZones(L, w.d), d: sideZones(L, w.a) } };   // (orders keep each army to its own island)
    for (const a of idle) orders(L, w, a, ctx, r);
  }
  const moved = new Set(Object.keys(d.pending)), sieges = [];
  for (const id in d.armies) { const a = d.armies[id]; if (a.siege) sieges.push(a);
    if (a.go) { const was = a.go; const at0 = a.at[0], at1 = a.at[1]; const arrived = moveAll(L, a); if (a.at[0] !== at0 || a.at[1] !== at1 || arrived) moved.add(a.at[0] + ',' + a.at[1]); if (arrived && was.why === 'raid') raid(L, a, key(...a.at), r); else if (arrived && was.why === 'war') { const k = key(...a.at), w = d.wars[was.war];
      if (w && !w.end && d.set[k] && d.zt[k] && d.zt[k].holder && atWar(L, a.lord, d.zt[k].holder) && !a.siege) startSiege(L, w, a, k); } }
  }
  meet(L, moved, r);
  for (const a of sieges) if (a.siege && d.armies[a.id]) siegeDay(L, a, r);
  for (const w of wars) if (!w.end && (cal.day + hashId(w.id)) % 7 === 0) peaceCheck(L, w, r);
}
// zones held by someone other than their lord on paper (cached per hour)
const OCC = new WeakMap();
function occupied(L) { let c = OCC.get(L); if (!c || c.h !== L.hour) { c = { h: L.hour, k: Object.keys(D(L).zt).filter(k => { const z = D(L).zt[k]; return z.title && z.holder && z.title !== z.holder; }) }; OCC.set(L, c); } return c.k; }
const hashId = id => { let h = 0; for (const c of id) h = (h * 31 + c.charCodeAt(0)) >>> 0; return h; };
const moveAll = (L, a) => moveDay(L, a);

// what an idle army does in a war: the attacker goes for the goal or the nearest enemy settlement; the defender drives out invaders,
// retakes what it lost, strikes back when strong, or holds
function orders(L, w, a, ctx, r) {
  const d = D(L), side = ctx.side[a.id], foe = side === 'a' ? w.d : w.a;
  const mine = ctx.as.filter(x => ctx.side[x.id] === side), theirs = ctx.as.filter(x => ctx.side[x.id] !== side);
  const my = mine.reduce((s, x) => s + strength(L, x), 0), their = theirs.reduce((s, x) => s + strength(L, x), 0);
  a.rest = L.hour + 24 * 9;   // an army that holds thinks again in nine days (a march clears it)
  if (menOf(a) < 4 || a.morale < .25) { if (key(...a.at) !== a.home) march(L, a.id, unkey(a.home), 'home'); return; }
  const me = L.actors[a.lord], bold = traitSum(me, TRAIT.bold), clever = me.int ?? .5;
  // invaders in our land
  const inv = theirs.filter(x => { const z = d.zt[key(...x.at)]; return z && z.holder && sameSide(L, z.holder, a.lord) && dist(key(...x.at), a.at) <= 12; }).sort((x, y) => dist(key(...x.at), a.at) - dist(key(...y.at), a.at))[0];
  if (inv && strength(L, a) * (1 + bold * .3) > strength(L, inv) * (.6 + clever * .6)) return march(L, a.id, [...inv.at], 'war', w.id);
  // our land they hold (title ours, holder theirs)
  const isle = landOf(L, ...a.at), reach = k => landOfKey(L, k) === isle;
  const lost = ctx.lost[side].filter(reach).sort((x, y) => dist(x, a.at) - dist(y, a.at))[0];
  if (lost) return march(L, a.id, unkey(lost), 'war', w.id);
  if (side === 'd' && my < their * (1.1 - bold * .2)) { if (key(...a.at) !== a.home) march(L, a.id, unkey(a.home), 'home'); return; }
  const goal = w.goal && reach(w.goal) && d.zt[w.goal] && sameSide(L, d.zt[w.goal].holder, foe) ? w.goal : ctx.targets[side].filter(reach).sort((x, y) => dist(x, a.at) - dist(y, a.at))[0];
  if (goal && dist(goal, a.at) <= 40) march(L, a.id, unkey(goal), 'war', w.id);
}

// armies of warring sides in one zone fight (only where an army came today, or a battle waits for him)
function meet(L, moved, r) {
  const d = D(L); if (!d.active.length) return;
  for (const k of moved) {
    const list = armiesAt(L, k); if (list.length < 2) continue;
    for (const w of activeWars(L)) {
      const A = list.filter(a => sideOf(L, w, a.lord) === 'a' && d.armies[a.id]), B = list.filter(a => sideOf(L, w, a.lord) === 'd' && d.armies[a.id]);
      if (A.length && B.length) battle(L, w, A, B, k, r);
    }
  }
}
const TERRAIN = { hills: 1.25, mountains: 1.4, forest: 1.15, bamboo: 1.15, marsh: 1.1 };
const generalF = (L, lord) => { const l = D(L).lords[lord], g = l && l.off.general && alive(L, l.off.general) ? L.actors[l.off.general] : L.actors[lord];
  return g ? .85 + .3 * officeQ(L, g, 'general').q : 1; };
// a battle in the ledger: numbers, training, equipment, morale, supply (strength), terrain and walls for the side that holds the ground,
// the generals' personality and intelligence. When he is in the zone and one of the armies is his, it waits a day for the live fight
export function battle(L, w, A, B, k, r) {
  const d = D(L), [x, y] = unkey(k), z = zoneAt(L, x, y), ground = d.zt[k] && d.zt[k].holder;
  if (A.concat(B).some(a => a.lord === L.player) && L.actors[L.player].at && key(...L.actors[L.player].at) === k) {
    const p = d.pending[k]; if (!p) { d.pending[k] = { war: w.id, h: L.hour }; emit(L, 'war.ready', { war: w.id, zone: [x, y] }); return; }
    if (L.hour - p.h < 24) return; delete d.pending[k];
  }
  const s = d.set[k], hold = side => ground && sameSide(L, ground, side === 'a' ? w.a : w.d) ? (TERRAIN[z.biome] || 1) * (1 + (s ? s.walls * .3 : 0)) : 1;
  const pa = A.reduce((t, a) => t + strength(L, a), 0) * generalF(L, A[0].lord) * hold('a'), pb = B.reduce((t, a) => t + strength(L, a), 0) * generalF(L, B[0].lord) * hold('d');
  return fight(L, w, A, B, k, pa, pb, r);
}
function fight(L, w, A, B, k, pa, pb, r, { siege = false } = {}) {   // A: the attacker's side, B: the defender's
  const win = r.next() < pa * pa / (pa * pa + pb * pb + 1e-9) ? 'a' : 'd';
  const [W, Lo, pw, pl] = win === 'a' ? [A, B, pa, pb] : [B, A, pb, pa];
  const fierce = 1 + .15 * Math.min(1, traitSum(L.actors[A[0].lord], TRAIT.bold) + traitSum(L.actors[B[0].lord], TRAIT.bold));
  const lw = hurt(L, W, Math.min(.5, (.06 + .2 * pl / (pw + 1e-9)) * fierce), r), ll = hurt(L, Lo, Math.min(.9, (.3 + .3 * r.next()) * fierce), r);
  for (const a of W) a.morale = Math.min(1, a.morale + .15);
  for (const a of Lo) { a.morale = Math.max(0, a.morale - .3); if (D(L).armies[a.id] && !siege) march(L, a.id, unkey(a.home), 'home'); }
  lordOf(L, W[0].lord).glory = (lordOf(L, W[0].lord).glory || 0) + 1;
  const la = win === 'a' ? lw : ll, ld = win === 'a' ? ll : lw;
  w.score = Math.max(-100, Math.min(100, w.score + (win === 'a' ? 1 : -1) * (10 + Math.min(20, (la + ld) / 5))));
  w.battles.push({ h: L.hour, k, win, la, ld }); if (w.battles.length > 20) w.battles.shift();
  emit(L, 'war.battle', { war: w.id, zone: unkey(k), winner: win === 'a' ? w.a : w.d, a: { lord: A[0].lord, men: A.reduce((t, a) => t + menOf(a), 0) + la, lost: la },
    d: { lord: B[0].lord, men: B.reduce((t, a) => t + menOf(a), 0) + ld, lost: ld }, siege });
  return win;
}
// losses spread over the squads; an officer can fall with his men
function hurt(L, armies, frac, r) {
  let lost = 0;
  for (const a of armies) { if (!D(L).armies[a.id]) continue;
    for (const q of a.sq) { const k = Math.round(q.n * frac * r.range(.8, 1.2)); q.n -= Math.min(q.n, k); lost += Math.min(q.n + k, k);
      if (q.off && r.chance(frac * .4)) { killActor(L, q.off, 'battle'); emit(L, 'war.fallen', { actor: q.off, army: a.id }); q.off = null; } }
    a.sq = a.sq.filter(q => q.n > 0); if (!a.sq.length) delete D(L).armies[a.id]; }
  return lost;
}

// ---- sieges: the garrison (a tenth of the people) behind its walls, on its stores; the besiegers forage and wait, or storm it ----
function startSiege(L, w, a, k) {
  const s = D(L).set[k]; a.siege = k; a.siegeDays = 0; s.siege = a.id; s.hit = L.hour;
  if ((w.sieged || (w.sieged = [])).includes(k)) return; w.sieged.push(k);
  emit(L, 'war.siege', { war: w.id, army: a.id, actor: a.lord, zone: unkey(k), name: s.name, walls: s.walls });
}
function siegeDay(L, a, r) {
  const d = D(L), k = a.siege, s = d.set[k], z = d.zt[k], w = activeWars(L).find(x => sideOf(L, x, a.lord) && z && z.holder && sideOf(L, x, z.holder) && sideOf(L, x, a.lord) !== sideOf(L, x, z.holder));
  if (!s || !w || key(...a.at) !== k) { a.siege = null; if (s && s.siege === a.id) s.siege = null; return; }
  a.siegeDays++; s.hit = L.hour; a.sup = Math.min(30, a.sup + .5);   // foraging the fields round it
  const store = N.SIEGE_STORE + (s.cnt.granary || 0) * 30 + s.store * 2, starving = a.siegeDays > store;
  const garrison = Math.max(1, s.pop * .1 * .5 * (starving ? Math.max(.2, 1 - (a.siegeDays - store) * .05) : 1)) + armiesAt(L, k).filter(x => x.lord !== a.lord && sameSide(L, x.lord, z.holder)).reduce((t, x) => t + strength(L, x), 0);
  const shin = a.sq.filter(q => q.cls === 'shinobi').reduce((t, q) => t + q.n, 0);
  const walls = 1 + s.walls * .6 / (1 + Math.min(1, shin * .15)), pa = strength(L, a) * generalF(L, a.lord), pd = garrison * walls;
  if (pa > pd * 1.5 || (starving && pa > pd) || a.siegeDays > 60) {   // storm it
    if (r.next() < pa * pa / (pa * pa + pd * pd)) { emit(L, 'war.assault', { war: w.id, zone: unkey(k), actor: a.lord, held: false }); take(L, w, k, a.lord, r); }
    else { a.morale = Math.max(0, a.morale - .1); for (const q of a.sq) q.n = Math.max(0, q.n - Math.ceil(q.n * .12)); a.sq = a.sq.filter(q => q.n > 0);
      w.score += sideOf(L, w, a.lord) === 'a' ? -5 : 5;
      emit(L, 'war.assault', { war: w.id, zone: unkey(k), actor: a.lord, held: true }); if (!a.sq.length) { delete d.armies[a.id]; s.siege = null; } }
  } else if (a.hungry > 5) { a.siege = null; s.siege = null; march(L, a.id, unkey(a.home), 'home'); emit(L, 'war.siegeLifted', { war: w.id, zone: unkey(k), actor: a.lord }); }
}
// possession changes hands (never the title): plunder, fire, people fleeing
export function take(L, w, k, lord, r) {
  const d = D(L), s = d.set[k], z = d.zt[k], from = z.holder;
  setZone(L, k, { holder: lord }, 'conquest'); passBuildings(L, k, lord);
  const a = Object.values(d.armies).find(x => x.siege === k); if (a) a.siege = null;
  if (s) { s.siege = null; s.hit = L.hour; s.unrest = Math.min(1, s.unrest + .3); gain(L, lord, s.pop * 15); s.pop = Math.round(s.pop * .85);
    for (const id of s.b) if (r.chance(.15)) damage(L, id, r.range(.3, 1), 'sack'); }
  if (w) { w.taken.push(k); w.score = Math.max(-100, Math.min(100, w.score + (sideOf(L, w, lord) === 'a' ? 1 : -1) * (k === w.goal ? 30 : 15))); }
  if (from) { const lf = lordOf(L, from); lf.grudges[lord] = +Math.min(1, (lf.grudges[lord] || 0) + .3).toFixed(2); }
  emit(L, 'war.taken', { war: w ? w.id : null, zone: unkey(k), name: s ? s.name : null, from, to: lord, title: z.title });
}

// ---- raids: outlaws (and anyone not at war) strike a settlement for plunder; a crushing raid takes possession ----
export function raid(L, a, k, r) {
  const d = D(L), s = d.set[k]; if (!s) return;
  const pd = s.pop * .1 * .5 * (1 + s.walls * .6) + armiesAt(L, k).filter(x => x.lord !== a.lord).reduce((t, x) => t + strength(L, x), 0), pa = strength(L, a);
  s.hit = L.hour;
  if (r.next() < pa * pa / (pa * pa + pd * pd + 1e-9)) {
    const loot = Math.round(s.pop * 8 + (s.cnt.storehouse ? 0 : 200)); gain(L, a.lord, loot); s.pop = Math.round(s.pop * .95);
    for (const id of s.b) if (r.chance(.08)) damage(L, id, r.range(.3, 1), 'raid');
    const seize = pa > pd * 2.5 && s.tier <= 2;
    if (seize) take(L, null, k, a.lord, r);
    emit(L, 'war.raid', { zone: unkey(k), name: s.name, actor: a.lord, won: true, loot, seized: seize });
  } else { for (const q of a.sq) q.n = Math.max(0, q.n - Math.ceil(q.n * .2)); a.sq = a.sq.filter(q => q.n > 0); if (!a.sq.length) delete d.armies[a.id];
    emit(L, 'war.raid', { zone: unkey(k), name: s.name, actor: a.lord, won: false }); }
  if (d.armies[a.id]) march(L, a.id, unkey(a.home), 'home');
}

// ---- peace ----
function peaceCheck(L, w, r) {
  const d = D(L), as = Object.values(d.armies).filter(a => sideOf(L, w, a.lord));
  const pa = as.filter(a => sideOf(L, w, a.lord) === 'a').reduce((t, a) => t + strength(L, a), 0), pd = as.filter(a => sideOf(L, w, a.lord) === 'd').reduce((t, a) => t + strength(L, a), 0);
  if (!alive(L, w.a) || !alive(L, w.d)) return endWar(L, w, 'white', null);
  const days = (L.hour - w.started) / 24;
  let winner = null;
  if (w.score >= N.PEACE_SCORE || (pd < pa * .15 && w.score > 20)) winner = 'a';
  else if (w.score <= -N.PEACE_SCORE || (pa < pd * .15 && w.score < -10 && days > 30)) winner = 'd';
  if (winner) { const lord = winner === 'a' ? w.a : w.d; if (lord === L.player || (winner === 'a' ? w.d : w.a) === L.player) { if (!w.offered) { w.offered = L.hour; emit(L, 'war.peaceOffered', { war: w.id, winner: lord }); } if (lord === L.player && L.hour - w.offered < 24 * 14) return; }
    return makePeace(L, w.id, termsFor(L, w, winner, r)); }
  if (days > N.WAR_MAX_DAYS || (days > 120 && pa + pd < 5)) endWar(L, w, 'exhausted', null);
}
// what the winner asks: the land he took that is the loser's on paper, tribute from a rich loser, a hostage, a marriage, or fealty from a small one
export function termsFor(L, w, winner, r) {
  const d = D(L), W = winner === 'a' ? w.a : w.d, Lo = winner === 'a' ? w.d : w.a, lw = d.lords[W], ll = d.lords[Lo], la = L.actors[Lo];
  const env = ll.off.envoy && alive(L, ll.off.envoy) ? officeQ(L, L.actors[ll.off.envoy], 'envoy').q : 0;
  let cede = [...new Set(w.taken)].filter(k => d.zt[k].holder && sameSide(L, d.zt[k].holder, W) && d.zt[k].title && sameSide(L, d.zt[k].title, Lo));
  if (env > .6 && cede.length > 1) cede = cede.slice(0, -1);   // a good envoy saves a zone
  const t = { winner: W, loser: Lo, cede, tribute: null, hostage: null, marriage: null, vassal: false };
  if (ll.kokuAll < lw.kokuAll * .35 && traitSum(la, ['proud']) < .5 && ll.titles.length) t.vassal = true;
  if (worth(la) > 2000) t.tribute = { mon: Math.round(worth(la) * .1 * (1 - env * .5)), seasons: 4 };
  const kid = (id, sex) => (L.actors[id].children || []).map(c => L.actors[c]).find(c => c && c.alive && !c.spouse && ageOf(L, c) >= 14 && (!sex || c.sex === sex));
  const hk = kid(Lo); if (hk && !t.vassal) t.hostage = hk.id;
  const wk = kid(W); if (wk) { const lk = kid(Lo, wk.sex === 'm' ? 'f' : 'm'); if (lk && r.chance(.5)) t.marriage = [wk.id, lk.id]; }
  return t;
}
export function makePeace(L, warId, t) {
  const d = D(L), w = d.wars[warId]; if (!w || w.end) return null;
  const W = t.winner, Lo = t.loser;
  for (const k of t.cede || []) {   // cession: the title passes (lawful transfer), with the plots that were the loser's on paper
    const z = d.zt[k], to = sameSide(L, z.holder, W) ? z.holder : W, [x, y] = unkey(k);
    for (let n = 0; n < 16; n++) { const pid = plotId(x, y, n), p = L.plots[pid]; if (p && p.title && sameSide(L, p.title, Lo) && !d.vas[p.title]) transferTitle(L, pid, to, 'treaty'); }
    setZone(L, k, { title: to }, 'treaty');
  }
  // everything else either side took goes back to its lord on paper
  for (const [k, z] of Object.entries(d.zt)) if (z.title && z.holder && z.title !== z.holder && !(t.cede || []).includes(k) &&
    ((sameSide(L, z.title, W) && sameSide(L, z.holder, Lo)) || (sameSide(L, z.title, Lo) && sameSide(L, z.holder, W)))) { setZone(L, k, { holder: z.title }, 'treaty'); passBuildings(L, k, z.title); }
  if (t.tribute) lordOf(L, Lo).tribute.push({ to: W, mon: t.tribute.mon, left: t.tribute.seasons });
  if (t.hostage && alive(L, t.hostage)) { const h = L.actors[t.hostage]; h.hostage = W; const lw = d.lords[W]; if (lw.seat) h.home = unkey(lw.seat); }
  if (t.marriage && t.marriage.every(id => alive(L, id) && !L.actors[id].spouse)) marry(L.actors[t.marriage[0]], L.actors[t.marriage[1]]);
  if (t.vassal) swear(L, Lo, W, 'treaty');
  const ll = lordOf(L, Lo); ll.grudges[W] = +Math.min(1, (ll.grudges[W] || 0) + .4).toFixed(2);
  endWar(L, w, 'treaty', t);
  emit(L, 'war.treaty', { war: w.id, winner: W, loser: Lo, cede: (t.cede || []).map(unkey), tribute: t.tribute, hostage: t.hostage, marriage: t.marriage, vassal: t.vassal });
  return w;
}
function endWar(L, w, how, t) {
  const d = D(L); w.end = L.hour; w.how = how; w.treaty = t; d.active = d.active.filter(id => id !== w.id);
  for (const id of [w.a, w.d]) { const l = d.lords[id]; if (l) { l.wars = l.wars.filter(x => x !== w.id); l.truce[id === w.a ? w.d : w.a] = L.hour + N.TRUCE_DAYS * 24 * (how === 'treaty' ? 1 : .5); } }
  for (const a of Object.values(d.armies)) if (a.go && a.go.war === w.id) march(L, a.id, unkey(a.home), 'home');
  for (const a of Object.values(d.armies)) if (a.siege) { const z = d.zt[a.siege]; if (!z || !atWar(L, a.lord, z.holder)) { const s = d.set[a.siege]; if (s) s.siege = null; a.siege = null; march(L, a.id, unkey(a.home), 'home'); } }
  emit(L, 'war.peace', { war: w.id, a: w.a, d: w.d, how, score: Math.round(w.score), days: Math.round((L.hour - w.started) / 24) });
}
// tribute is paid each season; a lord who cannot pay earns a grudge and a reason for war
export function tributeSeason(L) {
  for (const l of Object.values(D(L).lords)) { l.tribute = l.tribute.filter(t => t.left > 0 && alive(L, t.to));
    for (const t of l.tribute) { t.left--; if (spend(L, l.id, t.mon)) gain(L, t.to, t.mon); else { const lt = lordOf(L, t.to); lt.grudges[l.id] = Math.min(1, (lt.grudges[l.id] || 0) + .5); } } }
}
// the live battle he fought (the game reports it): who won and what each side lost
export function settleBattle(L, k, winner, lossA = .1, lossD = .4, r) {
  const d = D(L), p = d.pending[k]; if (!p) return null; const w = d.wars[p.war]; delete d.pending[k];
  const list = Object.values(d.armies).filter(a => key(...a.at) === k), A = list.filter(a => sideOf(L, w, a.lord) === 'a'), B = list.filter(a => sideOf(L, w, a.lord) === 'd');
  hurt(L, A, lossA, r); hurt(L, B, lossD, r); w.score += winner === 'a' ? 15 : -15;
  for (const a of (winner === 'a' ? B : A)) if (d.armies[a.id]) march(L, a.id, unkey(a.home), 'home');
  emit(L, 'war.battle', { war: w.id, zone: unkey(k), winner: winner === 'a' ? w.a : w.d, live: true });
  return w;
}
