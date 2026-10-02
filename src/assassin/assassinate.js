import { g } from '../screen.js';
import { P, S, INV } from '../state.js';
import { rr } from '../fx/util.js';
import { pz, lerpP, ease } from '../rig/pose.js';
import { SHEETS } from '../anims/sheets.js';
import { frameOf } from '../player/actions.js';
import { POSES } from '../anims/poses.js';
import { setState, pickStance, threatNear } from '../player/actions.js';
import { sheathClick } from '../items/harvest.js';
import { onAssassination } from '../player/cooldowns.js';
import { collide } from '../world/room.js';
import { EG, SET, quickSheathe } from './enemy-poses.js';
import { EXECS } from './executions.js';
import { withShadow, drawPieces, STAGE } from './pieces.js';
import { SETTLE, stageBody, stepStageBody, updateStagePieces } from './stage-body.js';
import { F, FX, updateStageFx, drawStageFloor, drawStageTop } from './stage-fx.js';
import { K, K_RANGE, updateMarkers } from './markers.js';
import { ISOLATION, targets, hold, faceOf, roomFade } from './targets.js';
import { pick } from './rules.js';
import { ENEMIES } from '../world/enemies.js';
import { hitStop } from '../player/feel.js';

// ---- K on an isolated enemy: he flashes to him and plays an execution ----
// Each execution plays on its own stage: the two bodies, the pieces and the effects, in a frame where the enemy faces left.
// The stage is drawn mirrored round the enemy when he faces right. His body lies there with the rest of the fallen
// and fades with them when the room is cleared.
export const stages = [];
const PRE = .2;       // the set and the vanish before he lands (the prototype's 0.75 s lock-on beat, cut down for play)
const INTO_GUARD = .15;
const BLEND = .12;    // the set eases in from the pose he was in (a stance, or the last execution's last cut), never snaps   // blade kept out: from the last cut into his stance, then the player has him
let lastExec = -1;
// where the player gets him back after execution ex on e, in the world (the stage is mirrored when e faces right)
export function landing(ex, e) {
  if (ex.end === 'start') return [P.x, P.y];
  const ox = Math.round(e.x); return collide(ox - faceOf(e) * (ex.end ?? ex.side * ex.gap), e.y + 1);
}
// would K have a lone enemy in reach from (x, y) once e is gone? The markers' own rules, with e left out of the bubbles
export function opensK(x, y, e) {
  const rest = targets().filter(o => o !== e);
  const alone = o => S.smoke > 0 || !rest.some(q => q !== o && Math.hypot(q.x - o.x, q.y - o.y) <= ISOLATION);
  return rest.some(o => Math.hypot(o.x - x, o.y - y) < K_RANGE && alone(o));
}
// which executions may play (assassin/rules.js): rare from power II, legendary from III, unless Storm Chain (the Qi boost) runs.
// A weapon with no executions of its own yet borrows the katana's
function allowed(e) {
  const others = targets().filter(o => o !== e && Math.abs(o.x - P.x) < 240 && Math.abs(o.y - P.y) < 135).length;
  const ctx = { weapon: P.weapon, hat: null, others, foe: e.tier || 'minion', first: ENEMIES.every(o => o.alive || o === e), power: INV.power, level: INV.lv, boost: P.storm > 0 };
  const ok = c => EXECS.map((_, k) => k).filter(k => pick([EXECS[k].name], c) != null);
  const ks = ok(ctx); return ks.length ? { ks, ctx } : { ks: ok({ ...ctx, weapon: 'katana' }), ctx: { ...ctx, weapon: 'katana' } };
}
// chaining K: he picks an execution that lands him in reach of the next lone enemy; if none does, any allowed one.
// Weighted by rarity, never the same one twice running unless it is the only one that keeps the chain going
function pickExec(e) {
  const { ks, ctx } = allowed(e), all = ks.length ? ks : EXECS.map((_, k) => k), open = all.filter(k => opensK(...landing(EXECS[k], e), e));
  const pool = open.length ? open : all, last = EXECS[lastExec] && EXECS[lastExec].name;
  const name = pick(pool.map(k => EXECS[k].name), ks.length ? ctx : { ...ctx, boost: true, power: 3 }, last);
  return { k: pool.find(k => EXECS[k].name === name) ?? pool[0], open };
}
export function assassinate(e, from) {
  const sh = SHEETS[P.state]; from = from || (sh && sh.poses && sh.poses[frameOf()]) || null;
  const { k, open } = pickExec(e); lastExec = k;
  const ox = Math.round(e.x), m = -faceOf(e);
  const St = { ex: EXECS[k], target: e, ox, m, clock: -PRE, stop: 0, shake: 0, fx: FX(), pieces: [], ev: new Set(), flashUntil: 0,
    k, open, land: landing(EXECS[k], e), start: { x: ox + m * (P.x - ox), y: P.y }, E: { x: ox, y: e.y, face: -1, m, pose: EG, enemy: true, z: 0 }, R: null, freed: false };   // E.m: the stage's mirror, so his pieces are cut as he is drawn
  St.once = (key, cond, fn) => { if (cond && !St.ev.has(key)) { St.ev.add(key); fn(); } };
  stageBody(St.E); hold(e); stages.push(St);
  // chaining K: with anyone else near he keeps the blade out and ends in a counter stance, ready for the next one;
  // with nobody left (the two-screen rule) he sheathes as the execution ends, and the click is the sheath click
  St.armed = !St.ex.bare && threatNear();
  if (St.armed) { St.stance = pickStance(); const ps = POSES[St.stance]; St.guard = (ps && ps[0]) || POSES.ready[0]; }
  St.tail = (t0, from) => { St.t0 = t0; return St.armed ? [[t0 + INTO_GUARD, St.guard]] : quickSheathe(t0, from).slice(1); };
  // blade out he crouches into the dash as he is, arms and blade kept; sheathed, it is the hand on the hilt
  St.from = from; St.set = P.armed && from ? pz({ ...from, hy: SET.hy, lean: SET.lean, fl: SET.fl, bl: SET.bl }) : SET;
  setState('exec'); P.inv = true; P.exec = St;
}
// runs after the hit pause, so a hit's freeze stops the performance too
export function tickStages(dt) {
  for (const St of stages) {
    St.clock += dt; const c = St.clock, ex = St.ex, E = St.E;
    if (c >= ex.dur) { if (!St.freed) free(St); if (c < ex.dur + SETTLE) stepStageBody(St, dt); }   // the last of him goes out of him, then he just lies there
    else {
    const R = St.R = { x: St.start.x, y: St.start.y, face: 1, pose: SET };
    if (c < 0) {   // the set: weight forward, hand on the hilt, breaking into slices, gone
      const u = c + PRE; R.glitch = u / PRE * 1.6;
      R.pose = St.from ? lerpP(St.from, St.set, ease(Math.min(1, u / BLEND))) : St.set;
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
      // K pressed during the execution: the next one starts on the last cut, with no stance between
      if (!St.freed && c >= (St.armed && St.t0 != null ? St.t0 + (St.queued ? 0 : INTO_GUARD) : ex.free)) free(St);
    }
    stepStageBody(St, dt);
    }
    E.flash = St.flashUntil > c;
    // the stage's hit pauses and shakes are the game's
    if (St.stop) { if (St.stop >= .09) hitStop('exec'); else S.hitstop = Math.max(S.hitstop, St.stop); St.stop = 0; }   // a killing blow: execution-grade (player/feel.js)
    if (St.shake) { S.shake = Math.max(S.shake, St.shake); St.shake = 0; }
    if (St.impact) { S.impact = St.impact; St.impact = 0; }
  }
}
// he has sheathed: the player has him back where the stage left him, and the kill resets K
function free(St) {
  St.freed = true; const R = St.R;
  [P.x, P.y] = St.landed = collide(St.ox + St.m * (R.x - St.ox), R.y); P.face = St.m * R.face;
  P.inv = false; P.exec = null;
  // a queued K chains straight into the next lone enemy in reach, from where this one left him
  if (St.queued) { updateMarkers(); St.next = K.pick; if (K.pick) { P.armed = true; onAssassination(); return assassinate(K.pick, R.pose); } }
  if (St.armed) { setState(St.stance); P.armed = true; P.still = 0; }   // blade out; ~2 s of calm and he sheathes as after any attack
  else { P.armed = false; setState('idle'); if (!St.ex.bare) sheathClick(); }
  onAssassination();
}
// effects and pieces move through hit pauses, like the world's own
export function updateStages(dt) {
  for (const St of stages) { updateStageFx(St, dt); updateStagePieces(St, dt); }
  const f = roomFade();
  for (let i = stages.length - 1; i >= 0; i--) { const St = stages[i]; if (f <= 0 && St.freed) St.cleared = true;
    if (St.cleared && f > 0) stages.splice(i, 1); }   // a new squad: the old bodies are gone
}
// drawn in world space, flipped round the enemy's x when he faced right
const mirrored = (St, fn) => () => { g.save(); if (St.m < 0) { g.translate(St.ox * 2, 0); g.scale(-1, 1); } STAGE.m = St.m; fn(); STAGE.m = 1; g.restore(); };
export function stageItems() {
  const out = [];
  const fade = roomFade();
  for (const St of stages) { const E = St.E, R = St.R; if (St.cleared) continue;
    // he shakes through a hit's pause
    const jit = (E.jit || 0) + (S.hitstop > 0 && E.hitAt === St.clock ? (performance.now() / 50 | 0) % 2 ? 1 : -1 : 0);
    if (!E.gone) out.push({ y: E.y - (St.clock >= St.ex.free ? .5 : 0), d: mirrored(St, () => withShadow(g, { ...E, pose: E.body.out, x: E.x + jit }, fade)) });
    if (R && !St.freed && !R.hidden) out.push({ y: R.y, d: mirrored(St, () => withShadow(g, R)) });
    out.push({ y: E.y + .5, d: mirrored(St, () => drawPieces(g, St, fade)) }); }
  return out;
}
export function drawStagesFloor() { for (const St of stages) mirrored(St, () => drawStageFloor(g, St))(); }
export function drawStagesTop() { for (const St of stages) mirrored(St, () => drawStageTop(g, St))(); }
