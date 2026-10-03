import { N, BUILDINGS } from './data.js';
import { zoneAt } from '../ledger.js';
import { ageOf } from '../actors.js';
import { HOURS_PER_YEAR } from '../time.js';
import { ownerOf, tilesOf, TERRAIN, PLOTS } from '../zone.js';
import { GOODS, GOOD } from '../economy/tune.js';
import { worth as eWorth, pay, changeUp } from '../economy/money.js';
import { plotKoku } from '../economy/setup.js';
import { killActor as peopleKill, findHeir } from '../people/death.js';
import { passTitle, heirOf as crimeHeir } from '../crime/land.js';
import { addKarma as crimeKarma, addStanding as crimeStanding } from '../crime/law.js';
import { LAND, K } from '../crime/rules.js';

// ---- The seams: everything dominion needs from the other lanes, each behind ONE small function (docs/sim-dominion.md, "Seams") ----
// Economy, people and crime have landed: each seam calls into its lane when that lane's system runs (L.sys.economy / people / crime),
// and keeps its stand-in for when it does not (prototype 42 and scripts/dominion-sim.mjs run dominion alone). The lanes' modules are
// imported below their index.js, so loading dominion never registers another lane's system (crime/index.js registers people itself).

// ECONOMY: a settlement's yield in koku a year: its people (dominion counts the nameless too) on the economy's land (plotKoku: biome, the
// settlement's ring of fields, the land lane's overrides) against the norm, plus buildings that grow food, scaled by staffing, all in the
// economy's harvest weather for the region this year. Alone: the people and the buildings, average land, an average year
export function zoneYield(L, s) {
  const E = L.sys.economy; let land = 1, q = 1;
  if (E) { let k = 0; for (let n = 0; n < PLOTS * PLOTS; n++) k += plotKoku(L, s.x, s.y, n);
    land = Math.max(N.LAND_SPAN[0], Math.min(N.LAND_SPAN[1], k / N.LAND_NORM)); q = E.regions[s.region]?.q ?? 1; }
  let k = s.pop * N.YIELD_PER_HEAD * land;
  for (const [t, n] of Object.entries(s.cnt)) if (BUILDINGS[t].koku) k += BUILDINGS[t].koku * n * s.staffed;
  return k * q;
}
// ECONOMY: the price of rice (mon a koku) and of a building material (mon a unit) in a region: the region's market. Dominion's units are
// kept (a load of timber is not the economy's), so a traded material moves with its market against base; stone and tiles are not traded
const marketRatio = (L, region, good) => { const E = L.sys.economy, R = E && E.regions[region]; return R && GOOD[good] ? R.price[GOODS.indexOf(good)] / GOOD[good].base : 1; };
export const ricePrice = (L, region) => N.RICE_PRICE * marketRatio(L, region, 'rice');
export const materialPrice = (L, region, mat) => (N.MATERIAL[mat] ?? 0) * marketRatio(L, region, mat);
// ECONOMY: money, through the economy's coins (1 / 16 / 1,000 mon; copper first, change in copper), alone or not: coins are not a system.
// worth: all a person has, in mon; spend: false if they cannot pay; gain: add mon. Dominion's wages, materials and hired hands leave the
// ledger and its rice sales, trade and loot enter it, so with the economy running both go on its books as 'other' (money stays explained)
export const worth = a => eWorth(a.money);
export function spend(L, id, mon) {
  const a = L.actors[id]; if (!a || mon <= 0) return mon <= 0; if (worth(a) < mon) return false;
  pay(a.money, mon); if (L.sys.economy) L.sys.economy.flow.other -= mon;
  return true;
}
export function gain(L, id, mon) {
  const a = L.actors[id]; if (!a || !(mon > 0)) return;
  a.money.mon += Math.round(mon); if (L.sys.economy) L.sys.economy.flow.other += Math.round(mon);
  changeUp(a.money);   // a lord keeps his treasury in gold
}

// PEOPLE: who inherits a person's land: the people lane's rule for his culture (findHeir; a minor heir rules through his regent). A region's
// seat and a band's camp have already passed by the people lane's rules when dominion hears of the death, so dominion follows them. Alone: the eldest living
// child of age, else the spouse, else a sibling; null if none
export function heirOf(L, a) {
  const alive = id => L.actors[id] && L.actors[id].alive;
  if (L.sys.people) {
    const reg = a.lord != null ? L.regions[a.lord] : null;
    if (reg && reg.lord !== a.id && alive(reg.lord)) return reg.lord;
    const camp = a.chief && a.home ? zoneAt(L, a.home[0], a.home[1]) : null;   // a band's chief: the people lane's next chief has the camp
    if (camp && camp.holder !== a.id && alive(camp.holder)) return camp.holder;
    const h = findHeir(L, a).heir; return h ? h.id : null;
  }
  const kids = (a.children || []).filter(alive).map(id => L.actors[id]).filter(c => ageOf(L, c) >= 14).sort((x, y) => x.born - y.born);
  if (kids.length) return kids[0].id;
  if (a.spouse && alive(a.spouse)) return a.spouse;
  for (const p of a.parents || []) { const par = L.actors[p]; if (!par) continue; for (const s of par.children) if (s !== a.id && alive(s) && ageOf(L, L.actors[s]) >= 14) return s; }
  return null;
}
// PEOPLE: a death (battle, execution, age): the people lane's killActor (the grave, the widow, the heir, people.died). Alone: just the record
export function killActor(L, id, cause, by = null) {
  if (L.sys.people) return peopleKill(L, id, cause, by);
  const a = L.actors[id]; if (!a || !a.alive) return;
  a.alive = false; a.died = L.hour; a.cause = cause;
}
// PEOPLE: lords' deaths by age, only until the people lane runs (so successions happen in a 20-year test)
export function mortality(L, a, r) {
  if (L.sys.people) return false;
  const age = ageOf(L, a), p = N.DEATH.find(([upTo]) => age < upTo)[1];
  if (r.chance(p)) { killActor(L, a.id, 'age'); return true; }
  return false;
}
// natural growth in whole people: 0.5% a season, carried over in s.grow so small places grow too
function growth(s, pop, appeal) { s.grow = (s.grow || 0) + pop * .005 * Math.max(0, appeal); const n = Math.floor(s.grow); s.grow -= n; return n; }
// people come to a place that is safe, fed and prosperous, and leave one that is not: pop moves toward target
// (natural growth about 2% a year; a small, well-run place draws a few settlers a season from the region round it)
function drift(s, pop, target, appeal) {
  if (pop < target) return pop + Math.min(target - pop, growth(s, pop, appeal) + (pop < 40 && appeal > .6 ? 1 + Math.round(appeal * 2) : 0));
  return pop - Math.ceil((pop - target) * .25);
}
// PEOPLE: migration. A settlement's pop is its ledger people plus the nameless dominion counts beside them. Where the people lane keeps the
// place (towns, villages, forts, camps, shrines: L.sys.people.settle) its births, deaths, moves and newcomers ARE the ledger part, so dominion
// takes that count as it stands and drifts only the nameless toward what is left of its target; counting both would add every newcomer
// twice. s.named is the ledger part last season. A place the people lane does not keep (one he founded on wild plots), or no people lane: all of it
export function migrate(L, s, target, appeal) {
  const P = L.sys.people && L.sys.people.settle && L.sys.people.settle[s.k];
  if (!P) return drift(s, s.pop, target, appeal);
  const named = P.pop, nameless = Math.max(0, s.pop - (s.named ?? named));
  s.named = named;
  return named + drift(s, nameless, Math.max(0, target - named), appeal);
}

// CRIME: lawful transfer of a plot's title (a treaty's cession, an inheritance, a grant): crime's passTitle (holds and claims, the contested
// record when someone else holds it, crime.title). Possession stays as it is unless given
export function transferTitle(L, pid, to, how, holderToo = false) {
  let rec;
  if (L.sys.crime) { passTitle(L, pid, to, how); rec = L.plots[pid]; }
  else { const o = ownerOf(L, pid); rec = L.plots[pid] || (L.plots[pid] = { title: o.title, holder: o.holder }); rec.title = to; }
  if (holderToo) rec.holder = to;
  return rec;
}
// CRIME: when possession ripens into title: a zone nobody holds on paper (a camp, a lordless village) becomes its holder's once held as long
// as crime's prescription asks (LAND.PRESCRIPTION_YEARS: there is no title holder alive to claim it). Alone: two years
export const ripens = (L, z) => !z.title && z.holder && L.hour - (z.since || 0) >= (L.sys.crime ? LAND.PRESCRIPTION_YEARS : 2) * HOURS_PER_YEAR;
// CRIME: land taken in a war that no treaty ceded (owner 2026-10-01, "land B": the crime lane's rule). Who can claim the zone: its title
// holder, or his heir if he is dead (crime's claimant: crime's heirOf when crime runs, the people seam's otherwise); never the holder
export function zoneClaimant(L, z) {
  const t = L.actors[z.title]; if (!t) return null;
  const c = t.alive ? t.id : L.sys.crime ? crimeHeir(L, t, z.holder) : heirOf(L, t);
  return c === z.holder ? null : c;
}
// CRIME: the witnesses of a taking: up to LAND.WITNESS_KEEP grown people (crime's K.ADULT) living in the zone, never the taker. Who lives
// where is indexed once a game season (derived, never ledger state; each one is checked again: alive, still living there)
const HOMES = new WeakMap(), SEASON = 24 * 28;
export function witnessesOf(L, k, not, r) {
  const sn = Math.floor(L.hour / SEASON); let c = HOMES.get(L);
  if (!c || c.s !== sn) { c = { s: sn, m: new Map() }; HOMES.set(L, c);
    for (const id in L.actors) { const a = L.actors[id]; if (a.alive && a.home) { const hk = a.home[0] + ',' + a.home[1]; (c.m.get(hk) || c.m.set(hk, []).get(hk)).push(a); } } }
  const here = (c.m.get(k) || []).filter(a => a.alive && a.id !== not && a.home && a.home[0] + ',' + a.home[1] === k && ageOf(L, a) >= K.ADULT).map(a => a.id);
  return r.shuffle(here).slice(0, LAND.WITNESS_KEEP);
}
// why a conquered zone's title passes to its holder now, or null. Time (prescription): held LAND.PRESCRIPTION_YEARS with nobody alive to
// claim it. Court: the claimant sues (LAND.COURT a season), and with no witness of the taking left alive and the land held LAND.COURT_YEARS
// the court confirms the holder. While the old lord's line lives and a witness does, it stays contested (a claim war's reason). The same
// rule alone: crime's numbers (rules.js is plain data), dominion's heir
export function conquestRipens(L, z, r) {
  if (!z.taken || !z.title || !z.holder || z.title === z.holder) return null;
  const held = L.hour - z.taken.h, claimant = zoneClaimant(L, z);
  if (claimant == null) return held >= LAND.PRESCRIPTION_YEARS * HOURS_PER_YEAR ? 'prescription' : null;
  if (held >= LAND.COURT_YEARS * HOURS_PER_YEAR && !z.taken.wit.some(id => L.actors[id]?.alive) && r.chance(LAND.COURT)) return 'court';
  return null;
}
// CRIME: karma (−100..100) and standing (−1..1): crime's, which clamp and let standing drift back to karma. Alone: edit the fields
export function addKarma(L, id, d) { const a = L.actors[id]; if (!a) return; if (L.sys.crime) crimeKarma(a, d); else a.karma = Math.round((a.karma || 0) + d); }
export function addStanding(L, id, culture, d) {
  const a = L.actors[id]; if (!a || culture == null) return;
  if (L.sys.crime) crimeStanding(L, a, culture, d); else a.standing[culture] = Math.max(-1, Math.min(1, (a.standing[culture] || 0) + d));
}

// LAND: does a tile feature (a tree, rock, water, a building already there) block building on this tile? The land lane's features
// and clearing replace this; until then forest, bamboo, rock, water, marsh and anything built block
const BLOCK = new Set(['forest', 'bamboo', 'rock', 'water', 'marsh', 'building', 'wall', 'palisade', 'shrine']);
export function tileGround(L, zx, zy, tx, ty) { return TERRAIN[tilesOf(L, zx, zy).t[ty * 64 + tx]]; }
export const blocked = (L, zx, zy, tx, ty) => BLOCK.has(tileGround(L, zx, zy, tx, ty));
// LAND: claiming a nature plot (prototype 42 only; the land lane owns claiming and its rules)
export function claimPlot(L, pid, who) {
  const o = ownerOf(L, pid); if (o.title || o.holder) return false;
  L.plots[pid] = { title: who, holder: who }; const a = L.actors[who]; if (a && !a.holds.includes(pid)) a.holds.push(pid);
  return true;
}
