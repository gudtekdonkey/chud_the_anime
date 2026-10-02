// ---- A persona on the flow's moves: idle, guard, run and runArmed take the actor's persona (persona.js) when it has
// one, and a walk is added (for the courtyard's people; an addition, not the page's). Each is the page's own move
// (anim/moves.js) with the persona's numbers written in, arranged so the plain numbers give the page's move bit for
// bit (the check compares them); an actor without a persona never leaves the page's own function. Attacks, rolls,
// stops and the rest stay exactly as drawn, as in today's game.
import { CLIPS, proc, H, TAU, lerp, EZ, hv } from '../anim/flow.js';
import { SH, blade } from '../anim/moves.js';
import '../anim/moves-extra.js';
import { drift } from '../anim/idles.js';
import { dust } from '../fx/fx.js';
import { PLAIN_PERSONA } from './persona.js';

export const PAGE = { idle: CLIPS.idle.fn, guard: CLIPS.guard.fn, run: CLIPS.run.fn, runArmed: CLIPS.runArmed.fn };
const toward = (a, t, w) => { w = Math.max(0, Math.min(1, w)); return [a[0] + (t[0] - a[0]) * w, a[1] + (t[1] - a[1]) * w]; };
// where a hand rests (today's ARMS, as [forward, up] from the pelvis, turned with the lean): f = his right (the near,
// sword hand), b = his left
export const REST = { hilt: [4.8, 2.6], scabbard: [3.4, 1.2], behind: [-3.2, 3.6], cross: [4.4, 10.6], sleeves: [4.4, 8], folded: [4.4, 1.6], pray: [6.2, 11],
  chin: [5.6, 15.4], hip: [.4, 3.6], clutch: [3, 6.4], fists: [7.4, 12.4], dangle: [.4, -4.4], trail: [-8.4, 2.6] };
const restAt = (p, k) => { const r = REST[k], s = Math.sin(p.lean), c = Math.cos(p.lean); return [p.pel[0] + r[0] * c + r[1] * s, p.pel[1] - r[0] * s + r[1] * c]; };
// the bearing: lean, bow, the hips' offset, the hat; then the hands go where the traits put them, by weight
export function bear(p, B) {
  p.lean += B.lean; p.head = (p.head || 0) + B.head; p.pel = [p.pel[0] + B.hx, p.pel[1] - B.hy]; if (B.hat) p.hatTilt = (p.hatTilt || 0) + B.hat;
  if (!(p.blade && p.blade.out)) { for (const k in B.f) p.hN = toward(p.hN, restAt(p, k), B.f[k]); for (const k in B.b) p.hF = toward(p.hF, restAt(p, k), B.b[k]); }
  return p;
}

// ---- idle: the page's breath with the persona's depth, pace, sway, bob, jitter, stance and knees
export function idleOf(I, t) {
  const per = I.period, b = Math.sin(t * TAU / (2.4 * per)), w = Math.sin(t * TAU / (4.8 * per) + .6), br = I.breath;
  const sw = I.sway * .8 * Math.sin(t * TAU / (4.8 * per)), jit = I.jitter * (.6 * Math.sin(t * TAU * 1.3) + .4 * Math.sin(t * TAU * 3.1 + 1)) * .7;
  return { pel: [.7 * w + sw + jit, H - 2 - .45 * br * (b + 1) / 2 - .2 * Math.abs(w) - 3 * I.knee - .8 * I.bob * (b + 1) / 2],
    lean: .13 + .03 * br * b - .02 * w + I.swayLean * Math.sin(t * TAU / (4.8 * per)), head: .07 + .025 * Math.sin(t * TAU / (2.4 * per) - .7), breath: (b + 1) / 2, hatTilt: 0,
    fN: [5.65 + 1.5 * I.legs, 1.5], fF: [-4.96 - 1.2 * I.legs, 1.5], hN: [1.8 + .3 * w, H - 1.5 + .4 * b * br], hF: [5.2 + .3 * w, H + 1.6 + .3 * b * br], elb: 'back', speed: 0,
    swing: .35 * Math.sin(t * TAU / (4.8 * per) - .4), blade: SH };
}
CLIPS.idle.fn = (a, t, dt) => { const P = a.persona; if (!P || (P.plain && !a.idler?.force && !a.generic)) return PAGE.idle(a, t, dt);
  return { p: drift(a, t, bear(idleOf(P.idle, t), P.idle)) }; };

// ---- guard: the blade out in both hands; the persona shapes only the body round it (lean, bow, knees, stance, breath)
export function guardOf(I, t, foe) { const per = I.period, br = I.breath, b = Math.sin(t * TAU / (2.1 * per) + (foe ? 1.3 : 0)), w = Math.sin(t * TAU / (3.7 * per));
  return { pel: [.45 * w, H - 2.3 - .4 * br * (b + 1) / 2 - 3 * I.knee], lean: .14 + .025 * br * b + I.lean, breath: (b + 1) / 2, head: .03 + .02 * b + I.head,
    fN: [5.5 + 1.5 * I.legs, 1.5], fF: [-4.6 - 1.2 * I.legs, 1.5], elb: 'back', blade: blade([8.8 + .3 * w, H + 4 + .45 * br * b - 3 * I.knee], .55 + .04 * b), speed: 0 }; }
CLIPS.guard.fn = (a, t, dt) => { const P = a.persona; if (!P || (P.plain && !a.generic)) return PAGE.guard(a, t, dt); return { p: guardOf(P.idle, t, a.foe) }; };

// ---- run: the page's contact / down / passing / up, with the persona's stride, lift, swing, bounce, heavy feet,
// rock, limp and wobble. The phase still runs on the ground covered, over the persona's stride, so the feet stay planted
export const strideOf = (v, K) => 5 * 10.5 * (.45 + .55 * Math.min(1, Math.max(v / 110, .05))) * K.stride;
export function runOf(s, p, K) { const sc = Math.min(1, Math.max(s, .05)), A = 10.5 * (.45 + .55 * sc) * K.stride, lift = 6.5 * (.45 + .55 * sc) * K.lift, lf = 1 - K.limp * .4;
  const foot = (q, a) => { q = ((q % 1) + 1) % 1; if (q < .38) return [lerp(.9 * a, -a, q / .38), 1.5];
    const u = (q - .38) / .62; return [-a + 1.9 * a * EZ.s(u), 1.5 + lift * Math.sin(Math.PI * u) * (1.25 - .55 * u)]; };
  const q2 = (((2 * p) % 1) + 1) % 1, bob = Math.sin(TAU * (q2 - .4)), ap = TAU * p, thud = Math.max(0, -bob) ** 3;
  const o = { pel: [.5 * Math.sin(TAU * q2 - 1), H - 2.6 + 1.2 * bob * sc * K.bounce - 1.8 * K.heavy * thud - 3 * K.knee - 1.5 * K.limp * Math.max(0, Math.sin(ap))],
    lean: .2 + .16 * sc + .06 * K.rock * Math.cos(2 * ap), head: -.1 - .08 * sc - .05 * bob, breath: 0, hatTilt: 0,
    fN: foot(p, A * lf), fF: foot(p + .5, A), hN: [2.5 - 6.5 * Math.cos(ap) * sc * K.swing, H + .4 + 3.4 * Math.max(0, -Math.cos(ap)) * sc * K.swing], hF: [4, H - .4 + .5 * bob], elb: 'back', speed: s,
    swing: 1.4 * Math.sin(ap) * sc, sayaTilt: .1 * sc, blade: SH };
  if (K.wobble) { o.roll = .12 * K.wobble * Math.sin(Math.PI * p); o.lean += .08 * K.wobble * Math.sin(Math.PI * p + 1); }
  return o; }
CLIPS.run.fn = (a, t, dt) => { const P = a.persona; if (!P || (P.plain && !a.generic)) return PAGE.run(a, t, dt);
  a.phase += a.v * dt / strideOf(a.v, P.run); const p = bear(runOf(a.v / 110, a.phase, P.run), P.run);
  if (a.out && a.flow) { const q = ((a.phase % .5) + .5) % .5; if (a.lastQ != null && a.lastQ > q && a.v > 60) { const f = hv(a.h), fo = .9 * 10.5; dust(a.W, a.x + f[0] * fo, a.z + f[1] * fo, 2 + Math.round(2 * P.run.heavy), { spd: 12, life: .3, up: 5, dir: a.h + Math.PI, spread: 1.4 }); } a.lastQ = q; }
  return { p, move: a.v * dt }; };
CLIPS.runArmed.fn = (a, t, dt) => { const P = a.persona; if (!P || (P.plain && !a.generic)) return PAGE.runArmed(a, t, dt);
  a.phase += a.v * dt / strideOf(a.v, P.run); const p = runOf(a.v / 110, a.phase, P.run), ap = TAU * a.phase;
  const g = [p.pel[0] - 1.5 + 1.2 * Math.cos(ap) * Math.min(1, a.v / 110), H + .8 + .4 * Math.sin(2 * ap)];
  p.blade = blade(g, -2.72, 0); p.hN = g; p.hF = [p.pel[0] + 4.5, H + 2.2];
  return { p: bear(p, { ...P.run, f: {}, b: {} }), move: a.v * dt }; };

// ---- walk (an addition): three fifths of the stride on the ground, the hips highest over the planted foot; the sword
// hand rests on the hilt (today's walk: hilt .6), the other on the saya, or both swing when unarmed
export const WALK = { A: 9, speed: 36 };
export const walkStride = K => 2 * WALK.A * K.stride / .6;
export function walkOf(p, K, armed) { const A = WALK.A * K.stride, lift = 3.4 * K.lift, lf = 1 - K.limp * .4, ap = TAU * p;
  const foot = (q, a) => { q = ((q % 1) + 1) % 1; if (q < .6) return [lerp(a, -a, q / .6), 1.5]; const u = (q - .6) / .4; return [-a + 2 * a * EZ.s(u), 1.5 + lift * Math.sin(Math.PI * u)]; };
  const q2 = (((2 * p) % 1) + 1) % 1, bob = Math.cos(TAU * (q2 - .6)), thud = Math.max(0, -Math.cos(TAU * (q2 - .1))) ** 4;
  const sw = 3.4 * K.swing, o = { pel: [.3 * Math.sin(TAU * q2), H - 2 + .55 * bob * K.bounce / .6 - 1.6 * K.heavy * thud - 3 * K.knee - 1.4 * K.limp * Math.max(0, Math.sin(ap))],
    lean: .1 + .06 * K.rock * Math.cos(2 * ap), head: .04 - .02 * bob, breath: 0, hatTilt: 0, fN: foot(p, A * lf), fF: foot(p + .5, A),
    hN: [1.8 - sw * Math.cos(ap), H - 1.4 + 1.1 * Math.max(0, -Math.cos(ap)) * K.swing], hF: armed ? [4.6, H + .4] : [1.8 + sw * Math.cos(ap), H - 1.4 + 1.1 * Math.max(0, Math.cos(ap)) * K.swing],
    elb: 'back', speed: .3, swing: .6 * Math.sin(ap), blade: SH };
  if (K.wobble) { o.roll = .14 * K.wobble * Math.sin(Math.PI * p); o.lean += .1 * K.wobble * Math.sin(Math.PI * p + 1); }
  return o; }
proc('walk', (a, t, dt) => { const K = (a.persona || PLAIN_PERSONA).walk; a.phase += a.v * dt / walkStride(K);
  return { p: bear(walkOf(a.phase, K, a.persona ? a.persona.armed : true), K), move: a.v * dt }; }, { loop: true, blend: .14 });
