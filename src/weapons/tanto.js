import { pz, HILT, lin, keyed } from '../rig/pose.js';

// ---- Twin tanto: two short blades at the front of the obi. The lead hand cuts, the back hand rides along in a reverse grip ----
const along = a => [Math.cos(a), Math.sin(a)];
const drawn = p => p.sword !== null && !p.sheathing;
function knife(k, hand, d, len = 6) { k.put(...k.add(hand, d, -1.5), 'K'); k.put(...hand, 'S'); k.seg(k.add(hand, d, 1), k.add(hand, d, len), 1, 'W'); }
const ART = {
  // the second saya sits a pixel behind the first; its hilt shows while it is home
  far(k, p, mouth, sd) { const m = k.add(mouth, [0, -1], 1); k.seg(m, k.add(m, sd, 6), 1, 's');
    if (!drawn(p) && !p.sheathing) { k.put(...m, 'S'); k.seg(k.add(m, sd, -1), k.add(m, sd, -2.5), 1, 'G'); } },
  stowed(k, p, mouth, sd) { k.seg(mouth, k.add(mouth, sd, 6), 1, 's'); k.put(...mouth, 'S'); k.seg(k.add(mouth, sd, -1), k.add(mouth, sd, -2.5), 1, 'W'); },
  // the back hand's blade in a reverse grip: it runs from the fist back along the outside of the forearm
  offHand(k, p, bh) { if (!drawn(p)) return; const a = p.ba[0] + p.ba[1], f = [Math.sin(a), Math.cos(a)];
    k.put(...k.add(bh, f, 1), 'K'); k.put(...bh, 'S'); k.seg(k.add(bh, [-f[0] - f[1] * .4, -f[1] + f[0] * .4], 1), k.add(bh, [-f[0] - f[1] * .4, -f[1] + f[0] * .4], 5), 1, 'W'); },
  held(k, hand, a) { knife(k, hand, along(a)); },
  backHeld(k, bh, a) { k.blob(bh[0], bh[1], 2, 'D'); knife(k, bh, along(a)); },
  sheathing(k, hand, mouth) { const dx = mouth[0] - hand[0], dy = mouth[1] - hand[1], l = Math.hypot(dx, dy) || 1; knife(k, hand, [dx / l, dy / l], Math.min(6, l)); },
  // opened to the camera: a blade in each fist, reverse grip, lying up the forearms
  front: [[7, 15, 'S'], [7, 14, 'W'], [6, 13, 'W'], [6, 12, 'W'], [6, 11, 'W'], [21, 15, 'S'], [21, 14, 'W'], [22, 13, 'W'], [22, 12, 'W'], [22, 11, 'W']],
  sit: [[16, 17, 'S'], [17, 17, 'W'], [18, 17, 'W'], [19, 17, 'W'], [21, 17, 'S'], [22, 17, 'W'], [23, 17, 'W'], [24, 17, 'W']],
};
// low and coiled, lead blade forward, the back fist up by the chin
const GUARD = pz({ hy: 4, lean: .3, chest: .1, fl: [.75, 1.2], bl: [-.7, .6], fa: [1.25, .35], ba: [.7, 1.9], sword: -.2 });
const WIND = pz({ hx: -1, hy: 4, lean: .1, chest: -.35, fl: [.6, 1.1], bl: [-.75, .45], fa: [-.4, 1.6], ba: [1.1, 1.0], sword: -2.6 });
// slash 1: a fast backhand across the front, the lead arm flung through
const CUT = pz({ hx: 3, hy: 3, lean: .55, chest: .45, fl: [1.1, 1.2], bl: [-1.1, .1], fa: [1.55, -.1], ba: [.2, 1.6], sword: .7, hat: 1, flutter: 1 });
const TAIL = [[.16, pz({ ...CUT, fa: [1.7, .2], sword: -.2 }), lin], [.22, CUT], [.36, pz({ ...CUT, lean: .5 })], [.5, GUARD]];
// slash 2: the back hand's answer, a reverse-grip hook driven across by the turning chest
const HOOK = pz({ hx: 3, hy: 4, lean: .5, chest: .55, fl: [1.1, 1.3], bl: [-1.05, .2], fa: [-.3, .9], ba: [1.75, .2], sword: 2.2, hat: 1, flutter: 1 });
// J3 to J6 (player/combo.js): a straight stab, the back hand's reverse grip ripping upward, a wide backhand with both arms flung,
//   and the finisher: a leap with the blades crossed overhead, scissored down into a kneel
const T3 = pz({ hx: 4, hy: 4, lean: .6, chest: .3, fl: [1.2, 1.2], bl: [-1.15, .1], fa: [1.55, 0], ba: [.4, 1.5], sword: .05, hat: 1 });
const T4 = pz({ hx: 2, hy: 2, lean: .1, chest: .35, fl: [.9, .7], bl: [-.95, .25], fa: [.3, .8], ba: [2.3, .3], sword: .9, hat: -1, flutter: 1 });
const T5 = pz({ hx: 3, hy: 4, lean: .45, chest: .5, fl: [1.1, 1.2], bl: [-1.05, .2], fa: [1.9, 0], ba: [-1.4, .2], sword: -.3, hat: 1, flutter: 1 });
const T6 = pz({ hx: 4, hy: 6, lean: .85, chest: .5, fl: [1.3, 1.95], bl: [-.15, 2.4], fa: [1.0, .1], ba: [.9, .3], sword: 1.0, hat: 1, flutter: 1 });
const STANCES = [
  pz({ hx: -1, hy: 3, lean: .12, chest: .08, fl: [.55, .8], bl: [-.45, .55], fa: [.6, 1.4], ba: [-.2, .6], sword: -1.3 }),
  pz({ hx: -1, hy: 4, lean: .2, chest: .1, fl: [.7, 1.1], bl: [-.6, .6], fa: [1.1, .9], ba: [.4, 1.7], sword: -.6 }),
  pz({ hy: 2, lean: -.02, chest: .12, fl: [.4, .5], bl: [-.4, .5], fa: [.2, .3], ba: [-.3, .2], sword: 1.9, hat: 1 }),
  pz({ hx: -2, hy: 5, lean: .35, chest: .05, fl: [.9, 1.5], bl: [-.5, 1.1], fa: [1.4, .1], ba: [-.6, 1.0], sword: .3 }),
];
const BREATH = [0, 0, .3, .7, 1, 1, 1, .7, .3, 0, 0, 0, .2, .5, .2, 0];
export const TANTO = { id: 'tanto', name: 'Twin tanto', about: 'Two short blades at the obi: tight, fast cuts up close, the lead hand first and the back hand answering in a reverse grip.', art: ART,
  reach: .8, weight: { stop: .7, shake: 1 },
  poses: {
    ...Object.fromEntries(STANCES.map((q, k) => ['ready' + k, BREATH.map((b, i) => pz({ ...q, breath: b, flutter: i === 5 || i === 13 ? 1 : 0 }))])),
    ready: BREATH.map((b, i) => pz({ ...GUARD, breath: b, flutter: i === 5 || i === 13 ? 1 : 0 })),
    slash1: keyed([[0, pz({ fa: HILT, ba: [-.1, .6] })], [.09, WIND], ...TAIL], 30),
    slash1r: keyed([[0, GUARD], [.09, WIND], ...TAIL], 30),
    slash2: keyed([[0, CUT],
      [.08, pz({ hx: 1, hy: 5, lean: .35, chest: -.3, fl: [.8, 1.3], bl: [-.8, .4], fa: [1.0, .6], ba: [-.6, 1.4], sword: -.4 })],
      [.14, pz({ ...HOOK, chest: .2, ba: [1.2, .8] }), lin], [.2, HOOK], [.34, pz({ ...HOOK, lean: .46 })], [.5, GUARD]], 30),
    slash3: keyed([[0, HOOK],
      [.07, pz({ hx: 1, hy: 4, lean: .15, chest: -.35, fl: [.8, 1.1], bl: [-.8, .4], fa: [.6, 1.6], ba: [.3, 1.6], sword: .1 })],
      [.12, pz({ ...T3, hx: 3, fa: [1.3, .4] }), lin], [.16, T3], [.34, pz({ ...T3, fa: [1.5, .05] })], [.5, GUARD]], 30),
    slash4: keyed([[0, T3],
      [.07, pz({ hx: 2, hy: 5, lean: .45, chest: -.2, fl: [1.0, 1.4], bl: [-.9, .4], fa: [.8, .9], ba: [-.3, .5], sword: .6 })],
      [.13, pz({ ...T4, hy: 3, lean: .25, ba: [1.4, .5] }), lin], [.18, T4], [.34, pz({ ...T4, lean: .08 })], [.5, GUARD]], 30),
    slash5: keyed([[0, T4],
      [.07, pz({ hx: 1, hy: 3, lean: .2, chest: -.4, fl: [.8, .9], bl: [-.85, .35], fa: [-.2, 1.4], ba: [1.2, 1.2], sword: -2.4 })],
      [.13, pz({ ...T5, chest: .2, fa: [1.3, .3], sword: .4 }), lin], [.17, T5], [.34, pz({ ...T5, lean: .42 })], [.5, GUARD]], 30),
    slash6: keyed([[0, T5],
      [.06, pz({ hx: -1, hy: 4, lean: .05, chest: -.3, fl: [.7, 1.1], bl: [-.8, .5], fa: [.8, 1.6], ba: [.6, 1.8], sword: -1.6 })],
      [.13, pz({ hy: -1, lean: -.2, chest: -.4, fl: [.9, 1.7], bl: [-.1, 1.5], fa: [2.8, .3], ba: [2.9, .5], sword: -2.2, hat: -1, flutter: 1 })],
      [.2, pz({ ...T6, hy: 3, lean: .55, fl: [1.2, 1.5], bl: [-.4, 1.8], fa: [1.8, 0], ba: [1.7, .2], sword: .1 }), lin],
      [.24, T6], [.45, pz({ ...T6, lean: .8 })], [.6, GUARD]], 30),
  },
};
