# Foundations: the world, its land and who owns it

Decisions that everything else builds on. Owner answers are marked with the date; the rest are Claude's proposals, open until the owner confirms them. Every session reads this before building anything about the world, land, ownership, companions or NPCs.

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
- Karma: hidden, shaping consequences only, or shown and steered toward good or evil?
- Single-player, or an online world with other players owning land?
- Does game time run while you are away (real-time clock), or only on return?
- What death costs (items, land, companions), and whether land can be lost in raids.
- Platforms: browser, desktop (Steam), phone, gamepad.

## Engineering decisions (Claude's, unless the owner objects)
- **One actor for everyone**: the ronin, enemies, companions, villagers, lords and animals are the same entity: body (rig, clothes, weapon), personality, inventory, a brain (player, AI or orders), a faction, karma and standing.
- **Everything is data with stable IDs** (items, weapons, clothes, cultures, recipes, actions, executions), so saves and new content never break each other.
- **One recipe system** for crafting, land actions and companion tasks (owned by the land session).
- **Aim is a direction** internally, even while attacks are side on.
- **Fixed-tick simulation with a seeded random**, kept apart from drawing, so the ledger layer and a possible server later are both straightforward.
- **Performance**: only the ronin and nearby fighters are drawn live; everyone else uses pre-drawn frames per facing and outfit.
