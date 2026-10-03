// ---- The gear a game defines (chud_the_anime: its 200 pieces, gear/items-*.js), as rows on the slot × layer grid
// (schema.js says what a piece is, kit.js how a row is written, parts.js what its parts build). Every piece is checked
// when it is defined: no duplicate ids, and something for every slot and layer.
import { SLOTS, LAYERS } from './schema.js';

export const GEAR = [], BY_ID = {}, BY_CELL = Object.fromEntries(SLOTS.map(s => [s, Object.fromEntries(LAYERS.map(l => [l, []]))]));
export function defineGear(rows) {
  for (const p of rows) { if (BY_ID[p.id]) throw new Error('gear: duplicate ids'); GEAR.push(p); BY_ID[p.id] = p; BY_CELL[p.slot][p.layer].push(p); }
  for (const s of SLOTS) for (const l of LAYERS) if (!BY_CELL[s][l].length) throw new Error(`gear: nothing for ${s}/${l}`);
  return GEAR;
}
