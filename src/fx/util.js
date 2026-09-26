import { COL } from '../config.js';
import { P, parts, S, frags, rings, timers } from '../state.js';

// ---- Small shared effect helpers: randomness, slivers, rings, timers, sparks, dust, the screen flash ----
export const rr = (a, b) => a + Math.random() * (b - a), sgn = () => Math.random() < .5 ? -1 : 1;
export const FRAG_COLS = [COL.fx, COL.fx2, '#ffffff', '#0d1012'];
// glitch slivers left hanging where the body was: slow upward drift, 1px sideways twitches, flicker, fade
export function residue(x, y, n) {
  for (let i = 0; i < n; i++) { const life = rr(.6, 1);
    frags.push({ x: x + rr(-9, 9), y: y - rr(2, 28), w: 1 + (Math.random() * 4 | 0), col: FRAG_COLS[i % 4], vx: rr(-3, 3), vy: rr(-6, -1), life, max: life, jx: 0, on: true }); }
}
export function ring(x, y, rx, ry, life, grow = 0, col = '#ffffff') { rings.push({ x, y, rx, ry, life, max: life, grow, col }); }
export const after = (t, fn) => timers.push({ t, fn });
export function spark(x, y, vx, vy, life, col, streak, grav = 40) { parts.push({ x, y, vx, vy, life, max: life, col, streak, grav }); }
export function dust(n, dir = 0) { for (let i = 0; i < n; i++) spark(P.x + (Math.random() - .5) * 8, P.y - 1, (Math.random() - .5) * 60 - dir * 40, -Math.random() * 16, .3 + Math.random() * .2, '#8f9692'); }
export const scrFlash = (t, a) => { S.scr = { t, max: t, a }; };                  // a short pale flash over the whole screen
