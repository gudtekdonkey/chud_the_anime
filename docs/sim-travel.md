# Travel: the roads and random events (`src/sim/travel/`)

The travel lane (docs/sim-core.md): `L.sys.travel`, events `travel.*`, prototype 41. Built on the owner's decisions of 2026-09-26 (docs/foundations.md): random events while travelling (ambushes, merchants and pilgrims, a wounded man asking for help, weather that turns), **no true story behind the glitch powers**, and real time while away. Glitch storms were here once and are gone (owner 2026-10-02: no glitch in the world or the story; see the end of this page).

- **While he is away** (`onDay`, so a long absence moves them too): each region's road danger and weather, outlaw bands walking out of their camps and home again.
- **While he travels** (live): the game calls `enterZone(L, x, y)` each time he crosses into a zone. Now and then it returns a **scene**: a small encounter with choices; `choose(L, id, result)` plays the choice out and tells the world through `emit()`.

`node scripts/travel-year.mjs [seed] [years]` lives a world for a year with a ronin walking the roads town to town (four zones a game hour by day, sleeping at night) and prints how often each encounter came up, by region and by culture kind, and what the chances say for every road zone at once. `prototypes/41-travel.html` (sources in `prototypes-src/41-travel/`) walks him across the map at game scale.

## Files

| File | What it does |
|---|---|
| `index.js` | Registers the `travel` system (order 60); `enterZone`, `choose`, `openScene`, `news`, `SCENES`; listens to `econ.famine`, `crime.bounty`, `crime.bountyCleared`. Import it before `generateWorld()` / `loadWorld()` |
| `roads.js` | Region danger and weather (onDay), outlaw bands (`bandNear`), camp recount each season |
| `encounters.js` | `TRAVEL` (the tuning), `context` (everything a chance reads), `chanceAt`, `ENCOUNTERS` (the weights), `pickType` |
| `kit.js` | What scenes share: finding real people for a scene, strangers when there are none, fights, being beaten |
| `scenes-road.js` | Ambush, war party (raiders), bounty hunters, checkpoint / patrol, duelist |
| `scenes-meet.js` | Merchant, pilgrims, wounded stranger, funeral, runaway horse, the weather turning |

## The API

```js
import './src/sim/travel/index.js';                    // registers the system: before generateWorld / loadWorld
import { enterZone, choose, openScene } from './src/sim/travel/index.js';

const sc = enterZone(L, x, y);        // he has just crossed into zone (x, y): a scene, or null
// sc = { id, type, title, text, zone, region, culture, who: [{ id | null, name, cls, weapon, culture, job, fighter? }], choices: [{ id, label }], data }
const out = choose(L, 'fight', { won: true, slain: ['a123'] });   // result: the live game's fight, when the choice was a fight; omitted, it is rolled
// out = { text, mon, hours, loot, deeds, fight, events, again?, next?, news?, hurt? }
advance(L, out.hours || 0, true);     // the caller moves the clock (a night in a cell, waiting out the weather)
```

- A scene stays in `L.sys.travel.scene` (saved with the world) until a choice is made; `enterZone` returns it again until then. `out.again` means the scene goes on with new choices (the caught horse); `out.next` is a scene that follows at once (the wounded man was bait: an ambush).
- `who` are **real people from the ledger** wherever the ledger has them: the band's own men, the nearest camp's outlaws, a hostile people's fighters, that people's bounty hunters, the region's guards, its merchants and ronin, and the dead at a funeral is someone of the region who died this week. Where the ledger has nobody, a named stranger (`id: null`). The game spawns them by id and answers with `{ won, slain }`.
- `openScene(L, type, x, y)`: a scene on purpose, for the story lane's world events and quests, and for tests.

## What is in the ledger (`L.sys.travel`)

| Field | What |
|---|---|
| `regions[id]` | `{ danger 0..1, base, camps, weather, wxDays, famine (days left), biome }` |
| `camps` | `[[x, y]]` every camp, recounted each season |
| `bands` | `[{ id, culture, region, camp, at, goal, members: [actor ids], days }]` outlaw bands on the road |
| `heat` | `{ cultureId: mon }` the bounties on him, mirrored from `crime.bounty` |
| `scene`, `escort`, `safeUntil`, `quiet`, `steps`, `met` | the live state: the scene he is in, a merchant he escorts, walking with pilgrims, the quiet zones after an encounter, the live stream counter, a tally by type |

About 11 KB. A day away costs about 0.15 ms (a year in about 16 ms); `enterZone` about 0.06 ms.

**Fields on other records.** Travel writes only two shared facts: a person killed on the road gets `alive: false` and `died: L.hour` (existing fields), with a `travel.slain` event; and money moves on `actor.money.mon` (his purse, a robbed merchant's, the purses of the dead he takes). Karma and standing it never touches (below).

## Chances (starting numbers, open to tuning)

Per zone crossed (about 25 real seconds on foot): base 6% on a road, 4.5% in the wild, × (0.7 + the region's danger), × 1.25 at night, × 1.2 in fog, + 25% with a band on this stretch, + up to 10% with a bounty, × 0.4 walking with pilgrims; at most 45%, and never two within three zones.

Which one, by weight (encounters.js `ENCOUNTERS`): ambush grows with danger^1.5 (band on the road +3, night ×1.6, famine ×1.3, escorting ×1.4, with pilgrims ×0.3, low karma down to ×0.5); a war party needs a people who hate this region's people (relation under −0.5) within 16 zones; hunters need a bounty; a checkpoint on clan and court roads and wherever his standing is low; merchants on roads by day (merchant leagues ×1.6, famine ×0.5); pilgrims in spring and autumn and temple lands; the wounded more with danger and high karma; duelists in clan and rebel lands; funerals in winter and famine; the horse with danger; the weather where it is clear.

From one year (`node scripts/travel-year.mjs 12345 1`): 268 encounters in 4,956 zones (one per 18.5 zones, about every 7 real minutes on the road); expected per 100 road zones: bandit coast 11.6 (ambush 59%), rebel valleys 7.9 (ambush 31%), clan lands 7.2 (ambush 21%), court 6.8 (merchants first). The script fails if any `storm.*` event fires. Deterministic: the same seed and the same walk print the same year, and a saved world goes on exactly as the unsaved one.

## The voids and their creatures (owner, 2026-09-26)

`src/sim/wild.js` (core) says where a zone lies: `wildDepth(L, x, y)` is the number of zones to the nearest town, village, fort, shrine or camp (halved on a road). `wildRing(L, x, y)` is `settled`, `edge` (3 or more zones from anyone, or within 2 of a void) or `void` (a void carved by worldgen, off the road, or 5 or more zones from anyone). Worldgen carves about 9 voids, about 15% of the land, on wild ground (mountains, marsh and forest first). No settlement is placed in a void, and roads go round them unless there is no other way. Camps prefer the void's edge. A fresh world (seed 12345): settled 4,954 zones, edge 1,713, void 1,304.

- **The edge is bandit country:** encounter chance ×1.3 and the ambush weight ×2.5.
- **In a void nobody travels:** the chance of meeting people is ×0.15, and it is only ever a lost wounded man, the weather or a runaway horse. Outlaw bands never step into a void.
- **The creatures** (`beasts.js`, `BEASTS`): each void zone crossed rolls 0.7% by day and 3.5% at night, +25% for every zone deeper into the void (up to 4 zones), at most 9%. A roll is either a sign (`beastSign`: tracks, a sound, eyes, a felled tree; *Turn back* moves him out of the void) or the creature itself:
  - **below level 11** (`BEASTS.FIGHT`): 35% of night rolls and 40% of day rolls are the creature. The first 2 meetings are `beastScare` (it shows itself and he runs: 1–2 hours, a little hurt, moved out of the void). Every later one is `beastKO` (it knocks him out and he wakes in the nearest town or village 6–12 hours later, badly hurt). Both are cut scenes: the scene carries `cut` and its one choice only closes it.
  - **from level 11**: 80% of night rolls and 50% of day rolls are the creature (`beast`: *Fight it* or *Run*). Without a live fight result, a win is rolled at 20% + 1.2% a level past 11, +35% from level 30 (`BEASTS.SPIKE`, his first power spike). **A lost fight kills him** (owner, 2026-09-26: "it can kill you"): the resolution's `dead` names him, and his heir goes on (the people lane's death). A failed *Run* is still a knockout. A kill gives a part of it and 20–40 shards, and a `slewCreature` deed.
  - **The first 3 knockouts end with a warning** from whoever carried him in (owner, 2026-09-26): he should really train before heading out of town like that; things aren't like they used to be.
- **The creatures are the war dead** (owner, 2026-09-26: "abominations, spirits, ghouls of the wars"). Each race is one kind of war dead and keeps to its own ground: the Hollow King (mountains), the Thousand-Step (hills, mountains), the Veiled Weaver (forest, hills), the Lantern Beast (bamboo, plains, paddy, forest), the Drowned Serpent (marsh, coast, paddy). Design: `prototypes/45-void-kings.html`.
- **The API:** `enterZone(L, x, y, { level })`. The live game passes his level (`INV.lv`), which is kept on his record as `level`. A resolution's `move: [x, y]` is where he ran to or woke up: the game puts him there (the ledger sets `actor.at`).
- `L.sys.travel.beasts`: `{ faced, ko, slain: { creature: n } }`. Events: `travel.beastSign` (creature, turned), `travel.beastFled`, `travel.beastKO`, `travel.beastSlain`.
- `node scripts/wild-check.mjs [seed]` walks him through every void at levels 1, 11 and 30, by day and night, and prints what he met. From 4,000 void zones at night, always choosing to fight: level 1, 139 signs, 2 scares and 41 knockouts; level 11, 140 fights, 18 won and 122 deaths; level 30, 107 won and 33 deaths.

## What travel tells the world

`travel.encounter` (enc, encounter, zone, region, culture) · `travel.resolved` · `travel.fight` (won, foes, slain) · `travel.slain` (actor, by, culture) · `travel.deed` (deed, karma, standing, witnesses) · `travel.loot` (item, n) · `travel.hurt` · `travel.robbed` · `travel.beaten` · `travel.parley` · `travel.rescued` · `travel.raid` · `travel.bountyPaid` (culture, mon) · `travel.caught` · `travel.surrender` (culture, region) · `travel.toll` · `travel.trade` · `travel.escort` / `travel.escorted` / `travel.escortFailed` · `travel.duel` · `travel.weather` · `travel.unsafe` / `travel.safe` (a region's roads crossing 60% danger, and back under 50%) · `travel.bandOut` / `travel.bandHome` · `travel.robbery` (a band robbed someone on the road: for the economy).

Every event carries `zone` and `region` where they apply, and scene events carry `enc` and `encounter`.

## What travel needs from the other lanes (exactly)

**Karma and crime (`crime.*`)**
- Travel never writes karma or standing. It emits `travel.deed { deed, karma, standing: { cultureId: delta }, witnesses: [actor ids], zone, region }`. **Ask:** the crime lane applies these (karma to `actor.karma`, standing to `actor.standing`), and decides by witnesses whether a bounty follows. Deeds: killedOutlaws (+1 each), defended (+4), raided (−8), passedBy (−1), killedHunters (−2), bribed (−1), fledGuards, killedGuards (−6), robbedMerchant (−6), alms (+2), robbedPilgrims (−10), helpedStranger (+5), robbedWounded (−8), mourned (+2), bowed (+1), disrespect (−2), returnedHorse (+3), keptHorse (−3). The numbers are suggestions; the crime lane owns the scale.
- Travel reads `actor.karma` as karma / 100 (clamped to −1..1). **Ask:** the karma scale (is ±100 right?).
- **Ask:** emit `crime.bounty { actor, culture, mon }` when a bounty is raised on anyone and `crime.bountyCleared { actor, culture }` when it goes. Travel mirrors the ronin's into `L.sys.travel.heat`. It emits `travel.bountyPaid { culture, mon }` (he paid the hunters: clear it) and `travel.surrender { culture, region }` (he went quietly: jail or a fine is the crime lane's) and `travel.caught`.
- Deaths on the road: `travel.slain { actor, by, culture }` (by the ronin, or by a war party's culture). A murder charge is the crime lane's call.

**Economy (`econ.*`)**
- Travel listens to `econ.famine { region }` (the region's roads go hungry for 28 days: more danger, more ambush and funerals, fewer merchants).
- **Ask:** a rice price per region at `L.sys.economy.prices[region].rice` (mon, a number). Merchants sell at it; 30 mon when it is missing.
- Travel emits for the economy: `travel.robbery` (a band robbed someone on the road), `travel.trade`, `travel.toll`, `travel.escorted` (pay), and moves mon on the purses involved.

**People (`people.*`)**: `travel.slain` sets `alive: false` and `died`; heirs and graves are the people lane's. Funerals read the dead from `L.actors` (not alive, `died` within 7 days, home in the region).

**Story (`story.*`, `event.*`)**: `openScene` is theirs to use. The notice board can listen to `travel.unsafe`, `travel.bandOut`.

**Items / the game**: `travel.loot { item, n }` items: `rice`, `horse`, a slain duelist's weapon id, and a void creature's part and `shards` (the game's power currency; their name and lore are pending, docs/design-notes.md).

## Questions for the owner

1. **How often on the road?** Now one encounter in about 18 zones walked, roughly every 7 real minutes of travel; outlaw coasts about twice that. More, fewer?
2. **Fights on the road**: the scene hands the game real people by ledger id; should a road fight be the full enemy system (squads, tokens, counters), or a short fight on a road strip like the prototype's view?
3. **Travelling faster**: a horse can be kept from the runaway horse scene. Should riding be a thing (faster across zones, fewer ambushes land)?

## Glitch storms: removed (owner 2026-10-02)

"No glitch in the world or the story" ("let's kill the entire glitch storyline", scope "World/story only"). Gone from the lane: `storms.js` (storms born, wandering and fading; `stormAt`, `stormEffects`, `spawnStorm`, `shrineDark`, `residueAt`, `takeResidue`), every `storm.*` event, the storm and lost-time (`slip`) scenes, storm loot, the road news of a tear, and `storms`, `past`, `dark`, `residue`, `lastK` in the ledger. An old save keeps those fields harmlessly; nothing reads them. His glitch powers (the cyan blink, the glitch slices, the black slash, Storm Chain the skill) are his fighting style and stay in the game as they are. Prototype 41 is history: its page still shows the storms, and its sources (`prototypes-src/41-travel/`, `storm-look.js`) import the removed API, so they no longer bundle.
