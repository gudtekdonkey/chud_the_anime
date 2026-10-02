import '../people/index.js';   // crime kills and inherits through the people lane: loading crime registers it (law.js imports only its death.js)
import { system } from '../ledger.js';
import { fresh, fadeBounties, driftStanding } from './law.js';
import { worldDay, huntersDay } from './world.js';
import { landSeason } from './land.js';
import './hooks.js';   // listens to the story and travel lanes

// ---- Karma, crime, bounties, title and possession: the crime lane on the simulation core (docs/sim-crime.md) ----
// Import this once (it registers the system); everything here runs in onDay or slower, so it works the same while he is away.
export * from './rules.js';
export * from './law.js';
export * from './land.js';
export { huntersDay } from './world.js';

system({
  id: 'crime', order: 60,
  init(L) { Object.assign(L.sys.crime, fresh()); },
  onDay(L, cal, r) { worldDay(L, cal, r); huntersDay(L, cal, r); fadeBounties(L, cal.day); driftStanding(L, cal.day); },
  onSeason(L, cal, r) { landSeason(L, r); },
});
