import { pz, HILT, lin, keyed } from '../rig/pose.js';
import { breathe } from './grip.js';

// ---- The tessen: an iron war fan in one hand. Closed it is a short iron baton that snaps into strikes; opened it is a shield
//   at his face and a blade for a wide slicing sweep. A pose's `spread` opens it ----
const along = a => [Math.cos(a), Math.sin(a)];
// closed: iron guards either side of the folded ribs, a pivot rivet at the hand. Open: a wedge of dark paper on iron ribs, a bright rim
function fan(k, hand, a, spread) { const d = along(a), piv = k.add(hand, d, -1);
  if (spread < .2) { const n = [-d[1], d[0]];
    k.put(...piv, 'S'); k.seg(hand, k.add(hand, d, 6), 1, 'G'); k.seg(k.add(hand, n, 1), k.add(k.add(hand, d, 6), n, 1), 1, 'S'); return; }
  const half = .85 * spread;
  for (let t = -half; t <= half + 1e-6; t += .08) { const e = along(a + t);
    k.seg(k.add(piv, e, 2), k.add(piv, e, 7), 1, 'G'); k.put(...k.add(piv, e, 7), 'W'); }
  for (let t = -half; t <= half + 1e-6; t += half / 3) k.seg(piv, k.add(piv, along(a + t), 7), 1, 'S');
  k.put(...piv, 'S'); }
const drawn = p => p.sword !== null && !p.sheathing;
const ART = {
  far() {},
  // closed and tucked in the obi, the pivot end up
  stowed(k, p, mouth, sd) { k.put(...mouth, 'S'); k.seg(k.add(mouth, sd, 1), k.add(mouth, sd, 4), 1, 'G'); k.seg(k.add(mouth, sd, -1), k.add(mouth, sd, -2.5), 1, 'S'); },
  held(k, hand, a) { fan(k, hand, a, k.p.spread || 0); },
  backHeld(k, bh, a) { k.blob(bh[0], bh[1], 2, 'D'); fan(k, bh, a, k.p.spread || 0); },
  sheathing(k, hand, mouth) { const dx = mouth[0] - hand[0], dy = mouth[1] - hand[1]; fan(k, hand, Math.atan2(dy, dx), 0); },
  // opened to the camera: the fan open at his chest
  front: [[8, 15, 'S'], ...[[7, 13], [8, 12], [9, 12], [10, 13], [6, 12], [7, 11], [8, 10], [9, 10], [10, 11], [11, 12]].map(([x, y], i) => [x, y, i < 5 ? 'G' : 'W'])],
  sit: [[16, 17, 'S'], [17, 17, 'G'], [18, 17, 'G'], [19, 17, 'G'], [20, 17, 'G']],
};
// the fan open before his face, the other fist low and ready
const GUARD = pz({ hy: 3, lean: .12, chest: .04, fl: [.6, 1.0], bl: [-.65, .4], fa: [1.2, 1.6], ba: [.6, .9], sword: -1.1, spread: 1 });
// the strike: snapped shut, raised by the ear, driven down onto the enemy's head
const WIND = pz({ hx: -1, hy: 4, lean: -.05, chest: -.3, fl: [.55, 1.0], bl: [-.75, .45], fa: [2.7, .9], ba: [.8, 1.2], sword: -2.2, spread: 0 });
const STRIKE = pz({ hx: 3, hy: 4, lean: .5, chest: .45, fl: [1.05, 1.15], bl: [-1.05, .1], fa: [1.5, .2], ba: [-.3, .6], sword: .6, spread: 0, hat: 1, flutter: 1 });
const TAIL = [[.16, pz({ ...STRIKE, fa: [2.0, .1], sword: -.4 }), lin], [.22, STRIKE], [.36, pz({ ...STRIKE, lean: .46 })], [.5, GUARD]];
// the answer: flicked open and swept across at throat height, the iron rim leading
const SWEEP = pz({ hx: 3, hy: 3, lean: .45, chest: .5, fl: [1.1, 1.2], bl: [-1.1, .15], fa: [1.6, -.1], ba: [-.4, .5], sword: .2, spread: 1, hat: 1, flutter: 1 });
const STANCES = [
  // open, held high at his temple
  pz({ hx: -1, hy: 2, lean: .02, chest: .06, fl: [.4, .55], bl: [-.35, .45], fa: [1.6, 1.5], ba: [.2, .4], sword: -1.5, spread: 1 }),
  // closed, pointed at the enemy like a blade
  pz({ hx: -1, hy: 3, lean: .1, chest: .08, fl: [.55, .8], bl: [-.5, .5], fa: [1.3, .3], ba: [.5, 1.2], sword: -.2 }),
  // open and low, cupped at the hip
  pz({ hy: 2, lean: .02, chest: .1, fl: [.45, .55], bl: [-.4, .5], fa: [.5, .8], ba: [-.3, .3], sword: .9, spread: .8, hat: 1 }),
  // half open across the chest
  pz({ hx: -1, hy: 3, lean: .06, chest: .12, fl: [.5, .75], bl: [-.45, .6], fa: [.8, 2.0], ba: [.3, 1.0], sword: -2.8, spread: .5 }),
];
export const TESSEN = { id: 'tessen', name: 'Tessen', about: 'An iron war fan in one hand: snapped shut it strikes like a short iron baton, flicked open it guards his face and slices across in a wide sweep. The shortest reach and the lightest hit.', art: ART,
  reach: .7, weight: { stop: .6, shake: 1 },
  poses: {
    ...Object.fromEntries(STANCES.map((q, k) => ['ready' + k, breathe(q)])),
    ready: breathe(GUARD),
    slash1: keyed([[0, pz({ fa: HILT, ba: [-.1, .6] })], [.09, WIND], ...TAIL], 30),
    slash1r: keyed([[0, GUARD], [.09, WIND], ...TAIL], 30),
    slash2: keyed([[0, STRIKE],
      [.08, pz({ hx: 1, hy: 4, lean: .25, chest: -.35, fl: [.8, 1.2], bl: [-.8, .4], fa: [.2, 1.5], ba: [.6, .6], sword: -2.6, spread: .2 })],
      [.14, pz({ ...SWEEP, fa: [1.2, .3], sword: -.6 }), lin], [.2, SWEEP], [.34, pz({ ...SWEEP, lean: .42 })], [.5, GUARD]], 30),
  },
};
