// ---- What a personality does beyond how it stands and moves: which of the twenty idles it drifts into, and how a
// samurai with it fights (his patience before he cuts, how hard he presses, how careful he is, how a hit moves him).
// Keyed by the traits of src/traits/traits.js (shared with today's game, pure data); a trait missing here only shapes
// the body. Every number is per unit of the trait's strength, and a person's traits add (as mix.js adds knobs).
import { TRAITS } from '../../traits/traits.js';
import { IDLES } from '../anim/idles.js';

// today's fidgets (traits/fidgets.js) → the 3D idle that does the same thing
export const FIDGET_IDLE = { hatTip: 'adjustHat', hiltCheck: 'checkBlade', hiltThumb: 'hiltRest', neckCrack: 'neckCrack', shoulderRoll: 'shoulderRoll',
  footTap: 'footTap', weightShift: 'weightShift', stretch: 'stretch', sigh: 'slump', glance: 'glanceBack', nod: 'meditate', lookDown: 'slump',
  scratch: 'adjustHat', knuckles: 'readyCrouch', dustOff: 'flickRain', yawn: 'stretch', stumble: 'weightShift', flexHand: 'checkBlade', fixMantle: 'flickRain', toes: 'footTap' };

// a trait's own leanings toward idles (on top of its fidgets): weight per unit strength
export const IDLE_AFFINITY = {
  stoic: { breathe: 1, armsFolded: .6 }, proud: { armsFolded: 1, scanHorizon: .5 }, humble: { meditate: .6 }, regal: { breathe: .8, scanHorizon: .4 },
  hunched: { slump: .8 }, coiled: { readyCrouch: 1.2, hiltRest: .8 }, slouch: { slump: .7, leanSword: .5 }, soldier: { scanHorizon: .8, wipeBlade: .5 },
  lazy: { stretch: .8, leanSword: 1, kneelRest: .8 }, restless: { shoulderRoll: .6 }, twitchy: { shiver: .8 }, bouncy: {},
  weary: { slump: 1, kneelRest: 1, leanSword: .6 }, eager: { readyCrouch: .5 }, heavy: { leanSword: .4 }, lightFooted: {},
  calm: { breathe: 1, meditate: .6 }, nervous: { shiver: .7, hiltRest: .6, scanHorizon: .5 }, cocky: { armsFolded: .6, leanSword: .5 },
  brooding: { armsFolded: 1.4 }, cheerful: { breathe: .4 }, grim: { hiltRest: .8, armsFolded: .5 }, wary: { scanHorizon: 1, readyCrouch: .6 },
  melancholy: { slump: .6, breathe: .4 }, menacing: { neckCrack: .6, armsFolded: .5 }, serene: { meditate: 1.2, breathe: .6 },
  hatTipper: {}, hiltFiddler: { hiltRest: .6 }, glancer: {}, hummer: { breathe: .4 }, vain: { wipeBlade: .6 }, scratcher: {},
  limping: { kneelRest: .4 }, elder: { kneelRest: .6, breathe: .5 }, drunk: { leanSword: .6 }, lumbering: { leanSword: .5 }, nimble: {},
  wounded: { kneelRest: .9, shiver: .5 }, shinobi: { readyCrouch: 1, scanHorizon: .6 }, duelist: { hiltRest: 1, wipeBlade: .8, checkBlade: .5 },
  monk: { meditate: 1.5 }, brawler: { readyCrouch: .8 }, wanderer: { scanHorizon: .8, flickRain: .5 }, shadow: { readyCrouch: .5, meditate: .4 },
  scholar: { meditate: .5 }, veteran: { wipeBlade: .6, leanSword: .4 },
};

// how a samurai with the trait fights, per unit strength: patience (longer in his guard before he cuts), press (closes
// in nearer and cuts from further), caution (backs off after a hit, keeps his distance), grit (a hit moves him less)
export const BEHAVE = {
  stoic: { patience: .5, grit: .4 }, proud: { patience: .2, press: .2, caution: -.2 }, humble: { press: -.4, caution: .2 }, regal: { patience: .4, grit: .2 },
  hunched: { caution: .2 }, coiled: { patience: -.2, press: .3 }, slouch: { patience: .2, press: -.2 }, soldier: { press: .2, grit: .2 },
  lazy: { patience: .5, press: -.3 }, restless: { patience: -.5 }, twitchy: { patience: -.6, caution: .3, grit: -.3 }, bouncy: { patience: -.3 },
  weary: { patience: .3, press: -.3, grit: -.2 }, eager: { patience: -.5, press: .5, caution: -.3 }, heavy: { press: .2, grit: .5 }, lightFooted: { grit: -.3 },
  calm: { patience: .5 }, nervous: { patience: -.3, press: -.6, caution: .6, grit: -.4 }, cocky: { patience: -.4, press: .5, caution: -.4 },
  brooding: { patience: .3 }, cheerful: { patience: -.1 }, grim: { patience: .3, grit: .3 }, wary: { press: -.4, caution: .6 },
  melancholy: { press: -.3 }, menacing: { patience: -.2, press: .6, caution: -.4, grit: .2 }, serene: { patience: .6 },
  hiltFiddler: { patience: -.2 }, limping: { press: -.2, grit: -.2 }, elder: { patience: .3, press: -.3, caution: .3, grit: -.3 },
  drunk: { patience: -.3, caution: -.4, grit: -.3 }, lumbering: { patience: .2, grit: .6 }, nimble: { caution: .2, grit: -.3 },
  wounded: { press: -.5, caution: .5, grit: -.4 }, shinobi: { patience: .2, caution: .3 }, duelist: { patience: .2, press: .3 },
  monk: { patience: .5 }, brawler: { patience: -.4, press: .6, caution: -.3, grit: .2 }, wanderer: { patience: .2 }, shadow: { patience: .4, caution: .3 },
  scholar: { patience: .3, press: -.2 },
};
// the samurai as he was before personalities: guard 1.6 s before the cut, chase from 100 rig px, hold at 76, cut inside 48
export const PLAIN = Object.freeze({ patience: 1.6, chase: 100, hold: 76, reach: 48, recoil: 1, backOff: 0, speed: 1, traits: { patience: 0, press: 0, caution: 0, grit: 0 } });

// the trait list expanded through `like` (a veteran is grim first), each at its strength
export function expand(list) { const out = [];
  const go = (id, k, seen) => { const t = TRAITS[id]; if (!t) throw new Error(`unknown trait "${id}"`); if (seen.has(id)) return; seen.add(id); if (t.like) go(t.like, k, seen); out.push([id, k]); };
  for (const [id, k] of list) go(id, k, new Set()); return out; }

// a person's fighting numbers (PLAIN when they have no traits that bear on it)
export function behaveOf(list) {
  const s = { patience: 0, press: 0, caution: 0, grit: 0 }; let any = false;
  for (const [id, k] of expand(list)) { const b = BEHAVE[id]; if (b) for (const f in b) { s[f] += b[f] * k; any = true; } }
  if (!any) return PLAIN;
  const c = v => Math.max(-1, Math.min(1, v));
  for (const f in s) s[f] = c(s[f]);
  return { patience: PLAIN.patience * Math.exp(s.patience), chase: PLAIN.chase * (1 - .2 * s.press), hold: PLAIN.hold * (1 - .3 * s.press + .25 * Math.max(0, s.caution)),
    reach: PLAIN.reach * (1 + .12 * s.press), recoil: Math.exp(-.7 * s.grit), backOff: Math.max(0, s.caution), speed: 1 + .15 * s.press, traits: s };
}

// the idles a person drifts into, weighted: their traits' fidgets (as today's game picks them) and leanings
export function idlesOf(list, { armed = true } = {}) {
  const w = {};
  for (const [id, k] of expand(list)) { const t = TRAITS[id];
    for (const f of t.fidgets || []) { const i = FIDGET_IDLE[f]; if (i) w[i] = (w[i] || 0) + 1.2 * k; }
    for (const [i, x] of Object.entries(IDLE_AFFINITY[id] || {})) w[i] = (w[i] || 0) + x * k; }
  return Object.entries(w).filter(([i, x]) => x > .05 && (armed || !IDLES[i].blade)).sort((a, b) => b[1] - a[1]);
}

for (const tb of [IDLE_AFFINITY, BEHAVE]) for (const id in tb) { if (!TRAITS[id]) throw new Error(`persona: no trait "${id}"`); for (const i in tb === IDLE_AFFINITY ? tb[id] : {}) if (!IDLES[i]) throw new Error(`persona: no idle "${i}"`); }
for (const f in FIDGET_IDLE) if (!IDLES[FIDGET_IDLE[f]]) throw new Error(`persona: no idle "${FIDGET_IDLE[f]}"`);
