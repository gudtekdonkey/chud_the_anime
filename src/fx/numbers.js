import { COL } from '../config.js';
import { g } from '../screen.js';
import { text, textW } from '../ui/pixfont.js';

// ---- Damage numbers and the health chip ----
// num(x, y, n, kind): a small number that pops over (x, y), drifts up and fades. kind: 'deal' white (damage dealt),
//   'take' red (damage he or a companion takes), 'big' a killing blow (twice the size), 'exec' an execution (big, the element's colour)
// chip(c, v, dt): the lingering trail on a health bar (v 0..1). c = trail(v): it holds where the health was for a beat, then drains down
//   to it; a heal jumps it straight up
// Numbers read health in whole units: an enemy's 4 hp shows as 40, his 0..1 health as 100
export const NUMS = [];
const LIFE = .75, HOLD = .4, DRAIN = .6, DARK = '#0c0d11', TAKE = '#ff5a4a';
export function num(x, y, n, kind = 'deal') {
  if (!(n > 0)) return;
  // a flurry of hits stacks the numbers side by side rather than on top of each other
  const near = NUMS.filter(q => q.t < .25 && Math.abs(q.x0 - x) < 12 && Math.abs(q.y0 - y) < 12).length;
  NUMS.push({ x0: x, y0: y, x: x + (near % 2 ? 1 : -1) * Math.ceil(near / 2) * 5 + (Math.random() * 3 | 0) - 1, y: y - near * 3,
    s: String(Math.max(1, Math.round(n))), kind, t: 0, vx: (Math.random() - .5) * 10 });
}
export function updateNums(dt) {
  for (const q of NUMS) { q.t += dt; q.x += q.vx * dt; }
  for (let i = NUMS.length - 1; i >= 0; i--) if (NUMS[i].t > LIFE) NUMS.splice(i, 1);
}
// in world space, over everything in the room: a dark outline keeps them readable on the floor and on the cyan effects
export function drawNums() {
  for (const q of NUMS) {
    const sc = q.kind === 'big' || q.kind === 'exec' ? 2 : 1, col = q.kind === 'take' ? TAKE : q.kind === 'exec' ? COL.fx : '#ffffff';
    // a quick pop up, then a slow drift; it fades over its last quarter
    const rise = q.t < .08 ? q.t / .08 * 6 : 6 + (q.t - .08) * 14, pop = q.t < .06 && sc === 1 ? -1 : 0;
    const x = Math.round(q.x - textW(q.s, sc) / 2), y = Math.round(q.y - rise) + pop;
    g.globalAlpha = q.t > LIFE * .7 ? 1 - (q.t - LIFE * .7) / (LIFE * .3) : 1;
    for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1], [1, 1]]) text(q.s, x + dx, y + dy, DARK, sc);
    text(q.s, x, y, q.t < .05 ? '#ffffff' : col, sc);
  }
  g.globalAlpha = 1;
}
export const trail = v => ({ v, hold: 0 });
export function chip(c, v, dt) {
  const hit = c.last != null && v < c.last; c.last = v;
  if (v >= c.v) { c.v = v; c.hold = 0; return; }
  if (hit) c.hold = HOLD;   // a fresh blow restarts the beat
  if (c.hold > 0) c.hold -= dt; else c.v = Math.max(v, c.v - DRAIN * dt);
}
