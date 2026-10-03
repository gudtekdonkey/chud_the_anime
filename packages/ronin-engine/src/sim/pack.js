// ---- Content packs (owner 2026-10-03, pick 4B): the world's lanes run on tables (classes and kinds, names, goods and
// coin, jobs and needs, ages and hazards, crimes, buildings and units). The Edo pack (packs/edo/) is the default, as
// chud_the_anime lives it; a game swaps in its own before it makes a world:
//   usePack({ cultures: { CLASSES, KINDS, NAMES }, economy: { GOODS, GOOD, COIN, ... }, people: { ... }, crime: { ... }, dominion: { ... } })
// Each named table's contents are replaced in place (every lane reads the same object); NAMES' makers are merged. A
// table must already exist in the Edo pack (a typo fails loudly); a plain number is not a table: lanes take those as options.
import * as cultures from './packs/edo/cultures.js';
import * as economy from './packs/edo/economy.js';
import * as people from './packs/edo/people.js';
import * as crime from './packs/edo/crime.js';
import * as dominion from './packs/edo/dominion.js';

export const PACK = { cultures, economy, people, crime, dominion };
export function usePack(p) {
  for (const file in p) for (const name in p[file]) {
    const t = PACK[file] && PACK[file][name], v = p[file][name];
    if (t === undefined) throw new Error(`pack: no table ${file}.${name}`);
    if (name === 'NAMES') Object.assign(t, v);
    else if (Array.isArray(t)) t.splice(0, t.length, ...v);
    else if (t && typeof t === 'object') { for (const k of Object.keys(t)) delete t[k]; Object.assign(t, v); }
    else throw new Error(`pack: ${file}.${name} is not a table`);
  }
}
