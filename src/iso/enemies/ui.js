// ---- The overlay's Enemies section, added to the ?iso page's settings panel (ui/overlay.js stays as it was): the group
// picker (, steps through it), respawn (.), the placeholder brain on or off (with it off they stand and wait for a
// decision layer to drive them), and a live line: the hero's health, who holds the tokens, the latest events.
import { GROUPS } from './types.js';
import { SQUAD } from 'ronin-engine/iso/enemies/squad.js';
import { BRAIN } from 'ronin-engine/iso/enemies/brain.js';
import { ELOG } from 'ronin-engine/iso/enemies/events.js';
import { CTX, TOKENS } from 'ronin-engine/iso/enemies/ctx.js';

export function buildPicker(root, squad, group) {
  const aside = root.querySelector('aside'), before = [...aside.querySelectorAll('h2')].find(h => h.textContent === 'Controls');
  const box = document.createElement('div');
  box.innerHTML = `<h2>Enemies</h2>
    <label>Group <select id="o-group">${Object.entries(GROUPS).map(([k, v]) => `<option value="${k}">${v.name}</option>`).join('')}</select><kbd>,</kbd></label>
    <label><input type="checkbox" id="o-brain" checked>Placeholder brain</label>
    <div class="ms" id="o-elog" aria-live="off" style="font-size:11px;white-space:pre-line;min-height:4.4em"></div>`;
  aside.insertBefore(box, before);
  const sel = box.querySelector('#o-group'), brain = box.querySelector('#o-brain'), log = box.querySelector('#o-elog');
  sel.value = group; sel.onchange = () => { squad.spawn(sel.value); root.querySelector('canvas').focus(); };
  brain.onchange = () => { SQUAD.brain = brain.checked ? BRAIN : null; };
  addEventListener('keydown', e => { if (e.target.tagName === 'SELECT' || e.repeat || e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.code === 'Comma') {   // , and . (not G and R: G is the party's hold / follow, R Blade Recall)
      sel.selectedIndex = (sel.selectedIndex + 1) % sel.options.length; sel.onchange(); }
    if (e.code === 'Period') squad.spawn(); });
  const keys = aside.querySelector('.keys'); if (keys) keys.insertAdjacentHTML('beforeend', '<div><kbd>,</kbd> enemy group, <kbd>.</kbd> again</div>');
  setInterval(() => { if (!SQUAD.on) { log.textContent = ''; return; }
    const ev = ELOG.filter(e => e.name !== 'swing' && e.name !== 'commit').slice(-3).map(e => `${e.type || 'hero'} ${e.name}${e.move ? ' ' + e.move : ''}`);
    log.textContent = `hero ${CTX.heroHp}/${CTX.heroMax} · tokens ${TOKENS.used('melee')}/${TOKENS.cap.melee} melee, ${TOKENS.used('ranged')}/${TOKENS.cap.ranged} ranged\n${ev.join('\n')}`; }, 250);
}
