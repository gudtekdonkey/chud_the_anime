// ---- Prototype 48's render bench: a zone of the sim built in 3D (zone3d.js) through the slice's pipeline, with Iron Ash
// standing in it for scale. Everything is a URL parameter, so scripts/proto48/shoot.mjs can take each picture:
//   z=54,50 (zone) T=32 (world units a tile) mode=kit|blocks grid=1|3 (zones round it) style=0..3 zoom=1 at=x,z (camera,
//   in tiles of the centre zone) hero=x,z (tiles) court=1 (the courtyard set in at tile 'court=x,z') flags=1 (who holds it)
//   card=1 (the name card on entering) edge=1 (mark the zone edges) rain=0
import * as THREE from 'three';
import { makePipeline, PIPE } from 'ronin-engine/iso/gfx/post.js';
import { CAM, projMatrix, toScreen, U, OBL, VD } from 'ronin-engine/iso/gfx/view.js';
import { SH } from 'ronin-engine/iso/gfx/shade.js';
import { piece, newPart } from 'ronin-engine/iso/gfx/build.js';
import { shadeMat } from 'ronin-engine/iso/gfx/shade.js';
import { setStyle } from 'ronin-engine/iso/gfx/style.js';
import { SETTINGS } from 'ronin-engine/flow/flow.js';
import { fpsFor } from 'ronin-engine/iso/gfx/style.js';
import 'ronin-engine/flow/moves.js';
import 'ronin-engine/flow/moves-extra.js';
import { W } from 'ronin-engine/clock/world.js';
import { Hero } from 'ronin-engine/iso/play/hero.js';
import { ROOM } from 'ronin-engine/world/room.js';
import '../../src/iso/look/look.js';
import { buildRoom } from '../../src/iso/world/room.js';
import { generateWorld, ZONE, zoneAt } from 'ronin-engine/sim/index.js';
import { buildZone } from './zone3d.js';

const Q = new URLSearchParams(location.search), num = (k, d) => Q.has(k) ? +Q.get(k) : d, pair = (k, d) => Q.has(k) ? Q.get(k).split(',').map(Number) : d;
const canvas = document.querySelector('canvas'), pipe = makePipeline(canvas);
SETTINGS.fpsFor = fpsFor; setStyle(num('style', 3)); PIPE.rain = num('rain', 0); PIPE.k = num('k', 1);
const scene = new THREE.Scene(), cam = new THREE.Camera(); cam.matrixAutoUpdate = false;
const L = generateWorld(num('seed', 12345), 0), [zx, zy] = pair('z', [54, 50]), T = num('T', 32), mode = Q.get('mode') || 'kit', grid = num('grid', 1), S = ZONE * T;
const t0 = performance.now(), built = [], hole = Q.has('court') ? (([x, y]) => ({ x0: x * T - 60, x1: x * T + 660, z0: y * T - 80, z1: y * T + 380 }))(pair('court', [0, 0])) : null;
for (let dy = -(grid >> 1); dy <= grid >> 1; dy++) for (let dx = -(grid >> 1); dx <= grid >> 1; dx++) built.push(buildZone(scene, L, zx + dx, zy + dy, { T, mode, ox: dx * S, oz: dy * S, hole: dx || dy ? null : hole }));
const buildMs = performance.now() - t0;
const tiles = ([x, y]) => [x * T, y * T];
const Z = zoneAt(L, zx, zy), reg = L.regions[Z.region], cul = L.cultures[reg.culture], lord = L.actors[reg.lord];
const hue = `hsl(${cul.hue} 55% 42%)`, hueHex = '#' + new THREE.Color().setHSL(cul.hue / 360, .55, .42).getHexString();

// the courtyard as a set piece in the zone: the slice's room, shifted (its four lamps follow it)
let courtAt = null;
if (Q.has('court')) { const g = new THREE.Group(); courtAt = tiles(pair('court', [22, 22])); g.position.set(courtAt[0], 0, courtAt[1]); scene.add(g); buildRoom(g); }
// who holds it: nobori in the holder's colour where the road comes in, at the gates and the houses; a boundary stone
if (Q.has('flags')) { const P = piece(), mid = ZONE / 2;
  const nobori = (x, z) => { newPart(); P.cyl(1, 1.2, 70, 5, '#2b2017', { p: [x, 35, z] }).box(12, 2, 1.4, '#2b2017', { p: [x + 6, 68, z] }).box(11, 44, .8, hueHex, { p: [x + 6.5, 45, z + .4] }).box(11, 3, 1, '#e8e1cf', { p: [x + 6.5, 60, z + .9] }); };
  const stone = (x, z) => { newPart(); P.box(7, 24, 6, '#4f5c73', { p: [x, 12, z] }).box(8, 3, 7, '#354052', { p: [x, 25, z] }); };
  for (const [dx, dy] of [[0, -1], [0, 1], [-1, 0], [1, 0]]) { const n = zoneAt(L, zx + dx, zy + dy); if (!n || !n.road) continue;
    const ex = (mid + dx * (mid - 2)) * T + (dy ? 40 : 0), ez = (mid + dy * (mid - 2)) * T + (dx ? 40 : 0); nobori(ex, ez); nobori(ex - (dy ? 80 : 0), ez - (dx ? 80 : 0)); stone(ex + 20, ez + 20); }
  for (const b of built[built.length >> 1].lamps.slice(0, 12)) nobori(b[0] + 18, b[2] - 2);
  scene.add(P.mesh(shadeMat({ obj: 0 }))); }
if (Q.has('edge')) { const P = piece(); for (const b of built) { for (const [x0, z0, w, d] of [[b.x0, b.z0, S, 3], [b.x0, b.z0, 3, S]]) P.box(w, 1, d, '#6ff3e4', { p: [x0 + w / 2, 1.2, z0 + d / 2], glow: true }); }
  scene.add(P.mesh(shadeMat({ obj: 3 }))); }

// Iron Ash for scale
const [hx, hz] = tiles(pair('hero', [ZONE / 2 + .5, ZONE / 2 + 3.5])), hero = new Hero({ x: hx, z: hz, h: num('h', .6), look: '3d' }); hero.look.mount(scene);
Object.assign(ROOM, { x0: -1e6, x1: 1e6, z0: -1e6, z1: 1e6 });
const [cx, cz] = Q.has('at') ? tiles(pair('at', [0, 0])) : [hx, hz - 40], zoom = num('zoom', 1);
// the four lamp slots: the lit houses nearest the camera (the courtyard keeps its own when it is in view)
const lamps = built.flatMap(b => b.lamps).sort((a, b) => Math.hypot(a[0] - cx, a[2] - cz) - Math.hypot(b[0] - cx, b[2] - cz));
if (!courtAt || Math.hypot(courtAt[0] + 300 - cx, courtAt[1] + 150 - cz) > 500) for (let i = 0; i < 4; i++) { const l = lamps[i]; SH.uLampPos.value[i].set(...(l || [0, -999, 0]), 110); SH.uLampCol.value[i].set(1, .62, .33, l ? 1.1 : 0); }
else for (let i = 0; i < 4; i++) SH.uLampPos.value[i].x += courtAt[0], SH.uLampPos.value[i].z += courtAt[1];

function card(g) {   // the name card on entering a zone: where, whose land, who holds it
  const x = 480, y = 64, lines = [Z.name || 'the wild', `${reg.name} · ${cul.name}`, lord ? `held by ${lord.given} ${lord.family}` : 'held by nobody'];
  g.save(); g.textAlign = 'center'; g.fillStyle = 'rgba(6,7,9,.72)'; g.fillRect(x - 230, y - 34, 460, 96); g.fillStyle = hue; g.fillRect(x - 230, y - 34, 6, 96);
  g.font = '700 30px "Pixelify Sans", monospace'; g.fillStyle = '#e4e9e9'; g.fillText(lines[0], x, y);
  g.font = '16px monospace'; g.fillStyle = '#b8fff6'; g.fillText(lines[1], x, y + 26); g.fillStyle = '#8b949c'; g.fillText(lines[2], x, y + 48); g.restore();
}
let frames = 0;
function loop() {
  W.step(); W.step(); const f = hero.frame(true); if (f) hero.look.show(f);
  CAM.px = CAM.x = cx; CAM.py = CAM.z = cz; CAM.zoom = zoom; projMatrix(cam.projectionMatrix, cx, cz, zoom); if (zoom < .1) { const DR = 8000, e = cam.projectionMatrix.elements; e[2] = -VD.x / DR; e[6] = -VD.y / DR; e[10] = -VD.z / DR; e[14] = (VD.x * cx + VD.z * cz) / DR; }   // a far overview: a deeper depth range than play needs cam.projectionMatrixInverse.copy(cam.projectionMatrix).invert();
  SH.uTime.value = W.t; SH.uDOff.value.set(Math.round(cx * U * pipe.k), -Math.round(cz * U * OBL.a * pipe.k));
  const g = pipe.fx; g.clearRect(0, 0, pipe.fxCanvas.width, pipe.fxCanvas.height); if (Q.has('card')) card(g); hero.look.stamp(g);
  pipe.render(scene, cam); if (++frames === 20) window.__ready = { buildMs, zone: Z, verts: scene.children.reduce((s, m) => s + (m.geometry ? m.geometry.attributes.position.count : 0), 0) };
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
window.__toScreen = toScreen;
