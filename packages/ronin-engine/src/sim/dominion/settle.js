import { emit, zoneAt } from '../ledger.js';
import { makeActor } from '../actors.js';
import { BUILDINGS, TIERS, LAWS, N, traitSum, tierName, r3 } from '../packs/edo/dominion.js';
import { D, key, alive, lordOf, setZone, top, isSeat } from './land.js';
import { damage, passBuildings } from './build.js';
import { zoneYield, ricePrice, gain, migrate } from './seams.js';
import { officeQ } from './govern.js';
import { armiesOf } from './army.js';

// ---- Settlements: any zone with homes grows by tiers (homestead → hamlet → village → town → city → castle town) from what is built
// and who lives there; its people are taxed, fed, loyal or restless, and can riot or rise (docs/dominion.md sections 2 and 4) ----
// A settlement record (L.sys.dominion.set["x,y"]):
//   { k, x, y, name, region, culture, founder, tier (-1 none .. 5), pop, b: [building ids], cnt: { type: standing count }, homes, cap, walls,
//     staffed 0..1, store (koku in granaries), unrest 0..1, loyalty 0..1, pool: { ashigaru, retainer, ronin, monk, shinobi }, hit (hour of the
//     last raid or siege), trade (towns reached by road), yield (koku a year), hunger 0..1, vas: [vassal household heads], siege: army id | null }
export const settlementAt = (L, x, y) => D(L).set[key(x, y)] || null;
export function newSettlement(L, x, y, founder) {
  const z = zoneAt(L, x, y), reg = L.regions[z.region], k = key(x, y);
  const s = { k, x, y, name: z.name || null, region: z.region, culture: reg ? reg.culture : null, founder: founder || null, tier: -1, pop: 0, b: [], cnt: {},
    homes: 0, cap: 0, walls: 0, staffed: 1, store: 0, unrest: .15, loyalty: .6, pool: {}, hit: -1e9, trade: 0, yield: 0, hunger: 0, vas: [], siege: null };
  D(L).set[k] = s; return s;
}
// who rules a settlement: the zone's holder, or (a new settlement on plots) the one who founded it
export const lordOfSettlement = (L, s) => { const z = D(L).zt[s.k]; return z && z.holder ? z.holder : s.founder; };

// count what stands and work out the tier. Emits dom.tier when it changes
export function recount(L, s) {
  if (!s) return;
  const d = D(L), cnt = {}; let homes = 0, cap = 0, walls = 0, workers = 0;
  for (const id of s.b) { const r = d.bld[id]; if (r.st !== 'up' && !(r.st === 'repair' && r.hp >= .5)) continue; if (r.hp < .5) continue;
    const b = BUILDINGS[r.t]; cnt[r.t] = (cnt[r.t] || 0) + 1; homes += b.homes || 0; cap += b.cap || 0; walls += b.walls || 0; workers += b.workers || 0; }
  s.cnt = cnt; s.homes = homes; s.cap = cap; s.walls = +walls.toFixed(2); s.workers = workers;
  retier(L, s);
}
// the tier and staffing again, from the counts (people changed, nothing was built)
export function retier(L, s) {
  s.staffed = s.workers ? Math.min(1, s.pop * .6 / s.workers) : 1;
  const t = tierFor(L, s);
  if (t !== s.tier) { const was = s.tier; s.tier = t; const who = lordOfSettlement(L, s); if (Math.max(t, was) >= 2 || who === L.player) emit(L, 'dom.tier', { zone: [s.x, s.y], name: s.name, from: tierName(was), to: tierName(t), grew: t > was, actor: lordOfSettlement(L, s) }); }
}
export function tierFor(L, s) {
  const z = zoneAt(L, s.x, s.y); let t = -1;
  for (let i = 0; i < TIERS.length; i++) { const T = TIERS[i], keep = i <= s.tier ? .9 : 1;   // keeping a tier takes 90% of the people it took to reach it
    if (s.homes < T.homes || s.pop < (T.pop || 0) * keep || (T.road && !z.road) || s.trade < (T.trade || 0)) break;
    if (Object.entries(T.need || {}).some(([b, n]) => (s.cnt[b] || 0) < n)) break;
    if (T.seat && !isSeat(L, s.k)) break;
    t = i; }
  return t;
}
// what the settlement still needs for the next tier (for the page and the lords' building choices)
export function nextNeeds(L, s) {
  const T = TIERS[s.tier + 1]; if (!T) return null;
  const out = [], z = zoneAt(L, s.x, s.y);
  if (s.homes < T.homes) out.push(`${T.homes - s.homes} more home${T.homes - s.homes > 1 ? 's' : ''}`);
  for (const [b, n] of Object.entries(T.need || {})) if ((s.cnt[b] || 0) < n) out.push(`a ${b}`);
  if (s.pop < (T.pop || 0)) out.push(`${T.pop} people (${s.pop} now)`);
  if (T.road && !z.road) out.push('a road');
  if (s.trade < (T.trade || 0)) out.push(`trade with ${T.trade} towns (${s.trade})`);
  if (T.seat && !isSeat(L, s.k)) out.push('to be a domain\'s or province\'s seat');
  return { tier: T.name, needs: out };
}

// towns reached along the roads within 30 zones (a city trades with 3). A BFS over road zones, only for towns and up, once a year
export function tradeYear(L) {
  const d = D(L), { w } = L.size, towns = new Set(Object.values(d.set).filter(s => s.tier >= 3).map(s => s.y * w + s.x));
  for (const s of Object.values(d.set)) {
    if (s.tier < 3) { s.trade = 0; continue; }
    const start = s.y * w + s.x, dist = new Map([[start, 0]]), q = [start]; let n = 0;
    for (let i = 0; i < q.length; i++) { const c = q[i], cx = c % w, cy = (c - cx) / w, dc = dist.get(c); if (dc >= 30) continue;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const z = zoneAt(L, cx + dx, cy + dy); if (!z || !z.road) continue; const j = z.y * w + z.x;
        if (dist.has(j)) continue; dist.set(j, dc + 1); q.push(j); if (towns.has(j)) n++; } }
    s.trade = n; recount(L, s);
  }
}

// ---- every season: yield, tax, food, trade, unrest, loyalty, people, recruits; then each lord's koku ----
export function settleSeason(L, r) {
  const d = D(L);
  for (const l of Object.values(d.lords)) l.koku = 0;
  for (const s of Object.values(d.set)) {
    const lord = lordOfSettlement(L, s), l = lord && alive(L, lord) ? lordOf(L, lord) : null, laws = l ? l.laws : {};
    const lawSum = f => Object.keys(laws).reduce((a, n) => a + (laws[n] && LAWS[n][f] || 0), 0);
    s.yield = zoneYield(L, s) * (1 + lawSum('yield'));
    if (l) l.koku += s.yield;
    const rate = l ? l.tax : 0, rebels = s.vas.filter(v => d.vas[v] && d.vas[v].loyalty < N.RESTLESS).length / Math.max(1, s.vas.length);
    const riot = s.riot && L.hour - s.riot < 700 ? .5 : 1, season = s.yield / 4;
    if (l) {
      let got = season * rate * riot * (1 - .5 * rebels) * (s.siege ? 0 : 1);
      const st = l.off.steward && alive(L, l.off.steward) ? L.actors[l.off.steward] : null;
      if (st) { const skim = officeQ(L, st, 'steward').skim; if (skim > 0) { const take = got * skim; got -= take; gain(L, st.id, take * ricePrice(L, s.region));
        l.skimmed = (l.skimmed || 0) + take; } }
      if (l.liege && alive(L, l.liege)) { const share = got * N.VASSAL_SHARE; got -= share; lordOf(L, l.liege).rice += share; }
      l.rice += got;
      let mon = 0; for (const t in s.cnt) { const b = BUILDINGS[t], n = s.cnt[t]; if (b.trade) mon += (b.trade > 10 ? b.trade : b.trade * s.pop) * n * s.staffed;
        if (b.toll) mon += b.toll * s.pop * n; }
      if (laws.toll && zoneAt(L, s.x, s.y).road) mon += LAWS.toll.toll * s.pop;
      gain(L, lord, mon);
    }
    // food: what is left after tax feeds the people; granaries keep the surplus
    const kept = season * (1 - rate), eat = s.pop * N.EAT / 4, storeCap = (s.cnt.granary || 0) * BUILDINGS.granary.store + (s.cnt.storehouse ? 10 : 0);
    let short = eat - kept;
    if (short < 0) s.store = Math.min(storeCap, s.store - short * .5), short = 0; else { const draw = Math.min(s.store, short); s.store -= draw; short -= draw; }
    s.hunger = eat > 0 ? Math.min(1, short / eat) : 0;
    // unrest: tax, hunger, danger, occupation, a hated ruler; shrines, temples and a good magistrate calm it
    const z = d.zt[s.k], occupied = z && z.title && z.holder && z.title !== z.holder;
    const ruler = l && L.actors[lord], rel = ruler && ruler.culture != null && s.culture != null && ruler.culture !== s.culture ? (L.cultures[s.culture].relations[ruler.culture] ?? 0) : 0;
    let bUnrest = 0, bAppeal = 0; for (const t in s.cnt) { bUnrest += (BUILDINGS[t].unrest || 0) * s.cnt[t]; bAppeal += (BUILDINGS[t].appeal || 0) * s.cnt[t]; }
    const mag = l && l.off.magistrate && alive(L, l.off.magistrate) ? officeQ(L, L.actors[l.off.magistrate], 'magistrate').q : 0;
    const target = Math.max(0, Math.min(1, .1 + (rate - .3) * 1.4 + s.hunger * .8 + (L.hour - s.hit < 700 ? .25 : 0) + (occupied ? .2 : 0) + Math.max(0, -rel) * .3
      + lawSum('unrest') + Math.max(-.15, bUnrest) - mag * .15 - (ruler ? Math.max(-.1, Math.min(.1, (ruler.karma || 0) / 200)) : 0)));
    s.unrest = r3(Math.max(0, Math.min(1, s.unrest + (target - s.unrest) * N.UNREST_STEP + r.range(-.03, .03))));
    s.loyalty = r3(Math.max(0, Math.min(1, s.loyalty + ((1 - target) - s.loyalty) * .1)));
    // people come and go: capped by homes, drawn by markets and inns, driven off by hunger, tax and war
    let appeal = 1 - s.unrest * .5 - s.hunger * .8 - (L.hour - s.hit < 700 ? .3 : 0) + lawSum('appeal');
    appeal += bAppeal;
    const pop0 = s.pop, cap = s.cap || s.homes * N.HOME_POP;
    s.pop = Math.max(0, migrate(L, s, Math.round(cap * Math.max(.2, Math.min(1.1, appeal))), appeal));
    if (s.pop !== pop0) s.popDelta = s.pop - pop0;
    // who can be recruited here this season
    const levy = laws.conscript ? LAWS.conscript.levy : 1;
    s.pool = { ashigaru: Math.floor(s.pop * N.LEVY * levy), retainer: s.tier >= 2 ? Math.floor(s.pop * .02) + (isSeat(L, s.k) ? 2 : 0) : 0,
      ronin: s.cnt.inn ? 2 + Math.floor(s.pop * .02) + (laws.amnesty ? LAWS.amnesty.ronin : 0) : 0, monk: s.cnt.temple ? BUILDINGS.temple.monks : 0, shinobi: s.tier >= 3 ? 1 : 0 };
    vassalsSeason(L, s, r);
    trouble(L, s, l, lord, laws, r);
    if (s.workers == null) recount(L, s); else retier(L, s);
  }
  // rank is koku: a lord's own land plus his sworn vassals'
  // lords keep a year's rice for their men and sell half the rest for the mon that pays wages and builds
  for (const l of Object.values(d.lords)) { if (!alive(L, l.id)) continue;
    const keep = 10 + armiesOf(L, l.id).reduce((t, a) => t + a.sq.reduce((u, q) => u + q.n, 0), 0) * 1.2;
    if (l.rice > keep) { const sell = (l.rice - keep) * .8; l.rice -= sell; gain(L, l.id, sell * ricePrice(L, d.set[l.seat]?.region ?? 0)); } }   // at his seat's market
  for (const l of Object.values(d.lords)) l.kokuAll = l.koku;
  for (const l of Object.values(d.lords)) { if (!l.liege) continue; let x = l.liege; for (let i = 0; i < 12 && x; i++) { const up = d.lords[x]; if (!up) break; up.kokuAll += l.koku; x = up.liege; } }
}

// petitions, riots, uprisings (default 5: the people can take back possession, never the title)
function trouble(L, s, l, lord, laws, r) {
  if (!l || s.pop < 3) return;
  const riotAt = N.RIOT + (laws.curfew ? -LAWS.curfew.riot : 0) + (laws.noArms ? -LAWS.noArms.riot : 0);
  if (s.unrest > N.UPRISING && s.loyalty < N.UPRISING_LOYALTY && r.chance(.5)) return uprising(L, s, lord, laws, r);
  if (s.unrest < N.PETITION - .1) s.pet = false;
  if (s.unrest > riotAt && r.chance(.35)) { s.riot = L.hour; const up = s.b.filter(id => D(L).bld[id].st === 'up');
    if (up.length) damage(L, r.pick(up), .35, 'riot');
    emit(L, 'dom.riot', { zone: [s.x, s.y], name: s.name, actor: lord, unrest: s.unrest }); return; }
  if (s.unrest > N.PETITION && !s.pet) { s.pet = true; emit(L, 'dom.petition', { zone: [s.x, s.y], name: s.name, actor: lord, unrest: s.unrest, why: s.hunger > .2 ? 'hunger' : l.tax > .45 ? 'tax' : 'unrest' }); }
}
function uprising(L, s, lord, laws, r) {
  const d = D(L), z = d.zt[s.k];
  if (z && z.title && z.title !== lord && alive(L, z.title)) {   // occupied land rises for its lord on paper
    setZone(L, s.k, { holder: z.title }, 'uprising'); passBuildings(L, s.k, z.title);
    emit(L, 'dom.uprising', { zone: [s.x, s.y], name: s.name, from: lord, to: z.title, restored: true });
  } else {                                                          // a local family takes possession; the title stays where it was
    let head = s.vas.filter(v => alive(L, v)).sort((a, b) => (d.vas[a]?.loyalty ?? 1) - (d.vas[b]?.loyalty ?? 1))[0];
    if (!head) { const a = makeActor(L, r, { cls: 'rebel', culture: s.culture, home: [s.x, s.y], age: r.int(25, 50), job: 'rebel' }); head = a.id; }
    const n = Math.max(3, Math.round(s.pop * .15 * (laws.noArms ? .5 : 1)));
    setZone(L, s.k, { holder: head }, 'uprising'); passBuildings(L, s.k, head);
    const hl = lordOf(L, head); hl.rebel = true; hl.tax = .2; s.pop -= n;
    emit(L, 'dom.uprising', { zone: [s.x, s.y], name: s.name, from: lord, to: head, rebels: n });
    return { head, n };
  }
  s.unrest = .3; s.loyalty = .5;
}

// ---- vassals: household heads who hold family plots inside a lord's zone owe him tax and service; loyal, restless or rebellious ----
// L.sys.dominion.vas[actorId] = { liege, loyalty }. Their state is loyal (≥ .55), restless, or rebellious (< .3)
const PK = new Map();   // a settlement's 16 plot ids (derived, never ledger state)
const PROUD = ['proud', 'restless', 'cocky'], MEEK = ['humble', 'calm', 'serene'];
export const vassalState = v => v.loyalty >= N.LOYAL ? 'loyal' : v.loyalty >= N.RESTLESS ? 'restless' : 'rebellious';
function vassalsSeason(L, s, r) {
  const d = D(L), z = d.zt[s.k], liege = lordOfSettlement(L, s); if (!liege) return;
  const heads = new Set();
  let pk = PK.get(s.k); if (!pk) PK.set(s.k, pk = Array.from({ length: 16 }, (_, n) => `${s.k}:${n}`));
  for (let n = 0; n < 16; n++) { const p = L.plots[pk[n]]; if (p && p.title && p.title !== (z && z.title) && p.title !== liege && alive(L, p.title)) heads.add(p.title); }
  s.vas = [...heads];
  for (const id of s.vas) {
    const a = L.actors[id], v = d.vas[id] || (d.vas[id] = { liege, loyalty: s.loyalty }), was = vassalState(v);
    if (v.liege !== liege) { v.liege = liege; v.loyalty = Math.min(v.loyalty, .5); }
    const lean = v.lean ?? (v.lean = r3(traitSum(a, PROUD) * -.08 + traitSum(a, MEEK) * .06));
    v.loyalty = r3(Math.max(0, Math.min(1, v.loyalty + ((1 - s.unrest) + lean - v.loyalty) * .25 + r.range(-.05, .05))));
    const now = vassalState(v);
    if (now !== was && (liege === L.player || top(L, liege) === L.player)) emit(L, 'dom.vassal', { actor: id, liege, state: now, zone: [s.x, s.y] });
  }
}
