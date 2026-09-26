import { pz, HILT, lin, keyed } from '../rig/pose.js';
import { RY } from '../rig/rig.js';
import { breathe } from './grip.js';

// ---- The kusarigama: a sickle in the front hand, a chain with an iron weight in the back hand. The chain is thrown out
//   past anything else he carries and yanked back; the sickle hooks in close ----
const along = a => [Math.cos(a), Math.sin(a)];
const drawn = p => p.sword !== null && !p.sheathing;
// the sickle: a short haft, then the blade at right angles, curling back toward the hand
function sickle(k, hand, d) { const n = [d[1], -d[0]], top = k.add(hand, d, 5);
  k.seg(k.add(hand, d, -1), top, 1, 'T'); k.put(...top, 'S');
  for (let i = 1; i <= 5; i++) k.put(...k.add(k.add(top, n, -i), d, -(i * i) / 10), 'W'); }
// the chain: a link every other pixel, the weight on the end; it rests on the floor rather than going through it
function chain(k, from, d, len) { let e = len; while (e > 3 && from[1] + d[1] * e > RY + 1) e--;
  for (let i = 1; i < e; i += 2) k.put(...k.add(from, d, i), 'S');
  const w = k.add(from, d, e); k.blob(w[0], w[1], 2, 'K'); k.put(...w, 'S'); }
const ART = {
  // stowed: the chain coiled at the small of his back
  far(k, p, mouth) { if (drawn(p) || p.bsword != null) return; const c = k.L(2.5, -2.8);
    for (const [x, y] of [[0, 0], [1, 1], [0, 2], [-1, 1], [1, -1]]) k.put(c[0] + x, c[1] + y, 'S'); k.put(c[0], c[1] + 3, 'K'); },
  // the sickle tucked through the obi, haft forward and up, blade showing
  stowed(k, p, mouth, sd) { sickle(k, k.add(mouth, sd, 1), [-sd[0], -sd[1]]); },
  // with the sickle out, the chain hangs from the back fist, swinging a little
  offHand(k, p, bh) { if (!drawn(p) || p.bsword != null) return; const sw = p.breath * .15 + (p.flutter ? .1 : 0); chain(k, bh, [Math.sin(-sw), Math.cos(sw)], 8); },
  held(k, hand, a) { sickle(k, hand, along(a)); },
  // thrown: the chain straight out from the back fist
  backHeld(k, bh, a) { k.blob(bh[0], bh[1], 2, 'D'); chain(k, bh, along(a), 28); },
  sheathing(k, hand, mouth) { const dx = hand[0] - mouth[0], dy = hand[1] - mouth[1], l = Math.hypot(dx, dy) || 1; sickle(k, hand, [dx / l, dy / l]); },
  front: [[7, 15, 'T'], [7, 14, 'T'], [7, 13, 'T'], [7, 12, 'T'], [7, 11, 'S'], [8, 11, 'W'], [9, 11, 'W'], [10, 12, 'W'], [11, 12, 'W'],
    [21, 17, 'S'], [21, 19, 'S'], [21, 21, 'S'], [21, 23, 'K'], [22, 23, 'K']],
  sit: [[16, 17, 'T'], [17, 17, 'T'], [18, 17, 'T'], [19, 17, 'S'], [19, 16, 'W'], [19, 15, 'W'], [21, 17, 'S'], [23, 17, 'S'], [25, 17, 'S'], [27, 17, 'K'], [28, 17, 'K']],
};
// sickle up in front, the chain hanging and ready
const GUARD = pz({ hy: 3, lean: .14, chest: .06, fl: [.65, 1.0], bl: [-.7, .4], fa: [1.1, 1.0], ba: [.2, .4], sword: -1.2 });
// the throw: the chain arm cocked behind, then flung through, the chain snapping out straight, and yanked home
const WIND = pz({ hx: -2, hy: 4, lean: -.08, chest: -.3, fl: [.55, 1.0], bl: [-.8, .45], fa: [.8, 1.4], ba: [-2.2, .5], sword: -1.3 });
const THROW = pz({ hx: 3, hy: 4, lean: .5, chest: .45, fl: [1.1, 1.2], bl: [-1.1, .1], fa: [.5, 1.3], ba: [1.62, 0], sword: -.9, bsword: -.04, hat: 1, flutter: 1 });
const TAIL = [[.16, THROW, lin], [.22, pz({ ...THROW, bsword: 0 })],
  [.36, pz({ ...THROW, lean: .3, chest: .2, ba: [.9, .9], bsword: .7, flutter: 0 })], [.5, GUARD]];
// the answer: the sickle hooked in close, from high behind down and across
const HOOK = pz({ hx: 3, hy: 4, lean: .55, chest: .45, fl: [1.1, 1.3], bl: [-1.05, .2], fa: [.9, .5], ba: [-.5, .4], sword: 1.9, hat: 1 });
const STANCES = [
  // the chain whirled low at his side, the sickle high
  pz({ hx: -1, hy: 2, lean: .02, chest: .06, fl: [.4, .55], bl: [-.35, .45], fa: [1.2, 1.3], ba: [-.6, .2], sword: -1.4, bsword: 2.2 }),
  // crouched, sickle low forward, the chain hanging
  pz({ hx: -1, hy: 5, lean: .3, chest: .1, fl: [.9, 1.5], bl: [-.5, 1.1], fa: [1.3, .2], ba: [.4, .6], sword: .2 }),
  // the sickle on the shoulder, the chain hanging
  pz({ hy: 2, lean: .02, chest: .1, fl: [.45, .55], bl: [-.4, .5], fa: [1.1, 2.0], ba: [-.1, .3], sword: -2.6, hat: 1 }),
  // the chain drawn taut between the fists, the sickle forward
  pz({ hx: -1, hy: 3, lean: .1, chest: .08, fl: [.55, .8], bl: [-.5, .5], fa: [1.2, .6], ba: [.3, 1.2], sword: -.6 }),
];
export const KUSARIGAMA = { id: 'kusarigama', name: 'Kusarigama', about: 'A sickle in the front hand and a chain with an iron weight in the back hand: the chain is thrown out past anything else he carries and yanked back, the sickle hooks in close.', art: ART,
  reach: 1.6, weight: { stop: .8, shake: 1 },
  poses: {
    ...Object.fromEntries(STANCES.map((q, k) => ['ready' + k, breathe(q)])),
    ready: breathe(GUARD),
    runArmed: Array.from({ length: 8 }, (_, i) => { const a = i / 8 * Math.PI * 2, s = Math.sin(a), c = Math.cos(a);
      return pz({ lean: .36, hy: Math.round(.5 - .5 * Math.cos(2 * a)), fl: [.95 * s, .3 + 1.1 * Math.max(0, c)], bl: [-.95 * s, .3 + 1.1 * Math.max(0, -c)],
        fa: [1.0, .9], ba: [-.6, .2], sword: -1.0, bsword: 2.9, flutter: (i % 4) / 2 }); }),
    // J: the sickle drawn from the obi, the chain arm cocked, the throw
    slash1: keyed([[0, pz({ fa: HILT, ba: [-.1, .6] })], [.09, WIND], ...TAIL], 30),
    slash1r: keyed([[0, GUARD], [.09, WIND], ...TAIL], 30),
    slash2: keyed([[0, pz({ ...THROW, bsword: .7 })],
      [.08, pz({ hx: 1, hy: 4, lean: .2, chest: -.3, fl: [.8, 1.2], bl: [-.8, .4], fa: [2.7, .4], ba: [.2, .4], sword: -2.5 })],
      [.14, pz({ ...HOOK, fa: [1.7, .1], sword: .3 }), lin], [.2, HOOK], [.34, pz({ ...HOOK, lean: .5 })], [.5, GUARD]], 30),
  },
};
