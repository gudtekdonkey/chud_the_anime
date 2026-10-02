import { W, H, COL } from '../config.js';
import { g } from '../screen.js';
import { P } from '../state.js';
import { text, textC, textW } from './pixfont.js';
import { C, PT, MOVE_NAME, screenDir } from '../player/prompts.js';
import { K } from '../assassin/markers.js';

// ---- The combo prompts on screen (prototype 46's drawing, C5A: over the enemy, the ring closing round it) ----
// drawPrompt and drawGrade go in world space (with the camera, unshaken); drawCounter is HUD, top centre
const WH = '#ffffff', GR = '#9aa3a1', RED = '#ff5a4a', INK = '#0c0d11';
// the arrows, a pixel at a time: R as a bitmap, the rest turned from it; the finisher's is a double chevron
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
const box = (x, y, w, h, fill, edge) => { if (fill) { g.fillStyle = fill; g.fillRect(x, y, w, h); } g.fillStyle = edge; g.fillRect(x, y, w, 1); g.fillRect(x, y + h - 1, w, 1); g.fillRect(x, y, 1, h); g.fillRect(x + w - 1, y, 1, h); };
// over the enemy, as K's own prompt sits over him; over the ronin if he is gone
function promptAt(p) {
  const e = p.kind === 'K' && K.pick ? K.pick : p.e;   // K's offer sits over whoever K would take now
  const [x, y] = e && e.alive ? [e.x, e.y - 54] : [P.x, P.y - 50];
  return [Math.round(Math.max(18, Math.min(W - 18, x))), Math.round(Math.max(24, Math.min(H - 30, y)))];
}
// the prompt: a keycap with its glyph, a ring closing on the perfect beat, then the rest of the window running out round it
export function drawPrompt() {
  const p = C.prompt; if (!p) return;
  const [cx, cy] = promptAt(p), fin = p.kind === 'FIN', isK = p.kind === 'K', touch = PT.touch, age = Math.max(0, p.age);
  if (age < PT.lead) circle(cx, cy, 10 + 16 * (1 - age / PT.lead), WH);
  else circle(cx, cy, 12, COL.eye, 0, Math.max(0, 1 - (age - PT.lead) / PT.win));
  if (age >= PT.lead && age - PT.lead < .06) circle(cx, cy, 13, WH);   // the beat itself: the ring flashes white
  box(cx - 8, cy - 8, 17, 17, INK, fin ? WH : isK ? RED : COL.eye);
  if (fin) box(cx - 10, cy - 10, 21, 21, null, WH);
  g.fillStyle = WH;
  if (isK) touch ? (g.fillRect(cx - 4, cy - 1, 3, 3), g.fillRect(cx + 2, cy - 1, 3, 3)) : text('K', cx - 1, cy - 2, WH);   // a double tap, or K
  else if (p.kind === 'T') touch ? (g.fillRect(cx - 2, cy - 2, 5, 5), circle(cx, cy, 5, COL.fx2)) : text('J', cx - 1, cy - 2, WH);   // a tap, or J
  else if (p.kind === 'S') touch ? (g.fillRect(cx - 4, cy - 3, 3, 3), g.fillRect(cx + 2, cy + 1, 3, 3)) : text('I', cx - 1, cy - 2, WH);   // two fingers, or I
  else bitmap(fin ? CH : AR, screenDir(p.kind, p.face), cx - 4, cy - 4, WH);
  // the chord on PC: a direction prompt carries a small J (direction + J)
  if (!touch && !isK && p.kind !== 'T' && p.kind !== 'S') { box(cx + 6, cy + 5, 7, 7, INK, COL.eye); text('J', cx + 8, cy + 6, COL.fx2); }
  textC(MOVE_NAME[p.kind].toUpperCase(), cx, cy - 17, fin ? WH : GR);
}
// the grade: a word rising off the prompt's spot. The word carries it, the colour only repeats it
export function drawGrade() {
  const f = C.flash; if (!f || f.t > .6) return;
  const at = C.prompt || C.lastPrompt, [cx, cy] = at ? promptAt(at) : [P.x, P.y - 50];
  const col = { white: WH, cyan: COL.eye, grey: GR, red: RED }[f.tone], y = cy - 30 - Math.round(f.t * 14);
  g.globalAlpha = Math.min(1, (.6 - f.t) / .2);
  textC(f.tone === 'red' ? 'x ' + f.word : f.word, cx, y, col, f.word === 'PERFECT' ? 2 : 1);
  g.globalAlpha = 1;
  if (C.lock > 0) { g.globalAlpha = .8; textC('RECOVER', P.x, P.y - 40, RED); g.globalAlpha = 1; }
}
// the hit counter, top centre: hits in this chain and a pip per link (the last pip is the finisher); the chain's end, briefly
export function drawCounter() {
  const ch = C.chain, cx = W / 2;
  if (ch) {
    const n = String(ch.hits); text(n, cx - textW(n, 3) - 2, 6, WH, 3); text('HITS', cx + 2, 6, GR); text('CHAIN', cx + 2, 14, GR);
    for (let i = 0; i < ch.len; i++) { const x = cx - ch.len * 4 + i * 8, on = i < ch.links;
      g.fillStyle = on ? (i === ch.len - 1 ? WH : COL.eye) : '#3a4046'; g.fillRect(x, 24, i === ch.len - 1 ? 6 : 5, 3); }
  } else if (C.last && C.last.t < 1.6 && C.last.links > 1) {
    const ok = C.last.why === 'done' || C.last.why === 'K';
    g.globalAlpha = Math.min(1, (1.6 - C.last.t) / .4);
    textC(`${C.last.links} LINKS · ${C.last.hits} HITS`, cx, 8, WH); textC(ok ? 'CHAIN COMPLETE' : 'CHAIN ENDS: ' + C.last.why.toUpperCase(), cx, 16, ok ? COL.eye : GR);
    g.globalAlpha = 1;
  }
}
