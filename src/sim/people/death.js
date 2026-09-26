import { emit, zoneAt } from '../ledger.js';
import { INHERIT } from './rules.js';
import { act, alive, age, adult, livingChildren, siblings, grandchildren, nearKin, eldest } from './kin.js';
import { residents, dropResident, moveHome, graveTile } from './settle.js';
import { handOff, recordDeed, notable } from './player.js';
import { setTie } from './ties.js';

// ---- Death: the one door every system kills through (docs/sim-people.md) ----
// killActor(L, id, cause, by, { zone, tile }): the body, the grave, the widow, the grudges, the inheritance, the lord's seat, the event,
// and the ronin's hand-off to his heir. cause: 'age' | 'illness' | 'famine' | 'violence' | 'childbirth' | 'execution' | 'duel' | anything a
// lane needs. by: the killer's actor id, or null. Returns the inheritance record, or null if he was already dead.
export function killActor(L, id, cause = 'illness', by = null, o = {}) {
  const a = alive(L, id); if (!a) return null;
  const P = L.sys.people, zone = o.zone || a.at || a.home || null, isPlayer = id === L.player;
  a.alive = false; a.died = L.hour; a.cause = cause; if (by != null) a.killer = by;
  a.grave = zone ? { zone: [zone[0], zone[1]], tile: o.tile || graveTile(L, zone, id) } : null;
  if (a.pregnant) a.pregnant = null;
  if (a.needs) a.needs = null; if (a.ties) a.ties = null; if (a.ambition) a.ambition = null;   // the dead want nothing (and save small)
  const sp = alive(L, a.spouse);
  if (sp) { sp.spouse = null; (sp.formerSpouses || (sp.formerSpouses = [])).push(a.id); }
  // a murder is remembered: his near kin hold a grudge, and the eldest grown man among them swears to avenge him
  const killer = alive(L, by);
  if (killer) {
    const kin = nearKin(L, a);
    for (const k of kin) setTie(k, by, 'grudge', -1);
    const avenger = kin.filter(k => k.sex === 'm' && adult(L, k)).sort((x, y) => x.born - y.born)[0];
    if (avenger && !avenger.ambition) { avenger.ambition = { kind: 'revenge', target: by, victim: a.id, since: L.hour };
      emit(L, 'people.vendetta', { actor: avenger.id, target: by, victim: a.id, zone: avenger.home || zone }); }
  }
  const est = passEstate(L, a);
  if (a.household === a.id) rehouse(L, a, est.heir);
  if (a.lord != null && L.regions[a.lord] && L.regions[a.lord].lord === a.id) passSeat(L, a, est.heir);
  if (a.chief) passBand(L, a);
  if (a.wards) for (const w of a.wards) { const c = alive(L, w); if (c && c.regent === a.id && !adult(L, c)) setRegent(L, c, pickRegent(L, c, a)); }
  dropResident(L, a);
  P.stats.deaths[cause] = (P.stats.deaths[cause] || 0) + 1; P.year.deaths++;
  if (notable(L, a) && a.grave) P.graves.push({ actor: a.id, name: `${a.given} ${a.family}`, zone: a.grave.zone, tile: a.grave.tile, born: a.born, died: a.died, cause, by: by ?? null,
    player: isPlayer, deeds: (a.deeds || []).map(d => d.text) });
  emit(L, 'people.died', { actor: id, cause, by: by ?? null, zone, age: Math.floor(age(L, a)), heir: est.heir ? est.heir.id : null, plots: est.plots });
  if (est.heir && est.plots) emit(L, 'people.inherited', { actor: est.heir.id, from: id, plots: est.plots, rule: est.rule, regent: est.regent ? est.regent.id : null, zone: est.heir.home || zone });
  if (isPlayer) handOff(L, a, est);
  return est;
}

// ---- inheritance: land (plot titles and actor.holds) and wealth to the heir by his culture's rule (rules.js INHERIT) ----
export function rulesFor(L, a) {
  if (a.id === L.player || a.culture == null || !L.cultures[a.culture]) return INHERIT.player;
  return INHERIT[L.cultures[a.culture].kind] || INHERIT.clan;
}
const canInherit = (L, c, dead) => c && c.alive && c.id !== dead.id && c.cls !== 'monk';
export function findHeir(L, a) {
  const rule = rulesFor(L, a);
  for (const r of rule.order) {
    let c = null;
    if (r === 'named') c = alive(L, a.heir);
    else if (r === 'son') c = eldest(livingChildren(L, a).filter(k => k.sex === 'm' && k.cls !== 'monk'));
    else if (r === 'daughter') c = eldest(livingChildren(L, a).filter(k => k.sex === 'f' && k.cls !== 'monk'));
    else if (r === 'child') c = eldest(livingChildren(L, a).filter(k => k.cls !== 'monk'));
    else if (r === 'grandson') c = eldest(grandchildren(L, a, true));
    else if (r === 'grandchild') c = eldest(grandchildren(L, a, false));
    else if (r === 'widow') c = alive(L, a.spouse) && adult(L, alive(L, a.spouse)) ? alive(L, a.spouse) : null;
    else if (r === 'brother') c = eldest(siblings(L, a).filter(s => s.alive && s.sex === 'm' && adult(L, s) && s.cls !== 'monk'));
    else if (r === 'sibling') c = eldest(siblings(L, a).filter(s => s.alive && adult(L, s) && s.cls !== 'monk'));
    if (canInherit(L, c, a)) return { heir: c, rule: r };
  }
  return { heir: null, rule: 'none' };
}
// who holds a minor heir's land until he comes of age: his living parent, else his eldest grown sibling, else the dead man's grown kin
export function pickRegent(L, heir, dead) {
  const ok = p => p && p.alive && p.id !== dead.id && p.id !== heir.id && adult(L, p);
  for (const pid of heir.parents) { const p = act(L, pid); if (ok(p)) return p; }
  const sib = siblings(L, heir).find(ok); if (sib) return sib;
  return nearKin(L, dead).filter(ok).sort((x, y) => x.born - y.born)[0] || null;
}
function setRegent(L, heir, regent) {
  const old = alive(L, heir.regent);
  heir.regent = regent ? regent.id : null;
  if (regent) (regent.wards || (regent.wards = [])).includes(heir.id) || regent.wards.push(heir.id);
  for (const pid of heir.holds) { const rec = L.plots[pid]; if (rec && rec.title === heir.id && (rec.holder == null || rec.holder === (old && old.id) || !alive(L, rec.holder)))
    rec.holder = regent ? regent.id : heir.id; }
}
function lordOf(L, pid, dead) {
  const [x, y] = pid.split(':')[0].split(',').map(Number), z = zoneAt(L, x, y), reg = z && L.regions[z.region];
  const lord = reg ? alive(L, reg.lord) : null;
  return lord && lord.id !== dead.id ? lord : null;
}
export function passEstate(L, a) {
  const P = L.sys.people, { heir, rule } = findHeir(L, a), split = rulesFor(L, a).split;
  const plots = a.holds.filter(pid => L.plots[pid] && L.plots[pid].title === a.id);
  let regent = null;
  if (heir && !adult(L, heir)) regent = pickRegent(L, heir, a);
  for (const pid of plots) {
    const rec = L.plots[pid], held = rec.holder === a.id;
    if (heir) { rec.title = heir.id; if (held) rec.holder = regent ? regent.id : heir.id; if (!heir.holds.includes(pid)) heir.holds.push(pid); }
    else { const lord = lordOf(L, pid, a);
      rec.title = lord ? lord.id : null; if (held) rec.holder = lord ? lord.id : null;
      if (lord && !lord.holds.includes(pid)) lord.holds.push(pid);
      lord ? P.stats.toLord++ : P.stats.toNature++; }
  }
  a.holds = [];
  if (heir && regent) { heir.regent = regent.id; (regent.wards || (regent.wards = [])).push(heir.id); P.stats.regencies++; }
  if (heir) { P.stats.inherited += plots.length; if (plots.length) P.stats.estates++; }
  // the money: the heir's, the widow's third, or shared among the children and the widow
  const widow = alive(L, a.spouse), m = a.money;
  if (heir || widow) {
    let shares;
    if (split === 'equal') { shares = livingChildren(L, a).filter(c => c.cls !== 'monk'); if (widow && !shares.includes(widow)) shares.push(widow); if (heir && !shares.includes(heir)) shares.unshift(heir); }
    else shares = heir ? (widow && widow !== heir ? [heir, heir, widow] : [heir]) : [widow];
    for (const k of ['mon', 'silver', 'ryo']) { const v = m[k] || 0, each = Math.floor(v / shares.length);
      shares.forEach((s, i) => s.money[k] = (s.money[k] || 0) + each + (i === 0 ? v - each * shares.length : 0)); m[k] = 0; }
  }
  if (heir) recordDeed(L, heir.id, `inherited from ${a.given} ${a.family}` + (plots.length ? ` (${plots.length} plot${plots.length > 1 ? 's' : ''})` : ''));
  return { heir, rule, regent, plots: plots.length };
}

// ---- the house after its head: the heir (or the widow, or the eldest grown member) heads it; orphans go to kin ----
function rehouse(L, a, heir) {
  const members = a.home ? residents(L, a.home[0] + ',' + a.home[1]).filter(m => m.household === a.id && m.id !== a.id) : [];
  if (!members.length) return;
  const grown = members.filter(m => adult(L, m)).sort((x, y) => x.born - y.born);
  let head = heir && members.includes(heir) && adult(L, heir) ? heir : null;
  head = head || (alive(L, a.spouse) && members.includes(alive(L, a.spouse)) ? alive(L, a.spouse) : null) || grown.find(m => m.sex === 'm') || grown[0] || null;
  if (!head) {   // only children left: the heir's house, else a grown kinsman's, else the settlement's first house takes them in
    const kin = [heir, ...nearKin(L, a)].filter(k => k && k.alive && adult(L, k) && k.household)[0];
    const host = kin ? act(L, kin.household) || kin : null;
    const fallback = host || (a.home ? residents(L, a.home[0] + ',' + a.home[1]).filter(m => m.household === m.id && m.id !== a.id).sort((x, y) => y.holds.length - x.holds.length)[0] : null);
    for (const m of members) { if (fallback) { m.household = fallback.household || fallback.id; if (fallback.home && (fallback.home[0] !== m.home[0] || fallback.home[1] !== m.home[1])) moveHome(L, m, fallback.home); } else m.household = m.id; }
    return;
  }
  for (const m of members) m.household = head.id;
  head.household = head.id;
}

// ---- a lord's seat: to his heir (a minor rules through a regent), else the region's highest-ranked grown man takes it ----
function passSeat(L, a, heir) {
  const reg = L.regions[a.lord];
  let to = heir && heir.alive ? heir : null, how = to ? (adult(L, to) ? 'heir' : 'regent') : 'seized';
  if (!to) {
    const P = L.sys.people, cands = [];
    for (const k in P.settle) if (P.settle[k].region === reg.id) for (const p of residents(L, k)) { const ag = age(L, p); if (ag >= 20 && ag < 65 && p.id !== L.player) cands.push(p); }
    cands.sort((x, y) => y.rank - x.rank || (y.sex === 'm') - (x.sex === 'm') || x.born - y.born || (x.id < y.id ? -1 : 1));
    to = cands[0] || null;
  }
  reg.lord = to ? to.id : null;
  if (to) { to.lord = reg.id; to.job = 'lord'; if (reg.seat && (!to.home || to.home[0] !== reg.seat[0] || to.home[1] !== reg.seat[1]) && adult(L, to)) moveHome(L, to, reg.seat);
    recordDeed(L, to.id, `became lord of ${reg.name}`); }
  L.sys.people.stats.seats++;
  emit(L, 'people.seatPassed', { region: reg.id, from: a.id, to: to ? to.id : null, how, zone: reg.seat, regent: to && !adult(L, to) ? to.regent || null : null });
}
// a band's chief: the eldest grown man of the band takes the camp (held by force, owned by nobody)
function passBand(L, a) {
  const home = a.home; if (!home) return;
  const z = zoneAt(L, home[0], home[1]); if (!z || z.holder !== a.id) return;
  const next = residents(L, home[0] + ',' + home[1]).filter(m => m.id !== a.id && adult(L, m) && m.sex === 'm').sort((x, y) => x.born - y.born)[0];
  z.holder = next ? next.id : null;
  if (next) { next.chief = true; for (const m of residents(L, home[0] + ',' + home[1])) if (m.household === a.id) m.household = next.id; }
  emit(L, 'people.chiefPassed', { zone: [home[0], home[1]], from: a.id, to: next ? next.id : null });
}
