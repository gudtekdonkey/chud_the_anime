// ---- Building low-poly pieces: every primitive is flat-shaded (each face its own normal, the facets read as plates),
// carries its colour per vertex (alpha 0 = emissive, unlit) and a part number (the outline draws a crease where parts meet).
// A bone's pieces are merged into one mesh, so a character is a few dozen draw calls.
import * as THREE from 'three';
import { hex } from './palette.js';

const tmpM = new THREE.Matrix4(), tmpQ = new THREE.Quaternion(), tmpE = new THREE.Euler(), tmpS = new THREE.Vector3(1, 1, 1);
let PART = 1;
export const newPart = () => (PART = PART % 250 + 1);   // a fresh part number for the next pieces

export class Piece {
  constructor() { this.geos = []; }
  // add a geometry at p (position), r (euler xyz), s (scale), coloured `col` (hex), part = crease group
  add(geo, col, { p = [0, 0, 0], r = [0, 0, 0], s = [1, 1, 1], part = PART, glow = false } = {}) {
    const g = geo.index ? geo.toNonIndexed() : geo;
    tmpQ.setFromEuler(tmpE.set(r[0], r[1], r[2])); tmpM.compose(new THREE.Vector3(...p), tmpQ, tmpS.set(...s));
    g.applyMatrix4(tmpM); g.computeVertexNormals();      // non-indexed: one normal per face, flat
    const n = g.attributes.position.count, c = hex(col), C = new Float32Array(n * 4), P = new Float32Array(n).fill(part);
    for (let i = 0; i < n; i++) C.set([c[0], c[1], c[2], glow ? 0 : 1], i * 4);
    g.setAttribute('color', new THREE.BufferAttribute(C, 4)); g.setAttribute('part', new THREE.BufferAttribute(P, 1));
    for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'color', 'part'].includes(k)) g.deleteAttribute(k);
    this.geos.push(g); return this;
  }
  box(w, h, d, col, o) { return this.add(new THREE.BoxGeometry(w, h, d), col, o); }
  cyl(rt, rb, h, seg, col, o) { return this.add(new THREE.CylinderGeometry(rt, rb, h, seg, 1, false), col, o); }
  ring(r, h, seg, col, o) { return this.add(new THREE.CylinderGeometry(r, r, h, seg, 1, true), col, o); }
  ball(r, col, o, det = 0) { return this.add(new THREE.IcosahedronGeometry(r, det), col, o); }
  merged() {
    let n = 0; for (const g of this.geos) n += g.attributes.position.count;
    const out = new THREE.BufferGeometry(), A = { position: 3, normal: 3, color: 4, part: 1 };
    for (const [k, w] of Object.entries(A)) { const arr = new Float32Array(n * w); let o = 0;
      for (const g of this.geos) { arr.set(g.attributes[k].array, o); o += g.attributes[k].array.length; }
      out.setAttribute(k, new THREE.BufferAttribute(arr, w)); }
    out.computeBoundingSphere(); return out;
  }
  mesh(mat) { const m = new THREE.Mesh(this.merged(), mat); m.frustumCulled = false; return m; }
}
export const piece = () => new Piece();
