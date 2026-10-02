import { P, S } from '../state.js';
import { FEEL, cutCancel } from './feel.js';
import { CUTS } from './combo.js';
import { gate } from './cooldowns.js';

// ---- The input buffer and the cancel windows (owner pick Q3A: generous Dead Cells cancels, a 0.2 s buffer) ----
// A press is remembered for FEEL.buffer seconds and fires on the first step that can take it: right after a hit pause (which
// dropped it before), at a cancel window, or when a move ends. Remembered presses are replayed into the step's input; one is
// forgotten as soon as the step used it (the move it starts began, J lined up the next cut, it was refused), so it never fires twice.
const KEYS = ['slash', 'jump', 'slide', 'tele', 'double', 'rift', 'moon', 'mirror', 'sweep', 'act'];
// the states each key starts: seeing one begin is how the buffer knows its press was used
const STARTS = { slash: /^slash/, jump: /^jump$/, slide: /^slide$/, tele: /^(tele|exec)$/, double: /^double$/, rift: /^double$/,
  moon: /^moonHold$/, mirror: /^meditate$/, sweep: /^sweep$/, act: /./ }, QUICK = /^(bomb|talisman|whet|incense)$/;
export const B = Object.fromEntries([...KEYS, 'q0', 'q1', 'q2', 'q3'].map(k => [k, 0]));   // seconds each press has left
const get = (inp, k) => k[0] === 'q' && k.length === 2 ? inp.quick[+k[1]] : inp[k];
const put = (inp, k, v) => { if (k[0] === 'q' && k.length === 2) inp.quick[+k[1]] = v; else inp[k] = v; };
let mark = null;
// before the step: refuse what the cooldowns and mastery refuse (the slot blinks; a refused press is never remembered),
// remember the rest, and outside a hit pause replay what is remembered. A hit pause freezes the buffer, so a press made in it
// always survives it
export function bufferIn(inp, dt) {
  gate(inp);
  for (const k in B) if (get(inp, k)) B[k] = FEEL.buffer;
  const replayed = [];
  if (!(S.hitstop > 0)) for (const k in B) if (B[k] > 0) {
    if (!get(inp, k)) { put(inp, k, true); replayed.push(k); }
    B[k] = Math.max(0, B[k] - dt); }
  // a remembered key whose skill went on cooldown (or Flow was spent) since the press: dropped quietly, no second blink
  if (replayed.length) { const deny = { ...P.cdDeny }; gate(inp);
    for (const k of replayed) if (!get(inp, k)) { B[k] = 0; P.cdDeny[k] = deny[k] || 0; } }
  mark = { ev: P.ev, deny: { ...P.cdDeny }, act: inp.act, frozen: S.hitstop > 0 };
}
// after the step: forget every press it used
export function bufferOut(inp) {
  if (mark.frozen) return;   // the step stood still: nothing could use them
  const changed = P.ev !== mark.ev, s = P.state;
  if (changed && s === 'standUp') { for (const k in B) B[k] = 0; return; }   // getting up from the sit carries them (P.pending)
  for (const k in B) { if (!(B[k] > 0)) continue;
    const used = (changed && (k[0] === 'q' && k.length === 2 ? QUICK : STARTS[k]).test(s))
      || P.cdDeny[k] > (mark.deny[k] || 0)            // refused (no blink charge left)
      || (k === 'slash' && /^slash/.test(s) && P.combo)   // J lined up the next cut
      || (k === 'tele' && s === 'exec')                   // K lined up the next execution
      || (k === 'act' && (P.ePress || (mark.act && inp.act === false))); // E latched as a tap or hold (items), or a recruit or lift took it
    if (used) B[k] = 0; }
}
// the cancel window a move is in now: the key groups that may cut it short (FEEL.cancel, the J ladder's from its strike), or null
export function cancelOf(s, T) {
  const w = CUTS[s] ? cutCancel(CUTS[s].sk) : FEEL.cancel[s]; if (!w) return null;
  const dodge = T >= w.dodge, skill = T >= w.skill;
  return dodge || skill ? { dodge, skill } : null;
}
// only the keys a cancel window lets through
export function only(inp, w) {
  const q = { ...inp, slash: false, act: false, sit: false, quick: [false, false, false, false] };
  if (!w.dodge) q.jump = q.slide = false;
  if (!w.skill) q.tele = q.double = q.rift = q.moon = q.mirror = q.sweep = false;
  return q;
}
