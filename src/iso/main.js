// ---- The new direction's vertical slice, opened with ?iso (docs/iso-slice.md). Iron Ash V3 in a night courtyard,
// the Sea of Stars camera, the Animation Flow page's moves, one samurai; the 3D model or the pixel drawing behind one
// look interface. A fixed 60 Hz update (the flow's world steps twice, at 1/120 s, as on its page), a render per frame.
import * as THREE from 'three';
import { makePipeline, PIPE } from './gfx/post.js';
import { CAM, follow, U, OBL, VW, projMatrix } from './gfx/view.js';
import { SH } from './gfx/shade.js';
import { buildRoom, ROOM } from './world/room.js';
import { W } from './play/sim.js';
import { Hero } from './play/hero.js';
import { Foe } from './play/foe.js';
import { hitRules, STATS } from './play/rules.js';
import { initInput, readInput } from './play/input.js';
import { drawFx, drawTrail } from './fx/fx.js';
import { buildPage, wireOverlay } from './ui/overlay.js';
import { SETTINGS } from './anim/flow.js';
import './anim/moves.js';
import './anim/moves-extra.js';
import { buildSheet, SHEET_ROWS } from './sheet.js';
import { piece } from './gfx/build.js';
import { shadeMat } from './gfx/shade.js';
import { RAMP } from './gfx/palette.js';

const Q = new URLSearchParams(location.search), TICKS = +(Q.get('tick') || 0);
const { root, canvas, ms } = buildPage();
const pipe = makePipeline(canvas);
const scene = new THREE.Scene(), cam = new THREE.Camera(); cam.matrixAutoUpdate = false;
if (Q.has('sheet')) runSheet(); else runGame();

// ?iso&sheet: the contact sheet (sheet.js), frozen
function runSheet() {
  scene.add(piece().box(900, 2, 600, RAMP.n[5], { p: [240, -1, 150] }).mesh(shadeMat({ obj: 0 }))); const rows = (Q.get('rows') || '0,1,2,3').split(',').map(i => SHEET_ROWS[+i]); const sh = buildSheet(scene, Q.has('foe'), rows); sh.show();
  PIPE.rain = 0; PIPE.fog = 0; PIPE.k = Q.has('k') ? +Q.get('k') : 2;
  const loop = () => { CAM.px = CAM.x = sh.center[0]; CAM.py = CAM.z = sh.center[1]; projMatrix(cam.projectionMatrix, CAM.px, CAM.py, +(Q.get('zoom') || 1.9)); cam.projectionMatrixInverse.copy(cam.projectionMatrix).invert();
    pipe.fx.clearRect(0, 0, 960, 540); sh.stamp(pipe.fx); pipe.render(scene, cam); requestAnimationFrame(loop); };
  requestAnimationFrame(loop); window.__iso = { ready: true, sheet: true };
}

function runGame() {
  const room = buildRoom(scene);
  let lookKind = Q.get('look') === 'pixel' ? 'pixel' : '3d';
  const hero = new Hero({ x: 250, z: 120, h: 0, look: lookKind }), foe = new Foe({ x: 330, z: 110, h: -Math.PI / 2, look: lookKind }, Q.has('calm'));
  const chars = [hero, foe]; for (const c of chars) c.look.mount(scene);
  hitRules({ hero, foe });
  initInput(canvas);
  // the model switch: every character's look is swapped; nothing else is told
  const setLook = kind => { lookKind = kind; for (const c of chars) { c.setLook(kind, scene); c.shown = null; } root.querySelector('#o-look').value = kind; };
  wireOverlay(root, setLook); root.querySelector('#o-look').value = lookKind;

  // the canvas fills the stage (16:9, under the window's height). With the low-res target on it shows the 960×540
  // pixels at a whole multiple when one fits (nearest-neighbour); off, the target is drawn at the canvas's own size
  // on the screen (k = its pixels ÷ 960), so nothing is ever scaled down
  function layout() { const st = root.querySelector('.stage'), avail = Math.min(st.clientWidth, (innerHeight - 24) * 16 / 9), dpr = devicePixelRatio || 1;
    const m = Math.floor(avail * dpr / VW), w = PIPE.lowres && m >= 1 ? VW * m / dpr : avail;
    canvas.style.width = Math.floor(w) + 'px'; canvas.style.height = Math.floor(w * 9 / 16) + 'px';
    PIPE.k = Math.max(1, Math.min(3, Math.floor(w) * dpr / VW)); }
  addEventListener('resize', layout); layout(); PIPE.onChange = layout;

  // ---- the loop ----
  let last = performance.now(), acc = 0, fps = 60, frameMs = 0;
  const trailOf = c => { const b = c.bladeWorld(); c.trail.push(b ? { t: W.t, mid: b.mid, tip: b.tip } : { t: W.t, gap: 1 }); while (c.trail.length && W.t - c.trail[0].t > .2) c.trail.shift(); };
  function tick() {
    if (W.stop <= 0) { hero.control(readInput(), foe, W.t); foe.control(hero, W.t, 1 / 60); }   // a hit-stop holds the presses (they outlive it)
    for (let i = 0; i < 2; i++) if (W.step()) for (const c of chars) if (c.a.out !== c.sampled) { c.sampled = c.a.out; trailOf(c); }
  }
  function render(dt) {
    follow(cam, hero, ROOM.cam, dt);
    SH.uTime.value = W.t; SH.uDOff.value.set(Math.round(CAM.px * U * pipe.k), -Math.round(CAM.py * U * OBL.a * pipe.k));
    room.update(W.t, hero);
    SH.uHatOn.value = 0;
    for (const c of chars) { if (c.shown !== c.a.out || c.lookKind === '3d') { const f = c.frame(c === hero); if (f) c.look.show(f); c.shown = c.a.out; } }
    const g = pipe.fx; g.clearRect(0, 0, pipe.fxCanvas.width, pipe.fxCanvas.height);
    for (const c of chars) drawTrail(g, c.trail.map(s => s.gap ? s : { t: s.t, a: toPx(s.mid), b: toPx(s.tip) }), c.a.out ? c.a.out.t : W.t);
    drawFx(g, W);
    for (const c of chars) c.look.stamp(g);
    pipe.render(scene, cam);
  }
  const toPx = p => [VW / 2 + U * (p[0] - CAM.px), 270 + U * (OBL.a * (p[2] - CAM.py) - OBL.b * p[1])];
  function frame(now) {
    const dt = Math.min(.1, (now - last) / 1000); last = now; fps += (1 / Math.max(dt, 1e-3) - fps) * .05;
    const t0 = performance.now();
    if (TICKS) for (let i = 0; i < TICKS; i++) tick();   // &tick=N (the check, on a slow software GPU): N steps a frame, whatever the wall clock
  else { acc = Math.min(acc + dt, .1); while (acc >= 1 / 60) { acc -= 1 / 60; tick(); } }
    render(dt);
    frameMs += (performance.now() - t0 - frameMs) * .1;
    ms.textContent = `${frameMs.toFixed(1)} ms a frame (update + render) · ${fps.toFixed(0)} fps · ${Math.round(VW * pipe.k)}×${Math.round(540 * pipe.k)}`;
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
  canvas.focus();

  // a read-only hook for scripts/check-iso.mjs (dev, or ?test): read it, never steer the game through it
  if (import.meta.env.DEV || Q.has('test')) {
    const who = c => ({ x: c.x, z: c.z, h: c.a.h, yaw: c.a.out ? c.a.out.yaw : 0, state: c.state, ct: c.a.ct, v: c.a.v });
    window.__iso = { ready: true, STATS, PIPE, SETTINGS,
      get hero() { return { ...who(hero), armed: hero.armed, iframes: hero.iframes, hits: hero.hits, taken: hero.taken }; },
      get foe() { return { ...who(foe), hp: foe.hp, dead: foe.dead, hits: foe.hits, deaths: foe.deaths, reacts: foe.reacts.slice(-12) }; },
      // where each one's feet are on the canvas, 0..1 (for the check's close-up shots)
      get px() { return { hero: toPx([hero.x, 0, hero.z]).map((v, i) => v / (i ? 540 : VW)), foe: toPx([foe.x, 0, foe.z]).map((v, i) => v / (i ? 540 : VW)) }; },
      get look() { return lookKind; }, get fps() { return fps; }, get frameMs() { return frameMs; }, get t() { return W.t; } };
  }
}
