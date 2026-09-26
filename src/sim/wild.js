import { zoneAt } from './ledger.js';

// ---- How far into the wild a zone lies (owner, 2026-09-26) ----
// People keep to the settled lands. Past their edge the bandits live; far out, in the voids, the mystical creatures.
//   settled (depth 0..EDGE-1): a town, village, fort, shrine or camp, and the land round it
//   edge    (EDGE..VOID-1, or within NEAR of a void): the bandits' country, the edge of the inhabited lands
//   void    (VOID and deeper):  where nobody lives, and the creatures do
// depth = zones (king's moves) to the nearest inhabited zone, counted out to MAX. A road is travelled ground: on a road the depth counts half.
export const WILD = { EDGE: 3, VOID: 5, NEAR: 2, MAX: 10 };   // NEAR: zones round a void that are its edge too
const LIVED = new Set(['town', 'village', 'fort', 'shrine', 'camp']);

export function wildDepth(L, x, y) {
  const here = zoneAt(L, x, y); if (!here || here.kind === 'sea') return 0;
  let d = WILD.MAX;
  for (let R = 0; R < WILD.MAX; R++) {
    let hit = false;
    for (let yy = y - R; yy <= y + R && !hit; yy++) for (let xx = x - R; xx <= x + R; xx++) {
      if (Math.max(Math.abs(xx - x), Math.abs(yy - y)) !== R) continue;
      const z = zoneAt(L, xx, yy); if (z && LIVED.has(z.kind)) { hit = true; break; } }
    if (hit) { d = R; break; } }
  return here.road ? Math.floor(d / 2) : d;
}
// the ring a zone is in: a carved void (worldgen) is always 'void'; elsewhere by depth
export function wildRing(L, x, y, d = wildDepth(L, x, y)) {
  const z = zoneAt(L, x, y); if (!z || z.kind === 'sea') return 'settled';
  if (z.void && !z.road || d >= WILD.VOID) return 'void';
  if (d >= WILD.EDGE) return 'edge';
  for (let yy = y - WILD.NEAR; yy <= y + WILD.NEAR; yy++) for (let xx = x - WILD.NEAR; xx <= x + WILD.NEAR; xx++) if (zoneAt(L, xx, yy)?.void) return 'edge';
  return 'settled';
}
