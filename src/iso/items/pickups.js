// ---- Small pickups, floor consumables and a relic (today's items/pickups.js): no brackets, no button. Within about
// 22 units a small one pops up and flies into his chest (the magnet); a consumable waits on the floor while its stack
// has no room; walking onto the relic sends it to the first empty charm slot. What a chest spills arcs out, lands, then
// flies to him from anywhere. Drawn as today's world sprites (items/item-sprites.js) at 2×, on the effects layer.
import { WS } from '../../items/item-sprites.js';
import { CTX } from '../ctx.js';
import { W } from '../play/sim.js';
import { sparks, ring } from '../fx/fx.js';
import { heal, addMon, addShards, addQuick, addCharm, freeCharm, qiFill } from './inv.js';
import { sprite, chestOf } from './item-fx.js';
import { say } from '../hud/world-ui.js';
import { COL } from '../../config.js';
import { toScreen } from '../gfx/view.js';

const toS = (x, y, z) => toScreen(x, y, z).map(Math.round);

export const MAGNET = 22;
const CONS = { bomb: 'bomb', talisman: 'talisman', whet: 'whetstone', incense: 'incense' };   // floor sprite → quick slot id
const at = (kind, x, z, i = 0) => ({ kind, x, z, y: 0, ph: i * .4 });
// placed away from where he starts and the samurai's post, so the core loop's ground stays clear
export const PICKUPS = [at('qi', 150, 205, 0), at('qi', 160, 212, 1), at('qi', 170, 206, 2), at('coin', 296, 196, 0), at('coin', 304, 202, 1), at('coin', 312, 196, 2),
  at('rice', 60, 140), at('shard', 420, 80), at('shard', 440, 88, 1), at('shard', 120, 96, 2), at('talisman', 262, 214), at('bomb', 196, 64), at('whet', 30, 260), at('incense', 330, 250),
  { ...at('tsuba', 452, 150), relic: true }];
export const GOT = { n: 0, last: null };
// a chest's spill: each piece arcs out from (x, z)
export function spill(x, z, kinds) { kinds.forEach((kind, i) => { const a = i / kinds.length * 6.283 + Math.random() * .5, s = 18 + Math.random() * 14;
  PICKUPS.push({ kind, x, z, y: 8, vx: Math.sin(a) * s, vz: Math.cos(a) * s, vy: 50 + Math.random() * 20, ph: i * .3, loot: true }); }); }

const roomFor = it => it.relic ? freeCharm() >= 0 : CONS[it.kind] ? addQuick.room(CONS[it.kind]) : true;
function collect(it) {
  const hero = CTX.hero; GOT.n++; GOT.last = it.kind;
  if (it.kind === 'qi') { qiFill(.1); ring(W, hero.a.x, hero.a.z, { r: 6, life: .2 }); }
  else if (it.kind === 'rice') { heal(.2); say(hero, '+', COL.fx2, .5); }
  else if (it.kind === 'coin') addMon(1);
  else if (it.kind === 'shard') { addShards(1); sparks(W, hero.a.x, 20, hero.a.z, 4, { spd: 40, spread: 6 }); }
  else if (CONS[it.kind]) { addQuick(CONS[it.kind]); say(hero, '+1', '#ffffff', .6); }
}
export function tickPickups(dt) {
  const hero = CTX.hero, [hx, hy, hz] = chestOf(hero);
  for (const it of PICKUPS) { if (it.got) continue;
    if (it.vy != null && !it.landed) { it.x += it.vx * dt; it.z += it.vz * dt; it.vy -= 260 * dt; it.y += it.vy * dt; if (it.y <= 0 && it.vy < 0) { it.y = 0; it.landed = true; it.wait = .15; } continue; }
    if (it.relic) { if (it.tp == null) { if (Math.hypot(hero.x - it.x, hero.z - it.z) < 9 && freeCharm() >= 0) { it.tp = 0; it.slot = freeCharm(); } continue; }
      it.tp += dt; it.y = it.tp * 30; if (it.tp >= .5) { it.got = true; addCharm(it.kind, it.slot); } continue; }
    if (!it.pull) { if ((it.wait -= dt) > 0) continue; const near = it.loot ? 1e9 : MAGNET; if (Math.hypot(hero.x - it.x, hero.z - it.z) < near && roomFor(it)) { it.pull = true; it.v = 10; it.age = 0; } else continue; }
    it.age += dt; it.v += 600 * dt; const dx = hx - it.x, dy = hy - it.y, dz = hz - it.z, d = Math.hypot(dx, dy, dz);
    if (d < 3 || d < it.v * dt) { it.got = true; collect(it); continue; }
    it.x += dx / d * it.v * dt; it.y += dy / d * it.v * dt + (it.age < .1 ? 30 * dt : 0); it.z += dz / d * it.v * dt;
  }
  for (let i = PICKUPS.length - 1; i >= 0; i--) if (PICKUPS[i].got) PICKUPS.splice(i, 1);
}
const art = kind => WS[kind] || WS.coin;
// a Qi mote is a small cross of light; the rest are today's sprites, bobbing a pixel
export function drawPickups(g) {
  for (const it of PICKUPS) { const bob = it.pull || it.vy != null ? 0 : Math.round(Math.sin(W.t * 3 + it.ph) * .6 + .6);
    if (it.kind === 'qi') { const [x, y] = toS(it.x, it.y + 3 + bob, it.z); g.fillStyle = COL.fx; g.fillRect(x - 2, y, 6, 2); g.fillRect(x, y - 2, 2, 6); g.fillStyle = '#ffffff'; g.fillRect(x, y, 2, 2); continue; }
    sprite(g, art(it.kind), it.x, it.y + bob, it.z); }
}
