import { COL } from '../config.js';
import { P } from '../state.js';
import { CUTS, GO, comboMax } from './combo.js';
import { setState } from './actions.js';
import { B } from './buffer.js';
import { startCd, ready } from './cooldowns.js';
import { known } from './mastery.js';
import { qiAdd } from './qi.js';
import { living } from '../world/enemies.js';
import { K } from '../assassin/markers.js';
import { spark } from '../fx/util.js';

// ---- Combo prompts (prototype 46, approved 2026-10-02 "C1A … C12A", every question on its recommendation) ----
// A cut that LANDS opens a prompt for the next link: a direction relative to the enemy (→ always "at him", the arrow drawn on
// screen flips with him) or a tap / J, the same prompt on PC and phone (C1A). PC answers a direction with the direction + J, 70 ms
// of slack either way (C2A); the phone with a swipe that way. Each answer is one of the J ladder's own cuts (C6A); the last link
// is J6's flash step; a mastered skill can be a link (C10A: I's double slash); a finisher landing next to a lone samurai offers
// K (C11A). A miss or a wrong answer ends the chain with a 0.45 s recovery (C3A); no slow motion, a 0.35 s window after a 0.18 s
// ring (C4A). Basic skill (comboMax) sets the chain's length. C12A: prompts always on; Auto and Hold to continue are settings.
// Every press it takes (J, a direction that finishes a chord, K or I answering) is taken off the step's input and out of the input
// buffer (player/buffer.js), so an answer never fires twice nor starts a fresh cut.
export const MOVE = { F: 'slash1r', U: 'slash5', B: 'slash3', D: 'slash4', T: 'slash2', FIN: 'slash6', S: 'double' };
export const MOVE_NAME = { F: 'lunge cut', U: 'rising launch', B: 'spin cut', D: 'front kick', T: 'answer cut', FIN: 'flash step', K: 'execute', S: 'double slash' };
// assist: 'prompts' (answer them), 'hold' (holding J, or a finger, answers on the beat), 'auto' (each link plays by itself)
export const PT = { assist: 'prompts', win: .35, lead: .18, perfect: .05, recover: .45, chord: .07, skillLink: .2, touch: false, two: 'last' };   // touch: drawn for a finger; two: the two-finger tap's skill
export const C = { chain: null, prompt: null, queued: null, lock: 0, pendJ: null, pendingK: false, flash: null, last: null, lastPrompt: null, evSeen: null,
  answers: 0, stats: { chains: 0, links: 0, perfect: 0, good: 0, late: 0, miss: 0, wrong: 0, longest: 0 }, log: [] };   // log: the last answers (answers: how many so far), read-only for the check

const isCut = s => !!CUTS[s];
// the link he is in now: a cut, or the skill a skill link cast
const inLink = s => isCut(s) || (s === 'double' && C.chain && C.chain.prev === 'S');
const goOf = s => s === 'double' ? .62 : GO;   // the double slash links on after its sheath click
const strikeOf = s => s === 'double' ? .4 : CUTS[s].sk + .12;
// between links: the cut ended into a stance (or he put the blade away) while a prompt is still open
const BETWEEN = /^(ready\d|runArmed|sheathe|idle|land)$/;
export const FREE = /^(idle|run|walk|idleGlitch|land|sheathe|runArmed|ready\d?)$/;
const nearest = () => { let b = null, br = 1e9; for (const e of living()) { const r = Math.hypot(e.x - P.x, (e.y - P.y) * 1.3); if (r < br) { br = r; b = e; } } return b; };
const faceTo = e => (e && Math.sign(e.x - P.x)) || P.face;
// the arrow a kind shows on screen, given which way he faces the enemy
export function screenDir(kind, face) { if (kind === 'F' || kind === 'FIN') return face > 0 ? 'R' : 'L'; if (kind === 'B') return face > 0 ? 'L' : 'R'; return kind; }
// the kinds a screen direction answers: exact, or a diagonal for either of its neighbours
export function kindsOf(dir, face) {
  const one = d => d === 'U' ? 'U' : d === 'D' ? 'D' : (d === 'R') === (face > 0) ? 'F' : 'B';
  return dir.length === 1 ? [one(dir)] : [one(dir[0]), one(dir[1])];
}
function pickKind(prev) {
  const ch = C.chain, n = ch.links;
  if (n >= ch.len - 1) return 'FIN';
  // C10A: a mastered skill now and then, in the middle of a chain long enough to have one, when it is ready
  if (n >= 1 && ch.len >= 3 && prev !== 'S' && known('double') && ready('double') && Math.random() < PT.skillLink) return 'S';
  const pool = ['F', 'U', 'B', 'D', 'T'].filter(k => k !== prev && !(n === 1 && k === 'F'));   // the opening cut is already a forward one
  return pool[Math.random() * pool.length | 0];
}
function open(kind, e) { C.prompt = { kind, age: 0, face: faceTo(e), e }; }
function grade(age) {
  if (Math.abs(age - PT.lead) <= PT.perfect) return 'PERFECT';
  return age <= PT.lead + PT.win * .6 ? 'GOOD' : 'LATE';
}
const note = o => { C.answers++; C.log.push(o); if (C.log.length > 12) C.log.shift(); };
// an answer from any input: the kinds it could mean ('T', 'F', ..., 'K', 'S') and how it came
export function answer(kinds, via) {
  const p = C.prompt; if (!p || C.lock > 0) return false;
  const want = p.kind === 'FIN' ? 'F' : p.kind;
  if (!kinds.includes(want) && !(p.kind === 'K' && kinds.includes('T'))) {   // a tap (or J) also answers K
    C.stats.wrong++; note({ kind: p.kind, via, kinds, grade: 'WRONG' }); miss('WRONG'); return true; }
  // Auto and Hold play on the beat but earn no Perfect: Perfect's Qi is for a press timed by hand
  const g = via === 'auto' || via === 'hold' ? 'GOOD' : grade(p.age);
  C.stats[g.toLowerCase()]++; C.stats.links++; note({ kind: p.kind, via, kinds, grade: g, age: p.age });
  flash(g, g === 'PERFECT' ? 'white' : g === 'GOOD' ? 'cyan' : 'grey');
  if (g === 'PERFECT') { qiAdd(.04); for (let i = 0; i < 8; i++) { const a = i / 8 * 6.28; spark(P.x + p.face * 6, P.y - 14, Math.cos(a) * 70, Math.sin(a) * 50, .14, i % 2 ? '#ffffff' : COL.fx2, true); } }
  if (p.kind === 'K') { C.pendingK = true; C.prompt = null; endChain('K'); return true; }
  C.queued = { kind: p.kind, e: p.e }; C.prompt = null; return true;
}
function miss(why) {
  C.stats.miss++; flash(why, 'red'); C.prompt = null; endChain(why);
  C.lock = PT.recover;   // the recovery: a beat where J and gestures do nothing while the cut finishes
}
function flash(word, tone) { C.flash = { word, tone, t: 0 }; if (C.prompt) C.lastPrompt = C.prompt; }
function endChain(why) {
  const ch = C.chain; if (!ch) return;
  C.stats.longest = Math.max(C.stats.longest, ch.links);
  C.last = { links: ch.links, hits: ch.hits, why, t: 0 }; C.chain = null; C.queued = null;
}
// the chain stops quietly (a dodge or a skill cut it short, he died): no recovery
export function dropChain(why = 'cancel') { C.prompt = null; C.queued = null; C.pendJ = null; endChain(why); }

// ---- before the step: the keys. J (with the direction held, or one pressed within PT.chord of it) answers; K answers K's prompt,
// I a skill link. While a chain is on, J never starts a cut by itself (no mashing through), and the arrows never steer him ----
const dirOf = inp => (inp.my < 0 ? 'U' : inp.my > 0 ? 'D' : '') + (inp.mx > 0 ? 'R' : inp.mx < 0 ? 'L' : '');
function resolveJ(dir, via) { C.pendJ = null; answer(dir ? kindsOf(dir, C.prompt ? C.prompt.face : P.face) : ['T'], via); }
export function promptIn(inp, dt) {
  C.lock = Math.max(0, C.lock - dt);
  if (C.pendingK && FREE.test(P.state)) { if (K.pick) inp.tele = true; C.pendingK = false; }   // K's prompt answered during the finisher: once it ends (never a plain blink)
  // C2A's slack both ways: a direction let go just before the J still counts if it was pressed within the chord's 70 ms
  let dir = dirOf(inp); if (dir) { C.lastDir = dir; C.dirAge = 0; } else C.dirAge = (C.dirAge || 0) + dt;
  if (!dir && inp.slash && C.lastDir && C.dirAge <= PT.chord) dir = C.lastDir;
  if (C.prompt && C.lock <= 0) {
    if (C.pendJ != null && (inp.dirTap || (C.pendJ += dt) >= PT.chord)) resolveJ(dir, dir ? 'J then direction' : 'J');
    if (inp.slash && C.prompt) { if (dir || C.prompt.kind === 'T') resolveJ(dir, dir ? 'J + direction' : 'J'); else C.pendJ = 0; }
    if (inp.tele && C.prompt && C.prompt.kind === 'K') { answer(['K'], 'K'); inp.tele = false; B.tele = 0; }
    if (inp.double && C.prompt && C.prompt.kind === 'S') { answer(['S'], 'I'); inp.double = false; B.double = 0; }
  }
  if (C.chain || C.prompt || C.lock > 0) { inp.slash = false; B.slash = 0; }
  if (steering()) inp.mx = inp.my = 0, inp.ax = inp.ay = null, inp.walk = false;
}
// while a chain is on (a prompt open, a link waiting or playing) or in the recovery, steering is swallowed:
// an arrow held for a chord never turns him round mid-chain
export const steering = () => !!(C.prompt || C.queued || C.lock > 0 || (C.chain && inLink(P.state)));
export const chainOn = () => !!(C.chain || C.prompt || C.queued);

// ---- after the step: open prompts on a landed link, play the answered link on its chain beat, run the window ----
export function promptTick(dt, holding) {
  if (C.flash) C.flash.t += dt; if (C.last) C.last.t += dt;
  const s = P.state;
  // a chain starts with the game's own first cut (J, a tap, a click on a samurai, or a swipe that lunges)
  if ((s === 'slash1' || s === 'slash1r') && !C.chain && P.ev !== C.evSeen) {
    C.chain = { links: 1, hits: 0, base: 0, landed: false, prev: 'F', len: Math.max(2, comboMax()) }; C.stats.chains++; C.evSeen = P.ev; }
  const ch = C.chain;
  if (ch && !inLink(s) && !BETWEEN.test(s)) { dropChain(s === 'exec' ? 'K' : 'cancel'); return; }   // a dodge, a skill, an execution
  if (ch && inLink(s)) {
    if (P.ev !== C.evSeen) { C.evSeen = P.ev; ch.landed = false; ch.base = ch.hits; }   // a new link began
    ch.hits = ch.base + P.struck.size;
    if (!ch.landed && P.struck.size) { ch.landed = true;
      const e = [...P.struck].find(q => q.alive) || nearest();
      if (ch.prev === 'FIN') { if (K.pick) open('K', K.pick); else endChain('done'); }
      else open(pickKind(ch.prev), e); }
    if (!ch.landed && !C.prompt && P.t > strikeOf(s)) ch.landed = 'whiff';   // a whiff: no prompt, the chain ends with the cut
  }
  // the answered link: from the current link's chain beat, or at once from a stance. The cut steps in to reach him itself
  // (player/combo.js aimCut), so this only turns him to face whoever he is cutting
  if (C.queued && (!inLink(s) || P.t >= goOf(s))) {
    const q = C.queued; C.queued = null;
    const e = q.e && q.e.alive ? q.e : nearest(); P.face = faceTo(e); P.z = 0; P.inv = false; P.armed = true;
    // a skill link is cast in reach: no dash past him
    if (q.kind === 'S') { setState('double'); P.hk = 'double'; P.blinkDir = [0, 0]; startCd('double'); } else setState(MOVE[q.kind]);
    if (C.chain) { C.chain.links++; C.chain.prev = q.kind; }
  }
  if (C.prompt) {
    const p = C.prompt; p.age += dt;
    if (p.kind === 'K' && !K.pick) { C.prompt = null; endChain('done'); return; }   // nobody lone in reach any more: no execution to offer
    if (p.kind !== 'K' && PT.assist === 'auto' && p.age >= PT.lead) answer([p.kind === 'FIN' ? 'F' : p.kind], 'auto');
    else if (p.kind !== 'K' && PT.assist === 'hold' && holding && p.age >= PT.lead) answer([p.kind === 'FIN' ? 'F' : p.kind], 'hold');
    else if (p.age > PT.lead + PT.win) { if (p.kind === 'K') { C.prompt = null; endChain('done'); } else miss('MISS'); }   // K left alone: the chain was complete
  }
  if (C.chain && !C.prompt && !C.queued && !inLink(P.state)) endChain(C.chain.landed === 'whiff' ? 'whiff' : 'done');
}
