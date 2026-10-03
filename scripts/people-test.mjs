// node scripts/people-test.mjs [seed] [years]: live a world for 60 years with the people system and print what became of its people:
// population by decade, households, marriages, deaths by cause, lands inherited, one family tree; then check the rules hold.
import { killActor, tree, brides, judge, court, propose, tieValue, nameHeir, playableHeirs, swear, freePlot, grantPlot, lootGrave, PEOPLE_RULES } from 'ronin-engine/sim/people/index.js';
import { generateWorld, advance, hoursFromYears, serialize, deserialize, calendar, HOURS_PER_YEAR, bear, rngFor } from 'ronin-engine/sim/index.js';
const worth = PEOPLE_RULES.worth, nm = (W, id) => id && W.actors[id] ? W.actors[id].given : 'nobody';
const seed = +(process.argv[2] || 12345), years = +(process.argv[3] || 60);
const fail = []; const check = (ok, what) => { if (!ok) fail.push(what); };
const living = L => Object.values(L.actors).filter(a => a.alive);
const houses = L => living(L).filter(a => a.household === a.id).length;

let t0 = performance.now(); const L = generateWorld(seed, 0); const genMs = performance.now() - t0;
console.log(`world ${seed}: made in ${(performance.now() - t0).toFixed(0)} ms; ${living(L).length} people in ${houses(L)} households`);
const start = living(L).length;
t0 = performance.now();
for (let y = 1; y <= years; y++) {
  advance(L, hoursFromYears(1));
  if (y % 10 === 0) { const c = L.sys.people.census.at(-1); console.log(`year ${String(y).padStart(2)}: ${living(L).length} living, ${houses(L)} households, this year ${c.births} born, ${c.deaths} died, ${c.marriages} wed`); }
}
const ms = performance.now() - t0, days = years * 112;
console.log(`lived ${years} years (${days} days) in ${ms.toFixed(0)} ms: ${(ms / days).toFixed(3)} ms a day here, ${(ms / days / Math.max(1, genMs / 230)).toFixed(3)} at the core's reference speed`);
const P = L.sys.people, S = P.stats;
console.log('marriages', S.marriages, '| adopted heirs (mukoyōshi)', S.adopted, '| births', S.births);
console.log('deaths by cause', S.deaths);
console.log(`lands inherited: ${S.inherited} plots in ${S.estates} estates; ${S.regencies} held by regents for minors; ${S.toLord} to the lord (no heir), ${S.toNature} to nature`);
console.log(`lords' seats passed ${S.seats} | houses founded on land of their own ${S.founded}, as tenants ${S.tenants} | moved ${S.migrated} | recruited ${S.recruited} | the long dead forgotten ${Object.values(L.actors).filter(a => a.faded).length}`);
const dead = Object.values(L.actors).filter(a => !a.alive && a.died > 0), ages = dead.map(a => (a.died - a.born) / HOURS_PER_YEAR);
console.log(`mean age at death ${(ages.reduce((s, x) => s + x, 0) / ages.length).toFixed(1)}; of those who reached 16: ${(ages.filter(x => x >= 16).reduce((s, x) => s + x, 0) / ages.filter(x => x >= 16).length).toFixed(1)}`);

// one family tree: the house with the most living descendants of a founder from the first generation
const firsts = Object.values(L.actors).filter(a => a.born < 0 && a.children.length && a.sex === 'm' && !a.parents.length);
const count = n => n ? 1 + n.kids.reduce((s, k) => s + count(k), 0) : 0;
const best = firsts.map(a => [a, count(tree(L, a.id, 5))]).sort((a, b) => b[1] - a[1])[0][0];
const yr = h => Math.floor(h / HOURS_PER_YEAR) + 1;
const print = (n, pad = '') => { console.log(`${pad}${n.name}${n.spouse ? ' = ' + n.spouse : ''}  (${n.born < 0 ? 'before' : 'y' + yr(n.born)}–${n.died != null ? 'y' + yr(n.died) + ' ' + n.cause : 'living'}, ${n.job})`); for (const k of n.kids) print(k, pad + '  '); };
const bz = best.home || (best.grave && best.grave.zone);
console.log(`\nthe ${best.family} house${bz ? ` (${L.regions[L.zones[bz[1] * 100 + bz[0]].region].name})` : ''}:`); print(tree(L, best.id, 3));

// ---- the rules hold ----
const now = living(L).length;
check(now > start * .75 && now < start * 1.35, `population stable (${start} → ${now})`);
// the budget is under a millisecond a day at the core's reference speed (a world made in about 230 ms, docs/sim-core.md); slower machines scale
const speed = genMs / 230;
check(ms / days / Math.max(1, speed) < 1, `under a millisecond a day at reference speed (${(ms / days / Math.max(1, speed)).toFixed(3)})`);
for (const [pid, rec] of Object.entries(L.plots)) {
  const t = rec.title && L.actors[rec.title];
  if (t && !t.alive) { check(false, `plot ${pid} titled to the dead ${t.id}`); break; }
  if (t && !t.holds.includes(pid)) { check(false, `plot ${pid} titled to ${t.id} but not in his holds`); break; }
}
for (const g of L.regions) if (g.lord && !L.actors[g.lord].alive) { check(false, `region ${g.id}'s lord is dead`); break; }
for (const a of living(L)) { const s = L.actors[a.spouse]; if (a.spouse && (!s || !s.alive || s.spouse !== a.id)) { check(false, `${a.id}'s marriage is one-sided`); break; } }
// the same world and the same years give the same result, through a save and a load too
const B = generateWorld(seed, 0); advance(B, hoursFromYears(3)); const C = deserialize(serialize(B)); advance(B, hoursFromYears(2)); advance(C, hoursFromYears(2));
check(serialize(B) === serialize(C), 'deterministic through save and load');
// ---- the ronin's death (owner 2026-09-26): with an heir the game goes on as the heir and his grave stays; without one the run is over ----
const line = P.lineage.map(l => { const a = L.actors[l.actor]; return `${a.given} ${a.family} (died y${yr(l.died)}, ${l.cause})`; });
console.log(`\nhis line in the 60-year world: ${line.join(' → ') || 'the first ronin still lives'}; now playing ${L.actors[L.player].given} ${L.actors[L.player].family}${P.over ? ' (the run is over)' : ''}`);
{ // alone: no heir, the run ends where he fell
  const W = generateWorld(seed + 1, 0), p = W.actors[W.player];
  killActor(W, p.id, 'duel', null, { zone: p.at, tile: [30, 31] });
  check(W.sys.people.over && W.player === p.id, 'no heir: the run is over');
  check(p.grave && p.grave.tile[0] === 30 && W.sys.people.graves.some(g => g.actor === p.id && g.player), 'his grave lies where he fell, remembered');
  console.log(`alone: ${p.given} ${p.family} fell in a duel at zone ${p.grave.zone} tile ${p.grave.tile}; the run is over`);
}
{ // married, a child born, the child named heir: the game goes on as the child, who waits to come of age
  const W = generateWorld(seed + 2, 0), p = W.actors[W.player];
  p.money.ryo += 20;
  const cands = brides(W, p.id).map(b => [b, judge(W, p, b)]).filter(([, j]) => j.reasons.every(x => x === 'she hardly knows him'));
  check(cands.length > 0, 'brides near his start');
  const [bride] = cands[0];
  for (let i = 0; i < 6 && tieValue(p, bride.id) < .45; i++) court(W, p.id, bride.id);
  const res = propose(W, p.id, bride.id);
  check(res.wed && p.spouse === bride.id && bride.household === p.id, `he marries (${res.reasons.join(', ')})`);
  console.log(`married: ${p.given} wed ${bride.given} ${bride.family} (${bride.cls}), bride price ${res.price} mon, her people's acceptance ${res.accept}`);
  check((p.standing[bride.culture] || 0) >= .25, 'marrying into her people raises their standing of him');
  let y = 0; while (!p.children.length && y < 12) { advance(W, hoursFromYears(1)); y++; }
  check(p.children.length > 0, 'a child is born to him');   // born: whether he lives through childhood is the sim's own luck
  // make sure of two sons and a daughter (the test's own births), so each rule has someone to find
  const r = rngFor(seed, 'test'), born = sex => { const c = bear(W, r, bride, p); c.born = W.hour; c.sex = sex; c.job = 'child'; c.dynasty = true; return c; };
  born('m'); born('m'); const girl = born('f');
  const heirs = playableHeirs(W, p);
  check(heirs.length >= 2 && heirs.every(h => h.sex === 'm') && !heirs.includes(girl), 'only sons are offered as heirs, never a daughter');
  const first = heirs[heirs.length - 1];
  check(nameHeir(W, first.id) && !nameHeir(W, girl.id), 'he names a son his heir; a daughter cannot be named');
  const plot = freePlot(W, W.zones[p.home[1] * 100 + p.home[0]]); if (plot) grantPlot(W, plot, p);   // give him land to pass on (in the game the economy lane sells it)
  const carried = worth(p.money), blade = p.weapon, at = [...p.at];
  killActor(W, p.id, 'violence', null, { zone: at, tile: [12, 40] });
  const h = W.actors[W.player];
  check(W.player === first.id && h.dynasty && !W.sys.people.over, 'his named heir carries on, played at once');
  check(h.regent === bride.id, 'the child\'s mother is his regent');
  check(!plot || (h.holds.includes(plot) && W.plots[plot].holder === bride.id), 'the land is the heir\'s, held by his mother until he is grown');
  check(p.grave.goods && p.grave.goods.weapon === blade && worth(p.grave.goods.money) === carried && worth(p.money) === 0, 'what he carried lies in his grave');
  const took = lootGrave(W, p.id, h.id);
  check(took && h.weapon === blade && !lootGrave(W, p.id, bride.id), 'finders keepers: his heir takes the blade, the grave is bare after');
  console.log(`after ${y} year(s): he fell at ${at}; ${h.given} (${Math.floor((W.hour - h.born) / HOURS_PER_YEAR)}) carries on with ${nm(W, h.regent)} as regent, and took his ${took && took.weapon} and ${worth(took ? took.money : {})} mon from the grave`);
  // his brothers after him, then, with only sisters left, a sworn companion
  let n = 0; while (W.actors[W.player].sex === 'm' && W.actors[W.player].dynasty && n++ < 5) {
    const cur = W.actors[W.player], next = playableHeirs(W, cur);
    if (!next.length) break;
    check(next.every(x => x.sex === 'm') && !next.includes(girl), 'the brothers carry on, never the sister');
    killActor(W, cur.id, 'illness');
    console.log(`${cur.given} died young; his brother ${W.actors[W.player].given} carries on`);
  }
  const cur = W.actors[W.player];
  const friend = Object.values(W.actors).find(a => a.alive && a.sex === 'm' && !a.dynasty && (W.hour - a.born) / HOURS_PER_YEAR > 20 && a.cls === 'ronin');
  check(swear(W, friend.id), 'a companion swears to carry on his name');
  killActor(W, cur.id, 'violence');
  check(W.player === friend.id && !W.sys.people.over, 'with only a sister left, his sworn companion carries on');
  console.log(`${cur.given} fell with only a sister left; ${friend.given} ${friend.family}, sworn to him, carries on`);
}
console.log('json', (serialize(L).length / 1024).toFixed(0), 'KB after', years, 'years, now', calendar(L.hour).year);
if (fail.length) { console.error('FAILED:\n  ' + fail.join('\n  ')); process.exit(1); }
console.log('all checks passed');
