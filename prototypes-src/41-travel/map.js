// ---- Prototype 41: a stretch of the world map round him (40 × 24 zones, 12 px a zone), with the roads' dangers and the storms ----
import { zoneAt } from 'ronin-engine/sim/ledger.js';
import { stormAt } from '../../src/sim/travel/storms.js';

export const MW = 40, MH = 24, Z = 12;
const BIOME = { sea: '#1b2326', coast: '#3a4240', plains: '#444b47', paddy: '#3e4946', forest: '#343e39', bamboo: '#37423b', marsh: '#39413e', hills: '#4c504e', mountains: '#5a5f5d' };
const rr = (a, b) => a + Math.random() * (b - a), ri = (a, b) => Math.floor(rr(a, b + 1));

export function makeMap(cv) {
  const g = cv.getContext('2d'), M = { g, ox: 0, oy: 0, hover: null, showDanger: false };
  M.center = (x, y, L) => { M.ox = Math.max(0, Math.min(L.size.w - MW, x - MW / 2)); M.oy = Math.max(0, Math.min(L.size.h - MH, y - MH / 2)); };
  M.zoneAtPx = (px, py) => [M.ox + Math.floor(px / Z), M.oy + Math.floor(py / Z)];
  M.draw = (L, me, route, t) => {
    const st = L.sys.travel;
    g.fillStyle = '#121416'; g.fillRect(0, 0, cv.width, cv.height);
    for (let j = 0; j < MH; j++) for (let i = 0; i < MW; i++) { const z = zoneAt(L, M.ox + i, M.oy + j); if (!z) continue; const x = i * Z, y = j * Z;
      g.fillStyle = BIOME[z.biome]; g.fillRect(x, y, Z, Z);
      if (M.showDanger && z.region >= 0) { const d = st.regions[z.region].danger; g.fillStyle = `rgba(255,90,74,${(d * .32).toFixed(3)})`; g.fillRect(x, y, Z, Z); }
      // region borders: a dark line where the region changes
      const e = zoneAt(L, z.x + 1, z.y), s = zoneAt(L, z.x, z.y + 1); g.fillStyle = '#23292a';
      if (e && e.region !== z.region && z.kind !== 'sea' && e.kind !== 'sea') g.fillRect(x + Z - 1, y, 1, Z);
      if (s && s.region !== z.region && z.kind !== 'sea' && s.kind !== 'sea') g.fillRect(x, y + Z - 1, Z, 1); }
    // roads: joined to their road neighbours, packed-earth colour
    g.fillStyle = '#7a7466';
    for (let j = 0; j < MH; j++) for (let i = 0; i < MW; i++) { const z = zoneAt(L, M.ox + i, M.oy + j); if (!z || !z.road) continue; const cx = i * Z + Z / 2, cy = j * Z + Z / 2;
      g.fillRect(cx - 1, cy - 1, 2, 2);
      for (const [dx, dy] of [[1, 0], [0, 1], [-1, 0], [0, -1]]) { const n = zoneAt(L, z.x + dx, z.y + dy); if (n && n.road) g.fillRect(dx ? (dx > 0 ? cx : cx - Z / 2) : cx - 1, dy ? (dy > 0 ? cy : cy - Z / 2) : cy - 1, dx ? Z / 2 : 2, dy ? Z / 2 : 2); } }
    // places
    for (let j = 0; j < MH; j++) for (let i = 0; i < MW; i++) { const z = zoneAt(L, M.ox + i, M.oy + j); if (!z) continue; const cx = i * Z + Z / 2, cy = j * Z + Z / 2;
      if (z.kind === 'town') { g.fillStyle = '#0c0d0e'; g.fillRect(cx - 4, cy - 4, 8, 8); g.fillStyle = '#d4d9d6'; g.fillRect(cx - 3, cy - 3, 6, 6); }
      else if (z.kind === 'village') { g.fillStyle = '#0c0d0e'; g.fillRect(cx - 3, cy - 3, 6, 6); g.fillStyle = '#aab1ae'; g.fillRect(cx - 2, cy - 2, 4, 4); }
      else if (z.kind === 'camp') { g.fillStyle = '#b0524a'; for (let k = -3; k <= 3; k++) { g.fillRect(cx + k, cy + k, 1, 1); g.fillRect(cx + k, cy - k, 1, 1); } }
      else if (z.kind === 'fort') { g.fillStyle = '#8d9491'; g.fillRect(cx - 4, cy - 4, 8, 1); g.fillRect(cx - 4, cy + 3, 8, 1); g.fillRect(cx - 4, cy - 4, 1, 8); g.fillRect(cx + 3, cy - 4, 1, 8); }
      else if (z.kind === 'shrine') { const dark = st.dark[z.x + ',' + z.y]; g.fillStyle = dark ? '#3e4442' : '#c0605a'; g.fillRect(cx - 4, cy - 3, 9, 1); g.fillRect(cx - 3, cy - 3, 1, 7); g.fillRect(cx + 3, cy - 3, 1, 7);
        if (dark) { g.fillStyle = '#52e8d6'; g.fillRect(cx + ri(-3, 3), cy + ri(-2, 3), 2, 1); } } }
    // outlaw bands on the road
    for (const b of st.bands) { const i = b.at[0] - M.ox, j = b.at[1] - M.oy; if (i < 0 || j < 0 || i >= MW || j >= MH) continue;
      g.fillStyle = '#0c0d0e'; g.fillRect(i * Z + 3, j * Z + 3, 6, 6); g.fillStyle = (t * 2 | 0) % 2 ? '#ff5a4a' : '#b0524a'; g.fillRect(i * Z + 4, j * Z + 4, 4, 4); }
    // storms: their trail, then the storm itself in its own language (torn rows, slivers), never a drawn circle
    for (const s of st.storms) {
      g.fillStyle = 'rgba(82,232,214,.55)'; for (const [x, y] of s.path) { const i = x - M.ox, j = y - M.oy; if (i >= 0 && j >= 0 && i < MW && j < MH) g.fillRect(i * Z + 5, j * Z + 5, 2, 2); }
      const R = Math.ceil(s.r * 1.4), x0 = Math.floor(s.x - R) - M.ox, y0 = Math.floor(s.y - R) - M.oy;
      for (let j = y0; j <= y0 + 2 * R; j++) for (let i = x0; i <= x0 + 2 * R; i++) { if (i < 0 || j < 0 || i >= MW || j >= MH) continue;
        const k = stormAt(L, M.ox + i + .5, M.oy + j + .5).k; if (k <= 0) continue;
        g.fillStyle = `rgba(6,10,12,${(.35 * k).toFixed(3)})`; g.fillRect(i * Z, j * Z, Z, Z);
        for (let n = 0; n < 1 + k * 5; n++) if (Math.random() < .5) { g.fillStyle = ['#52e8d6', '#b8fff6', '#ffffff', '#0d1012'][ri(0, 3)]; g.fillRect(i * Z + ri(0, Z - 2), j * Z + ri(0, Z - 1), ri(1, 5), 1); } }
      // torn rows through the storm on the map too
      const top = (Math.floor(s.y - R) - M.oy) * Z, h = (2 * R + 1) * Z;
      for (let n = 0; n < 4 * s.power; n++) { const y = top + ri(0, h), rh = ri(1, 3), x = (Math.floor(s.x - R) - M.ox) * Z, w = (2 * R + 1) * Z;
        if (y > 0 && y < cv.height) g.drawImage(cv, Math.max(0, x), y, w, rh, Math.max(0, x) + (Math.random() < .5 ? -1 : 1) * ri(1, 4), y, w, rh); }
    }
    // his route and him
    g.fillStyle = 'rgba(233,238,238,.7)'; for (const [x, y] of route || []) { const i = x - M.ox, j = y - M.oy; g.fillRect(i * Z + 5, j * Z + 5, 2, 2); }
    const i = me[0] - M.ox, j = me[1] - M.oy; g.fillStyle = '#0c0d0e'; g.fillRect(i * Z + 2, j * Z + 2, 8, 8); g.fillStyle = '#6ff3e4'; g.fillRect(i * Z + 3, j * Z + 3, 6, 6); g.fillStyle = '#0c0d11'; g.fillRect(i * Z + 5, j * Z + 5, 2, 2);
    if (M.hover) { const [hx, hy] = M.hover; g.strokeStyle = 'rgba(233,238,238,.6)'; g.strokeRect((hx - M.ox) * Z + .5, (hy - M.oy) * Z + .5, Z - 1, Z - 1); }
  };
  return M;
}

// the way there: roads are fast, open land slow, never the sea (the same costs worldgen lays its roads by)
const COST = { coast: 1.5, plains: 1, paddy: 1.3, forest: 2, bamboo: 2.2, marsh: 3.5, hills: 2.5, mountains: 6 };
export function route(L, from, to) {
  const W = L.size.w, key = (x, y) => y * W + x, dist = new Map([[key(...from), 0]]), prev = new Map(), heap = [[0, key(...from)]];
  const push = e => { heap.push(e); let i = heap.length - 1; while (i > 0) { const p = (i - 1) >> 1; if (heap[p][0] <= heap[i][0]) break; [heap[p], heap[i]] = [heap[i], heap[p]]; i = p; } };
  const pop = () => { const top = heap[0], last = heap.pop(); if (heap.length) { heap[0] = last; let i = 0; for (;;) { const l = 2 * i + 1, r = l + 1; let m = i;
    if (l < heap.length && heap[l][0] < heap[m][0]) m = l; if (r < heap.length && heap[r][0] < heap[m][0]) m = r; if (m === i) break; [heap[m], heap[i]] = [heap[i], heap[m]]; i = m; } } return top; };
  const goal = key(...to);
  while (heap.length) { const [d, k] = pop(); if (k === goal) break; if (d > (dist.get(k) ?? 1e9)) continue; const x = k % W, y = (k - x) / W;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const z = zoneAt(L, x + dx, y + dy); if (!z || z.kind === 'sea') continue;
      const c = d + (z.road ? .35 : COST[z.biome] || 2), n = key(z.x, z.y); if (c < (dist.get(n) ?? 1e9)) { dist.set(n, c); prev.set(n, k); push([c, n]); } } }
  if (!prev.has(goal)) return [];
  const out = []; for (let k = goal; k !== key(...from); k = prev.get(k)) out.unshift([k % W, Math.floor(k / W)]); return out;
}
