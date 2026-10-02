# The iso slice (Phase 0 of the new direction)

Open the game with `?iso` and you get the new direction instead of today's game: Iron Ash V3 (refined base, F1 menpō)
in a night courtyard in feudal Japan lit like The Last Night, seen through the picked camera (Sea of Stars preset,
pitch 54°, oblique, zoom 1), moving the way the Animation Flow page moves, fighting one red-armoured samurai. Without
the flag nothing changes: `src/main.js` only picks, and today's game boots from `src/game.js` exactly as before.

All of it lives in `src/iso/`. It is a test bed for the owner's picks, not the game yet.

## Running it

| | |
|---|---|
| `npm run dev`, then `/?iso` | the slice with hot reload (`/?iso&look=pixel` starts on the pixel look, `&calm` keeps the samurai from attacking) |
| `npm run build`, open `dist/index.html?iso` | the same single-file build as today's game; the flag picks |
| `/?iso&reel=chain` | one of the Animation Flow page's scenarios (idle, start, turn, stop, roll, chain, lunge, sheathe) on its script and clock; `node scripts/iso-reel.mjs chain 3` lays it out as the page's contact sheets do (with `AF_DIR` at the page's source, the page's own sheet above it) into `test-output/iso/reel-chain-vs.png` |
| `/?iso&style=1` | start on a style (0 Toon + dither, 1 Pixel-render, 2 Anime limited, 3 Painterly) |
| `/?iso&sheet` | a frozen contact sheet: four moments of the loop × the eight facings (`&rows=4,5,6,7` the other four, `&look=pixel`, `&foe`, `&zoom=1.9`) |
| `npm run check:iso` | builds, then `scripts/check-iso.mjs` plays the loop in Chromium and asserts it (below); screenshots in `test-output/iso/` |

three.js is a new dependency (`three`, pinned in `package.json`): run `npm install` once. A checkout whose
`node_modules` is shared with another and lacks it can point `ISO_DEPS` at a separate install
(`npm install --prefix /some/dir three@0.186.1`, then `ISO_DEPS=/some/dir npm run build`); `vite.config.js` aliases it.

**Controls.** WASD or the arrows run (the stick maps straight to the screen, all 8 directions). `J` cuts; again in
the follow-through for J2, then J3. `J` out of a fast run is the lunge. `Shift` or `L` rolls, and cancels a cut once
it has struck. Presses are remembered 0.2 s.

**The overlay** (beside the game, every choice also a key): the frame time; `M` the model (3D / Pixel); `V` the style
(Painterly, Pixel-render, Anime limited, Toon + dither); `C` clashes; `X` the finisher's close-up; the pipeline
steps `1` low-res target, `2` toon bands, `3` dither, `4` palette, `5` outline, `6` pixel upscale, `7` rim light,
`8` keep the glints, and the number of bands; `B` the bodies' camera (picked 39.5°, upright 20°, true 54°), the hat's
tilt and brim; `F` the facings (8 stepped, as baked sprites would be, or free); `9` mist, `0` rain.

The default style is **Painterly** (owner 2026-10-02 over the "Ronin 3D Styles" page: "Painterly with Anime Limited
clashing and attack full screen animation"). The camera and hat defaults are the 3D faces page's picks: bodies from
39.5°, the wide brim as drawn, hat tilted back 14°, the glints kept. The faces page's pipeline picks ("like this
actually": low-res target off, toon bands on (4), dither on, palette off, outline off) are the **Toon + dither** style.

## The style seam

A style (`gfx/style.js`) is how the 3D look is drawn and how often its frames are shown; it never touches gameplay
(the game steps at a fixed 60 Hz, the moves at 1/120 s, whatever the style). Switching is live, mid-fight.

| Style | Light (`gfx/shade.js`, `SH.uStyle`) | Pipeline it presets (each still a toggle) | Frames shown | Trail |
|---|---|---|---|---|
| Painterly (default) | smooth light broken by brush strokes, warm lights and cool shadows, a soft wide rim | hi-res, outline as a dark silhouette line round the characters only | 60 fps; the upper body's poses pushed 22% further, squash and stretch from the hips | a soft gradient |
| Pixel-render | 3 hard bands | the low-res target, the palette, a 1 px outline | 12 fps, held | a crisp smear, gone after a frame |
| Anime limited | two tones and a hot spot, a hard rim | ink outlines | on threes (8 fps), on ones (24 fps) round a hit | flat white |
| Toon + dither | 4 bands, dithered | the faces page's picks | 30 fps (the Animation Flow page's) | the page's dithered cyan |

The frame stepping is `SETTINGS.fpsFor` (anim/flow.js samples the pose and the position together at that rate).
The pixel look keeps its own drawing in every style; the stepping, the clashes and the close-up apply to it too.

**Clashes, every style** (Anime limited's, the owner's pick): during each hit-stop the frame goes black and white,
then inverted (`gfx/post.js`, `MOMENT.impact`); focus lines rush in on the hit; speed lines streak behind a roll, a
lunge, a skid or a knock-back (`fx/fx.js`).

**The finisher's close-up** (`fx/cine.js`): when J3 starts on a samurai within reach, the camera punches in on the two
of them (×3.2), the screen letterboxes, the courtyard gives way to ink and speed lines, the strike lands with its
impact frames, and the camera pulls back: 0.8 s; any key press skips to the pull-back. Presentation only: gameplay keeps
its clock and hitboxes. Sky Drop and the executions take the same close-up when they come to the slice.

## The pipeline, per frame

1. **Scene** (`gfx/shade.js`): every model is drawn into one target with three attachments: the colour, the data the
   outline reads (depth, object, part) and the normal. Light is the faces page's: a key from above, in front, from his
   right (here the moon), a floor bounce, a cool rim from behind, and the brim's shadow (the hat really shadows his
   face, his shoulders and the floor); the four lanterns add warm pools; the ground mist drifts in the same shader.
2. **Toon** cuts the light into `bands` levels; **dither** (a 4×4 Bayer pattern, anchored to the world so it never
   swims) breaks the top of each band into the next; with toon off the light is smooth.
3. **Silhouette**: a second pass draws a character wherever something nearer hides him (the walkway's posts, the
   tōrō, a wall), as a dithered cyan shape, never over his own visible pixels (the stencil).
4. **Post** (`gfx/post.js`): **outline** (a 1 px ink line round each character where the depth jumps, a darker line
   where his plates meet or a fold turns, a soft line on the world's ledges), **palette** (every pixel to the nearest
   of ~80 colours from Iron Ash's ramps, the cyan, the samurai's reds, night stone and lantern light; `gfx/palette.js`),
   the effects layer (the blade's trail, sparks, dust, cracks, the black slash, the glints) and the rain.
5. **Upscale**: with the low-res target on, the picture is 960×540 render pixels (the world's 480×270 at 2×) shown at a
   whole multiple, nearest-neighbour; off, the target is drawn at the canvas's own size on the screen (k = its pixels ÷
   960, up to 3), so the bands and the dither are finer. Pixel upscale off lets the browser smooth it instead.

**The camera** (`gfx/view.js`): an oblique projection, not a rotated one: screen y = a·z − b·y with the floor at
full depth (a = 1) and heights at b = cos 54°/sin 54° = 0.727, as Top-Down Views draws "pitch 54 oblique". Bodies get
their own camera through a shear on each character's root that keeps his depth the world's (so he still sorts against
walls and pillars): picked 39.5° (heights as the walls', A = 0.6, tdv's and the faces page's cheat), upright 20° (full
height, the Sea of Stars view's tall read), or true 54° (no cheat). The camera follows him with a little lag and
look-ahead, shakes on heavy hits, and is snapped to whole render pixels.

## The model seam: a look

One controller (`play/`) owns movement, the state machine, the flow poses, hitboxes and timing. What a character looks
like is a **look** (`look/look.js`), four calls, and nothing outside the look layer knows which one is active:

```
look.mount(scene)     add its objects to the scene (both looks draw through the same pipeline)
look.show(frame)      draw this frame: { pose, x, y, z, yaw, flash, tint, tintA, alpha, hero }
                      pose = the flow's side pose (the rig's joint angles and targets, anim/moves.js)
look.stamp(g)         pixels it adds on the effects layer after the scene (the 3D eyes); may do nothing
look.dispose()
```

- **3D** (`look/three/`): Iron Ash V3 as a procedural low-poly model on a skeleton of Object3Ds (rigid armour on
  bones, no skinning). The side pose is stood up in 3D: the near limbs are his right, the far his left, and arms and
  legs reach their targets by two-bone IK, so planted feet stay planted and two hands hold one hilt. The secondary
  springs (hat lag, kusazuri, sode, the jinbaori's panels, the bank into a turn) move hinged pieces. The glint rule
  keeps his eyes: the brim hides them at this camera, so two cyan pixels are stamped just under its edge when he
  faces the camera.
- **Pixel** (`look/pixel/`): the pages' own 2D engine (Top-Down Views' `engine.js` with the Animation Flow patches,
  vendored verbatim) draws FC.RF1 from the same pose in any facing, with the body camera's A and B, one sprite pixel to
  one render pixel. The sprite stands in the scene as a card at his feet (upright above them, its lower rows laid on
  the floor), so it takes the night's light, the lanterns, the mist, the flash and the silhouette like a model.

A hand-made sprite sheet would be a third look: `show` picks its frame from the pose's clip and time, or from the pose.

## The motion: the Animation Flow page, ported

`anim/flow.js` is the page's engine (af/core.js: clips keyed in move space or procedural, 2–4 frame blends into each
clip, the springs, planted feet, the pose and position sampled together at 30 fps, the facing stepping through the 8
facings one a frame) and `anim/moves.js` its moves, verbatim: idle, guard, start, the run (its phase driven by the
ground covered), stop, the 180° skid, the roll, J1, J2, J3, the lunge, the samurai's recoil, knock, death and falling
cut, the sheathe. Units are the page's (rig px, ×0.5 to world units; he stands ~46 render px with the hat, as the
pages draw him). Additions, marked as such: `runArmed` (`anim/moves-extra.js`, the run with the blade out) and the
controller's rules (`play/hero.js`): which press a state takes, the chain beats, the cancel windows (a cut into the
roll from its hit + 2 frames), the cut turning to the samurai in front and stepping in to reach him. Hit-stop by
weight is the owner's 3 / 5 / 8 frames; the white flash 2 frames; heavy hits shake, light ones do not.

**The page's pose on the 3D skeleton** (`look/three/rig.js applyPose`), joint for joint:

| The page's pose | The 3D skeleton |
|---|---|
| `pel` [forward, up] | the pelvis (hips bone) |
| `lean` | the spine and chest (a quarter on the pelvis, the rest on the spine) |
| `head` | neck and head |
| `fN`, `fF` (near = his right, far = his left), `kneeDir` | right and left ankles by two-bone IK through the knees (hip joints, thighs, shins), the knee toward `kneeDir` or forward |
| `hN`, `hF`, `elb` | right and left wrists by two-bone IK through the elbows (shoulders, upper arms, forearms), the elbow back or down |
| `blade` { `g`, `ang`, `two`, `vis` } | the katana in the right hand at the grip, pointing along `ang` in his forward/up plane, the left hand on the hilt when two-handed, only `vis` of it out of the saya; `out: 0` puts it in the saya at his left hip (`sayaTilt` tips the saya) |
| `hatTilt`, `hatLag` (springs) | the jingasa's own angle and lag on its pivot |
| `kzLag`, `kzLift`, `sodeLag`, `speed`, `swing` (springs) | the six kusazuri hinges, the two sode hinges, the four jinbaori panels, the hat cords |
| `roll` (spring) | his lean into a turn |

The near limbs are drawn at his right side and the far at his left, a few units apart; the page's rig has no
lateral axis, so a 3D artist's clips are what will add twists and sideways reach.

## Placeholder, and what a 3D artist replaces

- **The model** (`look/three/ronin.js`): boxes, cones and rings placed in code. A modelled Iron Ash (a real head and
  menpō, laced plates, cloth folds) replaces it, rigged to the same skeleton names, or the look is reimplemented on a
  skinned mesh with the same four calls. The proportions are the pages' (rig.js `SK`).
- **The animation**: today the moves are the Animation Flow page's 2D keys stood up in 3D. Authored 3D clips (with
  real twists, a horizontal J2, cloth simulated in 3D) replace `anim/moves.js` behind the same pose interface, or the
  pose becomes joint rotations and the side-pose conversion (rig.js `applyPose`) goes away.
- **The room** (`world/room.js`): boxes and a shader floor. Modelled set pieces, a real tile roof, trees and props
  replace it; the light uniforms and the cut-away rule stay.
- **The effects**: the trail, sparks and the black slash are the pages' pixel effects in world space; they stay.

## What the check covers (`npm run check:iso`)

No page errors; the run in all 8 directions (he moves where the keys point and is drawn facing that way); the stop;
the roll (its i-frames, ~25 units); walking up to the samurai and J1 → J2 → J3 with all three hits landing and three
reactions, an impact frame in the hit-stops and the finisher's close-up; a cut cancelled into the roll; hitting him
until he dies, and his respawn; the four styles switched live with a cut in each; the same chain with the pixel look;
one screenshot per pipeline step flipped. SwiftShader draws a few frames a second, so the page runs with
`&tick=8` (8 game steps a frame) and every wait is on the game's clock.

## Performance

The CPU side is ~4–6 ms a frame (both looks; the pixel look redraws its 96×100 sprite only on its 30 fps samples, ~4 ms
each). The GPU draws ~100 draw calls into a 960×540 (low-res) to 2880×1620 (hi-res, k = 3) target with three
half-float attachments, then one full-screen pass: light work for any laptop GPU. In this container's software GPU
it is 3–5 fps, which is why the check drives the clock.

## The next phases

1. **The owner's picks on this slice**: 3D or pixel; the body camera (39.5° hides the face under the brim; upright
   shows it); the pipeline steps; the room's mood.
2. **A modelled and rigged Iron Ash** in the picked look, authored 3D clips for the core loop, cloth in 3D.
3. **Baking**: render the 8 facings of every move to sprite strips offline (the Dead Cells way), the same pipeline
   steps, so the game ships pre-rendered pixels; the look interface takes a sheet.
4. **Grow the loop** onto the real game: today's skills, executions and items on the new camera and rig.

## The rest of today's game, in 3D (`src/iso/port.js` and its folders)

Owner (2026-10-02): "The rest of today's game moved to 3D: companions and paired executions, items and Harvest, the
HUD and skill bar, combo prompts, and click-to-move. yes please." `port.js` wires it all to the slice's loop: `main.js`
calls `initPort` once, and four hooks a step (`input`, `tick`, `drawFx`, `drawHud`); a reel (`&reel=`) and the sheet
never start it. Today's game logic is imported, not copied, wherever it has no drawing of its own:
`state.js` (INV, S, P.qi), `items/inventory.js` (every gain, levels, the power tier), `party/kit.js` (ROSTER, kits,
roles, PAIRED and `fits`, `gainExp`, `bury`, the bag), `traits/` (a companion's trait mix), `ui/hud-kit.js`,
`ui/pixfont.js`, `ui/icons.js`, `items/item-sprites.js`, `fx/numbers.js`. Those draw through `screen.js`'s `g`, so
`hud/canvas.js` hands `screen.js` the HUD's canvas (today's `#game`, 480×270) before anything else loads it.

| Folder | What |
|---|---|
| `ctx.js` | What the ports share: the hero, the samurai, every character, the scene; `busy` (a system has the hero: an item's act, Harvest, a lift, a quick-slot use, a paired execution) and `held` (characters a system has taken over); main.js skips their controllers that step |
| `party/` | `ally.js` a companion's body (the flow actor, the look, kit, traits, health, down / lift / death; the verbs a brain gives), `ally-look.js` their look behind the look seam (his model, white eyes, their own surcoat colour, their weapon's length), `party.js` presence (spawn today's party, their hits, the samurai's on them, EXP and levels, burial), `paired.js` paired executions re-staged in 3D |
| `items/` | `inv.js` today's INV and Qi, `big.js` the four big items in 3D and their acts, `pickups.js` the magnet and the relic, `quick.js` the quick slots, `items.js` E (tap, hold: Harvest or lift) and 1-4, `item-fx.js` streams of light, lightning, the smoke, the cyan edge |
| `hud/` | `canvas.js` the HUD canvas, `hud.js` prototype 20's HUD and the prompts over the world, `skill-bar.js` the skill bar (`addSkill`), `world-ui.js` numbers and lines over heads |
| `combo/prompts.js` | The combo prompts |
| `input/` | `click.js` click to move, `path.js` A* round the room's solids, `touch.js` the swipes and the stick |
| `anim/moves-port.js` | The moves they needed, marked as additions: pray, take, read, throw, raise, hone, incense, harvest, fall / downed / rise / expire, lift |

**The HUD** is today's, drawn as displayed with today's pieces at the game's own scale: a 480×270 canvas that the post
pass lays over the finished frame (`gfx/post.js setHud`), whole game pixels, after the clash, the close-up's ink and the
letterbox, so it never inverts. Health and Qi (notched in thirds; STORM while Storm Chain runs: a landed hit on a full
meter wakes it, items never do), the skill bar under them, the party's bars under that (ten to a row, a blink while one
is down), mon and shards, the bottom bar (weapon, quick slots 1-4 with their use draining, four charms). Over the
world: lock-on brackets and the E prompt on big items, HOLD: LIFT / HOLD: HARVEST, K WITH KURO, a companion's bleed-out
clock, the combo prompts, today's damage numbers.

**Keys added:** `E` tap the locked-on item's verb, hold 0.2 s Harvest by the fallen or lift a companion who is down;
`1`-`4` quick slots; `K` a paired execution (or the finisher on a combo's K prompt); `T` combo prompts on / off; `H`
(testing, as today's) cuts the nearest companion down, again while down kills them. The overlay's pipeline steps moved to
`Alt`+`1`…`0`, since 1-4 are the quick slots. Left click moves him (below); touch swipes.

**Flags:** `&solo` no companions; `&combo=free` the plain J ladder (the core loop's check runs with both); `&swipe` the
mouse acts as a finger; `&pair=cross` (or batter, skewer, vault, switch) K plays that paired execution when a partner
fits it.

### Companions

Today's party (Kuro: yari, Grim + Soldier; Suzume: twin tanto, Nimble + Restless; Tetsu: nodachi, Heavy + Lumbering)
stands behind him. Each is the hero's model through the look seam (3D or pixel, switched with M like everyone), told
apart by white eyes and their surcoat's colour; the blade's length is their weapon's (the weapons work gives real 3D
weapons). Their traits come through today's mixer: run speed, lean, a bow of the head. They follow in ranks of six,
and fight once there is a fight (his blade out, the samurai cut lately or swinging) from their role's place (today's
ROLES: a duelist beside you, the line between you and him, a flanker round his far side, a breaker straight in), cutting
J1 / J2 on their weapon's cooldown (FOC shortens it); a hit pauses 30% of the time, as today's. The samurai goes for
whoever standing is nearest, and his falling cut lands on any of them where it falls. Cut to nothing they kneel (15 s,
a hand on the floor, breathing hard); hold E beside them and he bends and pulls them up (1.1 s; they stand at 35%);
struck again while down, or left too long, they die for good: they lie still, fade, and today's `bury` puts their gear
back in the bag. A kill gives the killer 60 EXP and everyone standing within 160 units 30, on today's curve; a level picks
its own stat by today's weighted chance (a line over them: "LV 2 +EDG"). Iron Oath (Kuro wears it): once, a blow meant
for him is taken by them.

### The party's interface (for the squad AI, claude/3d-squad-ai)

This port owns the companions' presence, bodies, health, down / lift, EXP and paired executions; the squad AI owns
their decisions (roles, orders, formations, RTS selection). It drives them through:

```
import { PARTY } from 'src/iso/party/party.js'
PARTY.allies                 every companion in the room (an Ally: .x .z, .c (today's ROSTER entry: name, kit.weapon,
                             traits, lv, exp, stats), .hp 0..1, .standing, .downed (.downT s left), .dead, .role (ROLES row),
                             .reach, .state (the flow clip), .slot)
PARTY.standing() / downed()  who can take an order / who needs lifting
ally.moveTo(x, z)            a standing order, kept until replaced: run there round obstacles (input/path.js), then hold
ally.attack(samurai)         fight him from their role's place
ally.hold() / ally.follow()  stand still / follow in rank (ranks of six behind him)
ally.order = null            back to the default brain (fight a fight near him, else follow)
ally.brain = (ally, dt) => order    asked every step instead of the standing order (null: use `order`)
PARTY.defaultBrain(ally)     today's decision, to fall back on
PARTY.on.down / lift / die / level / hit / kill   arrays of listeners (ally, …)
PARTY.add(rosterEntry, x, z) / PARTY.remove(ally)   (recruiting adds; kit.js makeCompanion makes one)
CTX.held                     a Set: a companion in it is moved by a system (a paired execution); leave them be
```

Mouse: `input/click.js` moves the hero on a left click unless `CLICK.blocked(event)` returns true: the squad AI sets it
to "something is selected". Right click is never read here.

### Paired executions

K on a lone samurai within 70 units, with a standing companion within 90 who meets one of today's PAIRED rules
(`kit.js fits`, and his own weapon where a pair needs it), at most one every 5 s for the whole party, never the same
twice running. Staged in 3D on the flow's moves (`party/paired.js STAGE`): **crossing cut** (he glitches to the near side,
they run to the far side, both lunge through him, hold, resheathe together; he falls on the click), **batter up** (their
heavy cut knocks him to a knee; he blinks in and cuts), **skewer** (the spear runs him through; he comes round the back),
**pole vault** (they plant beside him, he rolls over and comes down with J3), **switch** (the shadow step trades their
places, both cut). The killing blow takes the full-screen close-up (owner: "the cut scenes on killing blows is an amazing
touch"), execution-grade hit-stop, the black slash and the big number. While one plays it holds him, the partner and
the samurai, and their cuts' own hits are swallowed (the staging lands its blows). The other eight of PAIRED wait for
their weapons in 3D. With no partner, K on a combo's K prompt is a solo finisher (a blink behind him, the close-up, J3),
until the executions work sets `CTX.execute`.

### Items and Harvest

The four big items stand in the courtyard as low-poly props (placeholders): the Wayside Shrine at the north-west
(PRAY: hands together, the flame's light streams into him, health and Qi fill; prayed at, it takes an OFFER of 3 shards
for a power upgrade), the Grave Nodachi in a mound to the south (TAKE: the pull, dust, the hit pause; his weapon, the
banner, his blade longer), the Sealed Chest by the walkway (CUT: J1 splits the seal, the lid flies on the click, four mon
and three Qi motes arc out and fly to him), the Rift Tablet to the south-west (READ: the glyphs light in order, the light
leaves the stone for him, SKILL LEARNED: CROSS RIFT). Lock-on: the nearest usable one within 30 units gets today's
brackets and E prompt. Small pickups (Qi motes, mon, shards, a rice ball, the four consumables) are today's sprites at
2× on the effects layer and fly in within 22 units; the Split Tsuba goes to the first empty charm slot. Quick slots:
the static bomb (smoke over the whole screen for 6 s, the samurai lose him and every one counts as lone for K; he
glitches 17 units back), the thunder talisman (lightning on the nearest samurai within 220, jumping once), the whetstone
(the cyan edge on his blade for 20 s, Qi twice as fast), the grave incense (60% over 1.5 s; moving or a hit puts it
out). Every kill leaves a body (today's placeholder remains until the bodies stay): hold E within 40 units and he turns
north (owner), kneels, and cyan streams carry 50 EXP a second into him.

### Combo prompts and swipes

As approved (C1A … C12A; `combo/prompts.js`): a cut that lands puts a prompt over the samurai: an arrow (→ at him,
drawn on screen toward him; ← away; ↑ ↓ up and down the screen, offered while he is beside the samurai) or J; PC answers
with the direction held and J (70 ms of slack), touch with a swipe. A white ring closes on the beat (0.18 s after the
hit); the window runs 0.35 s past it: PERFECT (±0.05 s, a little Qi), GOOD, LATE; an early answer waits for the cut's
chain beat. A wrong answer or no answer: MISS, the chain ends, 0.45 s before J works again; a whiff ends it too. The
last link (LAST) is the finisher (J3); a finisher landed on a lone samurai offers K (FINISH). Chain length follows basic
skill (today's ladder on `INV.basic`, landed cuts), at least the slice's three. → is the lunge cut, J the answer cut
(J2); ← ↑ ↓ (spin, launch, kick) play J1 until claude/3d-skills brings those moves (`MOVES` picks the first that exists).

Touch (`input/touch.js`): a floating stick on the left 45%; tap J; swipe a dash that way (the roll), the lunge cut on a
samurai within 96 units and 40°, up the jump (the roll until there is one); hold 280 ms, a flick there and back, and a
two-finger tap go to hooks (`TOUCH.onHold`, `onParry`, `onTwo`) for the skills; double tap K, read on the second
touch-down. During a prompt a tap answers J and a swipe its direction. Presses go in as the keys' own events, through
the same buffer.

### Click to move

Left click (`input/click.js`): the floor, and he runs there round the walls, posts, the tōrō and the items (A* on 6-unit
cells, pulled tight); a samurai, and he runs in and cuts (a click on him while a prompt is up answers it); a big item, and
he goes to it and does its verb; a companion who is down, or the fallen, and he goes and holds E (lift, Harvest). A small
ring marks where. Any direction key drops the click.

### What the check adds (`scripts/check-iso-port.mjs`, after the core loop's steps, on a fresh load)

The HUD's health fill read off the canvas; the party following within reach; a click path round the tōrō; a combo
prompt answered right (graded) and wrong (MISS, the recovery); the companions landing cuts; a kill, the companions' EXP,
Harvest facing north and its EXP; a paired execution (its kill, the close-up, the 5 s cooldown); a companion down and
lifted by a click on them (35%); one killed while down, buried, their weapon back in the bag; the four big items by a
click each (health and Qi full, the nodachi his, the chest's mon, the tablet's banner); the coins' magnet and the relic
in the empty charm slot; the four quick slots (the smoke, the talisman's hit, the edge, the incense; each stack one
less); a click on the samurai cutting him; the swipes (the stick, a tap cut, a dash, a double tap).
