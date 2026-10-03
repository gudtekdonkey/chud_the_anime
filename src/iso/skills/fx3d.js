// ---- The skills' effects in 3D: every one lives in world space (x, z on the floor, y up, world units) and is projected
// by the camera each frame, so a crescent sweeps round him in the floor's perspective, the crater's bolts lie on the
// floor and the storm comes down from above; then each pixel goes through the ink (ink.js), the active style's way of
// drawing it. Ages run on the world's clock (sim.js), so a hit-stop freezes them with everything else. Ported from
// today's 2D effects (src/fx/: slash.js crescents, moon.js, void.js's black slash, bolts.js, util.js sparks, rings,
// residue, debris.js cracks and stone), lifted off the screen into the world.
import { toScreen, CAM } from 'ronin-engine/render/gfx/view.js';
import { brush } from './ink.js';

export const FX = [];
const TAU = Math.PI * 2, rr = (a, b) => a + Math.random() * (b - a), sgn = () => (Math.random() < .5 ? -1 : 1);
export const STONE = ['#5d6361', '#3b403e', '#6b716f', '#2e3331'];
const S3 = p => toScreen(p[0], p[1], p[2]);
const add = e => { e.age = 0; FX.push(e); return e; };
export const v3 = { add: (a, b, k = 1) => [a[0] + b[0] * k, a[1] + b[1] * k, a[2] + b[2] * k], lerp: (a, b, u) => [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u, a[2] + (b[2] - a[2]) * u] };
// a heading's floor axes: forward, his right (h 0 faces south, +z)
export const axes = h => ({ f: [Math.sin(h), 0, Math.cos(h)], r: [-Math.cos(h), 0, Math.sin(h)], u: [0, 1, 0] });

// ---- shapes ----
// a crescent round c in the plane of A and B (unit vectors): angles a0 → a1 swept in `sweep` s, w thick at its middle,
// held `hold` s, then it fades (or, with `shatter`, breaks into gaps) over `glow` s. heat 1 is white-hot
export function arc(o) { return add({ k: 'arc', heat: .7, hold: .04, glow: .1, seed: Math.random(), shatter: 0, ...o }); }
// the black slash: a slit of void along a path (pt(t) → a world point), opening to W world units, snapping shut at
// `close` s (null: the caller shuts it, shut(e)). A billboard X arm is the same along a screen-straight path
export function tear(pt, W, close = null, draw = .05) { return add({ k: 'tear', pt, W, close, draw, shut: null, jag: jags(), tick: 0 }); }
export const shut = e => { if (e && e.shut == null) e.shut = e.age; };
// a straight tear through c, `ang` on the screen (0 level, + down to the right), `half` world units each way: the
// black slash as today's game cuts it, facing the camera wherever he faces
export function tearAt(c, ang, half, W, close, draw) { const ux = Math.cos(ang), uy = Math.sin(ang);
  return tear(t => ({ scr: true, c, dx: (t - .5) * 2 * half * ux, dy: (t - .5) * 2 * half * uy }), W, close, draw); }
// one arm of an X over c (sign 1: down to the front, −1: up), tilted like Cross Rift's
export const xArm = (c, h, sign, W, close, face = 1) => tearAt(c, Math.atan2(h * .42 * sign, h * .85 * face), Math.hypot(h * .85, h * .42), W, close);
function jags() { return Array.from({ length: 48 }, () => [rr(-1.4, 1.2), rr(-1.4, 1.2)]); }
// jagged lightning between two world points, re-jagged every couple of frames; `fork` adds a branch
export function bolt(a, b, life, jit = 2.4, heat = .7, o = {}) { return add({ k: 'bolt', a, b, life, jit, heat, fork: !!o.fork, pts: null, tick: 0 }); }
// a ring at height y (a shockwave on the floor or in the air), growing from r0 to r1
export function ring(c, r0, r1, life, heat = .6, o = {}) { return add({ k: 'ring', c, r0, r1, life, heat, sq: o.sq ?? 1, thick: o.thick ?? 1 }); }
// floor cracks out from c, R long; dark with a lit tip while fresh
export function cracks(c, R, n = 9, life = 1.8) { const segs = [];
  for (let i = 0; i < n; i++) { let a = i / n * TAU + rr(-.25, .25), x = c[0], z = c[2]; const m = 3 + (Math.random() * 3 | 0);
    for (let j = 0; j < m; j++) { const L = R / m * rr(.7, 1.3), nx = x + Math.sin(a) * L, nz = z + Math.cos(a) * L; segs.push([x, z, nx, nz, j / m]); x = nx; z = nz; a += rr(-.5, .5);
      if (Math.random() < .3) { const b = a + sgn() * rr(.6, 1.1), l = L * .6; segs.push([x, z, x + Math.sin(b) * l, z + Math.cos(b) * l, (j + 1) / m]); } } }
  return add({ k: 'crack', c, segs, life }); }
// light pooled on the floor under something bright (the moon's, the crater's): a dithered ellipse
export function pool(c, rx, rz, life, k = 1) { return add({ k: 'pool', c, rx, rz, life, I: k }); }
// the screen washed with a colour for a moment
export function flash(a, life, col = '#e9fffb') { return add({ k: 'flash', a, life, col }); }

// ---- particles ----
// a short streak flying off (sparks): v in world units/s, g its gravity
export function spark(p, v, life, heat = .6, g = 0, drag = 0) { return add({ k: 'spark', p: [...p], v: [...v], life, heat, g, drag }); }
// a mote of Qi drawn from s to t along a curve
export function mote(s, t, dur, curl = 0, heat = .5) { return add({ k: 'mote', s, t, life: dur, curl, heat }); }
// a sliver of glitch residue: a short level line, white or cyan, drifting and twitching
export function sliver(p, w, life, v = [0, 0, 0], heat = .8) { return add({ k: 'sliver', p: [...p], v, w, life, heat }); }
// stone lifting off the floor (power II, the rift drinking the room, Sky Drop's crater); `to` makes it dissolve into Qi there
export function chip(p, v, life, o = {}) { return add({ k: 'chip', p: [...p], v: [...v], life, col: STONE[Math.random() * 4 | 0], g: o.g ?? 0, to: o.to || null, rise: o.rise ?? 0 }); }
// a straight white cut line between two points, gone in `life` s (the cut line through what a blade passed)
export function slit(a, b, life = .12, heat = 1) { return add({ k: 'line', a, b, life, heat }); }
// a ribbon of light spiralling up round where he stood (power III), its tail a quarter-second behind its head
export function ribbon(c, a0, w, R, life = .8, heat = .7) { return add({ k: 'ribbon', c, a0, w, R, life, heat }); }
// glitch residue at a spot: slivers hanging where he was (today's residue)
export function residue(p, n = 8) { for (let i = 0; i < n; i++) sliver([p[0] + rr(-5, 5), p[1] + rr(1, 24), p[2] + rr(-2, 2)], 2 + (Math.random() * 6 | 0), rr(.12, .32), [rr(-6, 6), rr(-3, 3), 0], Math.random() < .5 ? 1 : .45); }
// sparks bursting round a point (the sheath-click burst, a hit)
export function burstAt(p, n, spd = [90, 200], up = .6) { for (let i = 0; i < n; i++) { const a = rr(0, TAU), s = rr(spd[0], spd[1]);
  spark(p, [Math.cos(a) * s, rr(-.4, 1) * s * up, Math.sin(a) * s * .7], rr(.12, .26), [1, .7, .45][i % 3], 120, 2); } }

export function fxStep(dt) {
  for (const e of FX) { e.age += dt;
    if (e.p && e.v) { e.p[0] += e.v[0] * dt; e.p[1] += e.v[1] * dt; e.p[2] += e.v[2] * dt; if (e.g) e.v[1] -= e.g * dt;
      if (e.drag) { const k = Math.exp(-e.drag * dt); e.v[0] *= k; e.v[2] *= k; } if (e.p[1] < 0 && e.k !== 'mote') { e.p[1] = 0; e.v[1] *= -.25; e.v[0] *= .6; e.v[2] *= .6; } }
    if (e.k === 'tear') { if (--e.tick <= 0) { e.tick = 4 + (Math.random() * 3 | 0); e.jag = jags(); } if (e.close != null && e.shut == null && e.age >= e.close) e.shut = e.age;
      if (e.shut != null && e.age - e.shut > .05) e.dead = 1; }
    if (e.k === 'bolt' && --e.tick <= 0) { e.tick = 4; e.pts = null; }
    if (e.life != null && e.age >= e.life) e.dead = 1; }
  for (let i = FX.length - 1; i >= 0; i--) if (FX[i].dead) FX.splice(i, 1);
}

// ---- drawing: every effect, the active style's way ----
export function fxDraw(g) {
  const B = brush(g);
  for (const e of FX) { const age = B.q(e.age), fd = e.life ? Math.min(1, age / e.life) : 0;
    switch (e.k) {
      case 'arc': drawArc(B, e, age); break;
      case 'tear': drawTear(B, e, age); break;
      case 'bolt': drawBolt(B, e, fd); break;
      case 'ring': { const r = e.r0 + (e.r1 - e.r0) * (1 - (1 - fd) ** 2), n = Math.max(24, r * 5 * CAM.zoom | 0);
        for (let i = 0; i < n; i++) { const a = i / n * TAU, [x, y] = S3([e.c[0] + Math.cos(a) * r, e.c[1], e.c[2] + Math.sin(a) * r * e.sq]); B.dot(x, y, e.heat, fd, e.thick > 1 ? 2 : 1); } break; }
      case 'crack': for (const s of e.segs) { const [ax, ay] = S3([s[0], .05, s[1]]), [bx, by] = S3([s[2], .05, s[3]]), f2 = Math.max(0, (fd - .7) / .3), n = Math.ceil(Math.hypot(bx - ax, by - ay));
        for (let i = 0; i <= n; i++) { const u = i / n, x = ax + (bx - ax) * u, y = ay + (by - ay) * u, tip = s[4] + u * .3;
          B.solid(x, y, '#121516', f2, 2); if (tip > .8 && fd < .5) B.dot(x, y, .3, fd * 2); } } break;
      case 'pool': { const I = (1 - fd) * e.I; if (I <= .05) break; const [cx, cy] = S3(e.c), rx = Math.round(e.rx * 2 * CAM.zoom), ry = Math.round(e.rz * 2 * CAM.zoom * .81);
        const st = Math.max(1, Math.round(CAM.zoom));   // close up (the finisher's camera) it is drawn coarser, not ten times the dots
        for (let dy = -ry; dy <= ry; dy += st) for (let dx = -rx; dx <= rx; dx += st) { const q = (dx / rx) ** 2 + (dy / ry) ** 2; if (q > 1 || (((dx + dy) / st) & 1)) continue; B.dot(cx + dx, cy + dy, 0, 1 - I * (q < .3 ? .5 : .28), st); } break; }
      case 'flash': B.screen(e.col, e.a * (1 - fd)); break;
      case 'spark': { const [x, y] = S3(e.p), [x0, y0] = S3([e.p[0] - e.v[0] * .02, e.p[1] - e.v[1] * .02, e.p[2] - e.v[2] * .02]); B.line(x0, y0, x, y, e.heat * .6, fd, e.heat); break; }
      case 'mote': { const q = Math.min(1, age / e.life) ** 2, s = e.s, t = e.t, mid = [(s[0] + t[0]) / 2 + e.curl, (s[1] + t[1]) / 2 + Math.abs(e.curl) * .3, (s[2] + t[2]) / 2 - e.curl * .4];
        const at = u => S3(v3.lerp(v3.lerp(s, mid, u), v3.lerp(mid, t, u), u)), [x, y] = at(q), [x1, y1] = at(Math.max(0, q - .06));
        B.line(x1, y1, x, y, .2, Math.max(0, 1 - age * 8) * .6, q > .7 ? 1 : e.heat); break; }
      case 'sliver': { const [x, y] = S3(e.p), jx = (Math.random() * 3 | 0) - 1; B.line(x + jx - e.w, y, x + jx + e.w, y, e.heat, fd * fd, e.heat, 1); break; }
      case 'line': { const [ax, ay] = S3(e.a), [bx, by] = S3(e.b); B.line(ax, ay, bx, by, e.heat, fd * fd, e.heat, 2); break; }
      case 'ribbon': { const fade = Math.min(1, (e.life - age) * 4);
        for (let s = 0; s < 24; s++) { const u = age - s * .011; if (u < 0) break; const a = e.a0 + e.w * u, R = e.R * (1 - u * .7), [x, y] = S3([e.c[0] + Math.cos(a) * R, e.c[1] + 4 + 46 * u, e.c[2] + Math.sin(a) * R]);
          B.dot(x, y, e.heat, 1 - fade * (1 - s / 24), s < 6 ? 2 : 1); } break; }
      case 'chip': { let p = e.p; if (e.to && fd > .55) { const u = ((fd - .55) / .45) ** 2; p = v3.lerp(e.p, e.to, u); const [x, y] = S3(p); B.dot(x, y, u > .6 ? 1 : .5, 0, 2); break; }
        const [x, y] = S3(p); B.solid(x, y, e.col, e.to ? 0 : Math.max(0, (fd - .7) / .3), 2); break; }
    }
  }
  B.done();
}

// a crescent: for each angle along it, a line from its inner edge to its outer edge, hottest at the rim and the tip
function drawArc(B, e, age) {
  const sw = Math.min(1, age / e.sweep), aE = e.a0 + (e.a1 - e.a0) * sw, gk = Math.max(0, (age - e.sweep - e.hold) / e.glow); if (gk >= 1) return;
  const P = (a, r) => S3([e.c[0] + (Math.cos(a) * e.A[0] + Math.sin(a) * e.B[0]) * r, e.c[1] + (Math.cos(a) * e.A[1] + Math.sin(a) * e.B[1]) * r, e.c[2] + (Math.cos(a) * e.A[2] + Math.sin(a) * e.B[2]) * r]);
  const span = Math.abs(aE - e.a0); if (span < 1e-3) return;
  const st = Math.max(1, CAM.zoom * .6), sz = st > 1 ? Math.ceil(st) + 1 : 1, n = Math.min(1400, Math.max(8, Math.ceil(span * e.R * 2.4 * CAM.zoom / st))), fade = e.shatter ? gk * .5 : gk;
  for (let i = 0; i <= n; i++) { const t = i / n, a = e.a0 + (aE - e.a0) * t, along = (a - e.a0) / (e.a1 - e.a0);
    if (e.shatter && gk > 0 && ((a * e.R / 5 + e.seed) % 1 + 1) % 1 < gk * .9) continue;   // the shatter: gaps widen until only slivers are left
    const w = e.w * Math.pow(Math.max(0, Math.sin(Math.PI * along)), .7) * (1 - gk * .6) + .6, [ox, oy] = P(a, e.R), [ix, iy] = P(a, e.R - w);
    const tip = sw < 1 && Math.abs(aE - a) < .14 ? 1 : 0, L = Math.ceil(Math.hypot(ox - ix, oy - iy) / st);
    for (let j = 0; j <= L; j++) { const u = L ? j / L : 1, h = tip ? 1 : u > .82 ? e.heat + .3 : u > .55 ? e.heat : e.heat * .5 * (j % 2 ? 1 : .7);
      B.dot(ix + (ox - ix) * u, iy + (oy - iy) * u, Math.min(1, h), fade, sz); }
    B.rim(ox + (ox - ix) / (L || 1), oy + (oy - iy) / (L || 1)); }
}
// the black slash: a white hairline that opens into a jagged slit of void with cyan lips, then snaps shut (void.js)
function drawTear(B, e, age) {
  const kd = Math.min(1, age / e.draw), op = Math.min(1, Math.max(0, (age - e.draw) / .12)), open = (op * op * (3 - 2 * op)) * (e.shut == null ? 1 : Math.max(0, 1 - (age - e.shut) / .05));
  const scr = t => { const q = e.pt(t); if (q.scr) { const [x, y] = S3(q.c), z = 2 * CAM.zoom; return [x + q.dx * z, y + q.dy * z]; } return S3(q); };
  const a = scr(0), b = scr(1), Lp = Math.hypot(b[0] - a[0], b[1] - a[1]) + 8, st = Math.max(1, CAM.zoom * .6), sz = Math.ceil(st), n = Math.min(900, Math.max(6, Math.ceil(Lp * kd / st))), Wp = e.W * 2 * CAM.zoom;
  for (let i = 0; i <= n; i++) { const t = i / n * kd, p = scr(t), p2 = scr(Math.min(1, t + .01)), p1 = scr(Math.max(0, t - .01)); let nx = -(p2[1] - p1[1]), ny = p2[0] - p1[0]; const l = Math.hypot(nx, ny) || 1; nx /= l; ny /= l;
    const j = e.jag[Math.min(47, t * 47 | 0)], w = open * Wp * Math.pow(Math.sin(Math.PI * t), .6);
    if (w <= 1.2) { B.dot(p[0], p[1], 1, 0); continue; }   // still just the cut: a white hairline
    for (let s = -w - 2; s <= w + 2; s += .7 * st) { const lim = w + (s < 0 ? j[0] : j[1]) * open * 1.5, as = Math.abs(s), x = p[0] + nx * s, y = p[1] + ny * s;
      if (as <= lim - 1) B.hole(x, y, sz); else if (as <= lim) B.dot(x, y, e.shut != null ? 1 : .75, 0, sz); else if (as <= lim + 1.6 && open > .25 && ((x + y) | 0) % 3) B.dot(x, y, 0, .55), B.rim(x, y); }
    if (open > .4 && i % 11 === 5) B.dot(p[0] + nx * j[0] * w * .4, p[1] + ny * j[0] * w * .4, 1, 0); }   // specks of far-off light inside the dark
}
function drawBolt(B, e, fd) {
  const a = S3(e.a), b = S3(e.b);
  if (!e.pts) { const L = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1, seg = Math.max(2, Math.round(L / 9)); e.pts = [[0, 0]];
    for (let i = 1; i < seg; i++) e.pts.push([i / seg, sgn() * rr(1, e.jit) * 2]); e.pts.push([1, 0]);
    e.fk = e.fork && seg > 2 ? { i: 1 + (Math.random() * (seg - 2) | 0), a: sgn() * rr(.5, 1), l: rr(8, 16) } : null; }
  const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1, nx = -dy / L, ny = dx / L, V = e.pts.map(([t, o]) => [a[0] + dx * t + nx * o, a[1] + dy * t + ny * o]);
  const f = fd > .6 ? (fd - .6) / .4 : 0;
  for (let i = 1; i < V.length; i++) B.line(V[i - 1][0], V[i - 1][1], V[i][0], V[i][1], e.heat, f, e.heat, 1);
  if (e.fk) { const [fx, fy] = V[e.fk.i], an = Math.atan2(dy, dx) + e.fk.a; B.line(fx, fy, fx + Math.cos(an) * e.fk.l, fy + Math.sin(an) * e.fk.l, e.heat * .8, f); }
}
export const clearFx = () => { FX.length = 0; };
export { rr, sgn, TAU };
