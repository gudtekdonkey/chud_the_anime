// node scripts/travel-year.mjs [seed] [years]: the travel lane's test (docs/sim-travel.md). Lives a world for a year with a ronin who
// walks the roads town to town by day, and prints how often each encounter came up, by region.
import 'ronin-engine/sim/travel/index.js';
import { generateWorld, advance, calendar, zoneAt, on, rngFor, hoursFromYears } from 'ronin-engine/sim/index.js';
import { enterZone, choose, context, chanceAt, ENCOUNTERS } from 'ronin-engine/sim/travel/index.js';
const seed = +(process.argv[2] || 12345), years = +(process.argv[3] || 1);
const L = generateWorld(seed, 0), st = L.sys.travel, p = L.actors[L.player], r = rngFor(seed, 'traveller');
const tally = {}, count = (k, n = 1) => tally[k] = (tally[k] || 0) + n;
const byRegion = {}, byType = {};
on('*', e => {
  count(e.type);
  if (e.type === 'travel.encounter') { const g = byRegion[e.region] ||= { n: 0 }; g.n++; g[e.encounter] = (g[e.encounter] || 0) + 1; byType[e.encounter] = (byType[e.encounter] || 0) + 1; }
});
// the traveller: a road path to a random town, walking from 7 to 19 and sleeping at night. A zone is 1024 px: at his walk and run
// (40 and 78 px/s) about 25 real seconds, so about four zones a game hour (a game hour is 100 real seconds)
const ZONES_PER_HOUR = 4;
function roadPath(from, to) {
  const W = L.size.w, key = (x, y) => y * W + x, prev = new Map([[key(...from), -1]]), q = [from];
  while (q.length) { const [x, y] = q.shift(); if (x === to[0] && y === to[1]) break;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const z = zoneAt(L, x + dx, y + dy); if (!z || !z.road || prev.has(key(z.x, z.y))) continue; prev.set(key(z.x, z.y), key(x, y)); q.push([z.x, z.y]); } }
  if (!prev.has(key(...to))) return null;
  const out = []; for (let k = key(...to); k !== key(...from); k = prev.get(k)) out.unshift([k % W, Math.floor(k / W)]); return out;
}
const towns = L.zones.filter(z => (z.kind === 'town' || z.kind === 'village') && z.road);
let path = [], zonesWalked = 0, onRoad = 0, t0 = Date.now(), live = 0;
const end = hoursFromYears(years);
while (L.hour < end) {
  const cal = calendar(L.hour);
  if (cal.hour < 7 || cal.hour >= 19) { advance(L, 1, true); continue; }
  if (!path.length) { for (let t = 0; t < 20 && !path.length; t++) path = roadPath(p.at, (tw => [tw.x, tw.y])(r.pick(towns))) || []; if (!path.length) { advance(L, 1, true); continue; } }
  p.at = path.shift(); zonesWalked++; if (zoneAt(L, ...p.at).road) onRoad++;
  const t1 = performance.now(); let sc = enterZone(L, ...p.at); live += performance.now() - t1;
  let hours = zonesWalked % ZONES_PER_HOUR === 0 ? 1 : 0;
  while (sc) {
    let out = choose(L, r.pick(sc.choices).id);
    if (out.again) out = choose(L, r.pick(out.again).id);
    count('choice.' + sc.type); hours += Math.min(24, out.hours || 0); sc = out.next || null; }
  if (hours) advance(L, hours, true);
  if (p.money.mon < 30) p.money.mon += 100;   // the traveller finds work now and then, so he always has something to be robbed of
}
const liveMs = Date.now() - t0;
console.log(`world ${seed}: ${years} year(s) lived with a traveller in ${liveMs} ms (enterZone ${live.toFixed(0)} ms for ${zonesWalked} zones, ${ZONES_PER_HOUR} an hour by day)`);
// ---- encounters ----
const n = Object.values(byType).reduce((a, b) => a + b, 0);
console.log(`\nENCOUNTERS: ${n} in ${zonesWalked} zones walked (${(onRoad / zonesWalked * 100).toFixed(0)}% on roads): one per ${(zonesWalked / n).toFixed(1)} zones`);
console.log('  by type ', Object.entries(byType).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${v}`).join(' · '));
const kinds = {}; for (const [g, v] of Object.entries(byRegion)) { const k = L.cultures[L.regions[g].culture].kind; (kinds[k] ||= { n: 0 }); for (const t in v) kinds[k][t] = (kinds[k][t] || 0) + v[t]; }
console.log('\n  by culture kind (encounters; ambush share):');
for (const [k, v] of Object.entries(kinds).sort((a, b) => b[1].n - a[1].n)) console.log(`    ${k.padEnd(10)} ${String(v.n).padStart(4)}  ambush ${((v.ambush || 0) / v.n * 100).toFixed(0)}%  ${Object.entries(v).filter(([t]) => t !== 'n').sort((a, b) => b[1] - a[1]).map(([t, c]) => `${t} ${c}`).join(', ')}`);
console.log('\n  by region (the 15 he met most in):');
for (const [g, v] of Object.entries(byRegion).sort((a, b) => b[1].n - a[1].n).slice(0, 15)) { const reg = L.regions[g], c = L.cultures[reg.culture];
  console.log(`    ${reg.name.padEnd(14)} ${c.kind.padEnd(10)} danger ${st.regions[g].danger.toFixed(2)}  ${String(v.n).padStart(3)}: ${Object.entries(v).filter(([t]) => t !== 'n').sort((a, b) => b[1] - a[1]).map(([t, c2]) => `${t} ${c2}`).join(', ')}`); }
// what the chances say, everywhere at once: every road zone of each kind of land, at noon and at midnight, in the season it is now
const exp = {};
for (const z of L.zones) { if (!z.road || z.region < 0) continue; const k = L.cultures[L.regions[z.region].culture].kind, e = exp[k] ||= { n: 0, p: 0, pn: 0, w: {} };
  for (const night of [false, true]) { const c = context(L, z.x, z.y); c.night = night; e.n++; e.p += chanceAt(c);
    const ws = Object.entries(ENCOUNTERS).map(([id, d]) => [id, Math.max(0, d.w(c))]), tot = ws.reduce((a, [, w]) => a + w, 0);
    for (const [id, w] of ws) e.w[id] = (e.w[id] || 0) + w / tot; } }
console.log(`\n  expected per 100 road zones walked (day and night, ${calendar(L.hour).season}), by culture kind:`);
for (const [k, e] of Object.entries(exp).sort((a, b) => b[1].p / b[1].n - a[1].p / a[1].n))
  console.log(`    ${k.padEnd(10)} ${(e.p / e.n * 100).toFixed(1).padStart(5)}  ` + Object.entries(e.w).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([id, w]) => `${id} ${(w / e.n * 100).toFixed(0)}%`).join(', '));
console.log('\nEVENTS', Object.entries(tally).filter(([k]) => /^travel\./.test(k)).sort().map(([k, v]) => `${k} ${v}`).join(' · '));
// ---- cost while away: a year lived day by day ----
const L2 = generateWorld(seed + 1, 0); t0 = performance.now(); advance(L2, hoursFromYears(1)); const ms = performance.now() - t0;
console.log(`\na year away (onDay only, all systems): ${ms.toFixed(0)} ms, ${(ms / 112).toFixed(2)} ms a day; bands out now ${L2.sys.travel.bands.length}`);
// nothing tears the world any more (owner 2026-10-02: no glitch in the world or the story)
const gone = Object.keys(tally).filter(k => k.startsWith('storm.'));
if (gone.length) { console.log('FAIL the world still has', gone.join(', ')); process.exitCode = 1; }
console.log('ledger travel state', (JSON.stringify(L.sys.travel).length / 1024).toFixed(1), 'KB');
