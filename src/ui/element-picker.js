import { ELEMENTS, EL, setElement } from '../fx/element.js';
import { rebakeAll as rebake } from '../anims/sheets.js';
import { game } from '../screen.js';

// ---- The element picker: buttons over the game, or [ and ] to step through them (1-4 stay free for the quick slots) ----
export function initElementPicker() {
  const box = document.getElementById('elements'), keys = Object.keys(ELEMENTS);
  const pick = k => { setElement(k); rebake(); box.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', b.dataset.el === k)); document.documentElement.style.setProperty('--el', ELEMENTS[k].eye); };
  keys.forEach((k, i) => { const b = document.createElement('button'); b.dataset.el = k; b.style.setProperty('--c', ELEMENTS[k].eye);
    b.innerHTML = `<i></i>${ELEMENTS[k].name}`; b.onclick = () => { pick(k); game.focus(); }; box.append(b); });
  game.addEventListener('keydown', e => { const d = e.key === ']' ? 1 : e.key === '[' ? -1 : 0; if (d) { e.preventDefault(); pick(keys[(keys.indexOf(EL.key) + d + keys.length) % keys.length]); } });
  pick(EL.key);
}
