// ---- The overlay's personality section: give the ronin and the samurai any ready-made character, a person of any
// culture (a new one each roll) or a single trait, and read what it does: the trait mix, the run's stride, cadence and
// speed, the breath, the idles they drift into, and the samurai's fighting numbers. Every choice is also a key:
// P / O the next pick for the ronin / the samurai, R a new person of the same culture, T the names over the townsfolk.
// The ronin's pick is remembered (localStorage); he starts as drawn (owner: "the ronin keeps the personality he has").
import { PICKS, pickOf, personaOf, describe, summary, PLAIN } from './persona.js';
import { LABELS } from './npcs.js';

const CSS = `.iso .pinfo { font: 11px/1.45 ui-monospace, monospace; color: var(--dim); margin: 4px 0 0; white-space: pre-wrap; }
.iso .pinfo b { color: var(--fg); font-weight: 600; } .iso button.p-roll { background: #0d1013; color: var(--fg); border: 1px solid var(--rule); font: inherit; padding: 1px 8px; cursor: pointer; }`;
const KEY = 'iso.persona.hero';
const store = { get() { try { return JSON.parse(localStorage.getItem(KEY) || 'null'); } catch { return null; } }, set(v) { try { localStorage.setItem(KEY, JSON.stringify(v)); } catch {} } };
const options = () => { let html = '', grp = ''; for (const p of PICKS) { if (p.group !== grp) { html += (grp ? '</optgroup>' : '') + `<optgroup label="${p.group}">`; grp = p.group; } html += `<option value="${p.id}">${p.name}</option>`; } return html + '</optgroup>'; };

// the ronin's and the samurai's personas, set from a pick (and a seed, for a culture's person)
export function giveHero(hero, list) { const a = hero.a; a.persona = personaOf(list); a.seed = 11; a.idler = null; hero.list = list; }
export function giveFoe(foe, list) { const a = foe.a; a.persona = personaOf(list); a.seed = 23; a.idler = null; foe.list = list; foe.bh = list.length ? a.persona.behave : PLAIN; }

export function personaPanel(root, { hero, foe }) {
  const st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);
  const sec = document.createElement('div'); sec.innerHTML = `<h2>Personality</h2>
    <label>Ronin <select id="p-hero">${options()}</select><kbd>P</kbd></label>
    <label>Samurai <select id="p-foe">${options()}</select><kbd>O</kbd></label>
    <label><button class="p-roll" id="p-roll" type="button">New person of the culture</button><kbd>R</kbd></label>
    <label><input type="checkbox" id="p-labels" checked>Names over the townsfolk<kbd>T</kbd></label>
    <div class="pinfo" id="p-info" aria-live="polite"></div>`;
  const aside = root.querySelector('aside'), ctl = [...aside.querySelectorAll('h2')].find(h => h.textContent === 'Controls'); aside.insertBefore(sec, ctl);
  const $ = id => sec.querySelector('#' + id), seeds = { hero: 1, foe: 1 };
  const listOf = (who) => pickOf($('p-' + who).value).list(seeds[who]);
  const info = () => { const h = summary(hero.a.persona), f = foe.bh, n = v => v.toFixed(v < 10 ? 2 : 0);
    $('p-info').innerHTML = `<b>Ronin</b> ${describe(hero.list || [])}\nrun ${n(h.run.speed)} px/s, stride ${n(h.run.stride)}, ${n(h.run.cadence)} strides/s\nbreath ${n(h.breath)} s` +
      (h.idles.length ? `, an idle every ~${n(h.gap)} s:\n  ${h.idles.join(', ')}` : ', no idles (as drawn)') +
      `\n<b>Samurai</b> ${describe(foe.list || [])}\nwaits ${n(f.patience)} s in guard, cuts inside ${n(f.reach)}, holds at ${n(f.hold)}\nrecoil ×${n(f.recoil)}${f.backOff ? `, gives ground (${n(f.backOff)})` : ''}`; };
  const apply = who => { const list = listOf(who); if (who === 'hero') { giveHero(hero, list); store.set({ id: $('p-hero').value, seed: seeds.hero }); } else giveFoe(foe, list); info(); };
  const saved = store.get(); if (saved && PICKS.some(p => p.id === saved.id)) { $('p-hero').value = saved.id; seeds.hero = saved.seed || 1; }
  apply('hero'); apply('foe');
  $('p-hero').onchange = () => apply('hero'); $('p-foe').onchange = () => apply('foe');
  const roll = () => { for (const w of ['hero', 'foe']) if (pickOf($('p-' + w).value).culture) { seeds[w]++; apply(w); } };
  $('p-roll').onclick = roll;
  $('p-labels').onchange = e => { LABELS.on = e.target.checked ? 1 : 0; };
  const next = el => { el.selectedIndex = (el.selectedIndex + 1) % el.options.length; el.onchange(); };
  addEventListener('keydown', e => { if (e.target.tagName === 'SELECT' || e.repeat || e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.code === 'KeyP') next($('p-hero')); if (e.code === 'KeyO') next($('p-foe')); if (e.code === 'KeyR') roll();
    if (e.code === 'KeyT') { const c = $('p-labels'); c.checked = !c.checked; c.onchange({ target: c }); } });
  return { info };
}
