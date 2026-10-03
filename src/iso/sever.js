// ---- SEVERING (owner 2026-10-02, the 3D test level): a killing blow, or an execution, cuts a limb, the head or the body
// at the joint nearest the cut. The part leaves the procedural model (look/three/ronin.js) as its own piece: the
// bone's meshes cloned into a simple rigid body (gravity, tumble, bounce, friction on the floor, the courtyard's walls),
// a raw cap where it was cut, bleeding a while; on the body the part's meshes are hidden and a stump is left at the
// joint, spurting. The dropped sword is a piece too and clatters (sparks on each hard landing). Pieces are drawn
// through the bodies' camera (view.js BODY_SHEAR) round a point that eases from his feet to the floor under them, so a
// part leaves the body exactly where it was drawn and lies flat where it lands. The pixel look's drawing cannot lose a
// limb: there the cut is remembered (and shown if the 3D model comes back) and only the blood plays.
import * as THREE from 'three';
import { shadeMat } from 'ronin-engine/render/gfx/shade.js';
import { BODY_SHEAR } from 'ronin-engine/render/gfx/view.js';
import { piece } from 'ronin-engine/render/gfx/build.js';
import { RAMP } from 'ronin-engine/render/gfx/palette.js';
import { groundAt, collide } from './world/room.js';
import { AF, rnd } from 'ronin-engine/flow/flow.js';
import { sparks, dust } from 'ronin-engine/render/fx.js';
import * as blood from './fx/blood.js';

const G = 150;
// what can be cut: the node it takes (a bone of rig.B, or the katana), the cap's radius, whether the part grows
// up from the joint (+1: head, the upper body) or hangs down (−1: limbs)
export const PARTS = {
  head: { b: 'head', cap: .85, up: 1 }, upper: { b: 'spine', cap: 2.1, up: 1 }, all: { b: 'hips', cap: 0, up: 1 },
  armR: { b: 'armR', cap: .8 }, armL: { b: 'armL', cap: .8 }, foreR: { b: 'foreR', cap: .65 }, foreL: { b: 'foreL', cap: .65 },
  thighR: { b: 'thighR', cap: 1.4 }, thighL: { b: 'thighL', cap: 1.4 }, shinR: { b: 'shinR', cap: 1.05 }, shinL: { b: 'shinL', cap: 1.05 },
  sword: { node: rig => rig.katana, cap: 0 },
};
const nodeOf = (rig, part) => { const P = PARTS[part]; return P.node ? P.node(rig) : rig.B[P.b]; };
export const SV = { pieces: [], scene: null, stats: { severs: 0, swords: 0, clatters: 0, rest: 0 } };
export function initSever(scene) { SV.scene = scene; }

const _m = new THREE.Matrix4(), _m2 = new THREE.Matrix4(), _p = new THREE.Vector3(), _q = new THREE.Quaternion(), _s = new THREE.Vector3(), _v = new THREE.Vector3();
const SHEAR_INV = () => _m2.copy(BODY_SHEAR).invert();
// the raw end: a red disc with the bone's pale core, across the joint
function capMesh(r, mat, up) { return piece().cyl(r, r * .92, .28, 8, RAMP.r[4], { p: [0, up * .06, 0] }).cyl(r * .3, r * .3, .34, 6, '#c9b8a6', { p: [0, up * .08, 0] })
  .cyl(r * .62, r * .62, .3, 8, RAMP.r[5], { p: [0, up * .07, 0] }).mesh(mat); }
const visibleMeshes = n => { const out = []; n.traverse(o => { if (o.isMesh && o.visible && o.userData.gore !== 'stump') out.push(o); }); return out; };

// hide a cut part on the body (and everything under it), leaving its stump
export function hidePart(rig, part) { const n = nodeOf(rig, part); if (!n) return; n.traverse(o => { if (o.isMesh && o.userData.gore !== 'stump') o.visible = false; }); }
export function addStump(rig, part, mat) { const P = PARTS[part], n = nodeOf(rig, part); if (!n || !P.cap) return null;
  const m = capMesh(P.cap, mat, P.up ? 1 : -1); m.userData.gore = 'stump'; m.rotation.x = P.up ? 0 : Math.PI; n.add(m); return m; }

// cut `part` off `who` (a Char with the 3D look): returns the piece, or null (pixel look, or nothing left there).
// o: { v: [x, y, z] its velocity, w: [x, y, z] its spin (world, rad/s), float: s of slow fall (a slide off the cut),
//      owner: a tag the piece fades with, bleed: s it bleeds }
export function sever(who, part, o = {}) {
  const rig = who.look && who.look.kind === '3d' && who.look.rig; if (!rig) return null;
  const node = nodeOf(rig, part); if (!node || !visibleMeshes(node).length) return null;
  rig.root.updateMatrixWorld(true);
  // the bone as drawn = root · shear · (his own frame); the piece keeps its own frame and gets its own shear
  const root = rig.root.position.clone(), Mu = new THREE.Matrix4().makeTranslation(root.x, root.y, root.z).multiply(SHEAR_INV()).multiply(_m.makeTranslation(-root.x, -root.y, -root.z)).multiply(node.matrixWorld);
  Mu.decompose(_p, _q, _s);
  const clone = node.clone(true); clone.position.set(0, 0, 0); clone.quaternion.identity(); clone.scale.set(1, 1, 1);
  const obj = who.foe ? 2 : 1, mat = shadeMat({ obj, stencil: true }), cloth = shadeMat({ obj, stencil: true, side: THREE.DoubleSide });
  clone.traverse(c => { if (c.isMesh) c.material = c.material.side === THREE.DoubleSide ? cloth : mat; });
  const P = PARTS[part]; if (P.cap) { const cm = capMesh(P.cap, mat, P.up ? -1 : 1); cm.rotation.x = P.up ? Math.PI : 0; clone.add(cm); }
  // its box in its own frame: the centre of mass and the corners that touch the floor
  clone.updateMatrixWorld(true); const box = new THREE.Box3();
  for (const m of visibleMeshes(clone)) { m.geometry.computeBoundingBox(); box.union(m.geometry.boundingBox.clone().applyMatrix4(m.matrixWorld)); }
  const com = box.getCenter(new THREE.Vector3()), size = box.getSize(new THREE.Vector3()), corners = [];
  for (const x of [box.min.x, box.max.x]) for (const y of [box.min.y, box.max.y]) for (const z of [box.min.z, box.max.z]) corners.push(new THREE.Vector3(x, y, z).sub(com));
  const holder = new THREE.Object3D(); holder.matrixAutoUpdate = false; holder.add(clone); SV.scene.add(holder);
  const q = _q.clone(), c = _p.clone().add(com.clone().applyQuaternion(q));
  const pc = { part, who, holder, clone, mat, cloth, com, corners, q, c, v: new THREE.Vector3(...(o.v || [0, 0, 0])), w: new THREE.Vector3(...(o.w || [0, 0, 0])),
    I: Math.max(.6, (size.x * size.x + size.y * size.y + size.z * size.z) / 12), o: root.clone(), o0: root.clone(), age: 0, float: o.float || 0, sleep: 0, rest: false,
    sword: part === 'sword', owner: o.owner, fade: 0, bleed: o.bleed ?? (part === 'sword' ? 0 : 1.6), cap: P.cap, up: P.up ? 1 : -1, hits: 0 };
  c.addScaledVector(pc.v, 1 / 60);   // already moving on the frame it is cut: the gap shows on the impact frame
  SV.pieces.push(pc); SV.stats[part === 'sword' ? 'swords' : 'severs']++;
  place(pc); return pc;
}

// ---- the rigid bodies: semi-implicit Euler, impulses at the box's corners against the floor (restitution, friction),
// the walls pushing the centre out; a piece that has stopped sleeps. 1/120 s steps on the world's clock (hit-stop holds them)
const UPV = new THREE.Vector3(0, 1, 0);
export function severStep(dt) {
  for (const pc of SV.pieces) { pc.age += dt; if (pc.fade) pc.fade = Math.min(1, pc.fade + dt / .5);
    if (pc.bleed > 0 && pc.age < pc.bleed && pc.cap && rnd() < dt * 26 * (1 - pc.age / pc.bleed)) { const e = capWorld(pc); blood.drip(e.x, e.y, e.z, 1.2); }
    if (pc.rest) continue;
    const grav = pc.float > 0 ? .12 : 1; pc.float -= dt;
    pc.v.y -= G * grav * dt; pc.c.addScaledVector(pc.v, dt);
    const wl = pc.w.length(); if (wl > 1e-5) pc.q.premultiply(_q.setFromAxisAngle(_v.copy(pc.w).divideScalar(wl), wl * dt)).normalize();
    pc.w.multiplyScalar(Math.exp(-.5 * dt));
    // the floor: lift the deepest corner out, then an impulse at every corner still going down into it
    let deep = 0, touch = false; const rws = pc.corners.map(r => r.clone().applyQuaternion(pc.q));
    for (const rw of rws) { const y = pc.c.y + rw.y, gy = groundAt(pc.c.x + rw.x, pc.c.z + rw.z); if (y < gy) deep = Math.max(deep, gy - y); }
    if (deep > 0) { pc.c.y += deep; touch = true; }
    for (const rw of rws) { const gy = groundAt(pc.c.x + rw.x, pc.c.z + rw.z); if (pc.c.y + rw.y > gy + .02) continue; touch = true;   // a corner on the floor counts as touching, not only one sunk into it
      const vp = _v.copy(pc.w).cross(rw).add(pc.v); if (vp.y >= 0) continue;
      const rn = rw.clone().cross(UPV), e = -vp.y > 4 ? (pc.sword ? .38 : .22) : 0, j = -(1 + e) * vp.y / (1 + rn.lengthSq() / pc.I);   // a resting contact (slower than ~3 steps of gravity) does not bounce: the micro-bounce kept a sword on its edge from ever sleeping
      if (pc.sword && -vp.y > 16 && pc.age - (pc.lastClk || -1) > .08) clatter(pc, rw, -vp.y);
      pc.v.y += j; pc.w.addScaledVector(rn, j / pc.I);
      const vt = new THREE.Vector3(vp.x, 0, vp.z), sp = vt.length();   // friction against the slide, at most µ·j
      if (sp > 1e-4) { const jt = Math.min(sp / (1 + rw.clone().cross(vt.clone().normalize()).lengthSq() / pc.I), .6 * j), d = vt.normalize().multiplyScalar(-jt);
        pc.v.add(d); pc.w.addScaledVector(rw.clone().cross(d), 1 / pc.I); } }
    if (touch) { const late = pc.age > 1.2 ? 5 : 1;   // a piece still rocking on a corner after a while settles: everything comes to rest in ~2 s
      pc.w.multiplyScalar(Math.exp(-2.2 * late * dt)); pc.v.x *= Math.exp(-1.2 * late * dt); pc.v.z *= Math.exp(-1.2 * late * dt);
      if (!pc.landed) { pc.landed = 1; if (!pc.sword) { dust(W0, pc.c.x / AF, pc.c.z / AF, 5, { spd: 22, life: .4 }); blood.spray(pc.c.x, pc.c.y + .5, pc.c.z, [pc.v.x, 4, pc.v.z], 'light', { k: .4, spd: .5 }); } } }
    const p = { x: pc.c.x, z: pc.c.z }; collide(p, Math.min(2.5, pc.I)); if (p.x !== pc.c.x || p.z !== pc.c.z) { pc.v.x *= -.3; pc.v.z *= -.3; pc.c.x = p.x; pc.c.z = p.z; }
    if (touch && pc.v.length() < 1.6 && pc.w.length() < .7) { pc.sleep += dt; if (pc.sleep > .25) { pc.rest = true; SV.stats.rest++; } }
    else pc.sleep = pc.age > 1.2 ? Math.max(0, pc.sleep - dt) : 0;   // late, a one-step twitch (a corner's impulse) only sets the count back: a sword on its edge settles in ~2 s
  }
  const gone = SV.pieces.filter(pc => pc.fade >= 1); for (const pc of gone) { SV.scene.remove(pc.holder); SV.pieces.splice(SV.pieces.indexOf(pc), 1); }
}
let W0 = null; export const severWorld = W => { W0 = W; };
function clatter(pc, rw, v) { pc.lastClk = pc.age; SV.stats.clatters++; const x = pc.c.x + rw.x, z = pc.c.z + rw.z;
  sparks(W0, x / AF, 1, z / AF, 3 + Math.min(5, v / 8 | 0), { spd: 40 + v, spread: 6 }); dust(W0, x / AF, z / AF, 2, { spd: 14, life: .3 }); }
// where the raw end of a piece is now (world, unsheared: the drops start there)
function capWorld(pc) { return pc.c.clone().add(pc.com.clone().negate().applyQuaternion(pc.q)); }

// ---- drawing: the piece's frame through the bodies' camera round a point easing from his feet to the floor under it ----
function place(pc) {
  const k = Math.min(1, pc.age / .4), e = k * k * (3 - 2 * k), q0 = capWorld(pc), gy = groundAt(q0.x, q0.z);
  pc.o.set(pc.o0.x + (q0.x - pc.o0.x) * e, pc.o0.y + (gy - pc.o0.y) * e, pc.o0.z + (q0.z - pc.o0.z) * e);
  pc.holder.matrix.makeTranslation(pc.o.x, pc.o.y, pc.o.z).multiply(BODY_SHEAR).multiply(_m.makeTranslation(q0.x - pc.o.x, q0.y - pc.o.y, q0.z - pc.o.z)).multiply(_m2.makeRotationFromQuaternion(pc.q));
  pc.holder.matrixWorldNeedsUpdate = true;
  pc.mat.uniforms.uFade.value = pc.cloth.uniforms.uFade.value = pc.fade;
}
export function severSync() { for (const pc of SV.pieces) place(pc); }
// his pieces go when he stands up again
export function fadePieces(who) { for (const pc of SV.pieces) if (pc.who === who && !pc.fade) pc.fade = .01; }
export const piecesOf = who => SV.pieces.filter(pc => pc.who === who);

// ---- which part a blow takes: the joint nearest the blade's line (its mid to past its tip, as drawn) ----
const JOINTS = { head: 'head', upper: 'spine', armR: 'armR', armL: 'armL', foreR: 'foreR', foreL: 'foreL', thighR: 'thighR', thighL: 'thighL', shinR: 'shinR', shinL: 'shinL' };
export function nearestPart(rig, a, b, heavy) {
  if (!rig) return null; let best = null, bd = 1e9; const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b), ab = B.clone().sub(A), L2 = ab.lengthSq() || 1;
  for (const k in JOINTS) { const n = rig.B[JOINTS[k]]; if (!n || !visibleMeshes(n).length) continue; n.getWorldPosition(_v);
    const t = Math.max(0, Math.min(1, _v.clone().sub(A).dot(ab) / L2)), d = _v.distanceTo(A.clone().addScaledVector(ab, t)) * (k === 'upper' ? 1.25 : 1) * (heavy && (k === 'head' || k.startsWith('arm')) ? .85 : 1);
    if (d < bd) { bd = d; best = k; } }
  return best;
}
