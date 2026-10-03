// ---- A weapon on the 3D skeleton (look/three/): where each one rides when stowed (the hip, through the obi, slung across
// the back, hung down it with the grip over the right shoulder), the right hand's grip when it is out (rig.js hands us
// the grip and the weapon's direction from the side pose), and what the left hand holds: the second tanto in a reverse
// grip, the second kama, the daisho's wakizashi, the kusarigama's chain. The tessen opens by its pose's `spread`, the
// nunchaku's free stick trails the one in his fist a beat behind, the chain is thrown out to the pose's `chain` length.
// The katana keeps the ronin's own built-in model (ronin.js); every other weapon hides it.
import * as THREE from 'three';
import { MODELS } from '../../weapons/registry.js';
import { worldOf } from '../rig3d.js';
import { AF } from '../../flow/flow.js';
import { WEAPON } from '../../weapons/registry.js';
import { STOW, stowAt } from '../../weapons/stow.js';

const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z), _m = new THREE.Matrix4();
// a frame with +z along d and +y as near `up` as it can be
function basis(d, up = V(0, 1, 0)) { const z = d.clone().normalize(); let y = up.clone().addScaledVector(z, -up.dot(z));
  if (y.lengthSq() < 1e-5) y = V(0, 0, 1).addScaledVector(z, -z.z); y.normalize(); const x = new THREE.Vector3().crossVectors(y, z); return _m.clone().makeBasis(x, y, z); }
// a stow spec as a matrix in its bone's frame
function stowLocal(s, w) { const { at, d } = stowAt(s, w); const m = basis(V(...d), d[1] > .7 ? V(0, 0, -1) : V(0, 1, 0)); m.setPosition(V(...at)); return m; }
const place = (o, m) => { o.position.setFromMatrixPosition(m); o.quaternion.setFromRotationMatrix(_m.extractRotation(m)); };
// the in-hand frame: +z along the weapon, +y its spine side in his forward/up plane
const inHand = (grip, d, ang) => { const m = basis(d, V(0, Math.cos(ang), -Math.sin(ang))); m.setPosition(grip); return m; };

// build the weapon `id` onto a 3D look's rig (once per change); returns nothing, installs rig.wield
export function equipModel(rig, id) {
  if (rig.wpnParts) { for (const o of rig.wpnParts.nodes) o.removeFromParent(); for (const me of rig.wpnParts.meshes) { me.geometry.dispose(); const i = rig.meshes.indexOf(me); if (i >= 0) rig.meshes.splice(i, 1); } }
  const w = WEAPON[id] || WEAPON.katana, meshes = [], nodes = [], B = rig.B;
  const put = (n, pc) => { const me = pc.mesh(rig.mats[0]); me.layers.enable(1); n.add(me); meshes.push(me); rig.meshes.push(me); return me; };
  const M = MODELS[w.id](put), S = STOW[w.id] || {};
  rig.wid = w.id; rig.wpnParts = { meshes, nodes }; rig.katana.visible = rig.saya.visible = true;
  if (w.id === 'katana') { rig.wield = null; rig.wstate = { main: 'katana' }; return; }
  for (const k of ['main', 'off', 'free', 'cord']) if (M[k]) { B.root.add(M[k]); nodes.push(M[k]); }
  if (M.chain) { B.root.add(M.chain.node); nodes.push(M.chain.node); }
  for (const sh of M.sheaths) { const s = S[sh.at]; B[s.bone].add(sh.node); nodes.push(sh.node); const m = stowLocal(s, w); place(sh.node, m); sh.spec = s; }
  const local = {}; for (const k of ['stow', 'offStow']) if (S[k]) local[k] = stowLocal(S[k], k === 'stow' ? w : { ext: [0, 0] });
  const st = rig.wstate = { main: M.builtIn ? 'katana' : 'stow', off: 'stow' }; let freeDir = null;

  rig.wield = (P, grip, bd) => {
    const bl = P.blade, out = !!(bl && bl.out), R = B.root;
    if (!M.builtIn) rig.katana.visible = rig.saya.visible = false;
    const boneM = b => worldOf(B[b], R), stowed = k => boneM(S[k].bone).multiply(local[k]);
    // the main weapon: in the right hand, or home
    if (M.main) {
      if (out && grip) { place(M.main, inHand(grip.clone().addScaledVector(bd, -(bl.slide || 0) * AF), bd, bl.ang)); st.main = 'hand';   // slide: the hand up the haft from its grip
        if (M.blade) M.blade.scale.z = Math.max(.05, Math.min(1, (bl.vis ?? 99) / w.len)); }
      else { place(M.main, stowed('stow')); st.main = 'stow'; if (M.blade) M.blade.scale.z = 1; }
    }
    // the left hand's weapon: at its grip, along its pose's angle, or reversed along the forearm; home when not in use
    if (M.off) { const o = out && bl.off;
      if (o) { const hm = boneM('handL'), wr = V().setFromMatrixPosition(hm), ax = V().setFromMatrixColumn(hm, 0), ay = V().setFromMatrixColumn(hm, 1);
        const g = wr.addScaledVector(ay, -.45), d = o.rev ? ay.clone().addScaledVector(ax, .3) : V(o.lat || 0, Math.sin(o.ang ?? .7), Math.cos(o.ang ?? .7));
        if (o.rev) g.addScaledVector(ax, .3);
        place(M.off, inHand(g, d.normalize(), o.ang ?? 0)); st.off = 'hand'; if (M.offBlade) M.offBlade.scale.z = 1; }
      else { place(M.off, stowed('offStow')); st.off = 'stow'; } }
    // the tessen opens and shuts
    if (M.fan) { const sp = out ? Math.max(0, Math.min(1, bl.spread || 0)) : 0; M.fan.forEach((r, i) => { r.rotation.y = (i / (M.fan.length - 1) - .5) * 1.75 * sp; }); }
    // the nunchaku: the free stick a beat behind the held one (out), or folded beside it in the sash
    if (M.free) { const q = M.main.quaternion, mz = V(0, 0, 1).applyQuaternion(q), end = M.main.position.clone().addScaledVector(mz, 3.55);
      let fd; if (st.main === 'hand') { fd = freeDir ? freeDir.multiplyScalar(.55).addScaledVector(mz, .45).add(V(0, -.18, 0)).normalize() : mz.clone(); freeDir = fd.clone(); }
      else { freeDir = null; fd = mz.clone().negate(); end.addScaledVector(V(1, 0, 0).applyQuaternion(q), .62); }
      const fo = end.clone().addScaledVector(fd, .7), cs = M.main.position.clone().addScaledVector(mz, 3.55);
      place(M.free, basis(fd).setPosition(fo)); place(M.cord, basis(fo.clone().sub(cs)).setPosition(cs)); M.cord.scale.z = Math.max(.2, fo.distanceTo(cs)); }
    // the kusarigama's chain: from the left fist, thrown straight out (the pose's chain length, rig px) or hanging; coiled at his back when home
    if (M.chain) { const C = M.chain; C.node.visible = out; for (const sh of M.sheaths) if (sh.at === 'coil') sh.node.visible = !out;
      if (out) { const hm = boneM('handL'), g = V().setFromMatrixPosition(hm).addScaledVector(V().setFromMatrixColumn(hm, 1), -.45);
        const thrown = (bl.chain || 0) > 2, ca = bl.off && bl.off.ang != null ? bl.off.ang : -Math.PI / 2 + (P.swing || 0) * .12;
        const L = thrown ? bl.chain * AF : 4.2, d = V(0, Math.sin(ca), Math.cos(ca)), n = C.links.length, sag = thrown ? .5 : 0;
        const pt = u => g.clone().addScaledVector(d, L * u).add(V(0, -sag * Math.sin(Math.PI * u), 0));
        C.links.forEach((l, i) => { const a = pt(i / n), b = pt((i + 1) / n); l.visible = thrown || i < 8; place(l, basis(b.clone().sub(a), V(i % 2, 1, 0)).setPosition(a.lerp(b, .5))); });
        C.weight.position.copy(pt(thrown ? 1 : 8 / n)); C.weight.position.y = Math.max(.6, C.weight.position.y); st.chain = thrown ? bl.chain : 0; } }
  };
}
