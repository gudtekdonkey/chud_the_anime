// prototypes/46-combo-prompts.html: the combo prompt system, layered on the game's own J ladder (src/player/combo.js) without changing it.
// A landed cut opens a prompt for the next link: a direction (relative to the enemy, so → always means "at him"), or a tap / J.
// Answer it inside the window and the next cut plays from the current one's chain beat (GO, 0.3 s), as J does today; each direction
// is a different cut. Miss it, or answer wrong, and the chain ends (or softer, by setting). The last link is the finisher, and on a
// lone enemy the finisher can hand over to K.
import { P } from '../../src/state.js';
import { CUTS, GO } from '../../src/player/combo.js';
import { setState, blink, ghost, moveBy } from '../../src/player/actions.js';
import { living } from '../../src/world/enemies.js';
import { K } from '../../src/assassin/markers.js';
import { qiAdd } from '../../src/player/qi.js';
import { spark } from '../../src/fx/util.js';
import { COL } from '../../src/config.js';

// what each answer plays: the J ladder's own cuts, picked by direction instead of by count
export const MOVE = { F: 'slash1r', U: 'slash5', B: 'slash3', D: 'slash4', T: 'slash2', FIN: 'slash6' };
export const MOVE_NAME = { F: 'lunge cut', U: 'rising launch', B: 'spin cut', D: 'front kick', T: 'answer cut', FIN: 'flash step', K: 'execution' };
// the letter schemes: each letter is a move, not a direction. T Y B M are the letters nothing in src/input.js uses (and nothing is reserved for);
// Q W E R is the owner's first idea: during a prompt they answer it, so W does not move and E does not use
export const LETTERS = { tybm: { t: 'B', y: 'U', b: 'D', m: 'F' }, qwer: { q: 'B', w: 'U', e: 'F', r: 'D' } };
export const MAGNET = 36;   // px a link may step in to reach him
export const T = { mode: 'prompt', scheme: 'dirJ', win: .35, lead: .18, slow: 1, assist: 'normal', miss: 'recover', len: 5, where: 'enemy', kfin: true, perfect: .05 };
export const C = { chain: null, prompt: null, queued: null, lock: 0, best: 0, hold: false, pendingK: false,
  stats: { chains: 0, links: 0, perfect: 0, good: 0, late: 0, miss: 0, wrong: 0, longest: 0 }, flash: null, last: null };
let say = () => {};
export const onSay = f => { say = f; };

const isCut = s => !!CUTS[s];
const target = () => { let b = null, br = 1e9; for (const e of living()) { const r = Math.hypot(e.x - P.x, (e.y - P.y) * 1.3); if (r < br) { br = r; b = e; } } return b; };
const faceTo = e => (e && Math.sign(e.x - P.x)) || P.face;
// the arrow a kind shows on screen, given which way he faces the enemy
export function screenDir(kind, face) { if (kind === 'F' || kind === 'FIN') return face > 0 ? 'R' : 'L'; if (kind === 'B') return face > 0 ? 'L' : 'R'; return kind; }
// the kinds a screen direction can answer: exact, or (assist normal and up) a diagonal for either of its neighbours
export function kindsOf(dir, face, assist) {
  const one = d => d === 'U' ? 'U' : d === 'D' ? 'D' : (d === 'R') === (face > 0) ? 'F' : 'B';
  if (dir.length === 1) return [one(dir)];
  return assist === 'strict' ? [] : [one(dir[0]), one(dir[1])];
}
export const letterOf = (kind, scheme) => { const L = LETTERS[scheme]; if (!L) return null; const k = kind === 'FIN' ? 'F' : kind; return Object.keys(L).find(c => L[c] === k) || null; };

function pickKind(prev) {
  const n = C.chain.links;
  if (n >= T.len - 1) return 'FIN';
  const pool = ['F', 'U', 'B', 'D', 'T'].filter(k => k !== prev && !(n === 1 && k === 'F'));   // the opening cut is already a forward one
  return pool[Math.random() * pool.length | 0];
}
function open(kind) {
  const e = target();
  C.prompt = { kind, age: 0, face: faceTo(e), e, wrongs: 0 };
  say('prompt', { kind, dir: screenDir(kind, C.prompt.face) });
}
// the window: the ring closes at `lead` (the perfect beat), the prompt stays open `win` after it (half again on generous)
const winOf = () => T.win * (T.assist === 'generous' ? 1.5 : 1);
function grade(age) {
  if (Math.abs(age - T.lead) <= T.perfect * (T.assist === 'generous' ? 1.4 : 1)) return 'PERFECT';
  if (age < T.lead) return T.assist === 'strict' && age < T.lead - .1 ? 'EARLY' : 'GOOD';
  return age <= T.lead + winOf() * .6 ? 'GOOD' : 'LATE';
}
// an answer from any input: kinds it could mean ('T', 'F', ..., 'K'), and how it came
export function answer(kinds, via) {
  const p = C.prompt; if (!p || C.lock > 0) return false;
  const want = p.kind === 'FIN' ? 'F' : p.kind;
  if (!kinds.includes(want) && !(p.kind === 'K' && kinds.includes('T'))) {   // a tap also answers K on the phone
    C.stats.wrong++;
    if (T.assist === 'generous') { p.wrongs++; flash('WRONG', 'grey'); say('wrong', { via, kinds }); return true; }
    say('wrong', { via, kinds }); miss('WRONG'); return true;
  }
  const g = grade(p.age);
  if (g === 'EARLY') { say('early', { via }); miss('EARLY'); return true; }
  C.stats[g.toLowerCase()]++; C.stats.links++;
  flash(g, g === 'PERFECT' ? 'white' : g === 'GOOD' ? 'cyan' : 'grey');
  if (g === 'PERFECT') { qiAdd(.04); for (let i = 0; i < 8; i++) { const a = i / 8 * 6.28; spark(P.x + p.face * 6, P.y - 14, Math.cos(a) * 70, Math.sin(a) * 50, .14, i % 2 ? '#ffffff' : COL.fx2, true); } }
  say('hit', { kind: p.kind, grade: g, via, age: p.age });
  if (p.kind === 'K') { C.pendingK = true; C.prompt = null; endChain('K'); return true; }
  C.queued = { kind: p.kind, e: p.e }; C.prompt = null; return true;
}
function miss(why) {
  C.stats.miss++; flash(why === 'WRONG' ? 'WRONG' : why === 'EARLY' ? 'EARLY' : 'MISS', 'red');
  if (T.miss === 'forgive' && C.chain && !C.chain.forgiven && C.prompt && C.prompt.kind !== 'K') {   // one slip a chain: the multiplier drops, a new prompt comes
    C.chain.forgiven = true; C.chain.mult = .5; const k = C.prompt.kind; C.prompt = null; open(pickKind(k)); C.prompt.age = -.12; return; }
  C.prompt = null; endChain(why);
  if (T.miss === 'recover') C.lock = .45;   // the recovery: a beat where J and gestures do nothing, he finishes the cut and resets
}
function flash(word, tone) { C.flash = { word, tone, t: 0 }; if (C.prompt) C.lastPrompt = C.prompt; }
function endChain(why) {
  const ch = C.chain; if (!ch) return;
  C.stats.longest = Math.max(C.stats.longest, ch.links); C.best = Math.max(C.best, ch.hits);
  say('end', { why, links: ch.links, hits: ch.hits }); C.last = { ...ch, why, t: 0 }; C.chain = null;
}
// every fixed step, after the game's update. dt is game time (slowed with the world)
export function tick(dt, holding) {
  C.lock = Math.max(0, C.lock - dt); if (C.flash) C.flash.t += dt; if (C.last) C.last.t += dt;
  const s = P.state;
  // free mode: the game's own ladder; only count what lands
  if (T.mode === 'free') { C.prompt = null; C.queued = null;
    if (isCut(s) && P.ev !== C.evSeen) { C.evSeen = P.ev; if (!C.chain) { C.chain = { links: 0, hits: 0 }; C.stats.chains++; } C.chain.links++; C.counted = false; }
    if (isCut(s) && C.chain && !C.counted && P.struck.size) { C.counted = true; C.chain.hits += P.struck.size; }
    if (!isCut(s) && C.chain && s !== 'land') endChain('done');
    return; }
  // a chain starts with the game's own first cut (J, a tap, or a swipe that lunges)
  if ((s === 'slash1' || s === 'slash1r') && !C.chain && P.ev !== C.evSeen) { C.chain = { links: 1, hits: 0, landed: false, prev: 'F', mult: 1 }; C.stats.chains++; C.evSeen = P.ev; say('start', {}); }
  const ch = C.chain;
  if (ch && isCut(s)) {
    if (P.ev !== C.evSeen) { C.evSeen = P.ev; ch.landed = false; }   // a new link began
    if (!ch.landed && P.struck.size) { ch.landed = true; ch.hits += P.struck.size;
      if (ch.prev === 'FIN') { if (T.kfin && K.pick) open('K'); else endChain('done'); }
      else open(pickKind(ch.prev)); }
    if (!ch.landed && !C.prompt && P.t > CUTS[s].sk + .12) { ch.landed = 'whiff'; say('whiff', {}); }
  }
  // the queued link: from a cut's chain beat, or at once from a stance
  if (C.queued && (!isCut(s) || P.t >= GO) && s !== 'exec') {
    const q = C.queued; C.queued = null;
    const e = q.e && q.e.alive ? q.e : target(); P.face = faceTo(e); P.z = 0; P.inv = false;
    // the link's step in: a hit shoves the samurai back, so each link closes the gap first (up to MAGNET px, an afterimage left
    // behind), as Dead Cells' attacks track their target. The finisher and the spin need no help: one passes him, one cuts all round
    if (e && q.kind !== 'FIN') { const dx = e.x - P.x, gap = Math.abs(dx) - 16, dy = e.y - P.y; say('step', { kind: q.kind, gap, max: MAGNET, dx, dy });
      if (gap > 2) { ghost(); blink(Math.min(MAGNET, gap), [Math.sign(dx), 0]); }
      if (Math.abs(dy) > 3) moveBy(0, Math.sign(dy) * Math.min(Math.abs(dy) - 2, 10)); }
    setState(MOVE[q.kind]); if (C.chain) { C.chain.links++; C.chain.prev = q.kind; }
  }
  if (C.prompt) {
    const p = C.prompt; p.age += dt;
    if (T.assist === 'auto' && p.age >= T.lead) answer([p.kind === 'FIN' ? 'F' : p.kind], 'auto');
    else if (T.assist === 'hold' && holding && p.age >= T.lead) answer([p.kind === 'FIN' ? 'F' : p.kind], 'hold');
    else if (p.age > T.lead + winOf()) { say('timeout', {}); miss('MISS'); }
  }
  // a chain with nothing open or queued ends once he is out of the cut (a whiff, or the finisher with no K)
  if (C.chain && !C.prompt && !C.queued && !isCut(P.state)) endChain(C.chain.landed === 'whiff' ? 'whiff' : 'done');
}
// while a prompt is open (or a link waits), steering is swallowed so an arrow never turns him round mid-chain
export const steering = () => T.mode === 'prompt' && !!(C.prompt || C.queued);
export const chainOn = () => T.mode === 'prompt' && !!C.chain;
