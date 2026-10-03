// ---- C: Breath of Qi (today's player/breath.js, the four approved takes) and the sit. Tap C: he sits, his back to the
// camera; any key gets him up. Hold C: Standing kata (three breaths, each a notch of Qi for a fifth of his health);
// with ↓: Seiza, the Qi shield (a dome that takes the samurai's cut while he kneels); by the tōrō (the courtyard's rest
// point, a shrine's stand-in): Lotus (one long breath, the whole meter into health); C during Storm Chain: Storm breath
// (the rest of the storm at once, a big heal, everyone near thrown off his feet). Letting go of C ends a breath early.
// The look by power: I a quiet trickle of motes, II stone lifting off the floor, III ribbons of light; nothing on the floor.
import { W } from 'ronin-engine/clock/world.js';
import { held, pending, consume } from 'ronin-engine/input/keys.js';
import { hOf } from 'ronin-engine/flow/flow.js';
import { shake, toScreen, CAM } from 'ronin-engine/render/gfx/view.js';
import { brush } from './ink.js';
import { ring, spark, mote, chip, bolt, flash, burstAt, rr, TAU } from './fx3d.js';
import { BT, HEAL, DOME, QI_RATE, REST } from './beats.js';

const HOLD = .2, NOTCH = 1 / 3 - 1e-6, TORO = [170, 150];   // s before a held C counts as a hold; the tōrō (world/room.js)
const CLIP = { kata: 'skKata', seiza: 'skSeiza', lotus: 'skLotus', sbreath: 'skStorm' };
const tier = C => C.SK.power - 1, kk = (t, a, b) => Math.max(0, Math.min(1, (t - a) / (b - a)));
const beat = (cur, k, c) => { if (!c || cur.done.has(k)) return false; cur.done.add(k); return true; };
const nearRest = C => Math.hypot(C.hero.x - TORO[0], C.hero.z - TORO[1]) < REST;
let clk = 0;

function heal(C, h) { C.SK.hp = Math.min(1, C.SK.hp + h); C.SK.heals++; }
function spend(C, n = NOTCH) { const SK = C.SK; SK.qiIdle = 0; if (SK.storm > 0) SK.storm = Math.max(1e-3, SK.storm - n * SK.stormMax); else SK.qi = Math.max(0, SK.qi - n - 1e-6); }
function start(C, take) { const hero = C.hero; hero.a.v = hero.a.vt = 0; hero.a.play(CLIP[take]); C.log(`breath:${take}`);
  C.SK.casts[take] = (C.SK.casts[take] || 0) + 1;
  C.SK.cur = { id: 'breath', take, s: BREATH, done: new Set(), clips: new Set([CLIP[take]]), lotusHp: 1 - C.SK.hp, lotusQi: C.SK.qi }; }
// not a notch of Qi: a grey puff at his chest and the slot blinks
function fizzle(C) { C.SK.deny.breath = .2; C.log('breath:fizzle'); const p = C.chest(); for (let i = 0; i < 5; i++) spark(p, [rr(-10, 10), rr(4, 12), rr(-4, 4)], .3, 0); }
function sit(C) { const hero = C.hero; hero.a.v = hero.a.vt = 0; hero.a.h = hero.a.ht = Math.PI; hero.a.turnSnap = true; hero.a.play('skSit'); C.log('sit');
  C.SK.cur = { id: 'sit', s: SIT, done: new Set(), clips: new Set(['skSit', 'skStand']) }; }
const SIT = { id: 'sit', tick(C, inp) { if (C.hero.state === 'skSit' && C.hero.a.ct > .3 && (inp.dir != null || inp.presses.length)) C.hero.a.play('skStand'); }, step() {} };

export const BREATH = { id: 'breath', key: 'breath',
  // runs every game step, before anything else takes a press: C pressed, held, let go
  wait(C, inp, free) {
    const SK = C.SK;
    if (SK.cWait == null && pending('breath') && free) { consume('breath', () => true);
      if (SK.storm > 0) { start(C, 'sbreath'); return true; }   // during the storm: Storm breath at once
      SK.cWait = 0; }
    if (SK.cWait == null) return false;
    if (!free) { SK.cWait = null; return false; }
    if (!held('breath')) { SK.cWait = null; sit(C); return true; }
    if ((SK.cWait += 1 / 60) < HOLD) return false;   // until it counts as a hold he goes on as he was
    SK.cWait = null; const take = nearRest(C) ? 'lotus' : held('down') ? 'seiza' : 'kata';
    if (SK.qi < NOTCH) { fizzle(C); return false; }
    start(C, take); return true;
  },
  tick(C, inp, cur) { const t = C.hero.a.ct, b = BT[cur.take], hold = held('breath');
    if (!hold && ((cur.take === 'kata' && t < 3.55) || (cur.take === 'seiza' && t < b.GET) || (cur.take === 'lotus' && t < b.DROP))) { C.hero.a.play('idle', { blend: .12 }); C.log('breath:let-go'); } },   // let go: straight back
  step(C, cur, T) {
    const SK = C.SK, k = tier(C), hero = C.hero, ch = C.chest(); SK.qiIdle = 0;
    if (cur.take === 'kata') { const b = BT.kata;
      for (let i = 0; i < 3; i++) { const t0 = b.B0 + i * b.BP, up = [hero.x, 32, hero.z];
        if (T >= t0 && T < t0 + .5 && Math.random() < .5) { for (let q = 0; q < QI_RATE[k] / 2; q++) { const a = rr(0, TAU), r = rr(10, 34); mote([hero.x + Math.cos(a) * r, 0, hero.z + Math.sin(a) * r * .6], up, rr(.4, .7), rr(-6, 6)); }   // in: Qi rises to his hands
          if (k >= 1 && Math.random() < .3) chipUp(C, k, 34, up); }
        if (T >= t0 + .55 && T < t0 + .85 && Math.random() < .5) mote(v3a(up, rr(-6, 6)), [hero.x, 10, hero.z], rr(.2, .35), 0, .7);   // out: sinking to the belly
        if (beat(cur, 'k' + i, T >= t0 + b.OUT)) { if (SK.qi < NOTCH && SK.storm <= 0) { hero.a.play('idle', { blend: .12 }); C.log('breath:spent'); return; } out(C, HEAL.kata); ring([hero.x, 10, hero.z], 1, 5, .25, 1); } } }
    else if (cur.take === 'seiza') { const b = BT.seiza; SK.shield = T >= b.UP && T < b.GET;
      let inb = false; for (let i = 0; i < 3; i++) { const t0 = b.B0 + i * b.BP; if (T >= t0 && T < t0 + b.OUT) inb = true;
        if (beat(cur, 's' + i, T >= t0 + b.OUT)) { if (SK.qi < NOTCH && SK.storm <= 0) continue; out(C, HEAL.seiza); ring(ch, 1, 6, .25, 1); cur.band = T; } }
      if (inb && Math.random() < .6) gather(k ? QI_RATE[k] / 4 : 1, ch, 18, 70); else if (T > b.UP && T < b.GET && Math.random() < .25) gather(1, ch, 20, 50, 1.4);
      if (beat(cur, 'fold', T >= b.GET - .05)) { const d = DOME[k]; for (let q = 0; q < 14 + k * 10; q++) { const a = rr(0, TAU); spark([hero.x + Math.cos(a) * d[0], rr(0, 4), hero.z + Math.sin(a) * d[0] * .8], [rr(-10, 10), rr(4, 20), 0], rr(.3, .5), [.45, .7, 1][q % 3]); } } }
    else if (cur.take === 'lotus') { const b = BT.lotus;
      if (T > b.ON && T < b.OFF) { const f = (1 / 120) / (b.OFF - b.ON); heal(C, cur.lotusHp * f); SK.qi = Math.max(0, SK.qi - cur.lotusQi * f);   // one long breath: health rises, the meter drains, smoothly
        if (Math.random() < .3) gather(1, ch, 20, 66); if (k >= 1 && Math.random() < .05 + k * .05) chipUp(C, 1, 30, ch); } }
    else if (cur.take === 'sbreath') { const b = BT.sbreath;
      if (T >= b.IN0 && T < b.IN1) for (let q = 0; q < QI_RATE[k] * .4; q++) if (Math.random() < .5) mote([CAM.px + rr(-240, 240), rr(0, 60), CAM.py + rr(-170, 170)], ch, rr(.3, .5), rr(-10, 10), .6);   // from the whole screen
      if (beat(cur, 'ex', T >= b.EX)) exhale(C, k); }
  },
  always(C, dt) { clk += dt; const c = C.SK.cur; if (!c || c.take !== 'seiza') C.SK.shield = false; },
  // the samurai's cut glances off the dome
  block(C, a) { const hero = C.hero; a.flash = .03; const p = [hero.x + (a.x * .5 - hero.x) * .5, 14, hero.z + (a.z * .5 - hero.z) * .5]; burstAt(p, 10, [40, 90]); ring(C.chest(), 6, 18, .2, 1); W.hitstop(3 / 60); },
  // behind him: the room darkening for Storm breath, the dome's far half, the far side of the ribbons and the lotus ring
  back(C, g) { layer(C, g, false); },
};
const v3a = (p, dx) => [p[0] + dx, p[1], p[2]];
// one out-breath: a notch spent, a heal, it counts as the breath landing
function out(C, h) { spend(C); heal(C, h); C.log('breath:out'); C.SK.landed.breath = (C.SK.landed.breath || 0) + 1; }
function gather(n, t, r0, r1, slow = 1) { for (let i = 0; i < n; i++) { const a = rr(0, TAU), r = rr(r0, r1); mote([t[0] + Math.cos(a) * r, t[1] + rr(-8, 14), t[2] + Math.sin(a) * r * .6], t, rr(.35, .7) * slow, rr(-14, 14)); } }
// stone lifting off the floor and dissolving into Qi on its way to him (power II and up)
function chipUp(C, n, r, to) { const hero = C.hero; for (let i = 0; i < n; i++) { const a = rr(0, TAU), d = rr(6, r); chip([hero.x + Math.cos(a) * d, .5, hero.z + Math.sin(a) * d * .6], [0, rr(8, 22), 0], rr(1, 1.5), { to, g: 14 }); } }
// Storm breath's out-breath: the rest of the storm at once, a big heal, and a shockwave that throws everyone near him
function exhale(C, k) {
  const SK = C.SK, hero = C.hero, ch = C.chest(); SK.storm = 0; SK.qi = 0; heal(C, HEAL.sbreath); C.log('breath:exhale'); SK.landed.breath = (SK.landed.breath || 0) + 1;
  hero.a.flash = .05; W.hitstop(.08); shake(1.6, .22); flash(.2, .1);
  ring(ch, 4, 8 + k * 3 + 30, .4, 1); ring(ch, 3, 7 + k * 2 + 22, .55, .6); if (k >= 1) ring(ch, 2, 30 + k * 6, .7, .45);
  if (k >= 2) for (let q = 0; q < 10; q++) { const a = q / 10 * TAU; bolt([hero.x + Math.cos(a) * 8, ch[1], hero.z + Math.sin(a) * 6], [hero.x + Math.cos(a) * 46, ch[1] + rr(-6, 6), hero.z + Math.sin(a) * 34], .2, 3, q % 2 ? 1 : .6); }
  burstAt(ch, 40 + k * 30, [80, 200], .4);
  const R = 60 + k * 18;   // thrown off their feet: the shockwave reaches further with power
  for (const f of C.foes) { if (f.dead) continue; const d = Math.hypot(f.x - hero.x, f.z - hero.z); if (d > R) continue; f.react(3, hOf(f.x - hero.x, f.z - hero.z), 0); C.log('sbreath:thrown'); }
}

// ---- the look round him, drawn on the effects layer in the active style: the dome, the ribbons, the lotus ring
export function breathDraw(C, g) { layer(C, g, true); }
function layer(C, g, front) {
  const cur = C.SK.cur; if (!cur || cur.id !== 'breath' || !cur.clips.has(C.hero.state)) return;
  const B = brush(g), T = B.q(C.hero.a.ct), k = tier(C), hero = C.hero, s = cur.take;
  const S3 = p => toScreen(p[0], p[1], p[2]), foot = S3([hero.x, 0, hero.z]), head = S3([hero.x, 30, hero.z]), z = 2 * CAM.zoom;
  const hidden = (x, y) => !front && Math.abs(x - foot[0]) < 10 * z && y > head[1] && y < foot[1] + 2;   // the far half is behind him: not over his body
  const dot = (p, heat, fade, sz) => { const [x, y] = S3(p); if (!hidden(x, y)) B.dot(x, y, heat, fade, sz); };
  if (s === 'sbreath' && !front) { const b = BT.sbreath, a = .32 * kk(T, b.IN0, b.IN1) * (1 - kk(T, b.EX, b.EX + .1)); B.screen('#060a0c', a); }
  if (s === 'seiza') { const b = BT.seiza, d = DOME[k], up = 1 - (1 - kk(T, .5, .95)) ** 2, down = kk(T, b.GET - .15, b.GET), al = kk(T, .5, .7) * (1 - down);
    const rx = d[0] * (1 - down * .6), ry = d[1] * up * (1 - down), band = cur.band != null ? kk(T, cur.band, cur.band + .4) : null, lats = Math.max(5, Math.round(ry / 5));
    if (al > 0) for (let i = 0; i <= lats; i++) { const q = i / lats * Math.PI / 2 * .96, y0 = Math.sin(q) * ry, r0 = Math.cos(q) * rx, n = Math.max(6, Math.round(r0 * 1.6));
      for (let j = 0; j < n; j++) { const a = j / n * TAU + clk * (i % 2 ? .5 : -.35), fr = Math.sin(a) > 0; if (fr !== front) continue;
        const lit = band != null && band < 1 && Math.abs(y0 / (ry || 1) - band) < .09; dot([hero.x + Math.cos(a) * r0, y0, hero.z + Math.sin(a) * r0 * .8], lit ? 1 : (i + j) % 5 ? .45 : .7, 1 - Math.min(1, al * (front ? .8 : .35) * (lit ? 1.4 : 1))); } }
    if (front && al > 0) for (let a = 0; a <= Math.PI; a += .7 / rx) dot([hero.x + Math.cos(a) * rx, 0, hero.z + Math.sin(a) * rx * .8], .7, 1 - al * .85);   // its rim on the floor in front
    for (let q = 0; q < d[2]; q++) { const ph = q * 2.399, a = clk * (.35 + (q % 5) * .07) + ph, fr = Math.sin(a) > 0; if (fr !== front || al <= 0) continue;   // Qi floating round it (II, III)
      const rad = rx * (.55 + .5 * ((q * .618) % 1)), hh = ry * (.15 + .8 * ((q * .381) % 1)) + Math.sin(clk * 1.3 + ph) * 3; dot([hero.x + Math.cos(a) * rad, hh, hero.z + Math.sin(a) * rad * .8], q % 4 ? .7 : 1, 1 - al); } }
  if (s === 'lotus') { const b = BT.lotus, a = kk(T, b.LIFT, 1.1) * (1 - kk(T, b.OFF, 3.5)), n = 16 + k * 8;   // the ring of Qi circling him
    for (let i = 0; i < n && a > 0; i++) { const q = clk * 2 + i / n * TAU, fr = Math.sin(q) > 0; if (fr !== front) continue; dot([hero.x + Math.cos(q) * 15, 9, hero.z + Math.sin(q) * 12], i % 3 ? .7 : 1, 1 - a * (fr ? 1 : .5), 2); } }
  if (s === 'kata' && front) { const b = BT.kata; let gl = 0; for (let i = 0; i < 3; i++) { const t0 = b.B0 + i * b.BP; gl = Math.max(gl, kk(T, t0 + .55, t0 + .85) * (1 - kk(T, t0 + .9, t0 + 1.2))); }
    if (gl > 0) { const [x, y] = S3([hero.x, 10, hero.z]); B.dot(x, y, 1, 1 - gl, 3); for (const [dx, dy] of [[2, 0], [-2, 0], [0, 2], [0, -2]]) B.dot(x + dx, y + dy, .7, 1 - gl, 2); } }   // the point of light at his belly
  if (s === 'sbreath' && front && T > BT.sbreath.IN1 && T < BT.sbreath.EX) { const [x, y] = S3([hero.x, 21, hero.z]); B.dot(x - 2, y, (clk * 30 | 0) % 2 ? 1 : .7, 0, 2); B.dot(x + 2, y, (clk * 30 | 0) % 2 ? 1 : .7, 0, 2); }   // the held beat: his eyes blaze
  if (k >= 2) { const o = { kata: { h: 40, a: kk(T, .5, .8) * (1 - kk(T, 3.4, 3.7)) }, seiza: { h: 44, r: 13, a: kk(T, .55, .8) * (1 - kk(T, 2.8, 2.95)) },
      lotus: { h: 34, r: 13, a: kk(T, .7, 1.1) * (1 - kk(T, 3.2, 3.5)) }, sbreath: { h: 38, r: 13, a: kk(T, BT.sbreath.IN0, BT.sbreath.IN0 + .3) * (1 - kk(T, BT.sbreath.EX, BT.sbreath.EX + .05)) } }[s];
    if (o.a > 0) for (let r = 0; r < 2; r++) for (let u = 0; u <= 1; u += 1 / 70) { const ang = clk * 4.2 + u * 10 + r * Math.PI, rad = (o.r || 11) - 4 * u, fr = Math.sin(ang) > 0; if (fr !== front) continue;   // two strands of light wound round him
      dot([hero.x + Math.cos(ang) * rad, u * o.h, hero.z + Math.sin(ang) * rad * .8], ((u * 56 + clk * 40) | 0) % 6 ? .55 : 1, 1 - Math.sin(u * Math.PI) * .85 * o.a * (fr ? 1 : .5)); } }
  B.done();
}
