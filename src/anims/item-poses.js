import { pz, HILT, lin, keyed } from 'ronin-engine/rig/pose.js';

// ---- Poses for the item interactions and the quick-slot uses (lifted from prototypes/20-items.html) ----
const hold = () => 0;   // stays on the first pose until the next key: a hard cut, no in-betweens
const STAND = pz({ fa: HILT, ba: [-.1, .3] }), IDLE = pz({ fa: [.15, .2] });
const quickSheathe = (t0, from) => [[t0, from], [t0 + .08, pz({ hy: 2, lean: .2, fa: [1.45, .05], sword: 1.2, ba: [-.4, .3] }), lin],
  [t0 + .2, pz({ hy: 1, lean: .12, fa: [1.0, .6], sheathing: true, ba: [.45, 1.1] })], [t0 + .34, pz({ hy: 1, lean: .06, fa: HILT, ba: [.3, 1.0] })], [t0 + .6, IDLE]];
// the shrine: kneel and pray
const KNEEL = pz({ hy: 6, lean: .2, chest: .08, fl: [1.2, 1.9], bl: [-.2, 2.3], fa: [.55, 2.1], ba: [.62, 2.0] });
// the grave blade: grip the hilt and pull it from the ground, a flick, sheathe
const REACH = pz({ hy: 3, lean: .32, chest: .12, fl: [.5, .8], bl: [-.45, .3], fa: [1.45, .05], ba: [1.2, .35] });
const PULL = pz({ hy: 0, lean: -.1, chest: -.22, fl: [.3, .2], bl: [-.35, .2], fa: [2.95, .05], ba: [.35, .55], sword: -1.5, flutter: 1 });
const FLICK = pz({ hx: 1, hy: 3, lean: .35, chest: .25, fl: [.7, 1.0], bl: [-.7, .3], fa: [1.2, .1], sword: 1.0, ba: [-.6, .3], hat: 1 });
// the chest: one draw through the seal
const DRAW = pz({ hy: 3, lean: .35, chest: .1, fl: [.7, 1.1], bl: [-.6, .4], fa: HILT, ba: [-.05, .8] });
const CUT = pz({ hx: 2, hy: 4, lean: .55, chest: .45, fl: [1.05, 1.2], bl: [-1.05, .1], fa: [1.25, .1], sword: .9, ba: [-1.3, .1], hat: 1, flutter: 1 });
// the tablet: a palm on the stone
const PALM = pz({ hy: 1, lean: .15, chest: .05, fl: [.4, .5], bl: [-.4, .3], fa: [1.55, -.05], ba: [-.2, .3] });
// quick slots
const THROW_UP = pz({ hy: 1, lean: -.05, chest: -.1, fl: [.3, .3], bl: [-.3, .2], fa: [2.7, .35], ba: [-.3, .3] });
const THROW_DN = pz({ hx: 1, hy: 4, lean: .42, chest: .3, fl: [.75, 1.1], bl: [-.6, .4], fa: [.55, .1], ba: [-.7, .3], hat: 1, flutter: 1 });
const CROUCH_L = pz({ hy: 5, lean: .45, chest: .2, fl: [1.1, 1.7], bl: [-.5, 1.2], fa: HILT, ba: [-.2, .6] });
const RAISE = pz({ hy: 0, lean: -.08, chest: -.12, fl: [.25, .25], bl: [-.35, .2], fa: [3.0, 0], ba: [.25, .45], flutter: 1 });
const HONE = pz({ hy: 2, lean: .06, chest: -.05, fl: [.3, .4], bl: [-.35, .3], fa: [1.4, .2], sword: -.02, ba: [1.25, .5] });
const ADMIRE = pz({ hy: 1, lean: .02, chest: -.1, fl: [.3, .35], bl: [-.35, .3], fa: [1.9, .35], sword: -.62, ba: [.2, .5] });
const KNEEL_P = pz({ hy: 6, lean: .38, chest: .15, fl: [1.2, 1.9], bl: [-.2, 2.3], fa: [.95, .15], ba: [.3, .6] });
const KNEEL_R = pz({ hy: 6, lean: .15, chest: .05, fl: [1.2, 1.9], bl: [-.2, 2.3], fa: [.5, 1.3], ba: [.4, 1.1] });
// Harvest: feet planted, palms open and low, letting it come to him (side view until the 8-direction rig can turn him north)
const OPEN = pz({ hy: 1, lean: -.04, chest: -.1, fl: [.3, .3], bl: [-.3, .25], fa: [.75, .35], ba: [.55, .4] });
const BR = [0, .1, .3, .6, .85, 1, 1, .85, .6, .3, .1, 0];

export const ITEM_FPS = { pray: 20, take: 30, cutSeal: 30, read: 20, bomb: 30, talisman: 30, whet: 30, incense: 20, harvest: 8 };
const F = ITEM_FPS;
export const ITEM_POSES = {
  pray: keyed([[0, STAND], [.14, KNEEL], [1.4, pz({ ...KNEEL, breath: 1 })], [1.62, STAND]], F.pray),
  take: keyed([[0, REACH], [.1, PULL, hold], [.12, PULL], [.7, pz({ ...PULL, breath: 1 })], [.78, FLICK, lin], [.86, FLICK], ...quickSheathe(.86, FLICK).slice(1)], F.take),
  cutSeal: keyed([[0, DRAW], [.08, CUT, hold], [.1, CUT], [.45, pz({ ...CUT, lean: .5, chest: .4, flutter: 0 })], ...quickSheathe(.45, CUT).slice(1)], F.cutSeal),
  read: keyed([[0, STAND], [.1, PALM], [1.15, pz({ ...PALM, breath: 1 })], [1.35, STAND]], F.read),
  bomb: keyed([[0, THROW_UP], [.07, THROW_DN, hold], [.32, CROUCH_L, hold], [.7, CROUCH_L], [.95, STAND]], F.bomb),
  talisman: keyed([[0, RAISE], [.02, RAISE], [.45, pz({ ...RAISE, breath: 1 })], [.7, STAND]], F.talisman),
  // shorter than the study's, so a use stays under a second: he keeps the honed blade out and goes to guard
  whet: keyed([[0, DRAW], [.08, HONE, hold], [.1, HONE], [.5, HONE], [.58, ADMIRE, lin], [.8, pz({ ...ADMIRE, breath: 1 })]], F.whet),
  incense: keyed([[0, STAND], [.12, KNEEL_P], [.25, KNEEL_P], [.36, KNEEL_R], [1.8, pz({ ...KNEEL_R, breath: 1 })], [2.02, STAND]], F.incense),
  harvest: BR.map((b, i) => pz({ ...OPEN, breath: b, fa: [.75 + b * .08, .35], ba: [.55 + b * .08, .4], flutter: i === 4 || i === 5 ? 1 : 0 })),
};
