// ---- The new direction's vertical slice, opened with ?iso (docs/iso-slice.md). Iron Ash V3 in a night courtyard,
// the Sea of Stars camera, the Animation Flow page's moves, one samurai; the 3D model or the pixel drawing behind one
// look interface. A fixed 60 Hz update (the flow's world steps twice, at 1/120 s, as on its page), a render per frame.
import * as THREE from 'three';
import { makePipeline, PIPE, MOMENT } from './gfx/post.js';
import { CAM, follow, U, OBL, VW, projMatrix, toScreen } from './gfx/view.js';
import { SH } from './gfx/shade.js';
import { buildRoom, ROOM } from './world/room.js';
import { W } from './play/sim.js';
import { Hero } from './play/hero.js';
import { Foe } from './play/foe.js';
import { hitRules, STATS } from './play/rules.js';
import { initInput, readInput } from './play/input.js';
import { drawFx, drawTrail, drawFocus, speedLines } from './fx/fx.js';
import { CINE, startCine, cineStep } from './fx/cine.js';
import { STYLE, setStyle, fpsFor } from './gfx/style.js';
import { buildPage, wireOverlay } from './ui/overlay.js';
import { SETTINGS, AF } from './anim/flow.js';
import './anim/moves.js';
import './anim/moves-extra.js';
import { buildSheet, SHEET_ROWS } from './sheet.js';
import { REELS, M as REEL_M, reelPos } from './reel.js';
import { piece } from './gfx/build.js';
import { shadeMat } from './gfx/shade.js';
import { RAMP } from './gfx/palette.js';
import { runHairGrid } from './hair/grid.js';
import { mountHairPanel } from './hair/panel.js';
import { HEADS } from './hair/head.js';
import { hairOf } from './hair/gear-bridge.js';
import { params } from './hair/nav.js';
import { startOutfit, wireGear } from './gear/ui.js';
import { encode } from './gear/outfits.js';

const Q = params(), TICKS = +(Q.get('tick') || 0);
const { root, canvas, ms } = buildPage();
const pipe = makePipeline(canvas);
SETTINGS.fpsFor = fpsFor; setStyle(Q.has('style') ? +Q.get('style') : 3);   // the owner's pick: Painterly (gfx/style.js)
const scene = new THREE.Scene(), cam = new THREE.Camera(); cam.matrixAutoUpdate = false;
if (Q.has('sheet')) runSheet(); else if (Q.has('hairgrid')) runHairGrid({ scene, pipe, cam, root, Q, wireOverlay }); else runGame(Q.has('reel') ? REELS[Q.get('reel')] || REELS.chain : null);

// ?iso&sheet: the contact sheet (sheet.js), frozen
function runSheet() {
  scene.add(piece().box(900, 2, 600, RAMP.n[5], { p: [240, -1, 150] }).mesh(shadeMat({ obj: 0 }))); const rows = (Q.get('rows') || '0,1,2,3').split(',').map(i => SHEET_ROWS[+i]); const sh = buildSheet(scene, Q.has('foe'), rows, Q.has('outfit') ? startOutfit(Q) : null); sh.show();
  PIPE.rain = 0; PIPE.fog = 0; PIPE.k = Q.has('k') ? +Q.get('k') : 2;
  const loop = () => { CAM.px = CAM.x = sh.center[0]; CAM.py = CAM.z = sh.center[1]; projMatrix(cam.projectionMatrix, CAM.px, CAM.py, +(Q.get('zoom') || 1.9)); cam.projectionMatrixInverse.copy(cam.projectionMatrix).invert();
    pipe.fx.clearRect(0, 0, 960, 540); sh.stamp(pipe.fx); pipe.render(scene, cam); requestAnimationFrame(loop); };
  requestAnimationFrame(loop); window.__iso = { ready: true, sheet: true };
}

// the game; or, with &reel=<name>, one of the Animation Flow page's scenarios on its script (reel.js)
function runGame(reel) {
  const room = buildRoom(scene);
  let lookKind = Q.get('look') === 'pixel' ? 'pixel' : '3d';
  // what he wears (gear/, the outfit picker): Iron Ash as built unless the URL or the last visit picked an outfit;
  // a reel keeps the Animation Flow page's look unless the URL asks
  const outfit = reel && !Q.has('outfit') ? null : startOutfit(Q);
  let hairPanel = null; const suggestHair = o => { const h = hairOf(o); if (h) HEADS.hero.hair = h; if (hairPanel) hairPanel.sync(); };   // an outfit's gear hair picks his hair
  suggestHair(outfit);
  const hero = new Hero({ x: 250, z: 120, h: 0, look: lookKind, outfit }), foe = new Foe({ x: 330, z: 110, h: -Math.PI / 2, look: lookKind }, Q.has('calm') || !!reel);
  const chars = [hero, foe]; for (const c of chars) c.look.mount(scene);
  const script = [];
  if (reel) {   // place them as the page does, hide the samurai unless the scenario has one, and queue its commands
    foe.a.alpha = 0; foe.reel = true; const place = (c, x, z, h) => { const [wx, wz] = reelPos(x, z); c.a.x = wx / AF; c.a.z = wz / AF; c.a.h = c.a.ht = h;
      c.a.feet.N.lock = c.a.feet.F.lock = 0; c.a.feet.N.off = c.a.feet.F.off = 0; c.a.prev = null; c.a.update(W.dt); c.a.sample(true); return c.a; };   // moved: let go of the planted feet
    reel.build({ hero: (x, z, h) => place(hero, x, z, h), foe: (x, z, h) => { foe.a.alpha = 1; return place(foe, x, z, h); }, at: (t, fn) => script.push([t, fn]), M: REEL_M });
    script.sort((a, b) => a[0] - b[0]); PIPE.cine = Q.has('cine') ? 1 : 0; PIPE.clash = Q.has('clash') ? 1 : 0; }
  hitRules({ hero, foe });
  initInput(canvas);
  // the model switch: every character's look is swapped; nothing else is told
  const setLook = kind => { lookKind = kind; for (const c of chars) { c.setLook(kind, scene); c.shown = null; } root.querySelector('#o-look').value = kind; };
  wireOverlay(root, setLook); root.querySelector('#o-look').value = lookKind;
  wireGear(root, outfit, o => { hero.dress(o, scene); suggestHair(o); });
  hairPanel = mountHairPanel(root, { outfit: () => hero.outfit });   // hair and hat pickers (hair/panel.js); a dressed outfit's head piece is his hat

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
  const runScript = () => { while (script.length && script[0][0] <= W.t) script.shift()[1](); };
  // the finisher's close-up (fx/cine.js): J3 starting on a samurai within reach
  function presentation(dt) { if (hero.state === 'J3' && hero.prevState !== 'J3' && !foe.dead && Math.hypot(foe.x - hero.x, foe.z - hero.z) < 40) startCine(hero, foe);
    hero.prevState = hero.state; cineStep(W.stop > 0 ? 0 : dt); }
  function tick() {
    if (W.stop <= 0 && !reel) { hero.control(readInput(), foe, W.t); foe.control(hero, W.t, 1 / 60); }   // a hit-stop holds the presses (they outlive it)
    presentation(1 / 60);
    for (let i = 0; i < 2; i++) if (W.step(reel ? runScript : null)) for (const c of chars) if (c.a.out !== c.sampled) { c.sampled = c.a.out; trailOf(c); }
  }
  function render(dt) {
    if (reel) { const [x, z] = reelPos(...reel.T); CAM.px = CAM.x = x; CAM.py = CAM.z = z; projMatrix(cam.projectionMatrix, x, z, +(Q.get('zoom') || 2)); cam.projectionMatrixInverse.copy(cam.projectionMatrix).invert(); }
    else follow(cam, hero, ROOM.cam, dt);
    if (CINE.on) { const k = (CINE.zoom - 1) / 2.2; CAM.px = CAM.px + (CINE.cx - CAM.px) * Math.min(1, k); CAM.py = CAM.py + (CINE.cz - CAM.py) * Math.min(1, k);
      projMatrix(cam.projectionMatrix, CAM.px, CAM.py, CINE.zoom); cam.projectionMatrixInverse.copy(cam.projectionMatrix).invert(); MOMENT.focus = toPx([CINE.cx, 12, CINE.cz]); }
    // the clash: during a hit-stop the frame goes black and white, then inverted
    MOMENT.impact = W.stop > 0 ? (1 - W.stop / W.stopDur < .5 ? 1 : 2) : 0;
    SH.uTime.value = W.t; SH.uDOff.value.set(Math.round(CAM.px * U * pipe.k), -Math.round(CAM.py * U * OBL.a * pipe.k));
    room.update(W.t, hero);
    SH.uHatOn.value = 0;
    for (const c of chars) { if (c.shown !== c.a.out || c.lookKind === '3d') { const f = c.frame(c === hero); if (f) c.look.show(f); c.shown = c.a.out; } }
    const g = pipe.fx; g.clearRect(0, 0, pipe.fxCanvas.width, pipe.fxCanvas.height);
    for (const c of chars) drawTrail(g, c.trail.map(s => s.gap ? s : { t: s.t, a: toPx(s.mid), b: toPx(s.tip) }), c.a.out ? c.a.out.t : W.t, STYLE.s.trail);
    drawFx(g, W);
    if (PIPE.clash) { drawFocus(g, W);   // focus lines on a hit; speed lines behind a roll, a lunge or a skid
      for (const c of chars) if (['roll', 'lunge', 'skid', 'knock'].includes(c.state)) { const [x, y] = toPx([c.x, 10, c.z]), v = [Math.sin(c.a.h), Math.cos(c.a.h) * OBL.a]; speedLines(g, x, y, v[0], v[1], W.t); } }
    for (const c of chars) c.look.stamp(g);
    pipe.render(scene, cam);
  }
  const toPx = p => toScreen(p[0], p[1], p[2]);
  function frame(now) {
    const dt = Math.min(.1, (now - last) / 1000); last = now; fps += (1 / Math.max(dt, 1e-3) - fps) * .05;
    const t0 = performance.now();
    if (reel) { /* the reel steps only when asked (window.__reel.seek) */ }
    else if (TICKS) for (let i = 0; i < TICKS; i++) tick();   // &tick=N (the check, on a slow software GPU): N steps a frame, whatever the wall clock
  else { acc = Math.min(acc + dt, .1); while (acc >= 1 / 60) { acc -= 1 / 60; tick(); } }
    render(dt);
    frameMs += (performance.now() - t0 - frameMs) * .1;
    ms.textContent = `${frameMs.toFixed(1)} ms a frame (update + render) · ${fps.toFixed(0)} fps · ${Math.round(VW * pipe.k)}×${Math.round(540 * pipe.k)}`;
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
  canvas.focus();

  // the reel's one control: step the world to game time t (its script fires on the way), then draw that frame
  if (reel) window.__reel = { seek(t) { while (W.t < t - 1e-6) tick(); render(0); return W.t; }, get stop() { return W.stop; },
    // n world steps of 1/120 s, hit-stops included, as the page's sheets count them
    steps(n) { for (let i = 0; i < n; i++) { if (W.step(runScript)) for (const c of chars) if (c.a.out !== c.sampled) { c.sampled = c.a.out; trailOf(c); } presentation(1 / 120); } render(0); return W.t; } };
  // a read-only hook for scripts/check-iso.mjs (dev, or ?test): read it, never steer the game through it
  if (import.meta.env.DEV || Q.has('test')) {
    const who = c => ({ x: c.x, z: c.z, h: c.a.h, yaw: c.a.out ? c.a.out.yaw : 0, state: c.state, ct: c.a.ct, v: c.a.v });
    window.__iso = { ready: true, STATS, PIPE, SETTINGS,
      get hero() { return { ...who(hero), armed: hero.armed, iframes: hero.iframes, hits: hero.hits, taken: hero.taken }; },
      get foe() { return { ...who(foe), hp: foe.hp, dead: foe.dead, hits: foe.hits, deaths: foe.deaths, reacts: foe.reacts.slice(-12) }; },
      // where each one's feet are on the canvas, 0..1 (for the check's close-up shots)
      get px() { return { hero: toPx([hero.x, 0, hero.z]).map((v, i) => v / (i ? 540 : VW)), foe: toPx([foe.x, 0, foe.z]).map((v, i) => v / (i ? 540 : VW)) }; },
      get look() { return lookKind; }, get heads() { return { hero: { ...HEADS.hero, drawn: hero.look.rig?.headSlot?.key }, foe: { ...HEADS.foe, drawn: foe.look.rig?.headSlot?.key } }; }, get outfit() { return hero.outfit ? encode(hero.outfit) : null; }, get dressed() { return hero.look.rig ? hero.look.rig.report || null : null; }, get style() { return STYLE.s.name; }, get cine() { return CINE.on; }, get impact() { return MOMENT.impact; }, get fps() { return fps; }, get frameMs() { return frameMs; }, get t() { return W.t; } };
  }
}
