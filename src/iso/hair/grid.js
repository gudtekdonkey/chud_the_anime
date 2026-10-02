// ---- ?iso&hairgrid: every hairstyle (columns) under every hat (rows), drawn through the pipeline in the active style,
// frozen in one pose and one of the eight facings. Four close pages (twelve hairs × five hats, &page=0..3) or all 240
// at once (&page=4); `[` and `]` (or the overlay) step the facing, the pose picker changes the moment; a pair the hat
// refuses is drawn bare-headed and struck through in red. &foe draws the samurai's body; &facing=k, &pose=run. window.__iso.hairgrid (read only) says what is on screen, and
// window.__iso.hairAudit() runs the audit (audit.js) for the check.
import { Actor, FA, CLIPS } from '../anim/flow.js';
import { makeLook } from '../look/look.js';
import { CAM, projMatrix, toScreen } from '../gfx/view.js';
import { PIPE } from '../gfx/post.js';
import { STYLE } from '../gfx/style.js';
import { piece } from '../gfx/build.js';
import { shadeMat } from '../gfx/shade.js';
import { RAMP } from '../gfx/palette.js';
import { HAIR, HATS } from './head.js';
import { resolve } from './contract.js';
import { gearHeads } from './gear-bridge.js';
import { PRESET } from '../gear/outfits.js';
import { params, go } from './nav.js';
import { audit, auditGear } from './audit.js';

const POSES = { idle: ['idle', .6], run: ['run', .45], J1: ['J1', .185], J3: ['J3', .265], roll: ['roll', .2], guard: ['guard', .5] };
const DX = 18.6, DZ = 25, X0 = 34, Z0 = 24;
// the rows: the hair set's own hats, then every gear head (gear-bridge.js: each head piece, each preset's pair), worn
// over Iron Ash in gear. A page: hairs [from, to), rows [from, to), its name
const GEAR = gearHeads(), ROWS = [...HATS.map(h => ({ hat: h, id: h.id, name: h.name })), ...GEAR.map(h => ({ gear: h, id: 'gear:' + [h.base, h.armour].filter(Boolean).join('+'), name: h.name }))];
export const PAGES = [[0, 12, 0, 5, 'Hairs 1–12 · hats 1–5'], [12, 24, 0, 5, 'Hairs 13–24 · hats 1–5'], [0, 12, 5, 10, 'Hairs 1–12 · hats 6–10'], [12, 24, 5, 10, 'Hairs 13–24 · hats 6–10'], [0, 24, 0, 10, 'All 240 (small)']];
for (let r = 0; r < GEAR.length; r += 5) for (const [a, b] of [[0, 12], [12, 24]]) PAGES.push([a, b, 10 + r, Math.min(10 + r + 5, ROWS.length), `Gear heads ${r + 1}–${Math.min(r + 5, GEAR.length)} · hairs ${a + 1}–${b}`]);
function poseOf(name) { const [clip, t] = POSES[name] || POSES.idle, W = { t: 0, dt: 1 / 120, fx: [], event() {} }, a = new Actor(W, { x: 0, z: 0, h: 0 });
  a.v = a.vt = clip === 'run' ? 110 : 0; a.play(clip, { blend: 0 }); for (let i = 0, n = Math.round(t / W.dt); i <= n; i++) a.update(W.dt); return a.pose; }

export function runHairGrid({ scene, pipe, cam, root, Q, wireOverlay }) {
  scene.add(piece().box(900, 2, 600, RAMP.n[5], { p: [240, -1, 150] }).mesh(shadeMat({ obj: 0 })));
  PIPE.rain = 0; PIPE.fog = 0; PIPE.k = Q.has('k') ? +Q.get('k') : 2;
  const foe = Q.has('foe'), cells = [], page = Math.min(PAGES.length - 1, +(Q.get('page') || 0) | 0), [h0, h1, t0, t1] = PAGES[page], zoom = +(Q.get('zoom') || (page !== 4 ? 2 : 1));
  // &hairs=a,b and &hats=c,d pick the rows and columns; &facings lays one hair's eight facings across instead
  const pickL = (list, k, a, b) => Q.get(k) ? Q.get(k).split(',').map(id => list.find(h => h.id === id)).filter(Boolean) : list.slice(a, b);
  const hairs = pickL(HAIR, 'hairs', h0, h1), hats = pickL(ROWS, 'hats', t0, t1), byFacing = Q.has('facings');
  const cv = root.querySelector('canvas'); cv.style.width = '100%'; cv.style.height = 'auto';
  let facing = +(Q.get('facing') || 0) & 7, poseName = POSES[Q.get('pose')] ? Q.get('pose') : 'idle', pose = poseOf(poseName), drawn = 0, shownAt = 0;
  hats.forEach((hat, r) => (byFacing ? FA.map((_, k) => [hairs[0], k]) : hairs.map(h => [h, null])).forEach(([hair, k], c) => {
    const look = hat.gear ? makeLook('3d', { foe, outfit: { ...PRESET['iron-ash'].o, head: { base: hat.gear.base, armour: hat.gear.armour } }, head: { hair: hair.id, hat: 'none' } })
      : makeLook('3d', { foe, head: { hair: hair.id, hat: hat.id } }); look.mount(scene);
    cells.push({ look, hair, hat, k, refused: hat.hat ? resolve(hair, hat.hat).refused : false, x: X0 + c * DX, z: Z0 + r * DZ });
  }));
  let dirty = 2;   // frozen: drawn again only when something changes (240 figures are heavy on a software GPU)
  const show = () => { for (const c of cells) c.look.show({ pose, x: c.x, y: 0, z: c.z, yaw: FA[c.k ?? facing], flash: false, tint: null, tintA: 0, alpha: 1, hero: false }); shownAt = drawn; dirty = 2; };
  show();
  // the overlay: the style and pipeline as in the courtyard, and the grid's own facing and pose
  wireOverlay(root, () => {});
  const aside = root.querySelector('aside'), sec = document.createElement('div'), names = ['S', 'SE', 'E', 'NE', 'N', 'NW', 'W', 'SW'];
  sec.innerHTML = `<h2>Every hair × every hat</h2>
    <label>Facing <select id="g-face">${names.map((n, i) => `<option value="${i}">${n}</option>`).join('')}</select><kbd>[ ]</kbd></label>
    <label>Page <select id="g-page">${PAGES.map(p => p[4]).map((n, i) => `<option value="${i}">${n}</option>`).join('')}</select></label>
    <label>Pose <select id="g-pose">${Object.keys(POSES).map(p => `<option>${p}</option>`).join('')}</select></label>
    <p class="note">${HAIR.length} hairstyles across, ${HATS.length} hats down (and ${GEAR.length} gear heads, over Iron Ash in gear); a red stroke: the hat refuses that hair (owner: the bandana takes only hair with nothing on the crown).</p>
    <label><a href="#" id="g-back">Back to the courtyard</a></label>`;
  aside.insertBefore(sec, aside.querySelector('h2'));
  const face = sec.querySelector('#g-face'), ps = sec.querySelector('#g-pose');
  face.value = String(facing); ps.value = poseName; sec.querySelector('#g-page').value = String(page);
  sec.querySelector('#g-page').onchange = e => { const q = params(); q.set('page', e.target.value); q.set('facing', facing); q.set('pose', poseName); go(q); };
  const setFacing = k => { facing = (k + 8) % 8; face.value = String(facing); show(); };
  face.onchange = () => setFacing(+face.value); ps.onchange = () => { poseName = ps.value; pose = poseOf(poseName); show(); };
  addEventListener('keydown', e => { if (e.code === 'BracketRight') setFacing(facing + 1); if (e.code === 'BracketLeft') setFacing(facing - 1); });
  sec.querySelector('#g-back').onclick = e => { e.preventDefault(); const q = params(); q.delete('hairgrid'); go(q); };
  root.querySelector('h1').textContent = 'Iron Ash · hair × hats';

  const at = Q.get('cell') && Q.get('cell').split(',').map(Number);   // &cell=c,r&zoom=6: a close look at a few pairs
  const cx = at ? X0 + at[0] * DX : X0 + (hairs.length - 1) * DX / 2 - 8 / zoom, cz = at ? Z0 + at[1] * DZ - 9 : Z0 + (hats.length - 1) * DZ / 2 - 8 + 2 / zoom;
  for (const ev of ['change', 'click']) root.addEventListener(ev, () => { dirty = 2; });
  addEventListener('keydown', () => { dirty = 2; });
  function loop() {
    requestAnimationFrame(loop); if (!dirty) return; dirty--;
    CAM.px = CAM.x = cx; CAM.py = CAM.z = cz; CAM.zoom = zoom; projMatrix(cam.projectionMatrix, cx, cz, zoom); cam.projectionMatrixInverse.copy(cam.projectionMatrix).invert();
    const g = pipe.fx; g.clearRect(0, 0, pipe.fxCanvas.width, pipe.fxCanvas.height);
    for (const c of cells) c.look.stamp(g);
    g.font = `${zoom > 1 ? 13 : 9}px ui-monospace, monospace`; g.textAlign = 'center'; g.fillStyle = '#d9dfdd';
    (byFacing ? names.map(n => ({ name: `${hairs[0].name} ${n}` })) : hairs).forEach((h, i) => { const [x, y] = toScreen(X0 + i * DX, 30, Z0 - 6); g.save(); g.translate(x, y); g.rotate(zoom > 1 ? -.25 : -.5); g.fillText(h.name, 0, 0); g.restore(); });
    g.textAlign = 'left'; hats.forEach((h, r) => { const [, y] = toScreen(0, 6, Z0 + r * DZ); h.name.split(' + ').forEach((t, i) => g.fillText(t.length > 18 ? t.slice(0, 17) + '…' : t, 4, y + i * (zoom > 1 ? 15 : 10))); });
    g.strokeStyle = '#ff5a4a'; g.lineWidth = 2;
    for (const c of cells) if (c.refused) { const [x, y] = toScreen(c.x, 12, c.z), k = zoom; g.beginPath(); g.moveTo(x - 12 * k, y - 14 * k); g.lineTo(x + 12 * k, y + 14 * k); g.stroke(); }
    pipe.render(scene, cam); drawn++;
  }
  requestAnimationFrame(loop);
  window.__iso = { ready: true, grid: true,
    get hairgrid() { return { page, cells: cells.length, hairs: hairs.map(h => h.id), hats: hats.map(h => h.id), refused: cells.filter(c => c.refused).length, facing, pose: poseName, framesSince: drawn - shownAt, style: STYLE.s.name }; },
    hairAudit: o => audit(o), hairAuditGear: o => auditGear(o) };
}
export { CLIPS };
