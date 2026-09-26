import { ST, today, clamp, announce, who, alive, actor, regName, cultName } from './state.js';
import { openQuests, quest, post } from './quests.js';
import { zoneAt } from '../ledger.js';
import { emit } from '../ledger.js';

// ---- Sworn service and being wanted (owner, 2026-09-26) ----
// Sworn: his lord gives him orders (quests only his lord can give). Disobey (let an order lapse, or do it a way the lord did not want)
// and he is warned; after WARNINGS the oath is broken and that lord wants him forever. He can also break it himself (breakOath).
// Robbing a royal procession raises a manhunt across the court's lands and its allies'.
export const WARNINGS = 3;
const ORDERABLE = ['raiders', 'bounty', 'defend', 'message', 'uprising', 'succession', 'famine', 'procession', 'hunt'];
// the ways a lord counts as obedience, per kind (anything else is disobedience)
const LOYAL = { uprising: ['lord', 'betray', 'bribe'], succession: ['elder', 'talk'], famine: ['help', 'betray'], hunt: ['fight', 'stealth', 'talk'] };
const loyalWays = kind => LOYAL[kind] || ['fight', 'stealth'];

// each season: a sworn ronin gets an order from his lord; a dead lord's oath passes to his heir in the seat
export function serviceSeason(L, cal, r) {
  const S = ST(L), p = actor(L, L.player); if (!p || !p.master) return;
  if (!alive(L, p.master)) {
    const g = L.regions.find(x => actor(L, p.master) && actor(L, p.master).lord === x.id), heir = g && g.lord !== p.master && alive(L, g.lord) ? g.lord : null;
    if (!heir) { const was = p.master; p.master = null; S.arc.sworn = false; S.service = null;
      announce(L, 'story.released', { actor: L.player, lord: was }, `${who(L, was)} is dead with no heir in his seat. The ronin's oath died with him.`, ['messenger']); return; }
    announce(L, 'story.oathPasses', { actor: L.player, from: p.master, to: heir, region: g.id }, `${who(L, p.master)} is dead. The ronin's oath passes to ${who(L, heir)}, the new lord of ${g.name}.`, ['messenger'], [g.id]);
    p.master = heir; S.arc.sworn = heir; S.service = { ...(S.service || {}), lord: heir, since: today(L) };
  }
  if (!S.service) S.service = { lord: p.master, since: today(L), warnings: 0, orders: [] };
  const lord = actor(L, p.master), culture = lord.culture, own = lord.lord;
  if (S.service.orders.some(id => { const q = quest(L, id); return q && q.state !== 'done'; })) return;   // one order at a time
  const pool = openQuests(L).filter(q => ORDERABLE.includes(q.kind) && !q.order && q.state === 'open' && L.regions[q.region].culture === culture && q.giver !== L.player);
  const q = pool.find(x => x.region === own) || (pool.length ? r.pick(pool) : ownOrder(L, lord, r));
  if (!q) return;
  q.order = { lord: p.master, ways: loyalWays(q.kind) }; q.state = 'taken'; q.taken = today(L);
  S.service.orders.push(q.id); if (S.service.orders.length > 20) S.service.orders.shift();
  announce(L, 'story.order', { actor: L.player, lord: p.master, quest: q.id, kind: q.kind, region: q.region }, `${who(L, p.master)} orders the ronin: ${q.title}.`, ['messenger'], [q.region]);
}

// nothing on the boards fits: the lord makes his own order, the nearest outlaw camp to his seat broken
function ownOrder(L, lord, r) {
  const S = ST(L), seat = lord.lord != null ? L.regions[lord.lord].seat : lord.home; if (!seat) return null;
  const c = Object.values(S.camps).filter(x => !x.razed && zoneAt(L, ...x.zone).holder).sort((a, b) => (Math.abs(a.zone[0] - seat[0]) + Math.abs(a.zone[1] - seat[1])) - (Math.abs(b.zone[0] - seat[0]) + Math.abs(b.zone[1] - seat[1])))[0];
  if (!c) return null; const chief = zoneAt(L, ...c.zone).holder;
  return post(L, 'raiders', { key: 'order:' + lord.id + ':' + today(L), region: c.region, zone: c.zone, giver: lord.id, target: chief, culture: lord.culture, tculture: actor(L, chief).culture, days: 28, reward: 100,
    stake: { camp: c.zone.join(','), renown: 2 }, title: `Break ${regName(L, c.region)}'s camp, by order of ${who(L, lord.id)}`, text: `${who(L, lord.id)} orders his sworn ronin to break the camp at ${regName(L, c.region)} and bring back its chief's head.`, board: 'lord' });
}

// an order ends: done his lord's way, or not
export function onQuestOver(e, L) {
  const S = ST(L), q = quest(L, e.quest); if (!q || !q.order || !S.service || q.order.lord !== S.service.lord) return;
  const p = actor(L, L.player); if (!p || p.master !== q.order.lord) return;
  const obeyed = e.type === 'story.questResolved' && e.by === L.player && q.order.ways.includes(e.way);
  if (obeyed) { p.standing[lordCulture(L)] = +clamp((p.standing[lordCulture(L)] || 0) + .05, -1, 1).toFixed(2); return; }
  warn(L, e.type === 'story.questResolved' && e.by === L.player ? `he did "${q.title}" his own way` : `he let "${q.title}" go undone`);
}
const lordCulture = L => actor(L, actor(L, L.player).master).culture;
function warn(L, why) {
  const S = ST(L), p = actor(L, L.player); S.service.warnings = (S.service.warnings || 0) + 1;
  const n = S.service.warnings;
  if (n >= WARNINGS) { breakOath(L, `disobeyed ${n} times: ${why}`); return; }
  announce(L, 'story.warning', { actor: L.player, lord: p.master, warnings: n, of: WARNINGS }, `${who(L, p.master)} warns the ronin (${n} of ${WARNINGS}): ${why}.`, ['messenger']);
}

// the oath is broken: by him, or by his disobedience. That lord wants him forever.
export function breakOath(L, why = 'he walked out of his lord\'s service') {
  const S = ST(L), p = actor(L, L.player); if (!p || !p.master) return false;
  const lord = p.master, c = actor(L, lord).culture;
  p.master = null; S.arc.sworn = false; S.arc.oathBroken = lord; S.service = null;
  p.standing[c] = Math.min(p.standing[c] || 0, -.5);
  wanted(L, { by: lord, culture: c, regions: L.cultures[c].regions.slice(), why: 'oathbreaker', forever: true });
  announce(L, 'story.oathBroken', { actor: L.player, lord, why }, `${who(L, lord)} has named the ronin an oathbreaker (${why}). He is wanted in every region of ${cultName(L, c)}, forever.`, ['messenger', 'board'], L.cultures[c].regions);
  return true;
}

// wanted: the crime lane turns story.wanted into bounties and hunters; the story re-posts a manhunt every year
export function wanted(L, w) {
  const S = ST(L), rec = { ...w, target: L.player, since: today(L) };
  (S.wanted || (S.wanted = [])).push(rec);
  emit(L, 'story.wanted', rec);
  manhunt(L, rec);
}
function manhunt(L, w) {
  announce(L, 'event.manhunt', { target: w.target, by: w.by ?? null, culture: w.culture, why: w.why, forever: !!w.forever, effects: { danger: .3 } },
    `Manhunt: ${w.by == null ? cultName(L, w.culture) : alive(L, w.by) ? who(L, w.by) : `the house of the late ${who(L, w.by)}`} wants the ronin${w.why === 'oathbreaker' ? ' for breaking his oath' : ` (${w.why})`}. His likeness is at every gate${w.forever ? '; there will be no pardon' : ''}.`, ['board', 'messenger'], w.regions);
}
// a royal procession robbed: the court and its allies hunt him (a theft nobody saw only starts a search)
export function royalManhunt(L, q, seen) {
  const c = q.culture, regions = [...L.cultures[c].regions, ...L.cultures.filter(o => o.id !== c && L.cultures[c].relations[o.id] >= .3).flatMap(o => o.regions)];
  if (seen) { wanted(L, { by: null, culture: c, regions, why: 'robbed a royal procession', forever: false }); return; }
  announce(L, 'event.manhunt', { target: null, culture: c, why: 'the royal silk stolen', effects: { danger: .15 } }, `The court searches every inn on the royal road for the thief of the red silk. Nobody knows his face yet.`, ['board', 'messenger'], regions);
}
// each year: the ones who want him say so again, and a rival or two takes the job
export function wantedYear(L, cal, r) {
  const S = ST(L); if (!S.wanted) return;
  S.wanted = S.wanted.filter(w => w.forever || today(L) - w.since < 224);   // forever means forever: it outlives the lord, his heir keeps it (owner); the rest lapse after two years
  for (const w of S.wanted) { manhunt(L, w); emit(L, 'story.wanted', { ...w, renewed: true });
    const R = Object.values(S.rivals).find(x => x.creed !== 'honour' && alive(L, x.id)); if (R) R.grudge += 1; }
}
