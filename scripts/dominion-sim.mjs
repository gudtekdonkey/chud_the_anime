// node scripts/dominion-sim.mjs [seed] [years]: make a world, let dominion live it (100 region lords building, taxing, recruiting, going
// to war), and print how land concentrated, the biggest domains by koku, the wars and how they ended, settlements that grew or fell,
// and what a game day costs. No browser needed.
import { generateWorld, advance, hoursFromYears, calendar, on, serialize, deserialize, nameOf } from '../src/sim/index.js';
import { dominion as D, TIERS, tierName, lordName, holdingsOf, menOf, top } from '../src/sim/dominion/index.js';

const seed = +(process.argv[2] || 12345), years = +(process.argv[3] || 20);
const count = {}; on('*', e => { if (e.type.startsWith('dom.') || e.type.startsWith('war.')) count[e.type] = (count[e.type] || 0) + 1; });
const wars = [], tiers = []; on('war.peace', e => wars.push(e)); on('dom.tier', e => tiers.push(e));
let t0 = performance.now(); const L = generateWorld(seed, 0); console.log(`world ${seed}: made in ${(performance.now() - t0).toFixed(0)} ms (dominion set up with it)`);
const d = () => D(L);

// who stands where: independent rulers, how much of the koku the top few hold
function snapshot() {
  const lords = Object.values(d().lords).filter(l => !l.gone && !l.outlaw && L.actors[l.id].alive && l.zones.length);
  const outlaws = Object.values(d().lords).filter(l => !l.gone && l.outlaw && L.actors[l.id].alive && l.zones.length).length, rulers = lords.filter(l => !l.liege), all = rulers.reduce((s, l) => s + l.kokuAll, 0), sorted = rulers.map(l => l.kokuAll).sort((a, b) => b - a);
  const share = n => (sorted.slice(0, n).reduce((s, x) => s + x, 0) / all * 100).toFixed(0) + '%';
  const tierCount = TIERS.map((t, i) => `${t.name} ${Object.values(d().set).filter(s => s.tier === i).length}`).join(', ');
  const held = Object.values(d().zt).filter(z => z.holder).length, occ = Object.values(d().zt).filter(z => z.title && z.holder && z.title !== z.holder).length;
  return { outlaws, rulers: rulers.length, lords: lords.length, all: Math.round(all), top5: share(5), top10: share(10), realms: Object.keys(d().realms).length, domains: Object.keys(d().dom).length,
    provincesHeld: Object.values(d().prov).filter(p => p.holder).length, tierCount, held, occ, men: Object.values(d().armies).reduce((s, a) => s + menOf(a), 0) };
}
const tierOf0 = Object.fromEntries(Object.values(d().set).map(s => [s.k, s.tier])), pop0 = Object.fromEntries(Object.values(d().set).map(s => [s.k, s.pop]));
const s0 = snapshot();
console.log(`start: ${s0.rulers} independent rulers (${s0.lords} lords, ${s0.outlaws} outlaw chiefs), ${s0.realms} realms, ${s0.domains} domains, ${s0.provincesHeld} provinces held; top 5 hold ${s0.top5} of all koku, top 10 ${s0.top10}; ${s0.men} men under arms`);
console.log(`       settlements: ${s0.tierCount}`);

// live it, a year at a time, timing only the living
let lived = 0;
for (let y = 1; y <= years; y++) {
  t0 = performance.now(); advance(L, hoursFromYears(1)); lived += performance.now() - t0;
  if (y % 5 === 0 || y === years) { const s = snapshot();
    console.log(`year ${String(y).padStart(2)}: ${s.rulers} rulers (${s.outlaws} outlaw chiefs), ${s.realms} realms, ${s.domains} domains, top 5 ${s.top5} / top 10 ${s.top10} of ${s.all} koku, ${s.occ} zones held without title, ${s.men} men under arms`); }
}
const days = years * 112;
console.log(`\nlived ${years} years (${days} days) in ${lived.toFixed(0)} ms: ${(lived / days).toFixed(3)} ms a game day on average`);

const s1 = snapshot();
console.log(`\n== Land concentration ==\nindependent rulers ${s0.rulers} → ${s1.rulers}; realms ${s0.realms} → ${s1.realms}; domains ${s0.domains} → ${s1.domains}`);
console.log(`the top 5 rulers held ${s0.top5} of the koku, now ${s1.top5}; the top 10 ${s0.top10} → ${s1.top10}`);
console.log(`provinces with a holder ${s0.provincesHeld} → ${s1.provincesHeld}; zones held by force without title: ${s1.occ} of ${s1.held}`);

console.log('\n== The biggest by koku (a ruler with his sworn vassals) ==');
const big = Object.values(d().lords).filter(l => !l.gone && !l.liege && !l.outlaw && L.actors[l.id].alive && l.zones.length).sort((a, b) => b.kokuAll - a.kokuAll).slice(0, 10);
for (const l of big) { const h = holdingsOf(L, l.id), a = L.actors[l.id], vass = Object.values(d().lords).filter(x => x.liege === l.id && !x.gone).length;
  console.log(`  ${String(Math.round(l.kokuAll)).padStart(6)} koku  ${nameOf(a)} (${L.cultures[a.culture]?.name ?? 'no culture'}): ${h.rank}${h.realm ? `, ${h.realm.name}` : ''}; ${l.zones.length} zones, ${h.domains.length} domains, ${h.provinces.length} provinces, ${vass} vassal lords, ${Object.values(d().armies).filter(x => top(L, x.lord) === l.id).reduce((s, x) => s + menOf(x), 0)} men`); }
console.log('\n== The domains (han) by koku of their zones ==');
const domK = m => m.zones.reduce((s, k) => s + (d().set[k] ? d().set[k].yield : 0), 0);
for (const m of Object.values(d().dom).sort((a, b) => domK(b) - domK(a)).slice(0, 8)) console.log(`  ${String(Math.round(domK(m))).padStart(6)} koku  ${m.name}: ${m.zones.length} zones, held by ${lordName(L, m.holder)}${m.holder !== m.title ? ` (title: ${lordName(L, m.title)})` : ''}`);

console.log(`\n== Wars: ${Object.keys(d().wars).length} declared, ${wars.length} ended ==`);
const how = wars.reduce((m, w) => (m[w.how] = (m[w.how] || 0) + 1, m), {}); console.log('  ended by', how, '| still fighting', Object.values(d().wars).filter(w => !w.end).length);
const reasons = Object.values(d().wars).reduce((m, w) => (m[w.reason] = (m[w.reason] || 0) + 1, m), {}); console.log('  reasons', reasons);
for (const w of Object.values(d().wars).filter(w => w.end && w.treaty).slice(-8)) { const t = w.treaty;
  console.log(`  ${w.id}: ${lordName(L, w.a)} vs ${lordName(L, w.d)} (${w.reason}), year ${calendar(w.started).year}–${calendar(w.end).year}: ${lordName(L, t.winner)} won; ${t.cede.length} zones ceded${t.tribute ? `, tribute ${t.tribute.mon} mon × ${t.tribute.seasons}` : ''}${t.hostage ? ', a hostage' : ''}${t.marriage ? ', a marriage' : ''}${t.vassal ? ', the loser swore fealty' : ''}; ${w.battles.length} battles, ${w.taken.length} zones taken`); }

console.log('\n== Settlements ==');
const grew = Object.values(d().set).filter(s => tierOf0[s.k] != null && s.tier > tierOf0[s.k]), fell = Object.values(d().set).filter(s => tierOf0[s.k] != null && s.tier < tierOf0[s.k]);
console.log(`  ${s0.tierCount}\n→ ${s1.tierCount}`);
console.log(`  ${grew.length} grew a tier or more, ${fell.length} fell; ${tiers.length} tier changes in all`);
const nm = s => s.name || `(${s.k})`;
for (const s of grew.sort((a, b) => (b.tier - tierOf0[b.k]) - (a.tier - tierOf0[a.k])).slice(0, 6)) console.log(`  grew: ${nm(s)} ${tierName(tierOf0[s.k])} → ${tierName(s.tier)}, ${pop0[s.k]} → ${s.pop} people`);
for (const s of fell.slice(0, 6)) console.log(`  fell: ${nm(s)} ${tierName(tierOf0[s.k])} → ${tierName(s.tier)}, ${pop0[s.k]} → ${s.pop} people`);
console.log('\n== Events ==\n ', Object.entries(count).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${v}`).join(', '));
const json = serialize(L); console.log(`\nsave ${(json.length / 1024).toFixed(0)} KB, dominion ${(JSON.stringify(L.sys.dominion).length / 1024).toFixed(0)} KB`); deserialize(json);
