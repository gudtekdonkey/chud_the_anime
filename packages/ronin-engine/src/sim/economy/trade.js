import { emit } from '../ledger.js';
import { GOODS, GOOD, CARAVAN, GUILD_CUT } from './tune.js';
import { G, JI, index, routeDanger } from './setup.js';
import { target } from './day.js';

// ---- Caravans: a region's merchants carry goods along the roads to a neighbouring seat where they sell for more.
// Each road between two seats is weighed every CARAVAN.every days, each way ----
// A caravan: { id, route (index into L.sys.economy.routes), dir (1: a to b, -1: b to a), step (zones gone), from, to, g, qty, cost, owner, guard }.
// Outlaw camps near the road rob some (econ.caravan.robbed); later the ronin can rob, escort or run his own (robCaravan, escortCaravan).
const SVC = ['innkeeper', 'carpenter', 'courier', 'healer'].map(j => JI[j]);
export const caravanZone = (L, c) => { const p = L.sys.economy.routes[c.route].path, i = Math.min(p.length - 1, c.step); return p[c.dir > 0 ? i : p.length - 1 - i]; };

export function economyTrade(L, cal, r) {
  const E = L.sys.economy, ix = index(L), danger = routeDanger(L, ix), st = E.stats.year || (E.stats.year = { sent: 0, arrived: 0, robbed: 0, value: 0 });
  // on the road: a day's march, the risk of camps nearby, arrival
  for (let i = E.caravans.length - 1; i >= 0; i--) {
    const c = E.caravans[i], path = E.routes[c.route].path;
    c.step = Math.min(path.length - 1, c.step + CARAVAN.speed);
    const dg = danger[c.route], camp = dg[c.dir > 0 ? c.step : dg.length - 1 - c.step];
    if (camp >= 0 && r.chance(CARAVAN.rob * (c.guard ? CARAVAN.guarded : 1))) { rob(L, c, camp, null); E.caravans.splice(i, 1); st.robbed++; continue; }
    if (c.step >= path.length - 1) { arrive(E, c); E.caravans.splice(i, 1); st.arrived++; }
  }
  // setting out: from each seat, now and then, the good that sells best down the road
  const active = new Array(E.regions.length).fill(0); for (const c of E.caravans) active[c.from]++;
  for (let ri = cal.day % CARAVAN.every; ri < E.routes.length; ri += CARAVAN.every) { const rt = E.routes[ri]; for (const dir of [1, -1]) {
    const from = dir > 0 ? rt.a : rt.b, to = dir > 0 ? rt.b : rt.a, A = E.regions[from], B = E.regions[to];
    if (active[from] >= CARAVAN.max) continue;
    const haul = 1 + CARAVAN.perZone * rt.path.length; let best = -1, gain = CARAVAN.minGain;
    for (let g = 0; g < G; g++) { if (A.stock[g] < target(A, g) * .8 || B.stock[g] > target(B, g) * 1.5) continue;
      const x = B.price[g] * (1 - GUILD_CUT) / (A.price[g] * haul) - 1; if (x > gain) { gain = x; best = g; } }
    if (best < 0) continue;
    const qty = Math.min(CARAVAN.value / A.price[best], A.stock[best] - target(A, best) * .5); if (qty <= 0) continue;
    A.stock[best] -= qty;
    const fee = qty * A.price[best] * (haul - 1), svc = SVC.some(j => ix.jobs[from][j] > 0);   // porters, pack horses, inns
    if (svc && A.guild > fee) { A.guild -= fee; A.pool.service += fee; }
    const ms = ix.merchants[from], guard = ix.jobs[from][JI.ronin] > 0 && r.chance(.5);
    E.caravans.push({ id: 'cv' + (E.nextCaravan = (E.nextCaravan || 0) + 1), route: ri, dir, step: 0, from, to, g: GOODS[best], qty: +qty.toFixed(3), cost: Math.round(qty * A.price[best]),
      owner: ms.length ? r.pick(ms) : null, guard });
    active[from]++; st.sent++; st.value += Math.round(qty * A.price[best]);
  } }
}
// the destination's guild buys the load at its own price; the money goes home to the guild that sent it, which owes it to the makers
function arrive(E, c) {
  const A = E.regions[c.from], B = E.regions[c.to], g = GOODS.indexOf(c.g), v = Math.min(c.qty * B.price[g] * (1 - GUILD_CUT), Math.max(0, B.guild));
  B.stock[g] += c.qty; B.imp[g] += c.qty; B.guild -= v; A.guild += v; A.exp[g] += v * (1 - GUILD_CUT);   // home, most of it is owed to the makers
}
// robbed: the goods go to the camp, whose chief sells them to his region's guild at half price. by: the actor who robbed it (null: the camp)
export function rob(L, c, campZi, by) {
  const E = L.sys.economy, w = L.size.w, z = L.zones[campZi != null ? campZi : caravanZone(L, c)], R = E.regions[z.region], g = GOODS.indexOf(c.g);
  const chief = by || z.holder || null, a = chief && L.actors[chief], v = a ? Math.min(c.qty * R.price[g] * .5, Math.max(0, R.guild)) : 0;
  R.stock[g] += c.qty; if (a) { R.guild -= v; a.money.mon += v; }
  const at = caravanZone(L, c);
  emit(L, 'econ.caravan.robbed', { caravan: c.id, zone: [at % w, Math.floor(at / w)], region: L.zones[at].region, from: c.from, to: c.to, good: c.g, qty: c.qty, value: c.cost, by: chief, owner: c.owner });
  return v;
}
