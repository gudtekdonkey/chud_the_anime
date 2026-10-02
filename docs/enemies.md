# Enemy types and their combat (the 3D test level, `?iso`)

Owner (2026-10-02): "Enemies that really fight … enemy variety … group behaviour". Built in `src/iso/enemies/`,
behind `?iso` like the rest of the slice; today's game is untouched. This branch (`claude/3d-enemies`) owns the
**enemy types**: their models, movesets, attacks and telegraphs, hit reactions, guard / parry / dodge, death, and the
**action interface** a decision layer drives. The decision layer itself (perception, aggro and threat tables, utility
AI or behaviour trees, companion roles and orders) is the squad-AI branch's (`claude/3d-squad-ai`); a small
placeholder brain here makes this branch playable alone and is replaced whole by plugging theirs in.

## Playing it

`npm run dev`, open `/?iso`, then pick a group in the overlay's **Enemies** section (or `G` to step through them,
`R` to bring the group back). `/?iso&group=mixed` starts on a group; `&ehp=.5` scales their health (the check uses it).
The lone samurai (the slice's own, `play/foe.js`) is the default and is parked while a group is out. The hero's health
shows top left (12 pips); at nought he is knocked down and it fills again (the slice has no death yet). A cleared group
comes back 3 s after the last body fades. **Placeholder brain** off: they stand and wait to be driven.

| Group | Who |
|---|---|
| One swordsman / spearman / archer / heavy / shinobi | each type alone |
| Mini-boss: the Red Ronin | the duelist |
| Patrol | three swordsmen and a spearman |
| Mixed | two swordsmen, a spearman, an archer, a heavy |
| Ambush | two shinobi hidden in the yard, an archer, a swordsman |
| Warband | eight: two of each melee, two archers, a heavy, a shinobi |

## The types (`enemies/types.js`, data only)

Distances in the table are world units (the data is in rig px, ×0.5).

| Type | Model (`model.js`) | HP · poise | Moves (telegraph → blow) | Defence | Breaks |
|---|---|---|---|---|---|
| **Samurai swordsman** | the samurai in red lacquer, a red hachimaki, katana | 6 · 3 | **string2 / string3** (overhead cut → rising cut → a second wind-up and the heavy step-chop, which knocks down); **thrust** (drawn back to the hip, a long lunge, 23 reach); **guard break** (a front kick: orange, cannot be blocked, knocks down) | blocks 30% of cuts aimed at him (two blows break his guard; a J3 or lunge breaks it at once; a broken guard staggers him 1 s and takes 1.5× damage); rarely hops | backs off at low morale |
| **Ashigaru spearman** | earth-brown cloth, red-lacquer plates, a black jingasa with a red mon, a yari | 4 · 2 | **poke**, **poke twice** (26 reach, pulled back first); **sweep** (the spear wound high behind him, a wide low arc, orange, knocks down) | hops back or aside from 35% of cuts | the first to run |
| **Ashigaru archer** | as the spearman, a flatter jingasa, a yumi (its string drawn to the hand), a quiver | 3 · 1 | **loose**: nock, raise (the wind-up, and the **aim line** from the bow, dotted while he tracks), the long draw, the line locks solid 0.2 s before the release; the arrow flies straight along it | keeps 115 away, behind the melee; hops back when you close inside 55 | runs early |
| **Kanabō heavy** | 1.2× scale, deep red, a horned kabuto and fanged menpō, great ō-sode, an iron studded kanabō | 14 · 6 | **swing** (0.8 s wind-up, a wide arc, 26 reach); **ground slam** (raised overhead, a held read, the slam: a ring of 16 that cracks the floor, shakes the screen; orange). Both hit his own side too | **super armour** while attacking: cuts land without a flinch (the flash only) until his poise breaks; never blocks or dodges; costs two tokens (an elite) | never |
| **Shinobi** | near-black indigo, a hood and mask with red eyes, scarf tails on a spring, a tantō | 3 · 1 | **dash cut** (a low coil, a 14-unit dash, the cut); **shuriken** (three in a fan, from range, the ranged pool); **smoke vanish** (when hurt and you are close: smoke, gone 1 s) and **ambush** (out of the smoke behind you, a leaping cut); in the Ambush group they start hidden and wait for you to come near | hops clear of half the cuts | runs at low morale |
| **The Red Ronin** (mini-boss) | black and iron armour, a crimson jinbaori on springs, a ragged sandogasa hiding his face (two red eyes under it), katana | 20 · 5 | the swordsman's strings and thrust; **flash-step cut** (a low back guard, a 19-unit dash and the cut); phase 2 adds the **flurry** (three cuts, three blows), phase 3 the **double flash-step** | a **parry window**: his blade turns up across him, flickering white (0.4 s); a cut into it is parried: the hero is thrown back and the riposte comes at once. 55% / 70% / 85% of cuts by phase; else he blocks (35%, three to break) | never; ignores tokens |

**Phases**: under 60% and under 30% of his health he roars (invulnerable, a ring that shoves you back) and comes on
faster (cooldowns ×0.7, then ×0.5). His bar is at the bottom of the screen with the phases marked.

### Every attack has the same shape

**Telegraph** (`e:tele` key: he flashes red for 0.28 s and a red star flares over his head; orange when the blow
cannot be blocked) → a **wind-up** he holds long enough to read, tracking you → the **commit** (0.14–0.3 s before
the blow he stops turning; a white glint on the weapon) → the **blow** (`e:strike`, `e:slam`, `e:loose`, `e:throw`)
→ the **recovery**, the punish window. The roll's i-frames go through any blow or shot. The hero's cut also cuts
arrows and shuriken out of the air.

**Hit reactions** (theirs, whatever decides): a light cut → the recoil; a heavy one (J3), or the poise run out → the
knock to one knee; a blocked cut → the guard's jolt; a broken guard → a stagger; death → the page's fall, then they
fade. Hit-stop 3 / 5 / 8 frames, the white flash, the clash on every hit, as the hero's own.

## The moves (`enemies/moves.js`)

Keyed clips in the Animation Flow page's format and units (eased keys, the root under the pelvis, the springs and
planted feet on top, blended in over 2–4 frames), on the shared skeleton. Each weapon has a hold (`HOLD`: sword
two-handed, spear level at the chest, bow lowered, kanabō on the shoulder, tantō reverse-gripped low); `e_stalk`
steps the feet under that hold while he moves sideways or back still facing you. `HITS` says what each blow covers
from his root (a point and radius, an arc, or a ring), when he commits, whether it knocks down, cannot be blocked or
hits his own side. A new move is a clip here, a `HITS` row and a line in the type's `moves`.

## THE ACTION INTERFACE (for the squad-AI branch)

```js
import { SQUAD } from './enemies/squad.js';      // the group: SQUAD.enemies (live list), SQUAD.tokens, SQUAD.ctx, SQUAD.spawn(name)
import { onEnemy, EVENT_NAMES } from './enemies/events.js';

SQUAD.brain = myBrain;          // replace the placeholder for everyone: { think(e, ctx), threat?(e, ctx, th) }
e.brain = myBrain | null;       // or per enemy (null: no brain; you call e.do yourself)
```

`think(e, ctx)` is called every ~0.15 s for each living enemy; `threat(e, ctx, { move, d })` the moment the hero
starts a cut that could reach him (within 42 units, in front of the hero): the reflex hook for block / parry / dodge.
`ctx = { hero, enemies, tokens, slotOf(e) → { x, z }, alone(e) }`.

**Reading an enemy** (never write to these): `e.info` → `{ id, kind, name, role, st, clip, hp, maxHp, poise, morale,
phase, token, attack, x, z, h, dead, hidden, ring, boss }`; `e.T` the type row; `e.moves()` →
`[{ name, range: [min, max] (world units), pool, ready, weight, unblockable, hitAt, kind }]`; `e.dist(other)` (rig px);
`e.targetable`. `st` is `ready` (free to be told), `attack`, `block`, `parry`, `dodge`, `hurt`, `broken`, `phase`,
`vanish`, `hidden`, `flee` or `dead`.

**Acting**: `e.can(action, target, opts)` says whether `e.do(action, target, opts)` would be taken now; `do` returns
false and changes nothing if not. Positions and distances are world units.

| action | opts | does |
|---|---|---|
| `hold` | | stand in guard, facing the target |
| `move` | `{ x, z, run? }` | go there (runs when far, stalks when near, facing the target) |
| `approach` | `{ dist?, run? }` | close to `dist` from the target (default his ring) |
| `retreat` | `{ dist? }` | back away, still facing |
| `strafe` | `{ dir: ±1 }` | circle round the target |
| `engage` | `{ dist? }` | take a melee token and close in to striking distance (melee only; refused with no token free) |
| `attack` | `{ move, force?, noToken? }` | start a move from `e.moves()`: needs `ready`, the move off cooldown, the target in its range and a token in its pool (a boss needs none) |
| `block` | `{ dur? }` | raise the guard (types with `guard`) |
| `parry` | | open the parry window (the duelist) |
| `dodge` | `{ dir: 'back' \| 'left' \| 'right' \| heading }` | a hop clear, i-frames 0.28 s (types with `dodge`) |
| `vanish` / `ambush` | | the shinobi: smoke and gone; out of hiding behind the target with the leaping cut |
| `flee` / `regroup` | | run for the far corner; come back (`st` back to `ready`) |

Movement actions are intents: he keeps doing it until told something else. Everything else plays out and hands him
back `ready`. Hits on him (`e.takeHit`), his blows on the hero, the tokens' return, morale and death are his own and
need no decisions.

**Attack tokens** (`ctx.js` `TOKENS`): melee 2 (the heavy costs 2), ranged 1, given back 0.3 s apart, a lease
unused for 3 s taken back; a boss ignores them. `attack` and `engage` respect them; `noToken` overrides.

**Events** (sound-ready, `onEnemy(fn)`, each `{ name, t, id, type, x, z, ... }`; `EVENT_NAMES` says what each means):
`spawn telegraph commit swing hurt-hero whiff hit armor block break parry-ready parry dodge dodged vanish appear
shoot deflect slam phase flee regroup death cleared hero-down`.

## The placeholder brain (`enemies/brain.js`) and the group (`enemies/squad.js`)

The brain, per enemy: hidden → ambush when you come near; fleeing → regroup at morale 0.7; shaken (morale under the
type's `breakAt` and hurt or alone) → flee; the shinobi vanishes when hurt and close; the archer hops back inside his
`tooClose`; otherwise a move it can start now (weighted), else `engage` if a token is free, else go to its slot. On a
threat: parry (by phase), block (the type's chance) or hop clear.

The group gives each enemy a **slot**: the melee spread evenly round the hero at their rings (two flank him 145°
apart, three or more surround him), the ranged behind the melee at their range, side by side. **Morale**: each hit
costs a little, a death within 130 units costs `(1 − brave) × 0.55` to everyone near; it comes back slowly, faster
once a fleeing one is well away. They are kept apart and off the hero. A white pip over a head marks who holds a
token; a mark over a fleeing one.

## What the check covers (`scripts/check-iso-enemies.mjs`, part of `npm run check:iso`)

On a fresh page at half enemy health: each type picked in the overlay telegraphs (the event) and then strikes or
shoots, a close-up of the telegraph, then the hero runs at it and cuts until it dies (its death event), a close-up of
the death; then the patrol: at least four attacks, never more than two attacking at once and never more than two
melee tokens out, at least two of the four attacking, and two of them at some point more than 2 rad apart round him.
`ISO_ONLY=enemies node scripts/check-iso.mjs` runs only this part (after a build).

## Not yet

- The pixel look draws every type as the pages' samurai (its own type art is still to come).
- The hero has no guard or counter (F) yet, so "guard break" is the swordsman's knock-down kick; parry windows are the
  enemies' (the duelist's), not his.
- The shinobi's smoke and the arrows are drawn on the effects layer, not modelled.
- Sounds: every event above is a hook; no sounds are played.
