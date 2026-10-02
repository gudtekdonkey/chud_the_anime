import { COL } from '../config.js';
import { g } from '../screen.js';
import { P, INV, glints } from '../state.js';
import { residue, ring, spark, rr, sgn } from '../fx/util.js';
import { ease } from '../rig/pose.js';
import { qiFill } from '../player/qi.js';
import { drawS, tinted } from '../ui/sprites.js';
import { glint } from '../ui/hud-kit.js';
import { WS } from './item-sprites.js';
import { heal, addMon, addShards, addQuick, addCharm, freeCharm } from './inventory.js';
import { chest, pop, plusPop } from './item-fx.js';

// ---- Small pickups, floor consumables and relics: no brackets, no button ----
// small ones idle until he is within about 22 px (y counts 1.6x, the floor is squashed), then pop up and fly to his chest
const WH = '#ffffff', CY = '#6ff3e4', CY2 = '#b8fff6';
const CONS = { bomb: 'bomb', talisman: 'talisman', whet: 'whetstone', incense: 'incense' };   // floor sprite -> quick slot id
const RELIC_WS = { bead: 'bead', mirror: 'mirror', bell: 'bell', tsuba: 'tsuba', crane: 'crane', knot: 'knot' };
const at = (kind, x, y, i = 0) => ({ kind, x, y, ph: i * .4 });
export const PICKUPS = [
  at('qi', 150, 212, 0), at('qi', 162, 219, 1), at('qi', 174, 213, 2), at('coin', 380, 142, 0), at('coin', 388, 149, 1), at('coin', 396, 141, 2),
  at('rice', 40, 240), at('shard', 60, 172), at('shard', 452, 252, 1), at('shard', 330, 104, 2), at('shard', 150, 92, 3), at('shard', 110, 104, 4), at('talisman', 300, 252), at('bomb', 118, 196),
  { ...at('tsuba', 446, 160), relic: true }];
export const loot = [];   // what a chest spills: it arcs out, lands, then flies to him from anywhere

// the room check for a consumable or relic, so it waits on the floor when there is nowhere to put it
const roomFor = it => it.relic ? freeCharm() >= 0 : CONS[it.kind] ? addQuick.room(CONS[it.kind]) : true;
function collect(it) {
  const [x, y] = chest();
  if (it.kind === 'qi') { qiFill(.1); ring(x, y, 2, 2, .18, 2.5, CY); for (let i = 0; i < 3; i++) spark(x, y, rr(-50, 50), rr(-60, -10), .15, i % 2 ? CY : CY2, true); }
  else if (it.kind === 'rice') { heal(.2); plusPop(x - 3, y - 2); plusPop(x + 4, y + 1, -.08); ring(x, y, 3, 3, .2, 1.3); }
  else if (it.kind === 'coin') { addMon(1); pop(x, y - 4, '+1'); glints.push({ x: Math.round(x), y: Math.round(y), t: 0 }); }
  else if (it.kind === 'shard') { addShards(1); residue(x, P.y, 8); P.glitchNow = .12; pop(x, y - 4, '+1', CY); }
  else if (CONS[it.kind]) { addQuick(CONS[it.kind]); pop(x, y - 4, '+1'); }
}
function pickupSim(it, dt, radius) {
  if (it.got) return;
  if (!it.pull) { if (!P.hidden && Math.hypot(P.x - it.x, (P.y - it.y) * 1.6) < radius && roomFor(it)) { it.pull = true; it.sx = it.x; it.sy = it.y - (it.kind === 'qi' ? 4 : 3); it.v = 10; it.age = 0; } else return; }
  it.age += dt; it.v += 700 * dt; it.px = it.sx; it.py = it.sy;
  const [tx, ty] = chest(), dx = tx - it.sx, dy = ty - it.sy, d = Math.hypot(dx, dy);
  if (d < 3 || d < it.v * dt) { it.got = true; collect(it); return; }
  it.sx += dx / d * it.v * dt; it.sy += dy / d * it.v * dt - (it.age < .1 ? 40 * dt : 0);
}
// a relic: walking into it spins it up, then it flies into the first empty charm slot on the HUD
const charmXY = i => [260 + i * 22 + 10, 241 + 10];
function relicSim(it, dt) {
  if (it.got) return;
  if (it.tp == null) { if (Math.hypot(P.x - it.x, (P.y - it.y) * 1.6) < 9 && freeCharm() >= 0) { it.tp = 0; it.slot = freeCharm(); INV.charms[it.slot] = 'incoming'; } return; }
  it.tp += dt;
  if (it.tp >= .5) { it.got = true; INV.charms[it.slot] = null; addCharm(it.kind, it.slot); }
}
export function updatePickups(dt) {
  for (const it of PICKUPS) it.relic ? relicSim(it, dt) : pickupSim(it, dt, 22);
  for (const l of loot) {
    if (!l.landed) { l.x += l.vx * dt; l.z += l.vz * dt; l.vz -= 300 * dt; if (l.z <= 0 && l.vz < 0) { l.z = 0; l.landed = true; l.wait = .1; } }
    else if ((l.wait -= dt) < 0) pickupSim(l, dt, 999);
  }
  for (let i = loot.length - 1; i >= 0; i--) if (loot[i].got) loot.splice(i, 1);
}
function qiCross(x, y) { g.fillStyle = CY; g.fillRect(x - 1, y, 3, 1); g.fillRect(x, y - 1, 1, 3); g.fillStyle = WH; g.fillRect(x, y, 1, 1); }
const wsOf = kind => WS[kind === 'coin' ? 'coin' : kind];
// on the floor, depth-sorted with everything else
export function drawPickup(it, t) {
  if (it.got || it.pull) return;
  const ph = it.ph || 0;
  if (it.relic) { if (it.tp != null) return; const z = 3 + Math.round(Math.sin(t * 2.4));   // hovering a pixel or three over a faint cyan pool
    g.save(); g.globalAlpha = .35 + .15 * Math.sin(t * 2.4); g.fillStyle = CY; g.fillRect(it.x - 3, it.y, 7, 1); g.fillRect(it.x - 1, it.y + 1, 3, 1); g.restore();
    drawS(WS[RELIC_WS[it.kind]], it.x, it.y, { z }); return; }
  if (it.kind === 'qi') {   // a mote: a cross of cyan with a white heart, bobbing, a ring pulsing out
    const z = 4 + Math.round(Math.sin(t * 3 + ph)), x = Math.round(it.x), y = Math.round(it.y) - z;
    g.fillStyle = 'rgba(18,22,22,.35)'; g.fillRect(x - 1, Math.round(it.y), 3, 1);
    g.save(); g.globalAlpha = .17; g.fillStyle = CY; g.fillRect(x, Math.round(it.y) + z, 1, 1); g.restore();
    qiCross(x, y);
    const k = ((t + ph) % 1.4) / .5; if (k < 1) { g.save(); g.globalAlpha = 1 - k; g.fillStyle = CY2; const r = 2 + Math.round(k * 2);
      g.fillRect(x - r, y, 1, 1); g.fillRect(x + r, y, 1, 1); g.fillRect(x, y - r, 1, 1); g.fillRect(x, y + r, 1, 1); g.restore(); }
    return; }
  const s = wsOf(it.kind);
  if (it.kind === 'shard') {   // lantern ash (id 'shard'): it will not sit still: a slice of it slips sideways now and then
    const x0 = Math.round(it.x - 1), z = 2 + Math.round(Math.sin(t * 2.2 + ph)), y0 = Math.round(it.y) - s.h - z;
    g.fillStyle = 'rgba(18,22,22,.4)'; g.fillRect(x0, Math.round(it.y), 3, 1);
    const jit = (Math.floor((t + ph) * 12) % 9) === 0;
    for (let r = 0; r < s.h; r++) g.drawImage(s.c, 0, r, s.w, 1, x0 + (jit && r > 2 && r < 5 ? sgn() : 0), y0 + r, s.w, 1);
    if (Math.floor((t + ph) * 8) % 7 === 0) { g.fillStyle = CY2; g.fillRect(x0 + 4, y0 + 2, 2, 1); }
    return; }
  drawS(s, it.x, it.y);
  const k = (t + ph) % 1.8;   // a glint that crosses it
  if (k < .12) { const gx = Math.round(it.x - Math.floor(s.w / 2)) + 1 + Math.round(k / .12 * (s.w - 2)), gy = Math.round(it.y) - s.h + 1;
    g.fillStyle = WH; g.fillRect(gx, gy, 1, 1); if (k > .04 && k < .08) glint(gx, gy - 1, 1, WH); }
}
// in flight (to him, or a relic to the HUD): over the world
export function drawFlying(t) {
  for (const it of [...PICKUPS, ...loot]) {
    if (it.relic) { if (it.tp == null || it.got) continue; drawRelicFlight(it); continue; }
    if (!it.landed && it.z != null) { const x = Math.round(it.x), y = Math.round(it.y - it.z - 3); if (it.kind === 'coin') g.drawImage(WS.coin.c, x - 2, y - 2); else qiCross(x, y); continue; }
    if (it.z != null && !it.pull) { drawPickup(it, t); continue; }
    if (!it.pull || it.got) continue;
    const x = Math.round(it.sx), y = Math.round(it.sy);
    g.save(); g.globalAlpha = .5; g.fillStyle = it.kind === 'rice' || it.kind === 'coin' ? WH : CY; g.fillRect(Math.round(it.px ?? x), Math.round(it.py ?? y), 1, 1); g.restore();
    if (it.kind === 'qi') qiCross(x, y); else { const s = wsOf(it.kind); g.drawImage(s.c, x - Math.floor(s.w / 2), y - Math.floor(s.h / 2)); }
  }
}
function drawRelicFlight(it) {
  const s = WS[RELIC_WS[it.kind]], tp = it.tp, [tx, ty] = charmXY(it.slot);
  if (tp < .28) { const z = 4 + ease(Math.min(1, tp / .12)) * 18, sc = Math.abs(Math.cos(Math.min(1, Math.max(0, (tp - .1) / .18)) * Math.PI * 2)), w = Math.max(1, Math.round(s.w * sc));
    g.drawImage(tp > .18 && tp < .22 ? tinted(s, WH) : s.c, Math.round(it.x - w / 2), Math.round(it.y - s.h - z), w, s.h);
    if (tp > .18 && tp < .24) glint(it.x, Math.round(it.y - s.h / 2 - z), 3, WH); return; }
  const k = ease(Math.min(1, (tp - .28) / .22)), x0 = it.x, y0 = it.y - 22 - s.h / 2;
  const x = x0 + (tx - x0) * k, y = y0 + (ty - y0) * k - Math.sin(k * Math.PI) * 10;
  g.fillStyle = CY2; for (let i = 1; i < 5; i++) { const kk = ease(Math.min(1, Math.max(0, (tp - .28 - i * .012) / .22))); g.fillRect(Math.round(x0 + (tx - x0) * kk), Math.round(y0 + (ty - y0) * kk - Math.sin(kk * Math.PI) * 10), 1, 1); }
  g.drawImage(s.c, Math.round(x - s.w / 2), Math.round(y - s.h / 2));
}
