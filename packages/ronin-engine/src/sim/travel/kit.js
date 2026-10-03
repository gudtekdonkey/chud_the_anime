import { zoneAt } from '../ledger.js';
import { CLASSES, givenName, familyName } from '../packs/edo/cultures.js';
import { nameOf } from '../actors.js';

// ---- What every scene shares: finding real people for it, strangers when there are none, fights, deeds ----
// A scene is plain data (it is saved in L.sys.travel.scene while he stands in it):
//   { id, type, title, text, zone: [x, y], region, culture, who: [{ id (actor) | null, name, cls, weapon, culture, job? }], choices: [{ id, label }], data }
// A resolution is what the choice did, applied by index.js choose():
//   { text, mon (to his purse, + or -), hours (the game advances the clock), loot: [{ item, n }], deeds: [{ deed, karma, standing: { culture: d }, witnesses }],
//     fight: { foes, lethal, won, slain }, events: [[type, data]], then (a scene type that follows at once) }

// living people matching pred, shuffled, at most n (the ronin never among them)
export function people(L, pred, r, n) {
  const out = []; for (const id in L.actors) { const a = L.actors[id]; if (a.alive && id !== L.player && pred(a)) out.push(a); }
  return r.shuffle(out).slice(0, n);
}
export const homeRegion = (L, a) => a.home ? zoneAt(L, a.home[0], a.home[1])?.region : null;
export const who = a => ({ id: a.id, name: nameOf(a), cls: a.cls, weapon: a.weapon, culture: a.culture, job: a.job });
// someone the ledger never had: a traveller from far off, named in this land's way
export function stranger(r, culture, cls, job) {
  const sex = r.chance(.8) ? 'm' : 'f';
  return { id: null, name: `${givenName(r, sex)} ${familyName(r)}`, cls, weapon: r.weighted(CLASSES[cls].weapons), culture, job: job || r.pick(CLASSES[cls].jobs) };
}
export const plural = (n, one, many) => n === 1 ? one : many;
export const cultName = (L, c) => L.cultures[c]?.name || 'no people';

// a fight: the live game passes its result ({ won, slain: [actor ids] }); without one (the ledger, the tests) it is rolled
export function fight(L, sc, r, result, { lethal = true, edge = 0 } = {}) {
  const foes = sc.who.filter(w => w.fighter !== false), n = foes.length;
  const won = result ? !!result.won : r.chance(Math.max(.25, Math.min(.95, .95 - n * .07 + edge)));
  const slain = result ? result.slain || [] : won && lethal ? foes.filter(f => f.id).map(f => f.id) : [];
  // the dead's purses are real money: it comes off their records
  let mon = 0; for (const id of slain) { const a = L.actors[id]; if (a?.money) { mon += a.money.mon; a.money.mon = 0; } }
  return { foes: foes.map(f => f.id || f.name), lethal, won, slain, mon };
}
// beaten on the road: he wakes up hours later, lighter
export const beaten = (L, r) => ({ mon: -Math.floor((L.actors[L.player].money?.mon || 0) * .5), hours: r.int(3, 8) });
