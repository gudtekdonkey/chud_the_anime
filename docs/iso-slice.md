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
it has struck. Presses are remembered 0.2 s. The skills, as today's game keys them (below): `I` tap the double slash,
hold Thousand Cuts · `O` hold Crescent Moon · `P` Cross Rift (hold to charge) · `N` Mirror Meditation · `U` Sky Drop ·
`C` tap sit, hold Breath of Qi (with `↓` Seiza, by the tōrō Lotus, in the storm Storm breath) · Storm Chain passive.

**The overlay** (beside the game, every choice also a key): the frame time; `M` the model (3D / Pixel); `V` the style
(Painterly, Pixel-render, Anime limited, Toon + dither); `Z` clashes (was `C`, which is Breath of Qi now); `X` the finisher's close-up; the pipeline
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
one screenshot per pipeline step flipped. Then the skills (`scripts/check-iso-skills.mjs`): the double slash landing
both cuts and its cooldown refusing a second press; Thousand Cuts (the charge, the vanish, the hits, the click); Cross
Rift (the arms and the detonation); Crescent Moon (the hit and the shatter); Mirror Meditation (three images out, their
cuts landing); Sky Drop (aloft, the crater landing) and Sky Drop on a kill (the close-up); Storm Chain waking from landed
hits and chaining; Storm breath (the heal, the storm spent, the samurai thrown); the sit (his back to the camera, up on a
direction); the kata (a heal for a notch, let go); a double slash in each style; the images and Sky Drop in the pixel
look; power III's twin moon and rift echo; the Seiza dome taking a real cut (the samurai off his leash); Lotus by the
tōrō (the meter into health). SwiftShader draws a few frames a second, so the page runs with
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
