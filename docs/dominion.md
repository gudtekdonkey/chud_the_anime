# Dominion: building, holding land, ruling, and war

A proposal (Claude, 2026-09-26), for the owner to shape. The owner asked for "the building system and the plot merging system / land control system: how you can make a village → city, domain, province, at one of our multiple plots etc... recruit standing armies, wage war on others". It sits on `docs/foundations.md` (the world grid, title and possession, koku, heirs) and the systems the parallel lanes are building (`docs/sim-core.md`). NPC lords play by exactly the same rules, so the world's politics come from this too.

## 1. The ladder of land

Each step is held by owning the steps below it; each is a **title** (on paper) with a **holder** (who has it now), as with plots (raids take possession, never the title).

| Step | What it is | How you get it | What it gives |
|---|---|---|---|
| **Plot** | 16 × 16 tiles | claim, buy, inherit, be granted, take | build on it, work it, its yield |
| **Estate** | adjoining plots you hold, merged into one | holding them side by side (it merges itself) | one place to manage, one name |
| **Zone** (*mura* / *shō*) | a whole zone of 16 plots | hold every plot in it | the zone's title; collect tax from anyone else working land in it; build the zone's seat |
| **Domain** (*han*) | adjoining zones you hold, joined under one seat | hold two or more adjoining zones and name a seat (a town or castle) | a named realm on the map, a lord's rank measured in koku, vassals |
| **Province** (*kuni*) | one of the world's 100 regions | hold its seat town and most of its zones | governor's powers: set the province's taxes and laws, raise its levy |
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
  - **He is there:** the zone becomes the battlefield and he fights in it with his blade, his companions and his squads. How much he commands (simple orders to squads, or only his own sword) is the owner's call.
  - **He is not:** it is resolved in the ledger from numbers, training, equipment, terrain, walls, supply and the generals' personality and intelligence, while time runs even when you are away.
- **What war changes:** possession of plots, zones and seats (raids and conquest take possession); plunder, prisoners, hostages, the dead (the people lane's deaths and heirs).
- **Peace changes the title:** a treaty can cede titles (the lawful transfer the crime lane is designing), with tribute, a marriage, or hostages as its price. Without a treaty, conquered land is held but contested.

## 7. How it fits the lanes
- **Economy:** yield, taxes, upkeep, building costs, army wages, trade and plunder.
- **People:** settlers, recruits, vassals, lords' heirs and successions, the dead.
- **Crime:** title and possession, unjust war as a crime against the culture, lawful transfer by treaty.
- **Story:** wars, uprisings, succession fights and sieges become world events and quests; the story lane's "war between cultures" becomes a real war when this system runs it.
- **Land:** claiming, the recipes that build, the auto-managing steward.
- **The world:** the ladder maps onto the grid (zones, regions as provinces), and the map shows domains, provinces and realms as they change.

## Open, for the owner
1. The ladder's names: Japanese (*mura*, *han*, *kuni*) or English (zone, domain, province, realm)?
2. In a battle he is at: simple orders to his squads (hold, charge, follow me, fall back), or only his own sword while they fight on their own?
3. How free is building: any tiles you choose, or set lots in a settlement?
4. Is there an end: can he unite every province (the whole land), and does the game then go on?
5. Should vassals be able to rise against him and take their land back, or only riot and pay less?
