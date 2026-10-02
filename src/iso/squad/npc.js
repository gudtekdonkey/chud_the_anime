// ---- An NPC in the slice: a Char (the flow actor and its look) that is also an AGENT for the engine-side AI
// (ai/, squad/). The brain writes `intent`; this body turns it into the page's clips (run, runArmed, guard, the cuts,
// fcut, and moves-squad.js's strafe, block, aim, taunt, downed, lift), fires the swings and takes the hits. The samurai,
// the archers and the companions are all this one class; what they are is data (kind, weapon, traits, wit).
import * as THREE from 'three';
import { AF, hOf, wrapA } from '../anim/flow.js';
import { Char } from '../play/char.js';
import { initMind } from '../ai/senses.js';
import { temperOf } from '../ai/temper.js';
import { dropToken } from '../ai/director.js';
import { joinSquad } from './squad.js';
import { piece, newPart } from '../gfx/build.js';
import { shadeMat } from '../gfx/shade.js';
import { RAMP } from '../gfx/palette.js';

const R2 = 1 / AF;   // world units → rig px (the flow's units)
// each swing: its clip, when it strikes, when its chain's next link may start, when it is over (busy until then)
export const SWING = { J1: { chain: .3, end: .42 }, J2: { chain: .28, end: .42 }, J3: { chain: .7, end: .72, heavy: 1 }, fcut: { end: 1.0 }, aim: { end: .9 } };
const BUSY = { J1: .42, J2: .42, J3: .72, fcut: 1.0, aim: .92, taunt: .8, block: .5, recoil: .42, knock: 1.1, lift: 99, downed: 99, die: 99 };
// a weapon in the slice: reach (world units), whether it shoots, its damage, a cooldown scale
export const WPN = { katana: { reach: 22, dmg: 1 }, yari: { reach: 26, dmg: 1 }, nodachi: { reach: 25, dmg: 1.4 }, tanto: { reach: 19, dmg: .8 }, bo: { reach: 24, dmg: .7 }, bow: { reach: 18, dmg: .6, ranged: 1, range: 190 } };
let N = 0;

export class Npc extends Char {
  constructor(o) {
    super({ x: o.x, z: o.z, h: o.h ?? 0, look: o.look, foe: o.team === 1 });
    Object.assign(this, { id: o.id || o.name, name: o.name, team: o.team, kind: o.kind, ally: o.team === 0, wpnId: o.wpn || 'katana', leader: !!o.leader, value: o.value ?? (o.leader ? 3 : 1),
      maxHp: o.hp ?? 5, hp: o.hp ?? 5, alive: true, downed: false, traits: o.traits || [], n: N++, spawn: [o.x, o.z, o.h ?? 0], patrol: o.patrol || null, post: o.post || null, tintBase: o.tint || null });
    const w = WPN[this.wpnId] || WPN.katana; this.reach = w.reach; this.ranged = !!w.ranged; this.range = w.range; this.dmg = w.dmg * (o.dmg ?? 1); this.blockP = o.blockP;
    this.temper = temperOf(this.traits, o.temper || {}); initMind(this); if (this.ally) joinSquad(this, o);
    this.intent = { k: 'idle', why: 'post' }; this.combo = 0; this.chase = 0; this.swing = null; this.bleed = 0; this.lift = 0;
    this.a.play(this.ranged ? 'idle' : this.ally ? 'idle' : 'guard'); this.a.update(1 / 120); this.a.sample(true);
    this.dressLook();
  }
  get h() { return this.a.h; }
  get dead() { return !this.alive || this.downed; }
  get state() { return this.a.clip.name; }
  get busy() { const n = this.state; return n in BUSY && this.a.ct < BUSY[n]; }
  get blocking() { return this.state === 'block' && this.a.ct < .5; }
  get loud() { return this.a.v > 140; }
  get sneaking() { return !!(this.intent && this.intent.sneak); }
  get tank() { return this.role === 'tank'; }
  get taunting() { return this.W && this.W.t - this.mind.tauntT < 3; }
  // ---- the ACTION INTERFACE the decision layer drives (docs/squad-ai.md; the same shape as the enemy types' can / do):
  // can(action): may the body start it now; do(action, target, o): take it as what to do next (the body runs it)
  can(k) { if (!this.alive || this.downed) return false; if (k === 'shoot') return this.ranged && !this.busy; if (k === 'block') return !this.ranged && !this.swing;
    return k === 'idle' || k === 'move' || !this.busy; }
  do(k, target = null, o = {}) { this.intent = { ...o, k, target: target ?? o.target ?? null }; return true; }
  setLook(kind, scene) { super.setLook(kind, scene); this.dressLook(); }
  // the bow (a 3D prop held upright in the far hand, placed after each pose) and the companions' paler steel
  dressLook() { const look = this.look, rig = look.rig; if (!rig || this.wpnId !== 'bow') return;
    const pc = piece(); newPart(); for (let i = -3; i <= 3; i++) { const u = i / 3; pc.box(.35, 2.3, .35, RAMP.w[2], { p: [0, u * 6.4, -1.5 * (1 - u * u)], r: [-u * .45, 0, 0] }); }
    newPart(); pc.box(.12, 13, .12, RAMP.m[4], { p: [0, 0, .25] });
    const bow = pc.mesh(shadeMat({ obj: this.team === 1 ? 2 : 1 })); rig.body.add(bow); const v = new THREE.Vector3(), show = look.show;
    look.show = f => { show(f); rig.B.handL.getWorldPosition(v); rig.body.worldToLocal(v); bow.position.copy(v); bow.visible = (f.alpha ?? 1) > .3; bow.updateMatrixWorld(true); }; }
  frame(hero) { const f = super.frame(hero); if (f && !f.tint && this.tintBase) { f.tint = this.tintBase.c; f.tintA = this.tintBase.a; } return f; }

  // ---- one step of the body (60 Hz, before the world steps): the brain's intent as clips ----
  drive(W, A) {
    this.W = A; const a = this.a, n = this.state, it = this.intent || { k: 'idle' };
    if (!this.alive) return;
    if (a.tint && A.t > (this.tintOff ?? 0)) a.tint = null;   // the telegraph's red glow
    if (this.downed) { if (n !== 'downed') a.play('downed'); a.vt = 0; return; }
    if (this.swing && SWING[n] && n !== this.swing.clip) this.endSwing(A);   // hurt out of a swing
    if (this.swing) return this.swingStep(A);
    if (this.busy) return;
    if (it.k !== 'revive' && n === 'lift') this.stand(false);
    const engaged = this.mind.mode === 'engaged' || this.ally && !!this.mind.target, armed = engaged && !this.ranged;
    a.mh = null;
    switch (it.k) {
      case 'move': case 'revive': { const tx = it.k === 'revive' ? it.target.x : it.x, tz = it.k === 'revive' ? it.target.z : it.z, d = Math.hypot(tx - this.x, tz - this.z);
        if (it.k === 'revive' && d < 11) { a.vt = 0; a.ht = hOf(tx - this.x, tz - this.z); if (n !== 'lift') { a.play('lift'); this.lift = 0; } this.lift += 1 / 60; if (this.lift > 1.4) { it.target.revive(A); this.intent = { k: 'idle' }; A.log(`revive:${this.name}>${it.target.name}`); } return; }
        if (d < 2.5) return this.stand(armed, it.face);
        a.ht = hOf(tx - this.x, tz - this.z); a.vt = Math.min(it.speed, d * 3 + 8) * R2; a.look = null;
        const clip = armed ? 'runArmed' : 'run'; if (n !== clip) a.play(clip, { blend: .08 }); return; }
      case 'strafe': { const d = Math.hypot(it.x - this.x, it.z - this.z); if (d < 2) return this.stand(true, it.face);
        a.ht = hOf(it.face.x - this.x, it.face.z - this.z); a.mh = hOf(it.x - this.x, it.z - this.z); a.vt = it.speed * R2; if (n !== 'strafe') a.play('strafe'); return; }
      case 'attack': return this.attackStep(A, it);
      case 'shoot': { const T = it.target; a.ht = a.h = hOf(T.x - this.x, T.z - this.z); a.vt = a.v = 0; a.turnSnap = true; a.play('aim'); this.swing = { clip: 'aim', target: T, t0: A.t }; return; }
      case 'block': a.vt = a.v = 0; if (it.face) a.ht = a.h = hOf(it.face.x - this.x, it.face.z - this.z); a.play('block'); this.intent = { k: 'idle', face: it.face }; return;
      case 'taunt': a.vt = a.v = 0; a.play('taunt'); this.mind.tauntT = A.t; this.intent = { k: 'idle' }; A.log(`taunt:${this.name}`); return;
      default: return this.stand(armed, it.face, it.facePt);
    }
  }
  stand(armed, face, facePt) { const a = this.a, n = this.state; a.vt = 0; a.look = face ? face.a : null;
    if (facePt) a.ht = hOf(facePt[0] - this.x, facePt[1] - this.z);
    const clip = armed ? 'guard' : 'idle'; if (n !== clip && (n === 'run' || n === 'runArmed' || n === 'strafe' || n === 'lift' || n === 'guard' || n === 'idle')) a.play(clip, { blend: .12 }); }
  // close in, then swing (the samurai's long telegraphed fcut; a companion's J chain, up to `combo` cuts)
  attackStep(A, it) {
    const a = this.a, T = it.target; if (!T.alive || T.downed) { this.intent = { k: 'idle' }; dropToken(A, this); return; }
    const d = Math.hypot(T.x - this.x, T.z - this.z), reach = this.reach;
    if (d > reach) { this.chase += 1 / 60; if (this.chase > 2.6) { this.chase = 0; this.intent = { k: 'idle', face: T }; dropToken(A, this); this.mind.cd = .4; return; }
      a.ht = hOf(T.x - this.x, T.z - this.z); a.vt = Math.min(62, (d - reach + 4) * 4 + 20) * R2; a.look = null; if (this.state !== 'runArmed') a.play('runArmed', { blend: .06 }); return; }
    this.chase = 0; const clip = this.kind === 'samurai' ? 'fcut' : 'J1';
    a.h = a.ht = hOf(T.x - this.x, T.z - this.z); a.turnSnap = true; a.vt = 0; a.v = 0;
    this.combo = (it.combo || 1) - 1; a.play(clip, { rs: Math.max(.3, Math.min(1, (d - 8) / 10)) });
    this.swing = { clip, target: T, t0: A.t, exec: it.exec, heavy: clip === 'J3' }; A.log(`swing:${this.name}>${T.name}${it.exec ? ':exec' : ''}`);
  }
  swingStep(A) {
    const a = this.a, s = this.swing, n = this.state, S = SWING[n]; if (!S) return this.endSwing(A);
    const T = s.target;
    if (S.chain && a.ct >= S.chain && this.combo > 0 && T.alive && !T.downed && Math.hypot(T.x - this.x, T.z - this.z) < this.reach + 6) {
      const next = n === 'J1' ? 'J2' : 'J3'; this.combo--; a.h = a.ht = hOf(T.x - this.x, T.z - this.z); a.turnSnap = true; a.play(next); s.clip = next; s.heavy = next === 'J3'; s.judged = null; s.t0 = A.t; return; }
    if (a.ct >= S.end) this.endSwing(A);
  }
  endSwing(A) { this.swing = null; dropToken(A, this); const t = this.temper;
    this.mind.cd = this.ranged ? 1.5 * (1.3 - t.aggro * .6) : this.ally ? .35 + (1 - t.aggro) * .5 : (1.1 + A.rng() * 1.2) * (1.4 - t.aggro * .8);
    if (this.intent && (this.intent.k === 'attack' || this.intent.k === 'shoot')) this.intent = { k: 'idle', face: this.intent.target }; }

  // ---- a hit on him: w 1 light, 2 heavy, 3 a finisher; `from` the heading the blow came along; src the striker
  react(A, w, from, dmg, src, fx) {
    if (!this.alive || this.downed) return false; const a = this.a, m = this.mind;
    const toward = wrapA(from + Math.PI - a.h), facing = Math.abs(toward) < 1.1, n = this.state;
    const pass = this.blockP ?? (.06 + .2 * this.temper.discipline + .14 * this.temper.wit + (this.leader ? .12 : 0));
    if (facing && w < 3 && !this.swing && A.t - m.parryT > 1 && (this.blocking || (['guard', 'strafe'].includes(n) && A.rng() < pass))) {
      m.parryT = A.t; if (n !== 'block') { a.play('block', { at: .06 }); } fx.parry(this, src); A.log(`parry:${this.name}`); return 'parry'; }
    if (this.swing) this.endSwing(A);
    const hurt = dmg * (this.tank && n === 'block' ? .5 : this.tank ? .75 : 1);
    this.hp -= hurt; a.flash = w > 1 ? .05 : .034; a.h = a.ht = from + Math.PI; a.tint = null; a.hitAt = A.t; a.mh = null;
    if (src && m) { m.threat.set(src.id, (m.threat.get(src.id) || 0) + hurt * 10 * (src.tank ? 1.6 : 1)); m.alert = Math.max(m.alert, 1.2); m.last = { x: src.x, z: src.z }; if (src.alive) m.seen.set(src.id, { x: src.x, z: src.z, t: A.t, a: src }); }
    A.wounded(this, hurt / this.maxHp);
    if (this.hp <= 0) {
      if (this.ally) { this.downed = true; this.hp = 0; this.bleed = 15; a.vt = 0; a.play('downed'); A.log(`downed:${this.name}`); return 'down'; }
      this.alive = false; this.diedAt = A.t; a.vt = 0; a.play('die'); A.died(this); A.log(`kill:${this.name}`); return 'kill'; }
    a.play(w >= 3 ? 'knock' : 'recoil', { rs: w >= 3 ? 1 : w === 2 ? .8 : .55 }); return true;
  }
  revive(A) { if (!this.downed) return; this.downed = false; this.hp = this.maxHp * .4; this.bleed = 0; this.mind.morale = .8; this.a.play('guard', { blend: .3 }); }
  // the slow part of being down or dead: a downed companion bleeds out (15 s); the dead fade
  tick(A, dt) {
    if (this.downed) { this.bleed -= dt; if (this.bleed <= 0) { this.downed = false; this.alive = false; this.diedAt = A.t; this.a.play('die', { at: .45 }); A.log(`dead:${this.name}`); } }
    if (!this.alive) { const since = A.t - this.diedAt; this.a.alpha = since > 2.4 ? Math.max(0, 1 - (since - 2.4) / .6) : 1; }
  }
  // back at his post, whole (a new wave, or a fallen companion back for the next)
  respawn(x = this.spawn[0], z = this.spawn[1]) { const a = this.a; Object.assign(this, { alive: true, downed: false, hp: this.maxHp, swing: null, intent: { k: 'idle' }, combo: 0 });
    initMind(this); a.x = x * R2; a.z = z * R2; a.h = a.ht = this.spawn[2]; a.alpha = 1; a.tint = null; a.feet.N.lock = a.feet.F.lock = 0; a.prev = null;
    a.play(this.ranged || this.ally ? 'idle' : 'guard', { blend: 0 }); a.update(1 / 120); a.sample(true); }
}
