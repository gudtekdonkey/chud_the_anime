// ---- Q, Lightning Chain (design-notes "Skills, round two": approved; prototype 18), with Storm Chain's look (the
// game's chainFrom: a white forked bolt over a cyan one, leaping to the nearest enemy not yet struck, 0.07 s a link,
// the black slash through each). He draws his free hand back and throws it open at the nearest samurai: the chain
// leaps from his palm, hooks that one round the chest, and jumps on from him to the next and the next (3 / 4 / 5 by
// power), jolting each. Then he leans back and yanks: the first is torn off his feet and dragged across the floor
// straight onto the draw-cut. Nobody in reach: the bolt fizzles into the air and the key is back sooner.
import { W, STOP } from 'ronin-engine/clock/world.js';
import { STATS } from '../play/rules.js';
import { hOf, hv, EZ, clamp, lerp, wrapA } from 'ronin-engine/flow/flow.js';
import { sparks, dust, focus, tear, ring } from 'ronin-engine/render/fx.js';
import { shake } from 'ronin-engine/render/gfx/view.js';
import { startCine } from '../fx/cine.js';
import { tv, T, startCd, castStart, landed, qiAdd, pop } from './kit.js';
import { scr, jag, bolt } from './sfx.js';

const RANGE = 220, LEAP = 160, LIFE = .32;        // rig px: his reach for the first link (110 world units), each leap (80)
const OWN = new Set(['qCast', 'qCastA', 'qYank', 'qCut']);
const st = { phase: null, links: [], first: null, drags: [], fizzle: null, J: new Map() };
const handOf = a => { const v = hv(a.h); return [a.x + v[0] * 14, 30, a.z + v[1] * 14]; };
const chest = f => [f.a.x, 28, f.a.z];
const live = C => C.foes.filter(f => !f.dead && !f.frozen);

export const chain = {
  id: 'chain',
  get phase() { return st.phase; },
  owns(C) { return !!st.phase; },
  press(C) {
    const hero = C.hero, a = hero.a; let first = null, bd = RANGE * tv('chain', 'r');
    for (const f of live(C)) { const d = Math.hypot(f.a.x - a.x, f.a.z - a.z); if (d < bd) { bd = d; first = f; } }
    if (first) { a.h = a.ht = Math.round(hOf(first.a.x - a.x, first.a.z - a.z) / (Math.PI / 4)) * (Math.PI / 4); a.turnSnap = true; }
    a.vt = 0; a.v = 0; st.armed = hero.armed; st.first = first; st.links = []; st.drags = []; st.phase = 'cast'; st.fizzle = null;
    a.play(hero.armed ? 'qCastA' : 'qCast', { next: x => { if (!st.phase || st.phase === 'cast') { st.phase = null; x.play(x.co.armed ? 'guard' : 'idle'); } }, armed: hero.armed });
    castStart('chain'); STATS.log.push(first ? 'Q:cast' : 'Q:fizzle'); return true;
  },
  step(C) {
    const hero = C.hero;
    if (st.phase && !OWN.has(hero.state)) { st.phase = null; for (const d of st.drags) if (d.f.state === 'dragged') d.f.a.play('recoil', { rs: .5 }); st.drags = []; }
    // each link strikes on its beat
    for (const L of st.links) if (!L.hit && W.t >= L.at) { L.hit = true; const f = L.to; if (f.dead) continue;
      const from = L.fromF ? chest(L.fromF) : handOf(hero.a), hd = hOf(f.a.x - from[0], f.a.z - from[2]);
      const r = f.react(1, hd, 1); if (r) { STATS.hits++; landed('chain'); qiAdd(.05); STATS.log.push(`Q:link${r === 'kill' ? ':kill' : ''}`); }
      f.a.hitAt = W.t; tear(W, f.a.x, 26, f.a.z, (Math.random() - .5) * 2.4, 20, 4); ring(W, f.a.x, f.a.z, { r: 10, life: .32 });
      for (let i = 0; i < 9; i++) sparks(W, f.a.x, 28, f.a.z, 1, { dir: Math.random() * 6.28, spd: 110, spread: .5 });
      W.hitstop(STOP.light); }
    // all struck: the yank (if the first still stands), else he is done
    if (st.phase === 'hook' && st.links.every(L => L.hit) && W.t >= st.links[st.links.length - 1].at + .12) {
      if (st.first && !st.first.dead) { st.phase = 'yank'; hero.a.play('qYank', { next: x => x.play('qCut', { next: y => { st.phase = null; y.play('guard'); } }) }); }
      else { st.phase = null; hero.a.play(st.armed ? 'guard' : 'idle', { blend: .1 }); } }
    // dragged across the floor onto the blade, faster and faster
    for (const d of st.drags) { const f = d.f; if (f.dead || f.state !== 'dragged') continue; const u = clamp((W.t - d.t0) / .15, 0, 1), e = EZ.i2(u);
      const prev = [f.a.x, f.a.z]; f.a.x = lerp(d.from[0], d.to[0], e); f.a.z = lerp(d.from[1], d.to[1], e); f.a.h = f.a.ht = hOf(hero.a.x - f.a.x, hero.a.z - f.a.z);
      if (u < 1 && Math.random() < .6) dust(W, prev[0], prev[1], 1, { spd: 20, life: .35, up: 5 }); }
  },
  events: {
    cast(C, a) { if (a !== C.hero.a || st.phase !== 'cast') return; const hero = C.hero;
      if (!st.first || st.first.dead) { const v = hv(a.h), h = handOf(a); st.fizzle = { a: h, b: [h[0] + v[0] * 46, 40, h[2] + v[1] * 46], t0: W.t }; st.phase = null;
        startCd('chain', 1.5); pop('NO ONE IN REACH', a.x, a.z, W.t, '#8b9592'); return; }
      // the leaps: from his palm to the first, then on to the nearest not yet struck (Storm Chain's rule)
      const seen = new Set([st.first]), n = T('links') + tv('chain', 'hops'); let prev = st.first; st.links = [{ to: st.first, fromF: null, at: W.t + .02, hit: false }];
      for (let i = 1; i < n; i++) { let b = null, bd = LEAP * tv('chain', 'r');
        for (const f of live(C)) { if (seen.has(f)) continue; const d = Math.hypot(f.a.x - prev.a.x, f.a.z - prev.a.z); if (d < bd) { bd = d; b = f; } }
        if (!b) break; seen.add(b); st.links.push({ to: b, fromF: prev, at: W.t + .02 + i * .07, hit: false }); prev = b; }
      st.phase = 'hook'; startCd('chain'); shake(.5, 2 / 60); },
    yank(C, a) { if (a !== C.hero.a || st.phase !== 'yank') return; const hero = C.hero, v = hv(a.h);
      const who = tv('chain', 'haul') ? st.links.map(L => L.to).filter(f => !f.dead) : [st.first].filter(f => f && !f.dead);
      who.forEach((f, i) => { f.a.play('dragged'); f.a.vt = 0; f.a.v = 0; const side = i ? (i % 2 ? 1 : -1) * 14 * Math.ceil(i / 2) : 0;
        st.drags.push({ f, from: [f.a.x, f.a.z], to: [a.x + v[0] * (26 + i * 4) - v[1] * side, a.z + v[1] * (26 + i * 4) + v[0] * side], t0: W.t + .02 }); });
      if (st.first && st.first.hp <= Math.round(2 * tv('chain', 'dmg'))) startCine(hero, st.first);   // a yank onto a killing cut gets the close-up
      STATS.log.push('Q:yank'); },
    // the draw-cut meets them as they arrive
    qhit(C, a) { if (a !== C.hero.a) return; const dmg = Math.round(2 * tv('chain', 'dmg')); let any = false;
      for (const f of live(C)) { const dx = f.a.x - a.x, dz = f.a.z - a.z, d = Math.hypot(dx, dz), hd = hOf(dx, dz); if (d > 50 || Math.abs(wrapA(hd - a.h)) > 1.35) continue;
        const r = f.react(2, hd, dmg); if (!r) continue; any = true; const kill = r === 'kill'; STATS.hits++; C.hero.hits++;
        W.hitstop(kill ? STOP.kill : STOP.heavy); shake(kill ? 1.5 : 1, (kill ? 4 : 2) / 60);
        sparks(W, f.a.x - Math.sin(hd) * 4, 22, f.a.z - Math.cos(hd) * 4, 10, { dir: hd, spd: 130 }); focus(W, f.a.x, 22, f.a.z); f.a.hitAt = W.t;
        tear(W, f.a.x, 22, f.a.z, .45, 28, 5); dust(W, f.a.x, f.a.z, 8, { spd: 30, dir: hd, spread: 2, life: .5 }); STATS.log.push(`Q:cut${kill ? ':kill' : ''}`); }
      for (const d of st.drags) if (!d.f.dead && d.f.state === 'dragged') d.f.a.play('recoil', { rs: .5 }); st.drags = [];
      if (!any) STATS.log.push('Q:cut:miss'); },
  },
  draw(g, C) {
    const hero = C.hero, cut = (key, a, b, jit, fork) => { const k = key + ':' + (Math.floor(W.t * 30) >> 1); let j = st.J.get(key); if (!j || j.k !== k) { j = { k, J: jag(scr(...a), scr(...b), jit, fork) }; st.J.set(key, j); } return j.J; };
    for (const [i, L] of st.links.entries()) { const age = (W.t - L.at) / LIFE; if (age < 0 || age > 1) continue;
      const a = L.fromF ? chest(L.fromF) : handOf(hero.a), b = chest(L.to); bolt(g, cut('w' + i, a, b, 5, true), age); bolt(g, cut('c' + i, a, b, 3, false), age); }
    // the hooked chain: palm to chest while he holds it and yanks
    if ((st.phase === 'hook' || st.phase === 'yank') && st.first && !st.first.dead && hero.state !== 'qCut') bolt(g, cut('hook', handOf(hero.a), chest(st.first), 3, false), .3);
    if (st.fizzle) { const age = (W.t - st.fizzle.t0) / .25; if (age > 1) st.fizzle = null; else bolt(g, cut('fz', st.fizzle.a, st.fizzle.b, 6, true), age); }
  },
};
