// Prototype 39: karma, standing, bounties, title and possession on the simulation core (docs/sim-crime.md).
// The page holds only what is on screen (where people stand, what is selected); everything else is the ledger.
import { generateWorld, advance, calendar, tilesOf, TERRAIN, ownerOf, plotId, PLOT, PLOTS, nameOf, ageOf, on, zoneAt, rngFor, HOURS_PER_SEASON, HOURS_PER_YEAR } from '../../src/sim/index.js';
import { crimeState, commit, takePlotByMurder, seize, bountiesOf, standingOf, karmaName, payOff, onSight, outlawDoors, companionVerdict, honourOf,
  claimantOf, buyTitle, priceOf, payBloodMoney, petitionGrant, courtCase, forgeDeed, purse, isElderOrRoyal, CRIMES, LAND } from '../../src/sim/crime/index.js';

const $ = id => document.getElementById(id);
const L = generateWorld(12345, 0), me = L.actors[L.player];
me.money.ryo = 3;   // enough to try buying, paying off and blood money
const S = { zone: me.at.slice(), pos: [32, 40], target: null, plot: null, spots: {}, log: [] };
const SIGHT = 12, TILE = 6;
const cultureAt = (x, y) => L.regions[zoneAt(L, x, y).region].culture;
const who = id => id == null ? 'nobody' : id === me.id ? 'him' : L.actors[id] ? nameOf(L.actors[id]) : id;
const fmt = mon => { mon = Math.round(mon); return mon >= 1000 ? `${Math.floor(mon / 1000)} ryō ${mon % 1000} mon` : `${mon} mon`; };
const cname = c => L.cultures[c].name.replace(/^the /, '');

// ---- the people of the zone, standing where they live: a household on its plot, the rest round the middle ----
const folk = () => Object.values(L.actors).filter(a => a.home && a.home[0] === S.zone[0] && a.home[1] === S.zone[1] && a.id !== me.id);
function spotOf(a) {
  if (S.spots[a.id]) return S.spots[a.id];
  const r = rngFor(L.seed, 'proto39', a.id), head = L.actors[a.household] || a, pid = (head.holds || [])[0] || (head.claims || [])[0];
  let x, y;
  if (pid && pid.startsWith(`${S.zone[0]},${S.zone[1]}:`)) { const n = +pid.split(':')[1]; x = (n % PLOTS) * PLOT + r.int(3, PLOT - 4); y = Math.floor(n / PLOTS) * PLOT + r.int(3, PLOT - 4); }
  else { x = 32 + r.int(-9, 9); y = 32 + r.int(-9, 9); }
  return (S.spots[a.id] = [x, y]);
}
const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
const sight = () => $('night').checked ? SIGHT / 2 : SIGHT;
function witnesses(not) { return folk().filter(a => a.alive && a.id !== not && ageOf(L, a) >= 6 && dist(spotOf(a), S.pos) <= sight()).map(a => a.id); }

// ---- the map ----
const COLS = { grass: '#34413a', field: '#4f4a36', paddy: '#34504b', forest: '#243328', bamboo: '#2f4634', water: '#233847', rock: '#43464a', sand: '#5b5646',
  road: '#57534a', building: '#1c1917', marsh: '#304039', shrine: '#553632', palisade: '#3a2e24', wall: '#55585a' };
const g = $('map').getContext('2d');
function draw() {
  const t = tilesOf(L, ...S.zone).t;
  for (let y = 0; y < 64; y++) for (let x = 0; x < 64; x++) { g.fillStyle = COLS[TERRAIN[t[y * 64 + x]]]; g.fillRect(x * TILE, y * TILE, TILE, TILE); }
  // plots: his in cyan, split title and possession in red
  for (let n = 0; n < PLOTS * PLOTS; n++) { const pid = plotId(...S.zone, n), o = ownerOf(L, pid), px = (n % PLOTS) * PLOT * TILE, py = Math.floor(n / PLOTS) * PLOT * TILE;
    g.strokeStyle = o.holder === me.id ? '#6ff3e4' : o.title !== o.holder ? '#c4574d' : '#0006'; g.lineWidth = o.holder === me.id || o.title !== o.holder ? 2 : 1;
    g.setLineDash(o.title !== o.holder ? [5, 4] : []); g.strokeRect(px + 1, py + 1, PLOT * TILE - 2, PLOT * TILE - 2);
    if (S.plot === pid) { g.fillStyle = '#ffffff14'; g.fillRect(px, py, PLOT * TILE, PLOT * TILE); } }
  g.setLineDash([]);
  // his sight circle: who stands inside sees him
  const [hx, hy] = S.pos.map(v => v * TILE + TILE / 2);
  g.strokeStyle = '#6ff3e455'; g.fillStyle = '#6ff3e40d'; g.beginPath(); g.arc(hx, hy, sight() * TILE, 0, 7); g.fill(); g.stroke();
  const seen = new Set(witnesses(S.target));
  for (const a of folk()) { const [x, y] = spotOf(a).map(v => v * TILE + TILE / 2);
    if (!a.alive) { g.strokeStyle = '#c4574d'; g.lineWidth = 2; g.beginPath(); g.moveTo(x - 3, y - 3); g.lineTo(x + 3, y + 3); g.moveTo(x + 3, y - 3); g.lineTo(x - 3, y + 3); g.stroke(); continue; }
    if (seen.has(a.id)) { g.strokeStyle = '#6ff3e488'; g.lineWidth = 1; g.beginPath(); g.moveTo(x, y); g.lineTo(hx, hy); g.stroke(); }
    g.fillStyle = isElderOrRoyal(L, a) || a.job === 'lord' ? '#d8b25a' : a.rank >= 2 ? '#8f98a0' : '#c9c2b0';
    g.fillRect(x - 3, y - 3, 6, 6);
    if (seen.has(a.id)) { g.strokeStyle = '#6ff3e4'; g.lineWidth = 1; g.strokeRect(x - 4.5, y - 4.5, 9, 9); }
    if (a.id === S.target) { g.strokeStyle = '#ffffff'; g.lineWidth = 2; g.strokeRect(x - 6, y - 6, 12, 12); } }
  g.fillStyle = '#6ff3e4'; g.fillRect(hx - 4, hy - 4, 8, 8); g.fillStyle = '#0b0d0c'; g.fillRect(hx - 2, hy - 2, 4, 4);
}
$('map').addEventListener('click', e => {
  const b = e.target.getBoundingClientRect(), x = Math.floor((e.clientX - b.left) / b.width * 64), y = Math.floor((e.clientY - b.top) / b.height * 64);
  const hit = folk().find(a => a.alive && dist(spotOf(a), [x, y]) <= 1.6);
  if (hit) { S.target = hit.id; const [tx, ty] = spotOf(hit); S.pos = [tx + (tx < 60 ? 1 : -1), ty]; }
  else { S.target = null; S.pos = [x, y]; }
  S.plot = plotId(...S.zone, Math.floor(S.pos[1] / PLOT) * PLOTS + Math.floor(S.pos[0] / PLOT));
  render();
});

// ---- his crimes ----
function say(msg, bad = false) { const t = $('toast'); t.textContent = msg; t.className = 'toast' + (bad ? ' bad' : ''); }
const base = () => ({ by: me.id, zone: S.zone.slice(), masked: $('mask').checked });
function act(kind) {
  const v = S.target && L.actors[S.target], w = witnesses(S.target);
  let rec;
  if (kind === 'trespass') {
    const o = ownerOf(L, S.plot); if (o.holder === me.id || o.holder == null) return say('Nobody owns the ground he stands on.', true);
    rec = commit(L, 'trespass', { ...base(), witnesses: w, culture: cultureAt(...S.zone) });
  } else if (!v) return say('Pick someone first: click a person on the map.', true);
  else if (kind === 'theft') rec = commit(L, 'theft', { ...base(), victim: v.id, witnesses: w, value: Math.max(10, v.money.mon * .3), victimSaw: false });
  else if (kind === 'assault') rec = commit(L, 'assault', { ...base(), victim: v.id, witnesses: w });
  else if (kind === 'murder') rec = commit(L, 'murder', { ...base(), victim: v.id, witnesses: w });
  else {
    const pid = (v.holds || []).find(p => ownerOf(L, p).holder === v.id);
    if (!pid) return say(`${nameOf(v)} holds no land.`, true);
    if (kind === 'plot') rec = takePlotByMurder(L, me.id, v.id, pid, { ...base(), witnesses: w });
    else { rec = commit(L, 'assault', { ...base(), victim: v.id, witnesses: w }); seize(L, pid, me.id, { how: 'force', crime: rec.id, witnesses: rec.witnesses }); }
    S.plot = pid;
  }
  if (!v?.alive) S.target = null;
  const seen = rec.seen.length, names = rec.known.map(cname).join(', ');
  say(`${CRIMES[rec.kind] ? rec.kind : kind}: karma ${CRIMES[rec.kind].karma < 0 ? 'fell' : 'moved'} to ${me.karma}. ` +
    (!seen ? 'Nobody saw it: no bounty.' : rec.masked ? 'Seen, but masked: nobody knows it was him.' : rec.known.length ? `Seen by ${rec.witnesses.length}: wanted by ${names}.` : 'Seen, but the victim was a wanted man: justice, no bounty.'));
  render();
}
for (const [id, k] of [['cTrespass', 'trespass'], ['cTheft', 'theft'], ['cAssault', 'assault'], ['cMurder', 'murder'], ['cDrive', 'drive'], ['cPlot', 'plot']]) $(id).onclick = () => act(k);

// ---- land ----
const landAct = fn => () => { if (!S.plot) return say('Pick a plot first.', true); const r = fn(S.plot); say(r.ok ? `Done${r.price ? `: paid ${fmt(r.price)}` : ''}${r.won ? `: the court found for the ${r.won}` : ''}.` : r.reason, !r.ok); render(); };
$('lBuy').onclick = landAct(p => buyTitle(L, p, me.id));
$('lBlood').onclick = landAct(p => payBloodMoney(L, p, me.id));
$('lGrant').onclick = landAct(p => petitionGrant(L, p, me.id));
$('lCourt').onclick = landAct(p => courtCase(L, p));
$('lForge').onclick = landAct(p => { const o = ownerOf(L, p); if (o.title === me.id) return { ok: false, reason: 'The title is already his.' }; const rec = forgeDeed(L, p, me.id, { witnesses: witnesses(null) }); return { ok: true, won: null, price: 0, rec }; });

// ---- time ----
const wait = h => { advance(L, h); render(); };
$('wDay').onclick = () => wait(24); $('wWeek').onclick = () => wait(24 * 7); $('wSeason').onclick = () => wait(HOURS_PER_SEASON); $('wYear').onclick = () => wait(HOURS_PER_YEAR);
$('night').onchange = render; $('mask').onchange = render;

// ---- places near the start, to try the lord's town or a camp ----
const near = L.zones.filter(z => ['town', 'village', 'fort', 'shrine', 'camp'].includes(z.kind) && Math.abs(z.x - me.at[0]) + Math.abs(z.y - me.at[1]) <= 12)
  .sort((a, b) => Math.abs(a.x - me.at[0]) + Math.abs(a.y - me.at[1]) - Math.abs(b.x - me.at[0]) - Math.abs(b.y - me.at[1]));
$('goto').innerHTML = near.map(z => `<option value="${z.x},${z.y}">${z.name || z.kind} (${z.kind})</option>`).join('');
$('goto').onchange = e => { S.zone = e.target.value.split(',').map(Number); me.at = S.zone.slice(); S.target = null; S.plot = null; S.pos = [32, 44]; render(); };

// ---- the log: every crime.* event about him or this zone, and a count of the rest of the world ----
const TEXT = {
  'crime.committed': e => `${e.actor == null ? 'a masked man' : who(e.actor)}: ${e.kind}${e.victim ? ` of ${who(e.victim)}` : ''}${e.witnesses ? `, ${e.witnesses} saw` : ', unseen'}`,
  'crime.bounty': e => `${cname(e.culture)} want ${who(e.actor)}: ${fmt(e.mon)}`,
  'crime.bountyFaded': e => `the bounty of ${cname(e.culture)} faded away`,
  'crime.bountyPaid': e => `paid off ${cname(e.culture)} at a ${e.where}: ${fmt(e.mon)}`,
  'crime.seized': e => `${who(e.actor)} took plot ${e.plot} by ${e.how}; the title stays with ${who(e.title)}`,
  'crime.retaken': e => `${who(e.actor)} took plot ${e.plot} back (${e.how})`,
  'crime.title': e => `title of ${e.plot}: ${who(e.from)} → ${who(e.actor)} by ${e.how}`,
  'crime.court': e => `court: plot ${e.plot} for ${who(e.actor)}`,
  'crime.forgeryExposed': e => `the forged deed of ${e.plot} came out; ${who(e.to)} has the title again`,
  'crime.hunterSent': e => `${cname(e.culture)} sent ${who(e.actor)}, a hunter, after him (${fmt(e.mon)})`,
  'crime.hunterFound': e => `${who(e.actor)} the hunter has found him`,
  'crime.hunterGone': e => `${who(e.actor)} gave up the hunt`,
  'crime.penance': e => `penance: karma +${e.karma}`,
};
let worldCount = 0;
on('*', e => {
  if (!e.type.startsWith('crime.')) return;
  const mine = e.actor === me.id || e.victim === me.id || e.target === me.id || (e.zone && e.zone[0] === S.zone[0] && e.zone[1] === S.zone[1]) || (e.plot && e.plot.startsWith(`${S.zone[0]},${S.zone[1]}:`));
  if (!mine || !TEXT[e.type]) { worldCount++; return; }
  const c = calendar(e.h);
  S.log.unshift({ t: `Y${c.year} ${c.season.slice(0, 3)} ${c.dayOfSeason}`, s: TEXT[e.type](e), cls: /seized|title|retaken|court|forgery/.test(e.type) ? 'land' : e.type === 'crime.committed' || e.type === 'crime.hunterFound' ? 'bad' : 'me' });
  S.log.length = Math.min(S.log.length, 80);
});

// ---- the panels ----
const esc = s => String(s).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
function render() {
  const c = calendar(L.hour), z = zoneAt(L, ...S.zone);
  $('date').textContent = `Year ${c.year}, ${c.season} day ${c.dayOfSeason}`;
  $('zoneName').textContent = `${z.name || z.kind}, ${cname(cultureAt(...S.zone))}`;
  $('kVal').textContent = me.karma; $('kBand').textContent = karmaName(me.karma);
  $('kBand').style.color = me.karma <= -25 ? 'var(--blood)' : me.karma >= 25 ? 'var(--cyan)' : 'var(--ink)';
  $('kMeter').innerHTML = `<i style="left:calc(${(me.karma + 100) / 2}% - 1px)"></i>` + [-60, -25, 25, 60].map(k => `<b style="left:${(k + 100) / 2}%"></b><span style="left:${(k + 100) / 2}%">${k}</span>`).join('');
  $('purse').innerHTML = `${fmt(purse(me))}<small>carried</small>`;
  const v = S.target && L.actors[S.target];
  $('target').innerHTML = v ? `<strong>${esc(nameOf(v))}</strong>, ${v.job}, ${Math.floor(ageOf(L, v))} years, ${fmt(v.money.mon)}${v.holds.length ? `, holds ${v.holds.join(' ')}` : ''}${isElderOrRoyal(L, v) ? ' <span class="pill arrest">elder or royal: killing is the worst crime</span>' : ''}` : 'No one picked. Click a person to step up to them.';
  const w = witnesses(S.target); $('seen').textContent = `${w.length} would see it`;
  $('cPlot').disabled = $('cDrive').disabled = !(v && v.holds.some(p => ownerOf(L, p).holder === v.id));
  for (const id of ['cTheft', 'cAssault', 'cMurder']) $(id).disabled = !v;
  // standing: this zone's people first, then everyone with an opinion
  const felt = k => Math.abs(me.standing[k] - me.karma / 200) >= .01;   // only peoples whose opinion differs from what his karma says
  const cs = [...new Set([cultureAt(...S.zone), ...Object.keys(me.standing).filter(felt).map(Number), ...Object.keys(bountiesOf(L, me.id)).map(Number)])];
  $('standing').innerHTML = cs.map(k => { const s = standingOf(me, k), sight = onSight(L, k, me.id), wd = Math.abs(s) * 50;
    return `<tr><td>${esc(cname(k))}</td><td><div class="bar"><i style="left:${s < 0 ? 50 - wd : 50}%;width:${wd}%;background:${s < 0 ? 'var(--blood)' : 'var(--cyan-2)'}"></i></div><span class="num hint">${s.toFixed(2)}</span></td>
      <td><span class="pill ${sight || 'ok'}">${sight || 'welcome'}</span></td></tr>`; }).join('');
  const bs = bountiesOf(L, me.id);
  $('bounties').innerHTML = Object.keys(bs).map(k => `<tr><td>${esc(cname(k))}</td><td>${bs[k].worst}</td><td class="num">${Math.round(bs[k].mon)}</td>
    <td><button data-pay="${k}" data-where="magistrate">magistrate</button> <button data-pay="${k}" data-where="shrine">shrine ×${1.5}</button></td></tr>`).join('') || '<tr><td colspan="4" class="hint">Nobody wants him.</td></tr>';
  for (const b of document.querySelectorAll('[data-pay]')) b.onclick = () => { const r = payOff(L, me.id, +b.dataset.pay, b.dataset.where); say(r.ok ? `Paid ${fmt(r.cost)}.` : `${r.reason}${r.cost ? ` (${fmt(r.cost)})` : ''}.`, !r.ok); render(); };
  const hs = crimeState(L).hunters;
  $('hunters').innerHTML = hs.length ? hs.map(h => `Hunter ${esc(who(h.actor))} of ${esc(cname(h.culture))}: ${h.found ? '<b style="color:var(--blood)">here</b>' : `${Math.max(Math.abs(h.at[0] - me.at[0]), Math.abs(h.at[1] - me.at[1]))} zones away`}`).join('<br>') : 'No hunters on his trail. A bounty of 500 mon or more sends them.';
  const d = outlawDoors(L, me.id);
  $('doors').innerHTML = `Bandits: ${d.hostile ? 'his enemies' : d.join ? 'would take him in' : d.deal ? 'will trade with him' : 'wary of him'} · villages of a people who want him refuse him`;
  $('comps').innerHTML = COMPS.map(id => { const a = L.actors[id]; return `<tr><td>${esc(nameOf(a))} <span class="hint">${a.traits.map(t => t[0]).join(', ')}</span></td><td class="num">${honourOf(a).toFixed(2)}</td>
    <td>${companionVerdict(L, id, me.id)}</td><td>${companionVerdict(L, id, me.id, true)}</td></tr>`; }).join('');
  // plots of this zone
  const rows = [];
  for (let n = 0; n < PLOTS * PLOTS; n++) { const pid = plotId(...S.zone, n), o = ownerOf(L, pid), k = crimeState(L).contested[pid];
    const state = o.holder === me.id && o.title === me.id ? '<span class="pill his">his</span>' : o.title !== o.holder ? `<span class="pill split">split${k ? `, ${k.how}` : ''}</span>` : '';
    const dead = id => id != null && L.actors[id] && !L.actors[id].alive ? ' <span class="hint">(dead)</span>' : '';
    rows.push(`<tr data-plot="${pid}" class="${S.plot === pid ? 'sel' : ''}"><td class="num">${n}</td><td>${esc(who(o.title))}${dead(o.title)}</td><td>${esc(who(o.holder))}${dead(o.holder)}</td><td>${state}</td></tr>`); }
  $('plots').innerHTML = rows.join('');
  for (const tr of document.querySelectorAll('[data-plot]')) tr.onclick = () => { S.plot = tr.dataset.plot; render(); };
  if (S.plot) { const o = ownerOf(L, S.plot), cl = claimantOf(L, S.plot), k = crimeState(L).contested[S.plot];
    $('plotHint').innerHTML = `Plot ${S.plot}: title ${esc(who(o.title))}, held by ${esc(who(o.holder))}. ${o.title === o.holder ? `Title and possession together. Title price ${fmt(priceOf(L, S.plot))}.` : cl != null ? `Claimant: ${esc(who(cl))}. Title price ${fmt(priceOf(L, S.plot))}.` : 'Nobody alive can claim it: a lord may grant it, and after 3 years it is his.'}` +
      (k ? ` Contested since ${calendar(k.since).season} of year ${calendar(k.since).year}; ${k.witnesses.filter(w => L.actors[w]?.alive).length} witnesses of the taking alive. Blood money ${fmt(LAND.BLOOD_MONEY)}.` : ''); }
  const st = crimeState(L).stats;
  $('world').textContent = `The rest of the world so far: ${Object.entries(st.byKind).map(([k, n]) => `${n} ${k}`).join(' · ')} · ${st.raids} raids · ${st.caught} caught · ${st.executed} executed · land seized ${st.land.force}, retaken ${st.land.retaken}, titles passed ${Object.values(st.land.title).reduce((a, b) => a + b, 0)} (${worldCount} events elsewhere)`;
  $('log').innerHTML = S.log.map(l => `<div class="${l.cls}"><time>${l.t}</time>${esc(l.s)}</div>`).join('') || '<div class="hint">Nothing yet. Pick someone and commit a crime, or let time pass.</div>';
  draw();
}
// three possible companions: the most honourable, a middling one, the most ruthless fighting men in the land
const fighters = Object.values(L.actors).filter(a => a.alive && (a.cls === 'ronin' || a.cls === 'retainer' || a.cls === 'outlaw')).sort((a, b) => honourOf(b) - honourOf(a));
const COMPS = [fighters[0].id, fighters[Math.floor(fighters.length / 2)].id, fighters[fighters.length - 1].id];
S.plot = plotId(...S.zone, Math.floor(S.pos[1] / PLOT) * PLOTS + Math.floor(S.pos[0] / PLOT));
render();
