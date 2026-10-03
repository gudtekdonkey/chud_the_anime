// ---- Effects in world space, drawn as pixels on the effects layer (960×540, over the 3D picture): the Animation Flow
// page's dust, sparks, rings, floor cracks and the blade's trail (ported from af/core.js), the black slash (fx/void.js's
// tear, ported), and the glint stamp that keeps his two cyan eyes when the brim hides them (the 3D faces page's rule).
// Positions are the flow's rig px (×AF to world units), like the moves that throw them.
import { AF, TAU, EZ, rnd, FX } from '../flow/flow.js';
import { toScreen, VW, VH } from './gfx/view.js';

const BAY = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map(v => (v + .5) / 16), bay = (x, y) => BAY[(y & 3) * 4 + (x & 3)];
const FXC = { dust: ['#7d837f', '#686e6a', '#565b58'], cy: ['#52e8d6', '#6ff3e4', '#b8fff6', '#ffffff'], crack: '#1f2322' };
const P = (x, y, z) => toScreen(x * AF, y * AF, z * AF);

export function dust(W, x, z, n, o = {}) { for (let i = 0; i < n; i++) { const a = (o.dir ?? rnd() * TAU) + (o.dir != null ? (rnd() - .5) * (o.spread ?? 1.6) : 0), s = (o.spd ?? 30) * (.4 + rnd() * .8);
  W.fx.push({ k: 'dust', x: x + (rnd() - .5) * (o.r ?? 4), y: 1 + rnd() * 2, z: z + (rnd() - .5) * (o.r ?? 4) * .6, vx: Math.sin(a) * s, vz: Math.cos(a) * s * .7, vy: 6 + rnd() * (o.up ?? 14), g: 30, drag: 5, age: 0, life: (o.life ?? .45) * (.6 + rnd() * .6), sz: rnd() < .3 ? 2 : 1 }); } }
FX.dust = dust; FX.step = fxStep;   // the moves' dust and the effects' step (flow's hook)
export function sparks(W, x, y, z, n, o = {}) { for (let i = 0; i < n; i++) { const a = (o.dir ?? 0) + (rnd() - .5) * (o.spread ?? 2.4), s = (o.spd ?? 110) * (.4 + rnd() * .9);
  W.fx.push({ k: 'spark', x, y, z, vx: Math.sin(a) * s, vz: Math.cos(a) * s * .6, vy: 20 + rnd() * 60, g: 260, drag: 3, age: 0, life: .18 + rnd() * .2 }); } }
export function ring(W, x, z, o = {}) { W.fx.push({ k: 'ring', x, y: 0, z, age: 0, life: o.life ?? .3, r: o.r ?? 18 }); }
export function crack(W, x, z) { const segs = []; for (let i = 0; i < 6; i++) { let a = i / 6 * TAU + rnd() * .5, px0 = x, pz0 = z; const n = 3 + (rnd() * 3 | 0);
  for (let j = 0; j < n; j++) { const L = 3 + rnd() * 4, nx = px0 + Math.sin(a) * L, nz = pz0 + Math.cos(a) * L * .7; segs.push([px0, pz0, nx, nz]); px0 = nx; pz0 = nz; a += (rnd() - .5) * .9; } }
  W.fx.push({ k: 'crack', segs, age: 0, life: 1.6 }); }
export function streak(W, a, b) { W.fx.push({ k: 'streak', a, b, age: 0, life: .22 }); }
// the black slash at a point (rig px), a straight tear across the screen at angle `ang`, open for `life` s
export function tear(W, x, y, z, ang, len = 30, wide = 5) { W.fx.push({ k: 'tear', x, y, z, ang, len, wide, age: 0, life: .42, jag: Array.from({ length: 24 }, () => [rnd() * 2.6 - 1.4, rnd() * 2.6 - 1.4]), tick: 0 }); }

export function fxStep(W, dt) {
  for (const e of W.fx) { e.age += dt; if (e.vx != null) { e.x += e.vx * dt; e.y += e.vy * dt; e.z += e.vz * dt; e.vy -= (e.g ?? 0) * dt;
    if (e.drag) { e.vx *= Math.exp(-e.drag * dt); e.vz *= Math.exp(-e.drag * dt); } if (e.y < 0) { e.y = 0; e.vy = 0; } }
    if (e.k === 'tear' && --e.tick <= 0) { e.tick = 2 + (rnd() * 2 | 0); e.jag = e.jag.map(() => [rnd() * 2.6 - 1.4, rnd() * 2.6 - 1.4]); } }
  W.fx = W.fx.filter(e => e.age < e.life);
}

// ---- drawing on the effects layer ----
function line(g, ax, ay, bx, by, col) { ax |= 0; ay |= 0; bx |= 0; by |= 0; g.fillStyle = col;
  const dx = Math.abs(bx - ax), dy = -Math.abs(by - ay), sx = ax < bx ? 1 : -1, sy = ay < by ? 1 : -1; let e = dx + dy;
  for (let n = 0; n < 400; n++) { g.fillRect(ax, ay, 1, 1); if (ax === bx && ay === by) break; const e2 = 2 * e; if (e2 >= dy) { e += dy; ax += sx; } if (e2 <= dx) { e += dx; ay += sy; } } }
function poly(pts, paint) {
  let y0 = 1e9, y1 = -1e9; for (const p of pts) { y0 = Math.min(y0, p[1]); y1 = Math.max(y1, p[1]); }
  for (let y = Math.floor(y0); y <= Math.ceil(y1); y++) { const cy = y + .5, xs = [];
    for (let i = 0; i < pts.length; i++) { const a = pts[i], b = pts[(i + 1) % pts.length]; if ((a[1] <= cy) !== (b[1] <= cy)) xs.push(a[0] + (cy - a[1]) / (b[1] - a[1]) * (b[0] - a[0])); }
    xs.sort((a, b) => a - b); for (let k = 0; k + 1 < xs.length; k += 2) for (let x = Math.ceil(xs[k] - .5); x <= Math.floor(xs[k + 1] - .5); x++) paint(x, y); }
}
export function drawFx(g, W) {
  for (const e of W.fx) { const k = e.age / e.life;
    if (e.k === 'dust') { const p = P(e.x, e.y, e.z), x = p[0] | 0, y = p[1] | 0; if (bay(x, y) < k * .9) continue; g.fillStyle = FXC.dust[Math.min(2, (k * 3) | 0)]; g.fillRect(x, y, e.sz, e.sz); }
    else if (e.k === 'spark') { const p = P(e.x, e.y, e.z), q = P(e.x - e.vx * .015, e.y - e.vy * .015, e.z - e.vz * .015); line(g, q[0], q[1], p[0], p[1], FXC.cy[k < .4 ? 3 : k < .7 ? 2 : 1]); }
    else if (e.k === 'ring') { const r = e.r * EZ.o(k), n = 60; g.fillStyle = FXC.cy[1]; for (let i = 0; i < n; i++) { const a = i / n * TAU; if (bay(i, 3) < k) continue; const p = P(e.x + Math.cos(a) * r, 0, e.z + Math.sin(a) * r * .8); g.fillRect(p[0] | 0, p[1] | 0, 1, 1); } }
    else if (e.k === 'crack') { for (const s of e.segs) { const a = P(s[0], 0, s[1]), b = P(s[2], 0, s[3]); if (k > .7 && bay(a[0] | 0, a[1] | 0) < (k - .7) / .3) continue; line(g, a[0], a[1], b[0], b[1], FXC.crack); } }
    else if (e.k === 'tear') drawTear(g, e, k);
  }
}
// the tear (fx/void.js's black slash, ported to this layer): a white hairline that opens into a jagged slit of void
// with cyan lips and star specks, then snaps shut
function drawTear(g, e, k) {
  const c = P(e.x, e.y, e.z), ux = Math.cos(e.ang), uy = Math.sin(e.ang), L = e.len * 2, draw = .05, OPEN = .1;
  const kd = Math.min(1, e.age / draw), op = EZ.s(Math.min(1, Math.max(0, (e.age - draw) / OPEN))), shut = Math.max(0, (e.age - (e.life - .06)) / .06), open = op * (1 - shut);
  const x0 = c[0] - ux * L / 2, y0 = c[1] - uy * L / 2, pad = e.wide * 2 + 4;
  for (let py = Math.floor(Math.min(y0, y0 + uy * L) - pad); py <= Math.max(y0, y0 + uy * L) + pad; py++) for (let px = Math.floor(Math.min(x0, x0 + ux * L) - pad); px <= Math.max(x0, x0 + ux * L) + pad; px++) {
    const rx = px + .5 - x0, ry = py + .5 - y0, t = (rx * ux + ry * uy) / L, s = -rx * uy + ry * ux; if (t < 0 || t > kd) continue;
    const as = Math.abs(s), j = Math.min(e.jag.length - 1, t * e.jag.length | 0), w = open * e.wide * 2 * Math.pow(Math.sin(Math.PI * t), .6) + (open > .05 ? e.jag[j][s < 0 ? 0 : 1] * open : 0);
    let col = null;
    if (as < .7 && w <= 1) col = '#b8fff6'; else if (as <= w - 1) col = '#05070a'; else if (as <= w) col = shut > 0 ? '#ffffff' : '#6ff3e4'; else if (as <= w + 1.6 && open > .25 && bay(px, py) < .45) col = '#52e8d6';
    if (col) { g.fillStyle = col; g.fillRect(px, py, 1, 1); } }
  if (open > .4) { g.fillStyle = '#b8fff6'; for (let i = 0; i < 4; i++) { const t = .2 + i * .18, s = (e.jag[i * 5][0]) * e.wide * open * .5; g.fillRect((x0 + ux * L * t - uy * s) | 0, (y0 + uy * L * t + ux * s) | 0, 1, 1); } }
}

// the blade's path as a ribbon, from where the blade was over the last moments: inner edge mid-blade, outer edge the
// tip (af/core.js trailDraw). `trail`: [{ t, a: [x,y], b: [x,y] } | { gap }] in render px. The style picks its look:
// 'dither' cyan to white, dithered away with age (the page's); 'crisp' a held smear, white with a cyan edge, gone after a
// frame (pixel-render); 'white' a flat white smear (anime); 'soft' a soft gradient, cyan into warm white (painterly)
const TRAIL = { dither: .06, crisp: .085, white: .07, soft: .1 };
export function drawTrail(g, trail, t1, mode = 'dither') {
  const win = TRAIL[mode] || .06, pts = trail.filter(s => s.t <= t1 + 1e-6 && t1 - s.t < win);
  for (let i = 1; i < pts.length; i++) { const A = pts[i - 1], B = pts[i]; if (A.gap || B.gap) continue;
    if (Math.hypot(B.b[0] - A.b[0], B.b[1] - A.b[1]) < 2.4) continue;
    const age = (t1 - B.t) / win, L = Math.hypot(B.b[0] - B.a[0], B.b[1] - B.a[1]) || 1;
    poly([A.a, A.b, B.b, B.a], (x, y) => { if (x < 0 || y < 0 || x >= VW || y >= VH) return;
      const q = 1 - Math.min(1, Math.hypot(x + .5 - B.b[0], y + .5 - B.b[1]) / L);
      if (mode === 'soft') { const al = Math.pow(1 - age, 1.2) * (.3 + .7 * q) * .95; if (al < .04) return; g.globalAlpha = al; g.fillStyle = q > .7 ? '#fff2d0' : q > .4 ? '#b8fff6' : '#6ff3e4'; }
      else if (mode === 'white') g.fillStyle = '#ffffff';
      else if (mode === 'crisp') g.fillStyle = q > .78 ? '#6ff3e4' : '#f0fffc';
      else { if (bay(x, y) < age * .9) return; g.fillStyle = FXC.cy[q > .8 ? 3 : q > .55 ? 2 : q > .3 ? 1 : 0]; }
      g.fillRect(x, y, 1, 1); });
  }
  g.globalAlpha = 1;
}

// ---- the clash (Anime limited's, on every hit in every style): focus lines rushing in on the hit, speed lines behind
// a dash or a roll. Screen space, on the effects layer
export function focus(W, x, y, z) { W.fx.push({ k: 'focus', x, y, z, age: 0, life: .12, seed: Math.random() * 1e4 }); }
export function drawFocus(g, W) {
  for (const e of W.fx) { if (e.k !== 'focus') continue; const [cx, cy] = P(e.x, e.y, e.z), r = mulberry(e.seed | 0);
    g.strokeStyle = 'rgba(255,255,255,.8)';
    for (let i = 0; i < 34; i++) { const a = r() * Math.PI * 2, r0 = 46 + r() * 34, r1 = 700; g.lineWidth = 1 + (r() * 2.4 | 0);
      g.beginPath(); g.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0); g.lineTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1); g.stroke(); } }
}
// streaks behind someone moving fast: (x, y) on screen, (dx, dy) his direction on screen
export function speedLines(g, x, y, dx, dy, t) {
  const r = mulberry(Math.floor(t * 12) + 1), l = Math.hypot(dx, dy) || 1, ux = dx / l, uy = dy / l; g.strokeStyle = 'rgba(232,242,255,.55)'; g.lineWidth = 1;
  for (let i = 0; i < 12; i++) { const side = (r() - .5) * 56, back = 18 + r() * 30, len = 30 + r() * 70, bx = x - ux * back - uy * side, by = y - uy * back + ux * side;
    g.beginPath(); g.moveTo(bx | 0, by | 0); g.lineTo((bx - ux * len) | 0, (by - uy * len) | 0); g.stroke(); }
}
const mulberry = a => () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
