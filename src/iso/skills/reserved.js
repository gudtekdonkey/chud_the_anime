// ---- The new skills in the slice: F counter, R Blade Recall, Q Lightning Chain, X Time Slice. One seam into the
// controller: main.js asks `skillControl` first each step; while a skill owns the hero, his own controller waits.
// Presses go through the slice's 0.2 s buffer (play/input.js): a skill's key fires on the first step he can take it
// (from rest, a run, the guard, a cut once its hit window closes); a press refused by a cooldown or a gate (Time Slice
// on an empty meter) blinks its slot and is never remembered. Each skill keeps its own state in its own file; the seam
// is the engine's (ronin-engine/iso/skills/seam.js), this game's four skills and hooks handed in here.
import * as SEAM from 'ronin-engine/iso/skills/seam.js';
import './reserved-moves.js';
import { KIT, qiAdd } from './kit.js';
import { counter } from './counter.js';
import { recall } from './recall.js';
import { chain } from './chain.js';
import { timeslice } from './timeslice.js';
import { drawHud } from './reserved-hud.js';

export const BYID = { counter, recall, chain, slice: timeslice };
// ctx: { hero, foes, scene, game } (game: the object hitRules was given, so the rules ask the counter first)
export const initSkills = ctx => SEAM.initSkills(ctx, BYID, {
  onStrike: (C, a, d) => counter.onStrike(C, a, d),
  onLanded: () => qiAdd(.1),                                      // a landed J fills a tenth of the meter (a counter a fifth)
  early: { counter: 2 / 60 },                                     // the counter two frames after a cut's hit, as the roll
  free: id => id === 'recall' && recall.away,                     // calling the blade back is never on cooldown
  hud: (g, o) => drawHud(g, { recall: recall.away, lift: o.lift || 0 }),   // lift: raised over today's bottom bar (port.js)
  state: () => ({ qi: KIT.qi, power: KIT.power, cd: { ...KIT.cd }, pts: { ...KIT.pts }, casts: { ...KIT.casts },
    counter: counter.phase, recall: recall.blade, chain: chain.phase, slice: timeslice.phase }),
});
export const { skillControl, skillsRender, drawSkills, drawSkillHud, skillState } = SEAM;
