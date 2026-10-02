# Dominion: building, holding land, ruling, and war

**Approved by the owner (2026-09-26): "Correct this is perfect."** Built by the dominion lane (`docs/sim-core.md`). The owner asked for "the building system and the plot merging system / land control system: how you can make a village → city, domain, province, at one of our multiple plots etc... recruit standing armies, wage war on others". It sits on `docs/foundations.md` (the world grid, title and possession, koku, heirs) and the systems the parallel lanes are building (`docs/sim-core.md`). NPC lords play by exactly the same rules, so the world's politics come from this too.

## 1. The ladder of land

Each step is held by owning the steps below it; each is a **title** (on paper) with a **holder** (who has it now), as with plots (raids take possession, never the title).

| Step | What it is | How you get it | What it gives |
|---|---|---|---|
| **Plot** | 16 × 16 tiles | claim, buy, inherit, be granted, take | build on it, work it, its yield |
| **Estate** | adjoining plots you hold, merged into one | holding them side by side (it merges itself) | one place to manage, one name |
| **Zone** | a whole zone of 16 plots | hold every plot in it | the zone's title; collect tax from anyone else working land in it; build the zone's seat |
| **Domain** | adjoining zones you hold, joined under one seat | hold two or more adjoining zones and name a seat (a town or castle) | a named realm on the map, a lord's rank measured in koku, vassals |
| **Province** | one of the world's 100 regions | hold its seat town and most of its zones | governor's powers: set the province's taxes and laws, raise its levy |
| **Realm** | several provinces under one ruler | hold provinces, or have their governors swear to you | a court, the right to declare war on realms, and a claim on the whole land |

- **Merging** is automatic when you hold adjoining land; **joining zones into a domain** is a choice (you found it, name it, pick its seat).
- **Vassals:** people who hold land inside yours (NPC families on their plots) owe you tax and service; they can be loyal, restless or rebellious (personality, intelligence, how you treat them). A domain can be built by making others your vassals instead of taking their land.
- **Rank is koku:** a lord "of 10,000 koku". The economy lane's yield and taxes decide it.

## 2. Settlements grow

A settlement is any zone with homes in it. It grows by tiers, from what is built and who lives there:

| Tier | Needs (starting numbers) |
|---|---|
| Homestead | one home |
| Hamlet | 3 homes, a well |
| Village | 8 homes, a shrine, a storehouse, 30 people |
| Town | 20 homes, a market, an inn, a smithy, 80 people, on a road |
| City | 40 homes, walls, a temple, a magistrate, 200 people, trade with 3 towns |
| Castle town | a city with a castle keep: a domain's or province's seat |

- People come to a place that is safe, fed and prosperous (the people lane's migration), and leave one that is taxed hard, raided or starving.
- A higher tier brings more trade, more recruits, more tax, and a bigger target.

## 3. Building

- **Buildings sit on tiles** inside plots you hold, each with a footprint (for example 3 × 2 tiles). A tile feature (a tree, rock, water) blocks it until cleared (`docs/world-and-land.md`).
- **Free on his plots, lots in towns he takes** (owner, 2026-10-01, D3C): on plots he holds he builds anywhere by footprint, and so in a settlement he founded there. In a settlement he did not found (a town or village that stood when the world began, or one he took), buildings go on its set lots: he chooses what goes in a lot, never where. NPC lords build on lots in their towns too.
- **Each building**: a footprint, what it costs (timber, stone, iron, tiles, labour-days, mon), what it needs first, workers to run it, upkeep, and what it does.
- **Built by work**, through the land session's recipes: you or companions or hired workers, over days, and it keeps going while you are away (real time).
- **Families of buildings:**
  - Homes: hut, house, longhouse, manor (people live here; homes cap the population).
  - Food: paddy field, orchard, granary, fish weir.
  - Craft: sawmill, kiln, smithy (weapons from the weapon system), brewery, weaver.
  - Trade: market, inn, warehouse, money-changer, toll gate.
  - Faith: shrine, temple (standing, healing, monks).
  - Order: magistrate's office, notice board (the story lane's quests), jail.
  - War: barracks, dojo (training), stable, watchtower, palisade, stone wall, gate, castle keep.
- **Buildings can be damaged, burned and taken** in raids and sieges, and repaired.

## 4. Governing

- **Taxes**: you set the rate on your land and your vassals. Higher tax, more koku and more unrest.
- **Laws** (a few, each with a cost): ban weapons for commoners, curfew, a road toll, an amnesty, conscription.
- **Appointments**: companions (or hired NPCs) as steward (runs the land: the auto-manage of `docs/world-and-land.md`, at the scale of a domain), magistrate (order and crime), general (the army), envoy (diplomacy). Their personality and intelligence decide how well, and whether they are honest.
- **Loyalty and unrest** per settlement and per vassal: moved by tax, food, safety, your karma and standing, the culture's feelings about you. Unrest becomes petitions, then riots, then an uprising (the story lane's uprisings).

## 5. Armies

- **Recruiting** comes from who lives on your land and what they can be:
  - ashigaru from commoners (cheap, yari and bows);
  - retainers from the samurai class (sworn to you, costly);
  - ronin as paid swords;
  - monks through a temple's alliance;
  - shinobi for secret work.
  
  Class decides the weapon (the enemy plan's classes).
- **A standing army costs every day**: rice (koku) and wages (mon). Unpaid or hungry troops desert or turn bandit.
- **Squads** under an officer (a companion or a named retainer), trained at a dojo, equipped by your smiths. Morale from pay, food, victories, and the leader's karma and personality.

## 6. War

- **Declaring war** needs a reason (a claim on a title, a grudge, an insult, a culture's hatred) or it costs karma and standing. NPC lords declare war on each other and on you by the same rules and the culture relations (`L.cultures[].relations`).
- **Campaigns** move on the world map: armies march along roads, eat as they go, besiege forts and towns, meet in battles.
- **Two ways a battle happens:**
  - **He is there:** the zone becomes the battlefield and he fights in it with his blade, his companions and his squads. **He gives each squad its own order** (owner, 2026-10-01, D2C): hold, charge, follow me, fall back. **For the game:** the owner's page warned that this "needs a slowed or paused moment to give them": the live fight must open with (and allow again) a slowed or paused moment in which he gives each squad its order; the sim's `war.ready` hands the game his squads and their standing orders, and `orderSquad` stores each one.
  - **He is not:** it is resolved in the ledger from numbers, training, equipment, terrain, walls, supply and the generals' personality and intelligence, while time runs even when you are away.
- **What war changes:** possession of plots, zones and seats (raids and conquest take possession); plunder, prisoners, hostages, the dead (the people lane's deaths and heirs).
- **Peace changes the title:** a treaty can cede titles (the lawful transfer the crime lane is designing), with tribute, a marriage, or hostages as its price. Without a treaty, conquered land is held but contested, until the crime lane's rule passes it (owner, 2026-10-01, land B): the title passes when the land has been held 3 years with nobody of the old title holder's line alive to claim it, or when a court confirms the holder after 3 years with no witness of the taking left alive. While the old lord's line and a witness live, it stays contested, so claim wars keep a reason.
- **One land** (owner, 2026-10-01, D4B): when one ruler unites every province the game shows an epilogue ("Epilogue: the year of one land. Continue?"), then goes on: uprisings and heirs keep the world moving. The sim tells the game with `dom.united` (once per unification, with the epilogue's summary) and never stops; the pause is the game's.

## 7. How it fits the lanes
- **Economy:** yield, taxes, upkeep, building costs, army wages, trade and plunder.
- **People:** settlers, recruits, vassals, lords' heirs and successions, the dead.
- **Crime:** title and possession, unjust war as a crime against the culture, lawful transfer by treaty.
- **Story:** wars, uprisings, succession fights and sieges become world events and quests; the story lane's "war between cultures" becomes a real war when this system runs it.
- **Land:** claiming, the recipes that build, the auto-managing steward.
- **The world:** the ladder maps onto the grid (zones, regions as provinces), and the map shows domains, provinces and realms as they change.

## The voids (owner, 2026-09-26; for the dominion lane to build)

The world has three rings (`src/sim/wild.js`, docs/foundations.md → "The wild"): the settled lands, the bandits' edge, and the voids where the mystical creatures live. What it means for land and armies:

- **He can claim land from level 11, and his first plot can be anywhere in the wilderness** (owner, 2026-09-26), the edge and the voids included. Nobody else settles a void: worldgen places no settlement in one (zone `void: true`).
- **The edge is where land is cheap and unsafe.** Claims on the edge are open to anyone, but bandit raids there run higher (the travel lane's ambush weight is ×2.5 on the edge).
- **Armies and settlers go round the voids.** Roads already do (worldgen makes a void 8× dearer to build a road through), and outlaw bands never step into one. Proposed: an army that marches through a void loses men to the creatures, and one camped at its edge loses a few at night.
- **The voids can be pushed back** (owner, 2026-09-26). Proposed: once the creatures of a stretch are slain and he holds land beside it, its zones lose `void` a few at a time, and people will settle there.

## The owner's answers (2026-10-01, over the proposals page "Dominion Open Questions": "Dominion: D1C D2C D3C D4B D5A · pace B · land B · noreason A")
1. **Names (D1C):** English only: plot, estate, zone, domain, province, realm, with no Japanese in brackets ("Hahizawa domain", "12 zones").
2. **Orders (D2C):** in a battle he is at, he gives each squad its own order (hold, charge, follow me, fall back) and fights with his own blade. The game needs a slowed or paused moment to give them (section 6).
3. **Building (D3C):** free by footprint on his plots; set lots in a settlement he took (section 3).
4. **The end (D4B):** he can unite the whole land; an epilogue, then the game goes on (section 6). Unchanged from 2026-09-26: "be a tyrant or rule peacefully, or even give everything back to the people: the choice is yours". Tyranny (crushing taxes, fear, purges), peaceful rule (low taxes, justice, prosperity) and giving it all back (freeing the land: titles returned to those who work it, the lords' seats dissolved into free villages) are all real paths with their own consequences, and **people remember** what he did.
5. **Vassals (D5A, unchanged):** vassals can rise and take back possession of their land, never its title.
6. **Pace (B, unchanged):** wars as fast as today.
7. **Conquered land (land B):** the crime lane's rule (section 6).
8. **War without a reason (A, unchanged):** rare, bold lords only, at a karma cost.
