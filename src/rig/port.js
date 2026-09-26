// ---- The port: any side-view pose (src/rig/pose.js) becomes a rig v2 pose, so every move plays in all eight directions ----
// Nothing is redrawn by hand. The side pose carries the angles; the port adds what a side view cannot show:
// the hips turn with the stride, the chest turns into the sword arm, the head stays on the target, knees open in a deep bend,
// a hand on the hilt reaches for the real hilt. A move that needs more can pass overrides for any rig v2 knob.
// rig v2's resting pose (prototypes/19, and the wardrobe's skeleton): leg [swing, knee, spread, toe-out], arm [swing, elbow, spread],
// ik [forward, up, lateral, weight, frame 0 hips / 1 chest]. Kept here so the port needs nothing else.
const REST = { hx: 0, hy: 0, lean: .04, chest: 0, hipYaw: 0, twist: 0, headYaw: 0, breath: 0,
  rl: [.1, .08, .07, .3], ll: [-.1, .04, .07, .3], ra: [.12, .18, .1], la: [-.08, .12, .1],
  rik: [0, 0, 0, 0, 0], lik: [0, 0, 0, 0, 0], sword: null, swordYaw: 0, lsword: null, lswordYaw: 0, sheathing: false, hat: 0 };
export const HILT_IK = [4.3, 2.3, -1.9, 1, 0];          // the right hand reaching the sheathed hilt at his left hip
const pz = o => ({ ...REST, ...o });

export const HILT1 = [.42, 1.0];                         // the side rig's "front hand on the hilt"
export const DIRS = [                                    // screen facings, rig v2 yaw: 0 faces screen-right, 90° faces the camera
  ['E', 0], ['SE', 45], ['S', 90], ['SW', 135], ['W', 180], ['NW', 225], ['N', 270], ['NE', 315]].map(([id, deg]) => ({ id, yaw: deg * Math.PI / 180 }));
const cl = (v, a, b) => Math.max(a, Math.min(b, v));
const near = (a, b) => Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) < .12;

export function port(p, over = {}) {
  if (!p) return null;
  const onHilt = p.sword == null && !p.sheathing && near(p.fa, HILT1);
  // the feet a little apart (rig v2 rests at .07, which from the front puts a stride's two legs on one line),
  // and a deep bend opens the knee outward instead of folding it through the body
  const open = kn => .15 + .14 * Math.max(0, kn - 1.2);
  const q = pz({
    hx: p.hx, hy: p.hy, lean: p.lean, chest: p.chest, breath: p.breath, hat: p.hat || 0,
    rl: [p.fl[0], p.fl[1], open(p.fl[1]), .3], ll: [p.bl[0], p.bl[1], open(p.bl[1]), .3],
    ra: [p.fa[0], p.fa[1], .1], la: [p.ba[0], p.ba[1], .1],
    sword: p.sword, lsword: p.bsword, sheathing: !!p.sheathing,
    rik: onHilt ? HILT_IK : [0, 0, 0, 0, 0],
  });
  q.bow = p.bow || 0; q.dim = p.dim || 0; q.empty = !!p.empty;
  // the hips follow the stride: the leading leg brings its hip round
  q.hipYaw = cl(-.1 * (p.fl[0] - p.bl[0]), -.25, .25);
  // the chest turns into whichever arm carries a blade: reaching forward turns that shoulder toward the target
  if (p.sword != null) q.twist = cl(-.14 * (p.fa[0] - .6), -.45, .45);
  else if (p.bsword != null) q.twist = cl(.14 * (p.ba[0] - .6), -.45, .45);
  // the head stays on the target: it takes back most of the turn below it
  q.headYaw = -.75 * (q.hipYaw + q.twist);
  return Object.assign(q, over);
}
