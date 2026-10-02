import { P } from '../state.js';
import { ANIMS } from '../anims/anims.js';
import { SHEETS } from '../anims/sheets.js';
import { FEEL } from './feel.js';
import { moveBy } from './actions.js';

// ---- Movement that flows: speed ramps up and down instead of switching on and off, the run's legs are driven by the
// distance he covers (so the feet never skate), and a turn while running leans into it ----
// drive toward the wanted velocity (px/s): FEEL.move.accel s from standing to top speed, decel s back down; turning round
// at speed brakes first. Moves him (walls and pillars clamp it) and returns how far he went
export function drive(tx, ty, top, dt) {
  const want = Math.hypot(tx, ty), now = Math.hypot(P.vx, P.vy), dvx = tx - P.vx, dvy = ty - P.vy, d = Math.hypot(dvx, dvy);
  const rate = Math.max(top, 1) / (want >= now ? FEEL.move.accel : FEEL.move.decel) * dt;
  if (d <= rate) { P.vx = tx; P.vy = ty; } else { P.vx += dvx / d * rate; P.vy += dvy / d * rate; }
  const x0 = P.x, y0 = P.y; moveBy(P.vx * dt, P.vy * dt);
  if (Math.abs(P.x - x0) < Math.abs(P.vx * dt) * .5) P.vx = (P.x - x0) / dt;   // a wall took it: no speed kept against it
  if (Math.abs(P.y - y0) < Math.abs(P.vy * dt) * .5) P.vy = (P.y - y0) / dt;
  // how fast the way he runs is turning (rad/s), eased: the lean into a turn (player/blend.js)
  const h = Math.atan2(P.vy, P.vx); if (now > 20 && P.head != null) { let dh = h - P.head; dh = Math.atan2(Math.sin(dh), Math.cos(dh));
    P.turnRate += (dh / dt - P.turnRate) * Math.min(1, dt * 12); } else P.turnRate *= .8;
  P.head = h;
  return Math.hypot(P.x - x0, P.y - y0);
}
export const speed = () => Math.hypot(P.vx, P.vy);
// a gait's stride, measured from its poses (side on, rig px = world px): how far the planted foot sweeps back under the hips per
// frame while it is on the floor. The body has to cover that much per frame or the feet skate. Cached per baked sheet
const STRIDE = new WeakMap();
const foot = ([th, kn], hy) => [5 * Math.sin(th) + 6 * Math.sin(th - kn), (hy || 0) + 5 * Math.cos(th) + 6 * Math.cos(th - kn)];
export function strideOf(name) {
  const sh = SHEETS[name]; if (!sh || sh.custom || !sh.poses) return null;
  if (STRIDE.has(sh)) return STRIDE.get(sh);
  const ps = sh.poses.filter(Boolean), n = ps.length, F = ps.map(p => [foot(p.fl, p.hy), foot(p.bl, p.hy)]);
  const floor = Math.max(...F.flat().map(f => f[1]));
  let sweep = 0, steps = 0;
  for (let i = 0; i < n; i++) for (const k of [0, 1]) { const a = F[i][k], b = F[(i + 1) % n][k];
    if (a[1] > floor - .6 && b[1] > floor - .6 && b[0] < a[0]) { sweep += a[0] - b[0]; steps++; } }
  const s = steps ? sweep / steps : null; STRIDE.set(sh, s); return s;
}
// the gait's clock: frames advance by the distance covered over the stride, so the legs keep pace with the speed
// (returns seconds of animation to add to P.t; a dropped-in strip with no poses keeps real time)
export function gaitClock(name, dist, dt) { const s = strideOf(name); return s ? dist / (s * ANIMS[name].fps) : dt; }
