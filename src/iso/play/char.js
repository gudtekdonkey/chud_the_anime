// ---- The game's characters: the engine's Char (ronin-engine/render/char.js) in the courtyard, through the game's looks
import { Char, ROOM } from 'ronin-engine/render/char.js';
import '../look/look.js';
import { collide, groundAt } from '../world/room.js';

Object.assign(ROOM, { collide, groundAt });
export { Char };
