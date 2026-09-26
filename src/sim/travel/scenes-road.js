import { zoneAt } from '../ledger.js';
import { people, homeRegion, who, stranger, plural, cultName, fight, beaten } from './kit.js';

// ---- Scenes with blades out: outlaws, a war party, bounty hunters, a checkpoint, a duelist ----
// Each scene: make(L, c, r) (c: encounters.js context) → { title, text, who, choices, data }, and resolve(L, sc, choice, r, result) → a resolution (kit.js).
// Fights hand the live game a list of real people to spawn (sc.who); it answers with { won, slain }.
const FIGHTERS = new Set(['retainer', 'ashigaru', 'rebel', 'outlaw', 'shinobi', 'ronin', 'monk']);

// the men of the nearest camp in this region, if it has one
function campMen(L, c, r, n) {
  let best = null, bd = 1e9;
  for (const z of L.zones) if (z.kind === 'camp' && z.region === c.region) { const d = Math.abs(z.x - c.x) + Math.abs(z.y - c.y); if (d < bd) { bd = d; best = z; } }
  if (!best) return [];
  return people(L, a => !a.chief && a.home && a.home[0] === best.x && a.home[1] === best.y && a.cls !== 'commoner', r, n);
}

export const ROAD_SCENES = {
  ambush: {
    make(L, c, r) {
      const band = c.band, n = r.int(2, 4);
      let men = band ? band.members.map(id => L.actors[id]).filter(a => a?.alive) : campMen(L, c, r, n);
      const culture = band ? band.culture : c.culture.id;
      if (!men.length) men = Array.from({ length: n }, () => stranger(r, culture, 'outlaw', 'bandit')); else men = men.map(who);
      const demand = Math.max(20, Math.round(c.mon * .35));
      const choices = [{ id: 'fight', label: 'Draw' }, { id: 'pay', label: `Pay ${demand} mon` }, { id: 'flee', label: 'Run for it' }];
      if (c.karma < -.4) choices.push({ id: 'talk', label: 'They know your name' });
      return { title: 'Ambush', who: men, choices, data: { demand, band: band?.id || null, outlaws: culture },
        text: `${men.length} ${plural(men.length, 'man', 'men')} of ${cultName(L, culture)} ${c.night ? 'with torches ' : ''}step out ${c.road ? 'onto the road' : 'of the ' + c.z.biome}. "${demand} mon, ronin, and you walk on."` };
    },
    resolve(L, sc, ch, r, result) {
      if (ch === 'pay') { const mon = L.actors[L.player].money.mon;
        if (mon >= sc.data.demand) return { text: 'They count it twice and melt back off the road.', mon: -sc.data.demand, events: [['travel.robbed', { mon: sc.data.demand, culture: sc.data.outlaws }]] };
        return { text: 'Not enough. They take what there is, and the rest out of your ribs.', mon: -mon, hours: r.int(2, 5), events: [['travel.robbed', { mon, culture: sc.data.outlaws }]] }; }
      if (ch === 'talk') return { text: '"Ah. You." They step aside. One of them grins and names a camp where a man like you would eat well.', events: [['travel.parley', { culture: sc.data.outlaws }]] };
      if (ch === 'flee') { if (r.chance(sc.zone && zoneAt(L, ...sc.zone).road ? .45 : .6)) return { text: 'You are off the road and through the brush before they close. An hour lost, finding the way back.', hours: 1 };
        ch = 'fight'; }
      const f = fight(L, sc, r, result, { edge: ch === 'flee' ? -.1 : 0 });
      if (!f.won) return { text: 'Too many. You wake in the ditch, your purse lighter.', fight: f, ...beaten(L, r), events: [['travel.beaten', { culture: sc.data.outlaws }]] };
      return { text: `The road is quiet again.${f.slain.length ? ` ${f.slain.length} dead; their purses hold ${f.mon} mon.` : ''}`, fight: f, mon: f.mon,
        deeds: [{ deed: 'killedOutlaws', karma: f.slain.length, standing: { [sc.culture]: .02 } }] };
    },
  },
  raiders: {
    make(L, c, r) {
      const n = r.int(3, 5);
      let men = people(L, a => a.culture === c.enemy && FIGHTERS.has(a.cls), r, n).map(who);
      if (men.length < 2) men = Array.from({ length: n }, () => stranger(r, c.enemy, 'ashigaru'));
      const locals = people(L, a => a.culture === c.culture.id && a.cls === 'commoner' && homeRegion(L, a) === c.region, r, r.int(1, 3)).map(w => ({ ...w, fighter: false }));
      return { title: 'War party', who: [...men, ...locals], data: { raiders: c.enemy, victims: locals.map(w => w.id) },
        choices: [{ id: 'defend', label: 'Cut in' }, { id: 'aside', label: 'Stand aside' }, { id: 'join', label: 'Take a share' }],
        text: `A war party of ${cultName(L, c.enemy)} has stopped a cart on the road.${locals.length ? ` ${locals.map(l => l.name).join(', ')} of ${c.culture.name} ${plural(locals.length, 'is', 'are')} on ${plural(locals.length, 'his', 'their')} knees.` : ''}` };
    },
    resolve(L, sc, ch, r, result) {
      const raiders = sc.data.raiders, here = sc.culture, victims = sc.data.victims.filter(Boolean);
      if (ch === 'defend') { const f = fight(L, sc, r, result);
        if (!f.won) return { text: 'They leave you for dead beside the cart.', fight: f, ...beaten(L, r), dead: victims.slice(0, 1).map(id => ({ id, by: raiders })) };
        return { text: 'The raiders are dead or gone. The people from the cart will not stop bowing.', fight: f, mon: f.mon,
          deeds: [{ deed: 'defended', karma: 4, standing: { [here]: .1, [raiders]: -.1 }, witnesses: victims }], events: [['travel.rescued', { actors: victims, from: raiders }]] }; }
      const dead = victims.filter(() => r.chance(.5)).map(id => ({ id, by: raiders }));
      if (ch === 'join') return { text: 'You take your share of the cart. Nobody from it will forget your hat.', mon: r.int(20, 80), dead,
        deeds: [{ deed: 'raided', karma: -8, standing: { [here]: -.25, [raiders]: .08 }, witnesses: victims }], events: [['travel.raid', { raiders, region: sc.region, with: L.player }]] };
      return { text: 'You walk on. Behind you, it ends the way these things end.', dead, deeds: [{ deed: 'passedBy', karma: -1, standing: { [here]: -.03 }, witnesses: victims }],
        events: [['travel.raid', { raiders, region: sc.region }]] };
    },
  },
  hunters: {
    make(L, c, r) {
      const cult = c.hunted.includes(c.culture.id) ? c.culture.id : r.pick(c.hunted), bounty = Math.round(L.sys.travel.heat[cult] || 0), n = r.int(2, 3);
      let men = people(L, a => a.culture === cult && a.job === 'bounty hunter', r, n).map(who);
      if (!men.length) men = Array.from({ length: n }, () => stranger(r, cult, 'ronin', 'bounty hunter'));
      const choices = [{ id: 'fight', label: 'Draw' }, { id: 'run', label: 'Run' }];
      if (c.mon >= bounty) choices.splice(1, 0, { id: 'pay', label: `Pay the bounty (${bounty} mon)` });
      return { title: 'Bounty hunters', who: men, choices, data: { hunters: cult, bounty },
        text: `${men.length === 1 ? 'A bounty hunter' : men.length + ' bounty hunters'} of ${cultName(L, cult)}. The paper ${men.length === 1 ? 'he holds' : 'one of them holds'} up has your hat drawn on it, and ${bounty} mon.` };
    },
    resolve(L, sc, ch, r, result) {
      const cult = sc.data.hunters;
      if (ch === 'pay') return { text: 'He counts it, tears the paper in half, and hands you one half.', mon: -sc.data.bounty, events: [['travel.bountyPaid', { culture: cult, mon: sc.data.bounty }]] };
      if (ch === 'run' && r.chance(.4)) return { text: 'You lose them in the trees. Two hours to find the road again.', hours: 2 };
      const f = fight(L, sc, r, result, { edge: ch === 'run' ? -.1 : 0 });
      if (!f.won) return { text: 'They drag you as far as the next post before you slip the rope. Your purse stays with them.', fight: f, ...beaten(L, r), events: [['travel.caught', { culture: cult }]] };
      return { text: 'More paper will come.', fight: f, mon: f.mon, deeds: [{ deed: 'killedHunters', karma: -2, standing: { [cult]: -.1 } }] };
    },
  },
  patrol: {
    make(L, c, r) {
      const n = r.int(2, 4), wanted = c.standing < -.3 || c.heatHere > 0;
      let men = people(L, a => a.culture === c.culture.id && (a.cls === 'ashigaru' || a.cls === 'retainer') && homeRegion(L, a) === c.region, r, n).map(who);
      if (!men.length) men = Array.from({ length: n }, () => stranger(r, c.culture.id, 'ashigaru', 'guard'));
      const toll = r.int(1, 3) * 10, bribe = r.int(5, 15) * 10;
      const choices = wanted ? [{ id: 'surrender', label: 'Go quietly' }, { id: 'bribe', label: `Bribe (${bribe} mon)` }, { id: 'fight', label: 'Draw' }, { id: 'run', label: 'Run' }]
        : [{ id: 'toll', label: `Pay the toll (${toll} mon)` }, { id: 'back', label: 'Turn back, go round' }, { id: 'fight', label: 'Draw' }];
      return { title: wanted ? 'They know your face' : 'Checkpoint', who: men, choices, data: { toll, bribe, wanted },
        text: wanted ? `Guards of ${c.culture.name}. The one in front has seen your face before. "Hands where I can see them."`
          : `A barrier across the road, and guards of ${c.culture.name}. "${toll} mon to pass, traveller."` };
    },
    resolve(L, sc, ch, r, result) {
      const here = sc.culture, mon = L.actors[L.player].money.mon;
      if (ch === 'toll') return mon >= sc.data.toll ? { text: 'The barrier lifts.', mon: -sc.data.toll, events: [['travel.toll', { culture: here, mon: sc.data.toll }]] } : { text: 'Not enough. You go round.', hours: r.int(2, 4) };
      if (ch === 'back') return { text: 'You go round through the fields. It costs the afternoon.', hours: r.int(2, 4) };
      if (ch === 'surrender') return { text: 'A night in a cell, a magistrate in the morning.', hours: 12, events: [['travel.surrender', { culture: here, region: sc.region }]] };
      if (ch === 'bribe') { if (mon >= sc.data.bribe && r.chance(.65)) return { text: 'The money vanishes into a sleeve. Nobody saw anybody.', mon: -sc.data.bribe, deeds: [{ deed: 'bribed', karma: -1 }] };
        return { text: 'The captain does not take bribes. He takes you.', hours: 12, events: [['travel.surrender', { culture: here, region: sc.region }]] }; }
      if (ch === 'run' && r.chance(.45)) return { text: 'Shouts behind you, then nothing.', hours: 1, deeds: [{ deed: 'fledGuards', karma: 0, standing: { [here]: -.05 } }] };
      const f = fight(L, sc, r, result);
      if (!f.won) return { text: 'They beat you and throw you out of their land.', fight: f, ...beaten(L, r), events: [['travel.surrender', { culture: here, region: sc.region }]] };
      return { text: 'The barrier is down and so are its guards.', fight: f, mon: f.mon, deeds: [{ deed: 'killedGuards', karma: -6, standing: { [here]: -.3 } }] };
    },
  },
  duelist: {
    make(L, c, r) {
      const d = people(L, a => a.cls === 'ronin' && homeRegion(L, a) === c.region, r, 1).map(who)[0] || stranger(r, c.culture.id, 'ronin', 'ronin');
      return { title: 'A duelist', who: [d], data: {},
        choices: [{ id: 'first', label: 'To first blood' }, { id: 'death', label: 'To the death' }, { id: 'decline', label: 'Bow and walk on' }],
        text: `${d.name}, masterless, with a ${d.weapon}, stands in the road. "They say you are good. Show me."` };
    },
    resolve(L, sc, ch, r, result) {
      const d = sc.who[0];
      if (ch === 'decline') return { text: `${d.name.split(' ')[0]} spits, and lets you pass.` };
      const f = fight(L, sc, r, result, { lethal: ch === 'death', edge: -.15 });
      const ev = [['travel.duel', { foe: d.id || d.name, won: f.won, lethal: ch === 'death' }]];
      if (!f.won) return ch === 'death' ? { text: 'You go down. When you wake he is gone, and so is your purse.', fight: f, ...beaten(L, r), events: ev }
        : { text: 'A line opens on your forearm. He bows, satisfied, and walks off.', fight: f, events: ev };
      if (ch === 'death') return { text: `${d.name} folds onto the road. His ${d.weapon} is yours, if you want it.`, fight: f, mon: f.mon, loot: [{ item: d.weapon, n: 1 }], events: ev };
      return { text: 'Your blade stops a hair from his throat. He laughs, bows low, and tells you which roads are bad.', fight: f, events: ev, news: true };
    },
  },
};
