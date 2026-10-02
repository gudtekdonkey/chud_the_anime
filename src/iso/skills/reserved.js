// ---- The new skills in the slice: F counter, R Blade Recall, Q Lightning Chain, X Time Slice. One seam into the
// controller: main.js asks `skillControl` first each step; while a skill owns the hero, his own controller waits.
// Presses go through the slice's 0.2 s buffer (play/input.js): a skill's key fires on the first step he can take it
// (from rest, a run, the guard, a cut once its hit window closes); a press refused by a cooldown or a gate (Time Slice
// on an empty meter) blinks its slot and is never remembered. Each skill keeps its own state in its own file.
import { W } from '../play/sim.js';
import { CUT } from '../play/hero.js';
import { bindKey, consume, pending } from '../play/input.js';
import './reserved-moves.js';
import { SKILLS, KIT, ready, refuse, kitTick, qiAdd, pop } from './kit.js';
import { counter } from './counter.js';
import { recall } from './recall.js';
import { chain } from './chain.js';
import { timeslice } from './timeslice.js';
import { drawHud } from './reserved-hud.js';

export const BYID = { counter, recall, chain, slice: timeslice };
const ALL = Object.values(BYID);
let C = null;
// ctx: { hero, foes, scene, game } (game: the object hitRules was given, so the rules ask the counter first)
export function initSkills(ctx) {
  C = ctx; for (const s of SKILLS) bindKey(s.code, s.id);
  const names = new Set(); for (const sk of ALL) for (const n in sk.events || {}) names.add(n);
  for (const n of names) { const prev = W.on[n]; W.on[n] = (a, w) => { if (prev) prev(a, w); for (const sk of ALL) if (sk.events && sk.events[n]) sk.events[n](C, a); }; }
  ctx.game.onStrike = (a, d) => counter.onStrike(C, a, d);
  ctx.game.onLanded = () => qiAdd(.1);                             // a landed J fills a tenth of the meter (a counter a fifth)
  const as = document.getElementById('o-assist'); if (as) { as.checked = KIT.assist; as.onchange = () => { KIT.assist = as.checked; }; }
}
// can he start a skill now: from rest, a run, the guard, the sheathe; a cut once its hit window closes (the counter
// two frames after the strike, as the roll); the end of a recoil, a roll or a stop
function free(hero, id) { const n = hero.state, ct = hero.a.ct, cut = CUT[n];
  if (['idle', 'guard', 'run', 'runArmed', 'start', 'sheathe'].includes(n)) return true;
  if (cut) return ct >= cut.hit + (id === 'counter' ? 2 / 60 : .1);
  return (n === 'stop' && ct > .1) || (n === 'skid' && ct > .2) || (n === 'recoil' && ct > .3) || (n === 'roll' && ct > .38); }
// one game step (1/60 s, never in a hit-stop); true while a skill owns the hero
export function skillControl() {
  kitTick(1 / 60);
  for (const sk of ALL) sk.step(C, 1 / 60);
  const owner = ALL.find(sk => sk.owns(C));
  for (const s of SKILLS) { if (!pending(s.id)) continue; const sk = BYID[s.id], isFree = !owner && free(C.hero, s.id);
    if (!(sk.canPress ? sk.canPress(C, isFree) : isFree)) continue;            // remembered: it fires when he can
    const calling = s.id === 'recall' && recall.away;                           // calling the blade back is never on cooldown
    if (!calling && !ready(s.id)) { consume(s.id, () => true); refuse(s.id, W.t); continue; }
    const why = sk.gate ? sk.gate(C) : ''; if (why) { consume(s.id, () => true); refuse(s.id, W.t); pop(why, C.hero.a.x, C.hero.a.z, W.t, '#8b9592'); continue; }
    if (consume(s.id, () => true)) { C.hero.step = null; sk.press(C, W.t); break; } }
  return ALL.some(sk => sk.owns(C));
}
// the frame: the recalled blade's mesh in the scene
export function skillsRender() { recall.render(C); }
// the effects layer: each skill's effects, then the HUD (after everything, so nothing draws over it)
export function drawSkills(g) { for (const sk of ALL) sk.draw(g, C); }
export function drawSkillHud(g) { drawHud(g, { recall: recall.away }); }
// read-only, for the check (window.__iso.skills)
export const skillState = () => ({ qi: KIT.qi, power: KIT.power, cd: { ...KIT.cd }, pts: { ...KIT.pts }, casts: { ...KIT.casts },
  counter: counter.phase, recall: recall.blade, chain: chain.phase, slice: timeslice.phase });
