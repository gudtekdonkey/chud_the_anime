// ---- The blade skills, on today's beats (player/update.js `double`, player/skills.js, fx/moon.js):
//   I tap   the glitch double slash: crouch, vanish and blink 44, the lunge cut (.225), the second cut (.325), each
//           opening an arm of a black X; held, sheathed, and on the click (.6) whatever he cut bursts
//   I hold  Thousand Cuts: charge in the crouch, let go: vanish to the point (110 at full charge), 7 / 9 / 11 cuts from
//           every side in 0.34 s, each a black slash through him, the closing X, the click bursts it all
//   P       Cross Rift (charging while held, a medium rift on a tap): dash, the X torn in reality, the room drawn into
//           it, the click shuts it and it detonates (at III a second, smaller one)
//   O hold  Crescent Moon: charge with the blade raised, let go: one huge descending crescent sweeps round him, hangs,
//           the black slash along its inside snaps shut and it shatters (II: the shatter cuts; III: a twin moon)
// Positions are world units (today's pixels); he moves by C.shift / C.place, the look follows.
import { W, STOP } from '../play/sim.js';
import { held } from '../play/input.js';
import { hv, AF } from '../anim/flow.js';
import { dust } from '../fx/fx.js';
import { shake } from '../gfx/view.js';
import { arc, tear, xArm, shut, bolt, ring, spark, mote, chip, residue, burstAt, slit, pool, flash, sliver, axes, v3, rr, TAU } from './fx3d.js';
import { DOUBLE } from './moves.js';
import { CD, TAP, CHARGE_T } from './beats.js';

const once = (cur, k, c) => { if (!c || cur.done.has(k)) return false; cur.done.add(k); return true; };
const dustW = (x, z, n, o) => dust(W, x / AF, z / AF, n, o);
// a cut's crescent in the world: round his chest, in the plane of his facing tilted by `tilt` (0 straight down the
// front, ± leans it); `rise` sweeps it up instead of down. Today's strike()
export function strike(C, h, tilt = 0, rise = false, big = true, o = {}) {
  const { f, r, u } = axes(h), c = o.c || v3.add([C.hero.x, 13, C.hero.z], f, 6), B = [u[0] * Math.cos(tilt) + r[0] * Math.sin(tilt), Math.cos(tilt), u[2] * Math.cos(tilt) + r[2] * Math.sin(tilt)];
  const R = o.R || (big ? 21 : 16), a0 = rise ? -1.25 : 1.45, a1 = rise ? 1.45 : -1.25;
  return arc({ c, A: f, B, R, w: o.w || (big ? 5.5 : 4), a0, a1, sweep: .05, hold: .03, glow: .14, heat: .75 });
}
// the X's arm and whether it caught someone: the billboard arm over c, tested on the floor as today's hitSeg does
function armHits(C, c, h, sign, r, face) { const hx = h * .85 * face, hz = h * .42 * sign, out = [];
  for (const f of C.foes) { if (f.dead) continue; const ax = c[0] - hx, az = c[2] - hz, bx = c[0] + hx, bz = c[2] + hz, dx = bx - ax, dz = bz - az, L = dx * dx + dz * dz || 1;
    const t = Math.max(0, Math.min(1, ((f.x - ax) * dx + (f.z - az) * dz) / L)); if (Math.hypot(f.x - ax - dx * t, f.z - az - dz * t) <= r) out.push(f); }
  return out; }
const faceOf = h => Math.sign(Math.sin(h)) || 1;
// within the cut's reach in front of him
const inFront = (C, f, reach) => { const dx = f.x - C.hero.x, dz = f.z - C.hero.z, d = Math.hypot(dx, dz), v = hv(C.hero.a.h); return d <= reach && (d < 6 || (dx * v[0] + dz * v[1]) / d > .2); };

// ---- the charge (I held, P, O held): sparks and short bolts converge onto his body while it glows; full: one flash
export function chargeUp(C, cur, dt) {
  const was = cur.charge || 0, c = cur.charge = Math.min(1, was + dt / CHARGE_T + 1e-6), a = C.hero.a; a.co.charge = c;
  a.tint = '#6ff3e4'; a.tintA = .06 + .3 * c + (Math.random() < .3 ? .15 : 0);
  const p = C.chest(), pts = [p, v3.add(p, [0, -6, 0]), v3.add(p, [0, 8, 0])];
  for (let i = 0; i < 3; i++) if (Math.random() < .25 + c * .55) { const t = pts[i], an = rr(0, TAU), R = rr(14, 26), v = 70 + c * 150, s = [t[0] + Math.cos(an) * R, t[1] + rr(-.6, .7) * R, t[2] + Math.sin(an) * R * .7];
    spark(s, [(t[0] - s[0]) / R * v, (t[1] - s[1]) / R * v, (t[2] - s[2]) / R * v], R / v, [.45, .7, 1][i]); }
  if (Math.random() < .1 + c * .45) { const t = pts[Math.random() * 3 | 0], an = rr(0, TAU), R = rr(8, 14); bolt([t[0] + Math.cos(an) * R, t[1] + Math.sin(an) * R, t[2]], t, rr(.04, .07), 1.5, Math.random() < .6 ? .6 : 1); }
  if (Math.random() < .15 + c * .5) { const t = v3.add(p, [rr(-5, 5), rr(4, 10), 0]); mote(t, v3.add(t, [rr(-3, 3), rr(10, 18), 0]), rr(.4, .7), rr(-3, 3), .4); }   // motes rise off his hat and shoulders
  if (was < 1 && c >= 1) { a.flash = .05; ring(p, 4, 10, .14, 1); }
}

// ---- I tapped: the double slash (and I held past the tap: the charge, then Thousand Cuts)
const DOUBLE_S = { id: 'double', key: 'double',
  start(C, inp) { const aim = C.aim(inp.dir, 90); C.face(aim.h); C.startCd('double'); C.hero.a.play('skDouble');
    C.SK.cur = { id: 'double', s: DOUBLE_S, hk: 'double', aim, h: aim.h, done: new Set(), struck: new Set(), clips: new Set(['skDouble', 'skCharge', 'skRelease']),
      inv: ct => C.hero.state === 'skDouble' ? ct < .2 : C.hero.state === 'skRelease' ? ct < (C.SK.cur.V || 0) + .1 : true,
      armed: ct => C.hero.state === 'skDouble' && ct > .15 && ct < .6 }; },
  tick(C, inp, cur) { const n = C.hero.state, ct = C.hero.a.ct;
    if (n === 'skDouble' && !cur.charging && ct >= TAP && ct < TAP + .05 && held('double')) { cur.charging = true; cur.charge = 0; C.hero.a.play('skCharge', { charge: 0 }); C.log('tc:charge'); }
    if (n === 'skCharge') { if (inp.dir != null) cur.aimDir = inp.dir; if (held(cur.hk)) chargeUp(C, cur, 1 / 60); else release(C, cur, cur.hk === 'rift' ? 'rift' : 'tc'); } },
  step(C, cur, ct) { const n = C.hero.state; if (n === 'skRelease') return RELEASE(C, cur, ct); if (n !== 'skDouble') return;
    const hero = C.hero, h = cur.h, v = hv(h);
    if (ct > .13 && ct < .2) hero.a.alpha = (ct * 60 | 0) % 2 ? .25 : .6; else if (ct >= .2 && hero.a.alpha < 1) hero.a.alpha = 1;   // glitching out and back in
    if (once(cur, 'blink', ct >= DOUBLE.blink)) { const s = [hero.x, 0, hero.z], t = cur.aim.tgt, d = t && !t.dead ? Math.max(0, Math.min(44, Math.hypot(t.x - hero.x, t.z - hero.z) - 24)) : 44;
      C.ghost(.04, .2, .6); residue(s, 8); C.shift(h, d); hero.trail.push({ t: W.t, gap: 1 }); streak(s, v3.add(s, [v[0] * d, 0, v[1] * d])); }
    for (const [k, tm, tilt, rise, sign, fwd] of [['c1', DOUBLE.c1, -.5, true, 1, 22], ['c2', DOUBLE.c2, .5, false, -1, 25]]) if (once(cur, k, ct >= tm)) {
      strike(C, h, tilt, rise); const c = [hero.x + v[0] * fwd, 13, hero.z + v[1] * fwd];
      cur[k + 'X'] = xArm(c, 22, sign, 3.5, DOUBLE.click - tm, faceOf(h));   // each opens an arm of the black X; both shut on the click
      for (const f of C.foes) if (inFront(C, f, 40) && C.land('d' + (k === 'c1' ? 1 : 2), f, { stop: 'light' })) cur.struck.add(f);
      C.shift(h, 3); if (k === 'c2') slit([hero.x + v[0] * 2, 13, hero.z + v[1] * 2], [hero.x + v[0] * 48, 13, hero.z + v[1] * 48], .1); }
    if (once(cur, 'click', ct >= DOUBLE.click)) { spark([hero.x + v[0] * 3, 9, hero.z + v[1] * 3], [0, 10, 0], .12, 1); C.log('double:click');
      if (cur.struck.size) { W.hitstop(STOP.light); shake(.5, 1 / 60); for (const f of cur.struck) C.burst(f); } }
  } };
const streak = (a, b) => { const n = Math.hypot(b[0] - a[0], b[2] - a[2]) | 0; for (let i = 0; i < n; i += 3) spark([a[0] + (b[0] - a[0]) * i / n, rr(4, 22), a[2] + (b[2] - a[2]) * i / n], [0, 0, 0], rr(.12, .22), i % 2 ? .45 : .7); };

// ---- let go after a charge: Thousand Cuts (I) or Cross Rift (P), both on the double's frames and timeline
function release(C, cur, mode, min = 0) {
  const hero = C.hero, c = Math.max(mode === 'rift' ? .5 : min, cur.charge || 0), k = .35 + .65 * c, dist = 44 + ((mode === 'rift' ? 120 : 110) - 44) * c;
  hero.a.tint = null; cur.mode = mode; cur.k = k; cur.pow = c; cur.done = new Set(); cur.struck = new Set(); C.log(`${mode}:release`);
  if (mode === 'tc') C.startCd('double', CD.tc); else C.startCd('rift');
  C.powerCast(); const aim = C.aim(cur.aimDir ?? null, dist + 40); C.face(aim.h); cur.h = aim.h; cur.aim = aim;
  if (mode === 'tc') { const v = hv(aim.h); cur.C = aim.tgt && aim.d <= dist + 30 ? [aim.tgt.x, aim.tgt.z] : [hero.x + v[0] * dist, hero.z + v[1] * dist];
    cur.V = .34; cur.hold = .24; cur.n = C.T('tc', 'cuts'); }
  else { cur.dash = aim.tgt ? Math.max(0, Math.min(dist, aim.d - (30 + 26 * k))) : dist; cur.V = .08; cur.hold = .3; }
  cur.F = cur.V + .16 + cur.hold; cur.armed = ct => ct > cur.V - .02 && ct < cur.F + .06;
  hero.a.play('skRelease', { V: cur.V, F: cur.F, vanish: mode === 'tc' });
}
function RELEASE(C, cur, ct) {
  const hero = C.hero, k = cur.k, V = cur.V, F = cur.F, h = cur.h, v = hv(h), face = faceOf(h);
  if (ct >= F + .2) { hero.a.play('idle', { blend: .1 }); return; }   // sheathed and settled: back to rest (its length is the charge's)
  if (cur.mode === 'tc') {
    const [cx, cz] = cur.C, n = cur.n;
    if (once(cur, 'go', true)) { const s = [hero.x, 0, hero.z]; C.ghost(.03, .2, .6); residue(s, 14); C.place(cx, cz); cur.last = [s[0], 12, s[2]]; cur.a0 = rr(0, TAU);
      for (const f of C.foes) if (Math.hypot(f.x - cx, f.z - cz) <= 30 + 30 * k && C.land('tc', f, { stop: 'light', at: [s[0], s[2]] })) cur.struck.add(f); }
    if (ct < V) { const j = Math.min(n - 1, ct / (V / n) | 0), ph = ct - j * V / n; hero.a.alpha = ph < .033 ? 1 : 0;
      if (once(cur, 'tc' + j, true)) { const a = cur.a0 + j * 2.4, rad = 16 + 12 * k, sx = cx + Math.cos(a) * rad, sz = cz + Math.sin(a) * rad * .6, hf = C.snap8(Math.atan2(cx - sx, cz - sz));
        C.place(sx, sz); C.face(hf); hero.a.co.cutJ = j; const p = [sx, 12, sz]; bolt(cur.last, p, .07, 1.2, .5); cur.last = p;
        strike(C, hf, rr(-1.1, 1.1), Math.random() < .5, false, { c: v3.add(p, axes(hf).f, 8), R: 17 + 6 * k });
        const b = a + 1.57 + rr(-.5, .5); tear(t => ({ scr: true, c: [cx, 12, cz], dx: (t - .5) * 2 * (10 + 8 * k) * Math.cos(b), dy: (t - .5) * 2 * (10 + 8 * k) * Math.sin(b) * .6 }), 1.5 + 1.5 * k, F + .06 - ct);   // a black slash through him at every cut, all shut on the click
        for (const f of C.foes) if (!f.dead && Math.hypot(f.x - cx, f.z - cz) < 30) { f.a.flash = .02; f.a.hitAt = W.t; }
        for (let i = 0; i < 4; i++) spark([cx + rr(-6, 6), 12 + rr(-6, 6), cz], [rr(-90, 90), rr(-60, 60), rr(-30, 30)], rr(.08, .14), i % 2 ? 1 : .7); } }
    if (once(cur, 'c1', ct >= V)) { hero.a.alpha = 1; C.face(h); C.place(cx - v[0] * 16, cz - v[1] * 16); strike(C, h, -.5, true); xArm([cx, 12, cz], 18 + 8 * k, 1, 2 + 1.5 * k, .16 + cur.hold + .06, face); }
    if (once(cur, 'c2', ct >= V + .1)) { strike(C, h, .5, false); xArm([cx, 12, cz], 18 + 8 * k, -1, 2 + 1.5 * k, .06 + cur.hold + .06, face); C.shift(h, 3); }
    if (once(cur, 'click', ct >= F + .06)) { C.log('tc:click'); W.hitstop(STOP.heavy); shake(1, 3 / 60); const R = 30 + 30 * k, c = [cx, 2, cz];
      ring(c, R * .5, R, .1, 1); ring(c, R * .3, R * .6, .22, .6); residue([cx, 0, cz], 10); burstAt([cx, 12, cz], 28);
      for (const f of cur.struck) C.burst(f, 1.2); }
    return;
  }
  // Cross Rift
  if (once(cur, 'go', true)) { const s = [hero.x, 0, hero.z]; C.ghost(.03, .2, .6); residue(s, 14); C.shift(h, cur.dash); hero.trail.push({ t: W.t, gap: 1 }); streak(s, v3.add(s, [v[0] * cur.dash, 0, v[1] * cur.dash])); }
  const arm = sign => { const hh = (30 + 42 * k) * C.T('rift', 'size'), c = [hero.x + v[0] * (30 + 26 * k), 12, hero.z + v[1] * (30 + 26 * k)]; cur.X = [c, hh];
    for (const f of armHits(C, c, hh, sign, 12 + 8 * k, face)) if (C.land('cr' + (sign > 0 ? 1 : 2), f, { stop: 'light' })) cur.struck.add(f);
    return xArm(c, hh, sign, 2.5 + 3.5 * k, null, face); };
  if (once(cur, 'c1', ct >= V)) { strike(C, h, -.5, true); cur.r1 = arm(1); }
  if (once(cur, 'c2', ct >= V + .1)) { strike(C, h, .5, false); cur.r2 = arm(-1); C.shift(h, 3); }
  if (cur.r2 && cur.r2.shut == null && ct < F + .06) { const [c, hh] = cur.X;   // the tear drinks the room: stone lifts off the floor and motes stream into its lips
    if (Math.random() < .8) { const u = rr(-.8, .8), sgn = Math.random() < .5 ? 1 : -1, t = [c[0] + u * hh * .85 * face, c[1] - u * hh * .42 * sgn * .7, c[2]], an = rr(0, TAU), R = rr(14, 34);
      if (Math.random() < .45) chip([t[0] + Math.cos(an) * R, .5, t[2] + Math.sin(an) * R * .5], [0, 0, 0], rr(.5, .8), { to: t }); else mote([t[0] + Math.cos(an) * R, t[1] + Math.sin(an) * R * .6, t[2]], t, rr(.25, .45), rr(-6, 6), .7); }
    if (Math.random() < .08) { const u = rr(-.7, .7), u2 = u + rr(.06, .14); bolt([c[0] + u * hh * .85 * face, c[1] - u * hh * .3, c[2]], [c[0] + u2 * hh * .85 * face, c[1] - u2 * hh * .3, c[2]], .05, 2, 1); } }
  if (once(cur, 'click', ct >= F + .06)) { C.log('rift:click'); const [c, hh] = cur.X; shut(cur.r1); shut(cur.r2);
    for (let i = 0; i < 18; i++) { const a = rr(0, TAU), R = rr(10, hh * .7), s = [c[0] + Math.cos(a) * R, c[1] + Math.sin(a) * R * .6, c[2]]; spark(s, [(c[0] - s[0]) / .05, (c[1] - s[1]) / .05, 0], .05, i % 2 ? 1 : .7); }
    C.after(.05, () => detonate(C, cur, c, hh, true)); }
}
// the rift's detonation (and at III its echo .25 s later, smaller): rings, a hit on everyone inside, the burst
function detonate(C, cur, c, hh, first) {
  W.hitstop(STOP.heavy); shake(first ? 1.6 : 1, (first ? 4 : 2) / 60); flash(first ? .16 : .08, .06);
  const fl = [c[0], 1, c[2]]; ring(fl, hh * .3, hh * .9, .1, 1); ring(fl, hh * .2, hh * .5, .24, .6, { thick: 2 }); ring([c[0], 12, c[2]], 2, hh * .4, .3, 1);
  burstAt(c, first ? 34 : 20, [90, 220]); residue([c[0], 0, c[2]], 12);
  for (const f of C.foes) if (!f.dead && Math.hypot(f.x - c[0], f.z - c[2]) <= hh * .95 && C.land(first ? 'crB' : 'crE', f, { stop: 'heavy', w: 2 })) cur.struck.add(f);
  if (first) { for (const f of cur.struck) C.burst(f, 1.2); C.log('rift:detonate'); const e = C.T('rift', 'echo'); if (e) C.after(.25, () => detonate(C, cur, c, hh * e, false)); }
  else { C.log('rift:echo'); for (let i = 0; i < 5; i++) { const a = rr(0, TAU), R = rr(hh * .4, hh * .8); bolt(c, [c[0] + Math.cos(a) * R, c[1] + rr(-8, 8), c[2] + Math.sin(a) * R * .55], rr(.08, .14), 2.5, i % 2 ? 1 : .6); } }
}

// ---- P: Cross Rift, charging from the press while P is held (a tap is a medium rift)
const RIFT_S = { id: 'rift', key: 'rift',
  start(C, inp) { C.hero.a.play('skCharge', { charge: 0 }); C.SK.cur = { id: 'rift', s: RIFT_S, hk: 'rift', charge: 0, aimDir: inp.dir, done: new Set(), struck: new Set(), clips: new Set(['skCharge', 'skRelease']),
    inv: ct => C.hero.state === 'skCharge' || ct < (C.SK.cur.V || 0) + .1, armed: () => false }; C.face(C.aim(inp.dir, 160).h); },
  tick: DOUBLE_S.tick,
  step(C, cur, ct) { if (C.hero.state === 'skRelease') RELEASE(C, cur, ct); },
};

// ---- O: Crescent Moon. Held: the charge with the blade raised; let go: the moon (moonsStep runs it to the shatter)
const moons = [];
const MOON_S = { id: 'moon', key: 'moon',
  start(C, inp) { const aim = C.aim(inp.dir, 80); C.face(aim.h); C.hero.a.play('skMoonHold', { charge: 0 });
    C.SK.cur = { id: 'moon', s: MOON_S, charge: 0, done: new Set(), clips: new Set(['skMoonHold', 'skMoon']), armed: () => true }; },
  tick(C, inp, cur) { if (C.hero.state !== 'skMoonHold') return; if (held('moon')) chargeUp(C, cur, 1 / 60);
    else { cur.pow = cur.charge; C.hero.a.tint = null; C.startCd('moon'); C.hero.a.play('skMoon'); C.log('moon:release'); } },
  step(C, cur, ct) { if (C.hero.state === 'skMoon' && once(cur, 'cut', ct >= .04)) { unleash(C, cur.pow, false); C.ghost(.03, .2, .5); } },
};
function unleash(C, pow, twin) {
  const hero = C.hero, h = hero.a.h + (twin ? Math.PI : 0), { f, r, u } = axes(h), k = .35 + .65 * pow, R = 23 * (1 + 2 * k) * (twin ? .75 : 1);
  const c = [hero.x + f[0] * R * .25, 13, hero.z + f[2] * R * .25], tl = .18, B = [r[0] * Math.cos(tl), -Math.sin(tl), r[2] * Math.cos(tl)];
  const m = { c, A: f, B, R, d: 6 + 9 * k, k, age: 0, SW: .15, HOLD: .3 + .14 * k, GLOW: .55, struck: [], twin, echo: 0 };
  m.arc = arc({ c, A: f, B, R, w: m.d, a0: -1.75, a1: 1.75, sweep: m.SW, hold: m.HOLD, glow: m.GLOW, heat: .75, shatter: 1, life: m.SW + m.HOLD + m.GLOW });
  const ri = R - m.d - 1; tear(t => { const a = -1.75 + 3.5 * t; return [c[0] + (Math.cos(a) * f[0] + Math.sin(a) * B[0]) * ri, c[1] + Math.sin(a) * B[1] * ri, c[2] + (Math.cos(a) * f[2] + Math.sin(a) * B[2]) * ri]; },
    2 + 4 * k, m.SW + m.HOLD, m.SW);   // the black slash along the arc just inside the blade, sweeping with it, shut as it shatters
  moons.push(m); C.log(twin ? 'moon:twin' : 'moon:unleash');
  if (!twin) { C.powerCast(); if (C.T('moon', 'twin')) C.after(.1, () => unleash(C, pow, true)); hero.a.flash = .05; flash(.12 + .16 * pow, .1); shake(1 + pow, .1); }
  ring([hero.x + f[0] * R * .3, 1, hero.z + f[2] * R * .3], R * .1, R * .35, .5, .6); ring([hero.x, 1, hero.z], 4, 12, 2 / 60, 1);
  pool([c[0] + f[0] * R * .35, 0, c[2] + f[2] * R * .35], R * .85, R * .55, m.SW + m.HOLD + m.GLOW, .9); dustW(hero.x, hero.z, 10 + 10 * pow | 0, { spd: 34 });
}
const mPt = (m, a, rad) => [m.c[0] + (Math.cos(a) * m.A[0] + Math.sin(a) * m.B[0]) * rad, m.c[1] + Math.sin(a) * m.B[1] * rad, m.c[2] + (Math.cos(a) * m.A[2] + Math.sin(a) * m.B[2]) * rad];
export function moonsStep(C, dt) {
  for (const m of moons) { m.age += dt; const sw = Math.min(1, m.age / m.SW), A = -1.75 + 3.5 * sw;
    if (m.age < m.SW) { if ((m.echo -= dt) <= 0) { m.echo = .035; arc({ c: v3.add(m.c, m.A, -rr(5, 12)), A: m.A, B: m.B, R: m.R * rr(.4, .65), w: 4, a0: A - .9, a1: A, sweep: .01, hold: .02, glow: .2, heat: .4, life: .23 }); }   // echoes peel off behind
      for (let i = 0; i < 3; i++) sliver(mPt(m, A, m.R - rr(0, m.d)), 1 + (Math.random() * 2 | 0), rr(.25, .5), [-m.A[0] * rr(10, 40), rr(-4, 20), -m.A[2] * rr(10, 40)], i % 2 ? 1 : .7); }
    if (!m.hit && sw >= .5) { m.hit = true; const hc = v3.add(m.c, m.A, m.R * .45);
      for (const f of C.foes) if (!f.dead && Math.hypot(f.x - hc[0], f.z - hc[2]) <= m.R * 1.05 && C.land(m.twin ? 'cmT' : 'cm', f, { w: 2, stop: 'heavy', dmg: m.twin ? 1.5 : undefined })) m.struck.push(f); }
    if (m.age >= m.SW && m.age < m.SW + m.HOLD && Math.random() < .7) sliver(mPt(m, rr(-1.6, 1.6), m.R - rr(0, 3)), 1, rr(.3, .6), [m.A[0] * rr(2, 10), rr(6, 16), m.A[2] * rr(2, 10)], Math.random() < .5 ? .7 : 1);
    if (!m.shat && m.age >= m.SW + m.HOLD) { m.shat = true; shatter(C, m); } }
  for (let i = moons.length - 1; i >= 0; i--) if (moons[i].age > moons[i].SW + moons[i].HOLD + moons[i].GLOW) moons.splice(i, 1);
}
// it breaks: long slivers drift back off the arc, heavier shards tumble to the floor, whatever it cut bursts
function shatter(C, m) {
  C.log('moon:shatter');
  for (let i = 0; i < 26 + 20 * m.k; i++) { const a = rr(-1.6, 1.6), p = mPt(m, a, m.R - rr(0, m.d)); sliver(p, 2 + (Math.random() * 4 | 0), rr(.35, .8), [m.A[0] * Math.cos(a) * rr(8, 40), rr(-8, 10), m.A[2] * Math.cos(a) * rr(8, 40)], [1, .7, .45][i % 3]); }
  for (let i = 0; i < 16 + 12 * m.k; i++) { const a = rr(-1.6, 1.6), p = mPt(m, a, m.R - rr(0, m.d)); spark(p, [m.A[0] * Math.cos(a) * rr(20, 70), rr(10, 40), m.A[2] * Math.cos(a) * rr(20, 70)], rr(.4, .8), [1, .7, .45][i % 3], 90); }
  ring(v3.add([m.c[0], 1, m.c[2]], m.A, m.R * .4), m.R * .2, m.R * .5, .3, 1);
  if (C.T('moon', 'shards')) { const hc = v3.add(m.c, m.A, m.R * .45); for (const f of C.foes) if (!f.dead && Math.hypot(f.x - hc[0], f.z - hc[2]) <= m.R * .9 && C.land('cmS', f, { stop: null }) && !m.struck.includes(f)) m.struck.push(f); }   // power II: the shatter cuts too
  if (m.struck.length) { W.hitstop(STOP.heavy); shake(1, 2 / 60); for (const f of m.struck) C.burst(f, 1 + .5 * m.k); }
}

export const BLADE = [DOUBLE_S, RIFT_S, MOON_S];
