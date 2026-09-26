# chud_the_anime

A top-down pixel-art action game about a dark ronin. Plain JavaScript ES modules on Vite: no TypeScript, no framework, no game engine. The screen is 480×270, drawn 1:1 to a canvas and CSS-upscaled. The hero is a posable pixel rig, so every frame is a real pose; a PNG sprite strip can replace any animation's placeholder sheet.

## Commands

| Command | What it does |
|---|---|
| `npm run dev` | Vite dev server, opens the game, reloads on save |
| `npm run build` | Builds ONE self-contained `dist/index.html` (vite-plugin-singlefile) and copies `prototypes/` to `dist/prototypes/`. Upload that file to itch.io as HTML5 |
| `npm run preview` | Serves `dist/` |
| `npm run check` | Builds, then `scripts/check.mjs` plays a key sequence in Chromium and asserts the states and no page errors. Screenshots and the state log go to `test-output/` |

- Dependencies are pinned to exact versions. Keep them exact.
- `npm run check` uses the Chromium already at `PLAYWRIGHT_BROWSERS_PATH`. Never run `playwright install`; the `playwright` package must match the installed browser build.
- The check reads the player through `window.__game = { P }`. That hook exists only in dev, or in a build opened with `?test`. Read it; never steer the game through it.

## Module map (`src/`)

| File | Owns |
|---|---|
| `main.js` | Boot, the fixed 60 Hz update loop under `requestAnimationFrame`, the debug hook |
| `config.js` | `W`/`H`, `COL` (effect palette), `RC` (rig palette), rig frame size `FW`/`FH`/`OX`/`OY`, `SQ` (floor squash) |
| `state.js` | ALL shared mutable state: the player `P`, `S` (`shake`, `hitstop`, `scr` screen flash, `roomClear`, `banner`), the inventory `INV` (the HUD reads only this), `parts`, `pops` and every effect list |
| `screen.js` | The `#game` canvas, its 2D context `g`, the `#hud` line |
| `input.js` | Keyboard map, touch pad, `held`/`taps`, `readInput()`, the room-clear checkbox |
| `rig/pose.js` | `pz()` (pose from REST), `HILT`, `lerpP`, `ease`/`lin`, `keyed()` (eased keyframes to frames) |
| `rig/rig.js` | `rig()`: draws one side-view pose pixel by pixel from joint angles; the hat; `setBladeLen` |
| `anims/anims.js` | `ANIMS` (frame count, fps, loop, the moveset "about" text), `GLITCHY` |
| `anims/item-poses.js` | Poses for the item interactions (pray, take, cut seal, read), the quick-slot uses and Harvest |
| `anims/poses.js` | `POSES` for every rig animation, the guard and counter stances, `GLF` (baked glitch frames) |
| `anims/hand-drawn.js` | Hand-drawn rows the rig can't pose: the two open stances (front view) and sit / sit down / stand up (back view) |
| `anims/sheets.js` | Bakes every animation to a sheet at load (`SHEETS`), `rebake()` (a new blade), `dur()` |
| `player/update.js` | The state machine: one `update(dt, inp)` step |
| `player/actions.js` | `setState`, `once`, stance picking, the two-screen threat check, movement, `ghost`, `frameOf`, `inputDir` |
| `player/skills.js` | Charging (`chargeUp`), Thousand Cuts (`TC`), Cross Rift (`RIFT`), the dash, `release`/`charged` |
| `player/mirror.js` | Mirror Meditation: the mirror images' timeline |
| `player/hits.js` | Hit tests against the dummies, `burst` (the sheath-click payoff) |
| `player/cooldowns.js` | `CD` (every active's cooldown), `startCd`, `gate` (refuses a key on cooldown), `onAssassination` (K back in 0.2 s) |
| `player/qi.js` | The Qi meter's gains (`qiAdd` from hits, `qiFill` from items, which never wakes the storm) and Storm Chain (`chainFrom`) |
| `player/weapon.js` | `WEAPONS` (blade length, reach, weight), `setWeapon`; a stopgap until the weapon pose layer lands |
| `player/body.js` | His silhouette points (sparks and bolts land on his body), `motes`, `glowK` |
| `player/draw.js` | Drawing him (shadow, reflection, afterimages, charge rim, white flash, glitch slice, the whetstone's cyan edge) and the mirror images |
| `fx/fx.js` | `updateFx`, `drawFloorFx`, `drawFx`: the effect systems' per-frame update and draw |
| `fx/util.js` | `rr`, `sgn`, `residue`, `ring`, `after`, `spark`, `dust`, `scrFlash` |
| `fx/slash.js` | Crescents, cut lines, `strike` |
| `fx/bolts.js` | Jagged whole-pixel lightning (`zap`) |
| `fx/debris.js` | Stone chips the storm slam gathers and flings, floor cracks |
| `fx/moon.js` | The Crescent Moon: sweep, hang, shatter, its light on the floor |
| `fx/void.js` | Cross Rift's tear in reality |
| `world/room.js` | Floor bounds, pillars, the baked background, `collide` |
| `world/dummies.js` | The training dummies |
| `world/sprite.js` | `spriteTo`, `solid` (a frame recoloured solid) |
| `world/render.js` | `render()`: depth sort by feet, effects, particles, screen flash, items over the world, the HUD, HUD text |
| `items/items.js` | The lock-on, E (tap = the item's verb, hold = Harvest), quick slots 1-4, the item states, the Cracked Mirror cut |
| `items/inventory.js` | Writing to `INV`: `has` (charms), `heal`, `addMon`/`addShards`/`addQuick`/`addCharm`, `showBanner`, `addExp` (levels), `powerTier`/`offer` (the power tier) |
| `items/big.js` | The big items (shrine, Grave Nodachi, sealed chest, rift tablet): their acts and drawing |
| `items/pickups.js` | Small pickups, floor consumables and relics: magnet, fly-in, collect; chest loot |
| `items/quick.js` | The consumables' uses (static bomb, thunder talisman, whetstone, grave incense) |
| `items/harvest.js` | Harvest and the fallen; hooks for the enemies work: `onKill`, `onExecution`, `sheathClick`, `hurt` |
| `items/item-fx.js` | Light arcing into his chest, cut lines, falling bits, +1 pops and glints |
| `items/item-sprites.js` | World sprites at game scale (`WS`), the chest's lid, placeholder remains |
| `ui/hud.js` | The HUD from `prototypes/20-items.html`: health and Qi (STORM), currency, the bottom bar (weapon, quick, charm slots), banners |
| `ui/hud-kit.js` | HUD pieces: `panel`, `meter`, `slot`, `brackets`, `prompt`, `banner`, `glint`, `plusMark` |
| `ui/skill-bar.js` | The skills' cooldowns as a row of small slots under health and Qi |
| `ui/pixfont.js` | The 3×5 pixel font (`text`, `textW`, `textC`) |
| `ui/sprites.js` | `sprite`/`psprite` (palette strings to canvases), `tinted`, `drawS` (a world sprite with reflection and shadow), `boxOf` |
| `ui/icons.js` | The 16×16 inventory icons (`ICON`) |
| `ui/moveset.js` | The moveset table under the game (from `ANIMS` "about" rows + skill rows) |
| `ui/strip-tester.js` | "Test a sprite strip": drop a PNG strip in place of any animation |
| `styles.css` / `index.html` | The page; `index.html` holds markup only |

- Shared state lives in `state.js` and is imported, never copied. A value other modules reassign goes on `S`, because an imported `let` cannot be reassigned.
- Keep files focused and under about 400 lines. Keep the compact style and the short WHY comments.
- Effects are drawn in world space, never baked into sheets, so they survive real art replacing a placeholder.

## Design rules (from `docs/design-notes.md`)

- 480×270 native, integer-upscaled (4× on 1080p), top-down, the same scale as Hyper Light Drifter.
- The ronin is compact, 20×26 px: a near-black body, a wide straw hat (keep its height-to-width ratio), a black mantle draped flat (never a hump), two cyan eyes. He is drawn by the rig, so a new move is new poses, not new pixels.
- Palette: body near-black (`RC`); floor muted grey `#474c4a`; effects cyan `#6ff3e4` / `#52e8d6` / `#b8fff6` and white. Glitch slices, jagged electric bolts, a floor reflection.
- A hit is "dramatic yet controlled": whole-body white flash for about 2 frames, a short hit pause, a small screen shake. Never longer, never bigger by default.
- The katana is sheathed at his hip when idle. He draws it only to attack, waits in a blade-out stance after, and after about 2 s of calm resheathes slowly: a flick, a beat, slid home, the click, stillness.
- The blade-out stance is one of six, picked at random and never the same twice running: four side-on counter stances (blade in the back hand, point to the ground) and two opened to the camera.
- No enemy within two screens (960 px) when an attack or execution ends: skip the stance and sheathe at once, unbothered.
- Clothing (mantle, scarf, cape, obi sash) is equippable and always shades of black, never bright red.
- Enemies are samurai built like him: same body, no hat or mantle, bare-headed with a topknot, a darker red-grey.
- Executions are short and brutal, show only the key frames (each leaning into the motion), and cut the enemy into real pieces.
- Assassination markers: every enemy has an isolation bubble (empty glows cyan; overlapping ones go grey and are joined by a link line); a kill line runs to the nearest enemy he can dash to; the K prompt appears only when that enemy is in range AND outside every other enemy's bubble; lock-on brackets are reserved for big pickups.
- Skills and keys: move WASD / arrows · J slash (again for the answer cut) · Shift or L slide · Space jump · K glitch teleport · I tap glitch double slash, hold Thousand Cuts · O hold Crescent Moon · P Cross Rift (hold to charge) · N Mirror Meditation · U storm slam · C sit (any key stands) · X die (testing) · E tap: the locked-on item's verb, hold near the fallen: Harvest · 1-4 quick slots. Reserved by the design (not built yet): F counter, R Blade Recall, Q Lightning Chain; X becomes Time Slice and C Breath of Qi. Storm Chain is passive: 8 s whenever the Qi meter fills.
- Items and HUD (`prototypes/20-items.html`, built as displayed): big items are the only things with lock-on brackets; small pickups magnetise within about 22 px; relics go to the first empty charm slot. Qi from items fills the meter but only a landed hit wakes Storm Chain. Health and Qi are 0..1; Qi is notched in thirds. `INV.power` (1..3) is the I / II / III tier, from relics and upgrades (owner): 1 + shrine upgrades (OFFER 3 shards at a prayed shrine, two at most) + power relics worn, capped at III.
- Cooldowns (`player/cooldowns.js`): K 3 s (none with no enemy near; 0.2 s after an assassination) · I 2 s, Thousand Cuts 8 s · O 10 s · P 12 s · N 14 s · U 8 s · slide 1 s. J and jump have none.

## Working conventions

- Iterate on design as standalone pages in `prototypes/`, numbered in order (`17-…html` next). Never edit an old prototype; make a new one.
- Record every decision the owner makes in `docs/design-notes.md`.
- Every new move gets an `ANIMS` row with an `about` text (it fills the moveset table); a skill that plays on another move's frames gets a row in `ui/moveset.js` `SKILL_ROWS`.
- Tuning numbers, colours and timings change only on purpose, never as a side effect of a refactor.
- Run `npm run check` before pushing. Add a step to `scripts/check.mjs` for a new key or state.
- Never copy another artist's sprites. The look is inspired by Hyper Light Drifter and Penusbmic's DARK series; all art here is original.
