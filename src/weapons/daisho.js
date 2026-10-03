import { pz, lin, keyed } from 'ronin-engine/rig/pose.js';
import { POSES } from '../anims/poses.js';
import { KATANA_ART } from './katana.js';
import { WAKI_SAYA, waki } from './wakizashi.js';
import { KATANA_3D } from './art3d.js';

// ---- The daisho: the katana and the wakizashi worn together. The long blade leads as always; the short one comes out in the
//   back hand, and the answer cut is the back hand's ----
// the back hand holds the short sword whenever the long one is out in the front hand
const twin = p => p.sword !== null && !p.sheathing && p.bsword == null;
const ART = {
  ...KATANA_ART,
  d3: KATANA_3D,
  // both saya at the hip, the short one a pixel above the long; its hilt shows while it is home
  far(k, p, mouth, sd) { KATANA_ART.far(k, p, mouth, sd); const m = k.add(mouth, [0, -1], 1);
    k.seg(m, k.add(m, sd, WAKI_SAYA), 1, 's'); if (!twin(p)) { k.put(...m, 'S'); k.seg(k.add(m, sd, -1), k.add(m, sd, -2.5), 1, 'G'); } },
  // in the back fist, forward grip: along the forearm, tipped up a little at the wrist
  offHand(k, p, bh) { if (!twin(p)) return; const a = p.ba[0] + p.ba[1] + .5; waki(k, bh, [Math.sin(a), Math.cos(a)]); },
};
const GUARD = POSES.ready[0];
// the answer: the long blade drawn back to the hip as the short one sweeps across from the back hand, the chest turning into it
const HOOK = pz({ hx: 3, hy: 4, lean: .5, chest: .55, fl: [1.1, 1.3], bl: [-1.05, .2], fa: [-.2, .8], ba: [1.7, .1], sword: 2.4, hat: 1, flutter: 1 });
export const DAISHO = { id: 'daisho', name: 'Daisho', about: 'The katana and the wakizashi worn together at the hip. The long blade leads every cut; the short one rides in the back hand, and the answer cut is his.', art: ART,
  reach: 1, weight: { stop: 1.1, shake: 1.1 },
  poses: {
    slash2: keyed([[0, POSES.slash2[0]],
      [.08, pz({ hx: 1, hy: 5, lean: .35, chest: -.3, fl: [.8, 1.3], bl: [-.8, .4], fa: [.9, .6], ba: [-.6, 1.5], sword: .2 })],
      [.14, pz({ ...HOOK, chest: .2, ba: [1.1, .9] }), lin], [.2, HOOK], [.34, pz({ ...HOOK, lean: .46 })], [.5, GUARD]], 30),
  },
};
