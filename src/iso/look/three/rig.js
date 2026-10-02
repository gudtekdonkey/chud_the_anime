// ---- The 3D look's skeleton, in the Animation Flow rig's proportions (Iron Ash: thigh 9.4, shin 9.2, torso 13.5,
// head 4.3, arms 7 + 7 rig px, ×AF to world units): hips, spine, chest, neck, head, two arms, two legs, as Object3Ds
// (no skinning: armour is rigid on its bone). It takes the flow's SIDE POSE (the page's joint angles and targets in its
// forward/up plane: pel, lean, head, fN/fF, hN/hF, the blade's grip and angle) and stands it up in 3D: the near limbs
// are his right (−x), the far his left (+x); arms and legs reach their targets by two-bone IK.
import * as THREE from 'three';
import { AF, H } from '../../anim/flow.js';

const s = AF;
export const SK = { thigh: 9.4 * s, shin: 9.2 * s, spineTop: 6.8 * s, torsoTop: 13.5 * s, shoulder: [4.8 * s, 11.9 * s], upper: 7 * s, fore: 7 * s,
  neck: 1.6 * s, headR: 4.3 * s, hipJ: [2.5 * s, -1 * s], footX: 2.5 * s, handX: 4.2 * s };
const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const node = (parent, p = [0, 0, 0], name = '') => { const o = new THREE.Object3D(); o.name = name; o.position.set(...p); parent.add(o); return o; };

export function makeSkeleton(body) {
  const B = { body };
  B.root = node(body, [0, 0, 0], 'root');
  B.hips = node(B.root, [0, H * s, 0], 'hips');
  B.spine = node(B.hips, [0, 0, 0], 'spine');
  B.chest = node(B.spine, [0, SK.spineTop, 0], 'chest');
  B.neck = node(B.chest, [0, SK.torsoTop - SK.spineTop, 0], 'neck');
  B.head = node(B.neck, [0, SK.neck, 0], 'head');           // the head's centre is SK.headR above this joint
  for (const [sd, sx] of [['L', 1], ['R', -1]]) {
    B['sh' + sd] = node(B.spine, [SK.shoulder[0] * sx, SK.shoulder[1], 0], 'sh' + sd);
    B['arm' + sd] = node(B['sh' + sd], [0, 0, 0], 'arm' + sd);
    B['fore' + sd] = node(B['arm' + sd], [0, -SK.upper, 0], 'fore' + sd);
    B['hand' + sd] = node(B['fore' + sd], [0, -SK.fore, 0], 'hand' + sd);
    B['thigh' + sd] = node(B.hips, [SK.hipJ[0] * sx, SK.hipJ[1], 0], 'thigh' + sd);
    B['shin' + sd] = node(B['thigh' + sd], [0, -SK.thigh, 0], 'shin' + sd);
    B['foot' + sd] = node(B['shin' + sd], [0, -SK.shin, 0], 'foot' + sd);
  }
  return B;
}

const _m = new THREE.Matrix4(), _e = new THREE.Euler();
// a bone from a to b (its −y along the bone), its +x turned toward `ref` (useX) or its +z toward `ref`
function aim(a, b, ref, useX) {
  const y = a.clone().sub(b).normalize(); let x, z;
  if (useX) { x = ref.clone().addScaledVector(y, -ref.dot(y)); if (x.lengthSq() < 1e-6) x.set(1, 0, 0); x.normalize(); z = new THREE.Vector3().crossVectors(x, y); }
  else { z = ref.clone().addScaledVector(y, -ref.dot(y)); if (z.lengthSq() < 1e-6) z.set(0, 0, 1); z.normalize(); x = new THREE.Vector3().crossVectors(y, z); }
  return new THREE.Quaternion().setFromRotationMatrix(_m.makeBasis(x, y, z));
}
// two-bone IK: the middle joint of a chain from a reaching t, bending toward `pole`
function ik(a, t, l1, l2, pole) {
  const d = t.clone().sub(a), dist = Math.min(Math.max(d.length(), Math.abs(l1 - l2) + .05), l1 + l2 - .02), dir = d.normalize();
  const ca = (l1 * l1 + dist * dist - l2 * l2) / (2 * l1 * dist), sa = Math.sqrt(Math.max(0, 1 - ca * ca));
  const pn = pole.clone().addScaledVector(dir, -pole.dot(dir)); if (pn.lengthSq() < 1e-6) pn.set(0, 0, 1); pn.normalize();
  return { mid: a.clone().addScaledVector(dir, l1 * ca).addScaledVector(pn, l1 * sa), end: a.clone().addScaledVector(dir, dist) };
}
export const worldOf = (o, stop) => { const m = new THREE.Matrix4(), chain = []; for (let n = o; n && n !== stop; n = n.parent) chain.push(n);
  for (let i = chain.length - 1; i >= 0; i--) { chain[i].updateMatrix(); m.multiply(chain[i].matrix); } return m; };
const qOf = m => new THREE.Quaternion().setFromRotationMatrix(_m.extractRotation(m));
const pOf = m => new THREE.Vector3().setFromMatrixPosition(m);
const sm = t => t * t * (3 - 2 * t), cl = (v, a, b) => Math.max(a, Math.min(b, v));
const at = (fu, x) => V(x, fu[1] * s, fu[0] * s);          // a side-rig point [forward, up] at lateral x, in world units

// the side pose → bone rotations, the katana, the hat and the secondary pieces
export function applyPose(rig, P) {
  const B = rig.B, R = B.root, lean = P.lean || 0;
  rig.body.rotation.z = -(P.roll || 0);                      // he leans into a turn (the page's roll spring)
  B.hips.position.set(0, P.pel[1] * s, P.pel[0] * s); B.hips.rotation.set(lean * .25, 0, 0);
  B.spine.rotation.set(lean * .75, 0, 0); B.chest.rotation.set(0, 0, 0); B.neck.rotation.set(0, 0, 0); B.head.rotation.set(P.head || 0, 0, 0);
  const hipsM = worldOf(B.hips, R), spineM = worldOf(B.spine, R), hipQ = qOf(hipsM), spineQ = qOf(spineM);
  // legs: near = his right
  for (const [sd, sx, f] of [['R', -1, P.fN], ['L', 1, P.fF]]) {
    const hp = pOf(worldOf(B['thigh' + sd], R)), t = at(f, SK.footX * sx);
    const kd = P.kneeDir, pole = Array.isArray(kd) ? V(0, kd[1], kd[0]) : V(sx * .15, 0, 1);
    const { mid, end } = ik(hp, t, SK.thigh, SK.shin, pole), fz = V(0, 0, 1), qT = aim(hp, mid, fz, false), qS = aim(mid, end, fz, false);
    B['thigh' + sd].quaternion.copy(hipQ.clone().invert().multiply(qT));
    B['shin' + sd].quaternion.copy(qT.clone().invert().multiply(qS));
    B['foot' + sd].quaternion.copy(qS.clone().invert());       // the sole stays flat on the floor
  }
  // the katana: in the hand (grip, angle in the side plane) or in the saya at his left hip
  const bl = P.blade, K = rig.katana, out = bl && bl.out;
  let grip = null, bd = null;
  if (out) { const back = (1 - (bl.two ? 1 : 0)) * sm(cl(-Math.cos(bl.ang) / .8, 0, 1));   // drawn from (or going into) the saya: on the left side
    grip = at(bl.g, bl.x ?? -1.0 + 1.9 * back); bd = V(bl.lat ?? .12 * back, Math.sin(bl.ang), Math.cos(bl.ang)).normalize(); }   // x, lat: a weapon's own (weapons/)
  rig.saya.rotation.set(-.32 + (P.sayaTilt || 0), .1, 0);
  // arms: the near (right) hand to its target, or the grip; the far (left) hand joins the hilt two-handed
  const pel = P.pel, hiltNear = 1 - cl(Math.hypot(P.hN[0] - pel[0] - 4.8, P.hN[1] - pel[1] - 2.6) / 6, 0, 1);
  for (const [sd, sx] of [['R', -1], ['L', 1]]) {
    const shP = pOf(worldOf(B['arm' + sd], R));
    let t = sd === 'R' ? at(P.hN, -SK.handX + (SK.handX + 1.3) * (out ? 0 : hiltNear)) : at(P.hF, SK.handX * .9);
    if (grip && sd === 'R') t = grip.clone();
    if (grip && sd === 'L' && bl.two) t = grip.clone().addScaledVector(bd, -(bl.bh ?? 3.4) * s);   // bh: how far apart the hands are on a haft
    const pole = P.elb === 'down' ? V(sx * .4, -1, .2) : V(sx * .55, -.25, -1);
    const { mid, end } = ik(shP, t, SK.upper, SK.fore, pole);
    const outV = V(sx, 0, 0).applyQuaternion(spineQ), qA = aim(shP, mid, outV, true), qF = aim(mid, end, outV, true);
    B['arm' + sd].quaternion.copy(spineQ.clone().invert().multiply(qA));
    B['fore' + sd].quaternion.copy(qA.clone().invert().multiply(qF));
  }
  if (grip) { K.position.copy(grip); const z = bd, up = Math.abs(z.y) > .95 ? V(1, 0, 0) : V(0, 1, 0), x = new THREE.Vector3().crossVectors(up, z).normalize(), y = new THREE.Vector3().crossVectors(z, x);
    K.quaternion.setFromRotationMatrix(_m.makeBasis(x, y, z)); rig.blade.scale.z = Math.max(.05, Math.min(1, (bl.vis ?? 99) / 23)); }
  else { rig.saya.updateMatrix(); const m = hipsM.clone().multiply(rig.saya.matrix); K.position.setFromMatrixPosition(m);
    K.quaternion.setFromRotationMatrix(_m.extractRotation(m)).multiply(new THREE.Quaternion().setFromEuler(_e.set(0, Math.PI, 0))); rig.blade.scale.z = 1; }
  rig.saya.visible = true;
  if (rig.wield) rig.wield(P, grip, bd);                     // any other weapon (weapons/wield.js) places itself and hides the katana
  // the hat keeps its own angle (the page's hatTilt, absolute), lags on its spring (hatLag), tipped back by the overlay's tilt
  if (rig.hatPivot) { const lag = P.hatLag || [0, 0];
    rig.hatPivot.position.set(0, SK.headR + 1.1 * s + lag[1] * s * .5, lag[0] * s * .5);
    rig.hatPivot.rotation.x = (P.hatTilt || 0) - lean - (P.head || 0) - rig.hatTilt; }
  // the secondary pieces: kusazuri swing back and lift (kzLag, kzLift), the sode lag (sodeLag), the jinbaori streams with speed
  for (const sp of rig.springs) {
    if (sp.kind === 'plate') sp.node.rotation.x = sp.rest + ((P.kzLag || 0) * Math.cos(sp.ang) * .09) - (P.kzLift || 0) * .12;
    else if (sp.kind === 'sode') { const l = P.sodeLag || [0, 0]; sp.node.rotation.set(-l[0] * .12, 0, sp.rest + Math.abs(l[1]) * .08); }
    else if (sp.kind === 'cloth') sp.node.rotation.set(sp.rest + Math.max(-.3, (P.speed || 0)) * .32 + (sp.out < 0 ? (P.speed || 0) * .12 : 0), 0, (P.swing || 0) * .05 * Math.sign(sp.side));
    else if (sp.kind === 'cord') sp.node.rotation.x = (P.hatLag ? -P.hatLag[0] * .15 : 0);
  }
}

// the blade's world points for the shared trail: from the side pose alone (the controller's job, never a look's)
export function bladePts(P) { const b = P.blade; if (!b || !b.out) return null; const L = Math.min(23, b.vis ?? 99), d = [Math.cos(b.ang), Math.sin(b.ang)];
  return { mid: [b.g[0] + d[0] * (6 + (L - 6) * .5), b.g[1] + d[1] * (6 + (L - 6) * .5)], tip: [b.g[0] + d[0] * L, b.g[1] + d[1] * L] }; }
