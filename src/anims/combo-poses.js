import { pz, lin, keyed } from 'ronin-engine/rig/pose.js';

// ---- J3 to J6: four different attacks, not four swings. The body (hips, legs, lean) is the same for every weapon;
// each weapon brings its own arms and blade (fa, ba, sword) for each beat, so a spear kicks and launches like a spear.
// Each cut starts from the one before at its chain beat (0.3 s); timings match player/combo.js CUTS.
//   J3 spin cut: he winds the blade over his back shoulder, whirls round (player/combo.js flips him for the turn) and sweeps level
//   J4 front kick: the knee comes up, the lead foot drives out, the blade held back out of the way
//   J5 rising launch: he drops into a crouch and springs up with a cut that rises straight overhead (he leaves the floor)
//   J6 flash step: he sinks, breaks into slices and is simply past the enemy, down on one knee with the blade laid out behind him
const BODY = {
  wind:   { hx: 1, hy: 3, lean: .1, chest: -.5, fl: [.7, .9], bl: [-.8, .4] },
  turned: { hx: 1, hy: 3, lean: .15, chest: .2, fl: [.8, 1.0], bl: [-.85, .35], flutter: 1 },
  sweep:  { hx: 3, hy: 4, lean: .5, chest: .6, fl: [1.1, 1.1], bl: [-1.1, .15], hat: 1, flutter: 1 },
  chamber:{ hx: 0, hy: 2, lean: -.1, chest: 0, fl: [1.4, 2.2], bl: [-.2, .3] },
  kick:   { hx: 2, hy: 0, lean: -.35, chest: -.1, fl: [1.75, .05], bl: [-.3, .2], hat: -1, flutter: 1 },
  down:   { hx: 3, hy: 3, lean: .2, chest: 0, fl: [1.0, 1.0], bl: [-.9, .3] },
  crouch: { hx: 3, hy: 7, lean: .6, chest: .1, fl: [1.3, 1.9], bl: [-.2, 2.3] },
  rise:   { hx: 3, hy: 1, lean: -.05, chest: -.2, fl: [.8, .6], bl: [-.5, 1.2], flutter: 1 },
  top:    { hx: 3, hy: -2, lean: -.2, chest: -.4, fl: [.9, 1.6], bl: [-.1, 1.4], hat: -1, flutter: 1 },
  set:    { hx: 2, hy: 5, lean: .6, chest: .2, fl: [.8, 1.4], bl: [-.8, .5] },
  fin:    { hx: 4, hy: 7, lean: .75, chest: .45, fl: [1.35, 1.95], bl: [-.2, 2.35], hat: 1, flutter: 1 },
};
// arms: { wind, sweep, kick, crouch, top, set, fin } each { fa, ba, sword }; from: the pose J2 ends on; guard: the weapon's guard
export function comboPoses(arms, from, guard) {
  const P = (b, a, o) => pz({ ...BODY[b], ...arms[a], ...o });
  const SWEEP = P('sweep', 'sweep'), KICK = P('kick', 'kick'), TOP = P('top', 'top'), FIN = P('fin', 'fin');
  return {
    slash3: keyed([[0, from], [.05, P('wind', 'wind')], [.09, P('turned', 'wind')], [.12, SWEEP, lin],
      [.34, pz({ ...SWEEP, lean: .46 })], [.5, guard]], 30),
    slash4: keyed([[0, SWEEP], [.07, P('chamber', 'kick')], [.12, KICK, lin], [.2, pz({ ...KICK, fl: [1.7, .1] })],
      [.3, P('down', 'kick')], [.5, guard]], 30),
    slash5: keyed([[0, P('down', 'kick')], [.07, P('crouch', 'crouch')], [.14, P('rise', 'top', { sword: (arms.top.sword + arms.crouch.sword) / 2 }), lin],
      [.2, TOP], [.34, pz({ ...TOP, lean: -.15 })], [.5, guard]], 30),
    slash6: keyed([[0, TOP], [.06, P('set', 'set')], [.1, P('set', 'set', { hy: 6 })], [.14, FIN, lin],
      [.45, pz({ ...FIN, lean: .8 })], [.6, guard]], 30),
  };
}
