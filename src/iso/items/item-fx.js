// ---- The items' effects on the slice's effects layer (render pixels, 960×540, world-anchored through view.js toScreen):
// light streaming into his chest (Harvest, the shrine, a pickup's catch), the talisman's lightning, the static bomb's
// smoke over the whole screen, the whetstone's cyan edge on his blade, small sprites of today's world art at 2×.
// Colours from today's COL (never a literal cyan), so an element re-skins them as it does today's.
import { COL } from '../../config.js';
import { toScreen } from '../gfx/view.js';
import { CTX } from '../ctx.js';
import { INV } from './inv.js';

const FX = [];
const rr = (a, b) => a + Math.random() * (b - a);
export const chestOf = c => [c.x, 17, c.z];   // his chest, roughly, in the world
// a stream of light from a world point into someone's chest: a dot that arcs up and in, its trail behind it
export function stream(from, to = CTX.hero, o = {}) { FX.push({ k: 'stream', from, to, t: 0, dur: o.dur ?? .45, h: o.h ?? rr(6, 14), col: o.col || COL.fx, col2: o.col2 || '#ffffff', d: o.d || 0 }); }
// lightning from the sky onto a world point (jagged, whole pixels), and its ring on the floor
export function bolt(x, z, o = {}) { const segs = []; let px = x + rr(-6, 6), py = 140; while (py > 0) { const ny = Math.max(0, py - rr(8, 18)), nx = x + (ny > 0 ? rr(-5, 5) : 0); segs.push([px, py, nx, ny]); px = nx; py = ny; }
  FX.push({ k: 'bolt', x, z, segs, t: 0, dur: o.dur ?? .22, col: o.col || '#ffffff' }); }
export function arcBolt(a, b) { const segs = []; const n = 6; for (let i = 0; i < n; i++) { const k0 = i / n, k1 = (i + 1) / n, j = i ? rr(-4, 4) : 0, j1 = i < n - 1 ? rr(-4, 4) : 0;
  segs.push([a[0] + (b[0] - a[0]) * k0 + j, a[1] + (b[1] - a[1]) * k0, a[2] + (b[2] - a[2]) * k0, a[0] + (b[0] - a[0]) * k1 + j1, a[1] + (b[1] - a[1]) * k1, a[2] + (b[2] - a[2]) * k1]); }
  FX.push({ k: 'arc', segs, t: 0, dur: .2 }); }
// the static bomb's smoke: dark static over the whole screen for `dur` seconds, thinning at the end
export const SMOKE = { t: 0, dur: 0 };
export function smoke(dur) { SMOKE.t = 0; SMOKE.dur = dur; }
export function tickItemFx(dt) { for (const f of FX) f.t += dt; for (let i = FX.length - 1; i >= 0; i--) if (FX[i].t > FX[i].dur + (FX[i].d || 0)) FX.splice(i, 1); if (SMOKE.dur) { SMOKE.t += dt; if (SMOKE.t > SMOKE.dur) SMOKE.dur = 0; } }
const px = (g, x, y, s = 2) => g.fillRect(Math.round(x), Math.round(y), s, s);
function line(g, x0, y0, x1, y1, s = 2) { const n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0) / s)); for (let i = 0; i <= n; i++) px(g, x0 + (x1 - x0) * i / n, y0 + (y1 - y0) * i / n, s); }
export function drawItemFx(g) {
  for (const f of FX) { const t = f.t - (f.d || 0); if (t < 0) continue; const k = Math.min(1, t / f.dur);
    if (f.k === 'stream') { const to = chestOf(f.to), P = u => { const e = u * u * (3 - 2 * u); return toScreen(f.from[0] + (to[0] - f.from[0]) * e, f.from[1] + (to[1] - f.from[1]) * e + Math.sin(Math.PI * u) * f.h, f.from[2] + (to[2] - f.from[2]) * e); };
      for (let i = 0; i < 6; i++) { const u = Math.max(0, k - i * .05), [x, y] = P(u); g.fillStyle = i === 0 ? f.col2 : f.col; g.globalAlpha = 1 - i / 6; px(g, x, y); } g.globalAlpha = 1; }
    else if (f.k === 'bolt') { g.globalAlpha = k < .5 ? 1 : 2 - 2 * k; for (const [a, b, c, d] of f.segs) { const [x0, y0] = toScreen(a, b, f.z), [x1, y1] = toScreen(c, d, f.z); g.fillStyle = COL.fx; line(g, x0 + 2, y0, x1 + 2, y1); g.fillStyle = f.col; line(g, x0, y0, x1, y1); }
      const [cx, cy] = toScreen(f.x, 0, f.z), r = 6 + k * 30; g.fillStyle = COL.fx; for (let i = 0; i < 24; i++) { const a = i / 24 * 6.283; px(g, cx + Math.cos(a) * r, cy + Math.sin(a) * r * .55); } g.globalAlpha = 1; }
    else if (f.k === 'arc') { g.globalAlpha = 1 - k; g.fillStyle = COL.fx2; for (const s of f.segs) { const [x0, y0] = toScreen(s[0], s[1], s[2]), [x1, y1] = toScreen(s[3], s[4], s[5]); line(g, x0, y0, x1, y1); } g.globalAlpha = 1; } }
  // the whetstone's edge: a cyan line along the blade while it lasts (items: INV.edge)
  const hero = CTX.hero, b = hero && hero.bladeWorld && hero.bladeWorld();
  if (b && INV.edge > 0) { const [x0, y0] = toScreen(...b.mid), [x1, y1] = toScreen(...b.tip); g.fillStyle = Math.random() < .5 ? COL.fx : COL.fx2; line(g, x0, y0, x1, y1, 2); }
}
// the smoke over everything (drawn last on the layer): two layers of dark static drifting against each other
export function drawSmoke(g, W, H) {
  if (!SMOKE.dur) return; const k = SMOKE.t < .15 ? SMOKE.t / .15 : SMOKE.t > SMOKE.dur - 1.2 ? Math.max(0, (SMOKE.dur - SMOKE.t) / 1.2) : 1;
  const cols = ['#0c0d11', '#1b1e25', '#2c323b', '#565e66'], seed = Math.floor(SMOKE.t * 12);
  g.globalAlpha = .82 * k; g.fillStyle = '#0c0d11'; g.fillRect(0, 0, W, H);
  for (let i = 0; i < 900; i++) { const h = Math.sin(i * 12.9898 + seed * 78.233) * 43758.5453, r = h - Math.floor(h), x = (i * 97 + SMOKE.t * (i % 2 ? 14 : -10)) % W, y = (r * H * 1.7 + i * 13) % H;
    g.fillStyle = cols[i % 4]; g.fillRect(Math.floor(x / 2) * 2, Math.floor(y / 2) * 2, 2 + (i % 3) * 2, 2); }
  g.globalAlpha = 1;
}
// a world sprite (today's WS art, items/item-sprites.js) at 2×, its feet at the world point
export function sprite(g, s, x, y, z, a = 1) { const c = s.c || s, [sx, sy] = toScreen(x, y, z); g.globalAlpha = a; g.drawImage(c, Math.round(sx - c.width), Math.round(sy - c.height * 2), c.width * 2, c.height * 2); g.globalAlpha = 1; }
