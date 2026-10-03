import { COIN, LOAD, CHANGE_UP } from '../packs/edo/economy.js';

// ---- Coin: worth, weight and paying out of a purse { mon, silver, ryo } (actor.money, a kura, a money-changer's book) ----
export const purse = (mon = 0, silver = 0, ryo = 0) => ({ mon, silver, ryo });
export const worth = m => m ? (m.mon || 0) + (m.silver || 0) * COIN.silver.worth + (m.ryo || 0) * COIN.ryo.worth : 0;
// kg of coin: what carrying a fortune costs
export const weightOf = m => m ? ((m.mon || 0) * COIN.mon.grams + (m.silver || 0) * COIN.silver.grams + (m.ryo || 0) * COIN.ryo.grams) / 1000 : 0;
// what carrying this purse does to him: { kg, name, speed, dodge, theft } (LOAD tiers)
export function burden(m) { const kg = weightOf(m); return { kg, ...LOAD.find(t => kg <= t.upto) }; }

// take up to `amt` mon of worth out of a purse: copper first, then silver, then gold, change given back in copper. Returns what was paid.
export function pay(m, amt) {
  if (amt <= 0) return 0;
  if (m.mon >= amt) { m.mon -= amt; return amt; }
  let need = amt - m.mon; m.mon = 0;
  const s = m.silver || 0, ss = Math.min(s, Math.ceil(need / COIN.silver.worth));
  if (ss > 0) { m.silver = s - ss; m.mon += ss * COIN.silver.worth - Math.min(need, ss * COIN.silver.worth); need -= Math.min(need, ss * COIN.silver.worth); }
  const r = m.ryo || 0, rr = Math.min(r, Math.ceil(need / COIN.ryo.worth));
  if (rr > 0) { m.ryo = r - rr; m.mon += rr * COIN.ryo.worth - Math.min(need, rr * COIN.ryo.worth); need -= Math.min(need, rr * COIN.ryo.worth); }
  return amt - need;
}
// NPCs change a heavy load of copper up into gold (a whole ryō at a time), keeping CHANGE_UP / 3 in hand
export function changeUp(m) { if (m.mon > CHANGE_UP) { const n = Math.floor((m.mon - CHANGE_UP / 3) / COIN.ryo.worth); m.ryo = (m.ryo || 0) + n; m.mon -= n * COIN.ryo.worth; } }
// split a worth in mon into coins, as few and as light as possible (for handing out)
export function coins(v) { const ryo = Math.floor(v / COIN.ryo.worth), r = v - ryo * COIN.ryo.worth, silver = Math.floor(r / COIN.silver.worth); return purse(r - silver * COIN.silver.worth, silver, ryo); }
export const addTo = (m, add) => { m.mon = (m.mon || 0) + (add.mon || 0); m.silver = (m.silver || 0) + (add.silver || 0); m.ryo = (m.ryo || 0) + (add.ryo || 0); return m; };
// take exact coins out of a purse (for moving coin between purse, kura and bank). false when the purse lacks them
export function takeCoins(m, c) {
  for (const k of ['mon', 'silver', 'ryo']) if ((m[k] || 0) < (c[k] || 0)) return false;
  for (const k of ['mon', 'silver', 'ryo']) m[k] = (m[k] || 0) - (c[k] || 0);
  return true;
}
export const fmt = v => v >= 1000 ? `${(v / 1000).toFixed(v >= 10000 ? 0 : 1)} ryō` : `${Math.round(v)} mon`;
