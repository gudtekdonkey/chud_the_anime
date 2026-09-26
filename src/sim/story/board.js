import { ST, today, regName, who, actor } from './state.js';
import { openQuests } from './quests.js';
import { taleOf } from './frame.js';

// ---- How the world tells people: the notice board at a region's seat, and the signs he would see or hear there ----
// Everything here only reads the ledger; the game and the map draw from it.
const BOARD_OF = { inn: 'the inn', shrine: 'the shrine', magistrate: "the magistrate's gate", person: 'asked in person', lord: "the lord's hall" };

// the board of a region: recent news that reached it, the contracts posted there, its main tale, and what is in the air
export function boardOf(L, region, { days = 28, max = 12 } = {}) {
  const S = ST(L), d = today(L), g = L.regions[region];
  const news = S.news.filter(n => d - n.d <= days && n.regions.includes(region) && !n.type.startsWith('story.quest')).slice(-max).reverse();
  const contracts = openQuests(L, region).map(q => ({ id: q.id, kind: q.kind, title: q.title, text: q.text, where: BOARD_OF[q.board] || q.board, reward: q.reward, due: q.due - d,
    giver: q.giver != null ? who(L, q.giver) : null, taken: q.state === 'taken' }));
  const recent = S.news.filter(n => d - n.d <= 3 && n.regions.includes(region));
  const R = S.reg[region];
  return { region, name: g.name, seat: g.seat, lord: g.lord != null ? who(L, g.lord) : null, occupier: g.occupier || null, tale: taleOf(L, region), news, contracts,
    signs: { smoke: recent.some(n => n.heralds.includes('smoke')), bell: recent.some(n => n.heralds.includes('bell')), messengers: recent.filter(n => n.heralds.includes('messenger')).length },
    mood: { hunger: R.hunger, unrest: R.unrest, danger: R.danger, sick: R.sick, tax: R.tax, harvest: R.harvest, war: R.war } };
}
// news lines anywhere (the world map's feed); filter by type prefix
export const newsSince = (L, day, prefix = '') => ST(L).news.filter(n => n.d >= day && n.type.startsWith(prefix));
// a line for someone else's event (a glitch storm, from the travel lane) without emitting it again
export function hear(L, type, text, heralds, regions) {
  const S = ST(L); S.news.push({ d: today(L), type, text, heralds, regions, zone: null }); if (S.news.length > 1500) S.news.shift();
}
export const regionLabel = (L, r) => regName(L, r);
export const lordOf = (L, r) => actor(L, L.regions[r].lord);
