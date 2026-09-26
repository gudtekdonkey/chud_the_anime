# Travel: the roads, random events and glitch storms (`src/sim/travel/`)

The travel lane (docs/sim-core.md): `L.sys.travel`, events `travel.*` and `storm.*`, prototype 41. Built on the owner's decisions of 2026-09-26 (docs/foundations.md): random events while travelling (ambushes, merchants and pilgrims, a wounded man asking for help, weather that turns, a glitch storm crossing the road), glitch storms in the world with **no true story behind the glitch powers**, and real time while away.

- **While he is away** (`onDay`, so a long absence moves them too): each region's road danger and weather, outlaw bands walking out of their camps and home again, glitch storms born, crossing the map and fading.
- **While he travels** (live): the game calls `enterZone(L, x, y)` each time he crosses into a zone. Now and then it returns a **scene**: a small encounter with choices; `choose(L, id, result)` plays the choice out and tells the world through `emit()`.

`node scripts/travel-year.mjs [seed] [years]` lives a world for a year with a ronin walking the roads town to town (four zones a game hour by day, sleeping at night) and prints where every storm went and how often each encounter came up, by region and by culture kind, and what the chances say for every road zone at once. `prototypes/41-travel.html` (sources in `prototypes-src/41-travel/`) walks him across the map at game scale.

## Files

| File | What it does |
|---|---|
| `index.js` | Registers the `travel` system (order 60); `enterZone`, `choose`, `openScene`, `news`, `SCENES`; listens to `econ.famine`, `crime.bounty`, `crime.bountyCleared`. Import it before `generateWorld()` / `loadWorld()` |
| `roads.js` | Region danger and weather (onDay), outlaw bands (`bandNear`), camp recount each season |
| `storms.js` | `STORM` (the tuning), storms (onDay), `spawnStorm`, `stormAt`, `stormEffects`, `shrineDark`, `residueAt`, `takeResidue` |
| `encounters.js` | `TRAVEL` (the tuning), `context` (everything a chance reads), `chanceAt`, `ENCOUNTERS` (the weights), `pickType` |
| `kit.js` | What scenes share: finding real people for a scene, strangers when there are none, fights, being beaten |
| `scenes-road.js` | Ambush, war party (raiders), bounty hunters, checkpoint / patrol, duelist |
| `scenes-meet.js` | Merchant, pilgrims, wounded stranger, funeral, runaway horse, the weather turning, a glitch storm, lost time (slip) |

## The API

```js
import './src/sim/travel/index.js';                    // registers the system: before generateWorld / loadWorld
import { enterZone, choose, openScene, stormAt, stormEffects, spawnStorm, shrineDark, takeResidue } from './src/sim/travel/index.js';

const sc = enterZone(L, x, y);        // he has just crossed into zone (x, y): a scene, or null
// sc = { id, type, title, text, zone, region, culture, who: [{ id | null, name, cls, weapon, culture, job, fighter? }], choices: [{ id, label }], data }
const out = choose(L, 'fight', { won: true, slain: ['a123'] });   // result: the live game's fight, when the choice was a fight; omitted, it is rolled
// out = { text, mon, hours, loot, deeds, fight, events, again?, next?, news?, hurt? }
advance(L, out.hours || 0, true);     // the caller moves the clock (lost time, a night in a cell, waiting out a storm)
```

- A scene stays in `L.sys.travel.scene` (saved with the world) until a choice is made; `enterZone` returns it again until then. `out.again` means the scene goes on with new choices (the caught horse); `out.next` is a scene that follows at once (the wounded man was bait: an ambush).
- `who` are **real people from the ledger** wherever the ledger has them: the band's own men, the nearest camp's outlaws, a hostile people's fighters, that people's bounty hunters, the region's guards, its merchants and ronin, and the dead at a funeral is someone of the region who died this week. Where the ledger has nobody, a named stranger (`id: null`). The game spawns them by id and answers with `{ won, slain }`.
- `stormAt(L, x, y)`: the storm over a point in zone coordinates (fractional: pass his place inside the zone) → `{ k 0..1, storm, dist }`. `stormEffects(k)` → plain numbers for the live game: `glitch` (flickers per second per person), `power` (his glitch skills' multiplier, up to 1.6), `qi`, `wild` (chance a glitch skill misfires somewhere near, from the middle of a storm on), `lostTime` (per zone crossed), `loot`.
- `shrineDark(L, x, y)`: a shrine a storm put out (the Wayside Shrine's PRAY should fail there). `takeResidue(L, x, y)`: the strange things a storm left in a wild zone, taken when he walks in (glitch shards; the items lane decides what else).
- `spawnStorm(L, { x, y, r, peak, hdg, speed, life, age })` and `openScene(L, type, x, y)`: a storm or a scene on purpose, for the story lane's world events and quests, and for tests.

## What is in the ledger (`L.sys.travel`)

| Field | What |
|---|---|
| `regions[id]` | `{ danger 0..1, base, camps, weather, wxDays, famine (days left), biome }` |
| `camps` | `[[x, y]]` every camp, recounted each season |
| `bands` | `[{ id, culture, region, camp, at, goal, members: [actor ids], days }]` outlaw bands on the road |
| `storms` | `[{ id, x, y, r0, r, peak, power, hdg, speed, age, life, born, path: [[x, y, power]], regions, touched }]` |
| `past` | the last 12 storms: `{ id, born, died, peak, path, regions }`, for the map's history |
| `dark` | `{ 'x,y': day it relights }` shrines gone dark |
| `residue` | `{ 'x,y': { day, n, power } }` what storms left in the wild (at most 60, fades after 12 days) |
| `heat` | `{ cultureId: mon }` the bounties on him, mirrored from `crime.bounty` |
| `scene`, `escort`, `safeUntil`, `quiet`, `lastK`, `steps`, `met` | the live state: the scene he is in, a merchant he escorts, walking with pilgrims, the quiet zones after an encounter, the storm strength of the last zone, the live stream counter, a tally by type |

About 12 to 16 KB. A day away costs about 0.2 to 0.3 ms (a year in 25 to 35 ms); `enterZone` about 0.07 ms.

**Fields on other records.** Travel writes only two shared facts: a person killed on the road gets `alive: false` and `died: L.hour` (existing fields), with a `travel.slain` event; and money moves on `actor.money.mon` (his purse, a robbed merchant's, the purses of the dead he takes). Karma and standing it never touches (below).

## Chances (starting numbers, open to tuning)

Per zone crossed (about 25 real seconds on foot): base 6% on a road, 4.5% in the wild, × (0.7 + the region's danger), × 1.25 at night, × 1.2 in fog, + 25% with a band on this stretch, + up to 10% with a bounty, × 0.4 walking with pilgrims; at most 45%, and never two within three zones. A glitch storm is not rolled: stepping into one (strength over 0.1) is always a scene, and each further zone inside it can take time (lost time: `(k − 0.5) × 0.5`).

Which one, by weight (encounters.js `ENCOUNTERS`): ambush grows with danger^1.5 (band on the road +3, night ×1.6, famine ×1.3, escorting ×1.4, with pilgrims ×0.3, low karma down to ×0.5); a war party needs a people who hate this region's people (relation under −0.5) within 16 zones; hunters need a bounty; a checkpoint on clan and court roads and wherever his standing is low; merchants on roads by day (merchant leagues ×1.6, famine ×0.5); pilgrims in spring and autumn and temple lands; the wounded more with danger and high karma; duelists in clan and rebel lands; funerals in winter and famine; the horse with danger; the weather where it is clear.

From one year (`node scripts/travel-year.mjs 12345 1`): 18 to 20 storms, each crossing 2 to 15 regions; 276 encounters in 4,852 zones (one per 18 zones, about every 7 real minutes on the road); expected per 100 road zones: outlaw coast 12.4 (ambush 52%), rebel valleys 7.8 (ambush 28%), clan lands 6.8 (ambush 17%), court 5.7 (merchants first). He walked into 4 storms. Deterministic: the same seed and the same walk print the same year, and a saved world goes on exactly as the unsaved one.

## Glitch storms

- About eighteen a year (per day: spring 14%, summer 16%, autumn 26%, winter 10%), at most six at once. Each lives 8 to 20 days, 2.5 to 6 zones in radius, wanders 1.2 to 3.5 zones a day with its heading turning a little each day. Strength builds over the first quarter of its life, holds, and dies over the last third.
- Full strength inside half its radius, fading to nothing at 1.35 radii.
- Where it passes (once per storm per place): `storm.reached` a region, `storm.touched` a settlement, `storm.glitched` its people, `storm.lostTime` a village that lost hours, `storm.shrineDark` a shrine put out for 3 to 10 days (`storm.shrineLit` when it comes back), residue left in the wild.
- **The look** (prototype 41, `prototypes-src/41-travel/storm-look.js`, written to move into `src/fx/` once approved): only the game's glitch language. Torn scanlines sliding sideways (his idle glitch, `sliceGlitch`), a cyan split ghosting beside them, slivers on the storm's wind (his teleport's residue), the Rewind's damaged tape (the picture holds, then jumps through a band of noise: lost time), rare jagged bolts from a tear to the ground, a faint cold pall, and one thing of its own: tears in the air, seams that push the world apart onto nothing and close. People in it slice and double. At the edge it gathers on the side the storm lies. Nothing on the floor, nothing rising off him, no smoke (docs/owner-taste.md).

## The voids and their creatures (owner, 2026-09-26)

`src/sim/wild.js` (core) says where a zone lies: `wildDepth(L, x, y)` is the number of zones to the nearest town, village, fort, shrine or camp (halved on a road). `wildRing(L, x, y)` is `settled`, `edge` (3 or more zones from anyone, or within 2 of a void) or `void` (a void carved by worldgen, off the road, or 5 or more zones from anyone). Worldgen carves about 9 voids, about 15% of the land, on wild ground (mountains, marsh and forest first). No settlement is placed in a void, and roads go round them unless there is no other way. Camps prefer the void's edge. A fresh world (seed 12345): settled 4,954 zones, edge 1,713, void 1,304.

- **The edge is bandit country:** encounter chance ×1.3 and the ambush weight ×2.5.
- **In a void nobody travels:** the chance of meeting people is ×0.15, and it is only ever a lost wounded man, the weather or a runaway horse. Outlaw bands never step into a void.
- **The creatures** (`beasts.js`, `BEASTS`): each void zone crossed rolls 0.7% by day and 3.5% at night, +25% for every zone deeper into the void (up to 4 zones), at most 9%. A roll is either a sign (`beastSign`: tracks, a sound, eyes, a felled tree; *Turn back* moves him out of the void) or the creature itself:
  - **below level 11** (`BEASTS.FIGHT`): 35% of night rolls and 40% of day rolls are the creature. The first 2 meetings are `beastScare` (it shows itself and he runs: 1–2 hours, a little hurt, moved out of the void). Every later one is `beastKO` (it knocks him out and he wakes in the nearest town or village 6–12 hours later, badly hurt). Both are cut scenes: the scene carries `cut` and its one choice only closes it.
  - **from level 11**: 80% of night rolls and 50% of day rolls are the creature (`beast`: *Fight it* or *Run*). Without a live fight result, a win is rolled at 20% + 1.2% a level past 11, +35% from level 30 (`BEASTS.SPIKE`, his first power spike). A loss is a knockout, never a death (open for the owner). A kill gives a part of it and 20–40 shards, and a `slewCreature` deed.
- The creatures, by the ground they keep to: the great centipede (mountains, hills), the earth spider (hills, forest, mountains), the nue (bamboo, forest, plains, paddy), the river serpent (marsh, coast), the great toad (marsh, paddy). They are named, not drawn yet.
- **The API:** `enterZone(L, x, y, { level })`. The live game passes his level (`INV.lv`), which is kept on his record as `level`. A resolution's `move: [x, y]` is where he ran to or woke up: the game puts him there (the ledger sets `actor.at`).
- `L.sys.travel.beasts`: `{ faced, ko, slain: { creature: n } }`. Events: `travel.beastSign` (creature, turned), `travel.beastFled`, `travel.beastKO`, `travel.beastSlain`.
- `node scripts/wild-check.mjs [seed]` walks him through every void at levels 1, 11 and 30, by day and night, and prints what he met. From 4,000 void zones at night: level 1, 139 signs, 2 scares and 41 knockouts; level 11, 134 creatures, 18 slain; level 30, 102 slain.

## What travel tells the world

`travel.encounter` (enc, encounter, zone, region, culture) · `travel.resolved` · `travel.fight` (won, foes, slain) · `travel.slain` (actor, by, culture) · `travel.deed` (deed, karma, standing, witnesses) · `travel.loot` (item, n) · `travel.hurt` · `travel.robbed` · `travel.beaten` · `travel.parley` · `travel.rescued` · `travel.raid` · `travel.bountyPaid` (culture, mon) · `travel.caught` · `travel.surrender` (culture, region) · `travel.toll` · `travel.trade` · `travel.escort` / `travel.escorted` / `travel.escortFailed` · `travel.duel` · `travel.weather` · `travel.unsafe` / `travel.safe` (a region's roads crossing 60% danger, and back under 50%) · `travel.bandOut` / `travel.bandHome` · `travel.robbery` (a band robbed someone on the road: for the economy) · `storm.born` · `storm.reached` · `storm.touched` · `storm.glitched` · `storm.lostTime` · `storm.shrineDark` · `storm.shrineLit` · `storm.crossed` · `storm.residueTaken` · `storm.faded`.

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

**Story (`story.*`, `event.*`)**: `spawnStorm` and `openScene` are theirs to use. The notice board can listen to `travel.unsafe`, `travel.bandOut`, `storm.*`.

**Items / the game**: `travel.loot { item, n }` items: `rice`, `shard` (glitch shards), `horse`, and a slain duelist's weapon id. `stormEffects(k)` for the live fight. `shrineDark` for the shrine.

## Questions for the owner

1. **How often on the road?** Now one encounter in about 18 zones walked, roughly every 7 real minutes of travel; outlaw coasts about twice that. More, fewer?
2. **How often a glitch storm?** About eighteen a year, each 5 to 12 zones across; walking the roads constantly, he meets about one every three game months (a few real days of play). Should they be rarer and bigger events, or common weather?
3. **The storm's look** (prototype 41, the look section): which layers stay? Tears in the air are new: a seam opening onto nothing. Is that the storm, or too close to Cross Rift's tear?
4. **Lost time** in a real-time world: the clock jumps forward for him (the world is then a few hours further on for good). Is that right, or should lost time be his alone (he is moved, the world keeps its clock)?
5. **Wild powers in a storm**: stronger glitch skills, and past the middle a chance a glitch skill misfires somewhere near. Good, or only stronger?
6. **Strange loot**: glitch shards for now. What else should a storm leave (a relic, a weapon from somewhere else, something that should not exist)?
7. **Fights on the road**: the scene hands the game real people by ledger id; should a road fight be the full enemy system (squads, tokens, counters), or a short fight on a road strip like the prototype's view?
8. **Travelling faster**: a horse can be kept from the runaway horse scene. Should riding be a thing (faster across zones, fewer ambushes land)?
