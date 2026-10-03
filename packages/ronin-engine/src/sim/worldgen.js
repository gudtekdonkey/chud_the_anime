import { rngFor, hash } from './rng.js';
import { createLedger, initSystems, zoneAt } from './ledger.js';
import { KINDS, kindRelation, placeName, familyName } from './packs/edo/cultures.js';
import { populate } from './actors.js';

// ---- The world from a seed: 100 × 100 zones, terrain, 100 regions, 20 cultures, settlements, camps, shrines, roads, people ----
// Zone record (compact, one per grid square; the tiles inside are made on demand by zone.js):
//   { x, y, biome, region (-1 at sea), kind, road, name?, holder? (a camp's chief), void? (a void: nobody lives there; wild.js) }
// biome: sea, coast, plains, paddy, forest, bamboo, marsh, hills, mountains
// kind:  sea | wild | town (the region's seat) | village | camp (outlaws, a hostile base that spawns) | fort (a culture's garrison) | shrine
// Region: { id, name, culture, seat: [x, y], zones: n, center: [x, y] }
// Culture: { id, name, kind, regions: [ids], relations: { cultureId: -1..1 }, color (map only) }

// value noise on the grid, smooth and seeded
function noise(seed, scale, octaves = 4) {
  const cache = new Map(), cell = (ix, iy) => { const k = ix + ',' + iy; let v = cache.get(k); if (v == null) { v = (hash(seed, ix, iy) % 100000) / 100000; cache.set(k, v); } return v; };
  const sm = t => t * t * (3 - 2 * t);
  const one = (x, y) => { const ix = Math.floor(x), iy = Math.floor(y), fx = sm(x - ix), fy = sm(y - iy);
    const a = cell(ix, iy), b = cell(ix + 1, iy), c = cell(ix, iy + 1), d = cell(ix + 1, iy + 1);
    return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy; };
  return (x, y) => { let v = 0, amp = 1, tot = 0, f = 1 / scale; for (let o = 0; o < octaves; o++) { v += one(x * f, y * f) * amp; tot += amp; amp *= .5; f *= 2; } return v / tot; };
}

export function generateWorld(seed, realNow = Date.now()) {
  const L = createLedger(seed, realNow), { w, h } = L.size;
  // ---- terrain: an archipelago that fills the grid, sea round the edges ----
  const elevN = noise(hash(seed, 'elev'), 22), moistN = noise(hash(seed, 'moist'), 18), warpN = noise(hash(seed, 'warp'), 14, 2);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const dx = (x - w / 2) / (w / 2), dy = (y - h / 2) / (h / 2), edge = Math.max(0, Math.max(Math.abs(dx), Math.abs(dy * 1.05)) - .78);
    const elev = Math.max(0, Math.min(1, elevN(x, y) * 1.3 + .02 - edge * 2.2)), moist = moistN(x + 400, y + 400);
    let biome = 'plains';
    if (elev < .26) biome = 'sea'; else if (elev < .3) biome = 'coast';
    else if (elev > .74) biome = 'mountains'; else if (elev > .6) biome = 'hills';
    else if (moist > .64) biome = elev < .42 ? 'marsh' : 'forest';
    else if (moist > .5) biome = elev < .46 ? 'paddy' : (moist > .58 ? 'bamboo' : 'forest');
    L.zones.push({ x, y, biome, region: -1, kind: biome === 'sea' ? 'sea' : 'wild', road: false });
  }
  const land = L.zones.filter(z => z.biome !== 'sea');
  // ---- 100 regions: seeds spread over the land, borders warped so they wander ----
  const r = rngFor(seed, 'regions'), seeds = [];
  for (let minD = 9; seeds.length < 100 && minD > 2; minD -= .5)
    for (let tries = 0; tries < 4000 && seeds.length < 100; tries++) { const z = r.pick(land); if (seeds.every(s => Math.hypot(s.x - z.x, s.y - z.y) >= minD)) seeds.push(z); }
  for (const z of land) { let best = 0, bd = 1e9; const wx = z.x + (warpN(z.x, z.y) - .5) * 8, wy = z.y + (warpN(z.x + 99, z.y + 99) - .5) * 8;
    seeds.forEach((s, i) => { const d = Math.hypot(s.x - wx, s.y - wy); if (d < bd) { bd = d; best = i; } }); z.region = best; }
  L.regions = seeds.map((s, i) => ({ id: i, name: placeName(rngFor(seed, 'rname', i)), culture: -1, seat: null, zones: 0, center: [s.x, s.y] }));
  for (const z of land) L.regions[z.region].zones++;
  // region adjacency
  const adj = L.regions.map(() => new Set());
  for (const z of land) for (const [dx, dy] of [[1, 0], [0, 1]]) { const n = zoneAt(L, z.x + dx, z.y + dy); if (n && n.region >= 0 && n.region !== z.region) { adj[z.region].add(n.region); adj[n.region].add(z.region); } }
  // ---- 20 cultures, grown over neighbouring regions from starting regions far apart ----
  const cr = rngFor(seed, 'cultures'), kinds = [];
  for (const [kind, k] of Object.entries(KINDS)) for (let i = 0; i < k.count; i++) kinds.push(kind);
  cr.shuffle(kinds);
  const starts = [cr.int(0, 99)];
  while (starts.length < kinds.length) { let best = -1, bd = -1;
    for (const g of L.regions) { if (starts.includes(g.id)) continue; const d = Math.min(...starts.map(s => Math.hypot(L.regions[s].center[0] - g.center[0], L.regions[s].center[1] - g.center[1]))); if (d > bd) { bd = d; best = g.id; } }
    starts.push(best); }
  L.cultures = kinds.map((kind, i) => { const cn = rngFor(seed, 'cname', i);
    return { id: i, kind, name: cultureName(cn, kind), regions: [starts[i]], relations: {}, hue: Math.round(i * 137.5) % 360 }; });
  starts.forEach((g, i) => L.regions[g].culture = i);
  // grow: the culture furthest below its size takes a free neighbouring region, until every region belongs to someone
  for (let guard = 0; guard < 1000 && L.regions.some(g => g.culture < 0); guard++) {
    const order = L.cultures.slice().sort((a, b) => a.regions.length / KINDS[a.kind].size - b.regions.length / KINDS[b.kind].size);
    let grew = false;
    for (const c of order) { const free = [...new Set(c.regions.flatMap(g => [...adj[g]]))].filter(g => L.regions[g].culture < 0);
      if (free.length) { const g = cr.pick(free); L.regions[g].culture = c.id; c.regions.push(g); grew = true; break; } }
    if (!grew) { const g = L.regions.find(q => q.culture < 0), n = [...adj[g.id]].find(q => L.regions[q].culture >= 0);
      const c = L.cultures[n != null ? L.regions[n].culture : 0]; g.culture = c.id; c.regions.push(g.id); }
  }
  // relations: the kinds' feelings, neighbours pushed toward rivalry, and a little history of their own
  const border = new Set(); for (const g of L.regions) for (const n of adj[g.id]) if (L.regions[n].culture !== g.culture) border.add([g.culture, L.regions[n].culture].sort().join('|'));
  for (const a of L.cultures) for (const b of L.cultures) if (a.id < b.id) {
    const hr = rngFor(seed, 'rel', a.id, b.id), v = Math.max(-1, Math.min(1, kindRelation(a.kind, b.kind) + (border.has(a.id + '|' + b.id) ? -.2 : 0) + hr.range(-.25, .25)));
    a.relations[b.id] = b.relations[a.id] = +v.toFixed(2); }
  // ---- the voids (owner, 2026-09-26): great tracts where nobody lives and the mystical creatures do. People keep out of them;
  // bandits hold their edges. No settlement is placed in one and roads go round them unless there is no other way (wild.js) ----
  carveVoids(L, land, seed);
  // how far each land zone is from a void (0 inside one): camps prefer the void's edge, the bandits' country
  const toVoid = new Map(), q = land.filter(z => z.void); for (const z of q) toVoid.set(z, 0);
  for (let i = 0; i < q.length; i++) { const z = q[i], d = toVoid.get(z); if (d >= 4) continue;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const n = zoneAt(L, z.x + dx, z.y + dy); if (n && n.biome !== 'sea' && !toVoid.has(n)) { toVoid.set(n, d + 1); q.push(n); } } }
  // ---- settlements: each region's seat, villages, camps, forts and a shrine, placed where they make sense ----
  const pr = rngFor(seed, 'places');
  const placed = [];
  const fit = { town: { paddy: 3, plains: 3, coast: 2, forest: 1, bamboo: 1, hills: 1 }, village: { paddy: 4, plains: 3, coast: 3, forest: 2, bamboo: 2, hills: 1, marsh: 1 },
    camp: { forest: 3, hills: 3, bamboo: 2, marsh: 2, mountains: 1 }, fort: { hills: 4, plains: 2, mountains: 2 }, shrine: { hills: 3, mountains: 3, forest: 2, bamboo: 2 } };
  for (const g of L.regions) {
    const zs = land.filter(z => z.region === g.id), kind = L.cultures[g.culture].kind;
    const place = (what, minGap = 4) => { const cands = zs.filter(z => z.kind === 'wild' && !z.void && fit[what][z.biome] &&
      placed.every(o => Math.abs(o.x - z.x) + Math.abs(o.y - z.y) >= minGap));
      if (!cands.length) return null;
      const edge = z => what === 'camp' && (toVoid.get(z) ?? 9) <= 3 ? 4 : 1;   // bandits camp on the void's edge
      const z = pr.weighted(cands.map(c => [c, fit[what][c.biome] * edge(c)])); z.kind = what; placed.push(z); return z; };
    const seat = place(kind === 'bandits' ? 'camp' : 'town', 5) || zs.find(z => !z.void) || zs[0]; if (!placed.includes(seat)) placed.push(seat); seat.kind = kind === 'bandits' ? 'camp' : 'town';
    seat.name = placeName(rngFor(seed, 'seat', g.id)); g.seat = [seat.x, seat.y];
    const nv = kind === 'bandits' ? pr.int(0, 1) : pr.int(2, Math.min(4, 1 + Math.floor(zs.length / 25)));
    for (let i = 0; i < nv; i++) { const z = place('village'); if (z) z.name = placeName(rngFor(seed, 'village', z.x, z.y)); }
    const ncamp = kind === 'bandits' ? pr.int(2, 3) : pr.int(0, 2);
    for (let i = 0; i < ncamp; i++) { const z = place('camp', 3); if (z) z.name = placeName(rngFor(seed, 'camp', z.x, z.y)) + ' camp'; }
    if (kind === 'clan' || kind === 'court') { const z = place('fort', 4); if (z) z.name = placeName(rngFor(seed, 'fort', z.x, z.y)) + ' fort'; }
    if (pr.chance(kind === 'monastic' ? 1 : .6)) { const z = place('shrine', 3); if (z) z.name = placeName(rngFor(seed, 'shrine', z.x, z.y)) + ' shrine'; }
  }
  // ---- roads: seats joined across the land, every village to its seat, along the easiest ground ----
  const seats = L.regions.map(g => zoneAt(L, ...g.seat));
  const linked = [seats[0]], rest = seats.slice(1);
  while (rest.length) { let bi = 0, bj = 0, bd = 1e9;
    for (let i = 0; i < linked.length; i++) for (let j = 0; j < rest.length; j++) { const d = Math.hypot(linked[i].x - rest[j].x, linked[i].y - rest[j].y); if (d < bd) { bd = d; bi = i; bj = j; } }
    road(L, linked[bi], rest[bj]); linked.push(rest.splice(bj, 1)[0]); }
  for (const z of land) if (z.kind === 'village' || z.kind === 'fort' || z.kind === 'shrine') road(L, z, zoneAt(L, ...L.regions[z.region].seat));
  // ---- people ----
  populate(L);
  initSystems(L);
  return L;
}
const COST = { sea: 1e9, coast: 1.5, plains: 1, paddy: 1.3, forest: 2, bamboo: 2.2, marsh: 3.5, hills: 2.5, mountains: 6 };
// ~9 blobs, about 15% of the land, on wild ground (mountains, forest, marsh first), far apart; each region keeps a settled core
export const VOIDS = { n: 9, share: .15, gap: 18, r: [5, 8] };
function carveVoids(L, land, seed) {
  const r = rngFor(seed, 'voids'), wildW = { mountains: 4, marsh: 3, forest: 3, bamboo: 2, hills: 2, plains: 1, paddy: .3, coast: .2 };
  const warp = noise(hash(seed, 'voidw'), 6), centres = [], target = land.length * VOIDS.share, pick = land.map(z => [z, wildW[z.biome] || 1]); let carved = 0;
  for (let tries = 0; centres.length < VOIDS.n && tries < 400; tries++) {
    const c = r.weighted(pick);
    if (centres.some(o => Math.hypot(o.x - c.x, o.y - c.y) < VOIDS.gap)) continue;
    centres.push(c); const rad = r.range(...VOIDS.r);
    for (const z of land) { const d = Math.hypot(z.x - c.x, z.y - c.y) / rad + (warp(z.x, z.y) - .5) * .7;
      if (d < 1 && !z.void && carved < target * 1.3) { z.void = true; carved++; } } }
  // a region swallowed by a void keeps a settled core: its zones nearest its middle come back
  for (const g of L.regions) { const zs = land.filter(z => z.region === g.id), open = zs.filter(z => !z.void).length, need = Math.min(zs.length, 8);
    if (open < need) zs.sort((a, b) => Math.hypot(a.x - g.center[0], a.y - g.center[1]) - Math.hypot(b.x - g.center[0], b.y - g.center[1])).slice(0, need).forEach(z => delete z.void); }
}
function road(L, a, b) {
  if (!a || !b || a === b) return;
  const { w } = L.size, start = a.y * w + a.x, goal = b.y * w + b.x, g = new Map([[start, 0]]), from = new Map(), open = [[0, start]];
  const push = (f, i) => { open.push([f, i]); let k = open.length - 1; while (k > 0) { const p = (k - 1) >> 1; if (open[p][0] <= open[k][0]) break; [open[p], open[k]] = [open[k], open[p]]; k = p; } };
  const pop = () => { const top = open[0], last = open.pop(); if (open.length) { open[0] = last; let k = 0; for (;;) { const l = 2 * k + 1, r = l + 1; let m = k;
    if (l < open.length && open[l][0] < open[m][0]) m = l; if (r < open.length && open[r][0] < open[m][0]) m = r; if (m === k) break; [open[m], open[k]] = [open[k], open[m]]; k = m; } } return top; };
  while (open.length) { const [, i] = pop(); if (i === goal) break; const x = i % w, y = (i - x) / w;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const n = zoneAt(L, x + dx, y + dy); if (!n) continue; const j = n.y * w + n.x;
      const c = g.get(i) + (n.road ? .35 : COST[n.biome] * (n.void ? 8 : 1)); if (c < (g.get(j) ?? 1e12)) { g.set(j, c); from.set(j, i); push(c + Math.abs(n.x - b.x) + Math.abs(n.y - b.y), j); } } }
  for (let i = goal; i != null && i !== start; i = from.get(i)) L.zones[i].road = true;
  L.zones[start].road = true;
}
function cultureName(r, kind) {
  const n = familyName(r);
  return { clan: `the ${n} clan`, court: `the Court of ${placeName(r)}`, rebels: `the free valleys of ${placeName(r)}`, monastic: `the temples of ${placeName(r)}`,
    bandits: `the ${r.pick(['Red', 'Black', 'Salt', 'Crow', 'Iron'])} ${r.pick(['Tide', 'Coast', 'Knives', 'Wake'])}`, shinobi: `the hidden ${n}`,
    merchants: `the ${n} league`, fishers: `the ${placeName(r)} fisherfolk`, miners: `the ${placeName(r)} mountain folk` }[kind];
}
