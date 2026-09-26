import { P, S, wear } from '../state.js';
import { g } from '../screen.js';
import { kill } from '../world/enemies.js';
import { K } from '../assassin/markers.js';
import { qiAdd } from '../player/qi.js';
import { setState } from '../player/actions.js';
import { residue } from '../fx/util.js';
import { PAIRED, fits, ROSTER } from './kit.js';
import { standing, busy, say } from './companions.js';
import { frames, poseOf, lenOf, paint, place, faceTo, white } from './figures.js';
import { sideOn } from '../rig/turn.js';

// ---- Paired executions, on the odd occasion (owner): K with a companion nearby who is set up for it (meets the execution's needs) ----
// The crossing cut: he glitches to the near side, the partner closes on the far side, both pass through him, hold, and resheathe
// together; he falls on the shared click. P.state is 'exec' throughout, so the state machine leaves him to us, as it does for K's stage.
export let X = null;
export const PAIRS = { done: 0 };   // paired kills so far (npm run check reads it)
const HERO = ROSTER[0], ghosts = [], lines = [];
// who and whom K would take now: K's own pick, or failing that the nearest enemy close by, with a free partner close to him
export function pairCandidate() {
  if (X) return null;
  const e = K.pick || (K.near && Math.hypot(K.near.x - P.x, (K.near.y - P.y) * 1.3) < 52 ? K.near : null);
  if (!e || e.held) return null;
  const a = standing().filter(a => !busy(a) && PAIRED.some(ex => fits(a.c, ex)) && Math.hypot(a.x - e.x, a.y - e.y) < 72)
    .sort((p, q) => Math.hypot(p.x - e.x, p.y - e.y) - Math.hypot(q.x - e.x, q.y - e.y))[0];
  return a ? { e, a, ex: PAIRED.find(ex => fits(a.c, ex)) } : null;
}
export function startPair({ e, a, ex }) {
  const s = Math.sign(P.x - e.x) || 1;
  X = { t: 0, e, a, s, ex, h0: [P.x, P.y], a0: [a.x, a.y], A: [e.x + s * 13, e.y], B: [e.x - s * 13, e.y], cut: false, click: false, anim: 'slash1', ht: 0 };
  ghost(P.x, P.y, P.face, poseOf(frames(HERO, 'idle'), 0), true); residue(P.x, P.y, 5);
  setState('exec'); P.face = -s; a.face = faceTo(a.F, a.face, s); e.face = s; e.held = false;
  a.anim = 'slash1'; a.t = 0; a.armed = true; a.hitDone = true; a.target = null;
  say(ex.name + ' WITH ' + a.c.name, 1.2);
}
const ez = k => k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
const lerp2 = (p, q, k) => [p[0] + (q[0] - p[0]) * k, p[1] + (q[1] - p[1]) * k];
function ghost(x, y, face, pose, hero, alpha = .55) { ghosts.push({ x, y, face, pose, hero, t: 0, alpha, F: hero ? wear : X && X.a.F }); }
// one step; false when no paired execution is running
export function pairStep(dt) {
  for (const gh of ghosts) gh.t += dt; while (ghosts.length && ghosts[0].t > .3) ghosts.shift();
  for (const l of lines) l.t += dt; while (lines.length && lines[0].t > .5) lines.shift();
  if (!X) return false;
  const x = X, { e, a, s } = x; x.t += dt; const t = x.t;
  if (a.state !== 'up' || (!e.alive && !x.click)) { end(); return true; }
  e.state = 'stagger'; e.t = .05; e.vx = 0;   // he is held where he stands until the click
  const set = (p, q) => { if (p === P) [P.x, P.y] = q; else [p.x, p.y] = q; };
  // 0 - .16: he is already on the near side; they close on the far side, a trail of afterimages behind them
  if (t < .16) { set(P, x.A); if (Math.floor(t / .04) !== Math.floor((t - dt) / .04)) ghost(a.x, a.y, a.face, poseOf(frames(a.c, 'slash1'), a.t), false, .4);
    set(a, lerp2(x.a0, x.B, ez(t / .16))); x.ht = a.t = Math.min(t, .09); }
  // .16 - .26: both drive through him and past each other; the cut lands at .2 with the deaths pass's impact frames
  else if (t < .26) { const k = ez((t - .16) / .1); set(P, lerp2(x.A, [e.x - s * 20, e.y + 2], k)); set(a, lerp2(x.B, [e.x + s * 20, e.y - 2], k));
    x.ht = a.t = .09 + (t - .16) * 1.2;
    if (!x.cut && t >= .2) { x.cut = true; S.hitstop = .09; S.shake = .15; S.impact = 2; e.flash = 2 / 60;
      lines.push({ x: e.x, y: e.y - 11, a: .6, t: 0 }, { x: e.x, y: e.y - 11, a: -.7, t: 0 }); } }
  // the follow-through, held; then both resheathe together and he falls on the click
  else if (t < .8) { x.ht = a.t = .21 + (t - .26); const L = lenOf(frames(HERO, 'slash1'));
    if (x.ht > L) { x.anim = 'ready'; x.ht -= L; } if (a.t > lenOf(frames(a.c, 'slash1'))) { a.anim = 'ready'; a.t = 0; } }
  else if (t < 1.25) { x.anim = 'sheathe'; a.anim = 'sheathe';
    x.ht = a.t = Math.min(lenOf(frames(HERO, 'sheathe')), (t - .8) * 2.4);
    if (!x.click && t > 1.12) { x.click = true; PAIRS.done++; kill(e, { dir: -s, vx: -s * 30, by: a, pair: a }); S.shake = .1; qiAdd(.15); } }
  else end();
  return true;
}
function end() {
  const { a } = X; X = null;
  a.anim = 'idle'; a.t = 0; a.armed = false; P.armed = false; setState('idle');
}
const heroPose = () => poseOf(frames(HERO, X.anim), X.ht);
// the hero while it runs (the state machine does not draw him in 'exec'), the ghosts, and the crossing cut's two white lines
export function pairedDrawables() {
  const out = ghosts.map(gh => ({ y: gh.y - .1, d: () => gh.F && place(g, white(paint(gh.F, gh.pose, 0, gh.hero ? 'hero' : 'ally', ...sideOn(null, gh.face))), gh.x, gh.y, 1, { alpha: gh.alpha * (1 - gh.t / .3) }) }));
  if (X) out.push({ y: P.y, d: () => place(g, paint(wear, heroPose(), S.hitstop > 0 ? 0 : 1 / 60, 'hero', ...sideOn(null, P.face)), P.x, P.y, 1) });
  return out;
}
export function drawPairLines() {
  for (const l of lines) { g.save(); g.globalAlpha = Math.max(0, 1 - l.t / .5); g.fillStyle = '#ffffff';
    for (let k = -11; k <= 11; k++) g.fillRect(Math.round(l.x + k), Math.round(l.y + k * l.a), 1, 1); g.restore(); }
}
