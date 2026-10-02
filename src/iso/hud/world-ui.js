// ---- What the HUD draws over the world, at the game's pixel scale (480×270): today's damage numbers (fx/numbers.js),
// a short line over someone's head (a companion's "DOWN", "LV 3 +EDG"), and the conversion from the world to the
// HUD's pixels. Over the clash and the close-up, as today's HUD is.
import './canvas.js';
import { toScreen, VW } from '../gfx/view.js';
import { num, updateNums, drawNums } from '../../fx/numbers.js';
import { text, textW } from '../../ui/pixfont.js';
import { g } from '../../screen.js';

export const HUD_S = VW / 480;   // render pixels per HUD pixel
// a world point (feet at y = 0) to HUD pixels
export const toHud = (x, y, z) => { const [sx, sy] = toScreen(x, y, z); return [sx / HUD_S, sy / HUD_S]; };
const HEAD = 30;   // world units over the feet: a little over his hat
// today's numbers, popped over someone's head (n in whole units: 10 a samurai's health point, 100 all of his)
export function numAt(c, n, kind = 'deal') { const [x, y] = toHud(c.x, HEAD - 4, c.z); num(x, y, n, kind); }
const LINES = [];
export function say(c, s, col = '#ffffff', dur = 1.4) { LINES.push({ c, s, col, t: 0, dur }); }
export function tickWorldUi(dt) { updateNums(dt); for (const l of LINES) l.t += dt; for (let i = LINES.length - 1; i >= 0; i--) if (LINES[i].t > LINES[i].dur) LINES.splice(i, 1); }
export function drawWorldUi() {
  for (const l of LINES) { const [x, y] = toHud(l.c.x, HEAD + 4, l.c.z), w = textW(l.s), x0 = Math.round(x - w / 2), y0 = Math.round(y - Math.min(4, l.t * 30));
    g.globalAlpha = l.t > l.dur - .3 ? (l.dur - l.t) / .3 : 1;
    for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) text(l.s, x0 + dx, y0 + dy, '#0c0d11'); text(l.s, x0, y0, l.col); g.globalAlpha = 1; }
  drawNums();
}
