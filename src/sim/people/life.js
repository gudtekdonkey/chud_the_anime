import { emit, zoneAt } from '../ledger.js';
import { bear } from '../actors.js';
import { CLASSES, KINDS } from '../cultures.js';
import { HOURS_PER_SEASON, HOURS_PER_YEAR } from '../time.js';
import { AGE, VISITS, hazard, CLASS_HAZARD, VIOLENCE, VIOLENCE_OTHER, FAMINE, FAMINE_FROM, CHILDBIRTH, CONCEIVE, conceiveAge, conceiveKids, conceiveRoom, GESTATION,
  PURSE_NORM, EARN, SPEND, TIES, PLOT_PRICE, worth } from './rules.js';
import { act, alive, age, zkey, idKey, livingChildren } from './kin.js';
import { SETTLED, addResident, freePlot, grantPlot } from './settle.js';
import { killActor } from './death.js';
import { pay } from './marriage.js';
import { recordDeed, notable } from './player.js';
import { bond, fade } from './ties.js';

// ---- A life, lived twice a year: each game day lives one 56th of the people (actor ids by number mod BUCKET), so a day costs about a
// hundred people however long he is away. Death, conception and birth, growing up, a regent's years ending, needs, friends and rivals ----
const r2 = x => Math.round(x * 100) / 100;
export const BUCKET = 112 / VISITS;
export function liveBucket(L, day, r) {
  const b = day % BUCKET, max = L.ids.a || 0;
  for (let n = b || BUCKET; n <= max; n += BUCKET) { const a = L.actors[idKey(n)]; if (a && a.alive) live(L, a, r); }
}

export function live(L, a, r) {
  const P = L.sys.people, ag = age(L, a), k = zkey(a.home), s = k ? P.settle[k] : null, fed = s ? s.fed : 1;
  // ---- death ----
  let base = hazard(ag) * (CLASS_HAZARD[a.cls] || 1), fam = fed < FAMINE_FROM ? FAMINE * (FAMINE_FROM - fed) / FAMINE_FROM * (ag < 5 || ag > 60 ? 2 : 1) : 0;
  let vio = ag < 14 ? 0 : VIOLENCE[a.cls] ?? VIOLENCE_OTHER;
  const tr = a.traits;
  for (let i = 0; i < tr.length; i++) { const t = tr[i][0], v = tr[i][1]; if (t === 'drunk') base *= 1 + .3 * v; else if (t === 'brawler' || t === 'menacing' || t === 'cocky') vio *= 1 + .5 * v; }
  if (a.id === L.player) { fam = vio = 0; if (ag < AGE.OLD) base = 0; }   // the ledger never kills him young off screen; old age can
  const tot = Math.min(.95, base + fam + vio);
  if (r.next() < 1 - Math.pow(1 - tot, 1 / VISITS)) {
    const x = r.next() * (base + fam + vio);
    killActor(L, a.id, x < fam ? 'famine' : x < fam + vio ? 'violence' : ag >= AGE.OLD && r.chance(.75) ? 'age' : 'illness');
    return;
  }
  if (ag < AGE.WORK) { if (ag >= AGE.WORK - .5 && a.job === 'child') a.job = trade(L, a, r); return; }   // a child's needs are his house's
  // ---- children ----
  if (a.pregnant) { if (L.hour >= a.pregnant.due) birth(L, a, r); }
  else if (a.sex === 'f' && a.spouse != null && ag >= AGE.FERTILE[0] && ag < AGE.FERTILE[1] && s && SETTLED.has(s.kind)) {
    const h = alive(L, a.spouse);
    if (h && (h.id === L.player || zkey(h.home) === k)) {
      const kids = a.children.reduce((n, id) => n + (L.actors[id] && L.actors[id].alive && age(L, L.actors[id]) < AGE.ADULT ? 1 : 0), 0);
      const p = CONCEIVE * conceiveAge(ag) * conceiveKids(kids) * conceiveRoom(s.pop / Math.max(1, s.cap)) * Math.min(1, fed);
      if (r.chance(p)) a.pregnant = { father: h.id, due: L.hour + GESTATION * HOURS_PER_SEASON };
    }
  }
  // ---- growing up ----
  if (a.job === 'child' && ag >= AGE.WORK) a.job = trade(L, a, r);
  if (a.regent && ag >= AGE.ADULT) endRegency(L, a);
  // ---- needs and a season's living ----
  if (P.wages !== false && a.id !== L.player && a.job !== 'child' && ag < 65) {
    a.money.mon = Math.max(0, a.money.mon + Math.round((EARN[a.cls] ?? 40) * Math.min(1, fed)) - (SPEND[a.cls] ?? 35));
  }
  const w = worth(a.money), norm = PURSE_NORM[a.cls] || 100;
  const food = Math.min(1, fed * (w < norm * .1 ? .8 : 1));
  const nd = a.needs || (a.needs = { food: 1, money: 1, safety: 1 });
  nd.food = r2(food); nd.money = r2(Math.min(1, w / norm)); nd.safety = r2(1 - (s ? s.danger : .4));
  if (food < .45 && ag >= AGE.ADULT && r.chance(.05)) emit(L, 'people.desperate', { actor: a.id, need: 'food', zone: a.home });
  // ---- friends, rivals and grudges ----
  if (a.ties) fade(L, a);
  if (k && r.chance(TIES.MEET)) { const ids = P.res[k]; if (ids && ids.length > 1) { const b = L.actors[ids[r.int(0, ids.length - 1)]]; if (b && b.alive && b !== a && b.household !== a.household) meet(L, a, b, r); } }
}

function birth(L, m, r) {
  const P = L.sys.people, f = act(L, m.pregnant.father) || m, due = m.pregnant.due;   // lived at the visit after the day, dated to the day
  m.pregnant = null;
  const c = bear(L, r, m, f, { cls: f.cls === 'monk' ? m.cls : f.cls });
  c.born = Math.min(L.hour, due); c.job = 'child'; c.home = m.home ? [...m.home] : null; c.household = m.household ?? f.household;
  if (c.culture == null) c.culture = m.culture;
  const parent = r.chance(.5) ? f : m;   // a nature runs in the family
  if (parent.traits.length && r.chance(.5)) { const [t, v] = r.pick(parent.traits); if (!c.traits.some(([u]) => u === t)) c.traits.push([t, +(v * .8).toFixed(2)]); }
  if (m.dynasty || f.dynasty) c.dynasty = true;
  c.needs = { food: 1, money: 0, safety: 1 };
  addResident(L, c);
  P.stats.births++; P.year.births++;
  if (notable(L, c)) {
    const what = `${c.sex === 'm' ? 'a son' : 'a daughter'}, ${c.given}, was born`;
    recordDeed(L, f.id, what); recordDeed(L, m.id, what);
    emit(L, 'people.born', { actor: c.id, mother: m.id, father: f.id, zone: c.home });
  }
  if (r.chance(CHILDBIRTH)) killActor(L, m.id, 'childbirth');
}
// a trade at twelve: a son usually follows his father's, anyone may take another of the class
function trade(L, a, r) {
  const jobs = (CLASSES[a.cls] || CLASSES.commoner).jobs.filter(j => j !== 'lord' && j !== 'abbot'), f = act(L, a.parents[0]);
  if (f && jobs.includes(f.job) && r.chance(a.sex === 'm' ? .7 : .35)) return f.job;
  return jobs.length ? r.pick(jobs) : 'courtier';
}
// a ward comes of age: the land held for him is his to hold, and, if his parent was holding for him, the house is his to head
function endRegency(L, a) {
  const reg = alive(L, a.regent);
  for (const pid of a.holds) { const rec = L.plots[pid]; if (rec && rec.title === a.id && (rec.holder === a.regent || rec.holder == null)) rec.holder = a.id; }
  if (reg) {
    if (reg.wards) { const i = reg.wards.indexOf(a.id); if (i >= 0) reg.wards.splice(i, 1); }
    if (reg.household === reg.id && a.parents.includes(reg.id) && a.holds.length && a.home && zkey(a.home) === zkey(reg.home)) {
      const ids = L.sys.people.res[zkey(a.home)] || [];
      for (const id of ids) { const m = L.actors[id]; if (m && m.alive && m.household === reg.id) m.household = a.id; }
      a.household = a.id;
    }
  }
  emit(L, 'people.cameOfAge', { actor: a.id, regent: a.regent, plots: a.holds.length, zone: a.home });
  a.regent = null;
}

// ---- ties: people outside the family meet, take to each other or not; ties fade unless renewed, grudges slowest ----
function meet(L, a, b, r) {
  let c = r.range(-.35, .35);
  if (a.traits.some(([t]) => b.traits.some(([u]) => u === t))) c += .25;
  if (a.cls === b.cls) c += .08;
  const kind = a.culture != null && L.cultures[a.culture] ? KINDS[L.cultures[a.culture].kind] : null;
  if (kind && b.traits.some(([t]) => kind.despise.includes(t))) c -= .4;
  if (c > TIES.FRIEND) { bond(a, b.id, .25); bond(b, a.id, .25); }
  else if (c < -TIES.FRIEND) { bond(a, b.id, -.25); bond(b, a.id, -.25); }
}

// ---- once a year: ambitions for the ones who matter, and the census ----
export function yearOf(L, cal, r) {
  const P = L.sys.people;   // runs right after the residents are rebuilt: everyone with a home is in P.res
  let pop = P.homeless || 0, houses = 0;
  for (const k in P.res) for (const id of P.res[k]) {
    const a = L.actors[id]; if (!a || !a.alive) continue;
    pop++; if (a.household === a.id) houses++;
    if (a.id !== L.player && age(L, a) >= AGE.ADULT) ambition(L, a, r);
  }
  if (P.fadeAfter > 0) fadeTheDead(L, P.fadeAfter);
  P.census.push({ year: cal.year - 1, pop, houses, ...P.year });
  if (P.census.length > 400) P.census.shift();
  P.year = { births: 0, deaths: 0, marriages: 0 };
}
// ---- forgetting (off unless L.sys.people.fadeAfter is set, in years): the long dead who were nobody in particular keep only who they were,
// whose child and whose parent, and where they lie. It removes other systems' fields from those records, so it waits for the integrator ----
const KEEP_DEAD = new Set(['id', 'given', 'family', 'sex', 'born', 'died', 'alive', 'cause', 'killer', 'culture', 'cls', 'parents', 'children', 'spouse', 'grave', 'faded']);
function fadeTheDead(L, years) {
  const before = L.hour - years * HOURS_PER_YEAR;
  for (let n = 1, max = L.ids.a || 0; n <= max; n++) {
    const a = L.actors[idKey(n)];
    if (!a || a.alive || a.faded || a.died > before || notable(L, a)) continue;
    for (const k of Object.keys(a)) if (!KEEP_DEAD.has(k)) delete a[k];
    a.faded = true;
  }
}

function ambition(L, a, r) {
  const P = L.sys.people, am = a.ambition;
  if (am) {
    if (am.kind === 'revenge' && !alive(L, am.target)) { a.ambition = null; return; }
    const z = am.kind === 'land' && a.home && zoneAt(L, a.home[0], a.home[1]), price = z ? PLOT_PRICE[z.kind] || 4000 : 0;
    if (z && SETTLED.has(z.kind) && worth(a.money) >= price * 1.1) {
      const pid = freePlot(L, z);
      if (pid) {
        pay(a, alive(L, L.regions[z.region].lord), price); grantPlot(L, pid, a); P.stats.bought++; a.ambition = null;
        recordDeed(L, a.id, 'bought a plot from the lord');
        emit(L, 'people.plotBought', { actor: a.id, plot: pid, price, zone: [z.x, z.y] });
        return;
      }
    }
    if (am.kind !== 'revenge' && L.hour - am.since > 15 * HOURS_PER_YEAR) a.ambition = null;   // given up after fifteen years
    return;
  }
  const eager = a.traits.some(([t]) => t === 'eager' || t === 'proud' || t === 'vain') ? .1 : 0;
  if (a.household === a.id && a.holds.length && a.holds.length < 3 && a.rank <= 2 && a.lord == null && r.chance(.12 + eager)) a.ambition = { kind: 'land', since: L.hour };
  else if (a.chief && r.chance(.3)) { a.ambition = { kind: 'zone', since: L.hour }; emit(L, 'people.ambition', { actor: a.id, kind: 'zone', zone: a.home }); }
  else if (a.job === 'merchant') { if (a.household === a.id && r.chance(.1 + eager)) a.ambition = { kind: 'wealth', since: L.hour }; }
  else {
    const f = alive(L, a.parents[0]);
    if (f && f.lord != null && L.regions[f.lord].lord === f.id && a.sex === 'm' && age(L, f) >= 55) {
      const heir = livingChildren(L, f).find(c => c.sex === 'm');
      if (heir && heir !== a && r.chance(.2 + eager)) {
        a.ambition = { kind: 'seat', target: heir.id, since: L.hour }; bond(a, heir.id, -.5); bond(heir, a.id, -.5);
        emit(L, 'people.succession', { actor: a.id, lord: f.id, heir: heir.id, region: f.lord, zone: f.home });
      }
    } else if (a.cls === 'retainer' && r.chance(.05 + eager)) a.ambition = { kind: 'favour', since: L.hour };
  }
}
