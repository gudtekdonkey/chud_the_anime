import { P, S } from '../state.js';
import { ENEMIES, ISOLATION, living, isolated } from '../world/enemies.js';

// ---- The one place K reads enemies from (the enemy API in world/enemies.js) ----
export { ISOLATION, isolated };
export const targets = () => S.roomClear ? [] : living();
// which way he looks (toward the ronin, unless he is busy)
export const faceOf = e => e.face || Math.sign(P.x - e.x) || 1;
// the execution owns him now: out of the living (hits, Qi, mirrors, isolation), no AI, no drawing of his own
export function hold(e) { e.alive = false; e.hp = 0; e.held = true; e.state = 'exec'; e.vx = e.vy = 0; }
// the room's fade before a new squad steps in: an execution's body and pieces go with the rest of the fallen
export const roomFade = () => ENEMIES[0].alpha;
