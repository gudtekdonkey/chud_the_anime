import { pz, HILT, keyed } from 'ronin-engine/rig/pose.js';

// ---- Breath of Qi (C): the four approved takes from prototypes/18-skills-ideas.html, as poses ----
// Each is one fixed timeline; the healing beats in player/breath.js read the same times (BT)
const hold = () => 0;   // a hard cut: stays on the first pose until the next key
const IDLE = pz({ fa: [.15, .2] });
const READY = pz({ hy: 2, lean: .18, fl: [.55, .8], bl: [-.55, .35], fa: HILT, ba: [-.5, .3] });
const CROUCH = pz({ hy: 2, lean: .4, fl: [.5, .9], bl: [-.5, .3], fa: HILT, ba: [-.9, .2] });
const DOWN = pz({ ...CROUCH, hy: 5, fl: [1.1, 1.8], bl: [-.1, 2.0] });   // on the way to the floor and back up
// A · Seiza, the shield: kneeling, hands on his thighs, head bowed
const SEIZA = pz({ hy: 9, lean: .1, chest: .12, fl: [1.45, 2.9], bl: [1.3, 2.9], fa: [.45, 1.0], ba: [.35, 1.05], hat: 1 });
// B · Standing kata: a low horse stance; arms rise overhead on the in-breath, palms press down to the belly on the out-breath
const STAND = pz({ hy: 3, lean: .02, fl: [.45, .45], bl: [-.45, .45], fa: [.35, .9], ba: [.3, .95] });
const RAISE = pz({ hy: 1, lean: -.06, chest: -.12, breath: 1, fl: [.35, .3], bl: [-.35, .3], fa: [2.9, .15], ba: [2.75, .25] });
const PRESS = pz({ hy: 4, lean: .08, chest: .1, fl: [.55, .7], bl: [-.55, .6], fa: [.75, 1.3], ba: [.65, 1.4], hat: 1 });
// C · Lotus: cross-legged (he lifts off the floor at run time, P.z)
const SIT = pz({ hy: 10, lean: .02, chest: .05, fl: [1.5, 2.85], bl: [1.35, 2.95], fa: [.8, .75], ba: [.7, .8], hat: 1 });
// E · Storm breath: arms thrown back for the one great in-breath, palms driven forward on the out-breath
const INHALE = pz({ hy: 3, lean: -.14, chest: -.32, breath: 1, fl: [.6, .6], bl: [-.6, .6], fa: [-1.25, .35], ba: [-1.0, .35], hat: -1 });
const EXHALE = pz({ hx: 2, hy: 5, lean: .32, chest: .25, fl: [1.1, 1.2], bl: [-1.0, .15], fa: [1.55, -.05], ba: [1.4, .05], flutter: 1, hat: 1 });

// the beats: seiza breathes out (and heals) at B0 + i·BP + .45; the kata at B0 + i·BP + .9; lotus heals from ON to OFF; storm breath exhales at EX
export const BT = {
  seiza: { B0: .7, BP: .78, OUT: .45, UP: .55, GET: 2.95, END: 3.4 },
  kata: { B0: .5, BP: 1.0, OUT: .9, END: 3.8 },
  lotus: { ON: 1.0, OFF: 3.2, LIFT: .7, DROP: 3.45, END: 3.8 },
  sbreath: { IN0: .55, IN1: 1.35, EX: 1.6, END: 3.3 },
};
export const BREATH_FPS = 30;
const F = BREATH_FPS;

function seiza() { const b = BT.seiza, k = [[0, IDLE], [.22, IDLE], [.36, pz({ ...CROUCH, hy: 5, lean: .3, fl: [1.1, 1.8], bl: [-.1, 2.0] })], [.55, SEIZA]];
  for (let i = 0; i < 3; i++) { const t = b.B0 + i * b.BP; k.push([t, SEIZA], [t + .45, pz({ ...SEIZA, breath: 1, hat: 0 })], [t + .75, SEIZA]); }
  return keyed([...k, [b.GET, SEIZA], [b.GET + .12, DOWN], [b.GET + .3, READY], [b.END, IDLE]], F); }
function kata() { const b = BT.kata, k = [[0, IDLE], [.25, IDLE], [.5, STAND]];
  for (let i = 0; i < 3; i++) { const t = b.B0 + i * b.BP; k.push([t + .55, RAISE], [t + .9, PRESS]); }
  return keyed([...k, [3.55, STAND], [b.END, IDLE]], F); }
function lotus() { const b = BT.lotus, k = [[0, IDLE], [.25, IDLE], [.42, pz({ ...CROUCH, hy: 6, lean: .2, fl: [1.2, 2.0], bl: [.2, 2.2] })], [.62, SIT]];
  for (let t = .62 + .7; t < b.DROP - .2; t += 1.4) k.push([t, pz({ ...SIT, breath: 1 })], [t + .7, SIT]);   // one long slow breath after another
  return keyed([...k, [b.DROP, SIT], [3.62, DOWN], [b.END, IDLE]], F); }
function sbreath() { const b = BT.sbreath;
  return keyed([[0, IDLE], [.35, READY], [b.IN0, pz({ ...READY, hy: 4, lean: .1 })], [b.IN1, INHALE], [b.EX, pz({ ...INHALE, chest: -.38 })], [b.EX + .001, EXHALE, hold],
    [b.EX + .5, pz({ ...EXHALE, lean: .2, chest: .1, flutter: 0 })], [b.EX + .9, READY], [3.0, READY], [b.END, IDLE]], F); }
export const BREATH_POSES = { seiza: seiza(), kata: kata(), lotus: lotus(), sbreath: sbreath() };
