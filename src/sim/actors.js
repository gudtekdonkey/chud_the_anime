import { rngFor } from './rng.js';
import { newId, zoneAt } from './ledger.js';
import { HOURS_PER_YEAR } from './time.js';
import { CLASSES, KINDS, familyName, givenName } from './cultures.js';

// ---- People: every person in the world is one record in L.actors, the ronin included (docs/foundations.md: one actor for everyone) ----
// { id, given, family, sex, born (game hour; negative before the world began), alive, died?, culture, cls, job, rank, home: [x, y] | null,
//   spouse, parents: [ids], children: [ids], household, weapon, traits: [[trait, strength]], karma, standing: { cultureId: -1..1 },
//   money: { mon, silver, ryo }, holds: [plot ids], lord? (region id) }
// The people lane owns ageing, marriage, births, deaths and heirs; this file makes the first generation so every lane starts from the same people.
export const ageOf = (L, a) => (L.hour - a.born) / HOURS_PER_YEAR;
export const nameOf = a => `${a.given} ${a.family}`;

export function makeActor(L, r, o) {
  const cls = CLASSES[o.cls], sex = o.sex || (r.chance(.5) ? 'm' : 'f');
  const a = { id: newId(L, 'a'), given: givenName(r, sex), family: o.family || familyName(r), sex, born: L.hour - Math.round((o.age ?? 30) * HOURS_PER_YEAR) - r.int(0, HOURS_PER_YEAR - 1),
    alive: true, culture: o.culture, cls: o.cls, job: o.job || r.pick(cls.jobs), rank: cls.rank, home: o.home || null, spouse: null, parents: [], children: [],
    household: o.household || null, weapon: r.weighted(cls.weapons), traits: [], karma: 0, standing: {}, money: purse(r, o.cls), holds: [] };
  const kind = o.culture != null && L.cultures[o.culture] ? KINDS[L.cultures[o.culture].kind] : null;
  if (kind) a.traits.push([r.pick(kind.traits), +(r.range(.5, 1)).toFixed(2)]);
  if (r.chance(.4)) a.traits.push([r.pick(['calm', 'nervous', 'cheerful', 'grim', 'lazy', 'eager', 'wary', 'proud', 'humble', 'weary']), +(r.range(.3, .8)).toFixed(2)]);
  L.actors[a.id] = a;
  return a;
}
function purse(r, cls) {
  const m = { royal: [0, 0, [20, 60]], noble: [[500, 2000], [5, 30], [2, 10]], retainer: [[200, 900], [0, 5], 0], ronin: [[20, 400], 0, 0], ashigaru: [[30, 200], 0, 0],
    monk: [[0, 60], 0, 0], commoner: [[30, 300], 0, 0], rebel: [[10, 120], 0, 0], outlaw: [[20, 500], [0, 3], 0], shinobi: [[100, 600], [0, 4], 0] }[cls] || [[0, 50], 0, 0];
  const v = x => Array.isArray(x) ? r.int(x[0], x[1]) : x;
  return { mon: v(m[0]), silver: v(m[1]), ryo: v(m[2]) };
}
export function marry(a, b) { a.spouse = b.id; b.spouse = a.id; b.family = a.sex === 'm' ? a.family : b.family; if (b.sex === 'm') a.family = b.family; }
export function bear(L, r, mother, father, o = {}) {
  const c = makeActor(L, r, { cls: o.cls || father.cls, culture: father.culture, family: father.family, home: father.home, household: father.household, age: o.age ?? 0, job: o.job });
  c.parents = [father.id, mother.id]; father.children.push(c.id); mother.children.push(c.id);
  return c;
}

// the first generation: a household per few plots in every town and village, a lord's family at each seat, a band at each camp,
// a garrison at each fort, monks at each shrine, and the ronin
const HOUSES = { town: 8, village: 4 };
export function populate(L) {
  for (const z of L.zones) {
    if (z.kind === 'sea' || z.kind === 'wild') continue;
    const reg = L.regions[z.region], cult = L.cultures[reg.culture], kind = KINDS[cult.kind], r = rngFor(L.seed, 'people', z.x, z.y), home = [z.x, z.y];
    const commonCls = kind.classes.filter(([c]) => CLASSES[c].rank <= 3 && c !== 'monk');
    if (z.kind === 'town' || z.kind === 'village') {
      if (z.kind === 'town') {   // the region's lord and his family: royalty at the court, nobles in a clan, elders, abbots or guild masters elsewhere
        const lordCls = cult.kind === 'court' ? 'royal' : cult.kind === 'clan' ? 'noble' : cult.kind === 'monastic' ? 'monk' : 'commoner';
        const lord = household(L, r, cult.id, lordCls, home, { age: r.int(34, 60), job: 'lord', kids: r.int(1, 4) });
        lord.lord = reg.id; reg.lord = lord.id;
      }
      for (let i = 0; i < HOUSES[z.kind]; i++) household(L, r, cult.id, r.weighted(commonCls), home, { plot: `${z.x},${z.y}:${i + 1}` });
    } else if (z.kind === 'camp') {
      const chief = makeActor(L, r, { cls: 'outlaw', culture: cult.id, home, age: r.int(28, 50), job: 'bandit' }); chief.chief = true; z.holder = chief.id;
      for (let i = 0; i < r.int(4, 7); i++) makeActor(L, r, { cls: r.chance(.8) ? 'outlaw' : 'ronin', culture: cult.id, home, age: r.int(17, 45), household: chief.id });
    } else if (z.kind === 'fort') {
      for (let i = 0; i < r.int(5, 8); i++) makeActor(L, r, { cls: r.chance(.4) ? 'retainer' : 'ashigaru', culture: cult.id, home, age: r.int(18, 45), sex: 'm' });
    } else if (z.kind === 'shrine') {
      for (let i = 0; i < r.int(1, 3); i++) makeActor(L, r, { cls: 'monk', culture: cult.id, home, age: r.int(20, 70) });
    }
  }
  // the ronin: masterless, no home, a little money, on the road by a village in the heart of the land
  const r = rngFor(L.seed, 'player'), vs = L.zones.filter(z => z.kind === 'village');
  const start = vs.sort((a, b) => Math.hypot(a.x - 50, a.y - 50) - Math.hypot(b.x - 50, b.y - 50))[0];
  const p = makeActor(L, r, { cls: 'ronin', culture: null, home: null, age: 28, sex: 'm', job: 'ronin' });
  p.weapon = 'katana'; p.traits = []; p.money = { mon: 120, silver: 0, ryo: 0 }; p.at = [start.x, start.y]; L.player = p.id;
}
// a household: its head, usually a spouse, children, sometimes an old parent; the head holds the family plot (title and possession)
function household(L, r, culture, cls, home, o = {}) {
  const sex = r.chance(.85) ? 'm' : 'f', head = makeActor(L, r, { cls, culture, home, sex, age: o.age ?? r.int(22, 55), job: o.job });
  head.household = head.id;
  let spouse = null;
  if (r.chance(.8)) { spouse = makeActor(L, r, { cls, culture, home, sex: sex === 'm' ? 'f' : 'm', age: Math.max(18, ageish(L, head) + r.int(-6, 4)), household: head.id }); marry(head, spouse); }
  const kids = o.kids ?? r.int(0, 4);
  for (let i = 0; i < kids && spouse; i++) { const age = Math.max(0, ageish(L, head) - r.int(18, 35)); if (age <= 0 && i > 0) break;
    bear(L, r, head.sex === 'f' ? head : spouse, head.sex === 'm' ? head : spouse, { age, cls }); }
  if (r.chance(.2)) { const elder = makeActor(L, r, { cls, culture, home, family: head.family, age: ageish(L, head) + r.int(20, 30), household: head.id }); head.parents.push(elder.id); elder.children.push(head.id); }
  if (o.plot) { L.plots[o.plot] = { title: head.id, holder: head.id }; head.holds.push(o.plot); }
  return head;
}
const ageish = (L, a) => Math.floor((L.hour - a.born) / HOURS_PER_YEAR);
