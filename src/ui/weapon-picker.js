import { game } from '../screen.js';
import { WEAPONS, weapon, setWeapon } from '../weapons/weapons.js';
import { INV } from '../state.js';
import { LADDER, comboMax } from '../player/combo.js';
import { PAIRED } from '../party/kit.js';
import { PAIRS } from '../party/paired.js';

// ---- The test picker under the game: in play, weapons come from pickups (setWeapon) ----
export function initWeaponPicker() {
  const sel = document.getElementById('weapon');
  sel.innerHTML = WEAPONS.map(w => `<option value="${w.id}">${w.name}</option>`).join('');
  sel.value = weapon().id;
  sel.addEventListener('change', () => { setWeapon(sel.value); game.focus(); });
  // basic skill: jump straight to a combo length; landing cuts keeps growing it from there
  const b = document.getElementById('basic');
  b.innerHTML = LADDER.slice(1).map((v, i) => `<option value="${v}">J combo of ${i + 2} (${v} landed cuts)</option>`).join('');
  const sync = () => { b.value = String(LADDER[comboMax() - 1]); };
  sync(); setInterval(() => { if (document.activeElement !== b) sync(); }, 500);
  b.addEventListener('change', () => { INV.basic = +b.value; game.focus(); });
  // paired executions: as earned (any that fits the partner and him), or one of them with anyone, needs or not
  const pr = document.getElementById('pair');
  pr.innerHTML = '<option value="">as earned: any that fits</option>' + PAIRED.map(x => `<option value="${x.id}">${x.name}</option>`).join('');
  pr.addEventListener('change', () => { PAIRS.force = pr.value || null; game.focus(); });
}
