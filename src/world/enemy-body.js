import { pz, lerpP, ease } from '../rig/pose.js';
import { rr, sgn } from '../fx/util.js';

// ---- The samurai's body: poses, and the deaths pass's spring joints (from the deaths pass prototypes) ----
// The pose each state asks for is only a target. Every joint chases it on a spring, so the hips lead, the chest follows and the arms,
// blade and head trail and overshoot. As he goes down the muscles let go; the floor stops him dead; then a twitch or two, and still.
const eIn = k => k * k;   // gravity: slow off the mark, fastest at the floor
export const GUARD = pz({ hy: 2, lean: .1, fl: [.4, .6], bl: [-.45, .3], fa: [1.2, .55], ba: [1.05, .75], sword: -.7, bare: true });
// a hit: jolted back, guard jerked up
export const FLINCH = pz({ ...GUARD, hx: -1, lean: -.15, chest: -.3, fa: [1.55, .9], ba: [1.35, 1], sword: -1.25 });
// a heavy hit or a second one too soon: he reels back a step with the blade flung low, catches himself, and comes back to guard
const REEL = pz({ ...GUARD, hx: -2, hy: 3, lean: -.4, chest: -.35, fl: [.2, .3], bl: [-.9, .9], fa: [.4, .2], ba: [1.8, .4], sword: .3 });
const CATCH = pz({ ...GUARD, hx: -1, hy: 4, lean: .15, fl: [.7, 1.1], bl: [-.6, .6], fa: [.8, .5], ba: [.9, .6], sword: -.2 });
export const STAGGER_T = .6, FLINCH_T = .25;
const STAGGER = [[0, GUARD], [.12, REEL], [.36, CATCH], [STAGGER_T, GUARD]];
export const staggerPose = t => at(STAGGER, t);
// the death: the knees give, he kneels, and falls flat, forward (fd > 0, the way he faces) or back. The sword is already gone from his hands
export const THUD_T = .46;
export function deathPose(P0, fd, t) {
  const BUCK = pz({ ...P0, hy: Math.max(P0.hy, 3) + 3, fl: [.95, 1.9], bl: [.3, 1.6], lean: P0.lean * .5, fa: [.5, .3], ba: [.3, .3] });
  const KNEEL = pz({ ...P0, hy: 8, fl: [1.35, 2.8], bl: [1.15, 2.75], lean: fd > 0 ? .5 : -.35, fa: [.2, .1], ba: [-.1, .1] });
  const DOWN = fd > 0 ? pz({ hy: 9, hx: 3, lean: 1.5, fl: [-1.5, .2], bl: [-1.45, .4], fa: [1.6, .1], ba: [1.4, .2] })
    : pz({ hy: 9, hx: -3, lean: -1.45, fl: [1.5, .1], bl: [1.45, .3], fa: [-1.6, .1], ba: [-1.4, .2] });
  return { ...at([[0, P0], [.1, BUCK], [.28, KNEEL, eIn], [THUD_T, DOWN, eIn]], t), sword: null, empty: true, bare: true };
}
function at(keys, t) {
  if (t <= keys[0][0]) return keys[0][1];
  let j = 0; while (j < keys.length - 2 && keys[j + 1][0] <= t) j++;
  const [t0, a] = keys[j], [t1, b, e] = keys[j + 1];
  return lerpP(a, b, (e || ease)(Math.min(1, Math.max(0, (t - t0) / (t1 - t0)))));
}
export const lying = p => p.hy >= 8;

// [natural frequency, damping ratio] per joint
const CH = { hx: [38, .8], hy: [40, .8], lean: [30, .62], chest: [22, .5], fl: [46, .85], bl: [46, .85], fa: [19, .42], ba: [17, .4], sword: [17, .36] };
const CH2 = ['fl', 'bl', 'fa', 'ba'];
function flat(p) { const o = { hx: p.hx, hy: p.hy, lean: p.lean, chest: p.chest, sword: p.sword };
  for (const k of CH2) { o[k + '0'] = p[k][0]; o[k + '1'] = p[k][1]; } return o; }
export function newBody(p) { const x = flat(p), v = {}; for (const k in x) v[k] = 0;
  return { x, v, neck: 0, nv: 0, prevAng: null, prevAv: 0, thudT: null, t: 0, tw: 0, out: p }; }
// one step toward the target pose; dt 0 (the hit pause) holds him where he is
export function stepBody(b, tgt, dt) {
  const T = flat(tgt), X = b.x, V = b.v, limp = Math.min(1, Math.max(0, (tgt.hy - 4) / 4));
  if (T.sword == null) X.sword = null; else if (X.sword == null) { X.sword = T.sword; V.sword = 0; }
  b.t += dt;
  const steps = Math.ceil(dt / (1 / 240)), h = dt / Math.max(1, steps);
  for (let s = 0; s < steps; s++) {
    for (const k in T) { if (T[k] == null || X[k] == null) continue;
      let [w, z] = CH[k.replace(/[01]$/, '')];
      if (/^(fa|ba|sword)/.test(k)) { w *= 1 - .45 * limp; z *= 1 - .3 * limp; }   // the arms let go first
      else if (/^(fl|bl)/.test(k)) w *= 1 - .3 * limp;                                  // then the legs
      else if (/^(hy|lean|hx)$/.test(k)) w *= 1 + limp;                                  // a falling trunk is carried by its weight, not held back
      V[k] += (w * w * (T[k] - X[k]) - 2 * z * w * V[k]) * h; X[k] += V[k] * h; }
    // the floor is hard: nothing sinks through it
    if (lying(tgt) && X.hy > T.hy) { X.hy = T.hy; V.hy = Math.min(0, V.hy); }
    // the head is carried by the chest: it lags when the chest whips, and drops as he loses his strength
    const ang = X.lean + X.chest, av = b.prevAng == null ? 0 : (ang - b.prevAng) / h, aa = (av - b.prevAv) / h; b.prevAng = ang; b.prevAv = av;
    const nw = 22 - 8 * limp, nT = Math.abs(X.lean) < 1 ? limp * .45 : 0;
    b.nv += (nw * nw * (nT - b.neck) - 2 * .38 * nw * b.nv - Math.max(-900, Math.min(900, aa)) * .5) * h; b.neck = Math.max(-.9, Math.min(.9, b.neck + b.nv * h));
  }
  // lying still: the last of him goes out of him. One twitch, a smaller one, then nothing
  if (b.thudT != null) { const u = b.t - b.thudT;
    if (b.tw === 0 && u > .5) { b.tw = 1; V.fl1 += rr(5, 8); V.bl1 -= rr(2, 4); V.fa1 += rr(3, 5); }
    if (b.tw === 1 && u > 1.05) { b.tw = 2; V.fa1 += rr(2, 3.5); b.nv += .8; } }
  const out = { ...tgt, hx: X.hx, hy: X.hy, lean: X.lean, chest: X.chest, sword: X.sword, neck: b.neck };
  for (const k of CH2) out[k] = [X[k + '0'], X[k + '1']];
  return (b.out = out);
}
// the trunk hits the floor and stops; the rest of him is still moving: arms slap down, the head knocks
export function thudBody(b, tgt, k = 1) {
  const T = flat(tgt); for (const q of ['hy', 'lean', 'hx']) { b.x[q] = T[q]; b.v[q] = 0; }
  b.thudT = b.t; b.v.fa0 += sgn() * rr(3, 6) * k; b.v.ba0 += sgn() * rr(3, 6) * k; b.v.fa1 += rr(2, 5) * k; b.nv += sgn() * 7 * k;
}
// a blow knocks the body: p = +1 toward where he faces, -1 away
export function kick(b, p, mag) { const V = b.v;
  V.lean += p * 5 * mag; V.chest += p * 8 * mag; V.hx += p * 30 * mag; b.nv += p * 9 * mag;
  V.fa0 -= p * 7 * mag; V.ba0 -= p * 6 * mag; if (b.x.sword != null) V.sword -= p * 9 * mag; }
// the eye flickers and goes out once he is down
export const eyeDark = b => b.thudT != null && (b.t - b.thudT > .45 || (b.t - b.thudT > .12 && (b.t * 30 | 0) % 3 === 0));
