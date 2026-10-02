// ---- The slice's inventory: today's INV and S (src/state.js) and their writers (src/items/inventory.js), imported as
// they are, so the HUD pieces, the party kit and the numbers read one state. Qi lives on today's P.qi (0..1) and the
// storm on P.storm, as the HUD reads them. What only the slice needs: Qi from hits and from items, the hero's hurt.
import '../hud/canvas.js';
import { P, S, INV } from '../../state.js';
import { showBanner, tickInv } from '../../items/inventory.js';
export { P, S, INV };
export { has, heal, addMon, addShards, addQuick, takeQuick, addCharm, freeCharm, showBanner, addExp, expNeed, canOffer, offer } from '../../items/inventory.js';

export const QI_HIT = .06, STORM_T = 8;   // a landed cut's Qi (today's QI_GAIN), the storm's seconds
// Qi from a landed hit (the whetstone doubles it); a full meter wakes Storm Chain on the next landed hit (today's rule)
export function qiAdd(v) { if (P.qi >= 1 && !(P.storm > 0)) { P.storm = STORM_T; showBanner('STORM CHAIN', 'STORM'); }
  P.qi = Math.min(1, P.qi + v * (INV.edge > 0 ? 2 : 1)); INV.fx.qi = .08; }
// Qi from items and shrines fills the meter but never wakes the storm (owner)
export function qiFill(v) { P.qi = Math.max(0, Math.min(1, P.qi + v)); INV.fx.qi = .08; }
// damage to him, 0..1 of his health. HURT_HOOKS take the blow first (a companion's Iron Oath) by returning true
export const HURT_HOOKS = [];
export function hurt(n) { if (HURT_HOOKS.some(fn => fn(n))) return 0; INV.hp = Math.max(0, INV.hp - n); INV.fx.hp = .06; return n; }
// once a game step: the HUD's flashes and banners count down, the storm drains its meter
export function tickMeters(dt) { tickInv(dt);
  if (P.storm > 0) { P.storm = Math.max(0, P.storm - dt); P.qi = Math.max(0, P.qi - dt / STORM_T); }
  P.qiPop = Math.max(0, (P.qiPop || 0) - dt); }
P.qi = 0; P.storm = 0;
