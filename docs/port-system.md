# The port system: every move in eight directions

`src/rig/port.js` turns any side-view pose (the format of `src/rig/pose.js`, which every animation in `src/anims/poses.js` and every personality bake in `src/traits/bake.js` uses) into a rig v2 pose. Rig v2 then draws it facing any way. Nothing is redrawn by hand, and a new move gets all eight directions for free.

The proof is `prototypes/27-port-system.html`. It reads the game's real `POSES` and a few personality bakes, runs every frame through `port()`, and bakes each animation facing E, SE, S, SW, W, NW, N and NE, in the default outfit with cloth.

## What `port(pose, overrides?)` does

1. **The angles carry over.** The near leg and arm become his right (`fl→rl`, `fa→ra`), the far ones his left (`bl→ll`, `ba→la`), and the back-hand blade goes to his left hand (`bsword→lsword`).
2. **The hips follow the stride** (`hipYaw`): the leading leg brings its hip round.
3. **The chest turns into the blade** (`twist`): whichever arm holds a sword, reaching forward turns that shoulder toward the target.
4. **The head stays on the target** (`headYaw`): it takes back about three quarters of the turn beneath it.
5. **Deep knee bends open the knees outward** (leg spread) instead of folding them through the body.
6. **A hand on the hilt** (the side rig's `HILT`) becomes an IK reach for the real hilt at his left hip, from any side.
7. **Personality knobs carry over**: `bow` (head forward and down) and `dim` (eyes closed). So do `empty` (no blade in the scabbard) and `hat`.
8. **Overrides**: `port(p, { twist: .6 })` replaces any rig v2 knob for a pose that needs a hand-tuned turn. No current move needs one.

`DIRS` lists the eight facings as rig v2 yaws: 0 faces screen-right, 90° faces the camera (south).

## In the game

- **Skeleton:** `wardrobe/skeleton.js` is rig v2's full solver again (IK hands, the head, the scabbard, the blades). From the side it still solves `fromSide(p)` flat, on the side rig's pixels.
- **Body:** `dress(R, F, p, dt, yaw, flip)`: yaw is the true facing, never mirrored. Yaw 0 (E) draws today's side rig; W (180°) draws the side rig seen from his left (below); any other facing solves `port(p)` at that yaw and draws `rig/body3d.js` (rig v2's `drawBody` and `drawHat`) into the same raster, and the clothes hang from those bones. The straw hat has a 3D form (`hat3d`), and the flat mantle becomes a close shell over the shoulders. `flip` -1 says the caller will draw the frame mirrored (a side-on move facing left); `dress` keeps the cloth in the raster's space and mirrors it itself when that space changes, so callers never touch the cloth, and a figure's `vel` is its screen velocity.
- **True facings** (`rig/turn.js`, prototype 36): a figure keeps its world facing as `view` (E, SE, S, NE, N) and `face` (±1); `trueView(view, face)` names the real facing, so facing left E is W, SE is SW and NE is NW. Every facing is drawn as itself: the blade stays in his right hand and the scabbard at his left hip from all eight sides.
- **W, the side rig from his left:** `rigR(R, p, true)` draws his side pose with his left arm and leg as the near ones, the scabbard (any weapon carried at the hip) at the near hip, the sword arm behind him (its forearm comes round the front of the belly when the hand is on the hilt), and `solve(fromSide(p), 0, true, true)` hangs the clothes with his right away from the camera. It is drawn facing right and flushed mirrored (`Raster.flush(true)`), so it is his own E pixels seen from the other side. W sits between SW and NW the way E sits between SE and NE, and a cut facing west (the side rig mirrored) only swaps near and far. The owner picked this ("True left the side rig from his left"); `WEST.mode = '3d'` in `wardrobe/dress.js` would draw W with rig v2 at 180° instead. A sleeve or wrap on the sword forearm follows it round the belly (`J.arm.r.fdz`). Weapons carried on the back (`d3.back`: yari, nodachi, naginata, bo, tetsubo, kanabo) stay behind him.
- **Turning:** `turnTo(T, view, face, dt)` steps the drawn facing 45° every 0.03 s toward the one wanted, half a turn by the camera (S), S to N by the side it faces, so a turn never pops and the hilt and scabbard never jump sides. A side-on move snaps it to E or W.
- **Facing:** `player/facing.js` (`playerFacing`, `PF`): idle, walk, run and runArmed turn to `trueView(P.view, P.face)`; Harvest faces N. Attacks, skills and stances stay side on, mirrored by `P.face`.
- **Sheets:** no extra baking. The player is dressed live every frame (`dressed()`), so the facing is just a yaw passed along, and the reflection, the charge rim, the white flash, the goo and the glitch slice take the frame's own flip. An afterimage keeps the facing he was drawn in when it was left (`ghost()` stores `PF.yaw`; off the side it is dressed once and kept). Mirror Meditation's images are dressed live in what he wears on their own cloth: stepping out of him they turn from his facing to the way they run, the dash and the cut side on.
- **Tuning:** `port()` rests the feet a little wider than rig v2 did (leg spread .15), so a stride seen from the front shows two legs.
- **Samurai:** `world/enemies.js` turns them toward the ronin (`viewTo`, `e.view`, `e.face`), a beat late; `world/enemy-draw.js` draws their guard, flinch and stagger in their true facing, turning through the facings between (`e.turn`), bare-headed in their red-grey, the blade in the right hand from every side. The dead stay side on, mirrored by `e.face`.
- **Companions:** `party/companions.js` gives each a `view` from the way they walk (settled in rank, the way he faces) and draws idle, walk, run and runArmed in the true facing (`a.turn`), with their own weapon's 3D art and their clothes. Cutting, the guard stance, the sheathe, down and dying stay side on, as his do.
- **Weapons:** each weapon's art carries `d3`, its 3D twin (`weapons/art3d.js`): where it is carried (hip scabbard, back sling, back saya), how it sits in either hand, sliding home, and the tanto's reverse-grip off hand.

## Still open

- W, SW and NW are his true left side now (2026-09-26, prototype 36). W is the side rig from his left (owner).
- Attacks and skills stay side on (owner: "ok", "Same side attack is fine"), so facing west a cut is still the side rig mirrored.
- Moves drawn by hand (sit, the two open stances) stay hand-drawn. They face the camera or away and need no port.
