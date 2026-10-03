// ---- The samurai: the same rig and the same flow moves, red lacquer. He keeps his guard facing you, walks in when you
// are far, and (unless the page was opened with &calm) telegraphs a falling cut when you stay close (he glows red,
// the page's fcut). Hits make him recoil (light) or knock him down to a knee (heavy); at no health he dies (the page's
// fall), lies a moment, dissolves, and stands up again at his post. With a squad (main.js `&foes=N`) they keep a step
// apart; `frozen` (Time Slice, skills/timeslice.js) holds one where he stands.
import { hOf, AF } from 'ronin-engine/flow/flow.js';
import { Char } from './char.js';
import { PLAIN } from 'ronin-engine/persona/behave.js';

// the attacks he picks from (the counter's skills/moves.js adds the thrust)
export const ATTACKS = ['fcut'];
const ALL = [];

// bh: his personality's way of fighting (persona/behave.js: patience, how near he presses, giving ground, how a hit moves him); PLAIN as before
export class Foe extends Char {
  constructor(o, calm) { super({ ...o, foe: true }); this.spawn = [o.x, o.z]; this.maxHp = 5; this.hp = 5; this.dead = false; this.calm = calm;
    this.guardT = 0; this.hits = 0; this.frozen = false; ALL.push(this); this.deaths = 0; this.reacts = []; this.bh = PLAIN; this.backOff = 0; this.a.play('guard'); this.a.update(1 / 120); this.a.sample(true); }
  get state() { return this.a.clip.name; }
  control(hero, t, dt) {
    const a = this.a, n = this.state;
    if (this.dead) { const since = t - this.diedAt;
      if (since > 2.2) a.alpha = Math.max(0, 1 - (since - 2.2) / .5);
      if (since > 2.9) this.respawn(); return; }
    if (a.alpha < 1) a.alpha = Math.min(1, a.alpha + dt / .4);
    a.look = hero.a; if (a.tint && t > a.tintTill) a.tint = null;   // the telegraph's red glow
    for (const o of ALL) if (o !== this && !o.dead) { const ex = a.x - o.a.x, ez = a.z - o.a.z, e = Math.hypot(ex, ez); if (e > 1e-3 && e < 28) { a.x += ex / e * (28 - e) * dt * 4; a.z += ez / e * (28 - e) * dt * 4; } }   // a step apart (rig px)
    const dx = hero.a.x - a.x, dz = hero.a.z - a.z, d = Math.hypot(dx, dz);
    const B = this.bh;
    if (this.backOff > 0 && (n === 'guard' || n === 'runArmed')) {   // a careful one gives ground after a hit, then turns to face you again
      this.backOff -= dt; a.ht = hOf(-dx, -dz); a.vt = 50; if (n !== 'runArmed') a.play('runArmed', { blend: .1 }); if (this.backOff <= 0) { a.vt = 0; a.play('guard', { blend: .12 }); } return; }
    if (n === 'guard' || n === 'runArmed') {
      if (d > B.chase) { a.ht = hOf(dx, dz); a.vt = 55 * B.speed; if (n !== 'runArmed') a.play('runArmed', { blend: .08 }); }
      else if (n === 'runArmed' && d < B.hold) { a.vt = 0; a.play('guard', { blend: .1 }); }
      if (n === 'guard') { this.guardT += dt; if (!this.calm && d < B.reach && this.guardT > B.patience && !hero.iframes) { this.guardT = 0; a.ht = a.h = hOf(dx, dz); a.play(ATTACKS[Math.floor(Math.random() * ATTACKS.length)]); } }
    }
  }
  // a hit: w 1 light, 2 heavy, 3 finisher; `from` is the direction it came from
  react(w, from, dmg) {
    if (this.dead) return false; const a = this.a; this.hits++; this.guardT = 0;
    a.flash = w > 1 ? .05 : .034; a.h = a.ht = from + Math.PI; a.tint = null;
    this.hp -= dmg; this.reacts.push(this.hp <= 0 ? 'die' : w >= 3 ? 'knock' : 'recoil');
    if (this.hp <= 0) { this.dead = true; this.deaths++; this.diedAt = a.W.t; a.vt = 0; a.play('die'); return 'kill'; }
    a.play(w >= 3 ? 'knock' : 'recoil', { rs: (w >= 3 ? 1 : w === 2 ? .8 : .55) * this.bh.recoil }); if (this.bh.backOff && (this.hits * .618) % 1 < this.bh.backOff) this.backOff = .35 + .5 * this.bh.backOff; return true;
  }
  respawn() { const a = this.a; this.dead = false; this.hp = this.maxHp; a.x = this.spawn[0] / AF; a.z = this.spawn[1] / AF; a.alpha = 0;
    a.feet.N.lock = a.feet.F.lock = 0; a.prev = null; a.play('guard', { blend: 0 }); a.update(1 / 120); a.sample(true); }
}
