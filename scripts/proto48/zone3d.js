// ---- A sim zone built in 3D, for the world-walk design page (prototype 48's renders; nothing in the game imports it).
// tilesOf() gives 64 × 64 terrain tiles; each tile becomes T world units of ground (T is the scale question). Two ways
// to build it: 'blocks' (each tile a block, a diorama) and 'kit' (one ground mesh with soft terrain edges, then props
// from a kit in the courtyard's style: houses, trees, bamboo, rocks, walls, palisades, a torii). Night-lit, through the
// slice's own shader and pipeline.
import * as THREE from 'three';
import { piece, newPart } from 'ronin-engine/iso/gfx/build.js';
import { RAMP as R, hex } from 'ronin-engine/iso/gfx/palette.js';
import { shadeMat } from 'ronin-engine/iso/gfx/shade.js';
import { tilesOf, TERRAIN, ZONE, zoneAt } from 'ronin-engine/sim/index.js';

const TI = Object.fromEntries(TERRAIN.map((t, i) => [t, i]));
const h01 = (...a) => { let h = 2166136261; for (const v of a) { h ^= Math.floor(v * 73856093) | 0; h = Math.imul(h, 16777619); h ^= h >>> 13; } return ((h >>> 0) % 10007) / 10007; };
// the ground's colour per terrain (dark, night-lit like the courtyard's stone)
const GROUND = { grass: '#232a1c', field: '#3a3322', paddy: '#1e2a30', forest: '#1a2117', bamboo: '#202a1a', water: '#121a26', rock: '#2b3443', sand: '#47432f',
  road: '#3b3428', building: '#2a2620', marsh: '#1c2420', shrine: '#354052', palisade: '#2f2a20', wall: '#2b3443' };
const LEAF = ['#1d2a1b', '#24331f', '#2c3d25', '#334729'], STALK = ['#3a4a28', '#465a2e', '#2f3d22'];
const DROP = { water: -5, paddy: -1.2, marsh: -1 };

export function buildZone(scene, L, zx, zy, { T = 32, mode = 'kit', ox = 0, oz = 0, props = true, hole = null } = {}) {
  const Z = zoneAt(L, zx, zy), tl = tilesOf(L, zx, zy), at = (x, y) => tl.t[Math.max(0, Math.min(ZONE - 1, y)) * ZONE + Math.max(0, Math.min(ZONE - 1, x))];
  const name = x => TERRAIN[x], solids = [], lamps = [], world = shadeMat({ obj: 0 }), glow = shadeMat({ obj: 3 });
  const W = x => ox + x * T, D = y => oz + y * T, out = { solids, lamps, zone: Z, T, x0: ox, z0: oz, x1: ox + ZONE * T, z1: oz + ZONE * T, meshes: [] };
  const add = (m, mat = world) => { const me = m.mesh(mat); scene.add(me); out.meshes.push(me); return me; };
  if (mode === 'blocks') return blocks();
  ground();
  if (!props) return out;
  const P = piece(), G = piece();   // the props, and what glows
  // ---- houses: the building tiles cut into rectangles of up to 5 × 4 tiles
  const used = new Uint8Array(ZONE * ZONE), rects = [];
  for (let y = 0; y < ZONE; y++) for (let x = 0; x < ZONE; x++) { if (at(x, y) !== TI.building || used[y * ZONE + x]) continue;
    let w = 1, h = 1; while (w < 5 && x + w < ZONE && at(x + w, y) === TI.building && !used[y * ZONE + x + w]) w++;
    grow: while (h < 4 && y + h < ZONE) { for (let i = 0; i < w; i++) if (at(x + i, y + h) !== TI.building || used[(y + h) * ZONE + x + i]) break grow; h++; }
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) used[(y + j) * ZONE + x + i] = 1; rects.push([x, y, w, h]); }
  const camp = Z.kind === 'camp', fort = Z.kind === 'fort';
  const inHole = (x, z) => hole && x > hole.x0 && x < hole.x1 && z > hole.z0 && z < hole.z1;
  // a house keeps a real size whatever the tile: at most 160 × 110 units, centred on its rectangle (bigger tiles only add room round it)
  for (const [x, y, w, h] of rects) { const cx = (W(x) + W(x + w)) / 2, cz = (D(y) + D(y + h)) / 2, hw = Math.min(w * T - 6, 160) / 2, hd = Math.min(h * T - 6, 110) / 2;
    const x0 = cx - hw, x1 = cx + hw, z0 = cz - hd, z1 = cz + hd; if (inHole(cx, cz)) continue;
    if (camp) tent(x0, x1, z0, z1); else if (fort && w * h >= 6) keep(x0, x1, z0, z1); else house(x0, x1, z0, z1, h01(zx, zy, x, y)); solids.push({ x0, x1, z0, z1 }); }
  // ---- per tile: trees, bamboo, rocks, reeds, field ridges, paddy shoots, the palisade's posts, the wall
  for (let y = 0; y < ZONE; y++) for (let x = 0; x < ZONE; x++) { const t = name(at(x, y)), r = h01(zx, zy, x, y, 7), cx = W(x) + T / 2, cz = D(y) + T / 2;
    const n = k => T * (h01(zx, zy, x, y, k) - .5) * .7; if (inHole(cx, cz)) continue;
    if (t === 'forest') { tree(cx + n(1), cz + n(2), r); if (T >= 32 && r > .45) tree(cx + n(3), cz + n(4), 1 - r); }
    else if (t === 'bamboo') for (let i = 0; i < Math.max(3, T / 6); i++) stalk(cx + n(10 + i), cz + n(30 + i), h01(x, y, i));
    else if (t === 'rock') { if (r > .3) boulder(cx + n(1), cz + n(2), T * (.18 + .25 * r)); if (r > .7) boulder(cx + n(3), cz + n(4), T * .12); }
    else if (t === 'marsh' && r > .4) for (let i = 0; i < 4; i++) reed(cx + n(5 + i), cz + n(9 + i));
    else if (t === 'grass' && r > .82) tuft(cx + n(1), cz + n(2));
    else if (t === 'field') for (let i = 0; i < T; i += 8) P.box(T - 2, 1.2, 2.4, R.m[1], { p: [cx, .4, D(y) + i + 4] });
    else if (t === 'paddy') for (let i = 4; i < T; i += 8) for (let j = 4; j < T; j += 8) P.box(1.2, 3, 1.2, '#3b5a2c', { p: [W(x) + j, .3, D(y) + i] });
    else if (t === 'palisade') { for (let i = 0; i < T; i += 6) for (let j = 0; j < T; j += 6) if (h01(x, y, i, j) > .3) { newPart(); P.cyl(2.2, 2.4, 30, 5, R.w[1], { p: [W(x) + i + 3, 15, D(y) + j + 3] }).cyl(0, 2.2, 6, 5, R.w[2], { p: [W(x) + i + 3, 33, D(y) + j + 3] }); }
      solids.push({ x0: W(x), x1: W(x + 1), z0: D(y), z1: D(y + 1) }); }
    else if (t === 'wall') { newPart(); P.box(T, 40, T, R.c[5], { p: [cx, 20, cz] }).box(T + 4, 5, T + 4, R.k[3], { p: [cx, 42, cz] }).box(T, 8, T + .5, R.n[3], { p: [cx, 4, cz] });
      solids.push({ x0: W(x), x1: W(x + 1), z0: D(y), z1: D(y + 1) }); }
    else if (t === 'water') solids.push({ x0: W(x), x1: W(x + 1), z0: D(y), z1: D(y + 1) }); }
  // the shrine: a torii on the south side of its ground, a small hall behind
  if (Z.kind === 'shrine') { const m = ZONE / 2, sx = W(m), sz = D(m + 3) + 10; newPart();
    P.cyl(2.6, 3, 52, 8, R.l[1], { p: [sx - 26, 26, sz] }).cyl(2.6, 3, 52, 8, R.l[1], { p: [sx + 26, 26, sz] }).box(72, 4, 6, R.k[2], { p: [sx, 54, sz] }).box(62, 3, 4, R.l[1], { p: [sx, 46, sz] });
    house(W(m - 2), W(m + 2), D(m - 3), D(m), .9, R.l[1]); }
  add(P); add(G, glow);
  return out;

  function ground() {   // one mesh: a vertex every half tile, its colour the average of the tiles round it, a little lumpy
    const S = ZONE * 2, pos = [], col = [], at2 = (i, j) => { const x = Math.floor(i / 2), y = Math.floor(j / 2); return name(at(x, y)); };
    const vy = (i, j) => { let d = 0, c = [0, 0, 0], n = 0; for (const [a, b] of [[i - 1, j - 1], [i, j - 1], [i - 1, j], [i, j]]) { const t = at2(a, b), h = hex(GROUND[t]); c[0] += h[0]; c[1] += h[1]; c[2] += h[2]; d = Math.min(d, DROP[t] || 0); n++; }
      const k = .92 + .16 * h01(zx, zy, i, j, 3); return { y: d + (d ? 0 : .8 * h01(zx, zy, i, j, 1)), c: c.map(v => v / n * k) }; };
    const V = []; for (let j = 0; j <= S; j++) { V.push([]); for (let i = 0; i <= S; i++) V[j].push(vy(i, j)); }
    const p = (i, j) => [ox + i * T / 2, V[j][i].y, oz + j * T / 2];
    for (let j = 0; j < S; j++) for (let i = 0; i < S; i++) { const q = [[i, j], [i, j + 1], [i + 1, j], [i + 1, j], [i, j + 1], [i + 1, j + 1]];
      for (const [a, b] of q) { pos.push(...p(a, b)); col.push(...V[b][a].c, 1); } }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.computeVertexNormals();
    g.setAttribute('color', new THREE.Float32BufferAttribute(col, 4)); g.setAttribute('part', new THREE.Float32BufferAttribute(new Float32Array(pos.length / 3).fill(1), 1));
    const me = new THREE.Mesh(g, shadeMat({ obj: 0 })); me.frustumCulled = false; scene.add(me); out.meshes.push(me);
  }
  function blocks() {   // every tile a block, its height by terrain: a diorama of the sim's grid
    const B = piece(), HT = { water: -5, paddy: -1, marsh: -1, field: 1, road: 0, grass: 0, sand: 0, shrine: 2, rock: 10, forest: 0, bamboo: 0, building: 30, palisade: 26, wall: 38 };
    for (let y = 0; y < ZONE; y++) for (let x = 0; x < ZONE; x++) { const t = name(at(x, y)), h = HT[t] ?? 0, k = .9 + .2 * h01(zx, zy, x, y, 2), c = hex(GROUND[t]).map(v => v * k);
      const css = '#' + c.map(v => Math.round(Math.min(1, v) * 255).toString(16).padStart(2, '0')).join(''); newPart();
      B.box(T, 6 + h, T, t === 'building' ? R.c[4] : t === 'wall' ? R.c[5] : css, { p: [W(x) + T / 2, (h - 6) / 2, D(y) + T / 2] });
      if (t === 'building') B.box(T, 4, T, R.k[3], { p: [W(x) + T / 2, h + 2, D(y) + T / 2] });
      if (t === 'forest' || t === 'bamboo') B.box(T * .7, T * 1.4, T * .7, t === 'forest' ? LEAF[1] : STALK[0], { p: [W(x) + T / 2, T * .7, D(y) + T / 2] }); }
    add(B); return out;
  }
  function house(x0, x1, z0, z1, r, post = R.w[0]) {   // the courtyard's house in small: stone footing, plaster and timber, a hipped roof, the shoji lit
    const w = x1 - x0, d = z1 - z0, hw = 30 + 8 * r; newPart();
    P.box(w, 4, d, R.n[3], { p: [(x0 + x1) / 2, 2, (z0 + z1) / 2] }).box(w - 4, hw, d - 4, R.c[4], { p: [(x0 + x1) / 2, 4 + hw / 2, (z0 + z1) / 2] });
    for (let x = x0 + 2; x <= x1 - 2; x += Math.max(12, (w - 4) / Math.round((w - 4) / 24))) P.box(3, hw, 3, post, { p: [x, 4 + hw / 2, z1 - 2] });
    P.box(3, hw, 3, post, { p: [x0 + 2, 4 + hw / 2, z0 + 2] }).box(3, hw, 3, post, { p: [x1 - 2, 4 + hw / 2, z0 + 2] });
    const roof = new THREE.CylinderGeometry(0, 1, 1, 4); roof.rotateY(Math.PI / 4); newPart();
    P.add(roof, R.i[1], { p: [(x0 + x1) / 2, 4 + hw + 9, (z0 + z1) / 2], s: [w * .82, 20, d * .82] }).box(w + 10, 2, d + 10, R.k[3], { p: [(x0 + x1) / 2, 4 + hw - 1, (z0 + z1) / 2] });
    if (r > .35) { const n = Math.max(1, Math.floor((w - 8) / 22)); for (let i = 0; i < n; i++) G.box(16, hw * .55, 1, '#c88a4c', { p: [x0 + (i + .5) * (w / n), 4 + hw * .45, z1 - 1.6], glow: true });
      if (lamps.length < 40) lamps.push([(x0 + x1) / 2, 18, z1 + 8]); }
  }
  function keep(x0, x1, z0, z1) { house(x0, x1, z0, z1, .9); house(x0 + 10, x1 - 10, z0 + 8, z1 - 8, .2); P.box(x1 - x0 - 30, 26, z1 - z0 - 26, R.c[5], { p: [(x0 + x1) / 2, 60, (z0 + z1) / 2] }); }
  function tent(x0, x1, z0, z1) { const g = new THREE.CylinderGeometry(0, 1, 1, 4); g.rotateY(Math.PI / 4); newPart();
    P.add(g, R.c[3], { p: [(x0 + x1) / 2, 14, (z0 + z1) / 2], s: [(x1 - x0) * .7, 28, (z1 - z0) * .7] });
    G.cyl(3, 4, 4, 6, '#ff9a48', { p: [(x0 + x1) / 2, 2, z1 + 10], glow: true }); lamps.push([(x0 + x1) / 2, 8, z1 + 10]); }
  function tree(x, z, r) { const s = .75 + .5 * r, c = LEAF[Math.floor(r * 4) % 4]; newPart();
    P.cyl(1.6 * s, 2.4 * s, 16 * s, 5, R.w[1], { p: [x, 8 * s, z] }).cyl(0, 13 * s, 18 * s, 6, c, { p: [x, 22 * s, z] }).cyl(0, 10 * s, 15 * s, 6, LEAF[(Math.floor(r * 4) + 1) % 4], { p: [x, 32 * s, z] }).cyl(0, 6.5 * s, 12 * s, 6, c, { p: [x, 41 * s, z] });
    solids.push({ x0: x - 3, x1: x + 3, z0: z - 3, z1: z + 3 }); }
  function stalk(x, z, r) { newPart(); P.cyl(.9, 1.1, 40 + 26 * r, 4, STALK[Math.floor(r * 3) % 3], { p: [x, 20 + 13 * r, z] }).box(7, 1, 3, LEAF[2], { p: [x + 3, 36 + 20 * r, z], r: [0, r * 3, .4] }); }
  function boulder(x, z, s) { newPart(); P.ball(s, R.n[5], { p: [x, s * .45, z], s: [1, .7, 1] }); solids.push({ x0: x - s * .8, x1: x + s * .8, z0: z - s * .8, z1: z + s * .8 }); }
  function reed(x, z) { P.box(.8, 10, .8, STALK[2], { p: [x, 5, z] }); }
  function tuft(x, z) { P.box(4, 2, 1, LEAF[3], { p: [x, 1, z] }).box(1, 3, 3, LEAF[2], { p: [x + 1, 1.5, z] }); }
}
