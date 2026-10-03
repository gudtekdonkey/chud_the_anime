// ---- The big items in the courtyard (today's items/big.js, prototype 20): the Wayside Shrine (PRAY, then OFFER),
// the Grave Nodachi (TAKE), the Sealed Chest (CUT), the Rift Tablet (READ). The only things with lock-on brackets.
// Low-poly pieces like the room's (placeholders for modelled props); each act is a few beats on the game's clock while
// he plays its move (anim/moves-port.js), with today's numbers: the shrine fills health and Qi, the nodachi is his
// weapon, the chest spills four mon and three Qi motes, the tablet teaches Cross Rift. World units.
import * as THREE from 'three';
import { piece, newPart } from 'ronin-engine/render/gfx/build.js';
import { RAMP as R } from 'ronin-engine/render/gfx/palette.js';
import { shadeMat } from 'ronin-engine/render/gfx/shade.js';
import { SOLID } from '../world/room.js';
import { W } from 'ronin-engine/clock/world.js';
import { sparks, dust, crack, tear, ring } from 'ronin-engine/render/fx.js';
import { shake } from 'ronin-engine/render/gfx/view.js';
import { CTX } from '../ctx.js';
import { P, INV, heal, qiFill, showBanner, canOffer, offer } from './inv.js';
import { stream } from './item-fx.js';
import { spill } from './pickups.js';

const mat = shadeMat({ obj: 0 });
const mesh = (pc, parent, p = [0, 0, 0]) => { const m = pc.mesh(mat); m.position.set(...p); parent.add(m); return m; };
const box = (pc, w, h, d, col, p, o = {}) => { newPart(); return pc.box(w, h, d, col, { p, ...o }); };

// h: its height (the brackets' box), gap: where he stands from it, clip: his move, dur: how long the act runs
export const BIG = [
  { id: 'shrine', x: 64, z: 70, w: 16, d: 12, h: 24, gap: 18, verb: 'PRAY', clip: 'pray', dur: .95 },
  { id: 'nodachi', x: 214, z: 246, w: 8, d: 6, h: 30, gap: 13, verb: 'TAKE', clip: 'take', dur: .75 },
  { id: 'chest', x: 380, z: 222, w: 16, d: 11, h: 12, gap: 17, verb: 'CUT', clip: 'J1', dur: .95 },
  { id: 'tablet', x: 100, z: 226, w: 14, d: 6, h: 26, gap: 15, verb: 'READ', clip: 'read', dur: 1.05 },
].map(it => ({ ...it, used: false }));

export function buildBig(scene) {
  for (const it of BIG) { const g = new THREE.Group(); g.position.set(it.x, 0, it.z); scene.add(g); it.g = g; BUILD[it.id](it, g);
    if (it.id !== 'nodachi') SOLID.push({ x0: it.x - it.w / 2, x1: it.x + it.w / 2, z0: it.z - it.d / 2, z1: it.z + it.d / 2 }); }
}
const BUILD = {
  shrine(it, g) {   // a wayside hokora: a stone plinth, a dark wooden house, a roof, an offering bowl, a flame
    mesh(box(piece(), 16, 4, 12, R.n[4], [0, 2, 0]).add(new THREE.BoxGeometry(14, .8, 10), R.n[6], { p: [0, 4.3, 0] }), g);
    mesh(box(piece(), 10, 10, 7, R.w[1], [0, 9.6, 0]).add(new THREE.BoxGeometry(6, 6, .4), R.k[1], { p: [0, 9.2, 3.6] })
      .add(new THREE.BoxGeometry(1.2, 11, 1.2), R.w[2], { p: [-4.8, 9.8, 3.2] }).add(new THREE.BoxGeometry(1.2, 11, 1.2), R.w[2], { p: [4.8, 9.8, 3.2] }), g);
    mesh(box(piece(), 15, 1.2, 6.5, R.k[2], [0, 16.6, 2.2], { r: [.5, 0, 0] }).add(new THREE.BoxGeometry(15, 1.2, 6.5), R.k[2], { p: [0, 16.6, -2.2], r: [-.5, 0, 0] })
      .add(new THREE.BoxGeometry(16, .8, .8), R.k[3], { p: [0, 18.4, 0] }), g);
    mesh(box(piece(), 3, 1, 2, R.n[7], [0, 5.2, 4.6]), g);
    it.flame = mesh(piece().box(.9, 1.6, .9, R.y[1], { p: [0, 7, 4.6], glow: true }).box(.5, 1, .5, R.y[3], { p: [0, 7.6, 4.6], glow: true }), g);
  },
  nodachi(it, g) {   // driven point-down into a grave mound, leaning; a cord on the hilt
    it.mound = mesh(box(piece(), 9, 2, 7, R.f[1], [0, 1, 0]).add(new THREE.BoxGeometry(6, 1.2, 4.5), R.n[3], { p: [0, 2.4, 0] }), g);
    const b = new THREE.Group(); b.position.set(0, 2, 0); b.rotation.set(.12, 0, .16); g.add(b); it.blade = b;
    mesh(piece().box(.4, 19, .9, R.i[9], { p: [0, 7.5, 0], glow: true }).box(.3, 19, .3, R.i[10], { p: [0, 7.5, .45], glow: true }), b);
    mesh(box(piece(), 3, .6, 3, R.i[6], [0, 17.3, 0]).add(new THREE.BoxGeometry(.8, 6, .8), R.k[2], { p: [0, 20.9, 0] }).add(new THREE.BoxGeometry(1.4, .3, .3), R.m[3], { p: [.8, 21.5, 0] }), b);
  },
  chest(it, g) {   // black lacquer, iron corners, the paper seal across the lid with a cyan mark
    mesh(box(piece(), 16, 8, 11, R.k[2], [0, 4, 0]).add(new THREE.BoxGeometry(16.4, 1, 11.4), R.i[4], { p: [0, .5, 0] })
      .add(new THREE.BoxGeometry(1.2, 8.2, 1.2), R.i[5], { p: [-7.6, 4, 5.2] }).add(new THREE.BoxGeometry(1.2, 8.2, 1.2), R.i[5], { p: [7.6, 4, 5.2] }), g);
    const lid = new THREE.Group(); lid.position.set(0, 8, -5.5); g.add(lid); it.lid = lid;
    mesh(box(piece(), 16.6, 3, 11.6, R.k[3], [0, 1.5, 5.5]).add(new THREE.BoxGeometry(17, .6, 12), R.i[5], { p: [0, 3.1, 5.5] }), lid);
    it.seal = mesh(piece().box(2.2, 11.4, .2, R.m[5], { p: [0, 6, 5.85] }).box(1.2, 1.6, .25, R.y[1], { p: [0, 7.4, 5.9], glow: true }), g);
  },
  tablet(it, g) {   // an upright stone with glyph lines that light in order under his palm
    mesh(box(piece(), 14, 3, 7, R.n[3], [0, 1.5, 0]).add(new THREE.BoxGeometry(11, 23, 3.4), R.n[5], { p: [0, 14, 0] }).add(new THREE.BoxGeometry(11.6, 1.2, 3.8), R.n[7], { p: [0, 25.8, 0] }), g);
    it.glyphs = []; const rows = [[-3, 22], [1, 22], [-2, 19], [2.5, 19], [-3.5, 16], [0, 16], [3, 13], [-1, 13], [-3, 10], [2, 10], [0, 7]];
    for (const [x, y] of rows) { const dim = mesh(piece().box(1.6, .6, .3, R.n[2], { p: [x, y, 1.75] }), g), lit = mesh(piece().box(1.6, .6, .3, R.y[1], { p: [x, y, 1.78], glow: true }), g);
      lit.visible = false; it.glyphs.push({ dim, lit }); }
  },
};

// the act: { it, t }; a beat fires once when the clock passes it
let act = null;
export const acting = () => act;
const once = (k, at) => { if (act.fired.has(k) || act.t < at) return false; act.fired.add(k); return true; };
export const usable = it => !it.used || (it.id === 'shrine' && canOffer());
export const verbOf = it => it.used && it.id === 'shrine' ? 'OFFER' : it.verb;
export function startAct(it) {
  const hero = CTX.hero, a = hero.a, h = Math.atan2(it.x - hero.x, it.z - hero.z);
  a.h = a.ht = h; a.turnSnap = true; a.vt = 0; a.v = 0; a.play(it.clip, { rs: .001, next: x => x.play(it.id === 'chest' ? 'guard' : 'idle') });
  act = { it, t: 0, fired: new Set(), offering: it.used && it.id === 'shrine' }; CTX.busy = 'item';
}
export function tickBig(dt) {
  for (const it of BIG) if (it.lidT != null) { it.lidT += dt; const k = Math.min(1, it.lidT / .35); it.lid.rotation.x = -1.9 * (1 - (1 - k) ** 3); it.lid.position.y = 8 + Math.sin(Math.PI * k) * 3; }
  for (const it of BIG) if (it.id === 'shrine') it.flame.visible = !it.used || (act && act.it === it && act.t > .15 && act.t < 1.2) || Math.floor(W.t * 9) % 7 !== 0 && !it.used;
  for (const it of BIG) if (it.id === 'tablet') it.glyphs.forEach((gl, i) => { const lit = act && act.it === it && act.t > .1 + i * .045 && act.t < .78; gl.lit.visible = lit; gl.dim.visible = !lit; });
  if (!act) return; act.t += dt; const it = act.it, hero = CTX.hero;
  if (it.id === 'shrine') {
    if (act.t > .2 && act.t < .8 && Math.floor(act.t / .05) !== Math.floor((act.t - dt) / .05)) stream([it.x, 7, it.z + 4.6], hero, { h: 8 });
    if (once('amen', .85)) { if (act.offering) { if (offer()) { ring(W, hero.a.x, hero.a.z, { r: 14 }); sparks(W, hero.a.x, 18, hero.a.z, 10, { spd: 60, spread: 6 }); } }
      else { heal(1); qiFill(1); it.used = true; ring(W, hero.a.x, hero.a.z, { r: 14 }); sparks(W, hero.a.x, 18, hero.a.z, 8, { spd: 60, spread: 6 }); } } }
  if (it.id === 'nodachi' && once('pull', .32)) { it.used = true; it.blade.visible = false; dust(W, it.x / .5, it.z / .5, 10, { spd: 34, life: .5 }); crack(W, it.x / .5, it.z / .5);
    W.hitstop(.06); shake(1, 2 / 60); P.weapon = INV.weapon = 'nodachi'; INV.fx.weapon = .14; showBanner('NEW WEAPON', 'GRAVE NODACHI'); }
  if (it.id === 'chest') {
    if (once('cut', .19)) { it.cutAt = W.t; W.hitstop(.08); shake(1, 1 / 60); sparks(W, it.x / .5, 12, it.z / .5, 8, { spd: 110, spread: 6 }); tear(W, it.x / .5, 12, it.z / .5, .4, 16, 3); }
    if (once('open', .8)) { it.used = true; it.seal.visible = false; it.lidT = 0; ring(W, it.x / .5, it.z / .5, { r: 16 }); spill(it.x, it.z, [...'cccc'].map(() => 'coin').concat(['qi', 'qi', 'qi'])); } }
  if (it.id === 'tablet') {
    if (once('lift', .78)) for (let i = 0; i < 6; i++) stream([it.x + (i - 3), 10 + i * 2, it.z + 2], hero, { d: i * .012, dur: .35, h: 10 });
    if (once('learn', 1.0)) { it.used = true; if (INV.sk && INV.sk.rift) INV.sk.rift.known = true; showBanner('SKILL LEARNED', 'CROSS RIFT', 1.6); } }
  if (act.t >= it.dur) { act = null; CTX.busy = null; }
}
