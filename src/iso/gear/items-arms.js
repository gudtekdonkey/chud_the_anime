// ---- Arms and hands: the owner's slots are per side, so every design here is a left piece and a right piece (`G2`).
// Arm base: what is done to the shirt's sleeve (tied back, rolled, wrapped, bound over). Arm armour: shoulder guards
// (sode, on their spring hinge), kote, bracers. Hand base: gloves and wraps; hand armour: tekkō, gauntlets, claws.
// A wrap or a guard tucks the sleeve under it; a rolled sleeve is gone from the forearm.
import { G2, S, tube, band, wrap, plates, sode, glove, box } from 'ronin-engine/iso/gear/kit.js';

const ARM = (layer, fam, id, name, pal, s, about, parts, x) => G2('arm', layer, fam, id, name, pal, s, about, parts, x);
const HAND = (layer, fam, id, name, pal, s, about, parts, x) => G2('hand', layer, fam, id, name, pal, s, about, parts, x);
const KOTE = { shapes: { fore: 'tucked' }, pix: 'kote' }, SODE = { pix: 'pauldron' };

export const ARMS = [
  // ---- arm base ----
  ...ARM('base', 'samurai', 'tasuki', 'Tasuki sleeve tie', { A: 'w' }, 'E1', 'A cord looped over the shoulder that ties the sleeve back from the forearm, ready to draw.',
    [band('upper', S.over, { at: [.3], h: .22, th: .14, c: 'A4' }), box('upper', S.over, { on: ['back', .3], s: [.4, .4, .3], c: 'A3' })], { shapes: { fore: 'rolled' }, pix: 'tasuki' }),
  ...ARM('base', 'samurai', 'kote-shita', 'Fitted undersleeve', { A: 'k', B: 'd' }, 'V1', 'A close sleeve worn under the kote so the iron does not chafe.',
    [tube('upper', S.over, { c: 'A2', th: .08 }), tube('fore', S.over, { c: 'A2', th: .08 }), band('fore', S.over, { at: [.96], h: .2, th: .1, c: 'B3' })], { shapes: { fore: 'tucked', upper: 'tucked' } }),
  ...ARM('base', 'samurai', 'yugote', 'Archer\'s oversleeve', { A: 'd', B: 'g' }, 'E1F1', 'A cloth sleeve drawn over the shirt\'s so the bowstring never catches it.',
    [tube('upper', S.over, { c: 'A3', th: .1, fl: [0, .05] }), tube('fore', S.over, { c: 'A3', th: .1 }), band('fore', S.over, { at: [.2, .95], h: .18, th: .12, c: 'B4' })], { shapes: { fore: 'tucked' } }),
  ...ARM('base', 'villager', 'rolled-sleeve', 'Rolled sleeve', { A: 'd' }, 'S1', 'The sleeve rolled to the elbow for the work.',
    [band('upper', S.over, { at: [.92], h: .5, th: .22, c: 'A3' })], { shapes: { fore: 'rolled' } }),
  ...ARM('base', 'villager', 'bandage', 'Bandaged forearm', { A: 'g' }, 'V1S1', 'Grey linen wound over an old wound that never quite closed.',
    [wrap('fore', S.over, { n: 6, th: .1, c: 'A4' })], { shapes: { fore: 'rolled' } }),
  ...ARM('base', 'villager', 'garter', 'Sleeve garter', { A: 'e', B: 'm' }, 'F1', 'A cord at the elbow and one at the wrist hold the sleeve in.',
    [band('fore', S.over, { at: [.12, .92], h: .18, th: .12, c: 'A3' }), box('fore', S.over, { on: ['out', .92], s: [.25, .25, .3], c: 'B3' })], { shapes: { fore: 'tucked' } }),
  ...ARM('base', 'ninja', 'arm-wraps', 'Black arm wraps', { A: 'k' }, 'S1', 'Wound from wrist to elbow over the sleeve: nothing flaps, nothing rustles.',
    [wrap('fore', S.over, { n: 7, th: .08, c: 'A3' })], { shapes: { fore: 'tucked' } }),
  ...ARM('base', 'ninja', 'bound-sleeve', 'Bound sleeve with shuriken strap', { A: 'd', B: 'i' }, 'E1S1', 'The upper sleeve bound tight, three iron stars tucked in a strap.',
    [wrap('upper', S.over, { n: 4, th: .1, c: 'A3' }), band('upper', S.over, { at: [.45], h: .3, th: .2, c: 'A2' }),
      box('upper', S.over, { on: ['out', .38], s: [.5, .5, .08], c: 'B6', r: [0, 0, .78] }), box('upper', S.over, { on: ['front', .45], s: [.45, .45, .08], c: 'B5', r: [0, 0, .78] })], { shapes: { upper: 'tucked' } }),

  // ---- arm armour ----
  ...ARM('armour', 'samurai', 'o-sode', 'Ō-sode', { A: 'i', C: 'v' }, 'V2', 'The great square shoulder guard: five laced lames that swing like a shield.',
    [sode(S.outer, { rows: 5, len: 1.0, w: 3.3, c: 'A4', c2: 'A5', lace: 'C4' })], SODE),
  ...ARM('armour', 'samurai', 'hiro-sode', 'Hiro-sode', { A: 'x', C: 'k' }, 'V1E1', 'Flared shoulder guards, each lame wider than the last; oxblood lacquer.',
    [sode(S.outer, { rows: 4, len: 1.05, w: 2.6, spread: .12, step: .18, c: 'A4', c2: 'A3', lace: 'C3' })], SODE),
  ...ARM('armour', 'samurai', 'shino-gote', 'Shino-gote', { A: 'q', B: 'c' }, 'E1S1', 'Iron splints and a gourd plate over a sleeve of mail.',
    [tube('upper', S.mail, { c: 'B3', th: .08 }), tube('fore', S.mail, { c: 'B3', th: .08 }), plates('upper', S.plate, { face: 'out', n: 1, w: .9, th: .16, t: [.15, .8], c: 'A4' }),
      plates('fore', S.plate, { face: ['out', 'front', 'back'], n: 1, w: .3, th: .14, t: [.08, .95], c: 'A4' })], KOTE),
  ...ARM('armour', 'samurai', 'tsutsu-gote', 'Tsutsu-gote', { A: 'n', B: 'c' }, 'V1E1', 'A hinged iron tube round the forearm, indigo-lacquered, mail above it.',
    [tube('upper', S.mail, { c: 'B3', th: .08 }), tube('fore', S.plate, { c: 'A4', th: .2, t: [.05, .95] }), band('fore', S.plate, { at: [.3, .7], h: .12, th: .22, c: 'A6' })], KOTE),
  ...ARM('armour', 'samurai', 'kote-kosode', 'Full kote and ko-sode', { A: 'i', B: 'c', C: 'v' }, 'V2E1', 'Mail and plates from shoulder to wrist and a small shoulder guard over it.',
    [tube('upper', S.mail, { c: 'B3', th: .08 }), tube('fore', S.mail, { c: 'B3', th: .08 }), plates('fore', S.plate, { face: 'out', n: 3, w: .7, th: .14, c: 'A4', c2: 'A5', lace: 'C4' }),
      sode(S.outer, { rows: 2, len: 1.0, w: 2.2, c: 'A4', c2: 'A5', lace: 'C4' })], { shapes: { fore: 'tucked' }, pix: 'kote pauldron' }),
  ...ARM('armour', 'villager', 'padded-guard', 'Padded arm guard', { A: 'e', B: 'k' }, 'V1', 'Quilted cloth over the whole arm, tied at the elbow.',
    [tube('upper', S.mail, { c: 'A3', th: .24 }), tube('fore', S.mail, { c: 'A3', th: .22 }), band('fore', S.mail, { at: [.05, .55], h: .14, th: .26, c: 'B3' })], KOTE),
  ...ARM('armour', 'villager', 'bamboo-splint', 'Bamboo splint bracer', { A: 'b', B: 'm' }, 'V1', 'Split bamboo bound round the forearm with straw cord.',
    [plates('fore', S.plate, { face: ['out', 'front', 'back', 'in'], n: 1, w: .32, th: .14, t: [.08, .95], c: 'A4' }), band('fore', S.plate, { at: [.2, .55, .9], h: .14, th: .22, c: 'B3' })], KOTE),
  ...ARM('armour', 'villager', 'leather-bracer', 'Leather bracer', { A: 'l', B: 'k' }, 'E1', 'Boiled leather laced along the inside of the arm.',
    [tube('fore', S.plate, { c: 'A4', th: .16, t: [.1, .92] }), plates('fore', S.plate, { face: 'in', n: 4, w: .14, th: .2, t: [.15, .85], c: 'B4' })], KOTE),
  ...ARM('armour', 'ninja', 'kusari-gote', 'Kusari-gote', { A: 'c' }, 'S1V1', 'A sleeve of fine black mail, close to the arm.',
    [tube('upper', S.mail, { c: 'A3', th: .08 }), tube('fore', S.mail, { c: 'A3', th: .07 })], KOTE),
  ...ARM('armour', 'ninja', 'hidden-plate', 'Lacquered bracer with a hidden plate', { A: 'q', B: 'i' }, 'E1S1', 'Black lacquer outside, a steel plate inside that has stopped more than one blade.',
    [tube('fore', S.plate, { c: 'A4', th: .15, t: [.05, .95] }), plates('fore', S.plate, { face: 'out', n: 2, w: .5, th: .08, c: 'B5' })], KOTE),
  ...ARM('armour', 'ninja', 'kikko-sleeve', 'Kikkō sleeve', { A: 'k', B: 'i' }, 'V1S1', 'Little hexagonal plates quilted into a black sleeve.',
    [tube('upper', S.mail, { c: 'A2', th: .1 }), tube('fore', S.mail, { c: 'A2', th: .1 }), plates('upper', S.plate, { face: ['out', 'front', 'back'], n: 3, w: .38, th: .08, gap: 1, c: 'B4' }),
      plates('fore', S.plate, { face: ['out', 'front', 'back'], n: 3, w: .34, th: .08, gap: 1, c: 'B4' })], KOTE),

  // ---- hand base ----
  ...HAND('base', 'samurai', 'yugake', 'Yugake', { A: 'l', B: 'k' }, 'E1', 'The archer\'s deerskin glove, a hard thumb for the string.',
    [glove(S.tight, { c: 'A4', th: .07, cuff: .72, c2: 'A3' }), band('fore', S.tight, { at: [.82], h: .14, th: .14, c: 'B3' })]),
  ...HAND('base', 'samurai', 'riding-glove', 'Fur-lined riding glove', { A: 'l', B: 'f' }, 'V1F1', 'Leather lined with fur, a wide cuff folded back.',
    [glove(S.tight, { c: 'A3', th: .1, cuff: .78, c2: 'B4', cuffTh: .2 })]),
  ...HAND('base', 'villager', 'rag-wrap', 'Rag hand wrap', { A: 'd' }, 'V1', 'A strip of old cloth wound round the palm and the wrist.',
    [glove(S.tight, { c: 'A3', th: .06 }), wrap('fore', S.tight, { t: [.72, 1], n: 3, th: .06, c: 'A4' })]),
  ...HAND('base', 'villager', 'work-mitt', 'Fingerless work mitt', { A: 'e', B: 'm' }, 'V1', 'Thick cotton over the back of the hand, the fingers left bare.',
    [glove(S.tight, { c: 'A3', th: .12 }), band('fore', S.tight, { at: [.95], h: .16, th: .1, c: 'B3' })]),
  ...HAND('base', 'ninja', 'tabi-glove', 'Black tabi glove', { A: 'k' }, 'S1', 'Thin black cloth to the wrist: no print left anywhere.', [glove(S.tight, { c: 'A3', th: .06, cuff: .8, c2: 'A2' })]),
  ...HAND('base', 'ninja', 'grip-wrap', 'Grip wraps', { A: 'k', B: 'd' }, 'E1', 'The palm and fingers bound for a sure grip on a wet hilt.',
    [glove(S.tight, { c: 'A3', th: .05 }), wrap('fore', S.tight, { t: [.6, 1], n: 4, th: .06, c: 'B3' })]),

  // ---- hand armour ----
  ...HAND('armour', 'samurai', 'tekko', 'Tekkō', { A: 'i', B: 'k' }, 'V1', 'An iron plate over the back of the hand, laced to the kote.', [glove(S.plate, { c: 'B2', th: .06, plate: 'A5' })]),
  ...HAND('armour', 'samurai', 'gauntlet', 'Mail-backed gauntlet', { A: 'c', B: 'i' }, 'V1E1', 'Mail over the fingers, an iron plate on the back, a cuff to the mid-arm.',
    [glove(S.plate, { c: 'A3', th: .1, cuff: .55, c2: 'A3', plate: 'B5' })]),
  ...HAND('armour', 'samurai', 'archer-tekko', 'Archer\'s armoured glove', { A: 'l', B: 'x' }, 'E2', 'A leather yugake with an oxblood plate riveted over the knuckles.',
    [glove(S.plate, { c: 'A4', th: .1, plate: 'B4' })]),
  ...HAND('armour', 'villager', 'thick-glove', 'Thick work glove', { A: 'l' }, 'V1', 'Heavy hide, stiff with years of use.', [glove(S.plate, { c: 'A3', th: .18, cuff: .8, c2: 'A2' })]),
  ...HAND('armour', 'villager', 'straw-mitten', 'Straw-padded mitten', { A: 'm', B: 'e' }, 'V1', 'Straw stuffed into cloth: clumsy, but a blade bites straw before skin.', [glove(S.mail, { c: 'B3', th: .22 }), band('fore', S.mail, { at: [.92], h: .2, th: .2, c: 'A3' })]),
  ...HAND('armour', 'ninja', 'shuko', 'Shuko climbing claws', { A: 'k', B: 'i' }, 'S1E1', 'An iron band round the palm with four claws: for walls, and for faces.',
    [glove(S.plate, { c: 'A3', th: .08, claws: 'B6' }), band('fore', S.plate, { at: [.95], h: .22, th: .12, c: 'B4' })]),
  ...HAND('armour', 'ninja', 'black-tekko', 'Black plated tekkō', { A: 'q', B: 'k' }, 'S1V1', 'Lacquered black so the plate never catches the moon.', [glove(S.plate, { c: 'B2', th: .07, cuff: .7, c2: 'B3', plate: 'A4' })]),
];
