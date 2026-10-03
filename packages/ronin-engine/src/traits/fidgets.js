import { ease, HILT } from '../rig/pose.js';

// ---- Fidgets: small idle actions a trait can add, played now and then between breaths ----
// at(u) takes the fidget's progress 0..1 and returns { f, b } hand targets with their weight w, plus add: numbers added
// to the pose (arrays add per joint). Every fidget eases in and back out, so it drops back into the breath cleanly.
const env = (u, a = .2, b = .25) => u < a ? ease(u / a) : u > 1 - b ? ease((1 - u) / b) : 1;
const hump = u => Math.sin(Math.PI * Math.min(1, Math.max(0, u)));
export const FIDGETS = {
  hatTip: { dur: 1.6, about: 'reaches up and tugs the brim of his hat down', at: u => ({ f: [2.4, .6], w: env(u, .25, .3),
    add: { hat: u > .4 && u < .75 ? 1 : 0, bow: .35 * env(u) } }) },
  hiltCheck: { dur: 1.8, about: 'rests a hand on the hilt and glances down at it', at: u => ({ f: HILT, w: env(u),
    add: { bow: .6 * env(u, .3, .3), lean: .05 * env(u) } }) },
  hiltThumb: { dur: 1.4, about: 'thumbs the guard of his sword, restless', at: u => ({ f: [HILT[0] + .1 * Math.max(0, Math.sin(u * 28)), HILT[1]], w: env(u, .15, .2), add: {} }) },
  neckCrack: { dur: 1.3, about: 'tips his head over, then snaps it back', at: u => ({ w: 0,
    add: { bow: u < .45 ? 1.1 * ease(u / .45) : u < .55 ? 1.1 - 1.7 * (u - .45) / .1 : -.6 * env(u, 0, .45), chest: -.06 * env(u) } }) },
  shoulderRoll: { dur: 1.6, about: 'rolls his shoulders up and back', at: u => ({ w: 0,
    add: { breath: .9 * hump(u), chest: -.12 * Math.sin(Math.PI * 2 * u) * env(u) } }) },
  footTap: { dur: 1.6, about: 'taps his front foot three times', at: u => { const t = Math.max(0, Math.sin(u * 6 * Math.PI)) * env(u, .1, .1);
    return { w: 0, add: { fl: [.2 * t, .5 * t] } }; } },
  weightShift: { dur: 1.8, about: 'shifts his weight onto the back foot and back again', at: u => ({ w: 0,
    add: { hx: -1.5 * env(u, .3, .3), lean: -.05 * env(u, .3, .3), fl: [.12 * env(u, .3, .3), 0] } }) },
  stretch: { dur: 2.2, about: 'stretches both arms up over his head', at: u => ({ f: [2.95, .15], b: [2.8, .25], w: env(u, .3, .3),
    add: { breath: 1 * env(u, .3, .3), lean: -.08 * env(u), chest: -.14 * env(u), bow: -.4 * env(u) } }) },
  sigh: { dur: 2.4, about: 'a long sigh: the chest lifts, then everything sags', at: u => ({ w: 0,
    add: { breath: 1.2 * hump(u / .55), bow: .7 * env(u, .5, .2) * (u > .45 ? 1 : 0), fa: [-.06 * env(u, .5, .2), 0], ba: [.06 * env(u, .5, .2), 0] } }) },
  glance: { dur: 1.5, about: 'glances up and back over his shoulder', at: u => ({ w: 0,
    add: { bow: -.45 * env(u, .15, .3), hx: -1 * env(u, .15, .3), chest: -.1 * env(u, .15, .3), hat: -1 * (u > .15 && u < .7 ? 1 : 0) } }) },
  nod: { dur: 1.4, about: 'two slow nods', at: u => ({ w: 0, add: { bow: .8 * Math.pow(Math.sin(Math.PI * 2 * u), 2) } }) },
  lookDown: { dur: 2, about: 'lowers his head and stares at the floor', at: u => ({ w: 0, add: { bow: 1.2 * env(u, .3, .3), lean: .06 * env(u, .3, .3) } }) },
  scratch: { dur: 1.6, about: 'scratches the back of his head under the hat', at: u => ({ f: [2.2, 1.45 + .12 * Math.sin(u * 40)], w: env(u, .25, .25),
    add: { bow: .3 * env(u), hat: u > .3 && u < .7 ? -1 : 0 } }) },
  knuckles: { dur: 1.5, about: 'brings his hands together and cracks his knuckles', at: u => ({ f: [.7, 1.6], b: [.65, 1.7], w: env(u, .25, .25),
    add: { chest: u > .5 && u < .6 ? .08 : 0, bow: .2 * env(u) } }) },
  dustOff: { dur: 1.6, about: 'brushes dust off his far shoulder', at: u => ({ f: [1.25, 2.3 + .15 * Math.sin(u * 22)], w: env(u, .25, .25),
    add: { bow: .3 * env(u), chest: .06 * env(u) } }) },
  yawn: { dur: 2.2, about: 'a slow yawn behind one hand', at: u => ({ f: [1.6, 2.1], w: env(u, .3, .3),
    add: { breath: 1.3 * env(u, .3, .3), bow: -.5 * env(u, .3, .3), chest: -.1 * env(u) } }) },
  stumble: { dur: 1.6, about: 'loses his footing for a moment and catches himself', at: u => { const e = env(u, .1, .55);
    return { b: [-1.4, .2], f: [1.3, .2], w: e, add: { hx: -2.5 * e, lean: -.25 * e, bl: [-.3 * e, 0], fl: [.3 * e, .2 * e], hat: e > .5 ? -1 : 0 } }; } },
  flexHand: { dur: 1.3, about: 'shakes out his sword hand', at: u => ({ f: [.6, .4 + .5 * Math.max(0, Math.sin(u * 30))], w: env(u), add: {} }) },
  fixMantle: { dur: 1.7, about: 'straightens his mantle at the collar', at: u => ({ f: [1.6, 2.3], w: env(u, .25, .3),
    add: { chest: -.05 * env(u), bow: .25 * env(u), flutter: u > .4 && u < .7 ? 1 : 0 } }) },
  toes: { dur: 1.3, about: 'rocks up onto his toes and back', at: u => ({ w: 0, add: { hy: -Math.round(hump(u * 2 % 1) * env(u, .1, .1)) } }) },
};
