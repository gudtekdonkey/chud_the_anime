# chud_the_anime

A top-down pixel-art action game about a dark ronin. Plain JavaScript ES modules on Vite: no TypeScript, no framework, no game engine. The screen is 480×270, drawn 1:1 to a canvas and CSS-upscaled. The hero is a posable pixel rig, so every frame is a real pose; a PNG sprite strip can replace any animation's placeholder sheet.

## Commands

| Command | What it does |
|---|---|
| `npm run dev` | Vite dev server, opens the game, reloads on save |
| `npm run build` | Builds ONE self-contained `dist/index.html` (vite-plugin-singlefile) and copies `prototypes/` to `dist/prototypes/`. Upload that file to itch.io as HTML5 |
| `npm run preview` | Serves `dist/` |
| `npm run check` | Builds, then `scripts/check.mjs` plays a key sequence in Chromium and asserts the states and no page errors. Screenshots and the state log go to `test-output/` |
| `npm run check:hd` | The same check at 2× (`?hd`), screenshots in `test-output/hd/` |

- Dependencies are pinned to exact versions. Keep them exact.
- `npm run check` uses the Chromium already at `PLAYWRIGHT_BROWSERS_PATH`. Never run `playwright install`; the `playwright` package must match the installed browser build.
- The check reads the player, the facing he is drawn in, the enemies, what he wears, the inventory, `S` and the K markers through `window.__game = { P, PF, E, wear, INV, S, K }`. That hook exists only in dev, or in a build opened with `?test`. Read it; never steer the game through it.

## Module map (`src/`)

| File | Owns |
|---|---|
| `main.js` | Boot, the fixed 60 Hz update loop under `requestAnimationFrame`, the debug hook |
| `config.js` | `W`/`H`, `PX` (screen pixels per world pixel: 2 with `?hd`, the owner's 2× ronin; else 1) and `snap`, `COL` (effect palette), `RC` (rig palette), rig frame size `FW`/`FH`/`OX`/`OY` (96×64 × `PX`; the rig draws in its old 48×48 box, `RX`/`RY`, scaled by `PX` and shifted by whole pixels), `SQ` (floor squash) |
| `state.js` | ALL shared mutable state: the player `P`, what he wears (`wear`), `S` (`shake`, `hitstop`, `scr` screen flash, `roomClear`, `banner`, `smoke`: while the static bomb's smoke is up every enemy counts as isolated, `powerTest`: the page's power picker), the inventory `INV` (the HUD reads only this), `parts`, `pops` and every effect list |
| `screen.js` | The `#game` canvas, its 2D context `g`, the `#hud` line |
| `input.js` | Keyboard map, touch pad, `held`/`taps`, `readInput()`, the room-clear checkbox |
| `rig/pose.js` | `pz()` (pose from REST), `HILT`, `lerpP`, `ease`/`lin`, `keyed()` (eased keyframes to frames) |
| `rig/rig.js` | One side-view pose drawn pixel by pixel from joint angles: `rig(g, fx, p, pal, left)` onto a canvas with the painted hat and mantle (the samurai, execution pieces), `rigR(R, p, left)` into a depth raster, each part at its own depth (`Z`), the body only for the wardrobe; `left` is his true left side (near and far swapped, the W facing). The weapon draws through `p.wp`'s hooks |
| `rig/port.js` | `port(p)`: any side pose to a rig v2 pose (hips follow the stride, chest turns into the blade, head stays on target, hand reaches the hilt); `DIRS`, the eight facings as yaws |
| `rig/turn.js` | True facings: `trueView(view, face)` (facing left, E is W: never the east mirrored), `sideOn` (a side-on move facing left, from the true left), `turner`/`turnTo` (a turn steps through the facings between, half a turn by the camera), `YAW` |
| `rig/body3d.js` | `drawBody3d`, `drawHat3d`: rig v2's body and hat from any facing, into the wardrobe's `Raster`; the weapon through its art's `d3` |
| `weapons/art3d.js` | Each weapon from any facing (`KATANA_3D`, `YARI_3D`, `NODACHI_3D`, `TANTO_3D`, and the `blade3d` / `staff3d` makers the rest use): `carried`, `held`, `backHeld`, `sheathing`, `offHand`; hung on each art as `d3` |
| `anims/anims.js` | `ANIMS` (frame count, fps, loop, the moveset "about" text), `GLITCHY` |
| `anims/item-poses.js` | Poses for the item interactions (pray, take, cut seal, read), the quick-slot uses and Harvest |
| `anims/poses.js` | `POSES` for every rig animation, the guard and counter stances, `GLF` (baked glitch frames) |
| `anims/turned-poses.js` | Moves drawn turned on the rig (a pose's `yaw`, rig v2 knobs in `v2`): the two open stances (facing the camera) and sit / sit down / stand up (back to the camera) |
| `anims/sheets.js` | Bakes every animation to a sheet at load (`SHEETS`, the equipped weapon's, in the default outfit, keeping each frame's pose and glitch), `sliceGlitch`, `dur()`, `rebake` |
| `weapons/weapons.js` | `WEAPONS`, `weapon()`, `setWeapon(id)` (the API for pickups: bakes once, swaps `SHEETS`), `reach()`, `framesFor` (a weapon's poses, or the katana's run through its `adapt`) |
| `weapons/katana.js` | `KATANA_ART`: the drawing hooks every weapon's art has (`far`, `stowed`, `held`, `backHeld`, `sheathing`, optional `offHand`; the old `front`/`sit` pixel lists are unused now the rig poses those moves) |
| `weapons/grip.js` | Shared by weapons: `grip` (two-handed poses from where the fists go), `twoHanded`, `breathe`, the draw and stow for weapons carried on the back (`slungDraw`/`slungStow`, `shoulderDraw`/`shoulderStow`), `runWith` |
| `weapons/yari.js`, `nodachi.js`, `tanto.js`, `naginata.js`, `kanabo.js`, `kusarigama.js`, `tessen.js`, `bo.js`, `tetsubo.js`, `kama.js`, `jitte.js`, `daisho.js`, `nunchaku.js`, `wakizashi.js` | Each weapon's art, its own poses (cuts, guard, the four side-on stances, what it does with the hilt hand), `reach` and `weight` |
| `player/update.js` | The state machine: one `update(dt, inp)` step |
| `player/actions.js` | `setState`, `once`, stance picking, the two-screen threat check, movement, `ghost`, `frameOf`, `inputDir` |
| `player/skills.js` | Charging (`chargeUp`), Thousand Cuts (`TC`), Cross Rift (`RIFT`), the dash, `release`/`charged` |
| `player/mirror.js` | Mirror Meditation: the mirror images' timeline |
| `player/hits.js` | Hit tests against the enemies, `burst` (the sheath-click payoff) |
| `player/combo.js` | The J combo ladder (`CUTS`, `comboMax()` from `INV.basic`, landed basic cuts) and Flow (six chained cuts let the next skill on cooldown cast) |
| `player/cooldowns.js` | `CD` (every active's cooldown), `startCd`, `gate` (refuses a key on cooldown), `onAssassination` (K back in 0.2 s) |
| `player/qi.js` | The Qi meter's gains (`qiAdd` from hits, `qiFill` from items, which never wakes the storm) and Storm Chain (`chainFrom`) |
| `player/power.js` | The power tier's effects: `PW` stats (`pw`), each skill's I / II / III numbers (`TIERS`, `T`), `powerCast` (stone at II, ribbons of light at III) |
| `player/weapon.js` | `WEAPONS` (blade length, reach, weight), `setWeapon`; a stopgap until the weapon pose layer lands |
| `player/body.js` | His silhouette points (sparks and bolts land on his body), `motes`, `glowK` |
| `player/personality.js` | `setPersonality()`: bakes a trait mix into his idle, walk and run and their speeds (`P.gait`) |
| `player/facing.js` | The facing he is drawn in (`playerFacing`, `PF`): idle, walk and run turn to their true facing, Harvest faces N, everything else side on |
| `player/draw.js` | Drawing him live in what he wears (`dressed`), with shadow, reflection, afterimages (in the facing they were left in), charge rim, white flash, glitch slice, the whetstone's cyan edge; and the mirror images, dressed live |
| `wardrobe/skeleton.js` | The 3D skeleton (rig v2): `solve(p, yaw, flat, left)`. From the side, `fromSide(p)` solved flat on the side rig's pixels (`left`: his right away from the camera); any other facing, `port(p)` at the facing's yaw, with IK hands, the head, the scabbard and the blades |
| `wardrobe/raster.js` | `Raster`: a figure's pixels with depth, nearer wins, `flush(mirror)`; `ring`, `bandLine` |
| `wardrobe/cloth.js` | Verlet cloth (chains, sheets, skirts) pinned to the bones, kept out of his body |
| `wardrobe/items.js` | `ITEMS` (data: slot, parts measured from the bones), `SLOTS`, `OUTFITS`, `drawPart` for rigid parts |
| `wardrobe/dress.js` | `makeFigure`, `dress(R, F, p, dt, yaw, flip)` (the true facing: the side rig at E, the side rig from his left at W, the ported body3d elsewhere, plus clothes, into one raster, cloth stepped and mirrored itself when the caller's flip changes), `WEST` (how W is drawn) |
| `traits/knobs.js` | `BASE`: the knobs a personality turns (lean, breath, hands, stride, bounce...), the plain ronin's values; `ARMS` hand targets |
| `traits/fidgets.js` | `FIDGETS`: small idle actions (tug the hat, crack the neck...) |
| `traits/traits.js` | `TRAITS`: 52 personality traits as plain data, `GROUPS`, `PRESETS` (ready-made characters) |
| `traits/cultures.js` | `CULTURES`: each culture's shared trait mix and a pool of personal traits; `personOf(culture, seed)` gives one person's traits |
| `traits/mix.js` | `mix()`: adds traits by strength into one set of knobs; `defineTrait()`; validates every trait at load |
| `traits/bake.js` | `bake()`: knobs to idle / walk / run poses. No traits gives today's idle and run exactly |
| `fx/fx.js` | `updateFx`, `drawFloorFx`, `drawFx`: the effect systems' per-frame update and draw |
| `fx/util.js` | `rr`, `sgn`, `residue`, `ring`, `after`, `spark`, `dust`, `scrFlash` |
| `fx/slash.js` | Crescents, cut lines, `strike` |
| `fx/bolts.js` | Jagged whole-pixel lightning (`zap`) |
| `fx/debris.js` | Stone chips the storm slam gathers and flings, floor cracks |
| `fx/moon.js` | The Crescent Moon: sweep, hang, shatter, its light on the floor |
| `fx/void.js` | Cross Rift's tear in reality |
| `fx/element.js` | `ELEMENTS` (palette + kit per element), `EL` (the current one), `setElement`, `cc`/`ec` (storm white and cyan to the element's tones) |
| `fx/matter.js` | The non-lightning elements' matter (flames, goo, drops, gusts, motes), floor stains, the kits `FIRE`/`SLIME`/`WATER`/`WIND`/`PSYCHIC`, `qiFx` |
| `fx/blood.js` | Blood drops, floor stains and pools |
| `assassin/targets.js` | The one place K reads enemies from (the enemy API): `targets`, `faceOf`, `hold` (an execution takes one over), `roomFade` |
| `assassin/markers.js` | Isolation bubbles, link lines, the kill line and the K prompt; `K.pick` (whom K would execute now), `K_RANGE` |
| `assassin/assassinate.js` | K on a lone enemy: the execution stage (both bodies, pieces, effects, mirrored when he faces right), handing the ronin back, `onAssassination` |
| `assassin/executions.js` | `EXECS`: the approved batch 1 executions, ported from prototype 14 |
| `assassin/enemy-poses.js` | The enemy's guard and reaction poses the executions share, `at` (pose at time t), `smoothAt` (the same keys as smooth curves), `lying`, `quickSheathe` |
| `assassin/pieces.js` | The rig drawn live (`figure`, `withShadow`), the enemy cut into pieces of his own pixels, `dropSword`, `sever`, `shatter` |
| `assassin/stage-fx.js` | An execution's own effects (`F`: sparks, slivers, cuts, crescents, bolts, ghosts, cracks); `F.hit` lands the blow (knockback, blood, impact frames); `wx` (stage x to world x) |
| `assassin/stage-body.js` | The deaths pass on the stage enemy: his keys read smooth, his spring body, the thud, twitches and eye going out; pieces landing with dust and blood |
| `world/room.js` | Floor bounds, pillars, the baked background, `collide` |
| `world/enemies.js` | The samurai and the enemy API: `ENEMIES`, `living`, `nearest`, `isolated`, `damage`, `kill`, `onKill`; `DMG`, health, reactions, respawn |
| `world/enemy-body.js` | The samurai's poses (guard, flinch, stagger, death) and the deaths pass's spring joints, floor thud, twitch, eye going out |
| `world/enemy-draw.js` | Drawing a samurai (red-grey palette, topknot), his health bar, dropped swords |
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
| `ui/personality.js` | The personality picker under the game (remembered in localStorage) |
| `ui/weapon-picker.js` | The test weapon picker under the game |
| `ui/element-picker.js` | The element buttons over the game, `[` / `]` to step through them |
| `ui/strip-tester.js` | "Test a sprite strip": drop a PNG strip in place of any animation |
| `ui/wardrobe.js` | The wardrobe under the game: one item per slot, outfit presets |
| `party/kit.js` | The party: `ROSTER` (him bound to `P.weapon` / `wear` / `INV.charms`, then companions), kits, the `BAG`, charms by scope, paired-execution needs, companion levels and stats, equipping |
| `party/figures.js` | Drawing anyone in the party: weapon + trait frames (cached), the ally palette, `place` |
| `party/companions.js` | Companions in the room: ranks of six, weapon roles, hits and Qi, EXP, downed / lifted / dead (`hurtAlly`), Iron Oath |
| `party/recruit.js` | Recruiting: the road wanderer, the guarded captive, the camp board |
| `party/paired.js` | Paired executions on K: the candidate and the 5 s party cooldown, the actors in a frame local to the enemy, `halve` (pieces), drawing |
| `party/paired-moves.js` | `RUNS`: each paired execution's choreography (the crossing cut, pole vault, batter up and the rest) |
| `ui/kit-screen.js` | Tab: the kit screen for him and every companion (pauses the game) |
| `ui/party-hud.js` | The party panel under the skill bar, and the E / K prompts over the world |
| `styles.css` / `index.html` | The page; `index.html` holds markup only |

- 2× (`?hd`): the canvas is 960×540 and `render()` draws the world in 480×270 units; a figure's canvas carries `PX` pixels per unit (a sheet's `s`), and rig widths are in rig pixels (`.5` is one screen pixel at 2×). Detail that only 2× can show goes behind `HD` (`rig/rig.js`) or `k.hd` in a weapon's art, so `PX` 1 draws exactly as before.
- Shared state lives in `state.js` and is imported, never copied. A value other modules reassign goes on `S`, because an imported `let` cannot be reassigned.
- Keep files focused and under about 400 lines. Keep the compact style and the short WHY comments.
- A weapon changes poses and art only: its frames match the katana's count for every move, so timing, hit beats and effects stay shared. Reach and weight (hit pause, shake) are per weapon, 1 for the katana. A new move needs a pose per weapon (or the weapon's `adapt` covers it).
- Effects are drawn in world space, never baked into sheets, so they survive real art replacing a placeholder.
- Effects take their colours from `COL` (never a literal cyan) and throw bolts, sparks and slivers through `zap`/`spark`/`residue`, so every element re-skins them. A new element is a row in `ELEMENTS` plus a kit in `fx/matter.js`.

## Design rules (from `docs/design-notes.md`)

- 480×270 native, integer-upscaled (4× on 1080p), top-down, the same scale as Hyper Light Drifter.
- The ronin is compact, 20×26 px: a near-black body, a wide straw hat (keep its height-to-width ratio), a black mantle draped flat (never a hump), two cyan eyes. He is drawn by the rig, so a new move is new poses, not new pixels.
- Palette: body near-black (`RC`); floor muted grey `#474c4a`; effects cyan `#6ff3e4` / `#52e8d6` / `#b8fff6` and white. Glitch slices, jagged electric bolts, a floor reflection.
- A hit is "dramatic yet controlled": whole-body white flash for about 2 frames, a short hit pause, a small screen shake. Never longer, never bigger by default.
- The katana is sheathed at his hip when idle. He draws it only to attack, waits in a blade-out stance after, and after about 2 s of calm resheathes slowly: a flick, a beat, slid home, the click, stillness.
- The blade-out stance is one of six, picked at random and never the same twice running: four side-on counter stances (blade in the back hand, point to the ground) and two opened to the camera.
- No enemy within two screens (960 px) when an attack or execution ends: skip the stance and sheathe at once, unbothered.
- Clothing (mantle, scarf, cape, obi sash) is equippable and always shades of black (`RC` c0–c6), never bright red. An item is data measured from the bones, never pixels in a sheet; a new item is a new `ITEMS` row.
- Enemies are samurai built like him: same body, no hat or mantle, bare-headed with a topknot, a darker red-grey.
- Executions are short and brutal, show only the key frames (each leaning into the motion), and cut the enemy into real pieces.
- Assassination markers: every enemy has an isolation bubble (empty glows cyan; overlapping ones go grey and are joined by a link line); a kill line runs to the nearest enemy he can dash to; the K prompt appears only when that enemy is in range AND outside every other enemy's bubble; lock-on brackets are reserved for big pickups.
- Skills and keys: move WASD / arrows · hold V walk · J slash (again in the follow-through for the next cut, up to six as landed cuts grow his basic skill) · Shift or L slide · Space jump · K glitch teleport, or on a lone enemy in reach an execution · I tap glitch double slash, hold Thousand Cuts · O hold Crescent Moon · P Cross Rift (hold to charge) · N Mirror Meditation · U storm slam · C sit (any key stands) · X die (testing) · E tap: the locked-on item's verb, hold near the fallen: Harvest · 1-4 quick slots · Tab kit screen · G party hold / follow · E by a recruit: take them on, held by a downed companion: lift them · K with a companion set up for it: a paired execution · H cut a companion down (testing). Reserved by the design (not built yet): F counter, R Blade Recall, Q Lightning Chain; X becomes Time Slice and C Breath of Qi. Storm Chain is passive: 8 s whenever the Qi meter fills.
- Items and HUD (`prototypes/20-items.html`, built as displayed): big items are the only things with lock-on brackets; small pickups magnetise within about 22 px; relics go to the first empty charm slot. Qi from items fills the meter but only a landed hit wakes Storm Chain. Health and Qi are 0..1; Qi is notched in thirds. `INV.power` (1..3) is the I / II / III tier, from relics and upgrades (owner): 1 + shrine upgrades (OFFER 3 shards at a prayed shrine, two at most) + power relics worn, capped at III. Power raises every skill's tier AND scales stats (owner); the numbers live in `player/power.js`.
- Facing (`P.view` + `P.face`, the port system, `rig/turn.js`): idle, walk, run and runArmed face the way he last moved in all eight true facings; W, SW and NW are his true left side, never the east mirrored (the blade in his right hand, the scabbard at his left hip from every side), and a turn steps through the facings between. Harvest faces N. Every attack, skill and stance is still side on (owner: "Same side attack is fine"), and facing west it is his true left, never mirrored (owner: "don't mirror"): the scabbard stays at his left hip in every move. The samurai (guard, flinch, stagger) and the companions (idle, walk, run) turn the same way; the dead stay side on. Guard: the check's "eight facings" and "true left" steps.
- Cooldowns (`player/cooldowns.js`): K's plain blink runs on charges, one per power tier, all back after 60 s without blinking (free with no enemy near; executions spend none and K is back 0.2 s after one) · I 2 s, Thousand Cuts 8 s · O 10 s · P 12 s · N 14 s · U 8 s · slide 1 s. J and jump have none.

## The simulation core (`src/sim/`, `docs/sim-core.md`)

The living world as plain data (the ledger): the 100 × 100 zone grid, regions, cultures, people, plots, the clock. No drawing. Every world system registers with `system()` and keeps its state in the ledger. Read `docs/foundations.md` and `docs/sim-core.md` before touching it. `node scripts/sim-smoke.mjs [seed] [years]` makes and lives a world in Node; `node scripts/proto-bundle.mjs` turns a prototype built on it into one standalone page.

## Working conventions

- Iterate on design as standalone pages in `prototypes/`, numbered in order (`46-…html` next; 35 to 42 are reserved by the parallel lanes in `docs/sim-core.md`). A prototype built from the game's own modules keeps its source in `scripts/protoNN/` and is bundled into one page (`node scripts/proto36/build.mjs`). Never edit an old prototype; make a new one.
- Record every decision the owner makes in `docs/design-notes.md`.
- Every culture moves through the trait system: a character from a culture gets `setPersonality`/`bake(personOf(culture, seed))`, never hand-made idle or walk poses. A culture's mannerisms go in `CULTURES` (a new mannerism is a new trait or fidget).
- Personality traits (`src/traits/`) never import player, enemy or clothing code, so any rig character can take them. A new trait is a new entry in `TRAITS`; a new knob goes in `BASE` with the plain ronin's value, so no-trait output never changes.
- Every new move gets an `ANIMS` row with an `about` text (it fills the moveset table); a skill that plays on another move's frames gets a row in `ui/moveset.js` `SKILL_ROWS`.
- Tuning numbers, colours and timings change only on purpose, never as a side effect of a refactor.
- Run `npm run check` before pushing. Add a step to `scripts/check.mjs` for a new key or state.
- Never copy another artist's sprites. The look is inspired by Hyper Light Drifter and Penusbmic's DARK series; all art here is original.
