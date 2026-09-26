import { P, S, wear } from '../state.js';
import { g } from '../screen.js';
import { PX, OX, OY, snap, COL, RC } from '../config.js';
import { kill } from '../world/enemies.js';
import { K } from '../assassin/markers.js';
import { roomFade } from '../assassin/targets.js';
import { at } from '../assassin/enemy-poses.js';
import { withShadow, figure, pixelsOf, toPieces, side, updatePieces, drawPieces } from '../assassin/pieces.js';
import { qiAdd } from '../player/qi.js';
import { setState } from '../player/actions.js';
import { collide } from '../world/room.js';
import { residue, rr } from '../fx/util.js';
import { bleed, pool } from '../fx/blood.js';
import { tear } from '../fx/void.js';
import { PAIRED, fits, ROSTER } from './kit.js';
import { RUNS } from './paired-moves.js';
import { standing, busy, say } from './companions.js';
import { frames, poseOf, paint, white } from './figures.js';
import { sideOn } from '../rig/turn.js';

// ---- Paired executions, on the odd occasion (owner): K with a companion nearby who is set up for it (meets the execution's needs) ----
// At most one every PAIR_CD seconds for the whole party, counted from the end of the last one (owner: "not more than once per 5s");
// while it cools down K on a lone enemy is his own execution. Each one is a choreography (party/paired-moves.js) played in a local
// frame round the enemy: he is at 0, the ronin on the + side, the partner on the -, so one script plays from either side.
// P.state is 'exec' throughout, so the state machine leaves him to us, as it does for K's stage; the enemy is held (drawn here) until
// his death beat, and dies where the script leaves him.
export const PAIR_CD = 5;
export let X = null;
export const PAIRS = { done: 0, cd: 0, last: null, ran: [], force: null };   // done / ran: what npm run check reads; force: the test picker
const HERO = ROSTER[0], ghosts = [], lines = [], bodies = [], PC = { pieces: [] };
const heroFits = ex => !ex.needs.hero || ex.needs.hero.includes(P.weapon);
const optsFor = a => PAIRS.force ? PAIRED.filter(ex => ex.id === PAIRS.force) : PAIRED.filter(ex => fits(a.c, ex) && heroFits(ex));
// who and whom K would take now: K's own pick, or failing that the nearest enemy close by, with a free partner close to him
export function pairCandidate() {
  if (X || PAIRS.cd > 0) return null;
  const e = K.pick || (K.near && Math.hypot(K.near.x - P.x, (K.near.y - P.y) * 1.3) < 52 ? K.near : null);
  if (!e || e.held || !e.alive) return null;
  const a = standing().filter(a => !busy(a) && optsFor(a).length && Math.hypot(a.x - e.x, a.y - e.y) < 72)
    .sort((p, q) => Math.hypot(p.x - e.x, p.y - e.y) - Math.hypot(q.x - e.x, q.y - e.y))[0];
  return a ? { e, a, opts: optsFor(a) } : null;
}
// any that fits, never the same one twice running while there is another
export function startPair({ e, a, opts }) {
  const pool = opts.length > 1 ? opts.filter(ex => ex.id !== PAIRS.last) : opts, ex = pool[Math.random() * pool.length | 0];
  const s = Math.sign(P.x - e.x) || 1, loc = (x, y) => [(x - e.x) * s, y - e.y];
  const act = (x, y, f) => { const [lx, ly] = loc(x, y); return { lx, ly, z: 0, f, anim: 'idle', at: 0, rot: 0, alpha: 1 }; };
  X = { t: 0, ex, e, a, s, ox: e.x, oy: e.y, H: act(P.x, P.y, -1), A: act(a.x, a.y, 1), E: { lx: 0, ly: 0, z: 0, f: 1, rot: 0, keys: null, k0: 0, pose: null },
    ev: new Set(), trail: 0, rope: null };
  X.h0 = [X.H.lx, X.H.ly]; X.a0 = [X.A.lx, X.A.ly];
  X.once = (k, cond, fn) => { if (cond && !X.ev.has(k)) { X.ev.add(k); fn(); } };
  e.held = true; e.vx = e.vy = 0; X.E.pose = e.body.out;
  residue(P.x, P.y, 5); setState('exec'); P.inv = true;
  a.armed = true; a.hitDone = true; a.target = null;
  PAIRS.last = ex.id; PAIRS.ran.push(ex.id); say(ex.name + ' WITH ' + a.c.name, 1.2);
}
// local to world
export const wx = (x, lx) => x.ox + x.s * lx, wy = (x, ly) => x.oy + ly;
const wface = (x, f) => x.s * f;

// ---- what a script calls: the death beat, cutting him apart, cut lines, a rope or chain, afterimages ----
// the kill: EXP and the harvestable body land where he dies, as the solo executions do
export function slay(x, fx = {}) {
  const { e, E } = x; if (!e.alive) return;
  e.x = wx(x, E.lx); e.y = wy(x, E.ly); kill(e, { execution: true, by: x.a, pair: x.a });
  PAIRS.done++; qiAdd(.15); S.hitstop = Math.max(S.hitstop, fx.stop ?? .09); S.shake = Math.max(S.shake, fx.shake ?? .15); if (fx.impact !== false) S.impact = 2;
}
// cut him into pieces of his own pixels along local lines [lx0, ly0, lx1, ly1], measured from his feet as he is drawn (up is
// negative) before any turn a script gave him; push(piece, dx, h, i) gives each its throw from where it sits (dx toward the
// ronin's side, h up from his feet), in local terms: { vx, vz, va } thrown, or { script } for one that topples where it stands
export function halve(x, cuts, push) {
  const { E } = x, px = wx(x, E.lx), py = wy(x, E.ly), top = py - E.z, r = E.rot * x.s, c = Math.cos(r), sn = Math.sin(r);
  const L = cuts.map(([a, b, cc, d]) => { const l = [wx(x, a), top + b, wx(x, cc), top + d]; return x.s < 0 ? [l[2], l[3], l[0], l[1]] : l; });
  let i = 0;
  PC.pieces.push(...toPieces(pixelsOf({ x: px, y: py, z: E.z, face: wface(x, E.f), pose: E.pose, part: true }), L, py, (Q, cx, cy) => {
    const v = push(Q, x.s * (cx - px), top - cy, i++) || {};
    if (r) { const ox = cx - px, oy = cy - (top - 12); Q.x = px + ox * c - oy * sn; Q.z = py - (top - 12 + ox * sn + oy * c); Q.a = r; }   // turned as he was
    Q.vx = x.s * (v.vx || 0); Q.vz = v.vz || 0; Q.va = x.s * (v.va || 0);
    if (v.script) { Q.x0 = Q.x; Q.z0 = Q.z; const a0 = Q.a; Q.script = tt => { const o = v.script(tt); return { ...o, dx: x.s * o.dx, a: a0 + x.s * o.a }; }; } }));
  E.gone = true; bleed(px, py, E.z + 12, x.s, 1.3); pool(px, py + 1, rr(4, 6));
}
// a white cut line through local (lx, ly), along (dx, dy), n pixels each way
export function cutLine(x, lx, ly, dx, dy, n = 11) { const m = Math.max(Math.abs(dx), Math.abs(dy)) || 1;
  const l = { x: wx(x, lx), y: wy(x, ly), dx: x.s * dx / m, dy: dy / m, n, t: 0 }; lines.push(l);
  tear(l.x - l.dx * n, l.y - l.dy * n, l.x + l.dx * n, l.y + l.dy * n, 2.5, .5); }   // the black slash along every paired cut
// a rope, chain or scarf from one local point to another this frame (kind: 'chain' | 'cloth')
export const rope = (x, a, b, kind) => { x.rope = { a: [wx(x, a[0]), wy(x, a[1])], b: [wx(x, b[0]), wy(x, b[1])], kind }; };
// an afterimage of an actor as it is now
export function ghost(x, who, alpha = .5) { const A = x[who], hero = who === 'H';
  ghosts.push({ x: wx(x, A.lx), y: wy(x, A.ly), z: A.z, rot: A.rot * x.s, face: wface(x, A.f), pose: pose(hero ? HERO : x.a.c, A), hero, t: 0, alpha, F: hero ? wear : x.a.F }); }
const pose = (c, A) => poseOf(frames(c, A.anim), A.at);

// one step; false when no paired execution is running
export function pairStep(dt) {
  PAIRS.cd = Math.max(0, PAIRS.cd - dt);
  for (const gh of ghosts) gh.t += dt; while (ghosts.length && ghosts[0].t > .3) ghosts.shift();
  for (const l of lines) l.t += dt; while (lines.length && lines[0].t > .5) lines.shift();
  updatePieces(PC, dt); for (const b of bodies) b.t += dt;
  if (roomFade() <= 0) { PC.pieces.length = 0; bodies.length = 0; }   // a new squad: the old bodies go with the rest of the fallen
  if (!X) return false;
  const x = X, { e, a } = x; x.t += dt; x.rope = null;
  if (a.state !== 'up') { if (e.alive) { x.E.keys = null; slay(x, { impact: false }); } end(); return true; }   // the partner is cut down: he dies of what he has
  RUNS[x.ex.id].run(x, x.t, dt);
  const { H, A, E } = x;
  if (E.keys) E.pose = at(E.keys, x.t - E.k0);
  [P.x, P.y] = [wx(x, H.lx), wy(x, H.ly)]; P.face = wface(x, H.f);
  [a.x, a.y] = [wx(x, A.lx), wy(x, A.ly)]; a.face = wface(x, A.f); a.anim = A.anim; a.t = A.at;
  if (e.alive) { e.x = wx(x, E.lx); e.y = wy(x, E.ly); }
  if (x.t >= RUNS[x.ex.id].dur) end();
  return true;
}
function end() {
  const x = X; X = null; const { a, e, E } = x;
  if (e.alive) { e.held = false; kill(e, { execution: true, by: a, pair: a }); PAIRS.done++; }
  if (!E.gone) bodies.push({ x: wx(x, E.lx), y: wy(x, E.ly), face: wface(x, E.f), keys: E.keys, t: x.t - E.k0, pose: E.pose });
  [P.x, P.y] = collide(P.x, P.y); [a.x, a.y] = collide(a.x, a.y);
  a.anim = 'idle'; a.t = 0; a.armed = false; P.armed = false; P.inv = false; setState('idle');
  PAIRS.cd = PAIR_CD;
}

// ---- drawing: the hero and partner while it runs (in the air, turning), the enemy held, the ghosts, the pieces and bodies ----
// a figure's canvas on the floor at (x, y), lifted z and turned rot about its middle: shadow, reflection (on the floor only), figure
function put(cv, x, y, o) {
  const z = o.z || 0, r = o.rot || 0, a = o.alpha ?? 1; x = snap(x); y = snap(y);
  const sw = Math.max(4, 10 - z / 5); g.fillStyle = `rgba(20,24,24,${.35 * a})`; g.fillRect(Math.round(x - sw / 2), Math.round(y), Math.round(sw), 2);
  if (z < 6 && !r) { g.save(); g.globalAlpha = .17 * a; g.translate(x, y + 1 + z); g.scale(1 / PX, -1 / PX); g.drawImage(cv, -OX, -OY); g.restore(); }
  g.save(); g.globalAlpha = a; g.translate(x, snap(y - z - 12)); g.rotate(r); g.translate(0, 12); g.scale(1 / PX, 1 / PX);
  g.drawImage(o.flash ? white(cv) : cv, -OX, -OY); g.restore();
}
const figOf = (c, F, A, pal, dt) => paint(F, pose(c, A), dt, pal, ...sideOn(null, A.face));
function drawActor(x, who) {
  const A = x[who]; if (A.hide) return; const hero = who === 'H';
  put(figOf(hero ? HERO : x.a.c, hero ? wear : x.a.F, { ...A, face: wface(x, A.f) }, hero ? 'hero' : 'ally', S.hitstop > 0 ? 0 : 1 / 60),
    wx(x, A.lx), wy(x, A.ly), { z: A.z, rot: A.rot * x.s, alpha: A.alpha, flash: A.flash > x.t });
}
// the held enemy: turned in the air when a script flips him
function drawHeld(R) {
  if (!R.rot) return withShadow(g, R);
  g.fillStyle = 'rgba(18,22,22,.4)'; g.fillRect(Math.round(R.x) - 4, Math.round(R.y) + 1, 8, 1);
  g.save(); g.translate(R.x, R.y - R.z - 12); g.rotate(R.rot); g.translate(-R.x, -(R.y - R.z - 12)); figure(g, R.flash ? { ...R, col: '#ffffff' } : R); g.restore();
}
export function pairedDrawables() {
  const fade = roomFade(), out = ghosts.map(gh => ({ y: gh.y - .1, d: () => gh.F && put(white(paint(gh.F, gh.pose, 0, gh.hero ? 'hero' : 'ally', ...sideOn(null, gh.face))), gh.x, gh.y, { z: gh.z, rot: gh.rot, alpha: gh.alpha * (1 - gh.t / .3) }) }));
  for (const b of bodies) out.push({ y: b.y - .5, d: () => withShadow(g, { x: b.x, y: b.y, face: b.face, enemy: true, pose: b.keys ? at(b.keys, b.t) : b.pose }, fade) });
  if (PC.pieces.length) out.push({ y: (PC.pieces[0].fy || 0) + .5, d: () => drawPieces(g, PC, fade) });
  if (!X) return out;
  const x = X, E = x.E;
  if (!E.gone) out.push({ y: wy(x, E.ly), d: () => drawHeld({ x: wx(x, E.lx), y: wy(x, E.ly), z: E.z, face: wface(x, E.f), rot: E.rot * x.s, enemy: true, pose: E.pose, flash: E.flash > x.t }) });
  out.push({ y: wy(x, x.H.ly) + .2, d: () => drawActor(x, 'H') }, { y: wy(x, x.A.ly) + .1, d: () => drawActor(x, 'A') });
  return out;
}
// over the bodies: the white cut lines, and the chain or scarf a script throws
export function drawPairLines() {
  for (const l of lines) { g.save(); g.globalAlpha = Math.max(0, 1 - l.t / .5); g.fillStyle = COL.core;
    for (let k = -l.n; k <= l.n; k++) g.fillRect(Math.round(l.x + k * l.dx), Math.round(l.y + k * l.dy), 1, 1); g.restore(); }
  const r = X && X.rope; if (!r) return;
  const [x0, y0] = r.a, [x1, y1] = r.b, n = Math.max(1, Math.round(Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0))));
  for (let i = 0; i <= n; i++) { const k = i / n, sag = r.kind === 'cloth' ? Math.sin(k * Math.PI) * 2 : 0;
    g.fillStyle = r.kind === 'chain' ? (i % 3 === 0 ? COL.fx2 : i % 2 ? '#7d868e' : '#3a3f45') : (i % 4 === 0 ? RC.m : RC.M);
    g.fillRect(Math.round(x0 + (x1 - x0) * k), Math.round(y0 + (y1 - y0) * k + sag), 1, 1); }
}
