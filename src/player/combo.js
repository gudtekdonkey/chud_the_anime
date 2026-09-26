import { P, INV } from '../state.js';

// ---- The J combo ladder and Flow ----
// Basic skill grows through use (owner, 2026-09-26: skills upgrade by usage): every basic cut that lands is one point,
// and the points unlock a longer chain, from the two cuts he starts with up to six. Held on INV so it outlives a weapon swap.
export const LADDER = [0, 0, 40, 120, 250, 450];   // landed cuts needed for cut 1..6 (cut n unlocks at LADDER[n - 1])
export const comboMax = () => { let n = 0; while (n < 6 && INV.basic >= LADDER[n]) n++; return n; };
// each cut's beats: sk the strike, lunge px/s through it, the crescent's rot/flip, big for the finisher; go is the chain beat
// (J pressed after 0.15 s flows into the next cut from here). The poses per weapon are in anims/poses.js and src/weapons/
export const CUTS = {
  slash1:  { n: 1, sk: .16, lunge: 85, rot: .15, flip: 1 },
  slash1r: { n: 1, sk: .16, lunge: 85, rot: .15, flip: 1 },
  slash2:  { n: 2, sk: .14, lunge: 60, rot: -.35, flip: -1 },
  slash3:  { n: 3, sk: .12, lunge: 70, rot: .55, flip: 1 },
  slash4:  { n: 4, sk: .13, lunge: 55, rot: -.6, flip: -1 },
  slash5:  { n: 5, sk: .13, lunge: 120, rot: 0, flip: 1 },
  slash6:  { n: 6, sk: .2, lunge: 90, rot: .35, flip: 1, big: true, hop: [.06, .2] },
};
export const GO = .3;
export const nextCut = s => { const n = CUTS[s].n; return n < comboMax() ? 'slash' + (n + 1) : null; };

// Flow, the passive: chain any six basic cuts (each landing within FLOW_GAP of the last, no skill in between) and the next
// skill that is still cooling down casts anyway. Slide is movement, not a skill; ultimates (Time Slice, full Qi) never get it.
export const FLOW_N = 6, FLOW_GAP = 1.6, FLOW_KEEP = 8;
export const FLOW_KEYS = new Set(['tele', 'double', 'moon', 'rift', 'mirror', 'sweep']);
// a basic cut landed (once per cut, however many it hit)
export function landCut() {
  if (P.ev.counted) return; P.ev.counted = true;
  INV.basic++; const m = comboMax(); if (m > P.comboSeen) { P.comboSeen = m; P.comboUp = 1.2; }
  P.flowN = (P.flowGap > 0 ? P.flowN : 0) + 1; P.flowGap = FLOW_GAP; P.flowPip = .15;
  if (P.flowN >= FLOW_N) { P.flowN = 0; P.flowGap = 0; P.flow = FLOW_KEEP; P.flowPop = .35; }
}
// casting any skill breaks the count (Flow already earned stays)
export const breakChain = () => { P.flowN = 0; P.flowGap = 0; };
export function updateFlow(dt) {
  if (P.flowGap > 0 && (P.flowGap -= dt) <= 0) P.flowN = 0;
  P.flow = Math.max(0, P.flow - dt); P.flowPop = Math.max(0, P.flowPop - dt); P.flowPip = Math.max(0, P.flowPip - dt); P.comboUp = Math.max(0, P.comboUp - dt);
}
