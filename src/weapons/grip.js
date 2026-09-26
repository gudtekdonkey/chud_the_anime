import { pz, lin, keyed } from '../rig/pose.js';

// ---- Shared by the weapons: the two-handed grip, and the draw and stow for anything carried on the back ----
// grip: say where the two fists go (px from the hip, x forward, y down); the arms reach for them and the weapon's angle
//   runs from the back fist to the front one, so a two-handed art (see yari.js) can run its haft through both
const dirv = a => [Math.sin(a), Math.cos(a)];
function reachFor(S, T) { let dx = T[0] - S[0], dy = T[1] - S[1], d = Math.hypot(dx, dy);
  if (d > 7.9) { dx *= 7.9 / d; dy *= 7.9 / d; d = 7.9; }
  const th = Math.atan2(dx, dy), al = Math.acos(d / 8), opts = [[th + al, th - al], [th - al, th + al]];
  // the elbow that hangs lower reads as a real grip
  const [sh, fo] = opts.sort((p, q) => (S[1] + dirv(q[0])[1] * 4) - (S[1] + dirv(p[0])[1] * 4))[0];
  return [sh, fo - sh]; }
export function grip(o, front, back) { const lean = o.lean ?? .04, c = lean + (o.chest || 0);
  const S = [Math.sin(lean) * 4 + Math.sin(c) * 3, -Math.cos(lean) * 4 - Math.cos(c) * 3];
  return pz({ ...o, fa: reachFor(S, front), ba: reachFor(S, back), sword: Math.atan2(front[1] - back[1], front[0] - back[0]) }); }
// the shaft through both fists when the back hand is on it (a gripping pose), else null
export function twoHanded(k, hand, a) { const bh = k.bh; if (!bh) return null;
  const dx = hand[0] - bh[0], dy = hand[1] - bh[1], l = Math.hypot(dx, dy), off = Math.atan2(dy, dx) - a;
  return l > 2.5 && l < 16 && Math.abs(Math.atan2(Math.sin(off), Math.cos(off))) < .5 ? [dx / l, dy / l] : null; }
export const BREATH = [0, 0, .3, .7, 1, 1, 1, .7, .3, 0, 0, 0, .2, .5, .2, 0];
export const breathe = q => BREATH.map((b, i) => pz({ ...q, breath: b, flutter: i === 5 || i === 13 ? 1 : 0 }));
// shoulder angles past pi (3.58 = -2.7 + 2 pi) keep the arm going over the top between keys, never down through the front

// slung across the back at angle `slung` (a polearm): J reaches up behind the shoulder, takes the haft where it hangs, and
//   brings it over and down into `wind`
export const slungDraw = (slung, wind) => [[0, pz({ fa: [3.7, .6], ba: [-.1, .6] })],
  [.035, pz({ hy: 1, lean: -.02, fa: [3.58, .5], ba: [-.1, .6], sword: slung, flutter: 1 })],
  [.065, pz({ hx: -1, hy: 3, lean: -.06, chest: -.15, fl: [.5, .9], bl: [-.7, .4], fa: [2.6, .4], ba: [.6, 1.2], sword: -.9 }), lin],
  [.09, wind]];
// its stow on the katana's beats: a twirl upright, a beat, lifted high behind the shoulder, let down onto the back as the
//   katana would click home, then the hand drops away
export const slungStow = (guard, slung) => keyed([[0, guard],
  [.12, pz({ hy: 2, lean: .06, fl: [.45, .7], bl: [-.5, .35], fa: [.7, 1.1], ba: [-.3, .3], sword: -1.62 }), lin],
  [.3, pz({ hy: 2, lean: .05, fl: [.45, .7], bl: [-.5, .35], fa: [.72, 1.08], ba: [-.3, .3], sword: -1.6 })],
  [.5, pz({ hy: 1, lean: .02, fl: [.3, .4], bl: [-.3, .2], fa: [2.9, .2], ba: [-.2, .3], sword: -1.7 })],
  [.72, pz({ hy: 1, lean: .02, fl: [.25, .35], bl: [-.25, .2], fa: [3.58, .5], ba: [-.2, .3], sword: slung })],
  [.82, pz({ hy: 1, lean: .04, fl: [.2, .3], bl: [-.25, .15], fa: [3.68, .6], ba: [-.15, .3] })],
  [1.0, pz({ hy: 1, lean: .04, fl: [.2, .3], bl: [-.25, .15], fa: [5.88, .8], ba: [-.1, .3] })],
  [1.2, pz({ fa: [6.48, .3] })]], 15);
// hung down the back with the grip over the shoulder (a greatsword, a club): the hand over the shoulder on the grip, the
//   weapon drawn up with its end still down behind him (-4.38, turning over his back, not through the front), then `wind`
export const shoulderDraw = wind => [[0, pz({ fa: [3.6, .4], ba: [-.1, .6] })],
  [.045, pz({ hy: 1, lean: -.06, chest: -.1, fa: [3.3, .25], ba: [-.1, .6], sword: -4.38, flutter: 1 })],
  [.09, wind]];
// its stow: a flick at his side, a beat, raised overhead, let down behind his neck (the art's `sheathing`), the click with
//   his hand on the grip, then the hand drops away
export const shoulderStow = guard => keyed([[0, guard],
  [.12, pz({ hy: 3, lean: .12, chest: .05, fl: [.55, .9], bl: [-.6, .4], fa: [.9, .3], ba: [-.4, .3], sword: 1.25 }), lin],
  [.3, pz({ hy: 3, lean: .12, chest: .05, fl: [.55, .9], bl: [-.6, .4], fa: [.92, .3], ba: [-.4, .3], sword: 1.28 })],
  [.38, pz({ hy: 2, lean: .04, fl: [.4, .6], bl: [-.45, .3], fa: [2.9, .2], ba: [-.3, .3], sword: -1.5 })],
  [.45, pz({ hy: 1, lean: .02, fl: [.3, .4], bl: [-.3, .2], fa: [3.2, .2], ba: [-.2, .3], sheathing: true })],
  [.75, pz({ hy: 1, lean: .02, fl: [.25, .35], bl: [-.25, .2], fa: [3.6, .7], ba: [-.2, .3], sheathing: true })],
  [.82, pz({ hy: 1, lean: .04, fl: [.2, .3], bl: [-.25, .15], fa: [3.6, .5], ba: [-.15, .3] })],
  [1.0, pz({ hy: 1, lean: .04, fl: [.2, .3], bl: [-.25, .15], fa: [5.88, .8], ba: [-.1, .3] })],
  [1.2, pz({ fa: [6.48, .3] })]], 15);
// running with it over the shoulder: the run's legs, the front arm up on the grip
export const runWith = (arm) => Array.from({ length: 8 }, (_, i) => { const a = i / 8 * Math.PI * 2, s = Math.sin(a), c = Math.cos(a);
  return pz({ lean: .36, hy: Math.round(.5 - .5 * Math.cos(2 * a)), fl: [.95 * s, .3 + 1.1 * Math.max(0, c)], bl: [-.95 * s, .3 + 1.1 * Math.max(0, -c)],
    ba: [.7 * s - .5, .5], flutter: (i % 4) / 2, ...arm }); });
