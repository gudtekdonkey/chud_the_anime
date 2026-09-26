# The economy (`src/sim/economy/`)

The economy lane of the simulation core (`docs/sim-core.md`): money with weight, land that yields koku, taxes up the ladder, a market in every region, caravans on the roads, and every person's purse earning and spending by job and class. It is one system, `system({ id: 'economy', order: 40 })`, with all its state in `L.sys.economy`, and it runs only in `onDay`, `onSeason` and `onYear`, so a long absence is lived exactly as if he had stayed (checked: see *Testing*).

Owner decisions it follows (2026-09-26): hard times, about 40% of people short of rice (below); the historical names (mon, silver by the monme, gold ryō at 1 ryō = 1,000 mon, koku); carried money has weight (move it, store it in a kura, or bank it with a money-changer for a fee); real time while away; colour is rank, so coloured cloth is rare and dear. Glitch shards are otherworldly and never traded: the economy never touches them.

- `node scripts/sim-economy.mjs [seed] [years]` lives a world for years (10 by default) and prints prices each season, the books each year (money in, money out, unexplained), wealth by class, the top lords, the events and the speed; it also checks determinism, and exits non-zero if money appears or vanishes unaccounted.
- `prototypes/37-economy.html` (sources in `prototypes-src/37-economy/`) shows it living: prices over time, a region's market, its lord's koku and taxes, caravans on the map, the ronin's purse and its weight.

## Files

| File | What it holds |
|---|---|
| `tune.js` | Every number to tune (below) |
| `money.js` | `worth`, `weightOf`, `burden`, `pay` (copper first, change in copper), `changeUp`, `coins`, `takeCoins`, `fmt` |
| `setup.js` | `initEconomy` (markets, lords, pantries, trade routes), `plotKoku`, `zoneLord`, `rankLords`, the household index (derived, never saved), `moneySupply` |
| `day.js` | A region's step: producers, lords, stipends and pools (`prep`), every household (`household`), the market's books and prices (`close`) |
| `season.js` | The autumn harvest, taxes and ranks; each season's upkeep and price history |
| `trade.js` | Caravans: set out, march, get robbed, arrive |
| `vault.js` | The API for the ronin (and anyone): loot, buy, sell, transfer, offer, the money-changer, the kura, robbing and escorting caravans |
| `index.js` | Registers the system, the year's books, `war`, `garmentPrice`, read-outs for pages |

Import it once (`import './src/sim/economy/index.js'`) before `generateWorld` or `loadWorld`; the core does not import lanes. The integrator adds it to the game's boot.

## How it works

### Money and its weight
A purse is `{ mon, silver, ryo }` (the core's `actor.money`). Worth: 1 mon, 16 mon a monme of silver, 1,000 mon a ryō. Weight: 3.75 g a mon, 3.75 g a monme, 18 g a ryō: a kan (1,000 mon of copper) weighs 3.75 kg; the same worth in gold, 18 g. `burden(purse)` gives the tier the game applies to him (`LOAD`): light (under 2 kg, about 530 mon of copper), laden (to 6 kg: slower, pickpockets notice), heavy (to 12 kg: no slide or jump), overloaded. He cannot pick up coin past `MAX_CARRY_KG`. NPCs change copper up into gold past `CHANGE_UP`, so their fortunes weigh what they should.

A fortune has three places to be: carried; in a **kura** on a plot he holds (free, safe until the plot is raided: `raidKura`); or with the **money-changer** (ryōgae) in any region's seat town (1% to deposit, ½% a season to hold, 2% to change coin). Fees go to that town's merchant guild.

### Land, harvest and taxes
Each plot has a yield in koku a year (`plotKoku`): estimated from its zone's biome and the settlement ring of field or paddy (the same ground `zone.js` makes, without making the tiles), ±15% by plot. Paddy is best. The land lane can set a plot's yield in `L.sys.economy.plotKoku[plotId]` (cleared, irrigated, ruined).

The harvest comes once a year, at the start of autumn. Each region rolls its weather (`HARVEST`: usually 0.85 to 1.15; a drought 6% of years, `econ.drought`; a bumper year 6%). Each town and village is worked by its adult farmers, two plots each, best land first, households' own plots before the lord's:
- a household's own plot: it pays the zone lord the plot tax (half the crop, lighter in free valleys and merchant leagues, none under outlaws: `TAX_KIND`); what its own farmers worked is its own; the rest was worked by the village's farmers as tenants, who keep half of it;
- the lord's plots (and absent holders', the ronin's included): worked by tenants, who keep half; the holder gets the rest (less tax if he is not the zone lord);
- the tenants' share goes to the households whose farmers did the work.

The ladder: **plot holder → zone lord → region lord**. The zone lord is `zone.lord` if a lane sets it, a camp's chief for a camp, else the region's lord. A zone lord under the region lord sends up `TAX.zone` of what he collected. Taxes are paid in rice into the lord's granary, which he sells through the year to pay his men. There is no level above the region lord yet (domains and kingdoms come with the land and world lanes).

**Rank** (`lords[id].koku`) is the yield of every plot in the zones a lord holds, plus plots he holds elsewhere: the way a lord was called "of 10,000 koku". This world is small (about 67 people a region), so region lords run from about 100 to 500 koku.

Households keep rice in a **pantry** (`pantry[householdKey]`) for the days to the next harvest (× `KEEP_DAYS`) and sell the rest to the market over two weeks. Stored rice rots about 15% a year wherever it is.

### Markets and prices
Every region has one market: a stock and a price for each good, and a merchant **guild** with cash. The price moves toward `base × (target stock / stock)^eps`, clamped to ¼× … 8× base, where the target is `days` of recent demand. So a famine (little rice) sends rice up, a war (armies buying) sends weapons and horses up, a glut sends prices down.

**Producers** (fishers, woodcutters, miners, smiths, weavers, brewers; farmers breed a few horses) add what they make to the stock each step, less where the stock is past its cap (it spoils where it was made). They are paid from what their goods actually sold for over the last step, less the guild's cut (`GUILD_CUT`), shared by what each trade can make there; goods their region sold abroad by caravan pay them too. A smith pays for his iron, a brewer for his rice, out of his takings. So a trade with too many hands for its demand earns little, and a scarce one earns well.

**Rice** is bought outright by the guild from lords' granaries and farms' spare, up to `RICE_HOLD × target`, and it may go into debt to do so (rice bills, `RICE_CREDIT` a head).

**Other work**: soldiers and officials are paid stipends by the region lord, set aside from his purse at the start of each step (short, they are paid less and `econ.unpaid` fires); innkeepers, carpenters, couriers and healers share what households spend on service; monks draw on the temple's offerings; merchants take a share of what the guild holds past what it owes and a float; hired ronin guard caravans; bandits, smugglers and thieves take from the guild, and outlaw households who cannot pay for rice take it (`regions[r].stolen`).

**Households** (the head's purse holds the family's money; others' savings are drawn on when it runs low) earn by their members' jobs and spend in order: rice (from the pantry first), then needs (fish, salt, cloth, firewood and timber, tools, iron), then a share (`SPEND`) of their wealth above a class reserve, split by the class's taste (`TASTE`): sake, cloth, weapons, horses, service, offerings. Children eat half. Only royalty buy coloured silk. A household short of rice gets the temple's alms while its offerings last (`ALMS`); otherwise it goes hungry (`regions[r].hungry`).

### Caravans
The roads between region seats are found once (`routes`: `{ a, b, path: [zone index…] }`). Every `CARAVAN.every` days each road is weighed both ways: the good whose price at the far end beats the price at home by more than the haul costs (1.2% a zone) and the guild's cut sets out, `CARAVAN.value` of it, owned by one of the region's merchants, guarded half the time where ronin are for hire. A caravan marches `speed` zones a day; within `near` zones of an outlaw camp it may be robbed (`econ.caravan.robbed`: the goods go to the camp's region, its chief gets half their worth). On arrival the far guild buys the load at its price, and most of that is owed to the makers back home.

### Wealth sources and sinks
Money is conserved: every flow above moves coin from one purse, guild, pool, temple or vault to another, checked day by day by the test (it never drifts more than a few mon a year, from rounding). Only these make or unmake it:

| In (sources) | Out (sinks) |
|---|---|
| **The mint**: lords of mining land coin copper, `MINT` a miner a day (≈ 40,000 mon a year) | **The gods**: a share of temple offerings a day, `TEMPLE_SINK` (gold leaf, bronze, incense) |
| **Loot** from outside the ledger: `give(L, id, coins)` (a chest, enemies that are not ledger people) | **Buried and lost coin**: households past `HOARD_OVER` × their reserve lose `HOARD` of the excess a season. It is recorded by region (`regions[r].buried`): the quests can dig hoards back up |

Both sinks grow with wealth, so the money supply settles where the mint balances them: in the tests, about 3.8 million mon across the world, moving under 0.3% a year. Goods have their own sinks: food eaten, rot, spoilage past a market's cap.

## State (`L.sys.economy`)

| Field | What it is |
|---|---|
| `v` | 1, this state's version |
| `regions[r]` | one per region: `stock`, `price`, `dem` (demand a day, remembered), `fill` (share of demand the stock met), `made`, `sold` (a day, remembered), `owe` (owed to producers next step), `imp`, `exp` (caravan goods in; proceeds of goods out, this step), all arrays in `GOODS` order; `land` (0..1 by good: how well the region's ground suits it), `pop`, `guild` (cash, may dip below 0 on rice credit), `temple` (offerings), `pool: { service, guild }` (owed to service workers and merchants next step), `buried`, `q` (this year's harvest weather), `crop`, `tax` (last harvest, koku), `war` (hour it ends), `famine`, `unpaid`, `unpaidAt`, `hungry`, `stolen`, `alms` |
| `lords[actorId]` | `{ region, koku (rank), granary, taxIn, taxOut, paid }` for region lords, zone lords and the ronin once he holds land |
| `pantry[householdKey]` | koku of rice a household holds (key: the head's id, as `actor.household`) |
| `routes` | `{ a, b, path }`: roads between seats |
| `caravans` | `{ id, route, dir, step, from, to, g, qty, cost, owner, guard }` on the road |
| `kura[plotId]` | `{ owner, money }` |
| `banks["x,y"][actorId]` | a money-changer's book: coins held |
| `plotKoku[plotId]` | yield overrides (land lane) |
| `flow` | this year's `mint`, `loot`, `temple`, `buried`, `fees`, `other` |
| `years` | the last 20 years' books `{ year, total, purses, guild, temple, buried, mint, loot, fees, other, caravans, rice }` |
| `hist` | the last `HISTORY` seasons' prices `{ h, price: [region][good] }` |
| `stats.year` | this year's caravans `{ sent, arrived, robbed, value }` |
| `nextCaravan` | the next caravan id |

**Fields read from others, never renamed**: `actor.money` (it adds `silver`/`ryo` as 0 where missing), `actor.alive/born/job/cls/home/household/holds`, `region.lord`, `region.seat`, `zone.kind/road/region/holder`, `L.plots`. **Proposed for other lanes**: `zone.lord` (a zone lord below the region lord; the land lane sets it).

Nothing is added to actors. The economy works by region and settles each region in turn: one region in `SETTLE` each day, `SETTLE` days at a time (every rate is per day, compounded over the step), so a day costs a fraction of the world. The household index (who lives with whom, who works what) is derived from `L.actors`, built as of the start of each year and whenever people are added, and never saved; the dead are skipped where they stand, and a move or a marriage takes effect at the next build.

## Events

| Event | Data | When |
|---|---|---|
| `econ.harvest` | `region, zone, koku, tax, lord, q` | each region, each autumn |
| `econ.drought` | `region, zone, q` | a poor harvest |
| `econ.famine` / `econ.famine.end` | `region, zone, price` | the market has rice for under `FAMINE_DAYS` days / over `FAMINE_END_DAYS` |
| `econ.unpaid` | `region, lord, zone, share` | a lord cannot pay his men in full (at most once a season a region) |
| `econ.war` | `region, zone, until` | `war(L, region, days)` was called |
| `econ.caravan.robbed` | `caravan, zone, region, from, to, good, qty, value, by, owner` | outlaws (or `robCaravan`) took a caravan |
| `econ.kura.raided` | `plot, owner, by, value` | `raidKura` emptied a storehouse |
| `econ.deposit` / `econ.withdraw` | `actor, zone, value` | the money-changer |
| `econ.note` | `actor, from, to, value` | a changer's note sent money to another town |
| `econ.transfer` | `from, to, value, why` | a transfer of a ryō or more |
| `econ.year` | `year, total, mint, sinks` | the year's books closed |

## API (import from `src/sim/economy/index.js`)

- Money: `worth(purse)`, `weightOf(purse)` (kg), `burden(purse)` → `{ kg, name, speed, dodge, theft }`, `pay(purse, mon)`, `coins(mon)`, `fmt(mon)`.
- Markets: `priceOf(L, region, good)`, `regionMarket(L, region)`, `buy(L, id, region, good, qty)`, `sell(L, id, region, good, qty)`, `garmentPrice(L, region, 'kimono' | 'haori' | 'obi')`.
- People: `give(L, id, coins, 'loot')` (coin from outside the ledger), `transfer(L, from, to, mon, why)`, `offer(L, id, region, mon)`.
- The changer: `isChanger(L, x, y)`, `deposit`, `withdraw`, `exchange(L, id, x, y, from, n, to)`, `sendNote(L, id, [x, y], [x2, y2], coins)` (draw it in another town, 3%), `accounts(L, id)`.
- The kura: `stash(L, id, plotId, coins)`, `unstash`, `raidKura(L, plotId, by)`.
- Caravans: `caravanZone(L, caravan)`, `robCaravan(L, id, caravanId)`, `escortCaravan(L, id, caravanId)`.
- Land: `plotKoku(L, zx, zy, n)`, `zoneLord(L, zone)`, `lordOf(L, id)`, `daysToHarvest(cal)`.
- Shocks: `war(L, region, days)`, `atWar(L, region)`.
- Read-outs: `moneySupply(L)`, `wealthByClass(L)`, `economyIndex(L)`.

The game's HUD `INV.mon` is a separate counter today; wiring it to the ronin's `actor.money` (and `burden` to his movement) is the integrator's.

## Numbers to tune (`tune.js`)

| Number | Now | What moving it does |
|---|---|---|
| `COIN` worth, grams | 1 / 16 / 1,000 mon; 3.75 / 3.75 / 18 g | the coins; ryō fixed by the owner |
| `LOAD`, `MAX_CARRY_KG` | 2 / 6 / 12 kg; 20 kg | how soon coin slows him |
| `BANK` | 1% deposit, ½% a season, 2% exchange, 3% a note to another town | the price of safety |
| `CHANGE_UP` | 3,000 mon | when NPCs change copper into gold |
| `GOOD[g].base` | rice 1,000 a koku, fish 40, salt 300, sake 120, timber 100, iron 50, cloth 250, silk 8,000, weapons 2,500, horses 4,000, tools 60 | the price level of each good |
| `GOOD[g].days`, `eps`, `rot`, `cap` | per good | how much stock a market wants, how hard price answers, spoilage, the glut cap |
| `PRICE_MIN/MAX`, `PRICE_EASE` | ¼× … 8×, 0.2 a day | how wild prices get and how fast they move |
| `GUILD_CUT`, `GUILD_FLOAT`, `MERCH_SHARE` | 15%, 30 a head, 3% a day | merchants' margin and pay |
| `GUILD_SPEND`, `RICE_CREDIT`, `RICE_HOLD` | 20% a day, 150 a head, 1.5× target | how freely guilds buy rice |
| `GUILD_START` | 150 mon a head | the guilds' starting cash |
| `SETTLE` | 14 days | the step; cost ∝ 1/SETTLE; longer steps react slower |
| `NEED`, `CHILD` | rice 1/112 koku, fish .02, salt .0012, cloth .004, timber .01, tools .012, iron .004 a day; a child half | the cost of living |
| `JOBS` make / use / wage / take | per job | what each trade makes, stipends, robbers' take |
| `SPEND`, `RESERVE`, `TASTE` | 4% a day above the reserve; reserves by class; tastes by class | how fast money circulates, and where it goes |
| `TEMPLE_SHARE`, `TEMPLE_SINK`, `ALMS` | 6% a day, 0.2% a day, 5% a step | monks' pay, the gods' sink, charity |
| `HOARD`, `HOARD_OVER` | ½% a season past 4× reserve | the buried-coin sink |
| `MINT` | 2 mon a miner a day | the money source; with the sinks, sets the money supply |
| `KOKU_TILE`, `PLOTS_PER_FARMER` | paddy .033, field .019, grass .002 koku a tile a year; 2 plots | the crop (now about 0.9 koku a person a year): the main lever on hunger |
| `TAX`, `TAX_KIND`, `TENANT_SHARE`, `KEEP_DAYS` | half (free valleys 30%, leagues and temples 40%, outlaws none); zone 30%; tenants half; 1.15 | who gets the rice |
| `HARVEST` | weather 0.85–1.15; drought 6% (0.3–0.6); bumper 6% (1.25–1.4) | how often famines come |
| `FAMINE_DAYS`, `FAMINE_END_DAYS` | 5, 20 | when a famine is declared and ends |
| `WAR_RICE`, `WAR_ARMS` | ×1.25 rice; .004 blades and .0015 horses a fighter a day | how hard war bites |
| `CARAVAN` | a road weighed weekly; 30,000 mon a load; 15% least gain; 1.2% a zone; 4 zones a day; 3 out at once; 6% robbed a day near a camp, a third of that guarded | trade and banditry |
| `HISTORY` | 8 seasons | price history kept |

## Where it stands (seeds 12345, 777 and 4242, 10 years each)

- **Hard times** (owner, 2026-09-26: "40 percent short of rice … it's hard times"): about 41% of people are short of rice on an average day on all three seeds. The crop is about 0.9 koku a person a year against 1 eaten, and lords take half. Rice runs near its base price after the harvest and 3.5–4× by late winter, when a third of the regions are in famine. Outlaws take rice they cannot pay for; temples give a little alms.
- **Money**: 3.6 to 3.9 million mon, moving under 2.5% over 10 years. A year mints about 40,000; temples take about 25,000, buried coin about 15,000. Unaccounted: a few mon a year (rounding).
- **Speed**: under 1 ms a day on average (about 2 ms in the first year while the code warms up, about 0.8 after). The economy adds about 200 KB to a save.
- Other prices stay near where they were: fish 2–3× base inland, salt 1–2×, sake 2–2.5×, tools 2–3.5×, weapons and horses 1–1.5× (war pushes them up).

## Decided (owner, 2026-09-26: "you think of all this stuff")

1. **Hunger**: about 40% short of rice. Hard times. The knobs are `KOKU_TILE`, `TAX` and `ALMS`.
2. **Loot**: a samurai killed in a zone should carry a day or two of a labourer's pay, 20–60 mon; a lord's retainer a few hundred; a chest or a boss a ryō or more. Given through `give(L, id, coins)`, counted as loot.
3. **Weight**: stays as built: light to 2 kg (about 530 mon of copper), laden to 6 kg, no slide or jump past 12 kg, nothing more past 20 kg.
4. **Rank**: lords' koku shown as they are (about 100 to 500 koku a region lord); a kingdom of merged domains will count in thousands.
5. **Changer's notes**: built (`sendNote`): money left in one seat town can be sent to another's book for 3%.
6. **When he is a lord**: he sets his own tax rate and his men's pay (the land lane's screen; the economy reads a holder's rate once that exists).
7. **Coloured silk**: selling it is a hook for the crime lane (a fence, suspicion); wearing it changes how people treat him (the people lane). The economy only prices it: a coloured kimono is about 14 ryō.
