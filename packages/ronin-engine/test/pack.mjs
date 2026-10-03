// node test/pack.mjs: a content pack swaps the world's tables (sim/pack.js): a world made under another pack's names
// differs, the Edo pack put back makes the same world as before, and a typo in a pack fails loudly.
import { generateWorld, serialize, usePack, PACK } from '../src/sim/index.js';

const fails = []; const ok = (c, m) => { console.log(`${c ? 'ok  ' : 'FAIL'} ${m}`); if (!c) fails.push(m); };
const edo = { ...PACK.cultures.NAMES }, before = serialize(generateWorld(3, 0));
const cap = s => s[0].toUpperCase() + s.slice(1);
usePack({ cultures: { NAMES: { place: r => cap(r.pick(['dust', 'mesa', 'gulch', 'creek'])) + ' ' + r.pick(['Springs', 'Bend', 'Flats']), family: r => r.pick(['Hale', 'Cole', 'Reyes', 'Boone']) } } });
const w = generateWorld(3, 0), names = Object.values(w.actors).slice(0, 50).map(a => a.family);
ok(names.every(n => ['Hale', 'Cole', 'Reyes', 'Boone'].includes(n)), `a frontier pack's family names (${[...new Set(names)].join(', ')})`);
usePack({ cultures: { NAMES: edo } });
ok(serialize(generateWorld(3, 0)) === before, 'the Edo pack put back makes the very same world');
let threw = false; try { usePack({ economy: { GOODZ: [] } }); } catch { threw = true; } ok(threw, 'a typo in a pack fails loudly');
process.exit(fails.length ? 1 : 0);
