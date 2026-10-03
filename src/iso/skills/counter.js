// ---- F, the counter (design-notes "Counters by attack" and "The counter window (agreed)"; prototype 23).
// Tap F: he drops into the counter stance (blade in the back of his hand, point down, lead shoulder to the enemy) for
// 0.6 s. A blow that lands within 0.2 s of the press is COUNTERED: one white frame, the blade knocked aside, and the
// answer that meets that attack (the falling cut → receive and flow, the thrust → along the blade), which cuts hard
// and, if it kills, gets the close-up. A press earlier than that is only a BLOCK: pushed back a step, no counter.
// The window shows the recommended way (indicator A): the tell's glint runs up the samurai's blade and reaches the
// point as the window opens; a star sits on the point while it is open. The closing ring (B) is the assist option.
import { W, STOP } from 'ronin-engine/clock/world.js';
import { STATS } from 'ronin-engine/iso/play/rules.js';
import { hOf, clamp, lerp } from 'ronin-engine/flow/flow.js';
import { sparks, dust, focus, tear } from 'ronin-engine/iso/fx.js';
import { shake, toScreen } from 'ronin-engine/iso/gfx/view.js';
import { startCine } from 'ronin-engine/iso/cine.js';
import { pending } from 'ronin-engine/input/keys.js';
import { ATTACKS } from 'ronin-engine/iso/play/foe.js';
import { ANSWER } from './reserved-moves.js';
import { KIT, tv, startCd, castStart, landed, qiAdd, pop } from './kit.js';
import { star, ringAt } from 'ronin-engine/iso/skills/sfx.js';

const OWN = new Set(['cStance', 'cBlock', 'cFlow', 'cAlong']);
const st = { phase: null, pressT: -9, foe: null, dmg: 3 };
const snap8 = h => Math.round(h / (Math.PI / 4)) * (Math.PI / 4);
export const WIN = .2;                                         // the agreed window
export const win = () => WIN + tv('counter', 'win');
const strikeT = clip => { const k = clip.keys && clip.keys.find(k => k.ev === 'strike'); return k ? k.t : .5; };
const face = (hero, foe) => { const a = hero.a, h = snap8(hOf(foe.a.x - a.x, foe.a.z - a.z)); a.h = a.ht = h; a.turnSnap = true; a.vt = 0; a.v = 0; };
const nearest = C => { let b = null, bd = 1e9; for (const f of C.foes) { if (f.dead || f.frozen) continue; const d = Math.hypot(f.a.x - C.hero.a.x, f.a.z - C.hero.a.z) - (ATTACKS.includes(f.state) ? 30 : 0); if (d < bd) { bd = d; b = f; } } return b; };

export const counter = {
  id: 'counter',
  get phase() { return st.phase; },
  owns(C) { return !!st.phase && !(st.phase === 'stance' && C.hero.a.ct > .1 && pending('roll')); },   // the roll still cancels the stance
  press(C) {
    const hero = C.hero, f = nearest(C); if (f) face(hero, f); else { hero.a.vt = 0; hero.a.v = 0; }
    st.phase = 'stance'; st.pressT = W.t; castStart('counter'); STATS.log.push('F:stance');
    hero.a.play('cStance', { next: x => { if (st.phase === 'stance') { st.phase = null; startCd('counter'); } x.play('guard'); } });
    return true;
  },
  step(C) { if (st.phase && !OWN.has(C.hero.state)) { if (st.phase === 'stance') startCd('counter'); st.phase = null; } },
  // a samurai's blow lands (rules.js W.on.strike, d: how far from him, rig px): countered, blocked, or not ours
  onStrike(C, a, d) {
    if (!st.phase || d > 26) return false;   // the stance reads a blow landing within a step of him (16 rig px is a hit)
    const hero = C.hero, foe = a.char;
    if (st.phase !== 'stance') { sparks(W, hero.a.x, 26, hero.a.z, 4, { spd: 60 }); return true; }   // mid-answer: his blade is already there
    const dt = W.t - st.pressT, atk = a.clip.name; face(hero, foe);
    if (dt <= win() + 1e-6) {   // ---- the counter
      st.phase = 'answer'; st.foe = foe; st.dmg = Math.round(3 * tv('counter', 'dmg'));
      hero.a.play(ANSWER[atk] || 'cFlow', { next: x => { st.phase = null; x.play('guard'); } });
      hero.a.flash = 1 / 60; W.hitstop(STOP.heavy); shake(1, 2 / 60);
      const mx = (hero.a.x + foe.a.x) / 2, mz = (hero.a.z + foe.a.z) / 2;
      sparks(W, mx, 28, mz, 12, { spd: 140, spread: 3 }); focus(W, mx, 26, mz); hero.a.hitAt = foe.a.hitAt = W.t;
      foe.a.play('recoil', { rs: .3 }); foe.guardT = 0;
      if (foe.hp <= st.dmg) startCine(hero, foe);   // a counter that kills gets the close-up
      KIT.cd.counter = 0; pop('COUNTER', hero.a.x, hero.a.z, W.t); STATS.log.push(`F:counter:${atk}`);
    } else {                    // ---- too early: only a block
      st.phase = 'block'; hero.a.play('cBlock', { next: x => { st.phase = null; startCd('counter'); x.play('guard'); } });
      W.hitstop(STOP.light); shake(.6, 2 / 60);
      const v = [Math.sin(hero.a.h), Math.cos(hero.a.h)];
      sparks(W, hero.a.x + v[0] * 8, 30, hero.a.z + v[1] * 8, 9, { dir: hero.a.h + Math.PI, spd: 90 }); dust(W, hero.a.x, hero.a.z, 5, { dir: hero.a.h + Math.PI, spd: 26 });
      const s = tv('counter', 'stag'); if (s >= 2) foe.a.play('knock'); else if (s >= 1) foe.a.play('recoil', { rs: .5 });
      pop('BLOCK', hero.a.x, hero.a.z, W.t, '#ffe9b0'); STATS.log.push('F:block');
    }
    return true;
  },
  events: {
    // the answer's cut lands
    chit(C, a) { if (a !== C.hero.a || st.phase !== 'answer') return; const foe = st.foe; if (!foe || foe.dead) return;
      const hd = hOf(foe.a.x - a.x, foe.a.z - a.z), r = foe.react(3, hd, st.dmg); if (!r) return; const kill = r === 'kill';
      landed('counter'); qiAdd(.2 + tv('counter', 'qi')); STATS.hits++; C.hero.hits++;
      W.hitstop(kill ? STOP.kill : STOP.heavy); shake(kill ? 1.5 : 1, (kill ? 4 : 2) / 60);
      sparks(W, foe.a.x - Math.sin(hd) * 4, 22, foe.a.z - Math.cos(hd) * 4, 10, { dir: hd, spd: 130 }); focus(W, foe.a.x, 22, foe.a.z); foe.a.hitAt = W.t;
      dust(W, foe.a.x, foe.a.z, 8, { spd: 30, dir: hd, spread: 2, life: .5 }); tear(W, foe.a.x, 22, foe.a.z, Math.PI / 2 + .55, 28, 5);
      STATS.log.push(`F:cut${kill ? ':kill' : ''}`); },
  },
  // indicator A on every samurai winding up a blow (and the closing ring if the assist is on)
  draw(g, C) {
    const w = win();
    for (const f of C.foes) { if (f.dead || !ATTACKS.includes(f.state)) continue;
      const S = strikeT(f.a.clip), ct = f.a.ct, b = f.bladeWorld(); if (!b || ct >= S) continue;
      const tip = toScreen(...b.tip), mid = toScreen(...b.mid), grip = [mid[0] + (mid[0] - tip[0]) * .9, mid[1] + (mid[1] - tip[1]) * .9];
      const t0 = S - w - .3, open = ct >= S - w;
      if (ct >= t0) { const k = clamp((ct - t0) / .3, 0, 1), q = .2 + .8 * k; star(g, lerp(grip[0], tip[0], q), lerp(grip[1], tip[1], q), open, W.t); }
      if (KIT.assist && ct >= S - w - .45 && !open) ringAt(g, tip[0], tip[1], 2 + 12 * (1 - clamp((ct - (S - w - .45)) / .45, 0, 1)));
    }
  },
};
