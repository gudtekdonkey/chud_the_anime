// ---- The director: how a side fights as a group (docs/enemy-behavior.md §4, docs/squad-ai.md). Engine side, no drawing.
// ATTACK TOKENS: they take turns. At most TOKENS.onOne melee attackers swing at one man at once and TOKENS.side in all;
//   a token is held from the wind-up to the end of the swing, then the swinger waits his own cooldown. A very aggressive
//   man steals a turn now and then (never twice running). Leaders ignore the cap on the side, never the one on a man.
// RINGS: the men waiting on one target spread round him at even angles (no dog-pile, no two on one spot), each drifting
//   along his ring as his patience lets him; the ring's radius is his reach plus his caution.
// MORALE: each man 0..1. A wound costs its share, a friend's death near him costs more, the leader's death most of all;
//   standing unhurt with friends near brings it back. Under his break point (his caution and boldness) he runs; with
//   the leader alive a disciplined man holds on longer.
// SHOUTS: a man who turns engaged calls those near him (a noise of kind 'shout' with where he saw you).
import { dist, headTo, wrapA, friends } from './senses.js';

export const TOKENS = { onOne: 2, side: 3, steal: .12 };
export const MORALE = { wound: .55, friend: .12, leader: .35, regen: .025, near: 120 };

// may ag start a swing at tgt now?
export function mayAttack(W, ag, tgt) {
  const T = W.tokens, onTgt = [...T.values()].filter(v => v.t === tgt.id).length, all = T.size;
  if (T.has(ag.id)) return true;
  if (onTgt < TOKENS.onOne && (all < TOKENS.side || ag.leader)) return true;
  // the aggressive steal a turn (but never on a man already pressed by two)
  if (ag.temper.aggro > .7 && onTgt < TOKENS.onOne + 1 && !ag.mind.stole && W.rng() < TOKENS.steal * (ag.temper.aggro - .5) * 4) { ag.mind.stole = true; return true; }
  return false;
}
export const takeToken = (W, ag, tgt) => { W.tokens.set(ag.id, { t: tgt.id, at: W.t }); };
export const dropToken = (W, ag) => { if (W.tokens.delete(ag.id)) ag.mind.stole = false; };

// once a think: spread the waiting men round their targets
export function rings(W, team) {
  const by = new Map();
  for (const a of W.agents) if (a.team === team && a.alive && !a.downed && a.mind && a.mind.target && !a.ranged) {
    const t = a.mind.target; if (!by.has(t)) by.set(t, []); by.get(t).push(a); }
  for (const [t, list] of by) {
    list.sort((p, q) => wrapA(headTo(t, p) - headTo(t, q)));
    const n = list.length, mean = Math.atan2(list.reduce((s, a) => s + Math.sin(headTo(t, a)), 0), list.reduce((s, a) => s + Math.cos(headTo(t, a)), 0));
    const gap = Math.min(Math.PI * 2 / n, 1.25);
    list.forEach((a, i) => { const want = mean + (i - (n - 1) / 2) * gap, m = a.mind; m.ringA = m.ringA == null ? want : m.ringA + wrapA(want - m.ringA) * .5; m.ringN = n; });
  }
}

// a wound: morale falls by the share of health lost (less for the bold)
export function wounded(ag, frac) { if (!ag.mind) return; ag.mind.morale -= frac * MORALE.wound * (1.2 - ag.temper.bold * .6); }
// a death: those near lose heart, more if he was their leader
export function died(W, dead) {
  for (const f of friends(W, dead)) { if (!f.mind) continue; const d = dist(f, dead);
    if (dead.leader) f.mind.morale -= MORALE.leader * (1.15 - f.temper.discipline * .5);
    else if (d < MORALE.near) f.mind.morale -= MORALE.friend * (1.2 - f.temper.bold * .6); }
}
// morale's slow return, and the break point (a cautious, timid man breaks early; with his leader standing, a disciplined one holds)
export function moraleStep(W, ag, dt) {
  const m = ag.mind, hurt = 1 - ag.hp / ag.maxHp; m.morale = Math.min(1 - hurt * .4, m.morale + dt * MORALE.regen * (1 + ag.temper.discipline));
  const lead = W.agents.find(o => o.team === ag.team && o.leader && o.alive && o !== ag);
  const brk = .12 + ag.temper.caution * .22 - ag.temper.bold * .12 - (lead ? ag.temper.discipline * .1 : 0);
  return m.morale < brk;
}
// a shout: everyone on his side within r hears where the enemy is
export function shout(W, ag, r = 110) { if (W.t - ag.mind.shout < 3) return; ag.mind.shout = W.t; W.noises.push({ x: ag.x, z: ag.z, r, team: ag.team, kind: 'shout', at: W.t, src: ag, last: ag.mind.last }); W.log(`shout:${ag.name}`); }
