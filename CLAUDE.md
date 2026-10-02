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
| `node scripts/iso-reel.mjs chain 3` | After a build: one of the Animation Flow page's scenarios as the slice plays it, laid out as the page's contact sheets (`AF_DIR` at the page's source draws the page's sheet above it), into `test-output/iso/reel-<name>[-vs].png` |
| `npm run check:iso` | Builds, then `scripts/check-iso.mjs` plays the iso slice (`?iso`) in Chromium on SwiftShader: the run in 8 directions, the roll, J1 → J2 → J3 landing on the samurai, the blood, a cut cancelled into the roll, a kill with its sever and the respawn, the pixel look, each pipeline toggle, the five executions on K. Screenshots in `test-output/iso/` |

- Dependencies are pinned to exact versions. Keep them exact.
- `npm run check` uses the Chromium already at `PLAYWRIGHT_BROWSERS_PATH`. Never run `playwright install`; the `playwright` package must match the installed browser build.
- `?iso` opens the new direction's vertical slice instead (`src/iso/`, `docs/iso-slice.md`): `src/main.js` only picks, today's game boots from `src/game.js` untouched. It needs `three` (pinned; `npm install`); where `node_modules` is shared and lacks it, `ISO_DEPS=<dir with node_modules/three>` makes `vite.config.js` alias it. Its read-only hook is `window.__iso` (dev or `?test`; `.gore` reads the blood, the pieces and the executions); `&tick=N` runs N game steps a frame for the check.
- The check reads the player, the facing he is drawn in, the enemies, what he wears, the inventory, `S` and the K markers and the black slashes through `window.__game = { P, PF, E, V, wear, INV, S, K }`, plus growth's read-only helpers `tv(skill, key)` (a tree's value now), `known(skill)`, `stat(k)` and `ST` (his stats' effects), and the animation flow's: `FEEL` (its tuning), `stops` (the last hit pauses, by weight and frames), `PB` (the drawn pose: its move, draws since it began, its distance from the move's own frame, where the blade is), `B` (the input buffer), `CAM` (the camera offset) and `stride(anim)` (a gait's measured stride). That hook exists only in dev, or in a build opened with `?test`. Read it; never steer the game through it.

## Module map (`src/`)

| File | Owns |
|---|---|
| `main.js` | Boot: picks today's game (`game.js`) or, with `?iso`, the slice (`iso/main.js`) |
| `game.js` | Today's game: builds everything, the fixed 60 Hz update loop under `requestAnimationFrame`, the debug hook |
| `config.js` | `W`/`H`, `PX` (screen pixels per world pixel: 2 with `?hd`, the owner's 2× ronin; else 1) and `snap`, `COL` (effect palette), `RC` (rig palette), rig frame size `FW`/`FH`/`OX`/`OY` (96×64 × `PX`; the rig draws in its old 48×48 box, `RX`/`RY`, scaled by `PX` and shifted by whole pixels), `SQ` (floor squash) |
| `state.js` | ALL shared mutable state: the player `P`, what he wears (`wear`), `S` (`shake`, `hitstop`, `scr` screen flash, `roomClear`, `banner`, `smoke`: while the static bomb's smoke is up every enemy counts as isolated, `powerTest`: the page's power picker, `skillTest`: the skills picker), the inventory `INV` (`INV.sk`: each skill's wild casts, known, tree points and fork pick) (the HUD reads only this), `parts`, `pops` and every effect list |
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
| `anims/breath-poses.js` | `BREATH_POSES` for the four Breath of Qi takes and `BT`, their beat times (read by `player/breath.js`) |
| `anims/sheets.js` | Bakes every animation to a sheet at load (`SHEETS`, the equipped weapon's, in the default outfit, keeping each frame's pose and glitch), `sliceGlitch`, `dur()`, `rebake` |
| `weapons/weapons.js` | `WEAPONS`, `weapon()`, `setWeapon(id)` (the API for pickups: bakes once, swaps `SHEETS`), `reach()`, `framesFor` (a weapon's poses, or the katana's run through its `adapt`) |
| `weapons/katana.js` | `KATANA_ART`: the drawing hooks every weapon's art has (`far`, `stowed`, `held`, `backHeld`, `sheathing`, optional `offHand`; the old `front`/`sit` pixel lists are unused now the rig poses those moves) |
| `weapons/grip.js` | Shared by weapons: `grip` (two-handed poses from where the fists go), `twoHanded`, `breathe`, the draw and stow for weapons carried on the back (`slungDraw`/`slungStow`, `shoulderDraw`/`shoulderStow`), `runWith` |
| `weapons/yari.js`, `nodachi.js`, `tanto.js`, `naginata.js`, `kanabo.js`, `kusarigama.js`, `tessen.js`, `bo.js`, `tetsubo.js`, `kama.js`, `jitte.js`, `daisho.js`, `nunchaku.js`, `wakizashi.js` | Each weapon's art, its own poses (cuts, guard, the four side-on stances, what it does with the hilt hand), `reach` and `weight` |
| `player/update.js` | The state machine: one `update(dt, inp)` step, between the input buffer and the camera; `act` (a new command), `leave` (cut short in a cancel window) |
| `player/feel.js` | `FEEL`: every tuning number of the animation flow (buffer, cancel windows, hit-stop frames, camera, acceleration, turn, blend frames, 30 fps tweening, springs, the cut's step in); `hitStop(weight)` and its log |
| `player/buffer.js` | The 0.2 s input buffer (`bufferIn` / `bufferOut`: presses remembered through hit pauses, forgotten once used) and the cancel windows (`cancelOf`, `only`) |
| `player/locomotion.js` | Movement that flows: `drive` (speed ramps up and down), the gait's stride measured from its poses (`strideOf`) and its distance-driven clock (`gaitClock`), the turn rate |
| `player/blend.js` | The pose he is drawn in (`livePose`): 30 fps in-betweens for locomotion, the blend into a new move, the springs on the mantle, hat and lean (`stepSprings`), the lean into a turn; `PB` for the check |
| `player/actions.js` | `setState`, `once`, stance picking, the two-screen threat check, movement, `ghost`, `frameOf`, `inputDir` |
| `player/skills.js` | Charging (`chargeUp`), Thousand Cuts (`TC`), Cross Rift (`RIFT`), the dash, `release`/`charged` |
| `player/breath.js` | Breath of Qi on C: tap sits, a hold picks kata / Seiza (with ↓) / Lotus (at a shrine), Storm breath in the storm; each out-breath spends a notch of Qi and heals; the dome absorbs blows; motes, stone (II), ribbons (III) |
| `player/mirror.js` | Mirror Meditation: the mirror images' timeline |
| `player/hits.js` | Hit tests against the enemies, `burst` (the sheath-click payoff) |
| `player/combo.js` | The J combo ladder (`CUTS`, `comboMax()` from `INV.basic`, landed basic cuts), Flow (six chained cuts let the next skill on cooldown cast) and the cut's step in toward its target (`aimCut`, `trackStep`) |
| `player/cooldowns.js` | `CD` (every active's cooldown), `startCd`, `gate` (refuses a key on cooldown, or one not mastered), `onAssassination` (K back in 0.2 s) |
| `player/mastery.js` | Growth (owner picks 1B, 2B): which keys he knows (`known`), the wild pick and its lines, each skill's tree (`TREES`, `AT`, `tv`, `pickBranch`), counting a landed cast (`castStart`, `landed`) |
| `player/wild.js` | The wild cast: a full meter, a skill not yet mastered, cast by itself at the nearest enemy (`wildGo`); the line over his head (`drawLine`) |
| `player/stats.js` | His VIG / EDG / SPD / FOC (owner pick 3A): what each point does (`ST`), the kit screen's line (`statLine`) |
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
| `fx/debris.js` | Stone chips (Sky Drop flings them), floor cracks |
| `fx/moon.js` | The Crescent Moon: sweep, hang, shatter, its light on the floor |
| `fx/void.js` | The black slash: Cross Rift's tear in reality (`tear`, `xTear`, `tearArc` bent round a crescent), which every offensive skill cuts on its hit beat and shuts on its own (`close`) or on the caller's click |
| `fx/element.js` | `ELEMENTS` (palette + kit per element), `EL` (the current one), `setElement`, `cc`/`ec` (storm white and cyan to the element's tones) |
| `fx/matter.js` | The non-lightning elements' matter (flames, goo, drops, gusts, motes), floor stains, the kits `FIRE`/`SLIME`/`WATER`/`WIND`/`PSYCHIC`, `qiFx` |
| `fx/blood.js` | Blood drops, floor stains and pools |
| `fx/numbers.js` | Damage numbers (`num`: white dealt, red taken, big for a killing blow, the element's colour for an execution) and the health bars' chip trail (`trail`, `chip`) |
| `assassin/targets.js` | The one place K reads enemies from (the enemy API): `targets`, `faceOf`, `hold` (an execution takes one over), `roomFade` |
| `assassin/markers.js` | Isolation bubbles, link lines, the kill line and the K prompt; `K.pick` (whom K would execute now), `K_RANGE` |
| `assassin/assassinate.js` | K on a lone enemy: the execution stage (both bodies, pieces, effects, mirrored when he faces right), handing the ronin back, `onAssassination` |
| `assassin/executions.js` | `EXECS`: the approved batch 1 executions, ported from prototype 14 |
| `assassin/enemy-poses.js` | The enemy's guard and reaction poses the executions share, `at` (pose at time t), `smoothAt` (the same keys as smooth curves), `lying`, `quickSheathe` |
| `assassin/pieces.js` | The rig drawn live (`figure`, `withShadow`), the enemy cut into pieces of his own pixels, `dropSword`, `sever`, `shatter` |
| `assassin/stage-fx.js` | An execution's own effects (`F`: sparks, slivers, cuts, crescents, bolts, ghosts, cracks); `F.hit` lands the blow (knockback, blood, impact frames); `wx` (stage x to world x) |
| `assassin/stage-body.js` | The deaths pass on the stage enemy: his keys read smooth, his spring body, the thud, twitches and eye going out; pieces landing with dust and blood |
| `world/room.js` | Floor bounds, pillars, the baked background (and `bgX`, the same drawn `MARGIN` px past the screen), `collide` |
| `world/camera.js` | The camera: a few pixels of eased look-ahead toward his run or cut (`CAM`), whole pixels, inside the room's margin |
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
| `party/kit.js` | The party: `ROSTER` (him bound to `P.weapon` / `wear` / `INV.charms`, then companions), kits, the `BAG`, charms by scope, paired-execution needs, companion levels and stats, gear's stat points (`gearStats`, `statOf`), equipping |
| `party/figures.js` | Drawing anyone in the party: weapon + trait frames (cached), the ally palette, `place` |
| `party/companions.js` | Companions in the room: ranks of six, weapon roles, hits and Qi, EXP, downed / lifted / dead (`hurtAlly`), Iron Oath |
| `party/recruit.js` | Recruiting: the road wanderer, the guarded captive, the camp board |
| `party/paired.js` | Paired executions on K: the candidate and the 5 s party cooldown, the actors in a frame local to the enemy, `halve` (pieces), drawing |
| `party/paired-moves.js` | `RUNS`: each paired execution's choreography (the crossing cut, pole vault, batter up and the rest) |
| `ui/kit-screen.js` | Tab: the kit screen for him and every companion (pauses the game) |
| `ui/kit-skills.js` | The kit screen's growth: his SKILLS row (a tree per skill, the fork picked there) and his four stats |
| `ui/party-hud.js` | The party panel under the skill bar, and the E / K prompts over the world |
| `styles.css` / `index.html` | The page; `index.html` holds markup only |

- 2× (`?hd`): the canvas is 960×540 and `render()` draws the world in 480×270 units; a figure's canvas carries `PX` pixels per unit (a sheet's `s`), and rig widths are in rig pixels (`.5` is one screen pixel at 2×). Detail that only 2× can show goes behind `HD` (`rig/rig.js`) or `k.hd` in a weapon's art, so `PX` 1 draws exactly as before.
- Shared state lives in `state.js` and is imported, never copied. A value other modules reassign goes on `S`, because an imported `let` cannot be reassigned.
- Keep files focused and under about 400 lines. Keep the compact style and the short WHY comments.
- A weapon changes poses and art only: its frames match the katana's count for every move, so timing, hit beats and effects stay shared. Reach and weight (hit pause, shake) are per weapon, 1 for the katana. A new move needs a pose per weapon (or the weapon's `adapt` covers it).
- Effects are drawn in world space, never baked into sheets, so they survive real art replacing a placeholder.
- The animation flow (owner picks 2026-10-02, `docs/design-notes.md`): every tuning number is in `player/feel.js` `FEEL`. A press goes through the buffer (`player/buffer.js`): a new key must say which state it starts (`STARTS`) so the buffer knows when it was used. A hit pause goes through `hitStop('light' | 'heavy' | 'exec')`, never a raw `S.hitstop`, for the player's own hits. Blending, tweening and springs are draw time only (`player/blend.js`): they never move a hit. A move that must snap goes in `blend.js` `SNAP`.
- Effects take their colours from `COL` (never a literal cyan) and throw bolts, sparks and slivers through `zap`/`spark`/`residue`, so every element re-skins them. A new element is a row in `ELEMENTS` plus a kit in `fx/matter.js`.

## The iso slice (`src/iso/`, `?iso`, `docs/iso-slice.md`)

Phase 0 of the new direction: Iron Ash V3 in a night courtyard, the Sea of Stars camera (pitch 54 oblique), the Animation Flow page's moves, one samurai. Nothing here is imported by today's game.

| File | Owns |
|---|---|
| `iso/main.js` | Boot of the slice: the page, the pipeline, the room, the hero and the samurai, the 60 Hz loop (the flow steps twice at 1/120 s), the model switch, `window.__iso`; `?iso&sheet` hands over to `sheet.js` |
| `iso/gfx/view.js` | The camera: `VW`/`VH` (960×540) and `U` (2 render px a world unit), the oblique projection (`OBL`, `projMatrix`, `toScreen`), the bodies' camera (`BODY`, `setBody`, `BODY_SHEAR`: picked 39.5°, upright 20°, true 54°), the follow with lag, look-ahead and shake |
| `iso/gfx/shade.js` | The scene material (toon bands, the world-anchored dither, key / bounce / rim, the brim's shadow, the lanterns, the ground and its mist) writing colour, data and normal; `SH` (shared light and toggle uniforms); the silhouette material |
| `iso/gfx/post.js` | The pipeline: the 3-attachment target at k× (`PIPE` holds every toggle, the owner's faces-page defaults), the silhouette pass, the post pass (outline, palette, effects layer, rain), the effects canvas |
| `iso/gfx/style.js` | THE STYLE seam (owner: Painterly by default, Anime limited's clashes, live switching): `STYLES` (Painterly, Pixel-render, Anime limited, Toon + dither: the light, the pipeline preset, the outline, the trail, the frame stepping), `setStyle`, `fpsFor`. Never gameplay |
| `iso/gfx/palette.js`, `iso/gfx/build.js` | The slice's palette ramps; low-poly pieces (flat-shaded, colour and part per vertex, merged per bone) |
| `iso/anim/flow.js` | The Animation Flow page's engine, ported: `AF` (rig px → world units), easing, pose mixing, keyed and procedural clips (`CLIPS`), the springs, planted feet, the 30 fps sample, the 8 stepped facings (`SETTINGS`) |
| `iso/anim/moves.js` | The page's moves verbatim (idle, guard, start, run, stop, skid, roll, J1–J3, lunge, recoil, knock, die, fcut, sheathe); `moves-extra.js` the additions (`runArmed`) |
| `iso/play/` | The controller: `sim.js` (the world clock, hit-stop, events, `STOP` 3/5/8 frames), `input.js` (keys, the 0.2 s buffer on the game's clock), `char.js` (an actor and its look, collisions, the frame a look draws, the blade's world points), `hero.js` (the core loop's rules: chains, cancels, the lunge, the cut tracking its target, the sheathe), `foe.js` (the samurai), `rules.js` (what hits do) |
| `iso/look/look.js` | THE LOOK interface (`mount`, `show(frame)`, `stamp`, `dispose`) and `makeLook`: nothing outside `look/` knows which is active |
| `iso/look/three/` | The 3D look: `ronin.js` (procedural Iron Ash V3 and the samurai), `rig.js` (the skeleton in the pages' proportions, the side pose stood up in 3D by two-bone IK, the springs' pieces), `look3d.js` (the look, `LOOK3D` hat tunables, the glint rule) |
| `iso/look/pixel/` | The pixel look: `engine.js` and `styles.js` (the pages' 2D Iron Ash engine and FC.RF1, vendored verbatim), `lookpix.js` (the sprite as a card in the scene) |
| `iso/world/room.js` | The courtyard: geometry, the four lanterns, colliders (`SOLID`, `collide`), the raised engawa (`groundAt`), the eave that dissolves over him |
| `iso/fx/fx.js` | Effects on the effects layer: dust, sparks, rings, cracks, the black slash (fx/void.js's tear, ported), the blade's trail in each style's look, the clash's focus and speed lines |
| `iso/fx/cine.js` | The finisher's close-up: J3 on a samurai in reach punches the camera in, letterboxed, ink and speed lines, then back (~0.8 s, any key skips); presentation only |
| `iso/gore.js` | The hub for blood, severing and the executions: `installGore` (after `hitRules`; wraps `W.on.hit`/`strike` and the controllers for K, steps through `W.post`), `sync()` before the scene, `draw(g)` on the effects layer, `view()` for `window.__iso.gore`; a killing blow severs and takes the close-up |
| `iso/fx/blood.js` | Blood: sprays by weight (`WEIGHT` light / heavy / kill) along the cut, drips, emitters (stumps), stains and pools as 3D decals (capped), splashes on a body's bones, the blade's coat; flying drops drawn in the style's way (`LOOK`) |
| `iso/sever.js` | Severing: `PARTS`, `sever(who, part)` (the bone's meshes cloned into a rigid piece: gravity, tumble, corner impulses, friction, walls, sleep), stumps, the dropped sword's clatter, `nearestPart` (the joint nearest the blade) |
| `iso/exec/` | The executions: `markers.js` (isolation bubbles, kill line, the K prompt, `KM.pick`), `executions.js` (`EXECS`: five of batch 1 re-staged), `poses.js` (their keys in the flow's side-pose format), `stage.js` (the timeline on the clips `xR` / `xE`, the quick sheathe, cut lines, slivers, crescents, afterimages) |
| `iso/ui/overlay.js` | The ?iso page and its overlay: frame time, the model switch, the pipeline toggles, camera and hat, controls; every choice a key |
| `iso/sheet.js` | `?iso&sheet`: a frozen contact sheet of the loop's moments in the 8 facings, either look |
| `iso/reel.js` | `?iso&reel=<name>`: the Animation Flow page's demo scenarios on its script and clock (`window.__reel.steps(n)`), for `scripts/iso-reel.mjs`'s side-by-side sheets against the page's own |

- Everything in `src/iso/` keeps to the slice: never import it from today's game, and never import today's game modules (`screen.js` grabs `#game`) into it.
- A character's look is swapped through `look/look.js` only. The controller hands it the flow's side pose; a new look (a modelled character, a baked sprite sheet) implements the same four calls.
- The moves are the Animation Flow page's data: change them there first (or mark an addition in `moves-extra.js`), so the slice keeps matching what the owner approved.

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
- Skills and keys: move WASD / arrows · hold V walk · J slash (again in the follow-through for the next cut, up to six as landed cuts grow his basic skill) · Shift or L slide · Space jump · K glitch teleport, or on a lone enemy in reach an execution · I tap glitch double slash, hold Thousand Cuts · O hold Crescent Moon · P Cross Rift (hold to charge) · N Mirror Meditation · U Sky Drop · C tap: sit (any key stands), hold: Breath of Qi (kata; with ↓ the Seiza shield; at a shrine Lotus), in Storm Chain: Storm breath · X die (testing) · E tap: the locked-on item's verb, hold near the fallen: Harvest · 1-4 quick slots · Tab kit screen · G party hold / follow · E by a recruit: take them on, held by a downed companion: lift them · K with a companion set up for it: a paired execution · H cut a companion down, or him with nobody in the party (testing). Reserved by the design (not built yet): F counter, R Blade Recall, Q Lightning Chain; X becomes Time Slice. Storm Chain is passive: 8 s whenever the Qi meter fills, once every skill is mastered.
- Growth (owner 2026-10-01, `player/mastery.js`): he starts with J, slide, jump and K; a full meter casts a skill he has not mastered by itself, and three wild casts of one unlock its key. Every skill but J has a tree (rung, a fork picked on the Tab kit screen, a deeper node) filled by landed casts and gated by power (I / II / III). He has the party's four stats, VIG / EDG / SPD / FOC, at 1 plus gear; power multiplies on top. The page's Skills picker overrides mastery for testing, and the check runs on "all mastered".
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
