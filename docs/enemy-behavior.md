# Enemy behaviour: the plan

A proposal for how enemies think, move, fight and live in the world. Nothing here is built yet except what "Today" says. Every number is a starting value to tune in play.

## Today

- Seven topknot samurai stand in guard. They turn toward the ronin a beat late, in eight facings (the port system).
- They take hits: health 4, flinch, stagger on a heavy blow or a second hit within 0.5 s, the deaths pass, blood.
- K executes a lone enemy in reach (the isolation bubbles). Clearing the room brings a new squad after about 3 s.
- They do not move, attack, see, hear or talk to each other.
- The counters prototype (`23-counters.html`) already defines 14 enemy attacks, each with a tell, and the ronin's answer to each.

## 1. What an enemy is

Every enemy is data. Nothing about a type lives in code branches.

- **Body:** the shared rig, a palette, clothes (the wardrobe), a weapon (the weapon system). The samurai already share his rig, so any clothing and weapon works on them.
- **Stats:** health, poise (how much it takes to stagger him), walk and run speed, reach, turn speed, sight range and angle, hearing range.
- **Tier:** minion, elite or boss (`rules.js` already gates executions by tier).
- **Archetype:** how he fights: his attacks, how he spaces, what he does when hurt (section 5).
- **Culture:** where he is from: clothes, weapons, who he hates (section 7).
- **Personality:** the traits already built for idle, walk and run, plus behaviour knobs (section 6).

## 2. The brain: one state machine for every enemy

States, in the order a fight usually goes:

1. **Idle / Post:** stands, sits, patrols a route or loiters by a fire. Personality picks which (a lazy one sits).
2. **Suspicious:** heard or half-saw something. Turns to it, walks toward it slowly, a "?" beat. Gives up after a few seconds and goes back.
3. **Alert / Search:** knows the ronin is here but not where. Blade out, moves to the last known position, calls nearby allies.
4. **Engage:** sees him. Approaches to his own spacing ring, circles, waits for a turn to attack (section 4).
5. **Attack:** tell, wind-up, strike, recovery. The recovery is the punish window.
6. **Hurt:** flinch or stagger (built). A staggered enemy cannot attack.
7. **Break:** morale gone (leader dead, badly hurt, a coward). Backs off, flees to the base or a friend, or throws down his sword.
8. **Dead.** Also **Held:** an execution owns him (built as `e.held`).

A **stunned** or **Unaware** enemy (Idle, Suspicious) is the only kind K can take quietly. Taking an Engaged enemy is an open kill, and everyone who saw it turns Alert.

## 3. Senses: how they notice him

- **Sight:** a cone from the facing (now truly eight ways), 120 px and 100° to start, blocked by pillars and walls. Inside it he fills a notice meter, faster when close, running or mid-attack, slower in shadow or walking.
- **Hearing:** running is loud (60 px), walking with V is quiet (15 px), the sheath click carries (80 px), a kill carries (100 px), a static bomb carries far but blinds.
- **The meter:** 0 to 1. Half turns them Suspicious, full turns them Engaged. It drains slowly while they see nothing.
- **Shouting:** an Alert or Engaged enemy calls everyone within 90 px up to Alert. A killed enemy who was seen dying does the same.
- **Tell on screen:** a small mark over the head: nothing, a grey "?" filling (Suspicious), a red "!" (Engaged). It shows only on enemies near him, to keep the screen clean.

This is what makes the K bubbles mean something: an unaware enemy wandering off alone is the one to take.

## 4. Fighting: many enemies, one fight at a time

The rule of every good melee crowd: they take turns.

- **Attack tokens:** only 2 minions (or 1 elite) may be attacking at once. The rest keep their ring, circle, feint, block his escape. A boss ignores tokens.
- **Spacing rings:** each archetype has a preferred distance (a spear holds 40 px, a sword 20, an archer 120). They drift to it and hold it, facing him.
- **Attacks:** each archetype has 2 to 5 of the 14 counter attacks. The pick is weighted by distance and by what the ronin is doing (he is in the air → the leaping strike; he is blocking → the front kick or feint).
- **Every attack has the same shape:** tell (the glint up the blade, the eye flash), wind-up, strike, recovery. The F counter window lands on the strike.
- **After an attack:** a cooldown per enemy (1.2 to 2.5 s), then the token goes back.
- **They hurt him:** a landed blow takes from `INV.hp` through `hurt()` (built by the items work), with a hit pause, a push and the Paper Crane rule already there.
- **Elites block:** they can raise a guard against J (a clang, sparks). A heavy blow, a charged skill or a counter breaks it. Minions never block.
- **Friendly fire:** a sweep or a thrown sword hits other enemies too. Hatred between cultures (section 7) makes them fight each other on purpose.

## 5. Archetypes (a first set of eight)

Each is a weapon, a spacing ring, a set of attacks and a way of breaking.

| Archetype | Weapon | Ring | Attacks (from the counters) | When it breaks |
|---|---|---|---|---|
| Swordsman | katana | 20 px | overhead chop, diagonal cut, horizontal sweep, three-cut flurry | backs off, regroups |
| Spearman (ashigaru) | yari | 40 px | thrust, feint then thrust, charge | drops the spear and runs |
| Brute | nodachi | 26 px | spinning cut, horizontal sweep, shoulder barge; hard to stagger | never breaks |
| Duelist (elite) | katana | 24 px | quick-draw, feint then thrust, low rising cut, diagonal cut; blocks | bows out and challenges again later |
| Shinobi | tanto | 30 px, keeps moving | leaping strike, sword throw, front kick; drops a smoke bomb | vanishes in smoke |
| Archer | bow | 120 px, backs away | loosed arrows (a new attack; the counter cuts the arrow) | runs for the base |
| Monk | staff or bare hands | 22 px | front kick, shoulder barge, a staff sweep (new) | sits and prays |
| Scout | tanto | runs away | none: he runs to the base to raise the alarm | he is the one who breaks |

- **Minion vs elite:** the same archetypes, with more health, poise, blocking and one extra attack for the elite. Rewind stays elite and boss only.
- **Bosses:** one per base or region, each a named archetype with phases (for example the Duelist who starts one-handed, then draws a second blade at half health).

## 5b. Class decides the weapon (owner, 2026-09-26)

"Retainers only really katana; peasants and rebels katanas or naginatas or whatever." What a man carries comes from his class or job, not at random. The archetype is how he fights; the class is who he is and what he could get hold of.

| Class | Carries | Fits the archetypes |
|---|---|---|
| Retainer (samurai in service) | katana only, often katana + wakizashi; armour | Swordsman, Duelist, the bosses |
| Ronin (masterless) | katana or nodachi, whatever he kept | Swordsman, Brute, Duelist |
| Ashigaru (foot soldier) | yari, bow, a cheap katana as a sidearm | Spearman, Archer |
| Peasant rebel | naginata, bamboo spear, kama (sickle), a threshing flail, the odd stolen katana | Spearman, Brute, a Mob (new: weak alone, dangerous in numbers, breaks easily) |
| Warrior monk (sohei) | naginata, bo staff | Monk, Spearman |
| Shinobi | tanto, kusarigama (sickle and chain), shuriken | Shinobi |
| Bandit | anything stolen: katana, tanto, club | Swordsman, Brute, Mob |

- **A culture picks from its classes:** a clan's army is retainers and ashigaru; a rebel valley is peasants and monks; a bandit coast is bandits and ronin.
- **Enemies use the same weapon system as the ronin** (`src/weapons/`): the same art, poses and 3D forms, so every weapon the ronin gets, enemies can carry, and the reverse.
- **New weapons this needs:** naginata, bo staff, kama, kusarigama, bow, bamboo spear, flail, club. Each gets its side art, its 3D form (`art3d.js`) and its own versions of the enemy attacks.
- **A dropped weapon** lies where it fell (already, for the katana). Later: the ronin can pick up what an enemy dropped.

## 5c. Counters depend on the ronin's weapon (owner, 2026-09-26)

The 14 counters are all katana answers. Each weapon the ronin holds should answer the same 14 attacks in its own way, so the counter set is a table: attack × his weapon.

- **Yari (reach):** he answers from outside the enemy's range. The butt or the haft does the parrying, and the kill is a thrust through the gap the attack opened. Against the charge: plant the spear and let him run onto it. Against the leaping strike: the point up.
- **Nodachi (weight):** he does not dodge much. He meets the blow and overpowers it: beats the blade down, cuts through the guard, one huge cut that takes the attacker and whoever stands behind him.
- **Twin tanto (inside):** he steps inside every attack. The reverse-grip hand catches or hooks the blade, the lead hand cuts at close range, several fast small cuts instead of one big one.
- **The enemy's weapon matters too:** a spear thrust is countered differently from a sword thrust, so later the table grows a third axis (attack × his weapon × their weapon class). Start with attack × his weapon: 14 × 3 = 42 new counters, made the way the first 14 were.

## 6. Personality drives behaviour, not just the walk

The 52 traits already change how they stand and walk. Each trait also gets behaviour knobs, so the same archetype plays differently:

- **Lazy:** slow to notice (sight meter ×0.6), sits at his post, turns late, slow to join a fight.
- **Proud:** wants the duel. Waves others off and fights him alone (takes the token), never flees, taunts.
- **Cowardly / nervous:** flees at half health, calls for help, jumpy (notices faster, panics in smoke).
- **Aggressive / hot-headed:** attacks more often, ignores the token cap now and then, chases too far.
- **Disciplined:** holds formation and spacing, blocks more, never breaks while his leader lives.
- **Drunk / reckless:** sways, attacks at random, sometimes hits his own side.

A squad mixes them, so a camp reads as people: two lazy guards by the fire, a proud one who steps up, a nervous one who runs for the drum.

## 7. Cultures, hatred and the world (ties into the 100 regions)

- **A culture** sets clothes (the wardrobe, its colour rule is still the owner's question), weapons, archetype mix, default personality mix, and its relations.
- **Hatred is a table:** culture ↔ culture from −1 (kill on sight) to +1 (allies), culture → personality trait (a disciplined culture despises drunks), and personality → culture.
- **In play:** two groups that hate each other fight when they meet. The ronin can lure a patrol into a rival camp and let them fight. A hated trait inside a squad causes brawls.
- **Around the ronin:** some cultures ignore him until provoked, some attack on sight, some hate him more after he kills their own (a grudge that spreads through the region).

## 8. Bases and spawning

- **A base** (a camp, a fort, a shrine) spawns its culture's squads while it stands: a cap on the living (6 to 12), a respawn every 20 to 40 s, faster while alarmed.
- **The alarm:** a scout, a drum or a bell. Once raised, the base sends squads to the last known position and its boss wakes.
- **Destroying it:** kill the boss, or break the base's heart (a banner, a war drum or a shrine seal: a big item with lock-on, E to cut or burn). The zone turns neutral and nothing spawns there again.
- **Neutral zones** can later host friendly or trader camps, and the rivals of the defeated culture may move in.

## 9. The ronin's side of it

- **Stealth path:** walk (V), stay out of cones, take the lone ones with K, use smoke.
- **Open fight:** read the tells, counter with F, use the token gaps to strike, break guards with charged skills.
- **Executions:** the rarity and ending rules already built; an enemy's tier and state decide which fit.

## 10. Build order

1. **Move and strike:** enemies walk to their ring, face him, and use two attacks (overhead chop, thrust) with tells; landed blows hurt him; F counters them. Tokens from day one.
2. **Senses:** sight cones, hearing, the notice meter, shouting, the "?" and "!" marks. K only on the unaware.
3. **Archetypes and classes:** the eight above, each with its attacks from the counters prototype, plus the archer's arrows and the monk's staff sweep; classes decide their weapons.
3b. **New weapons for enemies and ronin alike:** naginata first (rebels and monks), then bo staff, kama, bow, kusarigama.
3c. **Weapon-specific counters:** the 14 attacks answered with the yari, nodachi and tanto (42 counters, prototyped in batches like the first 14).
4. **Personality behaviour:** the trait knobs of section 6 on top of the archetypes.
5. **Cultures and hatred:** the relation table, factions fighting each other.
6. **Bases:** spawning, alarms, destroying a base, neutral zones.
7. **Bosses:** one per region, with phases.

Each step gets a prototype page first, as every system so far has, then goes into the game.

## Open questions for the owner

- **Attack tokens:** 2 minions at once feels fair for a pixel brawler; more is harder and messier. How hard should an open fight be?
- **Stealth weight:** should a detected ronin still be able to K (loudly), or only the unaware?
- **The archer and the monk** bring the first attacks the counters do not cover (arrows, the staff sweep). Add them?
- **Grudges:** should killing a culture's people make its whole region hostile for a while?
- **Clothes:** may enemy cultures wear colour or beige, with only the ronin kept to black? (Still open from the world system.)
