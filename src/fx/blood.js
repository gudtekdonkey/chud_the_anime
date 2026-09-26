import { g } from '../screen.js';
import { rr } from './util.js';

// ---- Blood (from the deaths pass): drops leave the far side of a wound, fall, and stain the floor; a pool spreads under the fallen ----
// dark and muted on purpose, so the cyan effects stay the loudest thing on screen
const BLOOD = ['#7a1b24', '#5a121a', '#931f2c'], STAIN = ['#4c1f24', '#55222a', '#43191e'];
const drops = [], stains = [], pools = [];
// z: height of the wound off the floor; dir: which way the blow carried it
export function bleed(x, y, z, dir, mag) {
  for (let i = 0; i < 5 + 12 * mag; i++) drops.push({ x: x + dir * rr(0, 3), y: y + rr(-2, 2), z: z + rr(-5, 5),
    vx: dir * rr(15, 65) * mag, vy: rr(-8, 8), vz: rr(5, 45), c: BLOOD[i % 3], big: Math.random() < .3 });
}
export const pool = (x, y, max) => pools.push({ x, y, r: 0, max, t: -.35 });
export function clearBlood() { drops.length = stains.length = pools.length = 0; }
export function updateBlood(dt) {
  for (let i = drops.length - 1; i >= 0; i--) { const q = drops[i]; q.x += q.vx * dt; q.y += q.vy * dt; q.z += q.vz * dt; q.vz -= 320 * dt;
    if (q.z <= 0) { stains.push({ x: Math.round(q.x), y: Math.round(q.y), c: STAIN[Math.random() * 3 | 0], w: q.big ? 2 : 1 });
      if (q.big && Math.abs(q.vx) > 40) stains.push({ x: Math.round(q.x + Math.sign(q.vx)), y: Math.round(q.y), c: STAIN[0], w: 1 }); drops.splice(i, 1); } }
  for (const p of pools) { p.t += dt; if (p.t > 0) p.r = p.max * (1 - Math.exp(-p.t * 1.6)); }
  if (stains.length > 1500) stains.splice(0, stains.length - 1500);   // a long fight never grows without end
}
export function drawBloodFloor(alpha = 1) {
  g.globalAlpha = alpha;
  for (const p of pools) if (p.r >= .5) { g.fillStyle = STAIN[1];
    for (let y = -Math.ceil(p.r * .5); y <= Math.ceil(p.r * .5); y++) { const w = Math.round(p.r * Math.sqrt(Math.max(0, 1 - (y / (p.r * .5 + .01)) ** 2))); g.fillRect(Math.round(p.x) - w, Math.round(p.y) + y, 2 * w + 1, 1); } }
  for (const s of stains) { g.fillStyle = s.c; g.fillRect(s.x, s.y, s.w, 1); }
  g.globalAlpha = 1;
}
export function drawDrops() { for (const q of drops) { g.fillStyle = q.c; g.fillRect(Math.round(q.x), Math.round(q.y - q.z), 1, q.big ? 2 : 1); } }
