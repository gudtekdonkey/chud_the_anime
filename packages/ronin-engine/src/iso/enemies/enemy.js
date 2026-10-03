// ---- AN ENEMY: one character of a type (types.js), on the flow actor and a look like the hero and the samurai, with
// the ACTION INTERFACE a decision layer drives (docs/enemies.md):
//
//   e.can(action, target, opts) → bool      e.do(action, target, opts) → bool (false: refused, nothing changed)
//   e.moves() → [{ name, range, pool, ready, unblockable, ... }]      e.info → a read-only snapshot
//
// actions: hold · move { x, z } · approach { dist } · retreat { dist } · strafe { dir: ±1 } · engage (take a token and
// close in) · attack { move } · block { dur } · parry · dodge { dir: back | left | right } · vanish · ambush · flee ·
// regroup. Movement actions are intents he keeps until told otherwise; the rest are moves that play out and hand him
// back 'ready'. Positions and distances in the interface are world units (Char.x/z); inside, the flow's rig px.
// How he reacts to being hit, blocks, parries, staggers, armours through and dies is his own, here, whatever decides.
import { Char } from '../char.js';
import { hOf, wrapA, hv, AF, rnd } from '../../flow/flow.js';
import { W } from '../../clock/world.js';
import { TYPES, enemyLook } from './types.js';
import { HITS, hitTimes } from './moves.js';
import { CTX, TOKENS } from './ctx.js';
import { emit } from './events.js';
import { hurtHero, shoot, puff, slamFx, phaseFx } from './combat.js';
import { ROOM } from '../../world/room.js';
import { BODY_SHEAR } from '../gfx/view.js';
import * as THREE from 'three';

let NID = 1;
const MOVE_ACTS = new Set(['hold', 'move', 'approach', 'retreat', 'strafe']);
const between = ([a, b]) => a + (b - a) * rnd();
const _v = new THREE.Vector3();
// how far the weapon reaches past the grip (rig px): the trail's mid and tip, and the commit glint
const REACH = { sword: [11.5, 23], tanto: [5, 9], spear: [24, 40], club: [16, 26], bow: null };

export class Enemy extends Char {
  constructor(kind, o) {
    super({ x: o.x, z: o.z, h: o.h ?? 0, look: o.look, foe: true });
    const T = this.T = TYPES[kind]; this.kind = kind; this.id = NID++;
    this.look.dispose(); this.look = enemyLook(this.lookKind, T);
    this.r = T.r; this.maxHp = Math.max(1, Math.round(T.hp * (o.hpK ?? 1))); this.hp = this.maxHp;
    this.poise = T.poise; this.guardHits = T.guard ? T.guard.hits : 0; this.morale = 1; this.phase = 0; this.seed = rnd() * 9;
    this.st = 'ready'; this.intent = null; this.atk = null; this.cd = {}; this.readyAt = W.t + between([.4, 1.2]); this.hitAt = -9;
    this.dead = false; this.gone = false; this.hits = 0; this.attacks = 0; this.blocks = 0; this.deaths = 0; this.strikes = 0;
    this.a.turn = T.turn; this.a.look = null;
    if (o.hidden) { this.st = 'hidden'; this.hiddenTill = 0; this.a.alpha = 0; }
    this.play('e_guard'); this.a.update(1 / 120); this.a.sample(true);
  }
  get state() { return this.a.clip.name; }
  get targetable() { return !this.dead && this.st !== 'hidden' && this.a.alpha > .3; }
  setLook(kind, scene) { this.look.dispose(); this.lookKind = kind; this.look = enemyLook(kind, this.T); this.look.mount(scene); }
  play(name, o = {}) { this.a.mh = null; this.a.play(name, o); }
  dist(t) { return Math.hypot(t.a.x - this.a.x, t.a.z - this.a.z); }
  toward(t) { return hOf(t.a.x - this.a.x, t.a.z - this.a.z); }
  get cdK() { return this.T.phases ? this.T.phases[this.phase].cdK : 1; }
  // ---- what he could do now ----
  moves() { const out = [];
    for (const [name, m] of Object.entries(this.T.moves)) { if ((m.phase ?? 0) > this.phase) continue;
      out.push({ name, range: m.range.map(v => v * AF), pool: m.pool, ready: W.t >= (this.cd[name] || 0) && W.t >= this.readyAt, weight: m.weight,
        unblockable: m.seq.some(c => HITS[c] && HITS[c].unblock), hitAt: hitTimes(m.seq[0])[0] ?? 0, kind: HITS[m.seq[0]] && HITS[m.seq[0]].shot ? 'ranged' : 'melee' }); }
    return out; }
  get info() { return { id: this.id, kind: this.kind, name: this.T.name, role: this.T.role, st: this.st, clip: this.state, hp: this.hp, maxHp: this.maxHp, poise: this.poise,
    morale: this.morale, phase: this.phase, token: TOKENS.has(this), attack: this.atk ? this.atk.name : null, x: this.x, z: this.z, h: this.a.h, dead: this.dead, hidden: this.st === 'hidden',
    ring: this.T.ring * AF, boss: !!this.T.boss }; }
  can(action, target, o = {}) {
    const T = this.T, t = W.t, st = this.st; if (this.dead) return false;
    if (MOVE_ACTS.has(action)) return st === 'ready' || st === 'flee';
    switch (action) {
      case 'engage': return T.role === 'melee' && st === 'ready' && t >= this.readyAt && TOKENS.can(this, 'melee');
      case 'attack': { const m = T.moves[o.move]; if (!m || st !== 'ready' || (m.phase ?? 0) > this.phase) return false;
        if (!o.force && (t < this.readyAt || t < (this.cd[o.move] || 0))) return false;
        if (target) { const d = this.dist(target); if (d < m.range[0] || d > m.range[1]) return false; }
        return o.noToken || TOKENS.can(this, m.pool); }
      case 'block': return !!T.guard && (st === 'ready' || st === 'block');
      case 'parry': return !!T.parry && st === 'ready' && t >= (this.cd.parry || 0);
      case 'dodge': return !!T.dodge && st === 'ready' && t >= (this.cd.dodge || 0);
      case 'vanish': return !!T.vanish && st === 'ready' && t >= (this.cd.vanish || 0);
      case 'ambush': return st === 'hidden' && t >= (this.hiddenTill || 0);
      case 'flee': return st === 'ready' && !T.boss;
      case 'regroup': return st === 'flee';
    } return false; }
  do(action, target, o = {}) {
    if (!this.can(action, target, o)) return false; const a = this.a, t = W.t;
    switch (action) {
      case 'hold': this.intent = { kind: 'hold', face: target }; break;
      case 'move': this.intent = { kind: 'move', x: o.x / AF, z: o.z / AF, face: target, run: o.run }; break;
      case 'approach': this.intent = { kind: 'approach', to: target, dist: (o.dist ?? this.T.ring * AF) / AF, face: target, run: o.run }; break;
      case 'retreat': this.intent = { kind: 'retreat', from: target, dist: (o.dist ?? this.T.ring * AF * 1.3) / AF, face: target }; break;
      case 'strafe': this.intent = { kind: 'strafe', around: target, dir: o.dir || 1, face: target }; break;
      case 'engage': TOKENS.take(this, 'melee'); this.intent = { kind: 'approach', to: target, dist: (o.dist ?? this.bestReach() * AF) / AF, face: target }; break;
      case 'attack': this.startAttack(o.move, this.T.moves[o.move], target, o); break;
      case 'block': this.st = 'block'; this.blockTill = t + (o.dur ?? .7); this.foe = target; if (this.state !== 'e_block') this.play('e_block'); a.vt = 0; break;
      case 'parry': this.st = 'parry'; this.foe = target; this.parryTill = t + this.T.parry.win; this.cd.parry = t + this.T.parry.cd; this.play('e_parryStance'); a.vt = 0; emit('parry-ready', this); break;
      case 'dodge': { const to = target ? this.toward(target) : a.h, d = o.dir ?? 'back', hd = typeof d === 'number' ? d : to + ({ back: Math.PI, left: -Math.PI / 2, right: Math.PI / 2 }[d] ?? Math.PI);
        this.dropAttack(); this.st = 'dodge'; this.dodgeTill = t + .28; this.cd.dodge = t + this.T.dodge.cd; a.h = a.ht = to; a.turnSnap = true; a.vt = 0;
        this.play('e_hop', { next: () => this.toReady() }); a.mh = hd; emit('dodge', this, { dir: d }); break; }
      case 'vanish': this.dropAttack(); this.st = 'vanish'; this.cd.vanish = t + this.T.vanish.cd; this.play('e_vanish'); a.vt = 0; break;
      case 'ambush': this.ambush(target); break;
      case 'flee': this.dropAttack(); this.st = 'flee'; this.intent = { kind: 'flee', from: target }; emit('flee', this); break;
      case 'regroup': this.st = 'ready'; this.intent = null; emit('regroup', this); break;
    }
    return true; }
  // where to stand to strike: inside the shortest of his melee moves' reach, so any of them can come
  bestReach() { let r = 1e9; for (const m of Object.values(this.T.moves)) if ((m.phase ?? 0) <= this.phase && m.pool === 'melee') r = Math.min(r, m.range[1]); return r * .85; }

  // ---- attacks: a string of clips, the token held from the first wind-up to the end of the recovery
  startAttack(name, m, target, o = {}) {
    const a = this.a; if (!o.noToken) { TOKENS.take(this, m.pool); const v = TOKENS.held.get(this); if (v) v.used = true; }
    this.st = 'attack'; this.intent = null; this.atk = { name, m, i: 0, target, rec: 0 }; this.attacks++;
    if (target) { a.h = a.ht = this.toward(target); a.turnSnap = true; } a.vt = 0; a.v = 0;
    this.playSeq(); }
  playSeq() { const at = this.atk, clip = at.m.seq[at.i];
    this.play(clip, { blend: at.i ? .03 : .07, next: () => { if (this.atk !== at) return; if (++at.i < at.m.seq.length) this.playSeq(); else at.rec = W.t + (this.T.recover ?? .3); } }); }
  dropAttack() { if (this.atk) { this.cd[this.atk.name] = W.t + (this.atk.m.cd ?? 1) * this.cdK; this.atk = null; this.readyAt = W.t + between(this.T.cd) * this.cdK; } TOKENS.release(this); }
  toReady(blend = .2) { this.dropAttack(); this.st = 'ready'; this.play('e_guard', { blend }); this.a.vt = 0; }
  ambush(target) { const a = this.a, b = hv(target.a.h + Math.PI);
    a.x = Math.max(ROOM.x0 / AF + 20, Math.min(ROOM.x1 / AF - 20, target.a.x + b[0] * 34)); a.z = Math.max(ROOM.z0 / AF + 20, Math.min(ROOM.z1 / AF - 20, target.a.z + b[1] * 34));
    a.feet.N.lock = a.feet.F.lock = 0; a.prev = null; a.alpha = .35; puff(this.a.x, this.a.z, 10);
    this.startAttack('ambush', { seq: ['e_ambush'], cd: 3, pool: 'melee' }, target, { noToken: true }); this.play('e_ambush', { blend: 0, next: () => { if (this.atk) this.atk.rec = W.t + .3; } }); }

  // ---- the move's events (moves.js keys), routed here by the squad
  onEvent(n) {
    const a = this.a, c = a.clip.name, H = HITS[c] || {};
    if (n === 'e:tele') { const ub = !!H.unblock; a.tint = ub ? '#ff9a2a' : '#ff3b30'; a.tintA = .5; a.tintTill = W.t + .28; this.teleAt = W.t; this.teleUb = ub;
      emit('telegraph', this, { move: this.atk ? this.atk.name : c, clip: c, unblockable: ub }); }
    else if (n === 'e:strike' || n === 'e:slam') { this.strikes++; if (n === 'e:slam') slamFx(this, H); this.strike(H, c); }
    else if (n === 'e:loose') shoot(this, 'arrow', 1);
    else if (n === 'e:throw') shoot(this, 'star', 3);
    else if (n === 'e:smoke') { puff(a.x, a.z, 14); this.st = 'hidden'; this.hiddenTill = W.t + this.T.vanish.hide; a.alpha = 0; emit('vanish', this); }
    else if (n === 'e:appear') emit('appear', this);
    else if (n === 'e:phase') phaseFx(this);
  }
  // a blow: does it cover the hero (and, for a heavy's, his own side)?
  strike(H, clip) {
    const a = this.a, hero = CTX.hero; emit('swing', this, { clip, move: this.atk ? this.atk.name : clip });
    if (hero && covers(a, H, hero.a.x, hero.a.z, 5)) { const r = hurtHero(this, H, clip); if (r === 'dodged') emit('whiff', this, { clip }); }
    if (H.ff) for (const e of CTX.enemies) if (e !== this && e.targetable && covers(a, H, e.a.x, e.a.z, e.r / AF)) e.takeHit({ w: 1, dmg: 1, from: hOf(e.a.x - a.x, e.a.z - a.z), src: this.kind });
  }

  // ---- a blow taken: dodged, parried, blocked, broken through, armoured through, a hit, a stagger, a death
  // returns 'dodged' | 'parried' | 'blocked' | 'broken' | 'armor' | 'hit' | 'kill' | false
  takeHit(o) {
    const a = this.a, T = this.T, t = W.t; if (!this.targetable || this.st === 'phase') return false;
    if (this.st === 'dodge' && t < this.dodgeTill) { emit('dodged', this); return 'dodged'; }
    const facing = Math.abs(wrapA(a.h - (o.from + Math.PI))) < 1.4; this.hitAt = t; a.hitAt = t;
    if (this.st === 'parry' && facing && t <= this.parryTill) { emit('parry', this);
      this.st = 'attack'; this.atk = { name: 'riposte', m: { seq: ['e_parry', 'e_riposte'], cd: 1, pool: 'melee' }, i: 0, target: CTX.hero, rec: 0 }; this.playSeq(); return 'parried'; }
    if ((this.st === 'block' || this.st === 'parry') && facing) { this.blocks++;
      if (o.w >= 2 || --this.guardHits <= 0) { this.guardHits = T.guard ? T.guard.hits : 0; this.brokenTill = t + 1; this.st = 'broken'; this.play('e_broken', { next: () => this.toReady() }); emit('break', this); return 'broken'; }
      this.play('e_blockHit', { next: () => { if (this.st === 'block' && W.t < this.blockTill) this.play('e_block', { blend: .05 }); else if (this.st === 'block') this.toReady(); } }); this.st = 'block';
      emit('block', this); return 'blocked'; }
    const dmg = (o.dmg ?? 1) * (this.st === 'broken' ? 1.5 : 1); this.hp -= dmg; this.hits++; this.poise -= o.w;
    this.morale -= (1 - T.brave) * .08; emit('hit', this, { dmg, by: o.src, hp: this.hp });
    a.h = a.ht = o.from + Math.PI; a.tint = null;
    if (this.hp <= 0) { this.die(); return 'kill'; }
    if (T.phases && this.phase + 1 < T.phases.length && this.hp / this.maxHp <= T.phases[this.phase + 1].at) {
      this.phase++; this.dropAttack(); this.st = 'phase'; a.flash = .05; this.play('e_phase', { next: () => this.toReady() }); emit('phase', this, { phase: this.phase + 1 }); return 'hit'; }
    if (T.armor && this.st === 'attack' && this.poise > 0) { a.flash = .034; emit('armor', this); return 'armor'; }
    const heavy = o.w >= 3 || this.poise <= 0; if (this.poise <= 0) this.poise = T.poise;
    a.flash = o.w > 1 ? .05 : .034; this.dropAttack(); this.st = 'hurt'; this.intent = null;
    this.play(heavy ? 'knock' : 'recoil', { rs: heavy ? .8 : o.w === 2 ? .8 : .55, next: () => this.toReady() }); return 'hit'; }
  die() { const a = this.a; this.dead = true; this.st = 'dead'; this.dropAttack(); this.intent = null; this.deaths++; this.diedAt = W.t; a.vt = 0; a.flash = .05;
    this.play('die'); emit('death', this); if (CTX.onDeath) CTX.onDeath(this); }

  // ---- one step at 60 Hz (the squad calls it, before the world steps): timers, tracking, the intent
  update(dt) {
    const a = this.a, T = this.T, t = W.t;
    if (a.tint && t > a.tintTill) a.tint = null;
    if (this.dead) { const s = t - this.diedAt; if (s > 2.2) a.alpha = Math.max(0, 1 - (s - 2.2) / .6); if (s > 2.9) this.gone = true; return; }
    if (this.st === 'hidden') { a.alpha = 0; a.vt = 0; return; }
    if (a.alpha < 1) a.alpha = Math.min(1, a.alpha + dt / .25);
    if (t - this.hitAt > 1.5) this.poise = Math.min(T.poise, this.poise + dt / 1.2);
    if (T.guard && t - this.hitAt > 3) this.guardHits = T.guard.hits;
    this.morale = Math.min(1, this.morale + dt * (this.st === 'flee' && CTX.hero && this.dist(CTX.hero) > 260 ? .12 : .01));
    const st = this.st;
    if (st === 'attack' && this.atk) { const at = this.atk, H = HITS[a.clip.name], ht = hitTimes(a.clip.name)[0];
      if (at.target && H && ht != null && a.ct < ht - (H.commit ?? .16)) a.ht = this.toward(at.target);
      if (H && ht != null && !at.glint && a.ct >= ht - .14 && a.ct < ht) { at.glint = t; emit('commit', this, { clip: a.clip.name }); }
      if (at.rec && t >= at.rec) this.toReady(.25); }
    else if (st === 'block') { if (this.foe) a.ht = this.toward(this.foe); if (t > this.blockTill && this.state === 'e_block') this.toReady(); }
    else if (st === 'parry') { if (this.foe) a.ht = this.toward(this.foe); if (t > this.parryTill) this.toReady(.1); }
    else if (st === 'ready' || st === 'flee') this.steer();
  }
  // the intent, step by step: run when far, stalk (facing what he watches) when near, hold when there
  steer() {
    const a = this.a, T = this.T, it = this.intent; let tx = a.x, tz = a.z, stop = 6, run = false;
    const face = it && it.face && !it.face.dead ? it.face : null;
    if (it) switch (it.kind) {
      case 'move': tx = it.x; tz = it.z; break;
      case 'approach': { const d = this.dist(it.to); if (d > it.dist) { tx = it.to.a.x; tz = it.to.a.z; stop = it.dist; } break; }
      case 'retreat': { const d = this.dist(it.from); if (d < it.dist) { const h = hOf(a.x - it.from.a.x, a.z - it.from.a.z); tx = a.x + Math.sin(h) * 40; tz = a.z + Math.cos(h) * 40; } break; }
      case 'strafe': { const h = hOf(a.x - it.around.a.x, a.z - it.around.a.z) + it.dir * .5, d = this.dist(it.around); tx = it.around.a.x + Math.sin(h) * d; tz = it.around.a.z + Math.cos(h) * d; break; }
      case 'flee': { const f = it.from.a, cs = [[ROOM.x0, ROOM.z0], [ROOM.x1, ROOM.z0], [ROOM.x0, ROOM.z1], [ROOM.x1, ROOM.z1]].map(([x, z]) => [x / AF + (x ? -40 : 40), z / AF + (z ? -40 : 40)]);
        const c = cs.reduce((b, c) => Math.hypot(c[0] - f.x, c[1] - f.z) > Math.hypot(b[0] - f.x, b[1] - f.z) ? c : b); tx = c[0]; tz = c[1]; stop = 20; run = true; break; }
    }
    const dx = tx - a.x, dz = tz - a.z, d = Math.hypot(dx, dz);
    if (d <= stop) { if (this.state !== 'e_guard') this.play('e_guard', { blend: .15 }); a.vt = 0; if (face) a.ht = this.toward(face); return; }
    run = run || it.run || (d > 150 && it.kind !== 'retreat');
    if (run) { if (this.state !== 'runArmed') this.play('runArmed', { blend: .08 }); a.ht = hOf(dx, dz); a.vt = T.run; }
    else { if (this.state !== 'e_stalk') this.play('e_stalk', { blend: .1 }); a.mh = hOf(dx, dz); a.ht = face ? this.toward(face) : a.mh; a.vt = T.stalk * Math.min(1, d / 30 + .3); }
  }
  // the weapon's mid and tip in the world (the trail; the glint at the commit); none for the bow
  weaponPts() { const o = this.a.out, b = o && o.pose.blade, R = REACH[this.T.weapon]; if (!b || !b.out || !R) return null;
    const d = [Math.cos(b.ang), Math.sin(b.ang)], cy = Math.cos(o.yaw), sy = Math.sin(o.yaw), s = this.look.rig ? this.look.rig.root.scale.x : 1;
    const pt = (f, u) => { _v.set(-1, u * AF, f * AF); _v.set(_v.x * cy + _v.z * sy, _v.y, -_v.x * sy + _v.z * cy).applyMatrix4(BODY_SHEAR).multiplyScalar(s); return [o.x * AF + _v.x, this.gy + _v.y, o.z * AF + _v.z]; };
    return { mid: pt(b.g[0] + d[0] * R[0], b.g[1] + d[1] * R[0]), tip: pt(b.g[0] + d[0] * R[1], b.g[1] + d[1] * R[1]) }; }
  bladeWorld() { return this.T.weapon === 'club' ? null : this.weaponPts(); }
  frame(hero) { const f = super.frame(hero); if (f) f.bow = this.state === 'e_draw' && this.a.ct > .3 && this.a.ct < 1.16 ? 1 : 0; return f; }
}
// does a blow (HITS row) cover the point (px, pz) of radius r, from actor a at its heading?
export function covers(a, H, px, pz, r) {
  const f = hv(a.h), dx = px - a.x, dz = pz - a.z;
  if (H.ring) return Math.hypot(px - (a.x + f[0] * H.ring[0]), pz - (a.z + f[1] * H.ring[0])) < H.ring[1] + r;
  if (H.arc) return Math.hypot(dx, dz) < H.reach + r && Math.abs(wrapA(hOf(dx, dz) - a.h)) < H.arc;
  if (H.fwd != null) return Math.hypot(px - (a.x + f[0] * H.fwd), pz - (a.z + f[1] * H.fwd)) < H.rad + r;
  return false;
}
