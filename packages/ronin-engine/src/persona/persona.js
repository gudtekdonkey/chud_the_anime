// ---- A person on the 3D skeleton: today's trait system (src/traits/: 52 traits, the knobs they turn, cultures and
// personOf), read through mix() and turned into the flow rig's numbers. The knobs were made for today's side rig
// (radians, pixels of a 26 px ronin); here each one is the difference from BASE (the plain ronin), scaled to the
// flow rig's units, so no traits is no difference at all: the plain ronin stands, walks and runs exactly as drawn.
// What it shapes: the idle (lean, bow, breath depth and pace, sway, bob, jitter, stance, knees, hands), the walk and
// the run (stride, cadence, speed, lift, arm swing, bounce, heavy feet, rock, limp, wobble, hands), which of the
// twenty idles they drift into and how often (behave.js), and for a samurai how he fights (behave.js BEHAVE).
import { mix } from '../traits/mix.js';
import { BASE } from '../traits/knobs.js';
import { behaveOf, idlesOf, PLAIN } from './behave.js';

const cl = (v, a, b) => Math.max(a, Math.min(b, v));

// a mode's bearing: how the body is carried (the same in idle, walk and run where the trait says so)
function bearing(m, mode) { const d = k => m[mode][k] - BASE[mode][k];
  return { lean: d('lean') + .6 * d('chest'), head: .2 * d('bow'), hx: 1.6 * d('hx'), hy: 1.6 * d('hy'), hat: .3 * d('hat'), f: m[mode].f, b: m[mode].b }; }
function gait(m, mode) { const g = m[mode], B = BASE[mode], r = k => g[k] / B[k];
  return { ...bearing(m, mode), speed: r('speed'), cadence: r('fps'),
    stride: cl(Math.sqrt(r('speed') / r('fps')) * Math.sqrt(cl(r('stride'), .3, 2)), .45, 1.8),   // the speed over the cadence is the ground a step covers; the trait's stride leans it
    lift: cl(r('lift'), .15, 2.2), swing: cl(r('swing'), 0, 2.5), bounce: cl(r('bounce'), 0, 4), heavy: g.heavy, rock: g.rock, limp: g.limp, wobble: g.wobble, knee: g.knee0 - B.knee0 }; }

// [[trait, strength], ...] → a persona; `armed`: carries the katana (a villager does not, and skips the blade idles)
export function personaOf(list = [], { armed = true } = {}) {
  const m = mix(list), I = m.idle, behave = behaveOf(list), idles = idlesOf(list, { armed });
  return {
    list, plain: !list.length, armed, knobs: m, behave, idles,
    idle: { ...bearing(m, 'idle'), legs: I.legs - BASE.idle.legs, knee: I.knee, breath: I.breath, period: I.period / BASE.idle.period, bob: I.bob, sway: I.sway, swayLean: I.swayLean, jitter: I.jitter },
    walk: gait(m, 'walk'), run: gait(m, 'run'),
    gap: Math.max(.6, I.every) * 2.4 * (I.period / BASE.idle.period) * 1.15,         // seconds between idles: the trait's breaths between fidgets
    tempo: 1 / Math.sqrt(I.period / BASE.idle.period),                                  // a slow breather plays them slower
    linger: cl(Math.exp(.6 * behave.traits.patience) * Math.sqrt(I.period / BASE.idle.period), .6, 2.2),
  };
}
export const PLAIN_PERSONA = personaOf([]);
export { PLAIN };

// the numbers that show what a persona does, for the overlay and the check
export function summary(P) { const strideRun = 52.5 * P.run.stride, strideWalk = 30 * P.walk.stride;
  return { run: { speed: 110 * P.run.speed, stride: strideRun, cadence: 110 * P.run.speed / strideRun }, walk: { speed: 36 * P.walk.speed, stride: strideWalk, cadence: 36 * P.walk.speed / strideWalk },
    breath: 2.4 * P.idle.period, gap: P.gap, idles: P.idles.slice(0, 4).map(([i]) => i), behave: P.behave }; }
