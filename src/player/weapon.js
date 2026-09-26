import { INV } from '../state.js';
import { rebake } from '../anims/sheets.js';
import { setBladeLen } from '../rig/rig.js';

// ---- Weapons: blade length (drawn by the rig), reach (scales the J and I cuts) and weight (hit pause and shake) ----
// a stopgap until the weapon pose layer lands: that work owns each weapon's poses and art and takes over setWeapon
export const WEAPONS = { katana: { name: 'KATANA', blade: 13, reach: 1, weight: 1 }, nodachi: { name: 'GRAVE NODACHI', blade: 19, reach: 1.3, weight: 1.6 } };
const cur = () => WEAPONS[INV.weapon] || WEAPONS.katana;
export const reach = () => cur().reach, weight = () => cur().weight;
export function setWeapon(id) { if (!WEAPONS[id]) return; INV.weapon = id; INV.fx.weapon = .14; setBladeLen(WEAPONS[id].blade); rebake(); }
