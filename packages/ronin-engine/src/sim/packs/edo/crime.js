// ---- Crime and karma: the numbers (docs/sim-crime.md). Plain data; every tuning value of the crime lane lives here ----

// Crimes from light to worst (docs/foundations.md "Crime and karma"; forgery added as the deed mechanic's crime, a proposal).
// karma: what it costs who he is (−100..100); bounty: mon a witnessing culture puts on him; standing: what that culture thinks
// of him drops by this (−1..1); fade: share of the bounty that fades each day (0: never fades, never paid off).
export const CRIMES = {
  trespass:  { rank: 0, karma: -1,  bounty: 20,    standing: -.03, fade: .05 },
  theft:     { rank: 1, karma: -3,  bounty: 60,    standing: -.08, fade: .02 },
  forgery:   { rank: 2, karma: -4,  bounty: 300,   standing: -.1,  fade: .01 },
  assault:   { rank: 3, karma: -6,  bounty: 150,   standing: -.15, fade: .012 },
  murder:    { rank: 4, karma: -15, bounty: 1000,  standing: -.35, fade: .004 },
  plotMurder:{ rank: 5, karma: -25, bounty: 3000,  standing: -.5,  fade: .003 },   // taking a plot by murder
  regicide:  { rank: 6, karma: -35, bounty: 10000, standing: -.8,  fade: 0 },      // killing an elder (60 or older) or royalty; forgiven only a royal killer
};
export const KINDS_BY_RANK = Object.keys(CRIMES).sort((a, b) => CRIMES[a].rank - CRIMES[b].rank);
export const worse = (a, b) => (!a ? b : !b ? a : CRIMES[a].rank >= CRIMES[b].rank ? a : b);

export const K = {
  KARMA_MIN: -100, KARMA_MAX: 100,
  MONSTER: -40,          // killing someone this low costs half the karma: nobody mourns a monster
  JUSTICE: .3,           // killing a man his own witnesses want: this share of the karma, and no bounty from them
  THEFT_SHARE: .5,
  MASK_SEE: .3,          // a witness close by sees through a mask this often (owner 2026-09-26)       // a theft's bounty grows by this share of what was taken
  ADULT: 18,            // children stay at home until 18, unseen (owner 2026-09-26): never a culprit, victim, witness or hunter
  ELDER_AGE: 60,         // killing someone this old is killing an elder
  // standing: fast. It moves toward a baseline set by karma (who he is) by this share of the gap each day
  STANDING_DRIFT: .02, STANDING_FROM_KARMA: 1 / 200,
  ALLY_HEARS: .3, FOE_CHEERS: .2, REL_STRONG: .5,   // cultures close to the victim's feel a share of it; its enemies like it
  BOUNTY_GONE: 5,        // a bounty under this is dropped
  // who acts on a bounty or low standing when they see him
  ATTACK_BOUNTY: 500, ATTACK_STANDING: -.6, ARREST_BOUNTY: 1, WARY_STANDING: -.3,
  // paying off: the magistrate takes the bounty; a shrine takes more and eases karma a little
  MAGISTRATE: 1, MAGISTRATE_STANDING: .1, SHRINE: 1.5, SHRINE_KARMA: 2, PENANCE_PER_KARMA: 100, PENANCE_CAP: 5,
  // outlaw doors
  BANDITS_DEAL: -20, BANDITS_JOIN: -40, BANDITS_HATE: 20,
  // hunters: sent while a bounty is this big, at most this many at once, one zone a day, home after a season
  HUNT_BOUNTY: 500, HUNT_MAX: 3, HUNT_PER_MON: 1 / 20000, HUNT_CAP: .2, HUNT_DAYS: 112, HUNT_GIVE_UP: 200,
};

// Land: possession and title (owner 2026-09-26: raids take possession, never the title). Days and chances per season.
export const LAND = {
  PRICE: 2000,             // mon: a plot's title bought outright (the economy lane will price it from its yield)
  OCCUPIED_DISCOUNT: .4,   // a title whose land someone else holds sells for this share: the seller cannot use it
  BLOOD_MONEY: 1000,       // paid to the dead man's heir, it buys the title of land taken by murder
  PRESCRIPTION_YEARS: 3,   // held this long with nobody alive to claim it: the title passes to the holder
  COURT_YEARS: 3,          // a claimant with no living witness loses in court after this long
  GRANT_STANDING: .3,      // a lord grants an unclaimed plot to a holder his people think this well of
  // seasonal chances for contested land off screen
  KIN_RAID: .12, LORD_RAID: .1, SALE: .05, BLOOD: .04, COURT: .1, FORGE: .02, EXPOSE: .15, EXPOSE_YEARLY: .7, GRANT: .25,
  // a forged deed comes out each season with EXPOSE × EXPOSE_YEARLY ^ years since: less and less likely every year (owner 2026-09-26)
  WITNESS_KEEP: 5,         // witnesses of a taking remembered by the contested record
};

// Off-screen crime, per region per day, for a region of NORM people (docs/sim-crime.md "The world without him")
export const WORLD = {
  NORM: 70,
  // a violent time (owner 2026-09-26): about this share of the people die by the sword each year (murders, feuds, raids, executions).
  // The people lane's births must keep up, or the land empties
  VIOLENCE: .3, MURDER_SHARE: .9,
  THEFT: .055, ASSAULT: .02, PLOT_MURDER: .0005, REGICIDE: .00003, FEUD: .004,
  FEUD_ACT: .03, FEUD_MURDER: .3, FEUD_COOL: .01,
  RAID: .02, RAID_REACH: 10, RAID_KILL: .3, RAID_SEIZE: .05, RAID_TAKE: [.2, .4],
  // how much crime each culture kind breeds
  KIND: { clan: 1, court: .7, rebels: 1.2, monastic: .4, bandits: 2, shinobi: 1.1, merchants: 1.3, fishers: .8, miners: 1 },
  // the chance someone sees it, by the place
  SEEN: { town: .8, village: .6, fort: .9, shrine: .5, camp: .3, wild: .15 },
  MASK: { outlaw: .5, shinobi: .6 }, MASK_ELSE: .08, CLOSE: .5,
  CATCH: .004, CATCH_HOME: .004, CATCH_CHIEF: .3, EXECUTE: .7,
};

// Karma is shown to the player (owner 2026-09-26): a name for each band
export const KARMA_NAMES = [[60, 'saint'], [25, 'honourable'], [-25, 'wanderer'], [-60, 'outlaw'], [-Infinity, 'demon']];
export const karmaName = k => KARMA_NAMES.find(([at]) => k >= at)[1];

// Honour, for companions (they refuse or leave a low-karma leader) and for who turns to crime: traits from src/traits/traits.js
export const HONOUR = { soldier: 1, stoic: .6, monk: 1, serene: .8, humble: .7, regal: .5, veteran: .6, scholar: .5, calm: .3,
  menacing: -1, cocky: -.5, brawler: -.6, drunk: -.5, shadow: -.4, twitchy: -.3 };
// a companion leaves when the leader's karma falls under LEAVE_AT + honour × LEAVE_PER; refuses to join JOIN_MARGIN earlier
export const COMPANION = { LEAVE_AT: -60, LEAVE_PER: 50, JOIN_MARGIN: 10 };
