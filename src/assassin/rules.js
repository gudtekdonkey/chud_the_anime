// ---- Which execution may play: every execution says what it needs, and the picker only offers the ones that fit ----
// needs.weapons: the weapons it can be done with (ids from weapons/weapons.js). SHEATHED is every weapon he draws from a
//   scabbard and sheathes on the click; LONG_SAYA the ones whose scabbard is long enough to swing or strike with. The yari has no scabbard.
// needs.hat: 'throwable' = he must be wearing a hat whose item has `throwable: true` (the wide-brimmed straw hat and the kasa).
// ending: only when no other enemy is on screen (the last kill of a fight, a chain's end).
// foes: the enemy tiers it may be done on: 'minion' (every samurai so far), 'elite', 'boss'.
export const SHEATHED = ['katana', 'nodachi', 'tanto'], LONG_SAYA = ['katana', 'nodachi'], ANY = ['katana', 'nodachi', 'tanto', 'yari'];
const std = { weapons: SHEATHED };
export const RULES = {
  // batch 1 (prototypes/14)
  'Behind the back': std, 'Through and past': std, 'Rising launch': std, 'Whirlwind': std, 'Far behind': std,
  'Peek-a-boo': std, 'Peek-a-boo, from behind': std,
  // batch 2 (prototypes/21)
  'Hat throw': { weapons: ANY, hat: 'throwable' },
  'Standoff': std,
  'Shadow step': std,
  'Bare hand': { weapons: ANY },                       // he never draws
  'Three of me': std,
  'Topknot': std,
  'Pommel': { weapons: LONG_SAYA },                    // the sheathed sword out of the sash, pommel first
  'The bow': std,
  'Overload': std,
  'Vault': std,
  // batch 3 (prototypes/22)
  'Lattice': std,
  'Kick Launch': std,
  'Shuriken Rain': { weapons: ANY },                   // was Blade Rain; the stars do the work
  'Still Heart': { weapons: ANY, ending: true },       // no blade at all, and only when nobody else is left to see it
  'Reflection': std,
  'Scabbard': { weapons: LONG_SAYA },                  // swung in its scabbard like a club
  'Half Moon': std,
  'Walk By': { ...std, ending: true },                 // no hurry, because there is nobody left
  'Rewind': { ...std, foes: ['elite', 'boss'] },       // too much for a minion
  'Fault Line': std,
};
const need = name => ({ weapons: SHEATHED, hat: null, ending: false, foes: ['minion', 'elite', 'boss'], ...RULES[name] });

// ctx: { weapon: 'katana', hat: the worn hat item or null, others: enemies on screen besides the target, foe: the target's tier }
export function eligible(name, ctx) {
  const n = need(name);
  if (!n.weapons.includes(ctx.weapon)) return false;
  if (n.hat === 'throwable' && !(ctx.hat && ctx.hat.throwable)) return false;
  if (n.ending && ctx.others > 0) return false;
  return n.foes.includes(ctx.foe || 'minion');
}
// a random eligible execution from `names`, never the same one twice running; null when none fits
export function pick(names, ctx, last = null) {
  const ok = names.filter(n => eligible(n, ctx)), fresh = ok.length > 1 ? ok.filter(n => n !== last) : ok;
  return fresh.length ? fresh[Math.random() * fresh.length | 0] : null;
}
