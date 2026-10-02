import { P, S, INV } from '../state.js';
import { RESERVED_TREES } from './trees-reserved.js';

// ---- Growth (owner picks 2026-10-01, "Ronin Growth Ideas": 1B a tree per skill gated by power, 2B wild until he masters it) ----
// Both live on INV.sk (state.js) so the HUD and the kit screen read them. The page's skills picker (S.skillTest) overrides for testing:
// 'played' as earned, 'mastered' every key works, 'trees' every key works and every tree is full, 'wild:<skill>' as earned with the wild pick forced.

// the skills with a tree, in the skill bar's order; K is known from the start (executions are core), J grows by its own ladder (combo.js)
export const SKILLS = ['double', 'moon', 'rift', 'mirror', 'sweep', 'tele', 'breath'];
export const KEY = { double: 'I', moon: 'O', rift: 'P', mirror: 'N', sweep: 'U', tele: 'K', breath: 'C' };
export const NAME = { double: 'DOUBLE SLASH', moon: 'CRESCENT MOON', rift: 'CROSS RIFT', mirror: 'MIRROR MEDITATION', sweep: 'SKY DROP', tele: 'GLITCH STEP', breath: 'BREATH OF QI' };
const sk = k => INV.sk[k];
const test = () => S.skillTest || 'played';
export const known = k => !sk(k) || test() === 'mastered' || test() === 'trees' || sk(k).known;
export const allKnown = () => SKILLS.every(known);

// ---- 2B: a full meter casts a skill he has not mastered, by itself, at the nearest enemy; three of the same and its key works ----
export const LINES = ["What's happening to me?", 'That again.', 'I think I can hold it.'];
export const WILD_TO_KNOW = 3;
export function pickWild() {
  const f = test().startsWith('wild:') && test().slice(5);
  if (f && !known(f)) return f;
  const pool = SKILLS.filter(k => !known(k));
  return pool[Math.floor(Math.random() * pool.length)] || null;
}
// a wild cast went off: count it, say the line, and the third one unlocks the key
export function wildCast(k) {
  const s = sk(k); s.wild = Math.min(WILD_TO_KNOW, s.wild + 1);
  P.line = { s: LINES[s.wild - 1], t: 0, dur: 2.2 };
  if (s.wild >= WILD_TO_KNOW) { s.known = true; P.cdPop[k] = .5; }
}

// ---- 1B: casting earns points in the skill's own tree: one rung, a fork of two branches, one deeper node ----
// Use fills it; power decides how deep he may go (rung at I, fork at II, deep at III). Picks are made on the Tab kit screen. No respec.
// Placeholder numbers (owner left them to Claude): points for each node, and each node's effect as { key: value }.
export const AT = { rung: 3, fork: 8, deep: 16 }, TIER = { rung: 1, fork: 2, deep: 3 };
// keys that multiply (default 1); everything else adds (default 0)
const MUL = new Set(['cd', 'reach', 'size', 'dist', 'r', 'ahead', 'dmg', 'refill', 'heal', 'cost']);
export const TREES = {
  double: { rung: { name: 'QUICK HANDS', about: 'The double slash cools down 15% sooner.', fx: { cd: .85 } },
    a: { name: 'THOUSAND MORE', about: 'Thousand Cuts lands 2 more cuts in the same vanish.', deepAbout: '4 more cuts.', fx: { cuts: 2 }, deep: { cuts: 4 } },
    b: { name: 'WIDE X', about: 'The double slash\'s crossing cuts reach 25% further.', deepAbout: '50% further.', fx: { reach: 1.25 }, deep: { reach: 1.5 } } },
  moon: { rung: { name: 'FULL MOON', about: 'The crescent is 10% bigger.', fx: { size: 1.1 } },
    a: { name: 'LINGERING', about: 'The moon hangs 0.15 s longer before it shatters.', deepAbout: '0.3 s longer, and it cuts 25% harder.', fx: { hold: .15 }, deep: { hold: .3, dmg: 1.25 } },
    b: { name: 'TIDE', about: 'Whatever it cuts is dragged toward him.', deepAbout: 'Dragged twice as hard.', fx: { pull: 60 }, deep: { pull: 120 } } },
  rift: { rung: { name: 'LONG STEP', about: 'The dash into the rift goes 15% further.', fx: { dist: 1.15 } },
    a: { name: 'DEEP TEAR', about: 'The X tears 20% bigger.', deepAbout: '40% bigger.', fx: { size: 1.2 }, deep: { size: 1.4 } },
    b: { name: 'AFTERSHOCK', about: 'A smaller second detonation where the X was.', deepAbout: 'The second detonation is bigger.', fx: { echo: .45 }, deep: { echo: .7 } } },
  mirror: { rung: { name: 'ONE MORE', about: 'One more mirror image.', fx: { more: 1 } },
    a: { name: 'TWIN CUTS', about: 'Each image cuts twice.', deepAbout: 'And its target bursts on the second cut.', fx: { twice: 1 }, deep: { twice: 2 } },
    b: { name: 'FAR SIGHT', about: 'Images seek enemies half again as far, and one more steps out.', deepAbout: 'Two more step out.', fx: { range: 100, more: 1 }, deep: { range: 100, more: 2 } } },
  sweep: { rung: { name: 'WIDE CRATER', about: 'The crater is 10% wider.', fx: { r: 1.1 } },
    a: { name: 'THUNDERHEAD', about: 'Four bolts climb out of the cracks.', deepAbout: 'Seven bolts.', fx: { pillars: 4 }, deep: { pillars: 7 } },
    b: { name: 'FROM HIGHER', about: 'He drops from further ahead and lands 25% harder.', deepAbout: 'Further still, 50% harder.', fx: { ahead: 1.3, dmg: 1.25 }, deep: { ahead: 1.6, dmg: 1.5 } } },
  tele: { rung: { name: 'LONG BLINK', about: 'The glitch teleport goes 10 px further.', fx: { blink: 10 } },
    a: { name: 'RESTLESS', about: 'Blink charges come back after 45 s, not a minute.', deepAbout: 'After 30 s.', fx: { refill: .75 }, deep: { refill: .5 } },
    b: { name: 'REAPER', about: 'Each execution gives 10% Qi.', deepAbout: '20% Qi.', fx: { qi: .1 }, deep: { qi: .2 } } },
  breath: { rung: { name: 'DEEP LUNGS', about: 'Each out-breath heals 15% more.', fx: { heal: 1.15 } },
    a: { name: 'STILL WATER', about: 'Each out-breath spends 20% less Qi.', deepAbout: '35% less.', fx: { cost: .8 }, deep: { cost: .65 } },
    b: { name: 'SECOND WIND', about: 'Each out-breath takes 0.5 s off every cooldown.', deepAbout: '1 s.', fx: { cool: .5 }, deep: { cool: 1 } } },
  // F, R, Q and X: built in the iso slice first, their trees as data here (not in SKILLS until today's game has the keys)
  ...RESERVED_TREES,
};
export const pts = k => test() === 'trees' ? Math.max(sk(k).pts, AT.deep) : sk(k).pts;
// is this node of the tree working now: enough points, enough power, and (past the rung) the branch picked
export const on = (k, node) => pts(k) >= AT[node] && INV.power >= TIER[node] && (node === 'rung' || !!sk(k).pick);
// a tree's value for one key, every working node summed (or multiplied)
export function tv(k, key) {
  const t = TREES[k]; let v = MUL.has(key) ? 1 : 0;
  const add = fx => { if (fx && key in fx) v = MUL.has(key) ? v * fx[key] : v + fx[key]; };
  if (on(k, 'rung')) add(t.rung.fx);
  const b = sk(k).pick && t[sk(k).pick];
  if (b && on(k, 'fork')) add(on(k, 'deep') ? b.deep : b.fx);
  return v;
}
// why a branch cannot be picked now ('' when it can)
export function whyNot(k, b) {
  const s = sk(k);
  if (s.pick) return s.pick === b ? '' : 'NO RESPEC: ' + TREES[k][s.pick].name + ' IS CHOSEN';
  if (!known(k)) return 'NOT MASTERED YET';
  if (pts(k) < AT.fork) return 'NEEDS ' + AT.fork + ' LANDED CASTS';
  if (INV.power < 2) return 'NEEDS POWER II';
  return '';
}
export function pickBranch(k, b) { const why = whyNot(k, b); if (why) return why; if (sk(k).pick) return ''; sk(k).pick = b; return TREES[k][b].name + ' CHOSEN'; }

// a cast counts once, and only when it lands on someone (like J): castStart opens it, the first landed hit counts it
const open = {};
export const castStart = k => { if (sk(k)) open[k] = true; };
export function landed(k) { if (!open[k]) return; open[k] = false; sk(k).pts++; }
// which skill a hit kind belongs to (the kinds of player/qi.js QI_GAIN)
const OF = { d: 'double', tc: 'double', cm: 'moon', cmT: 'moon', cmS: 'moon', cmSt: 'moon', cr: 'rift', crB: 'rift', crE: 'rift', mi: 'mirror', sw: 'sweep' };
export const skillOf = base => OF[base] || null;

// the line over his head: a few words for ~2 s while the fight goes on
export function updateLine(dt) { if (P.line && (P.line.t += dt) > P.line.dur) P.line = null; }
