import { W } from '../config.js';
import { g } from '../screen.js';
import { P } from '../state.js';
import { panel } from './hud-kit.js';
import { text, textW, textC } from './pixfont.js';
import { party } from '../party/kit.js';
import { allies, PS, downNear, drawPartyWorld } from '../party/companions.js';
import { nearSpot, verb } from '../party/recruit.js';
import { X, pairCandidate } from '../party/paired.js';

// ---- The party on the HUD: one small bar per companion, ten to a row, under the skill bar and Flow; the order; the prompts over the world ----
const WH = '#ffffff', CY = '#6ff3e4', INK = '#e9eeee';
// a key cap and its word, centred on x (the items' E prompt, with any key)
function keyCap(x, y, k, word, col) {
  const w = 10 + textW(word) + 3, x0 = Math.round(x - w / 2); y = Math.round(y);
  panel(x0, y, w, 9); g.fillStyle = INK; g.fillRect(x0 + 1, y + 1, 7, 7); text(k, x0 + 3, y + 2, '#0c0d11'); text(word, x0 + 10, y + 2, col);
}
// in world space, after the bodies: bleed bars, LV pops, and one prompt (lifting beats paired K beats recruiting)
export function drawPartyPrompts() {
  drawPartyWorld(textC);
  if (P.state === 'exec' || P.state === 'death') return;
  const dn = downNear();
  if (dn) return keyCap(dn.x, dn.y - 30, 'E', dn.lift > 0 ? 'LIFTING' : 'HOLD: LIFT ' + dn.c.name, CY);
  const c = !X && pairCandidate();
  if (c) return keyCap(c.e.x, c.e.y - 44, 'K', 'WITH ' + c.a.c.name, CY);
  const s = nearSpot(); if (s) keyCap(s.x, s.y - (s.kind === 'camp' ? 32 : 36), 'E', verb(s), INK);
}
export function drawPartyHud() {
  const n = allies.length, rows = Math.max(1, Math.ceil(n / 10)), y0 = 58, hold = party.order === 'hold';
  panel(5, y0, 80, 12 + rows * 4);
  text('PARTY ' + n, 9, y0 + 3, '#a9b1b6'); const o = hold ? 'HOLD' : 'FOLLOW'; text(o, 81 - textW(o), y0 + 3, hold ? CY : '#565e66');
  allies.forEach((a, i) => { const x = 9 + (i % 10) * 7, y = y0 + 10 + Math.floor(i / 10) * 4;
    g.fillStyle = '#23272d'; g.fillRect(x, y, 6, 2);
    g.fillStyle = a.state === 'down' ? (PS.clock % .4 < .2 ? '#ff5a4a' : WH) : a.state === 'dying' ? '#3b424c' : INK;
    g.fillRect(x, y, a.state === 'down' ? 6 : Math.max(1, Math.round(6 * a.hp)), 2); });
  if (PS.noteT > 0) { const w = textW(PS.note); g.save(); g.globalAlpha = Math.min(1, PS.noteT * 3);
    panel(W / 2 - w / 2 - 5, 8, w + 10, 11); text(PS.note, W / 2 - w / 2, 11, CY); g.restore(); }
}
