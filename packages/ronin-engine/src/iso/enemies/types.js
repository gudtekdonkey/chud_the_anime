// ---- The enemy types a game defines (docs/enemies.md in chud_the_anime): its archetypes and groups as data, and the
// look each type is drawn in. The enemy (enemy.js), the squad (squad.js) and any decision layer read them from here.
export const TYPES = {}, GROUPS = {};
const LOOK = { make: null };
// a game's look for a type: (look kind, type) → a look (iso/look.js's four calls)
export const setEnemyLook = make => { LOOK.make = make; };
export const enemyLook = (kind, T) => LOOK.make(kind, T);
