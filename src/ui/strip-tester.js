import { game } from '../screen.js';
import { P } from '../state.js';
import { ANIMS } from '../anims/anims.js';
import { SHEETS } from '../anims/sheets.js';

// ---- Dropping in real strips ----
// for testing new art: a PNG strip (frames side by side in one row) replaces one animation's placeholder sheet at once
export function initStripTester() {
  const sel = document.getElementById('anim'), fileIn = document.getElementById('file'), fwIn = document.getElementById('fw');
  const fpsIn = document.getElementById('fps'), footIn = document.getElementById('footY'), apply = document.getElementById('apply');
  const loaded = document.getElementById('loaded'), drop = document.getElementById('drop');
  sel.innerHTML = Object.keys(ANIMS).filter(k => !ANIMS[k].hidden).map(k => `<option value="${k}">${k}</option>`).join('');
  sel.addEventListener('change', () => fpsIn.value = ANIMS[sel.value].fps);
  let pending = null;
  function takeFile(f) {
    if (!f) return;
    const img = new Image();
    img.onload = () => { pending = img; fwIn.value = img.height; apply.disabled = false; };
    img.src = URL.createObjectURL(f);
  }
  fileIn.addEventListener('change', () => takeFile(fileIn.files[0]));
  ['dragenter', 'dragover'].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.add('over'); }));
  ['dragleave', 'drop'].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.remove('over'); }));
  drop.addEventListener('drop', e => takeFile(e.dataTransfer.files[0]));
  apply.addEventListener('click', () => {
    if (!pending) return;
    const fw = Math.max(1, +fwIn.value || pending.height), n = Math.max(1, Math.floor(pending.width / fw));
    const k = sel.value;
    SHEETS[k] = { img: pending, fw, fh: pending.height, n, ox: Math.floor(fw / 2), oy: pending.height - (+footIn.value || 0), custom: true };
    ANIMS[k].fps = Math.max(1, +fpsIn.value || ANIMS[k].fps);
    const mine = Object.keys(SHEETS).filter(s => SHEETS[s].custom);
    loaded.textContent = `Your sprites: ${mine.join(', ')}. Placeholders for the rest.`;
    if (P.state === k) P.t = 0;
    game.focus();
  });
}
