import { zoneAt } from '../ledger.js';
import { nameOf } from '../actors.js';
import { people, homeRegion, who, stranger } from './kit.js';

// ---- Scenes on the road that are not (at first) a fight: a merchant, pilgrims, a wounded stranger, a funeral, a runaway horse,
// and the weather turning ----
const RICE = 30;   // mon for a day's rice when the economy has no price for this region (docs/sim-travel.md: what we read from econ)
const riceHere = (L, region) => { const p = L.sys.economy?.prices?.[region]?.rice; return typeof p === 'number' && p > 0 ? Math.round(p) : RICE; };
const DAY = 24;
// the nearest town or village other than the one he stands in: where a merchant is going, where a horse came from
function nearestPlace(L, x, y, not) {
  let best = null, bd = 1e9;
  for (let R = 1; R <= 12 && !best; R++) for (let yy = y - R; yy <= y + R; yy++) for (let xx = x - R; xx <= x + R; xx++) {
    const z = zoneAt(L, xx, yy); if (!z || (z.kind !== 'town' && z.kind !== 'village') || (not && xx === x && yy === y)) continue;
    const d = Math.abs(xx - x) + Math.abs(yy - y); if (d < bd) { bd = d; best = z; } }
  return best;
}

export const MEET_SCENES = {
  merchant: {
    make(L, c, r) {
      const m = people(L, a => a.job === 'merchant' && homeRegion(L, a) === c.region, r, 1).map(who)[0] || stranger(r, c.culture.id, 'commoner', 'merchant');
      const to = nearestPlace(L, c.x, c.y, true), price = riceHere(L, c.region), pay = r.int(4, 12) * 10;
      const choices = [{ id: 'buy', label: `Buy rice (${price} mon)` }, { id: 'rob', label: 'Rob him' }, { id: 'pass', label: 'Nod and pass' }];
      if (to && !L.sys.travel.escort) choices.splice(1, 0, { id: 'escort', label: `Escort him to ${to.name} (${pay} mon)` });
      return { title: 'A merchant', who: [{ ...m, fighter: false }], choices, data: { price, pay, to: to ? [to.x, to.y] : null, toName: to?.name },
        text: `${m.name}, a merchant with a pack-horse${to ? `, bound for ${to.name}` : ''}. He eyes your sword, then your hat, and decides to smile.` };
    },
    resolve(L, sc, ch, r) {
      const m = sc.who[0];
      if (ch === 'buy') return L.actors[L.player].money.mon >= sc.data.price ? { text: 'Rice wrapped in a leaf, still warm from somewhere.', mon: -sc.data.price, loot: [{ item: 'rice', n: 1 }], events: [['travel.trade', { merchant: m.id, mon: sc.data.price, item: 'rice' }]] } : { text: 'Your purse says no.' };
      if (ch === 'escort') { L.sys.travel.escort = { who: m.id || m.name, name: m.name, to: sc.data.to, toName: sc.data.toName, pay: sc.data.pay, until: L.hour + 3 * DAY };
        return { text: `He walks beside you now, talking about prices. ${sc.data.toName} within three days.`, events: [['travel.escort', { merchant: m.id, to: sc.data.to, pay: sc.data.pay }]] }; }
      if (ch === 'rob') { const a = m.id && L.actors[m.id], mon = a ? a.money.mon : r.int(40, 200); if (a) a.money.mon = 0;
        return { text: `He hands it over with shaking hands: ${mon} mon.`, mon, deeds: [{ deed: 'robbedMerchant', karma: -6, standing: { [sc.culture]: -.1 }, witnesses: m.id ? [m.id] : [] }] }; }
      return { text: 'He bows you past.' };
    },
  },
  pilgrims: {
    make(L, c, r) {
      const n = r.int(2, 5), shrine = L.zones.find(z => z.kind === 'shrine' && z.region === c.region);
      const ps = Array.from({ length: n }, (_, i) => ({ ...(i === 0 ? stranger(r, c.culture.id, 'monk', 'monk') : stranger(r, c.culture.id, 'commoner')), fighter: false }));
      return { title: 'Pilgrims', who: ps, data: { shrine: shrine?.name || null },
        choices: [{ id: 'alms', label: 'Give 10 mon' }, { id: 'walk', label: 'Walk with them' }, { id: 'news', label: 'Ask for news' }, { id: 'rob', label: 'Rob them' }],
        text: `${n} pilgrims in straw sandals${shrine ? `, on their way to ${shrine.name}` : ''}. The monk at the front rings a small bell at every step.` };
    },
    resolve(L, sc, ch, r) {
      if (ch === 'alms') return L.actors[L.player].money.mon >= 10 ? { text: 'The monk says a sutra over your hat.', mon: -10, deeds: [{ deed: 'alms', karma: 2, standing: { [sc.culture]: .02 } }] } : { text: 'You have nothing to give. They bless you anyway.' };
      if (ch === 'walk') { L.sys.travel.safeUntil = L.hour + 6; return { text: 'Nobody ambushes a party of pilgrims with a ronin in it. Slower, but quiet: the next few hours are safer.', hours: 1 }; }
      if (ch === 'news') return { text: 'The monk tells you what the road has told him.', news: true };
      return { text: 'They have almost nothing. You take it.', mon: r.int(5, 25), deeds: [{ deed: 'robbedPilgrims', karma: -10, standing: { [sc.culture]: -.15 } }] };
    },
  },
  wounded: {
    make(L, c, r) {
      const w = stranger(r, c.culture.id, r.chance(.5) ? 'commoner' : 'ronin');
      const trap = r.chance(c.danger * .35);   // bait: in a bad region the wounded man is sometimes the start of an ambush
      return { title: 'A wounded stranger', who: [{ ...w, fighter: false }], data: { trap },
        choices: [{ id: 'help', label: 'Help him' }, { id: 'leave', label: 'Leave him' }, { id: 'purse', label: 'Take his purse' }],
        text: `${w.name} is sitting against a tree with his hand pressed to his side. "Please. They took everything. Just to the next village."` };
    },
    resolve(L, sc, ch, r) {
      if (sc.data.trap && ch !== 'leave') return { text: 'He stops groaning. Men step out of the trees behind you.', then: 'ambush' };
      if (ch === 'help') return { text: 'You bind the wound and walk him to the edge of the next village. He tells everyone who will listen.', hours: 2,
        deeds: [{ deed: 'helpedStranger', karma: 5, standing: { [sc.culture]: .05 } }] };
      if (ch === 'purse') return { text: 'There were a few coins left after all.', mon: r.int(3, 20), deeds: [{ deed: 'robbedWounded', karma: -8 }] };
      return { text: 'You walk on. His voice follows you for a while.', deeds: [{ deed: 'passedBy', karma: -1 }] };
    },
  },
  funeral: {
    make(L, c, r) {
      // the dead are real when the ledger has someone from here who died in the last few days
      const since = L.hour - 7 * DAY, dead = Object.values(L.actors).find(a => !a.alive && a.died > since && a.home && homeRegion(L, a) === c.region);
      const name = dead ? nameOf(dead) : stranger(r, c.culture.id, 'commoner').name, n = r.int(4, 8);
      const mourners = Array.from({ length: n }, () => ({ ...stranger(r, c.culture.id, 'commoner'), fighter: false }));
      return { title: 'A funeral', who: mourners, data: { dead: dead?.id || null, name },
        choices: [{ id: 'bow', label: 'Step aside and bow' }, { id: 'pray', label: 'Walk with them and pray' }, { id: 'push', label: 'Push through' }],
        text: `A procession ${c.night ? 'by lantern light' : 'in white'} comes down the road: ${n} mourners and a closed box on poles. They are burying ${name}.` };
    },
    resolve(L, sc, ch) {
      if (ch === 'pray') return { text: 'An hour at the graveside. The widow gives you a rice ball for the road.', hours: 1, loot: [{ item: 'rice', n: 1 }], deeds: [{ deed: 'mourned', karma: 2, standing: { [sc.culture]: .05 } }] };
      if (ch === 'push') return { text: 'They part for your sword, and stare after it.', deeds: [{ deed: 'disrespect', karma: -2, standing: { [sc.culture]: -.05 } }] };
      return { text: 'The box goes by. Someone in the line nods to you.', deeds: [{ deed: 'bowed', karma: 1 }] };
    },
  },
  horse: {
    make(L, c, r) {
      const home = nearestPlace(L, c.x, c.y);
      return { title: 'A runaway horse', who: [], data: { home: home ? [home.x, home.y] : null, homeName: home?.name, spooked: !!c.band },
        choices: [{ id: 'catch', label: 'Catch it' }, { id: 'let', label: 'Let it run' }],
        text: `A saddled horse with no rider comes down the road at a gallop${c.band ? ', eyes white, as if something back there frightened it' : ''}.` };
    },
    resolve(L, sc, ch, r) {
      if (ch === 'let') return { text: sc.data.spooked ? 'It thunders past. Whatever it ran from is still up ahead.' : 'It thunders past and is gone.' };
      if (ch === 'return') return { text: 'The owner nearly weeps, and presses coins on you.', hours: 1, mon: r.int(3, 8) * 10, deeds: [{ deed: 'returnedHorse', karma: 3, standing: { [sc.culture]: .04 } }] };
      if (ch === 'keep') return { text: 'A horse is worth a great deal to a man on the road. And to its owner.', loot: [{ item: 'horse', n: 1 }], deeds: [{ deed: 'keptHorse', karma: -3 }] };
      if (!r.chance(.6)) return { text: 'You grab for the reins and eat dust instead.' };
      // caught: the scene goes on with a second choice
      return { text: 'You catch the reins and it drags you ten paces before it stops. A good horse.',
        again: [{ id: 'return', label: `Take it back to ${sc.data.homeName || 'its owner'}` }, { id: 'keep', label: 'Keep it' }] };
    },
  },
  weather: {
    make(L, c, r) {
      const turn = { spring: ['rain', 'fog'], summer: ['rain', 'wind'], autumn: ['fog', 'rain', 'wind'], winter: ['snow', 'wind', 'fog'] }[c.season];
      const w = r.pick(turn.filter(t => t !== c.weather)), s = L.sys.travel.regions[c.region]; s.weather = w; s.wxDays = r.int(1, 2);
      const text = { rain: 'The sky goes the colour of slate, and then the rain comes sideways.', fog: 'Fog comes up out of the ground until the road ends ten paces ahead of you.',
        snow: 'Snow begins, soft at first, then thick enough to fill your hat brim.', wind: 'Wind comes down off the hills and leans on you like a hand.' }[w];
      return { title: 'The weather turns', who: [], data: { weather: w }, text, events: [['travel.weather', { region: c.region, weather: w }]],
        choices: [{ id: 'press', label: 'Press on' }, { id: 'shelter', label: 'Find shelter and wait' }] };
    },
    resolve(L, sc, ch, r) {
      const w = sc.data.weather;
      if (ch === 'shelter') return { text: 'Under a farmer\'s eaves, you wait it out.', hours: r.int(2, 4) };
      if (w === 'fog' && r.chance(.4)) return { text: 'You walk for an hour and come back to the same stone. The fog lifts a little; you find the road.', hours: r.int(1, 3) };
      if (w === 'snow') return { text: 'Slow going. Your feet stop hurting after a while, which is worse.', hours: 2, hurt: .1 };
      return { text: 'Wet through, you go on.', hours: w === 'rain' ? 1 : 0 };
    },
  },
};
