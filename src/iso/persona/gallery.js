// ---- ?iso&idles: the twenty idles side by side, each looping on its own ronin (or townsman: &folk), named, on a
// bare floor, at the game's clock. &who=<pick id> gives them all one persona (e.g. &who=p:Old%20master), &yaw=0..7 a
// facing (default 1, SE), &look=pixel the pages' drawing, &zoom the camera, &body=39.5 the picked body camera (upright by default), &only=a,b a few of them. The check screenshots it.
import { piece } from 'ronin-engine/render/gfx/build.js';
import { shadeMat } from 'ronin-engine/render/gfx/shade.js';
import { RAMP } from 'ronin-engine/render/gfx/palette.js';
import { PIPE } from 'ronin-engine/render/gfx/post.js';
import { CAM, projMatrix, toScreen, setBody } from 'ronin-engine/render/gfx/view.js';
import { W } from 'ronin-engine/clock/world.js';
import { Char } from '../play/char.js';
import { FA } from 'ronin-engine/flow/flow.js';
import { IDLE_NAMES, IDLES, forceIdle } from 'ronin-engine/flow/idles.js';
import { personaOf, pickOf } from './picks.js';
import { folkLook } from './folk.js';
import 'ronin-engine/persona/gait.js';

export function runGallery({ scene, cam, pipe, Q }) {
  scene.add(piece().box(900, 2, 600, RAMP.n[5], { p: [240, -1, 150] }).mesh(shadeMat({ obj: 0 })));
  PIPE.rain = 0; PIPE.fog = 0; PIPE.k = 2; setBody(Q.get('body') || 'upright');   // upright bodies by default: the poses read better than under the brim
  const aside = document.querySelector('.iso aside'); if (aside) aside.style.display = 'none';
  const cv = document.querySelector('canvas'); cv.style.width = 'min(100%, calc((100vh - 24px) * 16 / 9))'; cv.style.height = 'auto'; cv.style.aspectRatio = '16 / 9';
  const names = Q.has('only') ? Q.get('only').split(',') : IDLE_NAMES, cols = Math.min(5, names.length), rows = Math.ceil(names.length / cols);
  const dx = 60, dz = 44, x0 = 240 - dx * (cols - 1) / 2, z0 = 150 - dz * (rows - 1) / 2, yaw = FA[+(Q.get('yaw') ?? 1)], folk = Q.has('folk');
  const P = personaOf(Q.has('who') ? pickOf(Q.get('who')).list(1) : [], { armed: !folk });
  const cast = names.map((id, i) => { const c = new Char({ x: x0 + (i % cols) * dx, z: z0 + Math.floor(i / cols) * dz, h: yaw, look: Q.get('look') === 'pixel' ? 'pixel' : folk ? 'folk' : '3d' });
    if (folk && c.lookKind === 'folk') c.look = folkLook({ seed: i + 1 });
    c.after = () => {}; c.a.persona = P; c.a.generic = true; c.a.seed = i + 1; forceIdle(c.a, id); c.a.play('idle'); c.a.update(1 / 120); c.a.sample(true); c.look.mount(scene); c.id = id; return c; });
  const zoom = +(Q.get('zoom') || (names.length > 5 ? 1.5 : 2.6));
  const loop = () => {
    const steps = Math.max(2, +(Q.get('tick') || 0) * 2); for (let i = 0; i < steps; i++) W.step();
    for (const c of cast) { c.a.h = c.a.ht = yaw; const f = c.frame(); if (f) c.look.show(f); }
    CAM.px = CAM.x = 240; CAM.py = CAM.z = 150 - 4; projMatrix(cam.projectionMatrix, CAM.px, CAM.py, zoom); cam.projectionMatrixInverse.copy(cam.projectionMatrix).invert();
    const g = pipe.fx; g.clearRect(0, 0, pipe.fxCanvas.width, pipe.fxCanvas.height); g.font = '8px ui-monospace, monospace'; g.textAlign = 'center';
    for (const c of cast) { const [x, y] = toScreen(c.x, -3, c.z + 10), cur = c.a.idler && c.a.idler.cur === c.id; g.fillStyle = cur ? '#6ff3e4' : '#8b9592'; g.fillText(c.id, x, y); }
    for (const c of cast) c.look.stamp(g);
    pipe.render(scene, cam); requestAnimationFrame(loop); };
  requestAnimationFrame(loop);
  window.__iso = { ready: true, gallery: true, get t() { return W.t; },
    get idles() { return cast.map(c => ({ id: c.id, n: c.a.idler.n, cur: c.a.idler.cur, about: IDLES[c.id].about })); } };
}
