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

## Plugging it into the game (after the branches merge)

The clothing branch (`claude/project-thread-fblw73`) already brings rig v2's skeleton into `src/wardrobe/skeleton.js`. It has a simple `fromSide(p)` and solves at yaw 0 only, with a comment saying the port system swaps in there. So:

1. **Skeleton:** in `wardrobe/skeleton.js`, use `port(p)` wherever `fromSide(p)` is used, and pass the facing's yaw instead of 0. The clothing items are measured from the bones and need no change.
2. **Body:** the side rig (`rig/rig.js`) can only draw side-on. For the other seven facings, draw the body with rig v2's `drawBody` and `drawHat` (in `prototypes/19-rig-v2-and-clothing.html`) into the wardrobe's `Raster`. From the side, keep today's rig, so nothing changes where it already looks right.
3. **Sheets:** `anims/sheets.js` bakes one strip per animation today. Bake one per animation per facing (`SHEETS[name][dir]`), lazily on first use. Keep each frame's glitch slices.
4. **Facing:** the player keeps `P.dir` (one of `DIRS`) from the last movement input instead of `P.face` ±1. West is his true left side, not a mirror. Whether to mirror instead is still the owner's call.
5. **Enemies** share the rig, so the samurai get eight directions the same way, with the red-grey palette.
6. **Effects** stay in world space, so crescents, cuts and bolts only need to know the facing's direction.

## Still open

- True left side or a mirror when facing W, SW and NW.
- Harvest facing north (back to the camera) is the first move that needs a direction of its own. With the port it is `DIRS` N plus the harvest poses.
- Moves drawn by hand (sit, the two open stances) stay hand-drawn. They face the camera or away and need no port.
