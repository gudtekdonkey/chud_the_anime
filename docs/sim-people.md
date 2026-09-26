# People: families, ageing, heirs and death (`src/sim/people/`)

The people lane on the simulation core (`docs/sim-core.md`). Everyone in `L.actors` ages, works, marries, has children, wants things, and dies; land (plot titles and `actor.holds`) and money pass to heirs by their culture's rule; lords' seats pass; and the ronin's death hands the game to his heir or ends the run (owner, 2026-09-26). Everything here is a proposal to tune unless it cites an owner decision. Every number lives in `rules.js`.

Import `src/sim/people/index.js` once, before `generateWorld` or `loadWorld`, to register the system (`id: 'people'`, `order: 30`). It imports only core files, so the integrator can add `export * from './people/index.js'` to `src/sim/index.js` without a cycle.

```
node scripts/people-test.mjs [seed] [years]      # lives a world 60 years, prints it, checks the rules, exits 1 on a failure
node scripts/proto-bundle.mjs prototypes-src/38-people/index.html prototypes-src/38-people/main.js prototypes/38-people.html
```

## Files

| File | What it does |
|---|---|
| `index.js` | Registers the system, listens for `econ.famine`, re-exports the API |
| `rules.js` | Every age, rate, price, inheritance order, schedule and need in one place |
| `kin.js` | Family queries from the records (`children`, `siblings`, `grandchildren`, `closeKin`, `nearKin`, `tree`, `founder`), memoised key strings |
| `life.js` | The half-yearly visit to each person (death, conception and birth, growing up, needs, ties), the yearly ambitions and census, opt-in forgetting |
| `death.js` | `killActor`, inheritance (`findHeir`, `passEstate`, `pickRegent`), the house after its head, lords' seats, band chiefs |
| `marriage.js` | The marriage market, `wed` (bride price, mukoyōshi, who moves where), the ronin's courtship (`judge`, `court`, `propose`, `brides`), `pay` |
| `settle.js` | Settlements (what the land feeds, fed, danger), residents by zone, harvests, free plots and grants, new houses, migration, recruiting for forts, camps and shrines, grave tiles |
| `ties.js` | Friends, rivals, grudges and lovers outside the family |
| `schedule.js` | The daily schedule, run only around him |
| `player.js` | His line: `notable`, `recordDeed`, `playableHeirs`, `nameHeir`, `layOut` and `lootGrave` (grave goods), `handOff` |
| `newcomers.js` | `arrive`: wanderers, refugees and settlers who refill emptied towns and villages each season (owner, 2026-09-26) |

## When it runs (docs/sim-core.md rule 1, 7)

| Hook | What |
|---|---|
| `onHour` | Only while he plays: everyone living in his zone and the 8 around it gets `doing` and `where` for the hour |
| `onDay` | One 56th of everyone is lived: actor ids by number mod 56, so each person is visited twice a year (`VISITS = 2`) however long he is away |
| `onSeason` | People other systems made since last season join the residents; each settlement's `fed`. In spring and autumn: the marriage market, new houses, migration, recruiting |
| `onYear` | Residents rebuilt in full (catches homes other systems changed); the harvest; ambitions; the census row |

Cost (`scripts/people-test.mjs`, 60 years, ~7,000 living): about 0.55 ms a game day at the core's reference speed (a world made in ~230 ms); 0.9 to 1.05 ms on this container, which makes a world in ~400 ms. The test scales by that and fails above 1 ms.

## Fields added to an actor (docs/sim-core.md rule 5)

| Field | Meaning |
|---|---|
| `needs` | `{ food, money, safety }`, each 0 (desperate) .. 1. Food: the settlement's `fed`, less if broke. Money: purse worth / `PURSE_NORM[cls]`. Safety: 1 − the settlement's `danger`. Updated each visit from 12 on (a younger child keeps what it was born with). `null` on the dead |
| `ties` | `[[id, kind, value]]`, at most 6; kind `friend`, `rival`, `grudge`, `lover`; value −1..1. `null` when none |
| `pregnant` | `{ father, due }` (game hour) or `null` |
| `heir` | the id he named as heir (`nameHeir`, or a house that took in a son-in-law as its heir) |
| `regent` | a minor heir's regent: the one holding his land until he is 16. `null` after |
| `wards` | on a regent: the minors whose land they hold |
| `arrived` | the hour a newcomer came from beyond the map (newcomers.js) |
| `ambition` | `{ kind, target?, victim?, since }` or `null`: `land`, `wealth`, `zone` (a chief), `seat` (a lord's younger son), `favour` (a retainer), `revenge` (kin of the murdered) |
| `dynasty` | `true` on the ronin, his wives, his children and theirs |
| `playedFrom` | the game hour the ronin (or his heir) became the played actor |
| `deeds` | `[{ h, text }]`, at most 40, only for the notable (his house, lords, rank 5+). `recordDeed(L, id, text)` adds one; carved on the grave |
| `died`, `cause`, `killer`, `grave` | set by `killActor`. `grave: { zone: [x, y], tile: [tx, ty], goods? }`: where he fell, or his settlement's graveyard corner. `goods: { weapon, money }` on the played actor's grave: what he carried (`lootGrave`). `killer` only when there was one |
| `formerSpouses` | ids of dead spouses (on the widowed) |
| `adoptedBy` | a son-in-law taken in as a house's heir (mukoyōshi): the head who took him |
| `doing`, `where` | this hour's activity and place, only near him; stale elsewhere |
| `faded` | a long-dead record that was forgotten (below): only the kept fields remain |

Core fields this lane writes: `alive`, `spouse` (through core `marry`), `family` (marriage), `home`, `household`, `holds`, `money`, `job` (`'child'` under 12, then a trade), `cls`/`rank`/`job` on recruits, `born` (a newborn's is its birth hour; core `bear` backdates up to a year), `lord` and `job: 'lord'` on a new lord, `chief` on a new chief, `at` on a new played heir, `weapon` on a new played heir.

## `L.sys.people`

| Key | Meaning |
|---|---|
| `settle["x,y"]` | `{ kind, region, cap, pop, fed, danger, fedCap?, base? }` for towns, villages, forts, camps, shrines. `cap`: people the land feeds (towns and villages), `fed`: 0..1.3, `danger`: 0.3 per camp within 3 zones (other lanes may raise it). `fedCap: { fed, until }` is a famine another system imposed. `base`: the population when newcomers first looked at it, what they refill to |
| `res["x,y"]` | living actor ids whose `home` is that zone. Read it through `residents(L, key)` |
| `harvest[region]` | this year's yield, around 1 |
| `stats` | lifetime counts: `births`, `deaths: { cause: n }`, `marriages`, `adopted`, `inherited` (plots), `estates`, `regencies`, `toLord`, `toNature`, `seats`, `granted`, `migrated`, `recruited`, `arrived` (newcomers) |
| `year` | this year's `{ births, deaths, marriages }` |
| `census` | one row a year `{ year, pop, houses, births, deaths, marriages }`, last 400 |
| `graves` | the graves the world remembers: `{ actor, name, zone, tile, born, died, cause, by, player, deeds }` for the notable |
| `lineage` | each played actor who died: `{ actor, from, died, cause, grave }` |
| `over` | `{ h, actor, grave, cause }` when he died with no heir: the run is over |
| `wages` | `true`: people earn and spend a season's living (`EARN`/`SPEND`). The economy lane sets `false` when it takes over |
| `fadeAfter` | years after which the non-notable dead are forgotten (20; 0 = never) |
| `seen`, `homeless` | bookkeeping for residents |

## Events (`people.*`)

| Event | Data | When |
|---|---|---|
| `people.died` | `actor, cause, by, zone, age, heir, plots` | every death |
| `people.inherited` | `actor` (heir), `from, plots, rule, regent, zone` | an estate with land passes |
| `people.seatPassed` | `region, from, to, how` (`heir`, `regent`, `seized`), `zone, regent` | a lord's seat |
| `people.chiefPassed` | `zone, from, to` | a band's chief |
| `people.married` | `actor, spouse, zone, price, adopted, player` | the notable only (commoners are counted, not announced) |
| `people.born` | `actor, mother, father, zone` | the notable only |
| `people.cameOfAge` | `actor, regent, plots, zone` | a ward turns 16 and takes his land |
| `people.heir` | `actor, from, zone, age, regent` | the game continues as his heir |
| `people.graveLooted` | `actor, from, zone, kin, weapon, money` | someone takes what lay in the played actor's grave |
| `people.heirNamed` | `actor, heir` | he names an heir |
| `people.lineEnded` | `actor, zone, cause` | he died with no heir |
| `people.vendetta` | `actor` (avenger), `target, victim, zone` | a murder: the eldest grown kinsman swears revenge |
| `people.succession` | `actor, lord, heir, region, zone` | an old lord's younger son covets the seat |
| `people.ambition` | `actor, kind, zone` | a chief wants a zone |
| `people.migrated` | `zone, region, n` | a crowded settlement sends people away |
| `people.turnedOutlaw` | `actor, zone, region` | a broke young man joins a band |
| `people.hunger` | `zone, region, fed` | a settlement falls below `FAMINE_AT` |
| `people.desperate` | `actor, need, zone` | a hungry adult (5% a visit): the crime lane's theft |
| `people.arrived` | `zone, region, n` | newcomers settle in an emptied town or village |

Listens for `econ.famine` (`zone` or `region`): caps those settlements' `fed` at 0.5 for a season.

## API

- `killActor(L, id, cause, by, { zone, tile })`: **the one way to kill anyone** (other lanes too). Causes used here: `age`, `illness`, `famine`, `violence`, `childbirth`; lanes add their own (`duel`, `execution`, `raid`...). Handles the body and grave, the widow, grudges and the vendetta, inheritance, the house, a lord's seat, a band's chief, a dead regent's wards, the event, and the ronin's hand-off. Returns `{ heir, rule, regent, plots }`, or `null` if already dead.
- `findHeir(L, a)`, `passEstate(L, a)`, `rulesFor(L, a)`, `pickRegent(L, heir, dead)`.
- `wed(L, a, b, price, r)`, `judge(L, suitor, bride)`, `court(L, suitorId, brideId, r?)`, `propose(L, suitorId, brideId)`, `brides(L, suitorId, radius = 6)`, `pay(from, to, mon)`.
- `playableHeirs(L, p)`, `nameHeir(L, id)`, `lootGrave(L, deadId, finderId)`, `recordDeed(L, id, text)`, `notable(L, a)`.
- `residents(L, "x,y")`, `freePlot(L, zone)`, `grantPlot(L, pid, a)`, `moveHome(L, a, [x, y])`, `starve(L, key, fed, hours)`, `graveTile(L, zone, id)`.
- `activity(L, a, hour)` → `[what, where]`; `tieOf`, `tieValue`, `setTie`, `bond`; `tree(L, id, depth)`, `founder`, `children`, `livingChildren`, `siblings`, `closeKin`, `nearKin`; `PEOPLE_RULES`.

## The rules

### A life
- **Ages** (owner, 2026-09-26: children stay at home until 18, unseen): a child (`job: 'child'`) stays at home (its daily schedule never leaves the house) until 18, then takes a trade (a son follows his father's 70% of the time, a daughter 35%) and comes of age: marries, inherits in their own right, can be played. Regents hold a minor's land until 18. Marriage from 18 (women 18–41, men 18–54); a woman may bear children 18–44.
- **Death, per year** (`hazard`): 12% under 1, 2.5% under 5, 0.5% to 16, then 0.7% + 0.5% × e^(0.1 (age − 40)): 1.2% at 40, 4.4% at 60, 10.7% at 70, 28% at 80. Royals ×0.7, nobles ×0.75, monks ×0.85, retainers ×0.9; a drunk up to ×1.3. A death is `age` past 55 three times in four, else `illness`.
- **Violence** (per year, the baseline of the ledger's quiet fights, used only when the crime system is not loaded): outlaws 3.5%, ronin and shinobi 2%, ashigaru 1.2%, retainers 1%, rebels 0.8%, others 0.15%; brawlers, menacing and cocky up to ×1.5. None under 18. With the crime system running, it does all the killing (about 30% of grown people a year, owner 2026-09-26, `docs/sim-crime.md`) through `killActor`, and these are not used.
- **Famine:** 25% × (0.9 − fed) / 0.9 a year below fed 0.9, twice for children under 5 and elders past 60.
- **The ronin:** the ledger never kills him young off screen (no violence, famine or illness); past 55 old age can take him while you are away (owner, 2026-09-26: "yes he may die").
- Resulting: life expectancy at birth about 35, at 16 about 49. Deaths over 60 years: illness ~50%, age ~19%, famine ~16%, violence ~13%, childbirth ~1%.

### Births
- A married woman 16–44 whose husband lives in her zone (or is the ronin) conceives with 36% a visit (half a year) × age (0.8 under 20, 1 to 32, 0.7 to 38, 0.4 to 42, 0.15 after) × children under 16 at home (1.1 for 0–1, 0.85 for 2–3, 0.5 for 4–5, 0.2 after) × room (2.2 − 1.8 × pop/cap, 0.05..1.5) × fed. The birth is dated 3 seasons later and lived at her next visit. 1.2% of births kill the mother.
- A child takes the father's family, class and culture (the mother's culture if his is none), is born into the mother's house, and has an even chance of one parent's trait at 0.8 strength.
- **Stability:** the room factor is the thermostat: a village under what its land feeds has more children, a full one fewer, and a starving one loses people to hunger. Over 60 years two seeds rose 12% and 18% in the first decade (the first generation is made below capacity) and then held flat.

### What the land feeds
- A village feeds 22 × the biome's factor (paddy 1.35, plains 1.15, coast 1.1, forest and bamboo 0.95, hills 0.9, marsh 0.85, mountains 0.75), a town 42 ×.
- Each region's harvest a year: mean 1.02, spread ±0.14; a 3% blight cuts it to 45%. `fed` = harvest × cap / pop, 0..1.3. Forts, camps and shrines are supplied: `fed` = min(1, harvest / 0.75).

### Marriage
- Spring and autumn, per region: each single woman (16–41) has a 65% chance (32% if widowed) to be matched; up to 10 men (17–54) are tried and the best taken: same zone +1, same class +0.5, age gap near 3, a little chance. Rules: within one rank, same culture (or two cultures with relations above 0.3), not close kin (parents, siblings and half-siblings, grandparents; cousins may wed), the man −4..+16 years from her. Monks, soldiers in forts and outlaws in camps do not marry.
- Bride price (yuinō): the groom's house pays the bride's 30% of `BRIDE_PRICE[her class]` (royal 500,000 mon; noble 60,000; retainer 12,000; shinobi 3,000; ashigaru 2,000; ronin 1,500; commoner 1,000; rebel 800; outlaw 500), or what it can.
- Where they live: she joins his house. A younger son founds his own house on a plot the lord grants, if there is a free one in the zone (plots 1–15; plot 0 is the lord's); the eldest son stays in his father's house (the stem family). A landed widow takes a landless husband into hers. Her children from before come with her.
- **Mukoyōshi:** a sonless house head of a clan, the court or a merchant league takes in a younger son who marries his daughter (60%): he takes her family name and is named the house's heir.
- Each spring and autumn a married man still in his father's or brother's house (not the heir) founds his own if a plot is free.

### Inheritance (owner 2026-09-26: land and wealth pass to heirs)
The first rule that finds a living person (never a monk) wins. `named`: the heir he named.

| Culture | Order | Money |
|---|---|---|
| clan, court | named, eldest son, grandson through a dead son, brother, daughter, widow | heir (the widow keeps a third) |
| merchant league | named, son, daughter, widow, grandchild, brother | heir |
| hidden villages (shinobi) | named, eldest child, grandchild, sibling | heir |
| fishing and mountain folk | son, daughter, widow, grandchild, sibling | equal among children and widow |
| free valleys (rebels) | named, widow, eldest child, grandchild, sibling | equal |
| temple lands | named, eldest child, widow, grandchild, sibling | equal |
| outlaw coast | son, child, widow, sibling | equal |
| the ronin's line | named, son, eldest child, grandchild, brother | heir (his purse is on his body, not in the estate) |

- **Land:** every plot titled to the dead passes its title to the heir; where the dead also held it, possession passes too. A plot someone else holds by force keeps its holder (owner: raids take possession, never the title).
- **A minor heir** (under 16) takes the title at once; possession goes to a regent (his living parent, else his eldest grown sibling, else the dead man's eldest grown kin) until he comes of age, when he takes it and, if his parent was regent, heads the house. A dead regent's wards get a new one.
- **No heir:** the land goes to the region's lord (title and possession); where there is no lord, to nature (title `null`). The money stays on the body (loot for whoever finds it), unless a widow takes it.
- **The house:** the heir heads it if he lives there and is grown, else the widow, else the eldest grown man, else the eldest grown member. Children left alone go to the heir's house, else a grown kinsman's, else the settlement's largest landholding house.
- **A lord's seat** goes to his heir (a minor rules through the regent); with no heir, the region's highest-ranked grown person (20–64, men first, eldest first) seizes it and moves to the seat. **A band's chief** is followed by the eldest grown man of the band.

### Newcomers (owner, 2026-09-26: keep 30% violence, refill with newcomers)
- Each season a town or village below its founding size (`settle.base`, the population first seen; never past 80% of what its land feeds) takes in 35% of the gap, at most 12 people: a household at a time, a grown head (18–40, a man 80% of the time; a ronin 8%), a spouse 60% of the time, 0–3 children under 13. Nine in ten are the region's own culture, one in ten from any other. The head is granted a free plot if there is one. Each newcomer gets `arrived` (the hour they came). `people.arrived` is emitted per settlement.
- Without the crime system, births keep most villages near their founding size and few newcomers come. With it (30% of grown people a year), seed 12345 holds about 5,950 of its 6,714 people over 10 years (children stay home and are never killed, so fewer grown people are left).

### Moving, and keeping garrisons
- A settlement over 112% of what it feeds sends landless households and unmarried young adults (16–29) to settlements of its region (then its culture) under 90%, granting the head a free plot there.
- A fort, camp or shrine under its minimum (5, 5, 1) recruits to 5–8, 5–8, 1–3 from its region's villages (its whole culture if the region has fewer than 40 people): forts take unmarried young men (commoners become ashigaru), camps take the broke first (`people.turnedOutlaw`), shrines take unmarried adults under 40 (they become monks).

### Needs, living, ties, ambitions
- A working adult under 65 earns `EARN[cls] × min(1, fed)` and spends `SPEND[cls]` mon a visit (commoner 55 / 45). The economy lane replaces this (`wages = false`).
- Ties: each visit an adult has a 15% chance to meet a random neighbour outside their house: shared trait +0.25, same class +0.08, a trait their culture despises −0.4, plus −0.35..0.35; above 0.35 both warm by 0.25 (friends), below −0.35 both cool (rivals). Ties fade 0.02 a visit (grudges 0.004) and end below 0.08 or when the other dies. A murder gives the victim's near kin a grudge of −1 on the killer.
- Ambitions (yearly, grown people): a small landed head (rank ≤ 2, 1–2 plots) wants `land` (12%, 22% if eager, proud or vain); buying or bidding for a free plot is the economy lane's (owner, 2026-09-26), which reads `ambition`; a merchant head wants `wealth`; a chief a `zone`; an old lord's (55+) younger son the `seat` (20%, rivals with his brother, `people.succession`); a retainer `favour` (5%). Revenge ends when the target dies; the others are given up after 15 years.

### Daily schedules (near him only)
Children play and help; elders sit. Field work (farmers, fishers, woodcutters, miners, rebels) 6–18; shops 7–18 then the inn; innkeepers 10–02; guards, ashigaru and retainers stand day or night watch by id; bandits, smugglers, thieves and shinobi prowl the road at night; monks pray at dawn and dusk; lords and magistrates hold court 9–17; couriers, ronin and bounty hunters travel. Lazy traits run an hour late, eager an hour early; drunks drink instead of resting; the hungry forage instead of work.

### The ronin's line (owner 2026-09-26: death costs everything unless he has an heir)
- `L.player` is always the played actor. Courting: `brides` lists unmarried women 16–44 in settlements within 6 zones; `court` is a visit that warms her by 0.12 (+0.06 a shared trait, −0.05 a trait her people despise). `judge` says whether her house accepts: acceptance 0.55 + her culture's standing of him × 0.5 + the cultures' relation × 0.25 + karma × 0.2 (at most 0.2) − 0.22 per rank she stands above him − 0.15 per despised trait; refused if she is married, under 16, a nun or close kin, if her house is 3+ ranks above him without standing 0.8, if his karma is below −0.4 (the outlaw coast does not mind), if her people's standing of him is below −0.2, if she hardly knows him (fondness under 0.4), or if he cannot pay. Bride price: `BRIDE_PRICE` × (1 + 0.5 per rank above him) × (1 − 0.4 × standing). He pays it all to her house head.
- Married, he heads a house where she lives; her home becomes his. Children are born to them like anyone else's, and are his house (`dynasty`).
- **When he dies** (`killActor` on `L.player`): what he carried (his weapon and his purse) becomes his grave's `goods` (owner, 2026-09-26: finders keepers; his heir can take it back if they reach the grave first, and anyone can rob it: `lootGrave`). His land and anything not on him pass by the ronin rule; his grave lies at the zone and tile where he fell and is remembered with his deeds (`P.graves`). His playable heir becomes `L.player` at once, whatever their age (owner): the named one if among his children, grandchildren or brothers, else sons, daughters, grandchildren, brothers. A child heir is played now; the widow, else the next of kin (a grown sibling, else the dead man's eldest grown kin), is regent and holds the land until 16. No heir: `P.over`, `people.lineEnded`, the run is over.

### Forgetting the long dead (owner, 2026-09-26: ok)
A save grows by the dead. Once a year, the dead of more than `fadeAfter` years (20) who are not notable (not his house, a lord or rank 5+) keep only `id, given, family, sex, born, died, alive, cause, killer, culture, cls, job, parents, children, spouse, grave` and get `faded: true`; other systems must not read any other field of a faded record. Family trees still reach them. Sizes: about 3.2 MB fresh, 9.5 MB after 60 years (11 MB without forgetting; most of the weight is the recently dead). Set `fadeAfter = 0` to keep everything.

## Owner decisions (2026-09-26)

- Children stay at home until 18 and are not seen: no trade, marriage, crime, fight or witness before it.
- A violent time: about 30% of grown people die by the sword a year (the crime system), and newcomers refill emptied villages.
- Fixed in the merge: a lord already seated in one region can no longer take a second seat, by inheritance or by seizing it (his first seat was left to a dead man).

- Old age may take him while you are away ("yes he may die").
- Heirs: "only his children and grandchildren, maybe a brother or companion". Built: children, grandchildren, then brothers. A companion as heir is still open (the party lane's companions are not actors in the ledger yet).
- A child heir is played at once; "widow/next of kin is regent".
- "If his gear was on him and he died in an unrecoverable place, it's finders keepers": his weapon and purse lie in his grave for whoever reaches it.
- Land is bought or bid for, and that belongs in the economy lane: the people lane keeps only the want (`ambition.kind === 'land'`) and the lord's grant of a free plot to a new household.
- Forgetting the long dead is ok.

## Still open

1. May a sworn companion carry on as his heir?
2. Can a daughter be the played heir? (Built: yes, after the sons.)
3. Should marrying into a culture change his standing with it?
4. Is a lord's grant of a free plot to a new couple the people lane's to keep, or should the economy lane price it too?
