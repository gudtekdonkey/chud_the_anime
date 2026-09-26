import { pz, HILT, lin, keyed } from '../rig/pose.js';
import { comboPoses } from '../anims/combo-poses.js';

// ---- The yari: a spear slung across his back. Thrusts where the katana cuts, and the reach shows ----
const along = a => [Math.cos(a), Math.sin(a)];
// the angle it hangs at on his back (head up, a little behind), so a hand on the haft there lines up with the slung spear
const SLUNG = -1.8;
const stowed = p => p.sword === null && !p.sheathing && p.bsword == null;
// the spear through a hand: `back` px of haft behind the grip, `front` px ahead of it to the collar, then the 4 px head
function spear(k, hand, a, back, front) { const d = along(a);
  k.seg(k.add(hand, d, -back), k.add(hand, d, front), 1, 'T'); k.put(...k.add(hand, d, -back), 'S');
  k.put(...k.add(hand, d, front + 1), 'S'); k.seg(k.add(hand, d, front + 2), k.add(hand, d, front + 5), 1, 'W'); }
const ART = {
  // slung diagonally across the back, head up behind the hat; the body and mantle are drawn over its middle
  far(k, p) { if (!stowed(p)) return; const b = k.L(1, -2.5), t = k.L(19, -6.5);
    k.seg(b, t, 1, 'T'); k.put(...b, 'S'); const d = [(t[0] - b[0]) / 21.6, (t[1] - b[1]) / 21.6]; k.seg(k.add(t, d, 1), k.add(t, d, 4), 1, 'W'); },
  stowed() {},
  held(k, hand, a) { spear(k, hand, a, 9, 11); },
  backHeld(k, bh, a) { k.blob(bh[0], bh[1], 2, 'D'); spear(k, bh, a, 12, 6); },
  // on its way to the back: upright at the slung angle, gripped low on the haft
  sheathing(k, hand) { spear(k, hand, SLUNG, 4, 15); },
  // opened to the camera: planted upright beside him, taller than he is
  front: [...Array.from({ length: 24 }, (_, i) => [7, i - 1, 'T']), [7, -2, 'S'], [7, -3, 'W'], [7, -4, 'W'], [7, -5, 'W'], [7, 23, 'S']],
  // sitting: laid on the floor beside him
  sit: [[14, 17, 'S'], ...Array.from({ length: 15 }, (_, i) => [15 + i, 17, 'T']), [30, 17, 'S'], [31, 17, 'W'], [32, 17, 'W'], [33, 17, 'W']],
};
// guard: low and long, both hands on the haft, the head level at the enemy's chest
const GUARD = pz({ hy: 3, lean: .2, chest: .02, fl: [.65, 1.0], bl: [-.7, .4], fa: [1.05, .45], ba: [.45, .9], sword: .12 });
const WIND = pz({ hx: -2, hy: 4, lean: -.08, chest: -.2, fl: [.55, 1.0], bl: [-.8, .45], fa: [.35, 1.35], ba: [-.3, 1.2], sword: .1 });
// the thrust: arm straight out, the whole body behind it, the haft level
const THRUST = pz({ hx: 4, hy: 4, lean: .62, chest: .3, fl: [1.15, 1.2], bl: [-1.15, .1], fa: [1.62, 0], ba: [1.2, .5], sword: .02, hat: 1, flutter: 1 });
const TAIL = [[.16, THRUST, lin], [.22, pz({ ...THRUST, fa: [1.58, .02] })], [.36, pz({ ...THRUST, lean: .58, fa: [1.52, .06] })], [.5, GUARD]];
const OVER = pz({ hx: 2, hy: 1, lean: -.2, chest: -.4, fl: [.9, .4], bl: [-.8, .2], fa: [2.8, .1], ba: [2.4, .3], sword: -1.35, hat: 1 });
// J3 to J6 (anims/combo-poses.js): the haft carried over the back, swept level at waist height, held low behind for the kick,
//   the head rising straight up for the launch, and the flash step ends with the spear laid out behind him
const ARMS = {
  wind: { fa: [1.4, 1.3], ba: [.6, 1.3], sword: 3.1 }, sweep: { fa: [1.5, .2], ba: [1.1, .5], sword: .05 },
  kick: { fa: [.4, .6], ba: [-.2, .8], sword: 2.9 }, crouch: { fa: [.5, .4], ba: [.1, .6], sword: 2.5 },
  top: { fa: [2.8, 0], ba: [2.4, .3], sword: -1.35 }, set: { fa: [.6, 1.3], ba: [.2, 1.1], sword: 3.0 },
  fin: { fa: [1.3, .1], ba: [.9, .6], sword: 2.95 },
};
const STANCES = [
  // haft upright in the back hand, butt on the floor, head high
  pz({ hx: -1, hy: 2, lean: -.04, chest: .06, fl: [.4, .5], bl: [-.35, .45], fa: [.5, .4], ba: [-.1, 1.4], bsword: -1.62 }),
  // head low and trailing, the back hand at the hip
  pz({ hx: -1, hy: 3, lean: .04, chest: .12, fl: [.45, .7], bl: [-.45, .55], fa: [.8, .8], ba: [-.35, .3], bsword: 2.7 }),
  // across the shoulders, the back hand over it
  pz({ hy: 2, lean: .02, chest: .1, fl: [.45, .55], bl: [-.4, .5], fa: [.2, .25], ba: [.9, 2.1], bsword: -2.9, hat: 1 }),
  // the point down in front, weight back
  pz({ hx: -2, hy: 3, lean: -.1, chest: .18, fl: [.55, .45], bl: [-.5, .6], fa: [.3, 1.2], ba: [.7, .5], bsword: .95 }),
];
const BREATH = [0, 0, .3, .7, 1, 1, 1, .7, .3, 0, 0, 0, .2, .5, .2, 0];
export const YARI = { id: 'yari', name: 'Yari', about: 'A spear slung across his back: he thrusts where the katana cuts, with more reach and a longer lunge.', art: ART,
  reach: 1.4, weight: { stop: 1, shake: 1 },
  poses: {
    ...Object.fromEntries(STANCES.map((q, k) => ['ready' + k, BREATH.map((b, i) => pz({ ...q, breath: b, flutter: i === 5 || i === 13 ? 1 : 0 }))])),
    ready: BREATH.map((b, i) => pz({ ...GUARD, breath: b, sword: GUARD.sword + b * .03, flutter: i === 5 || i === 13 ? 1 : 0 })),
    // J: the reach back over the shoulder for the haft, the draw-back, the thrust
    // shoulder angles past pi (3.58 = -2.7 + 2 pi) keep the arm going over the top between keys, never swinging down through the front
    // J from the back: the hand goes up behind the shoulder, takes the haft where it hangs, and brings the spear over and down level
    slash1: keyed([[0, pz({ fa: [3.7, .6], ba: [-.1, .6] })],
      [.035, pz({ hy: 1, lean: -.02, fa: [3.58, .5], ba: [-.1, .6], sword: SLUNG, flutter: 1 })],
      [.065, pz({ hx: -1, hy: 3, lean: -.06, chest: -.15, fl: [.5, .9], bl: [-.7, .4], fa: [2.6, .4], ba: [.6, 1.2], sword: -.9 }), lin],
      [.09, WIND], ...TAIL], 30),
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
    slash1r: keyed([[0, GUARD], [.09, WIND], ...TAIL], 30),
    // the answer: the haft whips round low, then the head rises through a sweep that ends overhead
    slash2: keyed([[0, THRUST],
      [.08, pz({ hx: 1, hy: 5, lean: .45, chest: .2, fl: [.8, 1.3], bl: [-.8, .4], fa: [.4, .5], ba: [-.2, .8], sword: 2.6 })],
      [.14, pz({ hx: 2, hy: 2, lean: 0, chest: -.2, fl: [.9, .5], bl: [-.8, .2], fa: [2.2, .1], ba: [1.8, .3], sword: -.7, hat: 1, flutter: 1 }), lin],
      [.2, OVER], [.34, pz({ ...OVER, sword: -1.32 })], [.5, GUARD]], 30),
    ...comboPoses(ARMS, pz({ ...OVER, sword: -1.32 }), GUARD),
  },
  // every other move keeps the katana's pose; the hand that would rest on the hilt hangs free (the spear is on his back)
  adapt(p) { return p.fa === HILT ? pz({ ...p, fa: [.3, .5] }) : p; },
};
