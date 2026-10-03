// node scripts/sim-smoke.mjs [seed] [years]: make a world, live it for some years, print what it looks like. No browser needed.
import { generateWorld, advance, hoursFromYears, calendar, serialize, deserialize, ownerOf, tilesOf, TERRAIN } from 'ronin-engine/sim/index.js';
const seed = +(process.argv[2] || 12345), years = +(process.argv[3] || 1);
let t0 = Date.now(); const L = generateWorld(seed, 0); const gen = Date.now() - t0;
const count = (arr, f) => arr.reduce((m, x) => (m[f(x)] = (m[f(x)] || 0) + 1, m), {});
console.log(`world ${seed}: generated in ${gen} ms`);
console.log('biomes', count(L.zones, z => z.biome));
console.log('kinds', count(L.zones, z => z.kind));
console.log('road zones', L.zones.filter(z => z.road).length, '| regions', L.regions.length, '| cultures', L.cultures.length);
console.log('cultures', L.cultures.map(c => `${c.name} (${c.kind}, ${c.regions.length})`).join('; '));
const people = Object.values(L.actors); console.log('people', people.length, count(people, a => a.cls));
const p = L.actors[L.player]; console.log('player', p.given, p.family, 'at', p.at);
console.log('a plot in the start village', ownerOf(L, `${p.at[0]},${p.at[1]}:1`), '| tiles', count([...tilesOf(L, ...p.at).t], i => TERRAIN[i]));
t0 = Date.now(); advance(L, hoursFromYears(years)); console.log(`lived ${years} year(s) in ${Date.now() - t0} ms; now`, calendar(L.hour));
const json = serialize(L); console.log('save size', (json.length / 1024).toFixed(0), 'KB'); deserialize(json);
