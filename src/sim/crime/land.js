import { emit, zoneAt } from '../ledger.js';
import { ownerOf } from '../zone.js';
import { HOURS_PER_YEAR } from '../time.js';
import { LAND, K, CRIMES } from './rules.js';
import { crimeState, commit, isPlayer, spend, give, purse, standingOf, bountyOf, wantedBy, cultureOfZone, addBounty, addStanding } from './law.js';

// ---- Land: possession (holder) and title (owner 2026-09-26: raids take possession, never the legal title) ----
// Force moves only the holder. The title moves only by a lawful mechanic (all proposals for the owner, docs/sim-crime.md):
//   sale · blood money · a lord's grant · inheritance · a court case · the passage of time with nobody left to claim it · a forged deed
//   (a crime that holds until it is exposed). Land held by someone other than its title holder is contested: the claimant's kin and
//   his lord may raid it back.

// the stored record of a plot, made from the zone's default the first time it changes
export function plotRec(L, pid) { return L.plots[pid] || (L.plots[pid] = { ...ownerOf(L, pid) }); }
const peek = (L, pid) => L.plots[pid] || ownerOf(L, pid);   // reading never stores a record
const zoneOfPlot = pid => pid.split(':')[0].split(',').map(Number);
export const plotCulture = (L, pid) => cultureOfZone(L, ...zoneOfPlot(pid));
const lordOfPlot = (L, pid) => { const z = zoneAt(L, ...zoneOfPlot(pid)); return z && z.region >= 0 ? L.regions[z.region].lord ?? null : null; };
const addTo = (a, f, v) => { if (!a) return; const arr = a[f] || (a[f] = []); if (!arr.includes(v)) arr.push(v); };
const dropFrom = (a, f, v) => { const arr = a?.[f]; if (!arr) return; const i = arr.indexOf(v); if (i >= 0) arr.splice(i, 1); };

// the heir the crime lane falls back on (the people lane owns inheritance at death): living children eldest first, the spouse,
// a brother or sister, the head of the household
export function heirOf(L, a, not = null) {
  if (!a) return null;
  const ok = id => id != null && id !== a.id && id !== not && L.actors[id]?.alive;
  const kids = (a.children || []).filter(ok).sort((x, y) => L.actors[x].born - L.actors[y].born);
  if (kids.length) return kids[0];
  if (ok(a.spouse)) return a.spouse;
  for (const p of a.parents || []) { const sib = (L.actors[p]?.children || []).filter(ok).sort((x, y) => L.actors[x].born - L.actors[y].born); if (sib.length) return sib[0]; }
  return ok(a.household) ? a.household : null;
}
// who can claim the title now: the title holder, or his heir if he is dead. Never the holder himself
export function claimantOf(L, pid) {
  const p = peek(L, pid), t = L.actors[p.title];
  const c = !t ? null : t.alive ? t.id : heirOf(L, t, p.holder);
  return c === p.holder ? null : c;
}

// ---- force: possession changes, the title does not ----
// o: { how ('murder' | 'raid' | 'squat' ...), crime (id), witnesses }
export function seize(L, pid, by, o = {}) {
  const C = crimeState(L), p = plotRec(L, pid), from = p.holder;
  if (from === by) return p;
  dropFrom(L.actors[from], 'holds', pid); p.holder = by; addTo(L.actors[by], 'holds', pid);
  if (p.title !== by) { C.contested[pid] = { title: p.title, holder: by, from, since: L.hour, how: o.how || 'force', crime: o.crime ?? null, witnesses: (o.witnesses || []).slice(0, LAND.WITNESS_KEEP) };
    addTo(L.actors[p.title], 'claims', pid); }
  else delete C.contested[pid];
  C.stats.land.force++;
  emit(L, 'crime.seized', { plot: pid, actor: by, from, title: p.title, how: o.how || 'force', zone: zoneOfPlot(pid) });
  return p;
}
// murder the man and take his land: one crime (plotMurder, or regicide if he was an elder or royal) and the plot seized
export function takePlotByMurder(L, killer, victim, pid, o = {}) {
  const rec = commit(L, 'plotMurder', { ...o, by: killer, victim, plot: pid, zone: o.zone || zoneOfPlot(pid) });
  seize(L, pid, killer, { how: 'murder', crime: rec.id, witnesses: rec.witnesses });
  return rec;
}
// possession back to the claimant (kin raid, lord's men, court order)
export function restore(L, pid, to, how) {
  const C = crimeState(L), p = plotRec(L, pid), from = p.holder;
  dropFrom(L.actors[from], 'holds', pid); p.holder = to; addTo(L.actors[to], 'holds', pid);
  if (p.title === to) { delete C.contested[pid]; dropFrom(L.actors[to], 'claims', pid); }
  else if (C.contested[pid]) Object.assign(C.contested[pid], { holder: to, from, since: L.hour });
  C.stats.land.retaken++;
  emit(L, 'crime.retaken', { plot: pid, actor: to, from, how, zone: zoneOfPlot(pid) });
}

// ---- the law: the title passes ----
export function passTitle(L, pid, to, how) {
  const C = crimeState(L), p = plotRec(L, pid), from = p.title;
  if (from === to) return;
  dropFrom(L.actors[from], 'claims', pid); p.title = to;
  if (p.holder === to) delete C.contested[pid];
  else { addTo(L.actors[to], 'claims', pid); if (C.contested[pid]) C.contested[pid].title = to; else if (p.holder != null) C.contested[pid] = { title: to, holder: p.holder, from: null, since: L.hour, how: 'title', crime: null, witnesses: [] }; }
  const t = C.stats.land.title; t[how] = (t[how] || 0) + 1;
  emit(L, 'crime.title', { plot: pid, actor: to, from, how, zone: zoneOfPlot(pid) });
}
// the title, bought from whoever can claim it. Land someone else holds sells cheap: the seller cannot use it
export function priceOf(L, pid) { const p = peek(L, pid), c = claimantOf(L, pid) ?? p.title; return Math.round(LAND.PRICE * (p.holder !== c ? LAND.OCCUPIED_DISCOUNT : 1)); }
export function buyTitle(L, pid, buyer) {
  const seller = claimantOf(L, pid) ?? peek(L, pid).title, s = L.actors[seller];
  if (!s || !s.alive) return { ok: false, reason: 'nobody alive holds the title' };
  if (seller === buyer) return { ok: false, reason: 'already his' };
  if (wantedBy(L, buyer, s.culture)) return { ok: false, reason: `${s.given} will not sell to a wanted man` };
  const price = priceOf(L, pid);
  if (!spend(L.actors[buyer], price)) return { ok: false, reason: 'not enough money', price };
  give(s, price); settleHeir(L, pid, seller); passTitle(L, pid, buyer, 'sale');
  return { ok: true, price };
}
// blood money: paid to the dead man's heir, it buys the title of land taken by murder and ends his kin's claim
export function payBloodMoney(L, pid, payer) {
  const k = crimeState(L).contested[pid];
  if (!k || k.how !== 'murder') return { ok: false, reason: 'not land taken by murder' };
  const heir = claimantOf(L, pid);
  if (!heir) return { ok: false, reason: 'nobody left to pay' };
  if (!spend(L.actors[payer], LAND.BLOOD_MONEY)) return { ok: false, reason: 'not enough money', price: LAND.BLOOD_MONEY };
  give(L.actors[heir], LAND.BLOOD_MONEY); settleHeir(L, pid, heir); passTitle(L, pid, payer, 'bloodMoney');
  return { ok: true, price: LAND.BLOOD_MONEY };
}
// a lord grants an unclaimed plot in his region to a holder his people think well of and who is not wanted
export function petitionGrant(L, pid, id) {
  const c = plotCulture(L, pid), a = L.actors[id], lord = lordOfPlot(L, pid);
  if (lord == null || !L.actors[lord]?.alive) return { ok: false, reason: 'no lord to grant it' };
  if (claimantOf(L, pid) != null) return { ok: false, reason: 'someone still claims it' };
  if (bountyOf(L, id, c) > 0) return { ok: false, reason: 'the lord does not grant land to a wanted man' };
  if (standingOf(a, c) < LAND.GRANT_STANDING) return { ok: false, reason: 'his people do not think well enough of him' };
  passTitle(L, pid, id, 'grant'); return { ok: true };
}
// a court case: the claimant sues. A living witness of the taking wins the land back; with none left and the land held long enough,
// the court confirms the holder and the title passes to him
export function courtCase(L, pid) {
  const k = crimeState(L).contested[pid], claimant = claimantOf(L, pid);
  if (!k || !claimant) return { ok: false, reason: 'nothing to sue over' };
  if (k.witnesses.some(w => L.actors[w]?.alive)) { settleHeir(L, pid, claimant); restore(L, pid, claimant, 'court'); emit(L, 'crime.court', { plot: pid, actor: claimant, won: true }); return { ok: true, won: 'claimant' }; }
  if (L.hour - k.since >= LAND.COURT_YEARS * HOURS_PER_YEAR) { passTitle(L, pid, k.holder, 'court'); emit(L, 'crime.court', { plot: pid, actor: k.holder, won: true }); return { ok: true, won: 'holder' }; }
  return { ok: false, reason: 'no witness, and not held long enough: the case waits' };
}
// a forged deed: a crime (seen only if someone watched him forge it) that moves the title on paper until it is exposed
export function forgeDeed(L, pid, forger, o = {}) {
  const C = crimeState(L), p = plotRec(L, pid), real = claimantOf(L, pid) ?? p.title;
  const rec = commit(L, 'forgery', { ...o, by: forger, plot: pid, culture: plotCulture(L, pid), zone: zoneOfPlot(pid) });
  C.forged[pid] = { real, forger, h: L.hour }; passTitle(L, pid, forger, 'forgery');
  return rec;
}
// the title holder died: his heir takes the title before anything else happens to it
function settleHeir(L, pid, heir) { const p = plotRec(L, pid); if (p.title !== heir && !L.actors[p.title]?.alive) passTitle(L, pid, heir, 'inheritance'); }

// ---- each season, off screen: contested land settles, is raided back, bought out, taken to court, forged; forgeries come out ----
export function landSeason(L, r) {
  const C = crimeState(L);
  for (const pid of Object.keys(C.forged)) { const f = C.forged[pid], p = plotRec(L, pid);
    if (p.title !== f.forger) { delete C.forged[pid]; continue; }
    const real = L.actors[f.real]?.alive ? f.real : heirOf(L, L.actors[f.real], f.forger);
    if (real == null || !r.chance(LAND.EXPOSE)) continue;
    delete C.forged[pid]; passTitle(L, pid, real, 'exposed');
    // the karma was paid when he forged it; now his people know
    const c = L.actors[real].culture; if (c != null) { addBounty(L, f.forger, c, CRIMES.forgery.bounty, 'forgery'); addStanding(L, L.actors[f.forger], c, CRIMES.forgery.standing); }
    emit(L, 'crime.forgeryExposed', { plot: pid, actor: f.forger, to: real }); }
  for (const pid of Object.keys(C.contested)) {
    const k = C.contested[pid], p = plotRec(L, pid), h = L.actors[p.holder];
    if (!h || !h.alive) { delete C.contested[pid]; continue; }   // the holder is dead: the people lane passes what he held
    if (p.title != null && !L.actors[p.title]?.alive) { const heir = heirOf(L, L.actors[p.title], p.holder); if (heir != null) passTitle(L, pid, heir, 'inheritance'); }
    if (!C.contested[pid]) continue;
    const claimant = claimantOf(L, pid), c = plotCulture(L, pid), held = L.hour - k.since, you = isPlayer(L, p.holder);
    if (claimant == null) {   // nobody left to claim it: the lord may grant it, and time settles it
      if (!you && standingOf(h, c) >= LAND.GRANT_STANDING && bountyOf(L, h.id, c) === 0 && r.chance(LAND.GRANT) && lordOfPlot(L, pid) != null) passTitle(L, pid, h.id, 'grant');
      else if (held >= LAND.PRESCRIPTION_YEARS * HOURS_PER_YEAR) passTitle(L, pid, h.id, 'prescription');
      continue; }
    // the claimant's kin raid it back; his lord's men help against a wanted holder or an outlaw
    const lordHelps = lordOfPlot(L, pid) != null && (bountyOf(L, h.id, c) >= K.ATTACK_BOUNTY || h.cls === 'outlaw');
    if (r.chance(LAND.KIN_RAID + (lordHelps ? LAND.LORD_RAID : 0))) { settleHeir(L, pid, claimant); restore(L, pid, claimant, lordHelps ? 'lord' : 'kin'); continue; }
    if (r.chance(LAND.COURT) && courtCase(L, pid).ok) continue;
    if (you) continue;   // buying, blood money and forgery are his own choices
    if (k.how === 'murder' && purse(h) >= LAND.BLOOD_MONEY && r.chance(LAND.BLOOD)) { payBloodMoney(L, pid, h.id); continue; }
    if (purse(h) >= priceOf(L, pid) && r.chance(LAND.SALE)) { buyTitle(L, pid, h.id); continue; }
    if ((h.karma || 0) < 0 && r.chance(LAND.FORGE)) forgeDeed(L, pid, h.id);
  }
}
