import { newId } from '../ledger.js';
import { rngFor } from '../rng.js';
import { ST, today, announce, grant, pay, alive, actor, who } from './state.js';

// ---- Quests: made by the world, each one real (ignore it and it plays out without him) (docs/sim-story.md) ----
// A quest is plain data in L.sys.story.quests. Its kind (below, defined in kinds-*.js) is code: how it reads, the ways it can be
// solved (fight, stealth, bribe, betray, and sometimes help or talk), what each way does to the world and to him, and what happens
// if nobody does anything by its due day. The game calls takeQuest / resolveQuest when he actually does the thing.

export const KINDS = {};
// def: { board: 'inn'|'shrine'|'magistrate'|'person'|'lord', ways: [way], untouched(L, q, r) -> text, check?(L, q) -> text|null (ends it early) }
// way: { id, as (fight|stealth|bribe|betray|help|talk; defaults to id), label, blurb, karma, standing?(L, q) -> { cultureId: delta },
//        mon?(L, q) -> mon he is paid, from?: 'giver'|'target'|'other' (whose purse it comes out of: money is never made from nothing),
//        cost?(L, q) -> mon he must have and spends, payTo?: 'giver'|'target'|'other' (who gets it), needs?(L, q, p) -> why not | null,
//        act(L, q, r, by) -> text (the world's side of it) }
export const defineQuest = (kind, def) => { KINDS[kind] = def; return def; };
export const WAYS = ['fight', 'stealth', 'bribe', 'betray', 'help', 'talk'];

// o: { key (dedupe), region, zone, giver, target, other, culture, tculture, reward, days, stake, source, title, text, board }
export function post(L, kind, o) {
  const S = ST(L), def = KINDS[kind];
  if (o.key && S.keys[o.key] != null && S.quests[S.keys[o.key]] && S.quests[S.keys[o.key]].state !== 'done') return null;
  const q = { id: newId(L, 'q'), kind, key: o.key || null, region: o.region, zone: o.zone || L.regions[o.region].seat,
    giver: o.giver ?? null, target: o.target ?? null, other: o.other ?? null, culture: o.culture ?? L.regions[o.region].culture, tculture: o.tculture ?? null,
    posted: today(L), due: today(L) + (o.days || 28), state: 'open', reward: Math.round(o.reward || 0), stake: o.stake || {}, source: o.source || null,
    board: o.board || def.board, title: o.title, text: o.text, tries: 0, outcome: null };
  S.quests[q.id] = q; S.questOrder.push(q.id); if (o.key) S.keys[o.key] = q.id;
  S.stats.quests[kind] = (S.stats.quests[kind] || 0) + 1;
  announce(L, 'story.questPosted', { quest: q.id, kind, region: q.region, zone: q.zone, giver: q.giver, reward: q.reward, due: q.due }, q.title, [q.board === 'person' ? 'messenger' : 'board']);
  return q;
}
export const quest = (L, id) => ST(L).quests[id] || null;
export const openQuests = (L, region = null) => ST(L).questOrder.map(id => ST(L).quests[id]).filter(q => q && q.state !== 'done' && (region == null || q.region === region));

// the ways he can take, with what each would cost and give him; `can` is false (and `why` says so) when he cannot
export function waysOf(L, q, by = L.player) {
  const p = actor(L, by);
  return KINDS[q.kind].ways.map(w => { const cost = w.cost ? w.cost(L, q) : 0;
    const why = cost > (p ? p.money.mon : 0) ? `needs ${cost} mon` : (w.needs ? w.needs(L, q, p) : null);
    return { id: w.id, as: w.as || w.id, label: w.label, blurb: w.blurb, karma: w.karma || 0, standing: w.standing ? w.standing(L, q) : {},
      mon: offered(L, q, w) - cost, cost, can: !why, why }; });
}
// what a way pays him: its amount, but never more than the payer has
const offered = (L, q, w) => { if (!w.mon || !w.from) return 0; const a = actor(L, q[w.from]); return a ? Math.min(Math.round(w.mon(L, q)), a.money.mon) : 0; };
export function takeQuest(L, id) {
  const q = quest(L, id); if (!q || q.state !== 'open') return false;
  q.state = 'taken'; q.taken = today(L);
  announce(L, 'story.questTaken', { quest: id, kind: q.kind, region: q.region }, `The ronin took up: ${q.title}`, ['board']);
  return true;
}

// he (or a rival: by) solved it one way. ok: false means he tried and failed; the quest stays open and runs on to its due day.
export function resolveQuest(L, id, way, { by = L.player, ok = true } = {}) {
  const S = ST(L), q = quest(L, id); if (!q || q.state === 'done') return null;
  const w = KINDS[q.kind].ways.find(x => x.id === way); if (!w) return null;
  const r = rngFor(L.seed, 'quest', id, way, L.hour), him = by === L.player;
  if (!ok) { q.tries++;
    if (him) grant(L, by, { standing: { [q.culture]: -.03, ...(way === 'stealth' && q.tculture != null ? { [q.tculture]: -.1 } : {}) } });
    announce(L, 'story.questFailed', { quest: id, kind: q.kind, way, by, region: q.region }, `${him ? 'The ronin' : 'Someone'} tried to ${w.label.toLowerCase()} and failed: ${q.title}`, ['board']);
    return { failed: true };
  }
  const cost = w.cost ? w.cost(L, q) : 0;
  if (him && cost > actor(L, by).money.mon) return null;
  const before = him ? snap(actor(L, by)) : null;
  if (cost) pay(L, by, w.payTo ? q[w.payTo] : null, cost);
  const got = w.from ? pay(L, q[w.from], by, offered(L, q, w)) : 0;
  let text = w.act(L, q, r, by);
  if (!him) { const R = S.rivals[by], name = R ? `${actor(L, by).given} ${R.epithet}` : who(L, by); text = text.replace(/\b[Tt]he ronin\b/g, name); }
  const deltas = { karma: w.karma || 0, standing: w.standing ? w.standing(L, q) : {}, mon: got - cost };
  const as = w.as || w.id;
  if (him) { grant(L, by, { karma: deltas.karma, standing: deltas.standing }); const A = S.arc; A.done++; A.renown += q.stake.renown || 1; A.ways[as] = (A.ways[as] || 0) + 1; }
  else if (S.rivals[by]) S.rivals[by].renown += q.stake.renown || 1;
  q.state = 'done';
  q.outcome = { by, way, as, text, day: today(L), deltas };
  if (him) q.outcome.change = diff(before, snap(actor(L, by)));
  const ek = him ? as : 'rival'; S.stats.endings[ek] = (S.stats.endings[ek] || 0) + 1;
  announce(L, 'story.questResolved', { quest: id, kind: q.kind, way, by, region: q.region, zone: q.zone, deltas: q.outcome.deltas }, text, ['board', 'messenger']);
  return q.outcome;
}
const snap = a => ({ karma: a.karma, mon: a.money.mon, standing: { ...a.standing } });
function diff(a, b) { const s = {}; for (const k of new Set([...Object.keys(a.standing), ...Object.keys(b.standing)])) { const d = +((b.standing[k] || 0) - (a.standing[k] || 0)).toFixed(2); if (d) s[k] = d; }
  return { karma: +(b.karma - a.karma).toFixed(2), mon: b.mon - a.mon, standing: s }; }

// ---- each day: quests overtaken by events end, due ones play out without him (or a rival gets there first) ----
export function questsDay(L, cal, r, rivalTakes) {
  const S = ST(L), d = today(L);
  for (const id of S.questOrder) {
    const q = S.quests[id]; if (!q || q.state === 'done') continue;
    const def = KINDS[q.kind];
    const gone = def.check ? def.check(L, q) : (q.target != null && !alive(L, q.target) ? 'The one it was about is dead; nothing is left to do.' : null);
    if (gone) { end(L, q, gone, 'overtaken'); continue; }
    if (d < q.due) continue;
    const rival = rivalTakes && rivalTakes(L, q, r);
    if (rival) { resolveQuest(L, id, rival.way, { by: rival.id }); continue; }
    end(L, q, def.untouched(L, q, rngFor(L.seed, 'untouched', id)), 'world');
  }
  // forget the finished ones after two years (their events stay in the log and the news)
  if (cal.dayOfSeason === 1) { const keep = [];
    for (const id of S.questOrder) { const q = S.quests[id]; if (q && q.state === 'done' && d - q.outcome.day > 224) delete S.quests[id]; else if (q) keep.push(id); }
    S.questOrder = keep; }
}
function end(L, q, text, how) {
  const S = ST(L); q.state = 'done'; q.outcome = { by: null, way: how, text, day: today(L) };
  S.stats.endings[how] = (S.stats.endings[how] || 0) + 1;
  announce(L, 'story.questEnded', { quest: q.id, kind: q.kind, how, region: q.region, zone: q.zone }, text, ['board']);
}
