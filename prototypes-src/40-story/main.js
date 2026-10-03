// Prototype 40: a world's events over time, a region's notice board, and ledger-born quests you can resolve different ways.
// Bundled into prototypes/40-story.html by scripts/proto-bundle.mjs. Everything shown is read from the ledger (src/sim/, src/sim/story/).
import { generateWorld, advance, serialize, deserialize, calendar, on, nameOf } from 'ronin-engine/sim/index.js';
import { storyOf, boardOf, openQuests, quest, waysOf, takeQuest, resolveQuest, chapterOf, rivalName, breakOath, WARNINGS } from 'ronin-engine/sim/story/index.js';

const $ = id => document.getElementById(id);
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
let L, sel = null, qsel = null, cmp = null, cats = new Set(['nature', 'politics', 'crime', 'quests']);

// what we capture while a copy of the world plays a way out
let capture = null;
on('*', (e, W) => { if (capture && W === capture.L) capture.events.push(e); });

const CAT = t => /festival|planting|harvest|winter/.test(t) ? 'calendar' : /drought|flood|typhoon|earthquake|plague|comet|famine|poorHarvest/.test(t) ? 'nature'
  : /raid|robbery|bounty|camp|army|village|crackdown/.test(t) ? 'crime' : t.startsWith('story.') ? 'quests' : 'politics';
const COLORS = { calendar: '#5f6664', nature: '#6ff3e4', politics: '#c9a45a', crime: '#e0864f', quests: '#d8d1bf' };
const when = d => { const c = calendar(d * 24); return `y${c.year} ${c.season.slice(0, 3)} ${c.dayOfSeason}`; };
const today = () => Math.floor(L.hour / 24);
const me = () => L.actors[L.player];
const who = id => id == null ? '—' : L.actors[id] ? (storyOf(L).rivals[id] ? rivalName(L, id) : nameOf(L.actors[id])) : '?';

function make(seed) {
  L = generateWorld(seed, 0);
  advance(L, 24 * 112 * 2);   // two years in, so the world has a history
  const p = me(), home = L.zones[p.at[1] * 100 + p.at[0]].region;
  sel = [home, ...storyOf(L).adj[home]].sort((a, b) => openQuests(L, b).length - openQuests(L, a).length)[0];
  qsel = null; cmp = null; draw();
}
function live(hours) { advance(L, hours); if (qsel && !quest(L, qsel)) qsel = null; cmp = null; draw(); }

// ---- the map: regions in their culture's colour, recent smoke and bells, war fronts, him ----
function drawMap() {
  const c = $('map'), g = c.getContext('2d'), S = storyOf(L), s = 4;
  const hue = L.cultures.map(k => k.hue);
  for (const z of L.zones) {
    if (z.region < 0) { g.fillStyle = '#0e1215'; } else {
      const R = S.reg[z.region], light = 20 + (z.biome === 'mountains' ? 6 : z.biome === 'hills' ? 3 : 0) + (z.region === sel ? 14 : 0);
      g.fillStyle = `hsl(${hue[L.regions[z.region].culture]}, ${z.region === sel ? 30 : 16}%, ${light}%)`;
      if (R.war) g.fillStyle = `hsl(8, 45%, ${light + 4}%)`;
    }
    g.fillRect(z.x * s, z.y * s, s, s);
    if (z.road && z.region >= 0) { g.fillStyle = 'rgba(216,209,191,.18)'; g.fillRect(z.x * s + 1, z.y * s + 1, 2, 2); }
  }
  // borders between regions
  g.fillStyle = 'rgba(0,0,0,.55)';
  for (const z of L.zones) { if (z.region < 0) continue; const r = L.zones[z.y * 100 + z.x + 1], d = L.zones[(z.y + 1) * 100 + z.x];
    if (r && z.x < 99 && r.region !== z.region) g.fillRect(z.x * s + s - 1, z.y * s, 1, s); if (d && d.region !== z.region) g.fillRect(z.x * s, z.y * s + s - 1, s, 1); }
  for (const z of L.zones) if (z.kind === 'town' || z.kind === 'village' || z.kind === 'camp') { g.fillStyle = z.kind === 'camp' ? (z.holder ? '#7a3a2c' : '#3a3a3a') : z.kind === 'town' ? '#d8d1bf' : '#8d8676'; g.fillRect(z.x * s + 1, z.y * s + 1, 2, 2); }
  // signs from the last 14 days, at each region's seat
  const recent = S.news.filter(n => today() - n.d <= 14), seen = new Set();
  for (const n of recent) for (const r of n.regions.slice(0, 1)) { const [x, y] = L.regions[r].seat, k = r + (n.heralds.includes('smoke') ? 's' : 'b'); if (seen.has(k)) continue; seen.add(k);
    if (n.heralds.includes('smoke')) { g.fillStyle = 'rgba(224,134,79,.8)'; g.fillRect(x * s - 2, y * s - 5, 3, 3); g.fillRect(x * s, y * s - 8, 2, 2); }
    else if (n.heralds.includes('bell')) { g.strokeStyle = 'rgba(111,243,228,.8)'; g.strokeRect(x * s - 3 + .5, y * s - 3 + .5, 8, 8); } }
  const p = me(); g.fillStyle = '#fff'; g.fillRect(p.at[0] * s - 1, p.at[1] * s - 1, 5, 5); g.fillStyle = '#000'; g.fillRect(p.at[0] * s + 1, p.at[1] * s + 1, 1, 1);
}

// ---- events per season, stacked by kind ----
function drawChart() {
  const c = $('chart'), g = c.getContext('2d'), W = c.width, H = c.height, S = storyOf(L);
  const seasons = Math.floor(today() / 28) + 1, bins = Array.from({ length: seasons }, () => ({}));
  for (const n of S.news) { const k = CAT(n.type); if (!cats.has(k)) continue; const b = bins[Math.floor(n.d / 28)]; if (b) b[k] = (b[k] || 0) + 1; }
  const max = Math.max(4, ...bins.map(b => Object.values(b).reduce((a, x) => a + x, 0)));
  g.clearRect(0, 0, W, H); const top = 20, bot = H - 30, bw = (W - 50) / Math.max(seasons, 8);
  g.font = '20px JetBrains Mono, monospace'; g.fillStyle = '#8d9693'; g.strokeStyle = '#2c3130';
  for (const f of [0, .5, 1]) { const y = bot - (bot - top) * f; g.beginPath(); g.moveTo(44, y); g.lineTo(W, y); g.stroke(); g.fillText(String(Math.round(max * f)), 0, y + 6); }
  bins.forEach((b, i) => { let y = bot; for (const k of ['calendar', 'nature', 'politics', 'crime', 'quests']) { const v = b[k] || 0; if (!v) continue; const h = (bot - top) * v / max; g.fillStyle = COLORS[k]; g.fillRect(48 + i * bw, y - h, Math.max(2, bw - 3), h); y -= h; }
    if (i % 4 === 0) { g.fillStyle = '#8d9693'; g.fillText('y' + (i / 4 + 1), 48 + i * bw, H - 6); } });
  $('cats').innerHTML = Object.keys(COLORS).map(k => `<button class="chip ${cats.has(k) ? 'on' : ''}" data-cat="${k}"><i style="display:inline-block;width:8px;height:8px;background:${COLORS[k]};margin-right:5px"></i>${k}</button>`).join('');
  const feed = S.news.filter(n => cats.has(CAT(n.type)) && !n.type.startsWith('story.questPosted')).slice(-80).reverse();
  $('feed').innerHTML = feed.map(n => `<div><span class="when">${when(n.d)}</span><span>${esc(n.text)}</span></div>`).join('');
}

// ---- the notice board of the selected region ----
function drawBoard() {
  const b = boardOf(L, sel, { days: 56 }), g = L.regions[sel];
  const occ = b.occupier ? ` · held by ${b.occupier.actor ? esc(who(b.occupier.actor)) : esc(L.cultures[b.occupier.culture].name)} (${b.occupier.how})` : '';
  const m = b.mood, meter = (k, v, bad) => `<div class="meter ${v >= bad ? 'bad' : ''}">${k} <span class="num">${Math.round(v * 100)}%</span><span class="bar"><i style="width:${Math.round(Math.min(1, v) * 100)}%"></i></span></div>`;
  $('board').innerHTML = `<h2>${esc(b.name)}</h2>
    <div class="sub">${esc(L.cultures[g.culture].name)} · lord ${esc(b.lord || 'none')}${occ}</div>
    <div class="tale"><div class="label" style="color:#6a6252">The tale here</div><h3>${esc(b.tale.title)}</h3><p>${esc(b.tale.text)}</p>${b.tale.also.length ? `<div class="also">Also: ${esc(b.tale.also.join(' · '))}</div>` : ''}</div>
    <div class="signs">${b.signs.smoke ? '<span class="sign hot">smoke on the horizon</span>' : ''}${b.signs.bell ? '<span class="sign hot">the bell is ringing</span>' : ''}${b.signs.messengers ? `<span class="sign">${b.signs.messengers} messenger${b.signs.messengers > 1 ? 's' : ''} this week</span>` : ''}<span class="sign">tax ${Math.round(m.tax * 100)}%</span>${m.war ? '<span class="sign hot">at war</span>' : ''}</div>
    <div class="mood">${meter('hunger', m.hunger, .5)}${meter('unrest', m.unrest, .65)}${meter('danger', m.danger, .4)}${meter('crop this year', m.harvest, 2)}</div>
    <div class="label" style="color:#a89d86;margin-bottom:6px">Posted here</div>
    <div class="slips">${b.contracts.length ? b.contracts.map(q => `<button class="slip ${q.id === qsel ? 'sel' : ''}" data-q="${q.id}"><span class="seal">${q.reward ? q.reward + ' mon' : ''}</span><h4>${esc(q.title)}</h4>
      <div class="meta"><span>${esc(q.where)}</span><span>${q.due} days left</span>${q.taken ? '<span>taken</span>' : ''}<span>${q.kind}</span></div></button>`).join('') : '<div class="empty">Nothing posted. Try a neighbouring region, or let a season pass.</div>'}</div>
    <div class="news"><div class="label" style="color:#a89d86">Heard in the last eight weeks</div>${b.news.map(n => `<p><span class="h">${n.heralds[0]}</span>${esc(n.text)}</p>`).join('') || '<div class="empty">Quiet.</div>'}</div>`;
}

// ---- a quest: its ways, what each gives, and the consequences side by side ----
const sign = (v, unit = '') => v ? `<span class="${v > 0 ? 'up' : 'down'}">${v > 0 ? '+' : ''}${v}${unit}</span>` : '<span>0</span>';
const standingText = st => Object.entries(st).map(([c, v]) => `${esc(L.cultures[c].name.replace(/^the /, ''))} ${sign(Math.round(v * 100), '')}`).join(', ') || 'no one';
function drawQuest() {
  const el = $('quest'), q = qsel && quest(L, qsel);
  if (!q) { el.innerHTML = `<h2>Pick a notice</h2><p class="hint">Each notice on the board is something really happening in the ledger. Open one to see who is involved, the ways it can be solved, and what each way does to the world and to him. Leave it alone and it plays out without him on its due day.</p>
    <p class="hint">"Compare every way" copies the world once per way, resolves it, lives one more season, and lays the results side by side. The last row is the untouched ending.</p>`; return; }
  const done = q.state === 'done', ways = waysOf(L, q);
  el.innerHTML = `<div class="label">${q.kind} · ${esc(L.regions[q.region].name)} · posted ${when(q.posted)} · due ${when(q.due)}</div><h2>${esc(q.title)}</h2>
    <p class="q-text">${esc(q.text)}</p>
    <div class="who">Asked by ${esc(who(q.giver))}${q.target != null ? ` · about ${esc(who(q.target))}` : ''}${q.other != null ? ` · also ${esc(who(q.other))}` : ''}</div>
    ${done ? `<div class="outcome ${q.outcome.by === L.player ? '' : 'world'}"><div class="label">${q.outcome.by === L.player ? 'He chose: ' + esc(q.outcome.way) : q.outcome.by ? 'A rival got there first' : 'It played out without him'} · ${when(q.outcome.day)}</div>${esc(q.outcome.text)}
      ${q.outcome.change ? `<div class="mono" style="font-size:12px;margin-top:4px">karma ${sign(q.outcome.change.karma)} · mon ${sign(q.outcome.change.mon)} · standing ${standingText(q.outcome.change.standing)}</div>` : ''}</div>` :
    `<div class="ways">${ways.map(w => `<div class="way"><h4><span class="tag">${w.as}</span>${esc(w.label)}</h4><p>${esc(w.blurb)}</p>
      <div class="fx">karma ${sign(w.karma)} · mon ${sign(w.mon)} · standing ${standingText(w.standing)}</div>
      <button data-way="${w.id}" ${w.can ? '' : 'disabled'} title="${esc(w.why || '')}">${w.can ? 'Do it' : esc(w.why)}</button></div>`).join('')}</div>
    <div class="controls" style="margin-top:12px"><button class="primary" id="compare">Compare every way</button><button id="untouched">Let it play out</button>${q.state === 'open' ? '<button id="take">Take it</button>' : '<span class="busy">taken</span>'}</div>`}
    <div id="cmpOut">${cmp && cmp.id === q.id ? cmpTable(cmp) : ''}</div>`;
}
function cmpTable(c) {
  return `<div class="cmp"><table><thead><tr><th>Way</th><th>What happened</th><th>Karma</th><th>Mon</th><th>Standing</th><th>Dead nearby</th><th>Fields changed hands nearby</th><th>Next season</th></tr></thead><tbody>${c.rows.map(r => `<tr>
    <td><b>${esc(r.label)}</b></td><td class="story">${esc(r.text)}</td><td class="num">${sign(r.karma)}</td><td class="num">${sign(r.mon)}</td><td>${standingText(r.standing)}</td>
    <td class="num">${r.dead}</td><td class="num">${r.seized}</td><td>${esc(r.next.join(' · ') || '—')}</td></tr>`).join('')}</tbody></table></div>`;
}
// each way on its own copy of the world, then a season lived on, so the follow-on events show
function compare(q) {
  const json = serialize(L), rows = [];
  const play = (label, fn) => { const C = deserialize(json), p0 = C.actors[C.player], k0 = p0.karma, m0 = p0.money.mon, s0 = { ...p0.standing };
    capture = { L: C, events: [] }; const text = fn(C); const now = capture.events.slice(); advance(C, 24 * 28); const later = capture.events.slice(now.length); capture = null;
    const all = now.concat(later), p = C.actors[C.player], st = {};
    for (const k of new Set([...Object.keys(s0), ...Object.keys(p.standing)])) { const d = +((p.standing[k] || 0) - (s0[k] || 0)).toFixed(2); if (d) st[k] = d; }
    const next = [...new Set(later.filter(e => e.type.startsWith('event.') && !/festival|planting|winter|harvest/.test(e.type) && (e.region === q.region || (e.regions || []).includes(q.region))).map(e => e.type.slice(6)))].slice(0, 4);
        const near = e => { const z = e.zone && C.zones[e.zone[1] * 100 + e.zone[0]]; return z && (z.region === q.region || C.sys.story.adj[q.region].includes(z.region)); };
    rows.push({ label, text, karma: +(p.karma - k0).toFixed(1), mon: p.money.mon - m0, standing: st, dead: all.filter(e => e.type === 'story.killed' && near(e)).length, seized: all.filter(e => e.type === 'story.seized' && near(e)).length, next }); };
  for (const w of waysOf(L, q)) if (w.can) play(w.label, C => { takeQuest(C, q.id); const o = resolveQuest(C, q.id, w.id); return o ? o.text : 'nothing happened'; });
  play('Nobody comes', C => { const Q = C.sys.story.quests[q.id]; advance(C, Math.max(1, Q.due - Math.floor(C.hour / 24) + 1) * 24); const R = C.sys.story.quests[q.id]; return R && R.outcome ? (R.outcome.by ? `${rivalName(C, R.outcome.by)}: ` : '') + R.outcome.text : 'still open'; });
  cmp = { id: q.id, rows };
}

function drawHim() {
  const p = me(), c = chapterOf(L), S = storyOf(L), st = Object.entries(p.standing).filter(([, v]) => v).sort((a, b) => Math.abs(b[1]) - Math.abs(a[1])).slice(0, 2);
  $('him').innerHTML = `<div><div class="label">The ronin</div><b>${esc(nameOf(p))}${c.epithet ? ' ' + c.epithet : ''}</b></div>
    <div><div class="label">Chapter ${c.n}</div><b>${esc(c.title)}</b></div>
    <div><div class="label">Karma</div><span class="num">${p.karma}</span></div><div><div class="label">Mon</div><span class="num">${p.money.mon}</span> <button id="purse" title="For testing: ways that cost money">+500</button></div>
    <div><div class="label">Renown</div><span class="num">${S.arc.renown}</span></div>
    <div><div class="label">Service</div><span>${p.master ? `sworn to ${esc(who(p.master))} · warnings ${S.service ? S.service.warnings || 0 : 0}/${WARNINGS} <button id="oath">Break the oath</button>`
      : `<button id="swear" title="For testing: swear to the lord of the region on the board">Swear to ${esc(who(L.regions[sel].lord))}</button>`}</span>${(S.wanted || []).length ? ` <span class="down">wanted by ${S.wanted.map(w => esc(w.by != null ? who(w.by) : L.cultures[w.culture].name)).join(', ')}</span>` : ''}</div>
    <div><div class="label">Standing</div><span>${st.map(([k, v]) => `${esc(L.cultures[k].name.replace(/^the /, ''))} ${sign(Math.round(v * 100))}`).join(', ') || 'unknown to all'}</span></div>`;
}
function draw() {
  const c = calendar(L.hour); $('clock').textContent = `Year ${c.year}, ${c.season}, day ${c.dayOfSeason}`;
  drawMap(); drawChart(); drawBoard(); drawQuest(); drawHim();
}

// ---- input ----
$('regen').onclick = () => make(+$('seed').value || 1);
$('d7').onclick = () => live(24 * 7); $('season').onclick = () => live(24 * 28); $('year').onclick = () => live(24 * 112); $('ten').onclick = () => live(24 * 1120);
$('map').onclick = e => { const r = e.target.getBoundingClientRect(), x = Math.floor((e.clientX - r.left) / r.width * 100), y = Math.floor((e.clientY - r.top) / r.height * 100), z = L.zones[y * 100 + x];
  if (z && z.region >= 0) { sel = z.region; draw(); } };
document.addEventListener('click', e => {
  const t = e.target.closest('[data-q],[data-way],[data-cat],#compare,#untouched,#take,#purse,#oath,#swear'); if (!t) return;
  const q = qsel && quest(L, qsel);
  if (t.dataset.q) { qsel = t.dataset.q; cmp = null; draw(); }
  else if (t.dataset.cat) { cats.has(t.dataset.cat) ? cats.delete(t.dataset.cat) : cats.add(t.dataset.cat); drawChart(); }
  else if (t.dataset.way && q) { if (q.state === 'open') takeQuest(L, q.id); resolveQuest(L, q.id, t.dataset.way); cmp = null; draw(); }
  else if (t.id === 'take' && q) { takeQuest(L, q.id); draw(); }
  else if (t.id === 'purse') { me().money.mon += 500; draw(); }
  else if (t.id === 'oath') { breakOath(L); draw(); }
  else if (t.id === 'swear' && L.regions[sel].lord) { const S = storyOf(L); me().master = L.regions[sel].lord; S.arc.sworn = me().master; S.arc.chapter = Math.max(S.arc.chapter, 3); S.service = { lord: me().master, since: today(), warnings: 0, orders: [] }; draw(); }
  else if (t.id === 'untouched' && q) { live(Math.max(1, q.due - today() + 1) * 24); }
  else if (t.id === 'compare' && q) { $('cmpOut').innerHTML = '<p class="busy">Living it out on copies of the world…</p>'; setTimeout(() => { compare(q); drawQuest(); }, 20); }
});
make(12345);
