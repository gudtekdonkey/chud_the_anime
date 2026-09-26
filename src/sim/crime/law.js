import { emit, newId, zoneAt } from '../ledger.js';
import { rngFor } from '../rng.js';
import { killActor } from '../people/index.js';
import { ageOf } from '../actors.js';
import { CRIMES, K, HONOUR, COMPANION, worse } from './rules.js';

// ---- The law: one crime, anyone's (the ronin's or an NPC's), and what it does to karma, standing and bounties (docs/sim-crime.md) ----
// Karma (actor.karma, −100..100) is who he is: every crime costs it, seen or not. Standing (actor.standing[culture], −1..1) is what a
// people thinks of him: only a crime someone saw moves it. A bounty is per culture, raised only by that culture's witnesses; a mask
// hides who did it, so the crime is known but the bounty lands on nobody.

export const fresh = () => ({
  bounty: {},      // actorId -> { cultureId -> { mon, worst (crime kind), h } }
  contested: {},   // plotId -> { title, holder, from, since, how, crime, witnesses: [ids], by } (land.js)
  forged: {},      // plotId -> { real, forger, h }: a deed that lies (land.js)
  feuds: [],       // { a, b, region, heat, since } (world.js)
  hunters: [],     // { id, actor, target, culture, at: [x, y], since, found } (world.js)
  recent: [],      // the last RECENT crimes, newest last: the register quests and the notice board read
  stood: {},       // actorId -> 1 for everyone whose standing differs from his baseline (so the daily drift is cheap)
  penance: {},     // actorId -> { season, got }: karma bought back at shrines this season
  stats: { byKind: {}, known: 0, unseen: 0, masked: 0, justice: 0, bounties: 0, paid: 0, faded: 0, caught: 0, executed: 0, fined: 0,
    raids: 0, feuds: 0, hunters: 0, land: { force: 0, retaken: 0, title: {} } },
});
export const crimeState = L => L.sys.crime;
const RECENT = 300;
export const isPlayer = (L, id) => id != null && id === L.player;
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
export const cultureOfZone = (L, x, y) => { const z = zoneAt(L, x, y), g = z && z.region >= 0 ? L.regions[z.region] : null; return g ? g.culture : null; };

// ---- money: the economy lane owns prices; this only moves coins (1 ryō = 1,000 mon, docs/foundations.md) ----
export const purse = a => a.money.mon + a.money.ryo * 1000;
export function spend(a, mon) {
  if (purse(a) < mon) return false;
  a.money.mon -= mon; while (a.money.mon < 0) { a.money.ryo--; a.money.mon += 1000; }
  return true;
}
export const give = (a, mon) => { a.money.mon += mon; };

// ---- death by the sword ----
// through the people lane's killActor, the one way to kill anyone: the grave, the widow, the vendetta, the heir
export function kill(L, a, cause, by = null, zone = null) { if (a.alive) killActor(L, a.id, cause, by, zone ? { zone } : {}); }
export const isRoyal = (L, a) => a.cls === 'royal' || (a.lord != null && L.regions[a.lord]?.lord === a.id);
export const isElderOrRoyal = (L, a) => isRoyal(L, a) || ageOf(L, a) >= K.ELDER_AGE;

// ---- karma and standing ----
export const addKarma = (a, d) => { a.karma = +clamp((a.karma || 0) + d, K.KARMA_MIN, K.KARMA_MAX).toFixed(2); };
const baseline = a => clamp((a.karma || 0) * K.STANDING_FROM_KARMA, -1, 1);
// what culture c thinks of a: his own entry, or the baseline his karma sets
export const standingOf = (a, c) => a.standing[c] ?? baseline(a);
export function addStanding(L, a, c, d) {
  a.standing[c] = +clamp(standingOf(a, c) + d, -1, 1).toFixed(3); crimeState(L).stood[a.id] = 1;
}
// every standing slides back toward what his karma says he is (fast: a people forgets; karma does not). His own every day; everyone
// else's once every SLOW days, compounded, to keep the day cheap
export const WEEK = 7, SLOW = 28;
const each = (L, ids, day, fn) => { if (day % SLOW === 0) { for (const id in ids) if (!isPlayer(L, id)) fn(id, SLOW); } if (L.player in ids) fn(L.player, 1); };
export function driftStanding(L, day) {
  const C = crimeState(L);
  each(L, C.stood, day, (id, n) => { const a = L.actors[id], b = baseline(a), k = 1 - (1 - K.STANDING_DRIFT) ** n;
    for (const c in a.standing) { const s = a.standing[c] + (b - a.standing[c]) * k;
      if (Math.abs(s - b) < .005) delete a.standing[c]; else a.standing[c] = +s.toFixed(4); }
    if (!Object.keys(a.standing).length) delete C.stood[id]; });
}

// ---- bounties ----
export const bountyOf = (L, id, c) => crimeState(L).bounty[id]?.[c]?.mon || 0;
export const bountiesOf = (L, id) => crimeState(L).bounty[id] || {};
export const wantedBy = (L, id, c) => bountyOf(L, id, c) > 0;
// forever: a bounty that never fades and is never paid off (the story's manhunts for an oathbreaker or a royal robbery, owner)
export const FAMOUS = 300;   // a bounty this big is news (the story posts it; travel mirrors his)
export function addBounty(L, id, c, mon, kind, forever = false) {
  const C = crimeState(L), bs = C.bounty[id] || (C.bounty[id] = {}), b = bs[c] || (bs[c] = { mon: 0, worst: null, h: L.hour });
  const was = b.mon; b.mon = Math.round(b.mon + mon); b.worst = worse(b.worst, kind); b.h = L.hour; if (forever) b.forever = true; C.stats.bounties++;
  // mon: the whole bounty now; added: what this crime put on it
  if (isPlayer(L, id) || b.mon >= FAMOUS) emit(L, 'crime.bounty', { actor: id, culture: +c, mon: b.mon, added: b.mon - was, worst: b.worst, why: kind, forever: !!b.forever });
}
// how fast a bounty fades: its worst crime's rate. Killing royalty never fades and is never paid off, unless the killer is royal
// himself (owner 2026-09-26): then it is judged as a murder
export const fadeOf = (a, worst, forever = false) => forever ? 0 : CRIMES[worst].fade || (a?.cls === 'royal' ? CRIMES.murder.fade : 0);
export function clearBounty(L, id, c) {
  const bs = crimeState(L).bounty[id]; if (!bs || !bs[c]) return;
  const mon = bs[c].mon; delete bs[c]; if (!Object.keys(bs).length) delete crimeState(L).bounty[id];
  if (isPlayer(L, id) || mon >= FAMOUS) emit(L, 'crime.bountyCleared', { actor: id, culture: +c });
}
// a bounty fades (his every day, the rest every SLOW days)
export function fadeBounties(L, day) {
  const C = crimeState(L);
  each(L, C.bounty, day, (id, n) => { for (const c in C.bounty[id]) { const b = C.bounty[id][c], f = fadeOf(L.actors[id], b.worst, b.forever);
    if (!f) continue; b.mon = +(b.mon * (1 - f) ** n).toFixed(1);
    if (b.mon < K.BOUNTY_GONE) { clearBounty(L, id, c); C.stats.faded++; if (isPlayer(L, id)) emit(L, 'crime.bountyFaded', { actor: id, culture: +c }); } } });
}
// paying it off: at a magistrate (the bounty, and his people think a little better of him) or a shrine (more, and a little karma back).
// A regicide's bounty is never paid off, unless he is royal.
export function payOff(L, id, c, where = 'magistrate') {
  const a = L.actors[id], b = crimeState(L).bounty[id]?.[c];
  if (!b) return { ok: false, reason: 'no bounty' };
  if (!fadeOf(a, b.worst, b.forever)) return { ok: false, reason: b.forever ? 'this manhunt never ends' : 'killing royalty is never forgiven' };
  const cost = Math.ceil(b.mon * (where === 'shrine' ? K.SHRINE : K.MAGISTRATE));
  if (!spend(a, cost)) return { ok: false, reason: 'not enough money', cost };
  clearBounty(L, id, c); crimeState(L).stats.paid++;
  if (where === 'shrine') addKarma(a, K.SHRINE_KARMA); else addStanding(L, a, c, K.MAGISTRATE_STANDING);
  emit(L, 'crime.bountyPaid', { actor: id, culture: +c, mon: cost, where });
  return { ok: true, cost };
}
// an offering with no bounty: a little karma back, capped per season (karma is who he is; money buys only so much of it)
export function penance(L, id, mon, season) {
  const a = L.actors[id], C = crimeState(L), p = C.penance[id]?.season === season ? C.penance[id] : (C.penance[id] = { season, got: 0 });
  const k = Math.min(mon / K.PENANCE_PER_KARMA, K.PENANCE_CAP - p.got);
  if (k <= 0 || !spend(a, Math.ceil(k * K.PENANCE_PER_KARMA))) return 0;
  p.got += k; addKarma(a, k); emit(L, 'crime.penance', { actor: id, karma: +k.toFixed(2) });
  return k;
}

// ---- a crime ----
// o: { by, victim?, zone: [x, y], witnesses: [actor ids who saw it], close: [the witnesses near enough to see through a mask], masked,
//      value (mon taken, theft), victimSaw (default: he did, unless it was a theft), provoked (self-defence: no crime),
//      culture (whose land, for trespass with no victim), plot, rng (the caller's stream; else one from the seed and the crime count),
//      seenBy: [cultures that know of it without a witness to name], noKarma (karma already moved by the story or travel), quiet (no crime.robbery / crime.murder: the caller tells it) }
// Kills the victim of a killing. Returns the crime record (or { lawful: true } when provoked).
export function commit(L, kind, o) {
  const C = crimeState(L), by = L.actors[o.by], victim = o.victim != null ? L.actors[o.victim] : null;
  if (o.provoked) return { lawful: true, kind };
  const killing = kind === 'murder' || kind === 'plotMurder' || kind === 'regicide';
  if (victim && killing && isElderOrRoyal(L, victim)) kind = 'regicide';
  const def = CRIMES[kind];
  // who saw it: the living, never the doer; the victim of a crime he survives saw it (a theft he did not, unless told so)
  const seen = [...new Set(o.witnesses || [])].filter(id => id !== o.by && L.actors[id]?.alive && !(killing && id === o.victim));
  if (victim && !killing && (o.victimSaw ?? kind !== 'theft') && !seen.includes(victim.id)) seen.push(victim.id);
  // justice: a man his people want is fair game for them
  const wanted = victim ? bountiesOf(L, victim.id) : {};
  // seenBy: whole peoples who know of it with no one to name (the story's deeds)
  const cultures = [...new Set([...seen.map(id => L.actors[id].culture), ...(o.seenBy || [])].filter(c => c != null))];
  const known = cultures.filter(c => !(wanted[c]?.mon > 0));
  // (seen: everyone who saw it wants the victim; unseen: the victim was wanted anywhere)
  const just = !!victim && (cultures.length ? !known.length : Object.values(wanted).some(b => b.mon >= CRIMES.assault.bounty));
  // a mask hides him, but a witness close by sometimes sees through it (owner 2026-09-26): his people know who it was
  const rr = o.rng || rngFor(L.seed, 'crime', L.hour, L.ids.cr || 0);
  const saw = o.masked ? seen.filter(id => (o.close || []).includes(id) && rr.chance(K.MASK_SEE)) : seen;
  const blamed = known.filter(c => saw.some(id => L.actors[id].culture === c) || (!o.masked && (o.seenBy || []).includes(c)));
  // karma, always: who he is does not depend on who saw
  let dk = def.karma;
  if (victim && (victim.karma || 0) <= K.MONSTER) dk *= .5;
  if (just) dk *= K.JUSTICE;
  if (!o.noKarma) addKarma(by, dk);   // noKarma: the story or travel already moved his karma
  // what moved: money, a life
  let taken = 0;
  if (kind === 'theft' && victim) { taken = Math.min(Math.max(0, Math.round(o.value || 0)), victim.money.mon); victim.money.mon -= taken; give(by, taken); }
  if (killing && victim) kill(L, victim, 'murder', by.id, o.zone);
  // the word spreads: each culture that saw him puts a bounty on him and thinks less of him; of his crimes, peoples close to the
  // victim's hear too (NPC crimes stay with the witnesses' people, to keep the world cheap)
  for (const c of blamed) { addBounty(L, by.id, c, def.bounty + taken * K.THEFT_SHARE, kind); addStanding(L, by, c, def.standing); }
  const vc = victim?.culture;
  if (vc != null && blamed.includes(vc) && isPlayer(L, by.id)) for (const d of L.cultures) { if (known.includes(d.id) || d.id === vc) continue; const rel = d.relations[vc] ?? 0;
    if (rel >= K.REL_STRONG) addStanding(L, by, d.id, def.standing * K.ALLY_HEARS);
    else if (rel <= -K.REL_STRONG) addStanding(L, by, d.id, -def.standing * K.FOE_CHEERS); }
  const rec = { id: newId(L, 'cr'), h: L.hour, kind, by: by.id, victim: victim?.id ?? null, zone: o.zone || by.at || by.home || null,
    known: blamed, seen: cultures, masked: !!o.masked, unmasked: !!o.masked && blamed.length > 0, witnesses: seen.slice(0, 5), taken, plot: o.plot ?? null, culture: o.culture ?? victim?.culture ?? null };
  C.recent.push(rec); if (C.recent.length > RECENT) C.recent.splice(0, C.recent.length - RECENT);
  const s = C.stats; s.byKind[kind] = (s.byKind[kind] || 0) + 1;
  if (o.masked && known.length && !blamed.length) s.masked++; else if (blamed.length) s.known++; else if (cultures.length) s.justice++; else s.unseen++;
  // tell the world: every crime anyone knows of, and everything he does; an NPC crime nobody saw stays in the numbers
  if (cultures.length || isPlayer(L, by.id) || isPlayer(L, rec.victim))
    emit(L, 'crime.committed', { crime: rec.id, kind, actor: blamed.length || !o.masked ? by.id : null, victim: rec.victim, zone: rec.zone, known: rec.known, masked: rec.masked, unmasked: rec.unmasked, witnesses: seen.length });
  // for the story's quests: a robbery and a murder, named when someone could name him (quiet: a raid's, which crime.raid carries, or the story's own)
  const named = blamed.length || !o.masked ? by.id : null;
  if (kind === 'theft' && taken > 0 && !o.quiet) emit(L, 'crime.robbery', { victim: rec.victim, by: named, mon: taken, zone: rec.zone });
  if (killing && victim && named && !o.quiet) emit(L, 'crime.murder', { victim: victim.id, by: named, zone: rec.zone });
  return rec;
}

// ---- what his crimes open and close ----
// a culture's guard seeing him: 'attack' on sight, 'arrest' (stop him, demand the bounty), 'wary' (watch him, refuse him), or null
export function onSight(L, c, id) {
  const a = L.actors[id], b = bountyOf(L, id, c), s = standingOf(a, c);
  if (b >= K.ATTACK_BOUNTY || s <= K.ATTACK_STANDING) return 'attack';
  if (b >= K.ARREST_BOUNTY) return 'arrest';
  return s <= K.WARY_STANDING ? 'wary' : null;
}
// low karma opens outlaw doors: bandits trade with him, then take him in; a man of high karma is their enemy
export function outlawDoors(L, id) {
  const k = L.actors[id].karma || 0;
  return { deal: k <= K.BANDITS_DEAL, join: k <= K.BANDITS_JOIN, hostile: k >= K.BANDITS_HATE };
}
// honour −1..1 from a person's traits and own karma
export function honourOf(a) {
  let h = (a.karma || 0) / 100; for (const [t, s] of a.traits || []) h += (HONOUR[t] || 0) * s;
  return clamp(h, -1, 1);
}
// will a companion follow him: joining ? 'join' | 'refuse' : 'stay' | 'leave'. Honourable ones leave a low-karma leader; ruthless ones stay
export function companionVerdict(L, compId, leaderId, joining = false) {
  const lim = COMPANION.LEAVE_AT + honourOf(L.actors[compId]) * COMPANION.LEAVE_PER + (joining ? COMPANION.JOIN_MARGIN : 0);
  const ok = (L.actors[leaderId].karma || 0) >= lim;
  return joining ? (ok ? 'join' : 'refuse') : (ok ? 'stay' : 'leave');
}
