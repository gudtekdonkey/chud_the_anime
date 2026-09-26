import { emit, zoneAt } from '../ledger.js';
import { makeActor, ageOf } from '../actors.js';
import { LAWS, OFFICES, N, TRAIT, traitSum } from './data.js';
import { D, unkey, alive, lordOf, setZone, top, fealtyChanged } from './land.js';
import { heirOf, addKarma, worth, mortality } from './seams.js';

// ---- Governing: tax rates, laws, appointments whose personality and intelligence decide quality and honesty, vassal lords' loyalty,
// and succession when a lord dies (docs/dominion.md section 4) ----

// how good someone is in an office (q 0..1) and whether they are honest (skim: the share a dishonest steward takes)
// Intelligence decides how good; personality whether they are willing and honest (owner, 2026-09-26)
const FIT = {
  steward:    { good: ['scholar', 'calm', 'stoic', 'humble'], bad: ['lazy', 'drunk', 'slouch'] },
  magistrate: { good: ['stoic', 'grim', 'soldier', 'wary'], bad: ['drunk', 'lazy', 'cheerful'] },
  general:    { good: TRAIT.steady, bad: TRAIT.poor },
  envoy:      { good: TRAIT.sly.concat(['cheerful', 'regal']), bad: ['menacing', 'brawler', 'drunk'] },
};
export function officeQ(L, a, office) {
  const f = FIT[office], greed = traitSum(a, TRAIT.greedy);
  const q = Math.max(0, Math.min(1, .15 + .55 * (a.int ?? .5) + traitSum(a, f.good) * .12 - traitSum(a, f.bad) * .15));
  const honest = greed < .5 && (a.karma || 0) > -20;
  return { q: honest || office !== 'magistrate' ? q : q * .6, honest, skim: honest || office !== 'steward' ? 0 : .05 + .15 * (a.int ?? .5) };
}
export function appoint(L, lord, office, who) {
  if (!OFFICES.includes(office)) return { error: 'no such office' };
  const l = lordOf(L, lord); if (who && !alive(L, who)) return { error: 'they are not alive' };
  for (const o of OFFICES) if (who && l.off[o] === who) delete l.off[o];
  if (who) l.off[office] = who; else delete l.off[office];
  if (lord === L.player) emit(L, 'dom.appoint', { actor: lord, office, to: who || null, q: who ? +officeQ(L, L.actors[who], office).q.toFixed(2) : 0 });
  return l;
}
// who could serve a lord: grown people living in zones he holds, not lords themselves, not already in one of his offices
export function candidates(L, lord, homeIndex) {
  const l = D(L).lords[lord]; if (!l) return [];
  const taken = new Set(Object.values(l.off)), out = [];
  const idx = homeIndex || indexHomes(L);
  for (const k of l.zones) for (const id of idx[k] || []) { const a = L.actors[id];
    if (id === lord || taken.has(id) || D(L).lords[id]?.zones.length || ageOf(L, a) < 16 || a.cls === 'outlaw') continue; out.push(id); }
  return out;
}
export function indexHomes(L) { const idx = {}; for (const a of Object.values(L.actors)) if (a.alive && a.home) (idx[a.home[0] + ',' + a.home[1]] || (idx[a.home[0] + ',' + a.home[1]] = [])).push(a.id); return idx; }
// a lord fills his empty offices; a clever lord sees who is good, a dull one picks nearly at random
export function fillOffices(L, lord, idx, r) {
  const l = D(L).lords[lord], me = L.actors[lord];
  for (const o of OFFICES) {
    if (l.off[o] && alive(L, l.off[o])) continue;
    const c = candidates(L, lord, idx); if (!c.length) return;
    const pick = c.map(id => [id, officeQ(L, L.actors[id], o).q + r.range(-.5, .5) * (1 - (me.int ?? .5))]).sort((a, b) => b[1] - a[1])[0][0];
    appoint(L, lord, o, pick);
  }
}

// tax: the rate on his land and his vassals'. Higher tax, more koku and more unrest
export function setTax(L, lord, rate) {
  const l = lordOf(L, lord), v = +Math.max(N.TAX_MIN, Math.min(N.TAX_MAX, rate)).toFixed(2);
  if (Math.abs(v - l.tax) >= .05 || lord === L.player) emit(L, 'dom.tax', { actor: lord, rate: v, was: l.tax });
  l.tax = v; return l;
}
export function setLaw(L, lord, law, on) {
  if (!LAWS[law]) return { error: 'no such law' };
  const l = lordOf(L, lord); if (!!l.laws[law] === !!on) return l;
  if (on) l.laws[law] = L.hour; else delete l.laws[law];
  if (on && LAWS[law].karma) addKarma(L, lord, LAWS[law].karma);
  emit(L, 'dom.law', { actor: lord, law, on: !!on, name: LAWS[law].name });
  return l;
}

// ---- vassal lords: lords sworn to a liege pay him a share and fight in his wars; loyal, restless or rebellious ----
export function swear(L, vassal, liege, how) {
  const l = lordOf(L, vassal); if (vassal === liege || top(L, liege) === vassal) return null;
  l.liege = liege; l.loyalty = .7; fealtyChanged(L);
  for (const w of l.wars.slice()) { const war = D(L).wars[w]; if (war && (war.a === liege || war.d === liege)) l.wars.splice(l.wars.indexOf(w), 1); }
  emit(L, 'dom.fealty', { actor: vassal, liege, how }); return l;
}
export function lordsSeason(L, r) {
  const d = D(L);
  for (const l of Object.values(d.lords)) {
    if (!l.liege || !alive(L, l.id)) continue;
    if (!alive(L, l.liege)) { l.liege = null; fealtyChanged(L); continue; }
    const me = L.actors[l.id], lg = L.actors[l.liege], ll = d.lords[l.liege];
    const env = ll.off.envoy && alive(L, ll.off.envoy) ? officeQ(L, L.actors[ll.off.envoy], 'envoy').q : 0;
    const target = .6 + (me.culture === lg.culture ? .1 : -.1) + ((lg.karma || 0) < -20 ? -.1 : 0) + (ll.glory || 0) * .05 - (l.grudges[l.liege] || 0) * .4 + env * .15
      - traitSum(me, ['proud', 'restless', 'cocky']) * .1 - (ll.tax - N.TAX) * .5;
    const was = state(l);
    l.loyalty = +Math.max(0, Math.min(1, l.loyalty + (target - l.loyalty) * .2 + r.range(-.06, .06))).toFixed(3);
    if (state(l) !== was) emit(L, 'dom.vassal', { actor: l.id, liege: l.liege, state: state(l), lord: true });
  }
  for (const l of Object.values(d.lords)) if (l.glory) l.glory = +(l.glory * .8).toFixed(2);
}
const state = l => l.loyalty >= N.LOYAL ? 'loyal' : l.loyalty >= N.RESTLESS ? 'restless' : 'rebellious';
export const lordState = state;

// ---- succession: a dead lord's titles, holdings, treasury, offices, armies and wars pass to his heir (people lane: heirOf);
// with no heir, to his liege; with no liege, to the leading family of his seat ----
export function succeed(L, dead, r) {
  const d = D(L), l = d.lords[dead]; if (!l || alive(L, dead) || l.gone) return null;
  const da = L.actors[dead];
  let heir = heirOf(L, da), how = 'heir';
  if (!heir && l.liege && alive(L, l.liege)) { heir = l.liege; how = 'escheat'; }
  if (!heir && (l.titles.length || l.zones.length)) {
    const seat = l.seat || l.titles[0] || l.zones[0], s = d.set[seat];
    heir = s && s.vas.filter(v => alive(L, v)).sort((a, b) => worth(L.actors[b]) - worth(L.actors[a]))[0];
    if (!heir) { const [x, y] = unkey(seat), z = zoneAt(L, x, y), reg = L.regions[z.region];
      heir = makeActor(L, r, { cls: da.cls === 'outlaw' ? 'outlaw' : 'noble', culture: reg ? reg.culture : da.culture, home: [x, y], age: r.int(22, 45), job: da.job }).id; }
    how = 'rose';
  }
  l.gone = true;
  if (!heir) { for (const k of l.zones.slice()) setZone(L, k, { holder: null }, 'no heir'); return null; }
  transferAll(L, dead, heir, how);
  return heir;
}
export function transferAll(L, from, to, how) {
  const d = D(L), l = d.lords[from], h = lordOf(L, to), ha = L.actors[to], fa = L.actors[from];
  for (const k of l.titles.slice()) setZone(L, k, { title: to }, how);
  for (const k of l.zones.slice()) setZone(L, k, { holder: to }, how);
  const pids = new Set(fa.holds); for (const k of new Set([...h.titles, ...h.zones])) for (let n = 0; n < 16; n++) pids.add(`${k}:${n}`);
  for (const pid of pids) { const p = L.plots[pid]; if (!p) continue; if (p.title === from) { p.title = to; if (!ha.holds.includes(pid)) ha.holds.push(pid); } if (p.holder === from) p.holder = to; }
  for (const reg of L.regions) if (reg.lord === from) { reg.lord = to; ha.lord = reg.id; }
  if (fa.lord != null && ha.lord == null) ha.lord = fa.lord;
  if (how !== 'escheat') { ha.job = fa.job === 'lord' ? 'lord' : ha.job;
    h.rice += l.rice; h.tax = l.tax; h.laws = { ...l.laws }; h.seat = h.seat || l.seat; h.liege = h.liege || (l.liege !== to ? l.liege : null); h.loyalty = l.loyalty;
    for (const o of OFFICES) if (!h.off[o] && l.off[o] && l.off[o] !== to) h.off[o] = l.off[o];
    for (const [g, v] of Object.entries(l.grudges)) h.grudges[g] = Math.max(h.grudges[g] || 0, v);
    h.claims = [...new Set([...h.claims, ...l.claims])]; h.tribute = h.tribute.concat(l.tribute);
    const m = fa.money; ha.money.mon += m.mon; ha.money.silver += m.silver; ha.money.ryo += m.ryo; fa.money = { mon: 0, silver: 0, ryo: 0 }; }
  else h.rice += l.rice;
  l.rice = 0;
  for (const o of Object.values(d.lords)) {
    if (o.liege === from) o.liege = o.id === to ? null : to;
    if (o.grudges[from] != null) { o.grudges[to] = Math.max(o.grudges[to] || 0, o.grudges[from]); delete o.grudges[from]; }
    if (o.truce[from] != null) { o.truce[to] = o.truce[from]; delete o.truce[from]; }
    for (const t of o.tribute) if (t.to === from) t.to = to;
  }
  for (const a of Object.values(d.armies)) if (a.lord === from) a.lord = to;
  for (const w of Object.values(d.wars)) { if (w.end) continue; if (w.a === from) w.a = to; if (w.d === from) w.d = to;
    if (w.a === w.d) { w.end = L.hour; w.how = 'united'; } else if (!h.wars.includes(w.id)) h.wars.push(w.id); }
  for (const m of Object.values(d.dom)) { if (m.title === from) m.title = to; if (m.holder === from) m.holder = to; }
  for (const p of Object.values(d.prov)) { if (p.title === from) p.title = to; if (p.holder === from) p.holder = to; }
  for (const rm of Object.values(d.realms)) { if (rm.title === from) rm.title = to; if (rm.holder === from) rm.holder = to; }
  for (const v of Object.values(d.vas)) if (v.liege === from) v.liege = to;
  for (const s of Object.values(d.set)) if (s.founder === from) s.founder = to;
  for (const k of h.zones) { const s = d.set[k]; if (s) for (const id of s.b) if (d.bld[id].owner === from) d.bld[id].owner = to; }
  delete d.vas[to]; fealtyChanged(L);
  emit(L, 'dom.succession', { from, to, how, zones: h.zones.length });
}
// once a year: lords die of age (stand-in until the people lane), and any dead lord's land passes on
export function successionYear(L, r) {
  const d = D(L);
  for (const l of Object.values(d.lords)) {
    if (l.gone) continue;
    if (alive(L, l.id) && (l.zones.length || l.titles.length) && l.id !== L.player) mortality(L, L.actors[l.id], r);
    if (!alive(L, l.id) && (l.zones.length || l.titles.length || Object.keys(l.off).length)) succeed(L, l.id, r);
  }
}
