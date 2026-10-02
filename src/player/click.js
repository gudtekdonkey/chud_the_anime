import { P } from '../state.js';
import { collide, PILLARS } from '../world/room.js';
import { living } from '../world/enemies.js';
import { FREE, chainOn } from './prompts.js';
import { speed } from './locomotion.js';

// ---- Click to move on PC (owner 2026-10-02: "Pc should also be able to move by clicking") ----
// A left click (or a held button, the goal following the cursor) on the floor runs him there through the ordinary locomotion:
// the same acceleration, facings and stride as a held key, because it only fills the step's input like a stick would. A straight
// line when nothing is in the way, else round the pillars by their corners (a shortest path over them). A click on a samurai runs
// him into reach and cuts (J). Any WASD / arrow (or the touch stick) drops the goal; during a combo chain a click does nothing
// (keys and swipes answer prompts, never a click). Right click is left unbound.
export const CLICK = { goal: null, e: null, path: [], mark: null, stuck: 0, repath: 0 };
const REACH = 26, LEVEL = 6, STAND = 16, ARRIVE = 2;
// a samurai under the cursor: his body, feet to topknot
const under = (x, y) => living().filter(e => !e.held && Math.abs(x - e.x) <= 9 && y >= e.y - 30 && y <= e.y + 4)
  .sort((a, b) => Math.abs(a.x - x) - Math.abs(b.x - x))[0] || null;
export function clickAt(x, y, drag = false) {
  if (chainOn()) return;
  const e = !drag && under(x, y);
  if (drag && CLICK.e) return;   // a held button over a samurai keeps him as the goal
  CLICK.e = e || null; CLICK.stuck = 0; CLICK.repath = 0;
  const [gx, gy] = e ? standOf(e) : collide(x, y);
  CLICK.goal = [gx, gy]; CLICK.path = route([P.x, P.y], CLICK.goal); CLICK.mark = { x: gx, y: gy, t: 0, e: !!e };
}
export const dropClick = () => { CLICK.goal = null; CLICK.e = null; CLICK.path = []; if (CLICK.mark && !CLICK.mark.gone) Object.assign(CLICK.mark, { gone: true, t: 0 }); };
// where he stands to cut a samurai: level with him, on the side he comes from
function standOf(e) { const side = Math.sign(P.x - e.x) || -1; return collide(e.x + side * STAND, e.y); }

// ---- the path: straight if clear, else through the pillars' corners (each pillar grown by his body, as world/room.js collides) ----
const box = p => [p.x - 6, p.y - 3, p.x + p.w + 6, p.y + p.h + 3];
function blocked(a, b) {
  for (const p of PILLARS) { const [x0, y0, x1, y1] = box(p); let t0 = 0, t1 = 1; const dx = b[0] - a[0], dy = b[1] - a[1];
    // Liang-Barsky: does the segment pass through the box?
    const cut = [[-dx, a[0] - x0], [dx, x1 - a[0]], [-dy, a[1] - y0], [dy, y1 - a[1]]].every(([q, r]) => {
      if (!q) return r >= 0; const t = r / q; if (q < 0) { if (t > t1) return false; t0 = Math.max(t0, t); } else { if (t < t0) return false; t1 = Math.min(t1, t); } return true; });
    if (cut && t1 - t0 > 1e-3) return true; }
  return false;
}
function route(a, b) {
  if (!blocked(a, b)) return [b];
  const nodes = [a, ...PILLARS.flatMap(p => { const [x0, y0, x1, y1] = box(p); return [[x0 - 2, y0 - 2], [x1 + 2, y0 - 2], [x0 - 2, y1 + 2], [x1 + 2, y1 + 2]]; })
    .map(([x, y]) => collide(x, y)), b];
  const n = nodes.length, dist = Array(n).fill(Infinity), prev = Array(n).fill(-1), done = Array(n).fill(false); dist[0] = 0;
  for (;;) { let u = -1; for (let i = 0; i < n; i++) if (!done[i] && (u < 0 || dist[i] < dist[u])) u = i;
    if (u < 0 || dist[u] === Infinity || u === n - 1) break; done[u] = true;
    for (let v = 0; v < n; v++) if (!done[v] && !blocked(nodes[u], nodes[v])) { const d = dist[u] + Math.hypot(nodes[v][0] - nodes[u][0], nodes[v][1] - nodes[u][1]);
      if (d < dist[v]) { dist[v] = d; prev[v] = u; } } }
  if (prev[n - 1] < 0) return [b];   // no way round: straight on, and the walls clamp it
  const out = []; for (let v = n - 1; v > 0; v = prev[v]) out.unshift(nodes[v]); return out;
}

// ---- before each step (player/update.js): steer toward the next corner, like a stick; J once a clicked samurai is in reach ----
export function clickIn(inp, dt) {
  if (CLICK.mark) { CLICK.mark.t += dt; if (CLICK.mark.gone && CLICK.mark.t > 9) CLICK.mark = null; }
  if (!CLICK.goal) return;
  if (inp.mx || inp.my) { dropClick(); return; }   // a key (or the stick) takes over at once
  if (!FREE.test(P.state) || chainOn()) return;   // busy: the goal waits until he is on his feet again
  const e = CLICK.e;
  if (e) {
    if (!e.alive) { dropClick(); return; }
    if (Math.abs(e.x - P.x) <= REACH && Math.abs(e.y - P.y) <= LEVEL) { P.face = Math.sign(e.x - P.x) || P.face; inp.slash = true; dropClick(); return; }
    const g = standOf(e); if ((CLICK.repath -= dt) <= 0 || Math.hypot(g[0] - CLICK.goal[0], g[1] - CLICK.goal[1]) > 4) {   // he moves: follow him
      CLICK.goal = g; CLICK.path = route([P.x, P.y], g); CLICK.repath = .25; if (CLICK.mark) Object.assign(CLICK.mark, { x: g[0], y: g[1] }); }
  }
  // the next corner; the last one is the goal. Stop giving input just short of it: he slows to a stop over it (player/locomotion.js)
  while (CLICK.path.length > 1 && Math.hypot(CLICK.path[0][0] - P.x, CLICK.path[0][1] - P.y) < 4) CLICK.path.shift();
  const [wx, wy] = CLICK.path[0] || CLICK.goal, dx = wx - P.x, dy = wy - P.y, d = Math.hypot(dx, dy);
  if (CLICK.path.length <= 1 && d < Math.max(ARRIVE, speed() * .04)) { if (!e) dropClick(); return; }
  const vx = dx / d, vy = dy / d; inp.ax = vx; inp.ay = vy;
  inp.mx = Math.abs(vx) < .38 ? 0 : Math.sign(vx); inp.my = Math.abs(vy) < .38 ? 0 : Math.sign(vy);   // his facing: the nearest of the 8
  if (!inp.mx && !inp.my) inp.mx = Math.sign(vx) || 1;
  // stuck against something the path did not see: look again, then give up
  const x0 = CLICK.px, y0 = CLICK.py; CLICK.px = P.x; CLICK.py = P.y;
  if (x0 != null && Math.hypot(P.x - x0, P.y - y0) < .2 && speed() < 5) { if ((CLICK.stuck += dt) > .5) { CLICK.path = route([P.x, P.y], CLICK.goal); if (CLICK.stuck > 1.2) dropClick(); } }
  else CLICK.stuck = 0;
}
