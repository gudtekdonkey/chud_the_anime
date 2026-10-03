// ---- One room in feudal Japan, lit like The Last Night: a night courtyard. Stone flags; the north wall with its gate
// and a paper lantern hung under the gate's roof; a stone tōrō in the yard; on the east a house on a raised engawa,
// its shoji glowing; along the south a covered walkway whose eave and posts stand in front of him (the eave dissolves
// while he is under it, and anything that hides him shows his silhouette). Warm pools, ground mist, rain in the post pass,
// and two dithered shafts of lantern light. All of it is 3D through the same pipeline; world units (1 = a pixel of today's game).
import * as THREE from 'three';
import { piece, newPart } from 'ronin-engine/iso/gfx/build.js';
import { RAMP as R } from 'ronin-engine/iso/gfx/palette.js';
import { shadeMat, SH } from 'ronin-engine/iso/gfx/shade.js';
import { ROOM, SOLID, RAISED, groundAt, collide } from 'ronin-engine/world/room.js';

Object.assign(ROOM, { x0: 0, x1: 600, z0: 0, z1: 300, cam: { x0: -24, x1: 624, z0: -64, z1: 312 } });
// what he collides with (x0, x1, z0, z1; buildRoom fills it), and where the ground is raised (the engawa)
RAISED.push({ x0: 470, x1: 560, z0: 50, z1: 230, y: 6 });
export { ROOM, SOLID, groundAt, collide };

const LAMPS = [
  { p: [300, 40, 10], col: '#ffb36a', r: 110, k: 1.25 },   // the gate's paper lantern
  { p: [170, 15, 150], col: '#ff9a48', r: 86, k: 1.2 },    // the stone tōrō
  { p: [548, 22, 140], col: '#e08a3a', r: 120, k: .9 },    // the shoji, lit from inside
  { p: [430, 34, 286], col: '#ffb36a', r: 92, k: 1.1 },    // a lantern hung on the walkway
];

export function buildRoom(scene) {
  const world = shadeMat({ obj: 0 }), floorM = shadeMat({ obj: 0, floor: 1 }), glow = shadeMat({ obj: 3 });
  const add = (pc, m = world) => { const me = pc.mesh(m); scene.add(me); return me; };
  const box = (pc, x0, x1, y0, y1, z0, z1, col, o = {}) => { newPart(); return pc.box(x1 - x0, y1 - y0, z1 - z0, col, { p: [(x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2], ...o }); };
  const solid = (x0, x1, z0, z1) => SOLID.push({ x0, x1, z0, z1 });

  // the floor: the flags are drawn by the shader (shade.js flags) on one big quad; a dark band of earth past the walls
  add(piece().box(760, 2, 560, R.n[3], { p: [300, -1, 170] }), floorM);
  // the north wall, plastered, a tiled cap; the gate in its middle
  const wall = piece();
  // plaster panels between dark timber posts over a stone footing, under a tiled cap whose front edge catches the moon
  for (const [x0, x1] of [[-20, 262], [338, 620]]) { box(wall, x0, x1, 8, 40, -16, -1, R.c[5]); box(wall, x0, x1, 0, 8, -16, 0, R.n[3]); box(wall, x0, x1, 7.5, 9, -16, -.4, R.w[0]); solid(x0, x1, -30, 2);
    for (let x = x0 + 4; x < x1 - 2; x += 32) box(wall, x, x + 3, 8, 40, -16, -.5, R.w[0]); }
  box(wall, -24, 266, 40, 45, -20, 3, R.k[3]); box(wall, 334, 624, 40, 45, -20, 3, R.k[3]); box(wall, -24, 266, 44, 45.6, 2.2, 4.2, R.i[3]); box(wall, 334, 624, 44, 45.6, 2.2, 4.2, R.i[3]);
  for (let x = -20; x < 620; x += 6) if (x < 262 || x > 336) box(wall, x, x + 1, 45, 46.2, -18, 3, R.k[2]);
  add(wall);
  // the gate: two posts, a lintel, its own roof, the doors ajar and black beyond
  const gate = piece();
  box(gate, 258, 270, 0, 58, -18, 2, R.w[1]); box(gate, 330, 342, 0, 58, -18, 2, R.w[1]); box(gate, 266, 334, 50, 58, -16, 0, R.w[2]);
  box(gate, 250, 350, 58, 63, -26, 10, R.k[2]); box(gate, 256, 344, 63, 67, -20, 4, R.k[1]); box(gate, 246, 354, 57, 59, 8, 11, R.k[3]);
  box(gate, 271, 298, 0, 49, -12, -10, R.w[0]); box(gate, 306, 330, 0, 49, -14, -12, R.w[0]); box(gate, 296, 308, 0, 49, -40, -38, R.k[0]);
  for (let x = 274; x < 296; x += 5) box(gate, x, x + 1, 2, 47, -10, -9.6, R.w[2]);
  add(gate); solid(258, 342, -40, 2);
  // the gate's paper lantern, hanging on its cord
  add(piece().box(.6, 6, .6, R.k[1], { p: [300, 52, 9] }).box(7, 1.2, 7, R.k[1], { p: [300, 47.5, 9] }).box(7, 1.2, 7, R.k[1], { p: [300, 35.2, 9] }));
  add(piece().cyl(4.2, 4.2, 11, 10, '#e07a3a', { p: [300, 41.3, 9], glow: true }).cyl(3.0, 3.0, 11.2, 10, '#ffd29a', { p: [300, 41.3, 9.4], glow: true }), glow);
  // the west wall, low
  const west = piece(); box(west, -16, 0, 0, 30, 0, 330, R.n[3]); box(west, -20, 4, 30, 35, -4, 334, R.k[3]); add(west); solid(-40, 2, -40, 400);
  // the house on the east: its raised engawa, a stone step up, the shoji wall glowing, the roof's overhang
  const house = piece();
  box(house, 470, 560, 0, 6, 50, 230, R.w[2]); for (let z = 54; z < 230; z += 6) box(house, 470, 560, 5.8, 6.1, z, z + .5, R.w[1]);
  box(house, 456, 470, 0, 3, 110, 170, R.n[5]);
  box(house, 560, 640, 0, 64, 30, 250, R.w[0]); box(house, 512, 650, 64, 70, 20, 260, R.k[2]); box(house, 508, 650, 62, 64, 258, 262, R.k[3]);
  for (const z of [50, 230]) box(house, 470, 476, 0, 64, z - 3, z + 3, R.w[1]);
  add(house); solid(560, 700, 20, 260); solid(470, 476, 45, 55); solid(470, 476, 225, 235);
  const shoji = piece(); for (let z = 60; z < 228; z += 22) { box(shoji, 559, 560, 10, 54, z, z + 20, '#c88a4c', { glow: true }); for (let y = 16; y < 54; y += 8) box(shoji, 558.6, 559, y, y + .7, z, z + 20, '#6e4322', { glow: true }); box(shoji, 558.6, 559, 10, 54, z + 9.6, z + 10.4, '#6e4322', { glow: true }); }
  add(shoji, glow);
  // the stone tōrō: base, pillar, the light box with its window, the cap
  const toro = piece(); const tx = 170, tz = 150;
  box(toro, tx - 6, tx + 6, 0, 3, tz - 6, tz + 6, R.n[6]); box(toro, tx - 2.2, tx + 2.2, 3, 12, tz - 2.2, tz + 2.2, R.n[6]);
  box(toro, tx - 5, tx + 5, 12, 13.5, tz - 5, tz + 5, R.n[7]); box(toro, tx - 4, tx + 4, 13.5, 20, tz - 4, tz + 4, R.n[5]);
  box(toro, tx - 7, tx + 7, 20, 22.5, tz - 7, tz + 7, R.n[7]); box(toro, tx - 4, tx + 4, 22.5, 24.5, tz - 4, tz + 4, R.n[6]); box(toro, tx - 1.2, tx + 1.2, 24.5, 27, tz - 1.2, tz + 1.2, R.n[7]);
  add(toro); solid(tx - 7, tx + 7, tz - 7, tz + 7);
  add(piece().box(5, 4.6, 8.2, '#ffb36a', { p: [tx, 16.7, tz], glow: true }).box(8.2, 4.6, 5, '#ffd29a', { p: [tx, 16.7, tz], glow: true }), glow);
  // a rain barrel and a pile of crates by the house: something to read the depth against
  const props = piece(); box(props, 430, 446, 0, 14, 206, 222, R.w[1]); box(props, 431, 445, 14, 14.6, 207, 221, R.w[3]); box(props, 448, 458, 0, 9, 210, 220, R.w[2]);
  add(props); solid(428, 460, 204, 224);
  // the covered walkway along the south: posts in front of him, the eave over him (it dissolves while he is under it)
  const posts = piece(); for (const x of [96, 300, 504]) { box(posts, x - 3, x + 3, 0, 44, 290, 296, R.w[1]); solid(x - 4, x + 4, 288, 298); }
  box(posts, -20, 620, 0, 2, 294, 330, R.n[3]); add(posts);
  const eave = piece(); box(eave, -30, 630, 44, 47, 282, 330, R.k[3]); for (let x = -30; x < 630; x += 7) box(eave, x, x + 1.2, 47, 48, 282, 330, R.k[2]); box(eave, -30, 630, 42, 44, 280, 284, R.w[0]);
  const eaveM = shadeMat({ obj: 0 }); const eaveMesh = add(eave, eaveM);
  // the walkway's hanging lantern (light 3)
  add(piece().box(5, 9, 5, '#ff9a48', { p: [430, 34, 286], glow: true }).box(3.6, 9.2, 3.6, '#ffd29a', { p: [430, 34, 286.8], glow: true }), glow);
  solid(-40, 640, 300, 420);
  // the light shafts: sparse dithered cones from the gate's lantern and the walkway's, light only (never outlined, never solid)
  const shaftM = shadeMat({ obj: 3 }); shaftM.uniforms.uFade.value = .94; shaftM.depthWrite = false;
  const shaft = (x, y, z, r0, r1, h) => { const m = new THREE.Mesh(piece().cyl(r0, r1, h, 12, '#ffb36a', { glow: true }).merged(), shaftM); m.position.set(x, y - h / 2, z); m.scale.z = .8; m.frustumCulled = false; scene.add(m); };
  shaft(300, 35, 12, 2.5, 15, 35); shaft(430, 29, 288, 2, 12, 29);

  // the lanterns: positions and colours into the shared light uniforms; they breathe a little
  const lamps = LAMPS.map((L, i) => { const c = new THREE.Color(L.col); SH.uLampPos.value[i].set(...L.p, L.r); SH.uLampCol.value[i].set(c.r, c.g, c.b, L.k); return L; });
  return {
    update(t, hero) {
      lamps.forEach((L, i) => { SH.uLampCol.value[i].w = L.k * (.9 + .06 * Math.sin(t * 7.3 + i * 2) + .04 * Math.sin(t * 13.1 + i)); });
      const under = hero && hero.z > 272;   // he is under the walkway's eave: it dissolves to show him
      eaveM.uniforms.uFade.value += ((under ? .62 : 0) - eaveM.uniforms.uFade.value) * .15;
      eaveMesh.visible = eaveM.uniforms.uFade.value < .98;
    },
  };
}
