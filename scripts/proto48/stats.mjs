// node scripts/proto48/stats.mjs [seed]: distances in the world, in zones (for the world-walk scale page)
import { generateWorld } from 'ronin-engine/sim/index.js';
const seed = +(process.argv[2] || 12345), L = generateWorld(seed, 0);
const count = (arr, f) => arr.reduce((m, x) => (m[f(x)] = (m[f(x)] || 0) + 1, m), {});
console.log('kinds', count(L.zones, z => z.kind), 'voids', L.zones.filter(z => z.void).length, 'road', L.zones.filter(z => z.road).length);
const of = k => L.zones.filter(z => k.includes(z.kind));
const near = (a, B) => { let b = 1e9; for (const z of B) if (z !== a) b = Math.min(b, Math.hypot(z.x - a.x, z.y - a.y)); return b; };
const med = a => { a = a.slice().sort((x, y) => x - y); return a[a.length >> 1]; }, avg = a => a.reduce((s, x) => s + x, 0) / a.length;
const S = of(['town', 'village']), T = of(['town']);
for (const [n, A, B] of [['settlement→settlement', S, S], ['town→town', T, T], ['land zone→nearest settlement', L.zones.filter(z => z.kind !== 'sea'), S], ['camp→settlement', of(['camp']), S]]) {
  const d = A.map(z => near(z, B)); console.log(n, 'median', med(d).toFixed(2), 'mean', avg(d).toFixed(2), 'max', Math.max(...d).toFixed(1)); }
const land = L.zones.filter(z => z.kind !== 'sea'); let x0 = 99, x1 = 0, y0 = 99, y1 = 0; for (const z of land) { x0 = Math.min(x0, z.x); x1 = Math.max(x1, z.x); y0 = Math.min(y0, z.y); y1 = Math.max(y1, z.y); }
console.log('land spans', x1 - x0 + 1, '×', y1 - y0 + 1, 'zones; land zones', land.length);
const p = L.actors[L.player]; console.log('player at', p.at, L.zones[p.at[1] * 100 + p.at[0]].kind);
// a few zones of each kind for the renders
for (const k of ['town', 'village', 'camp', 'fort', 'shrine']) console.log(k, of([k]).slice(0, 4).map(z => `${z.x},${z.y} ${z.biome}${z.road ? ' road' : ''}`).join(' | '));
for (const b of ['forest', 'bamboo', 'paddy', 'hills', 'coast', 'marsh', 'mountains', 'plains']) { const z = L.zones.find(z => z.kind === 'wild' && z.biome === b && z.road); console.log('wild road', b, z && `${z.x},${z.y}`); }
