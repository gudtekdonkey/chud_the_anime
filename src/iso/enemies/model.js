// ---- The enemy types' 3D variants: the samurai's model (look/three/ronin.js, foe) in each type's colours, dressed with
// its own pieces in the same red-lacquer language (original, placeholder like the hero's: boxes and cones placed in
// code, rigid on the shared skeleton's bones), and its weapon in the hand: the yari, the yumi (its string drawn on the
// effects layer to the draw hand), the kanabō, the tantō; the katana is the samurai's own. The pixel look draws every
// type as the pages' samurai (a type's pixel art is still to come).
import * as THREE from 'three';
import { threeLook } from '../look/three/look3d.js';
import { pixelLook } from '../look/pixel/lookpix.js';
import { piece, newPart } from 'ronin-engine/render/gfx/build.js';
import { RAMP as R } from 'ronin-engine/render/gfx/palette.js';
import { SK } from 'ronin-engine/render/rig3d.js';
import { toScreen } from 'ronin-engine/render/gfx/view.js';

const BONE = '#d8d2c0', WOOD = '#4a3420', STRING = '#cfc6aa';
// colours over the samurai's (ronin.js C): earth tones and black by class, red lacquer on the armour (design notes:
// colour is for high rank only; the Red Ronin's crimson is his mark as a named enemy)
const PAL = {
  samurai: null,
  ashigaru: { p1: R.l[0], p2: R.b[4], p3: R.b[5], hi: R.l[2], lace: R.k[2], cloth: R.m[1], clothD: R.m[0], cloth2: R.c[2] },
  heavy: { p1: R.l[1], p2: R.l[2], p3: R.l[3], hi: R.i[7], lace: R.k[1], cloth: R.b[2], clothD: R.b[1], cloth2: R.k[3], skin: '#4a382e' },
  ninja: { p1: R.v[1], p2: R.v[2], p3: R.v[3], hi: R.v[5], lace: R.l[1], cloth: R.v[1], clothD: R.v[0], cloth2: R.k[2], hair: R.v[1], skin: R.v[2] },
  duelist: { p1: R.k[3], p2: R.i[2], p3: R.i[3], hi: R.l[3], lace: R.l[1], cloth: R.b[3], clothD: R.b[2], cloth2: R.k[2] },
};
const node = (parent, p = [0, 0, 0], r = [0, 0, 0]) => { const o = new THREE.Object3D(); o.position.set(...p); o.rotation.set(...r); parent.add(o); return o; };
const ALONG_Z = [Math.PI / 2, 0, 0];
// the bow's limbs in the hand's frame (z: where the arrow points, y: the limbs): grip at 0, the long upper limb, tips back
const BOW = { top: [0, 10, -1.4], bot: [0, -6.5, -1.4] };

export function enemyLook(kind, T) {
  if (kind === 'pixel') return pixelLook({ foe: true });
  const M = T.model, look = threeLook({ foe: true, pal: PAL[M.pal] }), rig = look.rig, hc = SK.headR;
  const put = (bone, pc, m = rig.mats[0]) => { const me = pc.mesh(m); me.layers.enable(1); bone.add(me); rig.meshes.push(me); return me; };
  const B = rig.B;
  if (M.scale) rig.root.scale.setScalar(M.scale);

  // ---- the weapon: anything but the katana hides the samurai's (and its saya) and hangs its own off the grip
  if (M.weapon) { for (const c of rig.katana.children) c.visible = false; for (const c of rig.saya.children) c.visible = false; }
  const W = node(rig.katana);
  if (M.weapon === 'yari') {
    newPart(); put(W, piece().cyl(.22, .24, 22, 6, WOOD, { p: [0, 0, 4.5], r: ALONG_Z }).cyl(.3, .3, .5, 6, R.i[5], { p: [0, 0, -6.4], r: ALONG_Z }));
    newPart(); put(W, piece().box(.42, .5, .5, R.l[2], { p: [0, 0, 15.6] }).box(.16, .62, 3.4, R.i[9], { p: [0, 0, 17.6], glow: true }).box(.1, .2, 1, R.i[10], { p: [0, 0, 19.6], glow: true }));
  } else if (M.weapon === 'kanabo') {
    newPart(); put(W, piece().cyl(.32, .3, 3.6, 6, R.k[2], { p: [0, 0, .2], r: ALONG_Z }).cyl(.45, .45, .3, 8, R.i[6], { p: [0, 0, -1.6], r: ALONG_Z }));
    newPart(); const club = piece().cyl(1.15, .7, 11, 8, R.i[3], { p: [0, 0, 7.6], r: ALONG_Z });
    for (let i = 0; i < 4; i++) for (let j = 0; j < 6; j++) { const a = j / 6 * Math.PI * 2 + i * .5, z = 4 + i * 2.6, rr = .78 + i * .11;
      club.box(.3, .3, .3, R.i[6], { p: [Math.cos(a) * rr, Math.sin(a) * rr, z] }); }
    put(W, club.cyl(1.2, 1.2, .4, 8, R.i[5], { p: [0, 0, 13.2], r: ALONG_Z }));
  } else if (M.weapon === 'yumi') {
    newPart(); const bow = piece(), pts = []; for (let i = 0; i <= 12; i++) { const s = i / 6 - 1; pts.push([0, s > 0 ? s * BOW.top[1] : s * -BOW.bot[1], -1.4 * s * s]); }
    for (let i = 0; i < 12; i++) { const a = pts[i], b = pts[i + 1], dy = b[1] - a[1], dz = b[2] - a[2];
      bow.box(.2, Math.hypot(dy, dz) + .08, .32, i === 5 || i === 6 ? R.l[1] : R.k[2], { p: [0, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2], r: [Math.atan2(dz, dy), 0, 0] }); }
    put(W, bow);
  } else if (M.weapon === 'tanto') {
    newPart(); put(W, piece().box(.32, .38, 1.6, R.k[2], { p: [0, 0, -.5] }).box(.5, .5, .16, R.i[6], { p: [0, 0, .32] }));
    newPart(); put(W, piece().box(.14, .36, 4.2, R.i[9], { p: [0, 0, 2.5], glow: true }));
  }
  if (M.quiver) { newPart(); const q = piece().box(1, 3.8, 1, R.k[2], { p: [1.1, 3.2, -2.4], r: [0, 0, -.3] });
    for (let i = 0; i < 3; i++) q.box(.12, 1.5, .12, WOOD, { p: [1.65 + i * .22, 5.6 + i * .1, -2.4 + (i - 1) * .2], r: [0, 0, -.3] }).box(.3, .55, .1, BONE, { p: [1.95 + i * .22, 6.3 + i * .1, -2.4 + (i - 1) * .2], r: [0, 0, -.3] });
    put(B.spine, q); }

  // ---- the head
  if (M.head === 'hachimaki') { newPart(); put(B.head, piece().ring(2.0, .5, 10, R.l[3], { p: [0, hc + .55, 0] }).box(.3, 1.7, .18, R.l[3], { p: [.3, hc - .2, -1.95], r: [.25, 0, .2] })); }
  if (M.head === 'jingasa' || M.head === 'jingasaFlat') { const flat = M.head === 'jingasaFlat', r = flat ? 4 : 4.6, h = flat ? 1.2 : 1.7;
    newPart(); put(B.head, piece().cyl(.45, r, h, 12, R.k[2], { p: [0, hc + .9 + h / 2, 0] }));
    newPart(); put(B.head, piece().ring(r + .05, .3, 12, R.l[1], { p: [0, hc + .92, 0] }).cyl(.9, .9, .14, 10, R.l[3], { p: [0, hc + .95 + h - .05, 0] })); }
  if (M.head === 'kabuto') {
    newPart(); put(B.head, piece().ball(2.35, R.i[3], { p: [0, hc + .55, -.05], s: [1, .78, 1.05] }, 1));
    newPart(); put(B.head, piece().cyl(2.5, 3.7, 1.5, 10, R.l[1], { p: [0, hc - .5, -.4] }));
    newPart(); put(B.head, piece().box(.35, 3.2, .35, R.i[7], { p: [1.5, hc + 2.6, .8], r: [.2, 0, -.5] }).box(.35, 3.2, .35, R.i[7], { p: [-1.5, hc + 2.6, .8], r: [.2, 0, .5] }));
    newPart(); put(B.head, piece().box(2.2, 1.4, .6, R.l[0], { p: [0, hc - .75, 1.45] }).box(.25, .45, .2, BONE, { p: [.45, hc - 1.3, 1.8] }).box(.25, .45, .2, BONE, { p: [-.45, hc - 1.3, 1.8] })); }
  if (M.head === 'hood') {
    newPart(); put(B.head, piece().ball(2.15, R.v[1], { p: [0, hc + .1, -.3], s: [1, 1.05, 1] }, 1).box(2.3, 1, .5, R.v[2], { p: [0, hc - .7, 1.55] }));
    for (const sx of [1, -1]) put(B.head, piece().box(.4, .24, .2, R.l[4], { p: [.5 * sx, hc + .25, 1.95], glow: true }));
    const tail = node(B.head, [0, hc + .3, -2.2]); newPart(); put(tail, piece().box(.5, 2.8, .15, R.v[2], { p: [.3, -1.3, -.2], r: [-.3, 0, .1] }).box(.5, 2.4, .15, R.v[2], { p: [-.3, -1.1, -.2], r: [-.25, 0, -.1] }));
    rig.springs.push({ node: tail, kind: 'cord' }); }
  if (M.head === 'sandogasa') { const hp = node(B.head, [0, hc + .55, .3], [.2, 0, 0]); rig.brim = hp;
    newPart(); put(hp, piece().cyl(1.1, 5.8, 1.5, 12, R.m[2], { p: [0, .75, 0] }));
    newPart(); const rim = piece(); for (let i = 0; i < 14; i++) { const a = i / 14 * Math.PI * 2; rim.box(1.2 + (i % 3) * .4, .3, .5, i % 2 ? R.m[1] : R.m[3], { p: [Math.sin(a) * 5.7, (i % 3) * -.12, Math.cos(a) * 5.7], r: [0, a, 0] }); }
    put(hp, rim); }
  if (M.oSode) for (const [sd, sx] of [['L', 1], ['R', -1]]) { newPart();
    put(B['sh' + sd], piece().box(.5, 3.6, 3.8, R.l[2], { p: [1.6 * sx, -1.4, 0], r: [0, 0, .28 * sx] }).box(.56, .26, 3.86, R.k[2], { p: [1.75 * sx, -.6, 0], r: [0, 0, .28 * sx] }).box(.56, .26, 3.86, R.k[2], { p: [1.45 * sx, -2.2, 0], r: [0, 0, .28 * sx] })); }
  // ---- the Red Ronin's crimson jinbaori: a yoke and four panels on hinges, swung by the same springs as the hero's
  if (M.coat) { const cloth = rig.mats[1];
    newPart(); put(B.chest, piece().box(5.9, .6, 4, R.l[0], { p: [0, 3, -.1] }).box(5.3, 3.4, .34, R.l[0], { p: [0, 1.15, -2.1] }), cloth);
    for (const [x, z, w, len, out] of [[1.4, -2.12, 2.8, 5.6, 1], [-1.4, -2.12, 2.8, 5.6, 1], [1.95, 2, 1.5, 4.8, -1], [-1.95, 2, 1.5, 4.8, -1]]) {
      const h = node(B.chest, [x, -.6, z], [.08 * out, 0, 0]); newPart();
      put(h, piece().box(w, len, .34, R.l[0], { p: [0, -len / 2, 0] }).box(w * .7, .5, .36, R.b[2], { p: [(x > 0 ? .2 : -.2), -len + .25, 0] }), cloth);
      rig.springs.push({ node: h, rest: .08 * out, out, kind: 'cloth', side: x }); } }

  // ---- what the look adds on the effects layer: the bow's string (to the draw hand while drawing, with the arrow on
  // it), the duelist's red eyes under his brim when he faces the camera
  let f0 = null; const show0 = look.show, stamp0 = look.stamp, _v = new THREE.Vector3(), _q = new THREE.Quaternion();
  look.show = f => { f0 = f; show0(f); };
  const scr = (o, p) => { _v.set(...p).applyMatrix4(o.matrixWorld); return toScreen(_v.x, _v.y, _v.z); };
  look.stamp = g => { stamp0(g); if (!f0 || (f0.alpha ?? 1) < .5) return;
    if (M.weapon === 'yumi') { const a = scr(rig.katana, BOW.top), b = scr(rig.katana, BOW.bot), drawn = f0.bow > 0;
      rig.B.handL.getWorldPosition(_v); const h = toScreen(_v.x, _v.y, _v.z), m = drawn ? h : [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
      line(g, a, m, STRING); line(g, m, b, STRING);
      if (drawn) { const tip = scr(rig.katana, [0, 0, 3.4]); line(g, h, tip, '#b9a77a'); g.fillStyle = R.i[10]; g.fillRect(tip[0] | 0, tip[1] | 0, 2, 1); } }
    if (rig.brim) { const fwd = new THREE.Vector3(0, 0, 1).applyQuaternion(rig.body.getWorldQuaternion(_q)); if (fwd.z < .2) return;
      const rim = []; for (let i = 0; i < 24; i++) { const a = i / 24 * Math.PI * 2; rim.push(scr(rig.brim, [Math.sin(a) * 5.8, 0, Math.cos(a) * 5.8])); }
      for (const sx of [1, -1]) { const e = scr(B.head, [.5 * sx, hc + .22, 1.4]); let y = e[1];
        for (const p of rim) if (Math.abs(p[0] - e[0]) < 2 && p[1] > y - 1) y = Math.max(y, p[1] + 1);
        g.fillStyle = R.l[4]; g.fillRect(e[0] | 0, y | 0, 1, 1); } } };
  return look;
}
function line(g, a, b, col) { g.fillStyle = col; const n = Math.max(1, Math.ceil(Math.max(Math.abs(b[0] - a[0]), Math.abs(b[1] - a[1]))));
  for (let i = 0; i <= n; i++) g.fillRect((a[0] + (b[0] - a[0]) * i / n) | 0, (a[1] + (b[1] - a[1]) * i / n) | 0, 1, 1); }
