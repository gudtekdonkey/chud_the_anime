// ---- Prototype 41: travel. Walk the ronin across a stretch of the world map; meet what the roads hold; see a glitch storm at game scale ----
// The world is the simulation core (src/sim/) with the travel lane's system (src/sim/travel/): everything he meets comes out of the ledger.
import '../../src/sim/travel/index.js';
import { generateWorld, advance, calendar, zoneAt, on } from '../../src/sim/index.js';
import { enterZone, openScene, SCENES, choose, stormAt, spawnStorm, shrineDark, takeResidue, context, chanceAt, ENCOUNTERS, STORM } from '../../src/sim/travel/index.js';
import { makeRoad } from './road.js';
import { makeMap, route, Z } from './map.js';
import { LAYERS, makeStorm, stormUpdate, stormDraw, glitchFigure, hold } from './storm-look.js';
import { W, H, ROAD_Y, PALS, figure, ground, eyes, night } from './stage.js';
import { bake } from '../../src/traits/bake.js';
import { personOf } from '../../src/traits/cultures.js';

const $ = s => document.querySelector(s), esc = s => String(s).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]);
const layers = Object.fromEntries(Object.keys(LAYERS).map(k => [k, true]));
const road = makeRoad($('#road')), map = makeMap($('#map'));
let L, P, T;
const log = [];

// ---- the world ----
function world(seed) {
  L = generateWorld(seed, 0); P = L.actors[L.player];
  advance(L, 24 * 6);   // a few days lived, so bands are out on the roads and the weather has turned
  // a storm already on its way across his road, so the first walk meets one
  spawnStorm(L, { x: P.at[0] + 9.5, y: P.at[1] + 1.5, r: 3.6, peak: .9, hdg: Math.PI, speed: 1.4, life: 14, age: 3 });
  T = { route: [], step: null, hours: 0, scene: null, last: null };
  log.length = 0; $('#log').innerHTML = ''; $('#seed').textContent = seed;
  road.enter(zoneAt(L, ...P.at), 1, calendar(L.hour).season, shrineDark(L, ...P.at));
  road.stop = W / 2 - 40;
  map.center(...P.at, L); panel(null); info();
}
// everything the travel lane says, as it says it (the game's notice board and quests would listen the same way)
on('*', e => { if (!/^(travel|storm)\./.test(e.type) || !L) return;
  const { h, type, ...d } = e, cal = calendar(h);
  log.unshift(`<li><span class="tag">${type}</span> <span class="dim">d${cal.day} ${String(cal.hour).padStart(2, '0')}h</span> ${esc(summary(d))}</li>`); if (log.length > 60) log.length = 60;
  $('#log').innerHTML = log.join(''); });
const summary = d => Object.entries(d).filter(([k]) => k !== 'enc').map(([k, v]) => `${k}: ${k === 'region' && L.regions[v] ? L.regions[v].name : k === 'culture' && L.cultures[v] ? L.cultures[v].name : Array.isArray(v) ? v.join(',') : typeof v === 'object' ? JSON.stringify(v) : v}`).join(' · ');
// karma and standing belong to the crime lane; this page applies travel.deed itself so the numbers move while you play
on('travel.deed', e => { if (!P) return; P.karma = (P.karma || 0) + (e.karma || 0); for (const c in e.standing || {}) P.standing[c] = +Math.max(-1, Math.min(1, (P.standing[c] || 0) + e.standing[c])).toFixed(3); });

// ---- travelling: he runs across the zone he is in; at its far edge he is in the next one ----
const dirOf = (a, b) => [Math.sign(b[0] - a[0]), Math.sign(b[1] - a[1])];
function go(to) {
  if (T.scene) return;
  T.route = route(L, P.at, to); road.stop = null; road.arrived = null;
  // he turns round on the spot if the way goes back the way he came
  if (T.route.length) { const [dx] = dirOf(P.at, T.route[0]); if (dx && dx !== road.dir) road.dir = dx; }
}
function onEdge() {
  if (!T.route.length) return;
  const next = T.route.shift(), [dx] = dirOf(P.at, next);
  P.at = next;
  // four zones to a game hour (a zone is about 25 real seconds at his pace)
  if (++T.hours >= 4) { T.hours = 0; pass(1); }
  const cal = calendar(L.hour), d = dx || road.dir;
  road.enter(zoneAt(L, ...P.at), d, cal.season, shrineDark(L, ...P.at));
  const res = takeResidue(L, ...P.at);
  if (res) for (let i = 0; i < res.n * 3; i++) road.props.push({ kind: 'shard', x: 60 + Math.random() * 360, y: ROAD_Y - 10 + Math.random() * 18 });
  if (!T.route.length) road.stop = W / 2 - 40 * road.dir;
  const sc = enterZone(L, ...P.at);
  if (sc) show(sc);
  map.center(...P.at, L); info();
}
function pass(hours) { const before = calendar(L.hour); advance(L, hours, true); const now = calendar(L.hour);
  if (now.season !== before.season || now.day !== before.day) road.redrawGround(now.season, shrineDark(L, ...P.at)); }
function show(sc) { T.scene = sc; road.scene(sc, L); panel(sc); }
function pick(id) {
  const sc = T.scene; if (!sc) return;
  const out = choose(L, id); if (!out) return;
  road.after(sc, out);
  let note = '';
  if (out.hours) { pass(out.hours); note = ` <span class="dim">(${out.hours} ${out.hours === 1 ? 'hour passes' : 'hours pass'})</span>`; }
  if (out.fight) note += ` <span class="dim">(the fight is the game's: it gets these people by ledger id and answers won or lost; here it was rolled: ${out.fight.won ? 'won' : 'lost'})</span>`;
  if (out.loot?.length) note += ` <span class="dim">(found: ${out.loot.map(l => l.n + ' ' + l.item).join(', ')})</span>`;
  $('#outcome').innerHTML = esc(out.text) + note;
  if (out.again) { renderChoices(sc.choices); return; }
  T.scene = null; renderChoices([]);
  if (out.next) { show(out.next); $('#outcome').innerHTML = esc(out.text); }
  info();
}

// ---- the panel: the scene, who is in it, the choices ----
function panel(sc) {
  $('#sc-title').textContent = sc ? sc.title : 'On the road';
  $('#sc-text').textContent = sc ? sc.text : 'Click a zone on the map (or use the arrow keys) and he sets off. Whatever the road holds finds him on the way.';
  $('#sc-who').innerHTML = sc && sc.who.length ? sc.who.map(w => `<li>${esc(w.name)} <span class="dim">${esc(w.job || w.cls)}, ${esc(w.weapon)}${w.id ? ' · in the ledger as ' + w.id : ' · a stranger'}</span></li>`).join('') : '';
  $('#outcome').innerHTML = ''; renderChoices(sc ? sc.choices : []);
}
function renderChoices(chs) { $('#choices').innerHTML = chs.map(c => `<button class="key" data-ch="${c.id}">${esc(c.label)}</button>`).join(''); }
$('#choices').addEventListener('click', e => { const b = e.target.closest('[data-ch]'); if (b) pick(b.dataset.ch); });

// ---- what he is standing in ----
const pct = v => Math.round(v * 100) + '%';
function info() {
  const cal = calendar(L.hour), z = zoneAt(L, ...P.at), reg = L.regions[z.region], cult = L.cultures[reg.culture], c = context(L, ...P.at), s = L.sys.travel.regions[z.region];
  const ws = Object.entries(ENCOUNTERS).map(([id, e]) => [id, Math.max(0, e.w(c))]), tot = ws.reduce((a, [, w]) => a + w, 0);
  $('#where').innerHTML = `<b>${reg.name}</b>, ${esc(cult.name)} <span class="dim">(${cult.kind})</span> · ${z.name ? esc(z.name) + ' · ' : ''}${z.biome}${z.road ? ', road' : ', wild'} · zone ${z.x},${z.y}`;
  $('#when').innerHTML = `Year ${cal.year} · ${cal.season}, day ${cal.dayOfSeason} · ${String(cal.hour).padStart(2, '0')}:00${cal.night ? ' · night' : ''} · weather: ${s.weather}`;
  $('#odds').innerHTML = `Danger ${pct(s.danger)} · chance per zone here ${(chanceAt(c) * 100).toFixed(1)}% · ` + ws.filter(([, w]) => w > 0).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([id, w]) => `${id} ${pct(w / tot)}`).join(', ') + (c.band ? ' · <b>a band is on this road</b>' : '');
  $('#me').innerHTML = `${P.money.mon} mon · karma ${P.karma || 0} · standing here ${(P.standing[cult.id] || 0).toFixed(2)}${L.sys.travel.escort ? ' · escorting ' + esc(L.sys.travel.escort.name) + ' to ' + esc(L.sys.travel.escort.toName) : ''}`;
}

// ---- controls ----
$('#map').addEventListener('click', e => { const r = e.target.getBoundingClientRect(), s = e.target.width / r.width; const to = map.zoneAtPx((e.clientX - r.left) * s, (e.clientY - r.top) * s); const z = zoneAt(L, ...to); if (z && z.kind !== 'sea') go(to); });
$('#map').addEventListener('mousemove', e => { const r = e.target.getBoundingClientRect(), s = e.target.width / r.width; map.hover = map.zoneAtPx((e.clientX - r.left) * s, (e.clientY - r.top) * s); });
$('#map').addEventListener('mouseleave', () => map.hover = null);
addEventListener('keydown', e => { if (e.target.closest && e.target.closest('input,select')) return;
  const d = { ArrowRight: [1, 0], KeyD: [1, 0], ArrowLeft: [-1, 0], KeyA: [-1, 0], ArrowUp: [0, -1], KeyW: [0, -1], ArrowDown: [0, 1], KeyS: [0, 1] }[e.code];
  if (d) { e.preventDefault(); const to = [P.at[0] + d[0], P.at[1] + d[1]], z = zoneAt(L, ...to); if (z && z.kind !== 'sea') go(to); }
  if (e.code === 'KeyF') { road.fast = !road.fast; $('#fast').classList.toggle('on', road.fast); } });
$('#fast').onclick = () => { road.fast = !road.fast; $('#fast').classList.toggle('on', road.fast); };
$('#wait').onclick = () => { if (T.scene) return; pass(24); info(); };
$('#danger').onclick = () => { map.showDanger = !map.showDanger; $('#danger').classList.toggle('on', map.showDanger); };
$('#storm').onclick = () => { const d = road.dir; spawnStorm(L, { x: P.at[0] + .5 + d * 5, y: P.at[1] + .5, r: 3.4, peak: .95, hdg: d > 0 ? Math.PI : 0, speed: 1.2, life: 12, age: 3 }); info(); };
$('#meet').innerHTML = '<option value="">Meet…</option>' + Object.keys(SCENES).filter(k => k !== 'arrived' && k !== 'slip').map(k => `<option>${k}</option>`).join('');
$('#meet').onchange = e => { const k = e.target.value; e.target.value = ''; if (!k || T.scene) return;
  const sc = openScene(L, k, ...P.at); if (sc) { road.stop = road.x; show(sc); } else $('#outcome').textContent = k === 'hunters' ? 'Nobody has a bounty on him yet.' : k === 'raiders' ? 'No people near here hate this region\'s people enough.' : 'No storm here.'; };
$('#new').onclick = () => world((Math.random() * 1e6) | 0);
for (const k in LAYERS) { const l = document.createElement('label'); l.innerHTML = `<input type="checkbox" checked data-layer="${k}"> ${LAYERS[k]}`; $('#layers').append(l); }
$('#layers').addEventListener('change', e => { const k = e.target.dataset.layer; if (k) layers[k] = e.target.checked; });

// ---- the storm's look, on its own: a fixed stretch of road with a shrine, the ronin, a samurai and a farmer, and the strength in your hands ----
const look = $('#look'), lg = look.getContext('2d'), LS = makeStorm(W, H);
const RON = bake([]), SAM = bake(personOf('clan', 7)), FARM = bake(personOf('village', 3));
let lookBg = null, lookDark = null, lookT = 0;
const lookK = () => +$('#k').value;
function lookFrame(dt) {
  lookT += dt; const k = lookK(), side = +$('#side').value, dark = k > STORM.shrineDark;
  stormUpdate(LS, dt, k, side, .6, layers, 200, [ROAD_Y - 34, ROAD_Y + 2]);
  if (LS.freeze > 0) { stormDraw(lg, LS, k, layers); return; }
  if (!lookBg || lookDark !== dark) { lookBg = ground({ x: 3, y: 7, biome: 'plains', kind: 'shrine', road: true }, 'autumn', dark); lookDark = dark; }
  lg.drawImage(lookBg, 0, 0);
  const f = (b, m) => b[m].poses[Math.floor(lookT * b[m].fps) % b[m].poses.length];
  const people = [[FARM, 110, 1, PALS.earth, { bare: true, empty: true }], [RON, 200, 1, PALS.ronin, {}], [SAM, 300, -1, PALS.samurai, { bare: true }]];
  for (const [b, x, face, pal, o] of people) figure(lg, { ...f(b, 'idle'), ...o }, x, ROAD_Y + 1, face, pal, { slice: layers.people && k > 0 ? img => glitchFigure(img, x === 200 ? k * .6 : k) : null });
  if ($('#lnight').checked) { night(lg, .9); for (const [b, x, face, pal, o] of people) eyes(lg, { ...f(b, 'idle'), ...o }, x, ROAD_Y + 1, face, pal); }
  stormDraw(lg, LS, k, layers);
  if (layers.stutter) hold(LS, lg);
}
$('#k').oninput = () => $('#kv').textContent = (+$('#k').value).toFixed(2);
document.querySelectorAll('[data-k]').forEach(b => b.onclick = () => { $('#k').value = b.dataset.k; $('#kv').textContent = (+b.dataset.k).toFixed(2); });
document.querySelectorAll('[data-zoom]').forEach(b => b.onclick = () => { document.querySelectorAll('.zoomable').forEach(c => c.style.width = b.dataset.zoom === 'fit' ? '' : W * +b.dataset.zoom + 'px'); });

// ---- the loop ----
let last = performance.now(), infoT = 0;
function loop(now) {
  const dt = Math.max(0, Math.min(.05, (now - last) / 1000)); last = now;
  const cal = calendar(L.hour), h = cal.hour, dark = h >= 21 || h < 4 ? .9 : h >= 19 ? (h - 19) / 2 * .9 : h < 6 ? (6 - h) / 2 * .9 : 0;
  // the storm where he is: his place inside the zone as he crosses it; its heart's side on the screen; its drift
  const next = T.route[0], [sx, sy] = next ? dirOf(P.at, next) : [0, 0], prog = road.dir > 0 ? road.x / W : 1 - road.x / W;
  const px = P.at[0] + .5 + sx * (prog - .5), py = P.at[1] + .5 + sy * (prog - .5), s = stormAt(L, px, py);
  const toward = s.storm ? Math.sign((s.storm.x - px) * (sx || road.dir) + (s.storm.y - py) * sy) * road.dir || road.dir : 0;
  const drift = s.storm ? Math.cos(s.storm.hdg) * (sx ? sx * road.dir : 1) : 0;
  road.tick(dt);
  road.frame(dt, { k: s.k, side: s.k > .55 ? 0 : toward, drift: drift || .5, wx: L.sys.travel.regions[zoneAt(L, ...P.at).region].weather, dark, layers, moving: !T.scene && (T.route.length > 0 || road.stop != null), onEdge });
  $('#k-here').textContent = s.k > 0 ? `storm here ${s.k.toFixed(2)}` : s.storm ? `nearest storm ${s.dist.toFixed(1)} zones` : 'no storm';
  map.draw(L, P.at, T.route, now / 1000);
  lookFrame(dt);
  if ((infoT += dt) > .5) { infoT = 0; info(); }
  requestAnimationFrame(loop);
}
world(12345);
requestAnimationFrame(loop);
window.__travel = { get L() { return L; }, get T() { return T; }, road, go, pick };
