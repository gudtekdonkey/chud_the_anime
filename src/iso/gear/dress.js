// ---- The dresser: any outfit (a piece per slot and layer, gear/items.js) on the 3D skeleton. It returns the same rig
// as Iron Ash's (look/three/ronin.js), so rig.js `applyPose` poses it and look3d.js draws it unchanged: the bones, the
// springs (kusazuri, sode, cloth panels, cords), the hat pivot when a hat is worn, the eyes, the katana and its saya.
// The outfit is resolved first (who hides or shapes what), then every part is built inside out by shell, each sitting on
// what the shells under it have built up (gear/parts.js), and merged into one mesh per bone and material.
import * as THREE from 'three';
import { Piece, newPart, piece } from '../gfx/build.js';
import { RAMP as R } from '../gfx/palette.js';
import { shadeMat } from '../gfx/shade.js';
import { BODY_SHEAR } from '../gfx/view.js';
import { makeSkeleton, SK } from '../look/three/rig.js';
import { KINDS, makeCtx, keyOf, BODY, HC, HEAD_R, FACE_Z } from './parts.js';
import { SLOTS, LAYERS, LIMB } from './schema.js';
import { BY_ID } from './items.js';

class GPiece extends Piece {   // an open tube with two radii (a hanging sleeve, a veil)
  ring2(rt, rb, h, seg, col, o) { return this.add(new THREE.CylinderGeometry(rt, rb, h, seg, 1, true), col, o); }
}
const node = (parent, p = [0, 0, 0], r = [0, 0, 0]) => { const o = new THREE.Object3D(); o.position.set(...p); o.rotation.set(...r); parent.add(o); return o; };

// the pieces an outfit wears, in slot then layer order
export function worn(outfit) { const out = [];
  for (const slot of SLOTS) for (const layer of LAYERS) { const id = outfit && outfit[slot] && outfit[slot][layer]; if (!id) continue;
    const p = BY_ID[id]; if (!p) throw new Error(`gear: no piece ${id}`); if (p.slot !== slot || p.layer !== layer) throw new Error(`gear: ${id} is ${p.slot}/${p.layer}, worn as ${slot}/${layer}`); out.push(p); }
  return out; }

// who hides or shapes what: every part with its side, hidden or reshaped by the other pieces (never by its own)
export function resolve(outfit) {
  const ps = worn(outfit), entries = [];
  for (const p of ps) for (const q0 of p.parts) for (const side of LIMB[q0.z] ? (q0.side ? [q0.side] : p.side ? [p.side] : ['L', 'R']) : [null]) {
    const near = o => o !== p && (!o.side || !side || o.side === side);
    let q = q0, hidden = ps.find(o => near(o) && o.shell > q0.sh && (o.hides || []).includes(q0.z)) || null, shapedBy = null;
    if (!hidden && q0.alt) for (const o of ps) { const form = near(o) && o.shell > q0.sh && o.shapes && o.shapes[q0.z];
      if (form && q0.alt[form]) { shapedBy = o; if (q0.alt[form] === 'hide') hidden = o; else q = { ...q0, ...q0.alt[form] }; break; } }
    entries.push({ p, q, side, hidden, shapedBy });
  }
  entries.sort((a, b) => a.q.sh - b.q.sh);   // stable: inside out, slot order within a shell
  return { pieces: ps, entries };
}

// the dressed rig. `obj` is the outline's object id (1 the hero, 2 a samurai)
export function makeDressed(outfit, { obj = 1 } = {}) {
  const mat = shadeMat({ obj, stencil: true }), cloth = shadeMat({ obj, stencil: true, side: THREE.DoubleSide }), meshes = [];
  const root = new THREE.Object3D(), shear = node(root); shear.matrixAutoUpdate = false;
  const body = node(shear), B = makeSkeleton(body);
  const rig = { root, shear, body, B, meshes, mats: [mat, cloth], springs: [], eyes: [], hatTilt: 14 * Math.PI / 180, newPiece: () => new GPiece(), outfit };
  const { pieces, entries } = resolve(outfit), report = Object.fromEntries(pieces.map(p => [p.id, { built: 0, hidden: 0, shaped: 0 }]));
  const ctx = makeCtx(rig, {});
  const put = (bone, pc, m = mat) => { const me = pc.mesh(m); bone.add(me); meshes.push(me); return me; };

  // ---- the body under everything (shell 0): a near-black under-suit, so an empty slot reads as plain dark cloth ----
  const sk = R.k[2], skD = R.k[1];
  for (const z of ['neck', 'chest', 'belly', 'hips']) KINDS.tube({ ...ctx, padMax: () => 0, raise() {}, col: c => c }, { z, th: 0, c: z === 'neck' ? skD : sk, seg: 8 }, null);
  for (const sd of ['L', 'R']) { const bodyCtx = { ...ctx, padMax: () => 0, raise() {}, col: c => c };
    for (const z of ['upper', 'fore', 'thigh', 'shin']) KINDS.tube(bodyCtx, { z, th: 0, c: sk, seg: 7 }, sd);
    newPart(); ctx.pc(B['arm' + sd]).ball(.72, sk, { p: [0, .1, 0] });
    newPart(); ctx.pc(B['hand' + sd]).box(.72, .84, .66, skD, { p: [0, -.4, 0] });
    newPart(); ctx.pc(B['foot' + sd]).box(.8, .62, 1.62, skD, { p: [0, -.3, .4] }); }
  newPart(); ctx.pc(B.head).ball(HEAD_R, R.k[3], { p: [0, HC, 0], s: [1, 1.04, 1] }, 1);

  // ---- the gear, inside out ----
  for (const e of entries) {
    const r = report[e.p.id]; if (e.hidden) { r.hidden++; continue; }
    ctx.pal = e.p.pal; KINDS[e.q.k](ctx, e.q, e.side); r.built++; if (e.shapedBy) r.shaped++;
  }
  // ---- the eyes: two cyan points on whatever covers the face at the eye line (the glint rule stamps them under a brim) ----
  const ez = FACE_Z + ctx.padMax('eye') + .04;
  for (const sx of [1, -1]) { const e = node(B.head, [.5 * sx, HC + .22, ez]); rig.eyes.push(e); newPart(); ctx.pc(e).box(.4, .24, .2, R.y[1], { glow: true }); }

  // ---- the saya at his left hip, out past whatever the hips wear; the katana in it (rig.js draws it from there) ----
  const hp = ctx.padMax('hips', 0, .5), saya = node(B.hips, [1.9 + hp * .8, .6, 1.1 + hp * .5]); rig.saya = saya;
  newPart(); ctx.pc(saya).box(.48, .62, 10.5, R.k[2], { p: [0, 0, -5.25] }).box(.56, .7, .45, R.i[6], { p: [0, 0, -.2] }).box(.56, .7, .5, R.i[5], { p: [0, 0, -10.4] });
  newPart(); ctx.pc(saya).box(.58, .2, 2.0, R.m[3], { p: [0, .3, -1.5] });
  const K = node(B.root); rig.katana = K;
  newPart(); ctx.pc(K).box(.42, .48, 2.6, R.i[2], { p: [0, 0, -1.1] }).box(.48, .52, .3, R.i[7], { p: [0, 0, -2.45] });
  newPart(); ctx.pc(K).cyl(.7, .7, .18, 8, R.i[7], { p: [0, 0, .15], r: [Math.PI / 2, 0, 0] });
  const bladeN = node(K); rig.blade = bladeN;
  newPart(); ctx.pc(bladeN).box(.18, .45, 11.4, R.i[9], { p: [0, 0, 6.0], glow: true }).box(.12, .14, 11.1, R.i[10], { p: [0, -.21, 6.0], glow: true });

  // one mesh per bone and material
  for (const [n, e] of ctx.acc) { if (e.mat) put(n, e.mat, mat); if (e.cloth) put(n, e.cloth, cloth); }
  const shm = shadeMat({ obj: 3 }); shm.uniforms.uFade.value = .45;
  const shadow = piece().cyl(5.4, 5.4, .05, 14, R.k[0], { p: [0, .06, 0], s: [1, 1, .62], glow: true }).mesh(shm); root.add(shadow); rig.shadow = shadow;
  for (const me of meshes) me.layers.enable(1);
  rig.updateShear = () => shear.matrix.copy(BODY_SHEAR); rig.updateShear();
  rig.report = report; rig.pads = ctx.pads;
  return rig;
}
export { BODY, SK };
