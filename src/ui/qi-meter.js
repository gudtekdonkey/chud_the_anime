import { COL } from '../config.js';
import { g } from '../screen.js';
import { P } from '../state.js';

// the Qi meter, bottom left: a tiny pixel label, a 48px bar, glowing and crackling when full (the storm)
const GLYPH = { Q: ['.##.', '#..#', '#..#', '#.##', '.###'], I: ['###', '.#.', '.#.', '.#.', '###'], S: ['###', '#..', '###', '..#', '###'],
  T: ['###', '.#.', '.#.', '.#.', '.#.'], O: ['###', '#.#', '#.#', '#.#', '###'], R: ['##.', '#.#', '##.', '#.#', '#.#'], M: ['#...#', '##.##', '#.#.#', '#...#', '#...#'] };
function pixText(txt, x, y, col) { g.fillStyle = col; for (const ch of txt) { const gl = GLYPH[ch];
  gl.forEach((r, j) => [...r].forEach((c, i) => { if (c === '#') g.fillRect(x + i, y + j, 1, 1); })); x += gl[0].length + 1; } }
export function drawQi() {
  const x = 30, y = 259, w = 48, full = P.storm > 0, blink = Math.floor(performance.now() / 90) % 2, fill = Math.round(w * P.qi);
  g.globalAlpha = .7; g.fillStyle = '#0d1012'; g.fillRect(16, 255, full ? 96 : 66, 11); g.globalAlpha = 1;
  if (full) { g.globalAlpha = .35 + .35 * Math.random(); g.fillStyle = COL.fx; g.fillRect(x - 2, y - 2, w + 4, 7); g.globalAlpha = 1; } // the glow round a full meter
  pixText('QI', 18, y - 1, full ? (blink ? '#ffffff' : COL.eye) : COL.fx);
  g.fillStyle = '#23292a'; g.fillRect(x - 1, y - 1, w + 2, 5); g.fillStyle = '#0d1012'; g.fillRect(x, y, w, 3);
  g.fillStyle = full ? (blink ? '#ffffff' : COL.fx2) : COL.fx; g.fillRect(x, y, fill, 3);
  if (!full && fill) { g.fillStyle = COL.fx2; g.fillRect(x + fill - 1, y, 1, 3); }
  if (P.qiPop > 0) { g.globalAlpha = P.qiPop * 2; g.fillStyle = '#ffffff'; g.fillRect(x - 1, y - 1, w + 2, 5); g.globalAlpha = 1; }
  if (full) { g.fillStyle = '#ffffff'; for (let i = 0; i < 3; i++) if (Math.random() < .5) { let px = x + (Math.random() * fill | 0), py = y - 1 - (Math.random() * 2 | 0);
      for (let k = 0; k < 4; k++) { g.fillRect(px, py, 1, 1); px += 1; py += Math.random() < .5 ? -1 : 1; } }
    pixText('STORM', 82, y - 1, blink ? COL.fx2 : '#ffffff'); }
}
