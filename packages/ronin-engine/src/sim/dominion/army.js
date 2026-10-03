import { emit, zoneAt } from '../ledger.js';
import { nameOf } from '../actors.js';
import { UNITS, BUILDINGS, N, ORDERS, ORDER, r3 } from './data.js';
import { D, key, unkey, alive, lordOf, top, sameSide } from './land.js';
import { lordOfSettlement } from './settle.js';
import { spend } from './seams.js';

// ---- Armies: recruited by class from who lives on your land, paid every day in rice and wages, trained at a dojo, equipped by
// your smiths, in squads under officers; unpaid or hungry troops desert or turn bandit (docs/dominion.md section 5) ----
// An army (L.sys.dominion.armies[id]):
//   { id, lord, name, at: [x, y], home ("x,y": where it is based), sq: [{ cls, n, off (officer actor id | null), tr 0..1, eq 0..1, order (its own: ORDERS) }],
//     morale 0..1, sup (days of food carried), unpaid (days), hungry (days), go: null | { to "x,y", path: [zone index], i, prog, why, war },
//     siege: "x,y" | null, since }
export const menOf = a => a.sq.reduce((s, q) => s + q.n, 0);
const squadPow = q => q.n * UNITS[q.cls].pow * (.5 + q.tr) * (.6 + .4 * q.eq);
const fed = a => (.5 + a.morale) * (a.sup > 0 || a.hungry < 3 ? 1 : .7);
export function strength(L, a) { let p = 0; for (const q of a.sq) p += squadPow(q); return p * fed(a); }
// each squad's order in a battle (owner 2026-10-01, D2C): 'follow' counts only where he stands in the battle's zone, else it holds
export const himAt = (L, a, k) => a.lord === L.player && !!L.actors[L.player]?.at && L.actors[L.player].at[0] + ',' + L.actors[L.player].at[1] === k;
export const orderOf = (L, a, q, k) => { const o = ORDER[q.order] || ORDER.hold; return o.him && !himAt(L, a, k) ? ORDER.hold : o; };
// strength in a battle at zone k: each squad weighted by its order (all hold: the same as strength)
export function battlePower(L, a, k) { let p = 0; for (const q of a.sq) p += squadPow(q) * orderOf(L, a, q, k).pow; return p * fed(a); }
// derived indexes, rebuilt at most once a game hour (a cache like zone.js's tiles: never ledger state, always recomputable)
const CACHE = new WeakMap();
function hourly(L) { let c = CACHE.get(L); if (!c || c.h !== L.hour) { c = { h: L.hour, by: null, side: null, at: null, paths: c ? c.paths : new Map() }; CACHE.set(L, c); } return c; }
export function armiesOf(L, lord) {
  const c = hourly(L), d = D(L);
  if (!c.by) { c.by = new Map(); for (const a of Object.values(d.armies)) (c.by.get(a.lord) || c.by.set(a.lord, []).get(a.lord)).push(a); }
  return (c.by.get(lord) || []).filter(a => d.armies[a.id] === a && a.lord === lord);
}
// the strength of everyone sworn up to one ruler (estimates for the lords' choices: an hour stale at most)
export function sideStrength(L, t) {
  const c = hourly(L);
  if (!c.side) { c.side = new Map(); for (const a of Object.values(D(L).armies)) if (alive(L, a.lord)) { const k = top(L, a.lord); c.side.set(k, (c.side.get(k) || 0) + strength(L, a)); } }
  return c.side.get(t) || 0;
}
// an army steps into another zone (keeps the hour's index true)
function relocate(L, a, x, y) {
  const c = hourly(L); if (c.at) { const o = a.at[0] + ',' + a.at[1], nk = x + ',' + y, l = c.at.get(o); if (l) { const i = l.indexOf(a); if (i >= 0) l.splice(i, 1); } (c.at.get(nk) || c.at.set(nk, []).get(nk)).push(a); }
  a.at = [x, y];
}
export function armiesAt(L, k) {
  const c = hourly(L), d = D(L);
  if (!c.at) { c.at = new Map(); for (const id in d.armies) { const a = d.armies[id], ak = a.at[0] + ',' + a.at[1]; (c.at.get(ak) || c.at.set(ak, []).get(ak)).push(a); } }
  const l = c.at.get(k); return l ? l.filter(a => d.armies[a.id] === a && a.at[0] + ',' + a.at[1] === k) : [];
}

// can `lord` recruit `cls` in settlement k? ashigaru, retainers and monks from his own settlements; ronin at any inn not held by an enemy;
// shinobi in any town not held by an enemy
export function recruitWhy(L, lord, cls, k) {
  const s = D(L).set[k]; if (!s) return 'nobody lives there'; if (!UNITS[cls] || cls === 'bandit' || cls === 'rebel') return 'no such troops';
  const holder = lordOfSettlement(L, s), own = holder === lord || (holder && top(L, holder) === top(L, lord) && D(L).lords[holder]?.liege === lord);
  if ((cls === 'ashigaru' || cls === 'retainer' || cls === 'monk') && !own) return 'only on your own land';
  if ((cls === 'ronin' || cls === 'shinobi') && holder && !own && atWar(L, lord, holder)) return 'held by your enemy';
  if (!(s.pool[cls] > 0)) return cls === 'ronin' ? 'no paid swords here (an inn brings them)' : cls === 'monk' ? 'no monks here (a temple brings them)' : `no ${cls} to be had here this season`;
  return null;
}
export const atWarAny = (L, id) => D(L).active.some(w => sameSide(L, D(L).wars[w].a, id) || sameSide(L, D(L).wars[w].d, id));
export const atWar = (L, a, b) => D(L).active.some(id => { const w = D(L).wars[id]; return (sameSide(L, w.a, a) && sameSide(L, w.d, b)) || (sameSide(L, w.a, b) && sameSide(L, w.d, a)); });
// recruit n of a class in settlement k into the lord's army there (made if none). Pays the recruiting cost now
export function recruit(L, lord, cls, n, k, { pay = true, officer = null } = {}) {
  const why = recruitWhy(L, lord, cls, k); if (why) return { error: why };
  const s = D(L).set[k]; n = Math.min(n, s.pool[cls]); if (n <= 0) return { error: 'nobody to recruit' };
  const cost = n * UNITS[cls].cost; if (pay && !spend(L, lord, cost)) return { error: `${n} ${cls} cost ${cost} mon to recruit` };
  s.pool[cls] -= n; if (cls === 'ashigaru' || cls === 'monk') s.pop = Math.max(0, s.pop - n);
  const a = armiesAt(L, k).find(x => x.lord === lord && !x.go) || newArmy(L, lord, [s.x, s.y]);
  addSquad(a, cls, n, officer, k, s);
  if (lord === L.player || n >= 10) emit(L, 'dom.recruit', { actor: lord, army: a.id, cls, n, zone: [s.x, s.y], cost });
  return a;
}
export function newArmy(L, lord, at, name) {
  const d = D(L), id = `army${(L.ids.army = (L.ids.army || 0) + 1)}`, la = L.actors[lord];
  const a = { id, lord, name: name || `${la ? la.family : 'the'} ${armiesOf(L, lord).length ? 'second host' : 'host'}`, at: [...at], home: key(...at), sq: [], morale: .6, sup: 30, unpaid: 0, hungry: 0, go: null, siege: null, since: L.hour };
  d.armies[id] = a; lordOf(L, lord); const c = hourly(L); if (c.by) (c.by.get(lord) || c.by.set(lord, []).get(lord)).push(a); if (c.at) (c.at.get(a.home) || c.at.set(a.home, []).get(a.home)).push(a); return a;
}
export function addSquad(a, cls, n, off, home, s) {
  const q = a.sq.find(x => x.cls === cls && x.off === off && x.from === home);
  const eq0 = cls === 'retainer' || cls === 'ronin' ? .6 : cls === 'monk' ? .4 : s && s.cnt.smithy ? .35 : .2;
  if (q) { q.tr = (q.tr * q.n + .1 * n) / (q.n + n); q.eq = (q.eq * q.n + eq0 * n) / (q.n + n); q.n += n; }
  else a.sq.push({ cls, n, off, tr: cls === 'retainer' ? .5 : cls === 'monk' || cls === 'shinobi' ? .45 : cls === 'ronin' ? .4 : .1, eq: eq0, order: 'hold', from: home });
}
export function setOfficer(L, armyId, i, actorId) { const a = D(L).armies[armyId]; if (a && a.sq[i] && (!actorId || alive(L, actorId))) a.sq[i].off = actorId || null; return a; }
// each squad its own order (owner 2026-10-01, D2C): squad i of the army; it keeps it until told otherwise. setOrder is the old name
export function orderSquad(L, armyId, i, order) { const a = D(L).armies[armyId]; if (a && a.sq[i] && ORDERS.includes(order)) a.sq[i].order = order; return a; }
export const setOrder = orderSquad;
// his squads in one zone and their orders (the game's order screen at a battle he is at)
export const squadsAt = (L, lord, k) => armiesAt(L, k).filter(a => a.lord === lord).flatMap(a => a.sq.map((q, i) => ({ army: a.id, i, cls: q.cls, n: q.n, off: q.off, order: q.order || 'hold' })));
// disband: ashigaru and monks go home to their settlement; paid swords just leave
export function disband(L, armyId, i = null) {
  const d = D(L), a = d.armies[armyId]; if (!a) return;
  for (const q of i == null ? a.sq.slice() : [a.sq[i]]) { if (!q) continue;
    if ((q.cls === 'ashigaru' || q.cls === 'monk' || q.cls === 'rebel') && d.set[q.from]) d.set[q.from].pop += q.n;
    a.sq.splice(a.sq.indexOf(q), 1); }
  emit(L, 'dom.disband', { actor: a.lord, army: a.id, men: menOf(a) });
  if (!a.sq.length) delete d.armies[armyId];
}

// ---- paths along the roads: A* over zones, roads cheap, mountains dear, sea impassable ----
const COST = { coast: 1.5, plains: 1, paddy: 1.3, forest: 2, bamboo: 2.2, marsh: 3.5, hills: 2.5, mountains: 6 };
export function pathTo(L, from, to) {
  const c = hourly(L), pk = from.join() + '>' + to.join(); if (c.paths.has(pk)) { const p = c.paths.get(pk); return p && p.slice(); }
  const p = findPath(L, from, to); if (c.paths.size > 3000) c.paths.clear(); c.paths.set(pk, p); return p && p.slice();
}
// weighted A* on typed arrays (reused between calls, stamped instead of cleared): near-best paths, found fast
let G = null, PREV = null, SEEN = null, STAMP = 0;
function findPath(L, from, to) {
  const { w, h } = L.size, n = w * h, start = from[1] * w + from[0], goal = to[1] * w + to[0];
  if (!G || G.length !== n) { G = new Float64Array(n); PREV = new Int32Array(n); SEEN = new Uint32Array(n); STAMP = 0; }
  const stamp = ++STAMP, heapF = [], heapI = [];
  const push = (f, i) => { heapF.push(f); heapI.push(i); let k = heapF.length - 1; while (k > 0) { const p = (k - 1) >> 1; if (heapF[p] <= heapF[k]) break;
    [heapF[p], heapF[k]] = [heapF[k], heapF[p]]; [heapI[p], heapI[k]] = [heapI[k], heapI[p]]; k = p; } };
  const pop = () => { const top = heapI[0], lf = heapF.pop(), li = heapI.pop(); if (heapF.length) { heapF[0] = lf; heapI[0] = li; let k = 0;
    for (;;) { const l = 2 * k + 1, r = l + 1; let m = k; if (l < heapF.length && heapF[l] < heapF[m]) m = l; if (r < heapF.length && heapF[r] < heapF[m]) m = r; if (m === k) break;
      [heapF[m], heapF[k]] = [heapF[k], heapF[m]]; [heapI[m], heapI[k]] = [heapI[k], heapI[m]]; k = m; } } return top; };
  G[start] = 0; SEEN[start] = stamp; PREV[start] = -1; push(0, start);
  let found = start === goal;
  for (let it = 0; heapF.length && it < 4000 && !found; it++) { const i = pop(), x = i % w, y = (i - x) / w;
    for (let dir = 0; dir < 4; dir++) { const nx = x + (dir === 0 ? 1 : dir === 1 ? -1 : 0), ny = y + (dir === 2 ? 1 : dir === 3 ? -1 : 0);
      if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue; const j = ny * w + nx, z = L.zones[j]; if (z.biome === 'sea') continue;
      const c = G[i] + (z.road ? .35 : COST[z.biome]); if (SEEN[j] === stamp && c >= G[j]) continue;
      G[j] = c; PREV[j] = i; SEEN[j] = stamp; if (j === goal) { found = true; break; }
      push(c + (Math.abs(nx - to[0]) + Math.abs(ny - to[1])) * .7, j); } }
  if (!found) return null;
  const path = []; for (let i = goal; i !== start && i >= 0; i = PREV[i]) path.push(i);
  return path.reverse();
}
export function march(L, armyId, to, why = 'march', war = null) {
  const a = D(L).armies[armyId]; if (!a) return null;
  const path = pathTo(L, a.at, to); if (!path) return { error: 'no way there' };
  const again = a.go === null && a.last === key(...to) + why; a.last = key(...to) + why;
  a.go = { to: key(...to), path, i: 0, prog: 0, why, war }; a.siege = null; a.rest = 0;
  if ((a.lord === L.player || (why === 'war' && D(L).set[key(...to)] && menOf(a) >= 40)) && why !== 'home' && why !== 'raid' && !again) emit(L, 'war.march', { army: a.id, actor: a.lord, from: [...a.at], to, why, war, men: menOf(a) });
  return a;
}
// one day's march; true when it arrives
export function moveDay(L, a) {
  const g = a.go; if (!g) return false;
  if (!g.path.length) { a.go = null; return true; }
  const stable = armyHasStable(L, a) ? 1 + BUILDINGS.stable.speed : 1;
  g.prog += stable;
  while (g.prog > 0 && g.i < g.path.length) { const z = L.zones[g.path[g.i]], cost = 1 / (z.road ? N.MARCH_ROAD : N.MARCH_OFF);
    if (g.prog < cost) break; g.prog -= cost; relocate(L, a, z.x, z.y); g.i++; }
  if (g.i >= g.path.length) { a.go = null; return true; }
  return false;
}
const armyHasStable = (L, a) => { const s = D(L).set[a.home]; return !!(s && s.cnt.stable); };

// ---- every day: pay, feed, train, desert ----
export function armyDay(L, r) {
  const d = D(L), smiths = new Map(), day = Math.floor(L.hour / 24), warring = new Set();
  for (const w of d.active) { warring.add(d.wars[w].a); warring.add(d.wars[w].d); }
  for (const id in d.armies) { const a = d.armies[id];
    if (!a.go && !a.siege && !a.unpaid && !a.hungry && (day + a.since) % 7 && (!warring.size || a.at[0] + ',' + a.at[1] === a.home || !warring.has(top(L, a.lord)))) continue;
    if (!a.sq.length) { delete d.armies[id]; continue; }
    const ak = a.at[0] + ',' + a.at[1];
    if (!alive(L, a.lord)) continue;
    // an army resting (at home, or anywhere in peacetime) settles its accounts once a week (7 days at once); one on the move or at war, every day
    const home = !a.go && !a.siege && !a.unpaid && !a.hungry && (ak === a.home || !warring.has(top(L, a.lord))), days = home ? 7 : 1;
    if (!a.go && !a.siege && a.lord !== L.player) {
      const twin = armiesAt(L, ak).find(b => b !== a && b.lord === a.lord && !b.go && !b.siege && d.armies[b.id]);
      if (twin) { for (const q of a.sq) addSquad(twin, q.cls, q.n, q.off, q.from, null); twin.sq.forEach(q => { const o = a.sq.find(x => x.cls === q.cls); if (o) { q.tr = Math.max(q.tr, o.tr); q.eq = Math.max(q.eq, o.eq); } }); delete d.armies[a.id]; continue; }
      if (!home && ak !== a.home && !atWarAny(L, a.lord)) march(L, a.id, unkey(a.home), 'home');
    }
    const l = lordOf(L, a.lord), here = d.zt[ak], friendly = here && here.holder && sameSide(L, here.holder, a.lord);
    let rice = 0, wage = 0; for (const q of a.sq) { rice += q.n * UNITS[q.cls].rice / 112 * days; wage += q.n * UNITS[q.cls].wage * days; }
    // food: from the lord's store at home or in friendly land, from what it carries elsewhere
    if (friendly && l.rice >= rice) { l.rice -= rice; a.sup = Math.min(30, a.sup + 3); a.hungry = 0; }
    else if (a.sup >= 1) { a.sup -= 1; a.hungry = 0; }
    else { a.hungry++; a.morale = Math.max(0, a.morale - .04); }
    // wages
    if (wage > 0) { if (spend(L, a.lord, Math.round(wage))) { a.unpaid = 0; } else { a.unpaid++; a.morale = Math.max(0, a.morale - .02); } }
    // drift toward steady: pay and food keep morale up; a victory lifts it (war.js)
    if (!a.unpaid && !a.hungry) { a.morale += (.6 - a.morale) * .02 * days; a.deserting = false; }
    // desertion: a few a day once unpaid for a week or hungry for three days; after a month unpaid some go to the hills as bandits
    if (a.unpaid > N.DESERT_AFTER || a.hungry > 3) {
      let gone = 0; for (const q of a.sq) { if (q.cls === 'retainer' && a.unpaid < N.BANDIT_AFTER * 2) continue;   // sworn men stay longest
        const k = Math.max(1, Math.round(q.n * .03)); q.n -= k; gone += k;
        if ((q.cls === 'ashigaru' || q.cls === 'monk') && d.set[q.from] && a.unpaid <= N.BANDIT_AFTER) d.set[q.from].pop += k; }
      a.sq = a.sq.filter(q => q.n > 0); const was = a.deserting; a.deserting = true;
      if (gone && ((!was && gone >= 3) || !a.sq.length)) emit(L, 'dom.desert', { army: a.id, actor: a.lord, n: gone, bandits: a.unpaid > N.BANDIT_AFTER, zone: [...a.at] });
      if (!a.sq.length) { delete d.armies[a.id]; continue; }
    }
    // training at home (a dojo, barracks) and equipment (smithies in his land)
    if (!a.go && ak === a.home) {
      const s = d.set[a.home], gen = l.off.general && alive(L, l.off.general) ? .8 + .4 * L.actors[l.off.general].int : .8;
      const tr = s ? (s.cnt.dojo || 0) * BUILDINGS.dojo.train + (s.cnt.barracks || 0) * BUILDINGS.barracks.train + .0008 : 0;
      const smith = smiths.get(a.lord) ?? smiths.set(a.lord, l.zones.reduce((n, k) => n + (d.set[k] ? d.set[k].cnt.smithy || 0 : 0), 0)).get(a.lord);
      for (const q of a.sq) { q.tr = Math.min(.95, q.tr + tr * gen * days); if (smith) q.eq = Math.min(.5 + .15 * smith, q.eq + BUILDINGS.smithy.equip * Math.min(3, smith) * days); }
    } else for (const q of a.sq) q.tr = Math.max(0, q.tr - N.TRAIN_DECAY * .2);
    a.morale = r3(Math.max(0, Math.min(1, a.morale)));
  }
}
export const armyLabel = (L, a) => `${a.name} (${menOf(a)} men${a.sq.some(q => q.off) ? `, ${a.sq.filter(q => q.off).map(q => nameOf(L.actors[q.off])).join(', ')}` : ''})`;
