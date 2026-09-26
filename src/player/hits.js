import { COL } from '../config.js';
import { P, S, cuts } from '../state.js';
import { rr, residue, spark } from '../fx/util.js';
import { QI_GAIN, qiAdd, chainFrom } from './qi.js';
import { DUMMIES } from '../world/dummies.js';

// ---- Hits: each dummy once per kind per move; P.struck remembers them for the sheath-click burst ----
export function hitOne(dummy, i, kind, fx = P.x, fy = P.y) {
  P.hitDone[kind + i] = true; P.struck.add(dummy);
  // short on purpose: a 3-frame white dummy, a 3-frame freeze, ONE shaken frame
  dummy.flash = .05; dummy.wob = .25; S.hitstop = Math.max(S.hitstop, .05); S.shake = Math.max(S.shake, 1 / 60);
  if (kind === 'sw') dummy.zap = .25;
  // 6-12 short streaks, mostly thrown away from whoever cut it
  const away = Math.atan2(dummy.y - fy, dummy.x - fx), n = 6 + (Math.random() * 7 | 0);
  for (let i = 0; i < n; i++) { const a = i < n * .7 ? away + rr(-1.1, 1.1) : rr(0, Math.PI * 2), v = rr(110, 170);
    spark(dummy.x + rr(-2, 2), dummy.y - 16 + rr(-4, 4), Math.cos(a) * v, Math.sin(a) * v * .7, rr(.09, .16), ['#ffffff', COL.fx2, COL.fx][i % 3], true); }
  if (P.storm > 0) chainFrom(dummy); else qiAdd(QI_GAIN[kind.match(/^[a-zA-Z]+/)[0]] || 0);
}
export function hit(kind, cx, cy, r) {
  DUMMIES.forEach((d, i) => { if (!d.out && !P.hitDone[kind + i] && Math.hypot(d.x - cx, (d.y - 10 - cy) * 1.4) <= r) hitOne(d, i, kind); });
}
// distance from a point to a segment in the same squashed floor space as hit(), and how far along it the point sits
function segDist(px, py, x0, y0, x1, y1) {
  const dx = x1 - x0, dy = (y1 - y0) * 1.4, qx = px - x0, qy = (py - y0) * 1.4, t = Math.max(0, Math.min(1, (qx * dx + qy * dy) / (dx * dx + dy * dy || 1)));
  return [Math.hypot(qx - dx * t, qy - dy * t), t];
}
export function hitSeg(kind, x0, y0, x1, y1, r) {
  DUMMIES.forEach((d, i) => { if (!d.out && !P.hitDone[kind + i] && segDist(d.x, d.y - 10, x0, y0, x1, y1)[0] <= r) hitOne(d, i, kind); });
}
// the sheath-click payoff on one dummy: white, a cut across it, slivers and a spray of streaks
export function burst(d, p = 1) {
  d.flash = .08; d.wob = .3;
  cuts.push({ x0: Math.round(d.x - 16 * p), x1: Math.round(d.x + 16 * p), y: Math.round(d.y - 14), life: .14, max: .14 });
  residue(d.x, d.y, 10 * p | 0);
  for (let i = 0; i < 16 * p; i++) { const a = rr(0, 6.28); spark(d.x, d.y - 14, Math.cos(a) * rr(80, 160) * p, Math.sin(a) * rr(60, 120) * p, rr(.12, .22), ['#ffffff', COL.fx2, COL.fx][i % 3], true); }
}
