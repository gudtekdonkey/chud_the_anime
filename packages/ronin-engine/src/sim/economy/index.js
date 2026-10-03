import { system, emit } from '../ledger.js';
import { GOODS, GOOD } from '../packs/edo/economy.js';
import { initEconomy, index, moneySupply } from './setup.js';
import { economyDay } from './day.js';
import { economySeason } from './season.js';
import { economyTrade } from './trade.js';
import { landSeason } from './land.js';

// ---- The economy lane (docs/sim-economy.md): money with weight, land in koku and taxes up the ladder, a market per region,
// caravans on the roads, every purse earning and spending by job and class. All of it lives in L.sys.economy and runs by the day,
// so a long absence is lived exactly as if he had stayed ----
export * from '../packs/edo/economy.js';
export { worth, weightOf, burden, pay, coins, purse, fmt } from './money.js';
export { plotKoku, zoneLord, moneySupply, index as economyIndex } from './setup.js';
export { daysToHarvest } from './day.js';
export { caravanZone } from './trade.js';
export * from './vault.js';
export { plotPrice, buyPlot } from './land.js';

export const ECONOMY = system({
  id: 'economy', order: 40,
  init: L => initEconomy(L),
  onDay: (L, cal, r) => { economyDay(L, cal); economyTrade(L, cal, r); },
  onSeason: (L, cal, r) => { economySeason(L, cal, r); landSeason(L); },
  onYear: (L, cal) => yearEnd(L, cal),
});

// the year's books: money in and out, and where it all sits (kept 20 years; the test and the prototype read them)
function yearEnd(L, cal) {
  const E = L.sys.economy, m = moneySupply(L);
  const y = { year: cal.year - 1, total: Math.round(m.total), purses: Math.round(m.purses), guild: Math.round(m.guild), temple: Math.round(m.temple), buried: Math.round(m.buried),
    ...Object.fromEntries(Object.entries(E.flow).map(([k, v]) => [k, Math.round(v)])), caravans: E.stats.year || null,
    rice: Math.round(E.regions.reduce((s, R) => s + R.price[0], 0) / E.regions.length) };
  E.years.push(y); if (E.years.length > 20) E.years.shift();
  for (const k in E.flow) E.flow[k] = 0;
  E.stats.year = { sent: 0, arrived: 0, robbed: 0, value: 0 };
  emit(L, 'econ.year', { year: y.year, total: y.total, mint: y.mint, sinks: y.temple + y.buried });
}

// ---- war and shocks, for the story lane: a region at war arms and feeds its men (weapons, horses, rice dear) ----
export function war(L, region, days) { const R = L.sys.economy.regions[region]; R.war = Math.max(R.war, L.hour + days * 24); emit(L, 'econ.war', { region, zone: L.regions[region].seat, until: R.war }); }
export const atWar = (L, region) => L.sys.economy.regions[region].war > L.hour;

// ---- coloured clothing is rank (owner 2026-09-26): what a garment costs in a region, from the price of coloured silk ----
export const GARMENTS = { kimono: { silk: 4, work: 3000 }, haori: { silk: 2, work: 1500 }, obi: { silk: 1, work: 600 } };
export const garmentPrice = (L, region, kind = 'kimono') => { const d = GARMENTS[kind]; return Math.round(d.silk * L.sys.economy.regions[region].price[GOODS.indexOf('silk')] + d.work); };

// ---- read-outs for pages and tests ----
export function wealthByClass(L) {
  const out = {};
  for (const id in L.actors) { const a = L.actors[id]; if (!a.alive || !a.money) continue; const o = out[a.cls] || (out[a.cls] = { n: 0, sum: 0, list: [] });
    const v = a.money.mon + (a.money.silver || 0) * 16 + (a.money.ryo || 0) * 1000; o.n++; o.sum += v; o.list.push(v); }
  for (const k in out) { const o = out[k]; o.list.sort((a, b) => a - b); o.mean = o.sum / o.n; o.median = o.list[o.list.length >> 1]; o.broke = o.list.filter(v => v < 10).length / o.n; delete o.list; }
  return out;
}
export const regionMarket = (L, region) => { const R = L.sys.economy.regions[region];
  return GOODS.map((g, i) => ({ good: g, unit: GOOD[g].unit, price: R.price[i], base: GOOD[g].base, stock: R.stock[i], days: R.dem[i] > 0 ? R.stock[i] / R.dem[i] : Infinity, made: R.made[i], sold: R.sold[i] })); };
export const lordOf = (L, id) => L.sys.economy.lords[id] || null;
