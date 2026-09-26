# Karma, crime, bounties, title and possession (`src/sim/crime/`)

The crime lane on the simulation core (`docs/sim-core.md`). It follows the owner's decisions in `docs/foundations.md`: karma is shown to the player; raids take possession, never the legal title; NPCs steal, fight and kill each other; the world lives in real time while he is away. Everything runs in `onDay` or slower, so an absence is lived exactly as play is. Every number here lives in `src/sim/crime/rules.js`, and all of them are starting values to tune.

Import `src/sim/crime/index.js` once, before `generateWorld` or `loadWorld` (it registers the system). It re-exports everything below. The core's `src/sim/index.js` does not import it yet: that one line is for the integrator.

| File | What it gives |
|---|---|
| `rules.js` | `CRIMES`, `K` (law numbers), `LAND`, `WORLD` (off-screen rates), `KARMA_NAMES` / `karmaName`, `HONOUR`, `COMPANION`, `worse` |
| `law.js` | `commit` (any crime, anyone's), karma and standing (`addKarma`, `standingOf`, `addStanding`), bounties (`addBounty`, `bountyOf`, `bountiesOf`, `payOff`, `penance`), `onSight`, `outlawDoors`, `honourOf`, `companionVerdict`, `kill`, `isElderOrRoyal`, money (`purse`, `spend`, `give`) |
| `land.js` | `seize`, `takePlotByMurder`, `restore`, `passTitle`, `buyTitle`, `priceOf`, `payBloodMoney`, `petitionGrant`, `courtCase`, `forgeDeed`, `claimantOf`, `heirOf`, `plotRec`, `landSeason` |
| `world.js` | the world without him: NPC thefts, assaults, murders, feuds, land murders, bandit raids, magistrates catching; hunters sent after him |
| `index.js` | `system({ id: 'crime', order: 60, init, onDay, onSeason })` |

`node scripts/sim-crime.mjs [seed] [years]` lives a world for 10 years and prints crimes by kind, bounties, and land that changed hands by force vs by title; it checks the rules and the cost and exits 1 if one fails. Prototype 39 (`prototypes/39-crime.html`, sources in `prototypes-src/39-crime/`) lets you commit his crimes by hand.

## Karma and standing

- **Karma** `actor.karma`: −100..100, 0 at birth. Who he is: global and slow. Every crime costs it whether or not anyone saw. It never drifts on its own; only deeds move it (today: crimes down, shrine pay-offs and penance up). Shown to the player with a name: saint ≥ 60, honourable ≥ 25, wanderer ≥ −25, outlaw ≥ −60, demon below.
- **Standing** `actor.standing[cultureId]`: −1..1. What that people thinks of him: fast. Only a crime a witness of that culture saw moves it. An entry that is missing reads as the baseline his karma sets (karma ÷ 200, so a demon starts every people at −0.5). Each entry slides back toward that baseline by 2% of the gap a day (`K.STANDING_DRIFT`), and is deleted once within 0.005 of it.
- For his crimes, peoples close to the victim's (relation ≥ 0.5) also lose 30% of the standing hit, and the victim's enemies (≤ −0.5) think 20% better of him. NPC crimes stay with the witnesses' people, to keep the world cheap.
- Everyone has both, NPCs included: NPC crimes cost NPC karma and standing the same way.

## A crime

`commit(L, kind, { by, victim?, zone, witnesses, masked, value, victimSaw, provoked, culture, plot })`. The same call for his crimes (the live game passes who its senses say saw it, `docs/enemy-behavior.md` section 3) and for NPC crimes off screen.

| Crime (light to worst) | Karma | Bounty (mon) | Standing | Bounty fades a day |
|---|---|---|---|---|
| trespass | −1 | 20 | −0.03 | 5% |
| theft | −3 | 60 + half of what was taken | −0.08 | 2% |
| forgery (a deed; new, proposed) | −4 | 300 | −0.1 | 1% |
| assault | −6 | 150 | −0.15 | 1.2% |
| murder | −15 | 1,000 (1 ryō) | −0.35 | 0.4% (half in about 170 days) |
| plotMurder: taking a plot by murder | −25 | 3,000 | −0.5 | 0.3% |
| regicide: killing an elder or royalty | −35 | 10,000 | −0.8 | never, and never paid off |

Rules, in order:
1. **Self-defence** (`provoked`) is no crime.
2. **Killing an elder or royalty**: a killing whose victim is royal (class `royal`, or his region's lord) or 60 or older becomes `regicide`.
3. **Witnesses** are the living people passed in, never the doer. The victim of a crime he survives saw it (a theft only when `victimSaw`). A murder victim tells no one.
4. **Justice**: a culture that already has a bounty on the victim does not count the crime. If every culture that saw it wants the victim, or nobody saw it and the victim was wanted for 150 mon or more anywhere, karma costs only 30%.
5. **Monsters**: killing someone of karma −40 or less costs half the karma.
6. **Karma** is paid always.
7. **Unseen**: no bounty, no standing. **Masked**: seen, known to have happened, but the bounty and standing land on nobody.
8. **Known**: each witnessing culture raises its bounty on him by the crime's bounty and lowers its standing by the crime's hit.
9. A theft moves the money (`value`, capped at what the victim carries). A killing marks the victim dead (`alive: false`, `died`, `cause: 'murder'`).

## Bounties

- Per culture, on anyone: `L.sys.crime.bounty[actorId][cultureId] = { mon, worst, h }`. `worst` is the worst crime in it, and sets how fast it fades.
- **Fading**: his fade every day; everyone else's every 28 days, compounded (the same rate, cheaper). Under 5 mon it is gone.
- **Paying off** (`payOff`): at a magistrate, the bounty itself, and that people's standing +0.1; at a shrine, 1.5 times the bounty, and karma +2. A regicide is never paid off.
- **Penance** (`penance`): an offering without a bounty, 100 mon a point of karma, at most 5 points a season.
- **Guards** (`onSight(L, culture, id)`): `attack` on sight at a bounty of 500 or standing ≤ −0.6; `arrest` (stop him and demand the bounty) at any bounty; `wary` (watch him, refuse trade) at standing ≤ −0.3.
- **Hunters**: while his bounty with a people is 500 or more, each day there is a chance of mon ÷ 20,000 (at most 20%) that it sends one: a bounty hunter of that people, else a ronin, else a fighting man. At most three at once, one per people. A hunter walks one zone a day from a seat of that people toward `actor.at`; on reaching his zone the event `crime.hunterFound` fires (the live game spawns him there). A hunter gives up after 112 days, when the bounty falls under 200, or when either dies.

## What his karma opens and closes

- **Outlaws** (`outlawDoors`): bandits trade with him at karma ≤ −20, take him in at ≤ −40, and are his enemies at ≥ 20.
- **Companions** (`companionVerdict(L, companion, leader, joining)`): a companion's honour (−1..1) is the sum of his traits' `HONOUR` weights times their strength, plus his own karma ÷ 100. He leaves a leader whose karma falls below −60 + honour × 50 (the most honourable at −10; the ruthless never), and refuses to join 10 points sooner. The party lane decides when to ask.
- **Villages** of a people that wants him refuse him (`onSight` returns `arrest` or `wary`); the economy lane reads it.

## Land: possession and title

`L.plots[pid] = { title, holder }` (the core's record; `ownerOf` reads it). **Holder** is possession, **title** is ownership on paper. Force moves only the holder. The title moves only by a lawful mechanic.

Fields added by this lane:
- `actor.holds` (the core's field) is kept as possession: the plots he holds.
- `actor.claims`: plots whose title he has while someone else holds them.
- `actor.cause`: why a person died, when a crime or an execution killed him (`'murder'`, `'executed'`).
- `L.sys.crime.contested[pid] = { title, holder, from, since, how, crime, witnesses }`: land held by someone who has not the title. `how`: `murder`, `raid`, `force`, `kin`, `lord`, `court` or `title`. Up to five witnesses of the taking are remembered.
- `L.sys.crime.forged[pid] = { real, forger, h }`: a title that rests on a forged deed.

By force:
- `seize(L, pid, by, { how, crime, witnesses })`: the holder changes; if the new holder is not the title holder the plot is contested.
- `takePlotByMurder(L, killer, victim, pid, o)`: one crime (`plotMurder`, or `regicide`) and the seizure.
- **Raids back**: each season a contested plot whose claimant is alive is raided back by his kin with a 12% chance, 22% when the region's lord helps (he helps against a holder his people want for 500 mon or more, or against an outlaw). His land is raided back the same way while he is away.

**The title mechanic (proposal for the owner).** Seven ways, all built so they can be tried in prototype 39:

| Way | Rule | In play |
|---|---|---|
| **Sale** | whoever can claim the title sells it. 2,000 mon; 40% of that when someone else holds the land (the seller cannot use it). A seller will not sell to a man his people want | `buyTitle`; NPC holders with the money buy out 5% of seasons |
| **Blood money** | on land taken by murder: 1,000 mon to the dead man's heir buys the title and ends his kin's claim | `payBloodMoney`; NPCs 4% of seasons |
| **Grant** | the region's lord grants a plot nobody alive can claim to a holder his people think well of (standing ≥ 0.3) and who is not wanted | `petitionGrant`; NPCs 25% of seasons |
| **Inheritance** | the dead title holder's heir takes the title: living children eldest first, the spouse, a brother or sister, the household head | each season on contested land (the people lane owns inheritance everywhere else) |
| **Court** | the claimant sues. With a living witness of the taking, the court gives the land back. With none left and the land held 3 years, the court confirms the holder and gives him the title | `courtCase`; each contested plot 10% of seasons |
| **Time** (prescription) | held 3 years with nobody alive to claim it: the title passes to the holder | each season |
| **Forged deed** | a crime (−4 karma; a bounty only if someone watched him forge it). The title moves on paper; each season while the real claimant or his heir lives there is a 15% chance it comes out: the title goes back and his people put the forgery bounty on him | `forgeDeed`; NPC holders of low karma 2% of seasons |

Contested land means: the claimant's kin may raid it back, his lord may help, the claimant may sue, and while the dispute stands the holder has the land but not the right to it (the land lane decides what a holder may do there: work it, yes; sell it, no).

## The world without him (`world.js`)

Once a game day, per region (rates are for a region of 70 people, scaled by its population and its culture kind: bandits 2, merchants 1.3, rebels 1.2, shinobi 1.1, clans and miners 1, fishers 0.8, courts 0.7, temples 0.4):

| What | Chance a day |
|---|---|
| theft (10–40% of the victim's coins) | 5.5% |
| assault | 2% |
| murder | 0.2% |
| a man murders a neighbour for his plot | 0.05% |
| the region's lord is murdered | 0.003% (not scaled) |
| a feud starts between two households | 0.4% |

- **Who does it**: of three people picked at random, the one most given to crime: outlaws ×3, shinobi ×1.5, low karma, a thin purse, little honour.
- **Who saw**: people of the zone, by the place (town 80%, village 60%, fort 90%, shrine 50%, camp 30%, the wild 15%), halved at night; one to three of them. Outlaws wear a mask half the time, shinobi 60%, anyone else 8%.
- **Feuds**: each day a feud flares with a 3% chance: an assault, or (10%) a murder. A murder passes the feud to the dead man's grown child or spouse (kill a man and his brother remembers). A feud cools by 0.01 a day and ends at 0.
- **Bandit raids**: each camp raids a town or village within 10 zones with a 1% chance a day: the chief robs one to three households of 20–40% of their coins, each victim is killed with a 10% chance, and 5% of raids seize a victim's plot for the chief (possession only).
- **Magistrates**: once a week, each wanted NPC is caught with a chance of 0.4% a day (0.8% if he lives among the people who want him; a camp chief a third as often). A killer (murder or worse) is executed 70% of the time; anyone else pays the bounty as a fine, as far as his purse goes, and is free.
- **The dead**: `kill` marks a death; the people lane handles what follows (heirs, graves). A holder who dies ends his contested record; his land then follows the people lane's inheritance.

Cost: seed 12345, 10 years, about 0.55 ms a game day on average in Node (the budget is 1 ms). The people index (who lives in which region and zone) is a cache rebuilt once a game year, never saved.

A typical 10 years (seed 12345): about 7,000 thefts, 3,000 assaults, 450 murders, 40 plots taken by murder, 30 elders or royals killed, 900 raids, 400 feuds; two thirds of crimes seen; about 3,000 caught (120 executed); 80 to 90 plots seized by force, about 60 retaken; titles passed mostly by inheritance, then forgery (each one exposed), prescription and now and then a sale. NPC holders are rarely rich or well enough thought of to buy, pay blood money or be granted land: those ways are mostly his.

## Events

Every event carries `h` (the game hour). Names are `crime.*`.

| Event | Data | When |
|---|---|---|
| `crime.committed` | `crime, kind, actor (null if masked), victim, zone, known: [cultures], masked, witnesses (count)` | any crime someone saw, and every crime of his or against him. An NPC crime nobody saw only counts in the stats |
| `crime.bounty` | `actor, culture, mon, worst` | a bounty on him rises, or anyone's reaches 1,000 |
| `crime.bountyFaded` | `actor, culture` | his bounty faded to nothing |
| `crime.bountyPaid` | `actor, culture, mon, where` | paid off at a magistrate or shrine |
| `crime.penance` | `actor, karma` | karma bought back at a shrine |
| `crime.caught` / `crime.executed` | `actor, culture, worst, fine?, zone` | a magistrate caught a wanted NPC |
| `crime.feud` | `actor, victim, region` | a feud starts |
| `crime.raid` | `actor (chief), zone, from, victims, culture` | bandits raid a settlement |
| `crime.seized` | `plot, actor, from, title, how, zone` | possession taken by force |
| `crime.retaken` | `plot, actor, from, how, zone` | possession back (kin, lord, court) |
| `crime.title` | `plot, actor, from, how, zone` | the title passed (sale, bloodMoney, grant, inheritance, court, prescription, forgery, exposed) |
| `crime.court` | `plot, actor, won` | a court case decided |
| `crime.forgeryExposed` | `plot, actor (forger), to` | a forged deed came out |
| `crime.hunterSent` / `crime.hunterFound` / `crime.hunterGone` | `actor (hunter), target, culture?, mon?, zone?` | the hunt for him |

## State (`L.sys.crime`)

`{ bounty, contested, forged, feuds: [{ a, b, region, heat, since }], hunters: [{ id, actor, target, culture, at, since, found }], recent: [the last 300 crimes], stood: { actorId: 1 } (whose standing differs from the baseline), penance: { actorId: { season, got } }, stats }`. A crime record: `{ id, h, kind, by, victim, zone, known, seen (cultures that saw), masked, witnesses (up to 5), taken, plot, culture }`. `stats`: crimes by kind; known, unseen, masked, justice; bounties raised, paid, faded; caught, fined, executed; raids, feuds, hunters; land seized, retaken, and titles passed by way.

## Questions for the owner

1. **The title mechanic.** Are these the right seven ways (sale, blood money, grant, inheritance, court, time, forged deed)? Should any go? The numbers: 3 years of possession for time and for the court, 2,000 mon a title, 1,000 blood money.
2. **Blood money.** Should it also clear the murder's bounty with the victim's people, or only buy the land and end the kin's claim, as now?
3. **Paying off.** Magistrate at the bounty's price, shrine at 1.5× with a little karma back. Should a shrine be able to clear a bounty at all, or only karma?
4. **Can karma be bought back?** Penance buys at most 5 karma a season. Or should karma rise only by deeds (helping, protecting, sparing)?
5. **Elders.** Is anyone 60 or older an elder, or only a village's head? Should killing royalty ever be forgiven?
6. **Masks.** A masked crime puts nothing on him. Should a witness close by have a chance to see through it, or should a mask itself be a crime for guards?
7. **Karma's reach.** Standing drifts back to karma ÷ 200: should low karma alone make peoples wary of him even without a crime seen?
8. **NPC crime level.** About 1% of the people die by the sword each year, and one in two is below 0 karma after 10 years. Is that the right amount of violence for the world?
