import { INV } from '../state.js';
import { setWeapon as equip } from '../weapons/weapons.js';

// ---- The items' door to the weapon system: src/weapons/ owns each weapon's poses, art, reach and weight ----
// a pickup equips it and flashes the HUD's weapon slot
export function setWeapon(id) { if (equip(id)) INV.fx.weapon = .14; }
