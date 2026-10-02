// ---- The skills in the slice (owner request 2026-10-02: "Skills and their animation"): today's kit on the 3D
// skeleton (or the pixel drawing, through the look seam), with the same keys, timings and hit beats as today's game
// (src/player/), effects in 3D drawn the active style's way (fx3d.js, ink.js), cooldowns and the skill bar (hud.js).
//   I tap: glitch double slash · I hold: Thousand Cuts · O hold: Crescent Moon · P (hold to charge): Cross Rift
//   N: Mirror Meditation · U: Sky Drop · C tap: sit, hold: Breath of Qi (kata; with ↓ Seiza; by the tōrō Lotus;
//   in the storm: Storm breath) · Storm Chain: a passive, 8 s whenever landed hits fill the Qi meter.
// The hero's controller (play/hero.js) keeps idle, the run, the roll and J; while a skill plays it owns him, and hands
// him back in its cancel windows (a roll from `roll`, J or another skill from `any`, beats.js CANCEL) or as it ends.
// Nothing here is imported by today's game; main.js only calls makeSkills and the four hooks it returns.
import { W, STOP } from '../play/sim.js';
import { CUT } from '../play/hero.js';
import { consume, pending, held } from '../play/input.js';
import { hOf, hv, wrapA, AF } from '../anim/flow.js';
import { sparks, focus } from '../fx/fx.js';
import { shake, BODY_SHEAR } from '../gfx/view.js';
import * as THREE from 'three';
import { FX, fxStep, fxDraw, bolt, ring, spark, chip, ribbon, slit, residue, burstAt, rr, TAU } from './fx3d.js';
import { makeEchoes } from './echo.js';
import { CD, PW, TIERS, DMG, QI_GAIN, CANCEL } from './beats.js';
import { BLADE, moonsStep } from './blade.js';
import { MIRROR, DROPS, mirrorsStep } from './drop.js';
import { BREATH, breathDraw } from './breath.js';
import { drawHud } from './hud.js';
import './moves.js';

// the skills' state, read by the HUD and the check (window.__iso.skills); hp and qi are 0..1 as today's INV
export const SK = { power: 1, hp: .6, qi: 0, storm: 0, stormMax: 8, qiIdle: 0, shield: false, cWait: null, cur: null, cd: {}, cdMax: {}, deny: {}, pop: {},
  casts: {}, landed: {}, chains: 0, absorbed: 0, heals: 0, log: [], logN: 0, marks: new Set() };
export const T = (skill, k) => TIERS[skill][k][SK.power - 1], pw = k => PW[k][SK.power - 1];
const snap8 = h => Math.round(h / (Math.PI / 4)) * (Math.PI / 4);
const ORDER = [...BLADE, MIRROR, DROPS];   // whose press is looked at first (C is BREATH.wait's)
const timers = [];
const _v = new THREE.Vector3();

// the overlay's skills section: the power tier (I / II / III: every skill's version and the stats), and the keys
function panel(root) { const aside = root.querySelector('aside'); if (!aside) return; const d = document.createElement('div');
  d.innerHTML = `<h2>Skills</h2><label>Power <select id="o-power"><option value="1">I</option><option value="2">II</option><option value="3">III</option></select></label>
  <div class="keys"><div><kbd>I</kbd> double slash · hold: Thousand Cuts</div><div><kbd>O</kbd> hold: Crescent Moon</div><div><kbd>P</kbd> Cross Rift (hold to charge)</div>
  <div><kbd>N</kbd> Mirror Meditation</div><div><kbd>U</kbd> Sky Drop</div><div><kbd>C</kbd> sit · hold: Breath of Qi (with <kbd>↓</kbd> Seiza; by the tōrō Lotus; in the storm Storm breath)</div>
  <div>Storm Chain: landed hits fill Qi; full, 8 s of storm</div></div>`;
  aside.appendChild(d); const sel = d.querySelector('#o-power'); sel.value = String(SK.power); sel.onchange = e => { SK.power = +e.target.value; e.target.blur(); }; }

// foes: a function giving the samurai standing in the yard (main.js's squad of &foes, without the parked); the one foe by default
export function makeSkills({ hero, foe, foes: liveFoes = () => [foe], scene, look, Q, root }) {
  const echoes = makeEchoes(scene, look);
  SK.power = Math.max(1, Math.min(3, +(Q.get('power') || 1))); if (Q.has('qi')) SK.qi = +Q.get('qi'); if (Q.has('hp')) SK.hp = +Q.get('hp');
  const C = {
    hero, foe, get foes() { return liveFoes(); }, echoes, SK, T, pw, snap8,
    // world-time callbacks (frozen by a hit-stop like everything else): the rift's detonation .05 s after its click
    after(t, fn) { timers.push({ t, fn }); },
    log(s) { SK.log.push(s); SK.logN++; if (SK.log.length > 60) SK.log.shift(); },
    mark(k) { SK.marks.add(k); },   // a moment the check asks after (vanished, aloft, the images out), however briefly it lasted
    // a point on his body in the world, from his side pose (rig px [forward, up], lateral `lat` world units), as the trail does
    body(fu, lat = 0, who = hero) { const o = who.a.out; if (!o) return [who.x, 12, who.z]; const cy = Math.cos(o.yaw), sy = Math.sin(o.yaw);
      _v.set(lat, fu[1] * AF, fu[0] * AF); _v.set(_v.x * cy + _v.z * sy, _v.y, -_v.x * sy + _v.z * cy).applyMatrix4(BODY_SHEAR); return [o.x * AF + _v.x, who.gy + _v.y, o.z * AF + _v.z]; },
    chest(who = hero) { const p = who.a.out ? who.a.out.pose : null; return p ? C.body([p.pel[0] + Math.sin(p.lean) * 10, p.pel[1] + Math.cos(p.lean) * 10], 0, who) : [who.x, 14, who.z]; },
    // where a skill goes: the stick, else the way he faces; the nearest samurai within `reach` and 1.2 rad of it draws the aim onto him
    aim(dir, reach) { const a = hero.a; let h = dir ?? a.h, tgt = null, d = 1e9;
      for (const f of C.foes) { if (f.dead) continue; const dx = f.x - hero.x, dz = f.z - hero.z, dd = Math.hypot(dx, dz), hf = hOf(dx, dz);
        if (dd < reach && dd < d && (dir == null || Math.abs(wrapA(hf - h)) < 1.2)) { d = dd; tgt = f; if (dir == null || Math.abs(wrapA(hf - h)) < 1.2) h = hf; } }
      return { h: snap8(h), tgt, d: tgt ? d : null }; },
    face(h) { const a = hero.a; a.h = a.ht = h; a.turnSnap = true; a.v = a.vt = 0; },
    // move him `d` world units along heading h (walls and posts clamp it on the next step)
    shift(h, d) { const v = hv(h); hero.a.x += v[0] * d / AF; hero.a.z += v[1] * d / AF; },
    place(x, z) { hero.a.x = x / AF; hero.a.z = z / AF; hero.trail.push({ t: W.t, gap: 1 }); },
    ghost(hold, fade, a0) { const f = hero.frame(true); if (f) echoes.ghost(f, W.t, hold, fade, a0); },
    startCd(k, t = CD[k]) { t *= pw('cd'); SK.cd[k] = t; SK.cdMax[k] = t; },
    // a landed hit on a samurai: his reaction (w 1 light, 2 heavy, 3 thrown), damage by power, the hit-stop by weight,
    // sparks and focus lines out of him, Qi, or during the storm the chain. false if it did not land
    land(kind, f, o = {}) {
      if (!f || f.dead) return false; const from = o.from ?? hOf(f.x - (o.at ? o.at[0] : hero.x), f.z - (o.at ? o.at[1] : hero.z));
      const r = f.react(o.w ?? 1, from, (o.dmg ?? DMG[kind.replace(/\d+$/, '')] ?? 1) * pw('dmg')); if (!r) return false;
      const base = kind.replace(/\d+$/, ''); SK.landed[base] = (SK.landed[base] || 0) + 1; C.log(`${base}:hit`);
      const stop = r === 'kill' ? 'kill' : o.stop; if (stop) W.hitstop(STOP[stop] || stop);
      if (r === 'kill') shake(1.5, 4 / 60); else if (stop === 'heavy') shake(1, 2 / 60);
      const fx = f.a.x - Math.sin(from) * 4, fz = f.a.z - Math.cos(from) * 4; sparks(W, fx, 22, fz, 7, { dir: from, spd: 120 }); focus(W, fx, 22, fz); f.a.hitAt = W.t;
      onLanded(base, f); return r; },
    // the sheath-click payoff on one he cut (today's burst): white, a cut across him, slivers and a spray of streaks, one more blow
    burst(f, p = 1) { if (!f || f.dead) return; const c = [f.x, 14, f.z], v = hv(hero.a.h); f.react(1, hOf(f.x - hero.x, f.z - hero.z), DMG.burst * p * pw('dmg'));
      slit([c[0] - v[1] * 16 * p, 14, c[2] + v[0] * 16 * p * .4], [c[0] + v[1] * 16 * p, 14, c[2] - v[0] * 16 * p * .4], .14); residue(c, 10 * p | 0); burstAt(c, 16 * p | 0, [80 * p, 160 * p]);
      f.a.hitAt = W.t; C.log('burst:hit'); },
    qiAdd, powerCast,
  };
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
  const hit0 = W.on.hit, strike0 = W.on.strike;
  W.on.hit = (a, w) => { if (a.mirror) return MIRROR.hit(C, a); const L = C.foes, n = L.map(f => f.hits); hit0(a, w); L.forEach((f, i) => { if (f.hits > n[i]) onLanded('slash', f); }); };
  W.on.strike = (a, w) => { const v = hv(a.h), px = a.x + v[0] * 16, pz = a.z + v[1] * 16;
    if (SK.shield && Math.hypot(hero.a.x - px, hero.a.z - pz) < 26) { SK.absorbed++; C.log('foe:blocked'); BREATH.block(C, a); return; }
    const t0 = hero.taken; strike0(a, w); if (hero.taken > t0 && !SK.hpExt) SK.hp = Math.max(.05, SK.hp - .12); };   // hpExt: today's HUD (port.js) takes the hurt and bridges it here

  // a world step's worth of the skills (they run inside the world's step, so a hit-stop holds them): the playing skill's
  // beats, the moons, the mirror images, the storm, timers, the effects
  const stepper = { update(dt) {
    const cur = SK.cur; if (cur && cur.clips.has(hero.state)) cur.s.step(C, cur, hero.a.ct, dt);
    for (const t of timers.splice(0)) if ((t.t -= dt) <= 0) t.fn(); else timers.push(t);
    moonsStep(C, dt); mirrorsStep(C, dt); BREATH.always(C, dt);
    if (SK.storm > 0) { SK.storm -= dt; SK.qi = Math.max(0, SK.storm / SK.stormMax); if (SK.storm <= 0) { SK.storm = SK.qi = 0; C.log('storm:off'); }
      if (Math.random() < dt * 8) { const p = C.chest(), a = rr(0, TAU), l = rr(5, 11); bolt([p[0] + rr(-4, 4), p[1] + rr(-8, 6), p[2]], [p[0] + Math.cos(a) * l, p[1] + Math.sin(a) * l, p[2] + rr(-3, 3)], rr(.05, .1), 1.5, Math.random() < .5 ? 1 : .6); } }
    else if ((SK.qiIdle += dt) > 3) SK.qi = Math.max(0, SK.qi - dt * .05);   // out of the fight it slowly ebbs
    fxStep(dt);
  }, sample() {} };
  W.actors.unshift(stepper);
  if (root) panel(root);

  // is he free to take a new command (today's canAttack, plus the cut's cancel window once its hit has passed)?
  function free() { const n = hero.state, ct = hero.a.ct, c = CUT[n];
    return n === 'idle' || n === 'guard' || n === 'run' || n === 'runArmed' || n === 'start' || n === 'sheathe' || (n === 'stop' && ct > .1) || (n === 'skid' && ct > .2)
      || (c && ct >= c.hit + .1) || (n === 'roll' && ct > .36) || (n === 'recoil' && ct > .3); }
  // the first remembered skill press that can start: one cooling down is refused (its slot blinks) and forgotten
  function tryStart(inp) {
    for (const s of ORDER) { if (!pending(s.key) || (s.when && !s.when(C))) continue;
      const k = s.cdKey || s.key; if (SK.cd[k] > 0) { consume(s.key, () => true); SK.deny[k] = .2; continue; }
      consume(s.key, () => true); if (SK.cur) end(SK.cur); SK.cur = null; s.start(C, inp); if (SK.cur) { SK.casts[s.id] = (SK.casts[s.id] || 0) + 1; C.log(`${s.id}:cast`); } return true; }
    return false; }
  function end(cur) { const a = hero.a; a.alpha = 1; a.tint = null; a.tintA = 0; SK.shield = false; if (cur.s.end) cur.s.end(C, cur); }

  return {
    // once a game step, before the hero's own controller: true while a skill owns him this step
    control(inp) {
      let cur = SK.cur; if (cur && !cur.clips.has(hero.state)) { end(cur); cur = SK.cur = null; }
      if (BREATH.wait(C, inp, free())) return true;   // C held: which breath (or a tap: the sit)
      if (cur) { if (cur.s.tick) cur.s.tick(C, inp, cur); if (SK.cur !== cur) return true;
        const cw = CANCEL[hero.state] || { roll: 9, any: 9 }, ct = hero.a.ct;
        if (ct >= cw.any) { if (tryStart(inp)) return true; return false; }
        if (ct >= cw.roll && pending('roll')) { end(cur); SK.cur = null; return false; }
        return true; }
      return free() && tryStart(inp);
    },
    // once a game step, hit-stops included: cooldowns run in real time, as today's
    tick(dt) { for (const k in SK.cd) if (SK.cd[k] > 0 && (SK.cd[k] -= dt) <= 0) { SK.cd[k] = 0; SK.pop[k] = .25; }
      for (const o of [SK.pop, SK.deny]) for (const k in o) o[k] = Math.max(0, o[k] - dt); },
    // each render: the echoes' looks, then the effects and the HUD on the effects layer
    render() { echoes.render(W.t); },
    draw(g, o = {}) { BREATH.back(C, g); fxDraw(g); breathDraw(C, g); echoes.stamp(g); if (!o.noHud) drawHud(g, C); },   // noHud: today's HUD (port.js) shows them
    setLook(kind) { echoes.setLook(kind); },
    get armed() { const c = SK.cur; return !!(c && c.armed && c.armed(hero.a.ct)); },
    get iframes() { const c = SK.cur; return !!(c && c.inv && c.inv(hero.a.ct)); },
    state() { return { cur: SK.cur ? SK.cur.id : null, clip: hero.state, ct: hero.a.ct, qi: SK.qi, hp: SK.hp, storm: SK.storm, power: SK.power, shield: SK.shield, cd: { ...SK.cd },
      casts: { ...SK.casts }, landed: { ...SK.landed }, chains: SK.chains, absorbed: SK.absorbed, heals: SK.heals, log: SK.log.slice(), n: SK.logN, images: echoes.busy, fx: FX.length, alpha: hero.a.alpha, pel: hero.a.pose ? hero.a.pose.pel[1] : 0, marks: [...SK.marks] }; },
  };
}
