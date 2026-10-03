// ---- The flowing moves, ported verbatim from the "Animation Flow" page (scratchpad af/moves.js; owner 2026-10-02:
// "these animations and flow style"). Poses are the page's side rig: pel / feet (fN near = his right, fF far = his left)
// / hands [forward, up] in rig px, lean / head in radians, the blade's grip and angle. Only the imports and a few exports are new (and
// K's blink and U's Sky Drop are left out: not in the core loop).
import { proc, keyed, evalKeys, H, TAU, lerp, clamp, EZ, hv, wrapA, rnd, FX } from './flow.js';

export const SH = { out: 0, g: [4.8, H + .4], ang: .5, two: 0 };           // the katana in the saya, the hand near the hilt
export const blade = (g, ang, two = 1, o = {}) => ({ out: 1, g, ang, two, ...o });
const sheathed = (g) => ({ out: 0, g, ang: .5, two: 0 });

// idle: breathing, a slow weight shift over the feet, the head a beat behind the chest
proc('idle', (a, t) => { const b = Math.sin(t * TAU / 2.4), w = Math.sin(t * TAU / 4.8 + .6);
  return { p: { pel: [.7 * w, H - 2 - .45 * (b + 1) / 2 - .2 * Math.abs(w)], lean: .13 + .03 * b - .02 * w, head: .07 + .025 * Math.sin(t * TAU / 2.4 - .7), breath: (b + 1) / 2, hatTilt: 0,
    fN: [5.65, 1.5], fF: [-4.96, 1.5], hN: [1.8 + .3 * w, H - 1.5 + .4 * b], hF: [5.2 + .3 * w, H + 1.6 + .3 * b], elb: 'back', speed: 0, swing: .35 * Math.sin(t * TAU / 4.8 - .4), blade: SH } }; }, { loop: true, blend: .12 });
// guard: the blade out in both hands, breathing
proc('guard', (a, t) => { const b = Math.sin(t * TAU / 2.1 + (a.foe ? 1.3 : 0)), w = Math.sin(t * TAU / 3.7);
  return { p: { pel: [.45 * w, H - 2.3 - .4 * (b + 1) / 2], lean: .14 + .025 * b, breath: (b + 1) / 2, head: .03 + .02 * b, fN: [5.5, 1.5], fF: [-4.6, 1.5], elb: 'back',
    blade: blade([8.8 + .3 * w, H + 4 + .45 * b], .55 + .04 * b), speed: 0 } }; }, { loop: true, blend: .1 });

// run: contact, down, passing, up. The phase is driven by distance, so the planted foot moves back exactly as fast as he moves forward
export function runPose(s, p) { return runP(s, p); }
function runP(s, p) { const sc = Math.min(1, Math.max(s, .05)), A = 10.5 * (.45 + .55 * sc), lift = 6.5 * (.45 + .55 * sc);
  const foot = q => { q = ((q % 1) + 1) % 1; if (q < .38) return [lerp(.9 * A, -A, q / .38), 1.5];
    const u = (q - .38) / .62; return [-A + 1.9 * A * EZ.s(u), 1.5 + lift * Math.sin(Math.PI * u) * (1.25 - .55 * u)]; };
  const q2 = (((2 * p) % 1) + 1) % 1, bob = Math.sin(TAU * (q2 - .4)), ap = TAU * p;
  return { pel: [.5 * Math.sin(TAU * q2 - 1), H - 2.6 + 1.2 * bob * sc], lean: .2 + .16 * sc, head: -.1 - .08 * sc - .05 * bob, breath: 0, hatTilt: 0,
    fN: foot(p), fF: foot(p + .5), hN: [2.5 - 6.5 * Math.cos(ap) * sc, H + .4 + 3.4 * Math.max(0, -Math.cos(ap)) * sc], hF: [4, H - .4 + .5 * bob], elb: 'back', speed: s, swing: 1.4 * Math.sin(ap) * sc, sayaTilt: .1 * sc, blade: SH };
}
export const strideOf = v => 5 * 10.5 * (.45 + .55 * Math.min(1, Math.max(v / 110, .05)));
proc('run', (a, t, dt) => { a.phase += a.v * dt / strideOf(a.v); const p = runP(a.v / 110, a.phase);
  if (a.out && a.flow) { const q = ((a.phase % .5) + .5) % .5; if (a.lastQ != null && a.lastQ > q && a.v > 60) { const f = hv(a.h), fo = .9 * 10.5; FX.dust(a.W, a.x + f[0] * fo, a.z + f[1] * fo, 2, { spd: 12, life: .3, up: 5, dir: a.h + Math.PI, spread: 1.4 }); } a.lastQ = q; }
  return { p, move: a.v * dt }; }, { loop: true, blend: .07 });

// start: dip, lean in, push off the back foot, then the run takes over at the speed he has
keyed('start', [
  { t: 0, e: 'io', pel: [0, H - 2.2], lean: .15, head: .06, fN: [5.6, 1.5], fF: [-5, 1.5], hN: [1.8, H - 1.5], hF: [5.2, H + 1.6], elb: 'back', speed: 0, blade: SH },
  { t: .07, e: 'i', pel: [-.8, H - 3.8], lean: .44, head: -.14, fN: [5.6, 1.5], fF: [-5.2, 1.5], hN: [-2, H + .6], hF: [3.4, H - 1.2], elb: 'back', speed: 0, blade: SH },
  { t: .14, e: 'l', pel: [2.4, H - 3], lean: .5, head: -.17, fN: [10, 5], fF: [-5.2, 1.5], hN: [6, H + 2.6], hF: [5.6, H - 1], elb: 'back', speed: .5, blade: SH },
], { blend: .05, next: a => { a.phase = .02; a.v = Math.max(a.v, 45); a.play('run', { blend: .06 }); } });

// stop: brake on the front foot, the feet skid, the body carries forward past the feet, settles
const STOPK = [
  { t: 0, e: 'o', pel: [1, H - 2.6], lean: .12, head: -.05, fN: [10, 1.5], fF: [-6, 3.5], hN: [6.5, H + 2.5], hF: [4, H - .4], elb: 'back', speed: 1, blade: SH },
  { t: .09, e: 'io', pel: [-1.2, H - 4.2], lean: -.08, head: .12, fN: [8.5, 1.5], fF: [-4.5, 1.5], hN: [6, H + 1.6], hF: [4, H - .4], elb: 'back', speed: .6, blade: SH },
  { t: .26, e: 'ob', pel: [1.4, H - 4.6], lean: .34, head: -.14, fN: [8.2, 1.5], fF: [-4.5, 1.5], hN: [3.5, H - .2], hF: [4.6, H - .6], elb: 'back', speed: 0, blade: SH },
  { t: .46, e: 'io', pel: [.5, H - 2.7], lean: .15, head: .06, fN: [8.2, 1.5], fF: [-4.5, 1.5], hN: [1.8, H - 1.5], hF: [5.2, H + 1.6], elb: 'back', speed: 0, blade: SH },
  { t: .75, e: 'io', pel: [.3, H - 2.2], lean: .14, head: .08, fN: [8.2, 1.5], fF: [-4.5, 1.5], hN: [1.8, H - 1.5], hF: [5.2, H + 1.6], elb: 'back', speed: 0, blade: SH }];
proc('stop', (a, t, dt) => { const o = a.co; if (o.v0 == null) o.v0 = a.v; const T = .26, vv = t < T ? o.v0 * (1 - t / T) ** 1.6 : 0; a.v = a.vt = vv;
  if (t < .2 && a.flow && rnd() < .55) { const f = hv(a.h), fo = 9; FX.dust(a.W, a.x + f[0] * fo, a.z + f[1] * fo, 1, { spd: 26, dir: a.h, spread: 1.2, life: .4, up: 8 }); }
  return { p: evalKeys(STOPK, t).p, move: vv * dt }; }, { dur: .75, next: 'idle', blend: .05, noLock: a => a.ct < .2 });

// the 180 skid: brake, pivot through the facings between, push off the other way
const SKIDK = [
  { t: 0, e: 'o', pel: [1, H - 2.8], lean: .1, head: -.04, fN: [9.5, 1.5], fF: [-5.5, 3], hN: [6.5, H + 2.5], hF: [4, H - .4], elb: 'back', speed: 1, blade: SH },
  { t: .1, e: 'io', pel: [-1, H - 4.6], lean: -.12, head: .14, fN: [7, 1.5], fF: [-4, 1.5], hN: [6, H + 2], hF: [4, H - .4], elb: 'back', speed: .4, blade: SH },
  { t: .2, e: 'i', pel: [0, H - 5], lean: .25, head: 0, fN: [4, 1.5], fF: [-4, 1.5], hN: [3, H], hF: [4, H - .4], elb: 'back', speed: 0, blade: SH },
  { t: .28, e: 'l', pel: [2, H - 3.6], lean: .55, head: -.18, fN: [9, 4.5], fF: [-6, 1.5], hN: [-2, H + 1.5], hF: [4, H - .4], elb: 'back', speed: .5, blade: SH }];
proc('skid', (a, t, dt) => { const o = a.co; if (!o.init) { o.init = 1; o.v0 = a.v; a.mh = a.h; }
  let vv = 0; if (t < .13) vv = o.v0 * (1 - t / .13) ** 1.5; else if (a.mh != null) { a.mh = null; a.ht = o.h1; a.turn = 26; }
  a.v = vv; if (t < .14 && a.flow && rnd() < .7) { const f = hv(a.mh ?? a.h); FX.dust(a.W, a.x + f[0] * 8, a.z + f[1] * 8, 1, { spd: 30, dir: a.mh ?? a.h, spread: 1.3, life: .45, up: 9 }); }
  return { p: evalKeys(SKIDK, t).p, move: vv * dt }; }, { dur: .28, blend: .04, noLock: a => a.ct < .27, next: a => { a.turn = 9; a.v = 50; a.vt = a.co.v1 ?? 115; a.phase = .02; a.play('run', { blend: .05 }); } });

// the roll: dive, tumble over the shoulder, come up already moving
function tuck(th, cf, cu, open, bl) { const up = [Math.sin(th), Math.cos(th)], fw = [Math.cos(th), -Math.sin(th)], pel = [cf - up[0] * 6.2, cu - up[1] * 6.2];
  const at = (a, b) => [pel[0] + fw[0] * a + up[0] * b, pel[1] + fw[1] * a + up[1] * b];
  const p = { pel, lean: th, head: -.55 + .4 * open, breath: 0, fN: at(4 + 3 * open, -4.5 - 7 * open), fF: at(2.5 + 2 * open, -5 - 6 * open), hN: at(7, 3), hF: at(6, 2), kneeDir: [fw[0] + up[0] * .3, fw[1] + up[1] * .3], elb: [-fw[0], -fw[1]], speed: 1, hatTilt: 0, blade: SH };
  if (bl) { const g = at(7.5, 4); p.blade = blade(g, th + 2.4, 0); p.hN = g; }
  return p; }
proc('roll', (a, t, dt) => { const o = a.co, T = .44, dist = o.dist ?? 50, u = clamp(t / T, 0, 1), bl = !!o.blade;
  const r = dist * (.62 * u + .38 * (1 - (1 - u) ** 2)); let p;
  if (u < .14) { const k = EZ.o(u / .14); p = tuck(.45 + .55 * k, 2 + 4 * k, H - 6 - 6 * k + 6.2, 1 - k * .7, bl); }
  else if (u < .8) { const k = (u - .14) / .66, th = 1 + (TAU - .7) * EZ.s(k) * .92 + k * (TAU - .7) * .08; p = tuck(th, 6, 9 + 2.5 * Math.sin(Math.PI * k), .3 * (1 - Math.sin(Math.PI * k)), bl); }
  else { const k = EZ.o((u - .8) / .2); p = tuck(wrapA(TAU - .7 + .25) + 0 * k, 6 - 2 * k, 10 + 3 * k, .3 + .5 * k, bl); p.lean = lerp(-.45 + TAU - TAU, .5, k); }
  p.lean = wrapA(p.lean); const v0 = a.lastRr ?? r; a.lastRr = r;
  if (a.flow && t > .06 && t < .38 && rnd() < .35) FX.dust(a.W, a.x, a.z, 1, { spd: 14, life: .35, up: 6 });
  a.v = (r - v0) / dt;
  p.hatAbs = p.lean * .9;
  return { p, move: r - v0 }; }, { dur: .44, blend: .05, enter: a => { a.lastRr = null; }, noLock: a => a.ct < .4 });

// J1: the iai draw. Sink, the hilt pulled forward, the blade leaves the saya low and rises through the cut, carries over, settles
keyed('J1', [
  { t: 0, e: 'io', pel: [0, H - 2.4], lean: .2, head: .02, fN: [5.6, 1.5], fF: [-5, 1.5], hN: [4.8, H + .4], hF: [2.4, H - 1.2], elb: 'back', blade: SH, sayaTilt: .05, speed: 0 },
  { t: .08, e: 'i', pel: [-1.2, H - 4.2], lean: .5, head: -.28, fN: [5.6, 1.5], fF: [-5.8, 1.5], hN: [4.1, H - 1.3], hF: [1, H - 3.2], elb: 'back', blade: sheathed([4.1, H - 1.3]), sayaTilt: .2 },
  { t: .12, e: 'i', pel: [1, H - 4.4], lean: .58, head: -.3, fN: [8.5, 4.5], fF: [-5.8, 1.5], hN: [10, H + .5], hF: [.5, H - 3.4], elb: 'back', blade: blade([10, H + .5], -2.7, 0, { vis: 9 }), sayaTilt: .25 },
  { t: .155, e: 'o', pel: [3, H - 4.6], lean: .55, head: -.26, fN: [11.5, 1.5], fF: [-5.8, 1.5], hF: [-1.5, H - 1.5], elb: 'back', blade: blade([13.5, H + 2], -.3, 0, { vis: 30 }), sayaTilt: .2 },
  { t: .185, e: 'o', ev: 'hit', pel: [4, H - 4], lean: .42, head: -.18, fN: [11.5, 1.5], fF: [-5.8, 1.5], hF: [-2, H - .5], elb: 'back', blade: blade([13.5, H + 9.5], .95, 0), sayaTilt: .1 },
  { t: .215, e: 'o', pel: [4.5, H - 3], lean: .16, head: 0, fN: [11.5, 1.5], fF: [-5.8, 1.5], elb: 'back', blade: blade([9, H + 15], 2.1, 1) },
  { t: .27, e: 'ob', pel: [4.2, H - 2.6], lean: .09, head: .06, fN: [11.5, 1.5], fF: [-5.8, 1.5], elb: 'back', blade: blade([7.5, H + 15.5], 2.35, 1) },
  { t: .40, e: 'io', pel: [4, H - 2.9], lean: .14, head: .04, fN: [11.5, 1.5], fF: [-3, 4], elb: 'back', blade: blade([8, H + 14.5], 2.25, 1) },
  { t: .48, e: 'io', pel: [4.4, H - 2.6], lean: .14, head: .04, fN: [11.5, 1.5], fF: [-.5, 1.5], elb: 'back', blade: blade([10, H + 10], 1.4, 1) },
  { t: .72, e: 'io', pel: [4.6, H - 2.3], lean: .14, head: .03, fN: [11.5, 1.5], fF: [-.5, 1.5], elb: 'back', blade: blade([13.4, H + 4], .55, 1) }], { blend: .05, next: 'guard' });
// J2: from J1's high follow-through, a falling diagonal. No return to neutral: its first key is J1's last pose
keyed('J2', [
  { t: 0, e: 'io', pel: [0, H - 2.8], lean: .12, head: .04, fN: [7.3, 1.5], fF: [-10, 1.5], elb: 'back', blade: blade([3.4, H + 15.5], 2.35, 1) },
  { t: .06, e: 'i', pel: [-.5, H - 3], lean: .03, head: .1, fN: [7.3, 1.5], fF: [-6, 4], elb: 'back', blade: blade([2, H + 15], 2.75, 1) },
  { t: .11, e: 'i', pel: [1.5, H - 3.8], lean: .3, head: -.05, fN: [9, 4], fF: [-3, 1.5], elb: 'back', blade: blade([6, H + 14], 1.7, 1) },
  { t: .145, e: 'o', ev: 'hit', pel: [3.5, H - 4.6], lean: .58, head: -.2, fN: [12, 1.5], fF: [-3, 1.5], elb: 'back', blade: blade([10.5, H + 5], -.35, 1) },
  { t: .18, e: 'o', pel: [4.2, H - 5], lean: .66, head: -.24, fN: [12, 1.5], fF: [-3, 1.5], elb: 'down', blade: blade([8.5, H - 2], -1.45, 1) },
  { t: .25, e: 'ob', pel: [4, H - 4.4], lean: .55, head: -.18, fN: [12, 1.5], fF: [-3, 1.5], elb: 'down', blade: blade([9, H - 1], -1.2, 1) },
  { t: .40, e: 'io', pel: [3.8, H - 4], lean: .48, head: -.12, fN: [12, 1.5], fF: [-3, 1.5], elb: 'down', blade: blade([9.5, H], -1.1, 1) },
  { t: .62, e: 'io', pel: [4.4, H - 2.4], lean: .14, head: .02, fN: [12, 1.5], fF: [.5, 3.5], elb: 'back', blade: blade([13, H + 4], .55, 1) },
  { t: .74, e: 'io', pel: [4.5, H - 2.3], lean: .14, head: .02, fN: [12, 1.5], fF: [1, 1.5], elb: 'back', blade: blade([13.3, H + 4], .55, 1) }], { blend: .04, next: 'guard' });
// J3: the heavy. From J2's low blade: a long wind-up overhead, a step-lunge, the chop, the blade into the floor, a heavy recovery
keyed('J3', [
  { t: 0, e: 'io', pel: [0, H - 4.2], lean: .5, head: -.12, fN: [8, 1.5], fF: [-7, 1.5], elb: 'down', blade: blade([5.5, H - .5], -1.15, 1) },
  { t: .11, e: 'io', pel: [-2, H - 2.4], lean: -.1, head: .12, fN: [6.5, 4], fF: [-7, 1.5], elb: 'back', blade: blade([-1, H + 14], 2.5, 1) },
  { t: .19, e: 'i', pel: [-2.4, H - 2.2], lean: -.15, head: .14, fN: [7.5, 4.5], fF: [-7, 1.5], elb: 'back', blade: blade([-1.5, H + 15], 2.68, 1) },
  { t: .235, e: 'i', pel: [3, H - 4], lean: .45, head: -.1, fN: [16, 6], fF: [-7, 1.5], elb: 'back', blade: blade([5, H + 16], 1.55, 1) },
  { t: .265, e: 'o', ev: 'hit', pel: [9, H - 6.8], lean: .8, head: -.25, fN: [19, 1.5], fF: [-4, 2.6], elb: 'down', blade: blade([16, H + 3], -.8, 1) },
  { t: .305, e: 'o', ev: 'impact', pel: [9.6, H - 8], lean: .86, head: -.3, fN: [19, 1.5], fF: [-3, 1.5], elb: 'down', blade: blade([15, H - 6.5], -1.45, 1) },
  { t: .56, e: 'io', pel: [9.4, H - 7.4], lean: .8, head: -.24, fN: [19, 1.5], fF: [-3, 1.5], elb: 'down', blade: blade([15, H - 6.2], -1.42, 1) },
  { t: .7, e: 'io', pel: [9.6, H - 5], lean: .5, head: -.1, fN: [19, 1.5], fF: [2, 3.5], elb: 'down', blade: blade([16, H - 1], -1, 1) },
  { t: .95, e: 'io', pel: [10.2, H - 2.3], lean: .14, head: .03, fN: [19, 1.5], fF: [4, 1.5], elb: 'back', blade: blade([19, H + 4], .55, 1) }], { blend: .04, next: 'guard' });
// run into attack: the run's speed carries into a long low lunge; the draw and the cut happen on the plant
keyed('lunge', [
  { t: 0, e: 'o2', pel: [0, H - 2.6], lean: .36, head: -.14, fN: [5, 3], fF: [-6, 1.5], hN: [2, H + 1], hF: [3.5, H - .4], elb: 'back', blade: SH, speed: 1 },
  { t: .07, e: 'o2', pel: [5, H - 3.6], lean: .6, head: -.22, fN: [14, 5], fF: [-6, 1.5], hN: [9.5, H + 1], hF: [6.4, H - 2.4], elb: 'back', blade: sheathed([9.5, H + 1]), sayaTilt: .25 },
  { t: .11, e: 'i', pel: [8, H - 4.8], lean: .7, head: -.26, fN: [18, 3], fF: [-6, 1.5], hN: [15, H + 1.5], hF: [8.6, H - 3.6], elb: 'back', blade: blade([15, H + 1.5], -2.6, 0, { vis: 9 }), sayaTilt: .25 },
  { t: .15, e: 'o', ev: 'hit', pel: [11, H - 6.4], lean: .78, head: -.3, fN: [20, 1.5], fF: [-4, 2.6], hF: [7, H - 3], elb: 'back', blade: blade([22, H + 5], .1, 0, { vis: 30 }) },
  { t: .19, e: 'o', pel: [12.2, H - 6], lean: .6, head: -.24, fN: [20, 1.5], fF: [-3, 1.5], elb: 'back', blade: blade([19.5, H + 13], 1.5, 0) },
  { t: .27, e: 'ob', pel: [12.6, H - 5.2], lean: .42, head: -.1, fN: [20, 1.5], fF: [-3, 1.5], elb: 'back', blade: blade([17, H + 15], 2.1, 1) },
  { t: .46, e: 'io', pel: [12.8, H - 4.6], lean: .32, head: -.04, fN: [20, 1.5], fF: [4, 3.5], elb: 'back', blade: blade([17.5, H + 13], 1.9, 1) },
  { t: .56, e: 'io', pel: [13, H - 3.4], lean: .2, head: 0, fN: [20, 1.5], fF: [6, 1.5], elb: 'back', blade: blade([19, H + 9], 1.2, 1) },
  { t: .82, e: 'io', pel: [13.2, H - 2.3], lean: .14, head: .03, fN: [20, 1.5], fF: [6, 1.5], elb: 'back', blade: blade([22, H + 4], .55, 1) }], { blend: .05, next: 'guard' });

// the samurai: a hit, a recoil, two stagger steps back, a settle that overshoots
keyed('recoil', [
  { t: 0, e: 'o', pel: [0, H - 2.3], lean: .14, head: .03, fN: [5.5, 1.5], fF: [-4.6, 1.5], elb: 'back', blade: blade([8.8, H + 4], .55, 1) },
  { t: .035, e: 'o', pel: [-3, H - 2.6], lean: -.38, head: .5, fN: [5.5, 1.5], fF: [-4.6, 1.5], hF: [-5, H + 3], elb: 'back', blade: blade([3.5, H + 8], 1.25, 0) },
  { t: .12, e: 'o', pel: [-6, H - 3.2], lean: -.26, head: .32, fN: [5.5, 1.5], fF: [-11, 4], hF: [-4, H + 1], elb: 'back', blade: blade([1.5, H + 7], 1.15, 0) },
  { t: .2, e: 'io', pel: [-8, H - 4], lean: -.05, head: .15, fN: [3, 3.5], fF: [-12, 1.5], elb: 'back', blade: blade([.5, H + 5], .9, 1) },
  { t: .3, e: 'io', pel: [-8.5, H - 3], lean: .12, head: .04, fN: [-2, 1.5], fF: [-12, 1.5], elb: 'back', blade: blade([-.5, H + 4.6], .7, 1) },
  { t: .55, e: 'io', pel: [-7.6, H - 2.3], lean: .16, head: .02, fN: [-2, 1.5], fF: [-12, 1.5], elb: 'back', blade: blade([1.2, H + 4], .55, 1) }], { blend: .02, next: 'guard' });
// a heavy hit: thrown back further, down on one knee, up again
keyed('knock', [
  { t: 0, e: 'o', pel: [0, H - 2.3], lean: .14, head: .03, fN: [5.5, 1.5], fF: [-4.6, 1.5], elb: 'back', blade: blade([8.8, H + 4], .55, 1) },
  { t: .04, e: 'o', pel: [-5, H - 2.4], lean: -.5, head: .6, fN: [4, 2.6], fF: [-4.6, 1.5], hF: [-7, H + 4], elb: 'back', blade: blade([1, H + 10], 1.6, 0) },
  { t: .2, e: 'o', pel: [-12, H - 4], lean: -.35, head: .4, fN: [-2, 4], fF: [-16, 1.5], hF: [-12, H + 2], elb: 'back', blade: blade([-6, H + 8], 1.4, 0) },
  { t: .34, e: 'io', pel: [-16, H - 9], lean: .3, head: .2, fN: [-9, 1.5], fF: [-19, 1.5], hF: [-12, H - 6], elb: 'down', blade: blade([-9, H - 4], -.2, 0) },
  { t: .8, e: 'io', pel: [-16, H - 8.4], lean: .38, head: .12, fN: [-9, 1.5], fF: [-19, 1.5], hF: [-12, H - 6], elb: 'down', blade: blade([-8.5, H - 3], 0, 0) },
  { t: 1.05, e: 'io', pel: [-15.4, H - 3], lean: .2, head: .04, fN: [-9, 1.5], fF: [-19, 1.5], elb: 'back', blade: blade([-7.5, H + 3.6], .5, 1) },
  { t: 1.2, e: 'io', pel: [-15, H - 2.3], lean: .14, head: .02, fN: [-9, 1.5], fF: [-19, 1.5], elb: 'back', blade: blade([-6.2, H + 4], .55, 1) }], { blend: .02, next: 'guard' });
// a death: the hit, the knees go, he falls forward and stays
keyed('die', [
  { t: 0, e: 'o', pel: [0, H - 2.3], lean: .14, head: .03, fN: [5.5, 1.5], fF: [-4.6, 1.5], elb: 'back', blade: blade([8.8, H + 4], .55, 1) },
  { t: .05, e: 'o', pel: [-3, H - 2.8], lean: -.4, head: .55, fN: [5.5, 1.5], fF: [-4.6, 1.5], hN: [2, H + 8], hF: [-4, H + 6], elb: 'back', blade: blade([3, H + 8], 1.7, 0) },
  { t: .3, e: 'io', pel: [-2, H - 8], lean: .35, head: .6, fN: [5, 1.5], fF: [-6, 3.5], hN: [5, H - 8], hF: [3, H - 9], elb: 'down', blade: blade([5, H - 9], -1.3, 0) },
  { t: .52, e: 'i', pel: [-1, H - 12], lean: .9, head: .7, fN: [3, 1.5], fF: [-7, 1.5], hN: [7, 3], hF: [6, 2], elb: 'down', blade: blade([7, 3], -.2, 0) },
  { t: .68, e: 'ob', pel: [0, 4.8], lean: 1.45, head: .9, fN: [-3, 1.5], fF: [-7, 1.5], hN: [11, 1.5], hF: [8, 1.5], elb: 'down', blade: blade([12, 1.5], .1, 0) },
  { t: 1.5, e: 'h', pel: [0, 4.5], lean: 1.48, head: .92, fN: [-3, 1.5], fF: [-7, 1.5], hN: [11, 1.5], hF: [8, 1.5], elb: 'down', blade: blade([12, 1.5], .1, 0) }], { blend: .02, noLock: a => a.ct > .45 });
// the samurai's cut: a long telegraph (he glows red), then a falling cut with a step
keyed('fcut', [
  { t: 0, e: 'io', pel: [0, H - 2.3], lean: .14, head: .03, fN: [5.5, 1.5], fF: [-4.6, 1.5], elb: 'back', blade: blade([8.8, H + 4], .55, 1) },
  { t: .3, e: 'io', ev: 'tele', pel: [-1.5, H - 2.4], lean: -.1, head: .12, fN: [5, 3.5], fF: [-4.6, 1.5], elb: 'back', blade: blade([-.5, H + 15], 2.6, 1) },
  { t: .4, e: 'i', pel: [-1.8, H - 2.4], lean: -.12, head: .12, fN: [5.5, 3.8], fF: [-4.6, 1.5], elb: 'back', blade: blade([-.8, H + 15.3], 2.65, 1) },
  { t: .46, e: 'i', pel: [3, H - 3.6], lean: .35, head: -.05, fN: [12, 4], fF: [-4.6, 1.5], elb: 'back', blade: blade([6, H + 15], 1.6, 1) },
  { t: .5, e: 'o', ev: 'strike', pel: [6, H - 4.8], lean: .65, head: -.2, fN: [14, 1.5], fF: [-4.6, 1.5], elb: 'down', blade: blade([14, H + 3], -.5, 1) },
  { t: .55, e: 'ob', pel: [6.6, H - 5.2], lean: .7, head: -.24, fN: [14, 1.5], fF: [-4.6, 1.5], elb: 'down', blade: blade([11, H - 3], -1.4, 1) },
  { t: .8, e: 'io', pel: [6.4, H - 4.4], lean: .55, head: -.15, fN: [14, 1.5], fF: [0, 3], elb: 'down', blade: blade([11.5, H - 2], -1.25, 1) },
  { t: 1.1, e: 'io', pel: [7, H - 2.3], lean: .14, head: .03, fN: [14, 1.5], fF: [2, 1.5], elb: 'back', blade: blade([15.8, H + 4], .55, 1) }], { blend: .05, next: 'guard' });

// sheathe: the flick (chiburi), a beat, the tip finds the mouth of the saya, a slow slide home, the click, the hands let go
proc('sheathe', (a, t) => {
  const pel = [.2, H - 2.8], tilt = .1, mouth = [pel[0] + 2.2, pel[1] + 1.2], ang = Math.PI + .32 - tilt, d = [Math.cos(ang), Math.sin(ang)], ins = vis => [mouth[0] - d[0] * vis, mouth[1] - d[1] * vis];
  const G = [{ t: 0, g: [8.8, H + 4], ang: .55, two: 1 }, { t: .13, g: [11, H + 1], ang: -1.35, two: 0 }, { t: .2, g: [10.6, H + 1.4], ang: -1.2, two: 0 }, { t: .5, g: [10.4, H + 1.2], ang: -1.22, two: 0 },
    { t: .7, g: ins(15), ang: ang - TAU, two: 0, vis: 15 }, { t: 1.02, g: ins(1.6), ang: ang - TAU, two: 0, vis: 1.6 }];
  const E = ['o', 'ob', 'io', 'io', 'io'];
  let i = 0; while (i + 1 < G.length && G[i + 1].t <= t) i++;
  const A = G[i], B = G[Math.min(i + 1, G.length - 1)], u = A === B ? 0 : EZ[E[i]](clamp((t - A.t) / (B.t - A.t), 0, 1));
  const g = [lerp(A.g[0], B.g[0], u), lerp(A.g[1], B.g[1], u)], an = lerp(A.ang, B.ang, u), vis = lerp(A.vis ?? 30, B.vis ?? 30, u);
  const out = t < 1.12, rel = clamp((t - 1.12) / .3, 0, 1), re = EZ.io(rel);
  const k = clamp(t / .13, 0, 1), b = Math.sin(t * TAU / 2.4);
  const p = { pel: [pel[0], pel[1] - .4 * EZ.o(k) + (t > .5 ? .3 * b : 0) + (rel > 0 ? .6 * re : 0)], lean: .18 + .06 * EZ.o(k) - .04 * re, head: .05 - .05 * EZ.o(k) + (t > .5 && t < 1.02 ? -.08 : 0) + .06 * re, breath: t > .5 ? (b + 1) / 2 : 0,
    fN: [5.6, 1.5], fF: [-4.9, 1.5], elb: 'back', sayaTilt: tilt * (1 - re), speed: 0,
    hF: t < .13 ? [lerp(5.2, mouth[0], k), lerp(H + 3, mouth[1] + .4, k)] : [mouth[0] - .3, mouth[1] + .4 - (rel > 0 ? 0 : 0)] };
  if (out) p.blade = { out: 1, g, ang: an, two: i === 0 && u < .5 ? 1 : 0, vis }; else { p.blade = SH; p.hN = [lerp(mouth[0] + 2.6, 1.8, re), lerp(mouth[1] + 1.6, H - 1.5, re)]; p.hF = [lerp(mouth[0], 5.2, re), lerp(mouth[1] + .4, H + 1.6, re)]; }
  if (out) p.hN = g;
  if (t >= 1.02 && !a.co.clicked) { a.co.clicked = 1; a.ev('click'); }
  return { p }; }, { dur: 1.6, blend: .06, next: 'idle' });
