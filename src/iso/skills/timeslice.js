// ---- X, Time Slice (design-notes "Skills, round two": approved; prototype 18): the ultimate, on a full Qi meter.
// He drops into the iai crouch and a zone opens round him (80 / 110 / 150 world units by power); the world drains of
// colour and stops. Everyone inside is taken, however many: he flickers from one to the next along the shortest path
// (nearest first), one cut each, a step of 0.016–0.06 s per enemy, so the pass takes as long as it needs and no
// longer. Then he is back where he started, kneeling, sliding the blade home; on the click colour snaps back and
// every cut fires at once: they fall (the close-up on the nearest). Those outside the zone flinch and hold.
import { W, STOP } from 'ronin-engine/clock/world.js';
import { STATS } from '../play/rules.js';
import { hOf, AF, EZ, clamp } from 'ronin-engine/flow/flow.js';
import { sparks, dust, focus, tear } from 'ronin-engine/render/fx.js';
import { shake } from 'ronin-engine/render/gfx/view.js';
import { MOMENT } from 'ronin-engine/render/gfx/post.js';
import { startCine } from '../fx/cine.js';
import { KIT, tv, T, startCd, castStart, landed, pop } from './kit.js';
import { scr, floorRing, streak, hairline } from './sfx.js';

const st = { phase: null, t0: 0, victims: [], order: [], i: 0, next: 0, start: null, cuts: [], streaks: [], frozen: [], R: 0 };
const zone = () => T('zone') * tv('slice', 'size') / AF;            // rig px
const cost = () => tv('slice', 'cost');
const inZone = (C, R) => C.foes.filter(f => !f.dead && Math.hypot(f.a.x - C.hero.a.x, f.a.z - C.hero.a.z) < R);
const reset = a => { a.feet.N.lock = a.feet.F.lock = 0; a.feet.N.off = a.feet.F.off = 0; a.prev = null; a.tick = 1; };   // a teleport: let go of the planted feet and the springs' last frame, show it at once

export const timeslice = {
  id: 'slice',
  get phase() { return st.phase; },
  owns() { return !!st.phase; },
  // why X is refused now ('' when it can go)
  gate(C) { if (KIT.qi < cost() - 1e-6) return 'NEEDS A FULL QI METER'; if (!inZone(C, zone()).length) return 'NO ONE IN THE ZONE'; return ''; },
  press(C) {
    const a = C.hero.a; st.R = zone(); st.start = { x: a.x, z: a.z, h: a.h }; st.cuts = []; st.streaks = [];
    a.vt = 0; a.v = 0; a.play('tsCrouch'); st.phase = 'crouch'; st.t0 = W.t; castStart('slice'); KIT.qi = Math.max(0, KIT.qi - cost());
    STATS.log.push('X:start'); return true;
  },
  step(C) {
    const hero = C.hero, a = hero.a;
    if (st.phase === 'crouch') { const t = W.t - st.t0; MOMENT.gray = EZ.s(clamp(t / .25, 0, 1));
      if (t >= .28) {   // time stops: every samurai holds where he is (out of the world's step; his last frame stays drawn)
        st.frozen = C.foes.filter(f => !f.dead); for (const f of st.frozen) { f.frozen = true; const i = W.actors.indexOf(f.a); if (i >= 0) W.actors.splice(i, 1); }
        st.victims = inZone(C, st.R);
        // the shortest path, nearest first; a second pass comes back the other way
        const left = st.victims.slice(), order = []; let px = a.x, pz = a.z;
        while (left.length) { left.sort((p, q) => Math.hypot(p.a.x - px, p.a.z - pz) - Math.hypot(q.a.x - px, q.a.z - pz)); const f = left.shift(); order.push(f); px = f.a.x; pz = f.a.z; }
        st.order = tv('slice', 'twice') ? order.concat(order.slice().reverse()) : order;
        st.per = clamp(.5 / st.order.length, .016, .06); st.i = 0; st.next = W.t; st.phase = 'pass'; STATS.log.push(`X:stop:${st.victims.length}`); } }
    if (st.phase === 'pass') {
      while (st.phase === 'pass' && W.t >= st.next - 1e-9) {
        if (st.i < st.order.length) { const f = st.order[st.i], from = [a.x, a.z], dx = f.a.x - a.x, dz = f.a.z - a.z, d = Math.hypot(dx, dz) || 1;
          a.x = f.a.x + dx / d * 20; a.z = f.a.z + dz / d * 20; a.h = a.ht = hOf(dx, dz); a.turnSnap = true; reset(a);
          a.play('tsCut', { k: st.i % 2, blend: 0 }); st.streaks.push({ a: from, b: [a.x, a.z], t: W.t });
          st.cuts.push({ f, ang: hOf(dx, dz) + Math.PI / 2 + (Math.random() - .5) * .8 }); sparks(W, f.a.x, 24, f.a.z, 3, { spd: 40, spread: 6 });
          st.i++; st.next += st.per; }
        else { const from = [a.x, a.z]; a.x = st.start.x; a.z = st.start.z; a.h = a.ht = st.start.h; a.turnSnap = true; reset(a);
          a.play('tsKneel', { blend: 0, next: x => { st.phase = null; x.play('idle'); } }); st.streaks.push({ a: from, b: [a.x, a.z], t: W.t }); st.phase = 'kneel'; } } }
    if (st.phase === 'kneel' && hero.state !== 'tsKneel') resume(C);   // cut short somehow: never leave the world stopped
    if (st.phase === 'end' && hero.state !== 'tsKneel') st.phase = null;
  },
  events: { click(C, a) { if (a === C.hero.a && st.phase === 'kneel') resume(C); } },
  draw(g, C) {
    if (!st.phase) return;
    const k = st.phase === 'crouch' ? EZ.o(clamp((W.t - st.t0) / .25, 0, 1)) : 1;
    floorRing(g, st.start.x, st.start.z, st.R * k, 0);
    for (const s of st.streaks) { const age = (W.t - s.t) / .35; if (age < 1) streak(g, scr(s.a[0], 0, s.a[1]), scr(s.b[0], 0, s.b[1]), age); }
    if (st.phase !== 'crouch') for (const c of st.cuts) hairline(g, scr(c.f.a.x, 26, c.f.a.z), c.ang, 9);
  },
};

// the click: colour snaps back, time runs, every cut fires at once
function resume(C) {
  const hero = C.hero; MOMENT.gray = 0;
  for (const f of st.frozen) { f.frozen = false; if (!W.actors.includes(f.a)) W.actors.push(f.a); }
  let first = null, n = 0;
  for (const f of st.victims) { if (f.dead) continue; const hd = hOf(f.a.x - st.start.x, f.a.z - st.start.z), r = f.react(3, hd, f.hp);   // minions: every cut is lethal
    if (r) { n++; STATS.hits++; if (r === 'kill' && (!first || Math.hypot(f.a.x - hero.a.x, f.a.z - hero.a.z) < Math.hypot(first.a.x - hero.a.x, first.a.z - hero.a.z))) first = f; }
    for (const c of st.cuts) if (c.f === f) tear(W, f.a.x, 24, f.a.z, c.ang, 30, 6);
    sparks(W, f.a.x, 24, f.a.z, 12, { spd: 140, spread: 6 }); focus(W, f.a.x, 24, f.a.z); dust(W, f.a.x, f.a.z, 8, { spd: 34, life: .5 }); f.a.hitAt = W.t; }
  for (const f of st.frozen) if (!st.victims.includes(f) && !f.dead) f.a.play('recoil', { rs: .3 });   // outside the zone: they flinch and hold
  if (n) { landed('slice'); W.hitstop(STOP.kill); shake(2, 6 / 60); pop('TIME SLICE', hero.a.x, hero.a.z, W.t); }
  if (first) startCine(hero, first);
  startCd('slice'); STATS.log.push(`X:click:${n}`); st.frozen = []; st.victims = []; st.cuts = []; if (st.phase === 'kneel') st.phase = 'end';
}
