// ---- Moves the Animation Flow page does not have, for the rest of today's game carried into the slice (marked as
// additions, like moves-extra.js): the item interactions (pray, take, read, the seal's cut is J1), the quick-slot uses
// (throw the static bomb, raise the talisman, hone on the whetstone, kneel with the incense), Harvest (one knee, both
// hands out over the fallen) and the party's: a companion cut down (on a knee, a hand on the floor, breathing hard),
// him lifting them, them getting up. Same rig and units as moves.js (pel / feet / hands [forward, up] in rig px).
import { keyed, proc, H, TAU } from './flow.js';
import { SH, blade } from './moves.js';

const STAND = { pel: [0, H - 2.3], lean: .14, head: .03, fN: [5.5, 1.5], fF: [-4.6, 1.5], elb: 'back', blade: SH };
const KNEEL = { pel: [-1, H - 8.6], lean: .32, head: .2, fN: [6.2, 1.5], fF: [-7.4, 1.5], elb: 'down', blade: SH };
const k = (t, o, e = 'io') => ({ t, e, ...STAND, ...o });
const kn = (t, o, e = 'io') => ({ t, e, ...KNEEL, ...o });

// pray at the shrine: hands meet at the chest, the head bows, a breath, up again (0.9 s)
keyed('pray', [k(0, {}), k(.18, { hN: [4.2, H + 8.6], hF: [4.6, H + 8.9], head: .2 }), k(.32, { hN: [4.4, H + 8.8], hF: [4.8, H + 9.1], head: .42, lean: .2 }),
  k(.7, { hN: [4.4, H + 8.6], hF: [4.8, H + 8.9], head: .38, lean: .2 }), k(.9, {})], { blend: .1, next: 'idle' });
// take (the grave weapon): down to it, the hand closes, up with it (0.7 s)
keyed('take', [k(0, {}), k(.22, { pel: [1, H - 6.5], lean: .6, head: .3, hN: [10, H - 8], hF: [7, H - 4] }), k(.36, { pel: [1, H - 6.8], lean: .62, head: .3, hN: [10, H - 8.6], hF: [7, H - 4] }),
  k(.56, { hN: [6, H + 6], hF: [4, H + 2], head: -.05 }), k(.7, {})], { blend: .08, next: 'idle' });
// read the rift tablet: a step in, the hands up on the stone, the head down and still (1.0 s)
keyed('read', [k(0, {}), k(.2, { hN: [9, H + 7], hF: [9.4, H + 6.2], head: .3, lean: .22 }), k(.85, { hN: [9.2, H + 7], hF: [9.6, H + 6.2], head: .36, lean: .24 }), k(1.0, {})], { blend: .1, next: 'idle' });
// the quick slots: each use under a second (today's game: the whetstone shortened to 0.8 s)
keyed('throw', [k(0, {}), k(.14, { pel: [-1.4, H - 2.8], lean: -.05, hN: [-6, H + 9], head: -.1 }), k(.26, { pel: [2, H - 2.6], lean: .4, hN: [10, H + 6], head: .02, ev: 'use' }), k(.5, {})], { blend: .06, next: 'idle' });
keyed('raise', [k(0, {}), k(.16, { hN: [3, H + 16], hF: [4, H + 6], head: -.25, lean: .02 }), k(.3, { hN: [3.2, H + 17], hF: [4, H + 6], head: -.3, lean: 0, ev: 'use' }), k(.55, {})], { blend: .06, next: 'idle' });
keyed('hone', [k(0, { blade: blade([7, H + 3], .25, 0) }), k(.2, { blade: blade([7, H + 3], .2, 0), hF: [9, H + 4.2] }), k(.45, { blade: blade([7, H + 3], .2, 0), hF: [17, H + 6], ev: 'use' }),
  k(.65, { blade: blade([7.5, H + 3.4], .3, 0), hF: [10, H + 4.6] }), k(.8, { blade: blade([8.8, H + 4], .55, 1) })], { blend: .06, next: 'guard' });
keyed('incense', [k(0, {}), kn(.25, { hN: [6, H - 4], hF: [6.4, H - 3.6] }), kn(.4, { hN: [6.4, H - 6], hF: [6.8, H - 5.6], ev: 'use' }), kn(.62, { hN: [4, H - 2], hF: [4.4, H - 1.6] }), k(.85, {})], { blend: .08, next: 'idle' });

// Harvest: down on one knee, both hands out over the fallen, the light streaming into him; held while E is
proc('harvest', (a, t) => { const b = Math.sin(t * TAU / 1.1), dn = Math.min(1, t / .22), m = (u, v) => u + (v - u) * dn;
  return { p: { pel: [m(0, -1), m(H - 2.3, H - 8.6) + .25 * b * dn], lean: m(.14, .42), head: m(.03, .32), fN: [6.2, 1.5], fF: [m(-4.6, -7.4), 1.5], elb: 'down',
    hN: [m(4, 10.5), m(H, H - 5 + .5 * b)], hF: [m(4, 9.6), m(H, H - 3.8 + .5 * b)], blade: SH, speed: 0 } }; }, { loop: true, blend: .1 });

// a companion cut down: knocked to a knee, then held there, a hand on the floor, the head hanging, breathing hard
keyed('fall', [k(0, { blade: blade([8.8, H + 4], .55, 1) }), k(.06, { pel: [-3, H - 2.6], lean: -.4, head: .5, hF: [-5, H + 6], blade: blade([2, H + 8], 1.6, 0) }),
  kn(.32, { hN: [8, 1.6], hF: [3, H - 6], head: .5, lean: .5, blade: blade([10, 2], -.1, 0) })], { blend: .02, next: 'downed' });
proc('downed', (a, t) => { const b = Math.sin(t * TAU / .9);
  return { p: { ...KNEEL, lean: .5 + .04 * b, head: .5 + .05 * b, breath: (b + 1) / 2, hN: [8, 1.6], hF: [3, H - 6 + .4 * b], blade: blade([10, 2], -.1, 0), speed: 0 } }; }, { loop: true, blend: .1 });
// him lifting them: a bend, a hand down, the pull up (held while E is held)
proc('lift', (a, t) => { const b = Math.sin(t * TAU / .7) * Math.min(1, t / .3);
  return { p: { ...STAND, pel: [.5, H - 5.5 + .3 * b], lean: .62, head: .25, fN: [6.5, 1.5], fF: [-5.4, 1.5], hN: [11, H - 6 + .6 * b], hF: [10, H - 4 + .6 * b], speed: 0 } }; }, { loop: true, blend: .1 });
// back on their feet
keyed('rise', [kn(0, { hN: [8, 1.6], hF: [3, H - 6], head: .5, lean: .5 }), kn(.2, { hN: [6, H - 6], head: .3 }), k(.55, { blade: blade([8.8, H + 4], .55, 1) })], { blend: .04, next: 'guard' });
// dead for good: the downed body lets go and lies still
keyed('expire', [kn(0, { hN: [8, 1.6], hF: [3, H - 6], head: .5, lean: .5 }), kn(.3, { pel: [3, H - 13], lean: 1.15, head: .4, hN: [12, 1.6], hF: [9, 2], fF: [-6, 1.5] }, 'i'),
  kn(1.2, { pel: [3, H - 14.5], lean: 1.4, head: .2, hN: [13, 1.4], hF: [10, 1.6], fF: [-6, 1.5] })], { blend: .04 });
