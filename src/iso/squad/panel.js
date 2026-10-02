// ---- The squad's DOM: the ORDER BAR under the game (the party's portraits: click selects, Shift adds, double-click
// selects the role; the orders, formations, tactics, the selection's role and liberty, the order slow-motion, "show
// minds", a new wave) and the COMPANION SETTINGS panel (Tab, in the kit screen's style; it pauses the game): per
// companion his role, liberty, whom he protects and his aggression. Every button is also the touch control.
import { SQ, select, toggle, selectRole, order, set, chosen } from './squad.js';
import { ROLES, ROLE_IDS, LIBERTY, LIBERTY_IDS, FORMATIONS, FORMATION_IDS, TACTICS, TACTIC_IDS, ORDERS, ORDER_IDS } from './orders.js';
import { temperWords } from '../ai/temper.js';

const CSS = `
.iso.squad .stage { flex-direction: column; align-items: center; position: relative; gap: 8px; }
.sq-bar { width: 100%; max-width: 1400px; background: var(--panel); border: 1px solid var(--rule); padding: 8px 10px; box-sizing: border-box; font-size: 12px; }
.sq-party { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 6px; }
.sq-por { background: #0d1013; color: var(--fg); border: 1px solid var(--rule); padding: 3px 8px 5px; min-width: 92px; text-align: left; cursor: pointer; font: inherit; }
.sq-por b { display: block; font-weight: 600; } .sq-por small { color: var(--dim); } .sq-por i { display: block; height: 3px; background: #3a1416; margin-top: 3px; } .sq-por i span { display: block; height: 3px; background: #cfe6e2; }
.sq-por.on { border-color: var(--cyan); box-shadow: inset 0 0 0 1px var(--cyan); } .sq-por.down { opacity: .55; } .sq-por.dead { opacity: .3; }
.sq-row { display: flex; flex-wrap: wrap; align-items: center; gap: 4px; margin: 3px 0; }
.sq-row > span { color: var(--dim); font-size: 11px; letter-spacing: .06em; text-transform: uppercase; min-width: 74px; }
.sq-row button { background: #0d1013; color: var(--fg); border: 1px solid var(--rule); padding: 2px 8px; font: inherit; cursor: pointer; }
.sq-row button.on { border-color: var(--cyan); color: var(--cyan); } .sq-row button:hover { border-color: #3d4650; }
.sq-row select { margin-left: 0; background: #0d1013; color: var(--fg); border: 1px solid var(--rule); font: inherit; padding: 1px 4px; }
.sq-hint { color: var(--dim); font-size: 11px; margin-top: 4px; }
.sq-panel { position: absolute; top: 0; left: 50%; transform: translateX(-50%); width: min(100%, 900px); max-height: 100%; overflow: auto; background: rgba(9,11,14,.94); border: 1px solid var(--cyan); padding: 12px 14px; box-sizing: border-box; z-index: 5; }
.sq-panel h3 { margin: 0 0 2px; font-size: 13px; letter-spacing: .1em; text-transform: uppercase; color: var(--cyan); }
.sq-panel table { width: 100%; border-collapse: collapse; margin-top: 8px; } .sq-panel td, .sq-panel th { padding: 4px 6px; border-bottom: 1px solid var(--rule); text-align: left; vertical-align: middle; }
.sq-panel th { color: var(--dim); font-weight: 500; font-size: 11px; text-transform: uppercase; letter-spacing: .06em; }
.sq-panel select { background: #0d1013; color: var(--fg); border: 1px solid var(--rule); font: inherit; } .sq-panel small { color: var(--dim); }
.sq-panel input[type=range] { width: 90px; vertical-align: middle; }
`;
const btns = (ids, D, kind) => ids.map(k => `<button data-${kind}="${k}" title="${D[k].about}">${D[k].name}</button>`).join('');

export function buildPanel({ root, A, H, allies, ctl }) {
  root.classList.add('squad'); const st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);
  const stage = root.querySelector('.stage'), bar = document.createElement('div'); bar.className = 'sq-bar'; bar.setAttribute('aria-label', 'Squad orders');
  bar.innerHTML = `<div class="sq-party" role="group" aria-label="The party"></div>
    <div class="sq-row"><span>Orders</span>${btns(ORDER_IDS, ORDERS, 'order')}</div>
    <div class="sq-row"><span>Formation</span>${btns(FORMATION_IDS, FORMATIONS, 'form')}</div>
    <div class="sq-row"><span>Tactic</span>${btns(TACTIC_IDS, TACTICS, 'tactic')}</div>
    <div class="sq-row"><span>Selection</span>role <select id="sq-role">${ROLE_IDS.map(r => `<option value="${r}">${ROLES[r].name}</option>`).join('')}</select>
      liberty <select id="sq-lib">${LIBERTY_IDS.map(r => `<option value="${r}">${LIBERTY[r].name}</option>`).join('')}</select>
      <button id="sq-all">All</button><button id="sq-none">None</button><button id="sq-open" title="Tab">Settings (Tab)</button></div>
    <div class="sq-row"><span>While ordering</span><select id="sq-slow"><option value="slow">Slow motion</option><option value="pause">Pause</option><option value="off">Off</option></select>
      <label><input type="checkbox" id="sq-minds"> show minds</label><button id="sq-wave">New wave</button></div>
    <div class="sq-hint">Left drag: select · left click: the hero goes there (a companion: select; Shift adds; double-click: his role) · right click: go there / attack / protect · hold right: the radial · Ctrl+1–9 save a group, 1–9 recall · G hold / follow · E (held) lift a downed companion · Esc clear. Touch: long-press and drag selects; with a selection a tap orders.</div>`;
  stage.appendChild(bar);
  const back = root.querySelector('#o-squad'); if (back) { back.href = '?iso'; back.textContent = 'Back to the duel'; }
  bar.addEventListener('pointermove', () => { ctl.st.overBar = performance.now(); }); bar.addEventListener('pointerleave', () => { ctl.st.overBar = 0; });   // a resting pointer stops slowing it after 1.5 s
  const party = bar.querySelector('.sq-party'), $ = s => bar.querySelector(s);
  party.innerHTML = allies.map(a => `<button class="sq-por" data-id="${a.id}" aria-pressed="false"><b>${a.name}</b><small class="r"></small><i><span></span></i></button>`).join('');
  let lastTap = null;
  party.addEventListener('click', e => { const b = e.target.closest('.sq-por'); if (!b) return; const id = b.dataset.id, a = allies.find(o => o.id === id), now = performance.now();
    if (lastTap && lastTap.id === id && now - lastTap.t < 350) selectRole(A, a.role, e.shiftKey); else if (e.shiftKey) toggle(A, id); else select(A, [id]);
    lastTap = { id, t: now }; A.log(`select:${[...SQ.sel].join(',')}`); refresh(); });
  bar.addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.order) { order(A, b.dataset.order); ctl.gave(); }
    if (b.dataset.form) set(A, 'formation', b.dataset.form);
    if (b.dataset.tactic) { set(A, 'tactic', b.dataset.tactic); if (b.dataset.tactic === 'ambush') A.sprung = false; }
    refresh(); });
  $('#sq-role').onchange = e => { set(A, 'role', e.target.value); refresh(); };
  $('#sq-lib').onchange = e => { set(A, 'liberty', e.target.value); refresh(); };
  $('#sq-all').onclick = () => { select(A, allies.map(a => a.id)); refresh(); }; $('#sq-none').onclick = () => { SQ.sel.clear(); refresh(); };
  $('#sq-slow').onchange = e => { SQ.slow = e.target.value; }; $('#sq-minds').onchange = e => { SQ.minds = e.target.checked; };
  $('#sq-wave').onclick = () => G.newWave && G.newWave();
  const G = {};

  // ---- the settings panel (Tab): one row per companion, in the kit screen's manner; the game waits while it is open
  const pan = document.createElement('div'); pan.className = 'sq-panel'; pan.hidden = true; pan.setAttribute('role', 'dialog'); pan.setAttribute('aria-label', 'Companion settings'); stage.appendChild(pan);
  const who = () => [{ id: 'hero', name: 'You' }, ...allies.map(a => ({ id: a.id, name: a.name }))];
  function fill() {
    pan.innerHTML = `<h3>Companions</h3><small>Each companion's own settings: what his job is, how far he may roam to do it, whom he guards, how hard he presses. Tab or Esc closes.</small>
      <table><tr><th>Who</th><th>Role</th><th>Liberty</th><th>Protects</th><th>Aggression</th></tr>${allies.map(a => `<tr data-id="${a.id}">
      <td><b>${a.name}</b><br><small>${a.wpnId} · ${a.traits.map(t => t[0]).join(' + ')} · ${temperWords(a.temper)}</small></td>
      <td><select data-k="role">${ROLE_IDS.map(r => `<option value="${r}" ${a.role === r ? 'selected' : ''}>${ROLES[r].name}</option>`).join('')}</select><br><small>${ROLES[a.role].about}</small></td>
      <td><select data-k="liberty">${LIBERTY_IDS.map(r => `<option value="${r}" ${a.liberty === r ? 'selected' : ''}>${LIBERTY[r].name} (${r === 'unbound' ? '∞' : LIBERTY[r].leash})</option>`).join('')}</select></td>
      <td><select data-k="charge">${who().filter(w => w.id !== a.id).map(w => `<option value="${w.id}" ${(a.charge ?? 'hero') === w.id ? 'selected' : ''}>${w.name}</option>`).join('')}</select></td>
      <td><label><input type="checkbox" data-k="auto" ${a.aggression == null ? 'checked' : ''}> his own</label> <input type="range" min="0" max="1" step=".1" data-k="aggression" value="${a.aggression ?? a.temper.aggro}" ${a.aggression == null ? 'disabled' : ''}></td></tr>`).join('')}</table>`;
  }
  pan.addEventListener('change', e => { const tr = e.target.closest('tr'); if (!tr) return; const a = allies.find(o => o.id === tr.dataset.id), k = e.target.dataset.k;
    if (k === 'role') { a.role = e.target.value; if (a.role === 'protector' && a.charge == null) a.charge = 'hero'; }
    else if (k === 'liberty') a.liberty = e.target.value;
    else if (k === 'charge') { a.charge = e.target.value; if (a.role !== 'protector') a.role = 'protector'; }
    else if (k === 'auto') a.aggression = e.target.checked ? null : a.temper.aggro;
    else if (k === 'aggression') a.aggression = +e.target.value;
    A.log(`settings:${a.name}:${k}=${e.target.type === 'checkbox' ? e.target.checked : e.target.value}`); fill(); refresh(); });
  const show = on => { pan.hidden = !on; if (on) fill(); else root.querySelector('#iso').focus(); };
  $('#sq-open').onclick = () => show(pan.hidden);
  addEventListener('keydown', e => { if (e.code === 'Tab') { e.preventDefault(); if (!e.repeat) show(pan.hidden); } else if (e.code === 'Escape' && !pan.hidden) show(false); });

  // ---- keep the bar in step with the selection (and the party's health)
  function refresh() {
    const list = chosen(A), same = k => list.length && list.every(a => a[k] === list[0][k]) ? list[0][k] : null;
    for (const b of party.children) { const a = allies.find(o => o.id === b.dataset.id); const on = SQ.sel.has(a.id); b.classList.toggle('on', on); b.setAttribute('aria-pressed', on);
      b.classList.toggle('down', a.downed); b.classList.toggle('dead', !a.alive);
      b.querySelector('.r').textContent = `${ROLES[a.role].name}${a.role === 'protector' ? ' of ' + (a.charge === 'hero' || a.charge == null ? 'you' : a.charge) : ''} · ${LIBERTY[a.liberty].name}`;
      b.querySelector('span').style.width = `${Math.max(0, a.hp / a.maxHp) * 100}%`; }
    const o = list.length && list.every(a => a.order.k === list[0].order.k) ? list[0].order.k : null;
    for (const b of bar.querySelectorAll('[data-order]')) b.classList.toggle('on', b.dataset.order === o);
    for (const b of bar.querySelectorAll('[data-form]')) b.classList.toggle('on', b.dataset.form === same('formation'));
    for (const b of bar.querySelectorAll('[data-tactic]')) b.classList.toggle('on', b.dataset.tactic === same('tactic'));
    const r = same('role'), l = same('liberty'); if (r && document.activeElement !== $('#sq-role')) $('#sq-role').value = r; if (l && document.activeElement !== $('#sq-lib')) $('#sq-lib').value = l;
  }
  setInterval(refresh, 150); refresh();
  return { paused: () => !pan.hidden, open: () => !pan.hidden, refresh, bind(g) { G.newWave = g.newWave; } };
}
