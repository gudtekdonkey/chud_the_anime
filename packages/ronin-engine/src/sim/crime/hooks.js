import { on, emit } from '../ledger.js';
import { CRIMES } from '../packs/edo/crime.js';
import { commit, addKarma, addStanding, addBounty, clearBounty, bountiesOf, spend, purse, cultureOfZone } from './law.js';
import { plotRec, raidStore } from './land.js';

// ---- What the other lanes tell the crime lane (docs/sim-story.md and docs/sim-travel.md, "what they need from crime") ----
// The story and travel move his karma themselves for what they resolve; crime adds the witnesses, the bounties and the land.

const regionCulture = (L, e) => e.region != null && L.regions[e.region] ? L.regions[e.region].culture : e.zone ? cultureOfZone(L, ...e.zone) : null;

// story.deed { actor, crime, victim, seen, zone, region }: his karma is already moved. Seen, the region's people (and a royal victim's) know
const STORY_CRIME = { theft: 'theft', robbery: 'theft', 'theft from royalty': 'theft', banditry: 'assault', treachery: 'assault', assault: 'assault',
  'robbery of royalty': 'assault', fraud: 'forgery', murder: 'murder' };
on('story.deed', (e, L) => {
  if (!L.sys.crime || e.actor == null || !L.actors[e.actor]) return;
  const kind = STORY_CRIME[e.crime] || 'assault', c = regionCulture(L, e), v = e.victim != null ? L.actors[e.victim] : null;
  const seenBy = e.seen ? [c, v && v.culture].filter(x => x != null) : [];
  // the story has already killed a murder's victim: commit only records it (a dead victim is not killed twice)
  commit(L, kind, { by: e.actor, victim: v ? v.id : null, zone: e.zone, seenBy, noKarma: true, culture: c, quiet: true });
});

// story.wanted { target, by, culture, regions, why, forever, renewed }: a bounty on him, and hunters (world.js sends them at 500 mon and up)
on('story.wanted', (e, L) => {
  if (!L.sys.crime || e.target == null || e.culture == null || e.renewed) return;
  addBounty(L, e.target, e.culture, e.forever ? CRIMES.regicide.bounty : CRIMES.murder.bounty, e.forever ? 'regicide' : 'murder', !!e.forever);
});

// story.seized { plot, holder, was, title, cause }: the story moved possession itself; crime keeps the contested record and the storehouse
on('story.seized', (e, L) => {
  const C = L.sys.crime; if (!C) return;
  const p = plotRec(L, e.plot);
  if (e.holder != null && L.actors[e.holder]) { const h = L.actors[e.holder]; if (!h.holds.includes(e.plot)) h.holds.push(e.plot); }
  const was = L.actors[e.was]; if (was && p.title !== was.id) { const i = was.holds.indexOf(e.plot); if (i >= 0) was.holds.splice(i, 1); }
  if (p.holder != null && p.title !== p.holder) C.contested[e.plot] = { title: p.title, holder: p.holder, from: e.was ?? null, since: L.hour, how: e.cause || 'story', crime: null, witnesses: [] };
  else delete C.contested[e.plot];
  C.stats.land.force++;
  raidStore(L, e.plot, e.holder);
});

// travel.deed { deed, karma, standing: { culture: delta }, witnesses, zone, region }: travel never writes karma or standing; crime does,
// on its scale (−100..100, travel's numbers as they come), and a crime some witness saw raises a bounty with their people
const TRAVEL_CRIME = { raided: 'theft', robbedMerchant: 'theft', robbedPilgrims: 'theft', robbedWounded: 'theft', keptHorse: 'theft',
  killedGuards: 'murder', fledGuards: 'trespass' };
on('travel.deed', (e, L) => {
  if (!L.sys.crime) return;
  const a = L.actors[e.actor ?? L.player]; if (!a) return;
  if (e.karma) addKarma(a, e.karma);
  for (const c in e.standing || {}) addStanding(L, a, +c, e.standing[c]);
  const kind = TRAVEL_CRIME[e.deed]; if (!kind) return;
  const cs = [...new Set((e.witnesses || []).map(id => L.actors[id]?.culture).filter(c => c != null))];
  for (const c of cs) addBounty(L, a.id, c, CRIMES[kind].bounty, kind);
});
// he paid the hunters on the road: that people's bounty is settled
on('travel.bountyPaid', (e, L) => { if (L.sys.crime && e.culture != null) clearBounty(L, L.player, e.culture); });
// he went quietly: the bounty is taken from his purse as a fine; what he cannot pay he works off in jail (days, for the game to play)
on('travel.surrender', (e, L) => {
  if (!L.sys.crime || e.culture == null) return;
  const a = L.actors[L.player], b = bountiesOf(L, a.id)[e.culture]; if (!b) return;
  const fine = Math.min(purse(a), Math.ceil(b.mon)); spend(a, fine);
  const days = Math.ceil((b.mon - fine) / JAIL_MON_A_DAY);
  if (!b.forever) clearBounty(L, a.id, e.culture);
  emit(L, 'crime.jailed', { actor: a.id, culture: e.culture, fine, days, forever: !!b.forever, zone: a.at });
});
export const JAIL_MON_A_DAY = 50;
