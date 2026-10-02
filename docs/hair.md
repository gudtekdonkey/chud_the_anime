# Hair and the head slot (the iso slice, `src/iso/hair/`)

Owner (2026-10-02): "we also need to design hair for the character, and how it will interact with certain hats".
Built on the 3D look of the iso slice (`?iso`); today's game and the pixel look are untouched. 24 hairstyles,
10 hats, every pair checked for clipping in every move (`npm run check:hair`).

## Trying it

| | |
|---|---|
| `?iso` | the overlay's **Hair and hat** section: his hair (`Alt+H`, Alt+Shift+H back), his hat (`Alt+T`), the samurai's hair and hat, **Randomise both** (`Alt+Y`), the grid (`Alt+G`); Alt since the merge, as the bare letters are game and overlay keys |
| `?iso&hairgrid` | every hairstyle (columns) under every hat (rows) in the active style; four close pages (`&page=0..3`: twelve hairs × five hats) or all 240 small (`&page=4`); `[` `]` step the facing; a pose picker (idle, run, J1, J3, roll, guard); `&foe` on the samurai's body |
| `?iso&hairgrid&facings&hairs=chonmage&hats=none,kabuto&zoom=4&cell=3.5,0` | review: one hair's eight facings across, chosen hats down, close |
| `npm run check:hair` | renders all 240 pairs in all 8 facings (screenshots in `test-output/hair/`), runs the audit on both bodies, plays the pickers in the courtyard |

The samurai keep a topknot (chonmage) by default (owner); he wears the ronin's tied-back hair under the jingasa.
A hat that refuses the hair is refused with the reason shown; a hair picked under a hat that refuses it takes the hat
off (whichever went on last stays, as the wardrobe's masks do). Randomise only deals pairs that fit.

## The head-slot contract (shared with the armour work)

Any helmet or hat, from this session or the armour session (`claude/armour-200`), joins the head slot by declaring
these fields; hair follows them and knows no particular hat. The code is `src/iso/hair/contract.js`.

**Spaces.** World units on the 3D skeleton. HEAD space is the head bone's (origin at the skull's base, +y up, +z his
face, +x his left). Hair and head-mounted hats are built in CENTRE space: HEAD + (0, `HC` = 2.15, 0), the middle of the
scalp, whose radii are `SCALP` = 1.95 × 2.05 × 1.95.

**A hat declares:**

| Field | Meaning |
|---|---|
| `mount` | `'head'`: rigid on the head (centre space). `'pivot'`: on the brim pivot (HC + 0.55), which keeps its own angle and lags on the pose's `hatTilt` / `hatLag` springs, as the jingasa always has |
| `brim` | the brim's radius, or none. A brim hat casts the brim shadow, takes the overlay's tilt and brim width, and hides the eyes behind the glint rule |
| `shells` | the room hair has inside it (below). Every hair vertex is kept inside every shell, every frame: hair the hat meets is compressed under it, never drawn through it |
| `regions` | `{ region: 'hide' }` for what it covers whole (not drawn at all); anything else is shown, kept inside the shells |
| `crown` | what a crown item becomes: `{ knot: mode, tail: mode }`, mode one of `show`, `under` (compressed into the hat), `through` (out of `hole`), `inside` (housed by a tall crown, not drawn), `behind` (tied again low at the nape), `hide`, `refuse` (the pair cannot be worn) |
| `hole` | for `through`: the hole in its top, in its own space (the kabuto's tehen) |
| `chains` | its own cloth on springs (a bandana's or hachimaki's ends) |
| `cloth`, `cords`, `throwable` | the cloth material; his jingasa cords; the hat-throw execution (wardrobe rule) |

**Shells** (each convex where it binds, so a triangle with its corners inside stays inside):

| Shell | Fields | Binds |
|---|---|---|
| `cone` | `y0, R, top, r1` | a brim hat: under the outer surface y(r) (`top` within `r1`, falling to `y0` at `R`) |
| `dome` | `c, r, cut, open` | inside the ellipsoid `c ± r`, for points on every `cut` plane's side (`n·p ≥ d`), except in the `open` window (a hood's face) |
| `wall` | `y, r, sz, arc` | a skirt or band: within radius `r[0]` at `y[0]` to `r[1]` at `y[1]`, within `arc` of the back (π: all round) |

**A hairstyle declares** (`styles.js`): parts in **regions** (`crown` the top of the scalp, `back`, `sides`, `fringe`,
`tail` anything that hangs, `strands` loose locks at the face, `knot` the crown item), its **crownItem** (`'knot'`: a
topknot or a bun on the crown; `'tail'`: a high tail; none), colours, and what the bare head shows (`scalp`).

**Chains** (tails, braids, sheets of loose hair, locks, a hat's ties) hang from a root on the head and are posed from
the pose's own springs (the Animation Flow page's, sampled with the pose, so they step with the style's frame rate):
back with `speed` and the head's lag (`hatLag`), aside with `swing` and the turn's `roll`; then pushed clear of his
body (`BODY` in contract.js: the dō and the jinbaori's shoulders, the spine, the neck, the head), each segment swung out
where it would cut a corner.

## The hats

| Hat | Mount | Shells | Hides | Topknot | High tail |
|---|---|---|---|---|---|
| No hat | head | none | nothing | show | show |
| Iron jingasa (his, ronin.js's) | pivot (brim 9.5) | cone | nothing | under | behind |
| Straw kasa | pivot (brim 8.2) | cone | nothing | under | behind |
| Kabuto | head | dome + wall (the shikoro) | fringe, strands | through the tehen | through: a plume |
| Eboshi | head | dome | crown | inside | behind |
| Tengai basket | head | wall | crown, back, sides, fringe, strands | hide | behind: falls out below |
| Hood | head | dome (open at the face) + wall (the drape) | crown, back, sides, strands | hide | behind: falls out below |
| Bandana | head | dome + dome | nothing | refuse | refuse |
| Headband | head | wall | nothing | show | show |
| Hachimaki | head | wall | nothing | show | show |

The bandana takes only hair with nothing on the crown (owner); the headband is open on top, so every hairstyle shows
over it (owner). A fringe shows under the brim hats and the bands, in the hood's opening, never under the kabuto's
visor. A tail falls out below every hat; under the hood and the tengai a high tail is tied again at the nape first.

## The hairstyles

| Style | Group | Regions | Crown item | Chains |
|---|---|---|---|---|
| Chonmage (`chonmage`) | Topknot: shaved pate, the knot folded forward, white motoyui cord | back, sides, knot | knot | 0 |
| Ginkgo knot (`ichomage`) | Topknot: the knot's end fanned | back, sides, knot | knot | 0 |
| Tea-whisk knot (`chasen`) | Topknot: no shave, an upright whisk | crown, back, sides, knot | knot | 0 |
| Ronin's knot (`ronin-knot`) | Topknot: the pate grown out, loose locks | crown, back, sides, knot, strands | knot | 2 |
| Old knot (`white-knot`) | Old master: a thin white knot | back, sides, knot | knot | 0 |
| Ronin tied back (`ronin`) | Tied: his default; a short tail, two locks, a swept fringe | crown, back, sides, fringe, tail, strands | — | 3 |
| Low tail (`low-tail`) | Tied | crown, back, sides, tail | — | 1 |
| High tail (`high-tail`) | Tied | crown, back, sides, knot | tail | 1 |
| Single braid (`braid`) | Braided | crown, back, sides, tail | — | 1 |
| Twin braids (`twin-braids`) | Braided, brown | crown, back, sides, tail | — | 2 |
| Half up (`half-up`) | Tied: a bun on the back of the crown, the rest loose | crown, back, sides, knot, tail | knot | 1 |
| Low bun (`bun`) | Tied, a pin through it | crown, back, sides | — | 0 |
| Mizura loops (`mizura`) | Ancient: looped at both ears | crown, back, sides | — | 0 |
| Long and loose (`long-loose`) | Loose | crown, back, sides, tail, strands | — | 3 |
| Straight cut (`hime`) | Loose, blue-black: a straight fringe, side locks to the jaw | crown, back, sides, fringe, tail, strands | — | 3 |
| Wild (`wild`) | Loose: clumps all round | crown, back, sides, strands | — | 2 |
| Close crop (`crop`) | Short | crown, back, sides | — | 0 |
| Shaved, grown in (`stubble`) | Short | crown, back, sides | — | 0 |
| Monk's shave (`monk`) | Short: bare | — | — | 0 |
| Wrapped (`wrapped`) | Covered: the shinobi's cloth wrap, its ends on springs | crown, back, sides, tail | — | 2 |
| Bald sage (`sage`) | Old master: white at the back and sides, long locks | back, sides, tail, strands | — | 3 |
| Silver mane (`silver-mane`) | Old master, stylised | crown, back, sides, fringe, tail, strands | — | 3 |
| Spiked fringe (`spiked`) | Stylised | crown, back, sides, fringe | — | 0 |
| Swept flame (`flame`) | Stylised | crown, back, sides | — | 0 |

Colours come from the slice's ramps (`gfx/palette.js`): black, blue-black, brown, iron grey, white, the stubble and
the shinobi's cloth; cords in white paper, red, indigo or straw.

## What the check proves, and what it does not

- Every pair renders in all 8 facings with no page errors (32 grid screenshots, plus all 240 at once).
- The audit poses both bodies through idle, the start, a run that turns, the stop, the skid, the roll, J1 → J2 → J3,
  the lunge, the sheathe, the guard, the recoil, the knock, the death, the falling cut and the armed run, with their
  springs live (and the active style's push), and counts: hair vertices outside a hat's shells (0), and samples along
  every chain inside the body (0). Facing never changes these (hair, hats and chains all hang under the body's turn).
- Reported, not failed: the **hats' own** contact with the body in extreme moves. The jingasa as ronin.js always drew
  it (and the kasa) meets the jinbaori's shoulders when he falls in the death and in the falling cut, because the brim
  keeps its world angle; the hood's drape and the tengai's rim touch the collar in the roll's tuck. That is the hat's
  and the armour's to settle (a hat that follows the head when he falls), not the hair's.
- In the roll's deepest tuck the first 2.6 units of a chain may brush the scalp it grows from (the audit does not count the head there); never the body.

## Open for the owner

- His default hair under the jingasa (Claude's pick: the ronin's tied-back hair, its short tail and two locks just
  showing below the brim), and the samurai's (the chonmage, as the design says).
- The bare-headed hero's scalp colour (a dark warm skin, `#3a2f2a`; ronin.js's near-black head is otherwise kept).
- Which hats and hairstyles go in the game, their colours (the bandana and headband in any colour, owner).
- The pixel look keeps its own drawing; hair there waits on the 3D-or-pixel pick.
