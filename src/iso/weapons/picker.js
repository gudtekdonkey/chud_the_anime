// ---- The weapon picker in the ?iso overlay: a row under the model and the style (every choice a key: = steps through
// the 15, - back; not T, the facings, nor Shift, the roll), the weapon's line under it, and `&weapon=<id>` to open on one. Equipping is live, mid-fight.
import { ARSENAL, WEAPON } from './arsenal.js';

export function wirePicker(root, onPick, start) {
  const style = root.querySelector('#o-style').closest('label'), row = document.createElement('label'), about = document.createElement('p');
  row.innerHTML = `Weapon <select id="o-weapon">${ARSENAL.map(w => `<option value="${w.id}">${w.name}</option>`).join('')}</select><kbd>=</kbd>`;
  about.className = 'note'; about.id = 'o-wabout'; style.after(row); row.after(about);
  const keys = root.querySelector('.keys'); if (keys) { const d = document.createElement('div'); d.innerHTML = '<kbd>=</kbd> next weapon (<kbd>-</kbd> back)'; keys.appendChild(d); }
  const sel = row.querySelector('select');
  const pick = id => { const w = WEAPON[id] || WEAPON.katana; sel.value = w.id; about.textContent = `${w.about} Reach ×${w.reach}, weight ×${w.weight.stop}.`; onPick(w.id); };
  sel.onchange = () => pick(sel.value);
  addEventListener('keydown', e => { if ((e.code !== 'Equal' && e.code !== 'Minus') || e.repeat || e.ctrlKey || e.metaKey || e.altKey || e.target.tagName === 'SELECT') return;
    const i = ARSENAL.findIndex(w => w.id === sel.value), n = ARSENAL.length; pick(ARSENAL[(i + (e.code === 'Minus' ? n - 1 : 1)) % n].id); });
  pick(start);
}
