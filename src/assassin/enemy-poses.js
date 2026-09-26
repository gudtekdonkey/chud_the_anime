import { pz, HILT, lerpP, ease } from '../rig/pose.js';
import { F } from './stage-fx.js';

// ---- Poses the executions share: the enemy's guard and how a man moves when things go wrong ----
// sample eased keyframes [time, pose, easing?] at time t. The result remembers its keys, so the stage can re-read the enemy's
// timeline as smooth curves (smoothAt) for the deaths pass
export function at(keys, t) {
  if (t <= keys[0][0]) return keys[0][1];
  let j = 0; while (j < keys.length - 2 && keys[j + 1][0] <= t) j++;
  const [t0, a] = keys[j], [t1, b, e] = keys[j + 1];
  const r = lerpP(a, b, (e || ease)(Math.min(1, Math.max(0, (t - t0) / (t1 - t0)))));
  if (Object.isExtensible(r)) Object.defineProperties(r, { keys: { value: keys }, t: { value: t } });
  return r;
}
// flat on the floor: the body a fall ends in
export const lying = p => typeof p.hy === 'number' && (p.hy >= 9 || (p.hy >= 8 && (Math.abs(p.lean || 0) >= 1.2 || !!p.noUpper)));
// The deaths pass: eased keys bring the body to a dead stop at every pose, like a puppet being set. Read the same keys as one
// monotone curve per joint, it keeps its speed through a pose and only settles where the motion turns back. A drop into a
// lying pose falls under gravity (slow off the mark, fastest at the floor). Hard cuts and linear moves stay as authored
export function smoothAt(keys, t) {
  if (t <= keys[0][0]) return keys[0][1];
  let j = 0; while (j < keys.length - 2 && keys[j + 1][0] <= t) j++;
  const [t0, a] = keys[j], [t1, b, e] = keys[j + 1], k = Math.min(1, Math.max(0, (t - t0) / (t1 - t0)));
  if (e || k >= 1) return lerpP(a, b, (e || ease)(k));
  const land = lying(b) && !lying(a), dT = t1 - t0;
  const soft = i => i > 0 && i < keys.length - 1 && !keys[i][2] && !keys[i + 1][2];
  const tan = (i, get) => { const p = get(i - 1), c = get(i), n = get(i + 1);
    if (![p, c, n].every(Number.isFinite)) return 0;
    const d0 = (c - p) / Math.max(1e-3, keys[i][0] - keys[i - 1][0]), d1 = (n - c) / Math.max(1e-3, keys[i + 1][0] - keys[i][0]);
    return d0 * d1 <= 0 ? 0 : 2 * d0 * d1 / (d0 + d1); };
  const k2 = k * k, k3 = k2 * k, h00 = 2 * k3 - 3 * k2 + 1, h10 = k3 - 2 * k2 + k, h01 = 3 * k2 - 2 * k3, h11 = k3 - k2;
  const val = (va, vb, get) => { const m0 = soft(j) ? tan(j, get) * dT : 0, m1 = land ? 2 * (vb - va) : soft(j + 1) ? tan(j + 1, get) * dT : 0;
    return h00 * va + h10 * m0 + h01 * vb + h11 * m1; };
  const o = {};
  for (const key in a) { const x = a[key], y = b[key];
    if (Array.isArray(x) && Array.isArray(y)) o[key] = x.map((v, i) => val(v, y[i], ii => { const q = keys[ii][1][key]; return Array.isArray(q) ? q[i] : NaN; }));
    else if (typeof x === 'number' && typeof y === 'number') o[key] = val(x, y, ii => keys[ii][1][key]);
    else o[key] = k < .5 ? x : y; }
  return o;
}
export const hold = () => 0;   // easing that stays on the first pose until the next key: a hard cut, no in-betweens
export const lin = k => k;
export const IDLE = pz({ fa: [.15, .2] });
// the ronin before he flashes: weight forward, hand on the hilt
export const SET = pz({ hy: 2, lean: .4, fl: [.5, .9], bl: [-.5, .3], fa: HILT, ba: [-.9, .2] });
export const EG = pz({ hy: 2, lean: .1, fl: [.4, .6], bl: [-.45, .3], fa: [1.2, .55], ba: [1.05, .75], sword: -.7 });   // enemy guard
// lean + is toward where he faces
export const RX = {
  flinch:  pz({ ...EG, hx: -1, lean: -.15, chest: -.22, fa: [1.55, .35], sword: -1.15 }),
  guardUp: pz({ ...EG, lean: -.05, chest: -.12, fa: [1.4, .45], sword: -1.0, hy: 3 }),
  turning: pz({ hy: 3, lean: 0, chest: 0, fl: [.2, .4], bl: [-.2, .4], fa: [.6, .9], ba: [.4, .9], sword: .4 }),   // mid-turn: arms in, square to us
  jolt:    pz({ hy: 2, lean: -.25, chest: -.5, fl: [.3, .4], bl: [-.35, .3], fa: [1.0, .3], ba: [-.8, .2] }),       // struck from behind: the back arches
  doubled: pz({ hx: 2, hy: 4, lean: .45, chest: .45, fl: [.9, 1.0], bl: [-.8, .35], fa: [.6, .3], ba: [-.9, .2], sword: .9 }),   // struck in front: folds over the cut
  reach:   pz({ hy: 3, lean: -.05, chest: -.25, fl: [.5, .6], bl: [-.5, .3], fa: [1.6, .15], sword: -.3, ba: [.9, .9] }),   // reaching after him
  clutch:  pz({ hy: 4, lean: .3, chest: .45, fl: [.45, .75], bl: [-.45, .45], fa: [.8, .3], sword: .9, ba: [1.2, 1.7] }),     // the free hand goes to the wound
  handsLook: pz({ hy: 3, lean: .2, chest: .35, fa: [1.25, 1.15], ba: [1.2, 1.2], sword: null }),    // looking down at his own hands
  sag:     pz({ hy: 5, lean: .35, chest: .45, fl: [.9, 1.5], bl: [-.35, 1.2], fa: [.45, .25], ba: [.2, .3], sword: 1.3 }),    // the legs start to go
  kneel:   pz({ hy: 7, lean: .45, chest: .5, fl: [1.3, 2.05], bl: [-.1, 2.4], fa: [.9, 1.6], ba: [.3, .6], sword: null }),   // down on one knee
  handsDown: pz({ hy: 8, lean: .95, chest: .35, fl: [1.4, 2.2], bl: [.1, 2.4], fa: [.75, .2], ba: [.55, .3], sword: null }),   // the hands catch the floor
  prone:   pz({ hy: 9, lean: 1.52, chest: .03, fl: [-1.45, 0], bl: [-1.5, .05], fa: [1.45, .1], ba: [1.3, .2], sword: null }),      // face down on the ground
  handsBack: pz({ hy: 7, lean: -.9, chest: -.3, fl: [1.2, 1.6], bl: [.6, 1.9], fa: [-.9, .3], ba: [-1.1, .3], sword: null }),   // going over backward, arms flung back
  supine:  pz({ hy: 9, lean: -1.52, chest: -.03, fl: [1.45, 0], bl: [1.5, .05], fa: [-1.2, .2], ba: [-1.45, .2], sword: null }),   // flat on his back
  legsSag: pz({ hy: 5, fl: [.9, 1.5], bl: [-.35, 1.2], noUpper: true }),
  legsKneel: pz({ hy: 7, fl: [1.3, 2.05], bl: [-.1, 2.4], noUpper: true }),
  legsDown: pz({ hy: 10, fl: [1.45, .5], bl: [1.25, .8], noUpper: true }),     // the hips hit the floor, the legs fold out in front
  stiff:   pz({ hy: 1, lean: -.25, chest: -.35, fl: [.3, .35], bl: [-.35, .3], fa: [.35, .3], sword: 1.4, ba: [-.1, .2] }),
  windup:  pz({ hx: -1, hy: 2, lean: -.18, chest: -.32, fl: [.5, .6], bl: [-.5, .35], fa: [2.9, -.1], ba: [2.6, .2], sword: -1.62 }),   // sword up, about to strike
  swung:   pz({ hx: 2, hy: 4, lean: .55, chest: .45, fl: [.95, 1.05], bl: [-.85, .3], fa: [1.15, 0], ba: [1.0, .2], sword: 1.15 }),   // swung through, overextended
};
// the enemy's own swing cutting nothing: a thin pale arc where the ronin just was
export const whiff = (S, E, dir = -1) => F.cres(S, E.x + dir * 7, E.y - 12, dir, 9, .55, 1, .1);
// how he sheathes when nobody is left near: a flick, the blade slid home, his hand leaving the hilt
export const quickSheathe = (t0, from) => [[t0, from], [t0 + .08, pz({ hy: 2, lean: .2, fa: [1.45, .05], sword: 1.2, ba: [-.4, .3] }), lin],
  [t0 + .2, pz({ hy: 1, lean: .12, fa: [1.0, .6], sheathing: true, ba: [.45, 1.1] })], [t0 + .34, pz({ hy: 1, lean: .06, fa: HILT, ba: [.3, 1.0] })], [t0 + .6, IDLE]];
