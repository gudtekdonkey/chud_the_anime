// ---- R, Blade Recall (design-notes "Skills, round two": picked; prototype 18's three takes). R throws the katana
// point-first; it NEVER spins: it flies out, stops in the air, turns slowly tip up and over until it points back at
// him (at the mouth of his saya), and hangs there drifting a pixel at a time, a faint thread from its tip to his hip.
// He is empty-handed meanwhile (no J; he can run and roll). Tap R again to call it back, alternating HOME TO THE SHEATH
// (it flies into the saya on the click) and THE CATCH (he snatches the grip as it passes, flicks and sheathes); hold R
// for THE ANCHOR (he flashes along the thread to it instead, past it with the grip in hand). Whatever lies between is
// cut on the way through (the black slash, a flinch), and falls on the click.
import * as THREE from 'three';
import { W, STOP } from 'ronin-engine/clock/world.js';
import { STATS } from 'ronin-engine/iso/play/rules.js';
import { hOf, hv, AF, EZ, clamp, lerp } from 'ronin-engine/flow/flow.js';
import { sparks, dust, focus, tear } from 'ronin-engine/iso/fx.js';
import { shake } from 'ronin-engine/iso/gfx/view.js';
import { startCine } from 'ronin-engine/iso/cine.js';
import { held } from 'ronin-engine/input/keys.js';
import { piece, newPart } from 'ronin-engine/iso/gfx/build.js';
import { RAMP as R } from 'ronin-engine/iso/gfx/palette.js';
import { shadeMat } from 'ronin-engine/iso/gfx/shade.js';
import { ROOM } from '../world/room.js';
import { KIT, tv, T, startCd, castStart, landed, qiAdd, pop } from './kit.js';
import { scr, thread, star } from 'ronin-engine/iso/skills/sfx.js';

const D = 76, Y = 26, HOLD = .25;                 // how far it flies (rig px ×AF: 38 units), the height it hangs at (rig px), a hold that anchors
const OWN = new Set(['rThrow', 'rCall', 'rHome', 'rReach', 'rCaught', 'rAnchor']);
// the state: null (in his hand), or the blade in the world { p: [x, y, z] rig px, d: its pointing direction (unit 3-vector), phase, ... }
const st = { b: null, call: null, mode: 0, hits: [], pendingKill: false };
let mesh = null;
const v3 = (x, y, z) => new THREE.Vector3(x, y, z), _m = new THREE.Matrix4(), _q = new THREE.Quaternion();
// the katana alone, as the model carries it (look/three/ronin.js): grip, tsuba, blade along +z
function build(scene) {
  const p = piece(); newPart(); p.box(.42, .48, 2.6, R.i[2], { p: [0, 0, -1.1] }).box(.48, .52, .3, R.i[7], { p: [0, 0, -2.45] }); newPart(); p.cyl(.7, .7, .18, 8, R.i[7], { p: [0, 0, .15], r: [Math.PI / 2, 0, 0] });
  newPart(); p.box(.18, .45, 11.4, R.i[9], { p: [0, 0, 6.0], glow: true }).box(.12, .14, 11.1, R.i[10], { p: [0, -.21, 6.0], glow: true });
  mesh = p.mesh(shadeMat({ obj: 1 })); mesh.visible = false; mesh.layers.enable(1); scene.add(mesh); }
// where its hilt and tip are (rig px); it is drawn from the hilt, pointing along d
const tipOf = b => [b.p[0] + b.d[0] * 23, b.p[1] + b.d[1] * 23, b.p[2] + b.d[2] * 23];
const hipOf = hero => { const a = hero.a, v = hv(a.h); return [a.x - v[1] * 3 + v[0] * 2, 18, a.z + v[0] * 3 + v[1] * 2]; };   // the saya's mouth, at his left hip
const handOf = hero => { const a = hero.a, v = hv(a.h); return [a.x + v[0] * 9, 26, a.z + v[1] * 9]; };
const norm = v => { const l = Math.hypot(...v) || 1; return v.map(x => x / l); };
// the hit test along a stretch of its path: everyone within `r` of the segment, once each
function sweep(C, a, b) { const r = 10 * tv('recall', 'reach');
  for (const f of C.foes) { if (f.dead || st.hits.includes(f)) continue;
    const dx = b[0] - a[0], dz = b[2] - a[2], L2 = dx * dx + dz * dz || 1, u = clamp(((f.a.x - a[0]) * dx + (f.a.z - a[2]) * dz) / L2, 0, 1);
    if (Math.hypot(f.a.x - (a[0] + dx * u), f.a.z - (a[2] + dz * u)) > r) continue;
    st.hits.push(f); const hd = hOf(dx, dz); f.a.flash = .034; f.a.play('recoil', { rs: .4 }); f.a.hitAt = W.t; f.guardT = 0;
    tear(W, f.a.x, 22, f.a.z, Math.atan2(dz * .8, dx), 24, 4); sparks(W, f.a.x, 22, f.a.z, 8, { dir: hd, spd: 130 }); focus(W, f.a.x, 22, f.a.z);
    W.hitstop(STOP.light); landed('recall'); qiAdd(.08); STATS.log.push('R:pass'); } }
// the click: what it passed through falls (and a kill gets the close-up)
function click(C) {
  if (!st.pendingKill) return; st.pendingKill = false; const hero = C.hero; let kill = null;
  for (const f of st.hits) { if (f.dead) continue; const r = f.react(2, hOf(f.a.x - hero.a.x, f.a.z - hero.a.z), T('recall')); if (r === 'kill') kill = kill || f; STATS.hits++; }
  if (st.hits.length) { W.hitstop(kill ? STOP.kill : STOP.heavy); shake(kill ? 1.5 : 1, 3 / 60); STATS.log.push(`R:click:${st.hits.length}${kill ? ':kill' : ''}`); }
  if (kill) startCine(hero, kill);
  st.hits = []; }
function done(C) { st.b = null; st.call = null; C.hero.bladeAway = false; C.hero.noCut = false; if (mesh) mesh.visible = false; startCd('recall'); }

export const recall = {
  id: 'recall',
  get away() { return !!st.b; },
  get blade() { return st.b && { p: st.b.p.map(v => v * AF), phase: st.b.phase }; },
  owns(C) { const n = C.hero.state; return OWN.has(n) || !!st.call || (n === 'sheathe' && st.pendingKill); },
  // R: a throw with the blade in hand (from anything that can act), a call or the anchor while it hangs (from anything)
  canPress(C, free) { return free && (!st.b || ((st.b.phase === 'hang' || st.b.phase === 'turn') && !st.call)); },
  press(C, t) {
    const hero = C.hero, a = hero.a;
    if (st.b) { st.call = { t }; return true; }
    // the throw: toward the nearest samurai in front (within 1.5× its flight), else where he faces
    let h = a.h; for (const f of C.foes) { if (f.dead) continue; const dx = f.a.x - a.x, dz = f.a.z - a.z; if (Math.hypot(dx, dz) < D * 1.5 && Math.abs(Math.atan2(Math.sin(hOf(dx, dz) - a.h), Math.cos(hOf(dx, dz) - a.h))) < 1.3) { h = hOf(dx, dz); break; } }
    a.h = a.ht = Math.round(h / (Math.PI / 4)) * (Math.PI / 4); a.turnSnap = true; a.vt = 0; a.v = 0;
    a.play('rThrow'); castStart('recall'); STATS.log.push('R:throw'); return true;
  },
  step(C, dt) {
    const hero = C.hero, a = hero.a, b = st.b;
    // the call: a tap calls it back (home, then the catch, alternating); a hold goes to it
    if (st.call && !st.call.go) { const c = st.call, long = W.t - c.t >= HOLD;
      if (long || !held('recall')) { c.go = long ? 'anchor' : (st.mode++ % 2 ? 'catch' : 'home'); c.from = b.p.slice(); c.at = W.t; st.hits = []; st.pendingKill = true; b.phase = 'return';
        const tx = c.from[0] - a.x, tz = c.from[2] - a.z; a.h = a.ht = hOf(tx, tz); a.turnSnap = true; a.vt = 0; a.v = 0;
        if (c.go === 'anchor') { a.play('rAnchor'); c.start = [a.x, a.z]; c.end = [c.from[0] + tx / (Math.hypot(tx, tz) || 1) * 8, c.from[2] + tz / (Math.hypot(tx, tz) || 1) * 8]; c.dur = .14; mesh.visible = false; }
        else { a.play(c.go === 'home' ? 'rCall' : 'rReach'); c.dur = Math.max(.12, Math.hypot(tx, tz) / 420); }
        STATS.log.push('R:' + c.go); } }
    if (!b) return;
    if (hero.state === 'guard') a.play('idle', { blend: .1 }); else if (hero.state === 'runArmed') a.play('run', { blend: .06 });   // empty-handed: no guard, no blade-out run
    const t = W.t - b.t0;
    if (b.phase === 'fly') { const u = EZ.o(clamp(t / .26, 0, 1)); b.p = [lerp(b.from[0], b.to[0], u), lerp(b.from[1], Y, u), lerp(b.from[2], b.to[2], u)]; if (u >= 1) { b.phase = 'turn'; b.t0 = W.t; b.d0 = b.d.slice(); } }
    else if (b.phase === 'turn' || b.phase === 'hang') {
      // tip up and over (a half turn about the level axis across its flight), then it keeps pointing at his saya, drifting
      const want = norm(hipOf(hero).map((v, i) => v - b.p[i])), k = EZ.s(clamp(t / .55, 0, 1));
      if (b.phase === 'turn') { const th = Math.PI * k, f = b.d0, up = [0, 1, 0], s = Math.sin(th), c = Math.cos(th);
        const over = norm([f[0] * c + up[0] * s, f[1] * c + up[1] * s, f[2] * c + up[2] * s]); b.d = norm(over.map((v, i) => lerp(v, want[i], EZ.s(clamp((t - .35) / .2, 0, 1)))));
        b.p[1] = Y + 4 * Math.sin(Math.PI * k); if (t >= .55) b.phase = 'hang'; }
      else { b.d = norm(b.d.map((v, i) => v + (want[i] - v) * Math.min(1, dt * 3))); const tt = W.t;
        b.p = [b.to[0] + Math.round(Math.sin(tt * 1.3) * 1.2), Y + Math.round(Math.sin(tt * 1.7 + 1) * 1), b.to[2] + Math.round(Math.cos(tt * 1.1) * 1.2)]; } }
    else if (b.phase === 'return' && st.call) { const c = st.call, u = clamp((W.t - c.at) / c.dur, 0, 1);
      if (c.go === 'anchor') { const e = EZ.i2(u), prev = [a.x, 0, a.z]; a.x = lerp(c.start[0], c.end[0], e); a.z = lerp(c.start[1], c.end[1], e); sweep(C, prev, [a.x, 0, a.z]);
        if (u >= 1) { st.b = null; hero.bladeAway = false; hero.noCut = false; st.call = null; dust(W, a.x, a.z, 8, { spd: 30, life: .5 }); startCd('recall'); } }
      else { const dest = c.go === 'home' ? hipOf(hero) : handOf(hero), prev = b.p.slice(), e = EZ.i2(u);
        b.p = c.from.map((v, i) => lerp(v, dest[i], e)); b.d = norm(dest.map((v, i) => v - c.from[i])); sweep(C, prev, b.p);
        if (u >= 1) { a.play(c.go === 'home' ? 'rHome' : 'rCaught'); done(C); if (c.go === 'catch') dust(W, a.x, a.z, 5, { spd: 24, dir: a.h + Math.PI }); } } }
    if (st.pendingKill && !st.b && !OWN.has(hero.state) && hero.state !== 'sheathe') click(C);   // cut short before the click: they fall now
  },
  events: {
    release(C, a) { if (a !== C.hero.a) return; const hero = C.hero, v = hv(a.h), dist = D * tv('recall', 'dist'), from = [a.x + v[0] * 8, 30, a.z + v[1] * 8];
      const to = [clamp(a.x + v[0] * dist, (ROOM.x0 + 12) / AF, (ROOM.x1 - 12) / AF), Y, clamp(a.z + v[1] * dist, (ROOM.z0 + 14) / AF, (ROOM.z1 - 12) / AF)];
      st.b = { p: from.slice(), from, to, d: norm([v[0], 0, v[1]]), phase: 'fly', t0: W.t }; st.hits = [];
      hero.bladeAway = true; hero.noCut = true; if (mesh) mesh.visible = true; sparks(W, from[0], from[1], from[2], 3, { dir: a.h, spd: 50 }); },
    catch(C, a) { if (a !== C.hero.a) return; sparks(W, a.x, 26, a.z, 5, { spd: 60, spread: 4 }); },
    click(C, a) { if (a === C.hero.a) click(C); },
  },
  // the blade in the scene (a mesh, lit like him in the active style), the thread, its glint
  render(C) { if (!mesh) build(C.scene); const b = st.b; mesh.visible = !!b && !(st.call && st.call.go === 'anchor' && b.phase === 'return');
    if (!b) return; mesh.position.set(b.p[0] * AF, b.p[1] * AF, b.p[2] * AF);
    const z = v3(...b.d), up = Math.abs(z.y) > .95 ? v3(1, 0, 0) : v3(0, 1, 0), x = new THREE.Vector3().crossVectors(up, z).normalize(), y = new THREE.Vector3().crossVectors(z, x);
    mesh.quaternion.copy(_q.setFromRotationMatrix(_m.makeBasis(x, y, z))); mesh.updateMatrixWorld(true); },
  draw(g, C) { const b = st.b; if (!b || (st.call && st.call.go)) return; if (b.phase === 'fly') return;
    const tip = scr(...tipOf(b)), hip = scr(...hipOf(C.hero)); thread(g, tip, hip, W.t);
    if (b.phase === 'hang' && (W.t * 2 | 0) % 3 === 0) star(g, tip[0], tip[1], false, W.t); },
};
