// ---- Who K can execute, on the 3D test level: today's markers (src/assassin/markers.js, prototypes/12) on the new
// camera. Every samurai has an isolation bubble on the floor (cyan and turning when he is alone; grey, with a link line,
// when another stands within ISOLATION of him); a kill line runs to the nearest one in reach, a white pulse along it
// when K would take him; the K keycap shows over him only when he is in reach AND outside every other samurai's bubble.
// Drawn on the effects layer at the game's pixel size (2×2 render px), hidden through an execution and the close-up.
import { toScreen, CAM } from '../gfx/view.js';

export const ISOLATION = 36, K_RANGE = 120;       // world units = today's game px (enemies.js ISOLATION, markers.js K_RANGE)
const BR = ISOLATION / 2, CY = '#6ff3e4', GREY = '#8b9290';
export const KM = { pick: null, near: null, alone: new Set(), pairs: [], list: [] };
// `foes`: the living samurai (anyone dead, dying or fading in is not a target)
export function updateMarkers(hero, foes) {
  const list = foes.filter(f => !f.dead && f.a.alpha > .9); KM.list = list; KM.alone.clear(); KM.pairs.length = 0; KM.pick = KM.near = null;
  for (let i = 0; i < list.length; i++) for (let j = i + 1; j < list.length; j++) if (Math.hypot(list[i].x - list[j].x, list[i].z - list[j].z) <= ISOLATION) KM.pairs.push([list[i], list[j]]);
  for (const e of list) if (!KM.pairs.some(p => p.includes(e))) KM.alone.add(e);
  let best = K_RANGE, bestNear = K_RANGE;
  for (const e of list) { const d = Math.hypot(e.x - hero.x, e.z - hero.z);
    if (d < bestNear) { bestNear = d; KM.near = e; }
    if (KM.alone.has(e) && d < best) { best = d; KM.pick = e; } }
}
const S = 2;   // one game pixel
const dot = (g, p, c) => { g.fillStyle = c; g.fillRect(Math.round(p[0] / S) * S, Math.round(p[1] / S) * S, S, S); };
function bubble(g, e, c, rot, a) { g.globalAlpha = a; const n = Math.ceil(BR * 2.4);
  for (let i = 0; i < n; i++) { const th = i / n * Math.PI * 2; if (Math.floor((th + rot) / .2) % 2) continue; dot(g, toScreen(e.x + Math.cos(th) * BR, 0, e.z + Math.sin(th) * BR), c); } }
// on the floor, under everything else on the layer: the bubbles, the link lines, the kill line
export function drawMarkers(g, hero, t) {
  if (CAM.zoom > 1.05) return;
  for (const [a, b] of KM.pairs) { bubble(g, a, GREY, 0, .35); bubble(g, b, GREY, 0, .35);
    g.globalAlpha = .7; const n = Math.hypot(b.x - a.x, b.z - a.z) | 0; for (let i = 0; i < n; i += 3) dot(g, toScreen(a.x + (b.x - a.x) * i / n, 4, a.z + (b.z - a.z) * i / n), '#9aa3a1'); }
  for (const e of KM.alone) bubble(g, e, CY, t * .6, .5 * (e === KM.pick ? 1 : .4) + .2);
  const e = KM.pick || KM.near;
  if (e) { const n = Math.hypot(e.x - hero.x, e.z - hero.z) | 0, pos = (t * 1.4 % 1) * n;
    for (let i = 6; i < n - 4; i += 3) { const hot = KM.pick && Math.abs(i - pos) < 4; g.globalAlpha = hot ? 1 : KM.pick ? .45 : .3;
      dot(g, toScreen(hero.x + (e.x - hero.x) * i / n, 3, hero.z + (e.z - hero.z) * i / n), hot ? '#ffffff' : KM.pick ? CY : GREY); } }
  g.globalAlpha = 1;
}
// over him: the K keycap (9×9 game px), bobbing a pixel
export function drawPrompt(g, t) {
  const e = KM.pick; if (!e || CAM.zoom > 1.05) return;
  const p = toScreen(e.x, 40, e.z), x = Math.round(p[0] / S - 4) * S, y = Math.round(p[1] / S + (t % 1 < .5 ? 0 : 1)) * S, R = (a, b, w, h, c) => { g.fillStyle = c; g.fillRect(x + a * S, y + b * S, w * S, h * S); };
  R(0, 0, 9, 9, '#1b1e21'); R(0, 0, 9, 1, CY); R(0, 8, 9, 1, CY); R(0, 0, 1, 9, CY); R(8, 0, 1, 9, CY);
  R(3, 2, 1, 5, '#fff'); R(4, 4, 1, 1, '#fff'); R(5, 3, 1, 1, '#fff'); R(5, 5, 1, 1, '#fff'); R(6, 2, 1, 1, '#fff'); R(6, 6, 1, 1, '#fff');
}
