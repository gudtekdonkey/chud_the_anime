import { P, INV } from '../state.js';
import { threatNear } from './actions.js';
import { pw } from './power.js';
import { FLOW_KEYS, breakChain } from './combo.js';

// ---- Cooldowns: every active has one, keyed by its input name; the skill bar draws them ----
// seconds. I's slot takes the tap's 2 s, or Thousand Cuts' 8 s when the hold is released. tele only keys K's slot: the blink runs on charges
export const CD = { tele: 3, double: 2, tc: 8, moon: 10, rift: 12, mirror: 14, sweep: 8, slide: 1 };
export const FLASH_RESET = .2;  // an assassination makes K ready again this soon
// K's plain blink runs on charges, not a cooldown (owner 2026-09-26): one per power tier; all of them come back after a minute without blinking
export const BLINK_REFILL = 60;
export const blinkMax = () => INV.power;
export const ready = k => !(P.cd[k] > 0);
// K: with no enemy near he can spam it (design notes), so it only goes on cooldown in a fight
// casting a skill breaks the Flow count; with Flow earned, a skill still cooling down casts anyway and spends it
export function startCd(k, t = CD[k]) {
  if (FLOW_KEYS.has(k)) { breakChain(); if (P.cd[k] > 0 && P.flow > 0) { P.flow = 0; P.flowUsed = .3; P.cdPop[k] = .25; } }
  t *= pw('cd'); P.cd[k] = t; P.cdMax[k] = t; }   // power shortens every cooldown (up to 20% at III)
// the plain blink: free with no enemy near (design notes: he can spam it), otherwise it takes a charge, or Flow when none is left
export const canBlink = () => !threatNear() || P.blinks > 0 || P.flow > 0;
export function spendBlink() {
  breakChain(); if (!threatNear()) return;
  if (P.blinks > 0) P.blinks--; else { P.flow = 0; P.flowUsed = .3; P.cdPop.tele = .25; }
  P.blinkT = BLINK_REFILL; if (!P.blinks) P.cd.tele = P.cdMax.tele = BLINK_REFILL;   // out of charges: the K slot counts down the refill
}
// call this when a K assassination kills: the flash is recastable after 0.2 s. Executions never spend a charge
export function onAssassination() { P.kLock = FLASH_RESET; if (P.blinks > 0) P.cd.tele = P.cdMax.tele = FLASH_RESET; }
// a key pressed while its skill is cooling down does nothing, and its slot blinks. K's own cooldown is only the flash reset;
// an empty blink is refused where it would blink (player/update.js), so executions still go with no charges left
export function gate(inp) {
  for (const k in CD) if (inp[k] && (k === 'tele' ? P.kLock > 0 : !ready(k)) && !(P.flow > 0 && FLOW_KEYS.has(k))) { inp[k] = false; P.cdDeny[k] = .2; } }
export function updateCds(dt) {
  P.kLock = Math.max(0, (P.kLock || 0) - dt);
  if (P.blinkT > 0 && (P.blinkT -= dt) <= 0) { P.blinkT = 0; P.cd.tele = 0; if (P.blinks < blinkMax()) P.cdPop.tele = .25; }
  const n = blinkMax(); if (!(P.blinkT > 0)) P.blinks = n;   // rested: full
  else if (n !== P.blinkCap) P.blinks = Math.max(0, Math.min(n, P.blinks + n - (P.blinkCap || n)));   // a tier gained brings its charge, a lost one takes it
  P.blinkCap = n; if (P.blinks > 0 && P.cd.tele > FLASH_RESET) P.cd.tele = 0;
  for (const k in P.cd) if (P.cd[k] > 0 && (P.cd[k] -= dt) <= 0) { P.cd[k] = 0; P.cdPop[k] = .25; }   // ready again: the slot glints
  for (const o of [P.cdPop, P.cdDeny]) for (const k in o) o[k] = Math.max(0, o[k] - dt);
  P.flowUsed = Math.max(0, P.flowUsed - dt);
}
