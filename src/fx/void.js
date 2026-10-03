import { COL, SQ } from '../config.js';
import { g } from '../screen.js';
import { voids } from '../state.js';
import { rr } from './util.js';
import { ease } from 'ronin-engine/rig/pose.js';
import { EL } from './element.js';

// ---- The black slash: Cross Rift's tear, a cut that opens into a jagged slit of void with crawling edges and star-specks inside ----
// Every offensive skill cuts one (owner: "the black slash we do for P should be in all the offensive skills").
// A tear is a straight cut (x0..y1) or an arc; either way `at(t, s)` is the point t along it and s off it, and `uv` the inverse.
function mk(v) { v.stars = Array.from({ length: 4 + (v.L / 12 | 0) }, () => ({ t: rr(.12, .88), s: rr(-.7, .7), vt: rr(-.12, .12), col: Math.random() < .7 ? COL.fx : COL.core }));
  crawl(v); voids.push(v); return v; }
// W: the widest the slit opens. draw: how long the cut takes to run its length. close: when it snaps shut by itself (null: the caller shuts it)
export function tear(x0, y0, x1, y1, W, close = null, draw = .05) { const L = Math.hypot(x1 - x0, y1 - y0) || 1, ux = (x1 - x0) / L, uy = (y1 - y0) / L;
  return mk({ x0, y0, x1, y1, W, L, draw, close, age: 0, shut: null, life: 9, tick: 0, jag: [],
    at: (t, s) => [x0 + ux * t * L - uy * s, y0 + uy * t * L + ux * s],
    uv: (px, py) => { const rx = px - x0, ry = py - y0; return [(rx * ux + ry * uy) / L, -rx * uy + ry * ux]; } }); }
// one arm of an X (sign 1: down to the front, -1: up), h its half-length, tilted like Cross Rift's
export function xTear(cx, cy, h, sign, W, close) { const hx = h * .85, hy = h * .42 * sign; return tear(cx - hx, cy - hy, cx + hx, cy + hy, W, close); }
// the same slit bent round an arc (a crescent's path), from angle a0 to a1, drawn on the flattened floor circle like the crescents
export function tearArc(cx, cy, face, R, a0, a1, W, close = null, draw = .05) {
  const at = (t, s) => { const a = a0 + (a1 - a0) * t; return [cx + face * Math.cos(a) * (R + s), cy + Math.sin(a) * (R + s) * SQ]; };
  const [x0, y0] = at(0, 0), [x1, y1] = at(1, 0);
  return mk({ x0, y0, x1, y1, W, L: R * Math.abs(a1 - a0), draw, close, age: 0, shut: null, life: 9, tick: 0, jag: [], at,
    uv: (px, py) => { const lx = (px - cx) * face, ly = (py - cy) / SQ; return [(Math.atan2(ly, lx) - a0) / (a1 - a0), Math.hypot(lx, ly) - R]; } }); }
function crawl(v) { v.jag = Array.from({ length: (v.L / 3 | 0) + 2 }, () => [rr(-1.4, 1.2), rr(-1.4, 1.2)]); } // each lip re-jags on its own, every 2-3 frames
export function updateVoids(dt) {
  for (const v of voids) { v.age += dt; v.life -= dt; if (--v.tick <= 0) { crawl(v); v.tick = 2 + (Math.random() * 2 | 0); }
    if (v.close != null && v.shut == null && v.age >= v.close) { v.shut = v.age; v.life = .05; }   // it snaps shut on its own: the 0.05 s implosion, then gone
    if (EL.cur.kit && v.shut == null && v.age > .1 && Math.random() < .6 * Math.min(1, v.L / 60)) { const t = rr(.15, .85), s = rr(-1, 1) * v.W * .8;
      EL.cur.kit.trail(...v.at(t, s)); }   // the tear bleeds the element: fire, goo, spray, wind, motes
    for (const st of v.stars) { st.t += st.vt * dt; if (st.t < .1 || st.t > .9) st.vt *= -1; } }
  for (let i = voids.length - 1; i >= 0; i--) if (voids[i].life <= 0) voids.splice(i, 1);
}
export function drawVoid(v) {
  const OPEN = .12, L = v.L;
  const kd = Math.min(1, v.age / v.draw), op = ease(Math.min(1, Math.max(0, (v.age - v.draw) / OPEN)));
  const shut = v.shut == null ? 0 : Math.min(1, (v.age - v.shut) / .05), open = op * (1 - shut);
  // the box: every point along the cut, padded by the widest it opens
  const pad = Math.ceil(v.W + 4); let X0 = 1e9, X1 = -1e9, Y0 = 1e9, Y1 = -1e9;
  for (let i = 0, n = Math.max(2, L / 6 | 0); i <= n; i++) { const [x, y] = v.at(i / n, 0); X0 = Math.min(X0, x); X1 = Math.max(X1, x); Y0 = Math.min(Y0, y); Y1 = Math.max(Y1, y); }
  X0 = Math.floor(X0) - pad; X1 = Math.ceil(X1) + pad; Y0 = Math.floor(Y0) - pad; Y1 = Math.ceil(Y1) + pad;
  const on = v.jag.map(() => Math.random() < .8), hole = [], lip = [], glint = [], halo = [], line0 = [];
  for (let py = Y0; py <= Y1; py++) for (let px = X0; px <= X1; px++) {
    const [t, s] = v.uv(px + .5, py + .5); if (t < 0 || t > kd) continue;
    const as = Math.abs(s), j = t * L / 3 | 0;
    const w = open * v.W * Math.pow(Math.sin(Math.PI * t), .6) + (open > .05 ? v.jag[j][s < 0 ? 0 : 1] * open : 0);
    if (as < .55 && w <= 1) { line0.push(px, py); continue; }            // still just the cut: a white hairline
    if (as <= w - 1) hole.push(px, py);
    else if (as <= w) (shut > 0 || (on[j] && Math.random() < .12) ? glint : on[j] ? lip : halo).push(px, py);
    else if (as <= w + 1.6 && open > .25 && on[j]) halo.push(px, py);
  }
  const put = (a, col, al) => { g.globalAlpha = al; g.fillStyle = col; for (let i = 0; i < a.length; i += 2) g.fillRect(a[i], a[i + 1], 1, 1); };
  put(halo, COL.fx, shut ? .6 : .3); put(hole, '#05070a', .96);
  // specks of far-off light drift inside the dark
  if (open > .4) for (const st of v.stars) { const w = open * v.W * Math.pow(Math.sin(Math.PI * st.t), .6) - 1.5; if (w < 1 || Math.random() < .2) continue;
    const [x, y] = v.at(st.t, st.s * w); g.globalAlpha = .9; g.fillStyle = st.col; g.fillRect(Math.round(x), Math.round(y), 1, 1); }
  put(lip, COL.eye, .95); put(glint, COL.core, 1); put(line0, COL.core, 1);
  g.globalAlpha = 1;
}
