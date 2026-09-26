import { rigR } from '../rig/rig.js';
import { Cloth, clothStep, drawCloth, dims, isCloth } from './cloth.js';
import { BY_ID, drawPart } from './items.js';
import { fromSide, solve } from './skeleton.js';
import { drawBody3d } from '../rig/body3d.js';
import { port } from '../rig/port.js';

// ---- Dressing a figure: the rig's pose and everything it wears, into one depth raster ----
// a figure: the item ids it wears, the cloth state of each loose part, its clock and its velocity (px/s on the screen)
export const makeFigure = (items = ['straw', 'mantle']) => ({ outfit: new Set(items), cloth: new Map(), t: 0, vel: [0, 0], side: 1 });
// how W (yaw 180°) is drawn, his true left side either way: the side rig seen from his left ('side'), his own E pixels with the
// near and far sides swapped, so W is to SW and NW what E is to SE and NE, and a cut facing west (the side rig mirrored) only
// swaps near and far (owner's pick, 2026-09-26: "True left the side rig from his left"); or rig v2's body like every other facing off the side ('3d').
export const WEST = { mode: 'side' };
const isWest = yaw => Math.abs(yaw - Math.PI) < 1e-6;
// dt > 0 steps the cloth; dt 0 draws it where it last was (or where it hangs, the first time).
// yaw: the true facing (port.js DIRS, rig/turn.js), never mirrored. 0 is the side view, drawn by the side rig on the pixels it
// always had; any other facing runs the pose through port() and draws rig v2's body (body3d.js). The clothes hang from the same
// bones either way. flip -1: the caller draws the result mirrored (a side-on move facing left), so the cloth lives mirrored too.
export function dress(R, F, p, dt = 0, yaw = 0, flip = 1) {
  R.clear(); let J, m = 1;
  const side = !yaw || (isWest(yaw) && WEST.mode === 'side');
  if (side) { m = yaw ? -1 : 1; const { hc } = rigR(R, p, m < 0); J = solve(fromSide(p), 0, true, m < 0); J.hc = hc; }
  else { J = solve(port(p), yaw);
    drawBody3d(R, J, { blink: p.dim > .5, hat: [...F.outfit].some(id => BY_ID[id] && BY_ID[id].slot === 'head'), art: p.wp && p.wp.d3 }); }
  // the cloth lives in the raster's space, mirrored from the screen's when the caller flips it or the side rig draws his left;
  // when that changes, mirror the cloth with it, so on the screen it stays where it was and swings round instead of snapping
  const sp = flip * m; if (F.side !== sp) { mirrorCloth(F); F.side = sp; }
  const live = new Set();
  // the breeze, plus the wind of his own motion
  const env = { t: F.t, wind: [Math.sin(F.t * .9) * 9 + Math.sin(F.t * 2.1) * 4 - F.vel[0] * sp * 1.3, 0, Math.sin(F.t * .7 + 1) * 3 - F.vel[1] * 1.3] };
  const steps = dt > 0 ? Math.min(3, Math.max(1, Math.round(dt * 60))) : 0;
  for (const id of F.outfit) { const it = BY_ID[id]; if (!it) continue;
    it.parts.forEach((part, pi) => {
      if (!isCloth(part)) return drawPart(R, part, J);
      const key = id + ':' + pi; live.add(key);
      let C = F.cloth.get(key); if (!C) { const [c, r] = dims(part); C = new Cloth(c * r); F.cloth.set(key, C); }
      for (let k = 0; k < steps; k++) clothStep(C, part, J, env, 1 / 60);
      if (!C.ok) clothStep(C, part, J, env, 0);
      drawCloth(R, C, part, J);
    }); }
  for (const k of F.cloth.keys()) if (!live.has(k)) F.cloth.delete(k);   // taken off: its cloth starts fresh next time
  return R.flush(m < 0);
}
function mirrorCloth(F) {
  for (const C of F.cloth.values()) for (let i = 0; i < C.p.length; i += 3) { C.p[i] = -C.p[i]; C.o[i] = -C.o[i]; }
}
