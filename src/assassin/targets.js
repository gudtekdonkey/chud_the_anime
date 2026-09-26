import { P, S } from '../state.js';
import { residue } from '../fx/util.js';
import { DUMMIES } from '../world/dummies.js';

// ---- The one place K reads enemies from ----
// Until the real enemies land this reads the training dummies. Swap the body of these functions for the enemy API;
// K needs only x, y (feet), face (±1, optional), a way to take one over while an execution plays, and a way to kill it.
export const targets = () => S.roomClear ? [] : DUMMIES.filter(d => !d.out);
// which way he looks: his own facing, or (a dummy) toward the ronin
export const faceOf = e => e.face || Math.sign(P.x - e.x) || 1;
// the execution draws him now: his own drawing, hits and AI stand aside
export function hold(e) { e.out = true; }
// the execution is his death; a training dummy stands back up a few seconds later
export function killed(e) { e.back = 8; }
export function updateTargets(dt) {
  for (const d of DUMMIES) if (d.back > 0 && (d.back -= dt) <= 0) { d.out = false; residue(d.x, d.y, 8); }
}
