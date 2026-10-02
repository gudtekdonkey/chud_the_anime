// ---- The ?iso page: the game canvas (scaled up by whole multiples when it fits, nearest-neighbour), and a small
// overlay: the frame time, the model switch, one toggle per pipeline step (what each does, for the owner to see), the
// camera's body angle and the hat's tunables, and the controls. Every choice is also a key.
import { PIPE } from '../gfx/post.js';
import { LOOK3D } from '../look/three/look3d.js';
import { SETTINGS } from '../anim/flow.js';
import { setBody, BODY } from '../gfx/view.js';
import { STYLE, setStyle } from '../gfx/style.js';

const CSS = `
:root { color-scheme: dark; --bg: #0b0d10; --panel: #13161a; --rule: #262b31; --fg: #d9dfdd; --dim: #8b9592; --cyan: #6ff3e4; }
html, body { margin: 0; background: var(--bg); color: var(--fg); font: 13px/1.45 system-ui, sans-serif; }
.iso { display: grid; grid-template-columns: minmax(0, 1fr) 260px; gap: 12px; padding: 12px; min-height: 100vh; box-sizing: border-box; }
.iso .stage { display: flex; align-items: flex-start; justify-content: center; min-width: 0; }
.iso canvas { display: block; background: #000; outline: 1px solid var(--rule); }
.iso canvas:focus-visible { outline: 2px solid var(--cyan); }
.iso aside { background: var(--panel); border: 1px solid var(--rule); padding: 10px 12px; align-self: start; }
.iso h1 { font-size: 14px; margin: 0 0 6px; color: var(--cyan); font-weight: 600; }
.iso h2 { font-size: 11px; letter-spacing: .08em; text-transform: uppercase; color: var(--dim); margin: 12px 0 4px; font-weight: 600; }
.iso label { display: flex; align-items: center; gap: 6px; padding: 2px 0; cursor: pointer; }
.iso label kbd, .iso .keys kbd { margin-left: auto; font: 11px ui-monospace, monospace; color: var(--dim); border: 1px solid var(--rule); padding: 0 4px; border-radius: 3px; }
.iso select { background: #0d1013; color: var(--fg); border: 1px solid var(--rule); font: inherit; padding: 1px 4px; margin-left: auto; }
.iso .ms { font: 12px ui-monospace, monospace; color: var(--cyan); }
.iso .keys div { display: flex; gap: 6px; padding: 1px 0; color: var(--dim); }
.iso .keys kbd { margin-left: 0; color: var(--fg); }
.iso p.note { color: var(--dim); font-size: 12px; margin: 6px 0 0; }
@media (max-width: 860px) { .iso { grid-template-columns: 1fr; } }
`;

export function buildPage() {
  document.title = 'Ronin, iso slice';
  document.body.innerHTML = ''; const st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);
  const root = document.createElement('div'); root.className = 'iso';
  root.innerHTML = `<div class="stage"><canvas id="iso" tabindex="0" aria-label="The iso slice. Click, then move with WASD or the arrows, J to cut, Shift or L to roll."></canvas></div>
  <aside aria-label="Slice settings">
    <h1>Iron Ash · iso slice</h1>
    <div class="ms" id="ms" aria-live="off">—</div>
    <h2>Model</h2>
    <label>Look <select id="o-look"><option value="3d">3D model</option><option value="pixel">Pixel (2D drawing)</option></select><kbd>M</kbd></label>
    <label>Style <select id="o-style"><option value="3">Painterly</option><option value="1">Pixel-render</option><option value="2">Anime limited</option><option value="0">Toon + dither</option></select><kbd>V</kbd></label>
    <label><input type="checkbox" id="o-clash">Clashes (impact frames, lines)<kbd>C</kbd></label>
    <label><input type="checkbox" id="o-cine">Finisher close-up<kbd>X</kbd></label>
    <h2>Pipeline</h2>
    <label><input type="checkbox" id="o-lowres">Low-res target<kbd>1</kbd></label>
    <label><input type="checkbox" id="o-toon">Toon bands<kbd>2</kbd></label>
    <label><input type="checkbox" id="o-dither">Dither<kbd>3</kbd></label>
    <label><input type="checkbox" id="o-palette">Palette<kbd>4</kbd></label>
    <label><input type="checkbox" id="o-outline">Outline<kbd>5</kbd></label>
    <label><input type="checkbox" id="o-nearest">Pixel upscale<kbd>6</kbd></label>
    <label><input type="checkbox" id="o-rim">Rim light<kbd>7</kbd></label>
    <label><input type="checkbox" id="o-glint">Keep the glints<kbd>8</kbd></label>
    <label>Bands <select id="o-bands"><option>3</option><option>4</option><option>5</option></select></label>
    <h2>Camera and hat</h2>
    <label>Bodies <select id="o-body"><option value="39.5">Picked: oblique, body from 39.5°</option><option value="upright">Upright: full height, 20°</option><option value="54">True 54°</option></select><kbd>B</kbd></label>
    <label>Hat tilt <select id="o-tilt"><option>0</option><option>8</option><option>14</option><option>20</option></select></label>
    <label>Brim <select id="o-brim"><option value="1">Wide, as drawn</option><option value=".72">Medium</option></select></label>
    <label>Facings <select id="o-free"><option value="0">8, stepped (sprites)</option><option value="1">Free (any angle)</option></select><kbd>F</kbd></label>
    <h2>World</h2>
    <label><input type="checkbox" id="o-fog">Ground mist<kbd>9</kbd></label>
    <label><input type="checkbox" id="o-rain">Rain<kbd>0</kbd></label>
    <h2>Controls</h2>
    <div class="keys"><div><kbd>WASD</kbd>/<kbd>←↑↓→</kbd> run</div><div>J3 on him: the close-up (any key skips)</div><div><kbd>J</kbd> cut, again for J2, J3</div><div><kbd>Shift</kbd>/<kbd>L</kbd> roll (cancels a cut)</div><div>J out of a run: the lunge</div></div>
    <p class="note">The samurai answers if you stand close (open with <code>&amp;calm</code> to stop him).</p>
  </aside>`;
  document.body.appendChild(root);
  const canvas = root.querySelector('#iso');
  return { root, canvas, ms: root.querySelector('#ms') };
}

// wire the controls to the settings; `onLook(kind)` swaps the model
export function wireOverlay(root, onLook) {
  const $ = id => root.querySelector('#' + id), boxes = { lowres: '1', toon: '2', dither: '3', palette: '4', outline: '5', nearest: '6', rim: '7', glint: '8', fog: '9', rain: '0', clash: 'C', cine: 'X' };
  const set = (k, v) => { if (k === 'glint') LOOK3D.glint = v; else PIPE[k] = v; if (PIPE.onChange) PIPE.onChange(); };
  const get = k => k === 'glint' ? LOOK3D.glint : PIPE[k];
  for (const k of Object.keys(boxes)) { const el = $('o-' + k); el.checked = !!get(k); el.onchange = () => set(k, el.checked ? 1 : 0); }
  $('o-bands').value = String(PIPE.bands); $('o-bands').onchange = e => { PIPE.bands = +e.target.value; };
  $('o-body').value = BODY.mode; $('o-body').onchange = e => setBody(e.target.value);
  $('o-tilt').value = String(LOOK3D.hatTilt); $('o-tilt').onchange = e => { LOOK3D.hatTilt = +e.target.value; };
  $('o-brim').value = String(LOOK3D.brim); $('o-brim').onchange = e => { LOOK3D.brim = +e.target.value; };
  $('o-free').value = String(SETTINGS.free); $('o-free').onchange = e => { SETTINGS.free = +e.target.value; };
  $('o-look').onchange = e => onLook(e.target.value);
  // a style presets the pipeline's steps (they stay toggles), so the boxes are read back after it
  const syncBoxes = () => { for (const k of Object.keys(boxes)) $('o-' + k).checked = !!get(k); $('o-bands').value = String(PIPE.bands); };
  $('o-style').value = String(STYLE.i); $('o-style').onchange = e => { setStyle(+e.target.value); syncBoxes(); };
  const cycle = (el, fire) => { el.selectedIndex = (el.selectedIndex + 1) % el.options.length; fire(el); };
  addEventListener('keydown', e => {
    if (e.target.tagName === 'SELECT' || e.repeat || e.ctrlKey || e.metaKey || e.altKey) return;
    const k = Object.keys(boxes).find(b => 'Digit' + boxes[b] === e.code || 'Key' + boxes[b] === e.code);
    if (k) { const el = $('o-' + k); el.checked = !el.checked; el.onchange(); return; }
    if (e.code === 'KeyM') cycle($('o-look'), el => onLook(el.value));
    if (e.code === 'KeyB') cycle($('o-body'), el => setBody(el.value));
    if (e.code === 'KeyF') cycle($('o-free'), el => { SETTINGS.free = +el.value; });
    if (e.code === 'KeyV') cycle($('o-style'), el => { setStyle(+el.value); syncBoxes(); });
  });
}
