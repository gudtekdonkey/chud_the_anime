import { game } from '../screen.js';
import { TRAITS, GROUPS, PRESETS } from '../traits/traits.js';
import { FIDGETS } from '../traits/fidgets.js';
import { setPersonality } from '../player/personality.js';

// ---- The personality picker under the game: up to three traits, each with a strength ----
// remembered in this browser only, so a reload keeps the mix you were trying
const KEY = 'chud.personality';
export function initPersonality() {
  const preset = document.getElementById('pz-preset'), about = document.getElementById('pz-about');
  const slots = [0, 1, 2].map(i => ({ sel: document.getElementById('pz-t' + i), k: document.getElementById('pz-k' + i), out: document.getElementById('pz-v' + i) }));
  const opts = '<option value="">none</option>' + GROUPS.map(gr => `<optgroup label="${gr}">` + Object.entries(TRAITS).filter(([, t]) => t.group === gr)
    .map(([id, t]) => `<option value="${id}">${t.name}</option>`).join('') + '</optgroup>').join('');
  preset.innerHTML = '<option value="">custom</option>' + Object.keys(PRESETS).map(p => `<option>${p}</option>`).join('');
  const list = () => slots.filter(s => s.sel.value).map(s => [s.sel.value, +s.k.value]);
  function show(l) { slots.forEach((s, i) => { s.sel.value = l[i] ? l[i][0] : ''; s.k.value = l[i] ? l[i][1] : 1; }); apply(); }
  function apply() {
    const l = list(), b = setPersonality(l);
    slots.forEach(s => s.out.textContent = (+s.k.value).toFixed(1));
    about.textContent = l.length ? l.map(([id]) => `${TRAITS[id].name}: ${TRAITS[id].about}`).join(' ') +
      (b.fidgets.length ? ` Standing still he ${b.fidgets.map(f => FIDGETS[f].about).join('; ')}.` : '') : 'No traits: the ronin as he was drawn.';
    try { localStorage.setItem(KEY, JSON.stringify(l)); } catch { /* storage blocked: the mix just isn't remembered */ }
  }
  slots.forEach(s => { s.sel.innerHTML = opts; s.sel.onchange = s.k.oninput = () => { preset.value = ''; apply(); }; });
  preset.onchange = () => { if (PRESETS[preset.value]) show(PRESETS[preset.value]); game.focus(); };
  let saved = [];
  try { saved = (JSON.parse(localStorage.getItem(KEY)) || []).filter(([id]) => TRAITS[id]); } catch { saved = []; }
  show(saved);
}
