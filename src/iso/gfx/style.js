// ---- THE STYLE: how the 3D look is rendered and how often its frames are drawn, the "Ronin 3D Styles" page's
// styles 1–4 (owner 2026-10-02: "Painterly with Anime Limited clashing and attack full screen animation also";
// "is it possible … to switch between pixel render and anime limited?"). A style sets the pipeline's steps (each still
// a toggle afterwards), the shader's light (`SH.uStyle`), the outline, the blade's trail and the display's frame
// stepping. It never touches gameplay: the game steps at a fixed 60 Hz whatever is drawn.
//   0 Toon + dither   4 toon bands, ordered dither, rim; 30 fps, eased (the 3D faces page's picks)
//   1 Pixel-render    the low-res target, 3 hard bands, the palette, a 1 px outline; 12 fps held poses, crisp smears
//   2 Anime limited   two-tone cel and a hot spot, ink outlines; on threes (8 fps) at rest, on ones (24 fps) round a hit
//   3 Painterly       smooth light broken by brush strokes, warm lights and cool shadows, a soft wide rim, a dark
//                     silhouette line; 60 fps, poses pushed further, squash and stretch, a soft gradient trail
import { PIPE } from './post.js';
import { SH } from './shade.js';

export const STYLES = [
  { name: 'Toon + dither', pipe: { lowres: 0, toon: 1, dither: 1, palette: 0, outline: 0, bands: 4 }, fps: 30, trail: 'dither', line: [1, '#060709', 0] },
  { name: 'Pixel-render', pipe: { lowres: 1, toon: 1, dither: 0, palette: 1, outline: 1, bands: 3 }, fps: 12, trail: 'crisp', line: [1, '#06070a', 0] },
  { name: 'Anime limited', pipe: { lowres: 0, toon: 1, dither: 0, palette: 0, outline: 1, bands: 4 }, fps: 'anime', trail: 'white', line: [1.3, '#0a0a12', 0] },
  { name: 'Painterly', pipe: { lowres: 0, toon: 0, dither: 0, palette: 0, outline: 1, bands: 4 }, fps: 60, trail: 'soft', line: [1.6, '#120a0e', 1], exag: 1.22, squash: 1 },
];
export const STYLE = { i: 3, get s() { return STYLES[this.i]; } };
// the outline's width (in render pixels at k = 1), colour and whether it rings the characters only
export function setStyle(i) { STYLE.i = i; const s = STYLES[i]; Object.assign(PIPE, s.pipe, { line: s.line }); SH.uStyle.value = i; if (PIPE.onChange) PIPE.onChange(); }
// how many frames a second an actor is drawn at, in this style; the anime style goes on ones round a hit
export function fpsFor(a) {
  const f = STYLE.s.fps; if (f !== 'anime') return f;
  const c = a.clip; let near = a.W && a.W.t - (a.hitAt ?? -9) < .14;
  if (c && c.keys) for (const k of c.keys) if ((k.ev === 'hit' || k.ev === 'strike') && a.ct >= k.t - .1 && a.ct < k.t + .14) near = true;
  return near ? 24 : 8;
}
