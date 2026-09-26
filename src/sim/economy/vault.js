import { emit, zoneAt } from '../ledger.js';
import { ownerOf } from '../zone.js';
import { GOODS, GUILD_CUT, BANK, COIN, MAX_CARRY_KG } from './tune.js';
import { worth, pay, weightOf, takeCoins, addTo, purse, coins } from './money.js';
import { caravanZone, rob } from './trade.js';

// ---- What the ronin (or anyone) does with money: carry it, buy and sell, change it, keep it in a kura or with a money-changer ----
// Every call moves coin between purses, guilds and vaults; only give(…, 'loot') and offer() make or unmake money (counted in flow).
const E_ = L => L.sys.economy;
const regionOfZone = (L, x, y) => { const z = zoneAt(L, x, y); return z ? z.region : -1; };
export const priceOf = (L, region, good) => E_(L).regions[region].price[GOODS.indexOf(good)];

// coin from outside the ledger (enemies in a zone that are not ledger people, a chest): a money source
export function give(L, id, c, how = 'loot') {
  const a = L.actors[id], add = typeof c === 'number' ? purse(c) : c, room = MAX_CARRY_KG - weightOf(a.money);
  if (weightOf(add) > room) return false;                        // he cannot carry it
  addTo(a.money, add); const v = worth(add); E_(L).flow[how === 'loot' ? 'loot' : 'other'] += v; return true;
}
// buy from the market of the region he is in; false if he cannot pay or the stock is short
export function buy(L, id, region, good, qty) {
  const R = E_(L).regions[region], g = GOODS.indexOf(good), a = L.actors[id], cost = qty * R.price[g];
  if (R.stock[g] < qty || worth(a.money) < cost) return false;
  pay(a.money, cost); R.guild += cost; R.stock[g] -= qty; return cost;
}
// sell to the guild at its price less its cut (it pays what cash it has)
export function sell(L, id, region, good, qty) {
  const R = E_(L).regions[region], g = GOODS.indexOf(good), v = Math.min(qty * R.price[g] * (1 - GUILD_CUT), Math.max(0, R.guild));
  R.guild -= v; R.stock[g] += qty; L.actors[id].money.mon += v; return v;
}
// between two people: wages, bribes, blood money, a debt paid
export function transfer(L, from, to, v, why = 'transfer') { const got = pay(L.actors[from].money, v); L.actors[to].money.mon += got; if (got >= 1000) emit(L, 'econ.transfer', { from, to, value: Math.round(got), why }); return got; }
// a shrine offering: part of it feeds the temple's monks, the rest leaves the world with the incense
export function offer(L, id, region, v) { const got = pay(L.actors[id].money, v); E_(L).regions[region].temple += got; return got; }

// ---- the money-changer (ryōgae) in a town: keep coin, change coin ----
const townKey = (x, y) => `${x},${y}`;
export function isChanger(L, x, y) { const z = zoneAt(L, x, y); return !!z && z.kind === 'town'; }
// deposit coins at the changer in town (x, y): he takes BANK.deposit; the rest is held (BANK.perSeason each season)
export function deposit(L, id, x, y, c) {
  if (!isChanger(L, x, y)) return false; const a = L.actors[id]; if (!takeCoins(a.money, c)) return false;
  const E = E_(L), R = E.regions[regionOfZone(L, x, y)], book = E.banks[townKey(x, y)] || (E.banks[townKey(x, y)] = {}), acct = book[id] || (book[id] = purse());
  addTo(acct, c); const fee = pay(acct, worth(c) * BANK.deposit); R.guild += fee; E.flow.fees += fee;
  emit(L, 'econ.deposit', { actor: id, zone: [x, y], value: Math.round(worth(c)) }); return worth(acct);
}
export function withdraw(L, id, x, y, c) {
  const E = E_(L), acct = E.banks[townKey(x, y)] && E.banks[townKey(x, y)][id]; if (!acct || !takeCoins(acct, c)) return false;
  if (weightOf(L.actors[id].money) + weightOf(c) > MAX_CARRY_KG) { addTo(acct, c); return false; }
  addTo(L.actors[id].money, c); emit(L, 'econ.withdraw', { actor: id, zone: [x, y], value: Math.round(worth(c)) }); return worth(acct);
}
// change coins at a changer: `from` coins in, the same worth less BANK.exchange out as `to` ('mon' | 'silver' | 'ryo'), the odd remainder in copper
export function exchange(L, id, x, y, from, n, to) {
  if (!isChanger(L, x, y)) return false; const a = L.actors[id], give_ = { [from]: n };
  const v = n * COIN[from].worth * (1 - BANK.exchange), out = Math.floor(v / COIN[to].worth); if (out <= 0 || !takeCoins(a.money, give_)) return false;
  const fee = n * COIN[from].worth * BANK.exchange, back = v - out * COIN[to].worth;   // what does not make a whole coin comes back in copper
  a.money[to] = (a.money[to] || 0) + out; a.money.mon += back;
  const E = E_(L); E.regions[regionOfZone(L, x, y)].guild += fee; E.flow.fees += fee; return out;
}
export const accounts = (L, id) => Object.entries(E_(L).banks).filter(([, b]) => b[id]).map(([t, b]) => ({ town: t.split(',').map(Number), money: b[id], worth: worth(b[id]) }));

// ---- a storehouse (kura) on a plot he holds: free and safe, until the plot is raided ----
export function stash(L, id, pid, c) {
  if (ownerOf(L, pid).holder !== id) return false; const a = L.actors[id]; if (!takeCoins(a.money, c)) return false;
  const k = E_(L).kura[pid] || (E_(L).kura[pid] = { owner: id, money: purse() }); addTo(k.money, c); return worth(k.money);
}
export function unstash(L, id, pid, c) {
  const k = E_(L).kura[pid]; if (!k || ownerOf(L, pid).holder !== id || !takeCoins(k.money, c)) return false;
  addTo(L.actors[id].money, c); return worth(k.money);
}
// a raid on the plot empties its kura into the raider's hands (the crime lane calls this when possession changes by force)
export function raidKura(L, pid, by) {
  const k = E_(L).kura[pid]; if (!k) return 0; const v = worth(k.money); addTo(L.actors[by].money, k.money); k.money = purse();
  emit(L, 'econ.kura.raided', { plot: pid, owner: k.owner, by, value: Math.round(v) }); return v;
}
// ---- caravans, for the ronin: rob one (the goods' worth in coin, half, to him) or guard it (a third of the risk, a fee on arrival later) ----
export function robCaravan(L, id, cid) { const E = E_(L), i = E.caravans.findIndex(c => c.id === cid); if (i < 0) return false;
  const v = rob(L, E.caravans[i], caravanZone(L, E.caravans[i]), id); E.caravans.splice(i, 1); return v; }
export function escortCaravan(L, id, cid) { const c = E_(L).caravans.find(q => q.id === cid); if (!c) return false; c.guard = id; return true; }
export { coins };
