// ---- N, Mirror Meditation, and U, Sky Drop, on today's beats (player/mirror.js, player/update.js `sweep`):
//   N  he stands still, palms together, 1.4 s; mirror images of him (his own look, cyan, glitching) step out one by one
//      (.22 + .17 each), dash to the nearest samurai, cut him once with the page's J1 (its own hit beat), dissolve
//   U  the redesign (owner 2026-10-01): a 0.12 s crouch, a glitch blink up and forward leaving an afterimage, the storm
//      comes down into the blade at the top, the drop blade first trailing afterimages, the landing at 0.44 s: a crater
//      of cracks, flung stone, a ring of forked bolts, everyone in it thrown, the great black X over it shut 0.42 s later;
//      a kill gets the full-screen close-up (fx/cine.js). II widens the crater, III sends bolts up out of the cracks
import { W, STOP } from '../play/sim.js';
import { Actor, AF, hv, hOf } from '../anim/flow.js';
import { dust } from '../fx/fx.js';
import { shake } from '../gfx/view.js';
import { startCine } from '../fx/cine.js';
import { groundAt } from '../world/room.js';
import { tear, xArm, bolt, ring, spark, chip, residue, burstAt, cracks, pool, sliver, axes, v3, rr, TAU } from './fx3d.js';
import { strike } from './blade.js';
import { DROP } from './moves.js';
import { DMG } from './beats.js';

const once = (cur, k, c) => { if (!c || cur.done.has(k)) return false; cur.done.add(k); return true; };
const MS = .18, MD = .12, MC = .42, MF = .32;   // an image: step out, dash, cut, dissolve
const images = [];

export const MIRROR = { id: 'mirror', key: 'mirror',
  start(C) { const hero = C.hero; C.startCd('mirror'); hero.a.play('skMeditate'); hero.a.v = hero.a.vt = 0;
    const near = C.foes.filter(f => !f.dead).map(f => ({ f, r: Math.hypot(f.x - hero.x, f.z - hero.z) })).sort((a, b) => a.r - b.r);
    if (!near.length) for (let j = 0; j < 3; j++) near.push({ f: null, at: [hero.x + (j % 2 ? -1 : 1) * 34, hero.z + (j - 1) * 14], r: 0 });   // nobody standing: they cut the air round him
    const more = C.T('mirror', 'more'), n = Math.max(3 + more, Math.min(5 + more, near.filter(q => q.r < 200).length));
    C.powerCast(); C.SK.cur = { id: 'mirror', s: MIRROR, q: Array.from({ length: n }, (_, j) => near[j % near.length]), done: new Set(), clips: new Set(['skMeditate']) }; },
  step(C, cur, ct) { const a = C.hero.a; a.tint = '#6ff3e4'; a.tintA = Math.min(.28, ct * .6) * (.8 + .2 * Math.sin(ct * 20));   // a faint cyan aura while he meditates
    if (Math.random() < .3) { const p = C.chest(); spark(v3.add(p, [rr(-8, 8), rr(-10, 6), 0]), [0, rr(6, 14), 0], rr(.4, .7), .45); }
    cur.q.forEach((q, j) => { if (once(cur, 'm' + j, ct >= .22 + j * .17)) spawn(C, j, q); }); },
  // an image's J1 strikes (its clip's own 'hit' beat, routed here by skills.js): a crescent, a black slash, the hit
  hit(C, a) { const m = a.mirror; if (m.cut) return; m.cut = 1; const h = a.h, v = hv(h), p = [a.x * AF + v[0] * 5, 12, a.z * AF + v[1] * 5];
    strike(C, h, .15, false, false, { c: p, R: 16 }); m.white = .05;
    tear(t => [p[0] + v[0] * (1 + 18 * t), 18 - 10 * t, p[2] + v[1] * (1 + 18 * t)], 2, .22);
    if (m.f && Math.hypot(m.f.x - a.x * AF, m.f.z - a.z * AF) < 32) C.land('mi' + m.j, m.f, { stop: 'light', at: [a.x * AF, a.z * AF] });
    for (let k = 0; k < 4; k++) sliver([p[0] - v[0] * rr(4, 18), rr(4, 24), p[2] - v[1] * rr(4, 18)], 2 + (Math.random() * 4 | 0), rr(.06, .12), [v[0] * rr(10, 30), 0, v[1] * rr(10, 30)], k % 2 ? 1 : .7); },
};
function spawn(C, j, q) {
  const hero = C.hero, { r, f } = axes(hero.a.h), side = j % 2 ? -1 : 1, off = rr(13, 18), ox = hero.x + r[0] * side * off + f[0] * (j % 3 - 1) * 5, oz = hero.z + r[2] * side * off + f[2] * (j % 3 - 1) * 5;
  const a = new Actor(W, { x: hero.a.x, z: hero.a.z, h: hOf(ox - hero.x, oz - hero.z) }); a.play('run'); a.v = a.vt = 0; a.update(1 / 120); a.sample(true);
  const m = { j, f: q.f, at: q.at, a, t: 0, x0: hero.x, z0: hero.z, ox, oz, alpha: 0, glitch: .4, white: 0 }; a.mirror = m; W.actors.push(a);
  m.echo = C.echoes.image(() => { const o = a.out; if (!o || m.gone) return null; const fl = Math.random() < m.glitch * .25;
    return { pose: o.pose, x: o.x * AF, y: groundAt(o.x * AF, o.z * AF), z: o.z * AF, yaw: o.yaw, alpha: Math.max(0, Math.min(1, m.alpha * (fl ? .45 : 1))), flash: m.white > 0, tintA: fl ? .85 : .55 }; });
  images.push(m); if (images.length >= 3) C.mark('images'); residue([hero.x, 0, hero.z], 3); spark([hero.x, 14, hero.z], [0, 8, 0], .15, 1); C.log('mirror:image');
}
export function mirrorsStep(C, dt) {
  for (const m of images) { const t = (m.t += dt), a = m.a; m.white -= dt;
    const tx = m.f && !m.f.dead ? m.f.x : m.at ? m.at[0] : m.ox, tz = m.f && !m.f.dead ? m.f.z : m.at ? m.at[1] : m.oz;
    if (t < MS) { const k = 1 - (1 - t / MS) ** 2; a.x = (m.x0 + (m.ox - m.x0) * k) / AF; a.z = (m.z0 + (m.oz - m.z0) * k) / AF; a.v = 110; m.alpha = Math.min(1, t / MS * 1.4); }
    else if (t < MS + MD) { if (!m.dash) { m.dash = 1; const h = C.snap8(hOf(tx - m.ox, tz - m.oz)); a.h = a.ht = h; a.turnSnap = true; a.v = a.vt = 0; a.play('skDash');
        m.dx0 = a.x * AF; m.dz0 = a.z * AF; const v = hv(h), d = Math.hypot(tx - m.dx0, tz - m.dz0); m.tx = tx - v[0] * Math.min(15, d); m.tz = tz - v[1] * Math.min(15, d); residue([m.dx0, 0, m.dz0], 3); }
      const k = ((t - MS) / MD) ** 2, px = a.x * AF, pz = a.z * AF; a.x = (m.dx0 + (m.tx - m.dx0) * k) / AF; a.z = (m.dz0 + (m.tz - m.dz0) * k) / AF; m.glitch = 1.5;
      const n = Math.hypot(a.x * AF - px, a.z * AF - pz) | 0; for (let i = 0; i < n; i += 3) spark([px + (a.x * AF - px) * i / n, rr(4, 22), pz + (a.z * AF - pz) * i / n], [0, 0, 0], rr(.08, .16), i % 2 ? .45 : .7); }
    else if (t < MS + MD + MC) { if (!m.cutting) { m.cutting = 1; a.play('J1'); m.glitch = .4; } }
    else { const k = (t - MS - MD - MC) / MF; m.alpha = 1 - k; m.glitch = .6 + 3 * k;
      if (!m.fade) { m.fade = 1; for (let i = 0; i < 12; i++) sliver([a.x * AF + rr(-8, 8), rr(2, 28), a.z * AF], 1 + (Math.random() * 4 | 0), rr(.4, .8), [rr(-6, 6), rr(2, 10), 0], [.45, .7, 1][i % 3]); } } }
  for (let i = images.length - 1; i >= 0; i--) { const m = images[i]; if (m.t > MS + MD + MC + MF) { m.gone = true; const k = W.actors.indexOf(m.a); if (k >= 0) W.actors.splice(k, 1); images.splice(i, 1); } }
}

// ---- U: Sky Drop
export const DROPS = { id: 'sweep', key: 'sweep',
  start(C, inp) { const hero = C.hero, aim = C.aim(inp.dir, 90); C.face(aim.h); C.startCd('sweep');
    // the crater lands on the samurai he aims at (20..70 ahead), else 54 ahead as today's
    const ahead = aim.tgt ? Math.max(20, Math.min(70, (aim.d - 12 - 10) / .8)) : 54;
    hero.a.play('skDrop'); C.SK.cur = { id: 'sweep', s: DROPS, h: aim.h, ahead, aim, done: new Set(), struck: new Set(), clips: new Set(['skDrop']), armed: ct => ct > .12, inv: ct => ct > .12 && ct < DROP.land }; },
  step(C, cur, ct, dt) {
    const hero = C.hero, h = cur.h, v = hv(h), Wr = C.T('sweep', 'r'), x = hero.x, z = hero.z;
    if (once(cur, 'scrape', ct >= .07)) dust(W, hero.a.x, hero.a.z, 5, { spd: 24 });
    // the blink up and forward: an afterimage where he stood, slivers at both ends; a kill coming: the close-up
    if (once(cur, 'up', ct >= DROP.up)) { C.ghost(.45, .25, .8); residue([x, 0, z], 9); dust(W, hero.a.x, hero.a.z, 8, { spd: 30 }); C.shift(h, cur.ahead * .8); hero.trail.push({ t: W.t, gap: 1 });
      residue([hero.x, 44, hero.z], 6); C.log('sweep:blink');
      const cx = hero.x + v[0] * (12 + 8 + 2), cz = hero.z + v[1] * (12 + 8 + 2), t = cur.aim.tgt;
      if (t && !t.dead && t.hp <= DMG.sw * C.pw('dmg') && Math.hypot(t.x - cx, t.z - cz) <= 52 * Wr) { startCine(hero, t); C.log('sweep:cine'); } }
    // at the top the storm comes down out of the sky into the blade
    if (ct >= DROP.up && ct < DROP.drop) { C.shift(h, 8 * dt / (DROP.drop - DROP.up)); if (hero.a.pose && hero.a.pose.pel[1] > 60) C.mark('aloft'); const tip = hero.bladeWorld(); const tp = tip ? tip.tip : [hero.x, 70, hero.z];
      if (Math.random() < .2) bolt([tp[0] + rr(-10, 10), tp[1] + 70, tp[2] - rr(0, 20)], tp, rr(.05, .08), 2.4, Math.random() < .5 ? .6 : 1, { fork: true });
      if (Math.random() < .15) spark(tp, [rr(-30, 30), rr(-30, 30), rr(-20, 20)], .2, .7); }
    // the drop, blade first, trailing afterimages
    if (ct >= DROP.drop && ct < DROP.land) { C.shift(h, 25 * dt); if (once(cur, 'trail', true) || Math.random() < .12) C.ghost(0, .2, .55); }
    const cx = hero.x + v[0] * 12, cz = hero.z + v[1] * 12;
    if (once(cur, 'slam', ct >= DROP.land)) { C.log('sweep:slam'); C.powerCast(cx, cz); hero.a.flash = .05; W.hitstop(STOP.kill); shake(2.5, .35);
      const fl = [cx, .3, cz]; for (let i = 0; i < 12; i++) { const a = i / 12 * TAU + rr(-.2, .2), R = rr(42, 54) * Wr; bolt(fl, [cx + Math.cos(a) * R, .3, cz + Math.sin(a) * R], rr(.12, .2), 3.2, i % 2 ? 1 : .6, { fork: true }); }
      ring(fl, 6, 48 * Wr, .12, 1, { thick: 2 }); ring(fl, 4, 22, 2 / 60, 1); cracks(fl, 46 * Wr, 11); pool(fl, 40 * Wr, 30 * Wr, .7, .8);
      cur.X = [xArm([cx, 10, cz], 40 * Wr, 1, 5, .42), xArm([cx, 10, cz], 40 * Wr, -1, 5, .42)];   // the great black X over the crater, shut 0.42 s later
      for (let i = 0; i < 26; i++) { const a = rr(0, TAU), s = rr(40, 110); chip([cx + Math.cos(a) * 6, 1, cz + Math.sin(a) * 6], [Math.cos(a) * s, rr(40, 110), Math.sin(a) * s * .8], rr(.6, 1), { g: 260 }); }   // flung stone
      dust(W, cx / AF, cz / AF, 24, { spd: 60, life: .6 }); burstAt([cx, 4, cz], 18, [60, 140], .9);
      if (C.T('sweep', 'pillars')) for (let i = 0; i < 7; i++) { const a = i / 7 * TAU + rr(-.3, .3), R = rr(22, 40) * Wr, p = [cx + Math.cos(a) * R, 0, cz + Math.sin(a) * R];
        C.after(.05 + i * .035, () => { bolt(p, [p[0] + rr(-3, 3), rr(26, 38), p[2]], rr(.12, .18), 2.5, i % 2 ? 1 : .6, { fork: true }); spark(p, [0, 20, 0], .2, .6); }); } }
    if (ct >= DROP.land && ct < DROP.land + .1) for (const f of C.foes) if (!f.dead && !cur.struck.has(f) && Math.hypot(f.x - cx, f.z - cz) <= 52 * Wr) { cur.struck.add(f); C.land('sw', f, { w: 3, stop: 'kill', at: [cx, cz] }); }
    if (ct > DROP.land + .02 && ct < DROP.land + .36 && Math.random() < .25) { const a = rr(0, TAU), R = rr(8, 46) * Wr, p = [cx + Math.cos(a) * R, .3, cz + Math.sin(a) * R]; bolt(p, [p[0] + rr(-7, 7), .3, p[2] + rr(-4, 4)], rr(.06, .1), 2, Math.random() < .7 ? .45 : .7); }
    // as the X shuts, everyone in the crater comes apart in sparks and slivers
    if (once(cur, 'apart', ct >= DROP.land + .42)) for (const f of cur.struck) { residue([f.x, 0, f.z], 10); burstAt([f.x, 12, f.z], 14); }
  },
};
