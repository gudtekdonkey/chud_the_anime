import { emit, zoneAt } from '../ledger.js';
import { ownerOf, plotAt, ZONE } from '../zone.js';
import { BUILDINGS, TIERS, N } from '../packs/edo/dominion.js';
import { hash } from '../rng.js';
import { D, key, unkey, alive } from './land.js';
import { settlementAt, newSettlement, recount, lordOfSettlement } from './settle.js';
import { materialPrice, spend, blocked, tileGround } from './seams.js';

// ---- Building: buildings sit on tiles inside plots you hold, cost materials, labour-days and mon, need what comes first,
// are built by work over days (continuing while he is away) and can be damaged, burned and repaired (docs/dominion.md section 3) ----
// A building record (L.sys.dominion.bld[id]):
//   { id, t (type), k (zone key "x,y"), at: [tx, ty] | null (a ring; or built in the ledger layer off lots, placed when the zone is built near him),
//     owner (who paid), st: 'build' | 'up' | 'repair' | 'ruin', hp 0..1, done (labour-days worked), labour (labour-days it needs),
//     got (materials delivered: true, or { timber, ... } still owed), crew (hired workers), since (hour started) }

// The land lane's seam: a building's cost as a recipe-shaped record. Its recipe system runs the steps (supply, then work) through
// supply() and work() below; dominion never runs recipes itself.
// the buildings NPC lords' building is news for (the rest is silent; his own always is)
const NEWS = new Set(['market', 'inn', 'temple', 'magistrate', 'palisade', 'wall', 'gate', 'keep', 'dojo', 'barracks']);
export function recipeOf(type) {
  const b = BUILDINGS[type]; if (!b) return null;
  const { mon = 0, ...inputs } = b.cost;
  return { id: `build.${type}`, kind: 'build', name: type, family: b.fam,
    footprint: b.w === 'ring' ? 'ring' : { w: b.w, h: b.h },
    needs: { plot: 'held', clear: true, ground: b.ground || null, buildings: b.needs || null, anyOf: b.needsAny || null, tier: b.tier ?? -1, road: !!b.road },
    inputs, mon, labour: b.labour, workers: b.workers, upkeep: b.upkeep, output: { building: type } };
}
// what it costs in mon when the lord buys the materials (a sawmill makes timber cheaper, a kiln stone and tiles)
export function costOf(L, type, k) {
  const b = BUILDINGS[type], s = D(L).set[k], [x, y] = unkey(k), reg = zoneAt(L, x, y).region; let mon = b.cost.mon || 0;
  for (const [m, n] of Object.entries(b.cost)) if (m !== 'mon') {
    const cheap = s && ((m === 'timber' && s.cnt.sawmill) || ((m === 'stone' || m === 'tiles') && s.cnt.kiln)) ? .75 : 1;
    mon += n * materialPrice(L, reg, m) * cheap; }
  return Math.round(mon);
}

// ---- lots (owner 2026-10-01, D3C): on plots he holds he builds anywhere by footprint (a settlement he founded there too); in a settlement
// he did not found (a town, village, fort or camp that stood when the world began, or one he took) buildings go on its set lots: he
// chooses what goes in a lot, never where. NPC lords build on lots in their towns too. The layout is derived from the seed and the zone
// (a cache like tilesOf, never ledger state); a lot is taken while a building's footprint (`at`) covers any of it ----
const WORLD = new Set(['town', 'village', 'fort', 'camp']);
export const usesLots = (L, s, who) => !!s && (WORLD.has(zoneAt(L, s.x, s.y).kind) || s.founder !== who);
// 4 × 4 cells on a 5-tile grid round the middle, the middle row and column a lane (where the roads run); the centre's 2 × 2 cells are one
// 9 × 9 lot kept for a castle keep; some cells join their neighbour (9 × 4, for a temple or a manor), some near the middle halve (4 × 2, for homes)
const LOTS = new Map();
export function lotsOf(L, zx, zy) {
  const ck = L.seed + ':' + zx + ',' + zy; let out = LOTS.get(ck); if (out) return out;
  const P = N.LOT_PITCH, n = Math.floor((ZONE - 6) / P) + 1, lane = n >> 1, used = new Set(), cell = (i, j) => [2 + i * P, 2 + j * P];
  const keep = c => (c === lane - 2 || c === lane - 1);
  out = [{ x: cell(lane - 2, 0)[0], y: cell(0, lane - 2)[1], w: 2 * P - 1, h: 2 * P - 1, kind: 'keep' }];
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
    if (i === lane || j === lane || (keep(i) && keep(j)) || used.has(i + ',' + j)) continue;
    const [x, y] = cell(i, j), h = hash(L.seed, 'lot', zx, zy, i, j) % 100, inner = Math.max(Math.abs(i + .5 - lane), Math.abs(j + .5 - lane)) <= 4;
    if (h < 18 && i + 1 < n && i + 1 !== lane && !(keep(i + 1) && keep(j)) && !used.has(i + 1 + ',' + j)) { used.add(i + 1 + ',' + j); out.push({ x, y, w: 2 * P - 1, h: P - 1, kind: 'large' }); }
    else if (inner && h < 55) out.push({ x, y, w: P - 1, h: 2, kind: 'small' }, { x, y: y + 2, w: P - 1, h: 2, kind: 'small' });
    else out.push({ x, y, w: P - 1, h: P - 1, kind: 'lot' });
  }
  const c = ZONE / 2, dist = l => Math.hypot(l.x + l.w / 2 - c, l.y + l.h / 2 - c);
  out = [out[0], ...out.slice(1).sort((a, b) => dist(a) - dist(b))];
  out.at = new Map(out.map((l, i) => [l.x + ',' + l.y, i]));   // a lot by its top-left tile (where its building stands)
  LOTS.set(ck, out); return out;
}
// the lots a settlement's buildings cover (a building on a lot stands at its top-left; one placed by footprint may cover several)
export function lotsTaken(L, s) {
  const lots = lotsOf(L, s.x, s.y), d = D(L), taken = new Set();
  for (const id of s.b) { const o = d.bld[id], ob = BUILDINGS[o.t]; if (!o.at || ob.w === 'ring') continue;
    const i = lots.at.get(o.at[0] + ',' + o.at[1]); if (i !== undefined && ob.w <= lots[i].w && ob.h <= lots[i].h) { taken.add(i); continue; }
    lots.forEach((l, j) => { if (o.at[0] < l.x + l.w && l.x < o.at[0] + ob.w && o.at[1] < l.y + l.h && l.y < o.at[1] + ob.h) taken.add(j); }); }
  return taken;
}
// the free lot a building of this type goes on: the smallest it fits, nearest the middle; the keep's lot only for a keep
export function freeLot(L, s, type, taken = lotsTaken(L, s)) {
  const b = BUILDINGS[type]; if (b.w === 'ring') return null; let best = null;
  lotsOf(L, s.x, s.y).forEach((l, i) => { if (taken.has(i) || b.w > l.w || b.h > l.h || ((l.kind === 'keep') !== (type === 'keep'))) return;
    if (!best || l.w * l.h < best.l.w * best.l.h) best = { i, l }; });
  return best;
}

// can `who` build `type` with its top-left tile at (tx, ty) in zone (zx, zy)? null if yes, else why not
export function canPlace(L, who, type, zx, zy, tx, ty) {
  const b = BUILDINGS[type]; if (!b) return 'no such building';
  const k = key(zx, zy), s = D(L).set[k], z = zoneAt(L, zx, zy); if (!z || z.biome === 'sea') return 'not on land';
  const why = prereq(L, s, type, z); if (why) return why;
  if (b.w === 'ring') return s && lordOfSettlement(L, s) === who ? null : 'walls go round a settlement you hold';
  if (tx < 0 || ty < 0 || tx + b.w > ZONE || ty + b.h > ZONE) return 'off the edge of the zone';
  const lots = usesLots(L, s, who), ruler = lots && lordOfSettlement(L, s) === who;
  if (lots) { const i = lotsOf(L, zx, zy).findIndex(l => l.x === tx && l.y === ty), l = lotsOf(L, zx, zy)[i];
    if (!l) return 'in a town you did not found, buildings go on its lots';
    if (b.w > l.w || b.h > l.h) return `a ${type} does not fit this lot`;
    if ((l.kind === 'keep') !== (type === 'keep')) return l.kind === 'keep' ? 'this lot is kept for a castle keep' : 'a keep needs the middle lot';
    if (lotsTaken(L, s).has(i)) return 'the lot is taken'; }
  for (let y = ty; y < ty + b.h; y++) for (let x = tx; x < tx + b.w; x++) {
    if (!ruler && ownerOf(L, plotAt(zx, zy, x, y)).holder !== who) return lots ? 'a lot in a town you do not rule must be on plots you hold' : 'every tile must be on a plot you hold';
    if (blocked(L, zx, zy, x, y)) return `a ${tileGround(L, zx, zy, x, y)} tile is in the way (clear it first)`;
    if (b.ground && !b.ground.includes(tileGround(L, zx, zy, x, y))) return `it needs ${b.ground.join(' or ')} ground`;
  }
  if (s) for (const id of s.b) { const o = D(L).bld[id], ob = BUILDINGS[o.t]; if (!o.at || ob.w === 'ring') continue;
    if (tx < o.at[0] + ob.w && o.at[0] < tx + b.w && ty < o.at[1] + ob.h && o.at[1] < ty + b.h) return `the ${o.t} is there`; }
  return null;
}
// what must stand first: the settlement's tier and the buildings a type needs
export function prereq(L, s, type, z) {
  const b = BUILDINGS[type], tier = s ? s.tier : -1;
  if ((b.tier ?? -1) > tier) return `needs a ${TIERS[b.tier].name} first`;
  if (b.road && !z.road) return 'needs a road';
  for (const [t, n] of Object.entries(b.needs || {})) if ((s ? s.cnt[t] || 0 : 0) < n) return `needs a ${t} first`;
  if (b.needsAny && !b.needsAny.some(t => s && s.cnt[t])) return `needs a ${b.needsAny.join(' or ')} first`;
  if (b.w === 'ring' && s && s.b.some(id => D(L).bld[id].t === type && D(L).bld[id].st !== 'ruin')) return `there is already a ${type}`;
  return null;
}

// plan a building. pay: buy the materials and the mon now (the stand-in for the land lane's supply, and how NPC lords build);
// at: false for the ledger layer (NPC lords off screen). Returns the building or { error }
export function plan(L, who, type, zx, zy, tx, ty, { pay = true, at = true } = {}) {
  const d = D(L), k = key(zx, zy), b = BUILDINGS[type];
  const why = at ? canPlace(L, who, type, zx, zy, tx, ty) : prereq(L, d.set[k], type, zoneAt(L, zx, zy)); if (why) return { error: why };
  // the ledger layer on lots: the free lot it fits (an NPC lord's town fills its lots; a full one builds no more of that size)
  const onLot = !at && b.w !== 'ring' && usesLots(L, d.set[k], who), lot = onLot ? freeLot(L, d.set[k], type) : null;
  if (onLot && !lot) return { error: 'no free lot it fits' };
  const cost = costOf(L, type, k); if (pay && !spend(L, who, cost)) return { error: `it costs ${cost} mon` };
  const s = d.set[k] || newSettlement(L, zx, zy, who), id = `b${(L.ids.b = (L.ids.b || 0) + 1)}`;
  const rec = { id, t: type, k, at: lot ? [lot.l.x, lot.l.y] : at && b.w !== 'ring' ? [tx, ty] : null, owner: who, st: 'build', hp: 0, done: 0, labour: b.labour,
    got: pay ? true : { ...b.cost }, crew: 0, since: L.hour };
  d.bld[id] = rec; s.b.push(id); d.work.push(id);
  if (who === L.player) emit(L, 'dom.build', { building: id, kind: type, zone: [zx, zy], actor: who, cost });
  return rec;
}
// the land lane's recipe steps: deliver materials (mon too), and labour-days of work by someone
export function supply(L, id, goods) {
  const r = D(L).bld[id]; if (!r || r.got === true) return r;
  for (const [m, n] of Object.entries(goods)) if (r.got[m]) r.got[m] = Math.max(0, r.got[m] - n);
  if (Object.values(r.got).every(v => !v)) r.got = true;
  finishIfDone(L, r); return r;
}
export function work(L, id, days, by) {
  const r = D(L).bld[id]; if (!r || (r.st !== 'build' && r.st !== 'repair')) return r;
  r.done = Math.min(r.labour, r.done + days); if (by) r.by = by;
  finishIfDone(L, r); return r;
}
function finishIfDone(L, r) {
  if (r.done < r.labour || r.got !== true) return;
  const d = D(L), i = d.work.indexOf(r.id); if (i >= 0) d.work.splice(i, 1);
  const was = r.st; r.st = 'up'; r.hp = 1; r.done = r.labour = BUILDINGS[r.t].labour;
  recount(L, d.set[r.k]);
  if (r.owner === L.player || NEWS.has(r.t)) emit(L, was === 'repair' ? 'dom.repaired' : 'dom.built', { building: r.id, kind: r.t, zone: unkey(r.k), actor: r.owner });
}
// hire workers onto a building (the stand-in for the land lane's hired hands): n workers at N.CREW_WAGE a day each
export function hire(L, id, n) { const r = D(L).bld[id]; if (r) r.crew = Math.max(0, n | 0); return r; }

// every day: the settlement's corvée labour and the hired crews build; unpaid crews walk off.
// (his buildings and any with a hired crew move every day; an NPC lord's corvée is counted a week at a time, staggered)
export function buildDay(L) {
  const d = D(L), share = {}, day = Math.floor(L.hour / 24);
  for (const id of d.work) { const r = d.bld[id]; share[r.k] = (share[r.k] || 0) + (r.got === true ? 1 : 0); }
  for (const id of d.work.slice()) {
    const r = d.bld[id]; if (!r || r.got !== true) continue;
    const daily = r.owner === L.player || r.crew > 0, days = daily ? 1 : 7; if (!daily && (day + r.since) % 7) continue;
    const s = d.set[r.k], lord = lordOfSettlement(L, s); let lab = 0;
    if (lord && r.owner === lord && !s.siege) { const st = stewardF(L, lord); lab += days * s.pop * N.LABOUR * st / share[r.k] * (1 + (s.cnt.sawmill ? BUILDINGS.sawmill.labourX : 0)); }
    if (r.crew) { if (spend(L, r.owner, r.crew * N.CREW_WAGE)) lab += r.crew; else { r.crew = 0; emit(L, 'dom.crewLeft', { building: id, zone: unkey(r.k), actor: r.owner }); } }
    if (lab > 0) work(L, id, lab, null);
  }
}
const stewardF = (L, lord) => { const l = D(L).lords[lord], st = l && l.off.steward; return st && alive(L, st) ? .8 + .4 * L.actors[st].int : .9; };

// damage: a raid, a siege, a riot or a fire. At 0 it is a ruin (burned); below half it stops working until repaired
export function damage(L, id, amt, why) {
  const d = D(L), r = d.bld[id]; if (!r || r.st === 'ruin') return r;
  if (r.st === 'build') { r.done = Math.max(0, r.done - amt * r.labour); return r; }
  r.hp = Math.max(0, r.hp - amt);
  if (r.hp <= 0) { r.st = 'ruin'; const i = d.work.indexOf(id); if (i >= 0) d.work.splice(i, 1); }
  recount(L, d.set[r.k]);
  if (r.owner === L.player || r.st === 'ruin' || NEWS.has(r.t)) emit(L, r.st === 'ruin' ? 'dom.ruined' : 'dom.damaged', { building: id, kind: r.t, zone: unkey(r.k), why, hp: +r.hp.toFixed(2) });
  return r;
}
// repair: half the labour for the damage done, 30% of the materials for a ruin (bought now when pay)
export function repair(L, id, who, { pay = true } = {}) {
  const d = D(L), r = d.bld[id]; if (!r || r.hp >= 1 || r.st === 'build' || r.st === 'repair') return { error: 'nothing to repair' };
  const cost = Math.round(costOf(L, r.t, r.k) * (r.st === 'ruin' ? .3 : .1)); if (pay && !spend(L, who, cost)) return { error: `it costs ${cost} mon` };
  const full = BUILDINGS[r.t].labour; r.st = 'repair'; r.labour = full; r.done = full - Math.ceil((1 - r.hp) * full * .5); r.got = true;
  if (!d.work.includes(id)) d.work.push(id);
  recount(L, d.set[r.k]);
  return r;
}
// every season: upkeep. A lord who cannot pay lets his buildings run down
// (billed by settlement to the one who rules it: buildings pass to whoever holds their land)
export function upkeepSeason(L) {
  const d = D(L);
  for (const s of Object.values(d.set)) {
    let mon = 0; for (const t in s.cnt) mon += (BUILDINGS[t].upkeep || 0) * s.cnt[t]; if (!mon) continue;
    const who = lordOfSettlement(L, s); if (who && alive(L, who) && spend(L, who, mon)) continue;
    let low = false; for (const id of s.b) { const r = d.bld[id]; if (r.st === 'up' && BUILDINGS[r.t].upkeep && r.hp > .3) { r.hp = +(r.hp - .1).toFixed(2); if (r.hp < .5) low = true; } }
    if (low) recount(L, s);
  }
}
// a building changes owner with the land it stands on (conquest, cession, inheritance)
export function passBuildings(L, k, to) { const s = D(L).set[k]; if (s) for (const id of s.b) D(L).bld[id].owner = to; }
