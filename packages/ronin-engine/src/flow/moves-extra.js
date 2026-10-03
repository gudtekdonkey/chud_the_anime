// ---- Moves the Animation Flow page does not have, built from its own parts (marked as additions, not the page's):
// the run with the blade out (he keeps running after a cut instead of popping the blade home; the samurai walks to
// you with it): the page's run, with the near hand carrying the blade low behind him, point to the floor.
import { proc, H, TAU } from './flow.js';
import { runPose, strideOf, blade } from './moves.js';

proc('runArmed', (a, t, dt) => { a.phase += a.v * dt / strideOf(a.v); const p = runPose(a.v / 110, a.phase), ap = TAU * a.phase;
  const g = [p.pel[0] - 1.5 + 1.2 * Math.cos(ap) * Math.min(1, a.v / 110), H + .8 + .4 * Math.sin(2 * ap)];
  p.blade = blade(g, -2.72, 0); p.hN = g; p.hF = [p.pel[0] + 4.5, H + 2.2];
  return { p, move: a.v * dt }; }, { loop: true, blend: .07 });
