// ---- The new skills' effects, drawn on the effects layer through the active style (gfx/style.js, its `trail` look):
//   soft    Painterly (default): a wide soft glow under a lit core, warm white at the hottest, alpha falling off
//   crisp   Pixel-render: whole pixels, hard edges, the cyan ramp only, held (no fades)
//   white   Anime limited: flat white with an ink edge, no gradients
//   dither  Toon + dither: the Animation Flow page's dithered cyan, eaten away with age
// Colours are the game's effect cyan and white (design rules); bolts are the Storm Chain's look: a white forked bolt
// over a cyan one, jagged whole-pixel steps re-cut every two frames. Positions are rig px like fx/fx.js (×AF to world).
import { AF, TAU } from 'ronin-engine/flow/flow.js';
const rnd = Math.random;   // draw-time jitter: never the world's seeded stream
import { toScreen } from 'ronin-engine/render/gfx/view.js';
import { STYLE } from 'ronin-engine/render/gfx/style.js';

export const CY = ['#52e8d6', '#6ff3e4', '#b8fff6', '#ffffff'], WARM = '#fff2d0', INK = '#05070a';
const BAY = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map(v => (v + .5) / 16), bay = (x, y) => BAY[(y & 3) * 4 + (x & 3)];
export const scr = (x, y, z) => toScreen(x * AF, y * AF, z * AF);
export const mode = () => STYLE.s.trail;

// whole-pixel line (Bresenham), each pixel through `put`
export function pxLine(ax, ay, bx, by, put) { ax = Math.round(ax); ay = Math.round(ay); bx = Math.round(bx); by = Math.round(by);
  const dx = Math.abs(bx - ax), dy = -Math.abs(by - ay), sx = ax < bx ? 1 : -1, sy = ay < by ? 1 : -1; let e = dx + dy;
  for (let n = 0; n < 2000; n++) { put(ax, ay, n); if (ax === bx && ay === by) break; const e2 = 2 * e; if (e2 >= dy) { e += dy; ax += sx; } if (e2 <= dx) { e += dx; ay += sy; } } }
function stroke(g, pts, w, col, a = 1) { g.globalAlpha = a; g.strokeStyle = col; g.lineWidth = w; g.lineJoin = 'round'; g.lineCap = 'round';
  g.beginPath(); g.moveTo(pts[0][0], pts[0][1]); for (const p of pts.slice(1)) g.lineTo(p[0], p[1]); g.stroke(); g.globalAlpha = 1; }
function pixels(g, pts, col, k = 0) { g.fillStyle = col; for (let i = 1; i < pts.length; i++) pxLine(pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1], (x, y) => { if (k && bay(x, y) < k) return; g.fillRect(x, y, 1, 1); }); }

// a jagged path between two screen points: a vertex every ~7 px kicked sideways up to `jit`, and an optional fork
export function jag(a, b, jit = 4, fork = false) {
  const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1, nx = -dy / L, ny = dx / L, seg = Math.max(2, Math.round(L / 7)), pts = [a];
  for (let i = 1; i < seg; i++) { const t = i / seg, o = (rnd() * 2 - 1) * jit; pts.push([a[0] + dx * t + nx * o, a[1] + dy * t + ny * o]); }
  pts.push(b); const out = { pts, fork: null };
  if (fork && seg > 2) { const f = pts[1 + (rnd() * (seg - 2) | 0)], an = Math.atan2(dy, dx) + (rnd() < .5 ? -1 : 1) * (.5 + rnd() * .5), l = 8 + rnd() * 10;
    out.fork = [f, [f[0] + Math.cos(an) * l / 2 + (rnd() - .5) * 3, f[1] + Math.sin(an) * l / 2 + (rnd() - .5) * 3], [f[0] + Math.cos(an) * l, f[1] + Math.sin(an) * l]]; }
  return out; }
// a bolt, k its age 0..1: the Storm Chain's two bolts (white forked over cyan) in the style's hand
export function bolt(g, J, k = 0) {
  const m = mode(), all = J.fork ? [J.pts, J.fork] : [J.pts];
  for (const p of all) {
    if (m === 'soft') { stroke(g, p, 7, CY[1], .16 * (1 - k)); stroke(g, p, 3, CY[2], .55 * (1 - k * .7)); stroke(g, p, 1.2, k < .5 ? WARM : CY[3], 1 - k * .5); }
    else if (m === 'white') { stroke(g, p, 4, INK, 1); stroke(g, p, 2, '#ffffff', 1); }
    else if (m === 'crisp') { pixels(g, p.map(q => [q[0], q[1] + 1]), CY[0]); pixels(g, p, k < .5 ? CY[3] : CY[2]); }
    else { pixels(g, p.map(q => [q[0] + 1, q[1]]), CY[1], k * .9); pixels(g, p, CY[3], k * .9); }
  }
}
// a thin thread (the recall's, from the hanging blade's tip to his hip): dotted, faint
export function thread(g, a, b, t) { const m = mode(), off = Math.floor(t * 20);
  if (m === 'soft') { stroke(g, [a, b], 2.4, CY[1], .12); stroke(g, [a, b], .8, CY[2], .45); return; }
  g.fillStyle = m === 'white' ? '#ffffff' : CY[1]; pxLine(a[0], a[1], b[0], b[1], (x, y, n) => { if ((n + off) % 3 === 0) g.fillRect(x, y, 1, 1); }); }
// a ring on the floor (world rig px), r its radius, k its age (0..1), the zone's rim
export function floorRing(g, x, z, r, k = 0, o = {}) { const m = mode(), n = Math.max(24, Math.round(r * 1.6)), pts = [];
  for (let i = 0; i <= n; i++) { const a = i / n * TAU; pts.push(scr(x + Math.cos(a) * r, 0, z + Math.sin(a) * r)); }
  if (m === 'soft') { stroke(g, pts, 5, o.col || CY[1], .12 * (1 - k)); stroke(g, pts, 1.2, o.col || CY[2], .7 * (1 - k)); }
  else if (m === 'white') stroke(g, pts, 1.6, '#ffffff', 1);
  else for (let i = 0; i < n; i++) { const p = pts[i]; if (m === 'dither' && bay(i, 1) < k) continue; if (m === 'crisp' && i % 2) continue; g.fillStyle = o.col || CY[1]; g.fillRect(p[0] | 0, p[1] | 0, 1, 1); } }
// a point of light (a glint, the window's star): `open` widens it into the 8-armed star of prototype 23's indicator A
export function star(g, x, y, open, t) { x |= 0; y |= 0; const m = mode();
  if (m === 'soft') { const r = open ? 7 : 4, gr = g.createRadialGradient(x + .5, y + .5, 0, x + .5, y + .5, r); gr.addColorStop(0, 'rgba(255,250,232,.95)'); gr.addColorStop(.4, 'rgba(184,255,246,.45)'); gr.addColorStop(1, 'rgba(111,243,228,0)');
    g.fillStyle = gr; g.fillRect(x - r, y - r, 2 * r + 1, 2 * r + 1); }
  g.fillStyle = '#ffffff'; g.fillRect(x, y, 1, 1); if (!open) return;
  g.globalAlpha = (t * 20 | 0) % 2 ? 1 : .6; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [2, 0], [-2, 0], [0, 2], [0, -2]]) g.fillRect(x + dx, y + dy, 1, 1);
  if (m !== 'crisp') { g.globalAlpha *= .6; for (const [dx, dy] of [[3, 0], [-3, 0], [0, 3], [0, -3], [1, 1], [-1, -1], [1, -1], [-1, 1]]) g.fillRect(x + dx, y + dy, 1, 1); }
  g.globalAlpha = 1; }
// a closing ring round a point (indicator B, the assist): radius r in render px
export function ringAt(g, x, y, r) { const n = Math.max(12, Math.round(r * 6)); g.fillStyle = mode() === 'white' ? '#ffffff' : CY[2];
  for (let i = 0; i < n; i++) { const a = i / n * TAU; g.fillRect(Math.round(x + Math.cos(a) * r), Math.round(y + Math.sin(a) * r), 1, 1); } }
// a streak where he flickered from one place to the next (Time Slice): a glitch line and slices of cyan across it
export function streak(g, a, b, k) { const m = mode();
  if (m === 'soft') { stroke(g, [a, b], 6, CY[1], .18 * (1 - k)); stroke(g, [a, b], 1.4, CY[2], .8 * (1 - k)); }
  else if (m === 'white') stroke(g, [a, b], 2, '#ffffff', 1 - k);
  else pixels(g, [a, b], CY[2], m === 'dither' ? k : 0);
  const n = 3, dx = b[0] - a[0], dy = b[1] - a[1]; g.fillStyle = CY[1];
  for (let i = 1; i <= n; i++) { const t = i / (n + 1), x = a[0] + dx * t, y = a[1] + dy * t - 22; if (k > .7) break; g.fillRect(x - 3 | 0, y + ((i * 7) % 18) | 0, 7, 1); } }
// a pending cut hanging in stopped time: a white hairline across him, the black slash's first frame
export function hairline(g, c, ang, len) { const ux = Math.cos(ang), uy = Math.sin(ang); g.fillStyle = mode() === 'soft' ? WARM : '#ffffff';
  pxLine(c[0] - ux * len, c[1] - uy * len, c[0] + ux * len, c[1] + uy * len, (x, y) => g.fillRect(x, y, 1, 1)); }
