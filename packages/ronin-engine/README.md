# ronin-engine

This is the shared engine of chud_the_anime, dust_the_western and dealer_solana. The owner asked for it on 2026-10-03: "export all this shared gaming engine stuff that can be used in many games into shared repo". The owner's picks are `1A 2A 3C 4B 5A 6C`. The plan and the picks are in chud_the_anime's `docs/engine-extract.md` and `docs/design-notes.md` ("The shared engine").

The engine is plain JavaScript ES modules, with no build step and no bundler lock-in. Import a file by its path:

```js
import { keyed, CLIPS } from 'ronin-engine/flow/flow.js';
import { generateWorld, usePack } from 'ronin-engine/sim/index.js';
import { makePipeline } from 'ronin-engine/iso/gfx/post.js';
```

- **The core** is everything outside `iso/`. It never imports three.js or touches the page. Input listens only to the element it is given, and the world's saves reach storage only in `sim/save.js`. So the core runs in Node, in the browser, and one day on a server. `test/boundary.mjs` guards this.
- **`iso/`** is the three.js action layer. It needs `three` 0.186.1, a pinned peer dependency that is optional for games that only use the core.

## How a game plugs in

A game brings its content as data, through registries and hooks:

- **The registries** are objects and arrays that the engine reads at run time and the game fills when it loads.
- **The hooks** are small objects whose functions the game replaces.

A game's numbers stay its own. Where the engine needs a default, the default is chud_the_anime's value today, so chud plays exactly as it did before the split.

| What | Engine | The game hands in |
|---|---|---|
| Moves | `flow/` plays the Animation Flow page's base moves (idle, run, stop, skid, roll, J1–J3, lunge, recoil, knock, die, sheathe), the twenty idles and the additions | Its own clips through `keyed` / `proc` (`CLIPS['J1@colt']` is a weapon's take on a move) |
| Effects a move throws | `flow/flow.js` `FX` (`dust`, `step`) | `iso/fx.js` fills `FX` when it loads |
| Looks | `iso/look.js`: `LOOKS`, `makeLook` (four calls: `mount`, `show`, `stamp`, `dispose`) | `Object.assign(LOOKS, { '3d': …, pixel: … })` |
| The room | `world/room.js`: `ROOM`, `SOLID`, `RAISED`, `collide`, `groundAt`; `world/path.js` | Its room's bounds, solids and raised floors |
| Weapons | `weapons/registry.js`: `defineWeapons(rows, { cuts, stow, models })`, `equip`; `weapons/poses.js` builds each weapon's take on every move on the base keys and beats | Rows, grips per key, where each rides, its 3D model |
| Guns | `weapons/shots.js` (`fire`, `stepShots`: a `point` or `swept` test); `iso/weapons/fire.js` (`fireFrom`, `reload`) | A row's `fire` block: shot, speed, life, radius, test, dmg, spread, range, mag, reload |
| Enemies | `iso/enemies/`: `Enemy` (the action interface `can` / `do`), combat, squads, tokens, events, draw; `types.js`: `TYPES`, `GROUPS`, `setEnemyLook` | Its archetypes and groups as data, and the look each type is drawn in |
| Skills | `iso/skills/system.js` `makeSkillSystem` (presses, cancel windows, cooldowns, the context `C`); `iso/skills/seam.js` (skill objects by id); `iso/skills/kit.js` `defineKit` (cooldowns, Qi, power, growth) | Its skills, numbers (`CD`, `DMG`, `CANCEL`) and hooks (what a landed hit feeds, a held key, its HUD) |
| Combo prompts | `iso/combo/prompts.js` `COMBO` | Its inventory (landed basic cuts), Qi, the words over his head, the colour |
| Executions | `iso/exec/` (markers, the stage, poses), `iso/gore.js`, `iso/blood.js`, `iso/sever.js`; `iso/exec/registry.js` `EXECS` | Its executions as timelines |
| Gear | `iso/gear/` (schema, dyes, kit, parts, dress, pixel); `registry.js` `defineGear` | Its rows on the slot × layer grid |
| Hair and hats | `iso/hair/` (the head-slot contract, parts, the head slot); `registry.js` `defineHeads` | Its hairstyles and hats, checked by the contract |
| Personality | `traits/` (knobs, fidgets, the 52-trait library, `mix`, `bake`); `persona/` (`personaOf`, behave, gait) | Its cultures (`personOf`), picks and presets |
| AI | `ai/` (temper, senses, director, the utility brain), `squad/` (orders, squad, mind); `iso/squad/` (bodies, combat, control, marks, panel) | Its cast |
| The world | `sim/` (ledger, clock, events, catch-up, saves, zones, rng, the six lanes); `sim/pack.js` `usePack`; `sim/packs/edo/` (the default pack) | Its own pack: classes, kinds, names, goods, coin, crimes, buildings … |

## Module map

| Path | Owns |
|---|---|
| `flow/flow.js` | The Animation Flow engine: clips (`keyed`, `proc`, `CLIPS`), easing, pose mixing, springs, planted feet, the 30 fps sample, the 8 facings (`SETTINGS`), `Actor`, `FX` |
| `flow/moves.js`, `moves-extra.js`, `idles.js`, `moves-squad.js`, `moves-port.js` | The page's moves verbatim and the additions (`runArmed`, the twenty idles, strafe / block / aim / loose / taunt / downed / lift) |
| `clock/world.js` | `W`: the 1/120 s world, hit-stop, events, `post`; `STOP` 3 / 5 / 8 frames |
| `input/keys.js`, `input/gestures.js` | Keys with the 0.2 s buffer on the game's clock; the touch gesture recogniser |
| `rig/pose.js` | `pz`, `HILT`, `lerpP`, `ease`, `keyed` for the side rig |
| `traits/`, `persona/` | Personality: knobs, fidgets, traits, `mix`, `bake`; on the flow rig: `personaOf`, idle drift, behaviour, gaits |
| `ai/`, `squad/` | The utility AI and the squad's engine half (no three.js, no DOM) |
| `weapons/` | `registry.js`, `poses.js`, `stow.js`, `shots.js` |
| `world/` | `room.js`, `path.js` |
| `sim/` | The ledger and its lanes, `pack.js`, `packs/edo/` |
| `iso/gfx/` | The camera (`view.js`), shading (`shade.js`), the pipeline (`post.js`), the styles (`style.js`), palette ramps and low-poly pieces |
| `iso/fx.js`, `iso/cine.js`, `iso/blood.js`, `iso/sever.js`, `iso/gore.js` | World effects, the finisher's close-up, blood, severing, the gore hub |
| `iso/look.js`, `iso/char.js`, `iso/rig3d.js`, `iso/pixel/` | The look seam, `Char` (actor + look + collisions), the 3D rig, the pages' 2D engine |
| `iso/ctx.js`, `iso/play/` | The shared game context; the core loop's hero, foe and hit rules |
| `iso/enemies/`, `iso/squad/`, `iso/combo/`, `iso/input/`, `iso/exec/`, `iso/skills/`, `iso/weapons/`, `iso/gear/`, `iso/hair/` | The frameworks listed above |

## Tests

`npm test` runs these three:

- `test/boundary.mjs` checks the core boundary.
- `test/pack.mjs` checks that a content pack swaps the world's tables.
- `test/shots.mjs` checks the shots module and a gun's row.

chud_the_anime's `npm run check:engine` adds its golden snapshot to these.
