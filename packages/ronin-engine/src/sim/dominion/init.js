import { zoneAt } from '../ledger.js';
import { rngFor } from '../rng.js';
import { BUILDINGS, N, TRAIT, traitSum } from '../packs/edo/dominion.js';
import { D, key, lordOf, setZone, refreshDomains, refreshProvinces, refreshRealms, fealtyChanged } from './land.js';
import { newSettlement, recount, tradeYear } from './settle.js';
import { freeLot } from './build.js';
import { newArmy, addSquad } from './army.js';
import { fillOffices, indexHomes } from './govern.js';
import { zoneYield } from './seams.js';

// ---- The world as dominion first finds it: every town, village, fort and camp a settlement with the buildings it would have, each
// region's lord holding its lordly zones (title and possession), outlaw chiefs holding their camps (possession, no title), the clans and
// the court sworn into realms under their strongest lord, a host at every seat ----
export function setupWorld(L) {
  Object.assign(L.sys.dominion, { v: 1, lords: {}, zt: {}, set: {}, bld: {}, work: [], dom: {}, prov: {}, realms: {}, armies: {}, wars: {}, vas: {}, pending: {}, active: [],
    adj: L.regions.map(() => []), regZ: Object.fromEntries(L.regions.map(g => [g.id, []])) });
  const d = D(L), r = rngFor(L.seed, 'dominion', 'init');
  for (const z of L.zones) { if (z.region < 0) continue;
    for (const [dx, dy] of [[1, 0], [0, 1]]) { const n = zoneAt(L, z.x + dx, z.y + dy); if (n && n.region >= 0 && n.region !== z.region && !d.adj[z.region].includes(n.region)) { d.adj[z.region].push(n.region); d.adj[n.region].push(z.region); } } }
  const living = {}; for (const a of Object.values(L.actors)) if (a.alive && a.home) { const k = key(...a.home); (living[k] || (living[k] = [])).push(a); }
  for (const z of L.zones) {
    if (!['town', 'village', 'fort', 'camp'].includes(z.kind)) continue;
    const reg = L.regions[z.region], k = key(z.x, z.y), seatZone = zoneAt(L, ...reg.seat);
    const lord = z.kind === 'camp' ? z.holder : reg.lord ?? (seatZone.kind === 'camp' ? seatZone.holder : null);
    const titled = z.kind !== 'camp' && reg.lord != null;
    if (lord) setZone(L, k, { title: titled ? lord : null, holder: lord }, 'world');
    else setZone(L, k, { title: null, holder: null }, 'world');
    const s = newSettlement(L, z.x, z.y, lord), here = (living[k] || []).length;
    const add = (t, n = 1) => { for (let i = 0; i < n; i++) seedBuilding(L, s, t, lord); };
    if (z.kind === 'village') {
      s.pop = here + r.int(14, 36); add('house', Math.ceil(s.pop / 6) + r.int(0, 2)); add('well');
      if (r.chance(.7)) add('shrine'); if (r.chance(.6)) add('storehouse'); add('paddy', z.biome === 'paddy' ? 2 : r.int(0, 1)); if (r.chance(.3)) add('granary');
      if (z.biome === 'coast' || z.biome === 'marsh') add('weir');
    } else if (z.kind === 'town') {
      s.pop = here + r.int(70, 170); add('house', Math.ceil(s.pop / 6) + 2); add('well', 2); add('shrine'); add('storehouse'); add('market'); add('inn'); add('smithy');
      add('granary'); add('paddy', 2); add('board');
      const kind = L.cultures[reg.culture].kind;
      if (kind === 'clan' || kind === 'court') { add('barracks'); if (r.chance(.5)) add('dojo'); }
      if (r.chance(.3)) add('magistrate'); if (r.chance(.3) || kind === 'monastic') add('temple'); if (r.chance(.5)) add('palisade');
    } else if (z.kind === 'fort') {
      s.pop = here + r.int(8, 16); add('longhouse', 2); add('well'); add('barracks'); add('palisade'); add('watchtower', 2); if (r.chance(.5)) add('dojo');
    } else {
      s.pop = here + r.int(2, 6); add('hut', r.int(3, 5)); add('palisade');
    }
    recount(L, s);
  }
  // lords: tax by temperament, a season's rice in store, their seat
  for (const reg of L.regions) {
    const sk = key(...reg.seat), holder = d.zt[sk] && d.zt[sk].holder; if (!holder) continue;
    const l = lordOf(L, holder), a = L.actors[holder]; l.seat = l.seat || sk;
    if (a.cls === 'outlaw') l.outlaw = true;
    l.tax = +Math.max(N.TAX_MIN, Math.min(N.TAX_MAX, N.TAX + traitSum(a, TRAIT.greedy) * .1 - traitSum(a, TRAIT.kind) * .08)).toFixed(2);
  }
  for (const z of L.zones) if (z.kind === 'camp' && z.holder) { const l = lordOf(L, z.holder); l.outlaw = true; l.seat = l.seat || key(z.x, z.y); }
  for (const l of Object.values(d.lords)) { l.koku = l.zones.reduce((s, k) => s + (d.set[k] ? zoneYield(L, d.set[k]) : 0), 0); l.kokuAll = l.koku; l.rice = Math.round(l.koku * l.tax * .5); }
  // realms: each clan and the court swear to their strongest lord
  for (const c of L.cultures) {
    if (c.kind !== 'clan' && c.kind !== 'court') continue;
    const lords = c.regions.map(g => L.regions[g].lord).filter(id => id && d.lords[id]).sort((a, b) => d.lords[b].koku - d.lords[a].koku);
    for (const id of lords.slice(1)) { d.lords[id].liege = lords[0]; d.lords[id].loyalty = .75; }
    fealtyChanged(L);
  }
  // the realm capitals are cities with castles
  for (const c of L.cultures) {
    if (c.kind !== 'clan' && c.kind !== 'court') continue;
    const ruler = c.regions.map(g => L.regions[g].lord).find(id => id && d.lords[id] && !d.lords[id].liege); if (!ruler) continue;
    const s = d.set[d.lords[ruler].seat]; if (!s) continue;
    s.pop = Math.max(s.pop, 210 + r.int(0, 60)); const more = Math.max(0, 42 - s.homes);
    for (let i = 0; i < more; i++) seedBuilding(L, s, 'house', ruler);
    for (const t of ['wall', 'temple', 'magistrate', 'keep', 'dojo', 'barracks']) if (!s.cnt[t]) seedBuilding(L, s, t, ruler);
    recount(L, s);
  }
  // a host at every seat: ashigaru from the people, retainers from the samurai who live there, bands at the camps
  const idx = indexHomes(L);
  for (const l of Object.values(d.lords)) {
    const seat = d.set[l.seat]; if (!seat) continue;
    const a = newArmy(L, l.id, [seat.x, seat.y]);
    if (l.outlaw) { addSquad(a, 'bandit', (living[l.seat] || []).length + r.int(2, 6), null, l.seat, seat); continue; }
    const pop = l.zones.reduce((s, k) => s + (d.set[k] ? d.set[k].pop : 0), 0), sam = l.zones.flatMap(k => idx[k] || []).map(id => L.actors[id]).filter(x => x.cls === 'retainer' && x.id !== l.id);
    addSquad(a, 'ashigaru', Math.max(4, Math.round(pop * .05)), null, l.seat, seat);
    if (sam.length) addSquad(a, 'retainer', Math.min(sam.length + 2, 12), sam[0].id, l.seat, seat);
    for (const q of a.sq) q.tr += r.range(0, .2);
    fillOffices(L, l.id, idx, r);
  }
  tradeYear(L);
  for (const s of Object.values(d.set)) { s.pool = { ashigaru: Math.floor(s.pop * N.LEVY), retainer: s.tier >= 2 ? 2 : 0, ronin: s.cnt.inn ? 2 : 0, monk: s.cnt.temple ? 4 : 0, shinobi: s.tier >= 3 ? 1 : 0 }; recount(L, s); }
  refreshDomains(L); refreshProvinces(L); refreshRealms(L);
  L.log = L.log.filter(e => !e.type.startsWith('dom.'));   // the world's first state is not news
}
// a building that already stands when the world begins, on the town's lots (owner 2026-10-01, D3C: build.js lotsOf), the smallest it
// fits, from the middle out; one that finds no lot is placed in the ledger layer (no tiles until he walks in)
const TAKEN = new WeakMap();   // settlement → the lots taken while the world is set up (a fresh lotsTaken per building would be slow)
function seedBuilding(L, s, t, owner) {
  const d = D(L), id = `b${(L.ids.b = (L.ids.b || 0) + 1)}`, b = BUILDINGS[t];
  let taken = TAKEN.get(s); if (!taken) TAKEN.set(s, taken = new Set());
  const lot = freeLot(L, s, t, taken); if (lot) taken.add(lot.i);
  d.bld[id] = { id, t, k: s.k, at: lot ? [lot.l.x, lot.l.y] : null, owner, st: 'up', hp: 1, done: b.labour, labour: b.labour, got: true, crew: 0, since: 0 };
  s.b.push(id); s.cnt[t] = (s.cnt[t] || 0) + 1;
}
