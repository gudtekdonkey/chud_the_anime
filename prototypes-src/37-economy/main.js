import { generateWorld, advance, calendar, zoneAt, nameOf, TIME } from 'ronin-engine/sim/index.js';
import { GOODS, GOOD, LOAD, MAX_CARRY_KG, worth, weightOf, burden, fmt, regionMarket, garmentPrice, caravanZone, war, atWar, give, buy, exchange,
  deposit, withdraw, accounts, isChanger, moneySupply, economyIndex, daysToHarvest } from 'ronin-engine/sim/economy/index.js';

// ---- prototype 37: the economy living. A world from a seed, lived day by day on the economy system; the page only reads the ledger
// (and, for the ronin's purse, calls the same API the game will) ----
const $ = id => document.getElementById(id);
const Z = 5, W = 100, HIST = 900;
const map = $('map'), mg = map.getContext('2d'), chart = $('chart'), cg = chart.getContext('2d');
let L, E, sel = 0, good = 0, playing = false, hist = [], frame = 0, flash = [];
const cap = s => s[0].toUpperCase() + s.slice(1);
const col = v => getComputedStyle(document.documentElement).getPropertyValue(v).trim();
const C = {}; for (const k of ['ink', 'muted', 'faint', 'rule', 'cyan', 'cheap', 'dear', 'bad', 'good', 'panel']) C[k] = col('--' + k);

for (const [i, g] of GOODS.entries()) $('good').insertAdjacentHTML('beforeend', `<option value="${i}">${g}</option>`);

function make(seed) {
  L = generateWorld(seed, 0); E = L.sys.economy; hist = []; flash = [];
  const p = L.actors[L.player]; sel = zoneAt(L, ...p.at).region;
  record(); for (let i = 0; i < 16; i++) step(7);   // open on a world that has lived a year, so the chart has a history
  flash = [];
  drawAll(true);
}
// the price of every good in every region, kept on the page each tick so the chart can look back
function record() {
  const a = new Float32Array(E.regions.length * GOODS.length);
  E.regions.forEach((R, r) => R.price.forEach((v, g) => a[r * GOODS.length + g] = v));
  hist.push({ h: L.hour, a }); if (hist.length > HIST) hist.shift();
}
function step(days) {
  const before = L.log.length ? L.log[L.log.length - 1] : null;
  advance(L, days * TIME.HOURS_PER_DAY); record();
  for (let i = L.log.length - 1; i >= 0 && L.log[i] !== before; i--) if (L.log[i].type === 'econ.caravan.robbed') flash.push({ z: L.log[i].zone, t: 18 });
}

// ---- the map: each zone coloured by its region's price of the chosen good against its base, cheap blue to dear amber ----
const hex = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
const mix = (a, b, t) => a.map((v, i) => Math.round(v + (b[i] - v) * t));
function priceColor(ratio) {
  const t = Math.max(-1, Math.min(1, Math.log2(ratio) / 2)), mid = hex('#5d6664');
  return t < 0 ? mix(mid, hex(C.cheap), -t) : mix(mid, hex(C.dear), t);
}
function drawMap() {
  const img = mg.createImageData(W * Z, W * Z), d = img.data, rc = E.regions.map(R => priceColor(R.price[good] / GOOD[GOODS[good]].base)), sea = hex('#1a242b');
  for (const z of L.zones) {
    let c = z.region < 0 ? sea : rc[z.region];
    if (z.road && z.region >= 0) c = mix(c, [215, 196, 150], .35);
    for (let y = 0; y < Z; y++) for (let x = 0; x < Z; x++) { const i = ((z.y * Z + y) * W * Z + z.x * Z + x) * 4; d[i] = c[0]; d[i + 1] = c[1]; d[i + 2] = c[2]; d[i + 3] = 255; }
  }
  mg.putImageData(img, 0, 0);
  // region borders; the chosen region's in white
  for (const z of L.zones) { if (z.region < 0) continue;
    for (const [dx, dy] of [[1, 0], [0, 1], [-1, 0], [0, -1]]) { const n = zoneAt(L, z.x + dx, z.y + dy); if (n && n.region === z.region) continue;
      const mine = z.region === sel; if (!mine && (dx < 0 || dy < 0)) continue;
      mg.fillStyle = mine ? '#ffffff' : '#0b0d0e88';
      if (dx) mg.fillRect(z.x * Z + (dx > 0 ? Z - 1 : 0), z.y * Z, 1, Z); else mg.fillRect(z.x * Z, z.y * Z + (dy > 0 ? Z - 1 : 0), Z, 1); } }
  // seats: white; a famine red, a war amber
  for (const g of L.regions) { const R = E.regions[g.id], [x, y] = g.seat;
    mg.fillStyle = '#0b0d0e'; mg.fillRect(x * Z - 1, y * Z - 1, Z + 2, Z + 2);
    mg.fillStyle = R.famine ? C.bad : atWar(L, g.id) ? C.dear : '#f1ede2'; mg.fillRect(x * Z, y * Z, Z, Z); }
  // caravans on the road; a robbery flashes red where it happened
  mg.fillStyle = C.cyan;
  for (const c of E.caravans) { const zi = caravanZone(L, c); mg.fillRect((zi % W) * Z + 1, Math.floor(zi / W) * Z + 1, 3, 3); }
  flash = flash.filter(f => f.t-- > 0);
  for (const f of flash) { mg.strokeStyle = C.bad; mg.globalAlpha = f.t / 18; mg.lineWidth = 1.5; mg.beginPath(); mg.arc(f.z[0] * Z + 2.5, f.z[1] * Z + 2.5, 3 + (18 - f.t) * .5, 0, 7); mg.stroke(); }
  mg.globalAlpha = 1;
  const p = L.actors[L.player]; mg.strokeStyle = C.cyan; mg.lineWidth = 2; mg.strokeRect(p.at[0] * Z - 3, p.at[1] * Z - 3, Z + 6, Z + 6);
  $('legend').innerHTML = `<span>${cap(GOODS[good])}, against its base of ${fmt(GOOD[GOODS[good]].base)} a ${GOOD[GOODS[good]].unit}:</span><span>¼×</span><span class="ramp"></span><span>4×</span>
    <span class="legend"><span class="sw" style="background:${C.cyan}"></span>caravan</span><span class="legend"><span class="sw" style="background:${C.bad}"></span>famine</span>
    <span class="legend"><span class="sw" style="background:${C.dear}"></span>at war</span><span class="legend"><span class="sw" style="border:2px solid ${C.cyan}"></span>the ronin</span>`;
}

// ---- the chosen region's market ----
const num = (v, d = 0) => v >= 1e4 ? Math.round(v).toLocaleString() : v.toFixed(d);
function drawMarket() {
  const reg = L.regions[sel], R = E.regions[sel], cult = L.cultures[reg.culture], m = regionMarket(L, sel);
  $('rname').textContent = `${reg.name}, seat of ${zoneAt(L, ...reg.seat).name || 'a camp'}`;
  const tags = [R.famine && '<span class="pill bad">famine</span>', atWar(L, sel) && '<span class="pill warn">at war</span>', R.unpaid && '<span class="pill warn">soldiers unpaid</span>'].filter(Boolean).join(' ');
  $('rsub').innerHTML = `${cap(cult.name)}. ${R.pop} people; ${Math.round(R.hungry)} short of rice this fortnight. Last harvest ${R.crop ?? '–'} koku (weather ×${R.q}). Guild cash ${fmt(R.guild)}. ${tags}`;
  $('market').innerHTML = `<thead><tr><th>Good</th><th>Price</th><th>vs base</th><th>Stock</th><th>Made a day</th><th>Sold a day</th></tr></thead><tbody>${m.map((r, i) => {
    const t = Math.max(-1, Math.min(1, Math.log2(r.price / r.base) / 2)), w = Math.abs(t) * 50;
    return `<tr class="${i === good ? 'sel' : ''}" data-g="${i}"><td>${r.good} <span class="unit">/ ${r.unit}</span></td><td>${fmt(r.price)}</td>
      <td><span class="cmp"><i style="${t < 0 ? `right:50%;width:${w}%;background:${C.cheap}` : `left:50%;width:${w}%;background:${C.dear}`}"></i></span> ${(r.price / r.base).toFixed(2)}×</td>
      <td>${isFinite(r.days) ? `${Math.round(r.days)} d` : '–'}</td><td>${num(r.made, 2)}</td><td>${num(r.sold, 2)}</td></tr>`; }).join('')}</tbody>`;
  $('silknote').innerHTML = `Colour is rank: only royalty buy coloured silk. A coloured kimono here would cost <b>${fmt(garmentPrice(L, sel, 'kimono'))}</b>, a coloured obi <b>${fmt(garmentPrice(L, sel, 'obi'))}</b>.`;
}
$('market').addEventListener('click', e => { const tr = e.target.closest('tr[data-g]'); if (!tr) return; good = +tr.dataset.g; $('good').value = good; drawAll(); });

// ---- the price chart: this region against the world's mean, the base as a dotted line ----
let chartPts = null;
function drawChart() {
  const w = chart.width, h = chart.height, pad = { l: 70, r: 30, t: 12, b: 26 }, G = GOODS.length, base = GOOD[GOODS[good]].base;
  cg.clearRect(0, 0, w, h);
  $('ctitle').textContent = `${cap(GOODS[good])} in ${L.regions[sel].name}, mon a ${GOOD[GOODS[good]].unit}`;
  if (hist.length < 2) { chartPts = null; return; }
  const mine = hist.map(s => s.a[sel * G + good]), mean = hist.map(s => { let t = 0; for (let r = 0; r < E.regions.length; r++) t += s.a[r * G + good]; return t / E.regions.length; });
  let hi = Math.max(base * 1.2, ...mine, ...mean), lo = 0;
  const step = niceStep(hi / 4); hi = Math.ceil(hi / step) * step;
  const h0 = hist[0].h, h1 = hist[hist.length - 1].h, X = t => pad.l + (t - h0) / Math.max(1, h1 - h0) * (w - pad.l - pad.r), Y = v => pad.t + (1 - (v - lo) / (hi - lo)) * (h - pad.t - pad.b);
  cg.font = '12px Figtree, system-ui, sans-serif'; cg.textBaseline = 'middle';
  for (let v = 0; v <= hi + 1e-9; v += step) { cg.fillStyle = C.rule; cg.fillRect(pad.l, Math.round(Y(v)), w - pad.l - pad.r, 1); cg.fillStyle = C.muted; cg.textAlign = 'right'; cg.fillText(fmt(v), pad.l - 6, Y(v)); }
  // x: a tick each new year (or season, when the chart is short)
  const per = (h1 - h0) > TIME.HOURS_PER_DAY * 112 * 1.5 ? 112 : 28; cg.textAlign = 'center'; cg.textBaseline = 'top';
  for (let d = Math.ceil(h0 / 24 / per) * per; d * 24 <= h1; d += per) { const c = calendar(d * 24); cg.fillStyle = C.muted; if (X(d * 24) > w - 24) continue; cg.fillText(per === 112 ? `year ${c.year}` : `${c.season} ${c.year}`, X(d * 24), h - pad.b + 6); }
  cg.setLineDash([2, 3]); cg.strokeStyle = C.faint; cg.lineWidth = 1; cg.beginPath(); cg.moveTo(pad.l, Y(base)); cg.lineTo(w - pad.r, Y(base)); cg.stroke();
  cg.setLineDash([5, 4]); line(mean, C.muted); cg.setLineDash([]); line(mine, C.cyan);
  function line(arr, c) { cg.strokeStyle = c; cg.lineWidth = 2; cg.lineJoin = 'round'; cg.beginPath(); arr.forEach((v, i) => i ? cg.lineTo(X(hist[i].h), Y(v)) : cg.moveTo(X(hist[i].h), Y(v))); cg.stroke(); }
  const last = hist.length - 1; cg.fillStyle = C.cyan; cg.beginPath(); cg.arc(X(hist[last].h), Y(mine[last]), 3.5, 0, 7); cg.fill();
  chartPts = { X, Y, mine, mean, pad, w, h };
  $('clegend').innerHTML = `<span class="legend"><span class="sw" style="background:${C.cyan}"></span>${L.regions[sel].name}</span><span class="legend"><span class="sw" style="background:${C.muted}"></span>mean of all regions</span><span class="legend"><span class="sw" style="border-top:2px dotted ${C.faint};height:0"></span>base price</span>`;
}
function niceStep(x) { const p = Math.pow(10, Math.floor(Math.log10(x))), f = x / p; return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * p; }
chart.addEventListener('mousemove', e => {
  if (!chartPts) return; const r = chart.getBoundingClientRect(), k = chart.width / r.width, x = (e.clientX - r.left) * k;
  let i = 0, bd = 1e9; hist.forEach((s, j) => { const dx = Math.abs(chartPts.X(s.h) - x); if (dx < bd) { bd = dx; i = j; } });
  drawChart(); cg.fillStyle = C.faint; cg.fillRect(Math.round(chartPts.X(hist[i].h)), chartPts.pad.t, 1, chartPts.h - chartPts.pad.t - chartPts.pad.b);
  const c = calendar(hist[i].h), tip = $('ctip');
  tip.innerHTML = `Day ${c.dayOfSeason} of ${c.season}, year ${c.year}<br><span style="color:${C.cyan}">■</span> ${L.regions[sel].name}: <b>${fmt(chartPts.mine[i])}</b><br><span style="color:${C.muted}">■</span> all regions: <b>${fmt(chartPts.mean[i])}</b>`;
  tip.hidden = false; tip.style.left = Math.min(chartPts.X(hist[i].h) / k + 12, r.width - 220) + 'px'; tip.style.top = '8px';
});
chart.addEventListener('mouseleave', () => { $('ctip').hidden = true; drawChart(); });

// ---- the lord of the region ----
function drawLord() {
  const reg = L.regions[sel], a = reg.lord != null && L.actors[reg.lord], l = a && E.lords[a.id], R = E.regions[sel];
  if (!a || !l) { $('lord').innerHTML = `<p>No lord rules here: the seat is an outlaw camp. Nobody taxes the land; the camps rob the roads instead.</p>`; return; }
  $('lord').innerHTML = `<dl><dt>Lord</dt><dd>${nameOf(a)}, ${a.cls}</dd><dt>Rank</dt><dd><b>${Math.round(l.koku).toLocaleString()} koku</b>, the yield of all his land</dd>
    <dt>Tax this year</dt><dd>${l.taxIn.toFixed(1)} koku${l.taxOut ? `, ${l.taxOut.toFixed(1)} sent up` : ''}</dd><dt>Granary</dt><dd>${l.granary.toFixed(1)} koku, sold through the year</dd>
    <dt>Purse</dt><dd>${fmt(worth(a.money))} (${Math.round(a.money.mon)} mon, ${a.money.ryo} ryō)</dd>
    <dt>His men</dt><dd>${R.unpaid ? '<span class="pill warn">paid short</span>' : '<span class="pill good">paid</span>'}</dd>
    <dt>Next harvest</dt><dd>in ${daysToHarvest(calendar(L.hour))} days</dd></dl>
    <div class="bar"><button type="button" id="war">${atWar(L, sel) ? 'At war' : 'Declare war (60 days)'}</button></div>
    <p class="note">War arms and feeds his men: weapons, horses and rice run short and dear.</p>`;
  $('war').onclick = () => { war(L, sel, 60); drawAll(); };
}

// ---- the ronin's purse: coin has weight (owner, 2026-09-26) ----
function drawPurse() {
  const p = L.actors[L.player], z = zoneAt(L, ...p.at), seat = L.regions[z.region].seat, B = burden(p.money), kg = weightOf(p.money), changer = isChanger(L, ...seat);
  const ticks = LOAD.filter(t => t.upto < 1e6).map(t => `<span style="left:${t.upto / MAX_CARRY_KG * 100}%">${t.upto} kg</span>`).join('');
  const acct = accounts(L, p.id);
  $('purse').innerHTML = `<dl><dt>Carried</dt><dd><b>${Math.round(p.money.mon).toLocaleString()} mon</b> · ${p.money.silver} monme silver · ${p.money.ryo} ryō</dd><dt>Worth</dt><dd>${fmt(worth(p.money))}</dd>
    <dt>Weight</dt><dd>${kg.toFixed(2)} kg: <span class="pill ${B.name === 'light' ? 'good' : B.name === 'laden' ? 'warn' : 'bad'}">${B.name}</span> speed ×${B.speed}${B.dodge ? '' : ', no slide or jump'}</dd>
    <dt>With the changer</dt><dd>${acct.length ? acct.map(x => `${fmt(x.worth)} at ${zoneAt(L, ...x.town).name}`).join(', ') : 'nothing'}</dd></dl>
    <div class="weight" aria-label="Weight of coin carried"><i style="width:${Math.min(100, kg / MAX_CARRY_KG * 100)}%"></i>${LOAD.filter(t => t.upto < 1e6).map(t => `<b style="left:${t.upto / MAX_CARRY_KG * 100}%"></b>`).join('')}</div><div class="ticks">${ticks}</div>
    <div class="bar"><button type="button" id="loot">Loot 800 mon</button><button type="button" id="rice">Buy a koku of rice</button>
      <button type="button" id="chg" ${changer ? '' : 'disabled'}>Change 1,000 mon for gold</button><button type="button" id="dep" ${changer ? '' : 'disabled'}>Bank all copper</button><button type="button" id="wd" ${changer ? '' : 'disabled'}>Take it back</button></div>
    <p class="note" id="pnote">A string of 1,000 mon weighs 3.75 kg; the same worth in gold, 18 g. ${changer ? `The money-changer is in ${zoneAt(L, ...seat).name}: 2% to change coin, 1% to hold it and ½% a season.` : 'No money-changer in this region: its seat is a camp.'}</p>`;
  const note = t => { $('pnote').textContent = t; };
  $('loot').onclick = () => { const ok = give(L, p.id, 800); drawPurse(); drawBooks(); note(ok ? 'Picked up 800 mon from the fallen: coin from outside the ledger, counted as loot.' : 'Too heavy: he cannot carry more coin.'); };
  $('rice').onclick = () => { const c = buy(L, p.id, z.region, 'rice', 1); drawPurse(); drawMarket(); note(c ? `Bought a koku of rice for ${fmt(c)}.` : 'He cannot pay for it, or the market is out of rice.'); };
  $('chg').onclick = () => { const out = exchange(L, p.id, ...seat, 'mon', 1000, 'ryo'); drawPurse(); note(out ? `Changed 1,000 mon of copper (3.75 kg) for ${out} ryō of gold (18 g); the changer kept 20 mon.` : 'He needs 1,000 mon of copper to change.'); };
  $('dep').onclick = () => { const n = Math.floor(p.money.mon); const v = n > 0 && deposit(L, p.id, ...seat, { mon: n }); drawPurse(); note(v ? `Banked ${n} mon; the changer took 1%.` : 'No copper to bank.'); };
  $('wd').onclick = () => { const a = E.banks[seat.join(',')] && E.banks[seat.join(',')][p.id]; const c = a && { mon: Math.floor(a.mon), silver: a.silver, ryo: a.ryo }; const v = c && withdraw(L, p.id, ...seat, c); drawPurse(); note(v === false || !c ? 'Nothing to take back, or too heavy to carry.' : 'Took it all back.'); };
}

// ---- the world's books: where the money sits, and a year's money in and out ----
function drawBooks() {
  const m = moneySupply(L), parts = [['purses', m.purses, C.cyan], ['guilds', m.guild, C.dear], ['temples', m.temple, C.good], ['pools owed to workers', m.pools, C.muted]];
  const tot = parts.reduce((s, [, v]) => s + Math.max(0, v), 0), Y = E.years.slice(-4).reverse(), hungry = E.regions.reduce((s, R) => s + R.hungry, 0);
  $('books').innerHTML = `<p>All the coin in the world: <b>${fmt(m.total)}</b>. ${E.caravans.length} caravans on the road; ${E.regions.filter(R => R.famine).length} regions in famine; ${Math.round(hungry)} people short of rice.</p>
    <div class="stack">${parts.map(([, v, c]) => `<i style="flex:${Math.max(0, v) / tot};background:${c}"></i>`).join('')}</div>
    <div class="legend">${parts.map(([n, v, c]) => `<span class="legend"><span class="sw" style="background:${c}"></span>${n} ${fmt(v)}</span>`).join('')}</div>
    ${Y.length ? `<div class="scroll"><table><thead><tr><th>Year</th><th>Minted</th><th>Looted</th><th>To the gods</th><th>Buried, lost</th><th>All money</th></tr></thead><tbody>${Y.map(y => `<tr><td>${y.year}</td><td>${fmt(y.mint)}</td><td>${fmt(y.loot)}</td><td>${fmt(y.temple)}</td><td>${fmt(y.buried)}</td><td>${fmt(y.total)}</td></tr>`).join('')}</tbody></table></div>` : '<p class="note">The first year\'s books close at the new year.</p>'}`;
}
function drawFeed() {
  const rn = r => L.regions[r] ? L.regions[r].name : '?', ev = [];
  for (let i = L.log.length - 1; i >= 0 && ev.length < 14; i--) { const e = L.log[i]; if (!e.type.startsWith('econ.') || e.type === 'econ.harvest') continue;
    const c = calendar(e.h), t = { 'econ.famine': `Famine in ${rn(e.region)}: rice at ${fmt(e.price)} a koku`, 'econ.famine.end': `The famine in ${rn(e.region)} is over`,
      'econ.drought': `Drought in ${rn(e.region)}: the harvest at ×${e.q}`, 'econ.war': `War in ${rn(e.region)}`, 'econ.unpaid': `The lord of ${rn(e.region)} can pay his men only ${Math.round(e.share * 100)}%`,
      'econ.caravan.robbed': `A caravan of ${e.good} from ${rn(e.from)} robbed near ${rn(e.region)} (${fmt(e.value)})`, 'econ.year': `Year ${e.year} closed: ${fmt(e.total)} in the world` }[e.type] || e.type;
    ev.push(`<div><time>${c.season.slice(0, 3)} ${c.dayOfSeason}, y${c.year}</time><span>${t}</span></div>`); }
  $('feed').innerHTML = ev.join('') || '<p class="note">Nothing yet. Press Play.</p>';
}
function drawWealth() {
  const by = {}; for (const h of economyIndex(L).hh) { let v = 0; for (const a of h.m) if (a.alive) v += worth(a.money); (by[h.head.cls] = by[h.head.cls] || []).push(v); }
  const rows = Object.entries(by).map(([k, l]) => { l.sort((a, b) => a - b); return { k, n: l.length, mean: l.reduce((s, v) => s + v, 0) / l.length, med: l[l.length >> 1], poor: l.filter(v => v < 20).length / l.length }; }).sort((a, b) => b.mean - a.mean);
  $('wealth').innerHTML = `<thead><tr><th>Head of household</th><th>Households</th><th>Mean</th><th>Median</th><th>Under 20 mon</th></tr></thead><tbody>${rows.map(r => `<tr><td>${r.k}</td><td>${r.n}</td><td>${fmt(r.mean)}</td><td>${fmt(r.med)}</td><td>${Math.round(r.poor * 100)}%</td></tr>`).join('')}</tbody>`;
}
function drawAll(full) {
  const c = calendar(L.hour); $('clock').textContent = `Day ${c.dayOfSeason} of ${c.season}, year ${c.year}`;
  drawMap(); drawMarket(); drawChart(); drawLord(); drawPurse(); drawFeed(); drawBooks();
  if (full || frame % 8 === 0) drawWealth();
}

// ---- input ----
const zoneFromEvent = e => { const r = map.getBoundingClientRect(), k = map.width / r.width; return [Math.floor((e.clientX - r.left) * k / Z), Math.floor((e.clientY - r.top) * k / Z)]; };
map.addEventListener('mousemove', e => { const z = zoneAt(L, ...zoneFromEvent(e)), tip = $('tip'); if (!z || z.region < 0) { tip.hidden = true; return; }
  const R = E.regions[z.region], g = GOODS[good];
  tip.innerHTML = `<b>${L.regions[z.region].name}</b>${z.name ? ` · ${z.name}` : ''}<br>${g}: ${fmt(R.price[good])} a ${GOOD[g].unit} (${(R.price[good] / GOOD[g].base).toFixed(2)}×)<br>rice: ${fmt(R.price[0])} a koku`;
  tip.hidden = false; const r = map.getBoundingClientRect(); tip.style.left = Math.min(e.clientX - r.left + 14, r.width - 240) + 'px'; tip.style.top = Math.min(e.clientY - r.top + 14, r.height - 80) + 'px'; });
map.addEventListener('mouseleave', () => $('tip').hidden = true);
map.addEventListener('click', e => { const z = zoneAt(L, ...zoneFromEvent(e)); if (z && z.region >= 0) { sel = z.region; drawAll(true); } });
$('good').addEventListener('change', () => { good = +$('good').value; drawAll(); });
$('play').addEventListener('click', () => { playing = !playing; $('play').textContent = playing ? 'Pause' : 'Play'; $('play').classList.toggle('on', playing); if (playing) requestAnimationFrame(loop); });
$('year').addEventListener('click', () => { for (let i = 0; i < 16; i++) step(7); flash = flash.slice(-6); drawAll(true); });
$('gen').addEventListener('click', () => make(+$('seed').value || 1));
function loop() { if (!playing) return; frame++; step(+$('speed').value); drawAll(); requestAnimationFrame(loop); }
make(+$('seed').value);
window.__world = () => L;
