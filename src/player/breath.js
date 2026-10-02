import { COL } from '../config.js';
import { g } from '../screen.js';
import { P, S, INV } from '../state.js';
import { W, H } from '../config.js';
import { rr, ring, spark, dust, scrFlash } from '../fx/util.js';
import { zap } from '../fx/bolts.js';
import { qiFx } from '../fx/matter.js';
import { held } from '../input.js';
import { setState } from './actions.js';
import { BT } from '../anims/breath-poses.js';
import { heal } from '../items/inventory.js';
import { HURT_HOOKS } from '../items/harvest.js';
import { BIG } from '../items/big.js';
import { living } from '../world/enemies.js';
import { kick } from '../world/enemy-body.js';
import { known, castStart, landed, tv } from './mastery.js';

// ---- Breath of Qi (C): healing by meditation, the four approved takes (prototypes/18-skills-ideas.html) ----
// tap C: sit, as before (during Storm Chain: Storm breath) · hold C: Standing kata · hold C and down: Seiza, the shield · hold C at a shrine: Lotus
// Each out-breath spends a third of the meter (one notch) and heals; with no notch left the breath ends early.
export const BREATHS = new Set(['kata', 'seiza', 'lotus', 'sbreath']);
const HOLD = .2, NOTCH = 1 / 3 - 1e-6, REST = 48;   // s before a held C counts as a hold; px from a shrine that counts as a rest point
const HEAL = { kata: .2, seiza: .235, sbreath: .4 };
const QI_RATE = [2, 8, 16];                 // motes per beat by power: I is quiet on purpose
const DOME = [[17, 32, 0], [26, 40, 14], [46, 62, 40]];   // Seiza's dome by power: half-width, height, motes floating round it
const tier = () => INV.power - 1;
let clk = 0; const motes = [], chips = [];

// a held shield: nothing gets through the dome
HURT_HOOKS.push(() => P.shield === true);
const nearShrine = () => BIG.some(it => it.id === 'shrine' && Math.hypot(it.x - P.x, (it.y - P.y) * 1.4) < REST);

// C pressed with the blade free: during the storm it is Storm breath at once; otherwise wait to see if it is held
export function breathKey(inp) {
  if (!inp.sit || P.state === 'sit' || P.state === 'sitDown') return false;
  if (P.storm > 0 && known('breath')) { start('sbreath'); return true; }
  P.cWait = 0; return true;
}
// runs every step: a C still down after HOLD s picks the take; let go sooner and he sits
export function breathWait(dt, canAttack) {
  if (P.cWait == null) return false;
  if (!canAttack) { P.cWait = null; return false; }
  if (!held.has('sit')) { P.cWait = null; setState('sitDown'); return true; }
  if ((P.cWait += dt) < HOLD) return false;
  P.cWait = null;
  const take = nearShrine() ? 'lotus' : held.has('down') ? 'seiza' : 'kata';
  if (!known('breath')) { P.cdDeny.breath = .2; return false; }   // not mastered yet: refused like a cooldown (player/mastery.js)
  if (P.qi < cost()) { fizzle(); return false; }
  start(take); return true;
}
function start(s) { setState(s); castStart('breath'); P.aura = 0; P.bN = 0; P.z = 0; P.shield = false;
  if (s === 'lotus') { P.lotusHp = 1 - INV.hp; P.lotusQi = P.qi; }
}
// not a notch of Qi: a grey puff at his chest and the meter blinks
function fizzle() { INV.fx.qi = .12; for (let i = 0; i < 5; i++) spark(P.x + rr(-3, 3), P.y - 14, rr(-10, 10), -rr(4, 12), .3, '#8c9592', false, -10); }
function spend(n = NOTCH) { P.qiIdle = 0; INV.fx.qi = .08;
  if (P.storm > 0) P.storm = Math.max(1e-3, P.storm - n * P.stormMax);   // the storm woke mid-breath (a companion's hit): the breath spends the storm
  else P.qi = Math.max(0, P.qi - n - 1e-6); }
// the wild breath (player/wild.js): a kata he never chose, held for him until the meter is spent
export function wildBreath() { start('kata'); P.wildHold = true; }
// a notch, less with STILL WATER (the breath's tree)
const cost = () => NOTCH * tv('breath', 'cost');
// one out-breath: a notch spent, a heal (DEEP LUNGS), SECOND WIND off every cooldown; it counts as the breath landing
function outBreath(h) { spend(cost()); heal(h * tv('breath', 'heal')); INV.fx.hp = .1; landed('breath');
  const c = tv('breath', 'cool'); if (c) for (const k in P.cd) if (P.cd[k] > 0 && k !== 'tele') P.cd[k] = Math.max(1e-3, P.cd[k] - c); }
function end() { P.wildHold = false; P.shield = false; P.z = 0; P.aura = 0; setState('idle'); }

// one step of whichever take is playing
export function breathState(s, T, dt) {
  const k = tier(), tx = P.x + P.face, ty = P.y - 14 - P.z, holding = held.has('sit') || P.wildHold;
  P.aura = Math.min(.5, T * 1.2); P.qiIdle = 0;   // a breath is not idling: the meter does not ebb
  if (s === 'kata') { const b = BT.kata;
    if (!holding && T < 3.55) return end();   // let go: straight back into the fight
    for (let i = 0; i < 3; i++) { const t0 = b.B0 + i * b.BP;
      if (T >= t0 && T < t0 + .5) { const up = [P.x + P.face * 2, P.y - 30];   // in: Qi rises to his hands in columns from the floor round him
        for (let q = 0; q < QI_RATE[k]; q++) { const a = rr(0, 6.28), r = rr(10, 34); motes.push(mote(P.x + Math.cos(a) * r, P.y + Math.sin(a) * r * .4, up[0], up[1], rr(.4, .7), rr(-6, 6))); }
        if (k >= 1) chip(k, 34, up[0], up[1]); }
      if (T >= t0 + .55 && T < t0 + .85) for (let q = 0; q < Math.ceil(QI_RATE[k] / 3); q++) motes.push(mote(P.x + P.face * 2 + rr(-8, 8), P.y - 30 + rr(-4, 4), tx, P.y - 9, rr(.2, .35), 0));   // out: sinking to the belly
      if (beat('k' + i, T >= t0 + b.OUT)) { if (P.qi < cost()) return end(); outBreath(HEAL.kata); ring(tx, P.y - 9, 2, 2, .25, 6, COL.core); } }
  } else if (s === 'seiza') { const b = BT.seiza;
    if (!holding && T < b.GET) return end();
    P.shield = T >= b.UP && T < b.GET;
    let inb = false; for (let i = 0; i < 3; i++) { const t0 = b.B0 + i * b.BP; if (T >= t0 && T < t0 + b.OUT) inb = true;
      if (beat('s' + i, T >= t0 + b.OUT)) { if (P.qi < cost()) return end(); outBreath(HEAL.seiza); ring(tx, ty, 2, 2, .25, 5, COL.core); } }
    if (inb) { gather(k ? QI_RATE[k] / 2 : QI_RATE[k], tx, ty, 18, 70); if (k >= 1) chip(k, 40, tx, ty); }   // halved at II and III so the dome never buries him
    else if (T > b.UP && T < b.GET && Math.random() < .5) gather(k, tx, ty, 20, 50, 1.4);
    if (beat('fold', T >= b.GET - .05)) { const d = DOME[k]; qiFx(() => { for (let q = 0; q < 14 + k * 10; q++) { const a = rr(Math.PI, 2 * Math.PI);
      spark(P.x + Math.cos(a) * d[0], P.y + Math.sin(a) * d[1] * .3, rr(-10, 10), rr(-20, -4), rr(.3, .5), [COL.fx, COL.fx2, COL.core][q % 3], false, 0); } }); }
  } else if (s === 'lotus') { const b = BT.lotus;
    if (!holding && T < b.DROP) return end();   // he cannot move: letting go is the only way out (and a hit, once they strike)
    P.z = T < b.LIFT ? 0 : T < b.OFF ? Math.round(6 * eOut(kk(T, b.LIFT, 1.2)) + Math.sin((T - b.LIFT) * 2.4) * kk(T, 1.1, 1.4)) : Math.round(6 * (1 - kk(T, b.OFF, b.DROP)));
    if (T > b.ON && T < b.OFF) { const f = dt / (b.OFF - b.ON);   // one long breath: health rises smoothly, the meter drains smoothly
      heal(P.lotusHp * f); P.qi = Math.max(0, P.qi - P.lotusQi * f); P.qiIdle = 0;
      gather(Math.ceil(QI_RATE[k] * .6) * (Math.random() < .5 ? 1 : 0), tx, ty, 20, 66); if (k >= 1 && Math.random() < .3 + k * .3) chip(1, 30, tx, ty); }
  } else if (s === 'sbreath') { const b = BT.sbreath;
    if (T >= b.IN0 && T < b.IN1) { for (let q = 0; q < QI_RATE[k] * 1.5; q++) motes.push(mote(rr(0, W), rr(0, H), tx, P.y - 15, rr(.3, .5), rr(-10, 10)));   // from the whole screen
      if (k >= 1) chip(k * 2, 70, tx, P.y - 15); }
    P.trem = T > b.IN1 && T < b.EX && Math.random() < .3 ? (Math.random() < .5 ? -1 : 1) : 0;
    if (beat('ex', T >= b.EX)) exhale(k);
  }
  if (T >= dur(s)) end();
}
const dur = s => BT[s].END;
const beat = (key, cond) => { if (!cond || P.ev['b' + key]) return false; P.ev['b' + key] = true; return true; };

// Storm breath's out-breath: the rest of the storm spent at once, a big heal, and a shockwave that throws everyone near him
function exhale(k) {
  P.storm = 0; P.qi = 0; INV.fx.qi = .1; heal(HEAL.sbreath * tv('breath', 'heal')); landed('breath'); INV.fx.hp = .12; P.trem = 0;
  P.flash = .05; S.hitstop = .08; S.shake = .22; P.shakeAmp = 3; scrFlash(.04, .2);
  qiFx(() => {
    // the shockwave is air at his chest, never a ripple on the floor (Qi skills leave nothing there)
    ring(P.x, P.y - 12, 6, 4, .4, 8 + k * 3, COL.core); ring(P.x, P.y - 12, 4, 3, .55, 7 + k * 2, COL.fx2);
    if (k >= 1) ring(P.x, P.y - 12, 3, 2, .7, 9 + k * 3, COL.fx);
    dust(14);
    if (k >= 2) for (let q = 0; q < 10; q++) { const a = q / 10 * 6.28; zap(P.x + Math.cos(a) * 8, P.y - 12 + Math.sin(a) * 3, P.x + Math.cos(a) * 46, P.y - 12 + Math.sin(a) * 14, .2, 3, [COL.fx, COL.core][q % 2]); }
    for (let q = 0; q < 40 + k * 30; q++) { const a = rr(0, 6.28), sp = rr(80, 200); spark(P.x, P.y - 12, Math.cos(a) * sp, Math.sin(a) * sp * .5, rr(.2, .45), [COL.fx, COL.fx2, COL.core][q % 3], true, 0); }
  });
  // thrown off their feet: the shockwave reaches further with power
  const R = 60 + k * 18;
  for (const e of living()) { if (e.held) continue; const d = Math.hypot(e.x - P.x, (e.y - P.y) * 1.3); if (d > R) continue;
    const away = Math.sign(e.x - P.x) || 1; e.state = 'stagger'; e.t = 0; e.flash = .05; e.vx = away * (170 + k * 50) * (1 - d / R * .5); e.vy = 0; e.face = -away;
    kick(e.body, -1, 1.4); }
}

// ---- The look, shared by every take (design notes): I is a quiet trickle of motes; II adds stone lifting off the floor and dissolving into Qi;
// III adds two ribbons of light wound round him. Nothing on the floor and nothing over his head.
const eIn = q => q * q, eOut = q => 1 - (1 - q) * (1 - q), kk = (t, a, b) => Math.max(0, Math.min(1, (t - a) / (b - a)));
const mote = (sx, sy, tx, ty, d, curl) => ({ sx, sy, tx, ty, t0: clk, dur: d, curl });
function gather(n, tx, ty, r0, r1, slow = 1) { for (let i = 0; i < n; i++) { const a = rr(0, 6.28), r = rr(r0, r1); motes.push(mote(tx + Math.cos(a) * r, ty + Math.sin(a) * r * .6, tx, ty, rr(.35, .7) * slow, rr(-14, 14))); } }
function chip(n, r, tx, ty) { for (let i = 0; i < n; i++) { const a = rr(0, 6.28), d = rr(6, r);
  chips.push({ x: P.x + Math.cos(a) * d, y: P.y + Math.sin(a) * d * .4, t0: clk, rise: rr(8, 22), dur: rr(1.0, 1.5), tx, ty, w: Math.random() < .45 ? 2 : 1,
    col: ['#5d6361', '#3b403e', '#6b716f', '#2e3331'][Math.random() * 4 | 0], wob: rr(0, 6), curl: rr(-10, 10) }); } }
function path(sx, sy, tx, ty, q, curl) { const dx = tx - sx, dy = ty - sy, L = Math.hypot(dx, dy) || 1;
  return [sx + dx * q + (-dy / L) * Math.sin(q * Math.PI) * curl, sy + dy * q + (dx / L) * Math.sin(q * Math.PI) * curl, dx / L, dy / L]; }
export function updateBreath(dt) {
  clk += dt;
  for (const L of [motes, chips]) for (let i = L.length - 1; i >= 0; i--) if (clk - L[i].t0 >= L[i].dur) L.splice(i, 1);
  if (!BREATHS.has(P.state)) { P.shield = false; P.wildHold = false; if (P.z && P.state !== 'jump' && P.state !== 'fall' && P.state !== 'sweep') P.z = 0; }
}
const px = (x, y) => g.fillRect(Math.round(x), Math.round(y), 1, 1);
// behind him (drawn before the depth sort): the room darkening for Storm breath, and the far halves of the dome, the ribbons and the lotus ring
export function drawBreathBack() { layer(false); }
// in front of him
export function drawBreathFront() {
  layer(true);
  for (const c of chips) { const q = (clk - c.t0) / c.dur;
    if (q < .6) { const e = eOut(q / .6), x = c.x + Math.sin(clk * 3 + c.wob) * .8, y = c.y - c.rise * e;   // lifting off the floor, turning slowly
      g.globalAlpha = Math.min(1, q * 8); g.fillStyle = c.col; g.fillRect(Math.round(x), Math.round(y), c.w, 1);
      if (q > .38 && (clk * 20 + c.wob | 0) % 2) { g.fillStyle = COL.fx; px(x, y - 1); } }
    else { const e = eIn((q - .6) / .4), [x, y, ux, uy] = path(c.x, c.y - c.rise, c.tx, c.ty, e, c.curl);   // dissolved into Qi and drawn in
      g.globalAlpha = 1; g.fillStyle = e > .6 ? COL.core : COL.fx2; px(x, y); g.fillStyle = COL.fx; g.globalAlpha = .6; px(x - ux * 2, y - uy * 2); } }
  for (const m of motes) { const q = eIn(kk(clk, m.t0, m.t0 + m.dur)), [x, y, ux, uy] = path(m.sx, m.sy, m.tx, m.ty, q, m.curl);
    g.globalAlpha = Math.min(1, kk(clk, m.t0, m.t0 + .1) * 1.2); g.fillStyle = q > .7 ? COL.core : q > .35 ? COL.fx2 : COL.fx; px(x, y);
    if (q > .15) { g.fillStyle = COL.fx; g.globalAlpha *= .7; px(x - ux * 1.5, y - uy * 1.5); g.globalAlpha *= .6; px(x - ux * 3, y - uy * 3); } }
  // the kata's point of light at his belly as the Qi sinks
  if (P.state === 'kata') { const b = BT.kata; let gl = 0; for (let i = 0; i < 3; i++) { const t0 = b.B0 + i * b.BP; gl = Math.max(gl, kk(P.t, t0 + .55, t0 + .85) * (1 - kk(P.t, t0 + .9, t0 + 1.2))); }
    if (gl > 0) { const x = P.x + P.face, y = P.y - 9; g.globalAlpha = gl; g.fillStyle = COL.core; px(x, y); g.fillStyle = COL.fx2; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) px(x + dx, y + dy); } }
  // Storm breath's held beat: his eyes blaze
  if (P.state === 'sbreath' && P.t > BT.sbreath.IN1 && P.t < BT.sbreath.EX) { g.globalAlpha = 1; g.fillStyle = (clk * 30 | 0) % 2 ? COL.core : COL.fx2; px(P.x + P.face * 2, P.y - 20); px(P.x + P.face * 3, P.y - 20); }
  g.globalAlpha = 1;
}
function layer(front) {
  const s = P.state, T = P.t, k = tier(); if (!BREATHS.has(s)) return;
  if (s === 'sbreath' && !front) { const b = BT.sbreath, a = .32 * kk(T, b.IN0, b.IN1) * (1 - kk(T, b.EX, b.EX + .1)); if (a > 0) { g.fillStyle = `rgba(6,10,12,${a})`; g.fillRect(-4, -4, W + 8, H + 8); } }
  if (s === 'seiza') { const b = BT.seiza, d = DOME[k], up = eOut(kk(T, .5, .95)), down = kk(T, b.GET - .15, b.GET);
    let band = null; for (let i = 0; i < 3; i++) { const t0 = b.B0 + i * b.BP + b.OUT; if (T >= t0 && T < t0 + .4) band = kk(T, t0, t0 + .4); }
    dome(front, { cx: P.x + 1, fy: P.y + 1, r: d[0] * (1 - down * .6), h: d[1] * up * (1 - down), a: kk(T, .5, .7) * (1 - down), band, motes: d[2] }); }
  if (s === 'lotus') { const b = BT.lotus, a = kk(T, b.LIFT, 1.1) * (1 - kk(T, b.OFF, 3.5)), n = 10 + k * 6, cy = P.y - 13 - P.z;   // the ring of Qi round him
    for (let i = 0; i < n && a > 0; i++) { const q = clk * 2 + i / n * 6.283, fr = Math.sin(q) > 0; if (fr !== front) continue;
      g.globalAlpha = a * (fr ? 1 : .5); g.fillStyle = i % 3 ? COL.fx2 : COL.core; px(P.x + Math.cos(q) * 15, cy + Math.sin(q) * 5);
      g.fillStyle = COL.fx; g.globalAlpha *= .5; px(P.x + Math.cos(q - .12) * 15, cy + Math.sin(q - .12) * 5); } }
  if (k >= 2) { const o = { kata: { h: 40, a: kk(T, .5, .8) * (1 - kk(T, 3.4, 3.7)) }, seiza: { h: 44, r: 13, a: kk(T, .55, .8) * (1 - kk(T, 2.8, 2.95)) },
      lotus: { h: 34, r: 13, a: kk(T, .7, 1.1) * (1 - kk(T, 3.2, 3.5)) }, sbreath: { h: 38, r: 13, a: kk(T, BT.sbreath.IN0, BT.sbreath.IN0 + .3) * (1 - kk(T, BT.sbreath.EX, BT.sbreath.EX + .05)) } }[s];
    ribbons(front, { cx: P.x, fy: P.y, z: P.z, ...o }); }
  g.globalAlpha = 1;
}
// two strands of light wound round him from the floor to above his shoulders; the half behind him is drawn under him
function ribbons(front, o) { if (!(o.a > 0)) return;
  for (let k = 0; k < 2; k++) for (let s = 0; s <= 1; s += 1 / 56) {
    const ang = clk * 4.2 + s * 10 + k * Math.PI, rad = (o.r || 11) - 4 * s, fr = Math.sin(ang) > 0; if (fr !== front) continue;
    g.globalAlpha = Math.sin(s * Math.PI) * .85 * o.a * (fr ? 1 : .5); g.fillStyle = ((s * 56 + clk * 40) | 0) % 6 ? COL.fx : COL.core;
    px(o.cx + Math.cos(ang) * rad, o.fy - (o.z || 0) - s * o.h + Math.sin(ang) * rad * .35); }
}
// the Qi shield: a dome of light standing on the floor round him, dotted bands turning slowly, a shimmer (`band`) climbing it on each out-breath
function dome(front, o) { if (o.a <= 0) return;
  const rx = o.r, ry = o.h, lats = Math.max(5, Math.round(ry / 5));
  for (let i = 0; i <= lats; i++) { const q = i / lats * Math.PI / 2 * .96, y0 = o.fy - Math.sin(q) * ry, r0 = Math.cos(q) * rx, n = Math.max(6, Math.round(r0 * .9));
    for (let j = 0; j < n; j++) { const a = j / n * 6.283 + clk * (i % 2 ? .5 : -.35), s = Math.sin(a); if ((s > 0) !== front) continue;
      const x = o.cx + Math.cos(a) * r0, y = y0 + s * r0 * .3, lit = o.band != null && Math.abs((o.fy - y) / ry - o.band) < .09;
      g.globalAlpha = Math.min(1, o.a * (front ? .75 : .3) * (lit ? 1.4 : 1)); g.fillStyle = lit ? COL.core : (i + j) % 5 ? COL.fx : COL.fx2; px(x, y); } }
  if (front) { g.globalAlpha = o.a * .85; g.fillStyle = COL.fx2; for (let a = Math.PI; a <= 2 * Math.PI; a += .7 / rx) px(o.cx + Math.cos(a) * rx, o.fy + Math.sin(a) * ry); }   // its rim against the room
  for (let k = 0; k < (o.motes || 0); k++) { const ph = k * 2.399, a = clk * (.35 + (k % 5) * .07) + ph, s = Math.sin(a); if ((s > 0) !== front) continue;   // Qi floating round it
    const rad = rx * (.55 + .5 * ((k * .618) % 1)), hh = ry * (.15 + .8 * ((k * .381) % 1)) + Math.sin(clk * 1.3 + ph) * 3;
    g.globalAlpha = o.a * (front ? 1 : .45) * (.6 + .4 * Math.sin(clk * 3 + ph)); g.fillStyle = k % 4 ? COL.fx2 : COL.core; px(o.cx + Math.cos(a) * rad, o.fy - hh + s * rad * .3); }
}
