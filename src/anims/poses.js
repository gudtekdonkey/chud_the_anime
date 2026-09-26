import { pz, HILT, lin, keyed } from '../rig/pose.js';
import { gaitFrames } from '../traits/bake.js';
import { BASE } from '../traits/knobs.js';
import { ITEM_POSES } from './item-poses.js';

// ---- Poses, one per frame ----
const run8 = Array.from({ length: 8 }, (_, i) => { const a = i / 8 * Math.PI * 2, s = Math.sin(a), c = Math.cos(a);
  return pz({ lean: .32, hy: Math.round(.5 - .5 * Math.cos(2 * a)), fl: [.95 * s, .3 + 1.1 * Math.max(0, c)], bl: [-.95 * s, .3 + 1.1 * Math.max(0, -c)],
    fa: [-.7 * s + .3, .9], ba: [.7 * s - .5, .5], flutter: (i % 4) / 2 }); });
// a calm breath: 16 frames, eased, with long rests at the top and bottom
const BREATH = [0, 0, 0, .15, .45, .75, .95, 1, 1, 1, .85, .6, .3, .1, 0, 0];
const FLUT = [0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 1, 1, 1, 0, 0];
const idle16 = BREATH.map((b, i) => pz({ breath: b, fa: [.12 + b * .03, .18], ba: [-.08 - b * .03, .12], flutter: FLUT[i] }));
// his battle stance: feet wide, hips low, both hands on the hilt, blade angled up at the enemy
const GUARD = pz({ hy: 3, lean: .14, chest: .06, fl: [.6, 1.0], bl: [-.65, .4], fa: [1.2, .55], ba: [1.05, .75], sword: -.85 });
const J1_WIND = pz({ hx: -1, hy: 4, lean: -.1, chest: -.4, fl: [.6, 1.05], bl: [-.75, .45], fa: [2.6, .6], ba: [2.3, .8], sword: -2.45 });
const J1_FOLLOW = pz({ hx: 2, hy: 4, lean: .6, chest: .5, fl: [1.1, 1.25], bl: [-1.1, .1], fa: [1.0, .2], sword: 1.3, ba: [.6, .2], hat: 1 });
const J1_TAIL = [
  [.16, pz({ hx: 2, hy: 3, lean: .45, chest: .35, fl: [1.0, 1.1], bl: [-1.0, .1], fa: [1.8, .1], sword: .1, ba: [1.2, .3], hat: 1, flutter: 1 }), lin],
  [.22, J1_FOLLOW],
  [.36, pz({ ...J1_FOLLOW, lean: .56, chest: .46 })],
  [.5, GUARD]];
const J2_TOP = pz({ hx: 2, hy: 1, lean: -.2, chest: -.42, fl: [.9, .4], bl: [-.8, .2], fa: [2.88, -.1], sword: -1.82, ba: [2.55, .1], hat: 1 });
const J3_LOW = pz({ hx: 4, hy: 6, lean: .8, chest: .6, fl: [1.3, 1.5], bl: [-1.2, .1], fa: [.5, .1], sword: 2.3, ba: [.3, .2], hat: 1 });
const J4_HIGH = pz({ hx: 2, hy: 0, lean: -.15, chest: -.3, fl: [.7, .2], bl: [-.9, .3], fa: [2.25, -.05], sword: -.8, ba: [-1.3, .2], hat: -1, flutter: 1 });
const J5_THRUST = pz({ hx: 5, hy: 5, lean: .7, chest: .3, fl: [1.3, 1.2], bl: [-1.25, .05], fa: [1.6, 0], sword: .05, ba: [1.3, .4], hat: 1 });
const J6_KNEEL = pz({ hx: 4, hy: 7, lean: .95, chest: .55, fl: [1.3, 1.95], bl: [-.15, 2.4], fa: [1.0, .1], sword: 1.45, ba: [.8, .2], hat: 1, flutter: 1 });
const LUNGE = pz({ hx: 3, hy: 2, lean: .55, fl: [1.0, .9], bl: [-.95, .1] });
// O: blade raised high behind the head, feet planted wide; the release brings it all the way down through the front
const MOON_HOLD = pz({ hx: -1, hy: 3, lean: -.08, chest: -.28, fl: [.6, 1.0], bl: [-.7, .45], fa: [2.75, .35], ba: [2.45, .55], sword: -2.25 });
const MOON_DOWN = pz({ hx: 3, hy: 5, lean: .7, chest: .55, fl: [1.15, 1.3], bl: [-1.15, .1], fa: [.85, .15], sword: 1.35, ba: [.55, .2], hat: 1, flutter: 1 });
// the counter stances he cycles through after an attack: one hand, blade in the back hand, point to the ground
const STANCE_POSES = [
  pz({ hx: -1, hy: 2, lean: -.06, chest: .08, fl: [.45, .55], bl: [-.35, .45], fa: [.55, .35], ba: [-.35, .25], bsword: 2.05 }),
  pz({ hx: -1, hy: 2, lean: -.02, chest: .12, fl: [.4, .6], bl: [-.35, .5], fa: [.95, .7], ba: [-.15, .9], bsword: 1.85 }),
  pz({ hx: -1, hy: 3, lean: .02, chest: .14, fl: [.5, .75], bl: [-.45, .6], fa: [.3, .25], ba: [-.55, .1], bsword: 1.95, hat: 1 }),
  pz({ hx: -2, hy: 2, lean: -.1, chest: .22, fl: [.5, .5], bl: [-.5, .5], fa: [.25, 1.3], ba: [-.75, .15], bsword: 1.75 }),
];
const STANCE_BREATH = [0, 0, .3, .7, 1, 1, 1, .7, .3, 0, 0, 0, .2, .5, .2, 0];
export const POSES = {
  ...ITEM_POSES,
  ...Object.fromEntries(STANCE_POSES.map((q, k) => ['ready' + k, STANCE_BREATH.map((b, i) => pz({ ...q, breath: b, bsword: q.bsword + b * .03, flutter: i === 5 || i === 13 ? 1 : 0 }))])),
  ready4: Array(8).fill(null), ready5: Array(8).fill(null),
  idle: idle16,
  idleGlitch: idle16.filter((_, i) => i % 2 === 0),
  run: run8,
  // his plain walk; a personality (player/personality.js) re-bakes idle, walk and run
  walk: gaitFrames(BASE.walk),
  // a push-off step, the drop, the long lean-back glide with the back arm up for balance, then momentum carries him up
  slide: [
    pz({ hy: 2, lean: .35, fl: [.6, .9], bl: [-.7, .3], fa: [.6, .6], ba: [-.9, .3] }),
    pz({ hy: 4, lean: -.2, fl: [1.1, .4], bl: [.1, 1.6], fa: [.7, .6], ba: [-1.8, 0], flutter: 1 }),
    ...[0, 1, 2, 3, 4].map(i => pz({ hy: 5, lean: -.58 + (i % 2) * .03, fl: [1.5, .08], bl: [.38, 2.3], fa: [.75, .75], ba: [-2.45 + (i % 2) * .1, -.2], hat: -1 - (i > 1 ? 1 : 0), flutter: i % 2 })),
    pz({ hy: 4, lean: -.45, fl: [1.3, .2], bl: [.3, 2.0], fa: [.7, .7], ba: [-2.2, -.1], hat: -1 }),
    pz({ hy: 2, lean: .2, fl: [.7, .8], bl: [-.3, .9], fa: [.5, .6], ba: [-1.1, .3] }),
    pz({ hy: 1, lean: .12, fl: [.3, .3], bl: [-.2, .4], ba: [-.4, .2] }),
  ],
  jump: [pz({ hy: 3, lean: .3, fl: [.6, 1.0], bl: [-.4, .8] }),
    ...[0, 1, 2].map(() => pz({ lean: .2, fl: [1.0, 1.7], bl: [.2, 1.9], fa: [.6, .6], ba: [-1.5, .2], flutter: 1 }))],
  fall: [0, 1, 2].map(i => pz({ lean: .1, fl: [.4, .4 + i * .1], bl: [-.3, .5], fa: [.9, .3], ba: [-2.0, .2], flutter: i % 2 })),
  land: [pz({ hy: 4, lean: .35, fl: [.8, 1.4], bl: [-.5, 1.0] }), pz({ hy: 2, lean: .2, fl: [.4, .7], bl: [-.3, .5] }), pz({ hy: 1 })],
  // J: one fluid cut, keyframed and eased. The hips go first, then the chest, then the arms and blade.
  slash1: keyed([[0, pz({ fa: HILT, ba: [-.1, .6] })],
    [.09, pz({ hx: -1, hy: 3, lean: -.12, chest: -.3, fl: [.55, .9], bl: [-.7, .4], fa: [.3, 1.3], ba: [-.05, .9] })],
    ...J1_TAIL], 30),
  slash1r: keyed([[0, GUARD], [.09, J1_WIND], ...J1_TAIL], 30),
  slash2: keyed([[0, J1_FOLLOW],
    [.08, pz({ hx: 1, hy: 5, lean: .5, chest: .25, fl: [.8, 1.3], bl: [-.8, .4], fa: [.5, .3], sword: 2.3, ba: [.4, .5] })],
    [.14, pz({ hx: 2, hy: 2, lean: -.12, chest: -.3, fl: [.9, .5], bl: [-.8, .2], fa: [2.5, 0], sword: -1.2, ba: [2.1, .2], hat: 1, flutter: 1 }), lin],
    [.2, pz({ hx: 2, hy: 1, lean: -.22, chest: -.45, fl: [.9, .4], bl: [-.8, .2], fa: [2.9, -.1], sword: -1.85, ba: [2.6, .1], hat: 1, flutter: 1 })],
    [.34, pz({ hx: 2, hy: 1, lean: -.2, chest: -.42, fl: [.9, .4], bl: [-.8, .2], fa: [2.88, -.1], sword: -1.82, ba: [2.55, .1], hat: 1 })],
    [.5, GUARD]], 30),
  // J3 to J6: the chain grows as his basic skill does (player/combo.js). Each cut starts where the one before is at its chain beat (0.3 s)
  // J3: from overhead, a step in and a falling diagonal cut, all the way down past the back hip
  slash3: keyed([[0, J2_TOP],
    [.06, pz({ hx: 2, hy: 2, lean: .1, chest: -.25, fl: [1.0, .6], bl: [-.8, .2], fa: [2.7, .05], sword: -1.5, ba: [2.4, .15], hat: 1 })],
    [.12, pz({ hx: 3, hy: 4, lean: .5, chest: .35, fl: [1.15, 1.1], bl: [-1.05, .15], fa: [1.6, 0], sword: .35, ba: [1.2, .2], hat: 1, flutter: 1 }), lin],
    [.18, J3_LOW], [.34, pz({ ...J3_LOW, lean: .74, chest: .55 })], [.5, GUARD]], 30),
  // J4: out of the low finish he coils, then rises one-handed through a cut up the front, the free arm flung back for balance
  slash4: keyed([[0, J3_LOW],
    [.07, pz({ hx: 3, hy: 6, lean: .5, chest: -.35, fl: [1.2, 1.5], bl: [-1.0, .3], fa: [.2, .3], sword: 2.0, ba: [-.3, .4] })],
    [.13, pz({ hx: 3, hy: 3, lean: .15, chest: .05, fl: [1.0, .8], bl: [-.95, .2], fa: [1.6, 0], sword: -.3, ba: [-.9, .2], flutter: 1 }), lin],
    [.19, J4_HIGH], [.34, pz({ ...J4_HIGH, lean: -.18 })], [.5, GUARD]], 30),
  // J5: the blade drawn in to the chest, level, then the whole body behind a thrust with a long lunge
  slash5: keyed([[0, J4_HIGH],
    [.07, pz({ hx: 1, hy: 4, lean: .08, chest: -.3, fl: [.7, .9], bl: [-.8, .4], fa: [.8, 1.5], sword: .05, ba: [.7, 1.3] })],
    [.13, pz({ hx: 4, hy: 4, lean: .5, chest: .15, fl: [1.1, 1.1], bl: [-1.1, .15], fa: [1.4, .3], sword: .03, ba: [1.1, .6], flutter: 1 }), lin],
    [.17, J5_THRUST], [.34, pz({ ...J5_THRUST, fa: [1.55, .05] })], [.5, GUARD]], 30),
  // J6, the finisher: he pulls the blade back, leaps with it high over his head and brings it straight down, landing in a kneel
  slash6: keyed([[0, J5_THRUST],
    [.06, pz({ hx: -1, hy: 4, lean: -.1, chest: -.35, fl: [.6, 1.0], bl: [-.8, .45], fa: [2.1, .5], sword: -2.0, ba: [1.8, .6] })],
    [.13, pz({ hy: -1, lean: -.25, chest: -.5, fl: [.9, 1.7], bl: [-.1, 1.5], fa: [3.0, 0], sword: -2.3, ba: [2.8, .1], hat: -1, flutter: 1 })],
    [.2, pz({ hx: 3, hy: 5, lean: .6, chest: .45, fl: [1.2, 1.5], bl: [-.4, 1.8], fa: [1.7, 0], sword: .2, ba: [1.4, .15], hat: 1, flutter: 1 }), lin],
    [.24, J6_KNEEL], [.45, pz({ ...J6_KNEEL, lean: .9 })], [.6, GUARD]], 30),
  moonHold: [0, .3, .7, 1, 1, .7, .3, 0].map((b, i) => pz({ ...MOON_HOLD, breath: b, sword: MOON_HOLD.sword - b * .05, flutter: i === 3 || i === 4 ? 1 : 0 })),
  moon: keyed([[0, MOON_HOLD],
    [.05, pz({ hx: 2, hy: 4, lean: .5, chest: .4, fl: [1.0, 1.15], bl: [-1.0, .15], fa: [1.6, .05], sword: .1, ba: [1.1, .2], hat: 1, flutter: 1 }), lin],
    [.1, MOON_DOWN], [.45, pz({ ...MOON_DOWN, lean: .66, chest: .5 })], [.75, GUARD]], 30),
  // N: standing meditation, palms together at the chest, head bowed, eyes dimmed, a slow breath
  meditate: BREATH.map((b, i) => pz({ lean: .02, chest: .1, fl: [.06, .05], bl: [-.06, .04], fa: [.55, 2.15], ba: [.45, 2.25], bow: 1, dim: 1, breath: b, flutter: FLUT[i] })),
  // after an attack he waits in a guard stance, blade out, breathing
  ready: [0, 0, .3, .7, 1, 1, 1, .7, .3, 0, 0, 0, .2, .5, .2, 0].map((b, i) => pz({ ...GUARD, breath: b, sword: GUARD.sword + b * .04, flutter: i === 5 || i === 13 ? 1 : 0 })),
  runArmed: run8.map(q => pz({ ...q, lean: .4, fa: [.9, .3], sword: 2.55 })),
  // the resheathe, unhurried: the flick, a beat, the blade laid across, slid home slowly, the click, a moment of stillness, the release
  sheathe: keyed([[0, GUARD],
    [.12, pz({ hy: 3, lean: .2, chest: .1, fl: [.6, 1.0], bl: [-.65, .4], fa: [1.45, .05], sword: 1.15, ba: [-.4, .3] }), lin],
    [.3, pz({ hy: 3, lean: .2, chest: .1, fl: [.6, 1.0], bl: [-.65, .4], fa: [1.42, .06], sword: 1.2, ba: [-.4, .3] })],
    [.45, pz({ hy: 2, lean: .12, fl: [.4, .7], bl: [-.45, .3], fa: [1.2, .45], sheathing: true, ba: [.45, 1.1] })],
    [.75, pz({ hy: 1, lean: .08, fl: [.25, .4], bl: [-.3, .2], fa: [.6, .9], sheathing: true, ba: [.35, 1.1] })],
    [.82, pz({ hy: 1, lean: .06, fl: [.2, .3], bl: [-.25, .15], fa: HILT, ba: [.3, 1.0] })],
    [1.0, pz({ hy: 1, lean: .06, fl: [.2, .3], bl: [-.25, .15], fa: HILT, ba: [.3, 1.0] })],
    [1.2, pz({ fa: [.2, .3] })]], 15),
  tele: [
    pz({ hy: 2, lean: .4, fl: [.5, .9], bl: [-.5, .3], fa: HILT, ba: [-.9, .2] }),
    pz({ hy: 3, lean: .58, fl: [.6, 1.1], bl: [-.6, .4], fa: HILT, ba: [-1.2, .2], flutter: 1 }),
    pz({ hy: 3, lean: .6, fl: [.6, 1.1], bl: [-.6, .4], fa: HILT, ba: [-1.3, .2], flutter: 1 }),
    pz({ hy: 3, lean: .62, fl: [.6, 1.1], bl: [-.6, .4], fa: HILT, ba: [-1.3, .2] }),
    pz({ hy: 6, lean: .5, fl: [1.25, 1.95], bl: [-.15, 2.4], fa: HILT, ba: [-.7, .4], flutter: 1 }),
    pz({ hy: 6, lean: .45, fl: [1.25, 1.95], bl: [-.15, 2.4], fa: HILT, ba: [-.6, .4] }),
    pz({ hy: 3, lean: .3, fl: [.7, 1.0], bl: [-.2, 1.2], fa: HILT, ba: [-.4, .3] }),
    pz({ hy: 1, lean: .12, fl: [.2, .3], bl: [-.15, .3], fa: [.3, .6] }),
  ],
  double: [
    pz({ hy: 2, lean: .35, fl: [.5, .9], bl: [-.6, .3], fa: HILT, ba: [-.1, .7] }),
    pz({ hy: 4, lean: .55, fl: [.8, 1.4], bl: [-.8, .5], fa: HILT, ba: [-.05, .8] }),
    pz({ hy: 4, lean: .58, fl: [.8, 1.4], bl: [-.8, .5], fa: HILT, ba: [-.05, .8], flutter: 1 }),
    pz({ hy: 4, lean: .6, fl: [.8, 1.4], bl: [-.8, .5], fa: HILT, ba: [-.05, .8] }),
    null,
    pz({ hx: 5, hy: 4, lean: .8, fl: [1.3, 1.2], bl: [-1.2, .1], fa: [1.95, 0], sword: -.45, ba: [-1.6, 0], hat: 1, flutter: 1 }),
    pz({ hx: 5, hy: 4, lean: .82, fl: [1.3, 1.2], bl: [-1.2, .1], fa: [2.25, 0], sword: -.95, ba: [-1.65, 0], hat: 1, flutter: 1 }),
    pz({ hx: 5, hy: 3, lean: .5, fl: [1.2, 1.1], bl: [-1.1, .1], fa: [2.75, .2], sword: -1.65, ba: [-1.0, .5], hat: 1 }),
    pz({ hx: 7, hy: 5, lean: .9, fl: [1.4, 1.5], bl: [-1.3, .1], fa: [1.25, 0], sword: 1.0, ba: [-1.7, 0], hat: 1, flutter: 1 }),
    ...[0, 1, 2, 3].map(i => pz({ hx: 7, hy: 6, lean: .95, fl: [1.45, 1.7], bl: [-1.35, .1], fa: [.65, .15], sword: 2.45, ba: [-1.85, 0], hat: 1, flutter: i === 0 ? 1 : 0 })),
    pz({ hx: 6, hy: 4, lean: .6, fl: [1.1, 1.2], bl: [-1.0, .2], fa: [1.3, .3], sword: .75, ba: [-1.2, .2] }),
    pz({ hx: 4, hy: 2, lean: .35, fl: [.7, .7], bl: [-.6, .2], fa: [.8, .7], sheathing: true, ba: [-.6, .2] }),
    pz({ hx: 2, hy: 1, lean: .15, fl: [.3, .3], bl: [-.3, .2], fa: HILT, ba: [-.3, .2] }),
  ],
  // U: a slow kneel, a rising cyclone with the blade whirling, a leap, then the blade brought all the way down
  sweep: [
    ...[0, 1, 2, 3, 4, 5].map(i => { const k = i / 5; return pz({ hy: Math.round(k * 6), lean: .05 + k * .35, fl: [.2 + k * 1.0, .2 + k * 1.75], bl: [-.1 - k * .05, .1 + k * 2.3],
      fa: i < 2 ? HILT : [.9 - k * .3, .4], sword: i < 2 ? null : 1.45, ba: [-.1, .2 + k * .4] }); }),
    ...Array.from({ length: 20 }, (_, i) => pz({ hx: i > 13 ? (i % 2 ? 1 : 0) : 0, hy: 6, lean: .4 + (i > 6 && i < 14 ? .03 : 0), fl: [1.2, 1.95], bl: [-.15, 2.4],
      fa: [.6, .4], sword: 1.45, ba: [-.1, .6], breath: [0, 0, .3, .7, 1, 1, .7, .3][i % 8], flutter: i > 9 ? i % 2 : 0 })),
    ...[0, 1, 2, 3, 4, 5, 6, 7].map(i => { const k = i / 7; return pz({ hy: Math.round(6 - k * 8), lean: .3 - k * .45, fl: [1.2 - k * .9, 1.9 - k * 1.7], bl: [-.1 - k * .2, 2.3 - k * 2.1],
      fa: [1.6 + k * 1.2, .1], sword: -1.2 + i * 2.4, ba: [-1.2 - k * 1.2, .1], hat: i % 2 ? -1 : 0, flutter: i % 2 }); }),
    pz({ hy: -3, lean: -.2, fl: [.4, .5], bl: [-.3, .6], fa: [3.0, 0], sword: -1.62, ba: [2.9, .1], hat: -1, flutter: 1 }),
    pz({ hy: -3, lean: -.22, fl: [.4, .5], bl: [-.3, .6], fa: [3.05, 0], sword: -1.62, ba: [2.95, .1], hat: -1 }),
    pz({ hx: 2, hy: 3, lean: .5, fl: [1.0, 1.0], bl: [-.9, .3], fa: [1.9, 0], sword: -.2, ba: [1.4, .3], flutter: 1 }),
    ...[0, 1, 2, 3, 4].map(i => pz({ hx: 3, hy: 6, lean: .9, fl: [1.35, 1.6], bl: [-1.2, .15], fa: [.9, .05], sword: 1.35, ba: [.9, .2], hat: 1, flutter: i === 0 ? 1 : 0 })),
    pz({ hx: 2, hy: 4, lean: .55, fl: [1.0, 1.2], bl: [-.9, .3], fa: [1.1, .3], sword: 1.1, ba: [-.3, .3] }),
    pz({ hx: 1, hy: 2, lean: .25, fl: [.5, .5], bl: [-.4, .3], fa: [1.2, .4], sword: .8, ba: [-.4, .3] }),
  ],
  death: [
    pz({ hx: -1, lean: -.35, fa: [.9, .5], ba: [-1.2, .2] }),
    pz({ hx: -2, lean: -.5, fl: [.4, .2], bl: [-.4, .4], fa: [1.1, .5], ba: [-1.5, .2], hat: -1 }),
    pz({ hx: -3, hy: 1, lean: -.55, fl: [.5, .3], bl: [-.4, .6], fa: [1.0, .5], ba: [-1.5, .2], hat: -1 }),
    pz({ hx: -2, hy: 4, lean: .3, fl: [1.1, 1.8], bl: [-.1, 2.3], fa: [.3, .2], ba: [-.2, .2] }),
    pz({ hx: -2, hy: 5, lean: .45, fl: [1.2, 1.9], bl: [-.1, 2.4], fa: [.1, .1], ba: [-.1, .1] }),
    pz({ hx: -2, hy: 5, lean: .5, fl: [1.2, 1.9], bl: [-.1, 2.4], fa: [.05, .1], ba: [-.05, .1] }),
    ...[0, 1, 2, 3].map(() => pz({ hx: 2, hy: 9, lean: 1.45, fl: [1.2, 1.0], bl: [1.0, .9], fa: [1.6, .2], ba: [1.3, .2] })),
  ],
};
// which frames get the baked slice glitch, and how hard
export const GLF = { idleGlitch: { 2: .8, 3: 1, 4: .8, 5: .5 }, tele: { 1: .4, 2: 1.1, 3: 1.9, 4: 1.4, 5: .5 }, double: { 2: .8, 3: 1.7 }, death: { 8: 1.2, 9: 2.4 } };
