# Squad AI: enemies that fight properly, companions with jobs, orders and the mouse

Built in the iso slice behind `?iso&squad` (2026-10-02). The owner's brief, verbatim:

> "what about npc logic or companion logic and orders? For companions I reckon we can give individual
> SETTINGS/INSTRUCTIONS where for example, you can set one of your companions as a tank, so he knows his job is to
> attract attention and take damage from enemies, your ranged troops for example, are by default set to keep out of
> enemy range, but you can also set them to tank if you want.. you can set them to protect you or any other character or
> attempt to assassinate high value targets -> these behaviors dictate what your companion does. Also you can give them
> different liberty levels -> to achieve a task maybe he has greater freedom of movement away from you. Then you can
> give squad instructions. Such as formations, fight tactic and order such as charge, hold, retreat etc.. You should be
> able to use your mouse and click + drag over a group."

## Playing it

`npm run dev`, then `/?iso&squad` (or the "The squad battle" link in the slice's overlay). The hero and five companions
start by the west wall; a samurai squad holds the yard by the gate: the officer **Taisho** (gold-tinted, proud and
sharp), **Goro** walking a patrol, **Ichi**, **Saburo** (nervous), the archer **Yumi** on the engawa beside the officer,
and the lone archer **Kage** by the walkway, away from everyone. The companions are the design notes' three (**Kuro**,
yari: Tank; **Suzume**, twin tanto: Assassin; **Tetsu**, nodachi: Striker) and two new ones (**Hana**, bow: Ranged;
**Ren**, bo staff: Support), paler steel than the hero. Clear the yard and the next wave comes in 3.5 s; a fallen
companion comes back with it. `&calm` keeps the foes at their posts (for trying the orders); `&look=pixel` works too.

| Input | What it does |
|---|---|
| WASD / arrows, J, Shift / L | the hero, exactly as in the slice |
| **left click** the ground / a foe | the hero goes there (click to move); on a foe he closes and cuts once |
| **left click** a companion | select him (Shift adds / removes; double-click: everyone of his role); the hero: clear |
| **left drag** | a selection box (Shift adds); it never moves the hero |
| **right click** (selection) the ground / a foe / an ally | go there in formation, then hold / attack him / protect him |
| **hold right** 0.28 s | the radial: Charge, Hold, Fall back, Follow me, Regroup, Focus, Spread out, Ambush |
| **Ctrl + 1–9**, **1–9** | save the selection as a group, recall it (Shift adds) |
| **G** | hold here / follow me (today's game's key) |
| **E** held by a downed companion | lift him (0.6 s, today's game's rule) |
| **Tab** | the companion settings (role, liberty, whom he protects, aggression); the game waits |
| **Esc** | clear the selection (or close the settings) |
| touch | long-press then drag selects; a tap on a companion selects; with a selection a tap on the ground, a foe or an ally is the right click; with none the hero goes there; the order bar is the radial |

The **order bar** under the game: the party's portraits (click selects, Shift adds, double-click the role), the orders,
formations and tactics, the selection's role and liberty, what happens while ordering (slow motion, pause or off),
"show minds" (each foe's sight cone and every man's current thought), a new wave.

**The rule that keeps the hero's clicks and the squad's apart:** the left button never gives an order and the right
button never moves the hero. With nothing selected an order goes to the whole party. The squad's keys never clash:
**the slice's pipeline toggles moved from 1–0 to Alt + 1–0** (and stay in the overlay as checkboxes), so 1–9 are the
groups; the quick slots 1–4 of today's game do not exist in the slice, and if the squad comes to the 2D game its groups
go under Ctrl / a modifier there or the quick slots move, the owner's call. Ctrl + a number is a browser's tab switch in
some browsers that do not let a page take it: the order bar's portraits and Shift-click do the same.

**Slow motion while ordering** (the dominion note, D2C: "the game must give a slowed or paused moment for it"): while a
selection box is being dragged, the radial is open, the pointer moves on the order bar with a selection (up to 1.5 s after it stops), and for 0.45 s
after an order, the game runs at 25% (or stops, or nothing: the bar's "While ordering"); a thin cyan frame and
"ORDERS · SLOW" show it. The settings panel (Tab) always pauses, as the kit screen does.

## Why utility AI (and not behaviour trees)

Every rule in the brief is a blend: a bold man attacks sooner, a cautious one later; a taunt sticks less to a sharp
man; a protector on a Close leash never chases far; the ranged keep out of reach unless set to Tank. In a utility AI each
of those is one weight in a score; in a behaviour tree each is another branch, and the branches multiply with roles ×
orders × tactics × personality. So each think a man scores his options (attack, circle, close in, block, shoot, kite,
flee, taunt, body-block, intercept, stalk, execute, lift, keep formation, return to the leash) from a few considerations
and takes the best, the current one slightly sticky so he does not dither. Group behaviour (turn-taking, rings, morale,
shouts) sits above it in a director. Intelligence and personality stay apart, as the dominion lane put it:
**intelligence decides how good the choices are, personality how willingly someone acts.**

## The files (engine side: no three.js, no DOM, so the 2D game can take them)

| File | Owns |
|---|---|
| `src/iso/ai/temper.js` | `temperOf(traits, knobs)`: six behaviour knobs (bold, aggro, patience, caution, discipline, wit = intelligence) from the movement traits (`src/traits`, read only); `TRAIT_TEMPER` (each trait's nudge); `reaction(wit)` |
| `src/iso/ai/senses.js` | sight cones, hearing, the alert meter (calm → suspicious → engaged), forgetting; the aggro table (`addThreat`, `pickTarget`) |
| `src/iso/ai/director.js` | attack tokens (`mayAttack`: 2 on one man, 3 on a side, a steal for the aggressive), rings (even angles round a target), morale (wounds, deaths, the leader), shouts |
| `src/iso/ai/brain.js` | the utility brain: `choose`, the shared options (`meleeOptions`, `rangedOptions`, `fleeOption`, `guardReact`), `thinkFoe`, `thinkSide` (staggered by wit); the INTENT the body reads |
| `src/iso/squad/orders.js` | `ROLES`, `LIBERTY`, `FORMATIONS`, `TACTICS`, `ORDERS` (dominion names where they overlap), defaults by weapon, the formation slot arithmetic |
| `src/iso/squad/squad.js` | the selection, groups, giving an order / a setting (to the selection, or all), anchors and slots each step |
| `src/iso/squad/mind.js` | a companion's think: the role's options (tank, protector, assassin; striker / ranged / support on the shared ones), the leash, the order and the tactic as considerations |

`node scripts/squad-sim.mjs [seconds] [seed]` runs these alone in Node on bodies made of plain numbers (walk at the speed, a swing
lands after 0.3 s): the party charges, the samurai take turns, the tank taunts, the archers kite, someone goes down and is
lifted, the yard is cleared, with no three.js and no DOM. That script is the template for driving them from the 2D game.

The slice's side (`src/iso/squad/`, three.js and DOM): `npc.js` (an agent's body: intents to the flow's clips, the swing,
the hit and the parry, downed and lifted), `combat.js` (whose blow lands on whom, arrows, the taunt; the hero's own hits
keep the slice's hit-stop and clashes), `battle.js` (the cast, the AI's world, the step order, waves, the hook),
`control.js` (mouse, touch, keys), `draw.js` (rings, letters, bars, "?" "!" "~", order marks, the drag box, the radial,
arrows, the minds), `panel.js` (the order bar, the settings panel). The moves they need and the Animation Flow page has
not are additions in `src/iso/anim/moves-squad.js`: the strafe (circling in guard), the block, the bow's draw and loose,
the taunt, downed, the lift. The bow is a 3D prop the body places in the far hand each frame (the 3D look only).

An agent is any object with `{ id, name, team, kind, x, z, h, hp, maxHp, alive, downed, reach, ranged, temper, mind,
intent }` and, for the guard, `busy`, `blocking`, `swing`. A world is `{ t, dt, agents, rng, blocked(), noises, tokens,
knows(), onTarget(), log() }`. The 2D game would give its samurai and companions the same fields and a body that turns
the intent (`idle`, `move`, `strafe`, `attack`, `shoot`, `block`, `taunt`, `revive`) into its own poses.

## The action interface (where the decisions meet the bodies)

The decision layer never plays a clip. Each think it hands its body one action through two calls, the same shape as
the enemy types' interface (`enemy.can(action)`, `enemy.do(action, target)`; the claude/3d-enemies lane), so their
bodies and these decisions merge without either knowing the other's insides (`ai/brain.js act()`):

```
body.can(action)               may the body start it now (not mid-swing, has a bow for 'shoot', ...)
body.do(action, target, o)     take it as what to do next; the body runs it until it is done or replaced
```

| action | target | o | the body (`squad/npc.js` today) |
|---|---|---|---|
| `idle` | an agent to face, or none | `facePt: [x, z]` | stand: the guard with the blade out once engaged, else at rest |
| `move` | none | `x, z, speed` (world units / s), `face`, `sneak` | run there (blade out when engaged); stop on arrival |
| `strafe` | none | `x, z, face, speed` | sidestep there facing `face` (circling) |
| `attack` | the foe | `combo` (cuts), `exec` (a killing blow) | close to reach, then the swing: the samurai's telegraphed fcut, a companion's J chain |
| `shoot` | the foe | | the bow: draw, loose an arrow leading him |
| `block` | none | `face` | the guard raised: a parry window |
| `taunt` | none | | the taunt: the foes within 85 turn on him |
| `revive` | a downed friend | | go to him and lift him |

Missing for the enemy types (to add to their interface when they land): `flee` is a `move` today, and a spearman's
reach, a heavy's unblockable swing and a ninja's vanish would each want an action (and an option that scores it).

## The enemies

- **Senses.** A cone of 115° from his facing, out to 150 × (0.75 + 0.5 wit) units, blocked by walls and posts; inside it
  the alert meter fills (faster close up, or when the other runs or fights); right beside him (20; 9 for a man creeping up) he feels you anyway.
  Noises: a run's steps (50), a blow landing (110), a bow (60), a shout (110, his own side: they come engaged and know
  where). Calm < 0.3 ≤ suspicious (a "?": he turns to look, then walks over) < 1 ≤ engaged (a "!" for a moment; he
  shouts). Losing everyone for 6 s he searches the last place, then calms. Walking in a cone at a calm man (an assassin's
  stalk) fills it at 40%.
- **Aggro.** Threat from damage done (×1.6 from a tank), a taunt (45, less to the sharp), standing in his face; it decays.
  Target choice adds closeness and, the sharper he is, the hurt, the archers and the leaders; a new target must beat the
  old one clearly. Retargets are logged (`retarget:`).
- **Taking turns.** Two swing at one man at once, three on the whole side (the officer ignores the side's cap); an
  aggressive man steals a turn now and then. The rest keep a ring at even angles round their target (no dog-pile),
  circling (the strafe), patient men longer. After a swing each waits 1.1–2.3 s × his aggression.
- **Telegraphs.** The samurai's swing is the page's fcut: 0.3 s of red glow, then the falling cut. The archer draws for
  0.5 s before he looses, leading a moving target by his wit.
- **Guard and parry.** When someone starts a swing at him he may raise his guard in time (once a swing: discipline and wit;
  a heavy cut a third as often). Hit while in guard or circling and facing the blow, he may parry it anyway (the officer
  more often); a parry clangs and costs nothing; then his guard is open for a second. J3 (and any heavy blow) is never
  parried.
- **Morale.** Wounds cost their share (less for the bold), a friend's death near him 0.12, the officer's death 0.35 to
  everyone (less to the disciplined); unhurt it creeps back. Under his break point (0.12 + caution × 0.22 − bold × 0.12,
  a little lower while the officer stands for the disciplined) he runs ("~") to the open side away from the party, and
  comes back once it recovers.
- **Personality** (temper knobs from his traits): Taisho (proud, veteran: bold, sharp), Goro (eager: aggressive,
  hasty), Ichi (soldier, stoic: disciplined, patient), Saburo (nervous, twitchy, dull: breaks first), Yumi (wary),
  Kage (lazy, dull: slow to notice). A trait added later only lacks a behaviour until it gets a row in `TRAIT_TEMPER`.

## The companions

- **Roles** (defaults by weapon, overridable): **Tank** (yari, kanabō, naginata): stands between you and the foes, taunts
  those on someone else (every 5 s: everyone within 85 turns on him), blocks often, takes 25% less (50% blocking), swings
  now and then. **Striker** (katana, nodachi): the tactic's target, cuts in chains of three. **Ranged** (bow): keeps 58
  from any blade (kites, picking the open direction), holds a range of ~115, looses when the line is clear; set to Tank
  she comes forward and taunts and shoots point-blank. **Protector of X** (you or anyone): at his charge's side; between
  the charge and the nearest threat (body-block: he stands in an archer's line, so the arrow hits him); on whoever goes
  for the charge (intercept, peel: `intercept:` in the log). **Assassin** (tanto): scouts the yard for an isolated
  high-value foe (archers 2, the officer 3; isolated: nobody within 60), keeps his prey unless a far better one appears,
  goes round the prey's cone to come in from behind, waits while another foe could see him, and kills with one blow if
  unseen (an execution: `execute:`); seen, he duels; with no prey he fights near you as a striker. **Support** (bo):
  lifts a downed friend (1.4 s), and otherwise fights carefully near you.
- **Liberty** (the leash round his anchor: you, his charge, or the point he holds): Close 34, Near 80, Free 160, Unbound.
  Defaults: Protector Close, Assassin Unbound, the rest Near. Past it he comes back (the farther, the more he wants to);
  a foe beyond it is not his to fight. Charge lifts the leash.
- **They never start a fight on their own**: a foe is fair game once he is fighting the party, once you have struck
  (8 s), or on Charge / Attack that. The assassin is the exception: hunting the unaware is his job.
- **Personality** modulates how: a bold striker swings sooner, a cautious companion steps back behind the line when badly
  hurt, a patient one waits for the foe's swing to end; aggression can be set by hand in the settings (or left as his own).
- **Downed** at no health: on one knee for 15 s (the game's bleed-out); the support or you (E held 0.6 s) lift him to 40%;
  run out, he dies and comes back with the next wave.

## Squad instructions

Each companion keeps his own; an instruction goes to the selection (everyone if none).

- **Orders** (dominion names: hold, charge, follow, fallback): **Follow me** (formation behind you; fight within the
  leash), **Hold** (here, or where the radial was opened; formation facing the nearest foe; fight what comes within the
  leash), **Charge** (all in, leash off, +0.3 to attack), **Fall back** (to a point 40 behind you away from the foes; no
  new fights; the ranged still shoot), **Regroup** (back into the formation whatever happens, then follow), **Attack
  that** (right click a foe), **Go there** (right click the ground: in formation, then hold), **Protect** (right click an
  ally: the selection become his protectors, Close).
- **Formations**: Line (ranks of six), Wedge (a V with you at the point), Circle (a ring of 24, or round the point held),
  Column (single file), Loose (spread, jittered). Bows take the rear slots.
- **Tactics**: **Focus** (your target: whom you last hit, or the foe on you), **Spread out** (each a different foe, no more
  than two on one), **Protect the weakest** (the formation closes round the most hurt of the party; they cut down whoever is
  on him), **Ambush** (hold still and hold back until you strike; then all in).

## The check (`npm run check:iso`, `scripts/check-iso-squad.mjs`)

Part 1 (`&calm`): a drag box selects the four it covers; Ctrl+1, Esc, 1 save and recall the group; a right click on the
ground sends them there and they hold; the circle and the line form on their slots and hold; Follow me keeps them within
50 of him; G holds them while he walks away; a left click moves the hero and leaves the selection and its order alone.
Part 2 (the fight): a right click on Hana makes Tetsu her protector; Charge takes the party in (companions swing, the foes
engage and shout); Kuro's taunt pulls foes onto him; the samurai take turns (never more than three at one man); Hana
looses and keeps her distance (median > 40 from the nearest blade, within reach under 20% of the time); Tetsu stays by
Hana and intercepts whoever goes for her; Fall back takes the selection away from the foes; Suzume picks the isolated
Kage and executes him.

## Open for the owner

- The attack-token caps (2 on one, 3 a side) and the parry chances: harder or easier.
- Whether the party should also start fights on its own (today: never, except the assassin), and whether "Charge" should
  also mean "go at what you cannot see yet".
- The groups' keys when the squad reaches the 2D game, where 1–4 are the quick slots.
- A proper bow (the archers draw with the far hand; the prop is a placeholder), and the counters for arrows.
