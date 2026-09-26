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

## Moves (the game, `src/`)

- **Idle:** a calm breath about 2.7 s long. The chest rises, the hips stay put and the cloth barely moves. No robotic bobbing.
- **J:** one fluid, eased cut: the hips lead, then the chest, then the arms and blade, with a lunge and a held follow-through. Press J again during the follow-through to flow into the second cut.
- **After attacking:** he waits in a guard stance with the blade out, and can run with it trailing. After about 2 s of calm he resheathes, slowly: a flick, a beat, the blade slid home, the click, a moment of stillness.
- **Slide (was wall slide):** he leans back, lead leg out, back arm up behind for balance.
- **K, glitch teleport:** electric flurry on arrival, then random glitching for a few seconds. With no enemy near, you can spam it.
- **I, glitch double slash:** approved as is.
- **U, storm slam:** a slow kneel, then a full second gathering power while stone chips and dust lift off the floor and circle him. He rises in a cyclone with the debris, then slams; the debris flies out and the screen shakes.
- **C, sit:** back to the camera, cross-legged like a monk. Standing up plays before anything else.

- **Sword out:** after an attack he waits with the blade out in one of six stances, picked at random each time and never the same twice running: four side-on counter stances with the blade in his back hand pointing at the ground, and two opened to the camera.
- **Skills:** hold I for Thousand Cuts; hold O for Crescent Moon, cast in place; P for Cross Rift, a tear in reality; N for Mirror Meditation, where mirror images attack the nearest enemies. Storm Chain is a passive that runs for 8 s whenever the Qi meter fills from landing hits.
- **Executions, batch 1 (approved):** behind the back, through and past, rising launch, whirlwind, far behind, peek-a-boo, and peek-a-boo from behind (a neck snap).
- **Skills, round two** (`prototypes/18-skills-ideas.html`):
  - Approved as they are: Counter, Glitch Dodge, Static Trail, Lightning Chain, and Lingering Blades (its spectral blades turn to whichever enemy is nearest when they fire).
  - Iai Focus: approved, and its stance is the movement bar for every other skill and execution. As Focus builds he settles into the draw: hand to the hilt, rear foot slides back, body hunched over the sheath.
  - Decoy: cut.
  - Blade Recall: never spins. The blade flies point-first, turns slowly to point back at him, and hangs still, drifting a pixel at a time.
    - **Picked:** tap R to call it back. Recalls alternate between *home to the sheath* (the blade flies into the scabbard on the click) and *the catch* (he snatches the grip as it passes, then flicks and sheathes).
    - *The anchor* (he flashes to the blade instead) is kept, on **hold R** (confirmed): a gap-closer, or an escape if the blade was thrown away from danger. All three takes are in the game.
  - Time Slice (**approved**): takes every enemy inside a zone round him, however many. The pass takes as long as it needs (a step of 0.016–0.06 s per enemy) and the zone grows with power.
  - Breath of Qi is a major skill. **All five takes approved and kept, for different jobs** (the jobs are proposed): Seiza becomes the **Qi shield** (kneel and heal behind a dome of light that grows with power, huge at III with Qi floating round it); Standing kata is the quick heal on your feet; Lotus is the full heal at a rest point; Storm breath (loved) is the burst heal and knockback for the whole meter.
  - Three power tiers each: I is quiet (a trickle of motes); II adds matter lifting off the floor; III adds ribbons of light. Nothing on the floor (no ripples, no sigils) and nothing over his head.
  - **Harvest** splits off onto its own key (E proposed): hold near the fallen to turn their remains into EXP. Healing stays on C. Approved. He should face **north** (back to the camera) and let it come to him; that needs the 8-direction rig (see Next).
  - **Glitch Dodge power:** at power II it dodges again if another blow comes within 0.5 s; at power III within 1 s.
- **Counters by attack** (`prototypes/23-counters.html`): the enemy has several attacks, each with a readable tell (a glint running up the blade, the eye flashing, plus the wind-up itself). A blow that lands while he holds F plays the counter that answers that attack: overhead chop → receive and flow; horizontal sweep → under the sweep; thrust → along the blade; diagonal cut → disarm; low rising cut → pin the blade; charge → matador; leaping strike → under the leap; three-cut flurry → break the rhythm. Added (loved, "can we add more"): quick-draw → stop the draw; spinning cut → into the turn; front kick → sweep the leg; feint then thrust → don't bite; sword throw → return to sender; shoulder barge → give way.
  - **The counter window (agreed):** tap F. A blow landing within 0.2 s of the press is countered; an earlier press is only a block (pushed back, no counter). Four indicators prototyped; recommended A, the glint running up the enemy's blade and a star on the point while the window is open, with B, a closing ring, as an assist option. Not yet picked.
- **Nothing left to fight:** if no enemy is within two screens (960 px) when an attack or execution ends, he skips the blade-out stance and sheathes at once, unbothered.

## Next

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
4. **Front, back and diagonal views** for every move. Everything uses the side view today. The 8-direction rig (`prototypes/19-rig-v2-and-clothing.html`) is the path: port each move's key poses onto it, starting with walk, idle and the stances. Harvest facing north waits on this.
5. **Real enemies** with health, needed by K.
