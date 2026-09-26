// ---- Which execution may play: every execution says what it needs, and the picker only offers the ones that fit ----
// needs.weapons: the weapons it can be done with (ids from weapons/weapons.js). SHEATHED is every weapon he draws from a
//   scabbard and sheathes on the click; LONG_SAYA the ones whose scabbard is long enough to swing or strike with. The yari has no scabbard.
// needs.hat: 'throwable' = he must be wearing a hat whose item has `throwable: true` (the wide-brimmed straw hat and the kasa).
// ending: only when no other enemy is on screen (the last kill of a fight, a chain's end).
// foes: the enemy tiers it may be done on: 'minion' (every samurai so far), 'elite', 'boss'.
// opening: only as the first kill of a fight. ending and opening are the two bookends; most executions are neither.
// rarity: 'common' | 'uncommon' | 'rare' | 'legendary'. It weights the pick, and rare and legendary are gated by power
//   (the power tier, 1..3: rare from II, legendary from III) unless a Qi boost is running, which also makes them far more likely.
// level: the character level it unlocks at (optional).
export const SHEATHED = ['katana', 'nodachi', 'tanto'], LONG_SAYA = ['katana', 'nodachi'], ANY = ['katana', 'nodachi', 'tanto', 'yari'];
const std = { weapons: SHEATHED };
const C = { rarity: 'common' }, U = { rarity: 'uncommon' }, R = { rarity: 'rare' }, L = { rarity: 'legendary' };
export const RULES = {
  // batch 1 (prototypes/14)
  'Behind the back': { ...std, ...C }, 'Through and past': { ...std, ...C }, 'Rising launch': { ...std, ...U }, 'Whirlwind': { ...std, ...U }, 'Far behind': { ...std, ...C },
  'Peek-a-boo': { ...std, ...C }, 'Peek-a-boo, from behind': { ...std, ...C },
  // batch 2 (prototypes/21)
  'Hat throw': { weapons: ANY, hat: 'throwable', ...U },
  'Standoff': { ...std, ...U, opening: true },   // a duel: only to open a fight
  'Shadow step': { ...std, ...U },
  'Bare hand': { weapons: ANY, ...C },                       // he never draws
  'Three of me': { ...std, ...R },
  'Topknot': { ...std, ...C },
  'Pommel': { weapons: LONG_SAYA, ...C },                    // the sheathed sword out of the sash, pommel first
  'The bow': { ...std, ...U, opening: true },   // a formal bow before the first kill
  'Overload': { ...std, ...L },
  'Vault': { ...std, ...R },
  // batch 3 (prototypes/22)
  'Lattice': { ...std, ...R },
  'Kick Launch': { ...std, ...R },
  'Shuriken Rain': { weapons: ANY, ...R },                   // was Blade Rain; the stars do the work
  'Still Heart': { weapons: ANY, ending: true, ...U },       // no blade at all, and only when nobody else is left to see it
  'Reflection': { ...std, ...U },
  'Scabbard': { weapons: LONG_SAYA, ...C },                  // swung in its scabbard like a club
  'Half Moon': { ...std, ...U },
  'Walk By': { ...std, ending: true, ...C },                 // no hurry, because there is nobody left
  'Rewind': { ...std, foes: ['elite', 'boss'], ...R },       // too much for a minion
  'Fault Line': { ...std, ...L },
  // batch 4 (prototypes/28): one strange idea each, so none of them is common
  'Shadow Cut': { weapons: ANY, ...U },                     // his shadow draws, not him
  'Echo Line': { ...std, ...R },
  'Static Cage': { weapons: ANY, ...R },
  'Sky Split': { ...std, ...L },
  'The Thread': { weapons: ANY, ...U },                     // a thread from his sleeve; no blade
  'Floor Flip': { ...std, ...R },
  'Resonance': { ...std, ...U },                            // the scabbard's click: needs one
  'Derez': { ...std, ...R },
};
const need = name => ({ weapons: SHEATHED, hat: null, ending: false, opening: false, foes: ['minion', 'elite', 'boss'], rarity: 'common', level: 1, ...RULES[name] });
export const RARITY = { common: { w: 10, power: 1 }, uncommon: { w: 5, power: 1 }, rare: { w: 2, power: 2 }, legendary: { w: .6, power: 3 } };
const BOOST = { common: 1, uncommon: 1.5, rare: 4, legendary: 8 };   // how much a Qi boost favours each rarity

// ctx: { weapon: 'katana', hat: the worn hat item or null, others: enemies on screen besides the target, foe: the target's tier,
//   first: is this the first kill of the fight, power: 1..3, level, boost: is a Qi boost running }
export function eligible(name, ctx) {
  const n = need(name);
  if (n.opening && !ctx.first) return false;
  if ((ctx.level || 1) < n.level) return false;
  if (!ctx.boost && (ctx.power || 1) < RARITY[n.rarity].power) return false;
  if (!n.weapons.includes(ctx.weapon)) return false;
  if (n.hat === 'throwable' && !(ctx.hat && ctx.hat.throwable)) return false;
  if (n.ending && ctx.others > 0) return false;
  return n.foes.includes(ctx.foe || 'minion');
}
// a weighted random pick of the eligible executions in `names`, never the same one twice running; null when none fits
export function pick(names, ctx, last = null, rnd = Math.random) {
  const ok = names.filter(n => eligible(n, ctx)), fresh = ok.length > 1 ? ok.filter(n => n !== last) : ok;
  if (!fresh.length) return null;
  const w = fresh.map(n => { const r = need(n).rarity; return RARITY[r].w * (ctx.boost ? BOOST[r] : 1); });
  let x = rnd() * w.reduce((a, b) => a + b, 0);
  for (let i = 0; i < fresh.length; i++) if ((x -= w[i]) < 0) return fresh[i];
  return fresh[fresh.length - 1];
}
