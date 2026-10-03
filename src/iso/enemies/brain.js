// ---- THE PLACEHOLDER BRAIN: a small decision loop of our own, so this branch plays alone. It only calls the action
// interface (enemy.js can / do / moves / info) and the squad's context (the slot the group gives him round the hero,
// whether he is alone); the decision layer of the squad-AI branch replaces it whole (squad.brain = theirs) or per enemy
// (e.brain = theirs, or null to drive him from outside), and nothing else changes. Two calls:
//   think(e, ctx)          every ~0.15 s while he is alive: pick what he does next
//   threat(e, ctx, th)     the hero has just started a cut that could reach him: block, parry or hop clear?
import { rnd } from 'ronin-engine/flow/flow.js';
import { W } from 'ronin-engine/clock/world.js';
import { TOKENS } from './ctx.js';

const pick = ms => { let s = 0; for (const m of ms) s += m.weight; let r = rnd() * s; for (const m of ms) if ((r -= m.weight) <= 0) return m; return ms[0]; };

export const BRAIN = {
  think(e, ctx) {
    const h = ctx.hero, T = e.T, d = e.dist(h);
    if (e.st === 'hidden') { if (!e.lurk || d < (T.ambushAt ?? 150) || W.t - e.spawnedAt > 14) { if (e.do('ambush', h)) e.lurk = false; } return; }
    if (e.st === 'flee') { if (e.morale > .7) e.do('regroup', h); return; }
    if (e.st !== 'ready') return;
    // morale: hurt and shaken (or the last one standing), he runs; he comes back once he has his nerve again
    if (T.breakAt && e.morale < T.breakAt && (e.hp < e.maxHp * .7 || ctx.alone(e)) && e.do('flee', h)) return;
    if (T.vanish && e.hp < e.maxHp && d < 70 && rnd() < .25 && e.do('vanish', h)) return;
    // the archer keeps his distance: hops back when you close in, then walks back out to his ring
    if (T.role === 'ranged' && d < T.tooClose && rnd() < .6 && e.do('dodge', h, { dir: 'back' })) return;
    const can = e.moves().filter(m => e.can('attack', h, { move: m.name }));
    if (can.length && rnd() < T.aggro) { e.do('attack', h, { move: pick(can).name }); return; }
    // a melee one with a token free closes in to strike; the rest hold their place in the ring
    if (T.role === 'melee' && !TOKENS.has(e) && e.do('engage', h)) return;
    if (TOKENS.has(e)) return;
    const s = ctx.slotOf(e); if (s) e.do('move', h, { x: s.x, z: s.z });
  },
  threat(e, ctx, th) {
    const T = e.T, h = ctx.hero; if (e.st !== 'ready') return;   // mid-attack he is committed (the heavy armours through)
    if (T.parry && rnd() < T.parry.chance[e.phase] && e.do('parry', h)) return;
    if (T.guard && rnd() < T.guard.chance && e.do('block', h, { dur: .65 })) return;
    if (T.dodge && rnd() < T.dodge.chance) e.do('dodge', h, { dir: rnd() < .5 ? 'back' : rnd() < .5 ? 'left' : 'right' });
  },
};
