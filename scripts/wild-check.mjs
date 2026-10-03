// node scripts/wild-check.mjs [seed]: the voids and their creatures (docs/sim-travel.md "The voids"). Walks him zone to zone
// through every void of a fresh world at levels 1, 11 and 30, by day and by night, and prints what he met; then checks determinism.
import 'ronin-engine/sim/travel/index.js';
import { generateWorld, advance, zoneAt, wildRing, serialize, deserialize } from 'ronin-engine/sim/index.js';
import { enterZone, choose, BEASTS } from 'ronin-engine/sim/travel/index.js';

const seed = +(process.argv[2] || 12345);
function walk(level, night, n = 4000) {
  const L = generateWorld(seed), st = L.sys.travel, voids = L.zones.filter(z => z.void), tally = {}, rings = { settled: 0, edge: 0, void: 0 };
  // set the clock to noon or midnight
  const hr = L.hour % 24; advance(L, ((night ? 24 : 12) - hr + 24) % 24 || 24, false);
  let dead = 0;
  for (let i = 0; i < n; i++) { const z = voids[(i * 7919) % voids.length]; rings[wildRing(L, z.x, z.y)]++;
    const sc = enterZone(L, z.x, z.y, { level }); if (!sc) continue; tally[sc.type] = (tally[sc.type] || 0) + 1;
    const out = choose(L, sc.choices[0].id); if (out?.next) choose(L, out.next.choices[0].id); const me = L.actors[L.player]; if (!me.alive) { dead++; me.alive = true; delete me.died; } }
  return { tally, faced: st.beasts.faced, ko: st.beasts.ko, slain: st.beasts.slain, rings, dead };
}
const t0 = performance.now();
for (const lv of [1, BEASTS.FIGHT, BEASTS.SPIKE]) for (const night of [false, true]) {
  const w = walk(lv, night); console.log(`level ${String(lv).padStart(2)} ${night ? 'night' : 'day  '}: ${JSON.stringify(w.tally)} faced ${w.faced} knocked out ${w.ko} slain ${JSON.stringify(w.slain)} killed him ${w.dead}`); }
// the rings of a fresh world
const L = generateWorld(seed), rings = { settled: 0, edge: 0, void: 0 }; for (const z of L.zones) if (z.kind !== 'sea') rings[wildRing(L, z.x, z.y)]++;
console.log('rings:', JSON.stringify(rings), '· settlements in a void:', L.zones.filter(z => z.void && ['town', 'village', 'fort', 'shrine', 'camp'].includes(z.kind)).length);
// determinism: the same walk twice, and through a save
const a = JSON.stringify(walk(1, true, 600)), b = JSON.stringify(walk(1, true, 600));
const L2 = deserialize(serialize(generateWorld(seed))), v = L2.zones.filter(z => z.void)[3];
console.log('determinism:', a === b ? 'identical' : 'DIFFERENT', '· a void survives a save:', !!zoneAt(L2, v.x, v.y).void, `· ${((performance.now() - t0) / 1000).toFixed(1)} s`);
