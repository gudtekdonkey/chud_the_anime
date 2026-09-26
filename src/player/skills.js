import { COL } from '../config.js';
import { P, S, frags } from '../state.js';
import { SHEETS } from '../anims/sheets.js';
import { zap } from '../fx/bolts.js';
import { STONE } from '../fx/debris.js';
import { crescent, strike } from '../fx/slash.js';
import { rr, sgn, residue, ring, after, spark, scrFlash } from '../fx/util.js';
import { tear } from '../fx/void.js';
import { setState, once, moveBy, blink, ghost, frameOf, inputDir } from './actions.js';
import { silPts, bodyPt, motes } from './body.js';
import { hit, hitSeg, burst } from './hits.js';
import { CD, startCd } from './cooldowns.js';
import { collide } from '../world/room.js';
import { T, powerCast } from './power.js';

// ---- Charging (hold I, O or P): sparks and bolts converge onto his body while it glows ----
export const TAP = .14, CHARGE_T = .9;
export function chargeUp(dt, inp) {
  const was = P.charge || 0, c = P.charge = Math.min(1, was + dt / CHARGE_T + 1e-6);
  if (inp.mx || inp.my) P.blinkDir = inputDir(inp); // aim while holding
  const sil = silPts(SHEETS[P.state], frameOf());
  if (sil.length) {
    // each spark starts out in the air and dies exactly as it reaches a point on his outline
    for (let i = 0; i < 3; i++) if (Math.random() < .25 + c * .55) { const [tx, ty] = bodyPt(sil), a = rr(0, 6.28), R = rr(20, 36), v = 70 + c * 150;
      spark(tx + Math.cos(a) * R, ty + Math.sin(a) * R * .7, -Math.cos(a) * v, -Math.sin(a) * v * .7, R / v, [COL.fx, COL.fx2, '#ffffff'][i], true, 0); }
    if (Math.random() < .1 + c * .45) { const [tx, ty] = bodyPt(sil), a = rr(0, 6.28), R = rr(10, 20);
      zap(tx + Math.cos(a) * R, ty + Math.sin(a) * R * .8, tx, ty, rr(.04, .07), 1.5, Math.random() < .6 ? COL.fx : '#ffffff'); }
  }
  motes(.15 + c * .5);
  P.trem = c >= 1 && Math.random() < .5 ? sgn() : 0; // a 1px tremble at full charge
  if (was < 1 && c >= 1) { P.flash = .05; ring(P.x, P.y - 13, 10, 7, .14, 1.4, COL.fx2); } // full: one flash
}

// ---- The dash-and-cut skills (hold I: Thousand Cuts, P: Cross Rift), both on the double's frames and timeline ----
// vanish (4) for V s, lunge cut (5-6), second cut (7-8), freeze (9) for `hold` s, resheathe (13-15); the payoff lands on the click in frame 14.
export const TC = { name: 'Thousand Cuts', dist: 110, V: .34, hold: .24,
  go() { const x0 = P.x, y0 = P.y; residue(x0, y0, 14); blink(P.dist, P.blinkDir); P.C = [P.x, P.y]; P.face0 = P.face; P.a0 = rr(0, 6.28); P.last = [x0, y0 - 12];
    P.tcN = T('tc', 'cuts');   // more cuts with power, packed into the same vanish
    hit('tc', P.x, P.y - 12, 30 + 30 * P.k); },
  frame(t) { const n = P.tcN || 7, j = t / (this.V / n) | 0, ph = t - j * this.V / n; return ph < .033 ? 5 + j % 4 : 4; },
  tick(t) { const n = P.tcN || 7, j = Math.min(n - 1, t / (this.V / n) | 0); if (t >= this.V || !once('tc' + j, true)) return;
    // a new spot on a flattened circle round the point, facing in; each gets its own crescent angle
    const a = P.a0 + j * 2.4, rad = 16 + 12 * P.k, [cx, cy] = P.C;
    [P.x, P.y] = collide(cx + Math.cos(a) * rad, cy + Math.sin(a) * rad * .6); P.face = Math.sign(cx - P.x) || 1; P.fr = 5 + j % 4;
    zap(P.last[0], P.last[1], P.x, P.y - 12, .07, 1.2, COL.fx); P.last = [P.x, P.y - 12];
    ghost(.08); crescent(P.x + P.face * 8, P.y - 12, P.face, rr(-1.1, 1.1), sgn(), 17 + 6 * P.k, 5, .05);
    P.flash = .02; for (let i = 0; i < 4; i++) spark(cx + rr(-6, 6), cy - 12 + rr(-6, 6), rr(-90, 90), rr(-60, 60), rr(.08, .14), i % 2 ? '#ffffff' : COL.fx2, true); },
  c1() { P.face = P.face0; [P.x, P.y] = collide(P.C[0] - P.face * 16, P.C[1]); strike(-.5, 1, true); }, c2() { strike(.5, -1, true); },
  click() { const [cx, cy] = P.C, R = 30 + 30 * P.k;
    ring(cx, cy - 10, R, R * .55, .1); ring(cx, cy - 10, R * .6, R * .33, .22, 1, COL.fx2); residue(cx, cy, 10);
    for (let i = 0; i < 28; i++) { const a = rr(0, 6.28); spark(cx, cy - 12, Math.cos(a) * rr(90, 200), Math.sin(a) * rr(60, 130), rr(.12, .24), ['#ffffff', COL.fx2, COL.fx][i % 3], true); }
    for (const d of P.struck) burst(d, 1.2); } };
export const RIFT = { name: 'Cross Rift', dist: 120, V: .08, hold: .3,
  go() { dash(); },
  arm(sign) { const h = (30 + 42 * P.k) * T('rift', 'size'), cx = P.x + P.face * (30 + 26 * P.k), cy = P.y - 12, hx = h * .85, hy = h * .42 * sign;
    P.X = [cx, cy, h]; hitSeg('cr' + sign, cx - hx, cy - hy, cx + hx, cy + hy, 12 + 8 * P.k);
    return tear(cx - hx, cy - hy, cx + hx, cy + hy, 2.5 + 3.5 * P.k); },
  c1() { strike(-.5, 1, true); P.r1 = this.arm(1); }, c2() { strike(.5, -1, true); P.r2 = this.arm(-1); },
  tick(t, dt) { if (!P.r2 || P.r2.shut != null) return;
    // the tear drinks the room: stone chips lift off the floor and motes stream in, dying as they reach its lips
    for (const r of [P.r1, P.r2]) if (Math.random() < .8) { const u = rr(.15, .85), x = r.x0 + (r.x1 - r.x0) * u, y = r.y0 + (r.y1 - r.y0) * u, a = rr(0, 6.28), R = rr(14, 34), v = rr(60, 110);
      const stone = Math.random() < .45, sx = x + Math.cos(a) * R, sy = stone ? y + rr(10, 22) : y + Math.sin(a) * R * .7, L = Math.hypot(x - sx, y - sy) || 1;
      spark(sx, sy, (x - sx) / L * v, (y - sy) / L * v, L / v, stone ? STONE[Math.random() * 3 | 0] : [COL.fx, COL.fx2, '#ffffff'][Math.random() * 3 | 0], !stone, 0); }
    const [cx, cy] = P.X; for (const f of frags) { const dx = cx - f.x, dy = cy - f.y, L = Math.hypot(dx, dy); if (L < 70 && L > 3) { f.vx += dx / L * 160 * dt; f.vy += dy / L * 160 * dt; } }
    if (Math.random() < .15) { const r = Math.random() < .5 ? P.r1 : P.r2, u = rr(.2, .8), u2 = u + rr(.06, .14) * sgn();
      zap(r.x0 + (r.x1 - r.x0) * u, r.y0 + (r.y1 - r.y0) * u, r.x0 + (r.x1 - r.x0) * u2, r.y0 + (r.y1 - r.y0) * u2, .05, 2, '#ffffff'); } },
  // the click: the X snaps shut, imploding for 3 frames, then detonates outward and hits everything inside
  click() { const [cx, cy, h] = P.X; S.hitstop = 0; S.shake = 0;
    for (const r of [P.r1, P.r2]) r.shut = r.age;
    for (let i = 0; i < 18; i++) { const a = rr(0, 6.28), R = rr(10, h * .7), v = R / .05; spark(cx + Math.cos(a) * R, cy + Math.sin(a) * R * .6, -Math.cos(a) * v, -Math.sin(a) * v * .6, .05, i % 2 ? '#ffffff' : COL.fx2, true, 0); }
    after(.05, () => { for (const r of [P.r1, P.r2]) r.life = 0;
      S.hitstop = .08; S.shake = 4 / 60; P.shakeAmp = 3; scrFlash(.05, .16);
      ring(cx, cy + 2, h * .9, h * .5, .1); ring(cx, cy + 2, h * .5, h * .28, .24, 1.1, COL.fx2); ring(cx, cy + 2, 6, 3, .3, h / 5, '#ffffff'); ring(cx, cy + 12, h * .4, h * .12, .4, 1.8, COL.fx);
      hit('crB', cx, cy, h * .95); residue(cx, cy + 14, 12);
      for (let i = 0; i < 34; i++) { const a = rr(0, 6.28); spark(cx, cy, Math.cos(a) * rr(90, 220), Math.sin(a) * rr(60, 140), rr(.12, .26), ['#ffffff', COL.fx2, COL.fx][i % 3], true); }
      for (const d of P.struck) burst(d, 1.2);
      const e = T('rift', 'echo'); if (e) after(.25, () => echo(cx, cy, h * e)); }); } };
// power III: the rift's echo, a second, smaller detonation where the X was
function echo(cx, cy, h) {
  S.hitstop = .05; S.shake = 2 / 60; ring(cx, cy + 2, h * .9, h * .5, .1); ring(cx, cy + 2, h * .5, h * .28, .2, 1.1, '#ffffff');
  hit('crE', cx, cy, h * .95); for (let i = 0; i < 20; i++) { const a = rr(0, 6.28); spark(cx, cy, Math.cos(a) * rr(70, 170), Math.sin(a) * rr(50, 110), rr(.1, .2), ['#ffffff', COL.fx2, COL.fx][i % 3], true); }
  for (let i = 0; i < 5; i++) { const a = rr(0, 6.28), R = rr(h * .4, h * .8); zap(cx, cy, cx + Math.cos(a) * R, cy + Math.sin(a) * R * .55, rr(.08, .14), 2.5, i % 2 ? '#ffffff' : COL.fx2, { every: 1 }); } }
// the dash both use: blink along the aim (walls and pillars clamp it), slivers at the start, a streak along the way
function dash() {
  const x0 = P.x, y0 = P.y; residue(x0, y0, 14); blink(P.dist, P.blinkDir);
  const n = Math.hypot(P.x - x0, P.y - y0) | 0;
  for (let i = 0; i < n; i += 3) spark(x0 + (P.x - x0) * i / n, y0 - 12 + (P.y - y0) * i / n + rr(-5, 5), 0, 0, rr(.12, .22), i % 2 ? COL.fx : COL.fx2, false, 0);
  return [x0, y0, P.x, P.y];
}
export function release(v, min = 0) {
  const c = Math.max(min, P.charge || 0); P.cv = v; P.pow = c; P.ct = -.05; P.trem = 0; P.charge = null; // -.05: the glitch frame 3 plays before he vanishes
  P.k = .35 + .65 * c; // size scale: a short hold is still a charged move, a full one is the full thing
  P.dist = 44 + (v.dist - 44) * c;
  startCd(v === RIFT ? 'rift' : 'double', v === RIFT ? CD.rift : CD.tc);   // cools down from the release
  powerCast();
}
export function charged(dt) {
  const v = P.cv, t = (P.ct += dt), V = v.V, F = V + .16 + v.hold;
  P.inv = t < V + .1;
  if (t < 0) { P.fr = 3; return; }
  P.fr = t < V ? (v.frame ? v.frame(t) : 4) : t < V + .04 ? 5 : t < V + .08 ? 6 : t < V + .12 ? 7 : t < V + .16 ? 8 : t < F ? 9 : t < F + .04 ? 13 : t < F + .1 ? 14 : 15;
  if (once('go', true)) v.go();
  if (v.tick) v.tick(t, dt);
  if (once('c1', t >= V)) v.c1();
  if (once('c2', t >= V + .1)) { v.c2(); moveBy(P.face * 3, 0); }
  // the sheath click: a longer freeze and a 3-frame shake than the normal double, then the skill's payoff
  if (once('click', t >= F + .06)) { spark(P.x + P.face * 3, P.y - 10, 0, -10, .12, '#ffffff', false);
    S.hitstop = .08; S.shake = 3 / 60; v.click(); }
  if (t >= F + .2) { P.inv = false; setState('idle'); }
}
