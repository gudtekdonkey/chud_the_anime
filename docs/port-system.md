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
- **Body:** `dress(R, F, p, dt, yaw)`: yaw 0 draws today's side rig; any other facing solves `port(p)` at that yaw and draws `rig/body3d.js` (rig v2's `drawBody` and `drawHat`) into the same raster, and the clothes hang from those bones. The straw hat has a 3D form (`hat3d`), and the flat mantle becomes a close shell over the shoulders.
- **Facing:** `P.view` is E, SE, S, NE or N, from the last movement input; `P.face` mirrors it for the west side. `player/draw.js` turns idle, walk, run and runArmed, and Harvest faces N. Attacks, skills and stances stay side on.
- **Sheets:** no extra baking. The player is dressed live every frame (`dressed()`), so the facing is just a yaw passed along. The baked sheets (mirror images, afterimages) stay side on.
- **Tuning:** `port()` rests the feet a little wider than rig v2 did (leg spread .15), so a stride seen from the front shows two legs.
- **Samurai:** `world/enemies.js` turns them toward the ronin (`viewTo`, `e.view`), a beat late; `world/enemy-draw.js` ports their guard, flinch and stagger poses, bare-headed in their red-grey. The dead stay side on.
- **Weapons:** each weapon's art carries `d3`, its 3D twin (`weapons/art3d.js`): where it is carried (hip scabbard, back sling, back saya), how it sits in either hand, sliding home, and the tanto's reverse-grip off hand.

## Still open

- Mirrored for W, SW and NW (owner: "sure for now"); his true left side is still possible later.
- Attacks and skills stay side on (owner: "ok").
- Moves drawn by hand (sit, the two open stances) stay hand-drawn. They face the camera or away and need no port.
