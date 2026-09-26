import { zaps } from '../state.js';
import { rr, sgn } from './util.js';

// ---- Bolts: jagged whole-pixel lightning ----
export function zap(x0, y0, x1, y1, life, jit, col, o = {}) { const z = { x0, y0, x1, y1, life, max: life, jit, col, tick: 2, on: true, ...o }; z.pts = boltPts(z); zaps.push(z); return z; }
export function line(out, x0, y0, x1, y1) { // Bresenham, so bolts are whole pixels with no smoothing
  x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
  const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1; let e = dx + dy;
  for (;;) { out.push(x0, y0); if (x0 === x1 && y0 === y1) break; const e2 = 2 * e; if (e2 >= dy) { e += dy; x0 += sx; } if (e2 <= dx) { e += dx; y0 += sy; } }
}
export function boltPts(z) { // a jagged polyline: every ~4px a vertex kicked 1..jit px sideways, plus an optional fork
  const dx = z.x1 - z.x0, dy = z.y1 - z.y0, L = Math.hypot(dx, dy) || 1, nx = -dy / L, ny = dx / L, seg = Math.max(2, Math.round(L / 4));
  const vs = [[z.x0, z.y0]], out = [];
  for (let i = 1; i < seg; i++) { const t = i / seg, o = sgn() * rr(1, z.jit); vs.push([z.x0 + dx * t + nx * o, z.y0 + dy * t + ny * o]); }
  vs.push([z.x1, z.y1]);
  for (let i = 1; i < vs.length; i++) line(out, vs[i - 1][0], vs[i - 1][1], vs[i][0], vs[i][1]);
  if (z.fork && seg > 2) { const [fx, fy] = vs[1 + (Math.random() * (seg - 2) | 0)], a = Math.atan2(dy, dx) + sgn() * rr(.5, 1), l = rr(4, 8);
    const mx = fx + Math.cos(a) * l / 2 + sgn(), my = fy + Math.sin(a) * l / 2 + sgn();
    line(out, fx, fy, mx, my); line(out, mx, my, fx + Math.cos(a) * l, fy + Math.sin(a) * l); }
  return out;
}
