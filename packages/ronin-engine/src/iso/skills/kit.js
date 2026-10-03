// ---- A skill kit: the keys a game defines (rows), their cooldowns, a Qi meter, the power tier, and growth (owner pick
// 1B in chud_the_anime: a tree per skill, filled by landed casts, gated by power). The page's address picks what a kit
// screen would: `&power=1..3`, `&pick=counter:b,chain:a` (a fork, for good), `&trees` (every tree full), `&qi=0..1`.
//   defineKit({ skills: [{ id, key, code, name, cd }], trees: { id: { rung, a, b } }, tier: { name: [I, II, III] } })
const Q = new URLSearchParams(location.search);
export const SKILLS = [], BY = {}, TREES = {}, TIER = {};
const picks = Object.fromEntries((Q.get('pick') || '').split(',').filter(Boolean).map(s => s.split(':')));
export const KIT = {
  power: Math.max(1, Math.min(3, +(Q.get('power') || 1))), qi: Q.has('qi') ? Math.max(0, Math.min(1, +Q.get('qi'))) : 1,   // a full meter at the start, so a costly key is there to try
  cd: {}, cdMax: {}, pts: {}, pick: {}, casts: {}, refused: null, pops: [], assist: Q.has('assist'),
};
export function defineKit({ skills = [], trees = {}, tier = {} } = {}) {
  for (const s of skills) { SKILLS.push(s); BY[s.id] = s;
    KIT.cd[s.id] = 0; KIT.cdMax[s.id] = s.cd; KIT.pts[s.id] = 0; KIT.pick[s.id] = picks[s.id] || null; KIT.casts[s.id] = 0; }
  Object.assign(TREES, trees); Object.assign(TIER, tier);
}
// power's I / II / III: cooldowns ×1 / .9 / .8 (as chud_the_anime's player/power.js PW), a tier's numbers by the game
const PCD = [1, .9, .8];
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
