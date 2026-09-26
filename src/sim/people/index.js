import { system, on } from '../ledger.js';
import { HOURS_PER_SEASON } from '../time.js';
import { AGE, FADE_AFTER } from './rules.js';
import { age } from './kin.js';
import { initSettlements, rebuildResidents, adoptNewcomers, feedSettlements, rollHarvests, migrate, recruit, foundHouses, starve } from './settle.js';
import { liveBucket, yearOf } from './life.js';
import { marketSeason } from './marriage.js';
import { scheduleHour } from './schedule.js';

// ---- The people system: lives on the ledger (docs/sim-people.md). Import this module to register it, before generateWorld/loadWorld ----
// onHour  daily schedules for the people around him (only while he plays)
// onDay   one 56th of everyone lives half a year: death, birth, growing up, needs, ties
// onSeason newcomers, how fed they are; in spring and autumn the marriage market, new houses, moving to where there is room, levies
// onYear  who lives where (in full), the harvest, ambitions, the census
export const PEOPLE = system({
  id: 'people', order: 30,
  init(L) {
    const P = L.sys.people;
    Object.assign(P, {
      stats: { births: 0, deaths: {}, marriages: 0, adopted: 0, inherited: 0, estates: 0, regencies: 0, toLord: 0, toNature: 0, seats: 0, founded: 0, tenants: 0, migrated: 0, recruited: 0 },
      year: { births: 0, deaths: 0, marriages: 0 }, census: [], graves: [], lineage: [], over: null, wages: true, fadeAfter: FADE_AFTER,
    });
    for (const id in L.actors) {
      const a = L.actors[id]; if (!a.alive) continue;
      if (id !== L.player && age(L, a) < AGE.WORK) a.job = 'child';   // the first generation's children are not farmers yet
      a.needs = { food: 1, money: 1, safety: 1 };
    }
    const p = L.actors[L.player]; if (p) { p.dynasty = true; p.playedFrom = L.hour; }
    initSettlements(L); feedSettlements(L);
  },
  onHour(L, cal) { scheduleHour(L, cal); },
  onDay(L, cal, r) { liveBucket(L, cal.day, r); },
  onSeason(L, cal, r) {
    adoptNewcomers(L); feedSettlements(L);
    if (cal.seasonIndex % 2 === 0) { marketSeason(L, r); foundHouses(L); migrate(L, r); recruit(L, r); }   // spring and autumn: weddings, moves, levies
  },
  onYear(L, cal, r) { rebuildResidents(L); rollHarvests(L, r); yearOf(L, cal, r); },
});

// the economy's famine reaches the people: a starving zone or region eats at most half its need for a season
on('econ.famine', (e, L) => {
  if (!L.sys.people || !L.sys.people.settle) return;
  const S = L.sys.people.settle;
  if (e.zone) starve(L, e.zone[0] + ',' + e.zone[1], .5, HOURS_PER_SEASON);
  else if (e.region != null) for (const k in S) if (S[k].region === e.region) starve(L, k, .5, HOURS_PER_SEASON);
});

export { killActor, findHeir, passEstate, rulesFor } from './death.js';
export { wed, judge, court, propose, brides, pay, single } from './marriage.js';
export { playableHeirs, nameHeir, swear, sworn, recordDeed, notable, lootGrave } from './player.js';
export { residents, freePlot, grantPlot, starve, graveTile, moveHome } from './settle.js';
export { activity } from './schedule.js';
export { bond, tieOf, tieValue, setTie } from './ties.js';
export { tree, founder, children, livingChildren, siblings, closeKin, nearKin, pickRegent } from './kin.js';
export * as PEOPLE_RULES from './rules.js';
