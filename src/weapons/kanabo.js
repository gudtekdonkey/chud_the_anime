import { pz, HILT, lin, keyed } from 'ronin-engine/rig/pose.js';
import { RY } from '../rig/rig.js';
import { breathe, shoulderDraw, shoulderStow, runWith } from './grip.js';
import { staff3d } from './art3d.js';

// ---- The kanabo: an iron-studded war club hung down his back, grip over the shoulder. No edge, only weight: it is raised
//   high and dropped, and the floor takes what the enemy doesn't ----
const along = a => [Math.cos(a), Math.sin(a)];
const stowed = p => p.sword === null && !p.sheathing && p.bsword == null;
// a wrapped grip, a ring, then the iron body (lit on its face, dark on its side) swelling from 2 px to 3, bright studs, a cap. It stops at the floor (it lands on it)
function club(k, hand, a) { const d = along(a), n = [-d[1], d[0]]; let e = 20;
  while (e > 6 && hand[1] + d[1] * e > RY + 1) e--;
  k.seg(k.add(hand, d, -1), k.add(hand, d, -5), 1, 'K'); k.put(...k.add(hand, d, -3), 'D'); k.put(...k.add(hand, d, -5), 'S');
  k.put(...k.add(hand, d, 1), 'S'); k.put(...k.add(k.add(hand, d, 1), n, 1), 'S');
  for (let i = 2; i <= e; i++) { const c = k.add(hand, d, i), w = i > 9 ? 1 : 0;
    k.put(...c, 'S'); k.put(...k.add(c, n, 1), 'G'); if (w) k.put(...k.add(c, n, -1), 'G');
    if (i % 3 === 0) { k.put(...k.add(c, n, 1 + w), 'W'); if (w) k.put(...k.add(c, n, -2), 'W'); } }
  k.put(...k.add(hand, d, e + 1), 'W'); }
const MOUTH = k => k.L(10, -3.4);
const ART = {
  d3: staff3d('S', 5, 20),   // the same weapon from any other facing (art3d.js)
  // hung down his back from a cord, the grip standing up behind the shoulder
  far(k, p) { if (stowed(p)) club(k, MOUTH(k), 1.95); },
  stowed() {},
  held(k, hand, a) { club(k, hand, a); },
  backHeld(k, bh, a) { k.blob(bh[0], bh[1], 2, 'D'); club(k, bh, a); },
  // let down onto his back: hanging from the hand behind his neck
  sheathing(k, hand) { club(k, hand, 1.95); },
  front: [[7, 15, 'K'], [7, 16, 'K'], [7, 14, 'S'], ...Array.from({ length: 13 }, (_, i) => [7 - Math.round(i * .4), 13 - i, 'S']),
    ...Array.from({ length: 13 }, (_, i) => [6 - Math.round(i * .4), 13 - i, i % 3 ? 'G' : 'W'])],
  sit: [[5, 17, 'K'], [6, 17, 'D'], [7, 17, 'K'], [8, 17, 'S'], ...Array.from({ length: 18 }, (_, i) => [9 + i, 17, 'S']),
    ...Array.from({ length: 10 }, (_, i) => [17 + i, 16, i % 3 ? 'G' : 'W'])],
};
// on the shoulder, both hands on the grip at the chest
const GUARD = pz({ hy: 3, lean: .1, chest: .06, fl: [.6, 1.0], bl: [-.65, .4], fa: [1.3, 1.6], ba: [1.0, 1.8], sword: -2.7 });
// raised as high as he can reach, the whole body arched back under it
const WIND = pz({ hx: -2, hy: 3, lean: -.25, chest: -.55, fl: [.55, 1.0], bl: [-.8, .45], fa: [2.8, .3], ba: [2.5, .5], sword: -2.3, hat: -1 });
// dropped: the club lands on the floor ahead with everything behind it
const SMASH = pz({ hx: 3, hy: 6, lean: .75, chest: .55, fl: [1.25, 1.45], bl: [-1.2, .1], fa: [1.3, .1], ba: [1.0, .3], sword: .9, hat: 1, flutter: 1 });
const TAIL = [[.16, pz({ hx: 2, hy: 4, lean: .5, chest: .4, fl: [1.05, 1.15], bl: [-1.05, .1], fa: [2.0, .05], ba: [1.7, .2], sword: -.6, hat: 1, flutter: 1 }), lin],
  [.22, SMASH], [.36, pz({ ...SMASH, flutter: 0 })], [.5, GUARD]];
const HIGH = pz({ hx: 2, hy: 2, lean: -.25, chest: -.5, fl: [.95, .5], bl: [-.85, .2], fa: [2.95, -.1], ba: [2.65, .1], sword: -1.7, hat: 1 });
const STANCES = [
  // planted head-down in front of him, both hands resting on the grip
  pz({ hx: -1, hy: 1, lean: -.04, chest: .05, fl: [.3, .35], bl: [-.3, .35], fa: [.95, .95], ba: [.85, 1.05], sword: 1.57 }),
  // on the shoulder, one hand, the other hanging
  pz({ hy: 2, lean: .02, chest: .08, fl: [.45, .55], bl: [-.4, .45], fa: [1.3, 1.6], ba: [-.2, .3], sword: -2.8 }),
  // dragged: the back hand low, the head on the floor behind
  pz({ hx: -1, hy: 3, lean: .06, chest: .14, fl: [.5, .75], bl: [-.45, .6], fa: [.3, .25], ba: [-.6, .1], bsword: 2.4, hat: 1 }),
  // across the hips, level, both hands
  pz({ hx: -1, hy: 3, lean: .08, chest: .06, fl: [.55, .8], bl: [-.55, .5], fa: [.9, .5], ba: [.6, .8], sword: .15 }),
];
export const KANABO = { id: 'kanabo', name: 'Kanabo', about: 'An iron-studded war club hung down his back: raised high and dropped onto the enemy and the floor. The heaviest hit of all, the longest pause and the biggest shake.', art: ART,
  reach: 1.15, weight: { stop: 2, shake: 2.5 },
  poses: {
    ...Object.fromEntries(STANCES.map((q, k) => ['ready' + k, breathe(q)])),
    ready: breathe(GUARD),
    runArmed: runWith({ fa: [1.25, 1.65], sword: -2.8 }),
    slash1: keyed([...shoulderDraw(WIND), ...TAIL], 30),
    slash1r: keyed([[0, GUARD], [.09, WIND], ...TAIL], 30),
    // the answer: swung back up from the floor through the front and over, ending high
    slash2: keyed([[0, SMASH],
      [.08, pz({ hx: 1, hy: 6, lean: .55, chest: .3, fl: [.85, 1.4], bl: [-.85, .4], fa: [.4, .3], ba: [.2, .5], sword: 2.2 })],
      [.14, pz({ hx: 2, hy: 3, lean: -.05, chest: -.25, fl: [.9, .6], bl: [-.8, .2], fa: [2.4, 0], ba: [2.0, .2], sword: -.9, hat: 1, flutter: 1 }), lin],
      [.2, HIGH], [.34, pz({ ...HIGH, sword: -1.66 })], [.5, GUARD]], 30),
    sheathe: shoulderStow(GUARD),
  },
  adapt(p) { return p.fa === HILT ? pz({ ...p, fa: [2.9, 1.2] }) : p; },
};
