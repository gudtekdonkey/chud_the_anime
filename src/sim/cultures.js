// ---- Cultures and classes: who people are, what they carry and wear, and whom they hate (docs/enemy-behavior.md sections 5b and 7) ----
// Plain data. worldgen.js makes 20 cultures from these kinds and spreads them over the 100 regions.

// Classes decide rank, dress and weapons (owner 2026-09-26: "retainers only really katana; peasants and rebels katanas or naginatas").
// dress: 'royal' (colour: only very high royalty wear it, owner 2026-09-26), 'black', 'dark' (black with faint tints on armour), 'earth' (beige, brown, grey).
// weapons: ids from src/weapons/ with weights. Jobs: what they do all day (people lane expands these).
export const CLASSES = {
  royal:    { rank: 6, dress: 'royal', weapons: [['katana', 3], ['daisho', 2], ['tessen', 1]], jobs: ['lord'] },
  noble:    { rank: 5, dress: 'dark',  weapons: [['katana', 3], ['daisho', 2], ['tessen', 1]], jobs: ['lord', 'magistrate', 'steward'] },
  retainer: { rank: 4, dress: 'dark',  weapons: [['katana', 5], ['daisho', 2], ['nodachi', 1]], jobs: ['retainer', 'guard', 'magistrate', 'tax collector'] },
  ronin:    { rank: 3, dress: 'black', weapons: [['katana', 5], ['nodachi', 2], ['wakizashi', 1]], jobs: ['ronin', 'bounty hunter', 'guard'] },
  ashigaru: { rank: 2, dress: 'earth', weapons: [['yari', 5], ['katana', 1], ['tetsubo', 1]], jobs: ['ashigaru', 'guard', 'courier'] },
  monk:     { rank: 3, dress: 'black', weapons: [['naginata', 3], ['bo', 3]], jobs: ['monk', 'abbot', 'healer'] },
  commoner: { rank: 1, dress: 'earth', weapons: [['kama', 3], ['bo', 1], ['tanto', 1], ['nunchaku', 1]],
    jobs: ['farmer', 'farmer', 'farmer', 'fisher', 'woodcutter', 'miner', 'smith', 'merchant', 'innkeeper', 'carpenter', 'weaver', 'brewer', 'courier'] },
  rebel:    { rank: 1, dress: 'earth', weapons: [['naginata', 3], ['yari', 3], ['kama', 3], ['nunchaku', 1], ['katana', 1]], jobs: ['farmer', 'rebel'] },
  outlaw:   { rank: 0, dress: 'earth', weapons: [['katana', 2], ['tanto', 2], ['kanabo', 2], ['tetsubo', 1], ['wakizashi', 1]], jobs: ['bandit', 'smuggler', 'thief'] },
  shinobi:  { rank: 2, dress: 'black', weapons: [['tanto', 3], ['kusarigama', 3], ['wakizashi', 1]], jobs: ['shinobi', 'spy', 'courier'] },
};

// Culture kinds: the mix of classes, their traits, and how they feel about other kinds.
// classes: [[class, weight]]; traits: personality traits (src/traits/traits.js) common among them; despise: traits they cannot stand.
// count: how many cultures of this kind; size: how many regions each tends to cover.
export const KINDS = {
  clan:     { count: 7, size: 7, label: 'clan', classes: [['noble', 1], ['retainer', 6], ['ashigaru', 8], ['commoner', 30], ['monk', 1]],
    traits: ['soldier', 'stoic', 'proud', 'veteran', 'calm'], despise: ['drunk', 'lazy', 'slouch'], royalty: true },
  court:    { count: 1, size: 2, label: 'court', classes: [['royal', 2], ['noble', 5], ['retainer', 6], ['commoner', 20]],
    traits: ['regal', 'vain', 'serene', 'scholar'], despise: ['drunk', 'scratcher', 'brawler'], royalty: true },
  rebels:   { count: 3, size: 5, label: 'free valleys', classes: [['rebel', 12], ['commoner', 20], ['monk', 2], ['ronin', 1]],
    traits: ['restless', 'grim', 'weary', 'eager'], despise: ['regal', 'vain', 'cocky'] },
  monastic: { count: 2, size: 3, label: 'temple lands', classes: [['monk', 8], ['commoner', 14]],
    traits: ['serene', 'monk', 'humble', 'calm'], despise: ['menacing', 'vain', 'drunk'] },
  bandits:  { count: 2, size: 4, label: 'outlaw coast', classes: [['outlaw', 14], ['ronin', 3], ['commoner', 6]],
    traits: ['menacing', 'cocky', 'brawler', 'drunk', 'twitchy'], despise: ['soldier', 'regal', 'monk'] },
  shinobi:  { count: 1, size: 2, label: 'hidden villages', classes: [['shinobi', 8], ['commoner', 10]],
    traits: ['shinobi', 'wary', 'nimble', 'shadow'], despise: ['cocky', 'hummer', 'vain'] },
  merchants:{ count: 2, size: 4, label: 'merchant league', classes: [['commoner', 24], ['ronin', 3], ['ashigaru', 3]],
    traits: ['cheerful', 'glancer', 'eager', 'vain'], despise: ['menacing', 'brawler'] },
  fishers:  { count: 1, size: 4, label: 'fishing folk', classes: [['commoner', 24], ['ronin', 1]],
    traits: ['weary', 'cheerful', 'calm', 'hummer'], despise: ['regal', 'cocky'] },
  miners:   { count: 1, size: 4, label: 'mountain folk', classes: [['commoner', 22], ['ashigaru', 2], ['outlaw', 1]],
    traits: ['heavy', 'lumbering', 'grim', 'stoic'], despise: ['vain', 'nimble'] },
};
// how one kind regards another, before neighbours and history push it: -1 kill on sight .. +1 allies
const REL = {
  'clan|clan': -.3, 'clan|court': .4, 'clan|rebels': -.8, 'clan|monastic': .2, 'clan|bandits': -.9, 'clan|shinobi': -.3, 'clan|merchants': .3, 'clan|fishers': .1, 'clan|miners': .1,
  'court|rebels': -1, 'court|monastic': .3, 'court|bandits': -.9, 'court|shinobi': -.5, 'court|merchants': .4, 'court|fishers': .1, 'court|miners': .1,
  'rebels|monastic': .3, 'rebels|bandits': -.4, 'rebels|shinobi': .1, 'rebels|merchants': -.2, 'rebels|fishers': .4, 'rebels|miners': .4,
  'monastic|bandits': -.6, 'monastic|shinobi': -.2, 'monastic|merchants': .1, 'monastic|fishers': .3, 'monastic|miners': .2,
  'bandits|shinobi': -.2, 'bandits|merchants': -.9, 'bandits|fishers': -.5, 'bandits|miners': -.3,
  'shinobi|merchants': 0, 'shinobi|fishers': 0, 'shinobi|miners': 0,
  'merchants|fishers': .3, 'merchants|miners': .3, 'fishers|miners': .2,
  'court|court': .5, 'rebels|rebels': .4, 'monastic|monastic': .5, 'bandits|bandits': -.2, 'merchants|merchants': -.1, 'shinobi|shinobi': .3, 'fishers|fishers': .5, 'miners|miners': .5,
};
export const kindRelation = (a, b) => REL[a + '|' + b] ?? REL[b + '|' + a] ?? 0;

// ---- names: invented, Japanese in sound, never a real clan or place ----
const ON = ['ka', 'ta', 'na', 'ma', 'sa', 'ha', 'ya', 'ra', 'wa', 'ki', 'shi', 'chi', 'ni', 'mi', 'ri', 'ku', 'tsu', 'nu', 'mu', 'yu', 'ru', 'ko', 'to', 'no', 'mo', 'yo', 'ro', 'se', 'te', 'ne', 'me', 're', 'ga', 'ji', 'zu', 'do', 'bo', 'go', 'hi', 'fu', 'ho', 'o', 'a', 'i', 'u', 'e'];
const PLACE_END = ['mura', 'hara', 'yama', 'kawa', 'zawa', 'saka', 'no', 'ta', 'shima', 'oka', 'tani', 'hama', 'mori', 'ishi', 'se'];
const GIVEN_M = ['rō', 'ta', 'suke', 'maru', 'zō', 'nobu', 'mune', 'hide', 'kichi', 'emon', 'bei', 'shirō', 'jirō'];
const GIVEN_F = ['ko', 'e', 'yo', 'no', 'mi', 'ne', 'ha', 'ka', 'ri', 'sa'];
const cap = s => s[0].toUpperCase() + s.slice(1);
export const placeName = r => cap(r.pick(ON) + r.pick(ON) + r.pick(PLACE_END));
export const familyName = r => cap(r.pick(ON) + r.pick(ON) + r.pick(['moto', 'da', 'yama', 'kawa', 'no', 'mura', 'saki', 'ta', 'hara', 'gawa']));
export const givenName = (r, sex) => cap(r.pick(ON) + (sex === 'f' ? r.pick(GIVEN_F) : r.pick(ON) + r.pick(GIVEN_M)));
