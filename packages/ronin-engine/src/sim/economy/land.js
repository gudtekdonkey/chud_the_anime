import { emit, zoneAt } from '../ledger.js';
import { GOOD, TAX, TAX_KIND, RESERVE, LAND_SALE } from './tune.js';
import { index, plotKoku } from './setup.js';
import { worth, pay } from './money.js';
import { freePlot, grantPlot } from '../people/settle.js';   // the people lane's free plots and the title's move (not its index: no system)

// ---- Land for sale (docs/sim-economy.md, "Land for sale"): the people lane marks who wants land (actor.ambition.kind === 'land'); each
// season every town and village with a free plot sells it to the richest who want one there and can pay. The money goes to whoever holds
// the title (often the region's lord: his own land is sold, never granted), else to the region's lord, else to its guild: it only moves ----
const SETTLED = new Set(['town', 'village']);
// what a plot sells for in its region now: LAND_SALE.years of what the holder keeps, at the market's rice price (held to lo..hi × base)
export function plotPrice(L, pid) {
  const [zx, zy] = pid.split(':')[0].split(',').map(Number), n = +pid.split(':')[1], z = zoneAt(L, zx, zy);
  const R = L.sys.economy.regions[z.region], kind = L.cultures[L.regions[z.region].culture].kind, tax = TAX_KIND[kind] ?? TAX.plot, base = GOOD.rice.base;
  const rice = Math.max(base * LAND_SALE.lo, Math.min(base * LAND_SALE.hi, R.price[0]));
  return Math.max(LAND_SALE.minPrice, Math.round(plotKoku(L, zx, zy, n) * (1 - tax) * rice * LAND_SALE.years));
}
// what a buyer can put up: his purse, and his house head's past the reserve his class keeps
const head = (L, a) => a.household && a.household !== a.id && L.actors[a.household]?.alive ? L.actors[a.household] : null;
const spare = (L, a) => { const h = head(L, a); return worth(a.money) + (h ? Math.max(0, worth(h.money) - (RESERVE[h.cls] ?? 150)) : 0); };
// one sale, also the door for the ronin (he buys where he stands; the page asks plotPrice first). false if it cannot be done
export function buyPlot(L, id, pid, price = plotPrice(L, pid), bidders = 1) {
  const a = L.actors[id], [zx, zy] = pid.split(':')[0].split(',').map(Number), z = zoneAt(L, zx, zy);
  if (!a || !a.alive || spare(L, a) < price) return false;
  const rec = L.plots[pid], live = x => x != null && L.actors[x]?.alive ? x : null, seller = live(rec && rec.title) ?? live(L.regions[z.region].lord);
  let paid = pay(a.money, Math.min(price, worth(a.money))); const h = head(L, a); if (paid < price && h) paid += pay(h.money, price - paid);
  if (seller != null) L.actors[seller].money.mon += paid; else L.sys.economy.regions[z.region].guild += paid;
  grantPlot(L, pid, a); if (a.ambition && a.ambition.kind === 'land') a.ambition = null;
  const S = L.sys.economy.stats, s = S.land || (S.land = { sold: 0, mon: 0 }); s.sold++; s.mon += Math.round(paid);
  emit(L, 'econ.landSold', { plot: pid, actor: id, from: seller, price: Math.round(paid), zone: [zx, zy], region: z.region, bidders });
  return paid;
}
// each season: the land-wanters by home zone (from the household index), then each zone's free plots to the richest of them
export function landSeason(L) {
  if (!L.sys.people) return;   // the want is the people lane's (ambition); without it nobody asks
  const ix = index(L), want = new Map();
  for (const h of ix.hh) for (const a of h.m) if (a.alive && a.ambition && a.ambition.kind === 'land' && a.id !== L.player && a.home) {
    const zi = a.home[1] * L.size.w + a.home[0], list = want.get(zi); if (list) list.push(a); else want.set(zi, [a]); }   // where he lives now
  for (const [zi, list] of want) {
    const z = L.zones[zi]; if (!SETTLED.has(z.kind)) continue;
    list.sort((x, y) => spare(L, y) - spare(L, x) || (x.id < y.id ? -1 : 1));
    // one plot at a time (a sold plot is no longer free, so freePlot moves on); more bidders than plots raise the price
    for (let i = 0; i < list.length; i++) {
      const pid = freePlot(L, z); if (!pid) break;
      const price = Math.round(plotPrice(L, pid) * Math.min(LAND_SALE.maxBid, 1 + LAND_SALE.bid * (list.length - i - 1)));
      if (spare(L, list[i]) < price || !buyPlot(L, list[i].id, pid, price, list.length - i)) break;   // the rest are poorer still
    }
  }
}
