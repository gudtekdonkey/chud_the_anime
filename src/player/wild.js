import { COL } from '../config.js';
import { g } from '../screen.js';
import { P, INV } from '../state.js';
import { ring, spark, rr } from '../fx/util.js';
import { setState } from './actions.js';
import { meditate } from './mirror.js';
import { TAP, TC, RIFT, release } from './skills.js';
import { wildBreath } from './breath.js';
import { castStart, wildCast } from './mastery.js';
import { nearest } from '../world/enemies.js';
import { panel } from '../ui/hud-kit.js';
import { textW, text } from '../ui/pixfont.js';

// ---- Wild until he masters it (owner pick 2026-10-01, "2B"): a full meter (player/qi.js sets P.wild) casts that skill by itself ----
// as soon as he is free to act, at the nearest enemy, the way the key would at a medium charge. It empties the meter, except Breath of Qi,
// whose out-breaths spend it. Each one counts toward knowing the key (three) and, if it lands, a point in the tree.
export function wildGo() {
  const k = P.wild; if (!k) return false; P.wild = null;
  const e = nearest(P.x, P.y), dx = e ? e.x - P.x : P.face, dy = e ? e.y - P.y : 0, L = Math.hypot(dx, dy) || 1;
  if (e) P.face = Math.sign(dx) || P.face;
  const dir = [dx / L, dy / L];
  // the skill takes him: a flash and a crackle at his chest, the meter goes white
  P.flash = .05; INV.fx.qi = .2; ring(P.x, P.y - 13, 10, 6, .2, 1.6, COL.fx2);
  for (let i = 0; i < 8; i++) { const a = rr(0, 6.28); spark(P.x, P.y - 14, Math.cos(a) * rr(40, 90), Math.sin(a) * rr(30, 60), rr(.1, .2), i % 2 ? '#ffffff' : COL.fx2, true); }
  if (k !== 'breath') { P.qi = 0; P.qiIdle = 0; }
  castStart(k); wildCast(k);
  if (k === 'double') { setState('double'); P.hk = 'double'; P.blinkDir = dir; P.t = TAP; release(TC, .6); }   // the hold: Thousand Cuts
  else if (k === 'rift') { setState('double'); P.hk = 'rift'; P.blinkDir = dir; P.t = TAP; release(RIFT, .6); }
  else if (k === 'moon') { setState('moon'); P.pow = .6; }
  else if (k === 'mirror') meditate();
  else if (k === 'sweep') setState('sweep');
  else if (k === 'breath') wildBreath();
  return true;
}
// the line over his head: a few words for about two seconds while the fight goes on
export function drawLine() {
  const l = P.line; if (!l || P.state === 'exec') return;
  const w = textW(l.s), x = Math.round(P.x - w / 2), y = Math.round(P.y - 44 - P.z - Math.min(2, l.t * 12));
  g.save(); g.globalAlpha = Math.min(1, l.t * 8, (l.dur - l.t) * 4);
  panel(x - 3, y - 3, w + 6, 11); text(l.s, x, y, '#e9eeee'); g.restore();
}
