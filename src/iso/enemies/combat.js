// ---- What the enemies' blows and the hero's cuts do when enemies are in the courtyard (play/rules.js's rules,
// carried to a crowd): the hero's cut lands on every enemy in front of the blade and in reach (and cuts arrows and
// shuriken out of the air), and the enemy decides how it is taken (enemy.takeHit: dodged, parried, blocked, broken,
// armoured, hurt, killed); an enemy's blow or shot hurts the hero unless he rolls through it. Hit-stop 3 / 5 / 8
// frames by weight, the white flash, sparks, the clash's focus lines, shake on heavy blows only.
import { W, STOP } from '../play/sim.js';
import { hOf, hv, wrapA, AF, rnd } from '../anim/flow.js';
import { sparks, dust, crack, tear, focus, ring } from '../fx/fx.js';
import { shake } from '../gfx/view.js';
import { CUT } from '../play/hero.js';
import { STATS } from '../play/rules.js';
import { SOLID, ROOM } from '../world/room.js';
import { CTX } from './ctx.js';
import { emit } from './events.js';

const DMG = { J1: 1, J2: 1, J3: 2, lunge: 1 }, REACH = 46;
export const ESTATS = { hits: 0, blocked: 0, parried: 0, broken: 0, armor: 0, dodged: 0, kills: 0, deflected: 0, taken: 0 };

// the hero's cut (W.on.hit while enemies are out)
export function heroCut(a) {
  const hero = CTX.hero; if (!hero || a !== hero.a) return; const name = a.clip.name, c = CUT[name]; if (!c) return; STATS.swings++;
  let hit = null, kill = false, n = 0, parried = null; const res = [];
  for (const e of CTX.enemies) { if (!e.targetable) continue; const dx = e.a.x - a.x, dz = e.a.z - a.z, d = Math.hypot(dx, dz), hd = hOf(dx, dz);
    if (d > REACH + (e.r - 4.5) / AF || Math.abs(wrapA(hd - a.h)) > 1.35) continue;
    const r = e.takeHit({ w: c.w, from: hd, dmg: DMG[name], src: name }); if (!r) continue; res.push(r); if (r in ESTATS) ESTATS[r]++;
    const fx = e.a.x - Math.sin(hd) * 4, fz = e.a.z - Math.cos(hd) * 4;
    if (r === 'parried') { parried = e; sparks(W, fx, 26, fz, 16, { dir: hd + Math.PI, spd: 150 }); ring(W, fx, fz, { r: 14, life: .25 }); }
    else if (r === 'blocked' || r === 'broken') { sparks(W, fx, 24, fz, r === 'broken' ? 14 : 8, { dir: hd + Math.PI, spd: 130 }); if (r === 'broken') ring(W, e.a.x, e.a.z, { r: 16, life: .3 }); }
    else if (r !== 'dodged') { n++; hit = hit || e; if (r === 'kill') { kill = true; ESTATS.kills++; ESTATS.hits++; } else if (r !== 'armor') ESTATS.hits++;
      sparks(W, fx, 22, fz, 5 + c.w * 2, { dir: hd, spd: 120 }); focus(W, fx, 22, fz);
      if (c.w >= 2 || r === 'kill') dust(W, e.a.x, e.a.z, 6 + c.w * 2, { spd: 30, dir: hd, spread: 2, life: .5 });
      if (name === 'J3' || r === 'kill') tear(W, e.a.x, 20, e.a.z, name === 'J3' ? Math.PI / 2 + .35 : .5, 26, 5); } }
  // shots in front of the blade are cut out of the air
  for (const s of CTX.shots) { const dx = s.x - a.x, dz = s.z - a.z; if (Math.hypot(dx, dz) < REACH && Math.abs(wrapA(hOf(dx, dz) - a.h)) < 1.35) { s.dead = 1; ESTATS.deflected++;
    sparks(W, s.x, s.y, s.z, 6, { spd: 90 }); emit('deflect', s.from, { shot: s.k }); STATS.log.push(`${s.k}:cut`); } }
  if (parried) { STATS.log.push(`${name}:parried`); hero.a.flash = .05; hero.step = null; hero.a.play('recoil', { rs: .8 }); W.hitstop(STOP.heavy); shake(1, 3 / 60); return; }
  if (n) { STATS.hits++; hero.hits++; STATS.log.push(`${name}:hit`); W.hitstop(kill ? STOP.kill : c.w > 1 ? STOP.heavy : STOP.light);
    if (kill) shake(1.5, 4 / 60); else if (c.w > 1) shake(1, 2 / 60); return; }
  if (res.length && res.every(r => r === 'dodged')) { STATS.log.push(`${name}:dodged`); return; }
  if (res.length) { STATS.log.push(`${name}:${res.includes('broken') ? 'broke' : 'blocked'}`); W.hitstop(res.includes('broken') ? STOP.heavy : STOP.light); return; }
  STATS.log.push(`${name}:miss`);
}

// an enemy's blow or shot on the hero: 'dodged' through the roll's i-frames, false inside his short grace, else 'hit'
export function hurtHero(e, H, what) {
  const hero = CTX.hero; if (hero.iframes) { ESTATS.dodged++; return 'dodged'; }
  if (W.t - (hero.hurtAt ?? -9) < .3) return false;
  const a = hero.a, heavy = (H.w ?? 1) >= 2; hero.hurtAt = W.t; hero.taken++; ESTATS.taken++; CTX.heroHp -= H.dmg ?? 1; hero.step = null;
  a.flash = .034; a.h = a.ht = hOf(e.a.x - a.x, e.a.z - a.z); a.turnSnap = true; a.hitAt = W.t;
  a.play(heavy ? 'knock' : 'recoil', { rs: heavy ? .7 : .55 }); W.hitstop(heavy ? STOP.heavy : STOP.light); if (heavy) shake(1, 2 / 60);
  sparks(W, a.x, 22, a.z, 8, { dir: e.a.h }); focus(W, a.x, 22, a.z);
  STATS.log.push(`${e.kind}:hit`); emit('hurt-hero', e, { what, dmg: H.dmg ?? 1, heroHp: CTX.heroHp });
  if (CTX.heroHp <= 0) { CTX.heroHp = CTX.heroMax; CTX.downs++; a.play('knock'); emit('hero-down', null); }
  return 'hit';
}

// ---- shots: arrows (straight and fast, along his aim) and shuriken (three in a fan), in rig px like the actors
export function shoot(e, k, n) {
  const a = e.a, spd = k === 'arrow' ? 560 : 400;
  for (let i = 0; i < n; i++) { const h = a.h + (i - (n - 1) / 2) * .2, v = hv(h);
    CTX.shots.push({ k, from: e, x: a.x + v[0] * 10, z: a.z + v[1] * 10, y: k === 'arrow' ? 36 : 30, vx: v[0] * spd, vz: v[1] * spd, h, age: 0, life: 1.6 }); }
  emit('shoot', e, { shot: k, n });
}
const inSolid = (x, z) => { const wx = x * AF, wz = z * AF; if (wx < ROOM.x0 || wx > ROOM.x1 || wz < ROOM.z0 || wz > ROOM.z1) return true;
  for (const b of SOLID) if (wx > b.x0 && wx < b.x1 && wz > b.z0 && wz < b.z1) return true; return false; };
export function stepShots(dt) {
  const hero = CTX.hero;
  for (const s of CTX.shots) { if (s.dead) continue; s.age += dt; s.x += s.vx * dt; s.z += s.vz * dt;
    if (s.age > s.life || inSolid(s.x, s.z)) { s.dead = 1; dust(W, s.x, s.z, 2, { spd: 10, life: .3 }); continue; }
    if (hero && Math.hypot(hero.a.x - s.x, hero.a.z - s.z) < 9) { const r = hurtHero(s.from, { w: 1, dmg: 1 }, s.k); if (r === 'hit') s.dead = 1; else if (r === 'dodged') s.passed = 1; } }
  CTX.shots = CTX.shots.filter(s => !s.dead);
  for (const p of CTX.puffs) p.age += dt; CTX.puffs = CTX.puffs.filter(p => p.age < p.life);
}
// smoke: a few dithered grey balls that swell and thin out (the shinobi's vanish and return)
export function puff(x, z, n) { for (let i = 0; i < n; i++) { const a = rnd() * Math.PI * 2, r = rnd() * 10;
  CTX.puffs.push({ x: x + Math.cos(a) * r, z: z + Math.sin(a) * r * .7, y: 4 + rnd() * 22, r0: 4 + rnd() * 5, r1: 10 + rnd() * 9, age: -rnd() * .08, life: .7 + rnd() * .5 }); } }
// the kanabō's slam: a crack, a ring of dust, a shake the hero feels wherever he stands
export function slamFx(e, H) { const a = e.a, f = hv(a.h), x = a.x + f[0] * H.ring[0], z = a.z + f[1] * H.ring[0];
  crack(W, x, z); ring(W, x, z, { r: H.ring[1] * 1.1, life: .4 }); dust(W, x, z, 18, { spd: 60, life: .6, r: 10 }); shake(2, 6 / 60); emit('slam', e); }
// the boss's roar between phases: a ring, and the hero shoved back out of reach
export function phaseFx(e) { const a = e.a, hero = CTX.hero; ring(W, a.x, a.z, { r: 40, life: .5 }); dust(W, a.x, a.z, 16, { spd: 70, life: .6, r: 8 }); shake(1.5, 6 / 60);
  if (hero && !hero.iframes) { const d = Math.hypot(hero.a.x - a.x, hero.a.z - a.z); if (d < 90) { const h = hOf(hero.a.x - a.x, hero.a.z - a.z);
    hero.a.h = hero.a.ht = h + Math.PI; hero.a.turnSnap = true; hero.step = null; hero.a.play('recoil', { rs: 1.6 }); } } }
