// ---- What the enemies draw on the effects layer (render px, over the 3D picture): the telegraph's red star over the
// head at the wind-up (orange when the blow cannot be blocked) and the white glint on the weapon just before it comes
// (the commit), the parry window's flicker, the archer's aim line (dotted while he tracks, solid once it locks), arrows
// and shuriken in flight, the shinobi's smoke, health bars over the hurt, the token pip over whoever has the turn, the
// Red Ronin's bar with its phases, and the hero's health.
import { W } from '../play/sim.js';
import { AF, EZ, hv } from '../anim/flow.js';
import { toScreen, VW, VH } from '../gfx/view.js';
import { RAMP as R } from '../gfx/palette.js';
import { CTX, TOKENS } from './ctx.js';

const BAY = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map(v => (v + .5) / 16), bay = (x, y) => BAY[(y & 3) * 4 + (x & 3)];
const P = (x, y, z) => toScreen(x * AF, y * AF, z * AF);              // rig px (the actors' units) to the screen
const WP = p => toScreen(p[0], p[1], p[2]);                           // world units
function line(g, a, b, col, dot = 0) { g.fillStyle = col; const n = Math.max(1, Math.ceil(Math.max(Math.abs(b[0] - a[0]), Math.abs(b[1] - a[1]))));
  for (let i = 0; i <= n; i++) { if (dot && (i % dot) > dot / 2) continue; g.fillRect((a[0] + (b[0] - a[0]) * i / n) | 0, (a[1] + (b[1] - a[1]) * i / n) | 0, 1, 1); } }
function star(g, x, y, r, col, core = '#ffffff') { x |= 0; y |= 0; g.fillStyle = col;
  g.fillRect(x - r, y, 2 * r + 1, 1); g.fillRect(x, y - r, 1, 2 * r + 1); if (r > 2) { g.fillRect(x - 1, y - 1, 3, 3); } g.fillStyle = core; g.fillRect(x, y, 1, 1); }

export function drawSquad(g, hero) {
  if (!CTX.hero) return; const t = W.t;
  // smoke under everything else
  for (const p of CTX.puffs) { if (p.age < 0) continue; const k = p.age / p.life, r = (p.r0 + (p.r1 - p.r0) * EZ.o(k)) * 2, c = P(p.x, p.y, p.z);
    for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) { if (x * x + y * y > r * r) continue; const px = (c[0] + x) | 0, py = (c[1] + y * .8) | 0;
      if (bay(px, py) < k * 1.1 + (x * x + y * y) / (r * r) * .5) continue; g.fillStyle = (x + y) < 0 ? '#6b7076' : '#474b51'; g.fillRect(px, py, 1, 1); } }
  for (const e of CTX.enemies) {
    if (e.dead || e.a.alpha < .3) continue; const a = e.a, s = e.T.model.scale || 1, head = P(a.x, 50 * s, a.z);
    // the archer's aim: from the bow along his heading, dotted while he still tracks, solid and bright once locked
    if (e.state === 'e_draw' && a.ct > .35 && a.ct < 1.15) { const f = hv(a.h), lock = a.ct > .95, d = Math.min(520, e.dist(hero) + 60);
      const p0 = P(a.x + f[0] * 12, 28, a.z + f[1] * 12), p1 = P(a.x + f[0] * d, 18, a.z + f[1] * d);
      line(g, p0, p1, lock ? '#ff5a4a' : '#9a3a2c', lock ? 0 : 4); if (lock && Math.floor(t * 30) % 2) line(g, [p0[0], p0[1] - 1], [p1[0], p1[1] - 1], '#ffd0c8'); }
    // the telegraph: a star over the head at the wind-up, red (or orange: cannot be blocked)
    const tk = t - (e.teleAt ?? -9); if (tk < .32) { const r = Math.round(2 + 4 * EZ.o(Math.min(1, tk / .1)) * (1 - Math.max(0, tk - .2) / .12));
      star(g, head[0], head[1] - 8, r, e.teleUb ? '#ff9a2a' : '#ff3b30'); }
    // the commit: a white glint on the weapon just before the blow; the parry window flickers on the edge
    const w = e.weaponPts ? e.weaponPts() : null;
    if (e.atk && e.atk.glint && t - e.atk.glint < .1) { const p = w ? WP(w.tip) : head; star(g, p[0], p[1], 3, '#ffffff', '#ffffff'); }
    if (e.st === 'parry' && w && Math.floor(t * 24) % 2) { const p = WP(w.mid), q = WP(w.tip); line(g, p, q, '#ffffff'); }
    // health over the hurt (the boss has his own bar), the token pip over whoever has the turn
    if (!e.T.boss && e.hp < e.maxHp) { const x = (head[0] - 9) | 0, y = (head[1] + 1) | 0; g.fillStyle = R.b[0]; g.fillRect(x - 1, y - 1, 20, 4);
      g.fillStyle = R.l[3]; g.fillRect(x, y, Math.max(1, Math.round(18 * e.hp / e.maxHp)), 2); }
    if (TOKENS.has(e) && !e.T.boss) { g.fillStyle = '#ffffff'; g.fillRect((head[0] - 1) | 0, (head[1] - 3) | 0, 3, 1); }
    if (e.st === 'flee') { g.fillStyle = '#c7c9c6'; g.fillRect(head[0] | 0, (head[1] - 6) | 0, 1, 3); g.fillRect(head[0] | 0, (head[1] - 2) | 0, 1, 1); }
  }
  // shots: an arrow is a shaft with a pale head; a shuriken a spinning four-point star
  for (const s of CTX.shots) { const c = P(s.x, s.y, s.z);
    if (s.k === 'arrow') { const v = hv(s.h), b = P(s.x - v[0] * 16, s.y, s.z - v[1] * 16); line(g, b, c, '#b9a77a'); g.fillStyle = '#e8e6df'; g.fillRect(c[0] | 0, c[1] | 0, 2, 1); g.fillStyle = '#d8d2c0'; g.fillRect(b[0] | 0, (b[1] - 1) | 0, 1, 3); }
    else { const o = Math.floor(s.age * 30) % 2; g.fillStyle = '#c7c9c6'; if (o) { g.fillRect((c[0] - 2) | 0, c[1] | 0, 5, 1); g.fillRect(c[0] | 0, (c[1] - 2) | 0, 1, 5); }
      else { for (const [x, y] of [[-1, -1], [1, 1], [-1, 1], [1, -1], [-2, -2], [2, 2], [-2, 2], [2, -2]]) g.fillRect((c[0] + x) | 0, (c[1] + y) | 0, 1, 1); } g.fillStyle = '#ffffff'; g.fillRect(c[0] | 0, c[1] | 0, 1, 1); } }
  // the boss's bar: his name, his health, the phases as pips
  const boss = CTX.enemies.find(e => e.T.boss && !e.gone);
  if (boss) { const w = 300, x = (VW - w) / 2, y = VH - 34; g.fillStyle = 'rgba(6,7,9,.75)'; g.fillRect(x - 3, y - 14, w + 6, 24);
    g.font = '10px ui-monospace, monospace'; g.fillStyle = '#e8d6cf'; g.fillText(boss.T.name.toUpperCase(), x, y - 4);
    g.fillStyle = R.b[1]; g.fillRect(x, y, w, 5); g.fillStyle = R.l[3]; g.fillRect(x, y, Math.max(0, Math.round(w * boss.hp / boss.maxHp)), 5);
    for (const [i, ph] of boss.T.phases.entries()) { if (!i) continue; g.fillStyle = '#e8d6cf'; g.fillRect((x + w * ph.at) | 0, y - 2, 1, 9); }
    for (let i = 0; i < boss.T.phases.length; i++) { g.fillStyle = i <= boss.phase ? R.l[4] : R.b[3]; g.fillRect(x + w - 10 - (boss.T.phases.length - 1 - i) * 7, y - 10, 5, 5); } }
  // the hero's health (the slice has no death: at nought he is knocked down and it fills again)
  if (CTX.enemies.length) { g.fillStyle = 'rgba(6,7,9,.6)'; g.fillRect(10, 10, CTX.heroMax * 6 + 4, 9);
    for (let i = 0; i < CTX.heroMax; i++) { g.fillStyle = i < CTX.heroHp ? R.y[1] : R.n[3]; g.fillRect(12 + i * 6, 12, 4, 5); } }
}
