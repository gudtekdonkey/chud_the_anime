// Prototype 38: the people lane on the simulation core. Bundled into prototypes/38-people.html by scripts/proto-bundle.mjs.
import '../../src/sim/people/index.js';   // registers the people system before the world is made
import { generateWorld, advance, calendar, HOURS_PER_YEAR, HOURS_PER_SEASON, on, ownerOf, zoneAt } from '../../src/sim/index.js';
import { residents, tree, founder, brides, judge, court, propose, nameHeir, playableHeirs, killActor, lootGrave, tieValue, livingChildren, activity, PEOPLE_RULES } from '../../src/sim/people/index.js';

const $ = id => document.getElementById(id);
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
let L = null, P = null, vkey = null, follow = null, playing = false, note = null, places = [];
const hist = {}, log = [];

const nm = id => { const a = id && L.actors[id]; return a ? `${a.given} ${a.family}` : 'someone'; };
const ageOf = a => Math.floor((L.hour - a.born) / HOURS_PER_YEAR);
const yearNow = () => L.hour / HOURS_PER_YEAR + 1;
const keyOf = xy => xy ? xy[0] + ',' + xy[1] : null;
const zoneOfKey = k => zoneAt(L, ...k.split(',').map(Number));
const plural = (n, w) => `${n} ${w}${n === 1 ? '' : 's'}`;

// ---- the chronicle: the system's events, plus births and weddings seen by comparing the village before and after each step ----
on('*', (e, W) => {
  if (W !== L || !e.type.startsWith('people.')) return;
  const a = e.actor && L.actors[e.actor], mine = keyOf(e.zone) === vkey || (a && a.dynasty) || e.type === 'people.heir' || e.type === 'people.lineEnded';
  if (!mine) return;
  const t = {
    'people.died': () => `<b>${nm(e.actor)}</b> died ${({ age: 'of old age', illness: 'of illness', famine: 'of hunger', violence: 'by violence', childbirth: 'in childbirth', duel: 'in a duel' })[e.cause] || 'of ' + e.cause} at ${e.age}${e.by ? `, killed by ${nm(e.by)}` : ''}${e.heir ? `; heir ${nm(e.heir)}` : ''}`,
    'people.inherited': () => `<b>${nm(e.actor)}</b> inherited ${plural(e.plots, 'plot')} from ${nm(e.from)} (${e.rule})${e.regent ? `, held by ${nm(e.regent)} until of age` : ''}`,
    'people.seatPassed': () => `The seat of ${esc(L.regions[e.region].name)} passed to <b>${nm(e.to)}</b> (${e.how})`,
    'people.married': () => `<b>${nm(e.actor)}</b> married <b>${nm(e.spouse)}</b>${e.adopted ? ', taken into her house as its heir' : ''}${e.price ? ` (bride price ${e.price} mon)` : ''}`,
    'people.born': () => `<b>${nm(e.actor)}</b> was born to ${nm(e.mother)}`,
    'people.heir': () => `<b>${nm(e.actor)}</b>, ${e.age}, takes up the name of ${nm(e.from)}${e.regent ? `; ${nm(e.regent)} is regent` : ''}`,
    'people.sworn': () => `<b>${nm(e.actor)}</b> swore to carry on the name of ${nm(e.to)}`,
    'people.graveLooted': () => e.kin ? `<b>${nm(e.actor)}</b> took up ${nm(e.from)}'s ${e.weapon || 'purse'} from his grave` : `<b>${nm(e.actor)}</b> robbed the grave of ${nm(e.from)}`,
    'people.lineEnded': () => `<b>${nm(e.actor)}</b> died with no heir. The line has ended.`,
    'people.cameOfAge': () => `<b>${nm(e.actor)}</b> came of age and holds ${plural(e.plots, 'plot')}`,
    'people.vendetta': () => `<b>${nm(e.actor)}</b> swore to avenge ${nm(e.victim)} on ${nm(e.target)}`,
    'people.succession': () => `<b>${nm(e.actor)}</b> covets the seat meant for his brother ${nm(e.heir)}`,
    'people.migrated': () => `${plural(e.n, 'person')} left for a place with more land`,
    'people.turnedOutlaw': () => `<b>${nm(e.actor)}</b>, broke, went to join the bandits`,
    'people.hunger': () => `The harvest failed: the village eats ${Math.round(e.fed * 100)}% of what it needs`,
  }[e.type];
  if (t) log.unshift([yearNow(), t()]);
});
function snapshot() { const m = new Map(); for (const a of residents(L, vkey)) m.set(a.id, a.spouse); return m; }
function diff(before, h0) {
  for (const a of residents(L, vkey)) {
    if (a.born > h0 && !a.dynasty) { const mo = L.actors[a.parents[1]]; log.unshift([a.born / HOURS_PER_YEAR + 1, `<b>${nm(a.id)}</b> was born${mo ? ` to ${nm(mo.id)}` : ''}`]); }
    else if (before.has(a.id) && before.get(a.id) == null && a.spouse && !a.dynasty && a.sex === 'm') log.unshift([yearNow(), `<b>${nm(a.id)}</b> married <b>${nm(a.spouse)}</b>`]);
  }
  for (const a of residents(L, vkey)) if (!before.has(a.id) && a.born <= h0 && a.spouse && a.sex === 'f') log.unshift([yearNow(), `<b>${nm(a.id)}</b> came to live here as a bride`]);
  if (log.length > 400) log.length = 400;
}
function record() {
  for (const k of places) (hist[k] || (hist[k] = [])).push([yearNow(), L.sys.people.settle[k].pop]);
  (hist.world || (hist.world = [])).push([yearNow(), L.sys.people.census.length ? L.sys.people.census.at(-1).pop : 0]);
}
function step(seasons) {
  for (let i = 0; i < seasons; i++) { const b = snapshot(), h0 = L.hour; advance(L, HOURS_PER_SEASON); diff(b, h0); record(); }
  render();
}

// ---- a world ----
function newWorld() {
  const seed = +$('seed').value || 12345;
  $('clock').textContent = 'Making the world…';
  setTimeout(() => {
    L = generateWorld(seed, 0); P = L.sys.people; note = null; log.length = 0; for (const k in hist) delete hist[k];
    const p = L.actors[L.player]; vkey = keyOf(p.at); follow = null;
    places = Object.keys(P.settle).filter(k => ['town', 'village'].includes(P.settle[k].kind))
      .map(k => [k, Math.hypot(...k.split(',').map((v, i) => v - p.at[i]))]).sort((a, b) => a[1] - b[1]).slice(0, 16).map(([k]) => k);
    $('village').innerHTML = places.map(k => { const z = zoneOfKey(k); return `<option value="${k}">${esc(z.name)} (${z.kind})${k === vkey ? ' · where he stands' : ''}</option>`; }).join('');
    $('village').value = vkey;
    const heads = residents(L, vkey).filter(a => a.household === a.id).sort((a, b) => b.holds.length - a.holds.length);
    follow = heads[0] ? heads[0].id : null;
    record(); render();
  }, 20);
}

// ---- drawing ----
function chart(k) {
  const pts = hist[k] || [], s = P.settle[k], W = 520, H = 130, pad = [34, 10, 22, 8];
  if (pts.length < 2) return `<p>Live a few seasons to draw the village's people over the years.</p>`;
  const x0 = pts[0][0], x1 = Math.max(pts.at(-1)[0], x0 + 1), ymax = Math.ceil(Math.max(s.cap, ...pts.map(p => p[1])) * 1.15 / 5) * 5;
  const X = x => pad[0] + (x - x0) / (x1 - x0) * (W - pad[0] - pad[1]), Y = y => H - pad[2] - y / ymax * (H - pad[2] - pad[3]);
  const line = pts.map((p, i) => `${i ? 'L' : 'M'}${X(p[0]).toFixed(1)},${Y(p[1]).toFixed(1)}`).join('');
  const area = `${line}L${X(pts.at(-1)[0]).toFixed(1)},${Y(0)}L${X(x0)},${Y(0)}Z`;
  const last = pts.at(-1);
  return `<div style="overflow-x:auto"><svg viewBox="0 0 ${W} ${H}" width="100%" style="max-width:${W}px;display:block" role="img" aria-label="Village population by year">
    ${[0, ymax / 2, ymax].map(v => `<line x1="${pad[0]}" x2="${W - pad[1]}" y1="${Y(v)}" y2="${Y(v)}" stroke="#30353a" stroke-width="1"/><text x="${pad[0] - 6}" y="${Y(v) + 4}" text-anchor="end">${v}</text>`).join('')}
    <line x1="${pad[0]}" x2="${W - pad[1]}" y1="${Y(s.cap)}" y2="${Y(s.cap)}" stroke="#cdb477" stroke-dasharray="4 4" stroke-width="1"/>
    <text x="${W - pad[1]}" y="${Y(s.cap) - 4}" text-anchor="end" style="fill:#cdb477">what its land feeds (${s.cap})</text>
    <path d="${area}" fill="#6ff3e4" fill-opacity=".08"/><path d="${line}" fill="none" stroke="#6ff3e4" stroke-width="1.5"/>
    <circle cx="${X(last[0])}" cy="${Y(last[1])}" r="3" fill="#6ff3e4"/>
    <text x="${X(x0)}" y="${H - 6}">year ${Math.floor(x0)}</text><text x="${W - pad[1]}" y="${H - 6}" text-anchor="end">year ${Math.floor(last[0])}</text>
  </svg></div>`;
}
function plotGrid(z) {
  const p = L.actors[L.player];
  let out = '';
  for (let n = 0; n < 16; n++) {
    const pid = `${z.x},${z.y}:${n}`, o = ownerOf(L, pid), t = o.title && L.actors[o.title], lord = L.regions[z.region].lord;
    const cls = !t ? 'nature' : o.title === lord ? 'lord' : o.holder && o.holder !== o.title ? 'villager trust' : 'villager';
    const tip = !t ? 'nature: nobody holds it' : `title: ${nm(o.title)}${o.holder && o.holder !== o.title ? `, held by ${nm(o.holder)}` : ''}${o.title === lord ? ' (the lord)' : ''}`;
    out += `<div class="plot ${cls}${p && t && (t.id === p.id || (t.dynasty && t.alive)) ? ' player' : ''}" title="${esc(tip)}">${n === 0 ? 'lord' : t && o.title !== lord ? esc(t.family) : ''}</div>`;
  }
  return out;
}
function render() {
  const cal = calendar(L.hour), z = zoneOfKey(vkey), s = P.settle[vkey], reg = L.regions[z.region], cult = L.cultures[reg.culture], hr = +$('hour').value;
  $('clock').textContent = `Year ${cal.year}, ${cal.season} ${cal.dayOfSeason}`;
  const people = residents(L, vkey), houses = people.filter(a => a.household === a.id);
  const lord = L.actors[reg.lord];
  $('vcard').innerHTML = `
    <div class="row"><h2>${esc(z.name)}</h2><p>${z.kind} in ${esc(reg.name)}, ${esc(cult.name)} (${cult.kind})</p></div>
    <div class="stats"><span><b>${people.length}</b> people</span><span><b>${houses.length}</b> households</span><span>fed <b>${Math.round(s.fed * 100)}%</b></span>
      <span>harvest <b>${Math.round((P.harvest[s.region] ?? 1) * 100)}%</b></span><span>lord <b>${lord ? esc(nm(lord.id)) + (lord.alive ? `, ${ageOf(lord)}` : '') : 'none'}</b></span>
      <span>world <b>${(hist.world.at(-1)[1] || Object.values(P.res).reduce((n, r) => n + r.length, 0)).toLocaleString()}</b> living</span></div>
    ${chart(vkey)}
    <div class="row" style="align-items:start;gap:16px"><div class="plots" aria-label="Plots of this zone">${plotGrid(z)}</div>
      <p style="max-width:34ch;font-size:13px">The zone's 16 plots by legal title: <span style="color:var(--land)">a villager's</span>, <span style="color:var(--land)">striped</span> while a regent holds it for a child, <span style="color:var(--cyan)">the lord's</span>, or dark for nature. Hover for the owner.</p></div>`;
  // households: heads with the most land first; everyone else under their head
  const byHouse = new Map();
  for (const a of people) { const h = a.household && people.some(b => b.id === a.household) ? a.household : a.id; (byHouse.get(h) || byHouse.set(h, []).get(h)).push(a); }
  const hs = [...byHouse.entries()].map(([h, ms]) => [L.actors[h], ms]).sort((a, b) => b[0].holds.length - a[0].holds.length || a[0].born - b[0].born);
  $('hsub').textContent = `${plural(hs.length, 'house')}; at ${String(hr).padStart(2, '0')}:00 each is doing what is shown on the right`;
  $('houses').innerHTML = hs.map(([head, ms]) => {
    ms.sort((a, b) => (a === head ? -1 : b === head ? 1 : a.id === head.spouse ? -1 : b.id === head.spouse ? 1 : a.born - b.born));
    const trust = head.holds.filter(pid => L.plots[pid] && L.plots[pid].holder !== head.id).length;
    return `<div class="house"><div class="head"><h3>${esc(head.family)} house</h3><span class="land">${head.holds.length ? plural(head.holds.length, 'plot') + (trust ? ', held for him' : '') : 'landless'}</span></div>
      ${ms.map(a => person(a, head, hr)).join('')}</div>`;
  }).join('') || '<p>Nobody lives here any more.</p>';
  renderTree(); renderRonin(); renderGraves();
  $('log').innerHTML = log.slice(0, 160).map(([y, t]) => `<div><span class="y">year ${Math.floor(y)}</span><span>${t}</span></div>`).join('') || '<p>Nothing yet. Live a season.</p>';
}
function person(a, head, hr) {
  const ag = ageOf(a), [what] = activity(L, a, hr), tags = [];
  if (a.lord != null && L.regions[a.lord].lord === a.id) tags.push('<span class="tag c">lord</span>');
  if (a.pregnant) tags.push('<span class="tag m">with child</span>');
  if (a.regent) tags.push('<span class="tag l">ward</span>');
  if (a.wards && a.wards.length) tags.push('<span class="tag l">regent</span>');
  if (a.ambition) tags.push(`<span class="tag ${a.ambition.kind === 'revenge' ? 'r' : 'm'}" title="ambition">${a.ambition.kind}</span>`);
  return `<button class="p${ag < 12 ? ' kid' : ''}${a.dynasty ? ' dyn' : ''}" data-f="${a.id}" title="Follow this bloodline"><span class="ag">${ag}</span><span class="nm">${esc(a.given)}</span>${tags.join('')}<span class="job">${esc(a.job)} · ${what}</span></button>`;
}
function renderTree() {
  const a = follow && L.actors[follow];
  if (!a) { $('tree').innerHTML = '<p>Pick anyone in a household to follow their bloodline.</p>'; $('tsub').textContent = ''; return; }
  const root = founder(L, a, 3), t = tree(L, root.id, 4);
  let n = 0;
  const yr = h => h < 0 ? 'before' : Math.floor(h / HOURS_PER_YEAR) + 1;
  const node = x => { if (++n > 220) return ''; const d = x.died != null;
    return `<li><span class="n ${d ? 'dead' : ''} ${x.id === follow ? 'me' : ''}" data-f="${x.id}">${esc(x.name)}</span>${x.spouse ? ` <span class="sp">= ${esc(x.spouse)}</span>` : ''}
      <span class="yr">${yr(x.born)}–${d ? yr(x.died) + ', ' + esc(x.cause) : 'living'} · ${esc(x.job)}</span>${x.kids.length ? `<ul>${x.kids.map(node).join('')}</ul>` : ''}</li>`; };
  $('tree').innerHTML = `<ul>${node(t)}</ul>`;
  $('tsub').textContent = `${a.given} ${a.family}'s line, from ${root.given} ${root.family}. Click a name to follow it.`;
}
function renderRonin() {
  const box = $('ronin'), p = L.actors[L.player];
  if (P.over) {
    const g = P.over.grave;
    box.innerHTML = `<div class="death"><h2>The line has ended</h2><p>${esc(nm(P.over.actor))} died (${esc(P.over.cause)}) with no son, grandson, brother or sworn companion to carry the name. His grave lies at zone ${g ? g.zone : '?'}${g ? `, tile ${g.tile}` : ''}. The world goes on without him.</p>
      <div class="row"><button id="again" class="hot">Start a new world</button></div></div>`;
    return;
  }
  const ag = ageOf(p), sp = p.spouse && L.actors[p.spouse], kids = livingChildren(L, p), heirs = playableHeirs(L, p), minor = ag < 16;
  const money = `${p.money.mon} mon${p.money.silver ? `, ${p.money.silver} monme` : ''}${p.money.ryo ? `, ${p.money.ryo} ryō` : ''}`;
  let html = '';
  if (note) html += `<div class="death flash"><h2>${esc(note.title)}</h2><p>${note.text}</p></div>`;
  html += `<div class="row"><h2>${esc(p.given)} ${esc(p.family)}</h2><p>${P.lineage.length ? `the ${ord(P.lineage.length + 1)} of his line` : 'the ronin'}, ${ag}, ${p.cls}</p></div>
    <div class="stats"><span>purse <b>${money}</b></span><span>home <b>${p.home ? esc(zoneOfKey(keyOf(p.home)).name) : 'the road'}</b></span><span>${p.sex === 'm' ? 'wife' : 'husband'} <b>${sp ? esc(nm(sp.id)) + (sp.alive ? '' : ' (dead)') : 'none'}</b></span>
      <span>land <b>${plural(p.holds.length, 'plot')}</b></span></div>`;
  if (minor) html += `<p>${esc(p.given)} is ${ag} and is played now. ${p.regent ? `${esc(nm(p.regent))} is regent${p.holds.length ? ' and holds the land' : ''}` : 'Nobody is left to act as regent'} until ${p.sex === 'm' ? 'he' : 'she'} turns 16.</p>`;
  const last = P.lineage.length && L.actors[P.lineage.at(-1).actor], goods = last && last.grave && last.grave.goods, gw = goods ? PEOPLE_RULES.worth(goods.money) : 0;
  if (goods && (goods.weapon || gw)) html += `<div class="row"><button id="loot" class="hot">Go to ${esc(last.given)}'s grave</button><p style="font-size:13px">His ${esc(goods.weapon || 'purse')} and ${gw} mon lie with him at zone ${last.grave.zone}. Finders keepers.</p></div>`;
  if (kids.length) html += `<h3>Children</h3><div class="brides">${kids.map(c => `<div class="bride"><span><button class="p dyn" data-f="${c.id}"><span class="ag">${ageOf(c)}</span><span class="nm">${esc(c.given)}</span><span class="job">${c.sex === 'm' ? 'son' : 'daughter'}</span></button></span>
      <span class="acts">${heirs[0] === c ? '<span class="tag c">heir</span>' : heirs.includes(c) ? `<button data-heir="${c.id}">Name heir</button>` : '<span class="tag m">cannot inherit the name</span>'}</span></div>`).join('')}</div>`;
  if (!sp || !sp.alive) {
    const bs = minor ? [] : brides(L, p.id).slice(0, 6);
    html += `<h3>Court a bride near ${esc(zoneOfKey(keyOf(p.at || p.home)).name)}</h3>`;
    html += bs.length ? `<div class="brides">${bs.map(b => { const j = judge(L, p, b), t = tieValue(p, b.id);
      return `<div class="bride"><span><b>${esc(nm(b.id))}</b>, ${ageOf(b)}, ${b.cls} · ${esc(L.cultures[b.culture].name)}</span>
        <span class="acts"><button data-court="${b.id}">Court</button><button data-wed="${b.id}" class="${j.ok ? 'hot' : ''}" ${j.ok ? '' : 'disabled'}>Propose (${j.price} mon)</button></span>
        <span class="why"><span style="display:inline-flex;gap:6px;align-items:center">fondness <span class="meter"><i style="width:${Math.round(Math.max(0, t) * 100)}%"></i></span></span>
          · her house's acceptance ${Math.round(j.accept * 100)}%${j.reasons.length ? ' · ' + esc(j.reasons.join('; ')) : ' · ready to wed'}</span></div>`; }).join('')}</div>
        <div class="row"><button id="purse">Find 10 ryō (test)</button><p style="font-size:13px">Court until she knows him, then pay the bride price to her house.</p></div>`
      : `<p>${minor ? 'Too young to court.' : 'No unmarried women near him.'}</p>`;
  }
  html += `<div class="row"><button id="fall" class="grave">He falls here</button><p style="font-size:13px">${heirs.length ? `${esc(heirs[0].given)} would carry on.` : 'No heir: his death ends the run.'}</p></div>`;
  box.innerHTML = html;
}
const ord = n => n + (['th', 'st', 'nd', 'rd'][n % 100 > 10 && n % 100 < 14 ? 0 : Math.min(n % 10, 4) % 4] || 'th');
function renderGraves() {
  const gs = P.graves.slice(-10).reverse();
  $('graves').innerHTML = gs.map(g => `<div class="${g.player ? 'pl' : ''}"><b style="color:var(--ink)">${esc(g.name)}</b>, died year ${Math.floor(g.died / HOURS_PER_YEAR) + 1} (${esc(g.cause)}), zone ${g.zone}, tile ${g.tile}${g.deeds.length ? `<br>${esc(g.deeds.slice(-3).join('; '))}` : ''}</div>`).join('')
    || '<p>Lords, the high-born and the ronin\'s house are buried with their deeds. None yet.</p>';
}

// ---- controls ----
document.addEventListener('click', e => {
  const t = e.target.closest('button, [data-f]'); if (!t || !L) return;
  if (t.dataset.f) { follow = t.dataset.f; renderTree(); if (t.closest('#houses, #ronin')) $('tree').scrollIntoView({ block: 'nearest', behavior: 'smooth' }); return; }
  const p = L.actors[L.player];
  if (t.dataset.court) { court(L, p.id, t.dataset.court); render(); }
  else if (t.dataset.wed) { const r = propose(L, p.id, t.dataset.wed); if (r.wed) { note = { title: 'A wedding', text: `${esc(nm(p.id))} married ${esc(nm(t.dataset.wed))} and paid ${r.price} mon to her house. They live in ${esc(zoneOfKey(keyOf(p.home)).name)}.` }; vkey = keyOf(p.home); if (places.includes(vkey)) $('village').value = vkey; } render(); }
  else if (t.dataset.heir) { nameHeir(L, t.dataset.heir); render(); }
  else if (t.id === 'purse') { p.money.ryo += 10; render(); }
  else if (t.id === 'fall') {
    const heirs = playableHeirs(L, p), at = p.at || p.home;
    killActor(L, p.id, 'duel', null, { zone: at, tile: [30 + (L.hour % 5), 30 + (L.hour % 7)] });
    const h = L.actors[L.player];
    note = P.over ? null : { title: `${p.given} ${p.family} has fallen`, text: `He lies where he fell, zone ${p.grave.zone}, tile ${p.grave.tile}, a grave the world remembers, with what he carried. ${esc(nm(h.id))}, ${ageOf(h)}, carries on${heirs.length > 1 ? ` (${heirs.length - 1} other heir${heirs.length > 2 ? 's' : ''} stand behind)` : ''}.` };
    if (!P.over && h.home) { vkey = keyOf(h.home); if (places.includes(vkey)) $('village').value = vkey; follow = h.id; }
    render();
  }
  else if (t.id === 'loot') { const last = L.actors[P.lineage.at(-1).actor], got = lootGrave(L, last.id, p.id); note = got ? { title: 'At the grave', text: `${esc(p.given)} took up ${esc(last.given)}'s ${esc(got.weapon || 'purse')} and ${PEOPLE_RULES.worth(got.money)} mon.` } : null; render(); }
  else if (t.id === 'again') newWorld();
});
$('s1').onclick = () => { note = null; step(1); };
$('y1').onclick = () => { note = null; step(4); };
$('y10').onclick = () => { note = null; stop(); $('clock').textContent = 'Living ten years…'; setTimeout(() => step(40), 10); };
function stop() { playing = false; $('play').textContent = 'Play'; }
$('play').onclick = () => { if (playing) return stop(); playing = true; $('play').textContent = 'Pause'; note = null;
  const tick = () => { if (!playing) return; step(1); if (P.over) return stop(); setTimeout(tick, 90); }; tick(); };
$('village').onchange = e => { vkey = e.target.value; const h = residents(L, vkey).filter(a => a.household === a.id).sort((a, b) => b.holds.length - a.holds.length)[0]; if (h) follow = h.id; log.length = 0; render(); };
$('hour').oninput = e => { $('hourv').textContent = String(e.target.value).padStart(2, '0') + ':00'; if (L) render(); };
$('newworld').onclick = () => { stop(); newWorld(); };
newWorld();
