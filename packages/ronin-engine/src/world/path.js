// ---- Paths round the courtyard's obstacles (click to move, a companion sent somewhere): A* on a grid of 6-unit cells
// over the room, each cell blocked where a circle of radius r would touch a solid (world/room.js SOLID, items included),
// then pulled tight (a waypoint is dropped while the straight line past it stays clear). World units.
import { SOLID, ROOM } from './room.js';

const C = 6, GW = Math.ceil((ROOM.x1 - ROOM.x0) / C), GH = Math.ceil((ROOM.z1 - ROOM.z0) / C);
const grids = new Map();   // per radius, rebuilt when the solids change
function grid(r) {
  const key = Math.round(r), g0 = grids.get(key); if (g0 && g0.n === SOLID.length) return g0.g;
  const g = new Uint8Array(GW * GH);
  for (let j = 0; j < GH; j++) for (let i = 0; i < GW; i++) { const x = ROOM.x0 + (i + .5) * C, z = ROOM.z0 + (j + .5) * C;
    if (x < ROOM.x0 + r || x > ROOM.x1 - r || z < ROOM.z0 + r || z > ROOM.z1 - r) { g[j * GW + i] = 1; continue; }
    for (const b of SOLID) if (x > b.x0 - r && x < b.x1 + r && z > b.z0 - r && z < b.z1 + r) { g[j * GW + i] = 1; break; } }
  grids.set(key, { g, n: SOLID.length }); return g;
}
const cell = (x, z) => [Math.max(0, Math.min(GW - 1, Math.floor((x - ROOM.x0) / C))), Math.max(0, Math.min(GH - 1, Math.floor((z - ROOM.z0) / C)))];
const blocked = (g, x, z) => { const [i, j] = cell(x, z); return g[j * GW + i] === 1; };
// is the straight line from a to b clear (sampled every 2 units)?
export function clear(x0, z0, x1, z1, r = 5) { const g = grid(r), n = Math.ceil(Math.hypot(x1 - x0, z1 - z0) / 2);
  for (let k = 1; k <= n; k++) if (blocked(g, x0 + (x1 - x0) * k / n, z0 + (z1 - z0) * k / n)) return false; return true; }
// the nearest free cell's centre to (x, z)
export function freeNear(x, z, r = 5) { const g = grid(r); if (!blocked(g, x, z)) return [x, z]; const [ci, cj] = cell(x, z);
  for (let s = 1; s < 30; s++) for (let dj = -s; dj <= s; dj++) for (let di = -s; di <= s; di++) { if (Math.max(Math.abs(di), Math.abs(dj)) !== s) continue;
    const i = ci + di, j = cj + dj; if (i >= 0 && j >= 0 && i < GW && j < GH && !g[j * GW + i]) return [ROOM.x0 + (i + .5) * C, ROOM.z0 + (j + .5) * C]; }
  return [x, z]; }
// waypoints from (x0, z0) to (x1, z1), the start left out; null when there is no way
export function findPath(x0, z0, x1, z1, r = 5) {
  [x1, z1] = freeNear(x1, z1, r);
  if (clear(x0, z0, x1, z1, r)) return [[x1, z1]];
  const g = grid(r), [si, sj] = cell(x0, z0), [ti, tj] = cell(x1, z1), N = GW * GH, s = sj * GW + si, t = tj * GW + ti;
  const gs = new Float32Array(N).fill(1e9), from = new Int32Array(N).fill(-1), done = new Uint8Array(N), open = [s]; gs[s] = 0;
  const hf = k => Math.hypot(k % GW - ti, Math.floor(k / GW) - tj);
  while (open.length) {
    let bi = 0; for (let i = 1; i < open.length; i++) if (gs[open[i]] + hf(open[i]) < gs[open[bi]] + hf(open[bi])) bi = i;
    const k = open[bi]; open.splice(bi, 1); if (k === t) break; if (done[k]) continue; done[k] = 1;
    const ki = k % GW, kj = Math.floor(k / GW);
    for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) { if (!di && !dj) continue; const i = ki + di, j = kj + dj; if (i < 0 || j < 0 || i >= GW || j >= GH) continue;
      const n = j * GW + i; if ((g[n] && n !== t) || done[n]) continue; if (di && dj && (g[kj * GW + i] || g[j * GW + ki])) continue;   // no cutting corners
      const c = gs[k] + (di && dj ? 1.414 : 1); if (c < gs[n]) { gs[n] = c; from[n] = k; open.push(n); } }
  }
  if (from[t] < 0 && t !== s) return null;
  const pts = []; for (let k = t; k !== s && k >= 0; k = from[k]) pts.unshift([ROOM.x0 + (k % GW + .5) * C, ROOM.z0 + (Math.floor(k / GW) + .5) * C]);
  pts[pts.length - 1] = [x1, z1];
  // pull it tight
  const out = []; let cx = x0, cz = z0, i = 0;
  while (i < pts.length) { let j = pts.length - 1; while (j > i && !clear(cx, cz, pts[j][0], pts[j][1], r)) j--; out.push(pts[j]); [cx, cz] = pts[j]; i = j + 1; }
  return out;
}
