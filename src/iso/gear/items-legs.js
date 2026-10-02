// ---- Pants and feet. Pants base: 18 trousers and hakama; pants armour: 18 kusazuri skirts and haidate. Feet base: 12
// sandals, tabi, boots and wraps; feet armour: 16 suneate, kogake and greaves. Anything worn round the shin (leg wraps,
// shin guards) tucks the trouser leg in, as V3's hakama is tied in at the shin; a skirt of plates hangs clear of
// whatever the hips and thighs already wear.
import { G, S, tube, lames, band, wrap, plates, skirt, boot, sole, box, TUCK } from './kit.js';

const L = (layer, fam, id, name, pal, s, about, parts, x) => G('legs', layer, fam, id, name, pal, s, about, parts, x);
const F = (layer, fam, id, name, pal, s, about, parts, x) => G('feet', layer, fam, id, name, pal, s, about, parts, x);
// trousers: the waist, then each leg, flared [top, bottom] on the thigh and the shin; the shin tucks into wraps and guards
const CUT = { wide: [[.25, .65], [.65, .95]], hakama: [[.3, .75], [.75, 1.1]], taper: [[.18, .4], [.4, .08]], tight: [[0, 0], [0, 0]], baggy: [[.35, .7], [.7, .1]] };
function pants({ c = 'A2', th = .14, cut = 'wide', to = 1, knee = null, hem, ankle } = {}) {
  const [ft, fs] = CUT[cut], ps = [tube('hips', S.pants, { c, th, t: [0, .9], fl: [0, .14] }), tube('thigh', S.pants, { c, th, fl: ft, hem: knee ? hem : null, t: [0, knee ? knee : 1] })];
  if (!knee) ps.push(tube('shin', S.pants, { c, th, fl: fs, t: [0, to], hem, alt: { tucked: { fl: [Math.min(fs[0], .4), 0], hem: null } } }));
  if (ankle) ps.push(band('shin', S.pants, { at: [Math.min(.93, to - .05)], h: .26, th: th + .04, c: ankle }));
  return ps;
}
const PX = { wide: 'hakama', hakama: 'hakama', taper: 'trousers', tight: 'tight', baggy: 'trousers' };
const P = (fam, id, name, pal, s, about, o, extra = [], x = {}) => L('base', fam, id, name, pal, s, about, [...pants(o), ...extra], { pix: PX[o.cut || 'wide'] + (o.knee ? ' short' : ''), ...x });
const koshiita = c => box('hips', S.pants, { on: ['back', .12], s: [2.2, 1.0, .18], c });
const SKIRT = { pix: 'kusazuri' }, GUARD = { shapes: { shin: 'tucked' }, pix: 'shins' };

export const LEGS = [
  // ---- pants base ----
  P('samurai', 'hakama-black', 'Black hakama', { A: 'k' }, 'V1', 'Wide divided hakama with the stiff board at the back of the waist.', { cut: 'hakama' }, [koshiita('A3')]),
  P('samurai', 'hakama-striped', 'Striped hakama', { A: 'k', B: 'g' }, 'V1F2', 'Fine grey stripes down black silk: a hakama for a lord\'s hall.', { cut: 'hakama' },
    [koshiita('A3'), plates('thigh', S.pants, { face: ['front', 'out', 'back'], n: 1, w: .1, th: .02, c: 'B3' })]),
  P('samurai', 'kobakama', 'Kobakama', { A: 'd', B: 'k' }, 'S1V1', 'Short hakama tied off below the knee for running in.', { cut: 'wide', knee: .95, hem: 'B3' }, [band('shin', S.pants, { at: [.05], h: .3, th: .3, c: 'B3' })]),
  P('samurai', 'nobakama', 'Field hakama (nobakama)', { A: 'd', B: 'l' }, 'S1V1', 'Tapered field trousers with leather-bound cuffs.', { cut: 'taper', hem: 'B3' }),
  P('samurai', 'torn-hakama', 'Torn hakama', { A: 'k' }, 'E1', 'Once a good hakama. Cut short by a blade, then by the road.', { cut: 'wide', to: .72 },
    [box('shin', S.pants, { on: ['front', .72], s: [.7, .7, .1], c: 'A1', r: [0, 0, .3] }), box('shin', S.pants, { on: ['out', .7], s: [.6, .9, .1], c: 'A1', r: [0, 0, -.2] })]),
  P('samurai', 'grey-hakama', 'Iron-grey hakama', { A: 'g' }, 'V1F2', 'A grey rare enough that people remember who wore it.', { cut: 'hakama' }, [koshiita('A3')]),
  P('villager', 'momohiki', 'Momohiki', { A: 'v' }, 'S1', 'Tight indigo cotton trousers to the ankle.', { cut: 'tight', th: .08 }),
  P('villager', 'tattsuke', 'Tattsuke work trousers', { A: 'e', B: 'd' }, 'S1V1', 'Loose over the thigh, tight below the knee.', { cut: 'taper', ankle: 'B3' }),
  P('villager', 'short-trousers', 'Short trousers', { A: 'o' }, 'S2', 'Cut off above the knee for the paddy.', { cut: 'taper', knee: .8, hem: 'A1', th: .1 }),
  P('villager', 'patched-trousers', 'Patched hemp trousers', { A: 'h', B: 'e' }, 'V1F1', 'Beige hemp patched in brown at both knees.', { cut: 'taper' },
    [box('shin', S.pants, { on: ['front', .08], s: [.9, .9, .1], c: 'B3' }), box('thigh', S.pants, { on: ['back', .5], s: [.8, .8, .1], c: 'B2' })]),
  L('base', 'villager', 'fundoshi-apron', 'Fundoshi and apron', { A: 'k', B: 'v' }, 'S2', 'A loincloth and an indigo apron to the knee; the legs bare.',
    [tube('hips', S.pants, { c: 'A2', th: .1, t: [0, .9] }), band('hips', S.pants, { at: [.08], h: .4, th: .16, c: 'A3' }),
      skirt(S.pants, { c: 'B3', cloth: true, at: [0], len: 4.6, w: 2.6, th: .12, rest: -.05, top: .3 })], { pix: 'apron' }),
  P('villager', 'rolled-trousers', 'Rolled-up trousers', { A: 'd' }, 'S1', 'Rolled to the knee to cross a river, and left that way.', { cut: 'taper', to: .38 }, [band('shin', S.pants, { at: [.36], h: .5, th: .3, c: 'A3' })]),
  P('ninja', 'shinobi-bakama', 'Shinobi bakama', { A: 'k', B: 'd' }, 'S1', 'Loose at the thigh, tied at the ankle: quiet, and free to kick.', { cut: 'baggy', ankle: 'B2' }),
  P('ninja', 'leggings', 'Black leggings', { A: 'k' }, 'S2', 'Close as skin; nothing to grab.', { cut: 'tight', th: .07 }),
  P('ninja', 'knee-wrapped', 'Knee-wrapped trousers', { A: 'd', B: 'k' }, 'S1V1', 'Tapered trousers with the knees bound for crawling.', { cut: 'taper' }, [wrap('shin', S.pants, { t: [0, .3], n: 3, th: .12, c: 'B3' })]),
  P('ninja', 'karusan', 'Karusan', { A: 'v', B: 'k' }, 'S1F1', 'Baggy trousers gathered into cuffs at the ankle.', { cut: 'baggy', ankle: 'B3' }),
  P('ninja', 'quilted-trousers', 'Quilted trousers', { A: 'k', B: 'd' }, 'V1S1', 'Padded in rows; warm on a long night\'s wait on a roof.', { cut: 'taper', th: .2 },
    [band('thigh', S.pants, { at: [.3, .65], h: .1, th: .24, c: 'B3', trim: true }), band('shin', S.pants, { at: [.3, .65], h: .1, th: .2, c: 'B3', trim: true })]),
  P('ninja', 'pouch-trousers', 'Trousers with pouches', { A: 'd', B: 'l' }, 'S1F1', 'Tapered, with pouches strapped to the outside of each thigh.', { cut: 'taper' },
    [box('thigh', S.pants, { on: ['out', .45], s: [.9, 1.0, .35], c: 'B3' }), band('thigh', S.pants, { at: [.3, .6], h: .12, th: .14, c: 'B2' })]),

  // ---- pants armour ----
  L('armour', 'samurai', 'kusazuri-seven', 'Seven-plate kusazuri', { A: 'i', C: 'v' }, 'V2', "Iron Ash's tassets: seven panels of two lames each, laced in indigo, hinged at the waist.",
    [skirt(S.outer, { at: [.5, -.5, 1.5, -1.5, Math.PI - .55, Math.PI + .55, Math.PI], rows: 2, len: 3.2, w: 1.85, c: 'A5', c2: 'A4', lace: 'C4' })], SKIRT),
  L('armour', 'samurai', 'ita-haidate', 'Ita-haidate', { A: 'q', C: 'v' }, 'V2', 'A plated apron over both thighs, black-lacquered, tied behind.',
    [band('hips', S.plate, { at: [.15], h: .3, th: .2, c: 'C3' }), plates('thigh', S.plate, { face: 'front', n: 4, w: 2.0, th: .16, t: [.05, .85], c: 'A4', c2: 'A5', lace: 'C4' })], { pix: 'haidate' }),
  L('armour', 'samurai', 'kawara-haidate', 'Kawara-haidate', { A: 'x', B: 'q', C: 'k' }, 'V2E1', 'Small plates set like roof tiles over the thighs, oxblood and black.',
    [plates('thigh', S.plate, { face: ['front', .7], n: 5, w: 1.5, th: .14, gap: 1, t: [.05, .9], c: 'A4', c2: 'B4' })], { pix: 'haidate' }),
  L('armour', 'samurai', 'kusari-haidate', 'Kusari-haidate', { A: 'c', B: 'i' }, 'V1S1', 'Mail over the thighs with three small plates down the front of each.',
    [tube('thigh', S.mail, { c: 'A3', th: .1, t: [0, .9] }), plates('thigh', S.plate, { face: 'front', n: 3, w: .8, th: .12, gap: 1, t: [.1, .85], c: 'B5' })], { pix: 'haidate' }),
  L('armour', 'samurai', 'o-yoroi-kusazuri', 'Ō-yoroi great kusazuri', { A: 'x', C: 'w' }, 'V3E1', 'Four great panels of five lames each, the old box armour\'s skirt, laced in ash white.',
    [skirt(S.outer, { at: [0, Math.PI / 2, -Math.PI / 2, Math.PI], rows: 5, len: 3.8, w: 2.9, c: 'A4', c2: 'A3', lace: 'C5' })], SKIRT),
  L('armour', 'samurai', 'iyozane', 'Iyozane skirt', { A: 'n', C: 'k' }, 'V2E1', 'Solid lames that look like scales: six indigo panels.',
    [skirt(S.outer, { n: 6, rows: 3, len: 3.0, w: 2.0, th: .3, c: 'A4', c2: 'A5', lace: 'C2' })], SKIRT),
  L('armour', 'samurai', 'short-kusazuri-haidate', 'Short kusazuri and haidate', { A: 'i', C: 'v' }, 'V2', 'A short iron skirt and a plated apron under it.',
    [plates('thigh', S.plate, { face: 'front', n: 2, w: 1.7, th: .14, t: [.3, .85], c: 'A4', c2: 'A5', lace: 'C4' }), skirt(S.outer, { n: 6, rows: 1, len: 2.0, w: 1.9, c: 'A5', lace: 'C4' })], { pix: 'kusazuri haidate' }),
  L('armour', 'villager', 'koshimino', 'Straw skirt (koshimino)', { A: 'm' }, 'V1F1', 'Long straw hung round the waist: it sheds rain and slows a spear.',
    [skirt(S.outer, { n: 11, rows: 1, len: 4.2, w: 1.15, th: .3, c: 'A3', c2: 'A4', cloth: true, rest: -.12 }), band('hips', S.outer, { at: [.12], h: .3, th: .5, c: 'A2' })], { pix: 'koshimino' }),
  L('armour', 'villager', 'leather-tassets', 'Leather tassets', { A: 'l', B: 'k' }, 'V1E1', 'Four flaps of boiled leather on a belt.',
    [skirt(S.outer, { at: [.6, -.6, Math.PI - .6, Math.PI + .6], rows: 1, len: 3.0, w: 1.9, th: .22, c: 'A3', hem: 'A2' }), band('hips', S.outer, { at: [.12], h: .32, th: .4, c: 'B3' })], SKIRT),
  L('armour', 'villager', 'slat-apron', 'Wooden slat apron', { A: 'y', B: 'm' }, 'V2', 'Three boards hung on straw rope over the front of the legs.',
    [skirt(S.outer, { at: [-.75, 0, .75], rows: 3, len: 3.0, w: 1.6, th: .22, c: 'A4', c2: 'A3', lace: 'B3' })], SKIRT),
  L('armour', 'villager', 'padded-apron', 'Padded apron', { A: 'e', B: 'k' }, 'V1', 'A thick quilted apron, tied at the back.',
    [skirt(S.outer, { at: [0], rows: 1, len: 4.0, w: 3.2, th: .3, c: 'A3', cloth: true, hem: 'B3', rest: -.1 }), band('hips', S.outer, { at: [.15], h: .26, th: .34, c: 'B3' })], { pix: 'apron' }),
  L('armour', 'villager', 'hide-wrap', 'Rope-belted hide', { A: 'f', B: 'm' }, 'V2', 'A pelt wrapped round the hips, belted with straw rope.',
    [skirt(S.outer, { n: 5, rows: 1, len: 3.0, w: 2.3, th: .24, c: 'A3', cloth: true, rest: -.12 }), band('hips', S.outer, { at: [.15], h: .3, th: .5, c: 'B3' })], { pix: 'koshimino' }),
  L('armour', 'ninja', 'chain-skirt', 'Mail skirt', { A: 'c' }, 'V1S1', 'Mail from the waist to mid-thigh, close to the legs.',
    [tube('hips', S.mail, { c: 'A3', th: .1, fl: [0, .2] }), tube('thigh', S.mail, { c: 'A3', th: .1, t: [0, .4] })], { pix: 'mail' }),
  L('armour', 'ninja', 'light-thigh', 'Light thigh guards', { A: 'q', B: 'k' }, 'S2', 'Three small lacquered plates on the outside of each thigh.',
    [plates('thigh', S.plate, { face: 'out', n: 3, w: 1.0, th: .12, t: [.05, .8], c: 'A4', c2: 'A3', lace: 'B3' })], { pix: 'haidate' }),
  L('armour', 'ninja', 'short-kusazuri', 'Short five-plate kusazuri', { A: 'q', C: 'k' }, 'V1S1', 'Five short black panels that never get in the way of a jump.',
    [skirt(S.outer, { n: 5, rows: 2, len: 2.2, w: 1.7, th: .2, c: 'A4', c2: 'A3', lace: 'C3' })], SKIRT),
  L('armour', 'ninja', 'split-skirt', 'Split skirt with pouches', { A: 'k', B: 'l' }, 'S1F1', 'Four black cloth panels split to the waist, two pouches on the belt.',
    [skirt(S.outer, { at: [.75, -.75, Math.PI - .75, Math.PI + .75], rows: 1, len: 3.4, w: 1.7, th: .14, c: 'A2', cloth: true }), band('hips', S.outer, { at: [.12], h: .3, th: .34, c: 'B3' }),
      box('hips', S.outer, { on: [.9, .3], s: [.7, .7, .35], c: 'B3' }), box('hips', S.outer, { on: [-.9, .3], s: [.7, .7, .35], c: 'B3' })], SKIRT),
  L('armour', 'ninja', 'kikko-haidate', 'Kikkō haidate', { A: 'k', B: 'i' }, 'V1S1', 'Hex plates quilted into a black apron over each thigh.',
    [tube('thigh', S.mail, { c: 'A2', th: .1, t: [0, .85] }), plates('thigh', S.plate, { face: ['front', 'out'], n: 3, w: .6, th: .08, gap: 1, t: [.1, .8], c: 'B4' })], { pix: 'haidate' }),
  L('armour', 'ninja', 'side-tassets', 'Lacquered side tassets', { A: 'q', C: 'v' }, 'S1V1', 'Two panels at the hips only: the front and back left free for climbing.',
    [skirt(S.outer, { at: [Math.PI / 2, -Math.PI / 2], rows: 3, len: 2.8, w: 1.8, c: 'A4', c2: 'A3', lace: 'C4' })], SKIRT),

  // ---- feet base ----
  F('base', 'samurai', 'tabi-waraji', 'Tabi and waraji', { A: 'k', B: 'm' }, 'S1', 'Split-toed socks and straw sandals: what Iron Ash walks in.', [boot(S.tight, { c: 'A3', th: .06, split: 1 }), sole(S.over, { c: 'B4', c2: 'B2' })], { pix: 'waraji' }),
  F('base', 'samurai', 'kegutsu', 'Fur boots (kegutsu)', { A: 'f', B: 'k' }, 'V1F1', 'Short boots of bear fur, for a general in the snow.', [boot(S.over, { c: 'A4', th: .16, up: .55, flUp: .12, c2: 'A3' })], { pix: 'boots' }),
  F('base', 'samurai', 'black-tabi', 'Black tabi', { A: 'k' }, 'S1', 'Just the split-toed socks, fastened at the heel.', [boot(S.tight, { c: 'A3', th: .07, split: 1, up: .82, c2: 'A2' })], { pix: 'tabi' }),
  F('base', 'samurai', 'ashinaka', 'Ashinaka half-sandals', { A: 'm', B: 'w' }, 'S2', 'Sandals with no heel: the toes grip, the heel strikes the ground. For battle.',
    [boot(S.tight, { c: 'B4', th: .05, split: 1 }), sole(S.over, { c: 'A4', c2: 'A2', style: 'flat' })], { pix: 'waraji' }),
  F('base', 'villager', 'zori', 'Zōri', { A: 'm', B: 'k' }, 'S1', 'Flat straw sandals with a cloth thong.', [sole(S.over, { c: 'A4', c2: 'B3' })], { pix: 'waraji' }),
  F('base', 'villager', 'geta', 'Geta', { A: 'y', B: 'k' }, 'F1', 'Raised wooden clogs. Loud on stone.', [sole(S.over, { c: 'A4', c2: 'B3', style: 'geta' })], { pix: 'waraji' }),
  F('base', 'villager', 'foot-wraps', 'Bare-foot wraps', { A: 'g' }, 'S1', 'Grey cloth bound round the feet and ankles; no sandal at all.', [boot(S.tight, { c: 'A3', th: .06 }), wrap('shin', S.over, { t: [.7, 1], n: 3, th: .08, c: 'A4' })], { shapes: { shin: 'tucked' }, pix: 'wraps' }),
  F('base', 'villager', 'yukigutsu', 'Straw snow boots', { A: 'm' }, 'V1F1', 'Thick straw boots woven to the calf.', [boot(S.over, { c: 'A3', th: .24, up: .45, flUp: .22 }), band('shin', S.over, { at: [.5, .75], h: .14, th: .4, c: 'A2' })], { shapes: { shin: 'tucked' }, pix: 'boots' }),
  F('base', 'ninja', 'soft-tabi', 'Soft-soled tabi', { A: 'k' }, 'S1', 'Black tabi with soles soft enough to feel a roof tile shift.', [boot(S.over, { c: 'A2', th: .08, split: 1, up: .7, c2: 'A2' })], { shapes: { shin: 'tucked' }, pix: 'tabi' }),
  F('base', 'ninja', 'ashiko', 'Ashiko', { A: 'k', B: 'i' }, 'S1E1', 'Iron spikes strapped under the tabi, for climbing.', [boot(S.tight, { c: 'A3', th: .08, split: 1, spikes: 'B5' })], { pix: 'tabi' }),
  F('base', 'ninja', 'tabi-kyahan', 'Tabi with kyahan', { A: 'd', B: 'k' }, 'S1V1', 'Leg wraps from knee to ankle over split-toed tabi.', [boot(S.tight, { c: 'B3', th: .06, split: 1 }), wrap('shin', S.over, { t: [.25, 1], n: 6, th: .1, c: 'A3', c2: 'B2' })], { shapes: { shin: 'tucked' }, pix: 'kyahan' }),
  F('base', 'ninja', 'rag-feet', 'Rag-wrapped feet', { A: 'd' }, 'S2', 'Rags wound over the feet and up the shin: silent on any floor.', [boot(S.tight, { c: 'A3', th: .1 }), wrap('shin', S.over, { t: [.55, 1], n: 4, th: .1, c: 'A2' })], { shapes: { shin: 'tucked' }, pix: 'wraps' }),

  // ---- feet armour ----
  F('armour', 'samurai', 'shino-suneate', 'Shino-suneate', { A: 'i', B: 'v' }, 'V1', "Iron Ash's shin guards: iron splints on cloth, tied behind the calf.",
    [plates('shin', S.plate, { face: ['front', .5, -.5], n: 1, w: .42, th: .16, t: [.12, .92], c: 'A5' }), band('shin', S.plate, { at: [.15, .85], h: .14, th: .26, c: 'B3' })], GUARD),
  F('armour', 'samurai', 'tsutsu-suneate', 'Tsutsu-suneate', { A: 'q', B: 'k' }, 'V2', 'Hinged black tubes round the whole shin.', [tube('shin', S.plate, { c: 'A4', th: .2, t: [.08, .94] }), band('shin', S.plate, { at: [.2, .8], h: .12, th: .24, c: 'A6' })], GUARD),
  F('armour', 'samurai', 'tateage-suneate', 'Suneate with tateage', { A: 'x', B: 'k' }, 'V2', 'Oxblood splints and tall plates standing up to guard the knee.',
    [plates('shin', S.plate, { face: ['front', .5, -.5], n: 1, w: .45, th: .16, t: [.15, .92], c: 'A4' }), box('shin', S.plate, { on: ['front', .05], dy: .5, s: [1.5, 1.5, .18], c: 'A5', r: [-.15, 0, 0] })], GUARD),
  F('armour', 'samurai', 'kogake', 'Kogake', { A: 'i', B: 'c' }, 'V1S1', 'Armoured tabi: mail and small plates over the foot.', [boot(S.plate, { c: 'B3', th: .08, plates: 3, p: 'A5', c2: 'A4' })], { pix: 'boots' }),
  F('armour', 'samurai', 'o-tateage', 'Great tateage', { A: 'n', B: 'k' }, 'V3', 'An indigo tube over the shin and a broad knee plate in three lames.',
    [tube('shin', S.plate, { c: 'A4', th: .2, t: [.2, .94] }), plates('shin', S.plate, { face: 'front', n: 3, w: 1.4, th: .16, t: [-.25, .2], c: 'A5', c2: 'A4' })], GUARD),
  F('armour', 'samurai', 'chain-kogake', 'Mail shins and kogake', { A: 'c', B: 'i' }, 'V2', 'Mail from the knee to the toes, plated over the instep.',
    [tube('shin', S.mail, { c: 'A3', th: .08, t: [.05, .95] }), boot(S.plate, { c: 'A3', th: .08, plates: 2, p: 'B5', c2: 'B4' })], GUARD),
  F('armour', 'villager', 'padded-gaiters', 'Padded gaiters', { A: 'e', B: 'k' }, 'V1', 'Quilted cloth from knee to ankle, tied in three places.', [wrap('shin', S.mail, { n: 4, th: .2, c: 'A3' }), band('shin', S.mail, { at: [.15, .5, .85], h: .12, th: .26, c: 'B3' })], { shapes: { shin: 'tucked' }, pix: 'kyahan' }),
  F('armour', 'villager', 'habaki', 'Straw shin guards (habaki)', { A: 'm' }, 'V1F1', 'Straw woven into a stiff tube round the shin.', [plates('shin', S.plate, { face: ['front', 'out', 'in', 'back'], n: 1, w: .8, th: .2, t: [.1, .92], c: 'A4' }), band('shin', S.plate, { at: [.25, .7], h: .16, th: .3, c: 'A2' })], GUARD),
  F('armour', 'villager', 'shin-boards', 'Wooden shin boards', { A: 'y', B: 'm' }, 'V1', 'A board down the front of each shin, roped on.', [plates('shin', S.plate, { face: 'front', n: 1, w: 1.0, th: .2, t: [.1, .9], c: 'A4' }), band('shin', S.plate, { at: [.25, .75], h: .14, th: .26, c: 'B3' })], GUARD),
  F('armour', 'villager', 'fur-wraps', 'Fur leg wraps', { A: 'f' }, 'V1F1', 'Strips of fur bound over the shins for the mountain passes.', [wrap('shin', S.mail, { n: 4, th: .24, c: 'A4' })], { shapes: { shin: 'tucked' }, pix: 'kyahan' }),
  F('armour', 'villager', 'leather-boots', 'Leather boots', { A: 'l' }, 'V1S1', 'Hide boots to mid-calf, laced at the front.', [boot(S.plate, { c: 'A3', th: .14, up: .4, c2: 'A3' }), plates('shin', S.plate, { face: 'front', n: 4, w: .12, th: .2, t: [.45, .95], c: 'A1' })], GUARD),
  F('armour', 'ninja', 'chain-shins', 'Mail shin guards', { A: 'c' }, 'S1V1', 'A close tube of mail over the shin.', [tube('shin', S.mail, { c: 'A3', th: .07, t: [.05, .95] })], GUARD),
  F('armour', 'ninja', 'plated-greaves', 'Plated shinobi greaves', { A: 'q', B: 'c' }, 'V1S1', 'Three black plates down the shin on a mail backing.', [tube('shin', S.mail, { c: 'B3', th: .07 }), plates('shin', S.plate, { face: 'front', n: 3, w: .9, th: .12, gap: 1, t: [.1, .9], c: 'A4' })], GUARD),
  F('armour', 'ninja', 'splint-kyahan', 'Kyahan with iron splints', { A: 'k', B: 'i' }, 'S1V1', 'Cloth leg wraps hiding a thin iron splint down the front.', [wrap('shin', S.mail, { n: 5, th: .1, c: 'A3' }), plates('shin', S.plate, { face: 'front', n: 1, w: .3, th: .1, t: [.15, .9], c: 'B5' })], GUARD),
  F('armour', 'ninja', 'spiked-guard', 'Spiked foot guard', { A: 'q', B: 'i' }, 'E1S1', 'A plated foot with spikes under the sole; it climbs and it kicks.', [boot(S.plate, { c: 'A3', th: .1, plates: 2, p: 'A5', c2: 'A4', spikes: 'B5' })], { pix: 'boots' }),
  F('armour', 'ninja', 'felt-boots', 'Silent felt boots', { A: 'k' }, 'S2', 'Felt boots to the knee, soft enough to walk on dry leaves.', [boot(S.plate, { c: 'A2', th: .16, up: .1, c2: 'A2' })], { shapes: { shin: 'tucked' }, pix: 'boots' }),
];
