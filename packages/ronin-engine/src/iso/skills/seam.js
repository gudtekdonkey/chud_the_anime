// ---- A skill seam into the controller (from chud_the_anime's F R Q X, iso/skills/reserved.js): the game asks
// `skillControl` first each step; while a skill owns the hero, his own controller waits. Presses go through the 0.2 s
// buffer (input/keys.js): a skill's key fires on the first step he can take it (from rest, a run, the guard, a cut once
// its hit window closes); a press refused by a cooldown or a gate blinks its slot and is never remembered. Each skill
// keeps its own state in its own file and is an object: step(C, dt), owns(C), press(C, t), draw(g, C), and optionally
// canPress(C, free), gate(C) → a word why not, events { name: (C, a) }, render(C).
// The game hands in its skills by id (the kit's rows, kit.js) and its hooks: onStrike(C, a, d) (the rules ask it first),
// onLanded() (a landed J), early { id: s } (how soon after a cut's hit a key may start; .1 s by default), free(id, C)
// (a key never on cooldown just now: a thrown blade called back), hud(g, o), state(), assist (the page's checkbox)
import { W } from '../../clock/world.js';
import { CUT } from '../play/hero.js';
import { bindKey, consume, pending } from '../../input/keys.js';
import { SKILLS, KIT, ready, refuse, kitTick, pop } from './kit.js';

let BYID = {}, ALL = [], H = {}, C = null;
// ctx: { hero, foes, scene, game } (game: the object hitRules was given, so the rules ask the counter first)
export function initSkills(ctx, skills, hooks = {}) {
  BYID = skills; ALL = Object.values(skills); H = hooks; C = ctx; for (const s of SKILLS) bindKey(s.code, s.id);
  const names = new Set(); for (const sk of ALL) for (const n in sk.events || {}) names.add(n);
  for (const n of names) { const prev = W.on[n]; W.on[n] = (a, w) => { if (prev) prev(a, w); for (const sk of ALL) if (sk.events && sk.events[n]) sk.events[n](C, a); }; }
  if (H.onStrike) ctx.game.onStrike = (a, d) => H.onStrike(C, a, d);
  if (H.onLanded) ctx.game.onLanded = H.onLanded;
  const as = document.getElementById('o-assist'); if (as) { as.checked = KIT.assist; as.onchange = () => { KIT.assist = as.checked; }; }
}
// can he start a skill now: from rest, a run, the guard, the sheathe; a cut once its hit window closes (the counter
// two frames after the strike, as the roll); the end of a recoil, a roll or a stop
function free(hero, id) { const n = hero.state, ct = hero.a.ct, cut = CUT[n];
  if (['idle', 'guard', 'run', 'runArmed', 'start', 'sheathe'].includes(n)) return true;
  if (cut) return ct >= cut.hit + (H.early && H.early[id] != null ? H.early[id] : .1);
  return (n === 'stop' && ct > .1) || (n === 'skid' && ct > .2) || (n === 'recoil' && ct > .3) || (n === 'roll' && ct > .38); }
// one game step (1/60 s, never in a hit-stop); true while a skill owns the hero
export function skillControl() {
  kitTick(1 / 60);
  for (const sk of ALL) sk.step(C, 1 / 60);
  const owner = ALL.find(sk => sk.owns(C));
  for (const s of SKILLS) { if (!pending(s.id)) continue; const sk = BYID[s.id], isFree = !owner && free(C.hero, s.id);
    if (!(sk.canPress ? sk.canPress(C, isFree) : isFree)) continue;            // remembered: it fires when he can
    const calling = !!(H.free && H.free(s.id, C));                              // e.g. calling a thrown blade back is never on cooldown
    if (!calling && !ready(s.id)) { consume(s.id, () => true); refuse(s.id, W.t); continue; }
    const why = sk.gate ? sk.gate(C) : ''; if (why) { consume(s.id, () => true); refuse(s.id, W.t); pop(why, C.hero.a.x, C.hero.a.z, W.t, '#8b9592'); continue; }
    if (consume(s.id, () => true)) { C.hero.step = null; sk.press(C, W.t); break; } }
  return ALL.some(sk => sk.owns(C));
}
// the frame: what a skill puts in the scene (a thrown blade's mesh)
export function skillsRender() { for (const sk of ALL) if (sk.render) sk.render(C); }
// the effects layer: each skill's effects, then the HUD (after everything, so nothing draws over it)
export function drawSkills(g) { for (const sk of ALL) sk.draw(g, C); }
export function drawSkillHud(g, o = {}) { if (H.hud) H.hud(g, o); }
// read-only, for the check (window.__iso.skills)
export const skillState = () => H.state ? H.state() : { qi: KIT.qi, power: KIT.power, cd: { ...KIT.cd }, pts: { ...KIT.pts }, casts: { ...KIT.casts } };
