import { N, BUILDINGS } from './data.js';
import { ageOf } from '../actors.js';
import { HOURS_PER_YEAR } from '../time.js';
import { ownerOf, tilesOf, TERRAIN } from '../zone.js';

// ---- The seams: everything dominion needs from the other lanes, each behind ONE small stand-in function ----
// When a lane lands, the integrator replaces the body of its function here and nothing else changes (docs/sim-dominion.md, "Seams").
// Each says which lane owns it and exactly what it needs.

// ECONOMY: a settlement's yield in koku a year (people who farm + buildings that grow food, scaled by how many are staffed)
export function zoneYield(L, s) {
  let k = s.pop * N.YIELD_PER_HEAD;
  for (const [t, n] of Object.entries(s.cnt)) if (BUILDINGS[t].koku) k += BUILDINGS[t].koku * n * s.staffed;
  return k;
}
// ECONOMY: the price of rice (mon a koku) and of a building material (mon a unit) in a region
export const ricePrice = (L, region) => N.RICE_PRICE;
export const materialPrice = (L, region, mat) => N.MATERIAL[mat] ?? 0;
// ECONOMY: money. worth: all a person has, in mon; spend: take mon (breaking silver and gold as needed), false if they cannot pay; gain: add mon
export const worth = a => a.money.mon + a.money.silver * N.SILVER + a.money.ryo * 1000;
export function spend(L, id, mon) {
  const a = L.actors[id]; if (!a || mon <= 0) return mon <= 0; if (worth(a) < mon) return false;
  const m = a.money; m.mon -= mon;
  while (m.mon < 0 && m.silver > 0) { const s = Math.min(m.silver, Math.ceil(-m.mon / N.SILVER)); m.silver -= s; m.mon += s * N.SILVER; }
  while (m.mon < 0 && m.ryo > 0) { m.ryo--; m.mon += 1000; }
  return true;
}
export function gain(L, id, mon) {
  const a = L.actors[id]; if (!a || !(mon > 0)) return;
  a.money.mon += Math.round(mon);
  if (a.money.mon > 6000) { const r = Math.floor((a.money.mon - 3000) / 1000); a.money.ryo += r; a.money.mon -= r * 1000; }   // a lord keeps his treasury in gold
}

// PEOPLE: who inherits a person's land: the eldest living child of age, else the spouse, else a sibling; null if none
export function heirOf(L, a) {
  const alive = id => L.actors[id] && L.actors[id].alive;
  const kids = (a.children || []).filter(alive).map(id => L.actors[id]).filter(c => ageOf(L, c) >= 14).sort((x, y) => x.born - y.born);
  if (kids.length) return kids[0].id;
  if (a.spouse && alive(a.spouse)) return a.spouse;
  for (const p of a.parents || []) { const par = L.actors[p]; if (!par) continue; for (const s of par.children) if (s !== a.id && alive(s) && ageOf(L, L.actors[s]) >= 14) return s; }
  return null;
}
// PEOPLE: a death (battle, execution, age). The people lane's killActor replaces this and emits its own event
export function killActor(L, id, cause) {
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
function growth(L, s, appeal) { s.grow = (s.grow || 0) + s.pop * .005 * Math.max(0, appeal); const n = Math.floor(s.grow); s.grow -= n; return n; }
// PEOPLE: migration. People come to a place that is safe, fed and prosperous, and leave one that is not: pop moves toward target
// (natural growth about 2% a year; a small, well-run place draws a few settlers a season from the region round it)
export function migrate(L, s, target, appeal) {
  if (s.pop < target) return s.pop + Math.min(target - s.pop, growth(L, s, appeal) + (s.pop < 40 && appeal > .6 ? 1 + Math.round(appeal * 2) : 0));
  return s.pop - Math.ceil((s.pop - target) * .25);
}

// CRIME: lawful transfer of a plot's title (a treaty's cession, an inheritance, a grant). Possession stays as it is unless given
export function transferTitle(L, pid, to, how, holderToo = false) {
  const o = ownerOf(L, pid), rec = L.plots[pid] || (L.plots[pid] = { title: o.title, holder: o.holder });
  rec.title = to; if (holderToo) rec.holder = to;
  return rec;
}
// CRIME: when possession ripens into title. Stand-in: a zone nobody holds on paper (a camp, a lordless village) becomes its holder's
// after two years held (the crime lane decides the real rule: witnesses, time, blood money)
export const ripens = (L, z) => !z.title && z.holder && L.hour - (z.since || 0) >= 2 * HOURS_PER_YEAR;
// CRIME: karma and standing (war without a reason costs both)
export function addKarma(L, id, d) { const a = L.actors[id]; if (a) a.karma = Math.round((a.karma || 0) + d); }
export function addStanding(L, id, culture, d) { const a = L.actors[id]; if (a && culture != null) a.standing[culture] = Math.max(-1, Math.min(1, (a.standing[culture] || 0) + d)); }

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
