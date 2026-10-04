// ---- Prototype 48's world map: the sim's 100 × 100 zones from above (prototype 35's read), with what the page asks about
// laid on: view=window (the 3 × 3 zones built round him), view=hold (each region in its people's colour, seats and borders),
// view=route (a journey on the travel map along the roads, every zone rolled by the travel lane's enterZone).
import 'ronin-engine/sim/travel/index.js';
import { generateWorld, zoneAt } from 'ronin-engine/sim/index.js';
import { enterZone } from 'ronin-engine/sim/travel/index.js';

const Q = new URLSearchParams(location.search), pair = (k, d) => Q.has(k) ? Q.get(k).split(',').map(Number) : d;
const L = generateWorld(+(Q.get('seed') || 12345), 0), cv = document.querySelector('canvas'), g = cv.getContext('2d');
const [cx, cy] = pair('c', [50, 50]), span = +(Q.get('span') || 100), px = Math.floor(Math.min(cv.width, cv.height) / span), X0 = cx - span / 2, Y0 = cy - span / 2;
const sx = x => (x - X0) * px, sy = y => (y - Y0) * px;
const BIOME = { coast: '#4a4636', plains: '#2f3a24', paddy: '#2a3a3a', forest: '#1d2a1b', bamboo: '#26331e', marsh: '#22302a', hills: '#3a3a2c', mountains: '#454b55', sea: '#0e1420' };
const view = Q.get('view') || 'plain';
g.fillStyle = '#060709'; g.fillRect(0, 0, cv.width, cv.height);
for (const z of L.zones) { if (z.x < X0 || z.y < Y0 || z.x >= X0 + span || z.y >= Y0 + span) continue;
  let c = BIOME[z.biome] || '#333'; if (view === 'hold' && z.kind !== 'sea') c = `hsl(${L.cultures[L.regions[z.region].culture].hue} 35% ${z.void ? 12 : 24}%)`;
  g.fillStyle = c; g.fillRect(sx(z.x), sy(z.y), px, px);
  if (z.void && view !== 'hold') { g.fillStyle = 'rgba(90,60,120,.35)'; g.fillRect(sx(z.x), sy(z.y), px, px); } }
// region borders
g.fillStyle = 'rgba(200,210,220,.35)';
for (const z of L.zones) { if (z.kind === 'sea') continue; for (const [dx, dy] of [[1, 0], [0, 1]]) { const n = zoneAt(L, z.x + dx, z.y + dy); if (n && n.kind !== 'sea' && n.region !== z.region) g.fillRect(sx(z.x + dx) - (dy ? 0 : .5), sy(z.y + dy) - (dx ? 0 : .5), dy ? px : 1, dx ? px : 1); } }
// roads
g.strokeStyle = '#8a7a5a'; g.lineWidth = Math.max(1, px / 5); g.beginPath();
for (const z of L.zones) { if (!z.road) continue; for (const [dx, dy] of [[1, 0], [0, 1]]) { const n = zoneAt(L, z.x + dx, z.y + dy); if (n && n.road) { g.moveTo(sx(z.x + .5), sy(z.y + .5)); g.lineTo(sx(n.x + .5), sy(n.y + .5)); } } }
g.stroke();
// settlements
for (const z of L.zones) { const x = sx(z.x + .5), y = sy(z.y + .5);
  if (z.kind === 'town') { g.fillStyle = '#e8e1cf'; g.fillRect(x - px * .4, y - px * .4, px * .8, px * .8); }
  else if (z.kind === 'village') { g.fillStyle = '#c8b07a'; g.beginPath(); g.arc(x, y, px * .3, 0, 7); g.fill(); }
  else if (z.kind === 'camp') { g.strokeStyle = '#d03a2e'; g.lineWidth = 2; g.beginPath(); g.moveTo(x - px * .3, y - px * .3); g.lineTo(x + px * .3, y + px * .3); g.moveTo(x + px * .3, y - px * .3); g.lineTo(x - px * .3, y + px * .3); g.stroke(); }
  else if (z.kind === 'fort') { g.strokeStyle = '#a9b1b6'; g.lineWidth = 2; g.strokeRect(x - px * .35, y - px * .35, px * .7, px * .7); }
  else if (z.kind === 'shrine') { g.fillStyle = '#b84c36'; g.fillRect(x - px * .3, y - px * .1, px * .6, px * .2); } }
const label = (s, x, y, col = '#e4e9e9', size = 13) => { g.font = `${size}px monospace`; g.lineWidth = 3; g.strokeStyle = '#060709'; g.strokeText(s, x, y); g.fillStyle = col; g.fillText(s, x, y); };
const [hx, hy] = pair('hero', [54, 50]);
if (view === 'window') { g.strokeStyle = '#6ff3e4'; g.lineWidth = 2; g.strokeRect(sx(hx - 1), sy(hy - 1), px * 3, px * 3); g.fillStyle = 'rgba(111,243,228,.25)'; g.fillRect(sx(hx), sy(hy), px, px);
  g.setLineDash([4, 3]); g.strokeRect(sx(hx - 2), sy(hy - 2), px * 5, px * 5); g.setLineDash([]); label('built', sx(hx - 1), sy(hy - 1) - 5, '#6ff3e4'); label('folded into the ledger', sx(hx - 2), sy(hy + 3) + 16, '#8b949c'); }
if (view === 'hold') for (const r of L.regions) { const [x, y] = r.seat, lord = L.actors[r.lord];
  if (x < X0 || y < Y0 || x >= X0 + span || y >= Y0 + span) continue; g.strokeStyle = '#ffd29a'; g.lineWidth = 2; g.strokeRect(sx(x) - 2, sy(y) - 2, px + 4, px + 4);
  if (span <= 40) label(`${r.name}${lord ? ' · ' + lord.family : ''}`, sx(x) + px + 4, sy(y) + px * .8, '#ffd29a', 12); }
if (view === 'route') {   // breadth-first along the road zones, then the travel lane rolls each zone crossed
  const [tx, ty] = pair('to', [64, 61]), key = (x, y) => y * 100 + x, prev = new Map([[key(hx, hy), -1]]), q = [[hx, hy]];
  while (q.length) { const [x, y] = q.shift(); if (x === tx && y === ty) break; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const n = zoneAt(L, x + dx, y + dy); if (!n || !n.road || prev.has(key(n.x, n.y))) continue; prev.set(key(n.x, n.y), key(x, y)); q.push([n.x, n.y]); } }
  const path = []; for (let k = key(tx, ty); k !== -1 && k !== undefined; k = prev.get(k)) path.unshift([k % 100, Math.floor(k / 100)]);
  g.strokeStyle = '#6ff3e4'; g.lineWidth = Math.max(2, px / 3); g.beginPath(); path.forEach(([x, y], i) => i ? g.lineTo(sx(x + .5), sy(y + .5)) : g.moveTo(sx(x + .5), sy(y + .5))); g.stroke();
  let stop = null; for (const [x, y] of path.slice(1)) { const sc = enterZone(L, x, y); if (sc) { stop = { x, y, title: sc.title || sc.type }; break; } }
  const z1 = zoneAt(L, hx, hy), z2 = zoneAt(L, tx, ty); label(z1.name, sx(hx) - 20, sy(hy) - 6, '#6ff3e4'); label(z2.name, sx(tx), sy(ty + 1) + 14, '#6ff3e4');
  if (stop) { g.fillStyle = '#ff5a4a'; g.beginPath(); g.arc(sx(stop.x + .5), sy(stop.y + .5), px * .6, 0, 7); g.fill(); label(stop.title, sx(stop.x + 1) + 4, sy(stop.y + .5) + 4, '#ff9a8a'); }
  window.__route = { zones: path.length - 1, stop, from: z1.name, to: z2.name }; }
window.__ready = true;
