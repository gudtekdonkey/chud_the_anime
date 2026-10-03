// ---- Temper: how a person fights, read from the same personality traits that shape his idle and walk
// (src/traits, read-only here: the traits stay movement data; this table is their behaviour side, docs/squad-ai.md).
// Six knobs, 0..1, the plain fighter at .5:
//   bold        steps in, attacks sooner, breaks later          aggro      how often he swings (and steals a turn)
//   patience    waits for an opening, circles longer             caution    keeps his distance, flees sooner
//   discipline  keeps his place, his formation, his guard        wit        INTELLIGENCE: how good his choices are
// Owner's rule (dominion lane): intelligence decides how good the choices are, personality how willingly someone acts.
// So `wit` sets reaction time, target choice (the hurt, the archer), how much a taunt fools him and how well he parries;
// the other five weight how much he wants each option. Pure data and arithmetic: no engine, no drawing.
import { TRAITS } from '../traits/traits.js';

export const KNOBS = ['bold', 'aggro', 'patience', 'caution', 'discipline', 'wit'];
export const TEMPER0 = { bold: .5, aggro: .5, patience: .5, caution: .5, discipline: .5, wit: .5 };

// each trait's nudge to the knobs (a trait not listed nudges nothing; strength scales it, as the movement mix does)
export const TRAIT_TEMPER = {
  stoic: { patience: .2, discipline: .15 }, proud: { bold: .25, caution: -.2 }, humble: { bold: -.1, discipline: .1 }, regal: { bold: .1, discipline: .1, aggro: -.1 },
  hunched: { caution: .1 }, coiled: { aggro: .15, patience: -.1 }, slouch: { discipline: -.15 }, soldier: { discipline: .3, patience: .05 },
  lazy: { aggro: -.2, patience: .1, wit: -.1 }, restless: { patience: -.25, aggro: .1 }, twitchy: { caution: .2, patience: -.2 }, bouncy: { aggro: .05 },
  weary: { bold: -.1, aggro: -.1 }, eager: { aggro: .2, patience: -.15 }, heavy: { bold: .1, caution: -.05 }, calm: { patience: .25, caution: -.05 },
  nervous: { caution: .3, bold: -.25 }, cocky: { bold: .25, caution: -.25, discipline: -.1 }, brooding: { patience: .1 }, grim: { bold: .15, discipline: .1 },
  wary: { caution: .25, wit: .1 }, melancholy: { aggro: -.1 }, menacing: { aggro: .25, bold: .15 }, serene: { patience: .3, caution: -.1 },
  vain: { bold: .1, discipline: -.1 }, limping: { bold: -.1, caution: .1 }, elder: { wit: .2, bold: -.05, aggro: -.1 }, drunk: { wit: -.3, discipline: -.3, aggro: .15 },
  lumbering: { patience: .1, aggro: -.05 }, nimble: { aggro: .05, caution: .05 }, wounded: { bold: -.2, caution: .2 }, shinobi: { patience: .2, wit: .15, caution: .1 },
  duelist: { bold: .15, discipline: .15, wit: .1 }, monk: { patience: .25, discipline: .2 }, brawler: { aggro: .25, wit: -.1, bold: .1 }, wanderer: { caution: .05 },
  shadow: { patience: .2, caution: .1 }, scholar: { wit: .25, bold: -.1 }, veteran: { wit: .2, discipline: .2, caution: .05 },
};
const clamp01 = v => Math.max(0, Math.min(1, v));

// a person's temper from his traits ([[id, strength], ...], the movement mix's own list) and optional plain knobs on top
// (e.g. { wit: .8 } for a sharp officer, or the brief's words: { bold: .9 }). Unknown traits are ignored, never thrown on,
// so a trait added elsewhere (the persona work) only lacks a behaviour until it gets a row here.
export function temperOf(traits = [], extra = {}) {
  const t = { ...TEMPER0 };
  for (const [id, k = 1] of traits) { const d = TRAIT_TEMPER[id]; if (!d || !TRAITS[id]) continue; for (const n in d) t[n] += d[n] * k; }
  for (const n in extra) if (n in t) t[n] += extra[n] - TEMPER0[n];
  for (const n of KNOBS) t[n] = clamp01(t[n]);
  return t;
}
// the reaction time a wit gives (s): a sharp mind answers in a tenth, a dull one in four
export const reaction = wit => .1 + (1 - wit) * .3;
// a short word for the debug overlay and the panel ("bold, patient")
export function temperWords(t) { const w = []; for (const [k, hi, lo] of [['bold', 'bold', 'timid'], ['aggro', 'aggressive', 'restrained'], ['patience', 'patient', 'hasty'], ['caution', 'cautious', 'reckless'], ['discipline', 'disciplined', 'unruly'], ['wit', 'sharp', 'dull']]) { if (t[k] >= .68) w.push(hi); else if (t[k] <= .32) w.push(lo); } return w.join(', ') || 'steady'; }
