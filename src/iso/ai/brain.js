// ---- The brain: UTILITY AI (docs/squad-ai.md, "why utility"). Each think (every reaction(wit) s), a man scores every
// option he has, each from a few considerations (distance, his health, his turn, his temper), and takes the best; the
// one he is already doing gets a small bonus, so he does not dither. Personality weights the scores (how willingly);
// intelligence adds noise to them when low, slows the think, and picks the targets (how well).
// Why utility and not behaviour trees: every rule here is a blend ("a bold man attacks sooner, a cautious one later, a
// taunt sticks less to a sharp one", "a protector on a Close leash never chases far"), which is one weight in a score,
// where a tree would need a branch per case. Roles, liberty, orders and tactics are just more considerations on the same
// options, so the companions (squad/mind.js) share these building blocks.
//
// The INTENT (what the body is asked to do; the body owns the clips, the hits, the timing):
//   { k: 'idle', face, facePt }            stand (guard with the blade out once engaged), facing an agent or a point
//   { k: 'move', x, z, speed, face }       go there (world units / s); facing where he goes, or `face` once close
//   { k: 'strafe', x, z, face, speed }     sidestep there in guard, facing `face` (circling)
//   { k: 'attack', target, combo, exec }   close in and swing (combo: cuts in the chain; exec: a killing blow)
//   { k: 'shoot', target }                 draw and loose (a bow)
//   { k: 'block', face }                   raise the guard: a parry window
//   { k: 'taunt' }                         call the foes near onto himself
//   { k: 'revive', target }                go to a downed friend and lift him
import { dist, headTo, wrapA, enemies, friends, perceive, decayThreat, pickTarget, addThreat } from './senses.js';
import { mayAttack, takeToken, dropToken, rings, moraleStep, shout } from './director.js';
import { reaction } from './temper.js';

export const pt = (a, h, d) => ({ x: a.x + Math.sin(h) * d, z: a.z + Math.cos(h) * d });
export const BOUNDS = { x0: 14, x1: 586, z0: 14, z1: 286 };   // the courtyard's floor, set by the world
const inRoom = p => ({ x: Math.max(BOUNDS.x0, Math.min(BOUNDS.x1, p.x)), z: Math.max(BOUNDS.z0, Math.min(BOUNDS.z1, p.z)) });

// best of the scored options; the current one is sticky, a dull mind's scores are noisy
export function choose(W, ag, opts) {
  const cur = ag.intent, noise = (1 - ag.temper.wit) * .22; let best = null;
  for (const o of opts) { if (!o) continue; let s = o.s + (W.rng() - .5) * noise;
    if (cur && cur.k === o.it.k && cur.target === o.it.target) s += .12;
    if (!best || s > best.s) best = { ...o, s }; }
  return best;
}

// where to run from the men in `from`: of 12 directions, the open one that ends farthest from all of them
export function awayPoint(W, ag, from, d = 50) {
  let best = null, bs = -1e9;
  for (let i = 0; i < 12; i++) { const h = i / 12 * Math.PI * 2, p = inRoom(pt(ag, h, d)); if (W.blocked(ag.x, ag.z, p.x, p.z)) continue;
    const s = Math.min(...from.map(e => Math.hypot(e.x - p.x, e.z - p.z)), 999) - Math.hypot(p.x - ag.x - Math.sin(h) * d, p.z - ag.z - Math.cos(h) * d) * 2;
    if (s > bs) { bs = s; best = p; } }
  return best || inRoom(pt(ag, headTo(from[0] || ag, ag), d));
}
// his place on the ring round his target
export function ringPoint(ag, tgt, r) { const a = ag.mind.ringA ?? headTo(tgt, ag); return inRoom(pt(tgt, a, r)); }

// ---- the guard: someone starts a swing at him; once per swing he rolls to raise his guard (discipline, wit; never mid-swing)
export function guardReact(W, ag) {
  if (ag.busy || !ag.alive || ag.downed || ag.ranged) return false; const m = ag.mind;
  for (const e of enemies(W, ag)) { const s = e.swing; if (!s || s.target !== ag || s.judged?.has(ag.id)) continue;
    (s.judged || (s.judged = new Set())).add(ag.id);
    if (dist(e, ag) > (e.reach || 20) + 10 || W.t - m.parryT < 1) continue;
    const p = (ag.blockP ?? (.08 + .3 * ag.temper.discipline + .25 * ag.temper.wit)) * (s.heavy ? .35 : 1);
    if (W.rng() < p) { ag.intent = { k: 'block', face: e, why: 'block' }; m.why = 'block'; return true; } }
  return false;
}

// ---- melee options against tgt (shared by the samurai and the sword companions); k: weights from the role / order
export function meleeOptions(W, ag, tgt, k = {}) {
  const t = ag.temper, m = ag.mind, d = dist(ag, tgt), reach = ag.reach || 20, opts = [];
  const myTurn = ag.team === 1 ? mayAttack(W, ag, tgt) : (W.onTarget(tgt, ag) < (k.maxOn ?? 4));
  if (m.cd <= 0 && myTurn) {
    let s = .55 + t.aggro * .5 + t.bold * .15 + (k.attack ?? 0) + (tgt.busy ? t.patience * .3 : -t.patience * .15) + (d < reach + 30 ? .2 : -.25);
    if (tgt.blocking) s -= .4 * t.wit;
    opts.push({ s, it: { k: 'attack', target: tgt, combo: k.combo ?? 1, exec: k.exec, why: k.why || 'attack' } });
  }
  const r = reach + 10 + t.caution * 10 + (k.ring ?? 0), rp = ringPoint(ag, tgt, r), off = Math.hypot(rp.x - ag.x, rp.z - ag.z);
  opts.push({ s: .5 + t.patience * .2 + (k.wait ?? 0), it: off > 5 ? (d > r + 30 ? { k: 'move', x: rp.x, z: rp.z, speed: 44, face: tgt, why: 'close in' } : { k: 'strafe', x: rp.x, z: rp.z, face: tgt, speed: 16, why: 'circle' }) : { k: 'idle', face: tgt, why: 'wait' } });
  return opts;
}
// ---- a bow: keep out of reach (kite), keep a good range, loose when the shot is clear
export function rangedOptions(W, ag, tgt, k = {}) {
  const t = ag.temper, m = ag.mind, d = dist(ag, tgt), foes = enemies(W, ag), near = foes.filter(e => dist(e, ag) < (k.keep ?? 52)), opts = [];
  if (near.length) { const p = awayPoint(W, ag, near, 46); opts.push({ s: 1.25 + t.caution * .6 + (k.kite ?? 0), it: { k: 'move', x: p.x, z: p.z, speed: 50, why: 'kite' } }); }
  if (m.cd <= 0 && !ag.busy && d < (ag.range || 190) && !W.blocked(ag.x, ag.z, tgt.x, tgt.z)) opts.push({ s: .95 + t.aggro * .3 + (k.shoot ?? 0), it: { k: 'shoot', target: tgt, why: 'shoot' } });
  const want = k.range ?? 120;
  if (d > want + 50 || W.blocked(ag.x, ag.z, tgt.x, tgt.z)) { const p = inRoom(pt(tgt, headTo(tgt, ag), want)); opts.push({ s: .5, it: { k: 'move', x: p.x, z: p.z, speed: 40, face: tgt, why: 'find a shot' } }); }
  else if (d < want - 40) { const p = awayPoint(W, ag, [tgt], 30); opts.push({ s: .45 + t.caution * .3, it: { k: 'move', x: p.x, z: p.z, speed: 36, face: tgt, why: 'back off' } }); }
  opts.push({ s: .3, it: { k: 'idle', face: tgt, why: 'aim' } });
  return opts;
}
export function fleeOption(W, ag) { const foes = enemies(W, ag).filter(e => dist(e, ag) < 160); if (!foes.length) return { s: 2.2, it: { k: 'idle', face: null, why: 'cower' } };
  const p = awayPoint(W, ag, foes, 60); return { s: 3, it: { k: 'move', x: p.x, z: p.z, speed: 52, why: 'flee' } }; }

// ---- an enemy's think: senses, aggro, morale, then the options for his kind
export function thinkFoe(W, ag, dt) {
  const m = ag.mind, t = ag.temper;
  if (perceive(W, ag, dt) === 'engaged') shout(W, ag);
  decayThreat(ag, dt);
  // closeness keeps adding threat: whoever stands in his face is whom he fights
  for (const e of enemies(W, ag)) { const d = dist(e, ag); if (d < 40 && m.seen.has(e.id)) addThreat(ag, e, dt * (40 - d) / 10 * (e.tank ? 1.6 : 1)); }
  const broke = moraleStep(W, ag, dt); if (broke && m.mode !== 'break') W.log(`break:${ag.name}`);
  if (broke) { m.mode = 'break'; m.target = null; dropToken(W, ag); return fleeOption(W, ag); }
  if (m.mode === 'break') m.mode = m.alert >= 1 ? 'engaged' : 'suspicious';
  if (m.mode === 'engaged') { const nt = pickTarget(W, ag); if (nt !== m.target) { if (m.target && nt) W.log(`retarget:${ag.name}>${nt.name}`); m.target = nt; } } else m.target = null;
  const tgt = m.target, opts = [];
  if (m.mode === 'calm') { const p = ag.patrol ? ag.patrol[ag.mind.leg = (ag.mind.leg ?? 0)] : null;
    if (p && Math.hypot(p[0] - ag.x, p[1] - ag.z) < 6) ag.mind.leg = (ag.mind.leg + 1) % ag.patrol.length;
    opts.push(p ? { s: .2, it: { k: 'move', x: p[0], z: p[1], speed: 16, why: 'patrol' } } : { s: .2, it: { k: 'idle', facePt: ag.post || null, why: 'post' } }); }
  else if (m.mode === 'suspicious' || !tgt) { const l = m.last; if (l) { const far = Math.hypot(l.x - ag.x, l.z - ag.z) > 24, look = W.t - m.lastSeenT < 1.2 && m.mode === 'suspicious';
      opts.push(look || !far ? { s: .4, it: { k: 'idle', facePt: [l.x, l.z], why: m.mode === 'suspicious' ? '?' : 'search' } } : { s: .4, it: { k: 'move', x: l.x, z: l.z, speed: m.mode === 'engaged' ? 36 : 20, why: m.mode === 'suspicious' ? 'investigate' : 'search' } });
      if (!far && m.mode === 'engaged' && W.t - m.lastSeenT > 3) m.alert = Math.min(m.alert, .9); } else opts.push({ s: .2, it: { k: 'idle', why: 'look' } }); }
  else opts.push(...(ag.ranged ? rangedOptions(W, ag, tgt) : meleeOptions(W, ag, tgt)));
  return choose(W, ag, opts);
}

// ---- one think for a side's men, staggered by their wit; the body reads ag.intent every step
export function thinkSide(W, team, think) {
  rings(W, team);
  for (const ag of W.agents) { if (ag.team !== team || !ag.alive || ag.downed || !ag.mind || ag.hero) continue; const m = ag.mind;
    m.cd -= W.dt; if (guardReact(W, ag)) continue;
    if (W.t < m.next) continue; const dt = W.t - (m.thought ?? W.t - .2); m.thought = W.t; m.next = W.t + reaction(ag.temper.wit) * (.8 + .4 * W.rng());
    if (ag.busy) continue;
    const c = think(W, ag, dt); if (!c) continue;
    if (c.it.k !== 'attack') dropToken(W, ag); else if (ag.team === 1) takeToken(W, ag, c.it.target);
    ag.intent = c.it; m.why = c.it.why || c.it.k; }
}
export { friends };
