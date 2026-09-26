# World and land: where the two systems meet

Two systems share the same ground, built in two sessions:

- **The world** (this session): 100 regions, their cultures, villages, enemy bases, spawning, hatred between cultures (`docs/enemy-behavior.md` sections 7 and 8).
- **The land** (another session, owner 2026-09-26): every piece of land is owned (a village) or out in nature and claimable. You plan work for your character and your companions to do while you are away: on a map you pick your plots, pick tiles, and set actions on each tile. Some actions take many steps and some are one step, so companions work from recipes. The claiming mechanism, ownership, planning and companions are still to be discussed with the owner in that session.

This file is the contract between them, so neither builds something the other cannot use. The land session owns everything about claiming and planning; the world session owns what the land is and who lives on it.

## The layers

The terms are fixed in `docs/foundations.md` (owner, 2026-09-26): the **world** is a 100 × 100 grid of **zones**; a zone is a large walkable area made of **tiles**; tiles group into **plots**, and a plot is what an owner holds. **Regions** are patches of neighbouring zones sharing one culture.

| Layer | What it is | Who defines it |
|---|---|---|
| World | 100 × 100 zones | world |
| Region | about 100 neighbouring zones sharing one culture: terrain, danger, villages and bases | world |
| Zone | one square of the world grid, where he walks and fights; the camera follows him through it | world |
| Plot | a group of tiles in a zone, held by one owner; own every plot in a zone and you own the zone; owned zones side by side merge into domains and kingdoms | land (claiming, merging), world (the starting owners) |
| Tile | the smallest square of ground, the unit an action runs on | world (terrain), land (actions) |

## A tile

Every tile has one record both systems read:

- `zone` (its place on the world grid), `x`, `y` (its place in the zone), and so its `region` and `plot`: where it is.
- `terrain`: what it is (forest, field, paddy, river, marsh, rock, road, shrine ground, ruins, and so on). Terrain decides which actions and recipes can run there: logging needs forest, farming needs field or paddy, fishing needs water.
- `resources`: what it holds and how much is left (timber, ore, fish, herbs), refilling over time.
- `owner`: who holds it:
  - `nature`: nobody; claimable (by the land session's rules).
  - `village`: a settlement of a culture; owned, and its people react to anyone who takes it.
  - `base`: an enemy stronghold; hostile, and it spawns while it stands.
  - `player`: the ronin's, worked by him and his companions.
- `danger`: what walks there (the world's spawns and patrols).

## Working your land (owner, 2026-09-26)

For the land session to build; recorded here so both sides fit it.

- **Jobs on your plots.** On a plot you own, you assign companions jobs on its tiles: plant, clear, clear a tree, and so on.
- **Tile features that block and give.** A tree on a tile blocks other uses of that tile (you cannot plant or build there), but it gives its own harvest (pick apples, gather wood). Clearing it frees the tile and ends that harvest. Every feature decides what it blocks and what it grants, the same way terrain decides which recipes can run.
- **Auto-manage.** You can instead set companions to run your place for you, with permissions you choose: may they **buy**, **sell**, **build**, or **only work tasks nobody else is handling**.
- **Personality decides the rest.** Whether a companion takes up work on their own, and how well, depends on their personality (the 52 traits already on every person: a lazy one waits to be told, an eager one finds work, a proud one will not do menial jobs, a greedy one sells too cheap or skims). The same traits that change how they walk now change how they keep your land.
- **What the world gives this:** tiles with terrain, features and resources (`src/sim/zone.js`); prices and markets to buy and sell in (the economy lane); companions and their traits (`src/party/`, `src/traits/`); the clock that keeps the work going while you are away (`src/sim/ledger.js`, real time).

## Where they touch

- **Destroying a base** (world) turns its plots neutral: they become `nature`, so they are claimable (land). Nothing spawns there again.
- **NPCs own, steal and kill** (owner, 2026-09-26): the ledger layer in `docs/foundations.md` moves plots between NPC owners off screen; the land session reads the same ownership.
- **Villages** start owning their land (world). Taking a village's land, by whatever rule the land session settles on, is an act against that culture, and the world's hatred table can turn it hostile.
- **Danger on a plot** (world) matters to the plans (land): a companion sent to log a forest where a patrol walks can be attacked. Whether companions fight, flee or are guarded is the land session's call.
- **Cultures and classes** (world) decide who lives near a plot, which may decide who can be hired as a companion (land's call).
- **Recipes** (land) name the terrain and resources they need; the world supplies both on every tile.

## Open, for the owner (in the land session)

- How land is claimed: bought, cleared, taken by force, granted by a village, or staked on nature.
- What owning a plot gives, and whether it can be lost (raids from a nearby base, a culture taking it back).
- How long the planned work runs while you are away, and what companions do when danger arrives.
