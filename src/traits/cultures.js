import { TRAITS } from './traits.js';

// ---- Cultures: how a people carry themselves ----
// A culture is a shared trait mix everyone from it moves with (its mannerisms), plus a pool of personal traits:
// each person draws `each` of them at a random strength, so a crowd shares a manner but no two move alike.
// These are starters to show the shape; the cultures and places work replaces or extends them.
export const CULTURES = {
  court: { name: 'Imperial court', about: 'Upright and unhurried, hands out of sight, everything measured.',
    traits: [['regal', .7], ['serene', .5]], pool: ['proud', 'vain', 'scholar', 'hatTipper', 'calm'], each: 1 },
  clan: { name: 'Samurai clan', about: 'Drilled and watchful: hand near the hilt, feet set, never idle.',
    traits: [['duelist', .7], ['soldier', .4]], pool: ['grim', 'stoic', 'wary', 'veteran', 'hiltFiddler', 'proud'], each: 1 },
  monastery: { name: 'Mountain monastery', about: 'Palms together, slow breath, a quiet walk.',
    traits: [['monk', .8], ['calm', .6]], pool: ['elder', 'serene', 'humble', 'lightFooted', 'sigher'], each: 1 },
  port: { name: 'Port town', about: 'Loud and loose: rolling sailor\'s gait, shoulders rolling, a swagger.',
    traits: [['heavy', .5], ['hummer', .6]], pool: ['cocky', 'cheerful', 'drunk', 'lazy', 'knuckleCracker', 'brawler'], each: 1 },
  outlaws: { name: 'Bandit hills', about: 'Hunched, restless, always checking behind them.',
    traits: [['wary', .7], ['slouch', .5]], pool: ['menacing', 'nervous', 'cocky', 'limping', 'glancer', 'neckCracker'], each: 1 },
  village: { name: 'Farming village', about: 'Worn by the fields: bowed heads, heavy steps, humble.',
    traits: [['humble', .6], ['weary', .5]], pool: ['elder', 'cheerful', 'lazy', 'shoulderRoller', 'footTapper', 'scratcher'], each: 1 },
  shinobi: { name: 'Shadow village', about: 'Low, silent, still: they glide rather than walk.',
    traits: [['shadow', .8], ['shinobi', .6]], pool: ['coiled', 'nimble', 'stoic', 'glancer'], each: 1 },
};

// a small seeded random, so the same person always moves the same way
const rng = seed => { let a = seed * 2654435761 >>> 0; return () => { a = a + 0x6d2b79f5 >>> 0; let t = Math.imul(a ^ a >>> 15, 1 | a);
  t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; };   // mulberry32
// one person of a culture: its shared traits, then their own (seed: any number, e.g. an enemy's spawn index)
export function personOf(id, seed = 0) {
  const c = CULTURES[id]; if (!c) throw new Error(`unknown culture "${id}"`);
  const r = rng(seed + 1), pool = [...c.pool], own = [];
  for (let i = 0; i < (c.each ?? 1) && pool.length; i++) own.push([pool.splice(r() * pool.length | 0, 1)[0], Math.round((.5 + r() * .6) * 10) / 10]);
  return [...c.traits, ...own];
}
// add a culture of your own (or replace one) at runtime
export function defineCulture(id, spec) { checkCulture(id, spec); CULTURES[id] = spec; }
function checkCulture(id, c) {
  if (!c.name || !c.traits) throw new Error(`culture "${id}" needs a name and traits`);
  for (const t of [...c.traits.map(p => p[0]), ...(c.pool || [])]) if (!TRAITS[t]) throw new Error(`culture "${id}": no trait "${t}"`);
}
for (const id in CULTURES) checkCulture(id, CULTURES[id]);
