// ---- The game's persona picks: the ready-made characters, a person of each of its cultures (src/traits/cultures.js),
// and each trait alone; personaOf itself is the engine's (ronin-engine/persona/persona.js)
import { TRAITS, PRESETS } from 'ronin-engine/traits/traits.js';
import { CULTURES, personOf } from '../../traits/cultures.js';
import { personaOf, summary, PLAIN } from 'ronin-engine/persona/persona.js';

export { PRESETS, CULTURES, TRAITS, personOf, personaOf, summary, PLAIN };
// the picker's choices: the ready-made characters, a person of each culture, and each trait alone
export const PICKS = [
  ...Object.keys(PRESETS).map(n => ({ id: 'p:' + n, group: 'Characters', name: n, list: () => PRESETS[n] })),
  ...Object.entries(CULTURES).map(([id, c]) => ({ id: 'c:' + id, group: 'A person of a culture', name: c.name, culture: id, list: seed => personOf(id, seed) })),
  ...Object.entries(TRAITS).map(([id, t]) => ({ id: 't:' + id, group: 'One trait', name: t.name, list: () => [[id, 1]] })),
];
export const pickOf = id => PICKS.find(p => p.id === id) || PICKS[0];
export const describe = list => list.length ? list.map(([id, k]) => `${TRAITS[id].name} ${k}`).join(' · ') : 'no traits (as drawn)';
