import { P, S } from '../state.js';
import { ENEMIES, ISOLATION, living, isolated, kill } from '../world/enemies.js';

// ---- The one place K reads enemies from (the enemy API in world/enemies.js) ----
export { ISOLATION, isolated };
export const targets = () => S.roomClear ? [] : living();
// which way he looks (toward the ronin, unless he is busy)
export const faceOf = e => e.face || Math.sign(P.x - e.x) || 1;
// the execution owns him from here: he is gone from the room at once (no death of his own, no dropped sword)
// and the execution's stage draws his body and cuts it into pieces
export const hold = e => kill(e, { execution: true });
// the room's fade before a new squad steps in: an execution's body and pieces go with the rest of the fallen
export const roomFade = () => ENEMIES[0].alpha;
