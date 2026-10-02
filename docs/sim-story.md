# Story: quests and world events (`src/sim/story/`)

The story lane on the simulation core (`docs/sim-core.md`). It owns `L.sys.story`, the events `story.*` and `event.*`, and prototype 40. Owner decisions it follows (`docs/foundations.md`, 2026-09-26): 90% of the story comes from the world, only the structure is written by hand; every quest is real and plays out without him; every quest can be solved more than one way; there is no true story behind the glitch powers; time runs while he is away; raids take possession, never the title.

Everything below is Claude's proposal unless marked as the owner's. Every number is a starting value to tune.

## Owner decisions (2026-09-26, answers to this lane's first questions)

- **A long occupation passes the title** ("long occupation can, sure"). Built: after `OCCUPATION_YEARS` (1 game year, owner: shorter than the 5 first proposed) held by force, the occupier (a rebel leader, or a noble of the occupying culture) becomes lord, a conquered region joins the occupier's culture, and the dispossessed lord keeps a grudge (`event.titlePasses`).
- **Rivals race him** for quests he has taken, not only the ones he ignores ("sure"). Built: each week before the due day, a rival nearby may finish a quest he has taken (8% a week), and the rival's grudge against him grows.
- **Sworn service:** yes. **If he breaks the oath, that lord wants him forever, after a few warnings.** Built: the lord gives an order each season (`story.order`); an order let go, or done a way the lord did not want, is a warning; the third (`WARNINGS`) breaks the oath (`story.oathBroken`), and he is wanted in every region of that lord's culture forever (`story.wanted` with `forever: true`, a manhunt re-posted every year, never lapsing, never paid off). He can also break it himself (`breakOath`). A dead lord's oath passes to his heir in the seat.
- **Robbing a royal procession raises a manhunt across the kingdom.** Built: robbing it openly makes him wanted by the court and every culture allied to it (relation .3+) for two years; stealing the silk unseen starts a search with no face (`event.manhunt`, no `story.wanted`).
- **The notices' voice** (plain, a little grim) is right ("yes").
- **Where there is war, about 30% of the people die of it in a year** (owner, confirmed: 30% in the regions at war, not the whole world). Built: every region on an active war's front loses `WAR_TOLL` (8.5%) of its people each season, soldiers first (70% of picks), then villagers. Regions at peace keep the ~1% a year from the other story causes. A region fought over for two years loses about half its people, so this leans on the people lane's births to refill it.


## Files

| File | What it does |
|---|---|
| `index.js` | Registers the `story` system (order 70, after the default-50 lanes), subscribes to other lanes' events, re-exports the API |
| `state.js` | `initState`, `announce` (emit + a news line), the story's hand on the world (`kill`, `seize`, `pay`, `grant`), `census` (who lives where, rebuilt weekly), small readers |
| `nature.js` | The calendar (New Year, planting, Obon, harvest, winter), harvest and hunger, famine; drought, flood, typhoon, earthquake, plague, comet |
| `politics.js` | Lords falling ill and dying, succession and disputed seats, wars between cultures, peasant risings, taxes, royal processions |
| `order.js` | Camps raiding villages and robbing merchants (while the crime lane is absent), camps refounded, famous bounties, bandit armies, crackdowns, `razeCamp`, `settleArmy` |
| `quests.js` | The quest record, `post`, `takeQuest`, `resolveQuest`, `waysOf`, daily due and overtaken checks |
| `kinds-world.js` | Quests born from events: famine, succession, uprising, dying, raiders, robbed, bounty, defend, procession, message |
| `kinds-jobs.js` | Contracts seeded weekly from the people: feud, kill, escort, hunt, blade, debt |
| `frame.js` | The hand-written structure: his arc (chapters), rivals, the duel and offer quests, each region's main tale |
| `board.js` | `boardOf(L, region)`: the notice board, the signs in the air, the region's mood |
| `service.js` | Sworn service (orders, warnings, `breakOath`), being wanted (`wanted`, the yearly manhunt), the royal manhunt |

`node scripts/story-smoke.mjs [seed] [years]` lives a world (10 years by default) untouched and prints the world events, a timeline of the big ones, every quest kind with how it ended, the rivals, a board, and checks the rules (below). Prototype: `prototypes/40-story.html` (sources in `prototypes-src/40-story/`).

## Using it

```js
import { generateWorld, advance } from './src/sim/index.js';
import { boardOf, openQuests, waysOf, takeQuest, resolveQuest, taleOf, chapterOf } from './src/sim/story/index.js';   // import before generateWorld, so init runs
const L = generateWorld(seed);
boardOf(L, regionId);                 // { name, lord, occupier, tale, news, contracts, signs: { smoke, bell, messengers }, mood }
waysOf(L, quest);                     // [{ id, as, label, blurb, karma, standing, mon, cost, can, why }]
takeQuest(L, id);                     // on the board -> taken (the due day still runs)
resolveQuest(L, id, wayId);           // he did it; { ok: false } if he tried and failed. Returns the outcome
```

The game calls `resolveQuest` when he has actually done the thing in the zone (killed the chief, paid the fence). The ledger never plays his part for him.

## State: `L.sys.story`

| Field | What it is |
|---|---|
| `v` | 1 |
| `reg[regionId]` | `{ harvest (this year's crop, 1 = normal), hunger 0..1, unrest 0..1, danger 0..1, sick 0..1, tax 0..1 (share of the crop, starts .4), war (war id or null) }` |
| `adj[regionId]` | neighbouring region ids |
| `geo[regionId]` | `{ coast, wet, high, road }`: share of the region's zones by ground |
| `villages[regionId]` | `[[x, y]]` its village zones |
| `quests[id]`, `questOrder` | every quest (below); finished ones are forgotten two years after they end |
| `keys` | dedupe: a situation's key -> the quest id or the day it last fired |
| `news` | `[{ d (day), type, text, heralds, regions, zone }]`, newest last, capped at 1,500: what boards and maps read |
| `ill[lordId]` | `{ region, since, dies (day), fatal }` |
| `disputes[regionId]` | `{ a (elder claimant), b (rival), since, dead, quest }` |
| `wars[id]` | `{ id, a, b (cultures), since, score (+ favours a), battles, fronts: [regionIds] }` |
| `uprisings[regionId]` | `{ leader, since, quest }` |
| `armies[id]` | `{ region, chief, camps: ['x,y'], target: [x, y], strength }` |
| `plague` | `{ since, regions, seasons }` or null |
| `processions[id]` | `{ royal, from, to, route: [regionIds], end }` |
| `camps['x,y']` | `{ zone, region, near: [[x, y]] (villages it raids), raids, notoriety, razed }` |
| `bounties[actorId]` | `{ reward, since, region }` |
| `grudges` | `[{ by, against, why, d, posted? }]`, capped at 200: the grieving who may pay for a killing |
| `rivals[actorId]` | `{ id, creed ('honour'|'coin'|'cruel'), epithet, line (generation), heirOf, renown, grudge, beaten, at (region), away (day), since }` |
| `arc` | `{ chapter, renown, done, ways: { fight: n, ... }, since, sworn (lord id, false if refused or broken, absent before the offer), oathBroken (the lord) }` |
| `service` | `{ lord, since, warnings, orders: [questIds] }` while he is sworn, else null |
| `wanted` | `[{ by (lord id or null), culture, regions, why ('oathbreaker', 'robbed a royal procession'), forever, target, since }]` |
| `stats` | `{ events: { type: n }, quests: { kind: n }, endings: { way or 'world' or 'overtaken' or 'rival': n } }` |

### Fields added to core records (rule 5: added, never renamed)

| Record | Field | Meaning |
|---|---|---|
| actor | `died` | the hour the story killed him (the people lane may set it too) |
| actor | `lord` | set on a new lord at succession (the core's existing meaning: the region he rules) |
| actor | `master` | on the ronin: the lord he swore to (the offer quest) |
| actor | `chief` | set on a new camp chief when a razed camp is refounded (the core's existing meaning) |
| region | `titled` | `{ from (the old lord), how, since }`: the title passed by long occupation |
| quest | `order` | `{ lord, ways }`: an order from his lord, and the ways that count as obedience |
| region | `occupier` | `{ culture?, actor?, since, how: 'war'|'uprising' }`: who holds the region by force. The title (`region.lord`) is untouched (owner) |
| zone | `razed` | the hour a camp was burnt; its `holder` is null, so `ownerOf` makes its plots nature, claimable (`docs/world-and-land.md`) |
| plot | (`L.plots[pid].holder`) | a raid, a debt, a feud or an army moves `holder`; never `title` |
| culture | `relations` | a war's end moves both sides +.3 toward peace |

The story writes these directly, then emits the event below, so the owning lane can react.

## The quest record

`{ id ('q1'), kind, key, region, zone: [x, y], giver, target, other, culture (giver's side), tculture (the other side), posted (day), due (day), state: 'open'|'taken'|'done', reward (mon), stake: { kind-specific }, source, board: 'inn'|'shrine'|'magistrate'|'person'|'lord', title, text, tries, outcome: { by (the ronin, a rival, or null for the world), way, as, text, day, deltas: { karma, standing, mon }, change } }`

- **Every way is one of** fight, stealth, bribe, betray, help, talk (`as`), with its own karma, standing and money. Karma steps: +3 selfless, +1 lawful, 0 business, -1 grey, -3 cruel or treacherous, -5 murder of someone who did him no harm, -6 treachery that gets a village killed.
- **Money is never made from nothing.** A way's pay comes out of a real purse (`from`: the giver, the target or the other party) and is capped by what that person has. A poor lord's bounty pays what he has. A way's cost goes to a real person (`payTo`) or is spent.
- **Every quest ends.** On its due day it plays out without him (`untouched`), or a rival nearby gets there first, or it is overtaken (the giver or the target died, the war ended, the seat was settled).

## Quest kinds

| Kind | Made from | Ways | Untouched |
|---|---|---|---|
| famine | `event.famine`: the headman of a starving village; the lord's full storehouse | help (buy rice, 150 mon, karma +3), stealth (empty the storehouse, +1), fight (break the guard, 0, standing -.2), betray (sell the headman, -4) | 2-5 die, unrest +.25 |
| succession | a lord dies with two claimants | fight for the elder (+1), for the rival (-1), stealth (murder the elder, -5), talk (broker a peace, 150 mon, +3), betray (take both purses, -4) | 55% the elder wins; the loser dies or is exiled; 1-3 retainers die |
| uprising | unrest past .65 | fight with the rebels (+1), for the lord (-2), bribe (pay the arrears, 200 mon, +3), betray (hand over the leader, -4), stealth (kill the lord, -3) | the rebels win at .25 + unrest × .35 (+.15 in a rebel culture) |
| dying | a lord falls ill (only while the people lane is absent) | help (fetch a healer: 60% he recovers), talk (witness his will: no dispute), stealth (hasten his end, -5) | the illness runs its course |
| raiders | a camp's 4th raid or robbery | fight (raze it, +1), stealth (kill the chief), bribe (they move on to other villages, -1), betray (ride with them, -4) | 30% the lord burns the camp; else it grows |
| robbed | a robbery of 150 mon or more, or of an item | fight, stealth, bribe (half price to the fence), betray (keep it, -3) | 30% the victim is ruined |
| bounty | the most notorious chief (6+ raids and robberies), 100 mon a crime up to 1,500 | fight (+1), stealth (alive, +2, 1.2×), bribe (let him buy his life, -2) | lapses after 112 days |
| defend | a bandit army or a wartime column | fight (+2), stealth (+1), help (lead them away: fields lost, people saved), betray (open the gate, -6) | an army wins 65% of the time; a column 50% |
| procession | a royal procession | fight (walk ahead, +1), stealth (steal the silk, -3), betray (rob it, -6, the red kimono) | robbed if a camp on the route beats the road's danger, which posts a robbed quest |
| message | a war | fight, stealth (both move the war +1 his way), betray (sell it, -4, moves it the other way) | 60% a courier gets through |
| feud | two village households, weekly | fight (-1), talk (mediate, 30 mon, +2), bribe (blood money, 90 mon, +2), betray (both purses, -3: one kills the other) | 45%: one head kills the other and takes his field |
| kill | a grudge from a killing | fight (open duel, -1), stealth (-3), betray (warn him, -2), talk (report it, +2) | 35% someone else takes the money |
| escort | a merchant going to a neighbouring seat | fight (+1), bribe (the camps' toll), betray (the ambush, -4) | robbed at the road's danger |
| hunt | a beast at a village near hills or wetland | fight, stealth (trap), talk (the shrine drives it off) | 50% it kills someone |
| blade | a noble house's heirloom stolen by a camp's man | fight, stealth, bribe (the fence, 120 mon), betray (keep the blade, -3) | 40% the son goes for it and dies |
| debt | a merchant owed by a poor household | fight (-2), help (pay it, +3), talk (half), betray (warn him, -1) | he pays, or the lender takes possession of his field (the deed stays in his name) |
| duel | a rival with a grudge (or renown) | fight (50% he dies, else he leaves and comes back), stealth (ambush, -4), bribe (100 mon), talk (refuse) | he calls the ronin a coward: standing -.05 |
| offer | his arc reaches renown 12 with a clan or court at standing .3+ | talk (swear: `master`, chapter "Sworn"), help (refuse: "Free Blade"), betray (take the advance, -3) | the offer is withdrawn |

## World events (`event.*`)

Every event carries `text` (a line for a board), `heralds` (how people hear: `messenger`, `board`, `smoke`, `bell`), `regions` (where it is felt) and, where it applies, `region`, `zone`, `actor`, `culture`, and `effects` (hints for other lanes: `prices: { rice: +.3 }`, `danger`, `unrest`, `harvest`, `travel`, `labour`). The economy lane reads `effects.prices`; the travel lane reads `danger` and `travel`.

| Event | When | Numbers |
|---|---|---|
| `event.festival` | New Year (spring 1), Obon (summer 13, lists the year's dead) | all regions; unrest -.05 at New Year |
| `event.planting` | spring 8 | |
| `event.harvest` | autumn 14 | `yields`, `poor` (≤ .72), `rich` (≥ 1.08). hunger = (1 - harvest) × 1.4 + (tax - .4) × .6 + .1 at war |
| `event.poorHarvest` | per poor region | |
| `event.winter` | winter 1 | hunger +.1 where the crop was under .9 |
| `event.famine` | winter 1 and 15, hunger ≥ .5 | posts a famine quest |
| `event.drought` | summer, 45% a year, 1-3 regions | harvest × .5-.7 |
| `event.flood` | spring, summer: two rolls at .15 + wet share | harvest × .65-.8, 0-2 dead |
| `event.typhoon` | summer, autumn at 40%, 2-5 coastal regions | harvest × .75-.9, danger +.05, 0-2 dead each |
| `event.earthquake` | 3.5% a season | 1-3 dead in each of 3 regions, unrest +.1 |
| `event.plague`, `event.plagueSpreads`, `event.plagueEnds` | 2.5% a season, starting on a road | spreads at sick × .5 to neighbours; sick drops .15-.3 a season |
| `event.comet` | winter, 2.5% | unrest +.08 everywhere; an omen and nothing else |
| `event.lordIll`, `event.lordRecovers`, `event.lordDied` | age 55+: (age - 52) × .004 a season; 70% fatal in 20-70 days | |
| `event.succession` | an heir takes the seat (son, widow as regent, or a steward) | sets `region.lord` |
| `event.successionDispute`, `event.disputeSettled` | two sons (75%), or one son and an uncle (50%) or a retainer (20%) | danger +.2, unrest +.15 |
| `event.war`, `event.battle`, `event.peace` | spring, cultures bordering at relation ≤ -.5: 18%, at most 3 wars | a battle a season on the front: every front region loses 8.5% of its people (owner: 30% a year where there is war), the battle region harvest × .85, danger +.2; ends at a score of 3 or 8 battles; the winner occupies one front region (or frees its own) |
| `event.uprising`, `event.uprisingWon`, `event.uprisingCrushed`, `event.uprisingEnds` | unrest ≥ .65, 50% a season | won: `region.occupier`, the lord dies 50%, tax .3. Crushed: the leader and 1-4 rebels executed, tax +.05 |
| `event.tax`, `event.taxRelief` | yearly: a proud or warring lord 14% (+.1, up to .7); hungry region 30% (-.1) | |
| `event.procession`, `event.processionArrives` | spring and autumn, 60%, the court's royals to a friendly seat | |
| `event.raid` | weekly per camp: 3.5% + hunger × .1 (+3% at war) | 20-120 mon taken, 10% the victim dies |
| `event.robbery` | weekly per camp near a road: 2% | 60-400 mon |
| `event.campRazed`, `event.campFounded` | a camp burnt; a year later 15% a season a new band takes it | danger -.15 / +.1 |
| `event.bounty` | a season's most notorious chief | |
| `event.banditArmy`, `event.villageTaken`, `event.armyBroken` | 2+ camps in a region at notoriety 10+, 20% a season, once in two years | taken: 1-4 dead, every plot of the village to the chief's possession |
| `event.crackdown` | his standing with a culture at -.5 or worse, yearly | |
| `event.manhunt` | he broke his oath (every year, forever), or robbed a royal procession (court and allies, two years); a search with no face for unseen theft | danger +.3 |
| `event.titlePasses` | a region held by force for 1 year | sets `region.lord`, maybe `region.culture` |

Seasons and years are the core's: 28-day seasons, 112-day years.

## Story events (`story.*`)

| Event | Data | For |
|---|---|---|
| `story.questPosted` / `questTaken` / `questResolved` / `questFailed` / `questEnded` | `quest, kind, region, zone, way, by, deltas, how` | the HUD, the map, the boards |
| `story.killed` | `actor, cause, by, zone, culture` | **people lane**: a death the story caused (battle, famine, plague, execution, duel...). The story has set `alive: false` and `died`; people handles heirs and the household |
| `story.seized` | `plot, holder, was, title, cause, zone` | **crime lane**: possession moved, title unchanged |
| `story.deed` | `actor (the ronin), crime, victim, seen, zone, region, quest` | **crime lane**: what he did in a quest (theft, murder, banditry, treachery, robbery of royalty, fraud). His karma is already moved; this is for witnesses and bounties |
| `story.item` | `actor, item, quest, zone` | the items lanes: loot (a royal red kimono, an heirloom blade) |
| `story.rivalBeatHim`, `rivalReturns`, `rivalDied`, `rivalRises` | `rival, quest, region, heirOf` | |
| `story.chapter` | `actor, chapter, title` | his arc |
| `story.order`, `story.warning`, `story.oathBroken`, `story.oathPasses`, `story.released` | `actor, lord, quest, warnings, of, why` | sworn service |
| `story.wanted` | `{ target (the ronin), by, culture, regions, why, forever, renewed? }` | **crime lane**: a bounty on him and hunters in those regions. `forever` never lapses and cannot be paid off (owner) |

## The frame (the only hand-written story)

- **His arc** (`CHAPTERS` in `frame.js`): 1 Masterless, 2 A Name on the Road (renown 6), 3 The Offer (renown 12 and a clan or court liking him), 4 Sworn, Free Blade or Oathbreaker (his answer, and whether he kept it), 5 Blood and Land (he holds a plot), 6 The Heir (he has a child). Renown is one per quest, two or three for big ones. His epithet follows karma: the Kind (4+), the Just (10+), the Snake (-4), the Butcher (-10).
- **Rivals:** three at world start, ronin of different cultures aged 20-42, one per creed: honour (fights, backs the lawful heir), coin (bribes, betrays, backs whoever pays), cruel (betrays, murders). They wander a region a season. A rival in or next to a quest's region takes it 20% of the time on its due day, in his creed's way, with its full consequences; a quest the ronin has taken, a rival may finish first (8% a week, owner: rivals race him). An oathbreaker's manhunt each year sharpens a mercenary or cruel rival's grudge. One with a grudge (2+) or renown 4+ calls the ronin out. Beaten, he leaves for a year or two and comes back with a new name (One-Eye, the Scarred...). Killed, his child, parent or a student takes up the name, with a grudge if the ronin killed him.
- **Each region's main tale** (`taleOf`): the thread that matters most there now, by weight: war 9, a disputed seat 8, a rising 8, a bandit army 7, famine 7, plague 6, occupation 5, a dying lord 4. With none, the most memorable thing that happened there.

## Rules this lane keeps (and the test checks)

- Everything runs in `onDay` or slower. Weekly work (raids, contracts) runs on days divisible by 7; the census of people is rebuilt once a week. A game day costs **about 0.6 ms** on average in `story-smoke` (the core included), the worst season about 30 ms.
- All state is plain JSON in `L.sys.story`; the save round-trips it exactly. Randomness is only the stream the core hands each call, or `rngFor(L.seed, ...)`. The same seed and time give the same story.
- Ten years untouched (seed 12345): about 800 quests (feud, raiders and robbed the most common), 35 kinds of world event, about 900 deaths the story caused (a third of them war) and 200 fields seized. Every way of every kind is tried on a copy of the world by the test.

## What story needs from other lanes

- **People (`people.*`):** emit `people.died { actor, cause }` for every death you cause (age, sickness, childbirth). Story listens for it to start a lord's succession. While `L.sys.people` exists, story stops making lords ill itself. Please listen to `story.killed` for heirs and households: story sets `alive: false` and `died` and does nothing else to the dead. Region succession (`region.lord`) stays with story; the household's plots and money are yours.
- **Crime (`crime.*`):** while `L.sys.crime` exists, story stops raiding and robbing itself and makes quests from your events instead. Please emit, with these fields: `crime.raid { camp: [x, y], by, victim, mon, killed, zone }`, `crime.robbery { victim, by, mon, zone, item? }`, `crime.murder { victim, by }`, `crime.bounty { actor, mon, why }` (300 mon and up becomes a famous bounty). Please listen to `story.deed` (witnesses, bounties on him), `story.wanted` (a bounty and hunters on him in `regions`; `forever` never lapses and cannot be paid off, owner) and `story.seized`. Story moves his karma and standing for quests itself; do not apply them again.
- **Economy (`econ.*`):** story listens for `econ.famine { region, severity 0..1 }` and raises that region's hunger. Please read `effects.prices` on `event.*` to move prices, and treat `event.harvest.yields` as each region's crop factor for the year. Story moves only mon between people; silver and ryō are yours.
- **Travel (`travel.*`):** there are no glitch storms any more (owner 2026-10-02: no glitch in the world or the story), so story passes nothing of travel's on to the boards. Story's events carry `danger` and `travel` effects and a procession's `route` for the road.
- **World and integration:** `src/sim/index.js` does not export story (the core is the integrator's); import `src/sim/story/index.js` once, before `generateWorld`. The game's zone view should treat a zone with `razed` as a burnt, empty camp, and a region with `occupier` as garrisoned by it.

## Open questions for the owner

None open. Answered (owner, 2026-09-26): the karma steps (-6..+3 a quest) are right; an oathbreaker's manhunt outlives the lord (his heir keeps it going); occupation becomes title after 1 game year.
