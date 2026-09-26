import { COL } from '../config.js';
import { g } from '../screen.js';
import { voids } from '../state.js';
import { rr } from './util.js';
import { ease } from '../rig/pose.js';
import { EL } from './element.js';

// ---- Cross Rift's tear: a cut that opens into a jagged slit of void with crawling edges and star-specks inside ----
export function tear(x0, y0, x1, y1, W) { const L = Math.hypot(x1 - x0, y1 - y0) || 1;
  const v = { x0, y0, x1, y1, W, L, age: 0, shut: null, life: 9, tick: 0, jag: [],
    stars: Array.from({ length: 4 + (L / 12 | 0) }, () => ({ t: rr(.12, .88), s: rr(-.7, .7), vt: rr(-.12, .12), col: Math.random() < .7 ? COL.fx : COL.core })) };
  crawl(v); voids.push(v); return v; }
function crawl(v) { v.jag = Array.from({ length: (v.L / 3 | 0) + 2 }, () => [rr(-1.4, 1.2), rr(-1.4, 1.2)]); } // each lip re-jags on its own, every 2-3 frames
export function updateVoids(dt) {
  for (const v of voids) { v.age += dt; v.life -= dt; if (--v.tick <= 0) { crawl(v); v.tick = 2 + (Math.random() * 2 | 0); }
    if (EL.cur.kit && v.shut == null && v.age > .1 && Math.random() < .6) { const t = rr(.15, .85), s = rr(-1, 1) * v.W * .8, dx = (v.x1 - v.x0) / v.L, dy = (v.y1 - v.y0) / v.L;
      EL.cur.kit.trail(v.x0 + (v.x1 - v.x0) * t - dy * s, v.y0 + (v.y1 - v.y0) * t + dx * s); }   // the tear bleeds the element: fire, goo, spray, wind, motes
    for (const st of v.stars) { st.t += st.vt * dt; if (st.t < .1 || st.t > .9) st.vt *= -1; } }
  for (let i = voids.length - 1; i >= 0; i--) if (voids[i].life <= 0) voids.splice(i, 1);
}
export function drawVoid(v) {
  const DRAW = .05, OPEN = .12, dx = v.x1 - v.x0, dy = v.y1 - v.y0, L = v.L, ux = dx / L, uy = dy / L;
  const kd = Math.min(1, v.age / DRAW), op = ease(Math.min(1, Math.max(0, (v.age - DRAW) / OPEN)));
  const shut = v.shut == null ? 0 : Math.min(1, (v.age - v.shut) / .05), open = op * (1 - shut);
  const pad = Math.ceil(v.W + 4), X0 = Math.floor(Math.min(v.x0, v.x1)) - pad, X1 = Math.ceil(Math.max(v.x0, v.x1)) + pad;
  const Y0 = Math.floor(Math.min(v.y0, v.y1)) - pad, Y1 = Math.ceil(Math.max(v.y0, v.y1)) + pad;
  const on = v.jag.map(() => Math.random() < .8), hole = [], lip = [], glint = [], halo = [], line0 = [];
  for (let py = Y0; py <= Y1; py++) for (let px = X0; px <= X1; px++) {
    const rx = px + .5 - v.x0, ry = py + .5 - v.y0, t = (rx * ux + ry * uy) / L; if (t < 0 || t > kd) continue;
    const s = -rx * uy + ry * ux, as = Math.abs(s), j = t * L / 3 | 0;
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
    g.globalAlpha = .9; g.fillStyle = st.col; g.fillRect(Math.round(v.x0 + dx * st.t - uy * st.s * w), Math.round(v.y0 + dy * st.t + ux * st.s * w), 1, 1); }
  put(lip, COL.eye, .95); put(glint, COL.core, 1); put(line0, COL.core, 1);
  g.globalAlpha = 1;
}
