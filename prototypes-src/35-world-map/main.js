import { generateWorld, zoneAt, tilesOf, TERRAIN, ZONE, PLOTS, PLOT, plotId, plotAt, ownerOf, nameOf, ageOf, calendar, KINDS } from '../../src/sim/index.js';

// ---- the world map: every zone, drawn from the ledger; a zone opened into its tiles and plots ----
const Z = 6;   // px per zone on the map
const BIOME = { sea: '#1d2a33', coast: '#8d8466', plains: '#6f7a58', paddy: '#5f7f55', forest: '#3c5440', bamboo: '#5c6e3c', marsh: '#4f5a44', hills: '#666350', mountains: '#7e7c73' };
const TILE = { grass: '#6f7a58', field: '#9a8a5a', paddy: '#5f8a6a', forest: '#34503a', bamboo: '#5c6e3c', water: '#27404c', rock: '#77756c', sand: '#a89a74',
  road: '#b9a57a', building: '#2a2624', marsh: '#4f5a44', shrine: '#b5484e', palisade: '#5a3b2c', wall: '#8a8a86' };
const PLACE = { town: ['#f1ede2', 4], village: ['#d9c9a0', 3], camp: ['#d8525a', 3], fort: ['#a7aba8', 4], shrine: ['#c34a50', 2] };
const $ = id => document.getElementById(id);
const map = $('map'), mg = map.getContext('2d'), zc = $('zone'), zg = zc.getContext('2d'), tip = $('tip');
let L = null, view = 'land', sel = null, selPlot = null;

function make(seed) {
  L = generateWorld(seed, 0); sel = null; selPlot = null;
  draw(); summary(); cultures(null); zonePanel();
  const p = L.actors[L.player]; openZone(p.at[0], p.at[1]);
}
const hsl = (h, s, l) => `hsl(${h} ${s}% ${l}%)`;
const cultOf = z => z.region >= 0 ? L.cultures[L.regions[z.region].culture] : null;
function zoneColor(z) {
  if (z.biome === 'sea') return BIOME.sea;
  if (view === 'land') return BIOME[z.biome];
  if (view === 'culture') { const c = cultOf(z); return hsl(c.hue, 28, 30 + (z.biome === 'mountains' ? 10 : z.biome === 'hills' ? 5 : 0)); }
  if (view === 'region') { const h = (z.region * 97) % 360; return hsl(h, 22, 32); }
  // who holds it: settled land is its lord's (the culture's colour, brighter), camps held by outlaws, the rest nature
  if (z.kind === 'camp') return '#7a3035';
  if (z.kind === 'town' || z.kind === 'village' || z.kind === 'fort') return hsl(cultOf(z).hue, 40, 46);
  return z.kind === 'shrine' ? '#5a4a52' : '#2c3230';
}
function draw() {
  const { w, h } = L.size;
  mg.fillStyle = BIOME.sea; mg.fillRect(0, 0, map.width, map.height);
  for (const z of L.zones) { mg.fillStyle = zoneColor(z); mg.fillRect(z.x * Z, z.y * Z, Z, Z); }
  // region borders: a dark line where one region meets another, a brighter one between cultures
  for (const z of L.zones) { if (z.region < 0) continue;
    for (const [dx, dy] of [[1, 0], [0, 1]]) { const n = zoneAt(L, z.x + dx, z.y + dy); if (!n || n.region < 0 || n.region === z.region) continue;
      const cross = L.regions[n.region].culture !== L.regions[z.region].culture;
      mg.fillStyle = cross ? '#0b0d0ecc' : '#0b0d0e55';
      if (dx) mg.fillRect(z.x * Z + Z - (cross ? 1 : 0), z.y * Z, cross ? 2 : 1, Z); else mg.fillRect(z.x * Z, z.y * Z + Z - (cross ? 1 : 0), Z, cross ? 2 : 1); } }
  if ($('roads').checked) { mg.fillStyle = '#d7c496';
    for (const z of L.zones) { if (!z.road) continue; const cx = z.x * Z + Z / 2 - 1, cy = z.y * Z + Z / 2 - 1; mg.fillRect(cx, cy, 2, 2);
      for (const [dx, dy] of [[1, 0], [0, 1]]) { const n = zoneAt(L, z.x + dx, z.y + dy); if (n && n.road) mg.fillRect(cx, cy, dx ? Z + 2 : 2, dy ? Z + 2 : 2); } } }
  if ($('places').checked) for (const z of L.zones) { const pl = PLACE[z.kind]; if (!pl) continue; const [c, s] = pl, x = z.x * Z + (Z - s) / 2, y = z.y * Z + (Z - s) / 2;
    mg.fillStyle = '#0b0d0e'; mg.fillRect(x - 1, y - 1, s + 2, s + 2); mg.fillStyle = c; mg.fillRect(x, y, s, s); }
  const p = L.actors[L.player]; mg.strokeStyle = '#6ff3e4'; mg.lineWidth = 2; mg.strokeRect(p.at[0] * Z - 3, p.at[1] * Z - 3, Z + 6, Z + 6);
  if (sel) { mg.strokeStyle = '#ffffff'; mg.lineWidth = 1; mg.strokeRect(sel.x * Z - .5, sel.y * Z - .5, Z + 1, Z + 1); }
  legend();
}
function legend() {
  const items = view === 'land' ? Object.entries(BIOME).map(([k, c]) => [c, k]) : view === 'owner'
    ? [[hsl(200, 40, 46), 'a lord\'s land (the culture\'s colour)'], ['#7a3035', 'held by outlaws, owned by nobody'], ['#2c3230', 'nature: nobody, claimable'], ['#5a4a52', 'shrine ground']]
    : view === 'culture' ? [['#888', 'each culture its own colour; the bright lines are where cultures meet']] : [['#888', 'each of the 100 regions its own colour']];
  $('legend').innerHTML = [...items, ...Object.entries(PLACE).map(([k, [c]]) => [c, k]), ['#6ff3e4', 'the ronin']].map(([c, t]) => `<span class="row"><span class="sw" style="background:${c}"></span>${t}</span>`).join('');
}
function describe(z) {
  if (z.biome === 'sea') return 'Sea';
  const reg = L.regions[z.region], c = L.cultures[reg.culture];
  return `<b>${z.name || cap(z.kind === 'wild' ? z.biome : z.kind)}</b> · ${z.x}, ${z.y}<br>${cap(z.biome)}${z.road ? ', on a road' : ''}<br>Region: ${reg.name}<br>${cap(c.name)} (${KINDS[c.kind].label})`;
}
const cap = s => s[0].toUpperCase() + s.slice(1);
function summary() {
  const land = L.zones.filter(z => z.biome !== 'sea').length, people = Object.values(L.actors).filter(a => a.alive).length, count = k => L.zones.filter(z => z.kind === k).length;
  const cal = calendar(L.hour), p = L.actors[L.player], start = zoneAt(L, ...p.at);
  $('summary').innerHTML = `<h3>This world · seed ${L.seed}</h3><dl>
    <dt>Zones</dt><dd>10,000 (${land.toLocaleString()} land, ${(10000 - land).toLocaleString()} sea)</dd>
    <dt>Regions</dt><dd>100, in ${L.cultures.length} cultures</dd>
    <dt>Settlements</dt><dd>${count('town')} towns, ${count('village')} villages, ${count('fort')} forts, ${count('shrine')} shrines</dd>
    <dt>Outlaw camps</dt><dd>${count('camp')}</dd>
    <dt>Roads</dt><dd>${L.zones.filter(z => z.road).length} zones</dd>
    <dt>People</dt><dd>${people.toLocaleString()}</dd>
    <dt>The ronin</dt><dd>${nameOf(p)}, ${Math.floor(ageOf(L, p))}, near ${start.name || 'the road'}, ${p.money.mon} mon</dd>
    <dt>Date</dt><dd>Day ${cal.dayOfSeason} of ${cal.season}, year ${cal.year}</dd></dl>`;
}
function cultures(focus) {
  const rows = L.cultures.map(c => `<div class="row"><span class="sw" style="background:${hsl(c.hue, 28, 38)}"></span><span>${cap(c.name)}</span><span class="rel" style="color:var(--muted)">${KINDS[c.kind].label}, ${c.regions.length}</span></div>`).join('');
  let rel = '';
  if (focus) { const others = L.cultures.filter(o => o.id !== focus.id).map(o => [o, focus.relations[o.id]]).sort((a, b) => a[1] - b[1]);
    const fmt = ([o, v]) => `<div class="row"><span class="sw" style="background:${hsl(o.hue, 28, 38)}"></span><span>${cap(o.name)}</span><span class="rel ${v < 0 ? 'neg' : 'pos'}">${v > 0 ? '+' : ''}${v.toFixed(2)}</span></div>`;
    rel = `<h3>${cap(focus.name)}: hate most</h3><div class="list">${others.slice(0, 5).map(fmt).join('')}</div><h3>Friendliest with</h3><div class="list">${others.slice(-4).reverse().map(fmt).join('')}</div>
      <p>${cap(KINDS[focus.kind].label)}: ${KINDS[focus.kind].classes.map(([c]) => c).join(', ')}. Common among them: ${KINDS[focus.kind].traits.join(', ')}. They cannot stand: ${KINDS[focus.kind].despise.join(', ')}.</p>`; }
  $('culturepanel').innerHTML = `${rel}<h3>The ${L.cultures.length} cultures</h3><div class="list">${rows}</div>`;
}
// ---- a zone: its tiles, its 16 plots and who holds each ----
const TZ = 5;   // px per tile in the zone view
function openZone(x, y) {
  const z = zoneAt(L, x, y); if (!z || z.biome === 'sea') return;
  sel = z; selPlot = null; draw(); drawZone(); zonePanel(); cultures(cultOf(z));
}
function drawZone() {
  const z = sel, T = tilesOf(L, z.x, z.y);
  for (let y = 0; y < ZONE; y++) for (let x = 0; x < ZONE; x++) { zg.fillStyle = TILE[TERRAIN[T.t[y * ZONE + x]]]; zg.fillRect(x * TZ, y * TZ, TZ, TZ); }
  for (let n = 0; n < PLOTS * PLOTS; n++) { const px = (n % PLOTS) * PLOT * TZ, py = Math.floor(n / PLOTS) * PLOT * TZ, o = ownerOf(L, plotId(z.x, z.y, n));
    zg.strokeStyle = n === selPlot ? '#ffffff' : '#0b0d0e99'; zg.lineWidth = n === selPlot ? 2 : 1; zg.strokeRect(px + .5, py + .5, PLOT * TZ - 1, PLOT * TZ - 1);
    // a small mark in the corner: amber owned on paper, red held without title, none for nature
    if (o.title || o.holder) { zg.fillStyle = o.title ? '#e2c26b' : '#d8525a'; zg.fillRect(px + 3, py + 3, 4, 4); } }
}
function who(id) {
  if (!id) return null; const a = L.actors[id]; if (!a) return id;
  return `${nameOf(a)}, ${Math.floor(ageOf(L, a))}, ${a.cls}${a.job && a.job !== a.cls ? ` (${a.job})` : ''}${a.lord != null ? `, lord of ${L.regions[a.lord].name}` : ''}${a.chief ? ', chief of the camp' : ''}`;
}
function zonePanel() {
  if (!sel) { $('zname').textContent = 'Pick a zone'; $('zsub').textContent = 'Click anywhere on the land.'; $('plot').innerHTML = ''; return; }
  const z = sel, reg = L.regions[z.region], c = L.cultures[reg.culture], people = Object.values(L.actors).filter(a => a.alive && a.home && a.home[0] === z.x && a.home[1] === z.y);
  $('zname').textContent = z.name || cap(z.kind === 'wild' ? z.biome : z.kind);
  $('zsub').innerHTML = `${cap(z.biome)} ${z.kind === 'wild' ? 'wilds' : z.kind} at ${z.x}, ${z.y}, in ${reg.name}, land of ${c.name}. ${people.length ? `${people.length} people live here.` : 'Nobody lives here.'} <b>Click a plot</b> to see who holds it.`;
  if (selPlot == null) { $('plot').innerHTML = `<h3>The 16 plots</h3><p>Each square is a plot of 16 × 16 tiles. An <span style="color:#e2c26b">amber</span> mark: owned on paper and held. <span style="color:#d8525a">Red</span>: held by force, owned by nobody. No mark: nature, claimable.</p>`; return; }
  const id = plotId(z.x, z.y, selPlot), o = ownerOf(L, id), t = who(o.title), hd = who(o.holder);
  const home = o.title && L.actors[o.title], house = home ? Object.values(L.actors).filter(a => a.household === home.household && a.alive) : [];
  $('plot').innerHTML = `<h3>Plot ${id}</h3><dl><dt>Title</dt><dd>${t || 'Nobody: nature'}</dd><dt>Holder</dt><dd>${hd || 'Nobody'}</dd></dl>
    ${!o.title && !o.holder ? '<p>Unowned land. Claimable, by the rules the land session is working out.</p>' : ''}
    ${!o.title && o.holder ? '<p>Held by force: possession without title. A raid took it, and the law has not caught up.</p>' : ''}
    ${house.length > 1 ? `<h3>The household</h3><div class="list">${house.map(a => `<div>${who(a.id)}${a.spouse && a.id !== home.id && a.spouse === home.id ? ' (spouse)' : ''}</div>`).join('')}</div>` : ''}`;
}
// ---- input ----
const zoneFromEvent = e => { const r = map.getBoundingClientRect(), k = map.width / r.width; return [Math.floor((e.clientX - r.left) * k / Z), Math.floor((e.clientY - r.top) * k / Z)]; };
map.addEventListener('mousemove', e => { const [x, y] = zoneFromEvent(e), z = zoneAt(L, x, y); if (!z) { tip.hidden = true; return; }
  tip.innerHTML = describe(z); tip.hidden = false; const r = map.getBoundingClientRect(), bx = e.clientX - r.left, by = e.clientY - r.top;
  tip.style.left = Math.min(bx + 14, r.width - 250) + 'px'; tip.style.top = Math.min(by + 14, r.height - 110) + 'px'; });
map.addEventListener('mouseleave', () => tip.hidden = true);
map.addEventListener('click', e => openZone(...zoneFromEvent(e)));
zc.addEventListener('click', e => { if (!sel) return; const r = zc.getBoundingClientRect(), k = zc.width / r.width, tx = Math.floor((e.clientX - r.left) * k / TZ), ty = Math.floor((e.clientY - r.top) * k / TZ);
  selPlot = Math.floor(ty / PLOT) * PLOTS + Math.floor(tx / PLOT); drawZone(); zonePanel(); });
for (const el of document.querySelectorAll('input[name=view]')) el.addEventListener('change', () => { view = el.value; draw(); });
$('roads').addEventListener('change', draw); $('places').addEventListener('change', draw);
$('gen').addEventListener('click', () => make(+$('seed').value || 1));
$('rand').addEventListener('click', () => { $('seed').value = Math.floor(Math.random() * 1e6); make(+$('seed').value); });
make(+$('seed').value);
window.__world = () => L;
