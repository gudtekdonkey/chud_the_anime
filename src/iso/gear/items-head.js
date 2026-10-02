// ---- Head: 12 base pieces (hair, headbands, hoods, wraps) and 20 armour pieces (kabuto, hats, chain hoods, masks).
// The crown builds up inside out: hair, then a band or hood, then a helmet's bowl or a hat lifted over all of it. A
// helmet hides the hair and band under it; a mask stands on whatever the face already wears.
import { HC } from './parts.js';
import { G, S, cap, shikoro, crest, mask, hat, box, tail, tube } from './kit.js';

const H = (layer, fam, id, name, pal, s, about, parts, x) => G('head', layer, fam, id, name, pal, s, about, parts, x);
const headband = (c, sh = S.tight) => cap(sh, { c, from: 1.12, theta: .32, th: .1, cloth: true, open: 0 });
const tails = (c, len = 2.4, sh = S.tight) => [tail('crown', sh, { p: [.25, HC + .2, -1.95], len, w: .45, c, rest: .35 }), tail('crown', sh, { p: [-.25, HC + .25, -1.95], len: len * .8, w: .4, c, rest: .5 })];
const hood = (c, o = {}) => cap(o.sh ?? S.over, { c, open: o.open ?? 1.5, theta: o.theta ?? 2.35, th: o.th ?? .16, cloth: true, s: o.s, seg: 10, rings: 7 });
const kabuto = (c, rim, o = {}) => [cap(S.plate, { c, theta: o.theta ?? 1.28, th: o.th ?? .3, rim, s: o.s, dy: o.dy, bump: .1 }), shikoro(S.plate, { c: o.sc || c, c2: o.sc2, lace: o.lace, n: o.n ?? 3, flare: o.flare ?? .32 })];
const HELM = { hides: ['crown'], pix: 'helm' };

export const HEAD = [
  // ---- base ----
  H('base', 'samurai', 'chonmage', 'Chonmage topknot', { A: 'k' }, 'F1', 'The shaved crown and the oiled topknot laid forward over it.',
    [cap(S.tight, { c: 'A2', from: .6, theta: 1.0, th: .08 }), box('crown', S.tight, { p: [0, HC + 1.92, -.15], s: [.42, .42, 1.6], c: 'A3', r: [-.12, 0, 0] })], { pix: 'hair' }),
  H('base', 'samurai', 'hachimaki-white', 'White hachimaki', { A: 'w' }, 'F1E1', 'A white band tied tight across the brow, its tails loose at the back.', [headband('A4'), ...tails('A3')], { pix: 'band' }),
  H('base', 'samurai', 'eboshi', 'Lacquered eboshi', { A: 'k' }, 'F2', 'The tall black cap of a man of rank, folded at the top.',
    [cap(S.over, { c: 'A2', theta: 1.15, th: .12 }), crest(S.over, { style: 'tall', c: 'A3' })], { pix: 'cap' }),
  H('base', 'samurai', 'helmet-cap', 'Padded helmet cap', { A: 'd', B: 'w' }, 'V1', 'Worn under the kabuto so the iron does not ring the skull.',
    [cap(S.over, { c: 'A2', theta: 1.45, th: .2, cloth: true }), headband('B4', S.over)], { pix: 'cap' }),
  H('base', 'villager', 'tenugui', 'Tenugui head wrap', { A: 'v' }, 'F1', 'A cotton towel tied round the head, knot over the brow.',
    [cap(S.tight, { c: 'A4', theta: 1.25, th: .12, cloth: true }), box('crown', S.tight, { p: [0, HC + 1.3, 1.6], s: [.7, .4, .4], c: 'A3' })], { pix: 'cap' }),
  H('base', 'villager', 'hokkamuri', 'Hokkamuri cheek wrap', { A: 'd' }, 'V1', 'A cloth over the head and round the cheeks, knotted under the nose against the cold.',
    [hood('A3', { open: 1.7, theta: 2.25, sh: S.tight }), box('crown', S.tight, { p: [0, HC - .65, 1.95], s: [.6, .35, .35], c: 'A2' })], { pix: 'hood' }),
  H('base', 'villager', 'loose-hair', 'Loose hair, tied back', { A: 'k' }, 'S1', 'Grown out and tied at the nape: nobody has shaved his crown in years.',
    [cap(S.tight, { c: 'A2', theta: 1.55, th: .14, open: 1.1 }), tail('crown', S.tight, { p: [0, HC - .3, -1.95], len: 2.6, w: .6, c: 'A2', rest: .2 })], { pix: 'hair' }),
  H('base', 'villager', 'rope-band', 'Straw-rope headband', { A: 'm' }, 'V1', 'A twist of straw rope; a farmer\'s answer to the hachimaki.', [headband('A4'), ...tails('A3', 1.2)], { pix: 'band' }),
  H('base', 'ninja', 'zukin', 'Shinobi zukin', { A: 'k' }, 'S1', 'The black hood wound over the head and the face, a slit for the eyes.',
    [hood('A2', { open: .95, theta: 2.45, sh: S.over }), mask(S.over, { style: 'wrap', c: 'A2' })], { pix: 'hood mask' }),
  H('base', 'ninja', 'fukumen', 'Face wrap (fukumen)', { A: 'k' }, 'S1', 'Just the cloth over nose and mouth.', [mask(S.over, { style: 'wrap', c: 'A3' })], { pix: 'mask' }),
  H('base', 'ninja', 'tailed-hood', 'Hood with long tails', { A: 'd' }, 'S1E1', 'A hood whose two ends hang to the shoulder blades and stream behind him.',
    [hood('A2'), ...tails('A2', 3.6, S.over)], { pix: 'hood' }),
  H('base', 'ninja', 'night-cowl', 'Night cowl', { A: 'v' }, 'S1F1', 'A deep cowl of night-indigo that shadows the whole face.',
    [hood('A2', { open: 1.3, theta: 2.55, s: [1.08, 1.06, 1.1] }), tube('neck', S.over, { c: 'A2', th: .3, fl: [0, .4], cloth: true })], { pix: 'hood' }),

  // ---- armour ----
  H('armour', 'samurai', 'iron-jingasa', 'Iron jingasa and menpō', { A: 'i', B: 'm' }, 'V1F1', "Iron Ash's hat and mask: a shallow iron cone ribbed eight ways, its lip lit, over the F1 menpō.",
    [hat(S.outer, { style: 'jingasa', R: 9.5, h: 1.8, c: 'A4', c2: 'A6', rib: 'A3', ribs: 8, knob: 1, cord: 'B3' }), mask(S.plate, { style: 'menpo', c: 'A5', c2: 'A4' })], { pix: 'hat menpo' }),
  H('armour', 'samurai', 'zunari', 'Zunari kabuto', { A: 'i', C: 'v' }, 'V2', 'The plain head-shaped helmet of the common soldier: three plates, no crest.',
    [...kabuto('A4', 'A6', { lace: 'C4' }), crest(S.plate, { style: 'fuki', c: 'A5', fuki: 'A5' })], HELM),
  H('armour', 'samurai', 'suji-bachi', 'Suji-bachi with kuwagata', { A: 'i', B: 'z', C: 'v' }, 'V2E1', 'A ribbed bowl, bronze hoe-blade horns rising off the brow.',
    [...kabuto('A4', 'A6', { n: 4, lace: 'C4' }), crest(S.plate, { style: 'ridge', c: 'A6' }), crest(S.plate, { style: 'kuwagata', c: 'B6', c2: 'B4', fuki: 'A5' })], HELM),
  H('armour', 'samurai', 'momonari', 'Momonari kabuto', { A: 'q', C: 'k' }, 'V2', 'A peach-shaped bowl, black-lacquered, its point swept up.',
    [...kabuto('A4', 'A5', { s: [1, 1.28, 1], dy: .15, n: 2 }), crest(S.plate, { style: 'ridge', c: 'A5' })], HELM),
  H('armour', 'samurai', 'eboshi-nari', 'Eboshi-nari kabuto', { A: 'q', C: 'r' }, 'V1F3', 'A tall helmet beaten into the shape of a court cap, laced in red: a lord\'s, and only a lord\'s.',
    [...kabuto('A4', 'A5', { lace: 'C4' }), crest(S.plate, { style: 'tall', c: 'A4' })], HELM),
  H('armour', 'samurai', 'oni-kabuto', 'Oni kabuto and menpō', { A: 'x', B: 'w', C: 'k' }, 'V2E2', 'Oxblood iron, two short horns and a snarling demon mask with bared teeth.',
    [...kabuto('A4', 'A5', { lace: 'C4' }), crest(S.plate, { style: 'horns', c: 'B4' }), mask(S.plate, { style: 'oni', c: 'A4', c2: 'A5', throat: 'A3' })], { hides: ['crown', 'face'], pix: 'helm menpo' }),
  H('armour', 'samurai', 'crescent-kabuto', 'Kabuto with crescent maedate', { A: 'n', B: 'z', C: 'v' }, 'V2F1', 'Indigo lacquer and a thin bronze crescent moon over the brow.',
    [...kabuto('A4', 'A6', { lace: 'C4', n: 4 }), crest(S.plate, { style: 'crescent', c: 'B6', fuki: 'A5' })], HELM),
  H('armour', 'samurai', 'hoshi-bachi', 'Hoshi-bachi with plume', { A: 'i', B: 'k', C: 'v' }, 'V3', 'A riveted bowl, a black horsehair plume streaming from its top.',
    [...kabuto('A5', 'A6', { lace: 'C4' }), crest(S.plate, { style: 'ridge', c: 'A6' }), crest(S.plate, { style: 'plume', c: 'B3' })], HELM),
  H('armour', 'villager', 'sugegasa', 'Sedge kasa', { A: 'm', B: 'k' }, 'F1', 'A peaked sedge hat; the road\'s own helmet.', [hat(S.outer, { style: 'kasa', R: 6.6, h: 2.8, c: 'A4', c2: 'A3', cord: 'B3' })], { pix: 'kasa' }),
  H('armour', 'villager', 'rain-hat', 'Wide straw rain hat', { A: 'm', B: 'e' }, 'V1F1', 'Domed and wide as a cart wheel; the rain falls a hand\'s width off his shoulders.',
    [hat(S.outer, { style: 'dome', R: 7.6, h: 1.4, c: 'A3', c2: 'A2', band: 'B3', cord: 'B3' })], { pix: 'kasa' }),
  H('armour', 'villager', 'tengai', 'Komusō basket (tengai)', { A: 'b' }, 'F3', 'A woven basket down over the whole head: the wandering monk who sees and is not seen.',
    [hat(S.outer, { style: 'tengai', c: 'A4', c2: 'A2', cords: false })], { hides: ['crown', 'face'], pix: 'basket' }),
  H('armour', 'villager', 'quilt-hood', 'Quilted war hood', { A: 'e', B: 'k' }, 'V2', 'A padded hood stitched in rows, thick enough to turn a club.',
    [hood('A3', { sh: S.mail, th: .32, open: 1.4 }), cap(S.mail, { c: 'B2', from: .9, theta: .12, th: .36, open: 1.4, cloth: true }), cap(S.mail, { c: 'B2', from: 1.4, theta: .1, th: .36, open: 1.4, cloth: true })], { pix: 'hood' }),
  H('armour', 'villager', 'pot-helm', 'Pot-lid helmet', { A: 'i', B: 'l' }, 'V2', 'An iron pot beaten round a block and strapped under the chin.',
    [cap(S.plate, { c: 'A3', theta: 1.15, th: .3, rim: 'A4' }), box('crown', S.plate, { p: [0, HC - 1.7, .9], s: [1.6, .18, .18], c: 'B3' })], HELM),
  H('armour', 'villager', 'bamboo-band', 'Bamboo brow guard', { A: 'b', B: 'k' }, 'V1', 'A curved slat of bamboo tied across the forehead.',
    [cap(S.mail, { c: 'B3', from: 1.1, theta: .34, th: .12, cloth: true }), box('crown', S.plate, { p: [0, HC + .9, 1.75], s: [2.0, .7, .18], c: 'A5', r: [-.35, 0, 0] }), ...tails('B2', 1.6, S.mail)], { pix: 'band' }),
  H('armour', 'ninja', 'hachigane', 'Hachigane', { A: 'k', B: 'i' }, 'V1S1', 'An iron plate sewn into a headband: it guards the brow and weighs nothing.',
    [cap(S.mail, { c: 'A3', from: 1.1, theta: .34, th: .12, cloth: true }), box('crown', S.plate, { p: [0, HC + .95, 1.72], s: [1.8, .62, .16], c: 'B5', r: [-.38, 0, 0] }), ...tails('A2', 2.2, S.mail)], { pix: 'band' }),
  H('armour', 'ninja', 'kusari-zukin', 'Kusari zukin', { A: 'c' }, 'V1S1', 'A hood of fine mail, open at the face.', [hood('A3', { sh: S.mail, th: .14, open: 1.5 })], { pix: 'hood' }),
  H('armour', 'ninja', 'black-jingasa', 'Lacquered shinobi jingasa', { A: 'q', B: 'k' }, 'S1E1', 'A small black jingasa; it reads as a foot soldier\'s from a distance.',
    [hat(S.outer, { style: 'jingasa', R: 6.2, h: 1.5, c: 'A4', c2: 'A5', ribs: 6, rib: 'A3', cord: 'B3' })], { pix: 'hat' }),
  H('armour', 'ninja', 'half-mask-hood', 'Iron half-mask and hood', { A: 'k', B: 'i' }, 'E1S1', 'A black hood and an iron plate over the lower face.',
    [hood('A2', { sh: S.mail }), mask(S.plate, { style: 'half', c: 'B4' })], { pix: 'hood menpo' }),
  H('armour', 'ninja', 'crow-mask', 'Crow-beak mask', { A: 'q', B: 'k' }, 'S1F2', 'A black-lacquered mask drawn out into a crow\'s beak, over a hood. Few have seen it and lived.',
    [hood('B2', { sh: S.mail }), mask(S.plate, { style: 'beak', c: 'A4', c2: 'A5' })], { pix: 'hood menpo' }),
  H('armour', 'ninja', 'veiled-kasa', 'Veiled kasa', { A: 'm', B: 'k' }, 'F2', 'A peaked hat with a black gauze veil hung all round the brim.',
    [hat(S.outer, { style: 'kasa', R: 5.8, h: 2.6, c: 'A3', c2: 'A2', veil: 'B2', cord: 'B3' })], { pix: 'kasa' }),
];
