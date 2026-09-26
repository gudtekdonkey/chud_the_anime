// ---- Dominion's tables: the ladder's names, settlement tiers, buildings, units, laws, offices, and every tuning number (docs/sim-dominion.md) ----
// Plain data. Every number here is a starting value to tune in play; change them on purpose, never as a side effect.

// the ladder (defaults 1: English names with the Japanese in brackets)
export const LADDER = [
  { id: 'plot', name: 'plot' }, { id: 'estate', name: 'estate' }, { id: 'zone', name: 'zone', jp: 'mura' },
  { id: 'domain', name: 'domain', jp: 'han' }, { id: 'province', name: 'province', jp: 'kuni' }, { id: 'realm', name: 'realm' },
];

// settlement tiers: homes (home units), buildings it must have, people, on a road, trade with n towns. -1 is no settlement (no homes)
export const TIERS = [
  { id: 'homestead', name: 'homestead', homes: 1 },
  { id: 'hamlet', name: 'hamlet', homes: 3, need: { well: 1 } },
  { id: 'village', name: 'village', homes: 8, need: { shrine: 1, storehouse: 1 }, pop: 30 },
  { id: 'town', name: 'town', homes: 20, need: { market: 1, inn: 1, smithy: 1 }, pop: 80, road: true },
  { id: 'city', name: 'city', homes: 40, need: { wall: 1, temple: 1, magistrate: 1 }, pop: 200, trade: 3 },
  { id: 'castle', name: 'castle town', homes: 40, need: { keep: 1 }, pop: 200, seat: true },
];
export const tierName = t => t < 0 ? 'no settlement' : TIERS[t].name;

// Buildings. fam: family; w × h: footprint in tiles ('ring' buildings run round the settlement, no tile pick); cost: materials + mon;
// labour: labour-days; needs: other buildings standing in the same settlement, tier: lowest tier to build it; workers: people to run it;
// upkeep: mon a season; the rest are effects (homes, cap people, koku a year, walls, unrest, train, equip, trade mon a season, labour ×).
const B = (fam, w, h, cost, labour, o = {}) => ({ fam, w, h, cost, labour, workers: 0, upkeep: Math.round((cost.mon || 0) * .02), ...o });
export const BUILDINGS = {
  // homes: people live here; homes cap the population
  hut:        B('home', 2, 2, { timber: 3, mon: 20 }, 6, { homes: 1, cap: 4, upkeep: 0 }),
  house:      B('home', 3, 2, { timber: 6, tiles: 2, mon: 60 }, 14, { homes: 1, cap: 6, upkeep: 0 }),
  longhouse:  B('home', 5, 2, { timber: 14, tiles: 4, mon: 150 }, 30, { homes: 3, cap: 16, tier: 1, upkeep: 0 }),
  manor:      B('home', 5, 4, { timber: 24, stone: 8, tiles: 10, mon: 1200 }, 80, { homes: 1, cap: 10, tier: 2, standing: .05 }),
  // food
  well:       B('food', 1, 1, { stone: 4, mon: 20 }, 5, { upkeep: 0 }),
  paddy:      B('food', 4, 4, { mon: 30 }, 20, { koku: 12, workers: 3, upkeep: 0, ground: ['grass', 'field', 'paddy', 'marsh'] }),
  orchard:    B('food', 4, 4, { timber: 2, mon: 40 }, 12, { koku: 6, workers: 1, upkeep: 0 }),
  granary:    B('food', 3, 3, { timber: 10, tiles: 4, mon: 120 }, 20, { store: 60 }),
  weir:       B('food', 2, 2, { timber: 6, mon: 40 }, 10, { koku: 8, workers: 2, upkeep: 0 }),
  storehouse: B('food', 3, 3, { timber: 8, stone: 4, tiles: 4, mon: 100 }, 20, { safe: true }),   // the kura: keeps the treasury and rice safe from raids
  // craft
  sawmill:    B('craft', 4, 3, { timber: 10, stone: 2, iron: 2, mon: 200 }, 30, { workers: 3, labourX: .15, tier: 1 }),
  kiln:       B('craft', 3, 3, { stone: 10, mon: 120 }, 20, { workers: 2, tier: 1 }),
  smithy:     B('craft', 3, 3, { timber: 6, stone: 6, iron: 4, mon: 250 }, 25, { workers: 2, equip: .002, tier: 1 }),
  brewery:    B('craft', 3, 3, { timber: 8, mon: 180 }, 20, { workers: 2, trade: 60, unrest: -.02, tier: 2 }),
  weaver:     B('craft', 3, 2, { timber: 6, mon: 120 }, 15, { workers: 2, trade: 50, tier: 1 }),
  // trade
  market:     B('trade', 4, 4, { timber: 8, tiles: 4, mon: 300 }, 25, { workers: 2, trade: 3, appeal: .08, tier: 2 }),   // trade: mon a season per person
  inn:        B('trade', 4, 3, { timber: 12, tiles: 6, mon: 250 }, 30, { workers: 2, trade: 80, appeal: .04, tier: 2 }),
  warehouse:  B('trade', 4, 3, { timber: 12, tiles: 6, mon: 300 }, 30, { workers: 1, trade: 120, tier: 3 }),
  changer:    B('trade', 2, 2, { timber: 4, stone: 4, mon: 500 }, 15, { workers: 1, trade: 150, needs: { market: 1 }, tier: 3 }),
  tollgate:   B('trade', 2, 1, { timber: 4, mon: 80 }, 8, { workers: 1, toll: 2, road: true }),                                // toll: mon a season per person
  // faith
  shrine:     B('faith', 2, 2, { timber: 4, mon: 80 }, 10, { unrest: -.03 }),
  temple:     B('faith', 5, 4, { timber: 20, stone: 10, tiles: 12, mon: 1500 }, 90, { unrest: -.06, needs: { shrine: 1 }, tier: 3, monks: 4, standing: .05 }),
  // order
  magistrate: B('order', 4, 3, { timber: 12, stone: 4, tiles: 6, mon: 600 }, 40, { workers: 2, unrest: -.05, tier: 3 }),
  board:      B('order', 1, 1, { timber: 1, mon: 5 }, 1, { upkeep: 0 }),
  jail:       B('order', 3, 2, { timber: 6, stone: 6, iron: 2, mon: 200 }, 20, { workers: 1, unrest: -.02, tier: 2 }),
  // war
  barracks:   B('war', 5, 3, { timber: 14, tiles: 6, mon: 400 }, 40, { train: .002, tier: 1 }),
  dojo:       B('war', 4, 4, { timber: 12, tiles: 8, mon: 500 }, 40, { workers: 1, train: .004, tier: 2 }),
  stable:     B('war', 4, 3, { timber: 10, mon: 250 }, 25, { workers: 2, speed: .25, tier: 1 }),
  watchtower: B('war', 2, 2, { timber: 6, mon: 80 }, 12, { walls: .2 }),
  palisade:   B('war', 'ring', 0, { timber: 40, mon: 200 }, 60, { walls: 1 }),
  gate:       B('war', 3, 2, { timber: 6, stone: 6, iron: 4, mon: 200 }, 20, { walls: .5, needsAny: ['palisade', 'wall'] }),
  wall:       B('war', 'ring', 0, { stone: 120, mon: 2500 }, 240, { walls: 2, tier: 3 }),
  keep:       B('war', 8, 8, { stone: 200, timber: 60, tiles: 40, iron: 20, mon: 12000 }, 600, { walls: 1.5, needs: { wall: 1 }, tier: 4, standing: .1 }),
};
export const HOME_TYPES = Object.keys(BUILDINGS).filter(t => BUILDINGS[t].fam === 'home');

// units: pow (battle strength a man), wage (mon a day), rice (koku a year a man), cost (mon to recruit a man), from: where they come from
export const UNITS = {
  ashigaru: { pow: 1, wage: 4, rice: 1, cost: 100, weapons: ['yari', 'bow'], from: 'commoners of your land' },
  retainer: { pow: 2.6, wage: 25, rice: 1.5, cost: 600, weapons: ['katana', 'daisho'], from: 'the samurai class, sworn to you' },
  ronin:    { pow: 2, wage: 18, rice: 1, cost: 300, weapons: ['katana', 'nodachi'], from: 'paid swords at an inn' },
  monk:     { pow: 1.8, wage: 2, rice: .8, cost: 0, weapons: ['naginata', 'bo'], from: 'a temple\'s alliance' },
  shinobi:  { pow: 1.2, wage: 30, rice: 1, cost: 800, weapons: ['tanto', 'kusarigama'], from: 'hired for secret work', siege: .15 },
  bandit:   { pow: 1.3, wage: 0, rice: 1, cost: 0, weapons: ['katana', 'kanabo'], from: 'an outlaw camp' },
  rebel:    { pow: .8, wage: 0, rice: 1, cost: 0, weapons: ['naginata', 'kama'], from: 'a rising' },
};
export const MILITIA = .5;   // a settlement's own defenders (a tenth of its people) fight at this strength a head
// squads under an officer take simple orders when he is at the battle (default 2)
export const ORDERS = ['hold', 'charge', 'follow', 'fallback'];

// laws: each changes unrest, yield, recruiting or money (docs/dominion.md section 4)
export const LAWS = {
  noArms:   { name: 'ban weapons for commoners', unrest: .02, riot: -.08, rebels: .5 },
  curfew:   { name: 'curfew', unrest: .03, riot: -.1, yield: -.05 },
  toll:     { name: 'road toll', unrest: .03, toll: 3, appeal: -.05 },
  amnesty:  { name: 'amnesty', unrest: -.08, ronin: 2, karma: 2 },
  conscript:{ name: 'conscription', unrest: .08, levy: 2, yield: -.05 },
};
export const OFFICES = ['steward', 'magistrate', 'general', 'envoy'];

// traits (src/traits/traits.js names) as they bear on ruling and war
export const TRAIT = {
  greedy: ['vain', 'cocky', 'menacing', 'drunk'],                                   // tax harder, skim if placed in office
  kind: ['humble', 'serene', 'monk', 'calm', 'cheerful'],                           // tax lighter, honest
  bold: ['proud', 'cocky', 'menacing', 'brawler', 'eager', 'duelist', 'restless'],   // quicker to war
  steady: ['soldier', 'veteran', 'stoic', 'calm', 'grim', 'duelist'],                // good generals
  poor: ['drunk', 'lazy', 'nervous', 'slouch', 'twitchy', 'melancholy'],           // poor officers
  sly: ['shinobi', 'shadow', 'wary', 'glancer', 'scholar'],                         // good envoys
};
// round to 3 places without a trip through a string (hot loops)
export const r3 = x => Math.round(x * 1000) / 1000;
export const traitSum = (a, list) => (a.traits || []).reduce((s, [t, w]) => s + (list.includes(t) ? w : 0), 0);

// every other number
export const N = {
  REACH: 6,               // zones: a domain's zones join if each is this close (Chebyshev) to another of them (settled zones sit ≥ 4 apart)
  YIELD_PER_HEAD: 1.8,    // koku a year a person of a settlement grows: enough to eat at the usual tax, hungry above half (stand-in for the economy lane)
  EAT: 1,                 // koku a year a person eats
  HOME_POP: 5,            // people a home unit holds when the type does not say
  LABOUR: .05,            // labour-days a day per person of a settlement (corvée) on its lord's building
  CREW_WAGE: 8,           // mon a day a hired worker
  MATERIAL: { timber: 30, stone: 40, iron: 200, tiles: 15 },   // mon a unit (stand-in until the economy lane's prices)
  RICE_PRICE: 1000,       // mon a koku (stand-in)
  SILVER: 80,             // mon a monme of silver (stand-in)
  TAX: .35, TAX_MIN: .1, TAX_MAX: .7,
  VASSAL_SHARE: .1,       // of a vassal lord's tax that goes to his liege
  SEASONS: 4,
  LEVY: .12,              // share of a settlement's people who can be ashigaru each season (conscription doubles it)
  UNREST_STEP: .35,       // how far unrest moves toward its target each season
  PETITION: .5, RIOT: .65, UPRISING: .8, UPRISING_LOYALTY: .35,
  LOYAL: .55, RESTLESS: .3,
  TRUCE_DAYS: 224,        // two years after a peace
  WAR_MAX_DAYS: 336,      // three years and exhaustion forces a white peace
  PEACE_SCORE: 60,
  MARCH_ROAD: 3, MARCH_OFF: 1.5,   // zones a day
  SIEGE_STORE: 30,        // days a settlement holds out on its own stores (+ a granary's store)
  TRAIN_DECAY: .0005,
  DESERT_AFTER: 7, BANDIT_AFTER: 30,
  DEATH: [[40, .01], [55, .03], [65, .07], [200, .15]],   // lords' yearly death chance by age (stand-in until the people lane)
};
