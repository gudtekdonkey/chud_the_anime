# The simulation core (`src/sim/`)

The living world as plain data: the ledger of `docs/foundations.md`. Pure JavaScript with no drawing and no DOM (except `save.js`), so it runs in the browser, in Node (`scripts/sim-smoke.mjs`), and one day on a server. Every system of the world (economy, people, crime, quests, events, travel) is built on it. Read `docs/foundations.md` first: it has the owner's decisions this code follows.

## What is in it

| File | What it gives |
|---|---|
| `rng.js` | `hash(...parts)`, `rng(seed)` (next, range, int, chance, pick, weighted, shuffle), `rngFor(seed, ...keys)`: a stream per purpose |
| `time.js` | `TIME` (a game day is 40 real minutes; 28-day seasons; 112-day years), `calendar(hour)`, `HOURS_PER_YEAR`, `hoursFromYears` |
| `ledger.js` | `createLedger`, `system(def)`, `advance(L, hours, live)`, `catchUp(L, now, { live })`, `emit(L, type, data)`, `on(type, fn)`, `newId`, `zoneAt` |
| `cultures.js` | `CLASSES` (rank, dress, weapons, jobs), `KINDS` (the culture kinds: classes, traits, despised traits), `kindRelation`, name makers |
| `worldgen.js` | `generateWorld(seed)`: 100 × 100 zones, terrain, 100 regions, 20 cultures and their relations, towns, villages, camps, forts, shrines, roads, people |
| `actors.js` | the person record, `makeActor`, `marry`, `bear`, `ageOf`, `nameOf`, `populate` (the first generation, the ronin) |
| `zone.js` | `tilesOf(L, zx, zy)` (64 × 64 tiles, made from the seed), `TERRAIN`, `plotAt`, `plotId`, `ownerOf(L, plotId)` → `{ title, holder }` |
| `save.js` | `serialize`, `deserialize`, `saveWorld(L)`, `loadWorld()` (IndexedDB, localStorage as a fallback) |
| `index.js` | everything above, the one import |

`node scripts/sim-smoke.mjs [seed] [years]` makes a world, lives it and prints it. A fresh world is ~6,700 people, ~290 towns and villages, ~100 camps, 20 cultures; about 230 ms to make, about 3 MB saved.

## The shape of the world

- `L.zones[y * 100 + x]`: `{ x, y, biome, region, kind, road, name?, holder? }`. `kind`: sea, wild, town (a region's seat), village, camp (outlaws: a hostile base), fort, shrine.
- `L.regions[id]`: `{ id, name, culture, seat: [x, y], zones, center, lord }`.
- `L.cultures[id]`: `{ id, kind, name, regions, relations: { otherId: -1..1 }, hue }`.
- `L.actors[id]`: one record for every person, the ronin included (`L.player`): `{ id, given, family, sex, born, alive, culture, cls, job, rank, home, spouse, parents, children, household, weapon, traits, karma, standing, money: { mon, silver, ryo }, holds, int, lord?, chief?, at? }`. `int` is intelligence, 0..1 (owner, 2026-09-26: personality decides whether and how willingly someone acts, intelligence how good their choices are).
- `L.plots[plotId]`: only plots that differ from their zone's default. `ownerOf` gives `{ title, holder }`: **title** is ownership on paper, **holder** is who has it now (owner, 2026-09-26: raids take possession, never the title). `null` is nature, claimable.
- `L.log`: recent events `{ h, type, ...data }`.
- `L.sys[id]`: each system's own state.

## Rules for every system

1. **Register, don't loop.** A system is `system({ id, order, init, onHour, onDay, onSeason, onYear })`. `onHour` runs only while he plays (or for a gap under 48 hours); a long absence is lived day by day, so anything that must happen while he is away belongs in `onDay` or slower.
2. **All state in the ledger**, in plain JSON: your own under `L.sys.<id>`, shared facts on the records above. Never in module variables; never class instances, Maps or functions in the ledger.
3. **Randomness only from the stream you are handed** (or `rngFor(L.seed, ...)`), never `Math.random`: the same world and the same absence must give the same result.
4. **Tell the world with `emit`**: `emit(L, 'econ.famine', { region, zone: [x, y] })`. Name events `<lane>.<what>`. Quests, the notice board and the map listen for them.
5. **Add fields, never rename or remove** someone else's. Document each field you add in your lane's doc.
6. **Stable ids** (`newId(L, kind)`) for anything that lasts.
7. **Cheap per day.** 10,000 zones and ~7,000 people: a day of your system should cost well under a millisecond on average. Work by region or settlement, not by tile.

## Lanes (parallel sessions, 2026-09-26)

Each lane owns its folder, its `L.sys` key, its event prefix and its prototype number, so the branches merge without fighting. The core files above belong to the integrator (the world session); a lane that needs a change to them makes the smallest additive change, says so in its report, and never reshapes them.

| Lane | Folder | `L.sys` / events | Prototype |
|---|---|---|---|
| World map and integration | `src/sim/` core, `src/world-map/` | `world.*` | 35 |
| Port: true left side and the gaps | `src/rig/`, drawing | none | 36 |
| Economy | `src/sim/economy/` | `economy`, `econ.*` | 37 |
| People: families, ageing, heirs, death | `src/sim/people/` | `people`, `people.*` | 38 |
| Karma, crime, title and possession | `src/sim/crime/` | `crime`, `crime.*` | 39 |
| Quests and world events | `src/sim/story/` | `story`, `story.*`, `event.*` | 40 |
| Travel events and glitch storms | `src/sim/travel/`, glitch storm effects | `travel`, `travel.*`, `storm.*` | 41 |
| Dominion: building, the land ladder, governing, armies, war | `src/sim/dominion/` | `dominion`, `dom.*`, `war.*` | 42 |

## Prototype pages on the core

Prototypes are single standalone pages. Keep a page's sources in `prototypes-src/<number>-<name>/` (an `index.html` with a `<!-- BUNDLE -->` marker and a `main.js` that imports `../../src/sim/index.js`), then:

```
node scripts/proto-bundle.mjs prototypes-src/37-economy/index.html prototypes-src/37-economy/main.js prototypes/37-economy.html
```
