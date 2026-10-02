import { ROSTER, statOf } from '../party/kit.js';

// ---- His four stats (owner pick 2026-10-01, "Ideas: … 3A"): the companions' VIG / EDG / SPD / FOC, one vocabulary for the party ----
// He starts at 1 in each (no points per level yet: owner's open question, default gear only); gear adds points (party/kit.js gearStats),
// and the power tier stays the multiplier on top (player/power.js pw). Each mirrors what the stat does for a companion (party/companions.js).
const pt = k => statOf(ROSTER[0], k) - 1;   // points above the start
export const ST = {
  taken: () => Math.max(.5, 1 - .05 * pt('vigor')),   // VIG: takes 5% less a point
  heavy: () => .08 * pt('edge'),                       // EDG: an 8% chance a point for a cut to land heavy (x1.5)
  speed: () => 1 + .04 * pt('speed'),                  // SPD: moves 4% faster a point
  qi: () => 1 + .1 * pt('focus'),                      // FOC: builds 10% more Qi a point
  cd: () => Math.max(.6, 1 - .05 * pt('focus')),       //      and cools down 5% sooner a point
};
export const HEAVY = 1.5;
// the kit screen's line for each stat, as the proposal drew it: "VIG 3 (1 + 2 gear) takes 10% less"
export function statLine(k) {
  const pc = v => Math.round(v * 100);
  return { vigor: 'TAKES ' + pc(1 - ST.taken()) + '% LESS', edge: 'HEAVY CUT ' + pc(ST.heavy()) + '%', speed: 'MOVES +' + pc(ST.speed() - 1) + '%',
    focus: 'QI +' + pc(ST.qi() - 1) + '%, CD -' + pc(1 - ST.cd()) + '%' }[k];
}
