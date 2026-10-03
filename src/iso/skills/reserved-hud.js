// ---- The new skills on the HUD: four slots under the Qi meter at the bottom of the screen (as today's skill bar:
// each slot's cooldown a dark clockwise sweep with the seconds left, whole seconds then tenths under one; a refused
// press blinks the slot), and the words that pop over his head (COUNTER, BLOCK, ...). Drawn on the effects layer in
// render pixels, in the HUD's 3×5 pixel font (copied from ui/pixfont.js: the slice never imports today's game).
import { W } from 'ronin-engine/clock/world.js';
import { VW, VH } from 'ronin-engine/iso/gfx/view.js';
import { SKILLS, KIT, cdOf, tv } from './kit.js';
import { scr, CY } from 'ronin-engine/iso/skills/sfx.js';

const FONT = { A: '.#.|#.#|###|#.#|#.#', B: '##.|#.#|##.|#.#|##.', C: '.##|#..|#..|#..|.##', D: '##.|#.#|#.#|#.#|##.', E: '###|#..|##.|#..|###', F: '###|#..|##.|#..|#..',
  G: '.##|#..|#.#|#.#|.##', H: '#.#|#.#|###|#.#|#.#', I: '###|.#.|.#.|.#.|###', J: '..#|..#|..#|#.#|.#.', K: '#.#|#.#|##.|#.#|#.#', L: '#..|#..|#..|#..|###',
  M: '#.#|###|###|#.#|#.#', N: '##.|#.#|#.#|#.#|#.#', O: '.#.|#.#|#.#|#.#|.#.', P: '##.|#.#|##.|#..|#..', Q: '.#.|#.#|#.#|##.|.##', R: '##.|#.#|##.|#.#|#.#',
  S: '.##|#..|.#.|..#|##.', T: '###|.#.|.#.|.#.|.#.', U: '#.#|#.#|#.#|#.#|###', V: '#.#|#.#|#.#|#.#|.#.', W: '#.#|#.#|###|###|#.#', X: '#.#|#.#|.#.|#.#|#.#',
  Y: '#.#|#.#|.#.|.#.|.#.', Z: '###|..#|.#.|#..|###', 0: '###|#.#|#.#|#.#|###', 1: '.#.|##.|.#.|.#.|###', 2: '##.|..#|.#.|#..|###', 3: '##.|..#|.#.|..#|##.',
  4: '#.#|#.#|###|..#|..#', 5: '###|#..|##.|..#|##.', 6: '.##|#..|###|#.#|###', 7: '###|..#|.#.|.#.|.#.', 8: '###|#.#|###|#.#|###', 9: '###|#.#|###|..#|##.',
  '.': '...|...|...|...|.#.', '-': '...|...|###|...|...', ':': '...|.#.|...|.#.|...', ' ': '...|...|...|...|...' };
export const textW = (s, sc = 1) => s.length * 4 * sc - sc;
export function text(g, s, x, y, col, sc = 1, ink = '#05070a') {
  for (const pass of ink ? [ink, col] : [col]) { g.fillStyle = pass; const o = pass === ink ? 1 : 0;
    for (let i = 0; i < s.length; i++) { const gl = FONT[s[i].toUpperCase()]; if (!gl) continue; const rows = gl.split('|');
      for (let r = 0; r < 5; r++) for (let c = 0; c < 3; c++) if (rows[r][c] === '#') {
        if (o) { for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) g.fillRect(x + (i * 4 + c) * sc + dx * sc, y + r * sc + dy * sc, sc, sc); }
        else g.fillRect(x + (i * 4 + c) * sc, y + r * sc, sc, sc); } } } }

// 8×8 icons, one per skill: crossed blades (the counter), a blade coming home (recall), a bolt (chain), an hourglass (time)
const ICON = {
  counter: ['#......#', '.#....#.', '..#..#..', '...##...', '...##...', '..#..#..', '.#....#.', '#......#'],
  recall: ['......##', '.....##.', '....##..', '#..##...', '.###....', '.##.....', '####....', '........'],
  chain: ['....##..', '...##...', '..##....', '.######.', '....##..', '...##...', '..##....', '.##.....'],
  slice: ['########', '.#....#.', '..#..#..', '...##...', '...##...', '..#..#..', '.#....#.', '########'],
};
const S = 30, GAP = 8;
export function drawHud(g, extra = {}) {
  const n = SKILLS.length, w = n * S + (n - 1) * GAP, x0 = Math.round(VW / 2 - w / 2), y0 = VH - S - 18 - (extra.lift || 0);
  // the Qi meter, notched in thirds; full, it breathes
  const qy = y0 - 12, full = KIT.qi >= .999;
  g.fillStyle = 'rgba(5,7,10,.78)'; g.fillRect(x0 - 1, qy - 1, w + 2, 7); g.fillStyle = full ? (Math.floor(W.t * 3) % 2 ? CY[2] : CY[1]) : CY[0]; g.fillRect(x0, qy, Math.round(w * KIT.qi), 5);
  g.fillStyle = CY[3]; if (KIT.qi > 0) g.fillRect(x0, qy, Math.round(w * KIT.qi), 1);
  g.fillStyle = '#05070a'; for (const k of [1 / 3, 2 / 3]) g.fillRect(x0 + Math.round(w * k), qy, 1, 5);
  text(g, 'QI', x0 - 14, qy - 1, CY[1]);
  SKILLS.forEach((s, i) => {
    const x = x0 + i * (S + GAP), y = y0, cd = KIT.cd[s.id], blink = KIT.refused && KIT.refused.k === s.id && W.t - KIT.refused.t < .3 && Math.floor((W.t - KIT.refused.t) * 20) % 2 === 0;
    const dim = s.id === 'slice' && KIT.qi < tv('slice', 'cost') - 1e-6, lit = extra[s.id];
    g.fillStyle = 'rgba(8,10,13,.86)'; g.fillRect(x, y, S, S);
    g.fillStyle = blink ? '#ffffff' : cd > 0 || dim ? '#2b3138' : lit ? CY[2] : CY[0];
    g.fillRect(x, y, S, 1); g.fillRect(x, y + S - 1, S, 1); g.fillRect(x, y, 1, S); g.fillRect(x + S - 1, y, 1, S);
    const ic = ICON[s.id]; g.fillStyle = cd > 0 || dim ? '#4a5059' : lit ? CY[3] : CY[1];
    for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) if (ic[r][c] === '#') g.fillRect(x + 7 + c * 2, y + 6 + r * 2, 2, 2);
    if (cd > 0) { const k = cd / Math.max(1e-3, KIT.cdMax[s.id] || cdOf(s.id)), cx = x + S / 2, cy = y + S / 2;
      g.fillStyle = 'rgba(0,0,0,.62)'; g.beginPath(); g.moveTo(cx, cy); g.arc(cx, cy, S, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * k); g.closePath();
      g.save(); g.beginPath(); g.rect(x + 1, y + 1, S - 2, S - 2); g.clip(); g.beginPath(); g.moveTo(cx, cy); g.arc(cx, cy, S, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * k); g.closePath(); g.fill(); g.restore();
      const label = cd >= 1 ? String(Math.ceil(cd)) : cd.toFixed(1).slice(1); text(g, label, Math.round(cx - textW(label, 2) / 2), Math.round(cy - 5), '#ffffff', 2); }
    text(g, s.key, x + 2, y + S + 3, cd > 0 ? '#8b9592' : '#d9dfdd');
    if (dim) text(g, 'QI', x + S - 9, y + S + 3, '#8b9592');
  });
  // the words over his head: drift up and go
  KIT.pops = KIT.pops.filter(p => W.t - p.t < .9);
  for (const p of KIT.pops) { const k = (W.t - p.t) / .9, [px, py] = scr(p.x, 58 + k * 14, p.z), sc = p.text.length > 8 ? 1 : 2;
    if (k > .75 && Math.floor(W.t * 30) % 2) continue; text(g, p.text, Math.round(px - textW(p.text, sc) / 2), Math.round(py), p.col, sc); }
}
