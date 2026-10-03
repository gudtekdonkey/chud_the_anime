// ---- E and the quick slots in the slice (today's items/items.js and items/harvest.js). E: a tap does the locked-on big
// item's verb; held 0.2 s by a companion who is down it lifts them (held through the lift); held by the fallen it is
// Harvest: he faces north (owner), kneels, and their remains stream into him as cyan light, 50 EXP a second (today's
// numbers), LEVEL UP on the way. Every kill leaves a body to Harvest. 1-4 use the quick slots. Taps are remembered
// 0.2 s (the owner's input buffer) until he can take them.
import { CTX } from 'ronin-engine/iso/ctx.js';
import { W } from 'ronin-engine/clock/world.js';
import { DIR } from 'ronin-engine/flow/flow.js';
import { BIG, usable, startAct, tickBig, acting } from './big.js';
import { tickPickups } from './pickups.js';
import { useQuick, tickQuick, USE } from './quick.js';
import { stream, tickItemFx } from './item-fx.js';
import { addExp } from './inv.js';
import { PARTY, liftAlly } from '../party/party.js';
import { REMAINS } from '../../items/item-sprites.js';
import { sprite } from './item-fx.js';

export const LOCK = 30, HARVEST_R = 40, RATE = 50, LIFT_R = 24, LIFT_T = 1.1, HOLD = .2, BUFFER = .2;
export const FALLEN = [];   // { x, z, exp, left }: a body to Harvest
export const IT = { locked: null, lockT: 0, eDown: false, eHeld: 0, taps: [], harvesting: null, lifting: null, liftT: 0, harvested: 0 };
const FREE = new Set(['idle', 'guard', 'run', 'runArmed', 'start', 'stop', 'sheathe']);
export const heroFree = () => !CTX.busy && FREE.has(CTX.hero.state);

export function addFallen(x, z, exp = 60) { FALLEN.push({ x, z, exp, left: exp, t: 0 }); }
export const harvestable = () => FALLEN.find(f => f.left > 0 && Math.hypot(f.x - CTX.hero.x, f.z - CTX.hero.z) < HARVEST_R);
export const downNear = () => PARTY.downed().find(al => Math.hypot(al.x - CTX.hero.x, al.z - CTX.hero.z) < LIFT_R);

export function initItemKeys(target = window) {
  target.addEventListener('keydown', e => { if (e.repeat || e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.code === 'KeyE') { e.preventDefault(); if (!IT.eDown) { IT.eDown = true; IT.eHeld = 0; } }
    const d = /^Digit([1-4])$/.exec(e.code); if (d) { e.preventDefault(); IT.taps.push({ k: 'q' + (d[1] - 1), age: 0 }); } });
  target.addEventListener('keyup', e => { if (e.code !== 'KeyE') return; if (IT.eDown && IT.eHeld < HOLD) IT.taps.push({ k: 'e', age: 0 }); IT.eDown = false; IT.eHeld = 0; });
  addEventListener('blur', () => { IT.eDown = false; });
}
// what E would do now (for the prompt): 'lift' | 'harvest' | an item | null
export function eTarget() { const al = downNear(); if (al) return { lift: al }; const f = harvestable(); if (f) return { harvest: f }; return IT.locked ? { item: IT.locked } : null; }

// the lock-on: the nearest usable big item within reach, roughly in front
function lockOn(dt) {
  const hero = CTX.hero; let best = null, d0 = LOCK;
  for (const it of BIG) { if (!usable(it)) continue; const d = Math.hypot(it.x - hero.x, it.z - hero.z) - Math.max(it.w, it.d) / 2; if (d < d0) { d0 = d; best = it; } }
  if (best !== IT.locked) { IT.locked = best; IT.lockT = 0; } else IT.lockT += dt;
}
// one game step (the world's hit-stop holds it: E pressed in one survives it)
export function tickItems(dt) {
  const hero = CTX.hero;
  lockOn(dt); tickBig(dt); tickPickups(dt); tickQuick(dt); tickItemFx(dt);
  for (const f of FALLEN) f.t += dt;
  for (const t of IT.taps) t.age += dt; while (IT.taps.length && IT.taps[0].age > BUFFER) IT.taps.shift();
  if (IT.eDown) IT.eHeld += dt;
  // held: lift a companion who is down, else Harvest
  if (IT.lifting) { const al = IT.lifting; if (!IT.eDown || !al.downed) { IT.lifting = null; IT.liftT = 0; CTX.busy = null; hero.a.play('idle'); }
    else if ((IT.liftT += dt) >= LIFT_T) { liftAlly(al); IT.lifting = null; IT.liftT = 0; CTX.busy = null; hero.a.play('idle'); } }
  else if (IT.harvesting) { const f = harvestable();
    if (!IT.eDown || !f) { IT.harvesting = null; CTX.busy = null; hero.a.play('idle'); }
    else { const n = Math.min(f.left, RATE * dt); f.left -= n; addExp(n); IT.harvested += n;
      if (Math.floor(W.t / .04) !== Math.floor((W.t - dt) / .04)) stream([f.x + (Math.random() - .5) * 12, 2 + Math.random() * 4, f.z + (Math.random() - .5) * 6], hero, { h: 4 + Math.random() * 6 }); } }
  else if (IT.eDown && IT.eHeld >= HOLD && heroFree()) {
    const al = downNear(), f = !al && harvestable();
    if (al) { IT.lifting = al; IT.liftT = 0; CTX.busy = 'lift'; hero.a.h = hero.a.ht = Math.atan2(al.x - hero.x, al.z - hero.z); hero.a.turnSnap = true; hero.a.vt = 0; hero.a.v = 0; hero.a.play('lift'); }
    else if (f) { IT.harvesting = f; CTX.busy = 'harvest'; hero.a.h = hero.a.ht = DIR.N; hero.a.turnSnap = true; hero.a.vt = 0; hero.a.v = 0; hero.a.play('harvest'); }
  }
  // taps, oldest first, the moment he can take them
  for (let i = 0; i < IT.taps.length && heroFree() && !USE.id && !acting(); i++) { const t = IT.taps[i];
    if (t.k === 'e' && IT.locked) { startAct(IT.locked); IT.taps.splice(i--, 1); }
    else if (t.k[0] === 'q' && useQuick(+t.k[1])) IT.taps.splice(i--, 1); }
  for (let i = FALLEN.length - 1; i >= 0; i--) if (FALLEN[i].left <= 0) FALLEN.splice(i, 1);
}
// the fallen's remains (today's placeholder sprite until the bodies stay), dimming as they are harvested
export function drawFallen(g) { for (const f of FALLEN) if (f.t > 2.6) sprite(g, REMAINS, f.x, 0, f.z, .35 + .65 * f.left / f.exp); }
