// ---- Iron Ash V3 in 3D, procedural: a placeholder a 3D artist replaces (docs/iso-slice.md). The iron jingasa with its
// ridge ring, ribs, knob and lit lip; the F1 menpō with two cyan eyes; a dō of laced plates; kusazuri hinged at the
// waist; sode on both shoulders; kote; suneate; the indigo jinbaori with its back mon; hakama tied in at the shin; straw
// sandals; the katana in a black saya at his left hip. `foe: true` builds the samurai in the same language: red lacquer,
// bare-headed with a topknot, no hat or jinbaori. Sizes follow the Animation Flow rig (rig.js SK), in world units.
import * as THREE from 'three';
import { piece, newPart } from 'ronin-engine/iso/gfx/build.js';
import { RAMP as R } from 'ronin-engine/iso/gfx/palette.js';
import { shadeMat } from 'ronin-engine/iso/gfx/shade.js';
import { makeSkeleton, SK } from 'ronin-engine/iso/rig3d.js';
import { BODY_SHEAR } from 'ronin-engine/iso/gfx/view.js';

const node = (parent, p = [0, 0, 0], r = [0, 0, 0]) => { const o = new THREE.Object3D(); o.position.set(...p); o.rotation.set(...r); parent.add(o); return o; };
export const HAT_R = 9.5;                 // the brim as drawn (KASA R 19 rig px): wider than he is tall

export function makeRonin({ foe = false, pal = null } = {}) {   // pal: an enemy type's colours over the samurai's (enemies/model.js)
  const obj = foe ? 2 : 1, mat = shadeMat({ obj, stencil: true }), cloth = shadeMat({ obj, stencil: true, side: THREE.DoubleSide });
  const meshes = [], put = (bone, pc, m = mat) => { const me = pc.mesh(m); bone.add(me); meshes.push(me); return me; };
  const C = foe
    ? { p1: R.l[0], p2: R.l[1], p3: R.l[2], hi: R.l[3], lace: R.b[3], cloth: R.b[4], clothD: R.b[3], cloth2: R.b[2], skin: '#5a463a', hair: R.k[1] }
    : { p1: R.i[4], p2: R.i[5], p3: R.i[6], hi: R.i[8], lace: R.v[5], cloth: R.c[4], clothD: R.c[3], cloth2: R.c[2] };
  if (pal) Object.assign(C, pal);

  const root = new THREE.Object3D();                        // on the floor at his feet; the controller's frame moves it
  const shear = node(root); shear.matrixAutoUpdate = false;  // the bodies' camera (view.js BODY_SHEAR)
  const body = node(shear);                                  // turns to his facing
  const B = makeSkeleton(body);
  const rig = { root, shear, body, B, meshes, mats: [mat, cloth], springs: [], eyes: [], hatTilt: 14 * Math.PI / 180 };

  // ---- hips: hakama waist, obi, six kusazuri on hinges, the saya ----
  newPart(); put(B.hips, piece().cyl(2.0, 2.25, 2.2, 8, C.clothD, { p: [0, -.45, 0], s: [1, 1, .8] }));
  newPart(); put(B.hips, piece().cyl(2.12, 2.12, .7, 8, foe ? R.b[2] : R.v[3], { p: [0, .55, 0], s: [1, 1, .8] }));
  for (const [ang, w] of [[.5, 1.9], [-.5, 1.9], [1.5, 1.8], [-1.5, 1.8], [Math.PI - .55, 2.0], [Math.PI + .55, 2.0]]) {
    const side = Math.abs(Math.abs(ang) - 1.5) < .2, yaw = node(B.hips, [0, .4, 0], [0, ang, 0]), hinge = node(yaw, [0, 0, side ? 1.95 : 1.7], [-.2, 0, 0]);
    newPart(); const pc = piece().box(w, 1.55, .28, C.p2, { p: [0, -.85, 0] }).box(w * .96, .26, .32, C.lace, { p: [0, -1.72, .02] });
    newPart(); pc.box(w * .94, 1.45, .28, C.p1, { p: [0, -2.55, .05] }); put(hinge, pc);
    rig.springs.push({ node: hinge, rest: -.2, ang, kind: 'plate' });
  }
  const saya = node(B.hips, [1.9, .6, 1.1]); rig.saya = saya;
  newPart(); put(saya, piece().box(.48, .62, 10.5, R.k[2], { p: [0, 0, -5.25] }).box(.56, .7, .45, R.i[6], { p: [0, 0, -.2] }).box(.56, .7, .5, R.i[5], { p: [0, 0, -10.4] }));
  newPart(); put(saya, piece().box(.58, .2, 2.0, foe ? R.b[7] : R.m[3], { p: [0, .3, -1.5] }));     // the sageo cord

  // ---- the dō: laced plates from the obi to the chest ----
  newPart(); put(B.spine, piece().cyl(2.2, 2.05, 1.15, 8, C.p1, { p: [0, 1.45, 0], s: [1, 1, .8] }).cyl(2.25, 2.25, .22, 8, C.lace, { p: [0, 2.1, 0], s: [1, 1, .81] }));
  newPart(); put(B.spine, piece().cyl(2.4, 2.25, 1.2, 8, C.p2, { p: [0, 2.8, 0], s: [1, 1, .8] }).cyl(2.45, 2.45, .22, 8, C.lace, { p: [0, 3.45, 0], s: [1, 1, .81] }));
  newPart(); put(B.chest, piece().cyl(2.6, 2.45, 1.25, 8, C.p2, { p: [0, .75, 0], s: [1, 1, .8] }));
  newPart(); put(B.chest, piece().cyl(2.55, 2.6, 1.2, 8, C.p3, { p: [0, 1.95, 0], s: [1, 1, .8] }).box(3.0, .8, .36, C.hi, { p: [0, 2.15, 1.98] }));
  if (foe) { newPart(); put(B.chest, piece().box(4.9, .55, 3.2, C.p1, { p: [0, 2.95, 0] })); }
  // ---- the jinbaori: indigo, sleeveless, the mon on the back; its lower panels hang on hinges ----
  if (!foe) {
    newPart(); put(B.chest, piece().box(6.1, .6, 4.1, R.v[6], { p: [0, 3.0, -.1] }).box(5.5, 3.5, .36, R.v[5], { p: [0, 1.15, -2.12] }), cloth);
    newPart(); put(B.chest, piece().box(1.55, 3.5, .34, R.v[5], { p: [1.95, 1.15, 1.98] }).box(1.55, 3.5, .34, R.v[5], { p: [-1.95, 1.15, 1.98] }), cloth);
    newPart(); put(B.chest, piece().cyl(1.0, 1.0, .1, 8, R.v[9], { p: [0, 1.6, -2.32], r: [Math.PI / 2, 0, 0] }).cyl(.5, .5, .12, 8, R.v[4], { p: [0, 1.6, -2.34], r: [Math.PI / 2, 0, 0] }), cloth);
    for (const [x, z, w, len, out] of [[1.42, -2.15, 2.84, 5.4, 1], [-1.42, -2.15, 2.84, 5.4, 1], [1.95, 2.0, 1.55, 5.0, -1], [-1.95, 2.0, 1.55, 5.0, -1]]) {
      const h = node(B.chest, [x, -.65, z], [.08 * out, 0, 0]);
      newPart(); put(h, piece().box(w, len, .34, R.v[5], { p: [0, -len / 2, 0] }).box(w, .3, .38, R.v[3], { p: [0, -len + .2, 0] }), cloth);
      rig.springs.push({ node: h, rest: .08 * out, out, kind: 'cloth', side: x });
    }
  }
  // ---- neck, head, the menpō (F1) and the eyes ----
  newPart(); put(B.neck, piece().cyl(.75, .85, 1.1, 6, C.cloth2, { p: [0, .3, 0] }));
  const hc = SK.headR;
  newPart(); rig.scalp = put(B.head, piece().ball(1.95, foe ? C.hair : R.k[3], { p: [0, hc, 0], s: [1, 1.05, 1] }, 1));   // hair/head.js recolours it
  if (foe) {
    newPart(); put(B.head, piece().box(2.1, 1.8, .8, C.skin, { p: [0, hc - .3, 1.05] }).box(.45, .45, .35, '#6a5446', { p: [0, hc - .25, 1.5] }));
    newPart(); rig.knot = put(B.head, piece().cyl(.38, .45, 1.5, 6, C.hair, { p: [0, hc + 1.75, -.35], r: [-1.2, 0, 0] }).box(1.1, .45, 2.4, C.hair, { p: [0, hc + 1.3, -.2] }));   // replaced by hair/ when it dresses the head
    newPart(); put(B.head, piece().cyl(1.35, 1.95, .9, 8, C.p1, { p: [0, hc - 1.85, .2] }));
  } else {
    newPart(); put(B.head, piece().box(2.05, 1.5, .8, R.i[6], { p: [0, hc - .55, 1.12] }).box(.4, .62, .62, R.i[8], { p: [0, hc - .25, 1.6] }).box(.9, .14, .1, R.k[0], { p: [0, hc - .92, 1.53] }));
    newPart(); put(B.head, piece().box(.65, 1.0, .6, R.i[5], { p: [1.15, hc - .7, .85], r: [0, .55, 0] }).box(.65, 1.0, .6, R.i[5], { p: [-1.15, hc - .7, .85], r: [0, -.55, 0] }));
    newPart(); put(B.head, piece().cyl(1.35, 1.95, 1.0, 8, R.i[4], { p: [0, hc - 1.85, .2] }));          // the yodare-kake under the mask
  }
  for (const sx of [1, -1]) { const e = node(B.head, [.5 * sx, hc + .22, 1.4]); rig.eyes.push(e);
    put(e, piece().box(.4, .24, .2, foe ? R.l[4] : R.y[1], { glow: true })); }
  // ---- the jingasa: a shallow iron cone, ridge ring, eight ribs, knob and a lit lip, on a pivot that tips it back ----
  if (!foe) {
    const hp = node(B.head, [0, hc + .55, 0]), hat = node(hp); rig.hatPivot = hp; rig.hat = hat; rig.hatR = HAT_R;
    newPart(); put(hat, piece().cyl(1.0, HAT_R, 1.8, 14, R.i[4], { p: [0, .85, 0] }));
    newPart(); put(hat, piece().ring(HAT_R + .1, .42, 14, R.i[7], { p: [0, -.05, 0] }));
    newPart(); put(hat, piece().cyl(.56 * HAT_R + .1, .56 * HAT_R + .18, .3, 14, R.i[6], { p: [0, .82, 0] }).cyl(.55, .8, .55, 8, R.i[7], { p: [0, 1.95, 0] }));
    newPart(); const ribs = piece(); for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4 + Math.PI / 8, r0 = 1.2, r1 = HAT_R - .35, y0 = 1.72, y1 = -.02;
      const mx = (r0 + r1) / 2, my = (y0 + y1) / 2 + .08, len = Math.hypot(r1 - r0, y1 - y0), tilt = Math.atan2(y0 - y1, r1 - r0);
      ribs.box(.2, .12, len, R.i[3], { p: [Math.sin(a) * mx, my, Math.cos(a) * mx], r: [tilt, a, 0] }); } put(hat, ribs);
    for (const sx of [1, -1]) { const h = node(B.head, [1.3 * sx, hc + .2, .3]);
      newPart(); put(h, piece().box(.16, 2.1, .16, R.m[3], { p: [-.22 * sx, -1.0, .3], r: [-.25, 0, .25 * sx] }));
      rig.springs.push({ node: h, kind: 'cord' }); }
  }
  // ---- arms: sleeve, sode on a hinge, kote, hand ----
  for (const [sd, sx] of [['L', 1], ['R', -1]]) {
    newPart(); put(B['arm' + sd], piece().cyl(.82, .72, SK.upper, 6, C.clothD, { p: [0, -SK.upper / 2, 0] }));
    const sh = node(B['arm' + sd], [.85, .4, 0], [0, 0, .12]);
    const sode = piece(); for (let i = 0; i < 3; i++) { newPart(); sode.box(.28, 1.25, 2.8, i % 2 ? C.p2 : C.p3, { p: [i * .12, -.6 - i * 1.12, 0] }).box(.32, .22, 2.84, C.lace, { p: [i * .12 + .02, -1.22 - i * 1.12, 0] }); }
    put(sh, sode); rig.springs.push({ node: sh, rest: .12, kind: 'sode', sx });
    newPart(); put(B['fore' + sd], piece().cyl(.7, .56, SK.fore, 6, C.cloth2, { p: [0, -SK.fore / 2, 0] }).box(.26, 2.6, .9, C.p2, { p: [.62, -1.7, 0] }));
    newPart(); put(B['hand' + sd], piece().box(.82, .9, .75, R.i[2], { p: [0, -.4, 0] }));
  }
  // ---- legs: hakama tied in at the shin over the suneate; straw sandals ----
  for (const sd of ['L', 'R']) {
    newPart(); put(B['thigh' + sd], piece().cyl(1.3, 1.62, SK.thigh, 7, C.cloth, { p: [0, -SK.thigh / 2, 0] }));
    newPart(); put(B['shin' + sd], piece().cyl(1.62, 1.08, 1.8, 7, C.cloth, { p: [0, -.8, 0] }).ring(1.12, .26, 7, foe ? R.b[7] : R.m[3], { p: [0, -1.72, 0] }));
    newPart(); put(B['shin' + sd], piece().cyl(.85, .72, 3.0, 6, C.cloth2, { p: [0, -3.1, 0] }).box(1.15, 2.8, .28, C.p3, { p: [0, -3.0, .78] }));
    newPart(); put(B['foot' + sd], piece().box(.9, .7, 1.8, R.k[3], { p: [0, -.3, .4] }));
    newPart(); put(B['foot' + sd], piece().box(1.1, .25, 2.3, R.m[4], { p: [0, -.62, .4] }).box(.22, .25, .8, R.m[2], { p: [0, -.38, 1.1] }));
  }
  // ---- the katana: hangs off the skeleton's root; the hands follow it ----
  const K = node(B.root); rig.katana = K;
  newPart(); put(K, piece().box(.42, .48, 2.6, foe ? R.k[1] : R.i[2], { p: [0, 0, -1.1] }).box(.48, .52, .3, R.i[7], { p: [0, 0, -2.45] }));
  newPart(); put(K, piece().cyl(.7, .7, .18, 8, R.i[7], { p: [0, 0, .15], r: [Math.PI / 2, 0, 0] }));
  const bladeN = node(K); rig.blade = bladeN;
  newPart(); put(bladeN, piece().box(.18, .45, 11.4, R.i[9], { p: [0, 0, 6.0], glow: true }).box(.12, .14, 11.1, R.i[10], { p: [0, -.21, 6.0], glow: true }));

  // the blob shadow under him (unsheared: it lies on the floor)
  const shm = shadeMat({ obj: 3 }); shm.uniforms.uFade.value = .45;
  const shadow = piece().cyl(5.4, 5.4, .05, 14, R.k[0], { p: [0, .06, 0], s: [1, 1, .62], glow: true }).mesh(shm); root.add(shadow); rig.shadow = shadow;
  for (const me of meshes) me.layers.enable(1);             // drawn again by the silhouette pass
  rig.updateShear = () => shear.matrix.copy(BODY_SHEAR);
  rig.updateShear();
  return rig;
}
