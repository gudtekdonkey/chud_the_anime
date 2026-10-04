// ---- Outfits: a piece (or nothing) per slot and layer. Presets (a samurai, a villager, a ninja, and mixes of the
// three), a seeded random outfit that fills every slot, the stats an outfit adds up to, and a compact string form for
// the URL and the browser's storage.
import { SLOTS, LAYERS, STAT_KEYS } from 'ronin-engine/iso/gear/schema.js';
import { BY_ID, BY_CELL } from './items.js';

export const empty = () => Object.fromEntries(SLOTS.map(s => [s, { base: null, armour: null }]));
// [head, torso, left arm, right arm, left hand, right hand, pants, feet], each [base, armour]; "x" on an arm or hand
// design means its own side (-l / -r)
const make = rows => { const o = empty(); SLOTS.forEach((s, i) => LAYERS.forEach((l, j) => { const id = rows[i][j]; o[s][l] = id ? id.replace(/-x$/, s.endsWith('L') ? '-l' : '-r') : null; })); return o; };
export const PRESETS = [
  { id: 'iron-ash', name: 'Iron Ash V3, in gear', family: 'samurai', about: 'The picked look rebuilt from gear pieces: jingasa and menpō, the indigo jinbaori over the laced dō, sode, a kote on the sword arm, kusazuri, suneate, waraji.',
    o: make([['chonmage', 'iron-jingasa'], ['kosode-black', 'iron-ash-jinbaori'], ['kote-shita-x', 'o-sode-x'], ['kote-shita-x', 'kote-kosode-x'], ['tabi-glove-x', 'tekko-x'], ['tabi-glove-x', 'tekko-x'], ['hakama-black', 'kusazuri-seven'], ['tabi-waraji', 'shino-suneate']]) },
  { id: 'general', name: 'Samurai: the general', family: 'samurai', about: 'Ō-yoroi in oxblood, the crescent helmet, great shoulder guards and the four great kusazuri.',
    o: make([['helmet-cap', 'crescent-kabuto'], ['kosode-mon', 'o-yoroi'], ['kote-shita-x', 'o-sode-x'], ['kote-shita-x', 'o-sode-x'], ['yugake-x', 'gauntlet-x'], ['yugake-x', 'gauntlet-x'], ['hakama-striped', 'o-yoroi-kusazuri'], ['black-tabi', 'tateage-suneate']]) },
  { id: 'ashigaru', name: 'Samurai: foot soldier', family: 'samurai', about: 'A zunari kabuto, a black haramaki, splinted kote, a short skirt and tube greaves.',
    o: make([['hachimaki-white', 'zunari'], ['kosode-black', 'haramaki'], ['tasuki-x', 'shino-gote-x'], ['tasuki-x', 'shino-gote-x'], ['tabi-glove-x', 'tekko-x'], ['tabi-glove-x', 'tekko-x'], ['kobakama', 'short-kusazuri-haidate'], ['tabi-waraji', 'tsutsu-suneate']]) },
  { id: 'farmer', name: 'Villager: called to the levy', family: 'villager', about: 'A farmer in what he could find: a sedge kasa, a slat cuirass, padded sleeves, boards on the shins.',
    o: make([['tenugui', 'sugegasa'], ['noragi', 'wood-slats'], ['rolled-sleeve-x', 'padded-guard-x'], ['rolled-sleeve-x', 'padded-guard-x'], ['work-mitt-x', 'thick-glove-x'], ['work-mitt-x', 'thick-glove-x'], ['tattsuke', 'slat-apron'], ['zori', 'shin-boards']]) },
  { id: 'hunter', name: 'Villager: mountain hunter', family: 'villager', about: 'Hide and fur for the passes: a cheek wrap, a hide coat, leather bracers, fur leg wraps.',
    o: make([['hokkamuri', 'rain-hat'], ['hanten', 'hide-coat'], ['garter-x', 'leather-bracer-x'], ['garter-x', 'leather-bracer-x'], ['rag-wrap-x', 'thick-glove-x'], ['rag-wrap-x', 'thick-glove-x'], ['patched-trousers', 'hide-wrap'], ['yukigutsu', 'fur-wraps']]) },
  { id: 'monk', name: 'Villager: wandering monk', family: 'villager', about: 'The basket over the head, a straw rain cape and straw skirt, bamboo splints, straw on the shins.',
    o: make([['loose-hair', 'tengai'], ['hemp-kimono', 'mino'], ['bandage-x', 'bamboo-splint-x'], ['bandage-x', 'bamboo-splint-x'], ['rag-wrap-x', 'straw-mitten-x'], ['rag-wrap-x', 'straw-mitten-x'], ['fundoshi-apron', 'koshimino'], ['foot-wraps', 'habaki']]) },
  { id: 'night-runner', name: 'Ninja: night runner', family: 'ninja', about: 'Black zukin and hachigane, mail under the uwagi, mail sleeves, climbing claws.',
    o: make([['zukin', 'hachigane'], ['shinobi-uwagi', 'kusari-katabira'], ['arm-wraps-x', 'kusari-gote-x'], ['arm-wraps-x', 'kusari-gote-x'], ['tabi-glove-x', 'shuko-x'], ['tabi-glove-x', 'shuko-x'], ['shinobi-bakama', 'chain-skirt'], ['tabi-kyahan', 'chain-shins']]) },
  { id: 'crow', name: 'Ninja: the crow', family: 'ninja', about: 'The crow-beak mask, a short ragged cape, black lacquer at the hips and the shins.',
    o: make([['night-cowl', 'crow-mask'], ['night-jacket', 'short-cape'], ['bound-sleeve-x', 'hidden-plate-x'], ['bound-sleeve-x', 'hidden-plate-x'], ['grip-wrap-x', 'black-tekko-x'], ['grip-wrap-x', 'black-tekko-x'], ['leggings', 'side-tassets'], ['soft-tabi', 'plated-greaves']]) },
  { id: 'three-roads', name: 'Mix: the ronin of three roads', family: 'mix', about: 'A samurai\'s dō and kusazuri, a villager\'s kasa and patched robe, a ninja\'s claw on the right hand.',
    o: make([['chonmage', 'sugegasa'], ['patched-kosode', 'okegawa-do'], ['tasuki-x', 'o-sode-x'], ['arm-wraps-x', 'leather-bracer-x'], ['yugake-x', 'tekko-x'], ['grip-wrap-x', 'shuko-x'], ['torn-hakama', 'kusazuri-seven'], ['tabi-waraji', 'splint-kyahan']]) },
  { id: 'deserter', name: 'Mix: the deserter', family: 'mix', about: 'A folding tatami dō over a farmer\'s jacket, a pot for a helmet, kikkō sleeves taken off a dead man.',
    o: make([['hachimaki-white', 'pot-helm'], ['hanten', 'tatami-do'], ['kote-shita-x', 'kikko-sleeve-x'], ['kote-shita-x', 'kikko-sleeve-x'], ['work-mitt-x', 'gauntlet-x'], ['work-mitt-x', 'gauntlet-x'], ['tattsuke', 'kusari-haidate'], ['ashinaka', 'kogake']]) },
  { id: 'veiled', name: 'Mix: the veiled blade', family: 'mix', about: 'A veiled kasa and a hakama, a mail vest under a hide coat, one ō-sode and one bare chain arm.',
    o: make([['fukumen', 'veiled-kasa'], ['kosode-black', 'chain-vest'], ['kote-shita-x', 'o-sode-x'], ['arm-wraps-x', 'kusari-gote-x'], ['tabi-glove-x', 'black-tekko-x'], ['yugake-x', 'archer-tekko-x'], ['hakama-black', 'leather-tassets'], ['black-tabi', 'felt-boots']]) },
];
export const PRESET = Object.fromEntries(PRESETS.map(p => [p.id, p]));

// a seeded random outfit: every slot gets a base and an armour piece (from one family, or any); arms and hands match
// side to side two times in three, as most people dress
export function randomOutfit(seed = 1, family = null) {
  let s = (seed * 2654435761 >>> 0) % 2147483647 || 7; const rnd = () => (s = s * 16807 % 2147483647) / 2147483647;
  const o = empty(), pick = list => list[Math.floor(rnd() * list.length)];
  for (const slot of SLOTS) for (const layer of LAYERS) {
    const pool = BY_CELL[slot][layer].filter(p => !family || p.family === family); let p = pick(pool.length ? pool : BY_CELL[slot][layer]);
    const twin = slot.endsWith('R') && o[slot.slice(0, -1) + 'L'][layer];
    if (twin && rnd() < .67) p = BY_ID[twin.replace(/-l$/, '-r')] || p;
    o[slot][layer] = p.id;
  }
  return o;
}
// what the outfit adds to VIG / EDG / SPD / FOC (party/kit.js gearStats' vocabulary)
export function outfitStats(o) { const out = Object.fromEntries(STAT_KEYS.map(k => [k, 0]));
  for (const s of SLOTS) for (const l of LAYERS) { const p = o[s] && BY_ID[o[s][l]]; if (p) for (const k in p.stats) out[k] += p.stats[k]; }
  return out; }
// what they count for: every piece counts, each point worth ¼ of player/stats.js's per-point effect (owner 1bB,
// 2026-10-03), so a full 16-piece outfit (~20–33 points) lands near today's 7-slot wardrobe (~8)
export const GEAR_POINT = .25;
export function outfitEffect(o) { const st = outfitStats(o); for (const k in st) st[k] *= GEAR_POINT; return st; }
// "id,id,,id…" in slot then layer order (empty for nothing), and back; unknown ids are dropped
export const encode = o => SLOTS.flatMap(s => LAYERS.map(l => (o[s] && o[s][l]) || '')).join(',');
export function decode(str) { const o = empty(), ids = String(str || '').split(',');
  SLOTS.forEach((s, i) => LAYERS.forEach((l, j) => { const id = ids[i * 2 + j], p = id && BY_ID[id]; o[s][l] = p && p.slot === s && p.layer === l ? id : null; })); return o; }
