// prototypes/46-combo-prompts.html: what the prototype draws over the game, in world units after the game's render() (which leaves the
// canvas scaled by PX), so at 2x it is drawn in the same 2-pixel blocks as everything else. Pixel font from src/ui/pixfont.js.
import { W, H } from '../../src/config.js';
import { g } from '../../src/screen.js';
import { P } from '../../src/state.js';
import { text, textC, textW } from '../../src/ui/pixfont.js';
import { screenDir, letterOf, MOVE_NAME } from './combo.js';

const CY = '#6ff3e4', CY2 = '#b8fff6', WH = '#ffffff', GR = '#9aa3a1', RED = '#ff5a4a', INK = '#0c0d11';
// the arrows, drawn a pixel at a time: R as a bitmap, the rest turned from it
const AR = ['....#....', '....##...', '....###..', '########.', '#########', '########.', '....###..', '....##...', '....#....'];
const CH = ['#...#....', '##..##...', '.##..##..', '..##..##.', '...##..##', '..##..##.', '.##..##..', '##..##...', '#...#....'];
function bitmap(rows, dir, x, y, col) {
  g.fillStyle = col; const n = rows.length;
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (rows[r][c] === '#') {
    const [px, py] = dir === 'R' ? [c, r] : dir === 'L' ? [n - 1 - c, r] : dir === 'D' ? [r, c] : [r, n - 1 - c];
    g.fillRect(x + px, y + py, 1, 1); }
}
function circle(cx, cy, r, col, from = 0, to = 1) {
  g.fillStyle = col; const n = Math.max(12, Math.round(r * 6.3));
  for (let i = Math.floor(from * n); i < to * n; i++) { const a = -Math.PI / 2 + i / n * Math.PI * 2; g.fillRect(Math.round(cx + Math.cos(a) * r), Math.round(cy + Math.sin(a) * r), 1, 1); }
}
const box = (x, y, w, h, fill, edge) => { g.fillStyle = fill; g.fillRect(x, y, w, h); g.fillStyle = edge; g.fillRect(x, y, w, 1); g.fillRect(x, y + h - 1, w, 1); g.fillRect(x, y, 1, h); g.fillRect(x + w - 1, y, 1, h); };

// where the prompt sits: over the enemy (as K's prompt sits over him), over the ronin, or in a strip low on the screen
export function promptAt(p, where) {
  let x, y;
  if (where === 'strip') { x = W / 2; y = 214; }
  else if (where === 'ronin' || !p.e) { x = P.x; y = P.y - 50; }
  else { x = p.e.x; y = p.e.y - 54; }
  return [Math.round(Math.max(18, Math.min(W - 18, x))), Math.round(Math.max(24, Math.min(H - 30, y)))];
}
// the prompt: a keycap with the glyph, a ring closing on the perfect beat, then the rest of the window running out round it
export function drawPrompt(C, T, touch) {
  const p = C.prompt; if (!p) return;
  const [cx, cy] = promptAt(p, T.where), fin = p.kind === 'FIN', isK = p.kind === 'K';
  const lead = Math.max(.001, T.lead), win = T.win * (T.assist === 'generous' ? 1.5 : 1), age = Math.max(0, p.age);
  if (age < lead) circle(cx, cy, 10 + 16 * (1 - age / lead), WH);
  else circle(cx, cy, 12, CY, 0, Math.max(0, 1 - (age - lead) / win));
  if (age >= lead && age - lead < .06) circle(cx, cy, 13, WH);   // the beat itself: a white flash of the ring
  box(cx - 8, cy - 8, 17, 17, INK, fin ? WH : isK ? RED : CY);
  if (fin) box(cx - 10, cy - 10, 21, 21, 'rgba(0,0,0,0)', WH);
  const L = !touch && letterOf(p.kind, T.scheme);
  if (isK) touch ? (g.fillStyle = WH, g.fillRect(cx - 4, cy - 1, 3, 3), g.fillRect(cx + 2, cy - 1, 3, 3)) : text('K', cx - 2, cy - 2, WH);
  else if (p.kind === 'T') touch ? (g.fillStyle = WH, g.fillRect(cx - 2, cy - 2, 5, 5), circle(cx, cy, 5, CY2)) : text('J', cx - 1, cy - 2, WH);
  else if (L) text(L.toUpperCase(), cx - 1, cy - 2, WH);
  else bitmap(fin ? CH : AR, screenDir(p.kind, p.face), cx - 4, cy - 4, WH);
  // the chord: direction + J shows a small J under the arrow
  if (!touch && T.scheme === 'dirJ' && !isK && p.kind !== 'T') { box(cx + 6, cy + 5, 7, 7, INK, CY); text('J', cx + 8, cy + 6, CY2); }
  textC((isK ? 'execute' : MOVE_NAME[p.kind]).toUpperCase(), cx, cy - 17, fin ? WH : GR);   // above, clear of K's own keycap over his head
}
// the grade: a word that rises off the prompt's spot. The words carry it, the colour only repeats it (colour-blind safe)
export function drawGrade(C, T) {
  const f = C.flash; if (!f || f.t > .6) return;
  const at = C.prompt || C.lastPrompt; const [cx, cy] = at ? promptAt(at, T.where) : [P.x, P.y - 50];
  const col = { white: WH, cyan: CY, grey: GR, red: RED }[f.tone], y = cy - 30 - Math.round(f.t * 14);
  g.globalAlpha = Math.min(1, (.6 - f.t) / .2);
  if (f.tone === 'red') { textC('x ' + f.word, cx, y, col, 1); } else textC(f.word, cx, y, col, f.word === 'PERFECT' ? 2 : 1);
  g.globalAlpha = 1;
}
// the counter, top centre: hits in this chain and a pip per link (the last pip is the finisher)
export function drawCounter(C, T) {
  const ch = C.chain, cx = W / 2;
  if (ch) {
    const n = String(ch.hits); text(n, cx - textW(n, 3) - 2, 8, WH, 3); text('HITS', cx + 2, 8, GR); text(T.mode === 'free' ? 'FREE' : 'CHAIN', cx + 2, 16, GR);
    if (T.mode === 'prompt') for (let i = 0; i < T.len; i++) { const x = cx - T.len * 4 + i * 8, on = i < ch.links;
      g.fillStyle = on ? (i === T.len - 1 ? WH : CY) : '#3a4046'; g.fillRect(x, 28, i === T.len - 1 ? 6 : 5, 3); }
  } else if (C.last && C.last.t < 1.6) {
    g.globalAlpha = Math.min(1, (1.6 - C.last.t) / .4);
    textC(`${C.last.links} LINKS · ${C.last.hits} HITS`, cx, 10, WH); textC(C.last.why === 'done' || C.last.why === 'K' ? 'CHAIN COMPLETE' : 'CHAIN ENDS: ' + C.last.why, cx, 18, C.last.why === 'done' || C.last.why === 'K' ? CY : GR);
    g.globalAlpha = 1;
  }
}
// the gesture just recognised, under the counter
export function drawGesture(lab) {
  if (!lab || lab.t > 1.4) return;
  g.globalAlpha = Math.min(1, (1.4 - lab.t) / .4);
  const w = textW(lab.text) + 8; box(Math.round(W / 2 - w / 2), 36, w, 9, 'rgba(12,13,17,.8)', lab.ok ? CY : GR);
  textC(lab.text, W / 2, 38, lab.ok ? CY2 : GR); g.globalAlpha = 1;
}
// a finger's path, in world units: a 1-pixel line, newest part brightest
// toW: a point on the play area (CSS px) to world units, through the page's zoom and pan
export function drawTrail(pts, toW, age = 0, fade = .35) {
  if (!pts || pts.length < 2) return;
  for (let i = 1; i < pts.length; i++) {
    const [x0, y0] = toW(pts[i - 1]), [x1, y1] = toW(pts[i]), k = i / pts.length, a = Math.max(0, (1 - age / fade)) * (.35 + .65 * k);
    if (a <= 0) continue; g.globalAlpha = a; g.fillStyle = k > .8 ? WH : CY;
    const n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0)));
    for (let j = 0; j <= n; j++) g.fillRect(Math.round(x0 + (x1 - x0) * j / n), Math.round(y0 + (y1 - y0) * j / n), 1, 1);
  }
  g.globalAlpha = 1;
}
// the floating stick: a ring where the thumb landed, the knob where it is now
export function drawStick(st, toW) {
  if (!st.on) return;
  const [ox, oy] = toW([st.ox, st.oy]), [sx, sy] = toW([st.x, st.y]), R = 14;
  let kx = sx - ox, ky = sy - oy; const m = Math.hypot(kx, ky); if (m > R) { kx *= R / m; ky *= R / m; }
  g.globalAlpha = .7; circle(ox, oy, R, CY); g.fillStyle = st.walk ? GR : WH; g.fillRect(Math.round(ox + kx) - 2, Math.round(oy + ky) - 2, 5, 5); g.globalAlpha = 1;
}
// the two-thumb layout's halves, faint, while a touch layout is in use
export function drawZones(layout) {
  g.globalAlpha = .28; g.fillStyle = CY;
  if (layout === 'two') { const x = Math.round(W * .45); for (let y = 60; y < H - 30; y += 4) g.fillRect(x, y, 1, 2); text('MOVE', 20, H - 36, CY); text('GESTURES', W - 20 - textW('GESTURES'), H - 36, CY); }
  else textC('ONE THUMB: SWIPE · TAP · HOLD · SLOW DRAG MOVES', W / 2, H - 36, CY);
  g.globalAlpha = 1;
}
export const drawLock = C => { if (C.lock > 0) { g.globalAlpha = .8; textC('RECOVER', P.x, P.y - 40, RED); g.globalAlpha = 1; } };
