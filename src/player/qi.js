import { COL } from '../config.js';
import { P, S } from '../state.js';
import { SHEETS } from '../anims/sheets.js';
import { zap } from '../fx/bolts.js';
import { rr, ring, after, spark } from '../fx/util.js';
import { frameOf } from './actions.js';
import { silPts, bodyPt } from './body.js';
import { DMG, living, damage } from '../world/enemies.js';

// ---- Qi and the Storm Chain passive: hits fill it, a full meter wakes the storm for 8 s ----
// the Qi each kind of hit feeds: bigger moves feed more (chain hits feed none, or the storm would never end)
export const QI_GAIN = { slash: .1, d: .09, sw: .16, tc: .05, cm: .2, cr: .08, crB: .1, mi: .07 }, STORM_T = 8;
export function qiAdd(v) { if (!v) return; P.qiIdle = 0; P.qi = Math.min(1, P.qi + v); if (P.qi >= 1) stormOn(); }
function stormOn() {
  P.storm = STORM_T; P.qiPop = .5; P.flash = .05; P.shakeAmp = 2; S.shake = 2 / 60;
  ring(P.x, P.y, 16, 7, .45, 2.6, COL.fx2); ring(P.x, P.y, 9, 4, 2 / 60);
  for (let i = 0; i < 8; i++) { const a = i / 8 * 6.28 + rr(-.2, .2), R = rr(18, 30);
    zap(P.x, P.y - 14, P.x + Math.cos(a) * R, P.y - 14 + Math.sin(a) * R * .6, rr(.12, .2), 2.5, i % 2 ? '#ffffff' : COL.fx2, { every: 1, fork: true }); }
}
export function updateQi(dt) {
  P.qiPop = Math.max(0, (P.qiPop || 0) - dt);
  if (P.storm > 0) { P.storm -= dt; P.qi = Math.max(0, P.storm / STORM_T); if (P.storm <= 0) P.storm = P.qi = 0;
    // now and then a bolt crackles along his body
    if (Math.random() < dt * 6) { const sil = silPts(SHEETS[P.state], frameOf()); if (sil.length) { const [x0, y0] = bodyPt(sil), a = rr(0, 6.28), l = rr(5, 11);
      zap(x0, y0, x0 + Math.cos(a) * l, y0 + Math.sin(a) * l, rr(.05, .1), 1.5, Math.random() < .5 ? '#ffffff' : COL.fx2); } }
    return; }
  if ((P.qiIdle += dt) > 3) P.qi = Math.max(0, P.qi - dt * .05); // out of the fight it slowly ebbs
}
// from the struck enemy, lightning leaps to the nearest enemies not yet in this chain, up to three links
export function chainFrom(d0) {
  const seen = new Set([d0]); let a = d0;
  ring(d0.x, d0.y - 2, 6, 3, .3, 3, COL.fx2);
  for (let hop = 0; hop < 3; hop++) {
    let b = null, best = 130;
    for (const d of living()) { const r = Math.hypot(d.x - a.x, (d.y - a.y) * 1.3); if (!seen.has(d) && r < best) { best = r; b = d; } }
    if (!b) break; seen.add(b);
    const x0 = a.x, y0 = a.y - 16, x1 = b.x, y1 = b.y - 16;
    after(.02 + hop * .07, () => { zap(x0, y0, x1, y1, .32, 3.5, '#ffffff', { every: 1, fork: true }); zap(x0, y0, x1, y1, .32, 2, COL.fx, { every: 1 });
      ring(x1, y1 + 14, 6, 3, .32, 3.5, COL.fx2); ring(x1, y1, 4, 4, 2 / 60); chainHit(b, x0); });
    a = b;
  }
}
function chainHit(d, fx) { if (!d.alive) return; d.zap = .35; P.struck.add(d); damage(d, DMG.chain, fx, d.y);
  for (let i = 0; i < 9; i++) { const a = rr(0, 6.28); spark(d.x, d.y - 16, Math.cos(a) * rr(60, 130), Math.sin(a) * rr(40, 90), rr(.08, .16), ['#ffffff', COL.fx2, COL.fx][i % 3], true); } }
