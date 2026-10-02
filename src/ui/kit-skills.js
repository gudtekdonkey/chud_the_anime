import { g } from '../screen.js';
import { INV } from '../state.js';
import { text, textW } from './pixfont.js';
import { SKILLS, KEY, NAME, TREES, AT, TIER, WILD_TO_KNOW, known, pts, on, whyNot, pickBranch } from '../player/mastery.js';
import { STATS, statOf, gearStats, ROSTER } from '../party/kit.js';
import { statLine } from '../player/stats.js';

// ---- The kit screen's half of growth: his SKILLS row (a tree per skill, the fork picked here) and his four stats ----
const CY = '#6ff3e4', WH = '#ffffff', GREY = '#7d868e', DIM = '#565e66', INK = '#e9eeee';
export const SK_ROW = { key: 'skills', name: 'SKILLS' };
export const skillAt = i => SKILLS[i];
const frame = (x, y, w, h, col) => { g.fillStyle = col; g.fillRect(x, y, w, 1); g.fillRect(x, y + h - 1, w, 1); g.fillRect(x, y, 1, h); g.fillRect(x + w - 1, y, 1, h); };
const nodeTag = (k, node) => on(k, node) ? 'ON' : pts(k) < AT[node] ? pts(k) + '/' + AT[node] : INV.power < TIER[node] ? 'POWER ' + ['I', 'II', 'III'][TIER[node] - 1] : '';

// the options for one skill's tree: the rung, the two branches (pick one, for good), the deep node
export function skillOptions(k) {
  const t = TREES[k], s = INV.sk[k], wild = known(k) ? '' : 'NOT MASTERED: ' + s.wild + '/' + WILD_TO_KNOW + ' WILD CASTS. ';
  const br = b => ({ label: b.toUpperCase() + ': ' + t[b].name, on: s.pick === b, first: !s.pick && b === 'a', tag: s.pick === b ? nodeTag(k, 'fork') : s.pick ? '' : 'FORK',
    about: wild + t[b].about + ' DEEPER (' + AT.deep + ', POWER III): ' + t[b].deepAbout, why: whyNot(k, b), act: () => pickBranch(k, b) });
  return [{ label: 'RUNG: ' + t.rung.name, tag: nodeTag(k, 'rung'), about: wild + t.rung.about + ' At ' + AT.rung + ' landed casts, any power.', act: () => '' },
    br('a'), br('b'),
    { label: 'DEEPER: ' + (s.pick ? t[s.pick].name : 'THE PICKED BRANCH'), tag: s.pick ? nodeTag(k, 'deep') : '', about: s.pick ? t[s.pick].deepAbout + ' At ' + AT.deep + ', power III.' : 'Pick a branch first.', act: () => '' }];
}
export const skillHover = k => ({ label: NAME[k] + ' (' + KEY[k] + ')', about: (known(k) ? '' : 'NOT MASTERED YET: A FULL METER CASTS IT BY ITSELF. ') +
  pts(k) + ' LANDED CASTS. RUNG AT ' + AT.rung + ', FORK AT ' + AT.fork + ' (POWER II), DEEPER AT ' + AT.deep + ' (POWER III). J TO SEE THE TREE.' });
// the row in the slots panel: a small square per skill, dark until mastered, a bar under it for the tree's points
export function drawSkillsRow(y, focus, sel, col, box, pickRow, i, KIT) {
  SKILLS.forEach((k, j) => { const x = 206 + j * 13, sy = y - 2, kn = known(k);
    g.fillStyle = kn ? 'rgba(12,13,17,.9)' : '#08090b'; g.fillRect(x, sy, 11, 10); frame(x, sy, 11, 10, kn ? '#3b424c' : '#1c2025');
    if (kn) text(KEY[k], x + 4, sy + 3, INV.sk[k].pick ? CY : INK);
    g.fillStyle = '#23272d'; g.fillRect(x, sy + 11, 11, 1); g.fillStyle = CY; g.fillRect(x, sy + 11, Math.round(11 * Math.min(1, pts(k) / AT.deep)), 1);
    if (focus && j === sel) frame(x - 1, sy - 1, 13, 12, col === 'slots' ? CY : GREY);
    box(x, sy, 11, 12, () => { KIT.sk = j; pickRow(i); }, skillHover(k)); });
}
// his four stats in the who panel, the way the proposal drew them: VIG 3 (1+2) TAKES 10% LESS
export function drawHeroStats(box) {
  const hero = ROSTER[0], gear = gearStats(hero);
  Object.entries(STATS).forEach(([k, St], i) => { const y = 190 + i * 6, v = statOf(hero, k), s = St.name + ' ' + v + ' (1+' + gear[k] + ')';
    text(St.name, 12, y, CY); text(String(v), 28, y, WH); text('(1+' + gear[k] + ')', 36, y, DIM);
    const m = statLine(k); text(m, 146 - textW(m), y, '#a9b1b6');
    box(12, y - 1, 134, 6, () => {}, { label: s, about: St.about + ' ' + m + '. He starts at 1; gear adds points and power multiplies on top.' }); });
}
