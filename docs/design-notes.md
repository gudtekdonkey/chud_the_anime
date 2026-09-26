# Design notes

Decisions made in the design sessions so far, newest last.

## Look

- Top-down, 480×270 native resolution, integer-scaled (4× on 1080p). Same scale as Hyper Light Drifter.
- The ronin is **compact**: 20×26 px, about the height of Penusbmic's Glitch Samurai.
- Dark silhouette: a near-black body, a wide straw hat (keep its height-to-width ratio), a black mantle, and two cyan eyes.
- The katana stays sheathed at his hip. He draws it only to attack and resheathes after every attack.
- Clothing items can be put on or taken off: mantle, scarf, cape, obi sash. They are all **shades of black**, never bright red.
- Effects colours: cyan `#6ff3e4` / `#52e8d6` / `#b8fff6` and white, on a muted grey floor `#474c4a`. Glitch slices, jagged electric bolts, a floor reflection.
- A hit is "dramatic yet controlled": whole-body white flash for about 2 frames, a short hit pause, a small screen shake.

## Moves (game/index.html)

- **Idle:** a calm breath about 2.7 s long. The chest rises, the hips stay put and the cloth barely moves. No robotic bobbing.
- **J:** one fluid, eased cut: the hips lead, then the chest, then the arms and blade, with a lunge and a held follow-through. Press J again during the follow-through to flow into the second cut.
- **After attacking:** he waits in a guard stance with the blade out, and can run with it trailing. After about 2 s of calm he resheathes, slowly: a flick, a beat, the blade slid home, the click, a moment of stillness.
- **Slide (was wall slide):** he leans back, lead leg out, back arm up behind for balance.
- **K, glitch teleport:** electric flurry on arrival, then random glitching for a few seconds. With no enemy near, you can spam it.
- **I, glitch double slash:** approved as is.
- **U, storm slam:** a slow kneel, then a full second gathering power while stone chips and dust lift off the floor and circle him. He rises in a cyclone with the debris, then slams; the debris flies out and the screen shakes.
- **C, sit:** back to the camera, cross-legged like a monk. Standing up plays before anything else.

## Next

1. **Held I:** hold to charge, release for a far longer dash with a much bigger area of effect. Six variations to choose from in `prototypes/13-charged-i.html`: Flash Line, Thousand Cuts, Crescent Moon, Storm Chain, Cross Rift, Afterimage Barrage.
2. **K assassinations:**
   - With an isolated enemy in range (no other enemy within the isolation distance, 36 px to start), K flashes to it and plays an execution.
   - A kill resets K after 0.2 s.
   - 40 executions, built and approved 5 at a time.
   - Marker system, picked from `prototypes/12-assassin-markers.html`:
     - Every enemy carries an **isolation bubble**. Empty bubbles glow cyan; overlapping ones are grey and joined by a link line.
     - A **kill line** runs to the nearest enemy he can dash to.
     - A **K key prompt** pops up only when that enemy is in range AND outside every other enemy's bubble.
     - **Lock-on brackets** are reserved for big items you can pick up.
   - Enemies are samurai built like him: same body, no hat or mantle, bare-headed with a topknot, in a darker red-grey.
   - Executions are short and brutal, show only the key frames (each one leaning into the motion), and cut the enemy into real pieces.
3. **Clothing redesign.** The mantle was flattened because it read as a hump; the rest still needs a pass.
4. **Front and back views** for every move. Everything uses the side view today.
5. **Real enemies** with health, needed by K.
