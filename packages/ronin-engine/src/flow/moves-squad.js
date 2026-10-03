// ---- Moves the squad AI needs that the Animation Flow page does not have (additions, marked as such, like
// moves-extra.js; docs/squad-ai.md): the strafe (circling in guard, the feet stepping sideways), the block (the blade
// raised across, a parry window), the bow's draw and loose (the archer and a ranged companion), the tank's taunt
// (blade up, a stamp), downed (on one knee, leaning on the blade) and the lift (kneeling over a downed ally).
// All of them are built from the page's parts: its guard, its sheathed hand, its blade helper.
import { proc, keyed, H, TAU, EZ, clamp } from './flow.js';
import { blade, SH } from './moves.js';

// the strafe: the guard's upper body, the feet stepping sideways along a.mh (set by the body) while he faces a.h
proc('strafe', (a, t, dt) => { a.phase += Math.abs(a.v) * dt / 18; const q = TAU * a.phase, b = Math.sin(t * TAU / 2.1 + (a.foe ? 1.3 : 0));
  return { p: { pel: [.3 * Math.sin(q), H - 2.6 - .5 * Math.abs(Math.sin(q))], lean: .16 + .02 * b, head: .03, breath: (b + 1) / 2,
    fN: [5.5, 1.5 + 2.6 * Math.max(0, Math.sin(q))], fF: [-4.6, 1.5 + 2.6 * Math.max(0, -Math.sin(q))], elb: 'back',
    blade: blade([8.8, H + 4 + .4 * b], .55 + .04 * b), speed: 0 }, move: a.v * dt }; }, { loop: true, blend: .1 });

// the block: the blade snaps up across his head, held, then back to the guard (the parry window is the hold)
keyed('block', [
  { t: 0, e: 'o', pel: [0, H - 2.3], lean: .14, head: .03, fN: [5.5, 1.5], fF: [-4.6, 1.5], elb: 'back', blade: blade([8.8, H + 4], .55, 1) },
  { t: .07, e: 'o', pel: [-1.4, H - 3.4], lean: -.05, head: .12, fN: [6, 1.5], fF: [-5.4, 1.5], elb: 'down', blade: blade([5, H + 13], .12, 1) },
  { t: .42, e: 'io', pel: [-1.6, H - 3.6], lean: -.06, head: .14, fN: [6, 1.5], fF: [-5.4, 1.5], elb: 'down', blade: blade([5.2, H + 12.6], .16, 1) },
  { t: .6, e: 'io', pel: [0, H - 2.3], lean: .14, head: .03, fN: [5.5, 1.5], fF: [-4.6, 1.5], elb: 'back', blade: blade([8.8, H + 4], .55, 1) }], { blend: .03, next: 'guard' });

// the bow: the far (bow) hand up and forward, the near hand draws to the cheek, holds, looses ('loose'), follows through
const bowP = (fwd, draw, up = 0) => ({ pel: [-.4, H - 2.5], lean: .06, head: .02, fN: [6, 1.5], fF: [-5.2, 1.5], elb: 'back', blade: SH, speed: 0,
  hF: [5 + 6 * fwd, H + 5 + 6 * fwd + up], hN: [5 + 6 * fwd - 9 * draw, H + 5 + 6 * fwd + up + .6 * draw] });
keyed('aim', [
  { t: 0, e: 'io', ...bowP(0, 0) },
  { t: .18, e: 'io', ...bowP(1, .1) },
  { t: .52, e: 'h', ...bowP(1, 1) },
  { t: .6, e: 'o', ev: 'loose', ...bowP(1, 1.25, .4) },
  { t: .78, e: 'io', ...bowP(.8, .3) },
  { t: .95, e: 'io', ...bowP(0, 0) }], { blend: .05, next: 'idle' });

// the taunt: chest out, the blade raised point up, a stamp of the front foot ('taunt': the foes near him turn on him)
keyed('taunt', [
  { t: 0, e: 'io', pel: [0, H - 2.3], lean: .14, head: .03, fN: [5.5, 1.5], fF: [-4.6, 1.5], elb: 'back', blade: blade([8.8, H + 4], .55, 1) },
  { t: .2, e: 'i', pel: [-1, H - 1.4], lean: -.2, head: .22, fN: [6.5, 5.5], fF: [-4.6, 1.5], elb: 'down', blade: blade([4, H + 15], 1.62, 0), hF: [7, H + 6] },
  { t: .32, e: 'o', ev: 'taunt', pel: [1, H - 3.6], lean: -.12, head: .18, fN: [7, 1.5], fF: [-4.6, 1.5], elb: 'down', blade: blade([4.4, H + 15.5], 1.58, 0), hF: [8, H + 4] },
  { t: .62, e: 'io', pel: [.6, H - 3], lean: -.06, head: .1, fN: [7, 1.5], fF: [-4.6, 1.5], elb: 'down', blade: blade([4.6, H + 14.6], 1.5, 0), hF: [7, H + 3] },
  { t: .85, e: 'io', pel: [.4, H - 2.3], lean: .14, head: .03, fN: [7, 1.5], fF: [-4.6, 1.5], elb: 'back', blade: blade([9, H + 4], .55, 1) }], { blend: .05, next: 'guard' });

// downed: on one knee, leaning on the blade planted point down, breathing hard (the bleed-out)
proc('downed', (a, t) => { const b = Math.sin(t * TAU / 1.1), k = EZ.o(clamp(t / .35, 0, 1));
  return { p: { pel: [-1, H - 2.3 - 7.6 * k + .4 * b], lean: .14 + .32 * k + .03 * b, head: .03 + .3 * k, breath: (b + 1) / 2, fN: [6, 1.5], fF: [-6.5 + 1.5 * k, 1.5], kneeDir: [0, 1],
    elb: 'down', blade: blade([7.5, H - 9 + 4 * (1 - k)], -1.5 + 2 * (1 - k), 1), hF: [7, H - 8.4], speed: 0 } }; }, { loop: true, blend: .06, noLock: () => true });

// the lift: kneeling over a downed ally, both hands under his arm, the blade away
proc('lift', (a, t) => { const b = Math.sin(t * TAU / 1.6), k = EZ.o(clamp(t / .3, 0, 1));
  return { p: { pel: [0, H - 2.3 - 6.5 * k], lean: .14 + .5 * k, head: .2 * k, breath: (b + 1) / 2, fN: [6, 1.5], fF: [-6, 1.5], elb: 'down', blade: SH,
    hN: [8 + .6 * b, H - 9 + 2 * (1 - k)], hF: [9, H - 8 + 2 * (1 - k)], speed: 0 } }; }, { loop: true, blend: .08, noLock: () => true });
