import { COL } from '../config.js';
import { P, parts, S, frags, rings, timers } from '../state.js';
import { EL } from './element.js';

// ---- Small shared effect helpers: randomness, slivers, rings, timers, sparks, dust, the screen flash ----
export const rr = (a, b) => a + Math.random() * (b - a), sgn = () => Math.random() < .5 ? -1 : 1;
export const FRAG_COLS = [COL.fx, COL.fx2, '#ffffff', '#0d1012'];
// glitch slivers left hanging where the body was: slow upward drift, 1px sideways twitches, flicker, fade
export function residue(x, y, n) { if (EL.cur.kit) return EL.cur.kit.residue(x, y, n);
  for (let i = 0; i < n; i++) { const life = rr(.6, 1);
    frags.push({ x: x + rr(-9, 9), y: y - rr(2, 28), w: 1 + (Math.random() * 4 | 0), col: FRAG_COLS[i % 4], vx: rr(-3, 3), vy: rr(-6, -1), life, max: life, jx: 0, on: true }); }
}
export function ring(x, y, rx, ry, life, grow = 0, col = '#ffffff') { rings.push({ x, y, rx, ry, life, max: life, grow, col }); }
export const after = (t, fn) => timers.push({ t, fn });
const PLAIN = new Set(['#8f9692', '#5f6562', '#3a3f3d', '#6d7370', '#4f5552', '#2e3231', '#15181c']); // dust, stone and his body stay what they are
export function spark(x, y, vx, vy, life, col, streak, grav = 40) { const k = EL.cur.kit;
  if (k && !PLAIN.has(col)) { if (grav === 0 && !vx && !vy) return k.trail(x, y); if (grav !== 0) return k.spark(x, y, vx, vy, life); } // grav 0 with speed: a pull-in stays a spark
  parts.push({ x, y, vx, vy, life, max: life, col, streak, grav }); }
export function dust(n, dir = 0) { for (let i = 0; i < n; i++) spark(P.x + (Math.random() - .5) * 8, P.y - 1, (Math.random() - .5) * 60 - dir * 40, -Math.random() * 16, .3 + Math.random() * .2, '#8f9692'); }
export const scrFlash = (t, a) => { S.scr = { t, max: t, a }; };                  // a short pale flash over the whole screen
