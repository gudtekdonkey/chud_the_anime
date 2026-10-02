import { W, H, COL } from '../config.js';
import { g } from '../screen.js';
import { text, textW } from './pixfont.js';
import { FADES, trails, pollGestures } from '../pointer.js';
import { TOUCH } from '../player/touch.js';
import { PT } from '../player/prompts.js';
import { CLICK } from '../player/click.js';

// ---- What the pointer leaves on screen: a finger's pixel trail, the floating stick, the two-thumb halves, the click marker ----
const FADE = .35;
// a stroke's points (CSS px on the canvas) to screen units (the world's 480×270, before the camera)
const toS = ([x, y], r) => [x / r.width * W, y / r.height * H];
// a finger's path: a 1-pixel line, newest part brightest
function trail(pts, r, age) {
  for (let i = 1; i < pts.length; i++) {
    const [x0, y0] = toS(pts[i - 1], r), [x1, y1] = toS(pts[i], r), k = i / pts.length, a = Math.max(0, 1 - age / FADE) * (.35 + .65 * k);
    if (a <= 0) continue; g.globalAlpha = a; g.fillStyle = k > .8 ? '#ffffff' : COL.eye;
    const n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0)));
    for (let j = 0; j <= n; j++) g.fillRect(Math.round(x0 + (x1 - x0) * j / n), Math.round(y0 + (y1 - y0) * j / n), 1, 1);
  }
  g.globalAlpha = 1;
}
function ring(cx, cy, r, col) { g.fillStyle = col; const n = Math.round(r * 6.3); for (let i = 0; i < n; i++) { const a = i / n * 6.283; g.fillRect(Math.round(cx + Math.cos(a) * r), Math.round(cy + Math.sin(a) * r), 1, 1); } }
// screen space, after the HUD: the stick, the halves while a finger plays, the trails
export function drawTouch() {
  pollGestures();   // a finger held still sends no events: the hold is read here, once a frame
  const now = performance.now(), st = TOUCH.stick;
  if (PT.touch) { g.globalAlpha = .22; g.fillStyle = COL.eye; const x = Math.round(W * .45); for (let y = 70; y < H - 40; y += 4) g.fillRect(x, y, 1, 2);
    text('MOVE', 20, H - 46, COL.eye); text('GESTURES', W - 20 - textW('GESTURES'), H - 46, COL.eye); g.globalAlpha = 1; }
  if (st && st.on) { const r = { width: st.w, height: st.h }, [ox, oy] = toS([st.ox, st.oy], r), [sx, sy] = toS([st.x, st.y], r), R = 14;
    let kx = sx - ox, ky = sy - oy; const m = Math.hypot(kx, ky); if (m > R) { kx *= R / m; ky *= R / m; }
    g.globalAlpha = .7; ring(ox, oy, R, COL.eye); g.fillStyle = st.walk ? '#9aa3a1' : '#ffffff'; g.fillRect(Math.round(ox + kx) - 2, Math.round(oy + ky) - 2, 5, 5); g.globalAlpha = 1; }
  for (let i = FADES.length - 1; i >= 0; i--) { const age = (now - FADES[i].t0) / 1000; if (age > FADE) FADES.splice(i, 1); else trail(FADES[i].pts, FADES[i].r, age); }
  for (const t of trails()) trail(t.pts, t.r, 0);
}
// world space, on the floor (under the bodies): where a click sent him, a small diamond that pulses, and shrinks away on arrival
export function drawClickMark() {
  const m = CLICK.mark; if (!m) return;
  const k = m.gone ? Math.max(0, 1 - m.t / .3) : 1; if (k <= 0) { if (m.gone) CLICK.mark = null; return; }
  const r = Math.max(1, Math.round((m.e ? 3 : 4) * k + (m.gone ? 0 : (Math.sin(m.t * 10) > 0 ? 1 : 0)))), x = Math.round(m.x), y = Math.round(m.y);
  g.globalAlpha = .9 * k; g.fillStyle = COL.eye;
  for (let i = -r; i <= r; i++) { const h = Math.round((r - Math.abs(i)) * .55); g.fillRect(x + i, y - h, 1, 1); g.fillRect(x + i, y + h, 1, 1); }
  g.fillStyle = '#ffffff'; g.fillRect(x, y, 1, 1); g.globalAlpha = 1;
}
