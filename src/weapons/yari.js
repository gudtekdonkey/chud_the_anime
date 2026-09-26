import { pz, HILT, lin, keyed } from '../rig/pose.js';
import { RY } from '../rig/rig.js';

// ---- The yari: a straight-headed spear half again his height, slung across his back. Both hands on the haft, far apart;
//   the back hand drives it through the front one, so every attack is led by the point ----
const along = a => [Math.cos(a), Math.sin(a)];
const SHAFT = 32, HEAD = 5;   // haft and the straight su-yari head: 37 px against his 26
// the angle it hangs at on his back (head up, a little behind), so a hand on the haft there lines up with the slung spear
const SLUNG = -1.76;
// the spear along direction d from `at`: `back` px of haft behind, `fwd` px ahead to the collar, then the head. The butt stops at the floor
function spear(k, at, d, back, fwd) {
  let b = back; while (b > 2 && at[1] - d[1] * b > RY + 1) b--;
  const butt = k.add(at, d, -b), col = k.add(at, d, fwd);
  k.seg(butt, col, 1, 'T'); k.put(...butt, 'S'); k.put(...col, 'D');
  k.put(...k.add(at, d, fwd + 1), 'S'); k.seg(k.add(at, d, fwd + 2), k.add(at, d, fwd + HEAD), 1, 'W'); }
// held in both hands: when the back hand is on the haft (a gripping pose), the shaft runs through both fists and is anchored
//   at the back one, so a thrust slides it forward through the front hand. Any other pose holds it at the front fist
function held(k, hand, a) { const bh = k.bh, dx = hand[0] - (bh ? bh[0] : 0), dy = hand[1] - (bh ? bh[1] : 0), l = Math.hypot(dx, dy);
  const d = along(a);
  if (bh && l > 2.5 && l < 16 && Math.abs(Math.atan2(Math.sin(Math.atan2(dy, dx) - a), Math.cos(Math.atan2(dy, dx) - a))) < .5) return spear(k, bh, [dx / l, dy / l], 5, SHAFT - 5);
  spear(k, hand, d, 13, SHAFT - 13); }
const stowed = p => p.sword === null && !p.sheathing && p.bsword == null;
const ART = {
  // slung diagonally across the back, butt at his calves and the head well above the hat; the body and mantle cover its middle
  far(k, p) { if (!stowed(p)) return; const g = k.L(9, -4.3); spear(k, g, along(SLUNG), 17, SHAFT - 17); },
  stowed() {},
  held,
  // one-handed in the back hand: the butt grounded, the rest of the haft up through the fist
  backHeld(k, bh, a) { k.blob(bh[0], bh[1], 2, 'D'); spear(k, bh, along(a), 14, SHAFT - 14); },
  // on its way to the back: at the slung angle, gripped where it will hang
  sheathing(k, hand) { spear(k, hand, along(SLUNG), 17, SHAFT - 17); },
  // opened to the camera: grounded upright beside him, towering over his hat
  front: [...Array.from({ length: 32 }, (_, i) => [7, 23 - i, 'T']), [7, 23, 'S'], [7, -9, 'D'], [7, -10, 'S'], [7, -11, 'W'], [7, -12, 'W'], [7, -13, 'W'], [7, -14, 'W']],
  // sitting: laid on the floor beside him, the full length
  sit: [[4, 17, 'S'], ...Array.from({ length: 31 }, (_, i) => [5 + i, 17, 'T']), [36, 17, 'D'], [37, 17, 'S'], [38, 17, 'W'], [39, 17, 'W'], [40, 17, 'W'], [41, 17, 'W']],
};
// ---- Gripping poses: say where the two fists go on the haft (px from the hip, x forward, y down); the arms reach for them ----
const dirv = a => [Math.sin(a), Math.cos(a)];
function reachFor(S, T) { let dx = T[0] - S[0], dy = T[1] - S[1], d = Math.hypot(dx, dy);
  if (d > 7.9) { dx *= 7.9 / d; dy *= 7.9 / d; d = 7.9; }
  const th = Math.atan2(dx, dy), al = Math.acos(d / 8), opts = [[th + al, th - al], [th - al, th + al]];
  // the elbow that hangs lower reads as a real grip
  const [sh, fo] = opts.sort((p, q) => (S[1] + dirv(q[0])[1] * 4) - (S[1] + dirv(p[0])[1] * 4))[0];
  return [sh, fo - sh]; }
function grip(o, front, back) { const lean = o.lean ?? .04, c = lean + (o.chest || 0);
  const S = [Math.sin(lean) * 4 + Math.sin(c) * 3, -Math.cos(lean) * 4 - Math.cos(c) * 3];
  return pz({ ...o, fa: reachFor(S, front), ba: reachFor(S, back), sword: Math.atan2(front[1] - back[1], front[0] - back[0]) }); }
// chudan: the point level at the enemy's chest, fists a forearm apart, the butt by the back hip
const GUARD = grip({ hy: 3, lean: .16, fl: [.65, 1.0], bl: [-.7, .4], hat: 0 }, [7, -4], [-2, -2]);
// the draw-back: both fists pulled to the back hip, the point still on line
const WIND = grip({ hx: -2, hy: 4, lean: -.08, chest: -.15, fl: [.55, 1.0], bl: [-.8, .45] }, [3, -3], [-6, -1]);
// the thrust: the back fist drives up to the front one, arms long, the whole body behind the point
const THRUST = grip({ hx: 4, hy: 4, lean: .6, chest: .3, fl: [1.15, 1.2], bl: [-1.15, .1], hat: 1, flutter: 1 }, [12, -4], [8, -3]);
const TAIL = [[.16, THRUST, lin], [.22, grip({ ...THRUST, lean: .62 }, [12.5, -4], [8.5, -3])], [.36, grip({ ...THRUST, lean: .56 }, [11.5, -4], [7.5, -3])], [.5, GUARD]];
// the answer: tataki, the spear whipped up overhead and beaten down onto the enemy
const HIGH = grip({ hx: 2, hy: 1, lean: -.1, chest: -.25, fl: [.9, .5], bl: [-.8, .2], hat: 1, flutter: 1 }, [4, -13], [-3, -11]);
const BEAT = grip({ hx: 4, hy: 5, lean: .55, chest: .35, fl: [1.15, 1.3], bl: [-1.1, .15], hat: 1 }, [10, -2], [4, -6]);
const STANCES = [
  // grounded upright in the back hand, the head high over the hat
  pz({ hx: -1, hy: 2, lean: -.04, chest: .06, fl: [.4, .5], bl: [-.35, .45], fa: [.5, .4], ba: [-.1, 1.4], bsword: -1.62 }),
  // gedan: the point low at the knees, weight back
  grip({ hx: -1, hy: 3, lean: .08, fl: [.55, .75], bl: [-.5, .5] }, [6, 0], [-3, -3]),
  // raised: the head up at the enemy's face, the butt low behind
  grip({ hy: 3, lean: .04, chest: .06, fl: [.5, .7], bl: [-.5, .5] }, [3, -8], [-3, -4]),
  // trailing: one hand, the head low behind him
  pz({ hx: -1, hy: 3, lean: .04, chest: .12, fl: [.45, .7], bl: [-.45, .55], fa: [.8, .8], ba: [-.35, .3], bsword: 2.7 }),
];
const BREATH = [0, 0, .3, .7, 1, 1, 1, .7, .3, 0, 0, 0, .2, .5, .2, 0];
// running with it level in both hands, the point leading
const RUN = Array.from({ length: 8 }, (_, i) => { const a = i / 8 * Math.PI * 2, s = Math.sin(a), c = Math.cos(a);
  return grip({ lean: .36, hy: Math.round(.5 - .5 * Math.cos(2 * a)), fl: [.95 * s, .3 + 1.1 * Math.max(0, c)], bl: [-.95 * s, .3 + 1.1 * Math.max(0, -c)], flutter: (i % 4) / 2 },
    [8, -4 + Math.round(s * .6)], [-1, -2 + Math.round(s * .6)]); });
export const YARI = { id: 'yari', name: 'Yari', about: 'A straight-headed spear half again his height, slung across his back. Both hands on the haft: every attack is led by the point, the back hand driving it through the front one.', art: ART,
  reach: 1.5, weight: { stop: 1, shake: 1 },
  poses: {
    ...Object.fromEntries(STANCES.map((q, k) => ['ready' + k, BREATH.map((b, i) => pz({ ...q, breath: b, flutter: i === 5 || i === 13 ? 1 : 0 }))])),
    ready: BREATH.map((b, i) => pz({ ...GUARD, breath: b, flutter: i === 5 || i === 13 ? 1 : 0 })),
    runArmed: RUN,
    // shoulder angles past pi (3.58 = -2.7 + 2 pi) keep the arm going over the top between keys, never swinging down through the front
    // J from the back: the hand goes up behind the shoulder, takes the haft where it hangs, and brings the spear over and down level
    slash1: keyed([[0, pz({ fa: [3.7, .6], ba: [-.1, .6] })],
      [.035, pz({ hy: 1, lean: -.02, fa: [3.58, .5], ba: [-.1, .6], sword: SLUNG, flutter: 1 })],
      [.065, pz({ hx: -1, hy: 3, lean: -.06, chest: -.15, fl: [.5, .9], bl: [-.7, .4], fa: [2.6, .4], ba: [.6, 1.2], sword: -.9 }), lin],
      [.09, WIND], ...TAIL], 30),
    slash1r: keyed([[0, GUARD], [.09, WIND], ...TAIL], 30),
    slash2: keyed([[0, THRUST],
      [.08, grip({ hx: 1, hy: 5, lean: .3, chest: .1, fl: [.8, 1.3], bl: [-.8, .4] }, [3, -1], [-5, 1])],
      [.14, HIGH, lin], [.2, BEAT], [.34, grip({ ...BEAT, lean: .52 }, [10, -2], [4, -6])], [.5, GUARD]], 30),
    // the stow, on the katana's beats: a twirl upright, a beat, the spear lifted high behind the shoulder, let down onto the back
    //   as the katana clicks home, then the hand drops away
    sheathe: keyed([[0, GUARD],
      [.12, pz({ hy: 2, lean: .06, fl: [.45, .7], bl: [-.5, .35], fa: [.7, 1.1], ba: [-.3, .3], sword: -1.62 }), lin],
      [.3, pz({ hy: 2, lean: .05, fl: [.45, .7], bl: [-.5, .35], fa: [.72, 1.08], ba: [-.3, .3], sword: -1.6 })],
      [.5, pz({ hy: 1, lean: .02, fl: [.3, .4], bl: [-.3, .2], fa: [2.9, .2], ba: [-.2, .3], sword: -1.7 })],
      [.72, pz({ hy: 1, lean: .02, fl: [.25, .35], bl: [-.25, .2], fa: [3.58, .5], ba: [-.2, .3], sword: SLUNG })],
      [.82, pz({ hy: 1, lean: .04, fl: [.2, .3], bl: [-.25, .15], fa: [3.68, .6], ba: [-.15, .3] })],
      [1.0, pz({ hy: 1, lean: .04, fl: [.2, .3], bl: [-.25, .15], fa: [5.88, .8], ba: [-.1, .3] })],
      [1.2, pz({ fa: [6.48, .3] })]], 15),
  },
  // every other move keeps the katana's pose; the hand that would rest on the hilt hangs free (the spear is on his back)
  adapt(p) { return p.fa === HILT ? pz({ ...p, fa: [.3, .5] }) : p; },
};
