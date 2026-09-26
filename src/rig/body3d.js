import { V, UP, TAU } from '../wardrobe/skeleton.js';
import { ring, bandLine } from '../wardrobe/raster.js';

// ---- The body from any facing: rig v2's body (prototypes/19), drawn from a solved skeleton into the wardrobe's Raster ----
// The side view keeps the side rig (rig.js); every other facing comes here, its pose from port() (port.js).
// st: { blink, bare (the samurai's scalp and topknot), hat (a hat is worn, so no hair), blade (the held blade's length, 0 for none) }
const KH = .05;   // the hat brim's flatter ellipse
const SECT = [[0, 2, -2, 2.3], [4, 2.1, -2.2, 2.2], [7, 2.3, -2.4, 2.8], [8.2, 1.4, -1.6, 1.8]];
function hull(P) {
  const p = P.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]); if (p.length < 3) return p;
  const cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]), lo = [], up = [];
  for (const q of p) { while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], q) <= 0) lo.pop(); lo.push(q); }
  for (let i = p.length - 1; i >= 0; i--) { const q = p[i]; while (up.length >= 2 && cr(up[up.length - 2], up[up.length - 1], q) <= 0) up.pop(); up.push(q); }
  return lo.slice(0, -1).concat(up.slice(0, -1));
}
export function drawBody3d(S, J, st) {
  const p = J.p, bl = st.blade ?? 13;
  // scabbard at the left hip
  { const tip = V.add(J.mouth, V.mul(J.sd, 12)); S.seg(J.mouth, tip, 1, 's'); const t = S.P(tip); S.dot(t[0], t[1], t[2], 1, 'S'); }
  for (const k of ['r', 'l']) { const L = J.leg[k]; S.seg(L.hip, L.knee, 2, L.col); S.seg(L.knee, L.ank, 2, L.col); S.seg(L.ank, L.toe, 1, L.col); }
  // torso: two hulls (hips to waist, waist to neck) so the chest can bend and twist off the hips
  const zT = (J.pelvis[2] + J.neck[2]) / 2;
  const sec = ([u, vf, vb, b], L) => ring(L, u, vf, vb, b, 12).map(q => S.P(q));
  S.poly(hull([...sec(SECT[0], J.Lh), ...sec(SECT[1], J.Lh)]), zT, 'K');
  S.poly(hull([...sec(SECT[1], J.Lc), ...sec(SECT[2], J.Lc), ...sec(SECT[3], J.Lc)]), zT, 'K');
  bandLine(S, J, 'h', 2.2, 2.1, -2.1, 2.4, 'D', .05);   // the belt line: the half of the ring that faces the camera
  if (J.Hc.F[2] > .3) for (const s of [1, -1]) S.seg(J.Lc(8.1, 2.1, s * 1.2), J.Lc(5.2, 2.2, s * .35), 1, 'D', .1);   // lapels, chest open to the camera
  for (const k of ['r', 'l']) { const A = J.arm[k]; S.seg(A.sh, A.el, 2, A.col, .1); S.seg(A.el, A.hand, 1, A.col, .1); const h = S.P(A.hand); S.dot(h[0], h[1], h[2] + .1, 2, A.col); }
  // head: a small block, sized by how much of its side or front we see
  const c = S.P(J.head), Hd = J.Hd, w = Math.max(3, Math.round(2 * (Math.abs(Hd.F[0]) * 1.9 + Math.abs(Hd.R[0]) * 2.3)));
  const x0 = Math.floor(c[0] - w / 2) + 1, cy = Math.round(c[1]), hz = J.head[2] + 1.2;
  for (let y = -1; y <= 1; y++) for (let x = 0; x < w; x++) S.px(x0 + x, cy + y, hz, 'K');
  if (!st.blink) { const seen = [];
    for (const s of [1, -1]) { const n = Hd.F[2] * .75 + Hd.R[2] * s * .66; if (n <= .12) continue;
      const e = S.P(V.add(V.add(J.head, V.mul(Hd.F, 1.8)), V.mul(Hd.R, s * 1.05)));
      let ex = Math.min(x0 + w - 1, Math.max(x0, Math.round(e[0]))); if (seen.includes(ex)) ex += ex > x0 ? -1 : 1; seen.push(ex);
      S.px(ex, cy, hz + .01, 'E'); } }
  if (st.bare) {   // the samurai's scalp and topknot
    for (let x = 1; x < w - 1; x++) S.px(x0 + x, cy - 2, hz, 'K');
    const kn = S.P(V.add(V.add(J.head, V.mul(Hd.F, -1.4)), [0, 3.2, 0])); S.dot(kn[0], kn[1], hz, 1, 'K');
    const k2 = S.P(V.add(V.add(J.head, V.mul(Hd.F, -2.3)), [0, 3.4, 0])); S.dot(k2[0], k2[1], hz, 1, 'D');
  } else if (!st.hat) {  // no hat: short tied hair at the back of the head
    for (let x = 0; x < w; x++) S.px(x0 + x, cy - 2, hz, 'K');
    const t = S.P(V.add(V.add(J.head, V.mul(Hd.F, -2.4)), [0, .6, 0])); S.dot(t[0], t[1], hz, 1, 'K'); S.dot(t[0] - Hd.F[0], t[1] + 1, hz, 1, 'K');
  }
  // a HELD blade is never hidden by the body, sash or mantle (owner rule): the top layer, the gripping hand redrawn over its hilt
  const TOP = 50;
  const blade = (A, d) => { const hand = A.hand; S.seg(hand, V.sub(hand, V.mul(d, 2.5)), 1, 'K', TOP);
    S.seg(V.add(hand, d), V.add(hand, V.mul(d, bl)), 1, 'W', TOP); const h = S.P(hand), g = S.P(V.add(hand, V.mul(d, 1.2)));
    S.dot(h[0], h[1], h[2] + TOP + 2, 2, A.col); S.dot(g[0], g[1], g[2] + TOP + 3, 1, 'S'); };
  if (J.swordR) blade(J.arm.r, J.swordR);
  if (J.swordL) blade(J.arm.l, J.swordL);
  if (p.sheathing) S.seg(J.arm.r.hand, J.mouth, 1, 'W', .3);
  else if (!J.swordR && !J.swordL && !p.empty) { const m = S.P(J.mouth); S.dot(m[0], m[1], m[2] + .2, 1, 'S'); S.seg(V.sub(J.mouth, J.sd), V.sub(J.mouth, V.mul(J.sd, 3.5)), 1, 'W', .2); }
}

// a hat from any facing: a crown and a brim of stacked ellipses, tilted and turned with the head
// spec: { sit, tilt, levels: [{ h, r, fill, edge, ew }] } (the wardrobe's `hat3d`)
export function drawHat3d(S, J, spec, bias = 0) {
  const Hd = J.Hd, t = (spec.tilt || 0) + (J.p.hat || 0) * .1, ct = Math.cos(t), sn = Math.sin(t);
  const up = V.add(V.mul(UP, ct), V.mul(Hd.F, sn)), fw = V.sub(V.mul(Hd.F, ct), V.mul(UP, sn));
  const base = V.add(V.add(J.head, V.mul(up, spec.sit || 3)), V.mul(Hd.F, (J.p.hat || 0) * .8)), hz0 = J.head[2], zBase = J.head[2] + 2.5 + bias;
  spec.levels.forEach((Lv, li) => {
    const c = V.add(base, V.mul(up, Lv.h)), rows = new Map();
    for (let k = 0; k < 72; k++) { const a = k / 72 * TAU, r = Lv.r;
      const q = V.add(V.add(c, V.mul(fw, r * Math.cos(a))), V.mul(Hd.R, r * Math.sin(a)));
      const x = S.ox + q[0], y = Math.round(S.oy - q[1] + hz0 * S.kz + (q[2] - hz0) * KH);
      const m = rows.get(y); if (m) { m[0] = Math.min(m[0], x); m[1] = Math.max(m[1], x); } else rows.set(y, [x, x]); }
    for (const [y, [a, b]] of rows) { const x0 = Math.floor(a) + 1, x1 = Math.floor(b), ew = Lv.ew || 1;
      for (let x = x0; x <= x1; x++) S.px(x, y, zBase + li * .01, x - x0 < ew || x1 - x < ew ? Lv.edge : Lv.fill); }
  });
}
