// ---- An execution on the 3D test level: K on a lone samurai in reach (exec/markers.js). The ronin crouches, glitches
// out and lands where the execution starts; both bodies are then played by its timeline (exec/executions.js) through
// the flow's actors (the clips 'xR' and 'xE'), so the looks, the springs, the hit-stops and the styles' frame
// stepping all apply; the killing blow takes the full-screen close-up (fx/cine.js, owner: "the cut scenes on killing
// blows is an amazing touch"). Its own effects (cut lines, glitch slivers, crescents, speed lines, afterimages) live
// here, drawn on the effects layer; the blood and the severing go through gore.js (`api`). The stage clock is the
// samurai's clip time, so a hit-stop holds the whole performance.
import { proc, hv, hOf, AF, H, rnd, TAU, EZ, FA, faceK } from '../anim/flow.js';
import { W } from '../play/sim.js';
import { CINE, startCine } from '../fx/cine.js';
import { sparks, dust, focus } from '../fx/fx.js';
import { shake as camShake, toScreen, CAM } from '../gfx/view.js';
import { makeLook } from '../look/look.js';
import { lift, pose, HR, EG } from './poses.js';
import { EXECS } from './executions.js';
import { SH } from '../anim/moves.js';

export const PRE = .2;                       // the set and the vanish before he lands (today's game's PRE)
export const EX = { st: null, on: false, last: -1, done: 0, log: [] };
const snap8 = h => Math.round(h / (Math.PI / 4)) * (Math.PI / 4);

proc('xR', a => ({ p: a.co.st.Rp }), { blend: .06, noLock: () => true });
proc('xE', (a, t) => { const S = a.co.st; S.step(t); return { p: S.Ep }; }, { blend: .06, noLock: () => true });

// the batch's quick sheathe as keys, from pose `from` at t0: the flick (the blood thrown off), the tip finds the saya's
// mouth, slid home, the click at t0 + d[2], his hands let go by t0 + d[3]
const QS = [
  pose({ pel: [.2, H - 3.2], lean: .24, fN: [5.6, 1.5], fF: [-4.9, 1.5], hF: [2.6, H - 1.2], blade: { out: 1, g: [11, H + 1], ang: -1.35, two: 0 } }),
  pose({ pel: [.2, H - 3], lean: .2, fN: [5.6, 1.5], fF: [-4.9, 1.5], hF: [2.1, H - 1.2], blade: { out: 1, g: [14.1, H + 1], ang: -2.92, two: 0, vis: 12 } }),
  pose({ pel: [.2, H - 2.8], lean: .18, fN: [5.6, 1.5], fF: [-4.9, 1.5], hF: [2.1, H - 1.2], blade: { out: 1, g: [3.96, H - 1.25], ang: -2.92, two: 0, vis: 1.6 } }),
  pose({ pel: [0, H - 2.2], lean: .13, head: .07, fN: [5.65, 1.5], fF: [-4.96, 1.5], hN: [1.8, H - 1.5], hF: [5.2, H + 1.6], blade: SH }),
];

export function startExec(hero, foe, api) {
  const k = (EX.last + 1) % EXECS.length, ex = EXECS[k]; EX.last = k;
  const ax = hv(snap8(hOf(foe.x - hero.x, foe.z - hero.z))), lat = [-ax[1], ax[0]], o = [foe.x, foe.z];
  const rel = [hero.x - o[0], hero.z - o[1]], sx = rel[0] * ax[0] + rel[1] * ax[1], sy = rel[0] * lat[0] + rel[1] * lat[1];
  const S = { ex, ax, lat, o, hero, foe, api, t: -PRE, ev: new Set(), handed: false, over: false, free: ex.dur, start: { x: sx, y: sy, face: sx < 0 ? 1 : -1 },
    R: { x: sx, y: sy, z: 0, face: sx < 0 ? 1 : -1, pose: HR.set, alpha: 1 }, E: { x: 0, y: 0, z: 0, face: -1, pose: EG, alpha: 1 } };
  S.once = (key, cond, fn) => { if (cond && !S.ev.has(key)) { S.ev.add(key); fn(); } };
  // the stage's frame in the world: x along the line he came in on, y across it, h up
  const wp = (x, y = 0) => [o[0] + ax[0] * x + lat[0] * y, o[1] + ax[1] * x + lat[1] * y];
  const wv = (x, h, y = 0) => [ax[0] * x + lat[0] * y, h, ax[1] * x + lat[1] * y];
  Object.assign(S, {
    wp, wv,
    tail(t0, from, d = [.1, .22, .34, .5]) { S.free = Math.min(S.free, t0 + d[3]);
      S.once('flick', S.t >= t0 + d[0] * .8, () => api.flick(hero));
      S.once('sheathClick', S.t >= t0 + d[2], () => W.event(hero.a, 'click'));
      return [[t0 + d[0], QS[0]], [t0 + d[1], QS[1]], [t0 + d[2], QS[2], 'lin'], [t0 + d[3], QS[3]]]; },
    hit(stop) { W.hitstop(stop); foe.a.flash = .05; foe.a.hitAt = W.t; const [x, z] = wp(S.E.x, S.E.y); focus(W, x / AF, 22, z / AF); if (stop >= .08) camShake(1, 2 / 60); },
    blood(x, h, dx, dh, w, o2) { const [px, pz] = wp(x, S.E.y); api.spray([px, h, pz], wv(dx, dh), w, o2); },
    sever(part, { v = [0, 0, 0], spin = 0, float = 0 } = {}) { api.cut(foe, part, { v: wv(v[0], v[1], v[2]), w: [lat[0] * spin + (rnd() - .5) * 2, (rnd() - .5) * 3, lat[1] * spin + (rnd() - .5) * 2], float }); },
    drop(v) { api.cut(foe, 'sword', { v: wv(v[0], v[1], v[2]), w: [(rnd() - .5) * 14, (rnd() - .5) * 10, (rnd() - .5) * 14] }); },
    kill() { if (!foe.dead) api.kill(foe); },
    burst(x, h, n) { const [px, pz] = wp(x, S.E.y); sparks(W, px / AF, h / AF, pz / AF, n, { spread: TAU, spd: 110 }); },
    dust(x, n) { const [px, pz] = wp(x); dust(W, px / AF, pz / AF, n, { spd: 26, life: .4 }); },
    shake(a, t) { camShake(a, t); },
    line(x0, h0, x1, h1, life) { const [ax0, az0] = wp(x0, S.E.y), [bx, bz] = wp(x1, S.E.y); XF.push({ k: 'line', a: [ax0, h0, az0], b: [bx, h1, bz], life, age: 0 }); },
    slivers(x, h, n, y = 0) { const [px, pz] = wp(x, y); XF.push({ k: 'sliver', p: [px, h + 8, pz], n, life: .26, age: 0, seed: rnd() * 1e4 }); },
    speed(x0, x1, h) { const [ax0, az0] = wp(x0), [bx, bz] = wp(x1); XF.push({ k: 'speed', a: [ax0, h, az0], b: [bx, h, bz], life: .2, age: 0, seed: rnd() * 1e4 }); },
    cres(x, h, f, r, rot, life) { const [px, pz] = wp(x, S.E.y); XF.push({ k: 'cres', c: [px, h, pz], d: [ax[0] * f, ax[1] * f], r, rot, life, age: 0 }); },
    ghost(p, x, y, z, face, tint, life) { const [px, pz] = wp(x, y); ghost(hero.lookKind, lift(p, z), px, pz, hOf(ax[0] * face, ax[1] * face), tint, life); },
  });
  // sitting out the set: he crouches where he stands and glitches away
  S.step = t => {
    const s = t - PRE, R = S.R, E = S.E; S.t = s;
    if (s < 0) { R.pose = HR.set; R.alpha = s > -PRE * .45 && (Math.floor(t * 40) & 1) ? .2 : 1; E.pose = EG; }
    else {
      S.once('in', true, () => { S.slivers(R.x, 0, 8, R.y); R.x = ex.side * ex.gap; R.y = 0; R.face = 1; R.alpha = 1; S.slivers(R.x, 0, 8);
        if (PIPE_CINE()) { CINE.dur = Math.max(.8, Math.min(1.35, ex.kill + .5)); startCine(hero, foe); } });
      R.glitch = 0; ex.run(S, Math.min(s, ex.dur), R, E);
      R.alpha = R.glitch > 0 ? ((Math.floor(t * 40) & 1) ? .25 : 1) : 1;
    }
    S.Rp = lift(R.pose, R.z); S.Ep = lift(E.pose, E.z);
    if (!S.handed) put(hero.a, R); put(foe.a, E);
    if (!S.handed && s >= S.free) { S.handed = true; EX.on = false; hero.a.alpha = 1; hero.a.prev = null; hero.a.play('idle', { blend: .1 }); }
    if (!S.over && s >= ex.dur + .25) { S.over = true; EX.st = null; EX.done++; api.over(foe); }
  };
  // a body to its stage place: a jump of more than a few units is a teleport (the springs forget their speed)
  function put(a, B) { const [x, z] = wp(B.x, B.y);
    if (Math.hypot(x - a.x * AF, z - a.z * AF) > 4) { a.prev = null; a.feet.N.lock = a.feet.F.lock = 0; }
    a.x = x / AF; a.z = z / AF; a.h = a.ht = hOf(ax[0] * B.face, ax[1] * B.face); a.turnSnap = true; a.v = a.vt = 0; a.alpha = B.alpha ?? 1; }
  S.step(0);
  EX.st = S; EX.on = true; EX.log.push(ex.name);
  hero.a.play('xR', { st: S }); foe.a.play('xE', { st: S });
  return S;
}
let PIPE_CINE = () => 1; export const cineGate = f => { PIPE_CINE = f; };

// ---- the stage's own effects (stepped on the world's clock, drawn on the effects layer) ----
export const XF = [];
export function xfStep(dt) { for (const e of XF) e.age += dt; for (let i = XF.length - 1; i >= 0; i--) if (XF[i].age >= XF[i].life) XF.splice(i, 1); }
const BAY = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map(v => (v + .5) / 16), bay = (x, y) => BAY[(y & 3) * 4 + (x & 3)];
const mul = a => () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
function px(g, x, y, c, s = 1) { g.fillStyle = c; g.fillRect(Math.round(x), Math.round(y), s, s); }
export function xfDraw(g) {
  const z = Math.max(1, Math.round(CAM.zoom * .8));
  for (const e of XF) { const k = e.age / e.life;
    if (e.k === 'line') { const a = toScreen(...e.a), b = toScreen(...e.b), n = Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1])), grow = Math.min(1, e.age / .04);
      for (let i = 0; i <= n * grow; i++) { const x = a[0] + (b[0] - a[0]) * i / n, y = a[1] + (b[1] - a[1]) * i / n; if (k > .5 && bay(x | 0, y | 0) < (k - .5) * 2) continue;
        px(g, x, y - z, '#6ff3e4', z); px(g, x, y, k < .3 ? '#ffffff' : '#b8fff6', z); } }
    else if (e.k === 'sliver') { const p = toScreen(...e.p), r = mul((e.seed | 0) + Math.floor(e.age * 30));
      for (let i = 0; i < e.n; i++) { const w = 3 + r() * 9, x = p[0] + (r() - .5) * 26 * CAM.zoom, y = p[1] + (r() - .5) * 30 * CAM.zoom; if (r() < k * .8) continue;
        g.fillStyle = ['#6ff3e4', '#ffffff', '#05070a', '#52e8d6'][i % 4]; g.fillRect(Math.round(x), Math.round(y), Math.round(w * CAM.zoom), Math.max(1, Math.round(CAM.zoom))); } }
    else if (e.k === 'speed') { const a = toScreen(...e.a), b = toScreen(...e.b), r = mul(e.seed | 0); g.strokeStyle = 'rgba(232,242,255,.6)'; g.lineWidth = 1;
      for (let i = 0; i < 9; i++) { const off = (r() - .5) * 30 * CAM.zoom, u0 = r() * .5, u1 = u0 + .3 + r() * .5; if (r() < k) continue;
        g.beginPath(); g.moveTo(a[0] + (b[0] - a[0]) * u0, a[1] + (b[1] - a[1]) * u0 + off); g.lineTo(a[0] + (b[0] - a[0]) * Math.min(1, u1), a[1] + (b[1] - a[1]) * Math.min(1, u1) + off); g.stroke(); } }
    else if (e.k === 'cres') { const sweep = EZ.o(Math.min(1, e.age / (e.life * .45))), n = 60;
      for (let i = 0; i <= n; i++) { const u = i / n; if (u > sweep) break; const th = e.rot - 1.6 + 3.2 * u, w = Math.sin(Math.PI * u) * (k < .5 ? 1 : 2 - 2 * k);
        const P = [e.c[0] + e.d[0] * Math.cos(th) * e.r, e.c[1] + Math.sin(th) * e.r, e.c[2] + e.d[1] * Math.cos(th) * e.r], q = toScreen(...P);
        if (w > .1) px(g, q[0], q[1], k < .35 ? '#ffffff' : '#b8fff6', z); if (w > .45) px(g, q[0], q[1] + z, '#6ff3e4', z); if (w > .8) px(g, q[0], q[1] - z, '#52e8d6', z); } }
  }
}

// ---- afterimages: the ronin's own look, tinted and dissolving (a pool per look kind; the pixel look's too) ----
const GH = [];
function ghost(kind, p, x, z, h, tint, life) {
  let gh = GH.find(q => q.kind === kind && q.age >= q.life);
  if (!gh) { if (GH.length >= 6) return; gh = { kind, look: makeLook(kind, { foe: false }) }; gh.look.mount(GHOST_SCENE); GH.push(gh); }
  p = { ...p, hN: p.hN || [p.pel[0] + 4, p.pel[1] + 2], hF: p.hF || [p.pel[0] + 3, p.pel[1] + 2] };   // the hands' defaults, as the flow's actor fills them
  Object.assign(gh, { age: 0, life, frame: { pose: p, x, y: 0, z, yaw: FA[faceK(h)], flash: false, tint: tint === 'c' ? [.43, .95, .89] : [1, 1, 1], tintA: .85, alpha: 1, hero: false } });
}
let GHOST_SCENE = null; export const ghostScene = s => { GHOST_SCENE = s; };
export function ghostStep(dt) { for (const gh of GH) gh.age += dt; }
export function ghostSync(kind) {
  for (let i = GH.length - 1; i >= 0; i--) { const gh = GH[i];
    if (gh.kind !== kind && gh.age >= gh.life) { gh.look.dispose(); GH.splice(i, 1); continue; }
    gh.frame.alpha = Math.max(0, 1 - gh.age / gh.life); if (gh.frame.alpha > 0 || !gh.hidden) { gh.look.show(gh.frame); gh.hidden = gh.frame.alpha <= 0; } }
}
