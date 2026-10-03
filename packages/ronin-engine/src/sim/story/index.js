import { system, on } from '../ledger.js';
import { initState } from './state.js';
import { initNature, natureDay, natureSeason, onEconFamine } from './nature.js';
import { politicsDay, politicsSeason, politicsYear, onPeopleDied } from './politics.js';
import { initOrder, orderWeek, orderSeason, onCrime } from './order.js';
import { questsDay } from './quests.js';
import { onFamine } from './kinds-world.js';
import { jobsWeek } from './kinds-jobs.js';
import { initFrame, frameSeason, arcDay, rivalTakes, onKilled } from './frame.js';
import { serviceSeason, onQuestOver, wantedYear } from './service.js';

// ---- The story lane: quests and world events on the simulation core (docs/sim-story.md) ----
// Registered as the 'story' system: all its state is L.sys.story; it announces event.* (the world's big moves) and story.*
// (quests, rivals, his arc, the deaths and seizures it causes). Everything runs in onDay or slower, so time away is lived the same.
// Import this once (the game, a prototype, a test) after src/sim/index.js; it registers itself.

system({
  id: 'story', order: 70,   // after the economy, people and crime lanes (default 50), so the day's news is in when quests are made
  init(L) { initState(L); initNature(L); initOrder(L); initFrame(L); },
  onDay(L, cal, r) {
    natureDay(L, cal, r); politicsDay(L, cal, r);
    if (cal.day % 7 === 0) { orderWeek(L, cal, r); jobsWeek(L, cal, r); }
    questsDay(L, cal, r, rivalTakes); arcDay(L, cal);
  },
  onSeason(L, cal, r) { natureSeason(L, cal, r); politicsSeason(L, cal, r); orderSeason(L, cal, r); frameSeason(L, cal, r); serviceSeason(L, cal, r); },
  onYear(L, cal, r) { politicsYear(L, cal, r); wantedYear(L, cal, r); },
});

// ---- listening: our own events that make quests, and the other lanes' events by name ----
const live = L => L.sys.story && L.sys.story.reg;
const when = (type, fn) => on(type, (e, L) => { if (live(L)) fn(e, L); });
when('event.famine', onFamine);
when('story.killed', onKilled);
when('econ.famine', onEconFamine);
when('story.questResolved', onQuestOver); when('story.questEnded', onQuestOver);
when('people.died', onPeopleDied);
for (const t of ['crime.raid', 'crime.robbery', 'crime.murder', 'crime.bounty']) when(t, onCrime);

export { takeQuest, resolveQuest, waysOf, openQuests, quest, KINDS, WAYS } from './quests.js';
export { boardOf, newsSince } from './board.js';
export { taleOf, chapterOf, rivalName, CHAPTERS } from './frame.js';
export { ST as storyOf } from './state.js';
export { breakOath, WARNINGS } from './service.js';
