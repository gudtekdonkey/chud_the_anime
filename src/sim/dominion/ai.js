import { zoneAt } from '../ledger.js';
import { BUILDINGS, TIERS, UNITS, N, TRAIT, traitSum } from './data.js';
import { D, unkey, alive, top, sameSide, landOf, landOfKey } from './land.js';
import { plan } from './build.js';
import { setTax, setLaw, swear, lordState } from './govern.js';
import { recruit, disband, menOf, armiesOf, march, atWar, atWarAny, newArmy, addSquad, sideStrength } from './army.js';
import { declareWar, reasonFor } from './war.js';
import { worth, ricePrice } from './seams.js';

// ---- NPC lords play by exactly the ronin's rules: each decides once a week (staggered, so ~1/7 of them a day): tax, laws, what to build,
// how many men to keep, whom to fight, whom to swear to. Personality decides whether and how boldly; intelligence how well ----
const hashId = id => { let h = 0; for (const c of id) h = (h * 31 + c.charCodeAt(0)) >>> 0; return h; };
export function lordsDay(L, cal, r) {
  const d = D(L);
  for (const id in d.lords) { const l = d.lords[id];
    if (l.gone || l.id === L.player || cal.day < (l.next ?? hashId(l.id) % 14) || !alive(L, l.id)) continue;   // every week or two each
    l.next = cal.day + (!l.outlaw && atWarAny(L, l.id) ? 7 : 14);
    if (!l.zones.length) { for (const a of armiesOf(L, l.id)) if (!a.go) disband(L, a.id); continue; }
    if (l.outlaw) outlaw(L, l, r); else decide(L, l, cal, r);
  }
}
const setsOf = (L, l) => l.zones.map(k => D(L).set[k]).filter(Boolean);
const upkeepPerDay = (L, lord) => armiesOf(L, lord).reduce((s, a) => s + a.sq.reduce((t, q) => t + q.n * (UNITS[q.cls].wage + UNITS[q.cls].rice / 112 * ricePrice(L, 0)), 0), 0);

function decide(L, l, cal, r) {
  const d = D(L), me = L.actors[l.id], sets = setsOf(L, l), clever = me.int ?? .5, bold = traitSum(me, TRAIT.bold), greedy = traitSum(me, TRAIT.greedy), kind = traitSum(me, TRAIT.kind);
  const war = atWarAny(L, l.id), unrest = sets.reduce((s, x) => s + x.unrest, 0) / Math.max(1, sets.length);
  // tax: the greedy tax hard, the kind lightly; a clever lord eases it when his people grow restless
  let want = N.TAX + greedy * .1 - kind * .08 + (war ? .05 : 0) - (unrest > .5 ? .12 * clever : 0) + (worth(me) < 300 ? .05 : 0);
  want = Math.max(N.TAX_MIN, Math.min(N.TAX_MAX, want));
  if (Math.abs(want - l.tax) >= .05) setTax(L, l.id, l.tax + Math.sign(want - l.tax) * .05);
  // laws, now and then
  if (r.chance(.25)) {
    const riots = sets.some(s => s.riot && L.hour - s.riot < 1400);
    if (war && (clever < .5 || bold > .5)) setLaw(L, l.id, 'conscript', true); else if (!war && l.laws.conscript) setLaw(L, l.id, 'conscript', false);
    if (riots && !kind) setLaw(L, l.id, 'curfew', true); else if (!riots && l.laws.curfew) setLaw(L, l.id, 'curfew', false);
    if (unrest > .6 && kind > .3) setLaw(L, l.id, 'amnesty', true); else if (unrest < .3 && l.laws.amnesty) setLaw(L, l.id, 'amnesty', false);
    if (greedy > .5 && sets.some(s => zoneAt(L, s.x, s.y).road)) setLaw(L, l.id, 'toll', true);
  }
  build(L, l, sets, war, r);
  army(L, l, sets, war, bold, r);
  if (!war && cal.day >= (l.dip || 0)) { l.dip = cal.day + 28; diplomacy(L, l, sets, bold, kind, clever, r); }   // whom to fight or serve: once a season
}

// ---- building: what the next tier needs first, homes when full, food and walls when needed; within what he can spare ----
function build(L, l, sets, war, r) {
  const d = D(L), me = L.actors[l.id], busy = d.work.filter(id => d.bld[id].owner === l.id).length, steward = l.off.steward && alive(L, l.off.steward);
  if (busy >= 1 + (steward ? 1 : 0) + (l.kokuAll > 600 ? 1 : 0)) return;
  const spare = worth(me) - 300 - upkeepPerDay(L, l.id) * 20; if (spare < 100) return;
  const choice = [];
  for (const s of sets) {
    if (s.siege) continue; const next = TIERS[s.tier + 1], z = zoneAt(L, s.x, s.y), w = s.pop / Math.max(1, s.pop + 20);
    const want = (t, p) => { if (!BUILDINGS[t] || (BUILDINGS[t].tier ?? -1) > s.tier) return; choice.push([s, t, p]); };
    if (s.pop >= (s.cap || 1) * .85 || (next && s.homes < next.homes && s.pop >= (next.pop || 0) * .7)) want(s.tier >= 1 && r.chance(.4) ? 'longhouse' : 'house', 5 + w * 3);
    if (next) for (const [t, n] of Object.entries(next.need || {})) if ((s.cnt[t] || 0) < n && (!next.pop || s.pop >= next.pop * .6)) want(t, 6 + s.tier);
    if (s.tier >= 1 && !s.cnt.granary) want('granary', 3);
    if ((z.biome === 'paddy' || z.biome === 'plains' || z.biome === 'marsh') && (s.cnt.paddy || 0) < 1 + s.tier) want('paddy', 3);
    if (war && s.tier >= 1 && !s.cnt.palisade && !s.cnt.wall) want('palisade', 5);
    if (s.k === l.seat) { if (!s.cnt.barracks) want('barracks', 2 + (war ? 3 : 0)); if (!s.cnt.dojo) want('dojo', 1.5 + (war ? 2 : 0)); if (s.tier >= 2 && !s.cnt.smithy) want('smithy', 2); }
    if (s.tier >= 2 && !s.cnt.market) want('market', 2); if (s.tier >= 2 && !s.cnt.shrine) want('shrine', 2);
    if (s.unrest > .5 && !s.cnt.shrine) want('shrine', 4);
  }
  if (!choice.length) return;
  choice.sort((a, b) => b[2] - a[2]);
  for (const [s, t] of choice.slice(0, 3)) { const res = plan(L, l.id, t, s.x, s.y, 0, 0, { at: false }); if (!res.error) return res; }
}

// ---- the army: as many men as the land can feed and pay, more in war and for the bold; paid swords when rich ----
function army(L, l, sets, war, bold, r) {
  const me = L.actors[l.id], men = armiesOf(L, l.id).reduce((s, a) => s + menOf(a), 0);
  const income = l.koku * l.tax * ricePrice(L, 0) / 112 + 5, afford = Math.floor(income / 12);   // mon a day, and a man costs about 9 a day: keep a margin
  const want = Math.min(afford, Math.round(l.koku * .08 * (1 + bold * .5) * (war ? 1.8 : 1)) + 4);
  if (men > afford * 1.3 && men > 6) { const a = armiesOf(L, l.id).find(x => !x.go && x.sq.some(q => q.cls === 'ashigaru'));
    if (a) { const i = a.sq.findIndex(q => q.cls === 'ashigaru'); a.sq[i].n = Math.max(0, a.sq[i].n - Math.ceil(men - afford)); if (!a.sq[i].n) a.sq.splice(i, 1); } return; }
  if (men >= want) return;
  const seat = l.seat && D(L).set[l.seat] ? l.seat : sets[0] && sets[0].k; if (!seat) return;
  let need = want - men;
  const home = armiesOf(L, l.id).find(a => a.home === seat) || newArmy(L, l.id, unkey(seat));
  for (const s of [D(L).set[seat], ...sets.filter(x => x.k !== seat)]) {
    if (need <= 0 || !s) break;
    for (const cls of worth(me) > 4000 ? ['retainer', 'ashigaru', 'ronin'] : ['ashigaru', 'retainer']) {
      const n = Math.min(need, s.pool[cls] || 0, cls === 'retainer' ? 3 : cls === 'ronin' ? 4 : 99); if (n <= 0) continue;
      const res = recruit(L, l.id, cls, n, s.k); if (res.error) continue; need -= n;
      if (res.id !== home.id && !res.go && !home.go) { for (const q of res.sq) addSquad(home, q.cls, q.n, q.off, q.from, s); delete D(L).armies[res.id]; }   // one host at the seat
    }
  }
  if (!home.sq.length) delete D(L).armies[home.id];
}

// ---- diplomacy: whom to fight (a reason, or boldness; a clever lord judges strength well), whom to swear to, when to rebel ----
function diplomacy(L, l, sets, bold, kind, clever, r) {
  const d = D(L), mine = sideStrength(L, top(L, l.id));
  if (l.liege) {   // a vassal: rise when rebellious and strong enough
    if (lordState(l) === 'rebellious' && mine > sideStrength(L, top(L, l.liege)) * (.8 - bold * .2) && r.chance(.3)) declareWar(L, l.id, l.liege, { reason: 'rebellion' });
    return;
  }
  if (l.rebel && l.zones.length < 2) return;
  const regs = new Set(sets.map(s => s.region)), near = new Set();
  for (const g of [...regs]) for (const n of d.adj[g] || []) regs.add(n);
  const isles = new Set(sets.map(s => landOf(L, s.x, s.y)));
  for (const g of regs) for (const k of d.regZ[g] || []) { const h = d.zt[k].holder; if (h && alive(L, h) && !sameSide(L, h, l.id) && isles.has(landOfKey(L, k))) near.add(top(L, h)); }
  let best = null;
  for (const t of near) {
    if ((l.truce[t] || 0) > L.hour || atWar(L, l.id, t)) continue;
    const why = reasonFor(L, l.id, t), theirs = sideStrength(L, t) * (1 + r.range(-.5, .5) * (1 - clever)) + 1;
    const ratio = mine / theirs, need = 1.6 - bold * .4 - (why ? .25 : 0) + kind * .4;
    const score = ratio - need + (why ? .3 : 0);
    if (ratio >= need + (why ? 0 : .6) && (why || bold > .8) && (!best || score > best.score)) best = { t, why, score };
    // swear to a much stronger neighbour rather than be eaten (the proud never do)
    if (ratio < .3 && traitSum(L.actors[l.id], ['proud']) < .5 && l.kokuAll < 400 && r.chance(.04 + .06 * clever)) {
      const lt = d.lords[t]; if (lt && !lt.outlaw && !lt.rebel && ((L.actors[t].culture === L.actors[l.id].culture) || r.chance(.3))) return swear(L, l.id, t, 'envoy'); }
  }
  if (best && r.chance((best.why ? .3 : .1) * (1 - kind * .5))) {
    const t = best.t, goal = (l.titles.find(k => d.zt[k].holder && sameSide(L, d.zt[k].holder, t))) ||
      Object.values(d.lords).filter(x => top(L, x.id) === t).flatMap(x => x.zones).filter(k => d.set[k]).sort((a, b) => dz(a, sets) - dz(b, sets))[0];
    declareWar(L, l.id, t, { reason: best.why, goal: goal || null });
  }
}
const dz = (k, sets) => { const [x, y] = unkey(k); return Math.min(...sets.map(s => Math.abs(s.x - x) + Math.abs(s.y - y))); };

// settlements within 8 zones of a camp on its own island (geography never changes: cached per world)
const NEAR = new WeakMap();
function nearSets(L, seat) {
  let m = NEAR.get(L.zones); if (!m) NEAR.set(L.zones, m = new Map());
  let l = m.get(seat); if (l) return l;
  const [cx, cy] = unkey(seat), isle = landOf(L, cx, cy);
  l = Object.values(D(L).set).filter(s => s.k !== seat && Math.abs(s.x - cx) + Math.abs(s.y - cy) <= 8 && landOf(L, s.x, s.y) === isle).map(s => s.k);
  m.set(seat, l); return l;
}
// ---- outlaw chiefs: gather men at the camp, raid the settlements nearby; a crushing raid seizes one ----
function outlaw(L, l, r) {
  const d = D(L), camp = d.set[l.seat]; if (!camp) return;
  let band = armiesOf(L, l.id)[0] || newArmy(L, l.id, unkey(l.seat), 'the band');
  if (menOf(band) < 12 && r.chance(.5)) addSquad(band, 'bandit', 1, null, l.seat, camp);
  if (band.go || menOf(band) < 5 || !r.chance(.2)) return;
  const targets = nearSets(L, l.seat).map(k => d.set[k]).filter(s => s && s.pop > 5 &&
    !(d.zt[s.k] && d.zt[s.k].holder && d.lords[d.zt[s.k].holder]?.outlaw));
  if (!targets.length) return;
  const t = r.pick(targets); march(L, band.id, [t.x, t.y], 'raid');
}
