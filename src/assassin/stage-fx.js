import { COL } from '../config.js';
import { rr, sgn } from '../fx/util.js';
import { bleed } from '../fx/blood.js';
import { kick } from '../world/enemy-body.js';
import { figure } from './pieces.js';
import { EL, ec } from '../fx/element.js';

// ---- An execution's own effects. They live on its stage, not the world lists, because the stage is drawn mirrored
// round the enemy so every execution can play facing either way ----
const CY = COL.eye, CY2 = COL.fx2, WH = '#ffffff';
// the stage's x in the world: the stage is drawn mirrored round the enemy when he faced right
export const wx = (S, x) => S.ox + S.m * (x - S.ox);
export const FX = () => ({ sparks: [], frags: [], zaps: [], cuts: [], rings: [], cres: [], ghosts: [], cracks: [] });
function line(out, x0, y0, x1, y1) { x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
  const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1; let e = dx + dy;
  for (;;) { out.push(x0, y0); if (x0 === x1 && y0 === y1) break; const e2 = 2 * e; if (e2 >= dy) { e += dy; x0 += sx; } if (e2 <= dx) { e += dx; y0 += sy; } } }
function bolt(x0, y0, x1, y1, jit) { const out = [], L = Math.hypot(x1 - x0, y1 - y0) || 1, nx = -(y1 - y0) / L, ny = (x1 - x0) / L, n = Math.max(2, Math.round(L / 4)); let px = x0, py = y0;
  for (let i = 1; i <= n; i++) { const t = i / n, o = i === n ? 0 : sgn() * rr(1, jit); const qx = x0 + (x1 - x0) * t + nx * o, qy = y0 + (y1 - y0) * t + ny * o; line(out, px, py, qx, qy); px = qx; py = qy; } return out; }
export const F = {
  // other elements layer their own matter in the world instead: sparks, bolts and slivers from the wound are fire, goo, water, wind or motes
  spark(S, x, y, vx, vy, life, col, streak) { if (EL.cur.kit && col !== '#8f9692') return EL.cur.kit.spark(wx(S, x), y, vx * S.m, vy, life); S.fx.sparks.push({ x, y, vx, vy, life, max: life, col, streak }); },
  burst(S, x, y, n, sp = 140) { for (let i = 0; i < n; i++) { const a = rr(0, 6.28), v = rr(sp * .5, sp); F.spark(S, x, y, Math.cos(a) * v, Math.sin(a) * v * .7, rr(.1, .22), [WH, CY2, CY][i % 3], true); } },
  slivers(S, x, y, n, spread = 8) { if (EL.cur.kit) return EL.cur.kit.residue(wx(S, x), y, n); for (let i = 0; i < n; i++) { const life = rr(.5, .9); S.fx.frags.push({ x: x + rr(-spread, spread), y: y - rr(0, 16), w: 1 + (Math.random() * 3 | 0), col: [CY, CY2, WH, '#0d1012'][i % 4], vx: rr(-6, 6), vy: rr(-12, -2), life, max: life }); } },
  speed(S, x0, x1, y, n) { for (let i = 0; i < n; i++) { const life = rr(.07, .15); S.fx.frags.push({ x: rr(Math.min(x0, x1), Math.max(x0, x1)), y: y - rr(2, 24), w: 4 + (Math.random() * 10 | 0), col: i % 3 ? WH : CY2, vx: Math.sign(x1 - x0) * rr(20, 60), vy: 0, life, max: life }); } },
  zap(S, x0, y0, x1, y1, life, jit = 2, col = CY) { if (EL.cur.kit) return EL.cur.kit.bolt(wx(S, x0), y0, wx(S, x1), y1, life, col, {}); S.fx.zaps.push({ x0, y0, x1, y1, life, max: life, jit, col, pts: bolt(x0, y0, x1, y1, jit), tick: 0 }); },
  cut(S, x0, y0, x1, y1, life) { const pts = []; line(pts, x0, y0, x1, y1); S.fx.cuts.push({ pts, life, max: life }); },
  ring(S, x, y, rx, ry, life, grow = 0) { S.fx.rings.push({ x, y, rx, ry, life, max: life, grow }); },
  cres(S, x, y, face, R, rot, flip, life = .2) { S.fx.cres.push({ x, y, face, R, rot, flip, life, max: life }); },
  ghost(S, R, col = CY, life = .22) { S.fx.ghosts.push({ R: { ...R, col }, life, max: life }); },
  crack(S, x, y) { for (let i = 0; i < 6; i++) { const a = i / 6 * 6.28 + rr(-.3, .3), out = []; let px = x, py = y;
    for (let k = 0; k < 3; k++) { const nx = px + Math.cos(a) * rr(4, 7), ny = py + Math.sin(a) * rr(2, 3); line(out, px, py, nx, ny); px = nx; py = ny; } S.fx.cracks.push({ pts: out, life: 1, max: 1 }); } },
  dust(S, x, y, n) { for (let i = 0; i < n; i++) F.spark(S, x + rr(-5, 5), y, rr(-60, 60), -rr(4, 16), rr(.3, .5), '#8f9692'); },
  // dramatic yet controlled: a white body for a few frames, a short pause, a small shake
  // the deaths pass: the blow knocks him away from the blade, he shakes through the pause, light and blood leave out the far side,
  // and a killing blow (a long pause) gets two impact frames, black then white
  hit(S, E, stop = .06, shake = 1 / 60) { E.flashT = .05; S.stop = Math.max(S.stop, stop); S.shake = Math.max(S.shake, shake);
    const R = S.R, dir = R && Math.abs(E.x - R.x) > .5 ? Math.sign(E.x - R.x) : -E.face, mag = Math.min(1.4, Math.max(.4, stop / .1));
    const z = (E.z || 0) + 13, cy = E.y - z; E.hitAt = S.clock;
    for (let i = 0; i < 4 + 8 * mag; i++) { const a = (dir > 0 ? 0 : Math.PI) + rr(-.5, .5), v = rr(110, 230) * mag;
      F.spark(S, E.x + dir * 2, cy + rr(-5, 5), Math.cos(a) * v, Math.sin(a) * v * .6, rr(.07, .15), i % 2 ? WH : CY2, true); }
    bleed(wx(S, E.x), E.y, z, dir * S.m, mag);
    if (E.body) kick(E.body, dir * E.face, mag);
    if (stop >= .09) S.impact = 2; },
};
export function updateStageFx(S, dt) {
  const L = S.fx;
  for (const q of L.sparks) { q.x += q.vx * dt; q.y += q.vy * dt; q.vy += 40 * dt; q.life -= dt; }
  for (const q of L.frags) { q.x += q.vx * dt; q.y += q.vy * dt; q.life -= dt; q.on = Math.random() < .35 + .6 * q.life / q.max; }
  for (const z of L.zaps) { z.life -= dt; if (--z.tick <= 0) { z.pts = bolt(z.x0, z.y0, z.x1, z.y1, z.jit); z.tick = 2; } z.on = Math.random() < .8; }
  for (const k of ['cuts', 'rings', 'cres', 'ghosts', 'cracks']) for (const q of L[k]) q.life -= dt;
  for (const k in L) for (let i = L[k].length - 1; i >= 0; i--) if (L[k][i].life <= 0) L[k].splice(i, 1);
}
// a crescent: white body, cyan rim, eaten away from its tail as it dies
function drawCres(g, c) {
  const k = 1 - c.life / c.max, R = c.R, d = Math.max(1, 5 * (1 - k)), cs = Math.cos(c.rot), sn = Math.sin(c.rot);
  g.globalAlpha = 1 - k * .6;
  for (let py = -R - 1; py <= R + 1; py++) for (let px = -R - 1; px <= R + 1; px++) {
    const lx0 = px * c.face, dy = py / .8, lx = lx0 * cs + dy * sn, ly = (-lx0 * sn + dy * cs) * c.flip, ro = Math.hypot(lx, ly);
    if (ro > R || Math.hypot(lx + d, ly - d * .35) <= R) continue;
    if (k > .4 && ((Math.atan2(ly, lx) * R / 5 + c.x) % 1 + 1) % 1 < (k - .4) * 1.6) continue;
    g.fillStyle = ec(R - ro < 1.2 ? CY : WH); g.fillRect(Math.round(c.x + px), Math.round(c.y + py), 1, 1);
  }
  g.globalAlpha = 1;
}
export function drawStageFloor(g, S) {
  for (const c of S.fx.cracks) { g.globalAlpha = Math.min(1, c.life * 2); g.fillStyle = '#24282a'; for (let i = 0; i < c.pts.length; i += 2) g.fillRect(c.pts[i], c.pts[i + 1], 1, 1); }
  g.globalAlpha = 1;
}
export function drawStageTop(g, S) {
  const L = S.fx;
  for (const gh of L.ghosts) figure(g, gh.R, .55 * gh.life / gh.max);
  for (const c of L.cuts) { const k = c.life / c.max; g.globalAlpha = Math.min(1, k * 1.5); g.fillStyle = ec(k > .6 ? WH : CY2); for (let i = 0; i < c.pts.length; i += 2) g.fillRect(c.pts[i], c.pts[i + 1], 1, 1); }
  g.globalAlpha = 1;
  for (const c of L.cres) drawCres(g, c);
  for (const r of L.rings) { const k = 1 - r.life / r.max, rx = r.rx + r.grow * k, ry = r.ry + r.grow * k * .5; g.globalAlpha = 1 - k; g.fillStyle = ec(WH);
    for (let a = 0; a < 6.28; a += .5 / rx) g.fillRect(Math.round(r.x + Math.cos(a) * rx), Math.round(r.y + Math.sin(a) * ry), 1, 1); }
  for (const z of L.zaps) { if (!z.on) continue; g.globalAlpha = Math.min(1, z.life / z.max * 1.8); g.fillStyle = ec(z.col); for (let i = 0; i < z.pts.length; i += 2) g.fillRect(z.pts[i], z.pts[i + 1], 1, 1); }
  for (const f of L.frags) { if (!f.on) continue; g.globalAlpha = Math.min(1, f.life / f.max * 1.5); g.fillStyle = ec(f.col); g.fillRect(Math.round(f.x), Math.round(f.y), f.w, 1); }
  for (const q of L.sparks) { g.globalAlpha = Math.min(1, q.life / q.max * 1.6); g.fillStyle = ec(q.col); g.fillRect(Math.round(q.x), Math.round(q.y), 1, 1); if (q.streak) g.fillRect(Math.round(q.x - q.vx * .012), Math.round(q.y - q.vy * .012), 1, 1); }
  g.globalAlpha = 1;
}
