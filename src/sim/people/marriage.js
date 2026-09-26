import { emit } from '../ledger.js';
import { marry } from '../actors.js';
import { KINDS } from '../cultures.js';
import { AGE, WED_STANDING, WED_CHANCE, REWED_CHANCE, WED_RANK_GAP, MUKOYOSHI, BRIDE_PRICE, SILVER_MON, RYO_MON, worth } from './rules.js';
import { act, alive, age, closeKin, livingChildren, siblings, zkey } from './kin.js';
import { SETTLED, residents, moveHome } from './settle.js';
import { recordDeed, notable } from './player.js';
import { tieValue, setTie } from './ties.js';

// ---- Marriage: the seasonal match within each region, and the wedding that moves a bride into her husband's house ----
export function single(L, a, sex) {
  if (!a.alive || a.spouse != null || a.sex !== sex || a.cls === 'monk' || a.id === L.player) return false;
  const ag = age(L, a), [lo, hi] = sex === 'm' ? AGE.WED_M : AGE.WED_F;
  return ag >= lo && ag < hi;
}
const cultureOk = (L, a, b) => a.culture === b.culture || (a.culture != null && b.culture != null && (L.cultures[a.culture].relations[b.culture] ?? 0) > .3);

export function marketSeason(L, r) {
  const P = L.sys.people, men = {}, women = {};
  for (const k in P.settle) {
    const s = P.settle[k]; if (!SETTLED.has(s.kind)) continue;
    for (const a of residents(L, k)) { if (single(L, a, 'm')) (men[s.region] || (men[s.region] = [])).push(a); else if (single(L, a, 'f')) (women[s.region] || (women[s.region] = [])).push(a); }
  }
  for (const g in women) {
    const ms = men[g]; if (!ms || !ms.length) continue;
    for (const w of r.shuffle(women[g])) {
      if (!r.chance(w.formerSpouses ? REWED_CHANCE : WED_CHANCE)) continue;
      const wa = age(L, w);
      let best = -1, bi = -1;
      for (let t = 0; t < 10 && t < ms.length; t++) {
        const i = r.int(0, ms.length - 1), m = ms[i], gap = age(L, m) - wa;
        if (gap < -4 || gap > 16 || Math.abs(m.rank - w.rank) > WED_RANK_GAP || !cultureOk(L, m, w) || closeKin(L, m, w)) continue;
        const score = (m.home[0] === w.home[0] && m.home[1] === w.home[1] ? 1 : 0) + (m.cls === w.cls ? .5 : 0) - Math.abs(gap - 3) * .05 + r.next() * .5;
        if (score > best) { best = score; bi = i; }
      }
      if (bi < 0) continue;
      const m = ms.splice(bi, 1)[0];
      wed(L, m, w, Math.round(BRIDE_PRICE[w.cls] * .3), r);
      if (!ms.length) break;
    }
  }
}

// money changes hands: mon first, then silver, then gold, with change back in mon. Returns what was paid, in mon
export function pay(from, to, amount) {
  let left = Math.min(amount, worth(from.money)); const paid = left;
  const take = (k, unit) => { while (left > 0 && (from.money[k] || 0) > 0) { const n = Math.min(from.money[k], Math.ceil(left / unit)); from.money[k] -= n; if (to) to.money[k] = (to.money[k] || 0) + n; left -= n * unit; } };
  take('mon', 1); take('silver', SILVER_MON); take('ryo', RYO_MON);
  if (left < 0) { from.money.mon += -left; if (to) to.money.mon -= -left; }   // change
  return paid;
}
const headOf = (L, a) => alive(L, a.household) || a;
const eldestSon = (L, p) => p ? livingChildren(L, p).find(c => c.sex === 'm') : null;

// h and w marry: the bride price goes from his house to hers, and she joins his household (or he hers, taken in as its heir)
export function wed(L, h, w, price = 0, r = null) {
  const P = L.sys.people;
  if (h.sex !== 'm') [h, w] = [w, h];
  const bridesHead = headOf(L, w), grooms = headOf(L, h);
  if (price > 0 && bridesHead !== grooms) price = pay(grooms === h || worth(grooms.money) < price ? h : grooms, bridesHead, price);
  // mukoyōshi: a sonless house of a clan, a court or a league takes in a younger son as its heir, and he takes its name
  const kind = w.culture != null && L.cultures[w.culture] ? L.cultures[w.culture].kind : null;
  const father = act(L, w.parents[0]), fatherHead = father && father.alive && father.household === father.id ? father : null;
  const younger = siblings(L, h).some(s => s.alive && s.sex === 'm' && s.born < h.born);
  const muko = fatherHead && !eldestSon(L, fatherHead) && ['clan', 'court', 'merchants'].includes(kind) && younger && h.household !== h.id && !h.holds.length && h.id !== L.player
    && h.lord == null && !!r && r.chance(MUKOYOSHI);
  const wasFamily = w.family;
  marry(h, w);
  if (muko) {
    h.family = w.family = wasFamily; h.adoptedBy = fatherHead.id; fatherHead.heir = h.id;
    h.household = fatherHead.id; if (zkey(h.home) !== zkey(fatherHead.home)) moveHome(L, h, fatherHead.home);
    P.stats.adopted++;
  } else {
    // she joins his house; a man with no house (a soldier, the ronin, a wanderer) heads one with her, where she lives
    if (h.household == null || h.id === L.player) { h.household = h.id; if (!h.home && w.home) moveHome(L, h, w.home); }
    if (w.household === w.id && w.holds.length && !h.holds.length && h.household !== h.id) {   // a landed widow takes her new husband in
      h.household = w.id; if (zkey(h.home) !== zkey(w.home)) moveHome(L, h, w.home);
    } else {
      // a younger son wants land of his own to found a house on; he stays in his father's house until he has it (owner 2026-09-26: no free
      // plots from the lord; the economy lane prices land and sells or auctions it). The heir stays in his father's house for good
      const fatherH = act(L, h.parents[0]);
      if (h.household !== h.id && !(fatherH && fatherH.alive && eldestSon(L, fatherH) === h) && !h.ambition && h.id !== L.player) h.ambition = { kind: 'land', since: L.hour };
      if (w.household === w.id && w.id !== h.household) for (const m of residents(L, zkey(w.home))) if (m.household === w.id && m !== w && m.parents.includes(w.id)) {
        m.household = h.household; if (h.home && zkey(m.home) !== zkey(h.home)) moveHome(L, m, h.home); }   // her children come with her
      w.household = h.household;
      if (h.home && zkey(w.home) !== zkey(h.home)) moveHome(L, w, h.home);
    }
  }
  if (h.dynasty || w.dynasty || h.id === L.player || w.id === L.player) h.dynasty = w.dynasty = true;
  for (const [me, them] of [[h, w], [w, h]]) if (me.id === L.player && them.culture != null)   // her people count him as one of their own now
    me.standing[them.culture] = Math.min(1, Math.round(((me.standing[them.culture] || 0) + WED_STANDING) * 100) / 100);
  P.stats.marriages++; P.year.marriages++;
  if (notable(L, h) || notable(L, w)) {
    recordDeed(L, h.id, `married ${w.given} ${w.family}`); recordDeed(L, w.id, `married ${h.given} ${h.family}`);
    emit(L, 'people.married', { actor: h.id, spouse: w.id, zone: h.home, price, adopted: !!muko, player: h.id === L.player || w.id === L.player });
  }
}

// ---- his own courtship (owner 2026-09-26: he can court, marry and have children) ----
// judge(L, suitor, bride): would her house accept him? By class (within a rank, or standing to reach higher), her people's standing
// of him, the two cultures' relations, his karma, and the bride price he can pay. { ok, accept (0..1), price, reasons: [...] }
export function judge(L, suitor, bride) {
  const reasons = [];
  if (!bride || !bride.alive) return { ok: false, accept: 0, price: 0, reasons: ['gone'] };
  if (bride.spouse != null) reasons.push('already married');
  if (bride.sex === suitor.sex) reasons.push('not a match');
  if (age(L, suitor) < AGE.ADULT) reasons.push('he is too young to wed');
  const ba = age(L, bride); if (ba < AGE.ADULT) reasons.push('too young');
  if (bride.cls === 'monk') reasons.push('a nun keeps her vows');
  if (closeKin(L, suitor, bride)) reasons.push('close kin');
  const standing = bride.culture != null ? (suitor.standing[bride.culture] ?? 0) : 0;
  const rel = suitor.culture != null && bride.culture != null && suitor.culture !== bride.culture ? (L.cultures[suitor.culture].relations[bride.culture] ?? 0) : 0;
  const gap = bride.rank - suitor.rank;   // how far above him she stands
  const kind = bride.culture != null ? L.cultures[bride.culture].kind : null, despised = kind ? KINDS[kind].despise : [];
  const hated = suitor.traits.filter(([t]) => despised.includes(t)).length;
  let accept = .55 + standing * .5 + rel * .25 + Math.min(.2, (suitor.karma || 0) * .2) - Math.max(0, gap) * .22 - hated * .15;
  if (gap >= 3 && standing < .8) reasons.push('her house is far above him');
  if (kind !== 'bandits' && (suitor.karma || 0) < -.4) reasons.push('his name is dark');
  if (standing < -.2) reasons.push('her people do not trust him');
  const price = Math.round((BRIDE_PRICE[bride.cls] || 1000) * (1 + Math.max(0, gap) * .5) * (1 - Math.max(0, standing) * .4));
  if (worth(suitor.money) < price) reasons.push(`the bride price is ${price} mon`);
  const tie = tieValue(suitor, bride.id);
  if (tie < .4) reasons.push('she hardly knows him');
  accept = Math.max(0, Math.min(1, accept));
  if (accept < .5 && !reasons.length) reasons.push('her family refuses');
  return { ok: !reasons.length, accept: +accept.toFixed(2), price, tie: +tie.toFixed(2), reasons };
}
// a visit: gifts, talk, a walk by the river. Warms her to him by how well their natures fit (shared traits, what her people despise)
export function court(L, suitorId, brideId, r) {
  const s = alive(L, suitorId), b = alive(L, brideId); if (!s || !b) return 0;
  const shared = s.traits.filter(([t]) => b.traits.some(([u]) => u === t)).length;
  const kind = b.culture != null ? L.cultures[b.culture].kind : null, hated = kind ? s.traits.filter(([t]) => KINDS[kind].despise.includes(t)).length : 0;
  const v = Math.max(0, Math.min(1, tieValue(s, brideId) + .12 + shared * .06 - hated * .05 + (r ? r.range(-.04, .06) : 0)));
  setTie(s, brideId, 'lover', v); setTie(b, suitorId, 'lover', v);
  return v;
}
export function propose(L, suitorId, brideId) {
  const s = alive(L, suitorId), b = alive(L, brideId), j = judge(L, s, b);
  if (!j.ok) return j;
  pay(s, headOf(L, b), j.price);
  wed(L, s, b, 0);
  return { ...j, wed: true };
}
// the brides he could court near where he stands: unmarried grown women (maidens and widows) in the settlements within `radius` zones,
// nearest first
export function brides(L, suitorId, radius = 6) {
  const s = alive(L, suitorId), at = s && (s.at || s.home); if (!at) return [];
  const P = L.sys.people, out = [];
  for (const k in P.settle) {
    const i = k.indexOf(','), x = +k.slice(0, i), y = +k.slice(i + 1), d = Math.max(Math.abs(x - at[0]), Math.abs(y - at[1]));
    if (d > radius || !SETTLED.has(P.settle[k].kind)) continue;
    for (const b of residents(L, k)) if (b.sex !== s.sex && b.spouse == null && b.id !== s.id && age(L, b) >= AGE.ADULT && age(L, b) < 45 && b.cls !== 'monk') out.push([d, b]);
  }
  return out.sort((a, b) => a[0] - b[0] || (a[1].id < b[1].id ? -1 : 1)).map(([, b]) => b);
}
