// ---- What a move's events do to the world (af/demos.js hitRules, with the owner's weights): a hit lands on the
// samurai if he is in front of the blade and in reach; hit-stop 3 / 5 / 8 frames by weight, the white flash, sparks,
// dust and a small shake on heavy hits only; J3's finisher cuts the black slash. The samurai's strike lands on the hero
// unless he is rolling through it.
import { W, STOP } from './sim.js';
import { hOf, hv, wrapA, AF } from '../anim/flow.js';
import { sparks, dust, crack, tear, focus } from '../fx/fx.js';
import { shake } from '../gfx/view.js';
import { CUT } from './hero.js';

export const STATS = { hits: 0, swings: 0, log: [] };
const DMG = { J1: 1, J2: 1, J3: 2, lunge: 1 };

export function hitRules(game) {
  W.on.hit = a => {
    const hero = game.hero, foe = game.foe; if (a !== hero.a) return; const name = a.clip.name, c = CUT[name]; if (!c) return; STATS.swings++;
    const dx = foe.a.x - a.x, dz = foe.a.z - a.z, d = Math.hypot(dx, dz), hd = hOf(dx, dz);
    if (foe.dead || d > 46 || Math.abs(wrapA(hd - a.h)) > 1.35) { STATS.log.push(`${name}:miss`); return; }
    const r = foe.react(c.w, hd, DMG[name]); if (!r) return; STATS.hits++; hero.hits++; STATS.log.push(`${name}:hit`);
    const kill = r === 'kill', heavy = c.w > 1;
    W.hitstop(kill ? STOP.kill : heavy ? STOP.heavy : STOP.light);
    if (kill) shake(1.5, 4 / 60); else if (heavy) shake(1, 2 / 60);
    const fx = foe.a.x - Math.sin(hd) * 4, fz = foe.a.z - Math.cos(hd) * 4;
    sparks(W, fx, 22, fz, 5 + c.w * 2, { dir: hd, spd: 120 }); focus(W, fx, 22, fz); foe.a.hitAt = W.t;
    if (c.w >= 2 || kill) dust(W, foe.a.x, foe.a.z, 6 + c.w * 2, { spd: 30, dir: hd, spread: 2, life: .5 });
    if (name === 'J3' || kill) tear(W, foe.a.x, 20, foe.a.z, name === 'J3' ? Math.PI / 2 + .35 : .5, 26, 5);
  };
  W.on.impact = a => { if (a !== game.hero.a) return; const v = hv(a.h); crack(W, a.x + v[0] * 15, a.z + v[1] * 15); dust(W, a.x + v[0] * 15, a.z + v[1] * 15, 10, { spd: 34, life: .5 }); };
  W.on.click = a => { const v = hv(a.h); sparks(W, a.x + v[0] * 2, 17, a.z + v[1] * 2, 4, { spd: 30, spread: 6 }); };
  W.on.tele = a => { a.tint = '#ff3b30'; a.tintA = .45; a.tintTill = W.t + .26; };
  W.on.strike = a => { const hero = game.hero, v = hv(a.h), px = a.x + v[0] * 16, pz = a.z + v[1] * 16;
    dust(W, px, pz, 5, { spd: 24, life: .35 });
    if (hero.iframes) { STATS.log.push('foe:dodged'); return; }
    if (Math.hypot(hero.a.x - px, hero.a.z - pz) < 16) { hero.taken++; STATS.log.push('foe:hit'); hero.a.flash = .034; hero.a.h = hero.a.ht = hOf(a.x - hero.a.x, a.z - hero.a.z);
      hero.a.play('recoil', { rs: .55 }); W.hitstop(STOP.light); sparks(W, hero.a.x, 22, hero.a.z, 8, { dir: a.h }); focus(W, hero.a.x, 22, hero.a.z); hero.a.hitAt = W.t; } };
}
export { AF };
