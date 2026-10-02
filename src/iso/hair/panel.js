// ---- The overlay's "Hair and hat" section (?iso): a hair picker and a hat picker for him and for the samurai, a
// randomise, and the grid of every pair. Every choice is also a key: H his next hair, T his next hat, Y randomise both,
// G the grid. A hat that cannot go over the hair he has is refused and the reason shown; a hair picked under a hat that
// cannot take it takes the hat off (whichever went on last stays, as the wardrobe's masks do).
import { HEADS } from './head.js';
import { HAIR, HAIR_ID } from './styles.js';
import { HATS, HAT } from './hats.js';
import { resolve } from './contract.js';

const opts = list => { const groups = {}; for (const h of list) (groups[h.group || ''] ||= []).push(h);
  return Object.entries(groups).map(([g, hs]) => { const o = hs.map(h => `<option value="${h.id}">${h.name}</option>`).join(''); return g ? `<optgroup label="${g}">${o}</optgroup>` : o; }).join(''); };
export const fits = (hair, hat) => !resolve(HAIR_ID[hair], HAT[hat]).refused;
export const why = (hair, hat) => `${HAT[hat].name} takes only hair with nothing on the crown; ${HAIR_ID[hair].name} has a ${HAIR_ID[hair].crownItem === 'tail' ? 'high tail' : 'knot'} there`;

export function mountHairPanel(root, { grid = false } = {}) {
  const aside = root.querySelector('aside'), before = [...aside.querySelectorAll('h2')].find(h => h.textContent === (grid ? 'Pipeline' : 'Camera and hat'));
  const sec = document.createElement('div');
  sec.innerHTML = `<h2>Hair and hat</h2>
    <label>His hair <select id="o-hair-hero">${opts(HAIR)}</select><kbd>Alt+H</kbd></label>
    <label>His hat <select id="o-hat-hero">${opts(HATS)}</select><kbd>Alt+T</kbd></label>
    <label>Samurai hair <select id="o-hair-foe">${opts(HAIR)}</select></label>
    <label>Samurai hat <select id="o-hat-foe">${opts(HATS)}</select></label>
    <label><button type="button" id="o-rand">Randomise both</button><kbd>Alt+Y</kbd></label>
    <label><a id="o-grid" href="#">${grid ? 'Back to the courtyard' : 'Every hair × every hat'}</a><kbd>Alt+G</kbd></label>
    <p class="note" id="o-hairnote" aria-live="polite">The 3D look's; the pixel look keeps its own.</p>`;
  aside.insertBefore(sec, before || null);
  const $ = id => sec.querySelector('#' + id), note = $('o-hairnote');
  const sync = () => { for (const w of ['hero', 'foe']) { $('o-hair-' + w).value = HEADS[w].hair; $('o-hat-' + w).value = HEADS[w].hat; } };
  const setHair = (w, id) => { HEADS[w].hair = id; if (!fits(id, HEADS[w].hat)) { note.textContent = why(id, HEADS[w].hat) + ': the hat comes off.'; HEADS[w].hat = 'none'; } else note.textContent = ''; sync(); };
  const setHat = (w, id) => { if (!fits(HEADS[w].hair, id)) note.textContent = why(HEADS[w].hair, id) + '.'; else { HEADS[w].hat = id; note.textContent = ''; } sync(); };
  const step = (list, cur, d = 1) => list[(list.findIndex(h => h.id === cur) + d + list.length) % list.length].id;
  const pick = a => a[Math.floor(Math.random() * a.length)].id;
  const randomise = () => { for (const w of ['hero', 'foe']) { let hair, hat; do { hair = pick(HAIR); hat = pick(HATS); } while (!fits(hair, hat)); HEADS[w].hair = hair; HEADS[w].hat = hat; } note.textContent = ''; sync(); };
  const toGrid = () => { const q = new URLSearchParams(location.search); if (grid) q.delete('hairgrid'); else q.set('hairgrid', ''); q.delete('tick'); location.search = q.toString().replace(/=(&|$)/g, '$1'); };
  for (const w of ['hero', 'foe']) { $('o-hair-' + w).onchange = e => setHair(w, e.target.value); $('o-hat-' + w).onchange = e => setHat(w, e.target.value); }
  $('o-rand').onclick = randomise; $('o-grid').onclick = e => { e.preventDefault(); toGrid(); };
  if (!grid) addEventListener('keydown', e => {
    // Alt + the letter: bare H, T, Y and G are the companion cut (testing), the facings, the clashes and the party's hold / follow
    if (e.target.tagName === 'SELECT' || e.repeat || e.ctrlKey || e.metaKey || !e.altKey) return; e.preventDefault();
    if (e.code === 'KeyH') setHair('hero', step(HAIR, HEADS.hero.hair, e.shiftKey ? -1 : 1));
    if (e.code === 'KeyT') { let id = HEADS.hero.hat; do id = step(HATS, id, e.shiftKey ? -1 : 1); while (!fits(HEADS.hero.hair, id)); setHat('hero', id); }
    if (e.code === 'KeyY') randomise();
    if (e.code === 'KeyG') toGrid();
  });
  sync();
  return { sync, randomise };
}
