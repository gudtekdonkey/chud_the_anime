// ---- The room a game is played in, as data the engine reads: its bounds (ROOM, and the camera's in ROOM.cam), the
// solids nothing walks through (SOLID: x0, x1, z0, z1, world units) and the raised floors (RAISED: the same plus y).
// The game fills them (chud_the_anime: iso/world/room.js, the night courtyard); characters, shots, paths and the
// AI's world read them through collide and groundAt.
export const ROOM = { x0: 0, x1: 0, z0: 0, z1: 0, cam: null };
export const SOLID = [];
export const RAISED = [];
export const groundAt = (x, z) => { for (const r of RAISED) if (x > r.x0 && x < r.x1 && z > r.z0 && z < r.z1) return r.y; return 0; };

// keep a circle of radius r out of the solids and inside the room
export function collide(p, r) {
  p.x = Math.max(ROOM.x0 + r, Math.min(ROOM.x1 - r, p.x)); p.z = Math.max(ROOM.z0 + r, Math.min(ROOM.z1 - r, p.z));
  for (const b of SOLID) { const cx = Math.max(b.x0, Math.min(b.x1, p.x)), cz = Math.max(b.z0, Math.min(b.z1, p.z)), dx = p.x - cx, dz = p.z - cz, d = Math.hypot(dx, dz);
    if (d < r) { if (d > 1e-4) { p.x = cx + dx / d * r; p.z = cz + dz / d * r; } else { const l = p.x - b.x0, rr = b.x1 - p.x, t = p.z - b.z0, bo = b.z1 - p.z, m = Math.min(l, rr, t, bo);
      if (m === l) p.x = b.x0 - r; else if (m === rr) p.x = b.x1 + r; else if (m === t) p.z = b.z0 - r; else p.z = b.z1 + r; } } }
}
