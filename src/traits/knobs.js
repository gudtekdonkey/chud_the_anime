import { HILT } from '../rig/pose.js';

// ---- The knobs a personality turns. BASE is the plain ronin as he is today; a trait only nudges these numbers ----
// Every character on the rig (the ronin, and later the samurai) gets its idle, walk and run from BASE plus its traits.
// Angles are the rig's radians (see rig/pose.js); hx / hy / hat are pixels.
export const BASE = {
  idle: {
    lean: .04, chest: 0, hx: 0, hy: 0, bow: 0, hat: 0, dim: 0,
    legs: 1,          // stance width: 1 is his feet a hair apart, 3 is a wide planted stance
    knee: 0,          // sinks into the knees; the feet stay planted, so the hips drop
    fa: [.12, .18], ba: [-.08, .12],
    breath: 1,        // how deep each breath lifts the chest
    armBreath: .03,   // how far the hands drift with it
    period: 16 / 6,   // one breath, in seconds
    fps: 6,
    bob: 0,           // the hips dip with each breath, px
    sway: 0,          // the hips drift forward and back over two breaths, px
    swayLean: 0,      // ...and the body tilts with them
    jitter: 0,        // small restless shifts, px
    flutter: 1,       // how much the mantle stirs
    every: 2,         // breaths between fidgets
    f: {}, b: {},     // front and back hand targets (see ARMS), by weight
  },
  // one stride cycle is 8 frames; fps sets the cadence and speed how fast he covers ground, px/s
  // stride: the owner lengthened it on purpose (2026-10-02, N2A, was .5): the gait is clocked by the ground covered
  // (player/locomotion.js), and the short stride made his legs cycle at ~15 frames a second at 40 px/s; this one is ~8 again
  // plant: the hips settle so the lower foot stays on the floor (bake.js); the run has none
  walk: {
    lean: .08, chest: 0, hx: 0, hy: 0, bow: 0, hat: 0, dim: 0, plant: 1,
    stride: 1, knee0: .12, lift: .55, swing: .25, fa0: .1, faEl: .3, ba0: -.1, baEl: .25,
    bounce: .6,       // the hips dip on each footfall
    heavy: 0,         // a harder drop on each footfall
    rock: 0,          // the body rocks back and forth with each step (swagger)
    limp: 0,          // favours the near leg: shorter, stiffer step and a dip onto the good one
    wobble: 0,        // drifts and tilts over two strides (drunk)
    fps: 8, speed: 40, flutter: .5,
    f: { hilt: .6 }, b: {},
  },
  run: {
    lean: .32, chest: 0, hx: 0, hy: 0, bow: 0, hat: 0, dim: 0, plant: 0,
    stride: .95, knee0: .3, lift: 1.1, swing: .7, fa0: .3, faEl: .9, ba0: -.5, baEl: .5,
    bounce: 1, heavy: 0, rock: 0, limp: 0, wobble: 0,
    fps: 14, speed: 78, flutter: 1,
    f: {}, b: {},
  },
};
// these multiply (a trait's 0.8 is "20% slower"); every other number adds
export const MUL = new Set(['period', 'fps', 'speed']);
export const MODES = ['idle', 'walk', 'run'];

// ---- Where a hand can rest: [shoulder, elbow] ----
export const ARMS = {
  hilt: HILT,              // resting on the hilt at the hip
  scabbard: [.35, .6],     // holding the scabbard just below the hilt
  behind: [-.5, -1.0],     // clasped behind the back
  cross: [.15, 1.45],      // arms folded across the chest
  sleeves: [.25, 1.35],    // hands tucked into the opposite sleeves
  folded: [.3, .85],       // hands folded low in front
  pray: [.55, 2.15],       // palms together at the chest
  chin: [1.0, 2.35],       // hand at the chin, thinking
  hip: [-.6, 1.3],         // fist on the hip, elbow out
  clutch: [.15, 1.2],      // pressed to the side, holding a wound
  fists: [.5, 2.2],        // fists up
  dangle: [.02, .04],      // hanging dead straight
  trail: [-1.35, .1],      // swept straight back (the shinobi run)
};
