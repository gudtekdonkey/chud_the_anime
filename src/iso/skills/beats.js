// ---- The skills' beats and numbers, today's (src/player/: skills.js, update.js, mirror.js, breath.js, cooldowns.js,
// power.js, qi.js; src/anims/breath-poses.js), so the slice keeps the same keys, timings and hit beats. Distances are
// today's game pixels, which are the slice's world units.
// Breath of Qi: seiza breathes out (and heals) at B0 + i·BP + OUT; the kata at B0 + i·BP + .9; lotus heals from ON to
// OFF; Storm breath exhales at EX
export const BT = {
  seiza: { B0: .7, BP: .78, OUT: .45, UP: .55, GET: 2.95, END: 3.4 },
  kata: { B0: .5, BP: 1.0, OUT: .9, END: 3.8 },
  lotus: { ON: 1.0, OFF: 3.2, LIFT: .7, DROP: 3.45, END: 3.8 },
  sbreath: { IN0: .55, IN1: 1.35, EX: 1.6, END: 3.3 },
};
// cooldowns (s): I's slot takes the tap's 2 s or Thousand Cuts' 8 s; O and P cool from the release
export const CD = { double: 2, tc: 8, moon: 10, rift: 12, mirror: 14, sweep: 8 };
// power I / II / III: the stats it scales and each skill's version
export const PW = { dmg: [1, 1.25, 1.5], qi: [1, 1.15, 1.3], cd: [1, .9, .8] };
export const TIERS = {
  chain: { hops: [3, 4, 5], storm: [8, 9, 10] }, tc: { cuts: [7, 9, 11] }, rift: { size: [1, 1.15, 1.15], echo: [0, 0, .6] },
  moon: { shards: [0, 1, 1], twin: [0, 0, 1] }, mirror: { more: [0, 1, 2] }, sweep: { r: [1, 1.2, 1.2], pillars: [0, 0, 1] },
};
// damage on the samurai (today's DMG): the double 1 a cut, the click's burst 1 (× its size), Sky Drop 2, Thousand
// Cuts 2, Crescent Moon 3, Cross Rift 1 an arm and 2 on the detonation, a mirror image 1, a chain link 1
export const DMG = { d: 1, burst: 1, sw: 2, tc: 2, cm: 3, cr: 1, crB: 2, mi: 1, chain: 1 };
// Qi each kind of landed hit feeds (chain links feed none, or the storm would never end)
export const QI_GAIN = { slash: .1, d: .09, sw: .16, tc: .05, cm: .2, cr: .08, crB: .1, mi: .07 };
export const TAP = .14, CHARGE_T = .9;   // I: held past the tap it charges; a full charge takes 0.9 s
// Breath of Qi: heal per out-breath, Seiza's dome by power (half-width, height, motes round it), motes per beat, the rest point's reach
export const HEAL = { kata: .2, seiza: .235, sbreath: .4 }, DOME = [[17, 32, 0], [26, 40, 14], [46, 62, 40]], QI_RATE = [2, 8, 16], REST = 48;
// the cancel windows (Q3A, today's FEEL.cancel): a roll from `roll` s into the move, J or another skill from `any`
export const CANCEL = { skDouble: { roll: .4, any: .4 }, skRelease: { roll: 9, any: 9 }, skMoon: { roll: .3, any: .45 }, skDrop: { roll: .62, any: .8 },
  skMeditate: { roll: 9, any: 9 }, skKata: { roll: 0, any: 9 }, skSeiza: { roll: 0, any: 9 }, skLotus: { roll: 9, any: 9 }, skStorm: { roll: 2.2, any: 2.5 } };
