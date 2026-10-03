// ---- The combo prompts (prototypes/46-combo-prompts.html, approved C1A … C12A): when a cut LANDS a prompt shows over
// the samurai: a DIRECTION relative to him (→ always "at him", the arrow drawn on screen turns with him; ← away; ↑ ↓
// on the screen) or a tap / J. PC answers with the direction held + J (a chord, 70 ms of slack), touch with a swipe
// that way (input/touch.js). A white ring closes on the beat 0.18 s after the hit; the window runs 0.35 s past it:
// PERFECT within 0.05 s (a little Qi), GOOD, LATE. An answer before the current cut's chain beat waits for it. A miss
// or a wrong answer ends the chain with a 0.45 s recovery; a whiff ends it too. The last link is the finisher, and a
// finisher landed next to a lone samurai offers K. Chain length follows basic skill (today's comboMax: landed cuts).
// Each answer is one of the ladder's own cuts: → the lunge cut, J the answer cut (J2), and ← ↑ ↓ the spin, launch and
// kick when their 3D moves come (claude/3d-skills; until then J1). The finisher is J3 (for J6's flash step).
// Free mode (T, or &combo=free) is the plain ladder: J, J, J.
import { CTX, lone } from '../ctx.js';
import { W } from 'ronin-engine/clock/world.js';
import { hOf, wrapA, DIR, CLIPS } from 'ronin-engine/flow/flow.js';
import { consume } from 'ronin-engine/input/keys.js';
import { CUT } from '../play/hero.js';
import { STATS } from '../play/rules.js';
import { INV, qiAdd } from '../items/inv.js';
import { say } from '../hud/world-ui.js';
import { COL } from '../../config.js';

export const BEAT = .18, WINDOW = .35, PERFECT = .05, LATE = .2, RECOVER = .45, CHORD = .07;
const LADDER = [[0, 2], [40, 3], [120, 4], [250, 5], [450, 6]];   // today's comboMax: links by landed basic cuts
export const comboMax = () => Math.max(3, LADDER.filter(([n]) => (INV.basic || 0) >= n).pop()[1]);   // the slice keeps its J1 → J2 → J3 at the least
// each answer's cut: the first of its moves that exists in the slice
const MOVES = { R: ['lunge'], J: ['J2'], L: ['spin', 'J1'], U: ['launch', 'J1'], D: ['kick', 'J1'] };
const clipOf = ans => MOVES[ans].find(n => CLIPS[n] && CUT[n]) || 'J1';
export const CP = { on: true, chain: 0, prompt: null, queued: null, recover: 0, pend: null, grades: [], log: [], answers: [], last: null, hits: 0, misses: 0 };

// a direction (screen heading, flow.js hOf) read against the samurai: R at him, L away, U / D up and down the screen
export function readDir(dir, foe) { if (dir == null) return 'J'; const hero = CTX.hero, rel = wrapA(dir - hOf(foe.x - hero.x, foe.z - hero.z));
  if (Math.abs(rel) < Math.PI / 4) return 'R'; if (Math.abs(rel) > 3 * Math.PI / 4) return 'L';
  return Math.abs(wrapA(dir - DIR.N)) < Math.PI / 2 ? 'U' : 'D'; }
// the answers a prompt may ask (↑ ↓ only while he is beside the samurai, where up and down are not toward or away)
function pool(foe) { const hero = CTX.hero, side = Math.abs(Math.sin(hOf(foe.x - hero.x, foe.z - hero.z))) > .7; return side ? ['J', 'R', 'L', 'U', 'D'] : ['J', 'R', 'L']; }
function show(foe, ans, kind) { CP.prompt = { foe, ans, t0: W.t, beat: W.t + BEAT, end: W.t + BEAT + WINDOW, kind }; CP.last = ans; CP.log.push(ans); }
function endChain(why, recover = 0) { CP.chain = 0; CP.prompt = null; CP.queued = null; CP.pend = null; CP.recover = recover; if (why) CP.grades.push(why); }
function grade(s, col) { CP.grades.push(s); say(CTX.hero, s, col, .7); }

// a cut of his landed (port.js sees his hit count rise)
export function onLanded(foe) {
  INV.basic = (INV.basic || 0) + 1;
  if (!CP.on || CTX.busy) return; CP.chain++; CP.queued = null;
  const max = comboMax();
  if (CP.chain >= max) { if (!foe.dead && lone(foe)) show(foe, 'K', 'finish'); else endChain(); return; }
  if (foe.dead) { endChain(); return; }
  const last = CP.chain === max - 1, opts = pool(foe);
  show(foe, last ? 'J' : opts[Math.floor(Math.random() * opts.length)], last ? 'last' : 'link');
}
// an answer: 'J' (tap / J alone), a direction (PC: the stick with J; touch: a swipe), or 'K'
export function answer(ans) {
  const p = CP.prompt; if (!p) return false;
  const t = W.t, d = t - p.beat; CP.answers.push({ want: p.ans, got: ans, d: +d.toFixed(3) }); if (CP.answers.length > 12) CP.answers.shift();
  if (ans !== p.ans) { grade('MISS', '#ff5a4a'); CP.misses++; endChain(null, RECOVER); return true; }
  if (ans === 'K') { CP.prompt = null; CP.chain = 0; grade(Math.abs(d) <= PERFECT ? 'PERFECT' : 'GOOD', COL.fx2); if (CTX.execute) CTX.execute(p.foe); return true; }
  const g = Math.abs(d) <= PERFECT ? 'PERFECT' : d <= LATE ? 'GOOD' : 'LATE'; grade(g, g === 'PERFECT' ? COL.fx2 : g === 'GOOD' ? '#ffffff' : '#9aa3a1'); CP.hits++;
  if (g === 'PERFECT') qiAdd(.03);
  // the next cut starts at the current one's chain beat (GO), or now if that has passed
  const a = CTX.hero.a, cut = CUT[a.clip.name], wait = cut ? Math.max(0, cut.chain - a.ct) : 0;
  CP.queued = { clip: p.kind === 'last' ? 'J3' : clipOf(ans), at: t + wait, foe: p.foe }; CP.prompt = null; return true;
}
// once a game step, before the hero's controller: J presses are the prompt's while one is up (or held through the recovery)
export function tickPrompts(dt, inp) {
  CP.recover = Math.max(0, CP.recover - dt);
  if (!CP.on) { CP.prompt = null; CP.queued = null; return; }
  if (CTX.busy) { if (CP.prompt || CP.chain) endChain(); return; }
  if (CP.recover > 0) { consume('cut', () => true); return; }
  const p = CP.prompt;
  if (p) {
    if (p.foe.dead && p.ans !== 'K') { endChain(); return; }
    // the chord: J with the direction already held, or the direction within 70 ms after
    if (consume('cut', () => true)) CP.pend = { t: W.t, dir: inp.dir };
    if (CP.pend) { if (CP.pend.dir == null && inp.dir != null) CP.pend.dir = inp.dir;
      if (CP.pend.dir != null || W.t - CP.pend.t >= CHORD || p.ans === 'J') { const d = CP.pend.dir; CP.pend = null; answer(readDir(d, p.foe)); } }
    else if (W.t > p.end) { CP.answers.push({ want: p.ans, got: null }); grade('MISS', '#ff5a4a'); CP.misses++; endChain(null, RECOVER); }
  } else if (CP.chain) consume('cut', () => true);   // between links a J answers nothing: the next prompt comes with the hit
  const q = CP.queued;
  if (q && W.t >= q.at) { CP.queued = null; const n0 = STATS.log.length; CTX.hero.startCut(q.clip, q.foe.dead ? null : q.foe, null); CP.watch = { n0, name: q.clip }; }
  // a whiff ends the chain
  if (CP.watch && STATS.log.length > CP.watch.n0) { if (STATS.log.at(-1).endsWith(':miss')) endChain('WHIFF'); CP.watch = null; }
  if (!CP.prompt && !CP.queued && CP.chain && CTX.hero.state === 'idle') endChain();
}
