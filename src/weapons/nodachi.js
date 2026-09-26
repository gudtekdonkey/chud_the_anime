import { OY } from '../config.js';
import { pz, HILT, lin, keyed } from '../rig/pose.js';

// ---- The nodachi (the Grave Nodachi pickup): a greatsword worn on the back, hilt over the shoulder. Every cut is heavy, wound up far and followed through low ----
const along = a => [Math.cos(a), Math.sin(a)];
const stowed = p => p.sword === null && !p.sheathing && p.bsword == null;
const LEN = 19;
// the long blade, clipped at the floor: a point that would go under his feet is planted in it instead
function blade(k, hand, a, len = LEN) { const d = along(a); let n = len;
  while (n > 3 && hand[1] + d[1] * n > OY + 1) n--;
  k.seg(hand, k.add(hand, d, -3.5), 1, 'K'); k.put(...hand, 'S'); k.put(...k.add(hand, d, 1), 'S'); k.seg(k.add(hand, d, 2), k.add(hand, d, n), 1, 'W'); }
const ART = {
  // the long saya down his back, always there; its hilt pokes up behind the shoulder while the blade is home
  far(k, p) { const m = k.L(8, -3.2), e = k.L(-9, -7.4);
    k.seg(m, e, 1, 's'); k.put(...e, 'S');
    if (stowed(p)) { k.put(...m, 'S'); k.seg(k.L(8.8, -3), k.L(12, -2.3), 1, 'W'); } },
  stowed() {},
  held(k, hand, a) { blade(k, hand, a); },
  backHeld(k, bh, a) { k.blob(bh[0], bh[1], 2, 'D'); blade(k, bh, a); },
  // slid home over the shoulder: the blade runs from the hand into the saya's mouth behind his neck
  sheathing(k, hand) { const m = k.L(8, -3.2), dx = hand[0] - m[0], dy = hand[1] - m[1], l = Math.hypot(dx, dy) || 1;
    k.seg(hand, m, 1, 'W'); k.put(...hand, 'S'); k.seg(hand, k.add(hand, [dx / l, dy / l], 3), 1, 'K'); },
  front: [[7, 15, 'S'], [6, 16, 'S'], ...[0, 1, 2, 3, 4, 5, 6, 7].map(i => [5 - i, 17 + i, 'W'])],
  sit: [[11, 17, 'K'], [12, 17, 'K'], [13, 17, 'S'], ...Array.from({ length: 18 }, (_, i) => [14 + i, 17, 'W'])],
};
// hasso: the blade upright beside his head, hands at the shoulder
const GUARD = pz({ hy: 3, lean: .08, chest: .04, fl: [.6, 1.0], bl: [-.65, .4], fa: [.9, 1.75], ba: [.6, 1.9], sword: -1.72 });
const WIND = pz({ hx: -2, hy: 4, lean: -.2, chest: -.5, fl: [.55, 1.05], bl: [-.8, .45], fa: [2.7, .5], ba: [2.4, .7], sword: -2.9 });
const FOLLOW = pz({ hx: 3, hy: 6, lean: .78, chest: .55, fl: [1.25, 1.4], bl: [-1.2, .1], fa: [.8, .15], ba: [.5, .3], sword: 1.25, hat: 1 });
const TAIL = [
  [.16, pz({ hx: 2, hy: 4, lean: .5, chest: .4, fl: [1.05, 1.15], bl: [-1.05, .1], fa: [1.7, .05], ba: [1.3, .2], sword: .15, hat: 1, flutter: 1 }), lin],
  [.22, FOLLOW], [.36, pz({ ...FOLLOW, lean: .74, chest: .5 })], [.5, GUARD]];
const OVER = pz({ hx: 2, hy: 2, lean: -.25, chest: -.5, fl: [.95, .5], bl: [-.85, .2], fa: [2.95, -.1], ba: [2.65, .1], sword: -1.95, hat: 1 });
// J3 to J6 (player/combo.js): straight down into the floor, hauled round into a flat wheel, a rising cut from low behind,
//   and the finisher: a hop and the whole weight brought over the shoulder into a kneel
const N3 = pz({ hx: 3, hy: 7, lean: .85, chest: .6, fl: [1.3, 1.5], bl: [-1.2, .1], fa: [.9, .1], ba: [.6, .3], sword: 1.1, hat: 1 });
const N4 = pz({ hx: 4, hy: 4, lean: .45, chest: .5, fl: [1.15, 1.1], bl: [-1.1, .15], fa: [1.5, 0], ba: [1.3, .2], sword: 0, hat: 1, flutter: 1 });
const N5 = pz({ hx: 2, hy: 1, lean: -.25, chest: -.4, fl: [.8, .3], bl: [-.9, .3], fa: [2.5, 0], ba: [2.2, .15], sword: -1.2, hat: -1 });
const N6 = pz({ hx: 4, hy: 7, lean: .95, chest: .6, fl: [1.3, 1.95], bl: [-.15, 2.4], fa: [.9, .1], ba: [.6, .25], sword: 1.2, hat: 1, flutter: 1 });
const STANCES = [
  // resting on the shoulder, the blade pointing back
  pz({ hy: 2, lean: .02, chest: .08, fl: [.45, .55], bl: [-.4, .45], fa: [1.3, 1.6], ba: [-.2, .3], sword: -2.75 }),
  // point planted in front, both hands on the pommel
  pz({ hx: -1, hy: 1, lean: -.04, chest: .05, fl: [.3, .35], bl: [-.3, .35], fa: [.95, .95], ba: [.85, 1.05], sword: 1.5 }),
  // dragged: the back hand low, the point trailing on the floor behind
  pz({ hx: -1, hy: 3, lean: .06, chest: .14, fl: [.5, .75], bl: [-.45, .6], fa: [.3, .25], ba: [-.6, .1], bsword: 2.55, hat: 1 }),
  // hasso, higher and tighter
  pz({ hx: -1, hy: 3, lean: .02, chest: .1, fl: [.55, .8], bl: [-.55, .5], fa: [.7, 2.0], ba: [.45, 2.1], sword: -1.5 }),
];
const BREATH = [0, 0, .3, .7, 1, 1, 1, .7, .3, 0, 0, 0, .2, .5, .2, 0];
export const NODACHI = { id: 'nodachi', name: 'Nodachi', about: 'A greatsword worn on his back, hilt over the shoulder: the same moves, wound up further and followed through low. Longer reach, and every cut lands a beat heavier.', art: ART,
  reach: 1.35, weight: { stop: 1.6, shake: 2 },
  poses: {
    ...Object.fromEntries(STANCES.map((q, k) => ['ready' + k, BREATH.map((b, i) => pz({ ...q, breath: b, flutter: i === 5 || i === 13 ? 1 : 0 }))])),
    ready: BREATH.map((b, i) => pz({ ...GUARD, breath: b, sword: GUARD.sword - b * .03, flutter: i === 5 || i === 13 ? 1 : 0 })),
    // J: the draw over the shoulder is the wind-up; the blade comes down through the front and nearly into the floor
    // shoulder angles past pi keep the arm going over the top between keys, and a blade angle below -pi keeps it turning
    //   over his back (not down through the front)
    // J from the back: the hand over the shoulder on the hilt, the blade drawn up out of the saya (point still down behind him),
    //   then turned over his back into the wind-up
    slash1: keyed([[0, pz({ fa: [3.6, .4], ba: [-.1, .6] })],
      [.045, pz({ hy: 1, lean: -.06, chest: -.1, fa: [3.3, .25], ba: [-.1, .6], sword: -4.38, flutter: 1 })],
      [.09, WIND], ...TAIL], 30),
    // the stow, on the katana's beats: a flick down at his side, a beat, the blade raised overhead, slid down into the saya
    //   behind his neck, the click with his hand on the hilt, then the hand drops away
    sheathe: keyed([[0, GUARD],
      [.12, pz({ hy: 3, lean: .12, chest: .05, fl: [.55, .9], bl: [-.6, .4], fa: [.9, .3], ba: [-.4, .3], sword: 1.25 }), lin],
      [.3, pz({ hy: 3, lean: .12, chest: .05, fl: [.55, .9], bl: [-.6, .4], fa: [.92, .3], ba: [-.4, .3], sword: 1.28 })],
      [.38, pz({ hy: 2, lean: .04, fl: [.4, .6], bl: [-.45, .3], fa: [2.9, .2], ba: [-.3, .3], sword: -1.5 })],
      [.45, pz({ hy: 1, lean: .02, fl: [.3, .4], bl: [-.3, .2], fa: [3.2, .2], ba: [-.2, .3], sheathing: true })],
      [.75, pz({ hy: 1, lean: .02, fl: [.25, .35], bl: [-.25, .2], fa: [3.6, .7], ba: [-.2, .3], sheathing: true })],
      [.82, pz({ hy: 1, lean: .04, fl: [.2, .3], bl: [-.25, .15], fa: [3.6, .5], ba: [-.15, .3] })],
      [1.0, pz({ hy: 1, lean: .04, fl: [.2, .3], bl: [-.25, .15], fa: [5.88, .8], ba: [-.1, .3] })],
      [1.2, pz({ fa: [6.48, .3] })]], 15),
    slash1r: keyed([[0, GUARD], [.09, WIND], ...TAIL], 30),
    slash2: keyed([[0, FOLLOW],
      [.08, pz({ hx: 1, hy: 6, lean: .55, chest: .3, fl: [.85, 1.4], bl: [-.85, .4], fa: [.4, .3], ba: [.2, .5], sword: 2.5 })],
      [.14, pz({ hx: 2, hy: 3, lean: -.05, chest: -.25, fl: [.9, .6], bl: [-.8, .2], fa: [2.4, 0], ba: [2.0, .2], sword: -1.0, hat: 1, flutter: 1 }), lin],
      [.2, OVER], [.34, pz({ ...OVER, sword: -1.92 })], [.5, GUARD]], 30),
    slash3: keyed([[0, OVER],
      [.07, pz({ ...OVER, hx: 3, lean: -.1, fl: [1.0, .6], fa: [3.05, 0], sword: -2.2 })],
      [.13, pz({ hx: 3, hy: 4, lean: .5, chest: .35, fl: [1.15, 1.1], bl: [-1.05, .15], fa: [1.8, 0], ba: [1.5, .2], sword: .1, flutter: 1 }), lin],
      [.18, N3], [.34, pz({ ...N3, lean: .8 })], [.5, GUARD]], 30),
    slash4: keyed([[0, N3],
      [.07, pz({ hx: 1, hy: 4, lean: .15, chest: -.5, fl: [.9, 1.0], bl: [-.9, .35], fa: [.1, .3], ba: [-.2, .4], sword: 3.0 })],
      [.13, pz({ ...N4, hx: 3, chest: .1, fa: [1.0, .2], sword: 1.6 }), lin], [.18, N4], [.34, pz({ ...N4, lean: .42 })], [.5, GUARD]], 30),
    slash5: keyed([[0, N4],
      [.07, pz({ hx: 2, hy: 6, lean: .55, chest: -.3, fl: [1.2, 1.5], bl: [-1.0, .3], fa: [.3, .3], ba: [.1, .4], sword: 2.4 })],
      [.13, pz({ ...N5, hy: 3, lean: .1, fa: [1.7, 0], sword: -.2 }), lin], [.19, N5], [.34, pz({ ...N5, sword: -1.22 })], [.5, GUARD]], 30),
    slash6: keyed([[0, N5],
      [.06, pz({ hx: -1, hy: 3, lean: -.2, chest: -.5, fl: [.6, 1.0], bl: [-.8, .45], fa: [2.8, .4], ba: [2.5, .6], sword: -2.9 })],
      [.13, pz({ hy: -1, lean: -.3, chest: -.55, fl: [.9, 1.7], bl: [-.1, 1.5], fa: [3.1, 0], ba: [2.85, .1], sword: -2.5, hat: -1, flutter: 1 })],
      [.2, pz({ ...N6, hy: 4, lean: .6, fl: [1.2, 1.5], bl: [-.4, 1.8], fa: [1.7, 0], sword: .2 }), lin],
      [.24, N6], [.45, pz({ ...N6, lean: .9 })], [.6, GUARD]], 30),
    runArmed: POSES_RUN_ARMED(),
  },
  // elsewhere: the hand that would wait on a hip hilt reaches up for the one over his shoulder
  adapt(p) { return p.fa === HILT ? pz({ ...p, fa: [2.9, 1.2] }) : p; },
};
// running with it over the shoulder, point back
function POSES_RUN_ARMED() { return Array.from({ length: 8 }, (_, i) => { const a = i / 8 * Math.PI * 2, s = Math.sin(a), c = Math.cos(a);
  return pz({ lean: .36, hy: Math.round(.5 - .5 * Math.cos(2 * a)), fl: [.95 * s, .3 + 1.1 * Math.max(0, c)], bl: [-.95 * s, .3 + 1.1 * Math.max(0, -c)],
    fa: [1.25, 1.65], ba: [.7 * s - .5, .5], sword: -2.8, flutter: (i % 4) / 2 }); }); }
