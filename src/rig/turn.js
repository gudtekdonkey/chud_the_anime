import { DIRS } from './port.js';

// ---- True facings: all eight drawn as themselves (the west side is never the east mirrored), and turning through them ----
// A figure keeps its world facing as view (E, SE, S, NE, N) and face (±1); trueView names the real facing: facing left,
// E is W, SE is SW, NE is NW, so his sword hand and the scabbard at his left hip stay where they are from every side.
export const YAW = Object.fromEntries(DIRS.map(d => [d.id, d.yaw]));
const WEST = { E: 'W', SE: 'SW', NE: 'NW' }, IX = Object.fromEntries(DIRS.map((d, i) => [d.id, i]));
export const trueView = (view, face) => face < 0 ? WEST[view] || view : view;
// side on (attacks, skills, stances, the dead): E, or facing left W, his true left drawn by the side rig from his left, every pixel
// where the mirror put it (owner: "don't mirror"). Returns [yaw, flip] for dress(); set the turner to it, no turn.
export function sideOn(T, face) { if (T) turnTo(T, face < 0 ? 'W' : 'E', face, -1); return face < 0 ? [Math.PI, 1] : [0, 1]; }
// a turn passes through the facings between, one 45° step at a time, so the hilt and scabbard never jump sides.
// Half a turn (E to W) goes by the camera, the way a body turns toward the one watching; S to N goes by the side it faces.
export const STEP = .03;   // seconds a facing shows on the way round: 180° in about a tenth of a second (prototype 36 compares speeds)
export const turner = (view = 'E') => ({ i: IX[view], t: 0 });
export function turnTo(T, view, face, dt, step = STEP) {
  const want = IX[view], d = (want - T.i + 8) % 8;
  if (!d) { T.t = 0; return DIRS[T.i]; }
  if (dt < 0) { T.i = want; T.t = 0; return DIRS[T.i]; }   // no turn: snap (an attack ended side on, a new figure)
  if ((T.t += dt) >= step) { T.t = step > 0 ? T.t - step : 0;
    let s = d < 4 ? 1 : -1;
    if (d === 4) s = T.i === 2 || T.i === 6 ? (T.i === 2) === face < 0 ? 1 : -1   // S or N: by the side it faces
      : [1, 2, 3].some(k => (T.i + k) % 8 === 2) ? 1 : -1;                     // otherwise by the camera (S)
    T.i = (T.i + s + 8) % 8; }
  return DIRS[T.i];
}
