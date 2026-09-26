import { COL } from '../config.js';
import { g } from '../screen.js';
import { P, INV, ribbons } from '../state.js';
import { STONE } from '../fx/debris.js';
import { rr, spark } from '../fx/util.js';

// ---- Power (owner: skill tiers AND a stat boost): INV.power 1..3 picks each skill's I / II / III version and scales a few stats ----
// the stats, per tier. dmg waits for enemies with health; qi and cd work now
export const PW = { dmg: [1, 1.25, 1.5], qi: [1, 1.15, 1.3], cd: [1, .9, .8] };
export const tier = () => INV.power, pw = k => PW[k][INV.power - 1];
// each skill's tier numbers, read by the skill itself: [I, II, III]
export const TIERS = {
  chain: { hops: [3, 4, 5], storm: [8, 9, 10] },     // Storm Chain: more jumps, a longer storm
  tc: { cuts: [7, 9, 11] },                          // Thousand Cuts: more cuts in the same vanish
  rift: { size: [1, 1.15, 1.15], echo: [0, 0, .6] }, // Cross Rift: a bigger X; at III a second, smaller detonation
  moon: { shards: [0, 1, 1], twin: [0, 0, 1] },      // Crescent Moon: at II its shatter cuts too; at III a second moon behind him
  mirror: { more: [0, 1, 2] },                       // Mirror Meditation: more images
  sweep: { r: [1, 1.2, 1.2], pillars: [0, 0, 1] },   // storm slam: a wider slam; at III bolts climb out of every crack
};
export const T = (skill, k) => TIERS[skill][k][INV.power - 1];
// the look (design notes): I is quiet; II adds matter lifting off the floor; III adds ribbons of light. Nothing drawn on the floor.
export function powerCast(x = P.x, y = P.y) {
  const t = tier(); if (t < 2) return;
  for (let i = 0; i < 14; i++) { const a = rr(0, 6.28), R = rr(8, 26);
    spark(x + Math.cos(a) * R, y + Math.sin(a) * R * .45, rr(-6, 6), -rr(24, 50), rr(.5, .9), STONE[i % STONE.length], false, 30); }
  if (t < 3) return;
  for (let i = 0; i < 3; i++) ribbons.push({ x, y, a0: i / 3 * 6.28 + rr(-.3, .3), w: rr(6, 8) * (i % 2 ? -1 : 1), R: rr(12, 17), t: 0, life: .8, col: i === 1 ? '#ffffff' : COL.fx2 });
}
export function updateRibbons(dt) {
  for (const r of ribbons) r.t += dt;
  for (let i = ribbons.length - 1; i >= 0; i--) if (ribbons[i].t > ribbons[i].life) ribbons.splice(i, 1);
}
// a ribbon spirals up round where he stood, narrowing as it climbs; its tail trails a quarter-second behind the head
const rib = (r, u) => { const a = r.a0 + r.w * u, R = r.R * (1 - u * .7); return [Math.round(r.x + Math.cos(a) * R), Math.round(r.y - 4 - 46 * u + Math.sin(a) * R * .35)]; };
export function drawRibbons() {
  for (const r of ribbons) { const fade = Math.min(1, (r.life - r.t) * 4); g.fillStyle = r.col;
    for (let s = 0; s < 24; s++) { const u = r.t - s * .011; if (u < 0) break;
      g.globalAlpha = fade * (1 - s / 24); const [x, y] = rib(r, u); g.fillRect(x, y, 1, 1); if (s < 6) g.fillRect(x, y + 1, 1, 1); } }
  g.globalAlpha = 1;
}
