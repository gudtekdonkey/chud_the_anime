// ---- The squad's marks on the effects layer (render px, over the 3D picture): selection rings at the companions' feet,
// their role letters and health, the foes' "?" (suspicious) and "!" (just engaged) and the broken man's "~", a downed
// companion's bleed-out ring and the E prompt, the order marks (go there, attack, protect, hold flags), the protect
// links, the drag box, the radial, the arrows in flight; with "show minds" on, the foes' sight cones and every man's
// current thought. Presentation only.
import { toScreen } from '../gfx/view.js';
import { SQ } from './squad.js';
import { ROLES } from './orders.js';
import { RADIAL } from './control.js';
import { SENSE } from '../ai/senses.js';

const CY = '#6ff3e4', CYD = '#2f8f86', RED = '#ff5a4a', WHITE = '#e8f0ee', GREY = '#8b9592';
function ellipse(g, x, y, rx, ry, col, dash = 0) { g.fillStyle = col; const n = Math.ceil(rx * 2.4);
  for (let i = 0; i < n; i++) { if (dash && i % 3 === 2) continue; const a = i / n * Math.PI * 2; g.fillRect(Math.round(x + Math.cos(a) * rx), Math.round(y + Math.sin(a) * ry), 1, 1); } }
function dline(g, ax, ay, bx, by, col, gap = 3) { g.fillStyle = col; const d = Math.hypot(bx - ax, by - ay), n = Math.ceil(d / gap); for (let i = 0; i <= n; i++) { const t = i / n; g.fillRect(Math.round(ax + (bx - ax) * t), Math.round(ay + (by - ay) * t), 1, 1); } }
function label(g, s, x, y, col, bg = 'rgba(6,8,10,.72)') { g.font = '8px ui-monospace, monospace'; const w = Math.ceil(g.measureText(s).width) + 4; g.fillStyle = bg; g.fillRect(Math.round(x - w / 2), Math.round(y - 8), w, 10); g.fillStyle = col; g.fillText(s, Math.round(x - w / 2 + 2), Math.round(y)); }
function bar(g, x, y, f, col) { const w = 16; g.fillStyle = '#0a0c0e'; g.fillRect(Math.round(x - w / 2) - 1, Math.round(y) - 1, w + 2, 4); g.fillStyle = '#3a1416'; g.fillRect(Math.round(x - w / 2), Math.round(y), w, 2); g.fillStyle = col; g.fillRect(Math.round(x - w / 2), Math.round(y), Math.round(w * Math.max(0, f)), 2); }

export function drawSquad(g, { A, H, hero, allies, foes, ctl, arrows }) {
  const st = ctl.st, P = a => ctl.px(a), t = A.t;
  // hold flags and protect links (the standing orders, read off the companions)
  const flags = new Map(); for (const a of allies) if (a.alive && a.order && (a.order.k === 'hold' || a.order.k === 'goto') && a.order.x != null) flags.set(`${Math.round(a.order.x)},${Math.round(a.order.z)}`, a.order);
  for (const o of flags.values()) { const [x, y] = toScreen(o.x, 0, o.z); ellipse(g, x, y, 7, 5, o.k === 'hold' ? CY : CYD, 1); g.fillStyle = CY; g.fillRect(Math.round(x), Math.round(y) - 14, 1, 14); g.fillRect(Math.round(x) + 1, Math.round(y) - 14, 5, 3); }
  for (const a of allies) if (a.alive && a.role === 'protector' && (SQ.sel.has(a.id) || SQ.minds)) { const c = A.agents.find(o => o.id === (a.charge ?? 'hero')); if (c) { const p = P(a), q = P(c); dline(g, p.x, p.y - 2, q.x, q.y - 2, CYD); } }
  // the companions: selection ring, role letter, health; the downed: the bleed-out ring and the E prompt
  for (const a of allies) { if (!a.alive) continue; const p = P(a), sel = SQ.sel.has(a.id);
    if (sel) ellipse(g, p.x, p.y, 10, 7, CY); else if (st.hover === a) ellipse(g, p.x, p.y, 10, 7, CY, 1);
    if (a.downed) { const f = Math.max(0, a.bleed / 15), n = 40; g.fillStyle = RED; for (let i = 0; i < n * f; i++) { const an = -Math.PI / 2 + i / n * Math.PI * 2; g.fillRect(Math.round(p.x + Math.cos(an) * 9), Math.round(p.top + 2 + Math.sin(an) * 9), 1, 1); }
      if (Math.hypot(a.x - hero.x, a.z - hero.z) < 16) label(g, 'hold E', p.x, p.top - 10, WHITE); continue; }
    label(g, ROLES[a.role].icon, p.x, p.top - 3, sel ? '#06120f' : WHITE, sel ? CY : 'rgba(6,8,10,.72)');
    bar(g, p.x, p.top - 1, a.hp / a.maxHp, '#cfe6e2');
    if (SQ.minds) label(g, a.mind.why || '', p.x, p.y + 12, GREY); }
  // the foes: alert marks, health once hurt, the leader's mark; with minds on, the sight cone and the thought
  for (const f of foes) { if (!f.alive) continue; const p = P(f), m = f.mind;
    if (f.hp < f.maxHp) bar(g, p.x, p.top - 1, f.hp / f.maxHp, RED);
    if (m.mode === 'break') label(g, '~', p.x, p.top - 4, WHITE);
    else if (m.mode === 'suspicious') label(g, '?', p.x, p.top - 4, GREY);
    else if (m.mode === 'engaged' && t - m.since < 1.2) label(g, '!', p.x, p.top - 4, RED);
    if (st.hover === f) ellipse(g, p.x, p.y, 10, 7, RED, 1);
    if (SQ.minds) { const r = SENSE.sight * (.75 + .5 * f.temper.wit), h = f.h, col = m.mode === 'engaged' ? 'rgba(255,90,74,.7)' : m.mode === 'suspicious' ? 'rgba(220,200,120,.7)' : 'rgba(140,150,148,.5)';
      for (const s of [-SENSE.half, SENSE.half]) { const [x1, y1] = toScreen(f.x + Math.sin(h + s) * r, 0, f.z + Math.cos(h + s) * r); dline(g, p.x, p.y, x1, y1, col, 6); }
      for (let i = 0; i <= 16; i++) { const a = h - SENSE.half + i / 16 * SENSE.half * 2, [x, y] = toScreen(f.x + Math.sin(a) * r, 0, f.z + Math.cos(a) * r); g.fillStyle = col; g.fillRect(Math.round(x), Math.round(y), 1, 1); }
      label(g, `${m.why || ''}${m.target ? ' > ' + m.target.name : ''}`, p.x, p.y + 12, GREY); } }
  // the order marks, fading
  st.marks = st.marks.filter(k => t - k.t < .8 && t >= k.t);
  for (const k of st.marks) { const [x, y] = toScreen(k.x, 0, k.z), u = (t - k.t) / .8, r = 4 + u * 8, col = k.kind === 'attack' ? RED : k.kind === 'move' ? WHITE : CY;
    ellipse(g, x, y, r, r * .8, col, u > .5 ? 1 : 0); if (k.kind === 'attack') { g.fillStyle = RED; for (const [dx, dy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { g.fillRect(Math.round(x + dx * 10) - (dx < 0 ? 0 : 3), Math.round(y + dy * 8), 4, 1); g.fillRect(Math.round(x + dx * 10), Math.round(y + dy * 8) - (dy < 0 ? 0 : 3), 1, 4); } } }
  // arrows in flight: a shaft and a pale fletch
  for (const r of arrows) { const a = toScreen(r.x, r.y, r.z), b = toScreen(r.x - Math.sin(r.h) * 7, r.y, r.z - Math.cos(r.h) * 7); dline(g, b[0], b[1], a[0], a[1], '#d8cdb4', 1); g.fillStyle = WHITE; g.fillRect(Math.round(a[0]), Math.round(a[1]), 1, 1); }
  // the drag box
  if (st.drag) { const d = st.drag, x0 = Math.min(d.x0, d.x1), y0 = Math.min(d.y0, d.y1), w = Math.abs(d.x1 - d.x0), h = Math.abs(d.y1 - d.y0);
    g.fillStyle = 'rgba(111,243,228,.08)'; g.fillRect(Math.round(x0), Math.round(y0), Math.round(w), Math.round(h));
    dline(g, x0, y0, x0 + w, y0, CY, 2); dline(g, x0, y0 + h, x0 + w, y0 + h, CY, 2); dline(g, x0, y0, x0, y0 + h, CY, 2); dline(g, x0 + w, y0, x0 + w, y0 + h, CY, 2); }
  // the radial: the orders round the cursor, the one under it lit
  if (st.radial) { const r = st.radial; ellipse(g, r.x, r.y, 14, 14, CYD, 1);
    RADIAL.forEach((it, i) => { const a = i / RADIAL.length * Math.PI * 2, x = r.x + Math.sin(a) * 46, y = r.y - Math.cos(a) * 34; label(g, it[1], x, y + 3, r.hot === it ? '#06120f' : WHITE, r.hot === it ? CY : 'rgba(6,8,10,.82)'); }); }
  // order slow-motion: a thin cyan frame while it holds the world
  if (ctl.giving() && SQ.slow !== 'off') { g.fillStyle = 'rgba(111,243,228,.5)'; g.fillRect(0, 0, 960, 1); g.fillRect(0, 539, 960, 1); g.fillRect(0, 0, 1, 540); g.fillRect(959, 0, 1, 540); label(g, SQ.slow === 'pause' ? 'ORDERS · PAUSED' : 'ORDERS · SLOW', 480, 14, CY); }
}
