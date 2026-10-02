import { game } from '../screen.js';
import { PT } from '../player/prompts.js';

// ---- The combo settings under the game (C12A: prompts always on; Auto and Hold to continue for anyone who wants J alone),
// and which skill the two-finger tap casts. Remembered in this browser, as the personality picker is ----
const KEYS = { combo: 'chud.combo', two: 'chud.two' };
export function initComboSettings() {
  for (const [id, key] of Object.entries(KEYS)) {
    const el = document.getElementById(id), field = id === 'combo' ? 'assist' : 'two';
    let v = null; try { v = localStorage.getItem(key); } catch { /* storage blocked: the default */ }
    if (v && [...el.options].some(o => o.value === v)) el.value = v;
    PT[field] = el.value;
    el.addEventListener('change', () => { PT[field] = el.value; try { localStorage.setItem(key, el.value); } catch { /* not remembered */ } game.focus(); });
  }
}
