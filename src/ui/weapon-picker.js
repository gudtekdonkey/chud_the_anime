import { game } from '../screen.js';
import { WEAPONS, weapon, setWeapon } from '../weapons/weapons.js';

// ---- The test picker under the game: in play, weapons come from pickups (setWeapon) ----
export function initWeaponPicker() {
  const sel = document.getElementById('weapon');
  sel.innerHTML = WEAPONS.map(w => `<option value="${w.id}">${w.name}</option>`).join('');
  sel.value = weapon().id;
  sel.addEventListener('change', () => { setWeapon(sel.value); game.focus(); });
}
