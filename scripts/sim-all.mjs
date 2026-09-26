// node scripts/sim-all.mjs [seed] [years]: live a world with every lane loaded (people, economy, crime, story, travel) and check they work
// together: no errors, the population holds, and each lane hears the others (events counted by kind). Exits 1 if a check fails.
import { generateWorld, advance, hoursFromYears, on, systems, serialize, deserialize } from '../src/sim/index.js';
import '../src/sim/people/index.js';
import '../src/sim/economy/index.js';
import '../src/sim/crime/index.js';
import '../src/sim/story/index.js';
import '../src/sim/travel/index.js';
const seed = +(process.argv[2] || 12345), years = +(process.argv[3] || 5);
let fails = 0; const check = (ok, what) => { console.log(`${ok ? 'ok  ' : 'FAIL'} ${what}`); if (!ok) fails++; };

const seen = {}; on('*', e => { seen[e.type] = (seen[e.type] || 0) + 1; });
const time = {};
for (const s of systems()) for (const h of ['onDay', 'onSeason', 'onYear']) if (s[h]) { const f = s[h]; s[h] = (...a) => { const t = performance.now(); f(...a); time[s.id] = (time[s.id] || 0) + performance.now() - t; }; }
let t0 = performance.now(); const L = generateWorld(seed, 0), genMs = performance.now() - t0, speed = Math.max(1, genMs / 230);
const live = () => Object.values(L.actors).filter(a => a.alive).length, start = live(), pop = [];
console.log(`world ${seed}: ${start} people, systems ${systems().map(s => s.id).join(', ')}`);
for (let y = 0; y < years; y++) { advance(L, hoursFromYears(1)); pop.push(live()); }
const days = years * 112;
console.log(`living at the end of each year: ${pop.join(' ')}`);
console.log('ms a game day at reference speed:', Object.entries(time).map(([k, v]) => `${k} ${(v / days / speed).toFixed(2)}`).join(' · '));
const lane = p => Object.entries(seen).filter(([k]) => k.startsWith(p)).sort((a, b) => b[1] - a[1]).map(([k, n]) => `${k.slice(p.length)} ${n}`).join(', ');
for (const p of ['crime.', 'people.', 'econ.', 'story.', 'travel.']) console.log(`${p.padEnd(8)} ${lane(p)}`);

check(pop.at(-1) > start * .6, `the population holds (${start} → ${pop.at(-1)})`);
check(seen['crime.raid'] > 0 && seen['crime.robbery'] > 0 && seen['crime.murder'] > 0, 'crime tells the story its raids, robberies and murders');
check(seen['people.died'] > 0 && seen['people.arrived'] > 0, 'people die and newcomers arrive');
const again = deserialize(serialize(L)); check(again.sys.crime && again.sys.people && again.sys.story, 'the whole ledger survives a save');
process.exit(fails ? 1 : 0);
