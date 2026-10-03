// ---- The skill system (from chud_the_anime's iso/skills/skills.js, owner request 2026-10-02: "Skills and their
// animation"): the hero's controller keeps idle, the run, the roll and J; while a skill plays it owns him, and hands him
// back in its cancel windows (a roll from `roll`, J or another skill from `any`, beats.CANCEL) or as it ends.
// The game hands in:
//   order   its skills, in the order their presses are looked at: { id, key, cdKey?, when?(C), start(C, inp), and
//           through SK.cur = { s, id, clips, armed?, inv? } its step(C, cur, ct, dt), tick?(C, inp, cur), end?(C, cur) }
//   beats   its numbers: CD (cooldowns), DMG (damage by kind), CANCEL (the cancel windows by clip)
//   SK      its state (cur, cd, cdMax, deny, pop, casts, landed, log, logN, marks, power, and its own), T and pw (power's numbers)
//   idle    the standing pose the echoes park in
//   hooks   its own: context(C) adds calls to C · onLanded(base, f, C) what a landed hit feeds · hit / strike(a, w, prev, C)
//           wrap the rules' · step(C, dt) its systems after the playing skill and the timers · wait(C, inp, free) a key
//           held before a skill starts · drawBack / drawFront(C, g) round the effects · hud(g, C) · panel(root) · state(C)
// Effects in 3D drawn the active style's way (fx3d.js, ink.js); echoes (echo.js) are the hero's own look.
import { W, STOP } from '../../clock/world.js';
import { CUT } from '../play/hero.js';
import { consume, pending, held } from '../../input/keys.js';
import { hOf, hv, wrapA, AF } from '../../flow/flow.js';
import { sparks, focus } from '../fx.js';
import { shake, BODY_SHEAR } from '../gfx/view.js';
import * as THREE from 'three';
import { FX, fxStep, fxDraw } from './fx3d.js';
import { makeEchoes } from './echo.js';

const snap8 = h => Math.round(h / (Math.PI / 4)) * (Math.PI / 4);
const _v = new THREE.Vector3();

export function makeSkillSystem({ hero, foe, foes: liveFoes = () => [foe], scene, look, idle, SK, T, pw, order: ORDER, beats: { CD, DMG, CANCEL }, hooks = {}, root }) {
  const echoes = makeEchoes(scene, look, idle), timers = [];
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
      if (hooks.onLanded) hooks.onLanded(base, f, C); return r; },
  };
  if (hooks.context) hooks.context(C);

  if (hooks.hit) { const hit0 = W.on.hit; W.on.hit = (a, w) => hooks.hit(a, w, hit0, C); }
  if (hooks.strike) { const strike0 = W.on.strike; W.on.strike = (a, w) => hooks.strike(a, w, strike0, C); }

  // a world step's worth of the skills (they run inside the world's step, so a hit-stop holds them): the playing skill's
  // beats, the moons, the mirror images, the storm, timers, the effects
  const stepper = { update(dt) {
    const cur = SK.cur; if (cur && cur.clips.has(hero.state)) cur.s.step(C, cur, hero.a.ct, dt);
    for (const t of timers.splice(0)) if ((t.t -= dt) <= 0) t.fn(); else timers.push(t);
    if (hooks.step) hooks.step(C, dt);   // the game's own (chud: the moons, the images, the breath, the storm)
    fxStep(dt);
  }, sample() {} };
  W.actors.unshift(stepper);
  if (root && hooks.panel) hooks.panel(root);

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
      if (hooks.wait && hooks.wait(C, inp, free())) return true;   // a key held before any skill starts (chud: C, which breath)
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
    draw(g, o = {}) { if (hooks.drawBack) hooks.drawBack(C, g); fxDraw(g); if (hooks.drawFront) hooks.drawFront(C, g); echoes.stamp(g); if (!o.noHud && hooks.hud) hooks.hud(g, C); },   // noHud: today's HUD (port.js) shows them
    setLook(kind) { echoes.setLook(kind); },
    get armed() { const c = SK.cur; return !!(c && c.armed && c.armed(hero.a.ct)); },
    get iframes() { const c = SK.cur; return !!(c && c.inv && c.inv(hero.a.ct)); },
    state() { return hooks.state ? hooks.state(C) : { cur: SK.cur ? SK.cur.id : null, clip: hero.state, ct: hero.a.ct, cd: { ...SK.cd }, casts: { ...SK.casts }, landed: { ...SK.landed }, log: SK.log.slice(), n: SK.logN }; },
  };
}
