// ---- Every number the economy turns on, in one place. docs/sim-economy.md explains each one and what moving it does ----
// Prices are in mon. A game year is 112 days (src/sim/time.js), so a koku (one person's rice for a year) is 1/112 koku a day.

// Money (owner 2026-09-26: the historical names; 1 ryō = 1,000 mon to keep sums simple). Weights are real: a mon and a monme of
// silver are both about 3.75 g, a gold koban about 18 g. So 1,000 mon of copper (a kan) weighs 3.75 kg, the same worth in gold 18 g.
export const COIN = {
  mon:    { worth: 1,    grams: 3.75 },
  silver: { worth: 16,   grams: 3.75 },   // one monme of silver, by weight
  ryo:    { worth: 1000, grams: 18 },
};
export const KAN = 1000;                   // mon on one string
// What carried coin does to him (owner: carried money has weight). Tiers by kg of coin; the game reads burden().
export const LOAD = [
  { upto: 2,  name: 'light',      speed: 1,   dodge: true,  theft: 1 },   // about 530 mon of copper: nothing
  { upto: 6,  name: 'laden',      speed: .92, dodge: true,  theft: 1.5 }, // pickpockets notice the clink
  { upto: 12, name: 'heavy',      speed: .75, dodge: false, theft: 3 },   // no slide or jump
  { upto: 1e9, name: 'overloaded', speed: .5, dodge: false, theft: 5 },   // a string of kan on each shoulder: he crawls
];
export const MAX_CARRY_KG = 20;            // he cannot pick up coin past this
// The town money-changer (ryōgae): holds coin for a fee, changes coin for a fee. Fees go to the town's merchant guild.
export const BANK = { deposit: .01, perSeason: .005, exchange: .02, note: .03 };   // note: a changer's note, to draw the money in another town
// NPC purses change copper up to gold past this many mon, so fortunes weigh what they should
export const CHANGE_UP = 3000;

// Goods, first set. Append new ones at the end, never reorder (the ledger keeps them as arrays in this order).
// base: the price at the target stock. days: target stock in days of demand. eps: how hard price answers scarcity.
// rot: share of stock lost a day. cap: the guild buys no more past cap × target (the rest spoils where it was made).
export const GOODS = ['rice', 'fish', 'salt', 'sake', 'timber', 'iron', 'cloth', 'silk', 'weapons', 'horses', 'tools'];
export const GOOD = {
  rice:    { unit: 'koku',  base: 1000, days: 60, eps: .8, rot: .0015, cap: 4 },   // rot: rats, damp and mould, about 15% a year
  fish:    { unit: 'basket', base: 40,  days: 6,  eps: 1,  rot: .04,   cap: 3 },
  salt:    { unit: 'bale',  base: 300,  days: 60, eps: .8, rot: 0,     cap: 4 },
  sake:    { unit: 'to',    base: 120,  days: 30, eps: 1,  rot: .002,  cap: 3 },
  timber:  { unit: 'koku',  base: 100,  days: 30, eps: 1,  rot: 0,     cap: 3 },
  iron:    { unit: 'kan',   base: 50,   days: 40, eps: 1,  rot: 0,     cap: 3 },
  cloth:   { unit: 'tan',   base: 250,  days: 40, eps: 1,  rot: 0,     cap: 3 },
  silk:    { unit: 'tan',   base: 8000, days: 60, eps: 1.2, rot: 0,    cap: 3 },   // coloured silk: rank colour (owner), for royalty only
  weapons: { unit: 'blade', base: 2500, days: 40, eps: 1,  rot: 0,     cap: 3 },
  horses:  { unit: 'horse', base: 4000, days: 60, eps: 1,  rot: .001,  cap: 3 },
  tools:   { unit: 'piece', base: 60,   days: 40, eps: 1,  rot: 0,     cap: 3 },   // hoes, sickles, pots, nails
};
export const PRICE_MIN = .25, PRICE_MAX = 8;   // × base
export const PRICE_EASE = .2;                  // a day moves the price this share of the way to where the stock says
export const GUILD_CUT = .15;                  // the merchants' margin between what producers get and what buyers pay
export const GUILD_SPEND = .2;                 // a day, the guild spends at most this share of its free cash (and rice credit) buying rice
export const RICE_CREDIT = 150;               // mon a head: how far into debt a region's guild may go buying rice (rice bills)
export const SETTLE = 14;                      // regions settle one in SETTLE each day, SETTLE days at a time (cost / SETTLE)

// What everyone eats and wears, per person a day (a child under ADULT[0] counts as CHILD of a person)
export const CHILD = .5;
export const NEED = { rice: 1 / 112, fish: .02, salt: .0012, cloth: .004, timber: .01, tools: .012, iron: .004 };   // timber: firewood and charcoal too
export const WAR_RICE = 1.25;                  // an army eats: rice demand × this in a region at war
export const WAR_ARMS = { weapons: .004, horses: .0015 };   // the lord arms each fighter a day of war

// Jobs: what each one does all day. make: output per adult worker a day at the region's best land; use: inputs per unit of the first output.
export const JOBS = {
  farmer:     { kind: 'farm', make: { horses: .0025 } },   // rice comes at harvest (harvest.js); a few horses bred on open land
  rebel:      { kind: 'farm', make: { horses: .0015 } },
  fisher:     { kind: 'make', make: { fish: 3.5, salt: .12 } },
  woodcutter: { kind: 'make', make: { timber: .9 } },
  miner:      { kind: 'make', make: { iron: .3 } },
  smith:      { kind: 'make', make: { tools: .3, weapons: .008 }, use: { iron: .4 } },   // inputs are per unit of the first good
  weaver:     { kind: 'make', make: { cloth: .2, silk: .002 } },
  brewer:     { kind: 'make', make: { sake: .4 }, use: { rice: .05 } },
  merchant:   { kind: 'guild' },                             // a share of the guild's profit
  ronin:      { kind: 'hire', wage: 16 },                    // caravan guards, paid by the guild
  innkeeper:  { kind: 'service' }, carpenter: { kind: 'service' }, courier: { kind: 'service' }, healer: { kind: 'service' },
  monk:       { kind: 'temple' }, abbot: { kind: 'temple' },
  lord:       { kind: 'none' },                              // lives on the household: the lord's purse is taxes
  ashigaru:   { kind: 'stipend', wage: 7 }, guard: { kind: 'stipend', wage: 8 }, retainer: { kind: 'stipend', wage: 18 },   // stipends: mon a day from the lord
  magistrate: { kind: 'stipend', wage: 20 }, steward: { kind: 'stipend', wage: 18 }, 'tax collector': { kind: 'stipend', wage: 12 },
  'bounty hunter': { kind: 'stipend', wage: 8 }, shinobi: { kind: 'stipend', wage: 10 }, spy: { kind: 'stipend', wage: 10 },
  bandit:     { kind: 'rob', take: 14 }, smuggler: { kind: 'rob', take: 12 }, thief: { kind: 'rob', take: 10 },
};
export const ADULT = [14, 70];                 // working ages
export const MERCH_SHARE = .03;                // a day, the guild pays merchants this share of its cash past what it owes and its float
export const GUILD_FLOAT = 30;                 // mon a head the guild keeps in hand past what it owes its producers, before the merchants take their share
export const GUILD_START = 150;                // mon per person in the region when the world begins
export const TEMPLE_SHARE = .06;               // a day, monks draw this share of the temple's offerings
export const TEMPLE_SINK = .002;              // a day, this share of offerings leaves the world: gold leaf, bronze, incense (a money sink)
export const ALMS = .05;                       // a step, a temple spends up to this share of its offerings buying rice for the hungry of its region

// Spending above need: a household spends SPEND of its wealth above its reserve a day, split by its class's taste.
export const SPEND = .04;
export const RESERVE = { royal: 30000, noble: 5000, retainer: 800, ronin: 200, ashigaru: 200, monk: 60, commoner: 150, rebel: 100, outlaw: 100, shinobi: 300 };
// taste: goods by share of that spending; 'service' pays innkeepers, carpenters, couriers and healers; 'offering' goes to the temple
export const TASTE = {
  royal:    { silk: .35, sake: .1, horses: .1, weapons: .05, cloth: .05, service: .2, offering: .15 },
  noble:    { sake: .15, horses: .15, weapons: .15, cloth: .15, timber: .1, service: .15, offering: .15 },
  retainer: { sake: .25, weapons: .25, horses: .1, cloth: .15, service: .15, offering: .1 },
  ronin:    { sake: .4, weapons: .25, cloth: .1, service: .2, offering: .05 },
  ashigaru: { sake: .35, weapons: .1, cloth: .15, fish: .1, service: .2, offering: .1 },
  monk:     { cloth: .2, service: .2, offering: .6 },
  commoner: { sake: .25, fish: .15, cloth: .15, timber: .1, tools: .1, service: .15, offering: .1 },
  rebel:    { sake: .25, fish: .15, cloth: .15, timber: .1, tools: .1, weapons: .05, service: .1, offering: .1 },
  outlaw:   { sake: .5, weapons: .2, horses: .05, cloth: .05, service: .2 },
  shinobi:  { sake: .15, weapons: .3, cloth: .2, tools: .1, service: .15, offering: .1 },
};
// Buried and lost coin: each season, a household loses this share of its wealth above HOARD_OVER × its reserve (hoards buried and
// forgotten, coin dropped in rivers). It is a money sink the quests can dig back up (L.sys.economy.regions[r].buried).
export const HOARD = .005, HOARD_OVER = 4;
// The mint: lords of mining land coin new copper, a money source (per adult miner a day, into the region lord's purse)
export const MINT = 2;

// Land (owner: land yields koku per season by terrain and work; paddy best). Koku a year per tile of each ground.
// A plot is 16 × 16 tiles. Settlement zones ring their centre with field, or paddy in wet land (src/sim/zone.js).
export const KOKU_TILE = { paddy: .033, field: .019, grass: .002 };   // tuned so about 40% go short of rice (owner: hard times)
export const PLOTS_PER_FARMER = 2;             // one adult farmer works this many plots
export const TAX = { plot: .5, zone: .3 };     // the plot holder pays the zone lord half (five to the lord, five to the people: hard times, owner 2026-09-26); a zone lord pays his region lord 30%
// the plot tax where a culture of this kind rules (free valleys, leagues and temples tax lighter; outlaws take, they do not tax)
export const TAX_KIND = { rebels: .3, merchants: .4, monastic: .4, bandits: 0 };
export const TENANT_SHARE = .5;                // tenants working a plot they do not hold keep half
export const KEEP_DAYS = 1.15;                 // a farming household keeps rice for the days to the next harvest × this, and sells the rest
export const RICE_HOLD = 1.5;                  // the guild buys rice only while its stock is under this × its target (held rice rots)
export const HARVEST = { season: 2, low: .85, high: 1.15, drought: .06, droughtQ: [.3, .6], bumper: .06, bumperQ: [1.25, 1.4] };
export const FAMINE_DAYS = 5, FAMINE_END_DAYS = 20;   // famine when rice in the market is below this many days of demand

// Caravans (merchants moving goods between regions on the roads): every: days between weighing a road; value: mon of goods a load;
// minGain: the least margin worth the road; perZone: hauling cost a zone (share of the goods' worth); speed: zones a day; max: loads out of
// a region at once; rob: chance a day near a camp; guarded: × that chance with hired swords; near: zones from a camp that count as near
export const CARAVAN = { every: 7, value: 30000, minGain: .15, perZone: .012, speed: 4, max: 3, rob: .06, guarded: .3, near: 2 };
export const HISTORY = 8;                      // seasons of price history kept per region

// Land for sale (owner 2026-09-26: the lord grants no free plots; the economy sells them). A plot's asking price is YEARS of what its
// holder keeps of it (its koku less the plot tax) at the region's rice price, the price held to lo..hi × base so a famine winter does not
// price land at four times its worth. Each bidder past the plots on offer in a zone raises the price by `bid`, up to `maxBid` ×. A buyer
// pays from his own purse, then his house head's past that class's RESERVE. MIN_PRICE: no plot sells for less
export const LAND_SALE = { years: 1, lo: .5, hi: 2, bid: .1, maxBid: 1.5, minPrice: 200 };
