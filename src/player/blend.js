import { P, wear } from '../state.js';
import { PX } from '../config.js';
import { ease } from 'ronin-engine/rig/pose.js';
import { ANIMS } from '../anims/anims.js';
import { FEEL } from './feel.js';
import { TURNS } from './facing.js';

// ---- The pose he is drawn in: his move's own frame, then the engine's flow on top (draw time only, never a hit's timing) ----
// 1. Q1C: locomotion loops in-betweened to 30 fps on the gait's own clock (player/locomotion.js), so the pose and the ground
//    covered change together; every other move keeps its authored, held frames.
// 2. Q2B: a new move blends in from the last pose drawn over 2 to 4 frames (FEEL.blend), so states never hard-cut; not into or
//    out of an execution's stage, the glitch teleport or death, which snap.
// 3. Q5C: springs on what hangs off him: the mantle (strong), the hat brim and his lean (subtle, whole pixels), settling to the
//    pose's own values at rest, so the silhouette at rest never changes; and a lean into a turn while he runs.
// what changes between two poses: numbers and arrays blend; anything else (the blade sheathed or out, a weapon's art) switches
// half way, and a weapon's art, a turned pose's yaw and rig v2's knobs always come from the new pose
const KEEP = new Set(['wp', 'yaw', 'v2']);
export function mixPose(a, b, k) { const o = { ...b };
  for (const key in a) { if (!(key in b) || KEEP.has(key)) continue; const x = a[key], y = b[key];
    o[key] = Array.isArray(x) && Array.isArray(y) ? x.map((v, i) => v + (y[i] - v) * k) : typeof x === 'number' && typeof y === 'number' ? x + (y - x) * k : k < .5 ? x : y; }
  return o; }
export function poseDist(a, b) { let d = 0;
  for (const key in b) { const x = a[key], y = b[key];
    if (Array.isArray(x) && Array.isArray(y)) x.forEach((v, i) => { d += Math.abs(v - y[i]); });
    else if (typeof x === 'number' && typeof y === 'number') d += Math.abs(x - y);
    else if ((x == null) !== (y == null)) d += 1; }
  return d; }
const bladeOf = p => p.sheathing ? 'sheathing' : p.sword != null || p.bsword != null ? 'out' : p.empty ? 'none' : 'in';
// read-only for `npm run check` (window.__game.PB): the move drawn, draws since it began, the drawn pose's distance from the
// move's own frame, where his blade is in the drawn pose
export const PB = { s: null, n: 0, d: 0, blade: 'in' };
const BL = { ev: null, from: null, t: 0, d: 0, last: null, lastS: null };
const SNAP = /^(exec|tele|death)$/, ATTACK = /^(slash|double|moon|sweep)/, SETTLE = /^(idle|ready)/;
const spr = (w, z) => ({ x: 0, v: 0, w, z }), step = (s, to, dt) => { s.v += (s.w * s.w * (to - s.x) - 2 * s.z * s.w * s.v) * dt; s.x += s.v * dt; };
const SP = { hat: spr(FEEL.spring.hat.w, FEEL.spring.hat.z), mantle: spr(FEEL.spring.mantle.w, FEEL.spring.mantle.z), lean: spr(FEEL.spring.lean.w, FEEL.spring.lean.z) };
const M = { x: null, y: null, sp: 0, acc: [0, 0], vel: [0, 0] };
// sheet: the move's baked sheet (its poses), f: the frame, dt: the draw's seconds (0 in a hit pause)
export function livePose(sheet, f, dt) {
  let p = sheet.poses[f]; if (!p) { BL.last = null; return p; }
  const s = P.state, n = sheet.poses.length;
  if (FEEL.tween.has(s) && n > 1 && ANIMS[s].loop) { const x = Math.floor(P.t * FEEL.fps) / FEEL.fps * ANIMS[s].fps, i = Math.floor(x);
    const a = sheet.poses[i % n], b = sheet.poses[(i + 1) % n]; if (a && b) p = mixPose(a, b, x - i); }
  const own = p;
  if (P.ev !== BL.ev) { BL.ev = P.ev; PB.s = s; PB.n = 0; BL.t = 0;
    BL.from = BL.last && !SNAP.test(s) && !SNAP.test(BL.lastS || '') && BL.last.yaw == null && p.yaw == null ? BL.last : null;
    BL.d = (ATTACK.test(s) ? FEEL.blend.attack : SETTLE.test(s) ? FEEL.blend.settle : FEEL.blend.base) / 60; }
  else PB.n++;
  // the blend's clock starts with the move: on its first draw only the time the move has lived counts (its first step and
  // after), never the draw's time before it began, so a late draw (a slow frame) still shows the blend
  if (BL.from) { BL.t += PB.n === 0 ? Math.min(dt, P.t + 1 / 60) : dt; const k = Math.min(1, BL.t / BL.d); p = mixPose(BL.from, p, ease(k)); if (k >= 1) BL.from = null; }
  PB.d = poseDist(p, own); PB.blade = bladeOf(p);
  BL.last = p; BL.lastS = s;
  return dress2(p);
}
// his own motion each fixed step (player/update.js, not in a hit pause): speed and how fast it changes, into the springs
export function stepSprings(dt) {
  if (M.x == null) Object.assign(M, { x: P.x, y: P.y });
  const vx = (P.x - M.x) / dt, vy = (P.y - M.y) / dt, sp = Math.min(300, Math.hypot(vx, vy)); M.x = P.x; M.y = P.y;
  const jump = sp >= 300 || M.sp >= 300, af = jump ? 0 : (sp - M.sp) / dt; M.sp = sp;   // a blink is not a lurch
  const ax = jump ? 0 : (vx - M.vel[0]) / dt, ay = jump ? 0 : (vy - M.vel[1]) / dt; M.vel = [vx, vy];
  M.acc = [M.acc[0] + (ax - M.acc[0]) * .35, M.acc[1] + (ay - M.acc[1]) * .35];
  wear.acc = M.acc.map(a => Math.max(-900, Math.min(900, a)));   // the cloth feels it too (wardrobe/dress.js): it swings on a start and a stop
  const C = FEEL.spring, a = Math.max(-1500, Math.min(1500, af));
  SP.hat.v -= a * C.hat.k; SP.lean.v -= a * C.lean.k; step(SP.hat, 0, dt); step(SP.lean, 0, dt);
  step(SP.mantle, Math.min(1, sp / 78) * C.mantle.k, dt);
}
function dress2(p) {
  const C = FEEL.spring, o = { ...p }, cl = (v, m) => Math.max(-m, Math.min(m, v));
  o.hat = (p.hat || 0) + Math.round(cl(SP.hat.x, C.hat.max) * PX) / PX;   // whole screen pixels
  o.lean = p.lean + cl(SP.lean.x, C.lean.max);   // a stop pitches him forward a hair, then he settles; a start leaves him a hair behind
  o.flutter = Math.max(0, Math.min(1.5, (p.flutter || 0) + SP.mantle.x));
  if (TURNS.has(P.state) && M.sp > 20) o.lean += Math.min(1, Math.abs(P.turnRate) / 8) * FEEL.turnLean;   // into the turn
  return o;
}
