// ---- The courtyard's townsfolk as a LOOK (look/look.js's four calls): a villager on the same skeleton and the same
// side-pose stand-up as Iron Ash (look/three/rig.js), so every move and idle drives them unchanged. A placeholder in
// the slice's low-poly language: a kimono with an obi, wide sleeves, the skirt on hinges that swing (the rig's cloth
// springs), and a straw kasa, a head cloth or a bare head with a topknot. Unarmed: no katana, nothing in the saya.
// The colours come from the slice's palette ramps (undyed, indigo, straw, a faded red-brown), picked by the seed.
import * as THREE from 'three';
import { piece, newPart } from 'ronin-engine/iso/gfx/build.js';
import { RAMP as R } from 'ronin-engine/iso/gfx/palette.js';
import { shadeMat } from 'ronin-engine/iso/gfx/shade.js';
import { makeSkeleton, SK, applyPose } from 'ronin-engine/iso/rig3d.js';
import { BODY_SHEAR } from 'ronin-engine/iso/gfx/view.js';
import { LOOKS } from '../look/look.js';

const node = (parent, p = [0, 0, 0], r = [0, 0, 0]) => { const o = new THREE.Object3D(); o.position.set(...p); o.rotation.set(...r); parent.add(o); return o; };
const DYES = [[R.c[4], R.c[2], R.c[1]], [R.v[5], R.v[3], R.v[1]], [R.m[2], R.m[1], R.m[0]], [R.b[5], R.b[3], R.b[1]], [R.n[6], R.n[4], R.n[2]]];
const SKIN = ['#6b5244', '#5a463a', '#7a5d4a', '#4e3c32'];

export function makeFolk({ seed = 1 } = {}) {
  let s = seed * 9301 + 49297; const rnd = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
  const dye = DYES[rnd() * DYES.length | 0], obi = DYES[rnd() * DYES.length | 0][1], skin = SKIN[rnd() * SKIN.length | 0], hatKind = ['kasa', 'kasa', 'scarf', 'bare'][rnd() * 4 | 0];
  const mat = shadeMat({ obj: 2, stencil: true }), cloth = shadeMat({ obj: 2, stencil: true, side: THREE.DoubleSide });
  const meshes = [], put = (bone, pc, m = mat) => { const me = pc.mesh(m); bone.add(me); meshes.push(me); return me; };
  const root = new THREE.Object3D(), shear = node(root); shear.matrixAutoUpdate = false; const body = node(shear), B = makeSkeleton(body);
  const rig = { root, shear, body, B, meshes, mats: [mat, cloth], springs: [], eyes: [], hatTilt: 0, kind: hatKind };
  // unarmed: the rig still places a katana and a saya, so they are empty nodes
  rig.saya = node(B.hips, [1.9, .6, 1.1]); rig.katana = node(B.root); rig.blade = node(rig.katana);
  // the kimono: a wrapped top over the spine and chest, the obi, the collar's V; the skirt in four panels on hinges
  newPart(); put(B.spine, piece().cyl(2.05, 1.95, 3.6, 8, dye[1], { p: [0, 1.8, 0], s: [1, 1, .78] }));
  newPart(); put(B.chest, piece().cyl(2.3, 2.1, 3.4, 8, dye[0], { p: [0, 1.5, 0], s: [1, 1, .8] }).box(2.2, .3, .2, dye[2], { p: [0, 2.6, 1.72], r: [0, 0, .5] }).box(2.2, .3, .2, dye[2], { p: [0, 2.6, 1.72], r: [0, 0, -.5] }));
  newPart(); put(B.hips, piece().cyl(2.2, 2.2, 1, 8, obi, { p: [0, .45, 0], s: [1, 1, .8] }).box(1.4, .9, .5, obi, { p: [0, .45, -1.85] }));
  for (const [ang, w] of [[0, 3.6], [Math.PI, 3.6], [Math.PI / 2, 2.6], [-Math.PI / 2, 2.6]]) {
    const yaw = node(B.hips, [0, 0, 0], [0, ang, 0]), h = node(yaw, [0, 0, 1.6], [.05, 0, 0]);
    newPart(); put(h, piece().box(w, 7.4, .3, dye[1], { p: [0, -3.6, 0] }).box(w, .35, .34, dye[2], { p: [0, -7.2, 0] }), cloth);
    rig.springs.push({ node: h, rest: .05, out: Math.cos(ang) > .5 ? -1 : 1, kind: 'cloth', side: Math.sin(ang) || .01 }); }
  // head: skin, hair, a face in shadow; the hat on a pivot the rig tips and lags
  const hc = SK.headR;
  newPart(); put(B.neck, piece().cyl(.7, .8, 1.1, 6, skin, { p: [0, .3, 0] }));
  newPart(); put(B.head, piece().ball(1.9, skin, { p: [0, hc, 0], s: [1, 1.05, 1] }, 1));
  newPart(); put(B.head, piece().ball(1.95, R.k[1], { p: [0, hc + .45, -.35], s: [1, .85, 1] }, 1));
  for (const sx of [1, -1]) { newPart(); put(B.head, piece().box(.36, .2, .2, R.k[0], { p: [.55 * sx, hc + .15, 1.82] })); }
  if (hatKind === 'bare') { newPart(); put(B.head, piece().cyl(.36, .42, 1.3, 6, R.k[1], { p: [0, hc + 1.8, -.4], r: [-1.1, 0, 0] })); }
  if (hatKind === 'scarf') { newPart(); put(B.head, piece().ball(2.1, dye[2] === R.k[1] ? R.c[3] : R.c[5], { p: [0, hc + .55, -.15], s: [1.02, .8, 1.04] }, 1).box(.9, 1.3, .3, R.c[5], { p: [0, hc - .2, -1.95], r: [.3, 0, 0] })); }
  if (hatKind === 'kasa') { const hp = node(B.head, [0, hc + .9, 0]), hat = node(hp); rig.hatPivot = hp; rig.hat = hat;
    newPart(); put(hat, piece().cyl(.35, 5.4, 2.6, 12, R.m[3], { p: [0, 1, 0] }));
    newPart(); put(hat, piece().ring(5.45, .3, 12, R.m[1], { p: [0, -.3, 0] }).cyl(.4, .5, .5, 6, R.m[2], { p: [0, 2.4, 0] }));
    rig.hatR = 5.4; }
  // arms in wide sleeves; hands bare
  for (const sd of ['L', 'R']) {
    newPart(); put(B['arm' + sd], piece().cyl(1.15, 1.35, SK.upper, 6, dye[0], { p: [0, -SK.upper / 2, 0] }));
    newPart(); put(B['fore' + sd], piece().cyl(1.4, 1.5, SK.fore * .55, 6, dye[0], { p: [0, -SK.fore * .27, -.2] }).cyl(.55, .5, SK.fore * .5, 6, skin, { p: [0, -SK.fore * .72, 0] }));
    newPart(); put(B['hand' + sd], piece().box(.75, .85, .7, skin, { p: [0, -.4, 0] }));
    newPart(); put(B['thigh' + sd], piece().cyl(1.1, 1.25, SK.thigh, 6, dye[2], { p: [0, -SK.thigh / 2, 0] }));
    newPart(); put(B['shin' + sd], piece().cyl(.8, .65, SK.shin, 6, dye[2], { p: [0, -SK.shin / 2, 0] }).ring(.85, .5, 6, R.c[5], { p: [0, -SK.shin + 1.3, 0] }));
    newPart(); put(B['foot' + sd], piece().box(.85, .55, 1.7, skin, { p: [0, -.3, .4] }).box(1.05, .25, 2.2, R.m[4], { p: [0, -.62, .4] }));
  }
  const shm = shadeMat({ obj: 3 }); shm.uniforms.uFade.value = .45;
  rig.shadow = piece().cyl(4.6, 4.6, .05, 14, R.k[0], { p: [0, .06, 0], s: [1, 1, .62], glow: true }).mesh(shm); root.add(rig.shadow);
  for (const me of meshes) me.layers.enable(1);
  rig.updateShear = () => shear.matrix.copy(BODY_SHEAR); rig.updateShear();
  return rig;
}

export function folkLook({ seed = 1 } = {}) {
  const rig = makeFolk({ seed }); let scene = null;
  return { kind: 'folk', rig,
    mount(s) { scene = s; s.add(rig.root); },
    show(f) { rig.root.position.set(Math.round(f.x * 2) / 2, f.y, Math.round(f.z * 2) / 2); rig.updateShear(); rig.body.rotation.y = f.yaw;
      applyPose(rig, f.pose);
      for (const m of rig.mats) { const u = m.uniforms; u.uFlash.value = f.flash ? 1 : 0; u.uFade.value = 1 - (f.alpha ?? 1); u.uTint.value = f.tint ? f.tintA : 0; if (f.tint) u.uTintCol.value.set(...f.tint); }
      rig.shadow.visible = (f.alpha ?? 1) > .3; },
    stamp() {},
    dispose() { if (scene) scene.remove(rig.root); } };
}
LOOKS.folk = folkLook;
