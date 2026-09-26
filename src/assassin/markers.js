import { COL } from '../config.js';
import { g } from '../screen.js';
import { P } from '../state.js';
import { targets } from './targets.js';

// ---- Who can he assassinate? The markers picked from prototypes/12-assassin-markers.html ----
// isolation bubble on every enemy, a kill line to the nearest one he can dash to, a K prompt only when that one is alone
export const ISO = 36;        // isolation distance: no other enemy this close (the floor squashed by 1.3, as in the prototype)
export const K_RANGE = 120;   // how far K can flash to an enemy
const CY = COL.eye, GREY = '#8b9290';
// recomputed every step: the pick K would take now, the nearest enemy in reach, which enemies are alone, which pairs guard each other
export const K = { pick: null, near: null, alone: new Set(), pairs: [], list: [] };
const apart = (a, b) => Math.hypot(b.x - a.x, (b.y - a.y) * 1.3);
export function updateMarkers() {
  const list = targets(); K.list = list; K.alone.clear(); K.pairs.length = 0; K.pick = K.near = null;
  for (let i = 0; i < list.length; i++) for (let j = i + 1; j < list.length; j++) if (apart(list[i], list[j]) <= ISO) K.pairs.push([list[i], list[j]]);
  for (const e of list) if (!K.pairs.some(p => p.includes(e))) K.alone.add(e);
  let best = K_RANGE, bestNear = K_RANGE;
  for (const e of list) { const d = Math.hypot(e.x - P.x, e.y - P.y);
    if (d < bestNear) { bestNear = d; K.near = e; }
    if (K.alone.has(e) && d < best) { best = d; K.pick = e; } }
}
const px = (x, y, c) => { g.fillStyle = c; g.fillRect(Math.round(x), Math.round(y), 1, 1); };
function ellipse(x, y, rx, ry, c, dash, rot = 0) {
  for (let a = 0; a < Math.PI * 2; a += .5 / rx) { if (Math.floor((a + rot) / dash) % 2) continue; px(x + Math.cos(a) * rx, y + Math.sin(a) * ry, c); }
}
const hidden = () => P.state === 'exec' || P.state === 'death';
// on the floor, under the bodies: the bubbles, the link lines between guarded pairs, the kill line
export function drawMarkers(t) {
  if (hidden()) return;
  for (const [a, b] of K.pairs) { for (const e of [a, b]) { g.globalAlpha = .35; ellipse(e.x, e.y - 6, ISO, ISO * .55, GREY, .12); }
    g.globalAlpha = .7; const n = Math.hypot(b.x - a.x, b.y - a.y) | 0; for (let i = 0; i < n; i += 3) px(a.x + (b.x - a.x) * i / n, a.y - 8 + (b.y - a.y) * i / n, '#9aa3a1'); }
  for (const e of K.alone) { g.globalAlpha = .5 * (e === K.pick ? 1 : .4) + .2; ellipse(e.x, e.y - 6, ISO, ISO * .55, CY, .12, t * .6); }
  // the kill line: to K's pick, a bright pulse running along it; to a guarded enemy in reach, grey and still
  const e = K.pick || K.near;
  if (e) { const n = Math.hypot(e.x - P.x, e.y - P.y) | 0, pos = (t * 1.4 % 1) * n;
    for (let i = 0; i < n; i += 3) { const hot = K.pick && Math.abs(i - pos) < 4; g.globalAlpha = hot ? 1 : K.pick ? .45 : .3;
      px(P.x + (e.x - P.x) * i / n, P.y - 10 + (e.y - P.y) * i / n, hot ? '#ffffff' : K.pick ? CY : GREY); } }
  g.globalAlpha = 1;
}
// over the bodies: a small pixel K keycap, only when the pick is in reach AND outside every other enemy's bubble
export function drawPrompt(t) {
  const e = K.pick; if (!e || hidden()) return;
  const x = Math.round(e.x) - 4, y = Math.round(e.y - 40 + (t % 1 < .5 ? 0 : 1));
  g.fillStyle = '#1b1e21'; g.fillRect(x, y, 9, 9); g.fillStyle = CY; g.fillRect(x, y, 9, 1); g.fillRect(x, y + 8, 9, 1); g.fillRect(x, y, 1, 9); g.fillRect(x + 8, y, 1, 9);
  g.fillStyle = '#ffffff'; g.fillRect(x + 3, y + 2, 1, 5); g.fillRect(x + 4, y + 4, 1, 1); g.fillRect(x + 5, y + 3, 1, 1); g.fillRect(x + 5, y + 5, 1, 1); g.fillRect(x + 6, y + 2, 1, 1); g.fillRect(x + 6, y + 6, 1, 1);
}
