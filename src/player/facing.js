import { P } from '../state.js';
import { turner, turnTo, trueView } from '../rig/turn.js';
import { WEST } from '../wardrobe/dress.js';

// ---- The way he is drawn facing: his true facing for the moves that turn with him, side on for everything else ----
// Idle, walk and run face the way he last moved (P.view, P.face), the west side as itself; Harvest faces north, his back to
// the camera (owner). Attacks, skills and stances stay side on (owner: "Same side attack is fine"), and facing west they are his
// true left too, never the east mirrored (owner: "don't mirror", the scabbard at his left hip): the side rig from his left puts
// every pixel where the mirror did, so hits and effects are unchanged, only the near and far sides are true.
export const TURNS = new Set(['idle', 'idleGlitch', 'walk', 'run', 'runArmed']);
const T = turner();
// the facing he was last drawn in: yaw (the true facing, rig/port.js DIRS), flip (-1: drawn mirrored), id. An afterimage keeps it.
export const PF = { yaw: 0, flip: 1, id: 'E' };
export function playerFacing(dt) {
  const want = P.state === 'harvest' ? 'N' : TURNS.has(P.state) ? trueView(P.view, P.face) : null;
  if (!want) { turnTo(T, P.face < 0 ? 'W' : 'E', P.face, -1);
    const west = P.face < 0, left = west && WEST.mode === 'side';   // rig v2 at 180° (WEST.mode '3d') would redraw the cut, so that keeps the mirror
    return Object.assign(PF, { yaw: left ? Math.PI : 0, flip: left ? 1 : P.face, id: west ? 'W' : 'E' }); }
  const d = turnTo(T, want, P.face, dt); return Object.assign(PF, { yaw: d.yaw, flip: 1, id: d.id });
}
