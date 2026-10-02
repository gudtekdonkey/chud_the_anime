// ---- The skill bar (today's ui/skill-bar.js, in the items HUD's style): a row of small slots under health and Qi. Each
// slot shows its cooldown as a shade draining upward with the seconds left; a skill not mastered is a dark, keyless
// square. The slice's own slots are K (the paired execution's 5 s party cooldown, its pips the partners ready) and the
// roll; the skills ported to 3D (claude/3d-skills) register theirs with `addSkill` and keep their own cooldowns.
import './canvas.js';
import { g } from '../../screen.js';
import { slot, panel } from '../../ui/hud-kit.js';
import { text, textW } from '../../ui/pixfont.js';
import { COL } from '../../config.js';

const ICON_COL = { '#': COL.fx, '+': COL.fx2, w: '#ffffff', k: '#0d1012' };
const icon = rows => { const c = document.createElement('canvas'); c.width = c.height = 12; const cg = c.getContext('2d');
  rows.forEach((r, y) => [...r].forEach((ch, x) => { if (ICON_COL[ch]) { cg.fillStyle = ICON_COL[ch]; cg.fillRect(x, y, 1, 1); } })); return c; };
// today's icons (ui/skill-bar.js ICONS), the ones the slice shows
export const ICONS = {
  tele: icon(['............', '.+......ww..', '.......wwww.', '..++..wwwwww', '......wwwwww', '+++..#wwwwww', '......wwwwww', '..++..wwwwww', '.......wwww.', '.+......ww..', '............', '............']),
  slide: icon(['............', '............', '.........##.', '........###.', '..+++..####.', '.......###..', '.++++.#####.', '.....######.', '..+++.....##', '............', '.##########.', '............']),
};
// { k, key, icon, cd() seconds left, max() its length, known() mastered, on() casting now, pips() [n, lit] }
export const SKILLS = [];
export function addSkill(s) { const i = SKILLS.findIndex(o => o.k === s.k); if (i >= 0) SKILLS[i] = { ...SKILLS[i], ...s }; else SKILLS.push(s); }
// the slots the skills' port will fill: dark and keyless until then (owner: a locked key is refused like a cooldown)
for (const [k, key] of [['double', 'I'], ['moon', 'O'], ['rift', 'P'], ['mirror', 'N'], ['sweep', 'U'], ['breath', 'C']]) addSkill({ k, key, known: () => false });
const X0 = 5, Y0 = 25, SZ = 14, STEP = 15;
function count(x, y, t) { const s = t >= 1 ? String(Math.ceil(t)) : t.toFixed(1), tx = x + Math.round((SZ - textW(s)) / 2), ty = y + 5;
  for (const [ox, oy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) text(s, tx + ox, ty + oy, '#0c0d11'); text(s, tx, ty, '#ffffff'); }
export function drawSkillBar() {
  panel(X0, Y0, 3 + SKILLS.length * STEP + 2, SZ + 6);
  SKILLS.forEach((s, i) => { const x = X0 + 3 + i * STEP, y = Y0 + 3;
    if (s.known && !s.known()) { g.fillStyle = '#08090b'; g.fillRect(x, y, SZ, SZ); g.fillStyle = '#1c2025'; g.fillRect(x, y, SZ, 1); g.fillRect(x, y + SZ - 1, SZ, 1); g.fillRect(x, y, 1, SZ); g.fillRect(x + SZ - 1, y, 1, SZ); return; }
    const left = s.cd ? s.cd() : 0, max = s.max ? s.max() : left || 1;
    slot(x, y, SZ, 'skill', s.icon, { cd: left > 0 ? left / max : 0, frame: s.on && s.on() ? COL.fx2 : left > 0 ? '#2c323b' : undefined });
    if (left > 0) count(x, y, left); else text(s.key, x + 1, y + 1, '#7d868e');
    if (s.pips) { const [n, lit] = s.pips(), x0 = x + Math.round((SZ - (n * 3 - 1)) / 2);
      for (let j = 0; j < n; j++) { g.fillStyle = '#0c0d11'; g.fillRect(x0 + j * 3 - 1, y + SZ - 3, 4, 3); g.fillStyle = j < lit ? COL.fx : '#2c323b'; g.fillRect(x0 + j * 3, y + SZ - 2, 2, 1); } } });
}
