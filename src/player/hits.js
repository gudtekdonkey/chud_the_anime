import { COL } from '../config.js';
import { P, S, cuts } from '../state.js';
import { rr, residue, spark } from '../fx/util.js';
import { QI_GAIN, qiAdd, chainFrom } from './qi.js';
import { ENEMIES, DMG, damage } from '../world/enemies.js';
import { weapon } from '../weapons/weapons.js';

// ---- Hits: each enemy once per kind per move; P.struck remembers them for the sheath-click burst ----
export function hitOne(e, i, kind, fx = P.x, fy = P.y) {
  if (!e.alive || e.held) return;   // the fallen are not cut again, nor one an execution holds
  P.hitDone[kind + i] = true; P.struck.add(e);
  // short on purpose: a 3-frame white flash (damage() sets it), a 3-frame freeze, ONE shaken frame
  // a heavier weapon holds the freeze and the shake longer (weight: 1 for the katana)
  const wt = weapon().weight;
  S.hitstop = Math.max(S.hitstop, .05 * wt.stop); S.shake = Math.max(S.shake, wt.shake / 60);
  if (kind === 'sw') e.zap = .25;
  const base = kind.match(/^[a-zA-Z]+/)[0];
  // 6-12 short streaks, mostly thrown away from whoever cut it
  const away = Math.atan2(e.y - fy, e.x - fx), n = 6 + (Math.random() * 7 | 0);
  for (let i = 0; i < n; i++) { const a = i < n * .7 ? away + rr(-1.1, 1.1) : rr(0, Math.PI * 2), v = rr(110, 170);
    spark(e.x + rr(-2, 2), e.y - 16 + rr(-4, 4), Math.cos(a) * v, Math.sin(a) * v * .7, rr(.09, .16), ['#ffffff', COL.fx2, COL.fx][i % 3], true); }
  if (P.storm > 0) chainFrom(e); else qiAdd(QI_GAIN[base] || 0);
  damage(e, DMG[base] || 1, fx, fy);
}
export function hit(kind, cx, cy, r) {
  ENEMIES.forEach((d, i) => { if (d.alive && !P.hitDone[kind + i] && Math.hypot(d.x - cx, (d.y - 10 - cy) * 1.4) <= r) hitOne(d, i, kind); });
}
// distance from a point to a segment in the same squashed floor space as hit(), and how far along it the point sits
function segDist(px, py, x0, y0, x1, y1) {
  const dx = x1 - x0, dy = (y1 - y0) * 1.4, qx = px - x0, qy = (py - y0) * 1.4, t = Math.max(0, Math.min(1, (qx * dx + qy * dy) / (dx * dx + dy * dy || 1)));
  return [Math.hypot(qx - dx * t, qy - dy * t), t];
}
export function hitSeg(kind, x0, y0, x1, y1, r) {
  ENEMIES.forEach((d, i) => { if (d.alive && !P.hitDone[kind + i] && segDist(d.x, d.y - 10, x0, y0, x1, y1)[0] <= r) hitOne(d, i, kind); });
}
// the sheath-click payoff on one enemy: white, a cut across it, slivers and a spray of streaks; it lands one more blow.
// On one already down it is only the slivers and streaks over the body
export function burst(d, p = 1) {
  if (!d.alive) { residue(d.x, d.y, 6 * p | 0); for (let i = 0; i < 8 * p; i++) { const a = rr(0, 6.28); spark(d.x, d.y - 4, Math.cos(a) * rr(60, 120) * p, Math.sin(a) * rr(30, 70) * p, rr(.1, .2), ['#ffffff', COL.fx2, COL.fx][i % 3], true); } return; }
  damage(d, DMG.burst * p, P.x, P.y); d.flash = .08;
  cuts.push({ x0: Math.round(d.x - 16 * p), x1: Math.round(d.x + 16 * p), y: Math.round(d.y - 14), life: .14, max: .14 });
  residue(d.x, d.y, 10 * p | 0);
  for (let i = 0; i < 16 * p; i++) { const a = rr(0, 6.28); spark(d.x, d.y - 14, Math.cos(a) * rr(80, 160) * p, Math.sin(a) * rr(60, 120) * p, rr(.12, .22), ['#ffffff', COL.fx2, COL.fx][i % 3], true); }
}
