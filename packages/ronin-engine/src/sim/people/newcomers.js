import { emit, zoneAt } from '../ledger.js';
import { makeActor, marry, bear } from '../actors.js';
import { CLASSES, KINDS } from '../packs/edo/cultures.js';
import { HOURS_PER_YEAR } from '../time.js';
import { AGE, NEWCOMERS } from '../packs/edo/people.js';
import { SETTLED, addResident } from './settle.js';

// ---- Newcomers: a violent time (owner 2026-09-26: 30% of grown people die by the sword a year) empties villages faster than children
// can grow up, so the owner chose to refill them: wanderers, refugees and settlers arrive from beyond the map ----
// Each season a town or village below its founding size (settle.base, capped at TARGET of what its land feeds) takes in a share of the gap, a household at a time: a grown head,
// often a spouse, a few children, on a free plot the lord grants. Mostly the region's own people, now and then from another culture.
export function arrive(L, r) {
  const P = L.sys.people; let total = 0;
  for (const k in P.settle) {
    const s = P.settle[k]; if (!SETTLED.has(s.kind)) continue;
    if (s.base == null) s.base = s.pop;   // refill to what it was when first seen, never past what its land feeds
    const gap = Math.min(s.base, s.cap * NEWCOMERS.TARGET) - s.pop; if (gap <= 0) continue;
    const [x, y] = k.split(',').map(Number), z = zoneAt(L, x, y), home = [x, y];
    let want = Math.min(NEWCOMERS.MAX, Math.ceil(gap * NEWCOMERS.SHARE)), came = 0;
    while (want > 0) {
      const culture = r.chance(NEWCOMERS.STRANGER) ? r.int(0, L.cultures.length - 1) : L.regions[z.region].culture;
      const n = household(L, r, culture, home, z); if (!n) break;
      want -= n; came += n;
    }
    if (came) { total += came; emit(L, 'people.arrived', { zone: home, region: z.region, n: came }); }
  }
  P.stats.arrived = (P.stats.arrived || 0) + total;
}

// one arriving household; returns how many came
function household(L, r, culture, home, z) {
  const kind = KINDS[L.cultures[culture].kind], common = kind.classes.filter(([c]) => CLASSES[c].rank <= 3 && c !== 'monk');
  const cls = r.chance(NEWCOMERS.RONIN) ? 'ronin' : r.weighted(common.length ? common : [['commoner', 1]]);
  const head = makeActor(L, r, { cls, culture, home, age: r.int(AGE.ADULT, 40), sex: r.chance(.8) ? 'm' : 'f' });
  head.household = head.id; head.arrived = L.hour; came(L, head);
  let n = 1;
  if (r.chance(NEWCOMERS.WED)) {
    const sp = makeActor(L, r, { cls, culture, home, age: r.int(AGE.ADULT, 40), sex: head.sex === 'm' ? 'f' : 'm', household: head.id });
    marry(head, sp); sp.arrived = L.hour; came(L, sp); n++;
    const [mo, fa] = head.sex === 'f' ? [head, sp] : [sp, head];
    for (let i = 0, kids = r.int(0, NEWCOMERS.KIDS); i < kids; i++) { const c = bear(L, r, mo, fa, { age: r.int(0, 12), cls }); c.job = 'child'; c.arrived = L.hour; came(L, c); n++; }
  }
  head.ambition = { kind: 'land', since: L.hour };   // they come landless and want land (owner: no free plots; the economy sells it)
  return n;
}
function came(L, a) { if (a.job !== 'child' && (L.hour - a.born) / HOURS_PER_YEAR < AGE.WORK) a.job = 'child'; a.needs = { food: 1, money: 1, safety: 1 }; addResident(L, a); }
