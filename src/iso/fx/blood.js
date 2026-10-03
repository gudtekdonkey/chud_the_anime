// ---- BLOOD (owner 2026-10-02, the 3D test level): a spray on every hit thrown the way the cut travels (how much by
// the hit's weight: light / heavy / kill), drips, stains and pools on the floor that stay (decals, capped), blood that
// collects on the blade and is flicked off by the sheathe's chiburi, splashes on the armour and the jinbaori.
// What flies is pixels on the effects layer, drawn the active style's way (`LOOK`, keyed by the style's trail);
// everything that lands (stains, pools, splashes, the blade's coat) is 3D through the scene material, so the style's
// light, bands, dither, palette and outline take it as they take the courtyard. World units, positions as drawn.
import * as THREE from 'three';
import { piece } from 'ronin-engine/iso/gfx/build.js';
import { shadeMat } from 'ronin-engine/iso/gfx/shade.js';
import { RAMP } from 'ronin-engine/iso/gfx/palette.js';
import { toScreen, CAM, VW, VH } from 'ronin-engine/iso/gfx/view.js';
import { STYLE } from 'ronin-engine/iso/gfx/style.js';
import { groundAt } from '../world/room.js';
import { rnd, TAU } from 'ronin-engine/flow/flow.js';

const R = RAMP.r, G = 150;                        // gravity in world units/s² (he stands ~23 units: 1 m ≈ 13)
// a hit's weight: drops, their speed, how wide the fan opens, the drop size (render px), a gush after a kill
export const WEIGHT = { light: { n: 12, spd: 62, cone: .5, sz: 1.4 }, heavy: { n: 24, spd: 80, cone: .6, sz: 1.8 }, kill: { n: 42, spd: 96, cone: .7, sz: 2.2, gush: .32 } };
const CAP = { decals: 40, blobs: 90, splash: 14 };   // stains and pools kept on the floor; blobs in one stain; splashes on one body
export const BL = { drops: [], emit: [], decals: [], scene: null, stats: { sprays: 0, landed: 0, stains: 0, pools: 0, flicks: 0, splashes: 0, drips: 0, coats: 0 } };
const BAY = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map(v => (v + .5) / 16), bay = (x, y) => BAY[(y & 3) * 4 + (x & 3)];
const norm = v => { const l = Math.hypot(...v) || 1; return v.map(c => c / l); };

export function initBlood(scene) { BL.scene = scene; }

// ---- in the air ----
// a spray from (x, y, z) along `dir` (a world vector, the cut's travel), `w` a WEIGHT key; drops landing together make one stain
export function spray(x, y, z, dir, w = 'light', o = {}) {
  const W = WEIGHT[w], d = norm(dir), st = newDecal('stain'); BL.stats.sprays++;
  const n = Math.round(W.n * (o.k ?? 1));
  for (let i = 0; i < n; i++) { const s = W.spd * (.35 + rnd() * .9) * (o.spd ?? 1), c = W.cone * (o.cone ?? 1);
    const v = norm([d[0] + (rnd() - .5) * 2 * c, d[1] + (rnd() - .3) * 2 * c, d[2] + (rnd() - .5) * 2 * c]);
    drop(x, y, z, v[0] * s, v[1] * s + 10 * rnd(), v[2] * s, W.sz * (.6 + rnd() * .8), st); }
  if (W.gush && !o.noGush) emitter({ at: () => [x, y, z], dir: d, life: W.gush, rate: 70, spd: 40, sz: 2.2 });
  return st;
}
function drop(x, y, z, vx, vy, vz, sz, st) { BL.drops.push({ x, y, z, vx, vy, vz, sz, st, age: 0, px: x, py: y, pz: z }); }
// a drip: falls straight down from a point
export function drip(x, y, z, sz = 1.3) { BL.stats.drips++; drop(x, y, z, (rnd() - .5) * 4, -4, (rnd() - .5) * 4, sz, null); }
// a source that keeps bleeding: `at()` its point now, `dir` its direction (or null: drips), `rate` drops a second,
// `pulse` a heartbeat (the stump's spurts); `till()` may end it early
export function emitter(o) { BL.emit.push({ age: 0, acc: 0, st: null, pulse: 0, ...o }); }

export function bloodStep(dt) {
  for (const e of BL.emit) { e.age += dt; const p = e.at(); if (!p) { e.age = e.life; continue; }
    const beat = e.pulse ? Math.max(0, Math.sin(e.age * TAU * e.pulse)) ** 2 : 1, fall = 1 - e.age / e.life;
    e.acc += e.rate * dt * beat * (.4 + .6 * fall);
    while (e.acc >= 1) { e.acc -= 1;
      if (!e.dir) { drip(p[0], p[1], p[2], e.sz ?? 1.2); continue; }
      if (!e.st || e.st.dead) e.st = newDecal('stain');
      const s = e.spd * (.5 + .7 * rnd()) * (.5 + .5 * fall) * (e.pulse ? .5 + beat : 1), v = norm([e.dir[0] + (rnd() - .5) * .5, e.dir[1] + (rnd() - .5) * .5, e.dir[2] + (rnd() - .5) * .5]);
      drop(p[0], p[1], p[2], v[0] * s, v[1] * s, v[2] * s, (e.sz ?? 1.6) * (.6 + rnd() * .7), e.st); } }
  BL.emit = BL.emit.filter(e => e.age < e.life);
  for (const d of BL.drops) { d.px = d.x; d.py = d.y; d.pz = d.z; d.age += dt; d.vy -= G * dt; const k = Math.exp(-.8 * dt); d.vx *= k; d.vz *= k;
    d.x += d.vx * dt; d.y += d.vy * dt; d.z += d.vz * dt;
    const gy = groundAt(d.x, d.z); if (d.y <= gy) { d.done = 1; land(d, gy); } else if (d.age > 2.5) d.done = 1; }
  BL.drops = BL.drops.filter(d => !d.done);
  for (const p of BL.decals) { p.age += dt; if (p.fade) p.fade = Math.min(1, p.fade + dt / .6); }
  const gone = BL.decals.filter(p => p.fade >= 1); for (const p of gone) dropDecal(p);
}
// a drop meets the floor: a blob in its stain, stretched along the way it was going
function land(d, gy) { BL.stats.landed++;
  let st = d.st; if (!st || st.dead) st = d.st = nearDecal(d.x, d.z) || newDecal('stain');
  if (st.n >= CAP.blobs) return;
  const sp = Math.hypot(d.vx, d.vz), len = 1 + Math.min(1.6, sp / 60), a = Math.atan2(d.vz, d.vx), r = .28 + d.sz * .22;
  blob(st, d.x, gy, d.z, r * len, r, a, d.sz > 1.8 ? R[3] : R[2]);
  if (d.sz > 1.6 && rnd() < .5) blob(st, d.x + Math.cos(a) * r * 2.2, gy, d.z + Math.sin(a) * r * 2.2, r * .45, r * .45, 0, R[2]);   // a satellite thrown ahead
}

// ---- on the floor: decals ----
// a decal is one mesh of blobs (a stain) or one growing shape (a pool); the oldest dissolve past the cap
function newDecal(kind) {
  const live = BL.decals.filter(p => !p.fade); if (live.length >= CAP.decals) live[0].fade = .01;
  const p = { kind, pc: piece(), n: 0, age: 0, fade: 0, dirty: 0, mesh: null, mat: shadeMat({ obj: 0 }), lift: .05 + (BL.decals.length % 9) * .012 };
  BL.decals.push(p); if (kind === 'stain') BL.stats.stains++; else BL.stats.pools++; return p;
}
function nearDecal(x, z) { for (let i = BL.decals.length - 1; i >= 0 && i > BL.decals.length - 4; i--) { const p = BL.decals[i]; if (p.kind === 'stain' && !p.fade && p.n && Math.hypot(p.cx - x, p.cz - z) < 10) return p; } return null; }
function blob(p, x, y, z, rx, rz, a, col) {
  const geo = new THREE.CircleGeometry(1, 7); p.pc.add(geo, col, { p: [x, y + p.lift, z], r: [-Math.PI / 2, 0, -a], s: [rx, rz, 1] });
  if (!p.n) { p.cx = x; p.cz = z; } p.n++; p.dirty = 1;
}
function dropDecal(p) { p.dead = 1; if (p.mesh) { BL.scene.remove(p.mesh); p.mesh.geometry.dispose(); } BL.decals.splice(BL.decals.indexOf(p), 1); }
// a pool spreading under a body: an uneven shape that grows to `r` over `grow` s, starting after `delay`
export function pool(x, z, r = 7, grow = 2.2, delay = .4) {
  const p = newDecal('pool'), gy = groundAt(x, z), pts = 12, sh = new THREE.Shape();
  for (let i = 0; i <= pts; i++) { const a = i / pts * TAU, k = .78 + .3 * rnd(); if (i === 0) sh.moveTo(Math.cos(a) * k, Math.sin(a) * k); else if (i < pts) sh.lineTo(Math.cos(a) * k, Math.sin(a) * k); }
  p.pc.add(new THREE.ShapeGeometry(sh), R[2], { r: [-Math.PI / 2, 0, rnd() * TAU] });
  p.pc.add(new THREE.CircleGeometry(.55, 9), R[3], { p: [.15, .01, -.1], r: [-Math.PI / 2, 0, 0] });   // the fresh middle, a shade brighter
  Object.assign(p, { x, z, gy, r, grow, delay, n: 1, dirty: 1, pool: 1 }); return p;
}

// ---- the 3D side, once a frame: decals' meshes rebuilt when blobs landed, pools grown, fades ----
export function bloodSync() {
  for (const p of BL.decals) {
    if (p.dirty) { p.dirty = 0; const geo = p.pc.merged();
      if (!p.mesh) { p.mesh = new THREE.Mesh(geo, p.mat); p.mesh.frustumCulled = false; BL.scene.add(p.mesh); } else { p.mesh.geometry.dispose(); p.mesh.geometry = geo; } }
    if (p.pool && p.mesh) { const u = Math.max(0, Math.min(1, (p.age - p.delay) / p.grow)), s = Math.max(.01, p.r * (1 - (1 - u) ** 2));
      p.mesh.position.set(p.x, p.gy + p.lift, p.z); p.mesh.scale.set(s, 1, s * .9); p.mesh.visible = u > 0; }
    p.mat.uniforms.uFade.value = p.fade;
  }
}

// ---- on him: splashes on the plates and the cloth, and the blade's coat ----
// a body's bones and how far their surface sits from the bone (rig.js SK, ronin.js), and the bone's span along y
const SURF = { chest: [2.55, 0, 3.4], spine: [2.3, .4, 6.6], hips: [2.2, -2.4, .4], thighR: [1.55, -8.5, -.5], thighL: [1.55, -8.5, -.5], shinR: [1.1, -4, -.3], shinL: [1.1, -4, -.3],
  armR: [.9, -3.3, -.3], armL: [.9, -3.3, -.3], foreR: [.8, -3.3, -.3], foreL: [.8, -3.3, -.3], head: [2, 1.2, 3] };
const _v = new THREE.Vector3(), _w = new THREE.Vector3(), _q = new THREE.Quaternion(), UP = new THREE.Vector3(0, 0, 1);
// a splash on `who` (gore.js keeps a record per character, so a model swap re-lays them): where it hit (world, as
// drawn) and where it came from; it sticks to the nearest bone's surface, facing out toward the source
export function splash(rec, rig, at, from, size = 1) {
  if (!rig) return; let best = null, bd = 1e9;
  for (const b in SURF) { const n = rig.B[b]; if (!n) continue; n.getWorldPosition(_v); _v.y += SURF[b][1] < 0 ? SURF[b][1] * .5 : SURF[b][2] * .4; const d = _v.distanceTo(_w.set(...at)); if (d < bd) { bd = d; best = b; } }
  const n = rig.B[best], s = SURF[best], loc = n.worldToLocal(_v.set(...at)), src = n.worldToLocal(_w.set(...from));
  let out = new THREE.Vector3(src.x, 0, src.z); if (out.lengthSq() < 1e-4) out.set(0, 0, 1); out.normalize();
  const y = Math.max(Math.min(s[1], s[2]), Math.min(Math.max(s[1], s[2]), loc.y));
  rec.splashes.push({ bone: best, p: [out.x * (s[0] + .08), y, out.z * (s[0] + .08)], n: [out.x, out.y, out.z], size: size * (.7 + rnd() * .6), seed: rnd() * TAU });
  if (rec.splashes.length > CAP.splash) rec.splashes.shift();
  rec.dirty = 1; BL.stats.splashes++;
}
// the splash meshes for one character's records on its current rig (gore.js calls it when either changes)
export function laySplashes(rec, rig, obj) {
  for (const m of rec.splashMeshes || []) m.parent && m.parent.remove(m);
  rec.splashMeshes = []; if (!rig) return;
  if (!rec.splashMat) rec.splashMat = shadeMat({ obj, stencil: true });
  for (const s of rec.splashes) { const n = rig.B[s.bone]; if (!n) continue;
    const pc = piece().add(new THREE.CircleGeometry(.55 * s.size, 7), R[3], { s: [1.2, .8, 1], r: [0, 0, s.seed] })
      .add(new THREE.CircleGeometry(.24 * s.size, 6), R[2], { p: [Math.cos(s.seed) * .8 * s.size, Math.sin(s.seed) * .6 * s.size, .01] })
      .add(new THREE.CircleGeometry(.16 * s.size, 5), R[4], { p: [-.2 * s.size, .15 * s.size, .02] });
    const m = pc.mesh(rec.splashMat); m.position.set(...s.p); m.quaternion.setFromUnitVectors(UP, _v.set(...s.n)); m.userData.gore = 'splash';
    m.layers.enable(1); n.add(m); rec.splashMeshes.push(m); }
}
// the blade's coat: red from the tip down, as long as the blood he has on it (0..1); a child of the blade, so it
// sheathes with it
export function bladeCoat(rec, rig) {
  if (!rig || !rig.blade) return null;
  if (rec.coatRig !== rig) { rec.coatRig = rig; if (!rec.coatMat) rec.coatMat = shadeMat({ obj: 1, stencil: true });
    const m = piece().box(.24, .52, 1, R[3], { p: [0, -.02, 0] }).box(.14, .2, .7, R[5], { p: [0, -.2, .1] }).mesh(rec.coatMat); m.userData.gore = 'coat'; rig.blade.add(m); rec.coat = m; }
  const L = 11.3 * Math.min(1, rec.blade) ** .7; rec.coat.visible = rec.blade > .03; rec.coat.position.z = 11.7 - L / 2; rec.coat.scale.z = Math.max(.01, L);
  return rec.coat;
}

// ---- drawing what flies, in the active style ----
// Painterly ('soft'): soft round drops trailing a brushed streak; Pixel-render ('crisp'): hard palette squares;
// Anime limited ('white'): flat cel teardrops with a hot highlight and an ink edge; Toon + dither ('dither'): 1-2 px
// drops in three bands, dithered as they thin out
export const LOOK = { soft: 'paint', crisp: 'pix', white: 'anime', dither: 'dither' };
export function bloodDraw(g) {
  const mode = LOOK[STYLE.s.trail] || 'paint', z = CAM.zoom;
  for (const d of BL.drops) { const [x, y] = toScreen(d.x, d.y, d.z); if (x < -4 || y < -4 || x > VW + 4 || y > VH + 4) continue;
    const [qx, qy] = toScreen(d.x - d.vx * .022, d.y - d.vy * .022, d.z - d.vz * .022), s = Math.max(1, d.sz * z ** .6 * .8);   // the close-up enlarges drops less than the bodies
    if (mode === 'pix') { const S = Math.max(1, Math.round(s * .8)), X = Math.round(x), Y = Math.round(y); g.fillStyle = s > 1.8 ? R[4] : R[3]; g.fillRect(X, Y, S, S);
      if (S > 1) { g.fillStyle = R[6]; g.fillRect(X, Y, 1, 1); } }
    else if (mode === 'dither') { const X = x | 0, Y = y | 0, S = s > 1.6 ? 2 : 1; g.fillStyle = bay(X, Y) < .5 ? R[3] : R[5]; g.fillRect(X, Y, S, S);
      if (Math.hypot(x - qx, y - qy) > 3 && bay(X + 1, Y + 2) > .4) { g.fillStyle = R[2]; g.fillRect(((x + qx) / 2) | 0, ((y + qy) / 2) | 0, 1, 1); } }
    else if (mode === 'anime') { g.strokeStyle = '#12060a'; g.lineCap = 'round'; g.lineWidth = s + 1.6; seg(g, qx, qy, x, y);
      g.strokeStyle = R[4]; g.lineWidth = s; seg(g, qx, qy, x, y); g.fillStyle = R[6]; g.fillRect(Math.round(x - s * .25), Math.round(y - s * .3), 1, 1); }
    else { g.globalAlpha = .55; g.strokeStyle = R[3]; g.lineCap = 'round'; g.lineWidth = s * .8; seg(g, qx, qy, x, y);
      g.globalAlpha = .92; g.fillStyle = R[4]; g.beginPath(); g.arc(x, y, s * .62, 0, TAU); g.fill();
      g.globalAlpha = .5; g.fillStyle = R[6]; g.beginPath(); g.arc(x - s * .2, y - s * .2, s * .25, 0, TAU); g.fill(); g.globalAlpha = 1; }
  }
  g.lineCap = 'butt'; g.globalAlpha = 1;
}
const seg = (g, ax, ay, bx, by) => { g.beginPath(); g.moveTo(ax, ay); g.lineTo(bx, by); g.stroke(); };
// the pixel look has no 3D blade to coat: a red line from the tip back along the blade, on the effects layer
export function bladeLine(g, b, amt) {
  if (!b || amt < .03) return; const a = toScreen(...b.tip), m = toScreen(...b.mid), k = Math.min(1, amt) * .9;
  const n = Math.max(1, Math.round(Math.hypot(m[0] - a[0], m[1] - a[1]) * 2 * k));
  g.fillStyle = R[4]; for (let i = 0; i <= n; i++) { const u = i / n * k * 2; g.fillRect(Math.round(a[0] + (m[0] - a[0]) * u), Math.round(a[1] + (m[1] - a[1]) * u), 1, 1); }
}
