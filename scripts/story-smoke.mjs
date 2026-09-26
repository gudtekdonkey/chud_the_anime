// node scripts/story-smoke.mjs [seed] [years]: make a world with the story lane, live it (10 years by default) with nobody touching
// anything, and print the world events that happened, the quests that arose and how each ended on its own. Exits non-zero on a broken rule.
import { generateWorld, advance, hoursFromYears, calendar, serialize, deserialize, on } from '../src/sim/index.js';
import { storyOf, openQuests, boardOf, taleOf, chapterOf, rivalName, waysOf, resolveQuest, takeQuest } from '../src/sim/story/index.js';

const seed = +(process.argv[2] || 12345), years = +(process.argv[3] || 10);
const L = generateWorld(seed, 0), S = storyOf(L);
const events = [], quests = {};
on('*', e => { if (e.type.startsWith('event.') || e.type.startsWith('story.')) events.push(e); });
on('story.questPosted', e => { quests[e.quest] = { ...S.quests[e.quest] }; });
const ended = e => { const q = S.quests[e.quest]; if (q) quests[e.quest] = { ...q }; };
on('story.questEnded', ended); on('story.questResolved', ended);

const day = h => { const c = calendar(h); return `y${c.year} ${c.season.padEnd(6)} d${String(c.dayOfSeason).padStart(2)}`; };
const fails = []; const must = (ok, msg) => { if (!ok) fails.push(msg); };

// live it a season at a time, timing each
const HOURS = hoursFromYears(years), STEP = 24 * 28;
let worst = 0, ms = 0; const tried = {};
for (let h = 0; h < HOURS; h += STEP) { const t = performance.now(); advance(L, STEP); const dt = performance.now() - t; ms += dt; worst = Math.max(worst, dt); tryWays(); }
const days = HOURS / 24;
// every way of the first open quest of each kind, each tried on its own copy of the world (the world itself stays untouched)
function tryWays() {
  for (const q of openQuests(L)) { if (tried[q.kind]) continue; tried[q.kind] = [];
    for (const w of waysOf(L, q)) { const C = deserialize(serialize(L)); C.actors[C.player].money.mon = 5000;
      try { takeQuest(C, q.id); const o = resolveQuest(C, q.id, w.id); must(o && o.text, `${q.kind}/${w.id} gave no outcome`); tried[q.kind].push(w.id); }
      catch (err) { must(false, `${q.kind}/${w.id} threw: ${err.stack.split('\n').slice(0, 3).join(' | ')}`); } } }
}
console.log(`world ${seed}: lived ${years} years (${days} days) in ${ms.toFixed(0)} ms: ${(ms / days).toFixed(3)} ms a day on average, worst season ${worst.toFixed(1)} ms\n`);

// ---- world events, by kind, then a timeline of the big ones ----
const count = (arr, f) => arr.reduce((m, x) => (m[f(x)] = (m[f(x)] || 0) + 1, m), {});
const byType = count(events.filter(e => e.type.startsWith('event.')), e => e.type);
console.log('WORLD EVENTS'); for (const [t, n] of Object.entries(byType).sort((a, b) => b[1] - a[1])) console.log(`  ${String(n).padStart(4)}  ${t}`);
const BIG = new Set(['event.war', 'event.peace', 'event.lordDied', 'event.successionDispute', 'event.disputeSettled', 'event.uprising', 'event.uprisingWon', 'event.uprisingCrushed', 'event.famine',
  'event.plague', 'event.plagueEnds', 'event.earthquake', 'event.comet', 'event.banditArmy', 'event.villageTaken', 'event.armyBroken', 'event.procession', 'event.bounty', 'event.typhoon', 'event.drought']);
console.log('\nTIMELINE (the big moves)');
for (const e of events.filter(e => BIG.has(e.type))) console.log(`  ${day(e.h)}  ${e.text}`);
const story = count(events.filter(e => e.type.startsWith('story.') && !e.type.startsWith('story.quest')), e => e.type);
console.log('\nSTORY EVENTS', story);

// ---- quests: what arose, how each ended untouched ----
const qs = Object.values(quests);
console.log(`\nQUESTS: ${qs.length} arose`, count(qs, q => q.kind));
console.log('endings', count(qs.filter(q => q.state === 'done'), q => q.outcome.by ? 'a rival' : q.outcome.way));
for (const kind of [...new Set(qs.map(q => q.kind))]) {
  const some = qs.filter(q => q.kind === kind && q.state === 'done').slice(0, 2);
  for (const q of some) console.log(`  [${kind}] ${day(q.posted * 24)} "${q.title}" -> ${q.outcome.by ? `${rivalName(L, q.outcome.by)} (${q.outcome.way}): ` : ''}${q.outcome.text}`);
}
const open = openQuests(L); console.log(`still open at the end: ${open.length}`);

// ---- the frame: rivals, his arc, a region's board and tale ----
console.log('\nRIVALS'); for (const R of Object.values(S.rivals)) console.log(`  ${rivalName(L, R.id)}: ${R.creed}, renown ${R.renown}, grudge ${R.grudge}, line ${R.line}${R.away ? ', away' : ''}`);
const c = chapterOf(L); console.log(`HIS ARC: chapter ${c.n}, ${c.title} (untouched, so he never moved)`);
const p = L.actors[L.player], home = L.zones[p.at[1] * 100 + p.at[0]].region, b = boardOf(L, home, { days: 112 });
console.log(`\nTHE BOARD AT ${b.name} (lord ${b.lord}${b.occupier ? `, held by force` : ''}): tale "${b.tale.title}": ${b.tale.text}`);
for (const n of b.news.slice(0, 6)) console.log(`  news  ${n.text}`);
for (const q of b.contracts) console.log(`  job   ${q.title} (${q.reward} mon, ${q.due} days, ${q.where})`);
const tales = count(L.regions.map(g => taleOf(L, g.id)), t => t.kind); console.log('region tales now', tales);

// his arc: give a copy of the world a well-known ronin liked by a clan, and a lord should offer him service within a day
{ const C = deserialize(serialize(L)), P = C.actors[C.player], clan = C.cultures.find(c => c.kind === 'clan');
  P.standing[clan.id] = .6; storyOf(C).arc.renown = 12; advance(C, 24);
  const offer = openQuests(C).find(q => q.kind === 'offer'); must(offer, 'no offer of service came at renown 12');
  if (offer) { resolveQuest(C, offer.id, 'talk'); advance(C, 24); const ch = chapterOf(C); must(ch.n === 4 && ch.title === 'Sworn' && P.master === offer.giver, `swearing did not reach "Sworn" (${ch.title})`); tried.offer = ['talk']; } }
console.log('\nWAYS TRIED on copies of the world', Object.entries(tried).map(([k, v]) => `${k}: ${v.join(', ')}`).join('; '));

// ---- rules: saves round-trip, plain JSON, same seed gives the same world, cheap enough ----
const json = serialize(L); const L2 = deserialize(json); must(JSON.stringify(L2.sys.story) === JSON.stringify(S), 'story state does not survive a save');
must(!/function|\[object/.test(JSON.stringify(S)), 'story state holds something that is not plain data');
must(ms / days < 1, `story + core cost ${(ms / days).toFixed(3)} ms a game day (budget: under 1 ms)`);
must(qs.length >= 50, `only ${qs.length} quests in ${years} years`);
must(Object.keys(byType).length >= 12, `only ${Object.keys(byType).length} kinds of world event`);
const again = generateWorld(seed, 0); advance(again, hoursFromYears(1)); const once = generateWorld(seed, 0); advance(once, hoursFromYears(1));
must(JSON.stringify(again.sys.story) === JSON.stringify(once.sys.story), 'the same seed and time gave a different story');
console.log(`\nsave ${(json.length / 1024).toFixed(0)} KB (story ${(JSON.stringify(S).length / 1024).toFixed(0)} KB)`);
if (fails.length) { console.error('\nFAIL\n  ' + fails.join('\n  ')); process.exit(1); }
console.log('ok');
