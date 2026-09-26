import { g } from '../screen.js';
import { P, pops, glints } from '../state.js';
import { line } from '../fx/bolts.js';
import { ease } from '../rig/pose.js';
import { glint, plusMark } from '../ui/hud-kit.js';
import { textC } from '../ui/pixfont.js';

// ---- Item effects: light that arcs into his chest, thin cut lines, falling bits, the +1 pops and glints ----
const WH = '#ffffff', CY = '#6ff3e4', CY2 = '#b8fff6';
export const chest = () => [P.x + P.face, P.y - 14];
const arcs = [], lines = [], bits = [];
// a pixel of light leaving (x, y) and arcing into him: d = delay, dur = flight, h = arc height
export function arc(x, y, o = {}) { arcs.push({ x, y, t: -(o.d || 0), dur: o.dur || .4, h: o.h ?? 12, col: o.col || CY, col2: o.col2 || CY2, trail: o.trail !== false }); }
export function cutLine(x0, y0, x1, y1, life) { const pts = []; line(pts, x0, y0, x1, y1); lines.push({ pts, life, max: life }); }
export function bit(x, y, w, h, col, vx, vy, life) { bits.push({ x, y, w, h, col, vx, vy, life, max: life }); }
export const pop = (x, y, txt, col = WH, t = 0) => pops.push({ x, y, t, col, txt });
export const plusPop = (x, y, t = 0) => pops.push({ x, y, t, col: WH, plus: true });
export function updateItemFx(dt) {
  for (const a of arcs) a.t += dt;
  for (const l of lines) l.life -= dt;
  for (const b of bits) { b.x += b.vx * dt; b.y += b.vy * dt; b.vy += 120 * dt; b.life -= dt; }
  for (const p of pops) p.t += dt;
  for (const q of glints) q.t += dt;
  const drop = (L, dead) => { for (let i = L.length - 1; i >= 0; i--) if (dead(L[i])) L.splice(i, 1); };
  drop(arcs, a => a.t > a.dur); drop(lines, l => l.life <= 0); drop(bits, b => b.life <= 0); drop(pops, p => p.t > .55); drop(glints, q => q.t > .1);
}
export function drawItemFx() {
  const [hx, hy] = chest();
  for (const a of arcs) { if (a.t < 0) continue; const k = ease(Math.min(1, a.t / a.dur));
    const x = a.x + (hx - a.x) * k, y = a.y + (hy - a.y) * k - Math.sin(k * Math.PI) * a.h;
    g.fillStyle = k < .8 ? a.col : a.col2; g.fillRect(Math.round(x), Math.round(y), 1, 1);
    if (a.trail && a.t > .03) { g.fillStyle = a.col2; g.fillRect(Math.round(x), Math.round(y) + 1, 1, 1); } }
  for (const l of lines) { const k = l.life / l.max; g.globalAlpha = Math.min(1, k * 1.5); g.fillStyle = k > .6 ? WH : CY2; for (let i = 0; i < l.pts.length; i += 2) g.fillRect(l.pts[i], l.pts[i + 1], 1, 1); }
  for (const b of bits) { g.globalAlpha = Math.min(1, b.life / b.max * 2); g.fillStyle = b.col; g.fillRect(Math.round(b.x), Math.round(b.y), b.w, b.h); }
  g.globalAlpha = 1;
  for (const p of pops) { if (p.t < 0) continue; const yy = Math.round(p.y - p.t * 22); g.save(); g.globalAlpha = p.t > .35 ? 1 - (p.t - .35) / .2 : 1;
    if (p.plus) plusMark(Math.round(p.x), yy, p.col); else textC(p.txt, p.x, yy, p.col); g.restore(); }
  for (const q of glints) glint(q.x, q.y, q.t < .05 ? 2 : 1, WH);
}
