// ---- Hair's low-poly pieces, measured from the scalp (contract.js SCALP, in centre space): shells laid over the
// head, knots, tufts, spikes, buns, loops, and the segments a chain (a tail, a braid, a loose lock) is made of. Each
// returns a Piece (gfx/build.js: flat-shaded, colour per vertex) the head slot puts on a bone.
import * as THREE from 'three';
import { piece } from 'ronin-engine/render/gfx/build.js';
import { SCALP } from './contract.js';

const TAU = Math.PI * 2;
// the scalp's arcs, by where they centre (SphereGeometry's phi: 0 at −x, π/2 at +z)
export const ARC = { back: 1.5 * Math.PI, front: .5 * Math.PI, left: Math.PI, right: 0 };
const _q = new THREE.Quaternion(), _e = new THREE.Euler(), _a = new THREE.Vector3(), _b = new THREE.Vector3();

// a shell over the scalp: thickness t, from theta th[0] to th[1] (0 = the crown, π/2 = the ears' height), round
// `arc` = [centre, half-width] (all round when omitted); `lift` raises it (volume on the crown), `sx` widens it
export function shell(pc, col, { t = .14, th = [0, .5], arc, lift = 0, sx = 1, seg = 16 }) {
  const [c, w] = arc || ['back', Math.PI], n = Math.max(3, Math.round(seg * w / Math.PI));
  const g = new THREE.SphereGeometry(1, n, Math.max(2, Math.round((th[1] - th[0]) * 10)), ARC[c] - w, 2 * w, th[0] * Math.PI, (th[1] - th[0]) * Math.PI);
  return pc.add(g, col, { p: [0, lift, 0], s: [(SCALP[0] + t) * sx, SCALP[1] + t, SCALP[2] + t] });
}
// a point on the scalp's surface (plus `out`), at theta, phi measured from the back toward his left (+x)
export function onScalp(th, ph, out = 0) {
  const s = Math.sin(th * Math.PI), c = Math.cos(th * Math.PI);
  return [(SCALP[0] + out) * s * Math.sin(ph), (SCALP[1] + out) * c, -(SCALP[2] + out) * s * Math.cos(ph)];
}
// a rotation that turns +y onto `dir`
export function along(dir) { _a.set(...dir).normalize(); _q.setFromUnitVectors(_b.set(0, 1, 0), _a); _e.setFromQuaternion(_q); return [_e.x, _e.y, _e.z]; }
const mid = (at, dir, len) => { const d = _a.set(...dir).normalize(); return [at[0] + d.x * len / 2, at[1] + d.y * len / 2, at[2] + d.z * len / 2]; };
// a cylinder or cone from `at` along `dir`
export const rod = (pc, col, at, dir, len, r0, r1 = r0, seg = 6) => pc.cyl(r1, r0, len, seg, col, { p: mid(at, dir, len), r: along(dir) });
export const spike = (pc, col, at, dir, len, r) => pc.cyl(0, r, len, 4, col, { p: mid(at, dir, len), r: along(dir) });
export const lump = (pc, col, at, r, s = [1, 1, 1]) => pc.ball(r, col, { p: at, s }, 0);
export function loop(pc, col, at, R, tube, rot, arc = TAU) { return pc.add(new THREE.TorusGeometry(R, tube, 4, 8, arc), col, { p: at, r: rot }); }

// ---- the segments of a chain, each built hanging along −y from its joint: round (a tail), flat (a sheet of loose
// hair), braid (alternating lumps), lock (a thin strand). w is the width at its top and bottom; d its depth.
export function segment(kind, col, colHi, len, w0, w1, d, last, tip) {
  const pc = piece();
  if (kind === 'braid') { const n = Math.max(2, Math.round(len / .55));
    for (let i = 0; i < n; i++) { const u = (i + .5) / n, w = w0 + (w1 - w0) * u; pc.ball(w * .62, i % 2 ? col : colHi, { p: [(i % 2 ? .08 : -.08), -len * u, 0], s: [1, 1.15, .9] }, 0); } }
  else if (kind === 'flat') pc.box((w0 + w1) / 2, len + .08, d, col, { p: [0, -len / 2, 0] }).box((w0 + w1) / 2 * .55, len + .1, d + .04, colHi, { p: [0, -len / 2, -.02] });
  else pc.cyl(w0 / 2, w1 / 2, len + .06, kind === 'lock' ? 4 : 6, col, { p: [0, -len / 2, 0], s: [1, 1, d / Math.max(w0, w1)] });
  if (last && tip === 'point') pc.cyl(0, w1 / 2, Math.max(.35, w1 * .9), 5, col, { p: [0, -len - Math.max(.35, w1 * .9) / 2 + .02, 0], r: [Math.PI, 0, 0], s: [1, 1, d / Math.max(w0, w1)] });
  if (last && tip === 'brush') for (const x of [-.3, 0, .3]) pc.cyl(0, Math.max(.12, w1 * .3), .7, 4, col, { p: [x * w1, -len - .3, 0], r: [Math.PI, 0, 0] });
  if (last && tip === 'fringe') for (let i = -2; i <= 2; i++) pc.cyl(0, (w1 / 5) * .55, .6 + .15 * (i & 1), 4, i & 1 ? colHi : col, { p: [i * w1 / 5, -len - .25, 0], r: [Math.PI, 0, 0], s: [1, 1, d / (w1 / 5)] });
  return pc;
}
