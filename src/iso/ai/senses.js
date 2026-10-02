// ---- Senses and the aggro table: what an NPC knows (docs/enemy-behavior.md §3, built for the iso slice; docs/squad-ai.md).
// Engine side: plain agents and numbers, no drawing. An agent is any object with { id, team, x, z, h, alive, downed, hp,
// maxHp, kind, mind } in world units (heading h = atan2(dx, dz)); the world gives { t, agents, blocked(ax, az, bx, bz),
// noises: [{ x, z, r, team, kind, at, src }] }.
//
// SIGHT: a cone from his facing (half-angle SENSE.half), out to SENSE.sight × his wit, blocked by walls and posts;
//   inside it the ALERT meter fills, faster when close or when the other is loud (running, cutting). Right beside him
//   he feels you whatever the cone. Engaged, he tracks anyone in line of sight all round.
// HEARING: noises (a run's steps, a blow landing, a shout) reach him inside their radius, through walls.
// ALERT 0..1.6: calm < .3 ≤ suspicious < 1 ≤ engaged. It drains while he sees nothing; an engaged man who has lost
//   everyone searches the last place he saw them, then calms. A shout lifts everyone near to engaged and tells them where.
// THREAT: who he wants to fight: damage done to him or his side, a taunt, being close. It decays; target choice adds
//   proximity and, the sharper he is, the weak and the archers; a taunt fools a dull man more.
export const SENSE = { sight: 150, half: 1.0, feel: 20, fill: 1.5, drain: .14, susp: .3, engaged: 1, max: 1.6, forget: 6 };
export const dist = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
export const headTo = (a, b) => Math.atan2(b.x - a.x, b.z - a.z);
export const wrapA = a => { while (a > Math.PI) a -= Math.PI * 2; while (a < -Math.PI) a += Math.PI * 2; return a; };
export const enemies = (W, ag) => W.agents.filter(o => o.team !== ag.team && o.alive && !o.downed);
export const friends = (W, ag) => W.agents.filter(o => o !== ag && o.team === ag.team && o.alive);

export function initMind(ag) {
  ag.mind = { alert: 0, mode: 'calm', seen: new Map(), threat: new Map(), target: null, intent: null, next: 0, cd: 0, morale: 1, ringA: null,
    lastSeenT: -99, last: null, why: '', since: 0, tauntT: -99, parryT: -99, shout: -99, home: [ag.x, ag.z] };
  return ag.mind;
}

// can ag see o now (and how well: 0..1)
export function sees(W, ag, o) {
  const d = dist(ag, o); if (d < SENSE.feel) return 1;
  const range = SENSE.sight * (.75 + .5 * ag.temper.wit); if (d > range) return 0;
  const m = ag.mind, engaged = m.mode === 'engaged';
  if (!engaged && Math.abs(wrapA(headTo(ag, o) - ag.h)) > SENSE.half) return 0;
  if (W.blocked(ag.x, ag.z, o.x, o.z)) return 0;
  return 1 - .6 * d / range;
}

// one look round (called at each think, dt = time since the last)
export function perceive(W, ag, dt) {
  const m = ag.mind; let any = false;
  for (const o of enemies(W, ag)) { const s = sees(W, ag, o); if (!s) continue; any = true;
    const k = s * (o.loud ? 1.6 : 1) * (.7 + .6 * ag.temper.wit) * (m.mode === 'calm' && o.sneaking ? .4 : 1);
    m.alert = Math.min(SENSE.max, m.alert + dt * SENSE.fill * k); m.seen.set(o.id, { x: o.x, z: o.z, t: W.t, a: o }); m.lastSeenT = W.t; m.last = { x: o.x, z: o.z }; }
  for (const n of W.noises) { if (n.team === ag.team && n.kind !== 'shout') continue; if (n.at < W.t - .5) continue;
    const d = Math.hypot(n.x - ag.x, n.z - ag.z); if (d > n.r) continue;
    if (n.kind === 'shout' && n.team === ag.team && n.src !== ag) { m.alert = Math.max(m.alert, SENSE.engaged + .05); if (n.last) m.last = { ...n.last }; m.lastSeenT = Math.max(m.lastSeenT, W.t - 2); }
    else if (n.team !== ag.team) { m.alert = Math.min(SENSE.max, Math.max(m.alert, n.kind === 'hit' ? .95 : .45) + .05); m.last = { x: n.x, z: n.z }; } }
  if (!any) m.alert = Math.max(0, m.alert - dt * SENSE.drain * (m.mode === 'engaged' ? .5 : 1));
  for (const [id, s] of m.seen) if (W.t - s.t > SENSE.forget || !s.a.alive || s.a.downed) m.seen.delete(id);
  const was = m.mode;
  m.mode = m.alert >= SENSE.engaged ? 'engaged' : m.alert >= SENSE.susp ? 'suspicious' : 'calm';
  if (was === 'engaged' && m.mode !== 'engaged' && m.seen.size) m.mode = 'engaged';   // still knows where someone is
  if (m.mode === 'engaged' && was !== 'engaged') { m.since = W.t; return 'engaged'; }
  return null;
}

// ---- the aggro table ----
export function addThreat(ag, src, n) { if (!ag.mind || !src) return; const m = ag.mind; m.threat.set(src.id, (m.threat.get(src.id) || 0) + n); }
export function decayThreat(ag, dt) { for (const [id, v] of ag.mind.threat) { const nv = v * Math.exp(-dt * .12); if (nv < .2) ag.mind.threat.delete(id); else ag.mind.threat.set(id, nv); } }
// whom ag fights: the most threat among those he knows of, plus closeness; the sharper he is, the more he goes for the
// hurt, the archers and the leaders (and the less a taunt sticks). Keeps his target unless another is clearly better.
export function pickTarget(W, ag, filter) {
  const m = ag.mind, w = ag.temper.wit; let best = null, bs = -1e9, cur = -1e9;
  for (const o of enemies(W, ag)) { if (filter && !filter(o)) continue;
    const known = m.seen.get(o.id) || (ag.team === 0 && W.knows(o)); if (!known) continue;
    const d = dist(ag, o), th = (m.threat.get(o.id) || 0) * (1 - .45 * w * (o.taunting ? 1 : 0));
    const s = th + 70 / (d + 25) * (1.5 - .5 * w) + w * (8 * (1 - o.hp / o.maxHp) + (o.ranged ? 5 : 0) + (o.value || 1) * 1.5) - (o.hero ? 0 : 0);
    if (o === m.target) cur = s; if (s > bs) { bs = s; best = o; } }
  if (m.target && best !== m.target && cur > -1e9 && bs < cur * 1.2 + 1.5) return m.target;
  return best;
}
