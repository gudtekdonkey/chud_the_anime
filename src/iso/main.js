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
import { initSkills, skillControl, skillsRender, drawSkills, drawSkillHud, skillState } from './skills/reserved.js';   // F R Q X (skills/reserved.js)
import { makeSquad } from './enemies/squad.js';
import { buildPicker } from './enemies/ui.js';
import { addFolk, drawLabels } from './persona/npcs.js';     // personalities on the 3D body, the townsfolk, the idles (persona/, anim/idles.js)
import { personaPanel } from './persona/panel.js';
import { runGallery } from './persona/gallery.js';
import * as PROBE from './persona/probe.js';
import { makeSkills } from './skills/skills.js';                  // I O P N U C and Storm Chain (skills/skills.js)
import './weapons/poses.js';
import { equip, ARSENAL } from './weapons/arsenal.js';
import { wirePicker } from './weapons/picker.js';
import { runArsenal } from './weapons/sheet.js';
import { squadGame } from './squad/battle.js';
import { initPort, CTX as PORT } from './port.js';
import { SK } from './skills/skills.js';
import { ICONS as KIT_ICONS, ICON_COL as KIT_COL } from './skills/hud.js';
import { addSkill } from './hud/skill-bar.js';
import { installGore } from './gore.js';
import { startOutfit, wireGear } from './gear/ui.js';
import { encode } from './gear/outfits.js';

const Q = new URLSearchParams(location.search), TICKS = +(Q.get('tick') || 0);
const { root, canvas, ms } = buildPage();
const pipe = makePipeline(canvas);
SETTINGS.fpsFor = fpsFor; setStyle(Q.has('style') ? +Q.get('style') : 3);   // the owner's pick: Painterly (gfx/style.js)
const scene = new THREE.Scene(), cam = new THREE.Camera(); cam.matrixAutoUpdate = false;
if (Q.has('arsenal')) runArsenal({ scene, cam, pipe, Q }); else if (Q.has('sheet')) runSheet(); else if (Q.has('idles')) runGallery({ scene, cam, pipe, Q }); else runGame(Q.has('reel') ? REELS[Q.get('reel')] || REELS.chain : null);

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
  // &squad: the squad battle (squad/battle.js, docs/squad-ai.md) instead of the samurai: its own cast, rules and controls,
  // so the samurai's systems below (the enemy types, the skills, the gore, the townsfolk, the personalities) stay out of it
  // what he wears (gear/, the outfit picker): Iron Ash as built unless the URL or the last visit picked an outfit;
  // a reel keeps the Animation Flow page's look unless the URL asks
  const outfit = reel && !Q.has('outfit') ? null : startOutfit(Q);
  const isBattle = Q.has('squad') && !reel, hero = new Hero(isBattle ? { x: 96, z: 150, h: Math.PI / 2, look: lookKind, outfit } : { x: 250, z: 120, h: 0, look: lookKind, outfit });
  const foe = isBattle ? null : new Foe({ x: 330, z: 110, h: -Math.PI / 2, look: lookKind }, Q.has('calm') || !!reel);
  // a squad (&foes=N, 3 by default, up to 5) so the chain and Time Slice have someone to leap to; the first is the one the loop was built on
  const SPAWN = [[372, 176], [296, 206], [200, 212], [420, 84]], foes = foe ? [foe] : [];
  for (let i = 1; foe && i < (reel ? 1 : Math.max(1, Math.min(5, +(Q.get('foes') ?? 3)))); i++) foes.push(new Foe({ x: SPAWN[i - 1][0], z: SPAWN[i - 1][1], h: -Math.PI / 2, look: lookKind }, Q.has('calm')));
  const folk = reel || isBattle || Q.get('folk') === '0' ? [] : addFolk(scene);   // the courtyard's people (&folk=0: none)
  const chars = [hero, ...foes, ...folk]; for (const c of [hero, ...foes]) c.look.mount(scene);
  const battle = isBattle ? squadGame({ hero, lookKind, canvas, root, scene, calm: Q.has('calm') }) : null; if (battle) chars.push(...battle.chars);
  // the nearest samurai standing (the one a cut turns to)
  const nearFoe = () => { let b = foe, bd = 1e9; for (const f of foes) { if (f.dead || f.frozen || f.parked) continue; const d = Math.hypot(f.x - hero.x, f.z - hero.z); if (d < bd) { bd = d; b = f; } } return b; };
  const script = [];
  if (reel) {   // place them as the page does, hide the samurai unless the scenario has one, and queue its commands
    foe.a.alpha = 0; foe.reel = true; const place = (c, x, z, h) => { const [wx, wz] = reelPos(x, z); c.a.x = wx / AF; c.a.z = wz / AF; c.a.h = c.a.ht = h;
      c.a.feet.N.lock = c.a.feet.F.lock = 0; c.a.feet.N.off = c.a.feet.F.off = 0; c.a.prev = null; c.a.update(W.dt); c.a.sample(true); return c.a; };   // moved: let go of the planted feet
    reel.build({ hero: (x, z, h) => place(hero, x, z, h), foe: (x, z, h) => { foe.a.alpha = 1; return place(foe, x, z, h); }, at: (t, fn) => script.push([t, fn]), M: REEL_M });
    script.sort((a, b) => a[0] - b[0]); PIPE.cine = Q.has('cine') ? 1 : 0; PIPE.clash = Q.has('clash') ? 1 : 0; }
  if (Q.has('foehp')) for (const f of foes) f.maxHp = f.hp = +Q.get('foehp');   // &foehp=N: tougher samurai (the check's weapon round; &hp is the hero's health, skills/)
  const live = () => foes.filter(f => !f.parked), game = { hero, foe, get foes() { return live(); } }; if (!battle) hitRules(game);   // the battle has its own (squad/combat.js)
  const skills = reel || battle ? null : makeSkills({ hero, foe, foes: live, scene, look: lookKind, Q, root }); hero.skills = skills;   // the skills (skills/): I O P N U C, Storm Chain, the skill bar
  const gore = reel || battle ? null : installGore({ hero, foe, all: foes, live, scene });   // blood, severing, the executions (gore.js); not in the reels
  initInput(canvas);
  if (!battle) initSkills({ hero, get foes() { return live(); }, scene, game });
  // the enemy types (enemies/, docs/enemies.md): &group=<name> or the overlay's picker; the samurai (the squad of &foes) is the default.
  // Another group parks every samurai (out of the skills' and the cuts' reach) until the samurai are picked again
  const squad = battle ? null : makeSquad({ scene, hero, foe, foes, chars, look: () => lookKind, hpK: +(Q.get('ehp') || 1) });
  if (squad && !reel) { buildPicker(root, squad, Q.get('group') || 'samurai'); squad.spawn(Q.get('group') || 'samurai'); }
  // the model switch: every character's look is swapped; nothing else is told
  let port = null;
  const setLook = kind => { lookKind = kind; if (port) port.setLook(kind); for (const c of chars) { c.setLook(kind, scene); c.shown = null; } if (skills) skills.setLook(kind); root.querySelector('#o-look').value = kind; };
  wireOverlay(root, setLook); root.querySelector('#o-look').value = lookKind;
  if (!battle) personaPanel(root, { hero, foe });
  wireGear(root, outfit, o => hero.dress(o, scene));   // the outfit picker (gear/)
  wirePicker(root, id => equip(hero, id), Q.get('weapon') || 'katana');   // the 15 weapons (weapons/)
  // the rest of today's game in 3D (port.js): the party, items and Harvest, today's HUD, the combo prompts, click to move;
  // not in the squad battle, which has its own companions, left click and E
  port = reel || battle ? null : initPort({ scene, hero, foes, chars, canvas, root, pipe, lookKind, Q, kit: skills ? SK : null, execute: gore && gore.exec });
  if (port) { Object.defineProperty(PORT, 'foes', { get: live });   // the samurai in the yard (not those parked by another enemy group)
    // the kit's six skills on today's skill bar (its own HUD is not drawn under today's)
    const ic = rows => { const c = document.createElement('canvas'); c.width = c.height = 12; const cg = c.getContext('2d');
      rows.forEach((r, y) => [...r].forEach((ch, x) => { if (KIT_COL[ch]) { cg.fillStyle = KIT_COL[ch]; cg.fillRect(x, y, 1, 1); } })); return c; };
    if (skills) for (const [k, key] of [['double', 'I'], ['moon', 'O'], ['rift', 'P'], ['mirror', 'N'], ['sweep', 'U'], ['breath', 'C']])
      addSkill({ k, key, icon: ic(KIT_ICONS[k]), known: () => true, cd: () => SK.cd[k] || 0, max: () => SK.cdMax[k] || 1, on: () => !!(SK.cur && SK.cur.id === k) }); }

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
  function presentation(dt) { const nf = battle ? battle.near() : squad.on ? squad.near(hero, 40) : nearFoe();
    if (hero.state === 'J3' && hero.prevState !== 'J3' && nf && !nf.dead && Math.hypot(nf.x - hero.x, nf.z - hero.z) < 40) startCine(hero, nf);
    hero.prevState = hero.state; cineStep(W.stop > 0 ? 0 : dt); }
  function tick() {
    if (skills) skills.tick(1 / 60);
    if (W.stop <= 0 && !reel && battle) battle.control(readInput());   // the battle steps the hero and everyone (squad/battle.js)
    else if (W.stop <= 0 && !reel) { const inp = port ? port.input(readInput()) : readInput();   // the combo prompts, touch and the click first (port.js)
      if (!skillControl() && !(skills && skills.control(inp)) && !(port && port.busy)) hero.control(inp, squad.on ? squad.aim(hero, inp.dir) : nearFoe(), W.t);   // a hit-stop holds the presses (they outlive it); a skill owns him first (skills/: the reserved keys, then the kit)
      for (const f of foes) if (!f.frozen && !f.parked && !(port && port.held(f))) f.control(port ? port.targetFor(f) : hero, W.t, 1 / 60); squad.control(1 / 60);
      for (const n of folk) n.control(hero, [...live(), ...folk], W.t); }
    presentation(1 / 60); if (port) port.tick(1 / 60);
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
    if (skills) skills.render();
    if (gore) gore.sync();
    const g = pipe.fx; g.clearRect(0, 0, pipe.fxCanvas.width, pipe.fxCanvas.height);
    for (const c of chars) drawTrail(g, c.trail.map(s => s.gap ? s : { t: s.t, a: toPx(s.mid), b: toPx(s.tip) }), c.a.out ? c.a.out.t : W.t, STYLE.s.trail);
    drawFx(g, W);
    if (gore) gore.draw(g);
    if (battle) battle.draw(g); else { drawLabels(g, folk, toPx); squad.draw(g); skillsRender(); drawSkills(g); }
    if (PIPE.clash) { drawFocus(g, W);   // focus lines on a hit; speed lines behind a roll, a lunge or a skid
      for (const c of chars) if (['roll', 'lunge', 'skid', 'knock'].includes(c.state)) { const [x, y] = toPx([c.x, 10, c.z]), v = [Math.sin(c.a.h), Math.cos(c.a.h) * OBL.a]; speedLines(g, x, y, v[0], v[1], W.t); } }
    for (const c of chars) c.look.stamp(g);
    if (skills) skills.draw(g, { noHud: !!port });
    if (!reel && !battle) drawSkillHud(g, { lift: port ? 76 : 0 });
    if (port) { port.drawFx(g); port.drawHud(); }
    pipe.render(scene, cam);
  }
  const toPx = p => toScreen(p[0], p[1], p[2]);
  function frame(now) {
    const dt = Math.min(.1, (now - last) / 1000); last = now; fps += (1 / Math.max(dt, 1e-3) - fps) * .05;
    const t0 = performance.now();
    if (reel) { /* the reel steps only when asked (window.__reel.seek) */ }
    else if (TICKS) for (let i = 0, n = battle ? battle.ticks(TICKS) : TICKS; i < n; i++) tick();   // &tick=N (the check, on a slow software GPU): N steps a frame, whatever the wall clock
  else { acc = Math.min(acc + dt * (battle ? battle.scale() : 1), .1); while (acc >= 1 / 60) { acc -= 1 / 60; tick(); } }   // the squad's order slow-motion scales the clock
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
      get hero() { const o = hero.a.out, b = o && o.pose.blade; return { ...who(hero), armed: hero.armed, iframes: hero.iframes, hits: hero.hits, taken: hero.taken,
        weapon: hero.weapon, out: !!(b && b.out), held: hero.look.rig && hero.look.rig.wstate ? { ...hero.look.rig.wstate } : null }; },
      weapons: ARSENAL.map(w => ({ id: w.id, reach: w.reach, stop: w.weight.stop, shake: w.weight.shake })),
      get foe() { return foe ? { ...who(foe), hp: foe.hp, dead: foe.dead, hits: foe.hits, deaths: foe.deaths, reacts: foe.reacts.slice(-12) } : null; },
      get foes() { return foes.map(f => ({ ...who(f), hp: f.hp, dead: f.dead, frozen: f.frozen, hits: f.hits, deaths: f.deaths, reacts: f.reacts.slice(-6) })); },
      get reserved() { return battle ? null : skillState(); }, get gray() { return MOMENT.gray; }, get away() { return !!hero.bladeAway; },
      // where each one's feet are on the canvas, 0..1 (for the check's close-up shots)
      get px() { const f = foe || (battle && battle.near()) || hero, n = foe ? nearFoe() : f; return { hero: toPx([hero.x, 0, hero.z]).map((v, i) => v / (i ? 540 : VW)), foe: toPx([f.x, 0, f.z]).map((v, i) => v / (i ? 540 : VW)), near: toPx([n.x, 0, n.z]).map((v, i) => v / (i ? 540 : VW)) }; },
      get enemies() { return squad && squad.debug(); },
      squad: battle ? battle.hook : null,
      get port() { return port && port.debug(); }, screenOf: (x, z, y = 0) => toPx([x, y, z]).map((v, i) => v / (i ? 540 : VW)),
      get folk() { return folk.map(n => ({ ...who(n), kind: n.kind, culture: n.culture, list: n.list, idles: n.a.idler ? n.a.idler.n : 0, played: n.a.idler ? n.a.idler.played.slice() : [] })); },
      get persona() { return { hero: hero.list || [], heroIdles: hero.a.idler ? hero.a.idler.played.slice() : [], heroCur: hero.a.idler ? hero.a.idler.cur : null, foe: foe ? foe.list || [] : [], behave: foe && foe.bh, ...PROBE }; },
      get skills() { return skills && skills.state(); },   // the I O P N U C skills (skills/skills.js); `reserved` is F R Q X's (skills/reserved.js)
      get look() { return lookKind; }, get outfit() { return hero.outfit ? encode(hero.outfit) : null; }, get dressed() { return hero.look.rig ? hero.look.rig.report || null : null; }, get style() { return STYLE.s.name; }, get cine() { return CINE.on; }, get impact() { return MOMENT.impact; }, get gore() { return gore && gore.view(); }, get fps() { return fps; }, get frameMs() { return frameMs; }, get t() { return W.t; } };
  }
}
