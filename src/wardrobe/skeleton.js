import { NEAR_ARM_Z } from '../rig/rig.js';

// ---- The skeleton clothing hangs from: joints in 3D (x right, y up, z toward the camera), from rig v2 (prototypes/19) ----
// Today every frame is a side pose, so the wardrobe solves it at yaw 0. The port system for the front and back views
// swaps in rig v2's pose and facing here; the items are measured from these bones and need no change.
export const TAU = Math.PI * 2;
export const V = {
  add: (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]],
  sub: (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]],
  mul: (a, k) => [a[0] * k, a[1] * k, a[2] * k],
  dot: (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2],
  len: a => Math.hypot(a[0], a[1], a[2]),
  norm: a => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; },
  lerp: (a, b, k) => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k],
  cross: (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]],
};
export const UP = [0, 1, 0];
// a frame: F forward, U up, R his right. Yaw 0 faces screen-right, 90° faces the camera. Pitch tips F and U forward.
function frame(yaw, pitch = 0) {
  const c = Math.cos(pitch), s = Math.sin(pitch), fx = Math.cos(yaw), fz = Math.sin(yaw);
  return { F: [fx * c, -s, fz * c], U: [fx * s, c, fz * s], R: [-fz, 0, fx] };
}
const loc = (fr, o, a, u, b) => [o[0] + fr.F[0] * a + fr.U[0] * u + fr.R[0] * b, o[1] + fr.F[1] * a + fr.U[1] * u + fr.R[1] * b, o[2] + fr.F[2] * a + fr.U[2] * u + fr.R[2] * b];
// a limb direction: th swings forward (0 = straight down), sp spreads it out to side s
const limbDir = (fr, th, sp, s) => { const c = Math.cos(th), st = Math.sin(th);
  return [fr.F[0] * st + (-UP[0] * Math.cos(sp) + fr.R[0] * s * Math.sin(sp)) * c, fr.F[1] * st - Math.cos(sp) * c, fr.F[2] * st + fr.R[2] * s * Math.sin(sp) * c]; };

// the side rig's pose in rig v2's terms: near side is his right (fl→rl, fa→ra), far side his left (bl→ll, ba→la).
// No spread and no yaws, so the bones land on the pixels the side rig draws.
export const fromSide = p => ({ ...p, hipYaw: 0, twist: 0, headYaw: 0,
  rl: [p.fl[0], p.fl[1], 0, .3], ll: [p.bl[0], p.bl[1], 0, .3], ra: [p.fa[0], p.fa[1], 0], la: [p.ba[0], p.ba[1], 0] });

const SHW = 2.7;   // shoulder half-width
// flat: the side rig draws both shoulders on his spine, so the arms sit there too and only carry their depth (dz):
// the far arm behind his body, the near arm at the rig's own depth, over everything he wears
export function solve(p, yaw = 0, flat = false) {
  const yh = yaw + p.hipYaw, yc = yh + p.twist, yd = yc + p.headYaw;
  const Hy = frame(yh), Cy = frame(yc), Hd = frame(yd), Hh = frame(yh, p.lean), Hc = frame(yc, p.lean + p.chest);
  const pelvis = loc(Hy, [0, 0, 0], p.hx, 11 - p.hy, 0), waist = loc(Hh, pelvis, 0, 4, 0);
  const Lh = (u, v, b) => loc(Hh, pelvis, v, u, b);
  const Lc = (u, v, b) => { const q = loc(Hc, waist, v, u - 4, b); if (u > 4) q[1] += p.breath * Math.min(1, (u - 4) / 3); return q; };
  const J = { p, yaw, Hy, Cy, Hd, Hh, Hc, pelvis, waist, Lh, Lc, neck: Lc(8.2, 0, 0), arm: {}, leg: {} };
  J.L = (u, v, b) => u <= 4 ? Lh(u, v, b) : Lc(u, v, b);     // the side rig's L(): the hips below the waist, the chest above
  for (const s of [1, -1]) {
    const k = s > 0 ? 'r' : 'l', [th, el, sp] = p[k + 'a'];
    const sh = Lc(7, 0, flat ? 0 : s * SHW), e = V.add(sh, V.mul(limbDir(Cy, th, sp, s), 4)), h = V.add(e, V.mul(limbDir(Cy, th + el, sp, s), 4));
    J.arm[k] = { s, sh, el: e, hand: h, dz: flat ? (s > 0 ? NEAR_ARM_Z : -SHW) : 0, col: Cy.R[2] * s < -.35 ? 'D' : 'K' };
    const [lt, kn, lsp] = p[k + 'l'];
    const hip = Lh(0, 0, s * 1.2), knee = V.add(hip, V.mul(limbDir(Hy, lt, lsp, s), 5)), ank = V.add(knee, V.mul(limbDir(Hy, lt - kn, lsp, s), 6));
    J.leg[k] = { hip, knee, ank };
  }
  J.cols = ['r', 'l'].flatMap(k => [[J.leg[k].hip, J.leg[k].knee], [J.leg[k].knee, J.leg[k].ank]]);   // the legs, for the cloth
  return J;
}
