# Handoff: HUD, weapons and items (for the game session)

The owner loved `prototypes/20-items.html` ("I love the whole UI … the HUD, everything, please do it"). Build it into the game (`src/`) **exactly as displayed there**. The design session keeps working on move iterations and the rig v2 port system (8 directions), so those are out of your scope. Everything here comes from the prototypes and `docs/design-notes.md`. Read `docs/owner-taste.md` before drawing anything.

Open `prototypes/20-items.html` in a browser next to this file. It is the spec, and its code is plain JS you can lift: the pixel font, sprites, icons, `panel`, `meter`, `slot`, `brackets`, `prompt`, `banner`, `pickupSim`, `collectFx`, `bigRun`, `heroHud`.

## 1. The HUD (480×270, drawn in screen space after the world)

Copy the geometry from `heroHud()`:

| Piece | Where | What |
|---|---|---|
| Health + Qi | `panel(5, 5, 80, 18)`; health `meter(10, 9, 70, 4)` white; Qi `meter(10, 16, 70, 3)` cyan, **notched in thirds** | Qi flashes white for about 0.06 s on a gain. The fill edge is a 1px white line |
| Currency | `panel(W-69, 5, 64, 13)`; coin sprite + 4-digit mon (zero-padded), shard sprite + 2-digit shards | The number flashes pale cyan (`#b8fff6`) for 0.08 s on a gain |
| Bottom bar | `panel(133, 235, 214, 33)` centred at the bottom | weapon slot 22px at x=138; then quick slots 1–4 (20px, x = 166 + i·22, key digit top-left, count bottom-right); then 4 charm slots (20px, x = 260 + i·22, small diamond ticks on each side) |

- Slot frames: weapon `#7d868e`, quick `#565e66`, charm `#3b424c`. The fill is `rgba(12,13,17,.88)`.
- Slot options: `flash` (white on change), `cd` (a cooldown shade that drains upward), `dim` (35% icon), `count`.
- The pixel font is 3×5 (`FONT` in the prototype). It replaces the old `ui/qi-meter.js` glyphs. **Delete `ui/qi-meter.js`** and move its STORM behaviour onto the new Qi meter. When the meter is full and Storm Chain is running, the meter glows and crackles and shows `STORM`, as it does today.
- **Banners:** `banner(cx, y, small, big, c, dur, sc=2)` shows a small cyan label over a big white name, with rules drawing out to each side. It fades in over 0.1 s and out over the last 0.25 s. Used for `NEW WEAPON / GRAVE NODACHI` and `SKILL LEARNED / CROSS RIFT`.
- **Pops:** `+1` rising text for coins and shards; white plus marks for health.
- Keep the text line under the canvas (`#hud`) for debugging.

## 2. The inventory model (one object in `state.js`)

Suggested shape. The HUD reads only this, and every system writes to it:

```js
export const INV = { hp: 1, mon: 0, shards: 0, exp: 0, lv: 1,
  weapon: 'katana',                          // 'katana' | 'nodachi' | …
  quick: [{ id: 'bomb', n: 3 }, { id: 'talisman', n: 2 }, { id: 'whetstone', n: 2 }, { id: 'incense', n: 3 }],   // null = empty
  charms: ['bead', 'mirror', 'knot', null],  // 4 slots; locked slots open with glitch shards
  fx: { qi: 0, mon: 0, weapon: 0, quick: [0, 0, 0, 0] } }   // flash timers the HUD counts down
```

Qi already lives on `P.qi` (0..1). Keep it there.

## 3. Items (four kinds)

**Big items** are the ONLY things that get lock-on brackets. When he is within range (about 42 px), four cyan corners snap in from 8 px out, then breathe by 1 px. A prompt panel above shows a key cap `E` and the verb. Pressing E plays the interaction; the brackets flash white and go.

| Item | Verb | Effect |
|---|---|---|
| Wayside Shrine | PRAY | Kneel; health and Qi fill to full. Once per shrine, then its light goes out |
| Grave Nodachi (weapon) | TAKE | Pull it from the ground; the weapon slot swaps and flashes; banner `NEW WEAPON`. Longer reach, and every cut lands a beat heavier |
| Sealed Chest | CUT | One draw splits the paper seal; on the sheath click it opens and spills mon and Qi |
| Rift Tablet (skill) | READ | The glyphs leave the stone and fly into him; banner `SKILL LEARNED` + the skill name |

**Small pickups** have no brackets and no button. They idle until he comes within about 22 px (`pickupSim`: distance with y × 1.6). Then each one pops up a little, flies to his chest, accelerating (700 px/s²), and pops (`collectFx`).
- Qi Mote: +10% Qi, with a cyan ring and sparks.
- Rice Ball: +20% health, with white plus marks.
- Old Mon: +1 mon, with a `+1` and a glint.
- Glitch Shard: +1 shard (rare currency); he glitches for 0.12 s.

**Consumables** are picked up like small items, then used from quick slots with keys 1–4. Each use takes under a second, so it never breaks a fight.
- Static Bomb (×3): a cloud of black static at his feet; enemies lose him and he glitches a few steps back.
- Thunder Talisman (×2): lightning strikes the nearest enemy and jumps once, like Storm Chain, at no Qi cost.
- Whetstone (×2): a cyan edge for 20 s (show a cooldown/timer on the slot); cuts build Qi twice as fast.
- Grave Incense (×3): kneel and heal 60% over 1.5 s; a hit puts it out.

**Relics** are passive charms. They hover a pixel off the floor; walking into one sends it to the first empty charm slot.
- Thunder Bead: Storm Chain jumps one more.
- Cracked Mirror: each glitch teleport leaves an afterimage that cuts once.
- Temple Bell: each execution gives +25% Qi.
- Split Tsuba: landed hits build 25% more Qi.
- Paper Crane: once per area, a killing blow glitches you out at 1 health instead.
- Sageo Knot: the sheath click after a kill shocks enemies nearby.

## 4. Weapons

- The weapon slot shows the current blade: katana (default) or nodachi.
- A weapon changes reach and weight: the nodachi has longer reach and heavier hits (a longer hit pause and more shake).
- Draw the weapon on the rig by blade length. The rig draws a 13 px blade; the nodachi should be longer.
- Execution and counter animations must keep working with any blade.

## 5. Keys and conflicts

- **E** is the context verb: tap E at a big item to interact.
- **Hold E** near the fallen is **Harvest**: their remains stream into him as EXP (`INV.exp`, level-ups, banner `LV 5`). He faces **north**, back to the camera; until the 8-direction rig lands, use the side view. So E means "tap = interact with the locked-on item, hold = harvest". Make tap and hold unambiguous.
- **1–4** use quick slots.
- **F** is the counter. It is **tapped, not held**: a blow landing within 0.2 s of the press is countered, and an earlier press is only a block (pushed back, no counter). Show the window with the **glint** (it runs up the enemy's blade and a star sits on the point while the window is open); a **closing ring** is the assist option. The indicator pick is still open. See `prototypes/23-counters.html` for the attacks, their tells and the counter each one plays.
- Existing keys (J, K, I, O, P, N, U, C, Shift/L, Space) are in `CLAUDE.md`. **R** = Blade Recall (tap: call the blade back, alternating *home to the sheath* and *the catch*; hold: *the anchor*, he goes to the blade). **Q** = Lightning Chain. **X** = Time Slice (full Qi). **C** = Breath of Qi.

## 6. Numbers the HUD and systems share

- Qi is notched in thirds because Breath of Qi (seiza) spends a third per breath. Items and skills speak in thirds and tenths of the meter.
- **Power tiers I / II / III** scale several skills:
  - Time Slice zone radius: 48 / 96 / 178 px.
  - Breath of Qi: particle layers.
  - Glitch Dodge: at II it dodges again within 0.5 s, at III within 1 s.
  - Where the tier comes from (level, relics or upgrades) is **not decided yet**. Put it on `INV.power` (1..3) and ask the owner.
- Health is 0..1. The low-health warning blinks the HP label red (`#ff5a4a`) below 35%.

## 7. Rules that apply to everything you draw

- 1px pixel art: no anti-aliasing, no blur, alpha fades only. Palette: near-black bodies; cyan `#6ff3e4` / `#52e8d6` / `#b8fff6` and white effects on a grey floor `#474c4a`. Enemies are red-grey with a red eye. Clothing is shades of black, never bright red.
- No effects on the floor for Qi skills: no ripples, no rings, no sigils. Storm Breath's shockwave is the one exception.
- "Dramatic yet controlled": about a 2-frame white flash, a short hit pause, a small shake.
- Lock-on brackets are for big items only. Enemies use the assassination markers instead: isolation bubble, kill line and K prompt; see `CLAUDE.md`.
- Keep modules under about 400 lines, add each new file to the module map in `CLAUDE.md`, and record decisions in `docs/design-notes.md`. `npm run check` must stay green; extend it to press E at an item, pick up a coin, and use a quick slot.

## 8. What the design session is doing meanwhile (don't build these)

- The **rig v2 port system**: a retargeting layer that takes every side-view pose and produces the 8 directions (N, NE, E, SE, S, SW, W, NW) on the 2.5D skeleton, so no move is redone by hand. It will land as `src/rig/` modules with a clear API; until then, keep drawing with `rig()`.
- Executions batches 2 and 3, more counters, and skill iterations, all as prototypes first.
