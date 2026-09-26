import { emit, zoneAt } from '../ledger.js';
import { ST, today, clamp, announce, kill, seize, pay, who, alive, actor, regName, zoneName, cultName, census, villagesOf } from './state.js';
import { defineQuest, post } from './quests.js';
import { settleDispute, settleUprising } from './politics.js';
import { razeCamp, settleArmy, robbed } from './order.js';
import { royalManhunt } from './service.js';

// ---- Quests the world makes out of what is happening: famine, a disputed seat, a rising, a dying lord, raiders, a robbery,
// a famous bounty, a village in an army's path, a royal procession, a letter in wartime. Each ends on its own if he stays away. ----
// Karma steps: +3 selfless, +1 lawful, 0 business, -1 grey, -3 cruel or treacherous, -5 and worse murder of the innocent.

export const st = (...pairs) => { const o = {}; for (let i = 0; i < pairs.length; i += 2) if (pairs[i] != null) o[pairs[i]] = +(((o[pairs[i]] || 0) + pairs[i + 1]).toFixed(2)); return o; };
// what he did, for the crime lane (witnesses, bounties): the story has already moved his karma
export const deed = (L, q, crime, victim, seen) => emit(L, 'story.deed', { actor: L.player, crime, victim, seen, zone: q.zone, region: q.region, quest: q.id });
// loot the item lanes can hand over (a royal robe, an heirloom blade)
export const loot = (L, q, by, item) => emit(L, 'story.item', { actor: by, item, quest: q.id, zone: q.zone });
const dying = (L, q) => q.target != null && !alive(L, q.target);

// ---- famine: a village starving while the lord's storehouse is locked ----
export function onFamine(e, L) {
  const g = L.regions[e.region], cen = census(L), vs = villagesOf(L, g.id); if (!vs.length || !g.lord) return;
  const v = vs[(ST(L).questOrder.length + e.region) % vs.length], head = (cen.byZone[v.x + ',' + v.y] || []).find(id => actor(L, id).household === id); if (!head) return;
  post(L, 'famine', { key: 'famine:' + v.x + ',' + v.y, region: g.id, zone: [v.x, v.y], giver: head, target: g.lord, days: 21, reward: 30,
    stake: { renown: 2 }, title: `${v.name} is starving`, board: 'person',
    text: `${who(L, head)}, headman of ${v.name}, says the children will not see spring. ${who(L, g.lord)}'s storehouse at ${regName(L, g.id)} is full of tax rice and under guard.` });
}
const feed = (L, q, f) => { const R = ST(L).reg[q.region]; R.hunger = +clamp(R.hunger - f).toFixed(2); R.unrest = +clamp(R.unrest - f / 2).toFixed(2); };
defineQuest('famine', { board: 'person', check: (L, q) => !alive(L, q.giver) ? 'The headman died before help came.' : null,
  ways: [
    { id: 'help', label: 'Buy rice and bring it', blurb: 'Spend your own money on rice at the market and carry it in.', karma: 3, cost: () => 150, payTo: 'giver', standing: (L, q) => st(q.culture, .1),
      act: (L, q) => { feed(L, q, .3); return `The ronin bought rice with his own money and carried it into ${zoneName(L, q.zone)}. Nobody there will forget his face.`; } },
    { id: 'stealth', label: "Empty the lord's storehouse by night", blurb: 'Unseen, carry the tax rice out to the village.', karma: 1, standing: (L, q) => st(q.culture, -.05),
      act: (L, q) => { feed(L, q, .35); deed(L, q, 'theft', q.target, false); return `The tax rice of ${who(L, q.target)} vanished by night and turned up in ${zoneName(L, q.zone)}'s pots. The lord hunts a thief.`; } },
    { id: 'fight', label: 'Break the storehouse guard', blurb: 'Open it by force in daylight and let the village take what it needs.', karma: 0, standing: (L, q) => st(q.culture, -.2),
      act: (L, q, r) => { feed(L, q, .45); const g = census(L).byRegion[q.region].fighters; if (g.length) kill(L, r.pick(g), 'storehouse guard', L.player); deed(L, q, 'assault', q.target, true);
        return `The ronin cut through the storehouse guard; ${zoneName(L, q.zone)} carried out rice by the cartload. ${who(L, q.target)} has put a price on him.`; } },
    { id: 'betray', label: 'Sell the headman to the lord', blurb: 'Tell the lord who is stirring the village up. He pays for names.', karma: -4, mon: () => 100, from: 'target', standing: (L, q) => st(q.culture, -.05),
      act: (L, q) => { kill(L, q.giver, 'executed', q.target); ST(L).reg[q.region].unrest = .1; return `${who(L, q.giver)} was dragged to the seat and beheaded as a troublemaker. The village is quiet now, and hungrier.`; } },
  ],
  untouched: (L, q, r) => { const people = (census(L).byZone[q.zone.join(',')] || []).filter(id => id !== q.giver); let dead = 0;
    for (let k = r.int(2, 5); k > 0 && people.length; k--) if (kill(L, people.splice(r.int(0, people.length - 1), 1)[0], 'famine')) dead++;
    ST(L).reg[q.region].unrest = +clamp(ST(L).reg[q.region].unrest + .25).toFixed(2);
    return `Nobody came. ${dead} died in ${zoneName(L, q.zone)} before the thaw; the survivors talk about the lord's full storehouse.`; } });

// ---- two claim the seat ----
const disp = (L, q) => ST(L).disputes[q.region];
defineQuest('succession', { board: 'lord', check: (L, q) => !disp(L, q) ? 'The seat was settled before anyone came.' : !alive(L, q.target) && !alive(L, q.other) ? 'Both claimants are dead.' : null,
  ways: [
    { id: 'elder', as: 'fight', label: 'Fight for the elder son', blurb: 'The lawful heir. Lead his retainers against his brother.', karma: 1, mon: (L, q) => q.reward, from: 'target', standing: (L, q) => st(q.culture, .1),
      act: (L, q) => { settleDispute(L, q.region, q.target, 'exiled', 'the elder son, with a ronin at his side'); return `With the ronin in the front rank, ${who(L, q.target)} took his father's seat. ${who(L, q.other)} fled the region.`; } },
    { id: 'younger', as: 'fight', label: 'Fight for the rival claimant', blurb: 'He pays better and he has the harder men.', karma: -1, mon: (L, q) => q.reward * 1.3, from: 'other', standing: (L, q) => st(q.culture, -.05),
      act: (L, q) => { settleDispute(L, q.region, q.other, 'killed', 'by the sword, a ronin at his side'); return `${who(L, q.other)} took the seat by the sword; ${who(L, q.target)} died in the gatehouse.`; } },
    { id: 'stealth', label: 'Murder the elder son quietly', blurb: 'One cut in the dark and the question is answered.', karma: -5, mon: (L, q) => q.reward * 2, from: 'other', standing: () => ({}),
      act: (L, q) => { kill(L, q.target, 'murdered', L.player); deed(L, q, 'murder', q.target, false); settleDispute(L, q.region, q.other, 'spared', 'after his brother was found dead'); return `${who(L, q.target)} was found dead in his bath. ${who(L, q.other)} took the seat, grieving loudly.`; } },
    { id: 'talk', label: 'Broker a peace', blurb: 'Gifts to the retainers on both sides; the elder takes the seat, the other a fort and his life.', karma: 3, cost: () => 150, payTo: 'target', standing: (L, q) => st(q.culture, .15),
      act: (L, q) => { settleDispute(L, q.region, q.target, 'spared', 'by agreement, a ronin as go-between'); return `The brothers drank from one cup before their retainers: ${who(L, q.target)} holds the seat, ${who(L, q.other)} keeps his life and a fort.`; } },
    { id: 'betray', label: 'Take both their money', blurb: 'Promise each your sword, then sell each one to the other.', karma: -4, mon: (L, q) => q.reward, from: 'other', standing: (L, q) => st(q.culture, -.15),
      act: (L, q) => { settleDispute(L, q.region, q.target, 'killed', 'after his brother was betrayed'); return `The ronin took ${who(L, q.other)}'s money and led him into ${who(L, q.target)}'s ambush. Both sides now call him a snake.`; } },
  ],
  untouched: (L, q, r) => { const f = census(L).byRegion[q.region].fighters.filter(id => id !== q.target && id !== q.other);
    for (let k = r.int(1, 3); k > 0 && f.length; k--) kill(L, f.splice(r.int(0, f.length - 1), 1)[0], 'succession war');
    let w = r.chance(.55) ? q.target : q.other; if (!alive(L, w)) w = w === q.target ? q.other : q.target;
    settleDispute(L, q.region, w, r.chance(.5) ? 'killed' : 'exiled', 'after a season of fighting');
    return `After a season of skirmishes ${who(L, w)} holds the seat of ${regName(L, q.region)}.`; } });

// ---- a rising ----
const up = (L, q) => ST(L).uprisings[q.region];
defineQuest('uprising', { board: 'person', check: (L, q) => !up(L, q) ? 'The rising is already over.' : null,
  ways: [
    { id: 'fight', label: 'Fight with the rebels', blurb: 'Stand with the villages against the lord\'s ashigaru.', karma: 1, mon: (L, q) => q.reward, from: 'giver', standing: (L, q) => st(q.culture, -.15),
      act: (L, q, r) => { settleUprising(L, q.region, true, r); return `The ashigaru broke against the ronin and the peasants' spears. ${who(L, q.giver)} holds the seat of ${regName(L, q.region)}.`; } },
    { id: 'lord', as: 'fight', label: 'Fight for the lord', blurb: 'Put the rising down. The lord pays in silver and favour.', karma: -2, mon: (L, q) => q.reward * 1.5, from: 'target', standing: (L, q) => st(q.culture, .15),
      act: (L, q, r) => { settleUprising(L, q.region, false, r); return `The ronin cut down the rebel line; ${who(L, q.giver)}'s head hangs at the gate.`; } },
    { id: 'bribe', label: 'Pay the arrears and end it', blurb: 'Pay the lord the villages\' back taxes; he lowers the rate, they go home.', karma: 3, cost: () => 200, payTo: 'target', standing: (L, q) => st(q.culture, .1),
      act: (L, q) => { const R = ST(L).reg[q.region]; delete ST(L).uprisings[q.region]; R.tax = .3; R.unrest = .15;
        announce(L, 'event.uprisingEnds', { region: q.region, how: 'paid' }, `The rising in ${regName(L, q.region)} ends without blood: the arrears paid by a ronin, the tax lowered.`, ['messenger'], [q.region]);
        return `The ronin paid the villages' arrears. The tax is lowered; the rebels went home to their fields.`; } },
    { id: 'betray', label: 'Hand over the ringleader', blurb: 'Lead the lord\'s men to where he sleeps.', karma: -4, mon: () => 150, from: 'target', standing: (L, q) => st(q.culture, .05),
      act: (L, q, r) => { settleUprising(L, q.region, false, r); return `${who(L, q.giver)} was taken asleep, on the ronin's word. The rising died with him.`; } },
    { id: 'stealth', label: 'Kill the lord in the night', blurb: 'Cut the head off the house, and the rising wins by morning.', karma: -3, mon: (L, q) => q.reward, from: 'giver', standing: (L, q) => st(q.culture, -.3),
      act: (L, q, r) => { kill(L, q.target, 'murdered', L.player); deed(L, q, 'murder', q.target, false); settleUprising(L, q.region, true, r); return `${who(L, q.target)} was found dead at dawn. His ashigaru scattered; the rebels walked into the seat.`; } },
  ],
  untouched: (L, q, r) => { const R = ST(L).reg[q.region], win = r.chance(.25 + R.unrest * .35 + (L.cultures[L.regions[q.region].culture].kind === 'rebels' ? .15 : 0)); settleUprising(L, q.region, win, r);
    return win ? `The rising won on its own: ${who(L, q.giver)} holds ${regName(L, q.region)}.` : `The rising was crushed without him; ${who(L, q.giver)} is dead.`; } });

// ---- a dying lord ----
defineQuest('dying', { board: 'lord', check: (L, q) => dying(L, q) ? `${who(L, q.target)} died before a healer came.` : !ST(L).ill[q.target] ? 'He recovered.' : null,
  ways: [
    { id: 'help', label: 'Bring a healer from the shrines', blurb: 'Two days into the mountains and back with a monk who knows the herbs.', karma: 2, mon: (L, q) => q.reward, from: 'giver', standing: (L, q) => st(q.culture, .1),
      act: (L, q, r) => { const ill = ST(L).ill[q.target]; if (r.chance(.6)) delete ST(L).ill[q.target]; else ill.dies += r.int(60, 200);
        return `The monk's herbs worked. ${who(L, q.target)} is on his feet${ST(L).ill[q.target] ? ', for now' : ''}.`; } },
    { id: 'talk', label: 'Sit with him and witness his will', blurb: 'He dies anyway, but names his heir before witnesses; no one can dispute it.', karma: 1, standing: (L, q) => st(q.culture, .05),
      act: (L, q) => { const a = actor(L, q.target), sons = a.children.filter(id => alive(L, id) && actor(L, id).sex === 'm');
        if (sons.length) ST(L).keys['will:' + q.target] = sons[0];
        kill(L, q.target, 'illness'); return `${who(L, q.target)} named his heir with the ronin as witness, and died before morning.`; } },
    { id: 'stealth', label: 'Hasten his end', blurb: 'An ambitious kinsman pays for a pillow over the face.', karma: -5, mon: () => 250, from: 'other', needs: (L, q) => q.other && alive(L, q.other) ? null : 'nobody is paying for it',
      act: (L, q) => { kill(L, q.target, 'illness', L.player); deed(L, q, 'murder', q.target, false); return `${who(L, q.target)} died in his sleep, they say. ${who(L, q.other)} paid for it.`; } },
  ],
  untouched: (L, q) => `${who(L, q.target)} lingers; no healer came.` });

// ---- raiders on the road ----
const campOf = (L, q) => ST(L).camps[q.stake.camp];
defineQuest('raiders', { board: 'magistrate', check: (L, q) => campOf(L, q).razed ? 'The camp was broken by someone else.' : null,
  ways: [
    { id: 'fight', label: 'Break the camp', blurb: 'Walk in the front gate. Kill the chief, burn the palisade.', karma: 1, mon: (L, q) => q.reward, from: 'giver', standing: (L, q) => st(q.culture, .15, q.tculture, -.1),
      act: (L, q) => { razeCamp(L, q.stake.camp, L.player); return `The ronin broke ${zoneName(L, q.zone)}: the chief dead, the palisade burning. The road is open.`; } },
    { id: 'stealth', label: 'Kill the chief in the night', blurb: 'Over the palisade; the band scatters without him.', karma: 0, mon: (L, q) => q.reward * .8, from: 'giver', standing: (L, q) => st(q.culture, .1),
      act: (L, q, r) => { kill(L, q.target, 'assassinated', L.player); const c = campOf(L, q), z = zoneAt(L, ...c.zone), men = census(L).byZone[q.stake.camp] || [];
        if (men.length && r.chance(.5)) { z.holder = r.pick(men); c.notoriety = 0; return `${who(L, q.target)} died in his sleep; ${who(L, z.holder)} took the band and lies low.`; }
        razeCamp(L, q.stake.camp, null, 'scattered'); return `${who(L, q.target)} died in his sleep and the band scattered by morning.`; } },
    { id: 'bribe', label: 'Pay them to move on', blurb: 'The raids stop here. They will start somewhere else.', karma: -1, cost: () => 150, payTo: 'target', standing: (L, q) => st(q.culture, .05),
      act: (L, q) => { const S = ST(L), c = campOf(L, q), far = L.zones.filter(z => z.kind === 'village' && Math.abs(z.x - c.zone[0]) + Math.abs(z.y - c.zone[1]) > 10 && Math.abs(z.x - c.zone[0]) + Math.abs(z.y - c.zone[1]) < 22).slice(0, 3);
        c.near = far.map(z => [z.x, z.y]); c.notoriety = 0; return `The band took the ronin's silver and turned their raids on ${far.length ? far.map(z => z.name).join(', ') : 'other roads'}.`; } },
    { id: 'betray', label: 'Ride with them for a share', blurb: 'Join the next raid. The chief pays well.', karma: -4, mon: () => 120, from: 'target', standing: (L, q) => st(q.culture, -.2, q.tculture, .2),
      act: (L, q, r) => { const c = campOf(L, q); c.notoriety += 3; ST(L).reg[q.region].danger = clamp(ST(L).reg[q.region].danger + .1); deed(L, q, 'banditry', null, true);
        return `The ronin rode with ${who(L, q.target)}'s raiders. ${c.near.length ? zoneName(L, c.near[0]) : 'A village'} burned; the magistrate has his description.`; } },
  ],
  untouched: (L, q, r) => { if (r.chance(.3)) { razeCamp(L, q.stake.camp, q.giver, 'ashigaru'); return `The lord sent ashigaru at last and burnt ${zoneName(L, q.zone)}.`; }
    const c = campOf(L, q); c.notoriety += 2; ST(L).reg[q.region].danger = clamp(ST(L).reg[q.region].danger + .1); return `Nobody came for the camp. It grows: more men, bolder raids.`; } });

// ---- a merchant robbed ----
defineQuest('robbed', { board: 'person', check: (L, q) => !alive(L, q.giver) ? 'The victim is dead.' : null,
  ways: [
    { id: 'fight', label: 'Take it back by force', blurb: 'Find the thief and take it off him.', karma: 1, mon: (L, q) => q.reward, from: 'giver', standing: (L, q) => st(q.culture, .05, q.tculture, -.05),
      act: (L, q, r) => { pay(L, q.target, q.giver, q.stake.mon || 0); if (r.chance(.5)) kill(L, q.target, 'duel', L.player); return `${q.stake.item || 'The money'} is back with ${who(L, q.giver)}${alive(L, q.target) ? '' : `; ${who(L, q.target)} will not rob again`}.`; } },
    { id: 'stealth', label: 'Steal it back', blurb: 'Nobody needs to know who.', karma: 1, mon: (L, q) => q.reward, from: 'giver', standing: (L, q) => st(q.culture, .05),
      act: (L, q) => { pay(L, q.target, q.giver, q.stake.mon || 0); return `${q.stake.item || 'The money'} came back to ${who(L, q.giver)} in the night. The thief is looking for a traitor.`; } },
    { id: 'bribe', label: 'Buy it back from the fence', blurb: 'Half price, no blood.', karma: 0, cost: (L, q) => Math.max(40, Math.round((q.stake.mon || 200) * .5)), payTo: 'target', mon: (L, q) => q.reward, from: 'giver',
      act: (L, q) => { pay(L, q.target, q.giver, (q.stake.mon || 0) * .5); return `The ronin bought ${q.stake.item || 'it'} back from a fence and returned it.`; } },
    { id: 'betray', label: 'Keep it yourself', blurb: 'Take it from the thief, and don\'t give it back.', karma: -3, mon: (L, q) => q.stake.mon || 0, from: 'target', standing: (L, q) => st(q.culture, -.05),
      act: (L, q, r, by) => { if (q.stake.item) loot(L, q, by, q.stake.item); return `The ronin took ${q.stake.item || 'the money'} from the thief and kept it. ${who(L, q.giver)} is ruined.`; } },
  ],
  untouched: (L, q, r) => { const v = actor(L, q.giver); if (r.chance(.3)) { v.money.mon = 0; return `${who(L, q.giver)} never got it back and sold his tools to eat.`; } return `${who(L, q.giver)} never got it back.`; } });

// ---- a famous bounty ----
defineQuest('bounty', { board: 'magistrate',
  ways: [
    { id: 'fight', label: 'Hunt him down', blurb: 'Bring back his head.', karma: 1, mon: (L, q) => q.reward, from: 'giver', standing: (L, q) => st(q.culture, .15, q.tculture, -.1),
      act: (L, q) => { kill(L, q.target, 'bounty', L.player); delete ST(L).bounties[q.target]; return `The ronin brought in ${who(L, q.target)}'s head and was paid at the magistrate's.`; } },
    { id: 'stealth', label: 'Take him alive', blurb: 'Harder. The lord pays more for a public execution.', karma: 2, mon: (L, q) => q.reward * 1.2, from: 'giver', standing: (L, q) => st(q.culture, .2),
      act: (L, q) => { kill(L, q.target, 'executed', q.giver); delete ST(L).bounties[q.target]; return `${who(L, q.target)} was taken alive and executed before the seat. Crowds came.`; } },
    { id: 'bribe', label: 'Let him buy his life', blurb: 'He has money buried. He will leave the region.', karma: -2, mon: () => 300, from: 'target', standing: (L, q) => st(q.culture, -.05, q.tculture, .1),
      act: (L, q) => { const a = actor(L, q.target); a.home = null; return `${who(L, q.target)} paid the ronin and slipped over the border. The bounty stands.`; } },
  ],
  untouched: (L, q) => { delete ST(L).bounties[q.target]; return `The bounty on ${who(L, q.target)} lapsed unclaimed.`; } });

// ---- a village in an army's path (a bandit army, or a column in wartime) ----
const takeVillage = (L, q, r, by) => { const pre = q.zone.join(',') + ':', people = census(L).byZone[q.zone.join(',')] || [];
  for (let k = r.int(1, 3); k > 0 && people.length; k--) kill(L, people.splice(r.int(0, people.length - 1), 1)[0], 'raid', by);
  for (const p of Object.keys(L.plots).filter(p => p.startsWith(pre))) seize(L, p, by, 'war'); };
defineQuest('defend', { board: 'person',
  ways: [
    { id: 'fight', label: 'Hold the wall', blurb: 'Stand at the gate with the villagers when they come.', karma: 2, mon: (L, q) => q.reward, from: 'giver', standing: (L, q) => st(q.culture, .2, q.tculture, -.1),
      act: (L, q, r) => { if (q.stake.army) settleArmy(L, q.stake.army, true, r); return `${zoneName(L, q.zone)} held. The ronin was the last man off the wall.`; } },
    { id: 'stealth', label: 'Burn their camp the night before', blurb: 'They never arrive.', karma: 1, mon: (L, q) => q.reward, from: 'giver', standing: (L, q) => st(q.culture, .15),
      act: (L, q, r) => { if (q.stake.army) settleArmy(L, q.stake.army, true, r); return `The attackers' camp burned in the night; they turned back before dawn.`; } },
    { id: 'help', label: 'Lead the villagers away', blurb: 'Lose the fields, keep the people.', karma: 2, standing: (L, q) => st(q.culture, .05),
      act: (L, q, r) => { const A = q.stake.army && ST(L).armies[q.stake.army], by = A ? A.chief : null; if (A) delete ST(L).armies[q.stake.army];
        for (const p of Object.keys(L.plots).filter(p => p.startsWith(q.zone.join(',') + ':'))) seize(L, p, by, 'abandoned');
        return `The ronin led ${zoneName(L, q.zone)} into the hills. Their fields are someone else's for now; their people are alive.`; } },
    { id: 'betray', label: 'Open the gate for them', blurb: 'The attackers pay for a quiet gate.', karma: -6, mon: () => 200, from: 'other', standing: (L, q) => st(q.culture, -.4, q.tculture, .1),
      needs: (L, q) => q.other && alive(L, q.other) ? null : 'nobody to sell it to',
      act: (L, q, r) => { if (q.stake.army) settleArmy(L, q.stake.army, false, r); else takeVillage(L, q, r, q.other); deed(L, q, 'treachery', q.giver, true);
        return `The gate of ${zoneName(L, q.zone)} was open when they came. Everyone knows who opened it.`; } },
  ],
  untouched: (L, q, r) => { if (q.stake.army) { const A = ST(L).armies[q.stake.army], ok = !A || r.chance(.35); settleArmy(L, q.stake.army, ok, r);
      return ok ? `${zoneName(L, q.zone)} held without him.` : `${zoneName(L, q.zone)} fell to the bandit army.`; }
    if (r.chance(.5)) { takeVillage(L, q, r, q.other); return `${zoneName(L, q.zone)} was overrun by ${cultName(L, q.tculture)}.`; } return `The column passed ${zoneName(L, q.zone)} by.`; } });

// ---- a royal procession ----
const proc = (L, q) => ST(L).processions[q.stake.procession];
const arrive = (L, q, how) => { const P = proc(L, q); if (!P) return; delete ST(L).processions[q.stake.procession];
  announce(L, 'event.processionArrives', { procession: q.stake.procession, actor: P.royal, region: P.to }, `The royal procession reached ${regName(L, P.to)} ${how}.`, ['messenger'], [P.to]); };
defineQuest('procession', { board: 'inn',
  ways: [
    { id: 'fight', label: 'Walk the road ahead of it', blurb: 'Clear the outlaws before the silk comes by.', karma: 1, mon: (L, q) => q.reward, from: 'giver', standing: (L, q) => st(q.culture, .2),
      act: (L, q) => { arrive(L, q, 'safely, a ronin walking ahead'); return `The procession passed without a stone thrown. The court remembers who walked ahead of it.`; } },
    { id: 'stealth', label: 'Steal the silk at the inn', blurb: 'One night, one chest, nobody hurt.', karma: -3, standing: (L, q) => st(q.culture, -.1),
      act: (L, q, r, by) => { loot(L, q, by, 'a royal red kimono'); deed(L, q, 'theft from royalty', q.target, false); royalManhunt(L, q, false); arrive(L, q, 'a chest lighter'); return `A chest of red silk is missing from the royal baggage. Every inn on the road is being searched.`; } },
    { id: 'betray', label: 'Rob the procession', blurb: 'Colour is worth a fortune. It is also death to touch.', karma: -6, mon: () => 400, from: 'target', standing: (L, q) => st(q.culture, -.6),
      act: (L, q, r, by) => { loot(L, q, by, 'a royal red kimono'); deed(L, q, 'robbery of royalty', q.target, true); if (by === L.player) royalManhunt(L, q, true); const P = proc(L, q); if (P) delete ST(L).processions[q.stake.procession];
        return `The ronin fell on the procession on an open road. ${who(L, q.target)} lived; the red silk did not stay with him.`; } },
  ],
  untouched: (L, q, r) => { const P = proc(L, q); if (!P) return 'The procession has passed.';
    const S = ST(L), camps = Object.entries(S.camps).filter(([, c]) => !c.razed && P.route.includes(c.region) && c.notoriety >= 2);
    const danger = Math.max(0, ...P.route.map(g => S.reg[g].danger));
    if (camps.length && r.chance(danger)) { const [k, c] = r.pick(camps), chief = zoneAt(L, ...c.zone).holder; delete S.processions[q.stake.procession];
      if (chief) { robbed(L, { victim: P.royal, thief: chief, mon: 0, zone: c.zone, camp: k, item: 'the royal red kimono' }); return `Outlaws from ${zoneName(L, c.zone)} fell on the procession and made off with the red silk.`; } }
    arrive(L, q, 'safely'); return `The procession passed safely without him.`; } });

// ---- a letter in wartime ----
const warOf = (L, q) => ST(L).wars[q.stake.war];
const shift = (L, q, toSide, n) => { const w = warOf(L, q); if (w) w.score += (toSide === w.a ? n : -n); };
defineQuest('message', { board: 'lord', check: (L, q) => !warOf(L, q) ? 'The war ended before the letter mattered.' : null,
  ways: [
    { id: 'fight', label: 'Carry it through the lines', blurb: 'The straight road, sword out.', karma: 0, mon: (L, q) => q.reward, from: 'giver', standing: (L, q) => st(q.culture, .15, q.tculture, -.1),
      act: (L, q) => { shift(L, q, q.stake.side, 1); return `The letter reached ${who(L, q.target)}. ${cultName(L, q.stake.ally)} marched a week later.`; } },
    { id: 'stealth', label: 'Slip through by night', blurb: 'Mountain paths; nobody sees him.', karma: 0, mon: (L, q) => q.reward, from: 'giver', standing: (L, q) => st(q.culture, .15),
      act: (L, q) => { shift(L, q, q.stake.side, 1); return `The letter reached ${who(L, q.target)} by mountain paths. ${cultName(L, q.stake.ally)} marched.`; } },
    { id: 'betray', label: 'Sell it to the enemy', blurb: 'The other side pays in gold for what is in it.', karma: -4, mon: () => 250, from: 'other', needs: (L, q) => alive(L, q.other) ? null : 'no enemy lord to sell it to', standing: (L, q) => st(q.culture, -.3, q.tculture, .2),
      act: (L, q) => { shift(L, q, q.tculture, 1); return `The letter was read in ${cultName(L, q.tculture)}'s war tent. The ambush they laid cost ${cultName(L, q.culture)} dearly.`; } },
  ],
  untouched: (L, q, r) => { if (r.chance(.6)) { shift(L, q, q.stake.side, 1); return 'A courier got the letter through.'; } shift(L, q, q.tculture, 1); return 'The courier was caught; the letter was read by the enemy.'; } });
