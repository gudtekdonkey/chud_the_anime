// ---- Torso: 18 shirts (the base layer) and 22 body armours (the armour layer), samurai / villager / ninja.
// A shirt carries its sleeves and hem; the armour layer's dō hides the shirt's chest and belly (never its sleeves).
import { G, S, tube, lames, band, wrap, plates, skirt, panel, collar, box, tail, TUCK, ROLL } from './kit.js';

// a shirt: body, hem (tucked in, out over the trousers, long to the knee, or split tails), sleeves, crossed collar
function shirt({ c = 'A2', th = .12, sleeve = 'long', hem = 'in', co = 'A4', under, obi } = {}) {
  const ps = [tube('chest', S.shirt, { c, th }), tube('belly', S.shirt, { c, th })];
  if (hem === 'in') ps.push(tube('hips', S.shirt, { c, th, t: [0, .45] }));
  else ps.push(tube('hips', S.over, { c, th: th + .04, t: [0, hem === 'out' ? .75 : 1], fl: [0, .14], hem: 'A1' }));
  if (hem === 'long') ps.push(skirt(S.over, { c, cloth: true, at: [-.55, .55, Math.PI - .5, Math.PI + .5], len: 4.4, w: 2.2, th: .16, rest: -.08, hem: 'A1' }));
  if (hem === 'tails') ps.push(skirt(S.over, { c, cloth: true, at: [Math.PI - .35, Math.PI + .35], len: 5.6, w: 1.5, th: .14, rest: -.05 }));
  const up = { rolled: { t: [0, .4] } };
  if (sleeve === 'long') ps.push(tube('upper', S.shirt, { c, th, fl: [0, .08], alt: up }), tube('fore', S.shirt, { c, th, fl: [.04, .2], alt: { ...TUCK, ...ROLL } }));
  if (sleeve === 'tight') ps.push(tube('upper', S.shirt, { c, th: .07, alt: up }), tube('fore', S.shirt, { c, th: .07, alt: { ...TUCK, ...ROLL } }));
  if (sleeve === 'wide') ps.push(tube('upper', S.shirt, { c, th, fl: [0, .25], alt: up }), tube('fore', S.shirt, { c, th, fl: [.3, .8], open: true, hem: 'A1', alt: { tucked: { fl: [0, .05], open: false, hem: null }, ...ROLL } }));
  if (sleeve === 'short') ps.push(tube('upper', S.shirt, { c, th, t: [0, .55], fl: [0, .2], hem: 'A1' }));
  if (co) ps.push(collar(S.shirt, { c: co, under }));
  if (obi) ps.push(band('hips', S.shirt, { at: [.08], h: .6, th: th + .08, c: obi }));
  return ps;
}
const px = (sleeve, hem) => ['shirt', sleeve === 'wide' && 'sleeves', (hem === 'long' || hem === 'tails') && 'coat', hem === 'out' && 'jacket'].filter(Boolean).join(' ');
const shirtRow = (fam, id, name, pal, s, about, o, extra = [], x = {}) => G('torso', 'base', fam, id, name, pal, s, about, [...shirt(o), ...extra], { pix: px(o.sleeve || 'long', o.hem || 'in'), ...x });
const mon = (d, t, w = .7) => box('chest', S.shirt, { on: [d, t], s: [w, w, .1], c: 'B5' });

// a dō: laced lames round the belly and the chest, a lit plate over the heart; it hides the shirt under it
const dou = (c, c2, lace, o = {}) => [lames('belly', S.plate, { n: o.n || 2, c, c2, lace, th: o.th ?? .2, flare: .1 }), lames('chest', S.plate, { n: o.n || 2, c: c2, c2: c, lace, th: o.th ?? .2, plate: o.plate === false ? null : [3.0, .8], hi: o.hi || 'A6' })];
const DOU = { hides: ['chest', 'belly'], pix: 'dou' };
const JINBAORI = c => panel(S.outer, { c, items: [[1.42, 'back', 2.84, 5.4], [-1.42, 'back', 2.84, 5.4], [1.95, 'front', 1.55, 5.0], [-1.95, 'front', 1.55, 5.0]], hem: 'B2', yoke: 'B4', yokeBack: 1, mon: 'B7', th: .34 });

export const TORSO = [
  // ---- base: shirts ----
  shirtRow('samurai', 'kosode-black', 'Black kosode', { A: 'k' }, 'V1', 'The plain short-sleeved robe every samurai wears under everything else.', { obi: 'A1' }),
  shirtRow('samurai', 'kosode-mon', 'Kosode with house crests', { A: 'k', B: 'g' }, 'V1F2', 'Five small grey crests: two on the chest, one on the back, one on each sleeve. A house he no longer serves.', { obi: 'A1' },
    [mon(.5, .35), mon(-.5, .35), mon('back', .3, .85), box('upper', S.shirt, { on: ['out', .35], s: [.6, .6, .1], c: 'B5' })]),
  shirtRow('samurai', 'juban-white', 'White under-robe (juban)', { A: 'w' }, 'F2V1', 'Ash white and spotless. Rare on a road this muddy.', { co: 'A6', th: .1 }),
  shirtRow('samurai', 'yoroi-hitatare', 'Armour robe (yoroi-hitatare)', { A: 'd', B: 'g' }, 'V2', 'Wide sleeves cut to go under armour, the cuffs drawn in on cords.', { sleeve: 'wide', obi: 'A1' },
    [band('fore', S.shirt, { at: [.95], h: .2, th: .9, c: 'B4' })]),
  shirtRow('samurai', 'kataginu', 'Kataginu over kosode', { A: 'k', B: 'd' }, 'F1E1', 'A sleeveless over-vest whose stiff shoulders stand out like wings.', {},
    [tube('chest', S.over, { c: 'B2', th: .06 }), box('chest', S.over, { p: [1.7, 3.3, 0], s: [1.9, .28, 2.8], c: 'B3', r: [0, 0, -.15], rad: true }), box('chest', S.over, { p: [-1.7, 3.3, 0], s: [1.9, .28, 2.8], c: 'B3', r: [0, 0, .15], rad: true })]),
  shirtRow('samurai', 'haori-short', 'Short haori', { A: 'k', B: 'g' }, 'F1S1', 'A hip-length jacket worn open, its two ties knotted on the chest.', { hem: 'out', co: 'A3' },
    [box('chest', S.shirt, { on: ['front', .45], s: [.55, .3, .3], c: 'B5' })]),
  shirtRow('villager', 'noragi', 'Indigo noragi', { A: 'v' }, 'V1F1', 'A field jacket of indigo cotton, faded at the elbows.', { hem: 'out', sleeve: 'tight', co: 'A5' }),
  shirtRow('villager', 'hanten', 'Quilted hanten', { A: 'e' }, 'V2', 'Padded thick against the cold; the stitching shows in lines.', { hem: 'out', sleeve: 'short', th: .22, co: 'A5' },
    [band('belly', S.shirt, { at: [.3, .7], th: .24, h: .12, c: 'A1' })]),
  shirtRow('villager', 'jinbei', 'Sleeveless jinbei', { A: 'o', B: 'e' }, 'S1F1', 'A loose vest tied with two cords, arms bare for the work.', { hem: 'out', sleeve: 'none', co: 'A4' },
    [box('chest', S.shirt, { on: [.3, .5], s: [.45, .2, .2], c: 'B4' }), box('chest', S.shirt, { on: [.3, .8], s: [.45, .2, .2], c: 'B4' })], { pix: 'shirt jacket bare' }),
  shirtRow('villager', 'hemp-kimono', 'Hemp kimono', { A: 'h' }, 'F2V1', 'Undyed hemp to the knee. Beige like this is hard to find.', { hem: 'long', co: 'A6', obi: 'A2' }),
  shirtRow('villager', 'patched-kosode', 'Patched kosode', { A: 'd', B: 'e' }, 'V1S1', 'Mended so often the patches outnumber the cloth.', { obi: 'A1' },
    [box('chest', S.shirt, { on: [.5, .6], s: [.9, .8, .1], c: 'B3' }), box('belly', S.shirt, { on: [-.6, .45], s: [.8, .7, .1], c: 'B2' }), box('upper', S.shirt, { on: ['out', .5], s: [.7, .8, .1], c: 'B3', side: 'R' })]),
  shirtRow('villager', 'katahada', 'Sleeve slipped (katahada-nugi)', { A: 'k' }, 'E1S1', 'The left sleeve pulled off the shoulder to free the arm, hanging at the waist.', { sleeve: 'none', obi: 'A1' },
    [tube('upper', S.shirt, { c: 'A2', th: .12, fl: [0, .08], side: 'R', alt: { rolled: { t: [0, .4] } } }), tube('fore', S.shirt, { c: 'A2', th: .12, fl: [.04, .2], side: 'R', alt: { ...TUCK, ...ROLL } }),
      box('hips', S.over, { on: ['left', .45], s: [1.1, 2.6, .5], c: 'A2', r: [0, 0, .15] })]),
  shirtRow('ninja', 'shinobi-uwagi', 'Shinobi uwagi', { A: 'k' }, 'S1', 'Close-fitting and black, cut so nothing catches on a wall.', { sleeve: 'tight', th: .08, co: 'A3' }),
  shirtRow('ninja', 'night-jacket', 'Night jacket', { A: 'v' }, 'S1E1', 'Indigo dyed nearly to black: under the moon it reads darker than black does.', { sleeve: 'tight', hem: 'out', th: .09, co: 'A3' }),
  shirtRow('ninja', 'sleeveless-uwagi', 'Sleeveless uwagi with persimmon cords', { A: 'd', B: 'p' }, 'S3E1', 'Arms bare, the body crossed with cords dyed in persimmon, the old night-runners\' colour.', { sleeve: 'none', th: .08, co: 'A3' },
    [band('chest', S.shirt, { at: [.5, .5], tilt: .6, h: .26, th: .1, c: 'B3' })], { pix: 'shirt bare tasuki' }),
  shirtRow('ninja', 'pocket-kosode', 'Kosode of hidden pockets', { A: 'k', B: 'l' }, 'F1E1', 'Pockets sewn inside the chest for darts, wire and a flint.', { sleeve: 'tight', co: 'A3' },
    [box('belly', S.shirt, { on: [.5, .3], s: [.8, .9, .2], c: 'B3' }), box('belly', S.shirt, { on: [-.5, .3], s: [.8, .9, .2], c: 'B3' })]),
  shirtRow('ninja', 'wrap-jacket', 'Belted wrap jacket', { A: 'd', B: 'l' }, 'S1V1', 'Wrapped deep across the body and held by a leather belt.', { sleeve: 'tight', co: 'A4' },
    [band('belly', S.shirt, { at: [.92], h: .5, th: .16, c: 'B3' }), box('belly', S.shirt, { on: ['front', .92], s: [.5, .42, .2], c: 'i5' })]),
  shirtRow('ninja', 'split-coat', 'Split-tail coat', { A: 'k' }, 'S1F1', 'Two long tails at the back that stream when he runs.', { sleeve: 'tight', hem: 'tails', co: 'A3' }),

  // ---- armour: body armours ----
  G('torso', 'armour', 'samurai', 'okegawa-do', 'Okegawa dō', { A: 'i', C: 'v' }, 'V2', "Iron Ash's dō: riveted iron lames laced in indigo, a lit plate over the heart.", dou('A4', 'A5', 'C5'), DOU),
  G('torso', 'armour', 'samurai', 'iron-ash-jinbaori', 'Iron Ash jinbaori over dō', { A: 'i', B: 'v', C: 'v' }, 'V2F1', 'The sleeveless indigo surcoat with the mon on the back, over the laced dō. The look the owner picked.',
    [...dou('A4', 'A5', 'C5'), JINBAORI('B5')], { hides: ['chest', 'belly'], pix: 'dou surcoat' }),
  G('torso', 'armour', 'samurai', 'haramaki', 'Haramaki', { A: 'q', C: 'v' }, 'V1S1', 'Wraps round and closes at the back: light enough for a foot soldier, black-lacquered.',
    [lames('belly', S.plate, { n: 3, c: 'A4', c2: 'A5', lace: 'C4', th: .18 }), lames('chest', S.plate, { n: 2, c: 'A5', c2: 'A4', lace: 'C4', th: .18 }), box('belly', S.plate, { on: ['back', .5], s: [.3, 3.0, .2], c: 'C3' })], DOU),
  G('torso', 'armour', 'samurai', 'hotoke-do', 'Hotoke dō', { A: 'i' }, 'V3', 'Smooth iron, hammered seamless: a cut slides off it.',
    [tube('belly', S.plate, { c: 'A4', th: .24, fl: [.05, 0] }), tube('chest', S.plate, { c: 'A5', th: .26 }), lames('chest', S.plate, { t: [0, .3], n: 1, c: 'A6', th: .3, plate: [3.2, .6], hi: 'A7' })], DOU),
  G('torso', 'armour', 'samurai', 'nimai-do', 'Nimai dō', { A: 'n', B: 'i', C: 'k' }, 'V2E1', 'Two halves of indigo lacquer hinged under the left arm.',
    [...dou('A4', 'A5', 'C4'), box('belly', S.plate, { on: ['left', .5], s: [.5, 1.2, .2], c: 'B6' }), box('chest', S.plate, { on: ['left', .5], s: [.5, 1.2, .2], c: 'B6' })], DOU),
  G('torso', 'armour', 'samurai', 'tatami-do', 'Tatami dō', { A: 'c', B: 'i' }, 'V1S2', 'Little iron plates sewn into mail: it folds flat for the march.',
    [tube('belly', S.mail, { c: 'A3', th: .12 }), tube('chest', S.mail, { c: 'A3', th: .12 }), plates('belly', S.plate, { face: ['front', 'back', 'left', 'right'], n: 3, w: .9, th: .14, gap: 1, c: 'B4', c2: 'B5' }),
      plates('chest', S.plate, { face: ['front', 'back', 'left', 'right'], n: 3, w: .9, th: .14, gap: 1, c: 'B5', c2: 'B4' })], DOU),
  G('torso', 'armour', 'samurai', 'domaru', 'Dō-maru lamellar', { A: 'q', C: 'w' }, 'V2E1', 'Hundreds of small scales laced in rows of ash-white cord.',
    [lames('belly', S.plate, { n: 4, c: 'A4', c2: 'A3', lace: 'C5', th: .18 }), lames('chest', S.plate, { n: 4, c: 'A3', c2: 'A4', lace: 'C5', th: .18, plate: false })], DOU),
  G('torso', 'armour', 'samurai', 'o-yoroi', 'Ō-yoroi', { A: 'x', B: 'l', C: 'v' }, 'V3E1', 'The great box armour of the old wars, oxblood lacquer, a leather panel down the front so the bowstring runs clean.',
    [...dou('A3', 'A4', 'C4', { th: .26, n: 3 }), box('belly', S.outer, { on: ['front', .45], s: [2.6, 3.0, .12], c: 'B4' }), box('chest', S.outer, { on: [.7, .45], s: [.9, 1.8, .2], c: 'A5' }),
      box('chest', S.outer, { on: [-.7, .45], s: [.7, 1.8, .2], c: 'A5' })], DOU),
  G('torso', 'armour', 'samurai', 'mune-ate', 'Mune-ate', { A: 'i', B: 'l' }, 'V1S1', 'Just the chest plate on two straps: for a rider who will not be still.',
    [plates('chest', S.plate, { face: 'front', n: 1, w: 3.2, th: .2, t: [.05, .85], c: 'A5' }), box('chest', S.plate, { p: [1.3, 2.9, 0], s: [.3, .2, 4.4], c: 'B3', rad: true }), box('chest', S.plate, { p: [-1.3, 2.9, 0], s: [.3, .2, 4.4], c: 'B3', rad: true })], { pix: 'dou' }),
  G('torso', 'armour', 'villager', 'padded-vest', 'Padded cotton vest', { A: 'e' }, 'V1', 'Layers of old cloth quilted together. Stops a stone, mostly.',
    [tube('belly', S.mail, { c: 'A3', th: .3 }), tube('chest', S.mail, { c: 'A3', th: .32 }), band('chest', S.mail, { at: [.3, .6], th: .34, h: .1, c: 'A1' }), band('belly', S.mail, { at: [.3, .65], th: .32, h: .1, c: 'A1' })], { hides: ['chest', 'belly'], pix: 'vest' }),
  G('torso', 'armour', 'villager', 'wood-slats', 'Wooden slat cuirass', { A: 'y', B: 'm' }, 'V2', 'Split boards lashed with straw rope: a farmer called to the levy.',
    [plates('belly', S.plate, { face: ['front', 'back'], n: 3, w: 3.4, th: .2, c: 'A4', c2: 'A3' }), plates('chest', S.plate, { face: ['front', 'back'], n: 3, w: 3.8, th: .2, c: 'A3', c2: 'A4' }),
      band('chest', S.plate, { at: [.15, .85], th: .3, h: .16, c: 'B3' }), band('belly', S.plate, { at: [.5], th: .3, h: .16, c: 'B3' })], { pix: 'dou' }),
  G('torso', 'armour', 'villager', 'mino', 'Straw rain cape (mino)', { A: 'm' }, 'V1F1', 'Layer on layer of straw over the shoulders. The rain runs off; so do glancing cuts.',
    [panel(S.outer, { c: 'A3', items: [[1.3, 'back', 2.6, 6.2], [-1.3, 'back', 2.6, 6.2], [0, 'back', 2.4, 5.6], [2.1, 'front', 1.3, 4.8], [-2.1, 'front', 1.3, 4.8]], yoke: 'A4', hem: 'A2', th: .4, rest: .14 })], { pix: 'mantle' }),
  G('torso', 'armour', 'villager', 'leather-jerkin', 'Leather jerkin', { A: 'l', B: 'k' }, 'V1E1', 'Hardened hide laced up the front.',
    [tube('belly', S.plate, { c: 'A3', th: .2 }), tube('chest', S.plate, { c: 'A4', th: .22 }), plates('chest', S.plate, { face: 'front', n: 4, w: .2, th: .3, c: 'B4' }), plates('belly', S.plate, { face: 'front', n: 3, w: .2, th: .3, c: 'B4' })], DOU),
  G('torso', 'armour', 'villager', 'bamboo-do', 'Bamboo-slat dō', { A: 'b', B: 'm' }, 'V1S1', 'Green bamboo split and bound side by side round the body.',
    [plates('belly', S.plate, { face: [0, .6, 1.2, 1.9, 2.6, -.6, -1.2, -1.9, -2.6, Math.PI], n: 1, w: .55, th: .2, c: 'A4' }), plates('chest', S.plate, { face: [0, .6, 1.2, 1.9, 2.6, -.6, -1.2, -1.9, -2.6, Math.PI], n: 1, w: .6, th: .2, c: 'A5' }),
      band('belly', S.plate, { at: [.2, .8], th: .32, h: .14, c: 'B3' }), band('chest', S.plate, { at: [.5], th: .32, h: .14, c: 'B3' })], { pix: 'dou' }),
  G('torso', 'armour', 'villager', 'rope-guard', 'Rope-bound chest guard', { A: 'm' }, 'V1', 'Thick straw rope wound round and round the chest.',
    [wrap('belly', S.mail, { n: 6, th: .22, c: 'A4' }), wrap('chest', S.mail, { n: 6, th: .24, c: 'A3' })], { hides: ['chest', 'belly'], pix: 'vest' }),
  G('torso', 'armour', 'villager', 'hide-coat', 'Sleeveless hide coat', { A: 'l', B: 'f' }, 'V2', 'A hunter\'s coat of tanned hide with a fur collar, skirts to the knee.',
    [tube('belly', S.plate, { c: 'A3', th: .2 }), tube('chest', S.plate, { c: 'A3', th: .2 }), band('chest', S.plate, { at: [.02], th: .4, h: .5, c: 'B4' }),
      skirt(S.outer, { c: 'A3', cloth: true, at: [-.5, .5, Math.PI - .55, Math.PI + .55], len: 4.2, w: 2.3, th: .22, rest: -.1 })], { hides: ['chest', 'belly'], pix: 'vest coat' }),
  G('torso', 'armour', 'ninja', 'kusari-katabira', 'Kusari katabira', { A: 'c' }, 'V1S1', 'A shirt of fine black mail, worn under nothing at all.',
    [tube('belly', S.mail, { c: 'A3', th: .1 }), tube('chest', S.mail, { c: 'A3', th: .1 }), tube('hips', S.mail, { c: 'A2', th: .1, t: [0, .5] }), tube('upper', S.mail, { c: 'A3', th: .08, t: [0, .6] })], { hides: ['chest', 'belly'], pix: 'mail' }),
  G('torso', 'armour', 'ninja', 'chain-vest', 'Chain vest', { A: 'c', B: 'l' }, 'V1', 'Mail on a leather frame; no sleeves to slow the arms.',
    [tube('belly', S.mail, { c: 'A3', th: .1 }), tube('chest', S.mail, { c: 'A3', th: .1 }), band('chest', S.mail, { at: [.02], th: .14, h: .25, c: 'B3' }), band('belly', S.mail, { at: [.97], th: .14, h: .25, c: 'B3' })], { hides: ['chest', 'belly'], pix: 'mail' }),
  G('torso', 'armour', 'ninja', 'kikko-vest', 'Kikkō vest', { A: 'd', B: 'i' }, 'V1S1', 'Small hexagonal plates quilted into cloth, like a tortoise\'s shell.',
    [tube('belly', S.mail, { c: 'A2', th: .14 }), tube('chest', S.mail, { c: 'A2', th: .14 }), plates('belly', S.plate, { face: ['front', 'back', .9, -.9], n: 3, w: .6, th: .1, gap: 1, c: 'B4', c2: 'B3' }),
      plates('chest', S.plate, { face: ['front', 'back', .9, -.9], n: 3, w: .6, th: .1, gap: 1, c: 'B3', c2: 'B4' })], { hides: ['chest', 'belly'], pix: 'vest' }),
  G('torso', 'armour', 'ninja', 'harness', 'Tool harness', { A: 'l', B: 'i' }, 'E1F1', 'Crossed straps hung with pouches, a coil of cord and a short blade.',
    [band('chest', S.mail, { at: [.5, .5], tilt: .62, h: .3, th: .12, c: 'A3' }), band('belly', S.mail, { at: [.9], h: .34, th: .12, c: 'A3' }), box('belly', S.mail, { on: ['front', .55], s: [.9, .8, .3], c: 'A4' }),
      box('belly', S.mail, { on: [1.1, .6], s: [.7, .7, .3], c: 'A4' }), box('chest', S.mail, { on: ['back', .4], s: [.3, 2.6, .2], c: 'B5', r: [0, 0, .5] })], { pix: 'tasuki' }),
  G('torso', 'armour', 'ninja', 'short-cape', 'Short shinobi cape', { A: 'k' }, 'S1F1', 'Shoulder to waist, black, cut ragged so it never holds a shape.',
    [panel(S.outer, { c: 'A2', items: [[.9, 'back', 1.9, 4.0], [-.9, 'back', 1.9, 3.6]], yoke: 'A3', th: .2, rest: .12 })], { pix: 'cape' }),
  G('torso', 'armour', 'ninja', 'shinobi-do', 'Lacquered shinobi dō', { A: 'q', B: 'c' }, 'V1E1', 'A thin black plate that drinks the light, mail at the sides.',
    [tube('belly', S.mail, { c: 'B3', th: .08 }), plates('belly', S.plate, { face: ['front', 'back'], n: 1, w: 3.2, th: .16, c: 'A3' }), tube('chest', S.plate, { c: 'A3', th: .16 })], DOU),
];
