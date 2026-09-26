# Foundations: the world, its land and who owns it

Decisions that everything else builds on. Owner answers are marked with the date; the rest are Claude's proposals, open until the owner confirms them. Every session reads this before building anything about the world, land, ownership, companions or NPCs.

## Owner decisions (2026-09-26)

- **Single-player** for now ("we're just alpha"). Built so a server could run it later (see the engineering decisions).
- **Time runs in real time while you are away.** The ledger catches up on your return from the clock: crops grow, plans run, NPCs live, wars move.
- **Death costs everything, unless you have an heir.** With family, the game continues as your heir; your body is laid to rest where you died, and stays in the world there (a grave the world remembers). Without one, it is over.
- **NPCs age, marry and pass their land to their heirs**, and so can he: family is how a run survives death, and the world changes over years of play.
- **An economy, with the historical names:** mon, silver (monme), gold ryō, koku.
- **Carried money has weight**: a fortune has to be moved, stored or banked.
- **Story: 90% from the world.** Only the structure is written by hand; everything else comes out of the ledger (quests, rivals, events).
- **Glitch storms are in**, and there is **no true story behind the glitch powers**: they are a fact of this world, not a mystery to solve.
- **World events, and random events while travelling**: ambushes on the road, merchants and pilgrims met on the way, a wounded man asking for help, weather that turns, a glitch storm crossing the road.
- **Karma is shown to the player** (owner, 2026-09-26).
- **Raids can take land, but not the legal title** (owner, 2026-09-26): what is held (possession) and what is owned on paper (title) are separate. A raid can seize possession; the title stays with its holder until it passes by some other mechanic, still to be discussed with the owner.
- **Platform: the browser.** Steam or phone would be cool later; for now, build the experience in the browser, with no multiplayer.

## The world (owner, 2026-09-26)

"There is a world. This world is made up of a 100 × 100 grid. Each grid area is a zone. This zone has many individual tiles; they can make a plot. The player plays within the zone. That's where his POV is. He walks around and fights in the zone."

| Term | What it is |
|---|---|
| **World** | A 100 × 100 grid of zones: 10,000 zones. |
| **Zone** | One square of the world grid. A large area of its own, bigger than the screen; the camera follows him through it. Everything he sees, walks and fights in is one zone at a time, and he crosses into the next zone at its edge. |
| **Tile** | The smallest square of ground inside a zone. It has a terrain (forest, field, river, road, rock...) and resources. |
| **Plot** | A group of tiles inside a zone that one owner holds. A zone is divided into several plots. |
| **Region** | A patch of neighbouring zones that share one culture (the 100 regions of the world system: 10,000 zones / 100 regions, about 10 × 10 zones each, drawn irregularly). |

## Ownership (owner, 2026-09-26)

- **Every plot has an owner**: a person (the ronin, a villager, a lord, a bandit chief), or nobody (wild nature, claimable).
- **Owning a zone**: once you own every plot in a zone, you own the zone.
- **Merging zones**: a zone you own can be merged with an adjoining zone you also own. Merged zones grow into larger holdings and eventually kingdoms.
- **NPCs are part of it**: other plots have owners, and NPCs steal, fight and kill each other. The world has its own politics without the ronin.
- **Taking land by murder**: you can take someone's plot after murdering them, at the cost of negative karma and a crime (the crime system below, a proposal).

## Proposed, for the owner to confirm

### Sizes
- **Tile:** 16 px. The screen (480 × 270) shows 30 × 17 tiles.
- **Zone:** 64 × 64 tiles (1024 × 1024 px, about 2 × 4 screens). Big enough to explore and fight in, small enough to cross in under a minute.
- **World:** 6,400 × 6,400 tiles in all, far too many to store. Each zone is generated from the world seed when first needed, and only what has changed (buildings, ownership, cleared forest, the dead) is saved.

### Titles as land grows
Plot holder → zone lord (all of one zone) → domain (merged zones) → kingdom (a large domain, with a court and vassals). NPC lords climb the same ladder, so there are rival lords and kingdoms to fight, serve or overthrow.

### Two layers of simulation
10,000 zones cannot all be simulated in full.
- **Near him** (his zone and its neighbours): the full game: bodies, senses, fights, deaths.
- **Everywhere else**: a ledger, ticked slowly: who owns which plot, who is at war, raids won and lost, crops and stores, crimes and bounties, births and deaths, all as numbers and events.
- When he walks into a zone, it is built from the ledger. When he leaves, it is folded back into it.
- This one choice keeps the living world (NPCs owning, stealing, killing) affordable, and it is also exactly what "work done while you are away" needs.

### Crime and karma
- **Karma** (global, slow): who he is. **Standing** (per culture, fast): what each people thinks of him.
- **Witnesses**: a crime nobody sees costs karma but raises no bounty; anyone who sees it (by the enemy plan's senses) spreads it to their culture. Masks hide who did it.
- **Bounties** per culture: guards attack on sight, bounty hunters come; bounties fade or are paid off.
- **Crimes**, lightest to worst: trespass, theft, assault, murder, taking a plot by murder, killing an elder or royalty.
- **Land taken by murder is contested**: held, not yet his. The victim's kin or village may raid to take it back; it settles after time with no witnesses left, or with blood money paid.
- **Karma reaches everything**: companions with honour refuse or leave, ruthless ones stay; villages refuse trade; outlaws and bandits deal with him; some executions could depend on it.
- NPCs commit crimes too, and have their own karma and bounties.

### Still open
- How a legal title passes (sale, grant, inheritance, a court, forgery?): the mechanic behind possession vs title.
- Answered above: single-player, real time while away, death and heirs.

## Wealth (proposed, for the owner to confirm)

The measure of power in this world is land and what it grows, the way feudal Japan counted it, not a single gold number.

### Money
| Money | What it is | Used for |
|---|---|---|
| **Mon** | copper coins with a square hole, strung in strings of 1,000 (a *kan*); already in the game | everyday: food, lodging, repairs, small bribes, wages |
| **Silver** (by weight, *monme*) | merchants' money | trade in bulk, buying goods between regions |
| **Gold ryō** | an oval gold coin, rare; 1 ryō = 1,000 mon to keep the sums simple | the big things: land, a master's blade, blood money, paying off a large bounty |
| **Koku** | a measure of rice: what one person eats in a year | the worth of land and the rank of a lord (a lord "of 10,000 koku"). Plots yield it, taxes are paid in it, armies eat it |
| **Glitch shards** | not money: the otherworldly currency already in the game | his skills and Qi, never traded with ordinary people |

### Where it comes from, and where it goes
- **In:** loot from the dead, bounties he collects, harvests and crafts from his plots, trade, contracts (escort, hunt, kill), tolls and taxes once he holds land, gambling.
- **Out:** food and lodging, companion wages, repairs, land bought, taxes to whoever rules above him, bribes, blood money and paying off bounties, shrine offerings, building on his land.
- Every money source needs a matching sink, or prices stop meaning anything within a few hours of play.

### Land is the real wealth
- Every plot has a **yield** in koku per season, set by its terrain (paddy best, field, then forest and rock yield other things: timber, ore) and by work done on it.
- A zone's yield is the sum of its plots; a lord's rank is the koku of everything he holds.
- **Taxes flow up:** a plot holder pays a share to the zone lord, a zone lord to the domain, a domain to the kingdom. Holding a zone means collecting from every plot in it that others work.
- **Land has a price** from its yield and place (safe, near a road or a village), and can be bought, sold, granted, lost in a raid, or taken (at a crime's cost).

### Prices move
- Each region's ledger keeps its own stock and prices: famine sends rice up, war sends weapons and armour up, a destroyed base makes land nearby cheap until it is settled.
- Merchants and caravans move goods between regions (the ronin can escort them, rob them, or run his own). A rival kingdom's blockade cuts trade.

### Keeping it
- Coins are carried, and carried coins can be lost: pickpockets, bandits, death (depending on the death rule, still open).
- A **storehouse** (*kura*) on his own land keeps wealth safe unless the land is raided; a **money-changer** in a town holds it for a fee.
- Colour is rank (owner, 2026-09-26): coloured clothing is rare and worth a fortune; a royal's red kimono is loot worth killing for, and wearing it has consequences.

### Answered (owner, 2026-09-26)
- Historical names: mon, ryō, koku. Carried money has weight. Death costs everything unless an heir carries on.
- **Hard times** (owner, 2026-09-26): about 40% of people are short of rice; lords take half the crop. The rest of the economy's open points were left to Claude ("you think of all this stuff"): see `docs/sim-economy.md`, *Decided*.

## People, work, quests and world events (proposed, for the owner to confirm)

All four run on the same ledger as ownership and wealth: the world keeps going whether or not he is there, and what he sees in a zone is that ledger made visible.

### NPCs are people with lives
- Every NPC is the same actor as the ronin (body, clothes by class and rank, personality, inventory, faction, karma, standing), plus:
  - **a job** (below), a **home** (a plot, a house, a barracks, a camp) and **a daily schedule**: work by day, eat, drink, sleep; guards change watch; bandits move at night.
  - **needs**: food, money, safety. A hungry village steals; a broke ronin turns bandit.
  - **relationships**: family, master and servant, friends, rivals, grudges. Kill a man and his brother remembers.
  - **an ambition**, for the ones who matter: a farmer wants more land, a retainer wants his lord's seat, a bandit chief wants a zone.
  - **memory** of the ronin: what they saw him do, what they heard.
- Most NPCs live only in the ledger until he walks into their zone. Named ones (lords, elders, rivals, companions) are always tracked in full.

### Jobs
- **NPC jobs** by class: farmer, fisher, woodcutter, miner, smith, merchant, innkeeper, monk, retainer, ashigaru, guard, magistrate, tax collector, courier, bandit, bounty hunter, shinobi, lord. A job decides where they go, what they carry, what they fight with, and what they produce into the ledger.
- **His jobs** (contracts): posted at inns, shrines and magistrates, or offered by NPCs who need something: escort a caravan, hunt a bandit, kill a man, guard a village through a raid, recover a stolen blade, collect a debt, carry a message through enemy land, win a duel for someone's honour.
- **His own work** on his land runs through the land session's plans and recipes; companions can be hired into any job he can give them.

### Quests: made by the world, plus a few written by hand
- **Most quests come from the ledger**, out of what is actually happening: a village is starving (bring rice or raid the lord's storehouse), a lord is dying and his two sons both want the seat (pick one), a bandit camp keeps raiding a road (clear it), a merchant was robbed (find who). Each one is real: ignore it and it plays out without him.
- **A few are written**: his own story as a ronin, each region's main tale, and named rivals who come back.
- **Every quest can be solved more than one way** (fight, stealth, bribe, betray), and each way moves karma, standing and money differently.

### World events
Events are the ledger's big moves, felt in every zone they reach:
- **Seasons and the calendar:** planting, harvest, festivals (Obon, the New Year), winter scarcity.
- **Nature:** typhoons, floods, drought, famine, plague, a comet, an earthquake.
- **Politics:** a lord dies and his sons fight; a kingdom declares war; a peasant uprising; a new tax; a royal procession passes (colour on the road: rare loot, and death to anyone who touches it).
- **Crime and order:** a famous bounty is posted; a bandit army gathers; a crackdown in a region he has made hostile.
- **The otherworld:** glitch storms, where reality tears (the ronin's own glitch powers are part of this world's secret); a shrine goes dark; the dead walk for a night.
- Events are announced in the world (a messenger, a notice board, smoke on the horizon, a bell) and on the world map, and they change prices, danger, standing and who owns what.

### Answered (owner, 2026-09-26)
- 90% of the story comes from the world; only the structure is written. Glitch storms are in, with no story behind the powers. NPCs age, marry and pass land to heirs.

## Engineering decisions (Claude's, unless the owner objects)
- **One actor for everyone**: the ronin, enemies, companions, villagers, lords and animals are the same entity: body (rig, clothes, weapon), personality, inventory, a brain (player, AI or orders), a faction, karma and standing.
- **Everything is data with stable IDs** (items, weapons, clothes, cultures, recipes, actions, executions), so saves and new content never break each other.
- **One recipe system** for crafting, land actions and companion tasks (owned by the land session).
- **Aim is a direction** internally, even while attacks are side on.
- **Fixed-tick simulation with a seeded random**, kept apart from drawing, so the ledger layer and a possible server later are both straightforward.
- **Performance**: only the ronin and nearby fighters are drawn live; everyone else uses pre-drawn frames per facing and outfit.
