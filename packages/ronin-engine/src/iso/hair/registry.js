// ---- The hairstyles and hats a game defines (chud_the_anime: its 24 styles, hair/styles.js, and 10 hats, hair/hats.js),
// each declaring itself through the head-slot contract (contract.js), checked when defined, and the live picks.
import { validate } from './contract.js';

export const HAIR = [], HAIR_ID = {}, HATS = [], HAT = {}, COLS = {}, DEFAULT_HAIR = {};
// the live picks (the overlay's pickers write them; a look built with `head` keeps its own)
export const HEADS = { hero: {}, foe: {} };
export function defineHeads({ hair = [], hats = [], cols = {}, defaults = {}, heads = {} }) {
  for (const h of hair) { HAIR.push(h); HAIR_ID[h.id] = h; } for (const h of hats) { HATS.push(h); HAT[h.id] = h; }
  Object.assign(COLS, cols); Object.assign(DEFAULT_HAIR, defaults);
  validate(HAIR, HATS);
  for (const w in heads) Object.assign(HEADS[w], heads[w]);
}
