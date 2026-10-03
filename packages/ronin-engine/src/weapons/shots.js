// ---- Shots: one module for everything that flies (owner 2026-10-03, pick 5A: "a gun is a weapon with a ranged
// attack"): an archer's arrow, a shinobi's shuriken, a squad's arrows, a gun's bullet. A shot is plain data in a list the
// game owns; the game steps it with its own walls, targets and what a hit does, so each keeps its own numbers.
//   fire(list, o)   o: { x, y, z, h (heading), v (speed), life (s), r (hit radius), test, ...the game's own fields }
//                   adds vx, vz (the speed along the heading) and age (its clock), and returns the shot
//   test 'point'    moved, then a target within r of where it now is (chud's archer: r 9 rig px)
//        'swept'    the first target within r of the line it covers this step, then moved (chud's squad arrows:
//                   r 4.5 world units); fast shots (bullets) never skip through a body
//   stepShots(list, dt, { solid(x, z), targets(s) → bodies with x, z, hit(s, body) → true if spent, expire(s) })
//                   a shot whose age passes its life or that enters a solid expires; a spent or expired shot (or one a
//                   game marks `dead`, e.g. cut out of the air) leaves the list at the end of the step
export function fire(list, o) {
  const s = { age: 0, test: 'point', ...o }; s.vx = Math.sin(s.h) * s.v; s.vz = Math.cos(s.h) * s.v;
  list.push(s); return s;
}
export function stepShots(list, dt, { solid = () => false, targets = () => [], hit = () => true, expire = () => {} } = {}) {
  for (const s of list) { if (s.dead) continue; s.age += dt;
    if (s.test === 'swept') {
      const sx = s.vx * dt, sz = s.vz * dt;
      for (const o of targets(s)) { const t = ((o.x - s.x) * sx + (o.z - s.z) * sz) / (sx * sx + sz * sz); if (t < 0 || t > 1) continue;
        if (Math.hypot(s.x + sx * t - o.x, s.z + sz * t - o.z) < s.r) { if (hit(s, o)) s.dead = 1; break; } }
      s.x += sx; s.z += sz; if (s.age > s.life || solid(s.x, s.z)) { if (!s.dead) expire(s); s.dead = 1; }
      continue; }
    s.x += s.vx * dt; s.z += s.vz * dt;
    if (s.age > s.life || solid(s.x, s.z)) { s.dead = 1; expire(s); continue; }
    for (const o of targets(s)) if (Math.hypot(o.x - s.x, o.z - s.z) < s.r) { if (hit(s, o)) { s.dead = 1; break; } }
  }
  for (let i = list.length - 1; i >= 0; i--) if (list[i].dead) list.splice(i, 1);
}
