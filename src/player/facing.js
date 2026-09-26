import { P } from '../state.js';
import { turner, turnTo, trueView } from '../rig/turn.js';

// ---- The way he is drawn facing: his true facing for the moves that turn with him, side on for everything else ----
// Idle, walk and run face the way he last moved (P.view, P.face), the west side as itself; Harvest faces north, his back to
// the camera (owner). Attacks, skills and stances stay side on, mirrored by P.face (owner: "Same side attack is fine").
export const TURNS = new Set(['idle', 'idleGlitch', 'walk', 'run', 'runArmed']);
const T = turner();
// the facing he was last drawn in: yaw (the true facing, rig/port.js DIRS), flip (-1: drawn mirrored), id. An afterimage keeps it.
export const PF = { yaw: 0, flip: 1, id: 'E' };
export function playerFacing(dt) {
  const want = P.state === 'harvest' ? 'N' : TURNS.has(P.state) ? trueView(P.view, P.face) : null;
  if (!want) { turnTo(T, P.face < 0 ? 'W' : 'E', P.face, -1); return Object.assign(PF, { yaw: 0, flip: P.face, id: P.face < 0 ? 'W' : 'E' }); }
  const d = turnTo(T, want, P.face, dt); return Object.assign(PF, { yaw: d.yaw, flip: 1, id: d.id });
}
