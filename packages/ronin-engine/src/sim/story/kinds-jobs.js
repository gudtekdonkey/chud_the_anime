import { zoneAt } from '../ledger.js';
import { ST, today, clamp, kill, seize, pay, who, alive, actor, regName, zoneName, census, dedupe, villagesOf } from './state.js';
import { defineQuest, post } from './quests.js';
import { robbed, grudge } from './order.js';
import { routeOf } from './politics.js';
import { st, deed, loot } from './kinds-world.js';

// ---- Contracts: jobs posted at inns, shrines and magistrates, or asked by people in need: a feud, an escort, a hunt, a killing,
// a stolen blade, a debt. Each comes from real people in the ledger, and each plays out without him. ----

const BEASTS = ['a man-eating bear', 'a wolf pack', 'a great boar', 'a wild dog pack', 'an old tiger (so the woodcutters swear)'];

// ---- weekly: look at a few places and see what people need ----
export function jobsWeek(L, cal, r) {
  const S = ST(L), cen = census(L), n = L.regions.length;
  for (let k = 0; k < 3; k++) {   // a feud between neighbours, over a boundary stone, water or an insult
    const g = r.int(0, n - 1), vs = villagesOf(L, g); if (!vs.length || !r.chance(.25)) continue;
    const v = r.pick(vs), heads = (cen.byZone[v.x + ',' + v.y] || []).filter(id => actor(L, id).household === id && actor(L, id).holds.length);
    if (heads.length < 2) continue; const [a, b] = r.shuffle(heads.slice()).slice(0, 2), why = r.pick(['a boundary stone moved in the night', 'water taken from the shared channel', 'a daughter promised and refused', 'an insult at the New Year', 'a dead ox and a missing one']);
    post(L, 'feud', { key: 'feud:' + [a, b].sort().join('|'), region: g, zone: [v.x, v.y], giver: a, target: b, reward: 40 + r.int(0, 60), days: 21 + r.int(0, 21), stake: { why },
      title: `The ${actor(L, a).family} and the ${actor(L, b).family} of ${v.name}`, text: `${who(L, a)} and ${who(L, b)} have been at each other since ${why}. Knives have been shown. ${who(L, a)} wants a sword on his side.` });
  }
  for (const gr of S.grudges.filter(x => today(L) - x.d < 40 && !x.posted)) {   // a killing, paid for by the grieving
    if (!alive(L, gr.by) || !alive(L, gr.against) || !r.chance(.4)) continue; gr.posted = true; const a = actor(L, gr.by), z = a.home ? zoneAt(L, ...a.home) : null; if (!z || z.region < 0) continue;
    post(L, 'kill', { key: 'kill:' + gr.by + ':' + gr.against, region: z.region, zone: a.home, giver: gr.by, target: gr.against, tculture: actor(L, gr.against).culture, reward: 80 + r.int(0, 170), days: 28,
      title: `A life for a life`, text: `${who(L, gr.by)} wants ${who(L, gr.against)} dead for the ${gr.why} that took their kin. Payment on proof, no questions.` });
  }
  if (r.chance(.6)) {   // escort: a merchant going between seats
    const g = r.int(0, n - 1), m = cen.byRegion[g].merchants; if (m.length) { const who2 = r.pick(m), a = actor(L, who2), dest = r.pick(S.adj[g]); if (dest != null && a.home) {
      const route = routeOf(L, a.home, L.regions[dest].seat), danger = Math.max(0, ...route.map(x => S.reg[x].danger)), cargo = 200 + r.int(0, 600);
      post(L, 'escort', { key: 'escort:' + who2, region: g, zone: a.home, giver: who2, other: campChief(L, route), reward: 40 + Math.round(danger * 200) + r.int(0, 40), days: 10 + r.int(0, 10), stake: { to: dest, route, danger: +danger.toFixed(2), cargo },
        title: `Guard a caravan to ${regName(L, dest)}`, text: `${who(L, who2)} carries ${cargo} mon of goods to ${regName(L, dest)}. The road is ${danger > .3 ? 'bad: camps along it' : danger > .1 ? 'uneasy' : 'quiet, mostly'}.` }); } }
  }
  if (r.chance(.45)) {   // hunt: a beast at a village near forest or mountain
    const g = r.int(0, n - 1); if (S.geo[g].high > .25 || S.geo[g].wet > .2) { const vs = villagesOf(L, g); if (vs.length) { const v = r.pick(vs), head = (cen.byZone[v.x + ',' + v.y] || []).find(id => actor(L, id).household === id);
      if (head) { const beast = r.pick(BEASTS); post(L, 'hunt', { key: 'hunt:' + v.x + ',' + v.y, region: g, zone: [v.x, v.y], giver: head, reward: 30 + r.int(0, 70), days: 14 + r.int(0, 14), stake: { beast }, board: 'shrine',
        title: `${beast[0].toUpperCase() + beast.slice(1)} at ${v.name}`, text: `${beast[0].toUpperCase() + beast.slice(1)} has taken livestock at ${v.name} and a child is missing. The shrine asks for a hunter.` }); } } }
  }
  if (r.chance(.25)) {   // a stolen blade: a noble house robbed by a camp's man
    const camps = Object.entries(S.camps).filter(([, c]) => !c.razed && zoneAt(L, ...c.zone).holder); if (camps.length) { const [key, c] = r.pick(camps), nob = cen.byRegion[c.region].nobles.concat(...S.adj[c.region].map(x => cen.byRegion[x].nobles));
      const thieves = cen.byZone[key] || []; if (nob.length && thieves.length) { const owner = r.pick(nob), thief = r.pick(thieves), a = actor(L, owner);
        post(L, 'blade', { key: 'blade:' + owner, region: zoneAt(L, ...a.home).region, zone: a.home, giver: owner, target: thief, tculture: actor(L, thief).culture, reward: 150 + r.int(0, 250), days: 35, board: 'inn',
          stake: { blade: r.pick(['his grandfather\'s katana', 'a blade by a named smith', 'the house\'s wakizashi', 'a tachi given by a lord']), camp: key },
          title: `The ${a.family} blade was stolen`, text: `${who(L, owner)}'s heirloom sword was taken by ${who(L, thief)} of ${zoneName(L, c.zone)}. The house is shamed until it is back on its stand.` }); } }
  }
  if (r.chance(.5)) {   // a debt: a merchant owed by a poorer household of the same region
    const g = r.int(0, n - 1), m = cen.byRegion[g].merchants, poor = cen.byRegion[g].heads.filter(id => actor(L, id).money.mon < 120 && !m.includes(id));
    if (m.length && poor.length) { const lender = r.pick(m), debtor = r.pick(poor), sum = 100 + r.int(0, 300), a = actor(L, debtor);
      post(L, 'debt', { key: 'debt:' + debtor, region: g, zone: a.home, giver: lender, target: debtor, reward: Math.round(sum * .2), days: 28, stake: { sum, plot: a.holds[0] }, board: 'inn',
        title: `Collect ${sum} mon from ${who(L, debtor)}`, text: `${who(L, lender)} lent ${who(L, debtor)} ${sum} mon against his field. It is due. He pays a fifth to whoever collects.` }); }
  }
}

// ---- the kinds ----
defineQuest('feud', { board: 'person', check: (L, q) => !alive(L, q.giver) || !alive(L, q.target) ? 'One side of the feud is dead; it ended there.' : null,
  ways: [
    { id: 'fight', label: 'Stand for the one who asked', blurb: 'Face the other house in the street.', karma: -1, mon: (L, q) => q.reward, from: 'giver', standing: (L, q) => st(q.culture, -.02),
      act: (L, q, r) => { if (r.chance(.4)) { kill(L, q.target, 'feud', L.player); grudge(L, q.target, L.player, 'feud'); return `${who(L, q.target)} drew on the ronin and died in the street. His sons will not forget it.`; }
        return `${who(L, q.target)} backed down in front of the whole village. The ${actor(L, q.giver).family} have their way.`; } },
    { id: 'talk', label: 'Mediate', blurb: 'Sake, a headman, a fair word. Costs a little.', karma: 2, cost: () => 30, standing: (L, q) => st(q.culture, .05),
      act: (L, q) => `The two houses drank together before the headman. The feud over ${q.stake.why} is closed.` },
    { id: 'bribe', label: 'Pay blood money to settle it', blurb: 'Pay the wronged house yourself.', karma: 2, cost: () => 90, payTo: 'target', standing: (L, q) => st(q.culture, .05),
      act: (L, q) => `The ronin paid the ${actor(L, q.target).family} to let it go. Both houses bowed.` },
    { id: 'betray', label: 'Take money from both', blurb: 'Promise each house your sword, and keep both purses.', karma: -3, mon: (L, q) => q.reward, from: 'target',
      act: (L, q, r) => { const [a, b] = r.chance(.5) ? [q.giver, q.target] : [q.target, q.giver]; kill(L, b, 'feud', a); seize(L, actor(L, b).holds[0] || `${q.zone.join(',')}:1`, a, 'feud');
        return `With both purses in the ronin's pocket and neither sword to stop them, ${who(L, a)} killed ${who(L, b)} and took his field.`; } },
  ],
  untouched: (L, q, r) => { if (r.chance(.45)) { const [a, b] = r.chance(.5) ? [q.giver, q.target] : [q.target, q.giver]; kill(L, b, 'feud', a); grudge(L, b, a, 'feud');
      const plot = actor(L, b).holds[0]; if (plot) seize(L, plot, a, 'feud'); return `The feud came to knives: ${who(L, a)} killed ${who(L, b)} and holds his field. The title is still in the dead man's name.`; }
    return `The feud cooled with the weather.`; } });

defineQuest('kill', { board: 'person',
  ways: [
    { id: 'fight', label: 'Challenge him openly', blurb: 'A duel before witnesses: revenge, honestly done.', karma: -1, mon: (L, q) => q.reward, from: 'giver', standing: (L, q) => st(q.tculture, -.1),
      act: (L, q) => { kill(L, q.target, 'duel', L.player); return `The ronin called ${who(L, q.target)} out before witnesses and cut him down.`; } },
    { id: 'stealth', label: 'Kill him quietly', blurb: 'Nobody sees.', karma: -3, mon: (L, q) => q.reward, from: 'giver',
      act: (L, q) => { kill(L, q.target, 'murdered', L.player); deed(L, q, 'murder', q.target, false); return `${who(L, q.target)} was found in a ditch. ${who(L, q.giver)} lit incense for his kin.`; } },
    { id: 'betray', label: 'Warn him and take his silver', blurb: 'Tell the target who wants him dead. He pays for the name.', karma: -2, mon: () => 120, from: 'target',
      act: (L, q, r) => { if (r.chance(.5)) { kill(L, q.giver, 'murdered', q.target); return `Warned, ${who(L, q.target)} struck first: ${who(L, q.giver)} is dead.`; } return `${who(L, q.target)} paid for the warning and left the region.`; } },
    { id: 'talk', label: 'Refuse, and tell the magistrate', blurb: 'Murder for hire is a crime.', karma: 2, standing: (L, q) => st(q.culture, .05),
      act: (L, q) => { const lord = L.regions[q.region].lord; pay(L, q.giver, lord, 50); return `The ronin refused and reported it. ${who(L, q.giver)} was fined and watched.`; } },
  ],
  untouched: (L, q, r) => { if (r.chance(.35)) { kill(L, q.target, 'hired blade', q.giver); return `Someone else took the money: ${who(L, q.target)} is dead.`; } return `The grief cooled; nobody took the job.`; } });

defineQuest('escort', { board: 'inn', check: (L, q) => !alive(L, q.giver) ? 'The merchant is dead.' : null,
  ways: [
    { id: 'fight', label: 'Guard the caravan', blurb: 'Walk beside the carts, sword ready.', karma: 1, mon: (L, q) => q.reward, from: 'giver', standing: (L, q) => st(q.culture, .05),
      act: (L, q, r) => { const S = ST(L); for (const g of q.stake.route) S.reg[g].danger = clamp(S.reg[g].danger - .02); return `The caravan reached ${regName(L, q.stake.to)}${q.stake.danger > .2 && r.chance(.5) ? ' after a fight at a ford' : ' without trouble'}.`; } },
    { id: 'bribe', label: 'Pay the camps\' toll', blurb: 'A string of coins at each camp; no blood.', karma: 0, cost: (L, q) => Math.round(30 + q.stake.danger * 100), mon: (L, q) => q.reward, from: 'giver',
      act: (L, q) => `The ronin paid the toll at each camp; the carts rolled through to ${regName(L, q.stake.to)}.` },
    { id: 'betray', label: 'Lead it into an ambush', blurb: 'The camps pay a share of what they take.', karma: -4, mon: (L, q) => q.stake.cargo * .2, from: 'other', standing: (L, q) => st(q.culture, -.15),
      needs: (L, q) => alive(L, q.other) ? null : 'no camp on the road to sell it to',
      act: (L, q) => { robbed(L, { victim: q.giver, thief: q.other, mon: pay(L, q.giver, q.other, q.stake.cargo * .7), zone: q.zone }); deed(L, q, 'robbery', q.giver, false);
        return `The caravan was ambushed at the pass the ronin chose. He walked away with a share.`; } },
  ],
  untouched: (L, q, r) => { if (r.chance(q.stake.danger)) { const thief = campChief(L, q.stake.route); if (thief) { robbed(L, { victim: q.giver, thief, mon: pay(L, q.giver, thief, q.stake.cargo * .5), zone: q.zone }); return `The caravan went alone and was robbed on the road.`; } }
    return `The caravan went alone and got through.`; } });
function campChief(L, route) { const c = Object.values(ST(L).camps).find(c => !c.razed && route.includes(c.region) && zoneAt(L, ...c.zone).holder); return c ? zoneAt(L, ...c.zone).holder : null; }

defineQuest('hunt', { board: 'shrine',
  ways: [
    { id: 'fight', label: 'Hunt it', blurb: 'Track it to its den.', karma: 1, mon: (L, q) => q.reward, from: 'giver', standing: (L, q) => st(q.culture, .05),
      act: (L, q) => { ST(L).reg[q.region].danger = clamp(ST(L).reg[q.region].danger - .03); return `The ronin brought back the head of ${q.stake.beast}. The village held a feast.`; } },
    { id: 'stealth', label: 'Trap it', blurb: 'A pit, a bait, a long wait.', karma: 1, mon: (L, q) => q.reward, from: 'giver', standing: (L, q) => st(q.culture, .05),
      act: (L, q) => `${q.stake.beast[0].toUpperCase() + q.stake.beast.slice(1)} went into the ronin's pit. The village sleeps again.` },
    { id: 'talk', label: 'Ask the shrine to drive it off', blurb: 'An offering; the monks say it will leave.', karma: 2, cost: () => 20, standing: (L, q) => st(q.culture, .03),
      act: (L, q) => `The monks rang the bell for three nights; ${q.stake.beast} moved up the mountain.` },
  ],
  untouched: (L, q, r) => { if (r.chance(.5)) { const people = census(L).byZone[q.zone.join(',')] || []; if (people.length) { const v = r.pick(people); kill(L, v, 'beast'); return `${q.stake.beast[0].toUpperCase() + q.stake.beast.slice(1)} killed ${who(L, v)} before it moved on.`; } }
    return `${q.stake.beast[0].toUpperCase() + q.stake.beast.slice(1)} moved on by itself.`; } });

defineQuest('blade', { board: 'inn', check: (L, q) => !alive(L, q.giver) ? 'The house has no one left to want it back.' : null,
  ways: [
    { id: 'fight', label: 'Take it from the thief', blurb: 'Walk into the camp and ask for it.', karma: 1, mon: (L, q) => q.reward, from: 'giver', standing: (L, q) => st(q.culture, .1, q.tculture, -.05),
      act: (L, q, r) => { if (r.chance(.6)) kill(L, q.target, 'duel', L.player); return `${q.stake.blade[0].toUpperCase() + q.stake.blade.slice(1)} is back on its stand in the ${actor(L, q.giver).family} house.`; } },
    { id: 'stealth', label: 'Steal it back', blurb: 'Into the camp by night.', karma: 1, mon: (L, q) => q.reward, from: 'giver', standing: (L, q) => st(q.culture, .1),
      act: (L, q) => `The blade was on its stand by morning. The ${actor(L, q.giver).family} asked no questions.` },
    { id: 'bribe', label: 'Buy it from the fence', blurb: 'Every stolen blade is for sale.', karma: 0, cost: () => 120, payTo: 'target', mon: (L, q) => q.reward, from: 'giver',
      act: (L, q) => `The ronin bought ${q.stake.blade} from a fence and returned it.` },
    { id: 'betray', label: 'Keep the blade', blurb: 'A blade like that is worth more than the reward.', karma: -3, standing: (L, q) => st(q.culture, -.15),
      act: (L, q, r, by) => { loot(L, q, by, q.stake.blade); return `The ronin took ${q.stake.blade} from the thief and wears it himself. The house knows.`; } },
  ],
  untouched: (L, q, r) => { const sons = actor(L, q.giver).children.filter(id => alive(L, id) && actor(L, id).sex === 'm');
    if (sons.length && r.chance(.4)) { kill(L, sons[0], 'duel', q.target); return `${who(L, sons[0])} went to take the blade back himself and died at the camp gate.`; }
    return `The blade was sold on. The ${actor(L, q.giver).family} house lives with the shame.`; } });

defineQuest('debt', { board: 'inn', check: (L, q) => !alive(L, q.giver) || !alive(L, q.target) ? 'Death has cancelled the debt.' : null,
  ways: [
    { id: 'fight', label: 'Collect it by force', blurb: 'Knock on the door with a hand on the hilt.', karma: -2, mon: (L, q) => q.reward, from: 'giver', standing: (L, q) => st(q.culture, -.05),
      act: (L, q) => { const got = pay(L, q.target, q.giver, q.stake.sum); if (got < q.stake.sum && q.stake.plot) seize(L, q.stake.plot, q.giver, 'debt'); return got >= q.stake.sum ? `${who(L, q.target)} paid, white-faced.` : `${who(L, q.target)} could pay only ${got}; the lender holds his field now.`; } },
    { id: 'help', label: 'Pay it yourself', blurb: 'Clear the debt with your own money.', karma: 3, cost: (L, q) => q.stake.sum, payTo: 'giver', standing: (L, q) => st(q.culture, .1),
      act: (L, q) => `The ronin paid ${who(L, q.target)}'s debt. The family keeps its field.` },
    { id: 'talk', label: 'Talk the lender down', blurb: 'Half now, and the field stays with the family.', karma: 1, mon: (L, q) => q.reward * .5, from: 'giver',
      act: (L, q) => { pay(L, q.target, q.giver, q.stake.sum * .5); return `The ronin talked ${who(L, q.giver)} down to half. The field stays.`; } },
    { id: 'betray', label: 'Warn the debtor, for a fee', blurb: 'He can run before the lender comes.', karma: -1, mon: () => 30, from: 'target',
      act: (L, q) => { const a = actor(L, q.target); a.home = null; if (q.stake.plot) seize(L, q.stake.plot, q.giver, 'debt'); return `${who(L, q.target)} fled in the night. The lender holds an empty field.`; } },
  ],
  untouched: (L, q) => { const got = pay(L, q.target, q.giver, q.stake.sum); if (got >= q.stake.sum) return `${who(L, q.target)} scraped the money together and paid.`;
    if (q.stake.plot) seize(L, q.stake.plot, q.giver, 'debt'); return `${who(L, q.target)} could not pay. ${who(L, q.giver)} holds his field now; the deed is still in the family's name.`; } });
