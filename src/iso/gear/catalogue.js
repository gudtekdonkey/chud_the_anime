// ---- The gear catalogue (?iso&gear, and bundled as prototypes/47-gear-catalogue.html): every one of the 200 pieces
// rendered on the 3D model through the slice's own pipeline, filterable by slot, layer and family, and a try-on figure
// that wears whatever is picked (any combination works). One WebGL pipeline draws everything: each card's figure is
// built, posed, drawn and copied into the card, then thrown away, a few a frame, as the cards scroll into view.
import * as THREE from 'three';
import { makePipeline, PIPE } from 'ronin-engine/render/gfx/post.js';
import { projMatrix, CAM, OBL } from 'ronin-engine/render/gfx/view.js';
import { SH, shadeMat } from 'ronin-engine/render/gfx/shade.js';
import { setStyle } from 'ronin-engine/render/gfx/style.js';
import { piece } from 'ronin-engine/render/gfx/build.js';
import { RAMP } from 'ronin-engine/render/gfx/palette.js';
import { Actor } from 'ronin-engine/flow/flow.js';
import 'ronin-engine/flow/moves.js';
import { threeLook, LOOK3D } from '../look/three/look3d.js';
import { GEAR, BY_ID } from './items.js';
import { SLOTS, SLOT_NAME, LAYERS, LAYER_NAME, FAMILIES, STAT_SHORT, STAT_KEYS, RARITY } from './schema.js';
import { DYES, KIND_NAME } from './palette.js';
import { empty, PRESETS, randomOutfit, outfitStats, encode, decode } from './outfits.js';
import { resolve } from './dress.js';

const CSS = `:root { color-scheme: dark; --bg: #0b0d10; --panel: #13161a; --card: #101317; --rule: #262b31; --fg: #d9dfdd; --dim: #8b9592; --cyan: #6ff3e4; }
html, body { margin: 0; background: var(--bg); color: var(--fg); font: 13px/1.45 system-ui, sans-serif; }
.cat { display: grid; grid-template-columns: minmax(0, 1fr) 340px; gap: 14px; padding: 14px 16px; box-sizing: border-box; }
.cat h1 { font-size: 16px; margin: 0; color: var(--cyan); font-weight: 600; }
.cat header { grid-column: 1 / -1; display: flex; flex-wrap: wrap; gap: 8px 16px; align-items: center; }
.cat header p { margin: 0; color: var(--dim); flex: 1 1 320px; }
.cat .bar { grid-column: 1 / -1; display: flex; flex-wrap: wrap; gap: 6px 12px; align-items: center; position: sticky; top: env(safe-area-inset-top, 0px); background: var(--bg); padding: 6px 0; z-index: 2; border-bottom: 1px solid var(--rule); }
.cat label { display: inline-flex; align-items: center; gap: 5px; color: var(--dim); }
.cat select, .cat input, .cat button { background: #0d1013; color: var(--fg); border: 1px solid var(--rule); font: inherit; padding: 2px 6px; border-radius: 3px; }
.cat button { cursor: pointer; } .cat button:hover, .cat button:focus-visible { border-color: var(--cyan); outline: none; }
.cat .count { color: var(--dim); margin-left: auto; }
.cat .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(176px, 1fr)); gap: 10px; align-content: start; }
.cat .card { background: var(--card); border: 1px solid var(--rule); border-radius: 4px; padding: 6px; display: flex; flex-direction: column; gap: 3px; min-width: 0; }
.cat .card.worn { border-color: var(--cyan); } .cat .card[hidden] { display: none; }
.cat .card canvas { width: 100%; aspect-ratio: 9 / 10; background: #0a0c10; image-rendering: pixelated; border-radius: 2px; }
.cat .card h3 { font-size: 12.5px; margin: 2px 0 0; font-weight: 600; }
.cat .chips { display: flex; flex-wrap: wrap; gap: 3px; } .cat .chip { font-size: 10.5px; color: var(--dim); border: 1px solid var(--rule); border-radius: 8px; padding: 0 6px; }
.cat .chip.samurai { color: #c9a1a4; } .cat .chip.villager { color: #c8b07a; } .cat .chip.ninja { color: #97a6b3; }
.cat .chip.rare, .cat .chip.epic, .cat .chip.legendary { color: var(--cyan); }
.cat .stats { font: 11px ui-monospace, monospace; color: var(--cyan); }
.cat .about { color: var(--dim); font-size: 11.5px; margin: 0; }
.cat .rules { color: var(--dim); font-size: 11px; margin: 0; } .cat .sw { display: inline-block; width: 10px; height: 10px; border-radius: 2px; vertical-align: -1px; margin-right: 2px; border: 1px solid #000; }
.cat aside { position: sticky; top: 52px; align-self: start; background: var(--panel); border: 1px solid var(--rule); border-radius: 4px; padding: 10px; display: flex; flex-direction: column; gap: 6px; max-height: calc(100vh - 70px); overflow: auto; }
.cat aside h2 { font-size: 11px; letter-spacing: .08em; text-transform: uppercase; color: var(--dim); margin: 4px 0 0; font-weight: 600; }
.cat aside canvas { width: 100%; aspect-ratio: 4 / 5; background: #0a0c10; border-radius: 2px; image-rendering: pixelated; }
.cat aside ul { margin: 0; padding: 0; list-style: none; font-size: 11.5px; } .cat aside li { display: flex; gap: 6px; padding: 1px 0; }
.cat aside li span:first-child { color: var(--dim); width: 112px; flex: none; } .cat aside li.hid { opacity: .55; }
.cat .row { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; }
@media (max-width: 760px) { .cat { grid-template-columns: 1fr; padding: 12px 16px; } .cat aside { position: static; max-height: none; order: -1; } }`;

const FACINGS = [['S', 0], ['SE', Math.PI / 4], ['E', Math.PI / 2], ['NE', 3 * Math.PI / 4], ['N', Math.PI], ['NW', -3 * Math.PI / 4], ['W', -Math.PI / 2], ['SW', -Math.PI / 4]];
const POSES = { idle: ['idle', .6], guard: ['guard', .5], run: ['run', .2], J1: ['J1', .185], J3: ['J3', .265] };
const MANNEQUIN = '#4c5157';    // lighter than the game's under-suit, so near-black cloth reads on it
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// ---- the page ----
document.title = 'Gear catalogue';
document.body.innerHTML = ''; { const st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st); }
const root = document.createElement('div'); root.className = 'cat'; document.body.appendChild(root);
const opts = (list, all) => (all ? `<option value="">${all}</option>` : '') + list.map(([v, t]) => `<option value="${v}">${t}</option>`).join('');
root.innerHTML = `<header><h1>Gear · 200 pieces</h1><p>Every piece on the iso slice's 3D model (base layer: shirts, trousers, hoods, gloves, sandals; armour layer over it), samurai, villager and ninja. Any piece goes with any other: pick <b>Wear</b> on a card to put it on the figure at the right.</p></header>
  <div class="bar" role="toolbar" aria-label="Filters">
    <label>Slot <select id="f-slot">${opts(SLOTS.map(s => [s, SLOT_NAME[s]]), 'all slots')}</select></label>
    <label>Layer <select id="f-layer">${opts(LAYERS.map(l => [l, LAYER_NAME[l]]), 'both layers')}</select></label>
    <label>Family <select id="f-fam">${opts(FAMILIES.map(f => [f, f]), 'all families')}</select></label>
    <label>Find <input id="f-q" type="search" placeholder="kote, straw, oxblood…" size="14"></label>
    <label>Shown <select id="f-on">${opts([['bare', 'alone on the body'], ['over', 'over a plain outfit']])}</select></label>
    <label>Facing <select id="f-face">${opts(FACINGS.map(([n], i) => [i, n]))}</select></label>
    <label>Pose <select id="f-pose">${opts(Object.keys(POSES).map(k => [k, k]))}</select></label>
    <label>Style <select id="f-style">${opts([[3, 'Painterly'], [0, 'Toon + dither'], [2, 'Anime limited'], [1, 'Pixel-render']])}</select></label>
    <span class="count" id="count" aria-live="polite"></span></div>
  <main class="grid" id="grid" aria-label="Pieces"></main>
  <aside aria-label="Try on"><h2>Try on</h2><canvas id="pv" width="320" height="400" aria-label="The figure wearing the outfit below"></canvas>
    <div class="row"><button id="t-turn" type="button">Turn</button><button id="t-rand" type="button">Random</button><select id="t-fam" aria-label="Random from">${opts(FAMILIES.map(f => [f, f]), 'any')}</select><button id="t-clear" type="button">Clear</button></div>
    <label>Preset <select id="t-preset">${opts(PRESETS.map(p => [p.id, p.name]), 'pick a preset…')}</select></label>
    <div class="stats" id="t-stats"></div><ul id="t-list"></ul><p class="rules" id="t-rules"></p></aside>`;
const $ = id => root.querySelector('#' + id), grid = $('grid');
$('f-face').value = '1';

// ---- the renderer: the slice's pipeline on a hidden canvas, a floor, one warm lamp so the dark gear reads ----
const glc = document.createElement('canvas'), pipe = makePipeline(glc), scene = new THREE.Scene(), cam = new THREE.Camera(); cam.matrixAutoUpdate = false;
scene.add(piece().box(400, 2, 400, RAMP.n[4], { p: [0, -1, 0] }).mesh(shadeMat({ obj: 0 })));
SH.uLampPos.value[0].set(-14, 18, 16, 60); SH.uLampCol.value[0].set(1, .72, .45, .55);
SH.uLampPos.value[1].set(16, 10, -14, 50); SH.uLampCol.value[1].set(.45, .6, .9, .35);
function applyStyle() { setStyle(+$('f-style').value); Object.assign(PIPE, { k: 1, lowres: +$('f-style').value === 1 ? 1 : 0, fog: 0, rain: 0, clash: 0 }); }
applyStyle();
const W0 = { t: 0, dt: 1 / 120, fx: [], event() {}, actors: [] }, poseCache = {};
function poseOf(name) { if (poseCache[name]) return poseCache[name]; const [clip, t] = POSES[name], a = new Actor(W0, { x: 0, z: 0, h: 0, foe: 0 });
  a.v = clip === 'run' ? 110 : 0; a.vt = a.v; a.play(clip, { blend: 0 }); for (let i = 0, n = Math.round(t / W0.dt); i <= n; i++) a.update(W0.dt); return poseCache[name] = a.pose; }
// draw `outfit` at `yaw`, zoomed, and copy the middle of the frame into the 2D canvas `out`
// where a card looks: each slot framed on its own bone, wherever the pose put it ([bone, zoom, height above it])
const FRAME = { head: ['head', 8, 2.2], torso: ['chest', 6.4, .6], armL: ['foreL', 7, .5], armR: ['foreR', 7, .5], handL: ['handL', 9, -.4], handR: ['handR', 9, -.4],
  legs: ['shinR', 6.2, 1.2], feet: ['footR', 8, .2], all: ['hips', 6.2, 1.6] };
// a wide brim needs the frame pulled back to fit
const frameOf = p => { const hat = p.parts.find(q => q.k === 'hat' && q.R); return hat ? ['head', Math.min(8, 40 / hat.R), 3] : FRAME[p.slot]; };
const _v = new THREE.Vector3();
function draw(outfit, yaw, out, [bone, zoom, up], pose = $('f-pose').value) {
  const look = threeLook({ outfit, body: MANNEQUIN }); look.mount(scene); LOOK3D.hatTilt = 14;
  SH.uHatOn.value = 0; look.show({ pose: poseOf(pose), x: 0, y: 0, z: 0, yaw, flash: false, tint: null, alpha: 1, hero: true });
  look.rig.B[bone].getWorldPosition(_v); _v.y += up;
  const px = _v.x, py = _v.z - OBL.b * _v.y / OBL.a; CAM.px = px; CAM.py = py; projMatrix(cam.projectionMatrix, px, py, zoom); cam.projectionMatrixInverse.copy(cam.projectionMatrix).invert();
  SH.uDOff.value.set(0, 0); pipe.fx.clearRect(0, 0, pipe.fxCanvas.width, pipe.fxCanvas.height); look.stamp(pipe.fx);
  pipe.render(scene, cam);
  const g = out.getContext('2d'), k = pipe.k, w = out.width * k, h = out.height * k;
  g.imageSmoothingEnabled = false; g.clearRect(0, 0, out.width, out.height); g.drawImage(glc, glc.width / 2 - w / 2, glc.height / 2 - h / 2, w, h, 0, 0, out.width, out.height);
  look.dispose(); for (const m of look.rig.meshes) m.geometry.dispose();
}

// ---- the cards ----
const PLAIN = (() => { const o = empty(); o.torso.base = 'kosode-black'; o.legs.base = 'momohiki'; o.feet.base = 'black-tabi'; return o; })();
const wearOne = p => { const o = $('f-on').value === 'over' ? decode(encode(PLAIN)) : empty(); o[p.slot][p.layer] = p.id; return o; };
const swatches = p => Object.values(p.pal).filter((v, i, a) => a.indexOf(v) === i).map(k => `<span class="sw" style="background:${DYES[k].r[4]}" title="${DYES[k].name}"></span>${DYES[k].name}`).join(' ');
const ruleText = p => [p.hides.length && `hides ${p.hides.join(', ')} under it`, p.shapes && `${Object.entries(p.shapes).map(([z, f]) => `${f === 'rolled' ? 'rolls up' : 'tucks in'} the ${z === 'fore' ? 'sleeve' : z === 'shin' ? 'trouser leg' : z}`).join(', ')}`].filter(Boolean).join('; ');
const cards = GEAR.map(p => {
  const el = document.createElement('article'); el.className = 'card'; el.dataset.id = p.id;
  const st = STAT_KEYS.filter(k => p.stats[k]).map(k => `${STAT_SHORT[k]} +${p.stats[k]}`).join('  ');
  el.innerHTML = `<canvas width="180" height="200" role="img" aria-label="${esc(p.name)} on the figure"></canvas><h3>${esc(p.name)}</h3>
    <div class="chips"><span class="chip">${SLOT_NAME[p.slot]}</span><span class="chip">${LAYER_NAME[p.layer]}</span><span class="chip ${p.family}">${p.family}</span><span class="chip ${p.rarity}">${p.rarity}</span></div>
    <div class="stats">${st}</div><p class="about">${esc(p.about)}</p><p class="rules">${swatches(p)}${ruleText(p) ? ' · ' + esc(ruleText(p)) : ''}</p>
    <button type="button" aria-pressed="false">Wear</button>`;
  el.querySelector('button').onclick = () => { const o = decode(encode(tryOn)); o[p.slot][p.layer] = o[p.slot][p.layer] === p.id ? null : p.id; setTry(o); };
  grid.appendChild(el); return { p, el, cv: el.querySelector('canvas'), drawn: null };
});
// draw the cards in view, a few a frame
const queue = new Set(), seen = new IntersectionObserver(es => { for (const e of es) { const c = cards.find(c => c.el === e.target); if (e.isIntersecting) queue.add(c); else queue.delete(c); } }, { rootMargin: '300px' });
for (const c of cards) seen.observe(c.el);
const view = () => `${$('f-on').value}|${$('f-face').value}|${$('f-pose').value}|${$('f-style').value}`;
// a left piece is drawn from the mirrored facing, so it faces us; hands in the guard (in idle the hilt hides them)
function pump() { const v = view(); let n = 0; for (const c of queue) { if (c.el.hidden || c.drawn === v) continue;
    const pose = c.p.slot.startsWith('hand') && $('f-pose').value === 'idle' ? 'guard' : $('f-pose').value;
    draw(wearOne(c.p), FACINGS[+$('f-face').value][1] * (c.p.side === 'L' ? -1 : 1), c.cv, frameOf(c.p), pose); c.drawn = v; c.el.dataset.v = 'y'; if (++n >= 3) break; }
  requestAnimationFrame(pump); }
requestAnimationFrame(pump);
function filter() { const s = $('f-slot').value, l = $('f-layer').value, f = $('f-fam').value, q = $('f-q').value.trim().toLowerCase(); let n = 0;
  for (const c of cards) { const p = c.p, txt = `${p.name} ${p.about} ${p.id} ${Object.values(p.pal).map(k => DYES[k].name).join(' ')}`.toLowerCase();
    c.el.hidden = !((!s || p.slot === s) && (!l || p.layer === l) && (!f || p.family === f) && (!q || txt.includes(q))); if (!c.el.hidden) n++; }
  $('count').textContent = `${n} of ${GEAR.length}`; }
for (const id of ['f-slot', 'f-layer', 'f-fam', 'f-q']) $(id).oninput = filter;
$('f-style').onchange = () => { applyStyle(); drawTry(); };
for (const id of ['f-on', 'f-face', 'f-pose']) $(id).onchange = () => drawTry();
filter();

// ---- the try-on figure ----
let tryOn = decode(encode(PRESETS.find(p => p.id === 'three-roads').o)), face = 1, turning = false, turnT = 0;
function drawTry() { draw(tryOn, FACINGS[face][1], $('pv'), FRAME.all); }
function setTry(o) { tryOn = o; $('t-preset').value = '';
  const st = outfitStats(o), res = resolve(o); $('t-stats').textContent = STAT_KEYS.map(k => `${STAT_SHORT[k]} +${st[k]}`).join('  ');
  $('t-list').innerHTML = SLOTS.flatMap(s => LAYERS.map(l => { const p = BY_ID[o[s][l]]; if (!p) return ''; const all = res.entries.filter(e => e.p === p), hid = all.length && all.every(e => e.hidden);
    return `<li class="${hid ? 'hid' : ''}"><span>${SLOT_NAME[s]} · ${l}</span><span>${esc(p.name.replace(/, (left|right)$/, ''))}${hid ? ' (under ' + esc(all[0].hidden.name.replace(/, (left|right)$/, '')) + ')' : ''}</span></li>`; })).join('') || '<li>Nothing: the bare figure. Pick Wear on a card.</li>';
  const shaped = res.entries.filter(e => e.shapedBy && !e.hidden).map(e => `${e.p.name.replace(/, (left|right)$/, '')} shaped by ${e.shapedBy.name.replace(/, (left|right)$/, '')}`);
  $('t-rules').textContent = [...new Set(shaped)].join('; ');
  for (const c of cards) { const on = o[c.p.slot][c.p.layer] === c.p.id; c.el.classList.toggle('worn', on); const b = c.el.querySelector('button'); b.textContent = on ? 'Take off' : 'Wear'; b.setAttribute('aria-pressed', on); }
  drawTry(); }
$('t-turn').onclick = () => { turning = !turning; $('t-turn').textContent = turning ? 'Stop' : 'Turn'; };
$('t-rand').onclick = () => setTry(randomOutfit(Date.now() % 1e6, $('t-fam').value || null));
$('t-clear').onclick = () => setTry(empty());
$('t-preset').onchange = e => { const p = PRESETS.find(p => p.id === e.target.value); if (p) { setTry(decode(encode(p.o))); $('t-preset').value = p.id; } };
$('pv').onclick = () => { face = (face + 1) % 8; drawTry(); };
(function spin(t) { if (turning && t - turnT > 450) { turnT = t; face = (face + 1) % 8; drawTry(); } requestAnimationFrame(spin); })(0);
setTry(tryOn);
// a read-only hook for the checks
window.__gear = { ready: true, get drawn() { return cards.filter(c => c.drawn).length; }, get shown() { return cards.filter(c => !c.el.hidden).length; }, RARITY, KIND_NAME };
