// ---- The new skills' kit in the slice: which keys, their cooldowns, the Qi meter Time Slice spends, the power tier,
// and growth (1B: a tree per skill, filled by landed casts, gated by power; the trees are data shared with today's game,
// player/trees-reserved.js). The slice has no kit screen yet, so the page's address picks what the Tab screen would:
// `&power=1..3`, `&pick=counter:b,chain:a` (a fork, for good), `&trees` (every tree full), `&qi=0..1` (the meter at start).
import { RESERVED_TREES as TREES } from '../../player/trees-reserved.js';

const Q = new URLSearchParams(location.search);
// keys, names and cooldowns (proposed, pending the owner: docs/design-notes.md). The counter's 1 s runs only after a
// stance that caught nothing (a counter gives it straight back); Time Slice also needs a full Qi meter
export const SKILLS = [
  { id: 'counter', key: 'F', code: 'KeyF', name: 'COUNTER', cd: 1 },
  { id: 'recall', key: 'R', code: 'KeyR', name: 'BLADE RECALL', cd: 6 },
  { id: 'chain', key: 'Q', code: 'KeyQ', name: 'LIGHTNING CHAIN', cd: 9 },
  { id: 'slice', key: 'X', code: 'KeyX', name: 'TIME SLICE', cd: 30 },
];
export const BY = Object.fromEntries(SKILLS.map(s => [s.id, s]));
const picks = Object.fromEntries((Q.get('pick') || '').split(',').filter(Boolean).map(s => s.split(':')));
export const KIT = {
  power: Math.max(1, Math.min(3, +(Q.get('power') || 1))), qi: Q.has('qi') ? Math.max(0, Math.min(1, +Q.get('qi'))) : 1,   // a full meter at the start, so X is there to try
  cd: Object.fromEntries(SKILLS.map(s => [s.id, 0])), cdMax: Object.fromEntries(SKILLS.map(s => [s.id, s.cd])),
  pts: Object.fromEntries(SKILLS.map(s => [s.id, 0])), pick: Object.fromEntries(SKILLS.map(s => [s.id, picks[s.id] || null])),
  casts: Object.fromEntries(SKILLS.map(s => [s.id, 0])), refused: null, pops: [], assist: Q.has('assist'),
};
// power's I / II / III numbers for these skills (as player/power.js TIERS): cooldowns ×1 / .9 / .8 (PW), Lightning
// Chain's links 3 / 4 / 5 (Storm Chain's), Time Slice's zone 80 / 110 / 150 world units round him, the recall's cut 2 / 2 / 3
const PCD = [1, .9, .8];
export const TIER = { links: [3, 4, 5], zone: [80, 110, 150], recall: [2, 2, 3] };
export const T = k => TIER[k][KIT.power - 1];

// ---- growth (player/mastery.js's rules): a cast counts once, when it lands; the tree's nodes as points and power allow ----
const AT = { rung: 3, fork: 8, deep: 16 }, NEED = { rung: 1, fork: 2, deep: 3 };
const MUL = new Set(['cd', 'reach', 'size', 'dist', 'r', 'ahead', 'dmg', 'refill', 'heal', 'cost']);   // as mastery.js: these multiply
const pts = k => Q.has('trees') ? Math.max(KIT.pts[k], AT.deep) : KIT.pts[k];
const on = (k, node) => pts(k) >= AT[node] && KIT.power >= NEED[node] && (node === 'rung' || !!KIT.pick[k]);
export function tv(k, key) {
  const t = TREES[k]; let v = MUL.has(key) ? 1 : 0;
  const add = fx => { if (fx && key in fx) v = MUL.has(key) ? v * fx[key] : v + fx[key]; };
  if (on(k, 'rung')) add(t.rung.fx);
  const b = KIT.pick[k] && t[KIT.pick[k]]; if (b && on(k, 'fork')) add(on(k, 'deep') ? b.deep : b.fx);
  return v;
}
const open = {};
export const castStart = k => { open[k] = true; KIT.casts[k]++; };
export function landed(k) { if (!open[k]) return; open[k] = false; KIT.pts[k]++; }

// ---- cooldowns and Qi ----
export const cdOf = k => BY[k].cd * PCD[KIT.power - 1] * tv(k, 'cd');
export function startCd(k, sec = cdOf(k)) { KIT.cd[k] = sec; KIT.cdMax[k] = Math.max(sec, 1e-3); }
export const ready = k => KIT.cd[k] <= 0;
export function refuse(k, t) { KIT.refused = { k, t }; }   // the slot blinks (hud.js)
export const qiAdd = x => { KIT.qi = Math.max(0, Math.min(1, KIT.qi + x)); };
export function kitTick(dt) { for (const k in KIT.cd) if (KIT.cd[k] > 0) KIT.cd[k] = Math.max(0, KIT.cd[k] - dt); }
// a word over someone's head (COUNTER, BLOCK, ...): world position in rig px, game time
export const pop = (text, x, z, t, col = '#b8fff6') => KIT.pops.push({ text, x, z, t, col });
