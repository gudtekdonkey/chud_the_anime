// ---- The numbers of a life: every age, rate, price and rule the people system uses, in one place to tune (docs/sim-people.md) ----
// Pure data and small pure functions. Proposals until the owner confirms them.

export const AGE = {
  WORK: 12,              // a child takes up a trade (job 'child' before)
  ADULT: 16,             // comes of age: may marry, inherits in his own right, may be played
  WED_M: [17, 55], WED_F: [16, 42], FERTILE: [16, 45],
  OLD: 55,               // deaths past this are mostly 'age'
};
export const VISITS = 2;         // each person is lived twice a year (a 56-day bucket), so a day costs about a hundred people

// yearly chance of dying of age or illness, by age: a harsh early life, then a long plateau, then a Gompertz climb
// (life expectancy at birth about 38, at 16 about 55; half of those who reach 16 see 60)
export function hazard(age) {
  if (age < 1) return .12; if (age < 5) return .025; if (age < 16) return .005;
  return .007 + .005 * Math.exp(.1 * (age - 40));     // 40: .012, 60: .044, 70: .107, 80: .28
}
// better fed, better doctored
export const CLASS_HAZARD = { royal: .7, noble: .75, retainer: .9, monk: .85 };
// yearly chance of a violent death, the baseline for the ledger's quiet fights and robberies; the crime and war lanes kill on top
// of it through killActor (and can lower these once they do)
export const VIOLENCE = { outlaw: .035, ronin: .02, shinobi: .02, ashigaru: .012, retainer: .01, rebel: .008 };
export const VIOLENCE_OTHER = .0015;
// famine: extra yearly hazard at fed 0 (children and elders twice as likely), falling linearly to nothing at fed FAMINE_FROM (a lean year
// below that is felt; a bare one kills)
export const FAMINE = .25, FAMINE_FROM = .9;
export const CHILDBIRTH = .012;  // a mother's death at a birth

// births: a married woman living with her husband conceives with this chance a visit (half a year), times the factors below; a birth comes 3 seasons later
export const CONCEIVE = .36;
export const conceiveAge = age => age < 20 ? .8 : age < 32 ? 1 : age < 38 ? .7 : age < 42 ? .4 : .15;
export const conceiveKids = alive => alive < 2 ? 1.1 : alive < 4 ? .85 : alive < 6 ? .5 : .2;
// density: fewer children as a settlement nears what its land can feed, more when it has room (the population's thermostat)
export const conceiveRoom = dens => Math.max(.05, Math.min(1.5, 2.2 - 1.8 * dens));
export const GESTATION = 3;      // seasons

// marriage market, in spring and autumn, per region: the chance an eligible single woman finds a match this half-year
export const WED_CHANCE = .65, REWED_CHANCE = .32;   // a widow or widower remarries less readily
export const WED_RANK_GAP = 1;                      // families marry within one rank
export const MUKOYOSHI = .6;                        // a sonless house of a clan, court or league takes a younger son in as its heir, under its name

// a household needs a plot to stand on its own: the lord grants a free plot to a new couple, or sells one to an ambitious head
export const PLOT_PRICE = { village: 3000, town: 6000 };  // mon
export const HOUSE_PLOTS = 15;                             // plots 1..15 of a settlement zone are homes and fields; plot 0 is the lord's

// what a settlement's land feeds, in people, from its biome (per zone); a town is a seat with a market and feeds more
export const FEEDS = { paddy: 1.35, plains: 1.15, coast: 1.1, forest: .95, bamboo: .95, hills: .9, marsh: .85, mountains: .75 };
export const CAP = { village: 22, town: 42 };
// harvest: a region's yield each year, around 1; below FAMINE_AT a settlement is starving
export const HARVEST = { mean: 1.02, spread: .14, blight: .03, blightCut: .45 };
export const FAMINE_AT = .75;
// garrisons, bands and temples keep their numbers by recruiting from their region's villages
export const KEEP = { fort: [5, 8], camp: [5, 8], shrine: [1, 3] };

// bride price (yuinō) in mon, by the bride's class: the groom's house pays the bride's; a ronin's is small, a noble's a fortune
export const BRIDE_PRICE = { royal: 500000, noble: 60000, retainer: 12000, shinobi: 3000, ashigaru: 2000, ronin: 1500, commoner: 1000, rebel: 800, outlaw: 500, monk: 0 };
export const SILVER_MON = 16, RYO_MON = 1000;   // 60 monme to the ryō, 1 ryō = 1,000 mon (docs/foundations.md)
export const worth = m => (m.mon || 0) + (m.silver || 0) * SILVER_MON + (m.ryo || 0) * RYO_MON;

// ---- inheritance: who takes the land, the house and the money when a holder dies (owner 2026-09-26: land and wealth pass to heirs) ----
// order: the rules tried in turn; the first that finds a living person wins.
//   named     his chosen heir (actor.heir), if living
//   son       eldest living son          daughter  eldest living daughter      child  eldest living child
//   grandson  eldest son of a dead son (the line runs through the sons)          grandchild  eldest child of a dead child
//   widow     his living wife (or her living husband): holds in her own right   brother / sibling  eldest living one
// split: 'heir' (the heir takes the money too, the widow keeps a third), 'equal' (money split among the living children and the widow)
// A minor heir takes the title at once, but the plot's holder is a regent (the widow, else the eldest adult kin) until he comes of age.
// No heir: the land goes to the lord above (the region's lord), or to nature where no lord rules.
export const INHERIT = {
  clan:      { order: ['named', 'son', 'grandson', 'brother', 'daughter', 'widow'], split: 'heir' },
  court:     { order: ['named', 'son', 'grandson', 'brother', 'daughter', 'widow'], split: 'heir' },
  merchants: { order: ['named', 'son', 'daughter', 'widow', 'grandchild', 'brother'], split: 'heir' },
  shinobi:   { order: ['named', 'child', 'grandchild', 'sibling'], split: 'heir' },
  fishers:   { order: ['son', 'daughter', 'widow', 'grandchild', 'sibling'], split: 'equal' },
  miners:    { order: ['son', 'daughter', 'widow', 'grandchild', 'sibling'], split: 'equal' },
  rebels:    { order: ['named', 'widow', 'child', 'grandchild', 'sibling'], split: 'equal' },
  monastic:  { order: ['named', 'child', 'widow', 'grandchild', 'sibling'], split: 'equal' },
  bandits:   { order: ['son', 'child', 'widow', 'sibling'], split: 'equal' },
  // the ronin's line (he has no culture): whom he names, else his children; a widow holds for a child but never plays
  player:    { order: ['named', 'son', 'child', 'grandchild'], split: 'heir' },
};

// ---- daily lives, run only near him (onHour): [from hour, what, where] ----
const FIELD = [[0, 'sleep', 'home'], [5, 'eat', 'home'], [6, 'work', 'field'], [12, 'eat', 'field'], [13, 'work', 'field'], [18, 'eat', 'home'], [19, 'rest', 'home'], [21, 'sleep', 'home']];
const SHOP = [[0, 'sleep', 'home'], [6, 'eat', 'home'], [7, 'work', 'shop'], [12, 'eat', 'home'], [13, 'work', 'shop'], [18, 'eat', 'home'], [19, 'drink', 'inn'], [22, 'sleep', 'home']];
const WATCH_DAY = [[0, 'sleep', 'barracks'], [5, 'eat', 'barracks'], [6, 'watch', 'post'], [18, 'eat', 'barracks'], [19, 'rest', 'barracks'], [21, 'sleep', 'barracks']];
const WATCH_NIGHT = [[0, 'watch', 'post'], [6, 'eat', 'barracks'], [7, 'sleep', 'barracks'], [15, 'eat', 'barracks'], [16, 'drill', 'yard'], [18, 'watch', 'post']];
export const SCHEDULES = {
  field: FIELD, shop: SHOP, watchDay: WATCH_DAY, watchNight: WATCH_NIGHT,
  inn: [[0, 'work', 'inn'], [2, 'sleep', 'home'], [9, 'eat', 'home'], [10, 'work', 'inn']],
  night: [[0, 'prowl', 'road'], [4, 'eat', 'camp'], [5, 'sleep', 'camp'], [14, 'eat', 'camp'], [15, 'drill', 'camp'], [18, 'drink', 'camp'], [21, 'prowl', 'road']],
  temple: [[0, 'sleep', 'temple'], [4, 'pray', 'shrine'], [6, 'eat', 'temple'], [7, 'work', 'temple'], [12, 'eat', 'temple'], [13, 'work', 'temple'], [17, 'pray', 'shrine'], [19, 'sleep', 'temple']],
  court: [[0, 'sleep', 'hall'], [7, 'eat', 'hall'], [9, 'court', 'hall'], [12, 'eat', 'hall'], [13, 'court', 'hall'], [17, 'walk', 'village'], [19, 'eat', 'hall'], [22, 'sleep', 'hall']],
  road: [[0, 'sleep', 'inn'], [5, 'eat', 'inn'], [6, 'travel', 'road'], [18, 'eat', 'inn'], [19, 'drink', 'inn'], [22, 'sleep', 'inn']],
  child: [[0, 'sleep', 'home'], [6, 'eat', 'home'], [7, 'play', 'village'], [12, 'eat', 'home'], [13, 'help', 'field'], [18, 'eat', 'home'], [20, 'sleep', 'home']],
  elder: [[0, 'sleep', 'home'], [6, 'eat', 'home'], [7, 'sit', 'village'], [12, 'eat', 'home'], [13, 'sit', 'home'], [18, 'eat', 'home'], [20, 'sleep', 'home']],
};
export const JOB_SCHEDULE = {
  farmer: 'field', fisher: 'field', woodcutter: 'field', miner: 'field', rebel: 'field',
  smith: 'shop', merchant: 'shop', carpenter: 'shop', weaver: 'shop', brewer: 'shop', steward: 'shop', spy: 'shop',
  innkeeper: 'inn', guard: 'watch', ashigaru: 'watch', retainer: 'watch',
  bandit: 'night', smuggler: 'night', thief: 'night', shinobi: 'night',
  monk: 'temple', abbot: 'temple', healer: 'temple',
  lord: 'court', magistrate: 'court', 'tax collector': 'court',
  courier: 'road', ronin: 'road', 'bounty hunter': 'road',
};

// ---- needs: what a person lacks, 0 (desperate) .. 1 (want for nothing) ----
// money is measured against what the class expects to have
export const PURSE_NORM = { royal: 50000, noble: 20000, retainer: 800, ronin: 200, ashigaru: 120, monk: 30, commoner: 160, rebel: 60, outlaw: 250, shinobi: 350 };
// a season's living, in mon: what a working adult earns and spends (the economy lane can switch this off: L.sys.people.wages = false)
export const EARN = { royal: 6000, noble: 2500, retainer: 250, ronin: 60, ashigaru: 50, monk: 10, commoner: 55, rebel: 35, outlaw: 70, shinobi: 110 };
export const SPEND = { royal: 5000, noble: 2000, retainer: 200, ronin: 55, ashigaru: 45, monk: 8, commoner: 45, rebel: 30, outlaw: 60, shinobi: 90 };

// ---- relationships: ties to people outside the family, actor.ties = [[id, kind, value -1..1]] (ties.js) ----
export const TIES = { MAX: 6, MEET: .15, FRIEND: .35, FADE: .02, GRUDGE_FADE: .004, DROP: .08 };
