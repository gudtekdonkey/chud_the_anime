import { P } from '../state.js';
import { held } from '../input.js';
import { CUTS } from './combo.js';
import { setState, pickStance, blink, ghost } from './actions.js';
import { B } from './buffer.js';
import { PT, C, FREE, answer, kindsOf, chainOn, dropChain } from './prompts.js';
import { living } from '../world/enemies.js';
import { residue, spark } from '../fx/util.js';
import { VEC } from '../gestures.js';

// ---- What a gesture does (the approved swipe scheme, prototype 46: C7A two thumbs, C8A double tap = K, C9A hold = charge) ----
// The recogniser (src/gestures.js, wired in src/pointer.js) queues gestures as they happen; they are decided here, inside the
// fixed step, so the combo prompts, the buffer and the states see them exactly as they see a key.
//   tap J · swipe: a dash (the slide) that way, or a lunge cut when it points at a samurai within LUNGE px and 40° · swipe up: jump
//   hold: I held (Thousand Cuts), letting go fires · double tap: K, read on the second touch: the first tap's cut gives way while it
//   is still winding up · flick there and back: the parry stance (F's counter is not built: the stance only) · two fingers: a skill
//   (PT.two: the last one used, or a chosen one) · with a prompt open every gesture is its answer (a swipe that way, a tap J)
export const TOUCH = { q: [], stick: null, holdOn: false, charging: false };
const LUNGE = 96, CONE = Math.cos(40 * Math.PI / 180);
export const queue = g => TOUCH.q.push(g);
function lungeTarget(dir) {
  const [vx, vy] = VEC[dir]; let best = null, bd = LUNGE;
  for (const e of living()) { const dx = e.x - P.x, dy = e.y - P.y, d = Math.hypot(dx, dy); if (d > bd || d < 4 || e.held) continue;
    if ((dx * vx + dy * vy) / d > CONE) { best = e; bd = d; } }
  return best;
}
const sgn8 = v => Math.abs(v) < .3 ? 0 : Math.sign(v);   // a stick or swipe vector to the keys' -1 / 0 / 1 (his facing)
function steer(inp, [vx, vy]) { inp.mx = sgn8(vx); inp.my = sgn8(vy); inp.ax = vx; inp.ay = vy; }
// before the step (player/update.js): the stick, then every gesture since the last step
export function touchIn(inp) {
  const st = TOUCH.stick;
  if (st && st.on && !inp.mx && !inp.my && (st.mx || st.my)) { steer(inp, [st.mx, st.my]); inp.walk = st.walk; }
  for (const g of TOUCH.q.splice(0)) act(g, inp);
}
function act(g, inp) {
  PT.touch = true;
  if (g.kind === 'hold-end') { TOUCH.holdOn = false; if (TOUCH.charging) { held.delete('double'); TOUCH.charging = false; } return; }
  if (g.kind === 'none' || C.lock > 0) return;   // the recovery: gestures do nothing
  if (C.prompt) {   // a prompt is open: the gesture is the answer
    if (g.kind === 'hold-start') { TOUCH.holdOn = true; return; }   // Hold to continue (a setting) answers on the beat
    const kinds = g.kind === 'tap' ? ['T'] : g.kind === 'double' ? (C.prompt.kind === 'K' ? ['K'] : ['T']) : g.kind === 'swipe' ? kindsOf(g.dir, C.prompt.face) : g.kind === 'two' ? ['S'] : [];
    answer(kinds, g.kind === 'swipe' ? 'swipe ' + g.dir : g.kind === 'double' ? 'double tap' : g.kind); return;
  }
  if (g.kind === 'double') {   // K: the first tap's cut is still winding up, so it gives way to the execution or the blink
    if (/^slash1r?$/.test(P.state) && P.t < CUTS.slash1.sk) { setState('idle'); dropChain(); }
    B.slash = 0; inp.slash = false; inp.tele = true; return; }
  if (chainOn()) return;   // mid-chain with no prompt open yet: a gesture does nothing (no mashing through)
  if (g.kind === 'tap') { inp.slash = true; return; }
  if (g.kind === 'hold-start') { TOUCH.holdOn = true; if (!held.has('double')) { held.add('double'); TOUCH.charging = true; } inp.double = true; return; }
  if (g.kind === 'two') { const k = PT.two === 'last' ? P.lastSkill || 'double' : PT.two; inp[k] = true; return; }
  if (g.kind === 'flick') {
    if (FREE.test(P.state)) { setState(pickStance()); P.armed = true; P.still = 0;
      for (let i = 0; i < 6; i++) spark(P.x + P.face * 10, P.y - 16, P.face * (40 + i * 12), -20 + i * 8, .12, '#ffffff', true); }
    return; }
  if (g.kind === 'swipe') {
    if (g.dir === 'U') { inp.jump = true; return; }
    const e = lungeTarget(g.dir);
    if (e) { if (!FREE.test(P.state)) return;
      // the lunge: a glitch dash to just short of him, then the cut (which tracks him the last steps, player/combo.js aimCut)
      const dx = e.x - P.x, dy = e.y - P.y, m = Math.hypot(dx, dy), go = Math.max(0, m - 18);
      P.face = Math.sign(dx) || P.face; ghost(); residue(P.x, P.y, 5); blink(go, [dx / m, dy / m]); P.face = Math.sign(e.x - P.x) || P.face;
      inp.slash = true; return; }
    inp.slide = true; steer(inp, VEC[g.dir]);
  }
}
