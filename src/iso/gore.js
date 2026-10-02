// ---- Blood, severing and the executions, wired into the 3D test level (owner's request 2026-10-02). main.js calls
// installGore once (after hitRules) and then, each frame, sync() before the scene is drawn and draw(g) on the effects
// layer; the world steps it through W.post. It listens to the hits rather than changing them: rules.js still decides
// what lands; here a landed hit throws blood by its weight along the cut, splashes the samurai (and the ronin, close
// up), coats the blade; a killing blow cuts the part nearest the blade off the samurai (sever.js), drops his sword and
// pools blood under him, and gets the full-screen close-up (fx/cine.js) like J3. K on a lone samurai in reach plays an
// execution (exec/). Nothing here changes timing, hitboxes or the moves.
import * as THREE from 'three';
import { W } from './play/sim.js';
import { CUT } from './play/hero.js';
import { consume } from './play/input.js';
import { hv, rnd } from './anim/flow.js';
import { CINE, startCine } from './fx/cine.js';
import { PIPE } from './gfx/post.js';
import * as B from './fx/blood.js';
import { sever, initSever, severStep, severSync, severWorld, hidePart, addStump, fadePieces, piecesOf, nearestPart, SV, PARTS } from './sever.js';
import { shadeMat } from './gfx/shade.js';
import { EX, startExec, xfStep, xfDraw, ghostScene, ghostStep, ghostSync, cineGate } from './exec/stage.js';
import { KM, updateMarkers, drawMarkers, drawPrompt } from './exec/markers.js';

const BLADE = { light: .22, heavy: .35, kill: .5 };    // how much a hit leaves on the blade (0..1)
// where a cut is on the pixel look (no model to take apart), roughly
const HEIGHT = { head: 17, upper: 10, all: 8, armR: 14, armL: 14, foreR: 11, foreL: 11, thighR: 7, thighL: 7, shinR: 3, shinL: 3 };
const norm = v => { const l = Math.hypot(...v) || 1; return v.map(c => c / l); };

// all: every samurai (main.js's squad of &foes); live(): those in the yard now (not parked by another enemy group)
export function installGore({ hero, foe, all = [foe], live = () => all, scene }) {
  B.initBlood(scene); initSever(scene); severWorld(W); ghostScene(scene); cineGate(() => PIPE.cine);
  let cutsNow = 0, cutsAt = -9;
  const recs = new Map(), rec = c => { if (!recs.has(c)) recs.set(c, { splashes: [], cut: [], stumps: [], blade: 0, rig: null, dirty: 0 }); return recs.get(c); };
  const rigOf = c => c.look && c.look.kind === '3d' ? c.look.rig : null;
  const chest = (c, f = 2.5) => { const v = hv(c.a.h); return [c.x + v[0] * f, 13, c.z + v[1] * f]; };

  // ---- the hits ----
  function hitBlood(foe, w) {
    const r = rec(foe), b = hero.bladeWorld(), fwd = hv(hero.a.h);
    // the way the cut travels: the blade tip's last move (the trail), leaning away from him
    const tr = hero.trail.filter(s => !s.gap), A = tr.at(-3), Z = tr.at(-1);
    const sw = A && Z ? norm([Z.tip[0] - A.tip[0], Z.tip[1] - A.tip[1], Z.tip[2] - A.tip[2]]) : [0, 0, 0];
    const dir = norm([sw[0] * .8 + fwd[0] * .7, sw[1] * .8 + .25, sw[2] * .8 + fwd[1] * .7]);
    const y = b ? Math.max(6, Math.min(19, (b.mid[1] + b.tip[1]) / 2)) : 12, at = [foe.x - fwd[0] * 2.5, y, foe.z - fwd[1] * 2.5];
    B.spray(...at, dir, w);
    B.splash(r, rigOf(foe), at, chest(hero, 0), w === 'light' ? .8 : 1.1); r.dirty = 1;
    if (w !== 'light' || rnd() < .35) { const h = rec(hero), p = chest(hero, 2.4); p[1] = 9 + rnd() * 8; p[0] += (rnd() - .5) * 3; B.splash(h, rigOf(hero), p, at, w === 'kill' ? 1 : .7); h.dirty = 1; }
    rec(hero).blade = Math.min(1, rec(hero).blade + BLADE[w]); B.BL.stats.coats++;
    return { at, dir, b };
  }
  // cut `part` off `who`: the piece (sever.js), the stump and its spurts, the gout at the cut
  function cut(who, part, o = {}) {
    const r = rec(who); if (r.cut.includes(part)) return null; r.cut.push(part);
    const pc = sever(who, part, o), rig = rigOf(who);
    if (rig) { if (!r.stumpMat) r.stumpMat = shadeMat({ obj: who.foe ? 2 : 1, stencil: true }); hidePart(rig, part); const m = addStump(rig, part, r.stumpMat); if (m) r.stumps.push(m); }
    if (part === 'sword' || part === 'all') return pc;
    const at = () => { const rg = rigOf(who), n = rg && (PARTS[part].b ? rg.B[PARTS[part].b] : null); if (n) { const p = n.getWorldPosition(new THREE.Vector3()); return [p.x, p.y, p.z]; } return [who.x, HEIGHT[part], who.z]; };
    // several parts at once (an execution taking him apart) share the blood, so it stays controlled
    cutsNow = W.t - cutsAt < .05 ? cutsNow + 1 : 1; cutsAt = W.t; const k = 1 / Math.sqrt(cutsNow);
    const up = PARTS[part].up ? [0, 1, 0] : norm([o.v ? -o.v[0] : 0, .8, o.v ? -o.v[2] : 0]);
    B.emitter({ at, dir: up, life: 1.2, rate: 32 * k, spd: 32, pulse: 2.2, sz: 1.6 });
    B.emitter({ at, dir: null, life: 2.6, rate: 5 * k, sz: 1.2 });
    const p0 = at(); B.spray(...p0, o.v ? norm([o.v[0], Math.abs(o.v[1]) + 8, o.v[2]]) : [0, 1, 0], 'heavy', { k: .6 * k, noGush: true });
    return pc;
  }
  // he is dead: the reacts, the pool under where he falls
  function kill(f) { f.hp = 0; f.dead = true; f.deaths++; f.diedAt = W.t + 99; f.reacts.push('exec'); const v = hv(f.a.h); B.pool(f.x + v[0] * 6, f.z + v[1] * 6, 7.5, 2.4, .7); }

  const baseHit = W.on.hit;
  W.on.hit = a => {
    const L = live(), n0 = L.map(f => f.hits), was = L.map(f => f.dead); baseHit(a);
    L.forEach((foe, i) => { if (foe.hits === n0[i]) return;   // each samurai the cut landed on
    const killed = foe.dead && !was[i], c = CUT[a.clip.name], w = killed ? 'kill' : c && c.w > 1 ? 'heavy' : 'light', h = hitBlood(foe, w);
    if (!killed) return;
    // the killing blow: the joint nearest the blade goes, the sword falls, the pool spreads under where he falls
    const fwd = hv(hero.a.h), tip = h.b ? h.b.tip : [foe.x, 14, foe.z], mid = h.b ? h.b.mid : [hero.x, 14, hero.z];
    const far = [tip[0] + (tip[0] - mid[0]) * 1.5, tip[1] + (tip[1] - mid[1]) * 1.5, tip[2] + (tip[2] - mid[2]) * 1.5];
    const part = nearestPart(rigOf(foe), mid, far, c && c.w > 1) || (tip[1] > 15 ? 'head' : tip[1] > 9 ? 'armR' : 'thighR');
    cut(foe, part, { v: [h.dir[0] * 18 + fwd[0] * 14, 26 + rnd() * 12, h.dir[2] * 18 + fwd[1] * 14], w: [(rnd() - .5) * 16, (rnd() - .5) * 8, (rnd() - .5) * 16] });
    cut(foe, 'sword', { v: [fwd[0] * 26 + (rnd() - .5) * 10, 34, fwd[1] * 26 + (rnd() - .5) * 10], w: [(rnd() - .5) * 18, (rnd() - .5) * 12, (rnd() - .5) * 18] });
    B.pool(foe.x + fwd[0] * 7, foe.z + fwd[1] * 7, 7.5, 2.4, .7); });
  };
  const baseStrike = W.on.strike;
  W.on.strike = a => { const n = hero.taken; baseStrike(a); if (hero.taken === n) return;
    const v = hv(a.h), p = chest(hero, 0); B.spray(...p, [v[0], .3, v[1]], 'light'); const h = rec(hero); B.splash(h, rigOf(hero), p, chest(all.find(f => f.a === a) || foe), 1); h.dirty = 1; };

  // ---- K: an execution takes both of them over until the ronin is handed back ----
  const api = { spray: (p, d, w, o) => { const h = rec(hero); h.blade = Math.min(1, h.blade + BLADE[w] * .8); B.BL.stats.coats++; B.spray(...p, d, w, o); }, cut, kill, flick: c => flick(c), over: f => { f.diedAt = W.t - 1.1; } };
  const free = ['idle', 'guard', 'run', 'runArmed', 'start', 'stop', 'skid', 'sheathe'];
  const canExec = () => { const n = hero.state, c = CUT[n]; return !!KM.pick && !EX.on && (free.includes(n) || (c && hero.a.ct >= c.hit + 2 / 60)); };
  const baseHero = hero.control.bind(hero);
  hero.control = (inp, f, t) => { if (EX.on) return; if (consume('exec', canExec)) { startExec(hero, KM.pick, api); return; } baseHero(inp, f, t); };   // K takes the one the markers picked
  for (const foe of all) { const baseFoe = foe.control.bind(foe); foe.control = (h, t, dt) => { if (EX.st && EX.st.foe === foe) return; baseFoe(h, t, dt); }; }

  // the blade's blood thrown off by the flick: a line of drops on the floor ahead of him
  function flick(c) { const r = rec(c); if (r.blade < .03) return; const b = c.bladeWorld(), v = hv(c.a.h), p = b ? b.tip : chest(c, 8);
    B.spray(...p, [v[0], -.35, v[1]], 'light', { k: .4 + r.blade, cone: .35, noGush: true }); r.blade = 0; B.BL.stats.flicks++; }

  // ---- every world step (1/120 s; a hit-stop holds it) ----
  let prev = ''; const wasDead = new Map();
  W.post.push((w, dt) => {
    B.bloodStep(dt); severStep(dt); xfStep(dt); ghostStep(dt);
    const h = rec(hero), n = hero.state;
    if (n === 'sheathe' && hero.a.ct > .08 && hero.a.ct < .4) flick(hero);   // the sheathe's chiburi
    if (h.blade > .2 && hero.armed && n !== 'sheathe' && rnd() < dt * 2.4 * h.blade) { const b = hero.bladeWorld(); if (b) { B.drip(...b.tip); h.blade -= .006; } }
    // the killing blow's close-up for J1, J2 and the lunge too (main.js starts J3's): a cut starting on a samurai it will kill
    if (n !== prev && CUT[n] && n !== 'J3' && !CINE.on) { const foe = live().find(f => !f.dead && f.hp <= 1 && Math.hypot(f.x - hero.x, f.z - hero.z) < 40); if (foe) startCine(hero, foe); }
    prev = n;
    for (const foe of all) { if (wasDead.get(foe) && !foe.dead) restore(foe); wasDead.set(foe, foe.dead); }
    if (!CINE.on && CINE.dur !== .8) CINE.dur = .8;   // an execution's longer close-up is over
    updateMarkers(hero, live());
  });
  // he stands up whole: the cuts healed, the pieces and the splashes gone (the floor keeps its stains)
  function restore(f) { const r = rec(f), rig = rigOf(f); r.cut = []; r.splashes = []; r.dirty = 1;
    for (const m of r.stumps) m.parent && m.parent.remove(m); r.stumps = [];
    if (rig) rig.root.traverse(o => { if (o.isMesh && !o.userData.gore) o.visible = true; });
    fadePieces(f); }

  // ---- once a frame, before the scene is drawn: the 3D side follows the records (and a model swap re-lays them) ----
  function sync() {
    for (const c of [hero, ...all]) { const r = rec(c), rig = rigOf(c);
      if (r.rig !== rig) { r.rig = rig; r.dirty = 1; r.stumps = [];
        if (rig) { if (!r.stumpMat) r.stumpMat = shadeMat({ obj: c.foe ? 2 : 1, stencil: true }); for (const p of r.cut) { hidePart(rig, p); const m = addStump(rig, p, r.stumpMat); if (m) r.stumps.push(m); } } }
      if (r.dirty) { r.dirty = 0; B.laySplashes(r, rig, c.foe ? 2 : 1); }
      if (rig) { const u = rig.mats[0].uniforms; for (const m of [r.splashMat, r.stumpMat, r.coatMat]) if (m) { m.uniforms.uFlash.value = u.uFlash.value; m.uniforms.uFade.value = u.uFade.value; }
        if (r.cut.includes('all')) rig.shadow.visible = false; }
      if (c === hero) B.bladeCoat(r, rig); }
    B.bloodSync(); severSync(); ghostSync(hero.lookKind);
  }
  function draw(g) {
    const t = W.t, show = !EX.on && !CINE.on;
    if (show) drawMarkers(g, hero, t);
    B.bloodDraw(g); xfDraw(g);
    if (hero.lookKind !== '3d') B.bladeLine(g, hero.bladeWorld(), rec(hero).blade);
    if (show) drawPrompt(g, t);
  }
  // what the check reads (window.__iso.gore)
  const view = () => { const s = B.BL.stats, f = rec(foe), h = rec(hero);
    return { ...s, drops: B.BL.drops.length, decals: B.BL.decals.length, splashHero: h.splashes.length, splashFoe: f.splashes.length, blade: h.blade, cut: f.cut.slice(),
      pieces: SV.pieces.length, foePieces: piecesOf(foe).length, resting: SV.pieces.filter(p => p.rest).length, ...SV.stats,
      lowest: Math.min(99, ...SV.pieces.map(p => p.c.y)), exec: EX.st ? EX.st.ex.name : null, execOn: EX.on, execs: EX.done, execLog: EX.log.slice(), kpick: !!KM.pick, alone: KM.alone.size }; };
  // an execution on f now, if none is playing (port.js: K's finisher on a combo)
  const exec = f => { if (!f || f.dead || EX.on) return false; startExec(hero, f, api); return true; };
  return { sync, draw, view, exec };
}
