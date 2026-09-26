import { rigR } from '../rig/rig.js';
import { Cloth, clothStep, drawCloth, dims, isCloth } from './cloth.js';
import { BY_ID, drawPart } from './items.js';
import { fromSide, solve } from './skeleton.js';

// ---- Dressing a figure: the rig's pose and everything it wears, into one depth raster ----
// a figure: the item ids it wears, the cloth state of each loose part, its clock and its velocity (px/s, in its own facing)
export const makeFigure = (items = ['straw', 'mantle']) => ({ outfit: new Set(items), cloth: new Map(), t: 0, vel: [0, 0] });
// dt > 0 steps the cloth; dt 0 draws it where it last was (or where it hangs, the first time)
export function dress(R, F, p, dt = 0) {
  R.clear(); const { hc } = rigR(R, p);
  const J = solve(fromSide(p), 0, true), live = new Set(); J.hc = hc;
  // the breeze, plus the wind of his own motion
  const env = { t: F.t, wind: [Math.sin(F.t * .9) * 9 + Math.sin(F.t * 2.1) * 4 - F.vel[0] * 1.3, 0, Math.sin(F.t * .7 + 1) * 3 - F.vel[1] * 1.3] };
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
  return R.flush();
}
// he turned round: the side view mirrors him, so mirror his cloth too and it swings across to the new side instead of snapping
export function turnCloth(F) {
  for (const C of F.cloth.values()) for (let i = 0; i < C.p.length; i += 3) { C.p[i] = -C.p[i]; C.o[i] = -C.o[i]; }
}
