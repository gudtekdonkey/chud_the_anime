import { pz } from 'ronin-engine/rig/pose.js';

// ---- Moves the side rig cannot show, posed on the rig and drawn turned (owner: "why not use our rigging system") ----
// A pose's yaw turns the whole figure (port.js DIRS: 90° faces the camera, 270° shows his back); v2 passes rig v2 knobs through
// port(): leg [swing, knee, spread, toe-out], arm [swing, elbow, spread]. These replace the hand-drawn rows, so every outfit,
// weapon and personality dresses them like any other frame.
const S = Math.PI / 2, N = Math.PI * 1.5;
const BOB = [0, 0, 0, 1, 1, 1, 1, 0];   // the stances' slow breath: the chest rises for four beats, the mantle stirs at the top

// opened to the camera: feet wide, the blade hanging point-down from his right hand, the left hand loose at his side
const OPEN = pz({ hy: 2, lean: .04, fl: [.08, .3], bl: [-.08, .3], fa: [.35, .25], ba: [-.05, .3], sword: 1.45 });
const OPEN_V2 = { rl: [.08, .3, .42, .5], ll: [-.08, .3, .42, .5], ra: [.35, .25, .28], la: [-.05, .3, .32] };
// the same stance, the left hand raised and open, inviting him in
const INVITE_V2 = { ...OPEN_V2, la: [.3, .7, 1.3] };
const stance = v2 => BOB.map((b, i) => pz({ ...OPEN, breath: b * .8, flutter: i === 5 || i === 6 ? 1 : 0, yaw: S, v2 }));

// the monk sit, his back to the camera: hips on the floor, thighs spread and forward, shins crossed under, hands on his knees;
// the katana is off his hip and set down beside him (empty)
const SIT = pz({ empty: true, hy: 9, lean: .06, fl: [1.45, 2.7], bl: [1.45, 2.7], fa: [.55, .75], ba: [.55, .75] });
const SIT_V2 = { laid: true, rl: [1.45, 2.7, 1.05, .9], ll: [1.45, 2.7, 1.05, .9], ra: [.55, .75, .45], la: [.55, .75, .45] };
const sit = (b, over = {}) => pz({ ...SIT, breath: b, yaw: N, v2: SIT_V2, ...over });
// standing with his back to the camera, and halfway down (knees bent wide, hands reaching for his knees)
const BACK = pz({ yaw: N });
const HALF = pz({ hy: 5, lean: .25, fl: [.9, 1.8], bl: [.9, 1.8], fa: [.5, .6], ba: [.5, .6], yaw: N,
  v2: { rl: [.9, 1.8, .7, .6], ll: [.9, 1.8, .7, .6], ra: [.5, .6, .35], la: [.5, .6, .35] } });

export const TURNED = {
  ready4: stance(OPEN_V2),
  ready5: stance(INVITE_V2),
  sit: BOB.map(b => sit(b * .9)),
  sitDown: [BACK, HALF, sit(0, { hy: 8 }), sit(0)],
  standUp: [sit(0, { hy: 8 }), HALF, BACK, pz({ fa: [.3, .5] })],   // the last frame is side on again: back on the side rig
};
