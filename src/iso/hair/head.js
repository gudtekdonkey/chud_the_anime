// ---- The head slot on the 3D look: a hairstyle (styles.js) and a hat (hats.js) put on a ronin.js rig through the
// contract (contract.js, docs/hair.md). Each frame, after the pose is applied: the brim pivot takes the hat's springs
// (as ronin.js's jingasa always has), the chains (tails, braids, loose hair, a hat's ties) hang from the head on the
// Animation Flow page's springs (the pose's hatLag, speed, swing and roll) and are pushed clear of his body, and every
// hair vertex the hat could cover is kept inside the hat's shells, so nothing is ever drawn through it: hair under a
// brim is compressed under it, a band pinches what crosses it, a hood or basket holds what it covers.
import * as THREE from 'three';
import { piece, newPart } from 'ronin-engine/render/gfx/build.js';
import { RAMP as R } from 'ronin-engine/render/gfx/palette.js';
import { SK } from 'ronin-engine/render/rig3d.js';
import { AF } from 'ronin-engine/flow/flow.js';
import { HC, resolve, clampPt, inside, pushOut, BODY, MARGIN, validate } from './contract.js';
import { shell, rod, spike, lump, loop, segment } from './parts.js';
import { HAIR, HAIR_ID, COLS, DEFAULT_HAIR } from './styles.js';
import { HATS, HAT } from './hats.js';

validate(HAIR, HATS);
// the live picks (the overlay's pickers write them; a look built with `head` keeps its own)
export const HEADS = { hero: { hair: DEFAULT_HAIR.hero, hat: 'jingasa' }, foe: { hair: DEFAULT_HAIR.foe, hat: 'none' } };
const SKIN = { hero: '#3a2f2a', foe: '#5a463a' };          // the bare head (a shaved pate): his dark, the samurai's skin
const V = () => new THREE.Vector3(), _p = V(), _m = new THREE.Matrix4(), _mi = new THREE.Matrix4(), _x = V(), _y = V(), _z = V();

export function headSlot(rig, { foe = false, head = null } = {}) {
  const who = foe ? 'foe' : 'hero', B = rig.B, made = [];
  const slot = { key: '', refused: false, res: null, hat: null, hair: null, chains: [], clampable: [], hatMeshes: [], node: null, hatNode: null, pivot: null };
  const spec = () => head || HEADS[who];
  const add = (parent, o) => { parent.add(o); made.push(o); return o; };
  const meshOf = (pc, cloth) => { const m = pc.mesh(cloth ? rig.mats[1] : rig.mats[0]); m.layers.enable(1); return m; };

  function clear() {
    for (const o of made) { o.parent && o.parent.remove(o); o.traverse(n => n.geometry && n.geometry.dispose()); }
    made.length = 0; slot.chains = []; slot.clampable = []; slot.hatMeshes = [];
  }
  function build() {
    clear(); const s = spec(); let hair = HAIR_ID[s.hair] || HAIR_ID[DEFAULT_HAIR[who]], hat = HAT[s.hat] || HAT.none;
    const res = resolve(hair, hat); slot.refused = res.refused;
    if (res.refused) { hat = HAT.none; Object.assign(res, resolve(hair, hat)); }   // the pair cannot be worn: he goes bare-headed
    Object.assign(slot, { key: s.hair + '|' + s.hat, res, hat, hair });
    // ronin.js's own pieces: his jingasa and its cords, the samurai's topknot; the scalp takes the style's colour
    if (rig.hatPivot) rig.hatPivot.visible = false;
    for (const sp of rig.springs) if (sp.kind === 'cord') sp.node.visible = !!hat.cords && !foe;
    if (rig.knot) rig.knot.visible = false;
    const col = { ...COLS[hair.col], skin: SKIN[who] }; paint(rig.scalp, hair.scalp === 'skin' ? col.skin : col.h);
    // the hat
    const centre = slot.node = add(B.head, new THREE.Object3D()); centre.position.set(0, HC, 0);
    if (hat.mount === 'pivot') { slot.pivot = add(B.head, new THREE.Object3D()); slot.hatNode = new THREE.Object3D(); slot.pivot.add(slot.hatNode); }
    else { slot.pivot = null; slot.hatNode = new THREE.Object3D(); centre.add(slot.hatNode); }
    for (const pc of hat.build()) { const m = meshOf(pc, hat.cloth); slot.hatNode.add(m); slot.hatMeshes.push(m); }
    rig.hat = hat.brim ? slot.hatNode : null; rig.hatR = hat.brim || 0; rig.glint = foe ? R.l[4] : null;
    // the hair: one mesh per region, each kept inside the hat
    const by = {};
    for (const p of hair.parts) { const reg = res.regions[p.r]; if (reg === 'hide') continue;
      if (p.r === 'knot' && res.knot !== 'show' && res.knot !== 'under') continue;
      (by[p.r] ||= piece()); newPart(); part(by[p.r], p, col); }
    for (const k in by) { const m = meshOf(by[k]); centre.add(m); slot.clampable.push(clampOf(m)); }
    // what the hat makes of a crown item: through its hole, or tied again low at the nape
    const chains = (hair.chains || []).filter(c => res.regions[c.r] !== 'hide' && (c.r !== 'knot' || res.knot === 'show' || res.knot === 'under')).map(c => ({ ...c, space: centre }));
    if (hair.crownItem && res.knot === 'through' && hat.hole) {
      const h = hat.hole, pc = piece(); newPart();
      rod(pc, col.h, [h[0], h[1] - .75, h[2]], [0, 1, 0], 1.3, .3, .26); rod(pc, col.tie, [h[0], h[1] + .1, h[2]], [0, 1, 0], .3, .3, .3);
      if (hair.crownItem === 'knot') for (const d of [[0, 1, -.3], [.5, 1, 0], [-.5, 1, 0], [0, 1, .4]]) spike(pc, col.hi, [h[0], h[1] + .45, h[2]], d, .75, .2);
      const m = meshOf(pc); slot.hatNode.add(m); made.push(m);
      if (hair.crownItem === 'tail') { const c = hair.chains.find(c => c.r === 'knot'); chains.push({ ...c, root: [h[0], h[1] + .45, h[2]], dir: [0, 1, -.7], space: slot.hatNode, noClamp: true }); }
    }
    if (hair.crownItem && res.knot === 'behind') {
      const pc = piece(); newPart(); lump(pc, col.h, [0, -.5, -2.18], .42, [1.1, .9, .85]); lump(pc, col.tie, [0, -.18, -2.12], .22, [1.4, .7, .8]);
      const m = meshOf(pc); centre.add(m); slot.clampable.push(clampOf(m));
      const c = (hair.chains || []).find(c => c.r === 'knot'); if (c) chains.push({ ...c, root: [0, -.62, -2.2], dir: [0, -1, -.35], space: centre });
    }
    for (const c of hat.chains || []) chains.push({ ...c, space: slot.hatNode, noClamp: true, hatChain: true });
    for (const c of chains) { const ch = chainOf(c, col, c.hatChain && hat.cloth ? rig.mats[1] : rig.mats[0]); slot.chains.push(ch);
      for (const sg of ch.segs) { add(rig.body, sg.node); sg.mesh.layers.enable(1); } }
    for (const c of slot.chains) if (!c.spec.noClamp) for (const s of c.segs) slot.clampable.push(clampOf(s.mesh));
  }

  // ---- each frame: the brim pivot, the chains, the clamp
  slot.update = P => {
    const s = spec(); if (s.hair + '|' + s.hat !== slot.key) build();
    if (slot.pivot) { const lag = P.hatLag || [0, 0];   // ronin.js's jingasa, joint for joint (rig.js applyPose)
      slot.pivot.position.set(0, SK.headR + 1.1 * AF + lag[1] * AF * .5, lag[0] * AF * .5);
      slot.pivot.rotation.set((P.hatTilt || 0) - (P.lean || 0) - (P.head || 0) - rig.hatTilt, 0, 0); }
    rig.root.updateMatrixWorld(true);
    const bodyInv = _mi.copy(rig.body.matrixWorld).invert().clone();
    const cols = BODY.map(c => { const m = bodyInv.clone().multiply(B[c.b].matrixWorld); return { c, m, inv: m.clone().invert() }; });
    for (const ch of slot.chains) hang(ch, P, bodyInv, cols);
    clampAll();
  };
  function clampAll() {
    const shells = slot.hat.shells; if (!shells.length) { for (const c of slot.clampable) if (c.dirty) restore(c); return; }
    const hatInv = new THREE.Matrix4().copy(slot.hatNode.matrixWorld).invert();
    for (const c of slot.clampable) {
      const M = hatInv.clone().multiply(c.mesh.matrixWorld), Mi = M.clone().invert(), pos = c.mesh.geometry.attributes.position, a = pos.array, r = c.rest; let moved = false;
      for (let i = 0; i < r.length; i += 3) { _p.set(r[i], r[i + 1], r[i + 2]).applyMatrix4(M); let mv = false;
        for (let k = 0; k < 3; k++) { let any = false; for (const s of shells) if (clampPt(s, _p)) any = true; mv ||= any; if (!any) break; }   // overlapping shells: settle in a few passes
        if (mv) { moved = true; _p.applyMatrix4(Mi); a[i] = _p.x; a[i + 1] = _p.y; a[i + 2] = _p.z; } else { a[i] = r[i]; a[i + 1] = r[i + 1]; a[i + 2] = r[i + 2]; } }
      if (moved || c.dirty) { pos.needsUpdate = true; c.mesh.geometry.computeVertexNormals(); c.dirty = moved; }
    }
  }
  const restore = c => { c.mesh.geometry.attributes.position.array.set(c.rest); c.mesh.geometry.attributes.position.needsUpdate = true; c.mesh.geometry.computeVertexNormals(); c.dirty = false; };

  // ---- the audit for the check: hair outside a shell, a chain through his body, a hat through his body (counts)
  slot.audit = () => {
    const out = { shell: 0, body: 0, hatBody: 0, verts: 0 };
    rig.root.updateMatrixWorld(true);
    const bodyInv = new THREE.Matrix4().copy(rig.body.matrixWorld).invert();
    const cols = BODY.map(c => { const m = bodyInv.clone().multiply(B[c.b].matrixWorld); return { c, inv: m.clone().invert() }; });
    if (slot.hat.shells.length) { const hatInv = new THREE.Matrix4().copy(slot.hatNode.matrixWorld).invert();
      for (const c of slot.clampable) { const M = hatInv.clone().multiply(c.mesh.matrixWorld), a = c.mesh.geometry.attributes.position.array;
        for (let i = 0; i < a.length; i += 3) { out.verts++; _p.set(a[i], a[i + 1], a[i + 2]).applyMatrix4(M); if (slot.hat.shells.some(s => !inside(s, _p, MARGIN - .03))) out.shell++; } } }
    for (const ch of slot.chains) { const m = ch.spec.d / 2 - .06;
      for (let i = 0; i + 1 < ch.pts.length; i++) for (const u of [0, .25, .5, .75, 1]) { if (i === 0 && u < .5) continue;
        const q = ch.pts[i].clone().lerp(ch.pts[i + 1], u);
        for (const { c, inv } of cols) { if (c.b === 'head' && (i + u) * ch.L < 2.6) continue; const t = q.clone().applyMatrix4(inv); const t0 = t.clone(); if (pushOut(c, t, Math.max(0, m)) && t.distanceTo(t0) > .02) { out.body++; break; } } } }
    for (const m of slot.hatMeshes) { const M = bodyInv.clone().multiply(m.matrixWorld), a = m.geometry.attributes.position.array;
      for (let i = 0; i < a.length; i += 3) { const q = _p.set(a[i], a[i + 1], a[i + 2]).applyMatrix4(M);
        for (const { c, inv } of cols.slice(0, 2)) if (pushOut(c, q.clone().applyMatrix4(inv), -.05)) { out.hatBody++; break; } } }
    return out;
  };
  slot.dispose = clear;
  return slot;
}

// a style part into a piece, in centre space
function part(pc, p, col) {
  const c = col[p.c] || col.h;
  if (p.g === 'shell') shell(pc, c, p);
  else if (p.g === 'rod') rod(pc, c, p.at, p.dir, p.len, p.r0, p.r1);
  else if (p.g === 'spike') spike(pc, c, p.at, p.dir, p.len, p.w / 2);
  else if (p.g === 'lump') lump(pc, c, p.at, p.rad, p.s);
  else if (p.g === 'loop') loop(pc, c, p.at, p.R, p.tube, p.rot);
  else if (p.g === 'box') pc.box(p.s[0], p.s[1], p.s[2], c, { p: p.at, r: p.rot || [0, 0, 0] });
}
const clampOf = mesh => ({ mesh, rest: Float32Array.from(mesh.geometry.attributes.position.array), dirty: false });
function paint(mesh, hex) { if (!mesh) return; const c = new THREE.Color(hex), a = mesh.geometry.attributes.color;
  for (let i = 0; i < a.count; i++) a.setXYZ(i, c.r, c.g, c.b); a.needsUpdate = true; }

// ---- a chain: segments on nodes under the body, re-placed every frame from the points `hang` solves
function chainOf(spec, col, mat) {
  const n = spec.segs, L = spec.len / n, c = spec.c || col.h, hi = spec.hi || col.hi, segs = [];
  for (let i = 0; i < n; i++) { const u0 = i / n, u1 = (i + 1) / n, w0 = spec.w[0] + (spec.w[1] - spec.w[0]) * u0, w1 = spec.w[0] + (spec.w[1] - spec.w[0]) * u1;
    newPart(); const node = new THREE.Object3D(), mesh = segment(spec.kind, c, hi, L, w0, w1, spec.d, i === n - 1, spec.tip).mesh(mat);
    segs.push({ node, mesh }); node.add(mesh); }
  return { spec, L, segs, pts: Array.from({ length: n + 1 }, V) };
}
function hang(ch, P, bodyInv, cols) {
  const s = ch.spec, n = s.segs, L = ch.L;
  // the root and the direction it leaves the head in, in the body's space
  const M = bodyInv.clone().multiply(s.space.matrixWorld), p0 = ch.pts[0].set(...s.root).applyMatrix4(M);
  const dh = V().set(...s.dir).transformDirection(M);
  // gravity, swung by the flow's springs: back with speed and the head's lag, aside with the swing and the turn
  const lag = P.hatLag || [0, 0], back = .12 + .38 * Math.max(-.3, P.speed || 0) - lag[0] * .1 + lag[1] * .05, side = (P.swing || 0) * .05 - (P.roll || 0) * .7;
  const g = V().set(Math.sin(side), -Math.cos(back) * Math.cos(side), -Math.sin(back)).normalize();
  for (let i = 0; i < n; i++) { const w = s.hang * Math.min(1, (i + 1) / n * 1.6), d = dh.clone().multiplyScalar(1 - w).addScaledVector(g, w).normalize();
    ch.pts[i + 1].copy(ch.pts[i]).addScaledVector(d, L); }
  // clear of his body: push each point out, keep the lengths, then a last push
  const m = s.d / 2 + .05, out = (q, head = true) => { for (const { c, m: cm, inv } of cols) { if (!head && c.b === 'head') continue; const t = q.clone().applyMatrix4(inv); if (pushOut(c, t, m)) q.copy(t.applyMatrix4(cm)); } };
  // a segment between two clear points can still cut a corner: its samples push its end out too (it swings about its start)
  const swing = (i, head) => { const a = ch.pts[i - 1], b = ch.pts[i]; for (const u of [.25, .5, .75]) { const q = a.clone().lerp(b, u), q0 = q.clone(); out(q, head); if (q.distanceToSquared(q0) > 1e-8) b.addScaledVector(q.sub(q0), 1 / u); } };
  for (let it = 0; it < 4; it++) for (let i = 1; i <= n; i++) { const q = ch.pts[i]; out(q); swing(i); const d = q.clone().sub(ch.pts[i - 1]); q.copy(ch.pts[i - 1]).addScaledVector(d.normalize(), L); }
  // last, the body wins over the head: tucked (the roll), the nape meets the collar and the root's hair may brush the scalp
  for (let i = 1; i <= n; i++) { if (i === 1) { out(ch.pts[1]); swing(1); } out(ch.pts[i], i > 1); swing(i, i > 1); }
  // squeezed between two (the roll's tuck: the nape against the collar): step back, behind him, until clear
  const hit = q => cols.some(({ c, inv }) => c.b !== 'head' && pushOut(c, q.clone().applyMatrix4(inv), m - .1));
  const away = V().set(0, 0, -1).transformDirection(cols[0].m);   // behind his chest, however he is turned
  for (let i = 1; i <= n; i++) for (let k = 0; k < 24; k++) { const a = ch.pts[i - 1], b = ch.pts[i];
    if (![.25, .5, .75, 1].some(u => hit(a.clone().lerp(b, u)))) break; b.addScaledVector(away, .08); }
  // the segments: each on its point, its −y toward the next, its +x kept to his left
  for (let i = 0; i < n; i++) { const a = ch.pts[i], b = ch.pts[i + 1], sg = ch.segs[i], dist = a.distanceTo(b);
    _y.copy(a).sub(b).normalize(); _x.set(1, 0, 0).addScaledVector(_y, -_y.x); if (_x.lengthSq() < 1e-6) _x.set(0, 0, 1); _x.normalize(); _z.crossVectors(_x, _y);
    sg.node.position.copy(a); sg.node.quaternion.setFromRotationMatrix(_m.makeBasis(_x, _y, _z)); sg.node.scale.set(1, dist / L, 1); sg.node.updateMatrixWorld(true); }
}
export { HAIR, HATS };
