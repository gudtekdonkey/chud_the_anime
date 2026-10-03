// ---- The skills in the slice (owner request 2026-10-02: "Skills and their animation"): today's kit on the 3D
// skeleton (or the pixel drawing, through the look seam), with the same keys, timings and hit beats as today's game
// (src/player/), effects in 3D drawn the active style's way (fx3d.js, ink.js), cooldowns and the skill bar (hud.js), on the engine's skill system (ronin-engine/iso/skills/system.js).
//   I tap: glitch double slash · I hold: Thousand Cuts · O hold: Crescent Moon · P (hold to charge): Cross Rift
//   N: Mirror Meditation · U: Sky Drop · C tap: sit, hold: Breath of Qi (kata; with ↓ Seiza; by the tōrō Lotus;
//   in the storm: Storm breath) · Storm Chain: a passive, 8 s whenever landed hits fill the Qi meter.
// The hero's controller (play/hero.js) keeps idle, the run, the roll and J; while a skill plays it owns him, and hands
// him back in its cancel windows (a roll from `roll`, J or another skill from `any`, beats.js CANCEL) or as it ends.
// Nothing here is imported by today's game; main.js only calls makeSkills and the four hooks it returns.
import { W } from 'ronin-engine/clock/world.js';
import { hOf, hv } from 'ronin-engine/flow/flow.js';
import { shake } from 'ronin-engine/iso/gfx/view.js';
import { FX, bolt, ring, spark, chip, ribbon, slit, residue, burstAt, rr, TAU } from 'ronin-engine/iso/skills/fx3d.js';
import { makeSkillSystem } from 'ronin-engine/iso/skills/system.js';
import { CD, PW, TIERS, DMG, QI_GAIN, CANCEL } from './beats.js';
import { BLADE, moonsStep } from './blade.js';
import { MIRROR, DROPS, mirrorsStep } from './drop.js';
import { BREATH, breathDraw } from './breath.js';
import { drawHud } from './hud.js';
import { IDLE0 } from './moves.js';

// the skills' state, read by the HUD and the check (window.__iso.skills); hp and qi are 0..1 as today's INV
export const SK = { power: 1, hp: .6, qi: 0, storm: 0, stormMax: 8, qiIdle: 0, shield: false, cWait: null, cur: null, cd: {}, cdMax: {}, deny: {}, pop: {},
  casts: {}, landed: {}, chains: 0, absorbed: 0, heals: 0, log: [], logN: 0, marks: new Set() };
export const T = (skill, k) => TIERS[skill][k][SK.power - 1], pw = k => PW[k][SK.power - 1];
const ORDER = [...BLADE, MIRROR, DROPS];   // whose press is looked at first (C is BREATH.wait's)

// the overlay's skills section: the power tier (I / II / III: every skill's version and the stats), and the keys
function panel(root) { const aside = root.querySelector('aside'); if (!aside) return; const d = document.createElement('div');
  d.innerHTML = `<h2>Skills</h2><label>Power <select id="o-power"><option value="1">I</option><option value="2">II</option><option value="3">III</option></select></label>
  <div class="keys"><div><kbd>I</kbd> double slash · hold: Thousand Cuts</div><div><kbd>O</kbd> hold: Crescent Moon</div><div><kbd>P</kbd> Cross Rift (hold to charge)</div>
  <div><kbd>N</kbd> Mirror Meditation</div><div><kbd>U</kbd> Sky Drop</div><div><kbd>C</kbd> sit · hold: Breath of Qi (with <kbd>↓</kbd> Seiza; by the tōrō Lotus; in the storm Storm breath)</div>
  <div>Storm Chain: landed hits fill Qi; full, 8 s of storm</div></div>`;
  aside.appendChild(d); const sel = d.querySelector('#o-power'); sel.value = String(SK.power); sel.onchange = e => { SK.power = +e.target.value; e.target.blur(); }; }

// foes: a function giving the samurai standing in the yard (main.js's squad of &foes, without the parked); the one foe by default
export function makeSkills({ hero, foe, foes: liveFoes = () => [foe], scene, look, Q, root }) {
  SK.power = Math.max(1, Math.min(3, +(Q.get('power') || 1))); if (Q.has('qi')) SK.qi = +Q.get('qi'); if (Q.has('hp')) SK.hp = +Q.get('hp');
  let C;   // the system's context (engine): its calls, and the ones added here
  // what landed hits feed: Qi, or during the storm the chain (today's player/qi.js)
  function onLanded(base, f) { if (SK.storm > 0) chainFrom(f); else qiAdd((QI_GAIN[base] || 0) * pw('qi')); }
  function qiAdd(v) { if (!v) return; SK.qiIdle = 0; SK.qi = Math.min(1, SK.qi + v); if (SK.qi >= 1 && SK.storm <= 0) stormOn(); }
  // Storm Chain wakes: 8 s (9, 10 with power) of storm, a ring and bolts thrown out round him
  function stormOn() { SK.storm = SK.stormMax = T('chain', 'storm'); SK.casts.storm = (SK.casts.storm || 0) + 1; C.log('storm:on'); powerCast(); hero.a.flash = .05; shake(1, 2 / 60);
    const c = [hero.x, 1, hero.z]; ring(c, 4, 16, .45, .7); ring([c[0], 12, c[2]], 2, 9, 2 / 60, 1);
    for (let i = 0; i < 8; i++) { const a = i / 8 * TAU + rr(-.2, .2), R = rr(18, 30); bolt([hero.x, 14, hero.z], [hero.x + Math.cos(a) * R, 14 + rr(-6, 6), hero.z + Math.sin(a) * R], rr(.12, .2), 2.5, i % 2 ? 1 : .6, { fork: true }); } }
  // from the struck samurai the lightning leaps to the nearest others not yet in the chain (3 / 4 / 5 links); the slice has
  // one samurai, so the storm also answers each hit with a bolt from the sky onto him (no damage: the hit already did that)
  function chainFrom(d0) { SK.chains++; C.log('chain'); const seen = new Set([d0]); let a = d0;
    ring([d0.x, 1, d0.z], 3, 10, .3, .6); const top = [d0.x + rr(-14, 14), 96, d0.z - rr(10, 30)];
    bolt(top, [d0.x, 16, d0.z], .28, 3.5, 1, { fork: true }); bolt(top, [d0.x, 16, d0.z], .28, 2, .5);
    for (let i = 0; i < 8; i++) { const an = rr(0, TAU); spark([d0.x, 16, d0.z], [Math.cos(an) * rr(40, 110), rr(10, 70), Math.sin(an) * rr(30, 80)], rr(.08, .16), [1, .7, .45][i % 3], 0, 2); }
    for (let hop = 0; hop < T('chain', 'hops'); hop++) { let b = null, best = 130;
      for (const d of C.foes) { const r = Math.hypot(d.x - a.x, d.z - a.z); if (!seen.has(d) && !d.dead && r < best) { best = r; b = d; } }
      if (!b) break; seen.add(b); const p0 = [a.x, 16, a.z], p1 = [b.x, 16, b.z];
      C.after(.02 + hop * .07, () => { bolt(p0, p1, .32, 3.5, 1, { fork: true }); bolt(p0, p1, .32, 2, .5); ring([b.x, 1, b.z], 3, 9, .32, .6); C.land('chain', b, { stop: null }); }); a = b; }
  }
  // the power tier's look (today's powerCast): II lifts stone off the floor round him, III adds ribbons of light
  function powerCast(x = hero.x, z = hero.z) { if (SK.power < 2) return;
    for (let i = 0; i < 14; i++) { const a = rr(0, TAU), R = rr(8, 26); chip([x + Math.cos(a) * R, .5, z + Math.sin(a) * R], [rr(-6, 6), rr(24, 50), rr(-4, 4)], rr(.5, .9), { g: 30 }); }
    if (SK.power < 3) return; for (let i = 0; i < 3; i++) ribbon([x, 0, z], i / 3 * TAU + rr(-.3, .3), rr(6, 8) * (i % 2 ? -1 : 1), rr(12, 17), .8, i === 1 ? 1 : .6);
  }

  // the samurai's cut and the J cuts, as rules.js lands them, with the skills' additions: the Seiza dome takes the cut;
  // a cut that lands costs him health; a J that lands feeds Qi (or the chain); a mirror image's cut is the image's
  return makeSkillSystem({ hero, foe, foes: liveFoes, scene, look, idle: IDLE0, SK, T, pw, order: ORDER, beats: { CD, DMG, CANCEL }, root, hooks: {
    context(c) { C = c; Object.assign(C, {
    // the sheath-click payoff on one he cut (today's burst): white, a cut across him, slivers and a spray of streaks, one more blow
    burst(f, p = 1) { if (!f || f.dead) return; const c = [f.x, 14, f.z], v = hv(hero.a.h); f.react(1, hOf(f.x - hero.x, f.z - hero.z), DMG.burst * p * pw('dmg'));
      slit([c[0] - v[1] * 16 * p, 14, c[2] + v[0] * 16 * p * .4], [c[0] + v[1] * 16 * p, 14, c[2] - v[0] * 16 * p * .4], .14); residue(c, 10 * p | 0); burstAt(c, 16 * p | 0, [80 * p, 160 * p]);
      f.a.hitAt = W.t; C.log('burst:hit'); },
      qiAdd, powerCast }); },
    onLanded: (base, f) => onLanded(base, f),
    hit(a, w, hit0) { if (a.mirror) return MIRROR.hit(C, a); const L = C.foes, n = L.map(f => f.hits); hit0(a, w); L.forEach((f, i) => { if (f.hits > n[i]) onLanded('slash', f); }); },
    strike(a, w, strike0) { const v = hv(a.h), px = a.x + v[0] * 16, pz = a.z + v[1] * 16;
    if (SK.shield && Math.hypot(hero.a.x - px, hero.a.z - pz) < 26) { SK.absorbed++; C.log('foe:blocked'); BREATH.block(C, a); return; }
    const t0 = hero.taken; strike0(a, w); if (hero.taken > t0 && !SK.hpExt) SK.hp = Math.max(.05, SK.hp - .12); },   // hpExt: today's HUD (port.js) takes the hurt and bridges it here
    // the moons, the mirror images, the breath, the storm (after the playing skill and the timers, before the effects)
    step(C, dt) {
    moonsStep(C, dt); mirrorsStep(C, dt); BREATH.always(C, dt);
    if (SK.storm > 0) { SK.storm -= dt; SK.qi = Math.max(0, SK.storm / SK.stormMax); if (SK.storm <= 0) { SK.storm = SK.qi = 0; C.log('storm:off'); }
      if (Math.random() < dt * 8) { const p = C.chest(), a = rr(0, TAU), l = rr(5, 11); bolt([p[0] + rr(-4, 4), p[1] + rr(-8, 6), p[2]], [p[0] + Math.cos(a) * l, p[1] + Math.sin(a) * l, p[2] + rr(-3, 3)], rr(.05, .1), 1.5, Math.random() < .5 ? 1 : .6); } }
    else if ((SK.qiIdle += dt) > 3) SK.qi = Math.max(0, SK.qi - dt * .05);   // out of the fight it slowly ebbs
    },
    wait: (C, inp, free) => BREATH.wait(C, inp, free),   // C held: which breath (or a tap: the sit)
    drawBack: (C, g) => BREATH.back(C, g), drawFront: (C, g) => breathDraw(C, g), hud: drawHud, panel,
    state: () => ({ cur: SK.cur ? SK.cur.id : null, clip: hero.state, ct: hero.a.ct, qi: SK.qi, hp: SK.hp, storm: SK.storm, power: SK.power, shield: SK.shield, cd: { ...SK.cd },
      casts: { ...SK.casts }, landed: { ...SK.landed }, chains: SK.chains, absorbed: SK.absorbed, heals: SK.heals, log: SK.log.slice(), n: SK.logN, images: C.echoes.busy, fx: FX.length, alpha: hero.a.alpha, pel: hero.a.pose ? hero.a.pose.pel[1] : 0, marks: [...SK.marks] }),
  } });
}
