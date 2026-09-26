import { P, S } from '../state.js';
import { POSES } from '../anims/poses.js';
import { pz } from '../rig/pose.js';
import { g } from '../screen.js';
import { living, damage, onKill, DMG } from '../world/enemies.js';
import { collide } from '../world/room.js';
import { qiAdd, QI_GAIN } from '../player/qi.js';
import { WEAPONS } from '../weapons/weapons.js';
import { showBanner } from '../items/inventory.js';
import { HURT_HOOKS } from '../items/harvest.js';
import { spark } from '../fx/util.js';
import { party, byId, ROLES, gainExp, stat, bury } from './kit.js';
import { frames, poseOf, lenOf, bakeFor, figureFor, paint, place, faceTo } from './figures.js';

// ---- Companions in the room: they fall in behind him in ranks of six, spread across the enemies and fight the way their weapon says ----
// The API: allies (the actors of party.members), syncParty() after the roster or a kit changes, hurtAlly(a, n) (enemies will call it
// once they attack; H does it for testing), say(text), partyDrawables() for the depth sort, drawPartyOver() for bars and prompts
export const allies = [];
export const PS = { note: '', noteT: 0, clock: 0, lastBy: null };   // the order's note over the HUD; lastBy: who struck the blow in hand
const reachOf = a => Math.round(15 * WEAPONS.find(w => w.id === wid(a)).reach);   // his slash reach, scaled by the weapon
const hitAt = a => ROLES[wid(a)].hit;   // the slash's strike beat, as update.js times his
export const BLEED = 15, LIFT = .6;   // a downed companion lasts this long unless lifted; holding E beside them this long lifts them
const KNEEL = POSES.death[5];
const ATTACKS = new Set(['slash1', 'slash2']);
export const say = (s, t = 1.4) => { PS.note = s; PS.noteT = t; };

function actorFor(c, x, y) {
  return { c, F: figureFor(c), x, y, face: P.face, anim: 'idle', t: 0, armed: false, calm: 0, hp: 1, flash: 0, hitDone: false, cd: 0, target: null, anchor: null,
    state: 'up', st: 0, lift: 0, oath: true, crane: true, px: x };
}
export function syncParty() {
  const keep = new Map(allies.map(a => [a.c.id, a]));
  const next = party.members.map(byId).filter(Boolean).map((c, i) => keep.get(c.id) || actorFor(c, ...slotBehind(i)));
  allies.length = 0; allies.push(...next);
}
syncParty();
export const standing = () => allies.filter(a => a.state === 'up');
export const busy = a => ATTACKS.has(a.anim);

// ---- moving and cutting ----
const wid = a => a.c.kit.weapon;
const clip = (a, name) => frames(a.c, name);
function setAnim(a, name) { if (a.anim !== name) { a.anim = name; a.t = 0; } }
function cut(a) {
  const second = a.anim === 'slash1' && a.t > hitAt(a) + .05;
  setAnim(a, second ? 'slash2' : 'slash1'); a.t = 0; a.hitDone = false; a.armed = true; a.calm = 0;
}
function tryHit(a) {
  const w = WEAPONS.find(v => v.id === wid(a)), r = reachOf(a);
  let any = false;
  for (const e of living()) { if (e.held) continue;
    const dx = (e.x - a.x) * a.face, dy = Math.abs(e.y - a.y);
    if (dx > -3 && dx < r + 6 && dy < 9) {
      const heavy = ROLES[w.id].kind === 'break' || Math.random() < .08 * stat(a.c, 'edge');
      PS.lastBy = a; damage(e, heavy ? DMG.sw : DMG.slash, a.x, a.y); PS.lastBy = null; any = true; } }
  if (!any) return;
  // a short pause and shake, weighted by the weapon, on some of their hits only: thirty of them must not stutter the room
  if (Math.random() < .3) { S.hitstop = Math.max(S.hitstop, .03 * w.weight.stop); S.shake = Math.max(S.shake, .05 * w.weight.shake); }
  qiAdd(QI_GAIN.slash * .5 * (1 + .1 * stat(a.c, 'focus')) * (a.c.kit.charms.includes('tsuba') ? 1.25 : 1));   // half his Qi per hit
}
function move(a, dx, dy) { [a.x, a.y] = collide(a.x + dx, a.y + dy); }
function step(a, dt, mx, my, run) {
  a.t += dt; a.cd -= dt;
  if (busy(a)) {
    const at = hitAt(a);
    if (!a.hitDone && a.t >= at) { a.hitDone = true; tryHit(a); }
    if (a.t < at + .06 && a.t > at - .05) move(a, a.face * (ROLES[wid(a)].kind === 'line' ? 60 : 40) * dt, 0);   // the lunge
    if (a.t >= lenOf(clip(a, a.anim))) setAnim(a, 'ready');
    return;
  }
  if (a.anim === 'sheathe') { if (mx || my) setAnim(a, 'idle'); else { if (a.t >= lenOf(clip(a, 'sheathe'))) setAnim(a, 'idle'); return; } }
  const sp = bakeFor(a.c).speed, m = Math.hypot(mx, my);
  if (m > .01) {
    const v = (a.armed || run ? sp.run : sp.walk) * ROLES[wid(a)].speed * (1 + .04 * stat(a.c, 'speed'));
    const k = Math.min(1, m / (v * dt));   // never step past the spot they want
    move(a, mx / m * v * dt * k, my / m * v * dt * .8 * k);
    if (Math.abs(mx) > .05) a.face = faceTo(a.F, a.face, Math.sign(mx));
    setAnim(a, a.armed ? 'runArmed' : run ? 'run' : 'walk'); a.calm = 0;
  } else if (a.armed) { setAnim(a, 'ready'); if ((a.calm += dt) > 2) { a.armed = false; setAnim(a, 'sheathe'); } }
  else setAnim(a, 'idle');
}

// ---- where to stand: ranks of six behind him; on an enemy, the spot their weapon wants ----
function slotBehind(i) { const rank = Math.floor(i / 6), file = i % 6; return [P.x - P.face * (18 + rank * 14), P.y + (file - 2.5) * 10 + (rank % 2) * 5]; }
function pickTarget(a, load) {
  const ox = a.anchor ? a.anchor[0] : P.x, oy = a.anchor ? a.anchor[1] : P.y, all = living().filter(e => !e.held);
  const pool = all.filter(e => Math.hypot(e.x - ox, (e.y - oy) * 1.4) < (a.anchor ? 60 : 130));
  if (!pool.length) return null;
  const w = ROLES[wid(a)].kind, crowd = e => all.filter(o => Math.hypot(o.x - e.x, o.y - e.y) < 40).length;
  let best = null, bs = 1e9;
  for (const e of pool) {   // closest first, but spread out: an enemy with others on him already is somebody else's
    let s = Math.hypot(e.x - a.x, e.y - a.y) + 40 * (load.get(e) || 0);
    if (w === 'break') s -= 18 * crowd(e);
    if (w === 'flank' || w === 'duel') s += .6 * Math.hypot(e.x - P.x, e.y - P.y);
    if (s < bs) { bs = s; best = e; }
  }
  return best;
}
function spotFor(a, e, k) {
  const w = ROLES[wid(a)].kind, side = Math.sign(P.x - e.x) || 1, r = reachOf(a) - 2, off = [0, -6, 6, -11, 11][k % 5];
  if (w === 'flank') return [e.x - side * r, e.y + off];   // round the far side, behind him
  if (w === 'line') return [e.x + side * r, e.y + off];    // your side, at spear length
  const s = k % 2 ? -side : side; return [e.x + s * r, e.y + off];
}
function think(a, i, dt, load) {
  if (busy(a)) return step(a, dt, 0, 0);
  if (party.order === 'hold' && !a.anchor) a.anchor = [a.x, a.y];
  if (party.order === 'follow') a.anchor = null;
  const bad = e => !e || !e.alive || e.held || Math.hypot(e.x - P.x, e.y - P.y) > 160;
  if (bad(a.target) || (load.get(a.target) || 0) > 4) a.target = pickTarget(a, load);
  let tx, ty, run = true;
  if (a.target) {
    const k = load.get(a.target) || 0; load.set(a.target, k + 1);
    [tx, ty] = spotFor(a, a.target, k);
    if (Math.hypot(tx - a.x, ty - a.y) < 3) {
      a.face = faceTo(a.F, a.face, Math.sign(a.target.x - a.x) || a.face);
      if (a.cd <= 0) { cut(a); a.cd = (ROLES[wid(a)].cd + Math.random() * .3) * Math.max(.6, 1 - .04 * stat(a.c, 'focus')); }
      return step(a, dt, 0, 0);
    }
  } else if (a.anchor) [tx, ty] = a.anchor;
  else [tx, ty] = slotBehind(i);
  const dx = tx - a.x, dy = ty - a.y, dd = Math.hypot(dx, dy);
  if (!a.target && dd < 3) {
    if (!a.armed && a.face !== P.face && P.still > .3) a.face = faceTo(a.F, a.face, P.face);   // settled: they face the way he faces
    return step(a, dt, 0, 0);
  }
  if (!a.target) run = dd > 26;
  step(a, dt, dx, dy * 1.25, run);
}

// ---- down, lifted, or dead: downed companions MAY die (owner) ----
export function hurtAlly(a, n) {
  if (a.state === 'down') return die(a);   // struck again while down: that is the end
  if (a.state !== 'up') return;
  a.hp -= n * Math.max(.5, 1 - .06 * stat(a.c, 'vigor')); a.flash = 2 / 60;
  if (a.hp <= 0 && a.crane && a.c.kit.charms.includes('crane')) { a.crane = false; a.hp = .05; return; }   // Paper Crane: once per area
  if (a.hp <= 0) { a.state = 'down'; a.st = 0; a.lift = 0; a.armed = false; a.anim = 'idle'; a.target = null; say(a.c.name + ' IS DOWN', 1.6); }
}
function die(a) { a.state = 'dying'; a.st = 0; S.shake = Math.max(S.shake, .1); }
function tickState(a, dt) {
  a.st += dt; a.flash = Math.max(0, a.flash - dt);
  if (a.state === 'down' && a.st > BLEED) die(a);
  if (a.state === 'rise' && a.st > .4) { a.state = 'up'; a.hp = .4; }
  if (a.state === 'dying' && a.st > 3.4) { bury(a.c); syncParty(); showBanner('FALLEN', a.c.name, 2); }
}
// Iron Oath: once per area a companion wearing it within reach steps in front of him and takes the blow
HURT_HOOKS.push(n => {
  const a = standing().find(a => a.oath && a.c.kit.charms.includes('oath') && Math.hypot(a.x - P.x, a.y - P.y) < 34);
  if (!a) return false;
  a.oath = false; [a.x, a.y] = collide(P.x + P.face * 8, P.y); a.face = faceTo(a.F, a.face, P.face);
  hurtAlly(a, Math.max(n, .34)); say(a.c.name + ': IRON OATH'); return true;
});
// a new area (the next squad): the once-per-area charms are ready again
export function newArea() { for (const a of allies) { a.oath = true; a.crane = true; } }
// E held beside someone who is down lifts them; returns whether E went to that
export function liftInput(dt, eHeld) {
  const dn = downNear();
  if (dn && eHeld) { if ((dn.lift += dt) >= LIFT) { dn.state = 'rise'; dn.st = 0; say(dn.c.name + ' IS UP'); } return true; }
  for (const a of allies) a.lift = Math.max(0, a.lift - dt * 2);
  return !!dn;
}
export const downNear = () => allies.find(a => a.state === 'down' && Math.hypot(a.x - P.x, a.y - P.y) < 20);

// ---- EXP: the killer takes 40, anyone of the party close by learns something (10). He keeps INV's own EXP ----
const pops = [];
function exp(a, n) { if (n && a.state === 'up' && gainExp(a.c, n)) pops.push({ x: a.x, y: a.y - 30, t: 0, s: 'LV ' + a.c.lv }); }
onKill((e, o) => { const by = o.by || PS.lastBy; for (const a of allies) exp(a, a === by || (o.pair === a) ? 40 : Math.hypot(a.x - e.x, a.y - e.y) < 60 ? 10 : 0); });

// ---- one step ----
export function updateParty(dt, frozen, skip) {
  PS.clock += dt; PS.noteT = Math.max(0, PS.noteT - dt);
  for (const p of pops) { p.t += dt; p.y -= dt * 10; } while (pops.length && pops[0].t > 1.1) pops.shift();
  if (frozen) return;
  const load = new Map();
  [...allies].forEach((a, i) => { tickState(a, dt); if (a === skip) return; if (a.state === 'up') think(a, i, dt, load); else a.t += dt; });
  // they give each other a pixel or two of room instead of standing inside one another
  for (let i = 0; i < allies.length; i++) for (let j = i + 1; j < allies.length; j++) {
    const p = allies[i], q = allies[j], dx = q.x - p.x, dy = (q.y - p.y) * 1.6, d = Math.hypot(dx, dy);
    if (d < 7 && d > .01) { const k = (7 - d) * .25 / d; if (p.state === 'up') move(p, -dx * k, -dy * k / 1.6); if (q.state === 'up') move(q, dx * k, dy * k / 1.6); } }
  for (const a of allies) { a.F.t += dt; a.F.vel = [Math.max(-300, Math.min(300, (a.x - a.px) / dt * a.face)), 0]; a.px = a.x; }
}
export function toggleOrder() { party.order = party.order === 'follow' ? 'hold' : 'follow'; say(party.order === 'hold' ? 'HOLD HERE' : 'WITH ME', 1.2); }

// ---- drawing ----
export function poseFor(a) {
  if (a.state === 'down') return pz({ ...KNEEL, breath: Math.sin(PS.clock * 3) * .5 + .5 });
  const death = clip(a, 'death');
  if (a.state === 'rise') return poseOf(death, Math.max(0, .5 - a.st));
  if (a.state === 'dying') return poseOf(death, .5 + Math.min(a.st, .6) * .8);
  return poseOf(clip(a, a.anim), a.t);
}
export function drawAlly(a, dt = 1 / 60) {
  const alpha = a.state === 'dying' ? Math.max(0, 1 - Math.max(0, a.st - 2.8) / .6) : 1;
  place(g, paint(a.F, poseFor(a), S.hitstop > 0 ? 0 : dt), a.x, a.y, a.face, { flash: a.flash > 0, alpha });
}
export const partyDrawables = skip => allies.filter(a => a !== skip).map(a => ({ y: a.y, d: () => drawAlly(a) }));
// over the world: the bleed bar under whoever is down, the hold markers, the LV pops
export function drawPartyWorld(textC) {
  for (const a of allies) if (a.state === 'down') {
    const k = 1 - a.st / BLEED; g.fillStyle = '#0c0d11'; g.fillRect(Math.round(a.x) - 6, Math.round(a.y) + 3, 12, 2);
    g.fillStyle = PS.clock % .5 < .25 && k < .3 ? '#ff5a4a' : '#ffffff'; g.fillRect(Math.round(a.x) - 6, Math.round(a.y) + 3, Math.round(12 * k), 2); }
  if (party.order === 'hold') for (const a of allies) if (a.anchor) { g.fillStyle = '#6ff3e4'; g.fillRect(Math.round(a.anchor[0]) - 1, Math.round(a.anchor[1]) + 3, 3, 1); }
  for (const p of pops) { g.save(); g.globalAlpha = Math.min(1, (1.1 - p.t) * 3); textC(p.s, Math.round(p.x), Math.round(p.y), '#b8fff6'); g.restore(); }
}
// a hurt spark for H (testing): the nearest standing companion takes a cut
export function hurtNearest() {
  const a = standing().sort((p, q) => Math.hypot(p.x - P.x, p.y - P.y) - Math.hypot(q.x - P.x, q.y - P.y))[0]
    || allies.find(x => x.state === 'down');
  if (!a) return;
  for (let i = 0; i < 5; i++) spark(a.x, a.y - 12, (Math.random() - .5) * 60, -Math.random() * 40, .25, '#ffffff');
  hurtAlly(a, .55);
}
