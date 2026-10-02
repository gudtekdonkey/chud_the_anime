// ---- What the slice's ports of today's game (party/, items/, hud/, input/, combo/) share: the hero, the samurai, every
// character drawn, the scene, the world. main.js fills it once (port.js initPort); nothing here is drawn or stepped.
// `busy` / `held`: a system that has taken the hero (an item's act, Harvest, a paired execution) or a samurai over
// (an execution holds him) says so here, and main.js skips their controllers that step.
export const CTX = { hero: null, foes: [], chars: [], scene: null, W: null, canvas: null, root: null, pipe: null,
  busy: null, held: new Set(), lookKind: '3d' };
// the samurai still standing
export const living = () => CTX.foes.filter(f => !f.dead);
export const nearestFoe = (x, z, max = 1e9, skip = null) => { let b = null, d0 = max; for (const f of living()) { const d = Math.hypot(f.x - x, f.z - z); if (f !== skip && d < d0) { d0 = d; b = f; } } return b; };
// a samurai with no other within `r` of him (the isolation rule today's markers draw)
export const lone = (f, r = 50) => !CTX.foes.some(o => o !== f && !o.dead && Math.hypot(o.x - f.x, o.z - f.z) < r);
