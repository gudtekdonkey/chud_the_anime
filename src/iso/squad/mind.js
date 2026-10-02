// ---- A companion's think (docs/squad-ai.md): the same utility brain as the enemies (ai/brain.js), with his ROLE, his
// LIBERTY (the leash round his anchor), the squad's ORDER, FORMATION and TACTIC as more considerations. Personality
// (temper) weights how willingly he does it: a bold striker swings sooner, a cautious one steps back when hurt, a patient
// assassin waits for the moment. Engine side: agents and numbers only.
import { dist, headTo, wrapA, enemies, sees } from '../ai/senses.js';
import { choose, meleeOptions, rangedOptions, awayPoint, pt, inRoom } from '../ai/brain.js';
import { LIBERTY } from './orders.js';
import { weakest } from './squad.js';

const near = (W, ag, list) => list.reduce((b, e) => !b || dist(e, ag) < dist(b, ag) ? e : b, null);
const logOnce = (W, ag, key, s) => { if (ag.mind.logged !== key) { ag.mind.logged = key; W.log(s); } };
const leashOf = ag => ag.order.k === 'charge' ? 1e4 : ag.order.k === 'attack' ? Math.max(160, LIBERTY[ag.liberty].leash) : LIBERTY[ag.liberty].leash;

// the target the tactic names, among the foes his leash lets him reach
function tacticTarget(W, ag, pool) {
  if (!pool.length) return null;
  if (ag.order.k === 'attack' && ag.order.target.alive) return ag.order.target;
  if (ag.tactic === 'focus' && W.focus && W.focus.alive && pool.includes(W.focus)) return W.focus;
  if (ag.tactic === 'spread') { let best = null, bs = 1e9; for (const e of pool) { const s = dist(e, ag) + W.onTarget(e, ag) * 70; if (s < bs) { bs = s; best = e; } } return best; }
  if (ag.tactic === 'weakest') { const w = weakest(W); if (w) return near(W, w, pool.filter(e => dist(e, w) < 90)) || near(W, ag, pool); }
  // focus with no target of his yet: whoever is on the party, the nearest of them
  return near(W, ag, pool.filter(e => e.mind && e.mind.target && e.mind.target.team === 0)) || near(W, ag, pool);
}

export function thinkAlly(W, ag, dt) {
  const t = ag.temper, m = ag.mind, o = ag.order, hero = W.hero, an = ag.anchor || { x: hero.x, z: hero.z };
  if (ag.aggression != null) t.aggro = ag.aggression;
  if (o.k === 'attack' && !o.target.alive) ag.order = o.prev || { k: 'follow' };
  const slot = ag.slot || an, toSlot = Math.hypot(slot.x - ag.x, slot.z - ag.z), leash = leashOf(ag);
  if (o.k === 'goto' && (toSlot < 5 || Math.hypot(o.x - ag.x, o.z - ag.z) < 10)) ag.order = { ...o, k: 'hold' };   // arrived: hold there
  const charge = ag.role === 'protector' ? W.agents.find(a => a.id === (ag.charge ?? hero.id) && a.alive) || hero : null;
  const home = charge || an, opts = [];
  // ---- the formation (or his charge's side): always an option; the order decides how much it matters
  const fs = o.k === 'regroup' ? 3 : o.k === 'goto' ? 2.6 : o.k === 'fallback' ? 2.4 : .35;
  const face = near(W, ag, enemies(W, ag).filter(e => W.knows(e) && dist(e, ag) < 160));
  if (!charge || o.k === 'regroup' || o.k === 'fallback' || o.k === 'goto') opts.push({ s: fs, it: toSlot > 4 ? { k: 'move', x: slot.x, z: slot.z, speed: toSlot > 40 ? 62 : toSlot > 12 ? 52 : 30, face, why: o.k === 'regroup' ? 'regroup' : o.k === 'fallback' ? 'fall back' : 'formation' } : { k: 'idle', face, facePt: face ? null : [ag.x + Math.sin(an.h ?? hero.h) * 30, ag.z + Math.cos(an.h ?? hero.h) * 30], why: 'in formation' } });
  if (o.k === 'regroup' && toSlot < 8) { m.regrouped = (m.regrouped || 0) + dt; if (m.regrouped > .6) ag.order = { k: 'follow' }; }
  // ---- the leash: too far from his anchor, he comes back (the farther, the more he wants to)
  const out = Math.hypot(home.x - ag.x, home.z - ag.z) - leash;
  if (out > 12) opts.push({ s: 1.4 + out / 80, it: { k: 'move', x: charge ? charge.x : slot.x, z: charge ? charge.z : slot.z, speed: 60, why: 'leash' } });
  // ---- a cautious man, badly hurt, steps back behind the line
  if (ag.hp / ag.maxHp < .2 + t.caution * .3) { const foes = enemies(W, ag).filter(e => dist(e, ag) < 60); if (foes.length) { const p = awayPoint(W, ag, foes, 44); opts.push({ s: 1.2 + t.caution, it: { k: 'move', x: p.x, z: p.z, speed: 55, why: 'hurt: back off' } }); } }
  // ---- the support's job first: lift the downed
  if (ag.role === 'support') { const d = near(W, ag, W.agents.filter(a => a.team === 0 && a.downed && a.alive && Math.hypot(a.x - home.x, a.z - home.z) < leash * 1.6 + 40));
    if (d) opts.push({ s: 2.4, it: { k: 'revive', target: d, why: 'lift ' + d.name } }); }
  // ---- what the order allows him to fight
  const ambush = ag.tactic === 'ambush' && !W.sprung, passive = o.k === 'fallback' || o.k === 'regroup' || o.k === 'goto' || ambush;
  const reach = ag.ranged ? (ag.range || 160) * .8 : (ag.reach || 20) + 10;
  // they never start a fight on their own: a foe is fair game once he is fighting the party, once you have struck, or on Charge / Attack that
  const open = o.k === 'charge' || o.k === 'attack' || W.t - W.struckT < 8;
  const pool = enemies(W, ag).filter(e => W.knows(e) && (open || e.mind.mode === 'engaged') && Math.hypot(e.x - home.x, e.z - home.z) < leash + reach);
  if (passive) { if (ag.ranged && o.k === 'fallback' && pool.length) opts.push(...rangedOptions(W, ag, near(W, ag, pool), { shoot: -.3 })); return choose(W, ag, opts); }
  const k = o.k === 'charge' ? { attack: .3 } : {};
  // ---- the roles
  if (ag.role === 'protector') protectorOpts(W, ag, charge, pool, opts, k);
  else if (ag.role === 'assassin') assassinOpts(W, ag, pool, opts, k);
  else if (ag.role === 'tank') tankOpts(W, ag, pool, opts, k);
  else { const tgt = tacticTarget(W, ag, pool); m.target = tgt;
    if (tgt) { if (ag.ranged) opts.push(...rangedOptions(W, ag, tgt, { keep: ag.role === 'ranged' ? 58 : 20, kite: ag.role === 'ranged' ? 0 : -2, range: ag.role === 'ranged' ? 115 : 40 }));
      else opts.push(...meleeOptions(W, ag, tgt, { ...k, combo: ag.role === 'striker' ? 3 : 2, attack: (k.attack || 0) + (ag.role === 'striker' ? .15 : ag.role === 'support' ? -.2 : 0), maxOn: ag.tactic === 'spread' ? 2 : 4 })); } }
  m.mode = m.target ? 'engaged' : 'calm';
  return choose(W, ag, opts);
}

// TANK: stand between the party and the foes, taunt those on someone else, block a lot, swing now and then
function tankOpts(W, ag, pool, opts, k) {
  const m = ag.mind, hero = W.hero; if (!pool.length) return;
  const loose = pool.filter(e => e.mind && e.mind.target && e.mind.target !== ag && dist(e, ag) < 85);
  if (loose.length && W.t - m.tauntT > 5 && !ag.busy) opts.push({ s: 1.5 + loose.length * .15, it: { k: 'taunt', why: 'taunt' } });
  const tgt = tacticTarget(W, ag, pool.filter(e => !e.ranged || dist(e, ag) < 60)) || near(W, ag, pool); m.target = tgt;
  if (!tgt) return;
  // the front: a step past the hero toward the foe nearest him
  const f = near(W, hero, pool), fp = pt(hero, headTo(hero, f), Math.min(26, dist(hero, f) * .5));
  if (Math.hypot(fp.x - ag.x, fp.z - ag.z) > 10 && dist(f, hero) < 90) opts.push({ s: .75, it: { k: 'move', x: fp.x, z: fp.z, speed: 55, face: f, why: 'hold the front' } });
  opts.push(...meleeOptions(W, ag, tgt, { ...k, combo: 1, attack: (k.attack || 0) - .1, ring: -5 }));
}

// PROTECTOR: by his charge; between the charge and the nearest threat (body-block); on whoever goes for the charge (intercept, peel)
function protectorOpts(W, ag, charge, pool, opts, k) {
  const m = ag.mind;
  const threats = enemies(W, ag).filter(e => W.knows(e) && (e.mind && e.mind.target === charge && dist(e, charge) < 110 || dist(e, charge) < 48));
  const side = pt(charge, (charge.h || 0) + Math.PI / 2 * (ag.n % 2 ? 1 : -1), 13);
  if (!threats.length) { opts.push({ s: .6, it: Math.hypot(side.x - ag.x, side.z - ag.z) > 6 ? { k: 'move', x: side.x, z: side.z, speed: 58, why: 'guard ' + charge.name } : { k: 'idle', facePt: [side.x + Math.sin(charge.h) * 30, side.z + Math.cos(charge.h) * 30], why: 'guard ' + charge.name } });
    m.target = null; return; }
  const th = threats.reduce((b, e) => dist(e, charge) < dist(b, charge) ? e : b); m.target = th;
  // between them: a point on the line from the charge to the threat
  const bp = pt(charge, headTo(charge, th), Math.min(14, dist(charge, th) * .5));
  if (dist(th, charge) > 30 && Math.hypot(bp.x - ag.x, bp.z - ag.z) > 6) opts.push({ s: 1.1, it: { k: 'move', x: bp.x, z: bp.z, speed: 64, face: th, why: 'body-block' } });
  // the archer shooting at him: stand in the line (the arrow hits the protector)
  if (th.ranged && dist(th, charge) > 50) { opts.push({ s: 1.3, it: { k: 'move', x: bp.x, z: bp.z, speed: 64, face: th, why: 'body-block' } }); return; }
  logOnce(W, ag, 'i' + th.id, `intercept:${ag.name}>${th.name}`);
  opts.push(...meleeOptions(W, ag, th, { ...k, combo: 2, attack: (k.attack || 0) + .45, wait: -.2, why: 'intercept', maxOn: 4 }));
}

// ASSASSIN: the isolated high-value foe (a leader, an archer), from behind, while nobody else is looking: one killing blow.
// He keeps his prey unless a clearly better one turns up; he goes round the prey's sight cone (a flank point first) to
// come in from behind; while another foe could see him he waits out of sight. No isolated prey: he fights as a striker.
function assassinOpts(W, ag, pool, opts, k) {
  // he scouts the whole yard (500) for prey
  const m = ag.mind, all = enemies(W, ag), lone = e => !all.some(f => f !== e && dist(f, e) < 60);
  const score = e => (e.value || 1) / (1 + dist(e, ag) / 300);
  let prey = m.prey && m.prey.alive && lone(m.prey) ? m.prey : null;
  for (const e of all) { if (!lone(e) || (!W.knows(e) && dist(e, ag) > 500)) continue; if (!prey || score(e) > score(prey) * 1.5) prey = e; }
  m.prey = prey;
  // nothing to hunt: he stays near, as a striker
  if (!prey) { const home = ag.anchor || W.hero, tgt = tacticTarget(W, ag, pool.filter(e => Math.hypot(e.x - home.x, e.z - home.z) < LIBERTY.near.leash + 30)); m.target = tgt; if (tgt) opts.push(...meleeOptions(W, ag, tgt, { ...k, combo: 2 })); return; }
  m.target = prey; logOnce(W, ag, 'p' + prey.id, `prey:${ag.name}>${prey.name} (isolated)`);
  const watchers = all.filter(f => f !== prey && dist(f, ag) < 150 && sees(W, f, ag) > 0);
  const seen = prey.mind && prey.mind.mode === 'engaged' && prey.mind.target === ag;
  const d = dist(ag, prey), back = inRoom(pt(prey, prey.h + Math.PI, 12)), inCone = Math.abs(wrapA(headTo(prey, ag) - prey.h)) < 1.3 && d < 190;
  // the way in: round any other foe near the line (he never crosses in front of the squad)
  const route = goal => { const dx = goal.x - ag.x, dz = goal.z - ag.z, L = Math.hypot(dx, dz) || 1;
    for (const f of all) { if (f === prey) continue; const u = Math.max(0, Math.min(1, ((f.x - ag.x) * dx + (f.z - ag.z) * dz) / (L * L))), cx = ag.x + dx * u, cz = ag.z + dz * u;
      if (Math.hypot(f.x - cx, f.z - cz) < 75 && u > 0 && u < 1) { const side = ((f.x - ag.x) * dz - (f.z - ag.z) * dx) > 0 ? -1 : 1; return inRoom({ x: f.x + dz / L * 100 * side, z: f.z - dx / L * 100 * side }); } }
    return goal; };
  if (d < 22 && m.cd <= 0) opts.push({ s: 2.2, it: { k: 'attack', target: prey, combo: seen ? 2 : 1, exec: !seen, sneak: seen ? 0 : 1, why: seen ? 'duel' : 'execute' } });
  else if (watchers.length && d > 40) { const p = awayPoint(W, ag, watchers, 50); opts.push({ s: 1.05, it: { k: 'move', x: p.x, z: p.z, speed: 50, sneak: 1, why: 'hide' } }); }
  else if (inCone && !seen && d > 26) {   // round the cone: the flank whose point the walls leave open (a man in a corner has one), wide of his sight
    const r = 130, fp = sd => pt(prey, prey.h + sd * 1.9, r), cut = q => { const c = inRoom(q); return Math.hypot(c.x - q.x, c.z - q.z); };
    const near = wrapA(headTo(prey, ag) - prey.h) > 0 ? 1 : -1, side = cut(fp(near)) > cut(fp(-near)) + 10 ? -near : near;
    // an arc, not a chord: a step of the way round on a circle wider than his sight
    const cur = headTo(prey, ag), step = Math.max(-.7, Math.min(.7, wrapA(prey.h + side * 1.9 - cur))), fl = route(inRoom(pt(prey, cur + step, Math.max(d, 150))));
    opts.push({ s: 1.1, it: { k: 'move', x: fl.x, z: fl.z, speed: 50, sneak: 1, why: 'flank' } }); }
  else { const g = route(back); opts.push({ s: 1.1, it: { k: 'move', x: g.x, z: g.z, speed: d > 60 ? 58 : 34, face: d < 40 ? prey : null, sneak: 1, why: g === back ? 'stalk' : 'go round' } }); }
  // pressed by someone else: defend himself
  const on = all.find(e => e !== prey && e.mind && e.mind.target === ag && dist(e, ag) < 26);
  if (on) opts.push(...meleeOptions(W, ag, on, { ...k, combo: 2, attack: .5, why: 'defend' }));
}
