import { COL } from '../config.js';

// ---- Dummy targets: a small field, so area moves, mirrors and chains have something to find ----
export const DUMMIES = [[262, 170], [306, 196], [348, 178], [400, 192], [312, 118], [420, 244], [92, 208]]
  .map(([x, y]) => ({ x, y, flash: 0, wob: 0, zap: 0 }));
export function drawDummy(g, dummy) {
  const x = Math.round(dummy.x + Math.sin(dummy.wob * 40) * dummy.wob * 8), y = dummy.y;
  g.fillStyle = 'rgba(20,24,24,.35)'; g.fillRect(x - 6, y, 12, 2);
  const c = dummy.flash > 0 ? '#ffffff' : '#6d5a44';
  g.fillStyle = c; g.fillRect(x - 1, y - 22, 3, 22); g.fillRect(x - 7, y - 18, 15, 3);
  g.fillStyle = dummy.flash > 0 ? '#ffffff' : '#8a7458'; g.fillRect(x - 4, y - 28, 9, 8);
  if (!(dummy.flash > 0)) { g.fillStyle = COL.eye; g.fillRect(x, y - 25, 1, 1); }
}
