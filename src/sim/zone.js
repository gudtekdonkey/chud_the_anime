import { rngFor, hash } from './rng.js';
import { zoneAt } from './ledger.js';

// ---- Inside a zone: its tiles and plots, made from the seed when first needed (never stored unless changed) ----
// A zone is ZONE × ZONE tiles (proposed 64 × 64 at 16 px: docs/foundations.md). Its plots are a PLOTS × PLOTS grid of equal squares
// for now (16 plots of 16 × 16 tiles); the land session may give them their own shapes later. Plot id: "zx,zy:n", n = 0..15.
export const ZONE = 64, PLOTS = 4, PLOT = ZONE / PLOTS;
export const TERRAIN = ['grass', 'field', 'paddy', 'forest', 'bamboo', 'water', 'rock', 'sand', 'road', 'building', 'marsh', 'shrine', 'palisade', 'wall'];
const T = Object.fromEntries(TERRAIN.map((t, i) => [t, i]));
// what each biome's ground is made of: [terrain, weight]
const GROUND = {
  coast: [['sand', 4], ['grass', 3], ['water', 2], ['rock', 1]], plains: [['grass', 6], ['field', 3], ['forest', 1]], paddy: [['paddy', 6], ['grass', 2], ['water', 1]],
  forest: [['forest', 7], ['grass', 2], ['rock', 1]], bamboo: [['bamboo', 7], ['grass', 2], ['forest', 1]], marsh: [['marsh', 6], ['water', 3], ['grass', 1]],
  hills: [['grass', 4], ['rock', 3], ['forest', 3]], mountains: [['rock', 7], ['forest', 2], ['grass', 1]], sea: [['water', 1]],
};
const cache = new Map();
// { w, h, t: Uint8Array of TERRAIN indices } for zone (zx, zy); cached per ledger seed
export function tilesOf(L, zx, zy) {
  const key = L.seed + ':' + zx + ',' + zy; if (cache.has(key)) return cache.get(key);
  const z = zoneAt(L, zx, zy), r = rngFor(L.seed, 'tiles', zx, zy), t = new Uint8Array(ZONE * ZONE);
  // patches, not noise per tile: 8 × 8 cells of ground, each tile taking its cell's ground with a ragged edge
  const g = GROUND[z.biome], cell = [];
  for (let i = 0; i < 64; i++) cell.push(T[r.weighted(g)]);
  for (let y = 0; y < ZONE; y++) for (let x = 0; x < ZONE; x++) {
    const jx = Math.min(7, Math.max(0, (x + (hash(L.seed, zx, zy, x, y, 'j') % 5) - 2) >> 3)), jy = Math.min(7, Math.max(0, (y + (hash(L.seed, zx, zy, y, x, 'k') % 5) - 2) >> 3));
    t[y * ZONE + x] = cell[jy * 8 + jx]; }
  // roads: from the centre to each side that joins a neighbouring road zone
  if (z.road) for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const n = zoneAt(L, zx + dx, zy + dy); if (!n || !n.road) continue;
    for (let k = 0; k <= ZONE / 2; k++) { const x = ZONE / 2 + dx * k, y = ZONE / 2 + dy * k;
      for (const o of [0, 1]) { const xx = Math.min(ZONE - 1, x + (dy ? o : 0)), yy = Math.min(ZONE - 1, y + (dx ? o : 0)); t[yy * ZONE + xx] = T.road; } } }
  // settlements: buildings round the middle; a camp's palisade; a fort's wall; a shrine's ground
  const mid = ZONE / 2, ring = (rad, what, gap) => { for (let a = 0; a < 6.283; a += .02) { const x = Math.round(mid + Math.cos(a) * rad), y = Math.round(mid + Math.sin(a) * rad);
    if (!(gap && Math.abs(Math.sin(a)) < .12 && Math.cos(a) > 0)) t[y * ZONE + x] = T[what]; } };
  if (z.kind === 'town' || z.kind === 'village') { const n = z.kind === 'town' ? 26 : 12;
    for (let i = 0; i < n; i++) { const bx = mid + r.int(-14, 12), by = mid + r.int(-14, 12), bw = r.int(3, 5), bh = r.int(2, 4);
      for (let y = by; y < by + bh; y++) for (let x = bx; x < bx + bw; x++) if (t[y * ZONE + x] !== T.road) t[y * ZONE + x] = T.building; }
    for (let y = 0; y < ZONE; y++) for (let x = 0; x < ZONE; x++) { const i = y * ZONE + x; if ((t[i] === T.grass || t[i] === T.forest) && Math.hypot(x - mid, y - mid) > 16 && Math.hypot(x - mid, y - mid) < 28) t[i] = z.biome === 'paddy' || z.biome === 'marsh' ? T.paddy : T.field; } }
  if (z.kind === 'camp') { ring(9, 'palisade', true); for (let i = 0; i < 5; i++) { const x = mid + r.int(-5, 4), y = mid + r.int(-5, 4); t[y * ZONE + x] = T.building; } }
  if (z.kind === 'fort') { ring(12, 'wall', true); for (let y = mid - 4; y < mid + 4; y++) for (let x = mid - 5; x < mid + 5; x++) t[y * ZONE + x] = T.building; }
  if (z.kind === 'shrine') for (let y = mid - 3; y < mid + 3; y++) for (let x = mid - 3; x < mid + 3; x++) t[y * ZONE + x] = T.shrine;
  const out = { w: ZONE, h: ZONE, t };
  cache.set(key, out); if (cache.size > 64) cache.delete(cache.keys().next().value);
  return out;
}
export const plotId = (zx, zy, n) => `${zx},${zy}:${n}`;
export const plotAt = (zx, zy, tx, ty) => plotId(zx, zy, Math.floor(ty / PLOT) * PLOTS + Math.floor(tx / PLOT));
// who holds a plot: the stored record, or the zone's default. title: who owns it on paper; holder: who has it now (owner 2026-09-26:
// raids take possession, never the legal title). null is nature: nobody, claimable.
export function ownerOf(L, pid) {
  if (L.plots[pid]) return L.plots[pid];
  const [zx, zy] = pid.split(':')[0].split(',').map(Number), z = zoneAt(L, zx, zy), reg = L.regions[z.region];
  if (z.kind === 'town' || z.kind === 'village' || z.kind === 'fort') return { title: reg ? reg.lord ?? null : null, holder: reg ? reg.lord ?? null : null };
  if (z.kind === 'camp') return { title: null, holder: z.holder ?? null };   // held by force, owned by nobody
  return { title: null, holder: null };
}
