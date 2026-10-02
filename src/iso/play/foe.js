// ---- The samurai: the same rig and the same flow moves, red lacquer. He keeps his guard facing you, walks in when you
// are far, and (unless the page was opened with &calm) telegraphs a falling cut when you stay close (he glows red,
// the page's fcut). Hits make him recoil (light) or knock him down to a knee (heavy); at no health he dies (the page's
// fall), lies a moment, dissolves, and stands up again at his post.
import { hOf, AF } from '../anim/flow.js';
import { Char } from './char.js';

export class Foe extends Char {
  constructor(o, calm) { super({ ...o, foe: true }); this.spawn = [o.x, o.z]; this.maxHp = 5; this.hp = 5; this.dead = false; this.calm = calm;
    this.guardT = 0; this.hits = 0; this.deaths = 0; this.reacts = []; this.a.play('guard'); this.a.update(1 / 120); this.a.sample(true); }
  get state() { return this.a.clip.name; }
  control(hero, t, dt) {
    const a = this.a, n = this.state;
    if (this.dead) { const since = t - this.diedAt;
      if (since > 2.2) a.alpha = Math.max(0, 1 - (since - 2.2) / .5);
      if (since > 2.9) this.respawn(); return; }
    if (a.alpha < 1) a.alpha = Math.min(1, a.alpha + dt / .4);
    a.look = hero.a; if (a.tint && t > a.tintTill) a.tint = null;   // the telegraph's red glow
    const dx = hero.a.x - a.x, dz = hero.a.z - a.z, d = Math.hypot(dx, dz);
    if (n === 'guard' || n === 'runArmed') {
      if (d > 100) { a.ht = hOf(dx, dz); a.vt = 55; if (n !== 'runArmed') a.play('runArmed', { blend: .08 }); }
      else if (n === 'runArmed' && d < 76) { a.vt = 0; a.play('guard', { blend: .1 }); }
      if (n === 'guard') { this.guardT += dt; if (!this.calm && d < 48 && this.guardT > 1.6 && !hero.iframes) { this.guardT = 0; a.ht = a.h = hOf(dx, dz); a.play('fcut'); } }
    }
  }
  // a hit: w 1 light, 2 heavy, 3 finisher; `from` is the direction it came from
  react(w, from, dmg) {
    if (this.dead) return false; const a = this.a; this.hits++; this.guardT = 0;
    a.flash = w > 1 ? .05 : .034; a.h = a.ht = from + Math.PI; a.tint = null;
    this.hp -= dmg; this.reacts.push(this.hp <= 0 ? 'die' : w >= 3 ? 'knock' : 'recoil');
    if (this.hp <= 0) { this.dead = true; this.deaths++; this.diedAt = a.W.t; a.vt = 0; a.play('die'); return 'kill'; }
    a.play(w >= 3 ? 'knock' : 'recoil', { rs: w >= 3 ? 1 : w === 2 ? .8 : .55 }); return true;
  }
  respawn() { const a = this.a; this.dead = false; this.hp = this.maxHp; a.x = this.spawn[0] / AF; a.z = this.spawn[1] / AF; a.alpha = 0;
    a.feet.N.lock = a.feet.F.lock = 0; a.prev = null; a.play('guard', { blend: 0 }); a.update(1 / 120); a.sample(true); }
}
