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
| `/?iso&foes=1` | one samurai (3 by default, up to 5); `&calm` keeps them all from attacking |
| `/?iso&power=3&pick=chain:b&trees&qi=0&assist` | the new skills' setup the Tab screen would hold: the power tier, a tree's fork, every tree full, the Qi meter at start, the counter's assist ring |
| `/?iso&group=mixed` | enemy types instead of the lone samurai (`docs/enemies.md`): the overlay's Enemies picker, `,` steps through the groups, `.` brings one back (moved off G and R: the party's hold / follow and Blade Recall) |
| `/?iso&idles` | the twenty idles looping side by side (`&who=p:Old%20master` one persona for all, `&folk` townsfolk, `&only=kneelRest,leanSword`, `&yaw=0..7`, `&body=39.5`, `&zoom=3`) |
| `/?iso&folk=0` | the courtyard without its townsfolk |
| `/?iso&style=1` | start on a style (0 Toon + dither, 1 Pixel-render, 2 Anime limited, 3 Painterly) |
| `/?iso&weapon=yari` | start with a weapon (any of the 15 ids below; `=` steps through them in play, `-` back) |
| `/?iso&arsenal` | the weapons' contact sheet: weapons down (`&w=0-4`, `&w=yari,bo`), the loop's moments across in one facing (`&face=0..7`, `&mo=J1,J3`), or the eight facings of one moment (`&m=J1`); `&sweep` also plays every weapon through the loop in all 8 facings off screen and leaves the result in `window.__arsenal` |
| `/?iso&sheet` | a frozen contact sheet: four moments of the loop × the eight facings (`&rows=4,5,6,7` the other four, `&look=pixel`, `&foe`, `&zoom=1.9`) |
| `/?iso&squad` | the squad battle: five companions against a samurai squad, enemy AI, roles, orders and the mouse (`docs/squad-ai.md`; `&calm` keeps the foes at their posts) |
| `npm run check:iso` | builds, then `scripts/check-iso.mjs` plays the loop in Chromium and asserts it (below); screenshots in `test-output/iso/` |

three.js is a new dependency (`three`, pinned in `package.json`): run `npm install` once. A checkout whose
`node_modules` is shared with another and lacks it can point `ISO_DEPS` at a separate install
(`npm install --prefix /some/dir three@0.186.1`, then `ISO_DEPS=/some/dir npm run build`); `vite.config.js` aliases it.

**Controls.** WASD or the arrows run (the stick maps straight to the screen, all 8 directions). `J` cuts; again in
the follow-through for J2, then J3. `J` out of a fast run is the lunge. `Shift` or `L` rolls, and cancels a cut once
it has struck. Presses are remembered 0.2 s. The skills, as today's game keys them (below): `I` tap the double slash,
hold Thousand Cuts · `O` hold Crescent Moon · `P` Cross Rift (hold to charge) · `N` Mirror Meditation · `U` Sky Drop ·
`C` tap sit, hold Breath of Qi (with `↓` Seiza, by the tōrō Lotus, in the storm Storm breath) · Storm Chain passive.
The reserved keys: `F` counters (tap as the blow comes), `R` throws the blade (tap again to call it back, hold to go to
it), `Q` casts Lightning Chain, `X` Time Slice on a full Qi meter (below). `=` the next weapon (`-` back).
`K` executes the samurai when he is alone and in reach (the K keycap over him).

**The overlay** (beside the game, every choice also a key): the frame time; `M` the model (3D / Pixel); `V` the style
(Painterly, Pixel-render, Anime limited, Toon + dither); `=` / `-` the weapon (the 15, with its line; it was T and
Shift+T: T is the facings, Shift the roll); `Y` clashes (it was C: C is Breath of Qi now); `Z` the finisher's
close-up (it was X: X is Time Slice now); the pipeline
steps `Alt+1` low-res target, `Alt+2` toon bands, `Alt+3` dither, `Alt+4` palette, `Alt+5` outline, `Alt+6` pixel upscale,
`Alt+7` rim light, `Alt+8` keep the glints, and the number of bands (the pipeline's numbers are Alt + the number since the
squad battle, whose groups are the bare 1–9); `B` the bodies' camera (picked 39.5°, upright 20°, true 54°), the hat's
tilt and brim; `T` the facings (it was F: F is the counter now) (8 stepped, as baked sprites would be, or free);
`Alt+9` mist, `Alt+0` rain. Personality: `[` the ronin's, `]` the samurai's (a character, a person of a culture, or one
trait), `\` a new person of the same culture, `;` the names over the townsfolk (at the merge these moved off P / O / R / T,
which are Cross Rift, Crescent Moon, Blade Recall and the facings). Enemies: `,` the next group, `.` the group again.

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
its clock and hitboxes. The executions take the same close-up (below), and so does the killing blow of any cut; Sky Drop will when it comes.

## Blood, severing and the executions (`gore.js`, `fx/blood.js`, `sever.js`, `exec/`)

The owner's request (2026-10-02): blood on every hit, limbs cut on a killing blow, and today's executions re-staged
in 3D. One hub, `gore.js`, wires it in: main.js calls `installGore` after `hitRules`, then `sync()` before the scene is
drawn and `draw(g)` on the effects layer; the world steps it through `W.post` (sim.js), so a hit-stop holds the blood,
the pieces and an execution like everything else. It listens to the hits (it wraps `W.on.hit` and `W.on.strike`, and
the two controllers for K) rather than changing them: rules.js still decides what lands, and no timing, hitbox or move
changes.

**Blood** (`fx/blood.js`). A landed hit sprays along the way the cut travels (the blade tip's last move in its trail,
leaning away from him), its amount by weight: light 12 drops, heavy 24, a kill 42 and a gush. What flies is pixels on
the effects layer, drawn the style's way (keyed by its trail): Painterly soft round drops trailing a brushed streak,
Pixel-render hard palette squares, Anime limited flat cel teardrops with an ink edge and a hot highlight, Toon + dither
1–2 px drops in three bands. What lands is 3D through the scene material, so each style's light, bands, dither,
palette (a blood ramp, `RAMP.r`) and outline take it as they take the courtyard: the drops of one spray land as one
stain (blobs stretched along their travel), a body bleeds a pool that spreads under him, and stains stay on the floor
(40 kept; the oldest dissolve). Each hit splashes the samurai's plates where it landed (on the nearest bone's surface,
facing the blow), heavy hits and kills spatter the ronin's jinbaori and kote too; his blade takes a red coat from the
tip down that drips while he holds it out, and the sheathe's chiburi throws it off in a line of drops on the floor
(the execution's quick sheathe too). The samurai's strike bleeds the ronin.

**Severing** (`sever.js`). A killing blow cuts the part whose joint is nearest the blade's line (its middle to past
its tip): the head, an arm at the shoulder or the elbow, a leg at the hip or the knee, or the body at the waist. The
procedural model's bone (and everything under it) is cloned into its own piece, a simple rigid body: gravity, a tumble,
impulses at its box's corners against the floor (bounce, friction), the courtyard's walls; it sleeps when it stops.
It has a raw cap (red round a pale bone) and bleeds a while. On the body the part's meshes are hidden and a stump is
left at the joint, spurting in pulses, then dripping. His sword falls as a piece too and clatters (sparks and grit on
each hard landing). A piece is drawn through the bodies' camera round a point that eases from his feet to the floor
under it, so it leaves the body exactly where it was drawn and lies flat where it lands. With the close-up on, the cut
happens on the impact frame (the piece is already a frame along its way). The killing blow of J1, J2 and the lunge now
takes the full-screen close-up too (the owner: "the cut scenes on killing blows is an amazing touch"), started as the
cut begins, like J3's. He stands up whole: the stumps go, the pieces dissolve; the floor keeps its stains.
The pixel look's drawing cannot lose a limb: there the cut is remembered (shown if the 3D model comes back) and only the
blood plays.

**Executions** (`exec/`). The markers are today's (`exec/markers.js` from assassin/markers.js): every samurai has an
isolation bubble on the floor (cyan and turning when he is alone, grey with a link line when another stands within 36),
a kill line to the nearest one in reach (120) with a white pulse when K would take him, and the K keycap over him only
when he is in reach and alone. K (buffered like J) from rest, a run, a guard, the sheathe or a cut past its strike:
the ronin crouches, glitches out and lands where the execution starts; both bodies are then played by its timeline
through the flow's own actors (clips `xR` and `xE`, so both looks, the springs, the hit-stops and the styles' frame
stepping apply), with the full-screen close-up from the landing through the killing blow. Five of the approved batch 1
are ported on their own beats (`exec/executions.js`, poses re-staged in the flow's side-pose format in `exec/poses.js`),
each cutting him into real pieces with the severing above: **Behind the back** (back to back, the blade driven
backward into the neck, the head flies forward), **Through and past** (through him in a frame, three afterimages; on
the sheath's click the top half drops and pitches the way he turned, the legs fold), **Whirlwind** (six cuts from six
sides, a glitch between each; the wide last one throws him and he comes apart in the air), **Far behind** (already
through him; he feels it across his chest; on the click the top slides off the cut), **Peek-a-boo** (cuts made before
we saw them; he looks down at his hands and comes apart). Each ends in the batch's quick sheathe (the flick, the tip
into the saya, the click), and K plays them in turn, never the same twice running. The effects that are the stage's
own (cut lines, glitch slivers, crescents, speed lines, the ronin's afterimages in either look) are in `exec/stage.js`.
Not ported yet: Rising launch and Peek-a-boo from behind (the paired ones are the party's). With one samurai in the
room he is always alone; the bubbles and the link line are there for when the slice has more.

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

## The new skills: F, R, Q, X (`skills/`, beside the I O P N U C kit)

The four keys the design reserved, built here first (design-notes, "The reserved keys, built in the 3D test level").
Each lives in its own file and owns the hero while it plays; `skills/reserved.js` is the one seam main.js asks first each
step (`skillControl`, before the I O P N U C kit's `skills.js` `control`; the check reads it as `window.__iso.reserved`), and binds the keys into the slice's buffered input.

| File | Owns |
|---|---|
| `skills/reserved.js` | The seam: keys, presses through the 0.2 s buffer (refused on a cooldown or a gate, never remembered), who owns the hero, the events each skill listens to (chained onto the world's), the rules' `onStrike` hook (the counter) |
| `skills/kit.js` | Cooldowns, the Qi meter Time Slice spends, the power tier's numbers (`TIER`), growth (`tv`, `castStart`, `landed`: 1B's rules on the shared trees in `player/trees-reserved.js`), the words over his head |
| `skills/reserved-moves.js` | The skills' moves, additions in the Animation Flow page's language: the counter stance, the block, *receive and flow*, *along the blade*; the throw, the call, home, the catch, the anchor; the cast, the yank, the draw-cut, the dragged samurai; the iai crouch, the cut held in stopped time, the kneel; and the samurai's thrust |
| `skills/counter.js` | F: the stance, the 0.2 s window (counter vs block), the answer per attack, indicator A (glint and star) and B (the closing ring) |
| `skills/recall.js` | R: the thrown blade as its own mesh (lit in the active style), its flight, turn and hang, the thread, the three recalls, the cuts on the way through, the kills on the click |
| `skills/chain.js` | Q: the links (Storm Chain's bolts and rule), the hook, the yank, the drag, the draw-cut |
| `skills/timeslice.js` | X: the zone, stopped time (the samurai taken out of the world's step, `MOMENT.gray` in the post pass), the pass along the shortest path, the click |
| `skills/sfx.js` | Their effects in each style's hand (bolts, thread, rings, the star, streaks, hairlines) |
| `skills/reserved-hud.js` | The skill bar (four slots and the Qi meter, bottom centre) and the words over his head, in the HUD's pixel font |

Shared files touched, minimally: `play/input.js` (`bindKey`, `held`), `play/rules.js` (a cut lands on every samurai
in front of it; `onStrike` / `onLanded` hooks), `play/foe.js` (a squad keeps a step apart, `ATTACKS`, `frozen`),
`play/char.js` and `look/three/rig.js` (the blade away: no katana in the hand or the saya), `play/hero.js` (`noCut`),
`gfx/post.js` (`MOMENT.gray`), `look/pixel/lookpix.js` (the vendored engine has no empty saya: the hand keeps only the
hilt while the blade is thrown), `ui/overlay.js` (Z, T, the assist box), `main.js` (the squad, the seam).

## The weapons (`weapons/`)

Every weapon of today's game (`src/weapons/`) is here (owner 2026-10-02: "The 15 weapons in 3D. Only the katana exists
there."), in the same order and with the same reach and weight, picked in the overlay (`=` / `-`, `&weapon=<id>`), live mid-fight.
The slice never imports today's game: the numbers are copied into `weapons/arsenal.js`.

| `arsenal.js` | `ARSENAL`: id, name, line, reach, weight `{ stop, shake }`, carry, the model's length either side of the grip (`ext`), one or two hands; `equip(char, id)` |
| `models.js` | `MODELS`: the 15 procedural models (origin at the right hand's grip, +z to the business end) and their saya, slings and coils |
| `stow.js` | `STOW`: where each rides when home, in a bone's frame; `mountOf` (the same place in the side pose's plane, for the poses' draw and stow) |
| `wield.js` | `equipModel(rig, id)`: builds a weapon onto a 3D look's rig and installs `rig.wield`, which places it each frame (in the right hand, home, the left hand's weapon, the fan, the free stick, the chain) and hides the built-in katana |
| `poses.js` | Each weapon's take on every move, `CLIPS['J1@yari']` (flow.js plays it for an actor whose `wid` is the weapon), and the `post` every pose of it passes |
| `cuts.js` | `CUTS`: the weapons' grips on the katana's keys, mapped from today's per-weapon poses |
| `picker.js` | The overlay's weapon row and `=` / `-` |
| `sheet.js` | `?iso&arsenal` (the contact sheet) and the sweep the check reads |

| Weapon | Carried | Its moves (J1 · J2 · J3) | Reach · weight |
|---|---|---|---|
| Katana | saya at the left hip (the ronin's own model) | the Animation Flow page's: iai draw · falling diagonal · the heavy chop | 1 · 1 |
| Yari | slung across the back, head over the right shoulder | drawn over the shoulder, the draw-back and the thrust (the back fist driven to the front one) · whipped overhead and beaten down · raised and driven into the floor | 1.5 · 1 |
| Nodachi | down the back, hilt over the right shoulder, the long saya always there | drawn up over the shoulder as the wind-up, down through the front, followed through low · swung back up through the front and over · the chop | 1.35 · 1.6 (shake 2) |
| Twin tanto | two saya at the front of the obi | a backhand across the front · the back hand's reverse-grip hook · both blades down from overhead | 0.8 · 0.7 |
| Naginata | slung | wound high behind, swept low at the shins · spun, raised, chopped · raised and chopped | 1.4 · 1.1 |
| Kanabo | down the back, grip over the shoulder | drawn straight up, dropped onto the floor · swung back up and over · raised and dropped | 1.15 · 2 (shake 2.5) |
| Kusarigama | the sickle through the obi, the chain coiled at his back | the chain arm cocked, flung, the chain thrown straight out and yanked home · the sickle hooked in · the weight whirled overhead and slammed | 1.6 · 0.8 |
| Tessen | shut, through the obi | snapped shut and driven down · flicked open and swept across · shut, overhead | 0.7 · 0.6 |
| Bo staff | slung | the front end cracked down · spun so the back end leads and rises · the crack | 1.35 · 0.9 |
| Tetsubo | slung | the bo's, both fists near the butt so the iron end lands | 1.3 · 1.8 (shake 2.2) |
| Kama pair | two through the obi, handles up | the twin tanto's, the back hand's kama in a forward grip | 0.85 · 0.8 |
| Jitte | through the obi | the katana's, one-handed | 0.75 · 0.8 |
| Daisho | both saya at the left hip | the katana's, one-handed, the wakizashi in the back hand · the answer cut is the wakizashi's | 1 · 1.1 |
| Nunchaku | folded in the obi | the katana's, one-handed, the free stick a beat behind | 0.95 · 0.7 |
| Wakizashi | saya at the left hip | the katana's, shorter | 0.85 · 0.8 |

**The timing is the katana's.** A weapon's take on a keyed move is the katana's clip with the same key times, easings,
events (`hit`, `impact`, `click`) and root travel, and its legs and body; only the arms, grips and the weapon's angle are
laid on its keys (`cuts.js`: one grip per key, `null` keeps the katana's). Loops (the guard, the armed run, the roll,
the hit reactions) are the katana's procedures with the weapon's grip on top, moved as the katana's blade moves (its
breathing, the run's swing). The stow of a weapon not at the hip is its own procedure on the sheathe's beats (a flick,
a beat, up and round to where it hangs, home on the click at 1.02 s, the hand let go); a hip weapon slides home as the
katana does. So the hit beats, the chain windows, the cancels and the trail's timing are shared by all 15. A weapon's
grips are mapped from today's (`src/weapons/*.js` GUARD, WIND, THRUST, BEAT, SWEEP, HOOK...) by eye onto the Animation
Flow rig's reach, in its units (rig px, forward of the pelvis and up from the floor).

**On the skeleton** (`rig.js applyPose`, four fields added to the pose's `blade`, each optional): `bh` how far apart the two
hands are along a haft (the katana's 3.4 rig px; a yari's guard 12), `x` the right hand's sideways place and `lat` the
weapon's sideways lean (a draw from over the right shoulder), and `slide` how far down the weapon from the hand its own
grip is (the hand takes a slung haft high, then slides to its grip). Then `rig.wield` places the weapon. Every pose of
a weapon's move also passes its `post`: the haft's hands; a one-handed weapon's free fist where the katana's keys put
both hands on the hilt, or its off-hand weapon (`off`: the second tanto reversed along the forearm, the kama and the
daisho's wakizashi at an angle, the kusarigama's chain hanging or thrown to `chain` rig px); the tessen's `spread`; and
the floor: a long weapon's ends stop on it (as today's art plants them) by turning it about the grip, never through it.

**Reach and weight** (`play/rules.js`, `play/hero.js`): a cut lands within 46 rig px × the reach, the cut's step stops
`28 + (reach − 1) × 30` rig px short of the samurai (a spear stops further off), the hit-stop is the owner's 3 / 5 / 8
frames × the weapon's stop weight (kept in `STATS.stops`), and a heavy hit's shake × its shake weight.

**Not yet:** the samurai keeps the katana; the pixel look draws the katana for every weapon (the pages' 2D engine has
only it); the trail runs along the main weapon's length (the kusarigama's sickle, not its thrown chain).

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
- **The weapons** (`weapons/models.js`): boxes and cylinders on the same grip origin and axis; a modelled weapon keeps them.

## Personalities and the twenty idles (`persona/`, `anim/idles.js`)

The owner's ask: "20 different idle animations, and our personality system and how it affects someone's
behaviour/animations". Today's trait system (`src/traits/`: 52 traits, BASE and ARMS, cultures and `personOf`) is
shared, pure data; the slice reads it through `mix()` and turns each knob's difference from BASE into the flow rig's
numbers (`persona/persona.js`). Nothing new goes into `src/traits/`.

**The idles** (`anim/idles.js`): breathe, weightShift, checkBlade, adjustHat, shoulderRoll, scanHorizon, hiltRest,
neckCrack, kneelRest, leanSword, shiver, flickRain, wipeBlade, stretch, footTap, armsFolded, meditate, glanceBack, slump,
readyCrouch. Each is keys in the page's format (`{ t, e, ...fields }`, eased into the next key), but laid OVER the live
base idle: offsets (`dp` the pelvis, `dl` lean, `dh` head, `dfN`/`dfF` the feet, `hat`) are scaled by an envelope that
eases in and out, absolutes (`hN`/`hF`, `blade`, `elb`, `hy` head yaw, `hr` head roll, `tw` chest twist) are mixed in by
it. So the breath goes on underneath, the character drifts in and back home without a snap, and the springs ride on top.
`hold` marks the stretch a person may linger in; a blade idle draws the katana from the saya along its own line (a
villager, unarmed, never picks one). The drift (`drift`): after `gap` seconds of breathing, a weighted pick (never the
same twice running), played at the persona's `tempo`, held `linger` times as long. The plain ronin has no pool: he only
breathes. `hy`, `hr`, `tw` are read by `look/three/rig.js` (the head and chest turn; the hat keeps level); the pixel
engine is the pages' verbatim and has no lateral axis.

**A persona on the moves** (`persona/gait.js`): the `idle`, `guard`, `run` and `runArmed` clips take an actor's
`a.persona` when it has one; an actor without one, or with the plain persona, runs the page's own function. Each persona
move is the page's with the knobs written in so the plain numbers give the page's move bit for bit (`probe.plainSame`,
checked). A `walk` is added (three fifths of the stride on the ground, the hips highest over the planted foot; the sword
hand on the hilt, or both arms swinging unarmed). The run's phase still runs on the ground covered, over the persona's
stride, so the feet stay planted at any cadence.

| Knob (today's) | On the 3D body |
|---|---|
| lean, chest, bow, hx, hy, hat | the lean (chest ×0.6), the head (bow ×0.2 rad), the pelvis (×1.6 rig px), the brim |
| idle legs, knee, breath, period, bob, sway, swayLean, jitter | stance width, hips sunk into the knees, breath depth and pace, a dip, a drift, a tilt, small restless shifts |
| f / b hand targets (ARMS) | the right / left hand toward a rest point by weight: hilt, scabbard, behind, cross, sleeves, folded, pray, chin, hip, clutch, fists, dangle, trail (`gait.js REST`) |
| walk / run speed, fps, stride | top speed; stride = √(speed / cadence) × √stride, the cadence follows from the ground covered |
| lift, swing, bounce, heavy, rock, limp, wobble, knee0 | the foot's lift, arm swing, the hips' bob, a thud on each footfall, a rocking lean, a short near step and a dip, a sideways bank, bent knees |
| fidgets, every | which idles (`behave.js FIDGET_IDLE`, plus `IDLE_AFFINITY`) and the breaths between them |

**Behaviour** (`persona/behave.js BEHAVE`): per trait, patience (×e^x on the 1.6 s the samurai waits in his guard),
press (closes nearer, cuts from further, chases sooner), caution (gives ground after a hit, holds further off) and grit
(a hit's recoil ×e^(−0.7x)). `play/foe.js` reads `foe.bh`, `PLAIN` (his old numbers) unless the overlay gives him a
personality. The townsfolk (`persona/npcs.js`): rest as long as their persona lingers, wander their patch at their walk,
turn to look when he comes near, and a cautious one steps out of his way. Villagers are a look of their own
(`persona/folk.js`, registered as `LOOKS.folk`: kimono, obi, sleeves, a kasa, a head cloth or a topknot, on the same
skeleton); samurai wear the red armour. In the pixel look villagers are the pages' drawing, tinted.

## The skills (`skills/`)

Owner request (2026-10-02, "Skills and their animation"): today's kit in the test level, animated in the Animation Flow
style on the 3D skeleton (and the pixel drawing, through the look seam), effects in 3D drawn the active style's way,
cooldowns and the skill bar as in today's game. The keys, timings, hit beats, damage, Qi, cooldowns and power tiers are
today's (`src/player/`, `src/fx/`), gathered in `skills/beats.js`; distances are today's pixels, which are the slice's
world units.

| Key | Skill | In the slice |
|---|---|---|
| `I` tap | glitch double slash | crouch into the draw, glitch out and blink 44 (stopping short of the samurai), the lunge cut (.225 s), the second cut (.325), each a crescent and an arm of the black X; held, the quick sheathe, and on the click (.6) whatever he cut bursts. 2 s |
| `I` hold | Thousand Cuts | held past .14 s the crouch charges (0.9 s to full, sparks and bolts converging on him, a cyan glow, one flash when full); let go: he vanishes to the point (the samurai he aims at, else 44–110 ahead), flashes in at 7 / 9 / 11 spots round him in 0.34 s, each a cut, a bolt from the last spot and a black slash through him; the closing X, held, the click bursts it. 8 s |
| `P` | Cross Rift | charges from the press (a tap is a medium rift); let go: the dash, the two arms of the X torn in reality ahead of him, stone and motes drawn into its lips while it hangs, the click shuts it and it detonates (1 an arm, 2 the detonation); at III an echo .25 s later. 12 s |
| `O` hold | Crescent Moon | the blade raised behind his head, charging in place; let go: one huge crescent sweeps round him at chest height in 0.15 s, descending from his left to his right, the black slash along its inner edge, its light pooled on the floor, echoes peeling off; it hangs, the slit shuts and it shatters (II: the shatter cuts; III: a twin moon behind). 10 s |
| `N` | Mirror Meditation | he stands, palms together, head bowed, a faint cyan aura, 1.4 s; 3 (+1 at II, +2 at III) images of him (his own look, cyan, glitching) step out one by one, dash to the samurai, cut him with the page's J1 (on its own hit beat), each cut a crescent and a black slash, and dissolve into slivers. 14 s |
| `U` | Sky Drop | the redesign: a 0.12 s crouch, a blink up 44 and forward leaving an afterimage, the storm coming down into the raised blade, at .36 the blade turned point down and the drop with afterimages, the landing at .44: the crater (cracks, flung stone, twelve forked bolts on the floor, a ring), everyone in it thrown, the great black X shut .42 s later; II widens it, III sends bolts up out of the cracks. When the crater will kill, the full-screen close-up (`fx/cine.js`). 8 s |
| `C` | the sit, Breath of Qi | tap: he sits cross-legged, his back to the camera, any key gets him up. Hold: the kata (three breaths: arms up as Qi rises from the floor, palms down as it sinks to a point at his belly; each out-breath a notch of Qi for 20% health); with `↓` Seiza (kneeling inside a dome that takes the samurai's cut); by the tōrō, the courtyard's rest point, Lotus (lifted, a ring of Qi circling, the whole meter into health); during the storm Storm breath (Qi from the whole screen, the room darkens, a held beat with blazing eyes, the out-breath: 40% health, the storm spent, the samurai thrown). Letting go ends it early; no notch: a grey puff |
| passive | Storm Chain | landed hits fill the Qi meter (today's gains); full, 8 s of storm (9, 10 with power): a burst of bolts, bolts crackling on his body, and every hit throws lightning: to the nearest other samurai (3 / 4 / 5 links; the slice has one, so the storm also answers each hit with a bolt from the sky onto him) |

**How it fits the controller.** A skill owns the hero while its clips play (`skills.js` `control`, called before
`play/hero.js`'s); it hands him back in its cancel windows (`beats.js` `CANCEL`: a roll from `roll` s, J or another skill
from `any` s, today's numbers) and when it ends. A skill starts from anything today's `canAttack` allows, and from a
cut once its hit has passed. Presses go through the same 0.2 s buffer; a press on a skill cooling down is refused and
forgotten (its slot blinks). Each skill turns to the samurai in front of him and reaches him (the double's blink, Thousand
Cuts' point, the rift's dash and Sky Drop's crater land on him), as the cut tracks its target. Hits go through
`foe.react` like J's, with hit-stop by weight (3 / 5 / 8 frames), the clash's impact frames and focus lines.

**The moves** (`skills/moves.js`) are poses in the Animation Flow page's language (pel, feet, hands, lean, head, the
blade's grip and angle), keyed or procedural clips on the flow engine, so the 3D skeleton and the pixel drawing both
take them: the draw crouch, the two cuts and the quick sheathe, the charge crouch, Thousand Cuts' four flashed cut poses,
the moon's raised blade and its descending cut, the meditation, the mirror images' dash (then the page's own J1), Sky
Drop's crouch / overhead / point-down / kneel in the crater (lifted off the floor by the clip, so the shadow stays down),
the kata's raise and press, the seiza kneel, the lotus (lifted, turning), Storm breath's arms thrown back and palms driven
forward, the sit. They are ADDITIONS: the page's own Sky Drop and blink were left out of the slice and its source is not
in this checkout; swap a clip for the page's keys behind the same name.

**Effects in 3D, through the style.** Every skill effect lives in world space (`skills/fx3d.js`): crescents are arcs in
the plane of his cut, the moon sweeps round him in the floor's perspective, bolts come down from above and lie on the
floor, rings and cracks are on the floor, motes fly 3D curves, the black slash opens along a 3D path (the moon's arc) or
facing the camera (the X arms, as today's game draws them). The camera projects them each frame and each pixel goes
through the ink (`skills/ink.js`), the active style's way of drawing an effect: **Painterly** soft dots with alpha, cyan
into warm white, a glow round the hottest; **Pixel-render** snapped to the world's pixels, the cyan ramp, fades
dithered, held at 12 fps; **Anime limited** flat white over a cyan body with an ink rim, hard fades, on twos; **Toon +
dither** the page's dithered cyan. The void inside the black slash is black in every style. Mirror images and
afterimages are more of his look (`skills/echo.js`: the 3D model or the pixel drawing, tinted cyan, dissolving through
the look's own dither).

**The HUD** (`skills/hud.js`, today's): health and Qi top left (Qi notched in thirds, STORM while it runs; he starts at
60% health so heals show, and the samurai's cut takes 12%), the skill bar under them: the Storm Chain passive, then I, O,
P, N, U, C, each with its key, its cooldown shade and seconds, a white blink on a refused press, a glint when ready.
The overlay's **Skills** section picks the power tier (I / II / III) and lists the keys. URL: `&power=3`, `&qi=1`,
`&hp=.3` start there. Not in the slice: K (the blink and the executions are other work), growth (every skill is known,
as the check's "all mastered"), the slide's cooldown (the roll stays the page's).

## What the check covers (`npm run check:iso`)

No page errors; the run in all 8 directions (he moves where the keys point and is drawn facing that way); the stop;
the roll (its i-frames, ~25 units); walking up to the samurai and J1 → J2 → J3 with all three hits landing and three
reactions, an impact frame in the hit-stops and the finisher's close-up; a cut cancelled into the roll; hitting him
until he dies, and his respawn; the four styles switched live with a cut in each; the same chain with the pixel look;
one screenshot per pipeline step flipped; the blood (three sprays from the chain, the drops landed as stains, a
splash on him, blood on the blade, the sheathe's flick); the killing blow's sever (a part and the sword off him, both
at rest on the floor, a pool); and the five executions on K in turn, each with the K prompt, its close-up, its cut
and its pieces, the ronin handed back.

Then the skills (`scripts/check-iso-skills.mjs`): the double slash landing
both cuts and its cooldown refusing a second press; Thousand Cuts (the charge, the vanish, the hits, the click); Cross
Rift (the arms and the detonation); Crescent Moon (the hit and the shatter); Mirror Meditation (three images out, their
cuts landing); Sky Drop (aloft, the crater landing) and Sky Drop on a kill (the close-up); Storm Chain waking from landed
hits and chaining; Storm breath (the heal, the storm spent, the samurai thrown); the sit (his back to the camera, up on a
direction); the kata (a heal for a notch, let go); a double slash in each style; the images and Sky Drop in the pixel
look; power III's twin moon and rift echo; the Seiza dome taking a real cut (the samurai off his leash); Lotus by the
tōrō (the meter into health).

Then the weapons: the sweep (`?iso&arsenal&sweep`: every weapon drawn from
home, in hand at J1's hit and out at J3's impact, home after the stow, in all 8 facings, no errors, every event on
the katana's beat and every move the katana's length), seven contact sheets (`arsenal-*.png`), and all 15 in play
(`&foehp=999&foes=1`): picked with `=`, each walks up to the samurai from one of the eight sides, J1 → J2 → J3 all land with
the weapon's hit-stops, the cut faces him (all 8 facings across the round), and he stows it after the calm.

Then the enemy types (`scripts/check-iso-enemies.mjs`, `docs/enemies.md`): each type telegraphing, striking and killed, and a patrol taking turns.

Then the squad battle (`?iso&squad`, `scripts/check-iso-squad.mjs`; what it covers is in `docs/squad-ai.md`).

Then the new skills: F timed in the page on the samurai's blow (a press
0.33–0.46 s into it counters and the answer lands; 0.02–0.2 s only blocks; a counter that kills plays the close-up);
on a calm squad of three: Q (at least two links, the yank, the draw-cut on the dragged man, the cooldown, refused on
it); R three times (the blade hangs and he is empty-handed, J refused; home, the catch, the anchor in turn, the blade
back each time); X (time stops for the squad, at least two taken and all of them fall on the click, colour back, the
close-up, the meter spent; refused on an empty meter); Q in the other three styles; growth counted.

Last, on a fresh page, the personalities: each of the twenty idles plays on an actor, moves him,
never jumps more than 2 rig px a step and ends back in the breath; no traits gives the page's idle, guard, run and runArmed exactly and no idles;
an old master and a young hothead differ in cadence, speed, breath, how often and which idles, and patience; [ gives
the ronin a personality (an idle of his own, a slower run); ] gives the samurai one (more patient); the townsfolk
drift into idles and wander; the idle gallery loops all twenty.

SwiftShader draws a few frames a second, so the page runs with
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
`1`-`4` quick slots; `K` a paired execution (or the finisher on a combo's K prompt; with no partner set up, K on a lone samurai in reach is the execution, gore.js); `'` combo prompts on / off (it was T: T is the facings); `H`
(testing, as today's) cuts the nearest companion down, again while down kills them. The overlay's pipeline steps moved to
`Alt`+`1`…`0`, since 1-4 are the quick slots. Left click moves him (below); touch swipes.

**With the other lanes (at the merge):** `main.js` reads the input through the port first (the prompts, touch, the
click), then the reserved keys, then the kit's skills, then the hero's controller, which waits while the port is busy.
Today's HUD is the one HUD: the kit's six skills sit on its skill bar (`addSkill`), and its Qi, storm and health are the
kit's (`skills/skills.js SK`), bridged both ways each step in `port.js` (an item's Qi or a heal goes into the kit's, a
landed cut's Qi is the kit's to give, a blow's hurt is today's `hurt`); the kit's own HUD is not drawn under it. The
reserved keys keep their own bar and Qi meter (Time Slice spends it), raised above today's bottom bar. K's finisher on a
combo is the real execution (`gore.js exec`) when no partner is set up. `CTX.foes` is the samurai in the yard (not those
parked by another enemy group). Every check outside the port's own runs on `&solo&combo=free` and focuses the canvas
instead of clicking it. The squad battle (`&squad`) runs without the port: its own companions, left click, E and digits.

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

Where the two branches meet (seen on `claude/3d-squad-ai` while this was built; for whoever merges): it has its own
companion agents (`squad/npc.js`), its own left-click move for the hero, E held to lift, and 1–9 to recall groups. One of
each should stay: the bodies, health, down / lift and EXP here (`PARTY`, `Ally`) under its minds and orders (`brain` /
`order` above); one left-click handler (its selection rule, this file's picking of items, the fallen and prompts);
and the digits: 1–4 are today's quick slots (prototype 20), so groups would want another modifier.

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
