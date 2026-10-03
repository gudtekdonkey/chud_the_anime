// ---- A ranged weapon's shot (owner pick 5A): on a move's 'fire' event the game calls fireFrom(char, list); the shot
// leaves the muzzle (the held item's tip, Char.bladeWorld) along his heading, spread by the row's `spread`, and flies on
// the engine's shots (weapons/shots.js) in world units. A magazine: `rounds` counts down from the row's `mag`; empty, it
// returns null and the game plays the row's `reload` clip, then calls reload(char).
import { fire } from '../../weapons/shots.js';
import { rnd } from '../../flow/flow.js';

export function fireFrom(c, list, o = {}) {
  const f = c.wpn && c.wpn.fire; if (!f) return null;
  if (f.mag) { if (c.rounds == null) c.rounds = f.mag; if (c.rounds <= 0) return null; c.rounds--; }
  const m = c.bladeWorld ? c.bladeWorld() : null, h = c.a.h + (f.spread ? (rnd() * 2 - 1) * f.spread : 0);
  return fire(list, { k: f.shot, from: c, team: c.team, x: m ? m.tip[0] : c.x, y: m ? m.tip[1] : 15, z: m ? m.tip[2] : c.z,
    h, v: f.speed, life: f.life, r: f.radius, test: f.test || 'swept', dmg: f.dmg ?? 1, ...o });
}
export const reload = c => { const f = c.wpn && c.wpn.fire; if (f && f.mag) c.rounds = f.mag; };
