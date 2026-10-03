import { system, on } from '../ledger.js';
import { rngFor } from '../rng.js';
import { D, key, unkey, setZone, plotChanged, refreshDomains, refreshProvinces, refreshRealms, unitySeason, top } from './land.js';
import { setupWorld } from './init.js';
import { buildDay, upkeepSeason } from './build.js';
import { settleSeason, tradeYear } from './settle.js';
import { lordsSeason, successionYear, fillOffices, indexHomes, succeed } from './govern.js';
import { armyDay } from './army.js';
import { warDay, tributeSeason, conquestSeason, declareWar } from './war.js';
import { lordsDay } from './ai.js';
import { ripens } from './seams.js';

// ---- Dominion: building, the land ladder, settlements, governing, armies and war, as one system on the simulation core ----
// docs/dominion.md is the design (approved by the owner); docs/sim-dominion.md documents every field, event, rule, number and seam.
// Everything runs in onDay or slower, so it lives on while he is away (owner: real time). State: L.sys.dominion.
system({
  id: 'dominion', order: 60,
  init: setupWorld,
  onDay(L, cal, r) { buildDay(L); armyDay(L, r); warDay(L, cal, r); lordsDay(L, cal, r); },
  onSeason(L, cal, r) { settleSeason(L, r); upkeepSeason(L); tributeSeason(L); conquestSeason(L, r); lordsSeason(L, r); refreshDomains(L); refreshProvinces(L); refreshRealms(L); unitySeason(L); },
  onYear(L, cal, r) {
    successionYear(L, r); tradeYear(L);
    for (const [k, z] of Object.entries(D(L).zt)) if (ripens(L, z) && !D(L).lords[z.holder]?.outlaw) setZone(L, k, { title: z.holder }, 'held');
    const idx = indexHomes(L), d = D(L);
    for (const l of Object.values(d.lords)) { if (l.gone || l.id === L.player || !l.zones.length || !L.actors[l.id].alive) continue; fillOffices(L, l.id, idx, r);
      for (const g of Object.keys(l.grudges)) { l.grudges[g] = +(l.grudges[g] * .8).toFixed(2); if (l.grudges[g] < .05) delete l.grudges[g]; } }
  },
});

// ---- listening to the other lanes (docs/sim-dominion.md, "Listens for") ----
const ok = L => L && L.sys && L.sys.dominion && L.sys.dominion.lords;
// story: a war between cultures becomes a real war between their strongest lords
function storyWar(e, L) {
  if (!ok(L)) return; const [ca, cb] = e.cultures || [e.a, e.b]; if (ca == null || cb == null) return;
  const best = c => Object.values(D(L).lords).filter(l => !l.gone && l.zones.length && L.actors[l.id].alive && L.actors[l.id].culture === c).sort((x, y) => y.kokuAll - x.kokuAll)[0];
  const la = best(ca), lb = best(cb); if (la && lb) declareWar(L, top(L, la.id), top(L, lb.id), { reason: 'hatred', story: true });
}
on('story.war', storyWar); on('event.war', storyWar);
// economy: a famine empties the stores and stirs the people
on('econ.famine', (e, L) => { if (!ok(L)) return; for (const s of Object.values(D(L).set)) if ((e.zone && key(...e.zone) === s.k) || (!e.zone && s.region === e.region)) { s.store = 0; s.hunger = Math.max(s.hunger, .5); s.unrest = Math.min(1, s.unrest + .15); } });
// people: a death passes a lord's land on at once. Settlers need no listener: a settlement the people lane keeps takes its ledger count
// each season (seams.js migrate), so people.arrived / people.migrated are already in it
const died = (e, L) => { if (!ok(L)) return; const id = e.actor; if (D(L).lords[id] && !L.actors[id].alive) succeed(L, id, rngish(L, id)); };
on('people.died', died);
// crime, the economy and land: a plot's title or holder changed (crime's title ways, seizures and retakings; a plot sold); the zone rule
// and the estates catch up
const plot = (e, L) => { if (ok(L) && e.plot) plotChanged(L, e.plot); };
on('crime.title', plot); on('crime.seized', plot); on('crime.retaken', plot); on('econ.landSold', plot); on('land.claimed', plot); on('land.claim', plot);
const rngish = (L, id) => rngFor(L.seed, 'dominion', 'death', id, L.hour);

export * from './data.js';
export { D as dominion, key, unkey, lordOf, top, sameSide, lordName, zoneRec, setZone, checkZoneTitle, plotChanged, plotsHeld, estatesOf, canFound, foundDomain, realmOf, holdingsOf, rankOf } from './land.js';
export { settlementAt, lordOfSettlement, nextNeeds, vassalState } from './settle.js';
export { recipeOf, costOf, canPlace, prereq, plan, supply, work, hire, damage, repair } from './build.js';
export { officeQ, appoint, candidates, setTax, setLaw, swearFealty, lordState } from './govern.js';
export { menOf, strength, battlePower, armiesOf, armiesAt, recruitWhy, recruit, newArmy, setOfficer, setOrder, orderSquad, squadsAt, disband, pathTo, march, atWar, armyLabel } from './army.js';
export { reasonFor, declareWar, activeWars, sideOf, makePeace, termsFor, settleBattle, take, conquestSeason } from './war.js';
export { claimPlot, worth, spend, gain, zoneClaimant, conquestRipens } from './seams.js';
export { refreshDomains, refreshProvinces, refreshRealms, unitySeason, tradeYear };
