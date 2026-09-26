import { COL } from '../config.js';
import { P } from '../state.js';
import { SHEETS } from '../anims/sheets.js';
import { rr, spark } from '../fx/util.js';
import { frameOf } from './actions.js';
import { EL } from '../fx/element.js';

// ---- His silhouette: edge pixels of the current frame, so charge sparks, bolts and motes land ON his body ----
const SIL = new WeakMap();
export function silPts(sh, f) {
  let m = SIL.get(sh); if (!m) SIL.set(sh, m = new Map());
  if (m.has(f)) return m.get(f);
  const out = []; out.top = [];
  try { const c = document.createElement('canvas'); c.width = sh.fw; c.height = sh.fh; const cg = c.getContext('2d');
    cg.drawImage(sh.img, f * sh.fw, 0, sh.fw, sh.fh, 0, 0, sh.fw, sh.fh);
    const d = cg.getImageData(0, 0, sh.fw, sh.fh).data, A = (x, y) => x >= 0 && y >= 0 && x < sh.fw && y < sh.fh && d[(y * sh.fw + x) * 4 + 3] > 40;
    for (let y = 0; y < sh.fh; y++) for (let x = 0; x < sh.fw; x++) if (A(x, y) && !(A(x - 1, y) && A(x + 1, y) && A(x, y - 1) && A(x, y + 1))) out.push([(x - sh.ox) / (sh.s || 1), (y - sh.oy) / (sh.s || 1)]);
    const top = Math.min(...out.map(q => q[1])); out.top = out.filter(q => q[1] < top + 11); } catch (e) { /* an unreadable strip just gets no body-bound sparks */ }
  m.set(f, out); return out;
}
export const bodyPt = q => { q = q[Math.random() * q.length | 0]; return [Math.round(P.x + P.trem) + (P.face > 0 ? q[0] : -q[0] - 1), Math.round(P.y - P.z) + q[1]]; };
// faint motes lifting off his hat and shoulders (the charge glow, the meditation aura)
export function motes(p) { const sil = silPts(SHEETS[P.state], frameOf()); if (!sil.top.length || Math.random() > p) return;
  const [x, y] = bodyPt(sil.top); if (EL.cur.kit) return EL.cur.kit.aura(...bodyPt(sil), 0); spark(x, y - 1, rr(-4, 4), -rr(6, 14), rr(.5, .9), Math.random() < .6 ? COL.fx : COL.fx2, false, -14); }
// the glow: 0 when calm, grows with the charge; the meditation aura and the storm borrow it faintly
export const glowK = () => P.charge != null && !P.cv ? .3 + .7 * P.charge : P.state === 'meditate' ? P.aura : P.storm > 0 && Math.random() < .35 ? .12 : 0;
