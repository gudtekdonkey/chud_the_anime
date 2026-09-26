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
- **Executions, batch 2 (all approved):** standoff (amazing), hat throw, shadow step, bare hand, three of me, topknot (amazing), pommel, the bow, overload (great death, idea and execution), vault (perfect, creative).
  - **Hat throw** needs him to be wearing a hat. Reworked: he glitches behind the enemy and the hat is left behind, hanging where his head was; it catches up through the enemy's neck and lands on his head, and the head falls on the click.
  - **Hat throw only with certain hats**: the wide-brimmed ones he can fling like a disc (the straw hat, the kasa). Hat items carry `throwable: true`.
- **Executions, batch 3:** lattice (amazing), kick launch (great, creative), reflection, scabbard, half moon, fault line (amazing: "more deaths like this, imaginative") all approved.
  - **Blade Rain → Shuriken Rain**: the falling glitch blades become shuriken.
  - **Endings only** (only when no other enemy is on screen): an execution is an ending when it leaves him AT REST (sheathed, still, turned away, walking off), so nothing obviously follows (owner 2026-09-26). Still Heart, Walk By, Hat throw (he tugs the brim down), Resonance (never moves), Shadow Cut (never moves again), The Thread (twenty paces off, back turned), Sky Split (the world closes on the last man). Maybes left chainable: Bare hand, Behind the back.
  - **Rewind only on stronger enemies** (elite and boss), never a minion; every samurai so far is a minion.
- **Execution rules** (`src/assassin/rules.js`): every execution declares what it needs: which weapons (anything drawn from a scabbard and sheathed on the click needs katana, nodachi or tanto; Scabbard and Pommel need a long scabbard, katana or nodachi; the yari has none), a throwable hat, ending-only, and enemy tiers. `pick()` offers only the ones that fit, never the same twice running. With the yari only Hat throw, Bare hand and Shuriken Rain fit today, so the spear needs executions of its own.
  - **Rarity by extremeness** (owner 2026-09-26: "the more extreme the rarer. the shorter/simpler the more common"). All run 1.4-2.5 s, so spectacle decides. Weights 10 / 5 / 2 / 0.6; rare needs power II and legendary power III unless a Qi boost is running (rare ×4, legendary ×8).
    - Common (plain, grounded): Through and past, Far behind, Behind the back, Peek-a-boo, Peek-a-boo from behind, Bare hand, Pommel, Scabbard, Topknot, Walk By.
    - Uncommon (a trick or flourish): Rising launch, Whirlwind, Decapitation, Hat throw, Standoff, The bow, Shadow step, Reflection, Half Moon, Still Heart, The Thread, Resonance, Shadow Cut.
    - Rare (acrobatic or supernatural): Three of me, Vault, Kick Launch, Lattice, Shuriken Rain, Echo Line, Static Cage, Floor Flip.
    - Legendary (the world breaks): Overload, Fault Line, Sky Split, Derez, Rewind (elite/boss only).
    - Simulated with a katana, a hat and others on screen: power I 74% common / 26% uncommon; power III rare 12%, legendary 1.4%; a Qi boost rare 30%, legendary 7%.
  - **Openers** (owner: "some should only be used at start"): only as the first kill of a fight. Proposed: Standoff, The bow. Endings are the other bookend.
- **Executions, batch 4** (`prototypes/28-executions-batch-4.html`, after "more deaths like Fault Line, imaginative"): Shadow Cut, Echo Line, Static Cage, Sky Split, The Thread, Floor Flip, Resonance, Derez. **All approved** ("absolutely amazing"). In the rules as uncommon to legendary.
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
- **Chaining K** (owner 2026-09-26): he does not sheathe between executions. With an enemy still near, an execution ends with the blade out in a counter stance, ready for the next K; he sheathes only when nobody is left (the rule above), or after the usual ~2 s of calm.

## Personality traits (`prototypes/26-personalities.html`, approved)

- The owner asked for a personality trait system, for movement first (idle, walking and so on, later other things), with at least 40 variations, reusable and modifiable.
- Built: 52 traits in six groups (bearing, energy, mood, quirk, body, discipline) and 20 idle fidgets. A trait is only data: nudges to lean, breath, hands, stride, bounce, cadence and speed, plus fidgets. A character is up to three traits with strengths (0.5 is half as much); traits add, so they mix freely. A trait can start from another (`like`).
- Only idle, walk and run take the personality; attacks, skills and stances stay as drawn. With no traits he is exactly the ronin as before.
- In the game: a picker under the screen, and hold **V** to walk (new). The samurai can take the same traits, since they share his rig.
- **Approved:** keep all 52 traits as they are ("they're all great"). Merged to main.
- **Cultures (owner):** every culture and place uses the trait system for its people's mannerisms and movement. A culture is a shared trait mix plus a pool of personal traits, one drawn per person, so a crowd shares a manner but no two move alike (`src/traits/cultures.js`). Seven starter cultures (court, clan, monastery, port, bandit hills, farming village, shadow village) until the cultures work names its own.
- **Decided:** the ronin keeps the personality he has: no traits by default, so he stands, walks and runs as drawn. The picker stays for trying mixes.

## HUD

- **Skill bar, like League of Legends:** bottom centre. The Storm Chain passive on the left (the Qi fills its icon; during the storm its 8 s drain as a sweep), then I, O, P, N and U, then K (the flash) and slide as the two summoner-style slots. Each slot shows its cooldown as a dark clockwise sweep with the seconds left, whole seconds then tenths under one.
- **Cooldowns on every active.** The flash (K) is recastable after an assassination: its cooldown drops to 0.2 s. Starting values, to tune: K 3 s, I 2 s (Thousand Cuts 8 s), O 10 s, P 12 s, N 14 s, U 8 s, slide 1 s. K keeps the old rule that with no enemy near you can spam it.

## Items and the HUD (`prototypes/20-items.html`, in the game)

- **Owner:** "I love the whole UI … the HUD, everything, please do it." Built into `src/` as displayed: health and Qi top left (Qi notched in thirds, STORM when Storm Chain runs), mon and glitch shards top right, and the bottom bar (weapon slot, quick slots 1-4, four charm slots).
- **Big items** (lock-on brackets and an E prompt): Wayside Shrine (PRAY), Grave Nodachi (TAKE), Sealed Chest (CUT), Rift Tablet (READ). **Small pickups** fly to him within about 22 px: Qi mote +10% Qi, rice ball +20% health, old mon +1, glitch shard +1. **Consumables** in the quick slots: static bomb, thunder talisman, whetstone (20 s cyan edge, Qi twice as fast), grave incense (60% over 1.5 s; moving or a hit puts it out). **Relics** in the charm slots: Thunder Bead, Cracked Mirror, Temple Bell, Split Tsuba, Paper Crane, Sageo Knot.
- **E:** tap for the locked-on item's verb, hold 0.2 s near the fallen for Harvest (EXP, levels, LEVEL UP / LV n banner). 1-4 use the quick slots.
- **The Grave Nodachi:** a 19 px blade (the katana's is 13), 1.3× reach on J and I, and 1.6× the hit pause and shake.
- Proposed in the build, for the owner to confirm:
  - Qi from items and shrines fills the meter but does not wake Storm Chain; a full meter wakes it on the next landed hit.
  - The skill cooldowns from the League-style bar now sit as a row of small slots under health and Qi, in the items HUD's style (the prototype has no place for them).
  - The whetstone use is shortened to 0.8 s (the study's was 1.7 s) so every use stays under a second; he keeps the honed blade out, in guard.
  - He starts at 60% health so healing shows; nothing damages him yet. Low health (below 35%) blinks the health bar red, as there is no HP label.
  - Two placeholder remains lie in the room so Harvest can be tried; every real death (a kill or an execution) now leaves a body to harvest too. EXP needs 100 × the level.
- **Open:** where the power tier (`INV.power`, I / II / III) comes from: level, relics or upgrades.

## Deaths pass (approved: prototypes 29 to 31 and 33)

The owner said the deaths still don't feel like someone dying, and the executions lack impact when the sword lands. Prototypes 29, 30 and 31 replay execution batches 1, 2 and 3 (all 28 executions), and 33 replays the 14 counters, with one shared change to the enemy's body and a toggle to compare against the page as it was. The owner approved all of it, blood and impact frames included ("with blood"):

- **Flow through poses.** The pages ease in and out of every key, so the body stops dead at each pose. The enemy's timeline is now read as one curve per joint that keeps its speed through a pose and only settles where the motion turns back.
- **Limp joints.** Every joint chases its pose on a spring: the hips lead, the chest follows, the arms, blade and head trail and overshoot. As he goes down the springs soften, so the arms and head go loose.
- **Gravity and the floor.** The last move into lying down accelerates like a fall and stops dead on the floor, with dust and a small shake; the arms and head flop on after the trunk stops. Then one twitch, a smaller one, and stillness. The red eye flickers and goes out, in a severed head too.
- **Sword impact.** Each hit knocks him away from the blade, he shakes through the hit pause, light sparks leave out the far side, and a killing blow (hit pause of 0.09 s or more) gets two impact frames, black then white.
- **Blood.** Dark red drops fly out with the spray and stain the floor, pieces trail a little and pool where they land. Approved as a new palette colour, alongside the impact frames.

## Weapons

- **Weapons:** his attacks depend on the equipped weapon. Every move works with every weapon, on the same timing and hits, but each weapon has its own poses. First set, in review: katana (as before), yari (a straight-headed spear 37 px long, half again his height, slung across his back; both hands on the haft, the back hand driving it through the front one, so every attack is point-led: J thrusts, J again whips it overhead and beats it down), nodachi (the Grave Nodachi pickup: a blade 26 px long, taller than he is, 2 px wide with a heavy tsuba and a long wrapped grip; its saya runs down his back to his calves with the hilt over his shoulder; heavy cuts, longer reach, a longer hit pause and more shake), twin tanto (short blades at the obi, the back hand in a reverse grip). Owner: "10/10", and asked for more. Second set, in review: naginata (a curved blade on a long haft, sweeping cuts low at the legs and down from overhead), kanabo (an iron-studded club hung down his back, raised and dropped; the heaviest hit), kusarigama (a sickle, and a chain with a weight thrown out past any other weapon's reach), tessen (an iron war fan: shut it strikes like a baton, open it guards the face and slices; the lightest). Owner: "these weapons are REALLY good", and asked for a bo staff: a plain hardwood staff 31 px long, slung across his back and held at its middle, so both ends strike (J cracks one end down from overhead, J again spins it and drives the other end up from below). Third set, the owner's picks from a list, merged on request: tetsubo (a long iron-banded staff on the bo's moves, gripped near the butt so the iron end lands; heavy), kama pair (two hand sickles on the twin tanto's footwork, both held forward, hooking), jitte (an iron truncheon with a blade-catching hook, tucked through the obi, on the katana's moves), daisho (katana and wakizashi together: the short sword rides in the back hand and the answer cut is his), nunchaku (the free stick trailing the one in his fist), wakizashi alone (the katana's moves, shorter and lighter). In play a weapon comes from a pickup; a picker under the game switches for testing.

## Elements (approved 2026-09-26, artifact "Ronin Elements")
- His electricity is one element of several: Storm (default), Fire, Slime, Water, Wind, Energy, Psychic. The owner loved them.
- Each element is its own matter on every move, never recoloured lightning: only Storm and Energy use bolts and glitch slices.
- Slime: goo gathers and sticks ON his body when he charges (never just floating round him); on K he melts into a puddle, stretches to the new spot and stands back up.
- Floor marks: attacks and the teleport leave them (puddles, scorch, ripples); Qi skills leave nothing on the floor.
- A new style is one palette row plus one kit. Executions layer the element on top of the deaths pass; the body motion stays.
- `[` and `]` step through the elements for testing; 1-4 stay free for the quick slots.

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
   - **In the game** (`src/assassin/`): the markers, the seven approved batch 1 executions and the 0.2 s K reset. Claude's guesses, open to tuning: K reaches 120 px; the bubbles are drawn at half the isolation distance so two overlap exactly when the enemies guard each other; the prototype's 0.75 s lock-on beat before he flashes is cut to 0.2 s; the execution is picked at random, never the same twice running. Decapitation (the eighth in prototype 14) is not in the approved list, so it is left out.
3. **Clothing** (`prototypes/19-rig-v2-and-clothing.html`, loved: "great job on the clothing system", "let's do more"):
   - **All fifteen items stay**, and **the slots are good as they are**. More items to come.
   - **Lamellar and samurai armour may be coloured, but only faintly** (muted, low-saturation tints over the blacks). Cloth stays shades of black, never bright red.
   - **Armour takes dark dyes** (owner, 2026-09-26: "armor armors, not robes"): plate, mail, shin guards, tassets, gorget, sleeves, hand guards and the iron hats can be dyed a dark colour (study: oxblood, indigo, moss, plum, bronze, teal), each black tinted to the hue at the same lightness. Robes and other cloth stay black.
   - **Cloth colour is rarity** (owner, 2026-09-26): black and dark grey are the most common; grey and whitish are rare; beige is rarer; real colours are very rare. Study odds: 78 / 15 / 6 / 1 in 100, and a very rare drop may be any hue.
   - **Bandana** (owner): a rare head item in ANY colour, and only certain hairstyles fit under it (study: those with nothing on the crown). **Headband** (owner): a second rare head item in any colour, tied like a sweatband and open on top, so every hairstyle shows over it. **Hair: 14 more styles**, 22 in all (`prototypes/32-wardrobe-twenty.html`).
   - Still open: the default outfit; his true left side or a mirror when facing left; whether the hat brim shows more of its top when he faces the camera.
   - Earlier: the mantle was flattened because it read as a hump.
   - **In the game** (from `prototypes/19-rig-v2-and-clothing.html`): the study's items hang from a skeleton read off his side pose, with live cloth, picked from a wardrobe under the game. He starts in the flat mantle, so his look is unchanged. The hat is an item too. The executions still draw him with the old painted hat and mantle, not his outfit. Still the owner's call: which items stay, and his default outfit.
   - **Twenty pieces and a layering system** (`prototypes/32-wardrobe-twenty.html, was 24`): seven new pieces (hakama, leg wraps, haori, maedare apron, tasuki, straw rain cape, cowl), and eight layers, one per slot, stacked legs, body, back, waist, ties, shoulders, neck, hands. A layer's depth nudge only settles ties. Masks (owner's ask): a face slot with ten masks (oni, kitsune, tengu, menpo, porcelain, skull, shinobi wrap, crow beak, glitch visor, iron somen). Masks are the one item that can be **any colour**, not just black. **The hat is an item** (owner): optional, not always on; it moved out of the rig into a head slot (the game still starts him in the straw hat and flat mantle). Some masks fit under a hat; the oni (horns) and kitsune (ears) don't, and whichever went on last stays. **Hair system** (owner's ask): eight styles on the scalp, long ones with cloth tails; on the head the order is scalp, hair, mask, hat, and a hat hides whatever hair is above its brim. **Hats and masks together** (owner): each hat says which masks it takes (the tengai basket none, the kabuto only the menpo), and some pairs are special: broken hat + oni (horns through the split), straw hat + kitsune (worn to the side, festival style), kabuto + menpo (laced together), jingasa + glitch visor (lit brim). **Twenty more** (owner's ask, forty in all): torn hakama, tight trousers, iron shin guards, short kimono, jinbaori, chain shirt, monk's robe, split cape, sashimono banner, travel bundle, sake gourd, belt and pouches, tassets, shoulder strap, prayer beads, fur mantle, kataginu, neckerchief, iron gorget, hand guards; every slot now has at least two. Waiting on the owner's picks.
4. **Front, back and diagonal views: in the game** (`src/rig/port.js`, `src/rig/body3d.js`, `docs/port-system.md`). He faces the way he moves: side on, three-quarters toward or away from the camera, straight toward it (S) or away (N). Idle, walk and run turn with him; Harvest faces north, his back to the camera. From the side nothing changed: it is still the side rig. Every other facing is his side pose run through `port()` and drawn by rig v2's body, in whatever he wears (the straw hat and flat mantle got their 3D forms). Owner (2026-09-26): the west side mirrors the east "for now", and attacks, skills and stances stay side on ("ok"). Claude's call: his stance is a little wider than rig v2's rest, so a run toward the camera shows two legs. The samurai turn the same way toward the ronin, a beat late, while they guard, flinch and stagger; the dead stay side on. Every weapon has its own look from the other facings (`src/weapons/art3d.js`): the spear slung diagonally across his back, head up behind the hat; the nodachi's long saya down his back, hilt over the right shoulder, its blade planted in the floor rather than through it; the twin tanto at the obi, the back hand's in a reverse grip along the forearm.
5. **Real enemies** with health, needed by K. Built in the game (`src/world/enemies.js`), waiting on the owner's review:
   - Seven topknot samurai replace the dummies, on his rig: bare head and topknot, no hat or mantle, red-grey, a red eye, blade out in guard.
   - Health 4. Damage per hit: slash 1, double slash 1 per cut, sheath-click burst 1, storm slam 2, Thousand Cuts 2, Crescent Moon 3, Cross Rift 1 per arm and 2 on the detonation, mirror 1, chain 1. Starting numbers, open to tuning.
   - Reactions: a hit makes him flinch; a blow of 2 or more, or a second hit within 0.5 s, staggers him back a step. He turns to face whoever hit him, and in guard turns to keep facing the ronin a beat late. A thin red health bar shows once he is hurt.
   - Death uses the deaths pass (PR #2): spring joints, knees give, kneel, a gravity fall that stops dead with dust, a twitch or two, the eye going out; his sword falls from his hands; blood drops, stains and a pool.
   - Clear the room and the fallen fade after about 3 s and a new squad steps in.
   - Not yet: enemy movement and attacks (the counters' attacks come with them), executions cutting into pieces (K).
