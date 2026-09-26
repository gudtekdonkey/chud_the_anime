import { P, INV } from '../state.js';
import { crescent } from '../fx/slash.js';
import { after } from '../fx/util.js';
import { held } from '../input.js';
import { setState, moveBy } from '../player/actions.js';
import { hit } from '../player/hits.js';
import { brackets, prompt } from '../ui/hud-kit.js';
import { BIG, actBig, tickBig, drawBig, lockedItem, setLocked, usable, verbOf } from './big.js';
import { PICKUPS, updatePickups, drawPickup, drawFlying } from './pickups.js';
import { USE, useQuick, updateQuickFx, quickDrawables, drawQuickOver } from './quick.js';
import { startHarvest, harvest, fallenDrawables, tickHarvest } from './harvest.js';
import { has, tickInv } from './inventory.js';
import { updateItemFx, drawItemFx } from './item-fx.js';

// ---- Items in the room: the lock-on, E (tap = the item's verb, hold = Harvest), quick slots 1-4, and the item states ----
const LOCK_RANGE = 42, HOLD_T = .2;   // px (y counts 1.6x); a press held this long is a hold
const BIG_STATES = new Set(BIG.map(it => it.state));
export const ITEM_STATES = new Set([...BIG_STATES, ...Object.keys(USE), 'harvest']);
let lockT = 0, clock = 0;
function lockOn(free, dt) {
  let best = null, bd = LOCK_RANGE;
  if (free) for (const it of BIG) { const d = Math.hypot(it.x - P.x, (it.y - P.y) * 1.6); if (usable(it) && d < bd) { bd = d; best = it; } }
  if (best !== lockedItem()) lockT = 0; else lockT += dt;
  if (best || !P.item) setLocked(best);
}
function interact(it) {
  P.face = Math.sign(it.x - P.x) || P.face; const walk = [it.x - P.face * it.gap, it.y];
  setState(it.state); P.item = it; P.walkTo = walk; it.pressT = 0; it.offering = it.used;
}
// E and 1-4; true when it started something this step
export function itemInput(inp, free, dt) {
  if (inp.act) { P.ePress = true; P.eDown = 0; }
  if (P.ePress) {
    if (held.has('act')) { if ((P.eDown += dt) >= HOLD_T) { P.ePress = false; if (free && startHarvest()) return true; } }
    else { P.ePress = false; const it = lockedItem(); if (free && it) { interact(it); return true; } }
  }
  if (free) for (let i = 0; i < 4; i++) if (inp.quick[i] && INV.quick[i] && useQuick(i)) return true;
  return false;
}
export function updateItems(dt, free) {
  clock += dt;
  tickInv(dt); updateItemFx(dt); updatePickups(dt); updateQuickFx(dt); tickBig(dt); tickHarvest(dt);
  if (P.state !== 'bomb') P.hidden = false;
  if (!BIG_STATES.has(P.state)) { P.item = null; P.walkTo = null; }
  for (const it of BIG) if (it.pressT != null) it.pressT += dt;
  lockOn(free, dt);
}
// one step of an item state; false when the state is not an item's
export function itemState(s, T, D, dt, moving) {
  if (!ITEM_STATES.has(s)) return false;
  if (s === 'harvest') { harvest(dt, held.has('act')); return true; }
  if (P.walkTo && T < .12) { const [tx, ty] = P.walkTo, k = Math.min(1, dt / Math.max(dt, .12 - T)); moveBy((tx - P.x) * k, (ty - P.y) * k); }
  if (BIG_STATES.has(s)) { actBig(P.item, T, dt); if (T >= D) { P.armed = false; setState('idle'); } return true; }
  if (!USE[s](T, dt, moving) && T >= D) setState('idle');
  return true;
}
// Cracked Mirror: the glitch teleport leaves an afterimage where he was, and it cuts once
export function mirrorCut(x, y) {
  if (!has('mirror')) return;
  P.ghosts.push({ state: 'double', f: 6, x, y, face: P.face, age: 0, hold: .14, white: 0 });
  after(.1, () => { crescent(x + P.face * 10, y - 12, P.face, .15, 1, 16, 5, .05); hit('mr', x + P.face * 14, y - 12, 22); });
}
// depth-sorted with the world
export const itemDrawables = () => [...BIG.map(it => ({ y: it.y, d: () => drawBig(it, clock) })),
  ...PICKUPS.filter(it => !it.pull && !it.got).map(it => ({ y: it.y, d: () => drawPickup(it, clock) })), ...fallenDrawables(), ...quickDrawables()];
// over the world: things in flight, pops, the lock-on and its prompt
export function drawItemsOver() {
  drawQuickOver(); drawFlying(clock); drawItemFx();
  const it = lockedItem(); if (!it) return;
  const gone = P.item === it ? it.pressT : -1;
  brackets(it.box, lockT, gone);
  if (gone < .05) prompt(it.x, it.box.y0 - 13, verbOf(it), lockT - .1, gone >= 0 || P.ePress);
}
