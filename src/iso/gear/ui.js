// ---- The outfit picker in the ?iso overlay: a preset (Iron Ash as built, a samurai, a villager, a ninja, mixes),
// randomise (`; from one family or any: G is the party's hold / follow), and every slot's base and armour piece by hand. The pick is remembered in the
// browser and can be opened from the URL (&outfit=<preset> | random | random-ninja | the encoded outfit).
import { SLOTS, SLOT_NAME, LAYERS, LAYER_NAME, FAMILIES, STAT_KEYS, STAT_SHORT } from './schema.js';
import { BY_CELL } from './items.js';
import { PRESETS, PRESET, randomOutfit, outfitStats, encode, decode } from './outfits.js';

const KEY = 'ronin-iso-outfit';
const CSS = `.iso .gear-slots { display: grid; grid-template-columns: auto 1fr; gap: 2px 6px; align-items: center; margin-top: 4px; }
.iso .gear-slots span { color: var(--dim); font-size: 11px; }
.iso .gear-slots select { margin: 0; width: 100%; min-width: 0; font-size: 11px; }
.iso .gear-row { display: flex; gap: 6px; align-items: center; padding: 2px 0; }
.iso .gear-row button { background: #0d1013; color: var(--fg); border: 1px solid var(--rule); font: inherit; padding: 1px 8px; cursor: pointer; }
.iso .gear-row button:hover { border-color: var(--cyan); }
.iso .gear-stats { font: 11px ui-monospace, monospace; color: var(--cyan); }
.iso details summary { cursor: pointer; color: var(--dim); font-size: 12px; padding: 2px 0; }`;

// what the page starts in: the URL's pick, else the last one remembered, else Iron Ash as built (null)
export function startOutfit(Q) {
  const pick = Q.get('outfit') ?? (() => { try { return localStorage.getItem(KEY); } catch { return null; } })();
  return parse(pick);
}
function parse(pick) {
  if (!pick || pick === 'built') return null;
  if (PRESET[pick]) return PRESET[pick].o;
  const m = /^random(?:-(\w+))?(?::(\d+))?$/.exec(pick); if (m) return randomOutfit(+(m[2] || Date.now() % 1e6), FAMILIES.includes(m[1]) ? m[1] : null);
  return decode(pick);
}

// builds the section into the overlay; `onDress(outfit | null)` re-dresses the hero
export function wireGear(root, outfit, onDress) {
  const st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);
  const sec = document.createElement('section'); sec.setAttribute('aria-label', 'Outfit');
  const opt = (v, t) => `<option value="${v}">${t}</option>`;
  sec.innerHTML = `<h2>Outfit</h2>
    <label>Preset <select id="g-preset">${opt('built', 'Iron Ash V3, as built')}${PRESETS.map(p => opt(p.id, p.name)).join('')}${opt('custom', 'Custom')}</select></label>
    <div class="gear-row"><button id="g-rand" type="button">Randomise</button><select id="g-fam" aria-label="Randomise from">${opt('', 'any family')}${FAMILIES.map(f => opt(f, f)).join('')}</select><kbd>\`</kbd></div>
    <div class="gear-stats" id="g-stats" aria-live="polite"></div>
    <details><summary>Every slot</summary><div class="gear-slots">${SLOTS.map(s => LAYERS.map(l => `<span>${SLOT_NAME[s]} · ${LAYER_NAME[l].toLowerCase()}</span>
      <select id="g-${s}-${l}" aria-label="${SLOT_NAME[s]}, ${LAYER_NAME[l]}">${opt('', 'nothing')}${BY_CELL[s][l].map(p => opt(p.id, `${p.name.replace(/, (left|right)$/, '')} · ${p.family[0].toUpperCase()}`)).join('')}</select>`).join('')).join('')}</div></details>`;
  const aside = root.querySelector('aside'); aside.insertBefore(sec, aside.querySelector(':scope > h2:nth-of-type(2)'));   // a direct child: other sections nest their h2
  const $ = id => sec.querySelector('#' + id);
  let cur = outfit, seed = 1;
  const show = () => {
    for (const s of SLOTS) for (const l of LAYERS) { const el = $(`g-${s}-${l}`); el.value = (cur && cur[s][l]) || ''; el.disabled = !cur; }
    const st = cur ? outfitStats(cur) : null;
    $('g-stats').textContent = st ? STAT_KEYS.map(k => `${STAT_SHORT[k]} +${st[k]}`).join('  ') : 'as built: the procedural Iron Ash';
  };
  const set = (o, name) => { cur = o; $('g-preset').value = name; try { localStorage.setItem(KEY, o ? (PRESETS.find(p => p.o === o) ? name : encode(o)) : 'built'); } catch { /* storage blocked: the pick lasts the visit */ } show(); onDress(o); };
  const randomise = () => { seed = (seed * 7919 + Date.now()) % 1e6 | 0; set(randomOutfit(seed, $('g-fam').value || null), 'custom'); };
  $('g-preset').value = !cur ? 'built' : (PRESETS.find(p => p.o === cur) || { id: 'custom' }).id;
  $('g-preset').onchange = e => { const v = e.target.value; if (v === 'custom') return; set(v === 'built' ? null : PRESET[v].o, v); };
  $('g-rand').onclick = randomise;
  for (const s of SLOTS) for (const l of LAYERS) $(`g-${s}-${l}`).onchange = e => { const o = decode(encode(cur)); o[s][l] = e.target.value || null; set(o, 'custom'); };
  addEventListener('keydown', e => { if (e.code === 'Backquote' && !e.repeat && !e.ctrlKey && !e.metaKey && !e.altKey && e.target.tagName !== 'SELECT') randomise(); });
  show();
  return { get outfit() { return cur; } };
}
