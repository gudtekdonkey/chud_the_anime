import { emit, zoneAt } from '../ledger.js';
import { PLOTS, plotId } from '../zone.js';
import { TIME } from '../time.js';
import { GOOD, TAX, TAX_KIND, TENANT_SHARE, PLOTS_PER_FARMER, HARVEST, BANK, HISTORY } from '../packs/edo/economy.js';
import { index, plotKoku, zoneLord, rankLords, JOB_LIST } from './setup.js';
import { JOBS } from '../packs/edo/economy.js';
const FARM_JOB = JOB_LIST.map(j => JOBS[j].kind === 'farm');
const hands = h => h.jj.reduce((s, j, k) => s + (j >= 0 && FARM_JOB[j] && h.m[k].alive ? 1 : 0), 0);   // a household's farmers
import { worth, pay } from './money.js';

// ---- Seasons: the harvest (autumn), taxes up the ladder, lords ranked by koku; and each season's upkeep ----
const r2 = v => Math.round(v * 100) / 100, r3 = v => Math.round(v * 1000) / 1000;   // tidy numbers keep the save small
export function economySeason(L, cal, r) {
  const E = L.sys.economy;
  if (cal.seasonIndex === HARVEST.season) harvest(L, r);
  upkeep(L, cal);
  E.hist.push({ h: L.hour, price: E.regions.map(R => R.price.map(v => Math.round(v))) });
  if (E.hist.length > HISTORY) E.hist.splice(0, E.hist.length - HISTORY);
}

// the year's weather for each region, then every settled zone's plots: worked by their farmers, taxed up to the lords
function harvest(L, r) {
  const E = L.sys.economy, ix = index(L), w = L.size.w;
  for (const R of E.regions) {
    const roll = r.next();
    R.q = roll < HARVEST.drought ? r.range(...HARVEST.droughtQ) : roll > 1 - HARVEST.bumper ? r.range(...HARVEST.bumperQ) : r.range(HARVEST.low, HARVEST.high);
    R.q = +R.q.toFixed(2); R.crop = 0; R.tax = 0;
    if (R.q < HARVEST.low) emit(L, 'econ.drought', { region: R.id, zone: L.regions[R.id].seat, q: R.q });
  }
  for (const id in E.lords) { E.lords[id].taxIn = 0; E.lords[id].taxOut = 0; }
  const toLord = (id, k, region) => { if (!id) return; const l = E.lords[id] || (E.lords[id] = { region, koku: 0, granary: 0, taxIn: 0, taxOut: 0, paid: 1 }); l.granary += k; l.taxIn += k; };
  const farmsOf = new Map(); for (const h of ix.hh) if (h.farm) { const a = farmsOf.get(h.zi) || []; a.push(h); farmsOf.set(h.zi, a); }
  for (const z of L.zones) {
    if (z.kind !== 'town' && z.kind !== 'village') continue;
    const kind = L.cultures[L.regions[z.region].culture].kind, rate = TAX_KIND[kind] ?? TAX.plot;
    const zi = z.y * w + z.x, R = E.regions[z.region], lord = zoneLord(L, z), regLord = L.regions[z.region].lord, farms = farmsOf.get(zi) || [];
    const def = { title: L.regions[z.region].lord ?? null, holder: L.regions[z.region].lord ?? null };   // ownerOf's default for a settled zone
    const plots = []; for (let n = 0; n < PLOTS * PLOTS; n++) { const o = L.plots[plotId(z.x, z.y, n)] || def; if (o.holder) plots.push({ n, o, k: plotKoku(L, z.x, z.y, n) }); }
    // the households work their own plots first, then the lord's and absent holders' as tenants, best land first
    const houseOf = p => farms.find(h => h.m.some(a => a.id === p.o.holder));
    for (const p of plots) p.house = houseOf(p);
    plots.sort((a, b) => ((a.house ? 0 : 1) - (b.house ? 0 : 1)) || b.k - a.k);
    let labour = (ix.farmers.get(zi) || 0) * PLOTS_PER_FARMER, tenants = 0, zt = 0;
    for (const p of plots) {
      const work = Math.min(1, labour); if (work <= 0) break; labour -= work;
      const y = p.k * work * R.q; R.crop += y;
      const house = p.house;
      if (house) {                                     // a household's own plot: tax to the zone lord; what its own farmers worked is its own,
        const t = p.o.holder === lord ? 0 : y * rate; toLord(lord, t, z.region); R.tax += t; zt += t;
        const own = Math.min(work, house.cap ?? (house.cap = hands(house) * PLOTS_PER_FARMER)); house.cap -= own;
        const keep = (y - t) * (1 - own / work) * TENANT_SHARE; tenants += keep;   // the rest was worked by tenants, who keep their share
        E.pantry[house.key] = (E.pantry[house.key] || 0) + y - t - keep;
      } else {                                         // the lord's own or an absent holder's plot, worked by tenants
        const keep = y * TENANT_SHARE; tenants += keep;
        const t = p.o.holder === lord ? 0 : (y - keep) * rate; toLord(lord, t, z.region); R.tax += t; zt += t;
        toLord(p.o.holder, y - keep - t, z.region); if (E.lords[p.o.holder]) E.lords[p.o.holder].taxIn -= y - keep - t;
      }
    }
    // tenants' share, to the households whose farmers worked the land, by how many farmers each has
    for (const h of farms) delete h.cap;
    if (tenants > 0 && farms.length) {
      let tot = 0; for (const h of farms) tot += hands(h);
      for (const h of farms) { const w = tot ? hands(h) / tot : 1 / farms.length; if (w) E.pantry[h.key] = (E.pantry[h.key] || 0) + tenants * w; } }
    // a zone lord under the region lord sends him his share
    if (lord && regLord && lord !== regLord && E.lords[lord]) { const l = E.lords[lord], t = zt * TAX.zone; l.granary -= t; l.taxOut += t; toLord(regLord, t, z.region); }
  }
  rankLords(L);
  for (const R of E.regions) { R.crop = +R.crop.toFixed(1); R.tax = +R.tax.toFixed(1);
    const lord = L.regions[R.id].lord; emit(L, 'econ.harvest', { region: R.id, zone: L.regions[R.id].seat, koku: R.crop, tax: R.tax, lord: lord ?? null, q: R.q }); }
  for (const k in E.pantry) E.pantry[k] = r3(E.pantry[k]);
  for (const id in E.lords) { const l = E.lords[id]; l.granary = r2(l.granary); l.taxIn = r2(l.taxIn); l.taxOut = r2(l.taxOut); }
}

// each season: money-changers take their keep, stale pantries dropped, the books tidied (the hoard sink runs in each region's step)
function upkeep(L, cal) {
  const E = L.sys.economy, ix = index(L);
  if (cal.seasonIndex === 0) { const keys = new Set(ix.hh.map(h => h.key)); for (const k in E.pantry) if (!keys.has(k) && k !== L.player) delete E.pantry[k]; }
  // stored rice rots in granaries and pantries as it does in the market
  const rot = Math.pow(1 - GOOD.rice.rot, TIME.DAYS_PER_SEASON);
  for (const k in E.pantry) E.pantry[k] *= rot;
  for (const id in E.lords) E.lords[id].granary *= rot;
  for (const t in E.banks) { const [x, y] = t.split(',').map(Number), z = zoneAt(L, x, y), R = E.regions[z.region];
    for (const id in E.banks[t]) { const b = E.banks[t][id], fee = pay(b, worth(b) * BANK.perSeason); R.guild += fee; E.flow.fees += fee; } }
  for (const R of E.regions) { R.guild = Math.round(R.guild); R.temple = Math.round(R.temple * 100) / 100; R.pool.service = Math.round(R.pool.service * 100) / 100;
    R.pool.guild = Math.round(R.pool.guild * 100) / 100; R.buried = Math.round(R.buried);
    for (let g = 0; g < R.stock.length; g++) { R.stock[g] = r3(R.stock[g]); R.price[g] = Math.round(R.price[g] * 10) / 10; R.dem[g] = Math.round(R.dem[g] * 1e4) / 1e4; R.fill[g] = r3(R.fill[g]);
      R.made[g] = Math.round(R.made[g] * 1e4) / 1e4; R.sold[g] = Math.round(R.sold[g] * 1e4) / 1e4; R.owe[g] = r2(R.owe[g]); } }
}
