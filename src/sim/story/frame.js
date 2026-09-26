import { rngFor } from '../rng.js';
import { ST, today, announce, kill, who, alive, actor, ageIn, regName, cultName } from './state.js';
import { defineQuest, post, openQuests, KINDS } from './quests.js';
import { st, deed } from './kinds-world.js';

// ---- The hand-written structure, and only that (owner, 2026-09-26: 90% of the story comes from the world) ----
// 1. His arc as a masterless swordsman: chapters reached by what he has done, not by a script.
// 2. Each region's main tale: whichever real thread there matters most right now (a war, a disputed seat, a famine...).
// 3. Named rivals who come back: three swordsmen of the world who race him for contracts, challenge him, and when one dies,
//    someone of his takes up the name. There is no true story behind the glitch powers (owner): nothing here explains them.

export const CHAPTERS = [
  { n: 1, title: 'Masterless', text: 'No lord, no house, a sword and a straw hat. The roads are full of men like him; most end in a ditch.' },
  { n: 2, title: 'A Name on the Road', text: 'Innkeepers know his hat now. Headmen send boys to find him; magistrates pretend not to.' },
  { n: 3, title: 'The Offer', text: 'A lord has asked him to kneel and take a stipend. A ronin who accepts is a ronin no longer.' },
  { n: 4, title: 'Sworn', text: 'He wears a lord\'s crest. His quarrels are his lord\'s, and so are his enemies.' },
  { n: 4, alt: true, title: 'Free Blade', text: 'He turned down a lord to his face. Every house now wonders who he will sell his sword to.' },
  { n: 5, title: 'Blood and Land', text: 'He holds ground of his own. Ground is what men kill each other for.' },
  { n: 6, title: 'The Heir', text: 'He has a child. If he dies now, the name goes on.' },
];
const EPITHETS = ['the Salt Crow', 'of the Broken Hat', 'Nine Cuts', 'the Quiet', 'Red Sleeve', 'the Late Moon', 'Two Scabbards', 'the Cold Kettle', 'of the Long Road', 'Ash Hand'];
const RETURN = ['One-Eye', 'the Scarred', 'Come-Back', 'Twice-Buried'];
const CREEDS = { honour: ['fight', 'elder', 'help', 'talk'], coin: ['bribe', 'betray', 'younger', 'fight'], cruel: ['betray', 'stealth', 'younger', 'fight'] };

// ---- rivals ----
export function initFrame(L) {
  const S = ST(L), r = rngFor(L.seed, 'story', 'rivals'), pool = Object.values(L.actors).filter(a => a.alive && a.cls === 'ronin' && a.id !== L.player && ageIn(L, a) > 20 && ageIn(L, a) < 42);
  const creeds = ['honour', 'coin', 'cruel'], used = new Set();
  for (const creed of creeds) { const cand = pool.filter(a => !used.has(a.culture)); if (!cand.length) break; const a = r.pick(cand); used.add(a.culture); newRival(L, a.id, creed, r.pick(EPITHETS), 1, null); }
}
function newRival(L, id, creed, epithet, line, heirOf) {
  const a = actor(L, id), home = a.home ? L.zones[a.home[1] * L.size.w + a.home[0]] : null;
  ST(L).rivals[id] = { id, creed, epithet, line, heirOf, renown: heirOf ? 2 : 0, grudge: heirOf ? 2 : 0, beaten: 0, at: home && home.region >= 0 ? home.region : 0, away: 0, since: today(L) };
  return ST(L).rivals[id];
}
export const rivalName = (L, id) => { const R = ST(L).rivals[id]; return R ? `${actor(L, id).given} ${R.epithet}` : who(L, id); };

// a rival nearby may get to a contract before its due day
export function rivalTakes(L, q, r) {
  if (q.kind === 'duel' || q.kind === 'offer') return null;
  for (const R of Object.values(ST(L).rivals)) {
    if (!alive(L, R.id) || R.away > today(L) || q.giver === R.id || q.target === R.id) continue;
    if (R.at !== q.region && !ST(L).adj[R.at].includes(q.region)) continue;
    if (!r.chance(.2)) continue;
    const ways = KINDS[q.kind].ways, w = CREEDS[R.creed].map(id => ways.find(x => x.id === id || x.as === id)).find(x => x && !(x.needs && x.needs(L, q, actor(L, R.id))) && !(x.cost && x.cost(L, q) > actor(L, R.id).money.mon));
    if (!w) continue;
    if (q.state === 'taken') { R.grudge++; announce(L, 'story.rivalBeatHim', { rival: R.id, quest: q.id, region: q.region }, `${rivalName(L, R.id)} got to "${q.title}" before the ronin did.`, ['board']); }
    return { id: R.id, way: w.id };
  }
  return null;
}

export function frameSeason(L, cal, r) {
  const S = ST(L);
  for (const R of Object.values(S.rivals)) {
    if (!alive(L, R.id)) continue;
    if (R.away && R.away <= today(L)) { R.away = 0; R.epithet = r.pick(RETURN); R.grudge += 2;
      announce(L, 'story.rivalReturns', { rival: R.id, region: R.at }, `${rivalName(L, R.id)} is back on the roads, with a new name and an old grudge.`, ['board', 'messenger'], [R.at]); }
    if (R.away) continue;
    const next = S.adj[R.at]; if (next.length && r.chance(.6)) R.at = r.pick(next);   // they wander, as he does
    const p = actor(L, L.player), near = p && p.at ? L.zones[p.at[1] * L.size.w + p.at[0]].region : -1;
    if ((R.grudge >= 2 || (R.renown >= 4 && r.chance(.12))) && !openQuests(L).some(q => q.kind === 'duel' && q.giver === R.id)) {
      const at = near >= 0 && r.chance(.5) ? near : R.at;
      post(L, 'duel', { key: 'duel:' + R.id + ':' + cal.day, region: at, giver: R.id, target: L.player, tculture: actor(L, R.id).culture, days: 20, reward: 0, stake: { renown: 3 }, board: 'inn',
        title: `${rivalName(L, R.id)} calls the ronin out`, text: `${rivalName(L, R.id)} has nailed a challenge to the inn door at ${regName(L, at)}: dawn, the dry riverbed, alone. ${R.grudge >= 2 ? 'He has a score to settle.' : 'He wants the name.'}` });
    }
  }
}
// a rival dies: someone of his takes up the name (named rivals come back)
export function onKilled(e, L) {
  const S = ST(L), R = S.rivals[e.actor]; if (!R) return;
  delete S.rivals[e.actor];
  const a = actor(L, e.actor), kin = a.children.concat(a.parents).map(id => actor(L, id)).filter(k => k && k.alive && ageIn(L, k) >= 16 && k.id !== L.player);
  const heir = kin[0] || Object.values(L.actors).find(x => x.alive && x.cls === 'ronin' && x.culture === a.culture && !S.rivals[x.id] && x.id !== L.player);
  announce(L, 'story.rivalDied', { rival: e.actor, by: e.by, region: R.at }, `${a.given} ${R.epithet} is dead${e.by === L.player ? ' by the ronin\'s hand' : ''}.`, ['board', 'messenger'], [R.at]);
  if (!heir) return;
  const N = newRival(L, heir.id, R.creed, kin[0] ? `${R.epithet}'s ${heir.sex === 'm' ? (a.children.includes(heir.id) ? 'son' : 'father') : (a.children.includes(heir.id) ? 'daughter' : 'mother')}` : `who learnt from ${a.given}`, R.line + 1, e.actor);
  N.at = R.at; if (e.by !== L.player) N.grudge = 0;
  announce(L, 'story.rivalRises', { rival: heir.id, heirOf: e.actor, region: R.at }, `${rivalName(L, heir.id)} has taken up the sword${e.by === L.player ? ' and swears on the grave to find the ronin' : ''}.`, ['board'], [R.at]);
}

defineQuest('duel', { board: 'inn', check: (L, q) => !alive(L, q.giver) ? 'The challenger is dead.' : null,
  ways: [
    { id: 'fight', label: 'Meet him at dawn', blurb: 'Alone, as asked.', karma: 0, standing: () => ({}),
      act: (L, q, r) => { const R = ST(L).rivals[q.giver]; if (r.chance(.5)) { kill(L, q.giver, 'duel', L.player); return `The ronin cut ${rivalName(L, q.giver)} down in the dry riverbed.`; }
        R.beaten++; R.grudge = 0; R.away = today(L) + 112 + r.int(0, 112); return `${rivalName(L, q.giver)} lost, bowed, and walked away bleeding. He will be back.`; } },
    { id: 'stealth', label: 'Ambush him on the way', blurb: 'He expects a duel. Give him a knife in the dark.', karma: -4, standing: (L, q) => st(q.tculture, -.1),
      act: (L, q) => { kill(L, q.giver, 'ambushed', L.player); deed(L, q, 'murder', q.giver, false); return `${rivalName(L, q.giver)} never reached the riverbed. People are saying the ronin has no honour.`; } },
    { id: 'bribe', label: 'Pay him to go away', blurb: 'His name grows; yours does not.', karma: 0, cost: () => 100, payTo: 'giver',
      act: (L, q) => { const R = ST(L).rivals[q.giver]; R.renown++; R.grudge = 0; R.away = today(L) + 56; return `The ronin paid ${rivalName(L, q.giver)} to take his challenge elsewhere.`; } },
    { id: 'talk', label: 'Refuse', blurb: 'Let him say what he likes.', karma: 0, standing: (L, q) => st(L.regions[q.region].culture, -.05),
      act: (L, q) => { const R = ST(L).rivals[q.giver]; R.renown += 2; return `The ronin did not come. ${rivalName(L, q.giver)} tells every inn why.`; } },
  ],
  untouched: (L, q) => { const R = ST(L).rivals[q.giver]; if (R) R.renown += 2; const p = actor(L, L.player), c = L.regions[q.region].culture; if (p) p.standing[c] = +((p.standing[c] || 0) - .05).toFixed(2);
    return `The ronin never came. ${rivalName(L, q.giver)} calls him a coward in every inn of ${regName(L, q.region)}.`; } });

defineQuest('offer', { board: 'lord', check: (L, q) => !alive(L, q.giver) ? 'The lord who made the offer is dead.' : null,
  ways: [
    { id: 'talk', label: 'Kneel and swear', blurb: 'A stipend, a crest, a master.', karma: 0, mon: () => 100, from: 'giver', standing: (L, q) => st(q.culture, .25),
      act: (L, q) => { const p = actor(L, L.player); p.master = q.giver; ST(L).arc.sworn = q.giver; return `The ronin knelt to ${who(L, q.giver)} and took his crest. He is masterless no longer.`; } },
    { id: 'help', label: 'Refuse, politely', blurb: 'Stay free. The lord will remember the bow and the no.', karma: 0, standing: (L, q) => st(q.culture, -.05),
      act: (L, q) => { ST(L).arc.sworn = false; return `The ronin bowed low and refused ${who(L, q.giver)}. He is still his own man.`; } },
    { id: 'betray', label: 'Take the advance and vanish', blurb: 'A season\'s stipend up front.', karma: -3, mon: () => 250, from: 'giver', standing: (L, q) => st(q.culture, -.4),
      act: (L, q) => { ST(L).arc.sworn = false; deed(L, q, 'fraud', q.giver, true); return `The ronin took ${who(L, q.giver)}'s advance and was gone by morning.`; } },
  ],
  untouched: (L, q) => { ST(L).arc.sworn = false; return `${who(L, q.giver)} waited for an answer that never came, and withdrew the offer.`; } });

// ---- his arc: checked once a day, cheap (only his own record) ----
export function arcDay(L, cal) {
  const S = ST(L), A = S.arc, p = actor(L, L.player); if (!p) return;
  const want = p.children && p.children.length ? 6 : p.holds && p.holds.length ? 5 : A.sworn != null ? 4 : A.renown >= 12 ? 3 : A.renown >= 6 ? 2 : 1;
  if (want === 3 && A.chapter < 3) {   // the offer comes from the lord who likes him best
    const best = Object.entries(p.standing).filter(([c, v]) => v >= .3 && ['clan', 'court'].includes(L.cultures[c].kind)).sort((a, b) => b[1] - a[1])[0];
    if (!best) return;
    const reg = L.cultures[best[0]].regions.map(i => L.regions[i]).find(g => g.lord && alive(L, g.lord)); if (!reg) return;
    post(L, 'offer', { key: 'offer:' + reg.lord, region: reg.id, giver: reg.lord, culture: +best[0], days: 40, reward: 0, stake: { renown: 2 },
      title: `${who(L, reg.lord)} offers the ronin service`, text: `${who(L, reg.lord)} of ${cultName(L, +best[0])} has heard enough about the ronin. A stipend of rice, a crest, a place in his hall, if he kneels.`, board: 'lord' });
  }
  if (want > A.chapter) { A.chapter = want; A.since = today(L); const c = chapterOf(L);
    announce(L, 'story.chapter', { actor: L.player, chapter: want, title: c.title }, `Chapter ${want}: ${c.title}. ${c.text}`, ['messenger']); }
}
export function chapterOf(L) {
  const A = ST(L).arc, p = actor(L, L.player), c = CHAPTERS.find(x => x.n === A.chapter && (A.chapter !== 4 || !!x.alt === (A.sworn === false)));
  const k = p ? p.karma : 0, name = k >= 10 ? 'the Just' : k >= 4 ? 'the Kind' : k <= -10 ? 'the Butcher' : k <= -4 ? 'the Snake' : null;
  return { ...c, epithet: name, renown: A.renown, done: A.done, ways: A.ways };
}

// ---- a region's main tale: the thread that matters most there now, or a quiet one from its past ----
const MEMORABLE = new Set(['event.lordDied', 'event.disputeSettled', 'event.battle', 'event.peace', 'event.uprisingWon', 'event.uprisingCrushed', 'event.famine', 'event.flood', 'event.typhoon',
  'event.earthquake', 'event.drought', 'event.plague', 'event.villageTaken', 'event.armyBroken', 'event.campRazed', 'event.comet', 'event.processionArrives']);
const WEIGHT = { war: 9, succession: 8, uprising: 8, army: 7, famine: 7, plague: 6, occupied: 5, dying: 4 };
export function taleOf(L, region) {
  const S = ST(L), g = L.regions[region], t = [];
  const w = S.reg[region].war && S.wars[S.reg[region].war]; if (w) t.push(['war', `The war of ${cultName(L, w.a)} and ${cultName(L, w.b)}`, `${regName(L, region)} is a front. ${w.battles} battles so far; ${w.score === 0 ? 'neither side ahead' : `${cultName(L, w.score > 0 ? w.a : w.b)} ahead`}.`]);
  const d = S.disputes[region]; if (d) t.push(['succession', 'Two sons, one seat', `${who(L, d.a)} and ${who(L, d.b)} both claim the seat of their dead father.`]);
  if (S.uprisings[region]) t.push(['uprising', 'The sickle and the spear', `${who(L, S.uprisings[region].leader)} leads the villages against ${who(L, g.lord)}.`]);
  const A = Object.values(S.armies).find(a => a.region === region || L.zones[a.target[1] * L.size.w + a.target[0]].region === region); if (A) t.push(['army', 'The bandit army', `${who(L, A.chief)} has gathered ${A.camps.length} camps.`]);
  if (S.reg[region].hunger >= .5) t.push(['famine', 'The hungry winter', `The storehouses of ${g.name} are empty; the lord's are not.`]);
  if (S.reg[region].sick > 0) t.push(['plague', 'The sickness', `Plague walks the roads of ${g.name}.`]);
  if (g.occupier) t.push(['occupied', 'Held by force', `${g.occupier.actor ? who(L, g.occupier.actor) : cultName(L, g.occupier.culture)} holds ${g.name}; the lord's house keeps only the deed.`]);
  if (g.lord && S.ill[g.lord]) t.push(['dying', 'The lord\'s last winter', `${who(L, g.lord)} is dying, and his house is choosing sides.`]);
  if (t.length) { t.sort((a, b) => WEIGHT[b[0]] - WEIGHT[a[0]]); const [kind, title, text] = t[0];
    return { kind, title, text, quests: openQuests(L, region).map(q => q.id), also: t.slice(1).map(x => x[1]) }; }
  const past = S.news.slice().reverse().find(n => n.regions.includes(region) && MEMORABLE.has(n.type));
  return { kind: 'quiet', title: `The quiet of ${g.name}`, text: past ? `They still talk about it: ${past.text}` : `${g.lord ? `${who(L, g.lord)} rules` : 'Nobody rules'} ${g.name} for ${cultName(L, g.culture)}. Nothing has happened here that anyone remembers.`, quests: openQuests(L, region).map(q => q.id), also: [] };
}
