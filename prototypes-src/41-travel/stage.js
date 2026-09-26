// ---- Prototype 41: the road at game scale (480 × 270, 1:1 pixels): the ground of the zone he is crossing, the people he meets, the weather ----
// Figures are the game's own rig (src/rig/rig.js), moving by their culture's traits (src/traits/), so nothing here is a new sprite of him.
import { rig } from '../../src/rig/rig.js';
import { RC, FW, FH, OX, OY } from '../../src/config.js';
import { hash, rng } from '../../src/sim/rng.js';

export const W = 480, H = 270, ROAD_Y = 166;
// palettes over the rig's letters: the samurai's red-grey (world/enemy-draw.js), earth for common folk, pale for mourners
export const PALS = {
  ronin: RC,
  samurai: { ...RC, K: '#3a2e31', D: '#5a4a4e', E: '#ff5a4a', e: '#7a2d27', W: '#cfd4d6', S: '#7d868e', s: '#3a3033' },
  earth: { ...RC, K: '#2e2823', D: '#4f453a', M: '#3a322a', m: '#564a3e', H: '#7d6d50', G: '#948260', B: '#62553f', E: '#171310', e: '#2a231d' },
  monk: { ...RC, K: '#1d1b20', D: '#3b3542', M: '#2a2630', m: '#443d4b', H: '#7d6d50', G: '#948260', B: '#62553f', E: '#151417', e: '#26232a' },
  mourner: { ...RC, K: '#8d9290', D: '#b9bebc', M: '#a4a9a7', m: '#c8cdcb', E: '#2b2f2e', e: '#4a4f4d' },
  rival: { ...RC, K: '#16181c', D: '#343a44', E: '#cfd4d6', e: '#5b6068' },
};
// one pose into a sprite: the rig into its 96 × 64 frame; eyesOnly draws just the eyes (they stay lit through the night)
const frame = document.createElement('canvas'); frame.width = FW; frame.height = FH;
const fg = frame.getContext('2d');
const EYES = Object.fromEntries(Object.keys(RC).map(k => [k, 'rgba(0,0,0,0)']));
export function sprite(p, pal = RC, eyesOnly = false) {
  fg.clearRect(0, 0, FW, FH);
  rig(fg, 0, p, eyesOnly ? { ...EYES, E: pal.E } : pal);
  return frame;
}
// draw a figure with its feet at (x, y). slice(img) may tear it (the storm) before it lands
export function figure(g, p, x, y, face, pal, { alpha = 1, slice, shadow = true } = {}) {
  let img = sprite(p, pal); if (slice) img = slice(img);
  if (shadow) { g.fillStyle = 'rgba(16,20,20,.32)'; g.fillRect(Math.round(x - 6), Math.round(y), 12, 2); }
  g.save(); g.globalAlpha = alpha; g.translate(Math.round(x), Math.round(y) - OY);
  if (face < 0) g.scale(-1, 1);
  g.drawImage(img, -OX, 0); g.restore();
}
export function eyes(g, p, x, y, face, pal) {
  g.save(); g.translate(Math.round(x), Math.round(y) - OY); if (face < 0) g.scale(-1, 1); g.drawImage(sprite(p, pal, true), -OX, 0); g.restore();
}

// ---- the ground: made once per zone from its seed, so the same zone always looks the same ----
const BIOME_FLOOR = { plains: '#474c4a', paddy: '#454c4a', forest: '#434946', bamboo: '#444a46', marsh: '#434948', hills: '#4a4e4c', mountains: '#4d5150', coast: '#4a4d4a', sea: '#2a3337' };
export function ground(zone, season, dark) {
  const c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d');
  const r = rng(hash('ground', zone.x, zone.y)), px = (x, y, col, w = 1, h = 1) => { g.fillStyle = col; g.fillRect(x | 0, y | 0, w, h); };
  g.fillStyle = BIOME_FLOOR[zone.biome] || '#474c4a'; g.fillRect(0, 0, W, H);
  // ground texture: sparse tufts and flecks, never noise per pixel
  for (let i = 0; i < 700; i++) { const x = r.int(0, W), y = r.int(0, H); px(x, y, r.chance(.5) ? '#3f4442' : '#505553'); if (r.chance(.3)) px(x, y - 1, '#3b403e'); }
  const band = (y0, y1) => y => y > y0 && y < y1;
  const offRoad = band(ROAD_Y - 22, ROAD_Y + 12);
  // the zone's own biome
  const trees = { forest: 34, bamboo: 0, plains: 5, hills: 8, paddy: 2, marsh: 3, coast: 2, mountains: 6 }[zone.biome] || 0;
  const tree = (x, y, s) => { px(x - 1, y + s - 2, '#2a2f2c', 3, 4); for (let k = 0; k < s * s * 2.2; k++) { const a = r.range(0, 6.283), d = Math.sqrt(r.next()) * s;
    const tx = x + Math.cos(a) * d, ty = y + Math.sin(a) * d * .8; px(tx, ty, d > s * .7 ? '#2c3530' : r.chance(.25) ? '#3f4b43' : '#343e38'); } px(x - 2, y - s * .6, '#46534a', 2, 1); };
  for (let i = 0; i < trees; i++) { const y = r.chance(.5) ? r.int(8, ROAD_Y - 40) : r.int(ROAD_Y + 26, H - 6); tree(r.int(0, W), y, r.int(6, 12)); }
  if (zone.biome === 'bamboo') for (let i = 0; i < 90; i++) { const x = r.int(0, W), y0 = r.chance(.5) ? r.int(0, ROAD_Y - 60) : r.int(ROAD_Y + 20, H - 40), h = r.int(18, 40);
    px(x, y0, '#3a4a40', 1, h); for (let k = 0; k < h; k += 6) px(x - 1, y0 + k, '#2d3a32', 3, 1); }
  if (zone.biome === 'paddy') for (let yy = 0; yy < 2; yy++) for (let i = 0; i < 5; i++) { const x = i * 100 + r.int(-10, 10), y = yy ? ROAD_Y + 30 : 20, w = r.int(70, 90), h = yy ? H - ROAD_Y - 40 : ROAD_Y - 60;
    px(x, y, '#3a484b', w, h); for (let k = 3; k < h; k += 5) for (let j = 2; j < w; j += 4) px(x + j, y + k, '#4d5e54'); px(x, y, '#56676a', w, 1); }
  if (zone.biome === 'hills' || zone.biome === 'mountains') for (let i = 0; i < (zone.biome === 'mountains' ? 14 : 7); i++) {
    const x = r.int(0, W), y = r.chance(.5) ? r.int(4, ROAD_Y - 50) : r.int(ROAD_Y + 26, H - 16), w = r.int(10, 28), h = r.int(6, 14);
    for (let k = 0; k < h; k++) { const ww = Math.round(w * (1 - k / h * .6)); px(x - ww / 2, y - k, k === h - 1 ? '#7a807d' : k > h * .6 ? '#6d7370' : '#5f6562', ww, 1); } px(x - w / 2, y + 1, '#3a3f3d', w, 1); }
  if (zone.biome === 'marsh') for (let i = 0; i < 40; i++) { const x = r.int(0, W), y = r.chance(.5) ? r.int(10, ROAD_Y - 30) : r.int(ROAD_Y + 24, H); px(x - 6, y, '#3a484b', 14, 3); px(x, y - 5, '#55604f', 1, 5); px(x + 2, y - 4, '#55604f', 1, 4); }
  if (zone.biome === 'coast') { for (let y = H - 34; y < H; y++) px(0, y, y < H - 24 ? '#6b675c' : '#26333a', W, 1); for (let i = 0; i < 60; i++) px(r.int(0, W), r.int(H - 24, H), '#8b9ea3', r.int(1, 4), 1); }
  // settlements: what the zone holds, above the road
  if (zone.kind === 'town' || zone.kind === 'village') for (let i = 0; i < (zone.kind === 'town' ? 7 : 4); i++) {
    const x = 20 + i * (zone.kind === 'town' ? 64 : 110) + r.int(0, 20), y = ROAD_Y - 58 + r.int(-10, 6), w = r.int(34, 48), h = r.int(18, 24);
    px(x, y + 6, '#5a5449', w, h); px(x, y + h + 4, '#3a3630', w, 2);
    for (let k = 0; k < 9; k++) px(x - 3 + k * .3, y + k, k === 0 ? '#3d444a' : '#2b2f33', w + 6 - k * .6, 1);
    px(x + w / 2 - 3, y + h - 4, '#241f1b', 6, 10); }
  if (zone.kind === 'camp') { for (let i = 0; i < 60; i++) { const x = 30 + i * 7; px(x, ROAD_Y - 62 + (i % 3), '#3a322b', 2, 16); px(x, ROAD_Y - 63 + (i % 3), '#57493d', 2, 1); }
    px(230, ROAD_Y - 36, '#2a2420', 10, 3); }
  if (zone.kind === 'fort') { px(0, ROAD_Y - 80, '#5f6562', W, 36); for (let x = 0; x < W; x += 12) px(x, ROAD_Y - 84, '#6d7370', 8, 4); px(0, ROAD_Y - 44, '#3a3f3d', W, 2); px(210, ROAD_Y - 72, '#241f1b', 28, 28); }
  if (zone.kind === 'shrine') { const x = 240, y = ROAD_Y - 30;   // a torii and a stone lantern
    px(x - 22, y - 44, '#4a2c29', 44, 3); px(x - 24, y - 47, '#3a2220', 48, 3); px(x - 18, y - 36, '#4a2c29', 36, 2); px(x - 16, y - 44, '#3e2624', 3, 44); px(x + 13, y - 44, '#3e2624', 3, 44);
    px(x + 34, y - 16, '#6d7370', 8, 2); px(x + 35, y - 14, '#5f6562', 6, 6); px(x + 34, y - 8, '#6d7370', 8, 2); px(x + 36, y - 6, '#5f6562', 4, 6);
    if (!dark) { px(x + 36, y - 13, '#f1d9a0', 2, 3); px(x + 37, y - 12, '#ffffff'); } }
  // the road: packed earth, ruts, a few stones; a track through the grass off the road
  if (zone.road) { px(0, ROAD_Y - 14, '#56524a', W, 22); px(0, ROAD_Y - 15, '#4e4a43', W, 1); px(0, ROAD_Y + 8, '#4e4a43', W, 1);
    for (let x = 0; x < W; x += 1) { if (r.chance(.6)) px(x, ROAD_Y - 6, '#4f4b44'); if (r.chance(.6)) px(x, ROAD_Y + 2, '#4f4b44'); }
    for (let i = 0; i < 50; i++) px(r.int(0, W), r.int(ROAD_Y - 13, ROAD_Y + 7), r.chance(.5) ? '#6d6a62' : '#48443e'); }
  else for (let x = 0; x < W; x++) if (r.chance(.35)) px(x, ROAD_Y + r.int(-2, 2), '#4f5451');
  if (season === 'winter') { g.fillStyle = 'rgba(214,222,222,.14)'; g.fillRect(0, 0, W, H); for (let i = 0; i < 500; i++) px(r.int(0, W), r.int(0, H), '#c9d0d0'); }
  return c;
}

// ---- weather and the hour: over the stage, under the storm ----
export function weather(g, kind, t, wind, parts) {
  if (kind === 'rain') { g.fillStyle = 'rgba(12,16,20,.14)'; g.fillRect(0, 0, W, H);
    g.fillStyle = 'rgba(160,178,184,.45)';
    for (let i = 0; i < 160; i++) { const x = ((i * 97 + t * 260) % (W + 60)) - 30, y = ((i * 53 + t * 420 + i * i) % (H + 20)) - 10; for (let k = 0; k < 4; k++) g.fillRect(Math.round(x - k), Math.round(y - k * 2), 1, 1); }
    for (let i = 0; i < 18; i++) { g.fillStyle = 'rgba(190,205,208,.5)'; g.fillRect((i * 131 + (t * 30 | 0) * 17) % W, (i * 71 + (t * 30 | 0) * 29) % H, 1, 1); } }
  if (kind === 'fog') for (let b = 0; b < 7; b++) { const y = (b * 41 + t * 3) % (H + 40) - 20;
    for (let k = 0; k < 18; k++) { g.fillStyle = `rgba(170,178,176,${(.05 + .04 * Math.sin(k / 18 * 3.14)).toFixed(3)})`; g.fillRect(0, Math.round(y + k * 2), W, 2); } }
  if (kind === 'snow') { g.fillStyle = 'rgba(20,24,30,.08)'; g.fillRect(0, 0, W, H);
    for (let i = 0; i < 140; i++) { const x = ((i * 89 + Math.sin(t * 1.3 + i) * 6 + t * 12) % W + W) % W, y = (i * 37 + t * 22 + i * 3) % H; g.fillStyle = i % 5 ? '#e6ecec' : '#ffffff'; g.fillRect(Math.round(x), Math.round(y), 1, 1); } }
  if (kind === 'wind') { g.fillStyle = 'rgba(150,158,150,.45)';
    for (let i = 0; i < 26; i++) { const x = ((i * 151 + t * 190) % (W + 40)) - 20, y = (i * 67 + Math.sin(t * 2 + i) * 4) % H; g.fillRect(Math.round(x), Math.round(y), 3 + (i % 3), 1); } }
}
export function night(g, amount) { if (amount <= 0) return; g.fillStyle = `rgba(6,10,20,${(.5 * amount).toFixed(3)})`; g.fillRect(0, 0, W, H); }

// ---- a horse at the gallop, drawn in pixels (the rig is for people) ----
export function horse(g, x, y, face, t, saddled = true) {
  const f = Math.floor(t * 12) % 4, s = face, px = (dx, dy, col, w = 1, h = 1) => { g.fillStyle = col; g.fillRect(Math.round(x + (s > 0 ? dx : -dx - w)), Math.round(y + dy), w, h); };
  g.fillStyle = 'rgba(16,20,20,.32)'; g.fillRect(Math.round(x - 12), Math.round(y), 24, 2);
  const legs = [[[-9, 2], [-7, -2], [7, 2], [9, -2]], [[-8, -1], [-10, 1], [9, -1], [6, 1]], [[-11, 2], [-6, 0], [5, 2], [10, 0]], [[-7, 1], [-9, -1], [8, 1], [7, -2]]][f];
  for (const [lx, ly] of legs) { px(lx, -8, '#2e2521', 2, 5); px(lx + ly * .5, -3, '#2e2521', 1, 3 + (ly < 0 ? -1 : 0)); }
  px(-11, -17, '#3b2f2a', 22, 9); px(-10, -18, '#46382f', 20, 1); px(-11, -9, '#2e2521', 22, 1);
  px(10, -22, '#3b2f2a', 5, 7); px(13, -24, '#3b2f2a', 6, 4); px(17, -23, '#2e2521', 3, 3); px(15, -24, '#e9eeee');
  px(9, -24, '#1c1614', 4, 6); px(-14, -17, '#1c1614', 3, 2); px(-15, -15 + (f % 2), '#1c1614', 2, 5);
  if (saddled) { px(-4, -19, '#5a4a3a', 9, 2); px(-2, -17, '#3a2f25', 2, 7); }
}
// a closed coffin on poles for the funeral
export function coffin(g, x, y) { g.fillStyle = '#2a2622'; g.fillRect(Math.round(x - 30), Math.round(y - 20), 60, 2); g.fillStyle = '#d9dcd8'; g.fillRect(Math.round(x - 9), Math.round(y - 30), 18, 10); g.fillStyle = '#b3b8b5'; g.fillRect(Math.round(x - 9), Math.round(y - 21), 18, 1); g.fillStyle = '#8d9290'; g.fillRect(Math.round(x - 10), Math.round(y - 31), 20, 1); }
