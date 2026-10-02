// ---- The 200 pieces (owner 2026-10-02: "LET'S DESIGN 200 PIECES OF ARMOR"), as data: gear/schema.js says what a piece
// is, gear/kit.js how a row is written, gear/parts.js what its parts build. Every piece is checked when this loads.
import { HEAD } from './items-head.js';
import { TORSO } from './items-torso.js';
import { ARMS } from './items-arms.js';
import { LEGS } from './items-legs.js';
import { SLOTS, LAYERS } from './schema.js';

export const GEAR = [...HEAD, ...TORSO, ...ARMS, ...LEGS];
export const BY_ID = Object.fromEntries(GEAR.map(p => [p.id, p]));
if (Object.keys(BY_ID).length !== GEAR.length) throw new Error('gear: duplicate ids');
// slot → layer → the pieces that fit it
export const BY_CELL = Object.fromEntries(SLOTS.map(s => [s, Object.fromEntries(LAYERS.map(l => [l, GEAR.filter(p => p.slot === s && p.layer === l)]))]));
for (const s of SLOTS) for (const l of LAYERS) if (!BY_CELL[s][l].length) throw new Error(`gear: nothing for ${s}/${l}`);
