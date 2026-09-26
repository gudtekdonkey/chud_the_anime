import { S, INV } from '../state.js';

// ---- Writing to the inventory: every gain flashes its piece of the HUD ----
export const has = id => INV.charms.includes(id);
export function heal(v) { INV.hp = Math.min(1, INV.hp + v); }
export function addMon(n = 1) { INV.mon = Math.min(9999, INV.mon + n); INV.fx.mon = .08; }
export function addShards(n = 1) { INV.shards = Math.min(99, INV.shards + n); INV.fx.shards = .08; }
// a consumable joins its own stack, else the first empty quick slot; false when there is no room
export function addQuick(id, n = 1) {
  let i = INV.quick.findIndex(q => q && q.id === id);
  if (i < 0) { i = INV.quick.indexOf(null); if (i < 0) return false; INV.quick[i] = { id, n: 0 }; }
  INV.quick[i].n += n; INV.fx.quick[i] = .14; return true;
}
addQuick.room = id => INV.quick.some(q => q && q.id === id) || INV.quick.includes(null);
export function takeQuick(i) { const q = INV.quick[i]; if (!q) return null; if (--q.n <= 0) INV.quick[i] = null; INV.fx.quick[i] = .14; return q.id; }
export const freeCharm = () => INV.charms.indexOf(null);
export function addCharm(id, i = freeCharm()) { if (i < 0) return false; INV.charms[i] = id; INV.fx.charms[i] = .14; return true; }
export function showBanner(small, big, dur = 1.7) { S.banner = { small, big, t: 0, dur }; }
// EXP from Harvest: 100 per level times the level, a banner on each level-up
export const expNeed = lv => 100 * lv;
export function addExp(n) { INV.exp += n; while (INV.exp >= expNeed(INV.lv)) { INV.exp -= expNeed(INV.lv); INV.lv++; showBanner('LEVEL UP', 'LV ' + INV.lv); } }
export function tickInv(dt) {
  const f = INV.fx; for (const k of ['qi', 'mon', 'shards', 'weapon', 'hp']) f[k] = Math.max(0, f[k] - dt);
  for (const L of [f.quick, f.charms]) for (let i = 0; i < L.length; i++) L[i] = Math.max(0, L[i] - dt);
  INV.edge = Math.max(0, INV.edge - dt);
  if (S.banner && (S.banner.t += dt) > S.banner.dur) S.banner = null;
}
