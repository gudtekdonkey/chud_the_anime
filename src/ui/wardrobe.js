import { game } from '../screen.js';
import { wear } from '../state.js';
import { ITEMS, OUTFITS, SLOTS } from '../wardrobe/items.js';

// ---- The wardrobe under the game: one item per slot, click again to take it off; the presets dress him whole ----
export function initWardrobe() {
  const slots = document.getElementById('slots'), presets = document.getElementById('presets'), btns = new Map();
  const sync = () => {
    for (const [id, b] of btns) b.setAttribute('aria-pressed', String(wear.outfit.has(id)));
    const on = ITEMS.filter(i => wear.outfit.has(i.id)).map(i => i.name.toLowerCase());
    document.getElementById('wearing').textContent = on.length ? `Wearing: ${on.join(', ')}.` : 'Nothing but the hat and the blade.';
  };
  const done = () => { sync(); game.focus(); };
  for (const [slot, label] of SLOTS) {
    const row = document.createElement('div'); row.className = 'slot'; row.setAttribute('role', 'group'); row.setAttribute('aria-labelledby', 'slot-' + slot);
    row.innerHTML = `<h3 id="slot-${slot}">${label}</h3><div class="items"></div>`;
    for (const it of ITEMS.filter(i => i.slot === slot)) {
      const b = document.createElement('button'); b.type = 'button'; b.className = 'item'; b.dataset.item = it.id;
      b.innerHTML = `<b>${it.name}</b><span>${it.about}</span>`;
      b.addEventListener('click', () => { const on = wear.outfit.has(it.id);
        for (const o of ITEMS) if (o.slot === slot) wear.outfit.delete(o.id);
        if (!on) wear.outfit.add(it.id); done(); });
      row.querySelector('.items').append(b); btns.set(it.id, b);
    }
    slots.append(row);
  }
  for (const o of OUTFITS) { const b = document.createElement('button'); b.type = 'button'; b.textContent = o.name; b.dataset.outfit = o.name;
    b.addEventListener('click', () => { wear.outfit = new Set(o.items); done(); }); presets.append(b); }
  sync();
}
