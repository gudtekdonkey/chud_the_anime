// ---- The 200 pieces (owner 2026-10-02: "LET'S DESIGN 200 PIECES OF ARMOR"), as data: gear/schema.js says what a piece
// is, gear/kit.js how a row is written, gear/parts.js what its parts build (all three the engine's). Every piece is
// checked when this loads.
import { HEAD } from './items-head.js';
import { TORSO } from './items-torso.js';
import { ARMS } from './items-arms.js';
import { LEGS } from './items-legs.js';
import { defineGear, GEAR, BY_ID, BY_CELL } from 'ronin-engine/iso/gear/registry.js';

// into the engine's registry (slot → layer → the pieces that fit it, BY_CELL), checked there
defineGear([...HEAD, ...TORSO, ...ARMS, ...LEGS]);
export { GEAR, BY_ID, BY_CELL };
