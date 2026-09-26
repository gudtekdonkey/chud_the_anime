import { P, S } from '../state.js';
import { rr, sgn, ring, spark, residue } from '../fx/util.js';
import { bleed, pool, clearBlood, updateBlood } from '../fx/blood.js';
import { GUARD, FLINCH, FLINCH_T, STAGGER_T, THUD_T, staggerPose, deathPose, newBody, stepBody, thudBody, kick } from './enemy-body.js';
import { collide } from './room.js';

// ---- The enemies: topknot samurai on his rig, with health, hit reactions and deaths ----
// The API other systems use (hits, Qi, mirrors, and K assassinations next):
//   ENEMIES              every enemy in the room, dead ones included (they lie where they fell); e.alive, e.hp, e.maxHp, e.x, e.y, e.face
//   living()             the ones still standing
//   nearest(x, y, pred)  the nearest living enemy (in the squashed floor space the hits use), or null
//   isolated(e, r)       no other living enemy within r px (ISOLATION to start): K may execute e
//   damage(e, n, fx, fy) a blow of n from (fx, fy): flinch, stagger or death. Returns true if it killed him
//   kill(e, o)           dead now, whatever his health. o.dir: which way the blow carries him (+1 right, -1 left).
//                        o.execution: gone at once, no death of ours and no dropped sword (the execution's pieces are the death)
//   e.held = true        an execution owns him: we neither update nor draw him, and hits pass him by
//   onKill(fn)           fn(e, o) after every death (o.execution for an execution) (K's cooldown reset hangs here)
export const HP = 4, ISOLATION = 36;
// damage per kind of hit (the same kinds as QI_GAIN): bigger moves hit harder
export const DMG = { slash: 1, d: 1, sw: 2, tc: 2, cm: 3, cr: 1, crB: 2, mi: 1, chain: 1, burst: 1 };
const SPAWNS = [[262, 170], [306, 196], [348, 178], [400, 192], [312, 118], [420, 244], [92, 208]];
const fresh = (x, y) => ({ x, y, face: -1, hp: HP, maxHp: HP, alive: true, state: 'guard', t: 0, flash: 0, zap: 0, shk: 0, lastHit: -9, turnT: 0,
  vx: 0, vy: 0, fd: -1, held: false, P0: GUARD, body: newBody(GUARD), pose: GUARD, alpha: 1 });
export const ENEMIES = SPAWNS.map(([x, y]) => fresh(x, y));
export const blades = [];   // swords dropped by the dead
let clock = 0, emptyT = 0;
const kills = [];

export const living = () => ENEMIES.filter(e => e.alive);
export function nearest(x, y, pred = () => true) {
  let best = null, br = Infinity;
  for (const e of ENEMIES) { const r = Math.hypot(e.x - x, (e.y - y) * 1.3); if (e.alive && pred(e) && r < br) { br = r; best = e; } }
  return best;
}
export const isolated = (e, r = ISOLATION) => ENEMIES.every(o => o === e || !o.alive || Math.hypot(o.x - e.x, o.y - e.y) > r);
export const onKill = fn => kills.push(fn);

export function damage(e, n, fx, fy) {
  if (!e.alive) return false;
  e.hp = Math.max(0, e.hp - n); e.flash = .05; e.shk = .1;
  e.face = Math.sign(fx - e.x) || e.face; e.turnT = 0;   // he turns to whoever hit him
  const away = Math.sign(e.x - fx) || -e.face, mag = Math.max(.4, Math.min(1.4, n / 2));
  kick(e.body, away * e.face, mag);
  bleed(e.x, e.y, 13, away, mag);
  if (e.hp <= 0) { kill(e, { dir: away, vx: away * 40 * mag }); return true; }
  // a heavy blow, or a second one before he has recovered from the first, staggers him; anything else is a flinch
  const heavy = n >= 2 || clock - e.lastHit < .5;
  e.lastHit = clock; e.state = heavy ? 'stagger' : 'flinch'; e.t = 0;
  e.vx = away * (heavy ? 70 : 30); e.vy = 0;
  return false;
}
export function kill(e, o = {}) {
  if (!e.alive) return;
  const dir = o.dir || -e.face;
  if (o.execution) { e.alive = false; e.hp = 0; e.state = 'gone'; e.held = false; for (const fn of kills) fn(e, o); return; }
  const shown = e.body.out;   // he dies from the pose he is seen in, not the one he was headed for
  e.alive = false; e.hp = 0; e.state = 'dead'; e.t = 0; e.fd = dir * e.face; e.P0 = shown; e.vx = o.vx != null ? o.vx : dir * 30; e.vy = 0;
  // his sword leaves his hands as he goes: it falls, turning, and lies where it lands
  if (shown.sword != null) blades.push({ x: e.x + e.face * 6, y: e.y + rr(-2, 3), z: 16, vx: dir * rr(10, 30), vz: rr(20, 50), a: shown.sword, va: sgn() * rr(6, 12), face: e.face });
  for (const fn of kills) fn(e, o);
}

function thud(e) {
  thudBody(e.body, e.pose);
  for (let i = 0; i < 9; i++) spark(e.x + rr(-8, 8), e.y - 1, rr(-40, 40), -rr(0, 18), rr(.25, .45), '#8f9692');
  ring(e.x, e.y + 1, 2, 1, .12, 6); S.shake = Math.max(S.shake, 1 / 60);
  pool(e.x + e.fd * e.face * 6 + rr(-2, 2), e.y + 1, rr(3.5, 5.5));
}
// frozen: the hit pause. Bodies hold still (and shake, drawn), timers that belong to the hit keep running
export function updateEnemies(dt, frozen) {
  for (const e of ENEMIES) { e.flash = Math.max(0, e.flash - dt); e.shk = Math.max(0, e.shk - dt); }
  if (frozen) return;
  clock += dt; updateBlood(dt);
  for (const e of ENEMIES) { if (e.held || e.state === 'gone') continue;
    const t = (e.t += dt);
    if (e.state === 'guard') { e.pose = GUARD;
      // he turns to keep facing the ronin, a beat late
      const want = Math.sign(P.x - e.x) || e.face;
      if (want !== e.face && P.state !== 'death') { if ((e.turnT += dt) > .35) { e.face = want; e.turnT = 0; kick(e.body, -1, .3); } } else e.turnT = 0; }
    else if (e.state === 'flinch') { e.pose = FLINCH; if (t >= FLINCH_T) { e.state = 'guard'; e.t = 0; } }
    else if (e.state === 'stagger') { e.pose = staggerPose(t); if (t >= STAGGER_T) { e.state = 'guard'; e.t = 0; } }
    else if (e.state === 'dead') { e.pose = deathPose(e.P0, e.fd, t); if (e.body.thudT == null && t >= THUD_T) { e.vx = 0; thud(e); } }
    e.vx *= Math.pow(.004, dt);   // skids to a stop in a fraction of a second
    [e.x, e.y] = collide(e.x + e.vx * dt, e.y + e.vy * dt);
    stepBody(e.body, e.pose, dt);
  }
  for (const b of blades) if (b.z > 0 || b.vz > 0) { b.x += b.vx * dt; b.z += b.vz * dt; b.vz -= 300 * dt; b.a += b.va * dt;
    if (b.z <= 0) { b.z = 0; b.vz = 0; b.a = Math.round(b.a / Math.PI) * Math.PI + rr(-.25, .25); spark(b.x, b.y, 0, -10, .1, '#ffffff', false, 0); } }
  // the room is cleared: a beat, the fallen fade, and a new squad glitches in, so there is always someone to cut
  if (living().length) { emptyT = 0; return; }
  emptyT += dt;
  for (const e of ENEMIES) e.alpha = Math.max(0, 1 - Math.max(0, emptyT - 2.4) / .6);
  if (emptyT >= 3) { blades.length = 0; clearBlood(); emptyT = 0;
    ENEMIES.forEach((e, i) => { Object.assign(e, fresh(...SPAWNS[i])); e.face = Math.sign(P.x - e.x) || -1; residue(e.x, e.y, 6); }); }
}
