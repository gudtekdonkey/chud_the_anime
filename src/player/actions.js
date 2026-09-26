import { P, S } from '../state.js';
import { ANIMS } from '../anims/anims.js';
import { SHEETS } from '../anims/sheets.js';
import { living } from '../world/enemies.js';
import { collide } from '../world/room.js';

// ---- Player actions: state changes, stances, movement, afterimages, the current frame ----
// no enemy within two screens: nothing left to guard against, so he puts the blade away at once, unbothered
const THREAT_RANGE = 960;
export const threatNear = () => !S.roomClear && living().some(d => Math.hypot(d.x - P.x, d.y - P.y) < THREAT_RANGE);
export function afterAttack(moving) { if (!threatNear()) { P.armed = true; return 'sheathe'; } return moving ? 'runArmed' : pickStance(); }
// a different one of the six counter stances each time he stops with the blade out
export function pickStance() { let k; do k = Math.random() * 6 | 0; while (k === P.lastStance); P.lastStance = k; return 'ready' + k; }
export function setState(s) { if (s === 'idle' || s === 'run') P.armed = false; P.state = s; P.t = 0; P.hitDone = {}; P.ev = {}; P.combo = false; P.struck = new Set();
  P.charge = null; P.cv = null; P.fr = null; P.trem = 0; }
// true the first time an in-state beat is reached, so a strike fires once even if a frame skips past it
export const once = (k, when) => when && !P.ev[k] && (P.ev[k] = true);
export function moveBy(dx, dy) { [P.x, P.y] = collide(P.x + dx, P.y + dy); }
export function blink(dist, dir) {
  const [dx, dy] = dir; const steps = Math.ceil(dist / 2);
  for (let i = 0; i < steps; i++) moveBy(dx * 2, dy * 2);
}
// hold: seconds an afterimage stays solid before its .25 s fade
export function ghost(hold = 0) { const gh = { state: P.state, f: frameOf(), x: P.x, y: P.y - P.z, face: P.face, age: 0, hold, white: 0 }; P.ghosts.push(gh); return gh; }
export function frameOf() {
  if (P.fr != null) return P.fr; // the dash-and-cut skills pick the double's frames on their own timeline
  const a = ANIMS[P.state], n = SHEETS[P.state].n, f = Math.floor(P.t * a.fps);
  return a.loop ? f % n : Math.min(n - 1, f);
}
export function inputDir(inp) { const m = Math.hypot(inp.mx, inp.my); return m ? [inp.mx / m, inp.my / m] : [P.face, 0]; }
