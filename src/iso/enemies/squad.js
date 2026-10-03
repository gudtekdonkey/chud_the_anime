// ---- THE SQUAD: the enemies in the courtyard as a group. It spawns the picked group, routes the moves' events to their
// enemy, runs the decision layer (the placeholder BRAIN, or whatever is plugged in), and gives that layer the group's
// shape: the attack tokens (ctx.js), a slot for each round the hero (melee spread evenly round him so two flank and
// three or more surround; ranged behind the melee, at their own range), whether one is alone, and morale (an ally's
// death shakes those near). It also keeps them apart, steps the shots and the smoke, and brings the group back 3 s
// after the last one falls. `SQUAD` is the handle a decision layer imports (docs/enemies.md).
import { W } from 'ronin-engine/clock/world.js';
import { hOf, wrapA, TAU, AF, rnd } from 'ronin-engine/flow/flow.js';
import { CUT } from '../play/hero.js';
import { ROOM } from '../world/room.js';
import { TYPES, GROUPS } from './types.js';
import { Enemy } from './enemy.js';
import { CTX, TOKENS } from './ctx.js';
import { emit, ELOG, onEnemy } from './events.js';
import { heroCut, stepShots, ESTATS } from './combat.js';
import { BRAIN } from './brain.js';
import { drawSquad } from './draw.js';
import { toScreen, VW, VH } from 'ronin-engine/render/gfx/view.js';
import './moves.js';

const EVENTS = ['e:tele', 'e:strike', 'e:slam', 'e:loose', 'e:throw', 'e:smoke', 'e:appear', 'e:phase'];
export const SQUAD = { on: false, group: 'samurai', enemies: CTX.enemies, tokens: TOKENS, brain: BRAIN, onEnemy, ctx: null, cleared: 0, peakAttacking: 0, spawn: null };

export function makeSquad({ scene, hero, foe, foes = [foe], chars, look, hpK = 1 }) {
  CTX.hero = hero;
  for (const n of EVENTS) W.on[n] = a => { if (a.char && a.char.onEvent) a.char.onEvent(n); };
  const base = W.on.hit; W.on.hit = (a, w) => SQUAD.on ? heroCut(a) : base && base(a, w);
  // morale: a death shakes everyone near who saw it, the less brave the more
  CTX.onDeath = d => { for (const e of CTX.enemies) if (e !== d && !e.dead && e.dist(d) < 260) e.morale -= (1 - e.T.brave) * .55; };
  const slots = new Map();
  const ctx = SQUAD.ctx = { hero, get enemies() { return CTX.enemies; }, tokens: TOKENS, slotOf: e => slots.get(e), alone: e => !CTX.enemies.some(o => o !== e && !o.dead && o.dist(e) < 300) };
  let clearedAt = null, lastHero = null, slotAt = 0;

  function remove(e) { e.look.dispose(); TOKENS.release(e); for (const L of [chars, CTX.enemies]) { const i = L.indexOf(e); if (i >= 0) L.splice(i, 1); }
    const j = W.actors.indexOf(e.a); if (j >= 0) W.actors.splice(j, 1); }
  function spawn(name = SQUAD.group) {
    for (const e of CTX.enemies.slice()) remove(e); CTX.shots.length = 0; CTX.puffs.length = 0; TOKENS.clear(); SQUAD.peakAttacking = 0; for (const k in ESTATS) ESTATS[k] = 0;
    const G = GROUPS[name] || GROUPS.samurai; SQUAD.group = name; SQUAD.on = G.list.length > 0; clearedAt = null;
    for (const f of foes) {   // every samurai of the default squad (main.js &foes) is parked while another group is on
      if (SQUAD.on && !f.parked) { f.parked = true; f.a.alpha = 0; f.a.x = f.spawn[0] / AF; f.a.z = f.spawn[1] / AF; }
      else if (!SQUAD.on && f.parked) { f.parked = false; f.respawn(); } }
    // they come in from across the yard: the melee in a loose arc facing him, the ranged further back, the hidden anywhere
    const cx = Math.max(140, Math.min(470, hero.x + 120)), cz = 150, melee = G.list.filter(k => TYPES[k.replace('!', '')].role === 'melee' && !k.endsWith('!')).length;
    let mi = 0, ri = 0;
    for (const k0 of G.list) { const hidden = k0.endsWith('!'), k = k0.replace('!', ''), T = TYPES[k]; let x, z;
      if (hidden) { x = 80 + rnd() * 440; z = 40 + rnd() * 220; }
      else if (T.role === 'ranged') { x = cx + 70; z = cz + (ri++ - .5) * 50; }
      else { const a = (mi++ - (melee - 1) / 2) * .55; x = cx + Math.cos(a) * 30; z = cz + Math.sin(a) * 60; }
      x = Math.max(20, Math.min(580, x)); z = Math.max(20, Math.min(280, z));
      const e = new Enemy(k, { x, z, h: hOf(hero.x - x, hero.z - z), look: look(), hpK, hidden }); e.lurk = hidden; e.spawnedAt = W.t;
      e.look.mount(scene); chars.push(e); CTX.enemies.push(e); emit('spawn', e, { hidden }); }
  }
  SQUAD.spawn = spawn;

  // the slots: melee spread round him (2 flank, 3+ surround), ranged behind the melee at their range, inside the yard
  function placeSlots() {
    const H = hero.a, live = CTX.enemies.filter(e => e.targetable && e.st !== 'flee'), melee = live.filter(e => e.T.role === 'melee'), ranged = live.filter(e => e.T.role === 'ranged');
    const set = (e, x, z) => slots.set(e, { x: Math.max(ROOM.x0 + 16, Math.min(ROOM.x1 - 16, x * AF)), z: Math.max(ROOM.z0 + 16, Math.min(ROOM.z1 - 16, z * AF)) });
    const n = melee.length; let md = null;
    if (n) { const p = melee.map(e => ({ e, a: hOf(e.a.x - H.x, e.a.z - H.z) })).sort((u, v) => u.a - v.a), sp = n === 1 ? 0 : n === 2 ? Math.PI * .8 : TAU / n;
      let off = 0; p.forEach((q, i) => { off += wrapA(q.a - (p[0].a + i * sp)); }); off /= n;
      p.forEach((q, i) => { const a = p[0].a + i * sp + off; set(q.e, H.x + Math.sin(a) * q.e.T.ring, H.z + Math.cos(a) * q.e.T.ring); });
      let sx = 0, sz = 0; for (const e of melee) { sx += e.a.x - H.x; sz += e.a.z - H.z; } md = hOf(sx, sz); }
    ranged.forEach((e, i) => { const a = (md ?? hOf(e.a.x - H.x, e.a.z - H.z)) + (i - (ranged.length - 1) / 2) * .5; set(e, H.x + Math.sin(a) * e.T.ring, H.z + Math.cos(a) * e.T.ring); });
  }
  // nobody stands inside anybody: enemies pushed apart, and off the hero
  function separate() {
    const L = CTX.enemies.filter(e => e.targetable);
    for (let i = 0; i < L.length; i++) { const A = L[i].a;
      for (let j = i + 1; j < L.length; j++) { const B = L[j].a, dx = B.x - A.x, dz = B.z - A.z, d = Math.hypot(dx, dz), m = (L[i].r + L[j].r) / AF * 1.1;
        if (d < m && d > 1e-3) { const k = (m - d) / d / 2; A.x -= dx * k; A.z -= dz * k; B.x += dx * k; B.z += dz * k; } }
      const H = hero.a, dx = A.x - H.x, dz = A.z - H.z, d = Math.hypot(dx, dz), m = (L[i].r + hero.r) / AF;
      if (d < m && d > 1e-3) { A.x += dx * (m - d) / d; A.z += dz * (m - d) / d; } }
  }

  // one game step (60 Hz, outside hit-stops): threats, slots, thinking, the enemies, shots, the group's return
  function control(dt) {
    if (!SQUAD.on) return; TOKENS.step();
    const hs = hero.state;
    if (hs !== lastHero && CUT[hs]) for (const e of CTX.enemies) { const b = e.brain === undefined ? SQUAD.brain : e.brain; if (!b || !b.threat || !e.targetable) continue;
      const dx = e.a.x - hero.a.x, dz = e.a.z - hero.a.z, d = Math.hypot(dx, dz); if (d < 84 && Math.abs(wrapA(hOf(dx, dz) - hero.a.h)) < 1.4) b.threat(e, ctx, { move: hs, d: d * AF }); }
    lastHero = hs;
    if (W.t >= slotAt) { placeSlots(); slotAt = W.t + .25; }
    for (const e of CTX.enemies) { if (e.dead) continue; const b = e.brain === undefined ? SQUAD.brain : e.brain;
      if (b && W.t >= (e.thinkAt || 0)) { e.thinkAt = W.t + .12 + rnd() * .08; b.think(e, ctx); } }
    for (const e of CTX.enemies) e.update(dt);
    separate(); stepShots(dt);
    let att = 0; for (const e of CTX.enemies) if (e.st === 'attack' && e.atk && e.atk.m.pool === 'melee' && !e.T.boss && e.atk.name !== 'ambush') att += TOKENS.cost(e);
    SQUAD.peakAttacking = Math.max(SQUAD.peakAttacking, att); SQUAD.attacking = att;
    for (const e of CTX.enemies.slice()) if (e.gone) remove(e);
    if (!CTX.enemies.some(e => !e.dead)) { if (clearedAt == null) clearedAt = W.t; else if (W.t - clearedAt > 3 && !CTX.enemies.length) { SQUAD.cleared++; emit('cleared', null, { group: SQUAD.group }); spawn(); } } else clearedAt = null;
  }
  // whom his cut turns to: the nearest he can see within the step-in reach, toward the stick if it is held
  function aim(h, dir) { let best = null, bd = 1e9;
    for (const e of CTX.enemies) { if (!e.targetable) continue; const dx = e.a.x - h.a.x, dz = e.a.z - h.a.z, d = Math.hypot(dx, dz);
      if (d > 118 || (dir != null && Math.abs(wrapA(hOf(dx, dz) - dir)) > 1.2)) continue; if (d < bd) { bd = d; best = e; } }
    return best; }
  const near = (h, r) => { let best = null, bd = r; for (const e of CTX.enemies) if (e.targetable) { const d = Math.hypot(e.x - h.x, e.z - h.z); if (d < bd) { bd = d; best = e; } } return best; };
  function debug() {
    return { group: SQUAD.group, on: SQUAD.on, cleared: SQUAD.cleared, heroHp: CTX.heroHp, downs: CTX.downs, attacking: SQUAD.attacking || 0, peakAttacking: SQUAD.peakAttacking,
      tokens: { held: [...TOKENS.held.keys()].map(e => e.id), peak: { ...TOKENS.peak } }, stats: { ...ESTATS }, shots: CTX.shots.length,
      enemies: CTX.enemies.map(e => ({ ...e.info, attacks: e.attacks, strikes: e.strikes, hits: e.hits, blocks: e.blocks, deaths: e.deaths, px: toScreen(e.x, 0, e.z).map((v, i) => v / (i ? VH : VW)) })), log: ELOG.slice(-120) };
  }
  return { spawn, control, aim, near, draw: g => drawSquad(g, hero), debug, get on() { return SQUAD.on; } };
}
