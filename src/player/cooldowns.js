import { P } from '../state.js';
import { threatNear } from './actions.js';
import { pw } from './power.js';

// ---- Cooldowns: every active has one, keyed by its input name; the skill bar draws them ----
// seconds. I's slot takes the tap's 2 s, or Thousand Cuts' 8 s when the hold is released
export const CD = { tele: 3, double: 2, tc: 8, moon: 10, rift: 12, mirror: 14, sweep: 8, slide: 1 };
export const FLASH_RESET = .2;  // an assassination makes K ready again this soon
export const ready = k => !(P.cd[k] > 0);
// K: with no enemy near he can spam it (design notes), so it only goes on cooldown in a fight
// power shortens every cooldown (up to 20% at III)
export function startCd(k, t = CD[k]) { if (k === 'tele' && !threatNear()) return; t *= pw('cd'); P.cd[k] = t; P.cdMax[k] = t; }
// call this when a K assassination kills: the flash is recastable after 0.2 s
export function onAssassination() { P.cd.tele = P.cdMax.tele = FLASH_RESET; }
// a key pressed while its skill is cooling down does nothing, and its slot blinks
export function gate(inp) { for (const k in CD) if (inp[k] && !ready(k)) { inp[k] = false; P.cdDeny[k] = .2; } }
export function updateCds(dt) {
  for (const k in P.cd) if (P.cd[k] > 0 && (P.cd[k] -= dt) <= 0) { P.cd[k] = 0; P.cdPop[k] = .25; }   // ready again: the slot glints
  for (const o of [P.cdPop, P.cdDeny]) for (const k in o) o[k] = Math.max(0, o[k] - dt);
}
