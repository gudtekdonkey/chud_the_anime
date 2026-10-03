import { generateWorld, advance, calendar, zoneAt, tilesOf, TERRAIN, ZONE, PLOTS, PLOT, plotId, plotAt, ownerOf, nameOf, on, TIME } from 'ronin-engine/sim/index.js';
import { dominion as D, key, unkey, top, lordName, lordOf, estatesOf, plotsHeld, holdingsOf, settlementAt, lordOfSettlement, nextNeeds, costOf, canPlace, prereq, plan, hire,
  setTax, setLaw, appoint, officeQ, recruit, recruitWhy, armiesOf, menOf, march, orderSquad, disband, claimPlot, plotChanged, worth, gain, activeWars,
  BUILDINGS, TIERS, tierName, LAWS, OFFICES, UNITS, ORDERS } from 'ronin-engine/sim/dominion/index.js';
import { usesLots, lotsOf, lotsTaken } from 'ronin-engine/sim/dominion/build.js';

// ---- prototype 42: the ronin on the world map, holding a few plots, building, growing a settlement, raising men; the realms over years ----
const $ = id => document.getElementById(id);
const L = generateWorld(12345, 0), P = L.player, me = L.actors[P];
const d = () => D(L);
const Z = 6, TZ = 5, cap = s => s[0].toUpperCase() + s.slice(1);
const zname = (x, y) => { const z = zoneAt(L, x, y); return z.name || `${cap(z.biome)} ${x},${y}`; };
const who = id => id === P ? `<span class="mine">${lordName(L, id)} (you)</span>` : lordName(L, id);

// ---- his land: the best 2 × 2 block of plots in a wild zone near where he started (the land lane's claiming, stood in for) ----
function pickHome() {
  let best = null;
  for (let dy = -3; dy <= 3; dy++) for (let dx = -3; dx <= 3; dx++) {
    const z = zoneAt(L, me.at[0] + dx, me.at[1] + dy); if (!z || z.kind !== 'wild' || z.biome === 'sea' || z.biome === 'mountains') continue;
    const T = tilesOf(L, z.x, z.y);
    for (let py = 0; py < PLOTS - 1; py++) for (let px = 0; px < PLOTS - 1; px++) {
      let free = 0; for (let y = py * PLOT; y < (py + 2) * PLOT; y++) for (let x = px * PLOT; x < (px + 2) * PLOT; x++) { const t = TERRAIN[T.t[y * ZONE + x]]; if (t === 'grass' || t === 'field' || t === 'road' || t === 'sand') free++; }
      const score = free + (z.road ? 150 : 0) - (Math.abs(dx) + Math.abs(dy)) * 20;
      if (!best || score > best.score) best = { score, x: z.x, y: z.y, px, py };
    }
  }
  return best;
}
const H = pickHome(), hk = key(H.x, H.y);
for (const [ox, oy] of [[0, 0], [1, 0], [0, 1], [1, 1]]) { const pid = plotId(H.x, H.y, (H.py + oy) * PLOTS + H.px + ox); claimPlot(L, pid, P); plotChanged(L, pid); }
lordOf(L, P);
gain(L, P, 5000);   // the test purse, once, so the page opens with something to build with (the economy lane decides his real income)

// ---- the chronicle: dominion's and war's events in plain words ----
const chron = [];
const zn = z => z ? zname(z[0], z[1]) : 'somewhere';
function say(e) {
  const t = e.type, mine = [e.actor, e.a, e.d, e.winner, e.loser, e.to, e.from].includes(P);
  let s = null;
  switch (t) {
    case 'war.declared': s = `${who(e.a)} declares war on ${who(e.d)}${e.reason !== 'none' ? ` (${e.reason})` : ', without a reason'}`; break;
    case 'war.battle': s = `Battle at ${zn(e.zone)}: ${who(e.winner)} wins${e.a && e.a.lost != null ? `; ${e.a.lost + e.d.lost} fall` : ''}`; break;
    case 'war.taken': s = `${who(e.to)} takes ${e.name || zn(e.zone)}${e.from ? ` from ${who(e.from)}` : ''}`; break;
    case 'war.treaty': s = `Peace: ${who(e.loser)} yields to ${who(e.winner)}${e.cede.length ? `, ceding ${e.cede.length} zone${e.cede.length > 1 ? 's' : ''}` : ''}${e.tribute ? ', with tribute' : ''}${e.hostage ? ', a hostage' : ''}${e.marriage ? ', a marriage' : ''}${e.vassal ? ', and swears fealty' : ''}`; break;
    case 'war.peace': if (e.how !== 'treaty') s = `The war between ${who(e.a)} and ${who(e.d)} ends: ${e.how}`; break;
    case 'war.siege': s = `${who(e.actor)} besieges ${e.name || zn(e.zone)}`; break;
    case 'war.raid': if (e.seized) s = `Outlaws seize ${e.name || zn(e.zone)}`; break;
    case 'dom.tier': if (e.actor === P || TIERS.findIndex(t => t.name === e.to) >= 3 || TIERS.findIndex(t => t.name === e.from) >= 3) s = `${e.name || zn(e.zone)} ${e.grew ? 'grows to' : 'falls to'} a ${e.to}`; break;
    case 'dom.realm': s = e.how === 'rose' ? `${cap(e.name)} rises under ${who(e.actor)}` : `${cap(e.name)} falls apart`; break;
    case 'dom.domain': if (e.how === 'founded' || e.how === 'passed') s = `${e.name} ${e.how === 'founded' ? 'is founded by' : 'passes to'} ${who(e.actor)}`; break;
    case 'dom.succession': s = `${who(e.to)} succeeds ${lordName(L, e.from)}${e.how === 'rose' ? ' (a local family rises)' : e.how === 'escheat' ? ' (no heir: the land goes to his liege)' : ''}`; break;
    case 'dom.uprising': s = `${e.name || zn(e.zone)} rises${e.restored ? ` for ${who(e.to)}` : ` under ${who(e.to)}`}`; break;
    case 'dom.fealty': s = e.liege ? `${who(e.actor)} swears fealty to ${who(e.liege)}` : `${who(e.actor)} breaks with ${who(e.was)}`; break;
    case 'dom.estate': if (e.actor === P) s = `His ${e.plots} plots side by side merge into ${e.name}`; break;
    case 'dom.built': case 'dom.build': if (e.actor === P) s = `${t === 'dom.build' ? 'Work starts on' : 'Finished:'} a ${e.kind}${t === 'dom.build' ? ` (${e.cost} mon)` : ''}`; break;
    case 'dom.recruit': if (e.actor === P) s = `${e.n} ${e.cls} join his host`; break;
    case 'dom.petition': case 'dom.riot': if (e.actor === P) s = `${e.name || zn(e.zone)}: ${t === 'dom.riot' ? 'riots' : 'a petition'} (${e.why || 'unrest'})`; break;
    case 'dom.desert': if (e.actor === P) s = `${e.n} men desert his host (unpaid or hungry)`; break;
    case 'dom.zone': if (e.how === 'prescription' || e.how === 'court') s = `${zn(e.zone)} becomes ${who(e.holder)}'s on paper (${e.how === 'court' ? 'a court confirms him: no witness of the taking is left' : 'held three years with nobody left to claim it'})`; break;
    case 'dom.united': s = `<b>${e.title}.</b> ${who(e.actor)} holds all ${e.provinces} provinces${e.realm ? ` as ${e.realm}` : ''}. The world goes on`; break;
    case 'dom.divided': s = `The one land under ${who(e.actor)} breaks apart after ${e.years} years`; break;
    case 'war.ready': if (e.squads && e.squads.length) s = `Battle at ${zn(e.zone)}: his ${e.squads.length} squad${e.squads.length > 1 ? 's' : ''} wait for his orders`; break;
    case 'dom.crewLeft': if (e.actor === P) s = 'His hired hands walk off: he could not pay them'; break;
  }
  if (!s) return;
  const c = calendar(e.h); chron.unshift(`<div${mine ? ' class="mine"' : ''}><span class="d">Y${c.year} ${c.season.slice(0, 3)} ${c.dayOfSeason}</span>${s}</div>`); if (chron.length > 120) chron.pop();
}
on('*', e => { if (e.type.startsWith('dom.') || e.type.startsWith('war.')) say(e); });
const battles = []; on('war.battle', e => battles.push({ h: e.h, z: e.zone }));

// ---- the world map ----
const map = $('map'), mg = map.getContext('2d'), tip = $('tip');
const BIOME = { sea: '#1d2a33', coast: '#5a5646', plains: '#474e3c', paddy: '#415440', forest: '#2f4033', bamboo: '#3f4a30', marsh: '#3a4234', hills: '#46453a', mountains: '#57564f' };
let view = 'realm';
const hue = id => { let h = 0; for (const c of String(id)) h = (h * 31 + c.charCodeAt(0)) >>> 0; return h % 360; };
const ruler = id => id ? top(L, id) : null;
const col = id => !id ? null : id === P || top(L, id) === P ? '#6ff3e4' : L.actors[id] && d().lords[id]?.outlaw ? '#7a3035' : `hsl(${hue(id)} 42% 46%)`;
function zoneColor(z) {
  if (z.biome === 'sea') return BIOME.sea;
  if (view === 'land') return BIOME[z.biome];
  const k = key(z.x, z.y), zt = d().zt[k];
  if (view === 'realm') { const r = zt && zt.holder ? ruler(zt.holder) : null; if (r) return col(r); const p = d().prov[z.region], pr = p && p.holder ? ruler(p.holder) : null; return pr ? shade(col(pr)) : BIOME[z.biome]; }
  if (view === 'prov') { const p = d().prov[z.region]; const r = p && p.holder ? ruler(p.holder) : null; return r ? shade(col(r)) : BIOME[z.biome]; }
  return BIOME[z.biome];
}
const shade = c => c.startsWith('hsl') ? c.replace(/(\d+)%\)$/, '30%)') : c === '#6ff3e4' ? '#2f6f68' : '#4a2427';
const TIERC = ['#8a8f8c', '#b8b39a', '#d9c9a0', '#f1ede2', '#ffffff', '#6ff3e4'];
function draw() {
  mg.fillStyle = BIOME.sea; mg.fillRect(0, 0, 600, 600);
  for (const z of L.zones) { mg.fillStyle = zoneColor(z); mg.fillRect(z.x * Z, z.y * Z, Z, Z); }
  // realm borders in realm view: a dark line between zones of different rulers
  for (const s of Object.values(d().set)) {
    const t = s.tier, sz = t < 0 ? 2 : [2, 2, 3, 4, 4, 5][t];
    if (view === 'tier' || t >= 2 || view !== 'land') { mg.fillStyle = '#0b0d0e'; mg.fillRect(s.x * Z + (Z - sz) / 2 - 1, s.y * Z + (Z - sz) / 2 - 1, sz + 2, sz + 2); mg.fillStyle = t < 0 ? '#5a5f5c' : TIERC[t]; mg.fillRect(s.x * Z + (Z - sz) / 2, s.y * Z + (Z - sz) / 2, sz, sz); }
  }
  if ($('armies').checked) for (const a of Object.values(d().armies)) { const n = menOf(a); if (n < 5 && a.lord !== P) continue; const war = !!a.go || !!a.siege;
    const s = n > 300 ? 4 : n > 80 ? 3 : 2; mg.fillStyle = a.lord === P ? '#6ff3e4' : war ? '#ff6b6b' : '#e8ece9'; mg.fillRect(a.at[0] * Z + Z - s, a.at[1] * Z, s, s); }
  for (const b of battles) if (L.hour - b.h < 24 * 28) { const x = b.z[0] * Z + 3, y = b.z[1] * Z + 3; mg.strokeStyle = '#ff6b6b'; mg.lineWidth = 1.5; mg.beginPath(); mg.moveTo(x - 4, y - 4); mg.lineTo(x + 4, y + 4); mg.moveTo(x + 4, y - 4); mg.lineTo(x - 4, y + 4); mg.stroke(); }
  mg.strokeStyle = '#6ff3e4'; mg.lineWidth = 2; mg.strokeRect(H.x * Z - 3, H.y * Z - 3, Z + 6, Z + 6);
  legend();
}
function legend() {
  const items = view === 'realm' ? [['#6ff3e4', 'yours'], ['hsl(40 42% 46%)', 'each ruler (with his vassals) his own colour; darker: the rest of a province he holds'], ['#7a3035', 'outlaws'], [BIOME.plains, 'nobody\'s']]
    : view === 'prov' ? [['hsl(200 42% 30%)', 'a province, coloured by its holder\'s ruler'], [BIOME.plains, 'no one holds it']]
    : view === 'tier' ? TIERS.map((t, i) => [TIERC[i], t.name]) : Object.entries(BIOME).map(([k, c]) => [c, k]);
  $('legend').innerHTML = items.concat([['#ff6b6b', 'an army on campaign, a battle this month'], ['#e8ece9', 'an army at rest']]).map(([c, t]) => `<span class="row"><span class="sw" style="background:${c}"></span>${t}</span>`).join('');
}
map.addEventListener('mousemove', e => { const r = map.getBoundingClientRect(), k = 600 / r.width, x = Math.floor((e.clientX - r.left) * k / Z), y = Math.floor((e.clientY - r.top) * k / Z), z = zoneAt(L, x, y);
  if (!z || z.biome === 'sea') { tip.hidden = true; return; }
  const zt = d().zt[key(x, y)], s = d().set[key(x, y)], reg = L.regions[z.region], p = d().prov[z.region];
  tip.innerHTML = `<b>${zname(x, y)}</b> · ${x}, ${y}${s ? `<br>${cap(tierName(s.tier))}, ${s.pop} people` : ''}${zt ? `<br>Title: ${who(zt.title)}<br>Held by: ${who(zt.holder)}` : ''}<br>Province of ${reg.name}${p && p.holder ? `, held by ${who(p.holder)}` : ', no one holds it'}`;
  tip.hidden = false; tip.style.left = Math.min(e.clientX - r.left + 14, r.width - 290) + 'px'; tip.style.top = Math.min(e.clientY - r.top + 14, r.height - 120) + 'px'; });
map.addEventListener('mouseleave', () => tip.hidden = true);
for (const el of document.querySelectorAll('input[name=view]')) el.addEventListener('change', () => { view = el.value; draw(); });
$('armies').addEventListener('change', draw);

// ---- his zone: tiles, his plots, buildings; pick a building and click to place it ----
const zc = $('zone'), zg = zc.getContext('2d');
const TILE = { grass: '#5f6a4c', field: '#857750', paddy: '#557a5e', forest: '#2e4633', bamboo: '#4f5f35', water: '#27404c', rock: '#6b6961', sand: '#958a69', road: '#a8966e', building: '#2a2624', marsh: '#465040', shrine: '#b5484e', palisade: '#5a3b2c', wall: '#8a8a86' };
const FAM = { home: '#c9b58a', food: '#8fbf7a', craft: '#b08a6a', trade: '#d9c9a0', faith: '#c96a6a', order: '#9aa3c9', war: '#8a8f99' };
let pick = 'hut', hover = null;
function drawZone() {
  const T = tilesOf(L, H.x, H.y), s = settlementAt(L, H.x, H.y);
  for (let y = 0; y < ZONE; y++) for (let x = 0; x < ZONE; x++) { zg.fillStyle = TILE[TERRAIN[T.t[y * ZONE + x]]]; zg.fillRect(x * TZ, y * TZ, TZ, TZ); }
  for (let n = 0; n < 16; n++) { const px = (n % PLOTS) * PLOT * TZ, py = Math.floor(n / PLOTS) * PLOT * TZ, o = ownerOf(L, plotId(H.x, H.y, n)), mine = o.holder === P;
    if (!mine) { zg.fillStyle = '#0b0d0e66'; zg.fillRect(px, py, PLOT * TZ, PLOT * TZ); }
    zg.strokeStyle = mine ? '#6ff3e4' : '#0b0d0e99'; zg.lineWidth = 1; zg.strokeRect(px + .5, py + .5, PLOT * TZ - 1, PLOT * TZ - 1); }
  if (s) for (const id of s.b) { const b = d().bld[id], B = BUILDINGS[b.t];
    if (B.w === 'ring') { zg.strokeStyle = b.st === 'up' ? '#8a8f99' : '#8a8f9966'; zg.lineWidth = 2; const c = (H.px + 1) * PLOT * TZ, rr = PLOT * TZ * .95; zg.beginPath(); zg.arc((H.px + 1) * PLOT * TZ, (H.py + 1) * PLOT * TZ, rr, 0, 7); zg.stroke(); void c; continue; }
    if (!b.at) continue;
    zg.globalAlpha = b.st === 'up' ? 1 : .35 + .5 * b.done / b.labour; zg.fillStyle = b.st === 'ruin' ? '#3a2a26' : FAM[B.fam]; zg.fillRect(b.at[0] * TZ, b.at[1] * TZ, B.w * TZ, B.h * TZ); zg.globalAlpha = 1;
    zg.strokeStyle = '#0b0d0e'; zg.strokeRect(b.at[0] * TZ + .5, b.at[1] * TZ + .5, B.w * TZ - 1, B.h * TZ - 1); }
  if (usesLots(L, s, P)) { const taken = lotsTaken(L, s);   // a town he did not found: its set lots (he picks what, never where)
    lotsOf(L, H.x, H.y).forEach((l, i) => { zg.strokeStyle = taken.has(i) ? '#0b0d0e88' : '#d9c9a0aa'; zg.setLineDash([2, 2]); zg.strokeRect(l.x * TZ + .5, l.y * TZ + .5, l.w * TZ - 1, l.h * TZ - 1); zg.setLineDash([]); }); }
  if (hover && BUILDINGS[pick].w !== 'ring') { const B = BUILDINGS[pick], ok = !canPlace(L, P, pick, H.x, H.y, hover[0], hover[1]);
    zg.fillStyle = ok ? '#6ff3e455' : '#e0737a55'; zg.fillRect(hover[0] * TZ, hover[1] * TZ, B.w * TZ, B.h * TZ); zg.strokeStyle = ok ? '#6ff3e4' : '#e0737a'; zg.strokeRect(hover[0] * TZ + .5, hover[1] * TZ + .5, B.w * TZ - 1, B.h * TZ - 1); }
}
const tileFrom = e => { const r = zc.getBoundingClientRect(), k = 320 / r.width; return [Math.floor((e.clientX - r.left) * k / TZ), Math.floor((e.clientY - r.top) * k / TZ)]; };
zc.addEventListener('mousemove', e => { hover = tileFrom(e); const why = BUILDINGS[pick].w === 'ring' ? null : canPlace(L, P, pick, H.x, H.y, ...hover); $('zhint').textContent = why ? `${cap(pick)} here: ${why}.` : `${cap(pick)}: click to build here.`; drawZone(); });
zc.addEventListener('mouseleave', () => { hover = null; drawZone(); });
zc.addEventListener('click', e => place(...tileFrom(e)));
function place(tx, ty) {
  const res = plan(L, P, pick, H.x, H.y, tx, ty);
  if (res.error) { $('zhint').innerHTML = `<span class="bad">${cap(pick)}: ${res.error}.</span>`; return; }
  hire(L, res.id, +$('crew').value); refresh();
}

function buildList() {
  const s = settlementAt(L, H.x, H.y), z = zoneAt(L, H.x, H.y), fams = {};
  for (const [t, B] of Object.entries(BUILDINGS)) (fams[B.fam] || (fams[B.fam] = [])).push(t);
  $('blist').innerHTML = Object.entries(fams).map(([f, ts]) => `<div class="fam">${f}</div>` + ts.map(t => { const B = BUILDINGS[t], why = prereq(L, s, t, z), cost = costOf(L, t, hk);
    return `<button type="button" class="b${t === pick ? ' sel' : ''}" data-t="${t}"><span class="n">${t}</span><span class="c">${cost} mon · ${B.labour} labour-days${B.w === 'ring' ? ' · round the settlement' : ` · ${B.w}×${B.h}`}</span>${why ? `<span class="why">${cap(why)}</span>` : worth(me) < cost ? '<span class="why">Not enough money</span>' : ''}</button>`; }).join('')).join('');
  for (const b of $('blist').querySelectorAll('button')) b.addEventListener('click', () => { pick = b.dataset.t; if (BUILDINGS[pick].w === 'ring') place(0, 0); buildList(); drawZone(); });
}

// ---- his settlement, his works, his rule, his host ----
function settlePanel() {
  const s = settlementAt(L, H.x, H.y), es = estatesOf(L, P)[0], hd = holdingsOf(L, P);
  $('hname').textContent = es ? es.name : 'His land';
  $('hsub').innerHTML = `${plotsHeld(L, P).length} plots in ${zname(H.x, H.y)}, near ${zname(...me.at)}. Rank: <b>${hd.rank}</b>${hd.koku ? `, ${hd.koku} koku` : ''}. The plots were claimed for him here as a stand-in for the land lane's claiming.`;
  if (!s) { $('settle').innerHTML = '<h3>No settlement yet</h3><p class="note">A settlement starts with its first home. A hut is the cheapest.</p>'; return; }
  const nx = nextNeeds(L, s);
  $('settle').innerHTML = `<h3>${cap(tierName(s.tier))}</h3><div class="tier">${TIERS.map((t, i) => `<span class="${i <= s.tier ? 'lit' : ''}" title="${t.name}"></span>`).join('')}</div>
    <dl><dt>People</dt><dd>${s.pop} of room for ${s.cap}</dd><dt>Homes</dt><dd>${s.homes}</dd><dt>Unrest</dt><dd class="${s.unrest > .5 ? 'bad' : s.unrest > .3 ? 'warn' : 'good'}">${Math.round(s.unrest * 100)}%</dd>
    <dt>Yield</dt><dd>${Math.round(s.yield)} koku a year</dd><dt>Can recruit</dt><dd>${Object.entries(s.pool).filter(([, n]) => n > 0).map(([c, n]) => `${n} ${c}`).join(', ') || 'nobody yet'}</dd></dl>
    ${nx ? `<p class="note">For a <b>${nx.tier}</b>: ${nx.needs.join(', ') || 'the next season will tell'}.</p>` : ''}`;
  const mine = s.b.map(id => d().bld[id]).filter(b => b.st !== 'up' && b.owner === P);
  $('work').innerHTML = mine.length ? `<h3>Being built</h3>` + mine.map(b => `<div><div class="row"><span>${b.t}</span><span class="stat" style="margin-left:auto">${Math.floor(b.done)}/${b.labour} days · ${b.crew} hands</span>
    <button type="button" data-h="${b.id}" data-n="-2" aria-label="Fewer hands">−</button><button type="button" data-h="${b.id}" data-n="2" aria-label="More hands">+</button></div><div class="prog"><i style="width:${100 * b.done / b.labour}%"></i></div></div>`).join('') : '';
  for (const btn of $('work').querySelectorAll('button')) btn.addEventListener('click', () => { const b = d().bld[btn.dataset.h]; hire(L, b.id, b.crew + +btn.dataset.n); settlePanel(); });
}
// people who could serve him: grown folk of the village he started by (dominion's candidates() takes people living on his land; he has none yet)
const helpers = Object.values(L.actors).filter(a => a.alive && a.home && a.home[0] === me.at[0] && a.home[1] === me.at[1] && a.job !== 'lord' && (L.hour - a.born) / (TIME.HOURS_PER_DAY * 112) >= 16).slice(0, 8);
function governPanel() {
  const l = lordOf(L, P);
  $('govern').innerHTML = `<h3>Rule</h3>
    <label for="tax" class="stat">Tax on his land: <b id="taxv">${Math.round(l.tax * 100)}%</b></label><input type="range" id="tax" min="10" max="70" step="5" value="${Math.round(l.tax * 100)}">
    <div class="list">${Object.entries(LAWS).map(([k, w]) => `<label for="law-${k}" class="stat"><input type="checkbox" id="law-${k}" data-law="${k}" ${l.laws[k] ? 'checked' : ''}> ${cap(w.name)}</label>`).join('')}</div>
    <h3>Offices</h3>${OFFICES.map(o => `<label for="off-${o}" class="stat" style="display:grid;gap:2px">${cap(o)}<select id="off-${o}" data-off="${o}"><option value="">nobody</option>${helpers.map(a => { const q = officeQ(L, a, o);
      return `<option value="${a.id}" ${l.off[o] === a.id ? 'selected' : ''}>${nameOf(a)} · wits ${Math.round(a.int * 100)} · ${Math.round(q.q * 100)}%${q.honest ? '' : ' · dishonest'}</option>`; }).join('')}</select></label>`).join('')}
    <p class="note">Wits (intelligence) decide how well; traits decide whether they are honest.</p>`;
  $('tax').addEventListener('input', e => { setTax(L, P, e.target.value / 100); $('taxv').textContent = e.target.value + '%'; });
  for (const c of $('govern').querySelectorAll('[data-law]')) c.addEventListener('change', () => setLaw(L, P, c.dataset.law, c.checked));
  for (const c of $('govern').querySelectorAll('[data-off]')) c.addEventListener('change', () => appoint(L, P, c.dataset.off, c.value || null));
}
const inn = () => Object.values(d().set).filter(s => s.pool.ronin > 0 && !recruitWhy(L, P, 'ronin', s.k)).sort((a, b) => Math.hypot(a.x - H.x, a.y - H.y) - Math.hypot(b.x - H.x, b.y - H.y))[0];
function armyPanel() {
  const s = settlementAt(L, H.x, H.y), town = inn(), as = armiesOf(L, P);
  const a1 = s ? recruitWhy(L, P, 'ashigaru', hk) : 'no settlement yet', r1 = town ? null : 'no paid swords within reach';
  $('army').innerHTML = `<h3>His host</h3>
    <div class="bar"><button type="button" id="r-ash" ${a1 ? 'disabled' : ''}>Raise 5 ashigaru</button><button type="button" id="r-ron" ${r1 ? 'disabled' : ''}>Hire 3 ronin${town ? ` at ${town.name || zname(town.x, town.y)}` : ''}</button></div>
    <p class="note">${a1 ? `Ashigaru: ${a1}.` : `Ashigaru cost ${UNITS.ashigaru.cost} mon each, ${UNITS.ashigaru.wage} mon a day.`} Ronin: ${UNITS.ronin.cost} mon each, ${UNITS.ronin.wage} a day.</p>
    ${as.map(a => `<div class="box" style="padding:10px"><div class="row"><b>${a.name}</b><span class="stat" style="margin-left:auto">${menOf(a)} men at ${zname(...a.at)}${a.go ? ' (marching)' : ''}</span></div>
      <div class="stat">Morale ${Math.round(a.morale * 100)}% · ${a.unpaid ? `<span class="bad">unpaid ${a.unpaid} days</span>` : 'paid'} · ${a.sq.reduce((t, q) => t + q.n * UNITS[q.cls].wage, 0)} mon a day</div>
      ${a.sq.map((q, i) => `<div class="row stat">${q.n} ${q.cls} · trained ${Math.round(q.tr * 100)}% · kit ${Math.round(q.eq * 100)}%<select data-a="${a.id}" data-i="${i}" aria-label="Order" style="margin-left:auto">${ORDERS.map(o => `<option ${q.order === o ? 'selected' : ''}>${o}</option>`).join('')}</select></div>`).join('')}
      <div class="bar">${key(...a.at) !== hk ? `<button type="button" data-home="${a.id}">March home</button>` : ''}<button type="button" data-dis="${a.id}">Disband</button></div></div>`).join('') || '<p class="note">No men yet.</p>'}
    <p class="note">Each squad its own order (hold, charge, follow, fall back), kept until changed. In a battle he is at he gives them in a slowed moment; in the ledger a charge hits harder and bleeds more (×1.25, losses ×1.5), a fall back is spared (×0.5, losses ×0.4), follow counts only where he stands (×1.15), hold is as before.</p>`;
  $('r-ash').addEventListener('click', () => { const r = recruit(L, P, 'ashigaru', 5, hk); if (r.error) alertNote(r.error); a1Home(r); refresh(); });
  $('r-ron').addEventListener('click', () => { const r = recruit(L, P, 'ronin', 3, town.k); if (r.error) alertNote(r.error); else r.home = hk; refresh(); });
  for (const b of $('army').querySelectorAll('[data-home]')) b.addEventListener('click', () => { march(L, b.dataset.home, [H.x, H.y], 'march'); refresh(); });
  for (const b of $('army').querySelectorAll('[data-dis]')) b.addEventListener('click', () => { disband(L, b.dataset.dis); refresh(); });
  for (const c of $('army').querySelectorAll('select[data-a]')) c.addEventListener('change', () => orderSquad(L, c.dataset.a, +c.dataset.i, c.value));
}
const a1Home = r => { if (r && !r.error) r.home = hk; };
const alertNote = msg => { chron.unshift(`<div class="bad">${msg}</div>`); };

// ---- the great lords and the wars ----
function lordsPanel() {
  const rulers = Object.values(d().lords).filter(l => !l.gone && !l.liege && !l.outlaw && L.actors[l.id].alive && l.zones.length).sort((a, b) => b.kokuAll - a.kokuAll).slice(0, 10);
  $('lords').innerHTML = `<table><tr><th></th><th>Ruler</th><th>Koku</th><th>Zones</th><th>Vassals</th><th>Men</th></tr>${rulers.map(l => { const h = holdingsOf(L, l.id);
    const men = Object.values(d().armies).filter(a => top(L, a.lord) === l.id).reduce((t, a) => t + menOf(a), 0), vass = Object.values(d().lords).filter(x => x.liege === l.id && !x.gone).length;
    return `<tr><td><span class="sw" style="background:${col(l.id)}"></span></td><td>${who(l.id)}<br><span class="stat">${h.realm ? cap(h.realm.name) : cap(h.rank)}</span></td><td>${Math.round(l.kokuAll).toLocaleString()}</td><td>${l.zones.length}</td><td>${vass}</td><td>${men}</td></tr>`; }).join('')}</table>`;
  const ws = activeWars(L);
  $('wars').innerHTML = ws.length ? ws.map(w => `<div>${who(w.a)} against ${who(w.d)} <span class="stat">(${w.reason}, score ${Math.round(w.score)}, ${w.battles.length} battles, ${w.taken.length} taken)</span></div>`).join('') : '<p class="note">The land is at peace.</p>';
}

// ---- time ----
function status() {
  const c = calendar(L.hour), hd = holdingsOf(L, P), m = me.money, rulers = Object.values(d().lords).filter(l => !l.gone && !l.liege && !l.outlaw && L.actors[l.id].alive && l.zones.length).length;
  $('date').textContent = `Year ${c.year}, ${c.season} ${c.dayOfSeason}`;
  $('purse').innerHTML = `Purse <b>${m.ryo} ryō ${m.mon} mon</b>`;
  $('rank').innerHTML = `Rank <b>${hd.rank}</b>`;
  $('world').innerHTML = `<b>${rulers}</b> rulers · <b>${Object.keys(d().realms).length}</b> realms · <b>${activeWars(L).length}</b> wars${d().united ? ` · <b>one land</b> under ${who(d().united.ruler)}` : ''}`;
}
function refresh() { status(); draw(); drawZone(); settlePanel(); buildList(); governPanel(); armyPanel(); lordsPanel(); $('chron').innerHTML = chron.join('') || '<div>Nothing yet.</div>'; }
const days = n => { advance(L, n * 24); refresh(); };
$('t-day').addEventListener('click', () => days(1)); $('t-season').addEventListener('click', () => days(28)); $('t-year').addEventListener('click', () => days(112));
let running = null;
function runSeasons(n, btn) {
  if (running) { clearTimeout(running.t); running = null; $('t-play').textContent = 'Play'; $('t-play').classList.remove('on'); if (btn === $('t-play')) return; }
  let left = n; const step = () => { advance(L, 28 * 24); refresh(); if (--left > 0) running = { t: setTimeout(step, 60) }; else { running = null; $('t-play').textContent = 'Play'; $('t-play').classList.remove('on'); } };
  if (btn === $('t-play')) { $('t-play').textContent = 'Pause'; $('t-play').classList.add('on'); }
  step();
}
$('t-5').addEventListener('click', () => runSeasons(20, $('t-5'))); $('t-play').addEventListener('click', () => runSeasons(400, $('t-play')));
$('gift').addEventListener('click', () => { gain(L, P, 5000); refresh(); });
refresh();
window.__world = () => L;
// a hook for scripts/check-style smoke tests: pick a building and try every tile until it stands (never used by the page itself)
window.__proto = { build(t) { pick = t; for (let y = 0; y < ZONE; y++) for (let x = 0; x < ZONE; x++) if (!canPlace(L, P, t, H.x, H.y, x, y)) { place(x, y); return true; } if (BUILDINGS[t].w === 'ring') { place(0, 0); return true; } return false; }, days };
