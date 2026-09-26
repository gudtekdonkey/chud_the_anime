# Dominion on the simulation core (`src/sim/dominion/`)

The dominion lane: the land ladder, settlements that grow, building, governing, armies and war, built as one system on the core exactly as `docs/dominion.md` (approved by the owner) describes. NPC lords play by the ronin's rules, so the world's politics come out of it. Read `docs/sim-core.md` first.

- **System:** `system({ id: 'dominion', order: 60 })`, registered when `src/sim/dominion/index.js` is imported. Import it before `generateWorld` (its `init` sets the world up) or before `loadWorld` (a save without it runs `init`).
- **State:** everything under `L.sys.dominion` (plain JSON). Shared facts it writes on core records are listed under "Fields added to core records".
- **Time:** everything runs in `onDay`, `onSeason` or `onYear`, so it all lives on while he is away (owner: real time). Nothing uses `onHour`.
- **Randomness:** only the stream the core hands each step, plus `rngFor(L.seed, 'dominion', ...)` at init and for a death heard by event.
- **Test:** `node scripts/dominion-sim.mjs [seed] [years]` lives a world (20 years by default) and prints land concentration, the biggest rulers and domains by koku, the wars and their treaties, settlements that grew or fell, every event count and the cost of a game day.
- **Prototype:** `prototypes/42-dominion.html` (sources in `prototypes-src/42-dominion/`, bundled with `scripts/proto-bundle.mjs`).

## Files

| File | Owns |
|---|---|
| `index.js` | The system (the day, season and year steps), the listeners for other lanes' events, the public API (re-exports) |
| `data.js` | `LADDER`, `TIERS`, `BUILDINGS`, `UNITS`, `LAWS`, `OFFICES`, `ORDERS`, `TRAIT` (traits that bear on ruling and war), `N` (every other number) |
| `seams.js` | Every stand-in for another lane, one function each (see "Seams") |
| `land.js` | The ladder: lords, zone titles (`setZone`), the zone rule, estates, domains, provinces, realms, `holdingsOf`, `rankOf`, the chain of fealty (`top`), islands (`landOf`) |
| `settle.js` | Settlements: tiers, people, the season's tax, food, trade, unrest and loyalty, petitions, riots, uprisings, household vassals, trade between towns |
| `build.js` | Buildings: recipe-shaped costs, placement by footprint, construction by work, hired hands, damage, repair, upkeep |
| `govern.js` | Offices (quality and honesty), tax, laws, fealty and vassal lords' loyalty, succession |
| `army.js` | Armies: recruiting, squads, officers, orders, pay and food, desertion, training, equipment, paths along the roads, marching |
| `war.js` | Reasons for war, declaring, what armies do in a war, battles, sieges, taking possession, raids, peace and treaties, tribute |
| `ai.js` | NPC lords' choices: tax, laws, building, the army's size, war, fealty, rebellion; outlaw chiefs' raids |
| `init.js` | The world as dominion first finds it |

## The ladder (defaults 1: English names with the Japanese in brackets)

Every step has a **title** (on paper) and a **holder** (who has it now). Conquest, raids and uprisings move the holder; only lawful transfer (treaty, inheritance, grant, the crime lane's rules) moves a title.

| Step | Record | Rule |
|---|---|---|
| Plot | the core's `L.plots` / `ownerOf` | claimed by the land lane (prototype 42 stands in with `claimPlot`) |
| Estate | computed by `estatesOf(L, id)`, never stored: `{ id, plots, zones, name }` | the plots a person holds, merged where they touch (across zone edges too). Emits `dom.estate` when a plot joins one |
| Zone (*mura*) | `L.sys.dominion.zt["x,y"] = { title, holder, since }` | hold the title of all 16 plots (a vassal's plot counts for his liege): `checkZoneTitle`. At world start every town, village and fort zone is its region lord's, camps are held by their chief with no title |
| Domain (*han*) | `dom[id] = { id, name, seat, zones, title, holder, founded }` | two or more titled zones within `N.REACH` (6 zones, Chebyshev) of each other, joined under a seat of town tier or more. The ronin founds his with `foundDomain` (a choice; `dom.domainReady` tells him when he can); NPC lords found theirs at once. The domain's title follows the seat's zone title; its zones are the titled zones clustered round the seat; two domains of one lord in one cluster merge |
| Province (*kuni*) | `prov[regionId] = { title, holder }` | held by whoever holds the region's seat and more than half its lordly zones; its title by whoever holds the seat's title and more than half the zones' titles (otherwise the title stays where it was) |
| Realm | `realms[id] = { id, name, title, holder, capital, provinces, founded }` | a ruler (a lord with no liege) whose own and sworn vassals' province titles number two or more. Its holder is whoever's side holds the capital province |

**Rank is koku:** `lord.koku` is the yearly koku of the settlements he holds; `lord.kokuAll` adds his sworn vassal lords' (the rank shown, "a lord of 10,000 koku").

**Wild land:** zones with no settlement stay nature (the core's `ownerOf`), so a province counts only its lordly zones (those with a zone record).

## Lords

`lords[actorId]`: anyone who holds a zone, builds, taxes or keeps an army (the ronin from his first plot).

| Field | Meaning |
|---|---|
| `rice` | koku in store (tax comes in as rice; armies eat it; the surplus is sold) |
| `tax` | 0.1 .. 0.7 on his land |
| `laws` | `{ law: hour enacted }` |
| `off` | `{ steward, magistrate, general, envoy }`: actor ids |
| `liege`, `loyalty` | the lord he is sworn to, and his loyalty to him (0..1) |
| `zones`, `titles` | zone keys he holds / holds the title of (kept by `setZone`) |
| `grudges` | `{ lordId: 0..1 }`, fading 20% a year |
| `claims` | zone keys he claims besides his titles |
| `koku`, `kokuAll` | his rank (above) |
| `wars`, `truce` | active war ids; `{ lordId: hour the truce ends }` |
| `tribute` | `[{ to, mon, left }]` owed each season |
| `seat` | his seat's zone key |
| `outlaw`, `rebel` | an outlaw chief; a lord made by an uprising |
| `glory` | victories, fading; raises his vassals' loyalty |
| `next`, `dip` | the day he next decides (every 14 days, 7 at war), the day he next weighs war and fealty (every 28) |
| `gone`, `ready`, `skimmed`, `since` | succeeded (dead); a seat ready for his domain (the ronin); rice his steward has stolen; when the record began |

## Settlements

`set["x,y"]`: any zone with buildings. It grows by tiers from what stands and who lives there. A tier needs everything below it too; keeping a tier needs 90% of the people it took to reach it.

| Tier | Homes | Buildings | People | Also |
|---|---|---|---|---|
| Homestead | 1 | | | |
| Hamlet | 3 | well | | |
| Village | 8 | shrine, storehouse | 30 | |
| Town | 20 | market, inn, smithy | 80 | on a road |
| City | 40 | wall, temple, magistrate | 200 | trade with 3 towns (towns reached along roads within 30 zones) |
| Castle town | 40 | keep | 200 | the seat of a domain or province |

Fields: `k, x, y, name, region, culture, founder, tier (-1 none .. 5), pop, b (building ids), cnt ({ type: standing count }), homes, cap, walls, workers, staffed (0..1: people to run the buildings), store (koku in granaries), unrest, loyalty (0..1), pool ({ ashigaru, retainer, ronin, monk, shinobi } recruitable this season), hit (hour of the last raid or siege), riot (hour), pet (a petition is open), trade, yield (koku a year), hunger (0..1), vas (vassal household heads), siege (the besieging army), grow, popDelta`.

**Who rules it:** the zone's holder, or (a new settlement on plots, like his) whoever founded it.

**Every season, for each settlement:**
- Yield = people × 1.8 koku a year + food buildings × staffing (a paddy 12, a weir 8, an orchard 6), less the laws' yield costs.
- Tax = a quarter of the yield × the rate × (half during a riot) × (less for rebellious vassals) × (nothing under siege). A dishonest steward skims 5–20% (more if clever). A vassal lord sends 10% to his liege. The rest is the lord's rice.
- Trade buildings, tollgates and the toll law bring mon (a market 3 mon a person a season, an inn 80, a warehouse 120, a money-changer 150, a brewery 60, a weaver 50; tolls 2–3 mon a person).
- Food: what the tax leaves feeds the people (1 koku a year each); granaries (60 koku each) keep half the surplus and cover a shortfall. `hunger` is the share unfed.
- Unrest moves 35% toward its target: 0.1 + (tax − 0.3) × 1.4 + hunger × 0.8 + 0.25 if raided or besieged lately + 0.2 if held by someone other than its lord on paper + the ruler's culture's hatred × 0.3 + the laws + the buildings (shrine −0.03, temple −0.06, magistrate −0.05, jail −0.02, brewery −0.02) − a magistrate's quality × 0.15 − the ruler's karma / 200 (±0.1).
- Loyalty drifts 10% toward (1 − that target).
- People move toward room × appeal (people lane's migration, stood in): appeal = 1 − unrest × 0.5 − hunger × 0.8 − 0.3 if lately raided + markets (+0.08) and inns (+0.04) − the toll law; growth about 0.5% a season; a small place (under 40) with appeal over 0.6 draws 1–3 settlers a season; above the target, a quarter of the excess leaves each season.
- Recruits this season: ashigaru 12% of the people (24% under conscription); retainers 2% of a village or more (+2 at a seat); ronin 2 + 2% where there is an inn (+2 with amnesty); monks 4 with a temple; one shinobi in a town.
- Trouble: unrest over 0.5 opens a petition (`dom.petition`, once until it falls below 0.4); over 0.65 (less with curfew or a weapon ban) a riot is 35% likely (a building damaged, half tax for a season); over 0.8 with loyalty under 0.35 an uprising is 50% likely.
- **Uprisings (default 5: possession, never title):** land held by force rises for its lord on paper (possession returns to him); otherwise the least loyal vassal household (or a new rebel) takes possession, with 15% of the people as rebels (half with a weapon ban). The title never moves.

Lords keep a year of rice for their men (+10 koku) and sell 80% of the rest each season at the rice price.

**Household vassals:** `vas[actorId] = { liege, loyalty, lean }`: every household head who holds a family plot's title in a zone ruled by someone else. Loyalty moves a quarter of the way toward (1 − the settlement's unrest) + their leaning (proud, restless, cocky lean away; humble, calm, serene lean in) each season. Loyal ≥ 0.55, restless, rebellious < 0.3; rebellious ones pay half. Their changes are news (`dom.vassal`) only on the ronin's land.

## Buildings

`bld[id] = { id, t (type), k (zone key), at ([tx, ty], or null in the ledger layer: NPC buildings off screen get tiles when the zone is built near him), owner, st ('build' | 'up' | 'repair' | 'ruin'), hp (0..1), done, labour (labour-days), got (true, or materials still owed), crew (hired hands), since }`. `work` lists the ids under construction.

| Family | Types |
|---|---|
| Homes (people live here; room caps people) | hut (2×2, room 4), house (3×2, 6), longhouse (5×2, 3 homes, 16, from a hamlet), manor (5×4, 10, from a village) |
| Food | well, paddy (grass/field/paddy/marsh ground), orchard, granary, weir, storehouse (the kura) |
| Craft | sawmill (+15% labour; timber 25% cheaper), kiln (stone and tiles 25% cheaper), smithy (equips armies), brewery, weaver |
| Trade | market, inn (paid swords), warehouse, money-changer (needs a market), tollgate (on a road) |
| Faith | shrine, temple (needs a shrine; monks) |
| Order | magistrate's office, notice board (the story lane's quests), jail |
| War | barracks and dojo (training), stable (armies march 25% faster), watchtower (+0.2 walls), palisade (walls 1, round the settlement), gate (+0.5, needs a palisade or wall), stone wall (walls 2, from a city's needs), castle keep (+1.5, needs a wall) |

Every row in `BUILDINGS` has footprint, cost (timber, stone, iron, tiles, mon), labour-days, the tier it needs, the buildings it needs, workers to run it, upkeep (2% of its mon a season) and its effects. Materials are bought at 30 / 40 / 200 / 15 mon a unit (stand-in prices).

- **Placement (default 3: anywhere on tiles he holds, by footprint):** every tile on a plot he holds, not blocked by a feature (forest, bamboo, rock, water, marsh or anything built blocks until the land lane's clearing), on the right ground, not on another building. Walls and palisades run round the settlement and need the settlement's ruler.
- **Construction by work, continuing while he is away:** the settlement's corvée (5% of its people a day, shared among its lord's builds, × the steward: 0.8–1.2) plus hired hands (8 mon a day each; unpaid hands walk off: `dom.crewLeft`). His buildings and any with hired hands move daily; an NPC lord's corvée is counted a week at a time.
- **Damage:** riots, raids and sacks. Below half health a building stops counting; at 0 it is a ruin. **Repair** costs half its labour for the damage and 10% (30% for a ruin) of its price. Unpaid upkeep wears buildings 10% a season.

## Governing

- **Tax** `setTax(L, lord, rate)`: 0.1..0.7.
- **Laws** `setLaw(L, lord, law, on)`: ban weapons for commoners (unrest +0.02, riots need 0.08 more, uprisings half as strong), curfew (+0.03, riots need 0.1 more, yield −5%), road toll (+0.03, 3 mon a person a season on a road, appeal −0.05), amnesty (−0.08, +2 ronin a season, karma +2), conscription (+0.08, double levy, yield −5%).
- **Offices** `appoint(L, lord, office, actorId)`: steward (construction and tax; may skim), magistrate (calms unrest; a dishonest one works at 60%), general (battles, training), envoy (vassals' loyalty, peace terms). `officeQ(L, actor, office)` = 0.15 + 0.55 × intelligence + good traits × 0.12 − bad traits × 0.15; dishonest when greedy traits (vain, cocky, menacing, drunk) reach 0.5 or karma < −20. NPC lords fill empty offices each year from people living on their land; a clever lord sees quality, a dull one picks nearly at random.
- **Vassal lords:** `swear(L, vassal, liege)`. Loyalty moves 20% a season toward 0.6 ± shared culture (±0.1) − the liege's bad karma (0.1) + his glory × 0.05 − grudges × 0.4 + his envoy × 0.15 − pride × 0.1 − (his tax − 0.35) × 0.5. A rebellious vassal strong enough (0.8 of his liege's side, less if bold) rises (`rebellion`).
- **Succession:** a dead lord's titles, holdings, rice, money, laws, offices, armies, wars, grudges, tributes, domains, provinces and realm pass to his heir (people lane: `heirOf`), with no heir to his liege (escheat), with no liege to the richest vassal household of his seat, or a new noble family there. `region.lord` follows.

## Armies

`armies[id] = { id, lord, name, at, home, sq: [{ cls, n, off, tr, eq, order, from }], morale, sup, unpaid, hungry, go: null | { to, path, i, prog, why, war }, siege, siegeDays, rest, last, deserting, since }`.

| Class | Strength a man | Wage a day | Rice a year | Recruit | From |
|---|---|---|---|---|---|
| ashigaru | 1 | 4 mon | 1 koku | 100 mon | commoners of his own settlements (they leave the fields) |
| retainer | 2.6 | 25 | 1.5 | 600 | the samurai class, a village or more |
| ronin | 2 | 18 | 1 | 300 | an inn in any settlement not held by an enemy |
| monk | 1.8 | 2 | 0.8 | 0 | a temple |
| shinobi | 1.2 | 30 | 1 | 800 | a town; each weakens walls in a siege by 15% |
| bandit, rebel | 1.3, 0.8 | 0 | 1 | | outlaw camps; uprisings |

- **Strength** = Σ men × class strength × (0.5 + training) × (0.6 + 0.4 × equipment), × (0.5 + morale), × 0.7 when out of food.
- **Every day** (a week at a time for an army at rest): it eats its lord's rice in friendly land (refilling 30 days' supply) or its own supply elsewhere; it is paid from his purse. Unpaid, morale falls 0.02 a day; hungry, 0.04. After 7 days unpaid or 3 hungry, 3% of each squad a day deserts (retainers last); after 30 days unpaid deserters go to the hills (`dom.desert` with `bandits`).
- **Training** at home: 0.0008 a day + a dojo's 0.004 + a barracks' 0.002, × the general (0.8–1.2); up to 0.95. **Equipment:** 0.002 a day per smithy in his land (up to three), up to 0.5 + 0.15 per smithy.
- **Squads and officers:** `setOfficer`, and `setOrder` with hold, charge, follow, fall back (default 2: the orders he gives when he is at the battle; the ledger ignores them).
- **Marching:** weighted A* over zones (roads 0.35, plains 1, hills 2.5, mountains 6, sea impassable), 3 zones a day on a road, 1.5 off it, 25% faster with a stable at home; armies stay on their own island.

## War

`wars[id] = { id, a, d, reason, goal, started, score (a's view, −100..100), battles, taken, sieged, end, how, treaty, story, offered }`; `active` lists the ids being fought.

- **Declaring** `declareWar(L, a, b, { reason, goal })`: between the tops of the two chains of fealty. Reasons: `claim` (he holds a title the other side possesses, or a claim), `grudge` (≥ 0.4), `hatred` (the cultures' relation ≤ −0.5), `rebellion` (against his own liege; he breaks fealty first), `story`. No reason costs 25 karma and 0.3 standing with the enemy's culture. A vassal cannot declare. A truce (two years after a treaty, one after exhaustion) blocks it.
- **NPC choice** (every 28 days, at peace): among rulers holding land in his and neighbouring regions on his island, he declares if his side is stronger by 1.6 × (−0.4 per boldness, −0.25 with a reason, +0.4 per kindness, +0.6 without a reason), estimating their strength better the cleverer he is; 30% likely with a reason, 10% without. A weak lord (under 30% of a neighbour, under 400 koku, not proud) may swear fealty instead.
- **Campaigns** (orders every 3 days, an army that holds thinks again in 9): drive out invaders in his land (if strong enough), retake his land held by the enemy, else the attacker marches on the goal or the nearest enemy settlement (within 40 zones), and the weaker defender holds at home.
- **Battles in the ledger** (he is absent): each side's strength × its general (0.85–1.15) × terrain for the side holding the ground (hills 1.25, mountains 1.4, forest and bamboo 1.15, marsh 1.1) × (1 + walls × 0.3). The attacker wins with p = a² / (a² + d²). The loser loses 30–60%, the winner 6–26% (scaled by the loser's strength); bold generals make both bloodier. Officers can fall (`war.fallen`). The loser marches home; morale +0.15 / −0.3; score ± (10 + losses / 5, up to 20).
- **He is there:** when one of the armies is his and he stands in the zone, the battle waits a day (`war.ready`) for the game's live fight to report back through `settleBattle(L, zone, 'a' | 'd', lossA, lossD, r)`; otherwise the ledger fights it.
- **Sieges:** the garrison is a tenth of the people at half strength (plus friendly armies) behind walls × (1 + walls × 0.6, less with shinobi). Stores last 30 days + 30 a granary + the granary's koku; then the garrison starves 5% a day. The besiegers forage (+0.5 days of food a day) and storm when 1.5× stronger, or stronger and the town starves, or after 60 days; a failed assault costs 12%. Hungry besiegers lift the siege.
- **Taking possession** (`war.taken`): the zone's holder changes, never its title; its lord's own plots follow, vassals keep theirs; plunder (15 mon a person), 15% of buildings sacked, 15% of the people flee, unrest +0.3, a grudge.
- **Raids** (outlaws, weekly-ish, on settlements within 8 zones): plunder (8 mon a person, 200 more without a storehouse); a raid 2.5× stronger than the defence on a hamlet or smaller seizes it.
- **Peace** (weekly): score ≥ 60 (or the loser's armies under 15% with score > 20) ends the war in a treaty; after 3 years, exhaustion (no transfers: occupied land stays held but contested). With him in the war, the winner's offer (`war.peaceOffered`) waits two weeks for his own terms through `makePeace`.
- **Treaties** `termsFor` → `makePeace(L, warId, { winner, loser, cede, tribute, hostage, marriage, vassal })`: cession of the zones he took that are the loser's on paper (titles pass; a good envoy keeps one); tribute of 10% of the loser's wealth a season for a year (less with a good envoy); a hostage (the loser's grown child moves to the winner's seat); a marriage between their children; fealty from a loser under 35% of the winner's koku. Everything else taken goes back to its lord on paper. Unpaid tribute is a grudge.
- **Possession ripens:** a zone nobody holds on paper (a camp, a lordless village) becomes its holder's after two years held (not an outlaw's). The crime lane decides the real rule.

## Events

`dom.*` and `war.*`, each with `zone: [x, y]` where it has one and `actor` for the lord it is about.

| Event | Data |
|---|---|
| `dom.zone` | `zone, title, holder, was, how`: a zone's title moved (holder-only changes are told by the event that caused them) |
| `dom.estate` | `actor, plots, zone, name` |
| `dom.domain` | `domain, name, zone, actor, how` (founded, grew, shrank, passed, merged, dissolved), `zones` |
| `dom.domainReady` | `actor, zone`: he can found a domain |
| `dom.province` | `region, name, title, holder, was` |
| `dom.realm` | `realm, name, actor, how` (rose, fell), `provinces` |
| `dom.tier` | `zone, name, from, to, grew, actor` (only village and up, or his) |
| `dom.build`, `dom.built`, `dom.repaired`, `dom.damaged`, `dom.ruined` | `building, kind, zone, actor` (+ `cost`, `why`, `hp`). NPC lords' homes and small works are silent |
| `dom.crewLeft` | `building, zone, actor` |
| `dom.tax`, `dom.law`, `dom.appoint` | `actor, rate, was` / `law, on, name` / `office, to, q` (appointments: his only) |
| `dom.petition`, `dom.riot`, `dom.uprising` | `zone, name, actor, unrest, why` / `from, to, restored, rebels` |
| `dom.vassal` | `actor, liege, state, lord?` |
| `dom.fealty` | `actor, liege, how` (envoy, treaty, broke) |
| `dom.succession` | `from, to, how` (heir, escheat, rose), `zones` |
| `dom.recruit`, `dom.disband`, `dom.desert` | `actor, army, cls, n, zone, cost` / `men` / `n, bandits` |
| `war.declared` | `war, a, d, reason, goal, story` |
| `war.march`, `war.siege`, `war.assault`, `war.siegeLifted` | `army, actor, from, to, why, war, men` / `zone, name, walls` / `held` |
| `war.battle` | `war, zone, winner, a: { lord, men, lost }, d, siege, live?` |
| `war.fallen` | `actor, army` |
| `war.taken`, `war.raid` | `war, zone, name, from, to, title` / `actor, won, loot, seized` |
| `war.ready`, `war.peaceOffered` | `war, zone` / `war, winner` |
| `war.peace`, `war.treaty` | `war, a, d, how, score, days` / `winner, loser, cede, tribute, hostage, marriage, vassal` |

About 850 events a year on the test world (`scripts/dominion-sim.mjs` prints the counts). The core's log keeps 4,000 for every lane together, so the integrator may want to raise `LOG_CAP`.

## Listens for (other lanes)

| Event | What dominion does |
|---|---|
| `story.war`, `event.war` with `{ cultures: [a, b] }` (or `a`, `b`) | a real war between the strongest ruler of each culture (reason `hatred`, ignores truces) |
| `econ.famine` with `{ region }` or `{ zone }` | empties the stores, hunger ≥ 0.5, unrest +0.15 |
| `people.death` / `people.died` with `{ actor }` | a dead lord's land passes at once (and every year, any dead lord's) |
| `people.settlers` with `{ zone, n }` | the settlement gains n people |
| `crime.transfer`, `land.claimed`, `land.claim` with `{ plot }` | the zone rule and the estates catch up (`plotChanged`) |

## Seams (`seams.js`): what dominion needs from other lanes

Each is one function; the integrator replaces its body when the lane lands.

| Function | Lane | Needs | Stand-in |
|---|---|---|---|
| `zoneYield(L, s)` | economy | a settlement's koku a year | people × 1.8 + food buildings |
| `ricePrice(L, region)`, `materialPrice(L, region, mat)` | economy | prices | 1,000 mon a koku; timber 30, stone 40, iron 200, tiles 15 |
| `worth`, `spend`, `gain` | economy | a person's money moving (weight, banks) | mon, silver at 80, ryō at 1,000; a lord keeps his treasury in gold |
| `heirOf(L, actor)` | people | who inherits | eldest living child of 14+, spouse, sibling |
| `killActor(L, id, cause)` | people | a death | `alive = false`, `died`, `cause` |
| `mortality(L, actor, r)` | people | lords dying of age | yearly 1% (<40), 3% (<55), 7% (<65), 15%; off once `L.sys.people` exists |
| `migrate(L, s, target, appeal)` | people | people coming and going | above |
| `transferTitle(L, plot, to, how)`, `ripens(L, zone)` | crime | lawful transfer, possession becoming title | set the plot's title; two years held |
| `addKarma`, `addStanding` | crime | karma and standing | edit `actor.karma` / `actor.standing` |
| `blocked`, `tileGround` | land | tile features that block building | forest, bamboo, rock, water, marsh and built tiles block |
| `claimPlot(L, plot, who)` | land | claiming (prototype 42 only) | a nature plot becomes his |

### The land lane's seam (buildings as recipes)
`recipeOf(type)` returns a recipe-shaped record: `{ id: 'build.<type>', kind: 'build', name, family, footprint: { w, h } | 'ring', needs: { plot: 'held', clear: true, ground, buildings, anyOf, tier, road }, inputs: { timber, stone, iron, tiles }, mon, labour, workers, upkeep, output: { building } }`. The land lane's recipe system and companion task planning run it:
1. `canPlace(L, who, type, zx, zy, tx, ty)` → null or why not.
2. `plan(L, who, type, zx, zy, tx, ty, { pay: false })` places it unpaid (`got` lists what is owed).
3. `supply(L, id, goods)` as materials arrive (`mon` included); `work(L, id, labourDays, by)` as companions or hired hands work it.
4. It stands when the labour is done and nothing is owed (`dom.built`). `repair` works the same way.
Dominion builds no claiming and no recipes itself; `plan(..., { pay: true })` (buy everything now) is how NPC lords build and the stand-in for the land lane's auto-supply.

## Fields added to core records
- `L.plots[id].holder` for a zone's lord's own plots when its possession changes (and `title` in cessions and successions); a plot record is written only where it differs from the default.
- `region.lord` follows succession; `actor.lord` (the region id) passes to the heir; `actor.job` 'lord' passes too.
- `actor.hostage` (the lord who holds them) and `actor.home` (moved to his seat); `actor.cause` on a death by the stand-in.
- New actors: rebel leaders of uprisings and new lords of families that rise (`makeActor`).
- `L.ids.b`, `L.ids.army`, `L.ids.war`, `L.ids.han`, `L.ids.realm`.

## Cost
On the test world (seed 12345, 100 regions, ~180 lords and outlaw chiefs, ~180 armies, ~440 settlements) a game day costs about 1.7–1.9 ms on average on the cloud container this was built on (a 2.1 GHz Xeon VM, where `generateWorld` takes ~330 ms against the ~230 ms in `docs/sim-core.md`): about 1.3 ms for the daily step, 0.4 for the seasons, 0.2 for the years. It was 17 ms before tuning. Idle armies and NPC construction settle weekly, lords decide every 14 days (7 at war) and weigh war every 28, and every per-hour index (armies by lord and zone, side strength, chains of fealty, seats, occupied zones) is a derived cache outside the ledger. After 20 years dominion's state is ~2.5 MB of the save (mostly ~10,000 building records).

## Open, for the owner
The five defaults in `docs/dominion.md` still stand until the owner answers: (1) English names with the Japanese in brackets, (2) simple orders to his squads at a battle he is at, (3) building anywhere on tiles he holds, (4) he can unite every province and the game goes on, (5) vassals and uprisings take back possession, never title. Also open:
- How fast wars should be: about 11–14 wars a year on the test worlds; in 20 years 51 independent rulers become 24 (seed 12345: the top 10 go from 26% to 88% of the koku) or 49 become 35 (seed 777: 25% to 73%). Faster or slower consolidation?
- Should conquered land a treaty did not cede stay "held but contested" forever (today), or should the title pass after some years (the crime lane's rule)?
- Should NPC lords go to war with no reason at all (today: rare, bold lords only, at a karma cost)?
