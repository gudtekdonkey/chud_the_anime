# ronin-engine

The shared engine of chud_the_anime, dust_the_western and dealer_solana. The plan and the owner's picks are in chud_the_anime's `docs/engine-extract.md`.

This package is plain JavaScript ES modules, with no build step and no bundler lock-in. Import a file by its path: `import { keyed } from 'ronin-engine/flow/flow.js'`.

- **The core** never imports three.js or the DOM, so it runs in Node, in the browser and on a server. It has these parts:
  - `flow/`
  - `clock/`
  - `input/`
  - `traits/`
  - `persona/`
  - `ai/`
  - `squad/`
  - `sim/`
- **`render/`** needs `three` 0.186.1, a pinned peer dependency that is optional for games that skip `render/`.
- **A game brings its content as data**: its moves, weapons, enemy types, traits, cultures, gear, hair and world packs.

A game's numbers stay its own. Where the engine needs a default, the default is chud_the_anime's value today.
