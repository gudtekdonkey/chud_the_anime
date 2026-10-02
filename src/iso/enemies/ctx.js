// ---- What the enemies share (docs/enemies.md): the hero they fight, the living list, the attack tokens, the shots in
// the air and the smoke. One object, imported, never copied, so the enemy, the combat rules, the squad and any
// decision layer (the placeholder brain here, the squad-AI branch's later) read the same state.
import { W } from '../play/sim.js';

export const CTX = { on: false, hero: null, enemies: [], shots: [], puffs: [], heroHp: 12, heroMax: 12, downs: 0, onDeath: null };

// ---- ATTACK TOKENS (docs/enemy-behavior.md §4): only so many may be attacking at once, so a crowd takes turns. A melee
// enemy holds one from the moment it commits (engage) to the end of its recovery; the heavy costs two (an elite); the
// ranged pool is separate (one shooter at a time); a boss ignores them. A token is given back 0.3 s apart, so two never
// swing on the same frame; one held 3 s without an attack starting is taken back.
export const TOKENS = {
  cap: { melee: 2, ranged: 1 }, held: new Map(), gap: {}, peak: { melee: 0, ranged: 0 },
  cost: e => Math.min(e.T.cost ?? 1, 2),
  used(pool) { let n = 0; for (const v of this.held.values()) if (v.pool === pool) n += v.cost; return n; },
  has: function (e) { return this.held.has(e); },
  can(e, pool) { if (e.T.boss || this.held.has(e)) return true; return this.used(pool) + this.cost(e) <= this.cap[pool] && W.t >= (this.gap[pool] || 0); },
  take(e, pool) { if (e.T.boss) return true; if (this.held.has(e)) return true; if (!this.can(e, pool)) return false;
    this.held.set(e, { pool, cost: this.cost(e), since: W.t, used: false }); this.peak[pool] = Math.max(this.peak[pool], this.used(pool)); return true; },
  release(e) { const v = this.held.get(e); if (!v) return; this.held.delete(e); this.gap[v.pool] = W.t + .3; },
  // a lease nobody used: back to the pool
  step() { for (const [e, v] of this.held) if ((!v.used && W.t - v.since > 3) || e.dead || e.gone) { this.release(e); e.readyAt = Math.max(e.readyAt, W.t + .6); } },
  clear() { this.held.clear(); this.gap = {}; this.peak = { melee: 0, ranged: 0 }; },
};
