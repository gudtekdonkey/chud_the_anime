# World and land: where the two systems meet

Two systems share the same ground, built in two sessions:

- **The world** (this session): 100 regions, their cultures, villages, enemy bases, spawning, hatred between cultures (`docs/enemy-behavior.md` sections 7 and 8).
- **The land** (another session, owner 2026-09-26): every piece of land is owned (a village) or out in nature and claimable. You plan work for your character and your companions to do while you are away: on a map you pick your plots, pick tiles, and set actions on each tile. Some actions take many steps and some are one step, so companions work from recipes. The claiming mechanism, ownership, planning and companions are still to be discussed with the owner in that session.

This file is the contract between them, so neither builds something the other cannot use. The land session owns everything about claiming and planning; the world session owns what the land is and who lives on it.

## The layers

| Layer | What it is | Who defines it |
|---|---|---|
| World | 100 regions | world |
| Region | one culture's country: terrain, danger, its villages and bases | world |
| Zone | a massive area inside a region: a village, wild nature, an enemy base, or neutral ground | world |
| Plot | a parcel of land that can be owned as one piece | land (sizes and borders), world (the starting owners) |
| Tile | the smallest square of ground, the unit an action runs on | world (terrain), land (actions) |

## A tile

Every tile has one record both systems read:

- `region`, `zone`, `x`, `y`: where it is.
- `terrain`: what it is (forest, field, paddy, river, marsh, rock, road, shrine ground, ruins, and so on). Terrain decides which actions and recipes can run there: logging needs forest, farming needs field or paddy, fishing needs water.
- `resources`: what it holds and how much is left (timber, ore, fish, herbs), refilling over time.
- `owner`: who holds it:
  - `nature`: nobody; claimable (by the land session's rules).
  - `village`: a settlement of a culture; owned, and its people react to anyone who takes it.
  - `base`: an enemy stronghold; hostile, and it spawns while it stands.
  - `player`: the ronin's, worked by him and his companions.
- `danger`: what walks there (the world's spawns and patrols).

## Where they touch

- **Destroying a base** (world) turns its zone neutral: its tiles become `nature`, so they are claimable (land). Nothing spawns there again.
- **Villages** start owning their land (world). Taking a village's land, by whatever rule the land session settles on, is an act against that culture, and the world's hatred table can turn it hostile.
- **Danger on a plot** (world) matters to the plans (land): a companion sent to log a forest where a patrol walks can be attacked. Whether companions fight, flee or are guarded is the land session's call.
- **Cultures and classes** (world) decide who lives near a plot, which may decide who can be hired as a companion (land's call).
- **Recipes** (land) name the terrain and resources they need; the world supplies both on every tile.

## Open, for the owner (in the land session)

- How land is claimed: bought, cleared, taken by force, granted by a village, or staked on nature.
- What owning a plot gives, and whether it can be lost (raids from a nearby base, a culture taking it back).
- How long the planned work runs while you are away, and what companions do when danger arrives.
