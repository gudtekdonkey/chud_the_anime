// ---- Writing gear rows: the part constructors (one per kind in parts.js, each with its zone and shell) and `G`, which
// turns a short row into a piece (gear/schema.js) and `G2`, which makes an arm or hand design into its left and right
// pieces. Colours are the piece's own letters (A main, B second, C lacing or cord, D detail) over a palette of dyes.
import { SHELL as S, parseStats, rarityOf, validate } from './schema.js';
export { S };

const mk = k => (z, sh, o = {}) => ({ k, z, sh, ...o });
export const tube = mk('tube'), lames = mk('lames'), band = (z, sh, o) => ({ k: 'band', z, sh, trim: true, ...o }), wrap = mk('wrap'), plates = mk('plates');
export const skirt = (sh, o) => ({ k: 'skirt', z: 'hips', sh, ...o }), panel = (sh, o) => ({ k: 'panel', z: 'chest', sh, ...o }), collar = (sh, o) => ({ k: 'collar', z: 'chest', sh, trim: true, ...o });
export const cap = (sh, o) => ({ k: 'cap', z: 'crown', sh, ...o }), shikoro = (sh, o) => ({ k: 'shikoro', z: 'crown', sh, trim: true, ...o }), crest = (sh, o) => ({ k: 'crest', z: 'crown', sh, trim: true, ...o });
export const mask = (sh, o) => ({ k: 'mask', z: 'face', sh, ...o }), hat = (sh, o) => ({ k: 'hat', z: 'crown', sh, ...o });
export const glove = (sh, o) => ({ k: 'glove', z: 'hand', sh, ...o }), boot = (sh, o) => ({ k: 'boot', z: 'foot', sh, ...o }), sole = (sh, o) => ({ k: 'sole', z: 'foot', sh, trim: true, ...o });
export const sode = (sh, o) => ({ k: 'sode', z: 'upper', sh, ...o }), box = (z, sh, o) => ({ k: 'box', z, sh, trim: true, ...o }), tail = (z, sh, o) => ({ k: 'tail', z, sh, trim: true, ...o });

// a sleeve or trouser leg that reacts to what is worn over it: tucked into a wrap or a guard, or gone when rolled up
export const TUCK = { tucked: { fl: [0, 0] } }, ROLL = { rolled: 'hide' };

// G(slot, layer, family, id, name, palette, stats, about, parts, { hides, shapes, pix })
export function G(slot, layer, family, id, name, pal, s, about, parts, x = {}) {
  const p = { id, name, slot, layer, family, pal, stats: parseStats(s), rarity: rarityOf(pal), about, parts, hides: x.hides || [], shapes: x.shapes || null, pix: x.pix || '', side: x.side || null };
  p.shell = Math.max(...parts.filter(q => !q.trim).map(q => q.sh), ...parts.map(q => q.sh));
  validate(p); return p;
}
// an arm or hand design → its left and right pieces (the owner's slots are per side, so each side is its own piece)
export const G2 = (kind, layer, family, id, name, pal, s, about, parts, x = {}) =>
  ['L', 'R'].map(sd => G(kind + sd, layer, family, `${id}-${sd.toLowerCase()}`, `${name}, ${sd === 'L' ? 'left' : 'right'}`, pal, s, about, parts, { ...x, side: sd }));
