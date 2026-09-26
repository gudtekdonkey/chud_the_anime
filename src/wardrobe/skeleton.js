import { NEAR_ARM_Z } from '../rig/rig.js';

// ---- The skeleton clothing hangs from: joints in 3D (x right, y up, z toward the camera), from rig v2 (prototypes/19) ----
// From the side the wardrobe solves fromSide(p) flat at yaw 0, on the side rig's pixels. Every other facing solves
// port(p) (src/rig/port.js) at the facing's yaw; the items are measured from these bones and need no change.
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
// two-bone reach: the elbow bends toward the pole
function ik2(S, T, l1, l2, pole) {
  let d = V.sub(T, S); const L = Math.min(V.len(d), l1 + l2 - .01); d = V.norm(d);
  const a = (l1 * l1 - l2 * l2 + L * L) / (2 * L), h = Math.sqrt(Math.max(0, l1 * l1 - a * a));
  let q = V.sub(pole, V.mul(d, V.dot(pole, d))); q = V.norm(q);
  return [V.add(V.add(S, V.mul(d, a)), V.mul(q, h)), V.add(S, V.mul(d, L))];
}
// flat: the side rig draws both shoulders on his spine, so the arms sit there too and only carry their depth (dz):
// the far arm behind his body, the near arm at the rig's own depth, over everything he wears.
// Not flat (the port's facings, src/rig/port.js): rig v2's own skeleton, shoulders apart, hands that reach (rik / lik),
// the head, the scabbard mouth and the blades' directions, for src/rig/body3d.js.
export function solve(p, yaw = 0, flat = false) {
  const yh = yaw + p.hipYaw, yc = yh + p.twist, yd = yc + p.headYaw;
  const Hy = frame(yh), Cy = frame(yc), Hd = frame(yd), Hh = frame(yh, p.lean), Hc = frame(yc, p.lean + p.chest);
  const pelvis = loc(Hy, [0, 0, 0], p.hx, 11 - p.hy, 0), waist = loc(Hh, pelvis, 0, 4, 0);
  const Lh = (u, v, b) => loc(Hh, pelvis, v, u, b);
  const Lc = (u, v, b) => { const q = loc(Hc, waist, v, u - 4, b); if (u > 4) q[1] += p.breath * Math.min(1, (u - 4) / 3); return q; };
  const J = { p, yaw, flat, Hy, Cy, Hd, Hh, Hc, pelvis, waist, Lh, Lc, chest: Lc(7, 0, 0), neck: Lc(8.2, 0, 0), arm: {}, leg: {} };
  J.L = (u, v, b) => u <= 4 ? Lh(u, v, b) : Lc(u, v, b);     // the side rig's L(): the hips below the waist, the chest above
  J.head = V.add(Lc(10, 0, 0), V.mul(Hd.F, .6));
  if (p.bow) J.head = V.add(J.head, V.add(V.mul(Hd.F, p.bow * 1.1), [0, -p.bow * .7, 0]));   // a bowed head: forward and down (personalities)
  for (const s of [1, -1]) {
    const k = s > 0 ? 'r' : 'l', [th, el, sp] = p[k + 'a'];
    const sh = Lc(7, 0, flat ? 0 : s * SHW);
    let e = V.add(sh, V.mul(limbDir(Cy, th, sp, s), 4)), h = V.add(e, V.mul(limbDir(Cy, th + el, sp, s), 4));
    const ik = p[k + 'ik'];
    if (!flat && ik && ik[3] > .001) { const T = ik[4] > .5 ? Lc(ik[1], ik[0], ik[2]) : Lh(ik[1], ik[0], ik[2]);
      const pole = V.add(V.add(V.mul(Cy.F, -1), V.mul(Cy.R, s * .9)), [0, -.4, 0]);
      const [e2, h2] = ik2(sh, T, 4, 4, pole); e = V.lerp(e, e2, ik[3]); h = V.lerp(h, h2, ik[3]); }
    J.arm[k] = { s, sh, el: e, hand: h, dz: flat ? (s > 0 ? NEAR_ARM_Z : -SHW) : 0, col: Cy.R[2] * s < -.35 ? 'D' : 'K' };
    const [lt, kn, lsp, toe = .3] = p[k + 'l'];
    const hip = Lh(0, 0, s * 1.2), knee = V.add(hip, V.mul(limbDir(Hy, lt, lsp, s), 5)), ank = V.add(knee, V.mul(limbDir(Hy, lt - kn, lsp, s), 6));
    const fd = V.add(V.mul(Hy.F, Math.cos(toe)), V.mul(Hy.R, s * Math.sin(toe)));
    J.leg[k] = { s, hip, knee, ank, toe: V.add(ank, V.mul(fd, 2)), col: Hy.R[2] * s < -.35 ? 'D' : 'K' };
  }
  J.mouth = Lh(1.5, 2, -2.5);   // the scabbard's mouth at his left hip, and the scabbard's direction
  J.sd = V.norm(V.add(V.add(V.mul(Hy.F, -Math.cos(.32)), [0, -Math.sin(.32), 0]), V.mul(Hy.R, -.1)));
  const sw = (a, y) => { const f = V.add(V.mul(Cy.F, Math.cos(y)), V.mul(Cy.R, Math.sin(y))); return V.norm(V.add(V.mul(f, Math.cos(a)), [0, -Math.sin(a), 0])); };
  J.swordR = p.sword == null ? null : sw(p.sword, p.swordYaw || 0);
  J.swordL = (p.lsword ?? p.bsword) == null ? null : sw(p.lsword ?? p.bsword, p.lswordYaw || 0);
  J.cols = ['r', 'l'].flatMap(k => [[J.leg[k].hip, J.leg[k].knee], [J.leg[k].knee, J.leg[k].ank]]);   // the legs, for the cloth
  return J;
}
