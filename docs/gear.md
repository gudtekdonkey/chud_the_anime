# Gear: 200 pieces that all work together

Owner, 2026-10-02: "LET'S DESIGN 200 PIECES OF ARMOR … THEY SHOULD ALL BE ABLE TO WORK WITH EACH OTHER. LAYERS: BASE
(DIFFERENT SHIRTS, DIFFERENT PANTS), ARMOR (DIFFERENT SAMURAI ARMORS). SLOTS: HEAD, LEFT ARM, RIGHT ARM, LEFT HAND,
RIGHT HAND, FEET, PANTS", and "mix of samurai/villager/ninja".

Built for the iso slice (`src/iso/gear/`, behind `?iso`); today's game is untouched. Every piece is data: procedural 3D
parts measured from the slice's skeleton (`look/three/rig.js` `SK`), so it fits every pose of the Animation Flow moves
and all eight facings, and any piece can be worn with any other.

## Running it

| | |
|---|---|
| `/?iso` | the slice; the overlay's **Outfit** section: a preset, **Randomise** (`G`, from one family or any), every slot's base and armour piece by hand, the outfit's stats. Remembered in the browser |
| `/?iso&outfit=general` | open in a preset (`iron-ash`, `general`, `ashigaru`, `farmer`, `hunter`, `monk`, `night-runner`, `crow`, `three-roads`, `deserter`, `veiled`), `random`, `random-ninja`, `random-samurai:42` (seeded), `built` (Iron Ash as built), or an encoded outfit |
| `/?iso&gear` | the catalogue: all 200 pieces rendered on the model through the slice's pipeline, filtered by slot, layer, family or a word; a try-on figure that wears whatever is picked |
| `prototypes/47-gear-catalogue.html` | the same catalogue as one standalone page (`node scripts/proto47/build.mjs`) |
| `/?iso&sheet&outfit=monk` | the contact sheet (8 facings × the loop's moments) in an outfit |
| `npm run check:gear` | Node, no browser: every piece alone and over a full outfit, every preset, 600 random outfits, built, posed and drawn in both looks (below) |

The default stays **Iron Ash V3 as built** (`look/three/ronin.js`, the model the owner called perfect). The first preset,
*Iron Ash V3, in gear*, rebuilds that look from gear pieces.

## The grid: slots × layers

| Slot | Base layer | Armour layer |
|---|---|---|
| Head | hair, headbands, caps, hoods, face wraps (12) | kabuto, jingasa and kasa, chain hoods, masks (20) |
| **Torso** | shirts: kosode, juban, jackets, vests (18) | dō, lamellar, chain shirts, mino, capes, jinbaori (22) |
| Left arm, right arm | what is done to the sleeve: tied back, rolled, wrapped, bound (8 each) | sode, kote, bracers (11 each) |
| Left hand, right hand | gloves, wraps (6 each) | tekkō, gauntlets, claws (7 each) |
| Pants | hakama, trousers, loincloth and apron (18) | kusazuri, haidate, straw and hide skirts (18) |
| Feet | tabi, sandals, geta, boots, wraps (12) | suneate, kogake, greaves, gaiters (16) |

**Hair** (joined 2026-10-02, `docs/hair.md`): on the 3D look hair is its own pick (24 hairstyles), and every head piece here is a hat in the hair's head-slot contract, derived from its parts (`hair/gear-bridge.js`). The two hair pieces above stay for the outfits and the pixel look; on the 3D look they set the hair pick.

**Torso is the one slot added** to the owner's list. Shirts are the base layer's torso, and a samurai dō (chest and back
plates laced round the body) hangs from no limb: neither an arm slot nor "pants" can carry it, and a shirt-only torso
would leave the armour layer with nothing to put a dō in.

Arms and hands are per side, as the owner listed them: every arm and hand design comes as a left piece and a right
piece (`-l`, `-r`), so one ō-sode and one bare chain arm, or a claw on the sword hand only, are outfits like any other.
That makes **200 pieces: 168 designs, 32 of them arm and hand designs in a left and a right piece.**

**Families:** samurai 76, villager 63, ninja 61 (samurai lead in the armour layer: "different samurai armors").
**Rarity** (by colour, below): 118 common, 57 uncommon, 21 rare, 2 epic, 2 legendary.

## Why any two pieces fit: shells

A piece is a list of **parts** (`gear/parts.js`): a tube down a bone (sleeve, trouser leg, bracer, a shirt's body), lames
(a dō, a laced sleeve), bands (lacing, an obi, wraps), plates on one side (splints, suneate, haidate), panels on hinges
(kusazuri, a hakama's skirt, a coat's tails, a straw cape), a cap over the head (hood, helmet bowl, hair), a neck guard,
a crest, a mask, a hat on the head's pivot, a glove, a boot, a sole, a sode on its hinge, a detail box on a surface, a
hanging tail. Each part names its **zone** (crown, face, neck, chest, belly, hips, upper arm, forearm, hand, thigh,
shin, foot; limb zones per side) and its **shell**:

| Shell | | Shell | |
|---|---|---|---|
| 1 tight | wraps, tabi, gloves, hair | 5 mail | chain, padding, quilting |
| 2 shirt | the shirt | 6 plate | dō, kote, suneate, haidate, helmet bowls |
| 3 pants | trousers, hakama | 7 outer | sode, kusazuri, jinbaori, capes, hats |
| 4 over | jackets worn out, leg wraps, sleeve ties | | |

The dresser (`gear/dress.js`) builds every worn part **inside out by shell**, and keeps per zone how far the shells
under it already stand off the body (`pads`, five samples down the bone). A part's radius is the body's, plus that
pad, plus its own thickness. So a dō over a quilted vest is bigger than a dō over a kosode, a kusazuri hangs clear of
whatever the hips and thighs wear, a hat is lifted over a hood, a gauntlet sits on the glove: **nothing is ever built
inside what is under it, whatever the combination.** Nothing refuses a pairing; conflicts are settled by two rules:

- **Hides** (`hides: ['chest', 'belly']`): a piece hides the parts of the shells under it in those zones. A dō hides
  the shirt's body (never its sleeves); a kabuto hides hair and headbands; the tengai basket hides the face. Hidden
  parts are not built at all (fewer draw calls).
- **Shapes** (`shapes: { shin: 'tucked' }`): a piece reshapes the parts under it in a zone, if they say how
  (`alt: { tucked: {…}, rolled: 'hide' }`). Shin guards and leg wraps tuck the trouser leg in (V3's hakama tied at the
  shin); a sleeve tie or a rolled sleeve takes the shirt's forearm away; wraps and kote tuck the sleeve.

The eyes are placed last, on whatever covers the face at the eye line (a full hood or a mask with slits), so the cyan
glint is never buried; a wide brim makes the piece the rig's hat (its shadow on him, and the glint rule).

## A piece, as data

```js
G('torso', 'armour', 'samurai', 'okegawa-do', 'Okegawa dō', { A: 'i', C: 'v' }, 'V2',
  "Iron Ash's dō: riveted iron lames laced in indigo, a lit plate over the heart.",
  [lames('belly', S.plate, { n: 2, c: 'A4', c2: 'A5', lace: 'C5' }), lames('chest', S.plate, { … plate: [3.0, .8] })],
  { hides: ['chest', 'belly'], pix: 'dou' })
```

`G(slot, layer, family, id, name, palette, stats, about, parts, { hides, shapes, pix })` (`gear/kit.js`); `G2` makes
an arm or hand design's two pieces. Every row is validated when it loads (`schema.js validate`): a known slot, layer,
family and dye; every part inside its slot's reach (a shirt may reach the arms for its sleeves, feet the shin);
base parts at shells 1–4, armour at 5–7; stats 1–4 points. The rows: `items-head.js`, `items-torso.js`,
`items-arms.js`, `items-legs.js`; `items.js` gathers them (`GEAR`, `BY_ID`, `BY_CELL`).

## Colour and material (`gear/palette.js`)

Eight-shade ramps, darkest first, in the slice's night palette. A piece paints from its own letters (`A` main, `B`
second, `C` lacing or cord, `D` detail), each a dye, so a recolour is one letter. The rules are the design notes':

- **Cloth colour is rarity:** black, dark grey (common); earth brown, moss drab, indigo (uncommon, a Claude call: the
  working dyes of the villages); grey, ash white (rare); hemp beige (epic); persimmon, royal red (legendary: red only
  on a lord's lacing).
- **Armour takes dark dyes** at the iron's lightness: oxblood, indigo lacquer, moss, plum, bronze, teal, black lacquer.
- Hard materials: iron (Iron Ash's own ramp), mail, leather, straw (V3's), bamboo, wood, fur.

A piece's rarity is its rarest colour. In the Pixel-render style the palette step snaps every pixel to the slice's
~80 colours, so the rarer gear colours quantise there (the palette is shared and was not widened).

## Stats (owner pick 3A)

The party's four on the existing scale: `stats: 'V2E1'` is VIG +2, EDG +1 (`party/kit.js` `gearStats` reads the same
keys: vigor, edge, speed, focus). 1–4 points a piece; samurai armour leans to VIG and EDG, ninja to SPD and EDG,
villager to VIG and FOC. **Open for the owner:** a full outfit is 16 pieces, so it sums to ~20–33 points (Iron Ash in
gear: VIG +16, 23 in all; random outfits 21–33, the general 33), where today's 7-slot wardrobe sums to ~8. On `player/stats.js`'s per-point effects (VIG 5% less damage a
point) that is too strong once gear reaches the game: either base pieces give nothing, or the per-point effects shrink,
or stats come only from the armour layer. Placeholders until then.

## The pixel look

The pixel look draws through the pages' 2D engine, a style of feature flags (`look/pixel/styles.js`), so an outfit
becomes a style (`gear/pixel.js`): Iron Ash's refined F1 stripped to the body, then each piece's `pix` words switch its
features on (dō, surcoat, kusazuri, haidate, suneate, kote and sode per side, hat, kasa, helmet, hood, menpō, cape, coat,
straw skirt, leg wraps, waraji) and its colours become the ramps of the parts they paint. Coarser than the 3D dresser:
one armour colour, one hat per kind, and the engine's sleeves and mantle are left out because they hang on cloth chains
the slice does not simulate (a straw cape draws as the engine's cape). Every piece still shows as something.

## The look seam

Both looks take an outfit when made: `makeLook(kind, { foe, outfit })`, the four calls unchanged. `Char.dress(outfit,
scene)` rebuilds the look; the controller never notices. `window.__iso.outfit` (encoded) and `.dressed` (per piece:
parts built, hidden, shaped) are read-only, for the checks.

## What the checks cover

`npm run check:gear` (Node, ~10 s): 200 pieces, every slot and layer stocked, the families; each piece alone and over a
random full outfit; the 11 presets (every slot filled) in 10 moments of the core loop × 8 facings; 600 random outfits
(300 any family, 100 per family, every slot filled, every piece worn); for each: no errors, no slot worn that shows
nothing, finite geometry within 30 units, every zone's pad between 0 and 3.2 units off the body, the pose applied in all
8 facings, the pixel engine's drawing, the outfit string round-tripping.
`npm run check:iso` adds the picker in the browser, picked through the overlay: a preset (16 pieces built), a random
outfit (`G`, every slot filled), a cut landing on the samurai in each and in the pixel look, back to Iron Ash as built,
no page errors (screenshots `outfit-*.png` in `test-output/iso/`).

## Placeholder, and what an artist replaces

The parts are boxes, tubes, rings and caps placed in code, like the rest of the procedural Iron Ash. A modelled piece
replaces a row's `parts` with its mesh on the same bones (or skinned to the same skeleton), keeping its slot, layer,
shell, hides and shapes; the rules that make any two pieces fit stay the same.
