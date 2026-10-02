// ---- THE INK: how a skill's effect pixel is drawn in the active style (gfx/style.js), so every skill effect goes
// through the style seam as the blade's trail does. An effect asks for a dot by heat (0 the body's cyan … 1 the
// white-hot core) and fade (0 fresh … 1 gone); the ink picks colour, size and alpha:
//   Painterly (soft)      soft dots, cyan into warm white, alpha fading, a glow round the hottest
//   Pixel-render (crisp)  snapped to the world's pixels (2×2 render px), the palette's cyan, fades dithered, held at 12 fps
//   Anime limited (white) flat white with a cyan body and an ink rim, hard edges, on twos
//   Toon + dither         the Animation Flow page's dithered cyan ramp, 1 px, 30 fps
// Nothing here knows which skill is drawing; nothing outside here picks an effect's colours.
import { STYLE } from '../gfx/style.js';
import { VW, VH } from '../gfx/view.js';

const BAY = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map(v => (v + .5) / 16), bay = (x, y) => BAY[(y & 3) * 4 + (x & 3)];
const RAMP = {
  soft: ['#3fbfb5', '#6ff3e4', '#b8fff6', '#fff2d0'],
  dither: ['#52e8d6', '#6ff3e4', '#b8fff6', '#ffffff'],
  crisp: ['#52e8d6', '#6ff3e4', '#b8fff6', '#f0fffc'],
  white: ['#6ff3e4', '#ffffff', '#ffffff', '#ffffff'],
};
const FPS = { soft: 60, dither: 30, crisp: 12, white: 12 };
export const VOID = '#05070a', INK = '#0a0a12';

// the brush for this frame: one per draw, so a style switch shows on the next frame
export function brush(g) {
  const m = STYLE.s.trail in RAMP ? STYLE.s.trail : 'dither', R = RAMP[m];
  let lastC = null, lastA = 1;
  const fill = (c, a) => { if (c !== lastC) { g.fillStyle = c; lastC = c; } if (a !== lastA) { g.globalAlpha = a; lastA = a; } };
  const off = (x, y) => x < -4 || y < -4 || x > VW + 4 || y > VH + 4;
  const B = {
    m,
    // an effect's age as this style shows it: held on its frame rate, so a crisp or anime effect steps like the bodies do
    q: t => Math.floor(t * FPS[m] + 1e-6) / FPS[m],
    // one dot of energy
    dot(x, y, heat = .5, fade = 0, sz = 1) {
      if (fade >= 1 || off(x, y)) return; const c = R[Math.max(0, Math.min(3, (heat * 3.999) | 0))];
      if (m === 'soft') { const a = Math.pow(1 - fade, 1.2) * (.5 + .5 * heat); if (a < .03) return; fill(c, a); g.fillRect(x - sz / 2, y - sz / 2, sz, sz);
        if (heat > .85 && sz < 3) { fill(c, a * .22); g.fillRect(x - 1.5, y - 1.5, 3, 3); } return; }
      if (m === 'crisp') { const X = (x >> 1) << 1, Y = (y >> 1) << 1; if (bay(X >> 1, Y >> 1) < fade) return; fill(c, 1); g.fillRect(X, Y, Math.max(2, sz), Math.max(2, sz)); return; }
      const X = x | 0, Y = y | 0;
      if (m === 'white') { if (fade > .72 || (fade > .45 && bay(X >> 1, Y >> 1) < (fade - .45) * 3.7)) return; fill(c, 1); g.fillRect(X, Y, sz, sz); return; }
      if (bay(X, Y) < fade * .95) return; fill(c, 1); g.fillRect(X, Y, sz, sz);
    },
    // a matter colour (stone, ash) drawn the style's way: soft fades, crisp snaps, the others dither
    solid(x, y, col, fade = 0, sz = 1) {
      if (fade >= 1 || off(x, y)) return;
      if (m === 'soft') { fill(col, 1 - fade); g.fillRect(x - sz / 2, y - sz / 2, sz, sz); return; }
      if (m === 'crisp') { const X = (x >> 1) << 1, Y = (y >> 1) << 1; if (bay(X >> 1, Y >> 1) < fade) return; fill(col, 1); g.fillRect(X, Y, Math.max(2, sz), Math.max(2, sz)); return; }
      const X = x | 0, Y = y | 0; if (bay(X, Y) < fade) return; fill(col, 1); g.fillRect(X, Y, sz, sz);
    },
    // the void inside the black slash (always black: it is a hole in the picture, whatever the style)
    hole(x, y) { if (off(x, y)) return; if (m === 'crisp') { fill(VOID, 1); g.fillRect((x >> 1) << 1, (y >> 1) << 1, 2, 2); } else { fill(VOID, m === 'soft' ? .96 : 1); g.fillRect(x | 0, y | 0, 1, 1); } },
    // an effect's outer edge: the anime style inks it, the others leave it to the glow
    rim(x, y) { if (m !== 'white' || off(x, y)) return; fill(INK, 1); g.fillRect(x | 0, y | 0, 1, 1); },
    // a line of dots (Bresenham, so pixel styles stay whole pixels); heat may run along it
    line(ax, ay, bx, by, h0 = .5, fade = 0, h1 = h0, sz = 1) {
      const n = Math.max(1, Math.ceil(Math.max(Math.abs(bx - ax), Math.abs(by - ay)))); if (n > 1200) return;
      for (let i = 0; i <= n; i++) { const u = i / n; B.dot(ax + (bx - ax) * u, ay + (by - ay) * u, h0 + (h1 - h0) * u, fade, sz); }
    },
    // the whole screen tinted (a flash, the room darkening)
    screen(col, a) { if (a <= .003) return; fill(col, m === 'crisp' || m === 'white' ? Math.round(a * 4) / 4 : a); if (lastA > 0) g.fillRect(0, 0, VW, VH); },
    done() { g.globalAlpha = 1; lastA = 1; },
  };
  return B;
}
