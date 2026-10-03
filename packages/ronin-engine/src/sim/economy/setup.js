import { hash } from '../rng.js';
import { zoneAt } from '../ledger.js';
import { HOURS_PER_YEAR } from '../time.js';
import { PLOTS, PLOT, ZONE, plotId, ownerOf } from '../zone.js';
import { GOODS, GOOD, NEED, KOKU_TILE, GUILD_START, TAX, JOBS, ADULT, TASTE, RESERVE, CARAVAN, SETTLE } from '../packs/edo/economy.js';
import { worth } from './money.js';

// ---- The economy's state in the ledger (L.sys.economy), made once per world, and a derived index of households (never saved) ----
export const G = GOODS.length, GI = Object.fromEntries(GOODS.map((g, i) => [g, i]));
export const JOB_LIST = Object.keys(JOBS), JI = Object.fromEntries(JOB_LIST.map((j, i) => [j, i])), FARM = JOB_LIST.map(j => JOBS[j].kind === 'farm');
const MIN_STOCK = { rice: 5, fish: 5, salt: 1, sake: 5, timber: 5, iron: 5, cloth: 3, silk: .5, weapons: 1, horses: 1, tools: 2 };
export const minStock = g => MIN_STOCK[GOODS[g]] ?? 1;

// ---- land: koku a year a plot can yield, from its zone's ground (an estimate of zone.js's tiles, without making them) ----
// Share of each biome's ground by kind (weights of zone.js GROUND): conv is grass + forest, which a settlement's ring turns to field or paddy
const GROUNDS = { coast: { grass: .3, conv: .3 }, plains: { grass: .6, field: .3, conv: .7 }, paddy: { paddy: .67, grass: .22, conv: .22 },
  forest: { grass: .2, conv: .9 }, bamboo: { grass: .2, conv: .3 }, marsh: { grass: .1, conv: .1 }, hills: { grass: .4, conv: .7 },
  mountains: { grass: .1, conv: .3 }, sea: { conv: 0 } };
// how much of each plot the settlement ring (16 < r < 28 tiles from the centre) covers: the same for every settlement
const RING = (() => { const f = new Array(PLOTS * PLOTS).fill(0), mid = ZONE / 2;
  for (let y = 0; y < ZONE; y++) for (let x = 0; x < ZONE; x++) { const d = Math.hypot(x - mid, y - mid); if (d > 16 && d < 28) f[Math.floor(y / PLOT) * PLOTS + Math.floor(x / PLOT)]++; }
  return f.map(n => n / (PLOT * PLOT)); })();
// koku a year of plot n of zone (zx, zy), fully worked in an average year. L.sys.economy.plotKoku[plotId] overrides it (land lane: cleared, irrigated)
const POT = new WeakMap();   // derived: L -> Map(zone index -> the 16 plots' koku), made once per world
export function plotKoku(L, zx, zy, n) {
  const E = L.sys.economy, over = E && E.plotKoku; if (over) for (const _ in over) { const o = over[plotId(zx, zy, n)]; if (o != null) return o; break; }
  let m = POT.get(L); if (!m) POT.set(L, m = new Map());
  const zi = zy * L.size.w + zx; let a = m.get(zi);
  if (!a) { a = new Float64Array(PLOTS * PLOTS); for (let k = 0; k < a.length; k++) a[k] = potential(L, zx, zy, k); m.set(zi, a); }
  return a[n];
}
function potential(L, zx, zy, n) {
  const z = zoneAt(L, zx, zy), g = GROUNDS[z.biome] || GROUNDS.sea, wet = z.biome === 'paddy' || z.biome === 'marsh';
  const ring = z.kind === 'town' || z.kind === 'village' ? RING[n] : 0, K = KOKU_TILE;
  const base = (g.field || 0) * K.field + (g.paddy || 0) * K.paddy + (g.grass || 0) * K.grass;
  const v = PLOT * PLOT * (ring * (g.conv * (wet ? K.paddy : K.field) + (1 - g.conv) * base) + (1 - ring) * base);
  return +(v * (.85 + (hash(L.seed, 'pk', zx, zy, n) % 1000) / 1000 * .3)).toFixed(2);
}
// who lords a zone: a zone lord set by the land lane (z.lord), a camp's chief, or the region's lord
export function zoneLord(L, z) {
  if (z.lord != null) return z.lord;
  if (z.kind === 'camp') return z.holder ?? null;
  const reg = L.regions[z.region]; return reg ? reg.lord ?? null : null;
}

// ---- init: markets, lords, pantries, trade routes ----
export function initEconomy(L) {
  const E = L.sys.economy, w = L.size.w;
  Object.assign(E, { v: 1, regions: [], lords: {}, pantry: {}, routes: [], caravans: [], kura: {}, banks: {}, plotKoku: {},
    flow: { mint: 0, loot: 0, temple: 0, buried: 0, fees: 0, other: 0 }, years: [], hist: [], stats: {} });
  // regions: land factors, starting stock at the target, prices at base
  const ix = index(L);
  for (const reg of L.regions) {
    const zs = { coast: 0, sea: 0, forest: 0, bamboo: 0, hills: 0, mountains: 0, plains: 0, paddy: 0, marsh: 0 }; let n = 0;
    for (const z of L.zones) if (z.region === reg.id) { zs[z.biome]++; n++;
      if (z.biome === 'coast') for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const q = zoneAt(L, z.x + dx, z.y + dy); if (q && q.biome === 'sea') { zs.sea++; break; } } }
    const cl = (v, lo, hi) => +Math.max(lo, Math.min(hi, v)).toFixed(2), kind = L.cultures[reg.culture].kind;
    const land = { fish: cl(zs.sea / 6 + zs.marsh / 8 + .2, .2, 1), salt: cl(zs.sea / 5, 0, 1), timber: cl((zs.forest + zs.bamboo) / 10 + zs.hills / 40, .1, 1),
      iron: cl((zs.mountains + zs.hills / 3) / 15, .05, 1), horses: cl((zs.plains + zs.hills / 2) / 20, .05, 1), silk: { court: 1, merchants: .25, clan: .05 }[kind] || 0,
      rice: 1, sake: 1, cloth: 1, weapons: 1, tools: 1 };
    const pop = ix.pop[reg.id] || 0, dem = GOODS.map(g => pop * (NEED[g] || 0));
    dem[GI.sake] = pop * .006; dem[GI.weapons] = pop * .0006; dem[GI.horses] = pop * .0002; dem[GI.silk] = (ix.royals[reg.id] || 0) * .001; dem[GI.iron] = pop * .01;
    const stock = dem.map((d, g) => +Math.max(minStock(g), d * GOOD[GOODS[g]].days).toFixed(2));
    E.regions.push({ id: reg.id, land, pop, stock, price: GOODS.map(g => GOOD[g].base), dem: dem.map(d => +d.toFixed(4)), fill: GOODS.map(() => 1),
      guild: pop * GUILD_START, temple: pop * 5, imp: GOODS.map(() => 0), exp: GOODS.map(() => 0),
      owe: dem.map((d, g) => g === GI.rice ? 0 : +(d * GOOD[GOODS[g]].base * .9 * SETTLE).toFixed(1)), pool: { service: 0, guild: 0 }, buried: 0, q: 1, war: 0, famine: false, made: GOODS.map(() => 0), sold: GOODS.map(() => 0) });
  }
  // lords: rank in koku (everything in the zones they lord); a granary started with half a year of their dues
  rankLords(L);
  for (const id in E.lords) E.lords[id].granary = +(E.lords[id].koku * TAX.plot * .5).toFixed(2);
  // farming households start with rice to the autumn harvest (56 days)
  for (const h of ix.hh) if (h.farm) E.pantry[h.key] = +(h.m.length * 60 / 112).toFixed(2);
  // trade routes: region seats joined along road zones (seat to the next seats reached)
  const seatOf = new Map(L.regions.map(g => [g.seat[1] * w + g.seat[0], g.id])), seen = new Set();
  for (const g of L.regions) {
    const s = g.seat[1] * w + g.seat[0], from = new Map([[s, -1]]), q = [s];
    while (q.length) { const i = q.shift(), x = i % w, y = (i - x) / w;
      if (i !== s && seatOf.has(i)) { const b = seatOf.get(i), k = Math.min(g.id, b) + '|' + Math.max(g.id, b);
        if (!seen.has(k)) { seen.add(k); const path = []; for (let j = i; j !== -1; j = from.get(j)) path.push(j); path.reverse(); E.routes.push({ a: g.id, b, path }); }
        continue; }
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const n = zoneAt(L, x + dx, y + dy); if (!n || !n.road) continue; const j = n.y * w + n.x;
        if (!from.has(j)) { from.set(j, i); q.push(j); } } }
  }
}
// every lord's koku: the yield of all the plots of the zones he lords, plus plots he holds elsewhere
export function rankLords(L) {
  const E = L.sys.economy;
  for (const id in E.lords) E.lords[id].koku = 0;
  const add = (id, k, region) => { if (!id) return; const l = E.lords[id] || (E.lords[id] = { region, koku: 0, granary: 0, taxIn: 0, taxOut: 0, paid: 1 }); l.koku += k; };
  for (const z of L.zones) {
    if (z.kind !== 'town' && z.kind !== 'village' && z.kind !== 'fort') continue;
    const lord = zoneLord(L, z);
    for (let n = 0; n < PLOTS * PLOTS; n++) { const k = plotKoku(L, z.x, z.y, n);
      if (lord) add(lord, k, z.region); else { const o = ownerOf(L, plotId(z.x, z.y, n)); if (o.holder) add(o.holder, k, z.region); } }
  }
  for (const pid in L.plots) { const o = L.plots[pid]; if (!o.holder || o.holder !== L.player) continue; const [zx, zy] = pid.split(':')[0].split(',').map(Number), z = zoneAt(L, zx, zy);
    if (o.holder && o.holder === L.player) add(o.holder, plotKoku(L, zx, zy, +pid.split(':')[1]), z.region); }
  for (const id in E.lords) E.lords[id].koku = +E.lords[id].koku.toFixed(1);
}

// class taste, flat [good index | -1 service | -2 offering, share, ...]; silk only for royalty (owner 2026-09-26: colour is rank)
const TASTES = Object.fromEntries(Object.entries(TASTE).map(([c, t]) => [c, Object.entries(t).filter(([k]) => k !== 'silk' || c === 'royal')
  .flatMap(([k, v]) => [k === 'service' ? -1 : k === 'offering' ? -2 : GI[k], v])]));
// the outlaw camp within CARAVAN.near zones of each step of each road (derived, for caravans' risk)
export function routeDanger(L, ix) {
  if (ix.danger) return ix.danger; const w = L.size.w, near = CARAVAN.near;
  ix.danger = L.sys.economy.routes.map(rt => Int32Array.from(rt.path, zi => { const x = zi % w, y = (zi - x) / w;
    for (let dy = -near; dy <= near; dy++) for (let dx = -near; dx <= near; dx++) { const j = (y + dy) * w + x + dx; if (ix.camps.has(j)) return j; } return -1; }));
  return ix.danger;
}
// ---- the household index: derived from L.actors, rebuilt when people are added or each year, never saved.
// Between rebuilds the dead are skipped where they stand; a move or a marriage takes effect at the next one ----
const CACHE = new WeakMap();
export function index(L) {
  // built as of the start of the current year, so it is the same whenever it is built (a loaded save lives on exactly as the original)
  const year = Math.floor(L.hour / HOURS_PER_YEAR), stamp = `${L.ids.a || 0}:${year}`; let ix = CACHE.get(L);
  if (ix && ix.stamp === stamp) return ix;
  const t0 = year * HOURS_PER_YEAR, w = L.size.w, R = L.regions.length, map = new Map(), adultLo = t0 - ADULT[1] * HOURS_PER_YEAR, adultHi = t0 - ADULT[0] * HOURS_PER_YEAR;
  const NJ = JOB_LIST.length, G_ = GOODS.length;
  // jobs[region][job index]: adult workers; scratch: each region's buffers for a step (day.js), made once per world so a day allocates nothing
  const scratch = ix ? ix.scratch : Array.from({ length: R }, () => ({ rate: new Float64Array(NJ), payer: new Int8Array(NJ), paid: new Float64Array(5),
    want: new Float64Array(G_), buy: new Float64Array(G_), made: new Float64Array(G_), inputs: new Float64Array(NJ * G_), cap: new Float64Array(NJ * G_), capOf: new Float64Array(G_) }));
  ix = { stamp, hh: [], byRegion: [], pop: new Array(R).fill(0), royals: new Array(R).fill(0), jobs: [], farmers: new Map(), merchants: [], camps: new Set(), scratch };
  for (let r = 0; r < R; r++) { ix.jobs.push(new Array(NJ).fill(0)); ix.merchants.push([]); ix.byRegion.push([]); }
  for (const id in L.actors) { const a = L.actors[id];
    if (!a.alive || id === L.player || !a.home) continue;
    const z = zoneAt(L, a.home[0], a.home[1]); if (!z || z.region < 0) continue;
    const key = a.household || a.id; let h = map.get(key);
    if (!h) { h = { key, zi: z.y * w + z.x, region: z.region, m: [], head: null, farm: false }; map.set(key, h); }
    h.m.push(a); if (a.id === key) h.head = a;
    ix.pop[z.region]++; if (a.cls === 'royal') ix.royals[z.region]++;
    const mo = a.money; if (typeof mo.silver !== 'number') mo.silver = 0; if (typeof mo.ryo !== 'number') mo.ryo = 0;
    if (!mo.mon) mo.mon = 0; else if (Number.isInteger(mo.mon)) { mo.mon += .5; mo.mon -= .5; }   // copper counts in fractions from here: settle the
    // field's representation once, not mid-year (exact for whole numbers, so a rebuild never changes a purse)
    const j = JI[a.job];
    if (j !== undefined && a.born <= adultHi && a.born > adultLo) { ix.jobs[z.region][j]++;
      if (FARM[j]) ix.farmers.set(h.zi, (ix.farmers.get(h.zi) || 0) + 1);
      if (j === JI.merchant) ix.merchants[z.region].push(a.id); }
  }
  for (const h of map.values()) { if (!h.head) h.head = h.m[0];
    if (h.m[0] !== h.head) { h.m.splice(h.m.indexOf(h.head), 1); h.m.unshift(h.head); }   // the head first
    h.mm = h.m.map(a => a.money); h.bb = h.m.map(a => a.born); h.jj = h.m.map(a => JI[a.job] ?? -1);
    const cls = h.head.cls; h.reserve = RESERVE[cls] ?? 150; h.taste = TASTES[cls] || TASTES.commoner; h.outlaw = cls === 'outlaw';
    h.farm = h.m.some(a => (a.holds && a.holds.length) || FARM[JI[a.job]]); ix.hh.push(h); ix.byRegion[h.region].push(h); }
  for (const z of L.zones) if (z.kind === 'camp') ix.camps.add(z.y * w + z.x);
  CACHE.set(L, ix);
  return ix;
}
export const isAdult = (L, a) => { const age = L.hour - a.born; return age >= ADULT[0] * HOURS_PER_YEAR && age < ADULT[1] * HOURS_PER_YEAR; };
// all the money in the world, by where it sits: purses (by class), guilds, temples, kura, money-changers
export function moneySupply(L) {
  const E = L.sys.economy, byCls = {}; let purses = 0;
  for (const id in L.actors) { const a = L.actors[id]; if (!a.money) continue; const v = worth(a.money); purses += v; byCls[a.cls] = (byCls[a.cls] || 0) + v; }
  let guild = 0, temple = 0, pools = 0, buried = 0; for (const r of E.regions) { guild += r.guild; temple += r.temple; pools += r.pool.service + r.pool.guild; buried += r.buried; }
  let kura = 0; for (const k in E.kura) kura += worth(E.kura[k].money);
  let banks = 0; for (const t in E.banks) for (const id in E.banks[t]) banks += worth(E.banks[t][id]);
  return { total: purses + guild + temple + pools + kura + banks, purses, guild, temple, pools, kura, banks, buried, byCls };
}
