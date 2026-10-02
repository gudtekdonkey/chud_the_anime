import { g } from '../screen.js';
import { text, textW, textC } from './pixfont.js';

// ---- HUD pieces (from prototypes/20-items.html): panel, meter, slot, lock-on brackets, the E prompt, banners, glints, plus marks ----
const WH = '#ffffff', CY = '#6ff3e4';
const clamp01 = k => Math.min(1, Math.max(0, k));
export function panel(x, y, w, h) { g.fillStyle = 'rgba(12,13,17,.82)'; g.fillRect(x, y, w, h); g.fillStyle = '#2c323b';
  g.fillRect(x, y, w, 1); g.fillRect(x, y + h - 1, w, 1); g.fillRect(x, y, 1, h); g.fillRect(x + w - 1, y, 1, h); }
// the fill edge is a 1px white line; notches split it (Qi in thirds)
export function meter(x, y, w, h, k, col, notches, flash, chip, chipCol) {
  g.fillStyle = '#0c0d11'; g.fillRect(x - 1, y - 1, w + 2, h + 2); g.fillStyle = '#23272d'; g.fillRect(x, y, w, h);
  const f = Math.round(w * clamp01(k));
  if (chip > k) { g.fillStyle = chipCol; g.fillRect(x + f, y, Math.round(w * clamp01(chip)) - f, h); }   // what was just lost, lingering
  g.fillStyle = flash ? WH : col; g.fillRect(x, y, f, h);
  if (f > 0 && f < w) { g.fillStyle = WH; g.fillRect(x + f - 1, y, 1, h); }
  g.fillStyle = '#0c0d11'; for (let i = 1; i < notches; i++) g.fillRect(x + Math.round(w * i / notches), y, 1, h); }
// kind: weapon | quick | charm | skill. o: flash (white on change), cd (a shade that drains upward, 1 = full), dim (35% icon), key, count, frame
export function slot(x, y, s, kind, icon, o = {}) {
  g.fillStyle = 'rgba(12,13,17,.88)'; g.fillRect(x, y, s, s);
  const fc = o.flash > 0 ? WH : o.frame || (kind === 'charm' ? '#3b424c' : kind === 'weapon' ? '#7d868e' : '#565e66');
  g.fillStyle = fc; g.fillRect(x, y, s, 1); g.fillRect(x, y + s - 1, s, 1); g.fillRect(x, y, 1, s); g.fillRect(x + s - 1, y, 1, s);
  if (kind === 'charm') { g.fillStyle = '#7d868e'; const m = Math.floor(s / 2); g.fillRect(x + m - 1, y - 1, 2, 1); g.fillRect(x + m - 1, y + s, 2, 1); g.fillRect(x - 1, y + m - 1, 1, 2); g.fillRect(x + s, y + m - 1, 1, 2); }
  if (icon) { const c = icon.c || icon, iw = c.width; g.save(); g.globalAlpha = o.dim ? .35 : 1; g.drawImage(c, x + Math.floor((s - iw) / 2), y + Math.floor((s - iw) / 2)); g.restore(); }
  if (o.cd > 0) { g.fillStyle = 'rgba(12,13,17,.7)'; const h = Math.round((s - 2) * clamp01(o.cd)); g.fillRect(x + 1, y + 1 + (s - 2 - h), s - 2, h); }
  if (o.flash > 0) { g.fillStyle = `rgba(255,255,255,${.5 * Math.min(1, o.flash)})`; g.fillRect(x + 1, y + 1, s - 2, s - 2); }
  if (o.key) text(o.key, x + 2, y + 2, '#7d868e');
  if (o.count != null) { const tw = textW(String(o.count)); g.fillStyle = '#0c0d11'; g.fillRect(x + s - tw - 3, y + s - 7, tw + 2, 6); text(String(o.count), x + s - tw - 2, y + s - 6, WH); }
}
// the lock-on: four cyan corners that snap in from 8px out, then breathe by one pixel; c = time locked, gone = time since E was pressed
export function brackets(b, c, gone) {
  if (gone > .06) return;
  const p = c < .12 ? Math.round((1 - c / .12) * 8) : Math.round(Math.sin(c * 6) * .6 + .6);
  g.fillStyle = gone >= 0 ? WH : CY;
  const x0 = b.x0 - p, x1 = b.x1 + p, y0 = b.y0 - p, y1 = b.y1 + p;
  for (const [x, y, sx, sy] of [[x0, y0, 1, 1], [x1, y0, -1, 1], [x0, y1, 1, -1], [x1, y1, -1, -1]]) {
    g.fillRect(Math.round(sx > 0 ? x : x - 2), Math.round(y), 3, 1); g.fillRect(Math.round(x), Math.round(sy > 0 ? y : y - 2), 1, 3); } }
// the prompt: a key cap and the verb, above the item
export function prompt(cx, y, word, c, pressed) {
  if (c < 0) return; const w = 7 + 3 + textW(word) + 3, x0 = Math.round(cx - w / 2), yy = Math.round(y + (c < .08 ? 2 : 0));
  g.save(); if (c < .08) g.globalAlpha = .5;
  panel(x0, yy, w, 9);
  g.fillStyle = pressed ? CY : '#e9eeee'; g.fillRect(x0 + 1, yy + 1, 7, 7); text('E', x0 + 3, yy + 2, '#0c0d11');
  text(word, x0 + 10, yy + 2, pressed ? CY : '#e9eeee'); g.restore(); }
// a banner: a small cyan label over a big white name, rules drawing out to each side; fades in over 0.1 s, out over the last 0.25 s
export function banner(cx, y, small, big, c, dur, sc = 2) {
  if (c < 0 || c > dur) return;
  const a = c < .1 ? c / .1 : c > dur - .25 ? (dur - c) / .25 : 1, bw = textW(big, sc), rl = Math.round(Math.min(1, c / .25) * 18);
  g.save(); g.globalAlpha = a;
  textC(small, cx, y, CY); textC(big, cx, y + 8, WH, sc);
  g.fillStyle = CY; g.fillRect(Math.round(cx - bw / 2 - 5 - rl), y + 8 + Math.round(5 * sc / 2) - 1, rl, 1); g.fillRect(Math.round(cx + bw / 2 + 5), y + 8 + Math.round(5 * sc / 2) - 1, rl, 1);
  g.restore(); }
export function glint(x, y, r = 2, col = WH) { g.fillStyle = col; g.fillRect(x, y, 1, 1); for (let i = 1; i <= r; i++) { g.fillRect(x - i, y, 1, 1); g.fillRect(x + i, y, 1, 1); g.fillRect(x, y - i, 1, 1); g.fillRect(x, y + i, 1, 1); } }
export function plusMark(x, y, col) { g.fillStyle = col; g.fillRect(x - 1, y, 3, 1); g.fillRect(x, y - 1, 1, 3); }
