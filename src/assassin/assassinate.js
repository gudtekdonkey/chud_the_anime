import { g } from '../screen.js';
import { P, S } from '../state.js';
import { rr } from '../fx/util.js';
import { setState } from '../player/actions.js';
import { onAssassination } from '../player/cooldowns.js';
import { collide } from '../world/room.js';
import { EG, SET } from './enemy-poses.js';
import { EXECS } from './executions.js';
import { withShadow, drawPieces, updatePieces } from './pieces.js';
import { F, FX, updateStageFx, drawStageFloor, drawStageTop } from './stage-fx.js';
import { hold, faceOf, roomFade } from './targets.js';

// ---- K on an isolated enemy: he flashes to him and plays an execution ----
// Each execution plays on its own stage: the two bodies, the pieces and the effects, in a frame where the enemy faces left.
// The stage is drawn mirrored round the enemy when he faces right. His body lies there with the rest of the fallen
// and fades with them when the room is cleared.
export const stages = [];
const PRE = .2;       // the set and the vanish before he lands (the prototype's 0.75 s lock-on beat, cut down for play)
let lastExec = -1;
export function assassinate(e) {
  let k; do k = Math.random() * EXECS.length | 0; while (k === lastExec && EXECS.length > 1); lastExec = k;
  const ox = Math.round(e.x), m = -faceOf(e);
  const St = { ex: EXECS[k], target: e, ox, m, clock: -PRE, stop: 0, shake: 0, fx: FX(), pieces: [], ev: new Set(), flashUntil: 0,
    start: { x: ox + m * (P.x - ox), y: P.y }, E: { x: ox, y: e.y, face: -1, pose: EG, enemy: true, z: 0 }, R: null, freed: false };
  St.once = (key, cond, fn) => { if (cond && !St.ev.has(key)) { St.ev.add(key); fn(); } };
  hold(e); stages.push(St);
  setState('exec'); P.inv = true; P.exec = St;
}
// runs after the hit pause, so a hit's freeze stops the performance too
export function tickStages(dt) {
  for (const St of stages) {
    St.clock += dt; const c = St.clock, ex = St.ex, E = St.E;
    if (c >= ex.dur) { if (!St.freed) free(St); continue; }   // the body has come to rest: it just lies there
    const R = St.R = { x: St.start.x, y: St.start.y, face: 1, pose: SET };
    if (c < 0) {   // the set: weight forward, hand on the hilt, breaking into slices, gone
      const u = c + PRE; R.glitch = u / PRE * 1.6;
      St.once('out', u >= PRE - .05, () => F.slivers(St, R.x, R.y, 10));
      R.hidden = u >= PRE - .05;
    } else {
      R.x = St.ox + ex.side * ex.gap; R.y = E.y + 1;
      St.once('in', true, () => { F.slivers(St, R.x, R.y, 8);
        for (let k = 0; k < 5; k++) { const a = rr(0, 6.28); F.zap(St, R.x + Math.cos(a) * 6, R.y - 10 + Math.sin(a) * 8, R.x + Math.cos(a + 1) * 9, R.y - 10 + Math.sin(a + 1) * 10, rr(.05, .1), 1.6, ['#6ff3e4', '#b8fff6', '#ffffff'][k % 3]); } });
      E.flashT = 0;
      ex.run(St, c, R, E);
      if (E.flashT) St.flashUntil = c + E.flashT;
      if (c < .05 && !ex.stay) R.glitch = (.05 - c) * 24;
      if (!St.freed && c >= ex.free) free(St);
    }
    E.flash = St.flashUntil > c;
    // the stage's hit pauses and shakes are the game's
    if (St.stop) { S.hitstop = Math.max(S.hitstop, St.stop); St.stop = 0; }
    if (St.shake) { S.shake = Math.max(S.shake, St.shake); St.shake = 0; }
  }
}
// he has sheathed: the player has him back where the stage left him, and the kill resets K
function free(St) {
  St.freed = true; const R = St.R;
  [P.x, P.y] = collide(St.ox + St.m * (R.x - St.ox), R.y); P.face = St.m * R.face;
  P.inv = false; P.exec = null; P.armed = false; setState('idle');
  onAssassination();
}
// effects and pieces move through hit pauses, like the world's own
export function updateStages(dt) {
  for (const St of stages) { updateStageFx(St, dt); updatePieces(St, dt); }
  const f = roomFade();
  for (let i = stages.length - 1; i >= 0; i--) { const St = stages[i]; if (f <= 0 && St.freed) St.cleared = true;
    if (St.cleared && f > 0) stages.splice(i, 1); }   // a new squad: the old bodies are gone
}
// drawn in world space, flipped round the enemy's x when he faced right
const mirrored = (St, fn) => () => { g.save(); if (St.m < 0) { g.translate(St.ox * 2, 0); g.scale(-1, 1); } fn(); g.restore(); };
export function stageItems() {
  const out = [];
  const fade = roomFade();
  for (const St of stages) { const E = St.E, R = St.R; if (St.cleared) continue;
    if (!E.gone) out.push({ y: E.y - (St.clock >= St.ex.free ? .5 : 0), d: mirrored(St, () => withShadow(g, { ...E, x: E.x + (E.jit || 0) }, fade)) });
    if (R && !St.freed && !R.hidden) out.push({ y: R.y, d: mirrored(St, () => withShadow(g, R)) });
    out.push({ y: E.y + .5, d: mirrored(St, () => drawPieces(g, St, fade)) }); }
  return out;
}
export function drawStagesFloor() { for (const St of stages) mirrored(St, () => drawStageFloor(g, St))(); }
export function drawStagesTop() { for (const St of stages) mirrored(St, () => drawStageTop(g, St))(); }
