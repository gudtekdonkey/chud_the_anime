// ---- A companion in the slice: a body (the flow actor and their look, party/ally-look.js), their kit from today's
// party (src/party/kit.js: the weapon, the traits, level and stats), health, and what that body can do when told:
// run to a point (round obstacles), fight a samurai from their role's place, follow in rank, hold. WHO decides is a
// brain: today's default below, or the squad AI's (claude/3d-squad-ai) through `brain` / `order` (docs/iso-slice.md).
// Cut to nothing they go down on a knee for 15 s; lifted (hold E beside them) they stand at a third; struck again
// while down, or left too long, they die for good (party.js buries them: their gear goes back in the bag).
import { Char } from '../play/char.js';
import { hOf, wrapA, hv, AF } from 'ronin-engine/flow/flow.js';
import { allyLook, BLADE_LEN } from './ally-look.js';
import { ROLES, stat } from '../../party/kit.js';
import { mix } from 'ronin-engine/traits/mix.js';
import { BASE } from 'ronin-engine/traits/knobs.js';
import { findPath } from '../input/path.js';
import { CTX } from '../ctx.js';

export const BLEED = 15, LIFT_HP = .35;   // seconds down before they die; the health a lift leaves them with
const BUSY = new Set(['J1', 'J2', 'J3', 'lunge', 'recoil', 'knock', 'fall', 'rise', 'expire', 'skid']);

export class Ally extends Char {
  constructor(c, { x, z, look = '3d', tone }) {
    super({ x, z, h: Math.PI, look });
    this.c = c; this.tone = tone; this.ally = true; this.look.dispose(); this.look = allyLook(look, { tone, weapon: c.kit.weapon });
    this.hp = 1; this.downT = 0; this.dead = false; this.cd = .5 + Math.random() * .4; this.cut = 0; this.calm = 0; this.hits = 0; this.slot = 0;
    this.order = null;      // the squad AI's standing order, kept until replaced: { kind: 'move', x, z } | { kind: 'attack', target } | { kind: 'hold' } | { kind: 'follow' }
    this.brain = null;      // or a function (ally, dt) => order, asked every step (it overrides `order`)
    this.path = null;
    // their traits, through today's trait mixer: how fast they run and how they carry themselves (the knobs a 2D rig bakes)
    const k = mix(c.traits || []); this.spd = k.run.speed / BASE.run.speed; this.leanOff = (k.run.lean - BASE.run.lean) * .5; this.bow = k.idle.bow || 0;
    this.a.turn = 9 * (.8 + .2 * this.spd); this.a.play('idle'); this.a.update(1 / 120); this.a.sample(true);
  }
  get state() { return this.a.clip.name; }
  get role() { return ROLES[this.c.kit.weapon] || ROLES.katana; }
  get standing() { return !this.dead && !this.downT; }
  get downed() { return this.downT > 0; }
  get iframes() { return false; }
  get reach() { return 21 + 6 * ((BLADE_LEN[this.c.kit.weapon] ?? 1) - 1); }   // world units: the hero's 23 (rules.js 46 rig px), longer weapons further
  get armed() { return BUSY.has(this.state) || this.state === 'guard' || this.state === 'runArmed'; }
  setLook(kind, scene) { this.look.dispose(); this.lookKind = kind; this.look = allyLook(kind, { tone: this.tone, weapon: this.c.kit.weapon }); this.look.mount(scene); }
  after(dt) { super.after(dt); const p = this.a.pose; if (p && this.standing) { p.lean += this.leanOff; p.head = (p.head || 0) + this.bow * .3; } }
  // the squad AI's verbs (each sets the standing order)
  moveTo(x, z) { this.order = { kind: 'move', x, z }; this.path = null; }
  attack(target) { this.order = { kind: 'attack', target }; }
  hold() { this.order = { kind: 'hold' }; }
  follow() { this.order = { kind: 'follow' }; }

  // one game step (1/60 s): the brain's order, carried out by the body
  control(dt, defaultBrain) {
    if (this.dead) return;
    this.cd -= dt;
    if (this.downT > 0) return;
    if (BUSY.has(this.state)) { this.a.vt = 0; return; }
    const o = (this.brain ? this.brain(this, dt) : this.order) || defaultBrain(this, dt);
    if (o.kind === 'attack' && o.target && !o.target.dead) this.fight(o.target, dt);
    else if (o.kind === 'move') { if (this.go(o.x, o.z, 3)) this.rest(dt); }
    else if (o.kind === 'follow' || (o.kind === 'attack')) { const [x, z] = this.slotXY(); if (this.go(x, z, 5, true)) this.rest(dt); }
    else this.rest(dt);
  }
  // run toward (x, z) round the walls (path.js), easing in; true once there
  go(x, z, near, follow = false) {
    const a = this.a, d = Math.hypot(x - this.x, z - this.z), moving = this.state === 'run' || this.state === 'runArmed' || this.state === 'start';
    if (d < near || (!moving && d < near * 2.2)) { this.path = null; return true; }   // (standing, a little more before they set off again)
    if (!this.path || Math.hypot(this.path.to[0] - x, this.path.to[1] - z) > 8) { const pts = findPath(this.x, this.z, x, z, this.r); this.path = { to: [x, z], pts: pts || [[x, z]] }; }
    let [px, pz] = this.path.pts[0]; if (Math.hypot(px - this.x, pz - this.z) < 4 && this.path.pts.length > 1) { this.path.pts.shift(); [px, pz] = this.path.pts[0]; }
    const hero = CTX.hero, top = 110 * this.spd * (follow && hero ? Math.max(.55, Math.min(1.15, d / 30)) : 1);
    a.ht = hOf(px - this.x, pz - this.z); a.vt = Math.min(top, d * 5 / AF); a.look = null; this.calm = 0;   // rig px a second (flow.js units)
    const clip = this.armed || this.state === 'runArmed' ? 'runArmed' : 'run';
    if (this.state !== clip && this.state !== 'start') { if (a.v < 40) { a.h = a.ht; a.turnSnap = true; } a.play(clip, { blend: .08 }); }
    return false;
  }
  // stand: the blade out in a fight, sheathed after 2 s of calm, as he does
  rest(dt) { const a = this.a, n = this.state; a.vt = 0; a.look = null;
    if (n === 'run') a.play('stop'); else if (n === 'runArmed') a.play('guard', { blend: .1 });
    if (n === 'guard') { this.calm += dt; if (this.calm > 2) { a.play('sheathe'); this.calm = 0; } } else this.calm = 0;
  }
  // their role's place against `f` (today's ROLES: a duelist beside you, the line between you and him, a flanker
  // round his far side, a breaker straight in), then a cut when the weapon's cooldown is back
  fight(f, dt) {
    const hero = CTX.hero, kind = this.role.kind, a = this.a, base = hOf(hero.x - f.x, hero.z - f.z);
    const ang = kind === 'flank' ? base + Math.PI + (this.slot % 2 ? .5 : -.5) : kind === 'line' ? base + (this.slot % 2 ? .35 : -.35) : kind === 'break' ? hOf(this.x - f.x, this.z - f.z) : base + (this.slot % 2 ? 1 : -1) * (.9 + .25 * this.slot);
    const r = this.reach * .8, sx = f.x + Math.sin(ang) * r, sz = f.z + Math.cos(ang) * r;
    if (Math.hypot(sx - this.x, sz - this.z) > 5 && Math.hypot(f.x - this.x, f.z - this.z) > r + 3) { this.go(sx, sz, 4); return; }
    a.vt = 0; a.look = f.a; this.calm = 0;
    if (this.state === 'runArmed' || this.state === 'run' || this.state === 'idle' || this.state === 'stop' || this.state === 'sheathe') a.play('guard', { blend: .1 });
    if (this.cd <= 0 && Math.hypot(f.x - this.x, f.z - this.z) < this.reach + 6) {
      const h = hOf(f.x - this.x, f.z - this.z); a.h = a.ht = h; a.turnSnap = true;
      const name = this.cut++ % 2 ? 'J2' : 'J1'; a.play(name, { next: x => x.play('guard') });
      this.cd = this.role.cd * (1 - .05 * stat(this.c, 'focus')) + .25;
    }
  }
  // the follow slot: ranks of six behind him, the first rank closest (today's rule)
  slotXY() { const hero = CTX.hero, n = Math.min(6, CTX.party ? CTX.party.standing().length : 3), row = Math.floor(this.slot / 6), col = this.slot % 6;
    const b = hv(hero.a.h), back = 22 + row * 16, side = (col - (Math.min(n, 6) - 1) / 2) * 18;   // a hat's width apart (its brim is 19 across)
    return [hero.x - b[0] * back + b[1] * side, hero.z - b[1] * back - b[0] * side]; }
  // a hit taken; returns 'down' or 'dead' when it ends them standing
  hurt(n, from) {
    if (this.dead) return null; const a = this.a; a.flash = .034;
    if (this.downT > 0) { this.die(); return 'dead'; }   // struck again while down
    this.hp = Math.max(0, this.hp - n * (1 - .05 * stat(this.c, 'vigor')));
    if (from != null) a.h = a.ht = from + Math.PI;
    if (this.hp <= 0) { this.downT = BLEED; a.vt = 0; a.play('fall'); this.order = this.order && this.order.kind === 'hold' ? this.order : null; return 'down'; }
    a.play('recoil', { rs: .55 }); return null;
  }
  lift() { if (!this.downT) return; this.downT = 0; this.hp = LIFT_HP; this.a.play('rise'); }
  die() { this.downT = 0; this.dead = true; this.hp = 0; this.diedAt = this.a.W.t; this.a.play('expire'); }
}
export { wrapA };
