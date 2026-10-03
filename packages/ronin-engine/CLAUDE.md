# ronin-engine

The shared engine of chud_the_anime, dust_the_western and dealer_solana. It is plain JavaScript ES modules: no build step, no TypeScript, no framework. `README.md` has the module map and the table of how a game plugs in. The owner's picks and the reasons for them are in chud_the_anime's `docs/engine-extract.md` and `docs/design-notes.md` ("The shared engine").

## Commands

| Command | What it does |
|---|---|
| `npm test` | `test/boundary.mjs` (the core boundary), `test/pack.mjs` (content packs), `test/shots.mjs` (shots and guns) |

chud_the_anime also checks the engine through its own scripts:

- `npm run check:engine`: its golden snapshot of every clip, table and world, plus these tests
- `scripts/boot-smoke.mjs`: every page of a build opened in Chromium
- `npm run check:iso`: the full slice played in Chromium

A change here is done only when those pass in chud_the_anime too.

## Rules

- **The core boundary.** Everything outside `src/iso/` imports no three.js and touches no page (`document`, `window`, storage). Input listens to the element it is given, and only `src/sim/save.js` reaches storage. `test/boundary.mjs` enforces this.
- **The engine never imports a game.** A game's content enters through registries and hooks: `defineWeapons`, `defineGear`, `defineHeads`, `defineKit`, the enemies' `TYPES` / `GROUPS` / `setEnemyLook`, `EXECS`, `LOOKS`, the room's `ROOM` / `SOLID` / `RAISED`, `COMBO`, flow's `FX`, `usePack`. A new kind of content gets a registry, never an import.
- **A game's numbers are its own.** Where the engine needs a default, it is chud_the_anime's value as the owner approved it. Tuning numbers, colours and timings change only on purpose, never as a side effect of a refactor. A move of code leaves chud_the_anime's golden snapshot unchanged.
- **The moves are the Animation Flow page's data.** Change them there first, or mark an addition (`flow/moves-extra.js`, `flow/moves-squad.js`). A weapon's take on a move keeps the base keys, times and events. Only a ranged weapon's own moves may differ.
- **Keep `ai/` and `squad/` adoptable.** They read plain agents, so a 2D game can drive them.
- **Pin dependencies exactly.** `three` is a peer dependency at exactly 0.186.1, optional for games that use only the core.
- **Keep files small.** Files stay focused and under about 400 lines, in the compact style with short WHY comments.
- **Record owner decisions.** Every decision the owner makes is recorded, quoted, in chud_the_anime's `docs/design-notes.md`.
