import { zoneAt } from '../ledger.js';
import { HOURS_PER_YEAR } from '../time.js';
import { ST, today, clamp, announce, kill, regName, census } from './state.js';

// ---- The calendar and nature: seasons, festivals, the harvest, famine, and the disasters that move them (docs/sim-story.md) ----
// Each region keeps a harvest factor for the year (1 = a normal crop). Weather and war push it down; the autumn harvest turns it
// into hunger; winter deepens hunger into famine. The economy lane owns stores and prices: it reads these events (and their
// `effects`) and can push famine back to us with econ.famine.

export function initNature(L) {
  const S = ST(L), adj = L.regions.map(() => new Set()), geo = L.regions.map(() => ({ n: 0, coast: 0, wet: 0, high: 0, road: 0 }));
  for (const z of L.zones) {
    if (z.region < 0) continue; const g = geo[z.region]; g.n++;
    if (z.biome === 'coast') g.coast++; if (z.biome === 'paddy' || z.biome === 'marsh') g.wet++;
    if (z.biome === 'hills' || z.biome === 'mountains') g.high++; if (z.road) g.road++;
    for (const [dx, dy] of [[1, 0], [0, 1]]) { const n = zoneAt(L, z.x + dx, z.y + dy); if (n && n.region >= 0 && n.region !== z.region) { adj[z.region].add(n.region); adj[n.region].add(z.region); } }
  }
  S.adj = adj.map(s => [...s].sort((a, b) => a - b));
  S.geo = geo.map(g => ({ coast: +(g.coast / g.n).toFixed(2), wet: +(g.wet / g.n).toFixed(2), high: +(g.high / g.n).toFixed(2), road: +(g.road / g.n).toFixed(2) }));
  S.villages = L.regions.map(() => []);
  for (const z of L.zones) if (z.kind === 'village') S.villages[z.region].push([z.x, z.y]);
  // danger starts from the outlaw camps in each region
  for (const z of L.zones) if (z.kind === 'camp') S.reg[z.region].danger = clamp(S.reg[z.region].danger + .15);
}

const ALL = L => L.regions.map(r => r.id);
// people who die in a disaster: the old and the very young first, from the settlements of a region
function toll(L, r, region, n, cause, cen) {
  const pool = cen.byRegion[region].all; let dead = 0;
  for (let i = 0; i < n * 3 && dead < n && pool.length; i++) { const id = r.pick(pool), a = L.actors[id];
    const age = (L.hour - a.born) / HOURS_PER_YEAR; if ((age > 55 || age < 6 || r.chance(.25)) && kill(L, id, cause)) dead++; }
  return dead;
}

// ---- the calendar, day by day ----
export function natureDay(L, cal, r) {
  const S = ST(L), d = cal.dayOfSeason, s = cal.seasonIndex;
  if (s === 0 && d === 1) {   // the New Year: a fresh crop in the ground, a little calm everywhere
    for (const g of S.reg) { g.harvest = 1; g.unrest = clamp(g.unrest - .05); }
    announce(L, 'event.festival', { name: 'New Year', year: cal.year }, `The New Year, year ${cal.year}: bells at every shrine, debts called in, the first sunrise watched from the hills.`, ['bell'], ALL(L));
  }
  if (s === 0 && d === 8) announce(L, 'event.planting', { year: cal.year, effects: { labour: 1.3 } }, 'Planting: every hand is in the paddies; the roads are quiet and the inns half empty.', ['bell'], ALL(L));
  if (s === 1 && d === 13) {
    const dead = L.log.filter(e => e.type === 'story.killed' && L.hour - e.h < HOURS_PER_YEAR).length;
    announce(L, 'event.festival', { name: 'Obon', year: cal.year, days: 3 }, `Obon: lanterns on the rivers for the dead${dead ? `, ${dead} of them this year by sword, hunger or sickness` : ''}. Feuds rest for three days.`, ['bell'], ALL(L));
  }
  if (s === 2 && d === 14) harvest(L, cal);
  if (s === 3 && (d === 1 || d === 15)) winter(L, cal, r, d === 1);
}

function harvest(L, cal) {
  const S = ST(L), poor = [], rich = [];
  S.reg.forEach((g, i) => {
    const war = g.war ? .1 : 0;
    g.hunger = +clamp((1 - g.harvest) * 1.4 + (g.tax - .4) * .6 + war).toFixed(2);
    if (g.harvest <= .72) poor.push(i); else if (g.harvest >= 1.08) rich.push(i);
  });
  announce(L, 'event.harvest', { year: cal.year, yields: Object.fromEntries(S.reg.map((g, i) => [i, +g.harvest.toFixed(2)])), poor, rich,
    effects: { prices: { rice: poor.length > 20 ? .25 : 0 } } },
    `The harvest is in: ${poor.length ? `thin in ${poor.length} region${poor.length > 1 ? 's' : ''}` : 'fair everywhere'}${rich.length ? `, heavy in ${rich.length}` : ''}.`, ['board'], ALL(L));
  for (const i of poor) announce(L, 'event.poorHarvest', { region: i, yield: +S.reg[i].harvest.toFixed(2), effects: { prices: { rice: +(1 - S.reg[i].harvest).toFixed(2) } } },
    `${regName(L, i)}: the crop came in at ${Math.round(S.reg[i].harvest * 100)}%. Rice will be dear this winter.`, ['board', 'messenger']);
}

function winter(L, cal, r, first) {
  const S = ST(L);
  S.reg.forEach((g, i) => {
    if (first && g.harvest < .9) g.hunger = +clamp(g.hunger + .1).toFixed(2);
    if (g.hunger >= .5 && S.keys['famine:' + i + ':' + cal.year] == null) {
      S.keys['famine:' + i + ':' + cal.year] = today(L);
      announce(L, 'event.famine', { region: i, severity: g.hunger, effects: { prices: { rice: +(g.hunger).toFixed(2) }, unrest: .2 } },
        `Famine in ${regName(L, i)}: the storehouses are empty before midwinter. People eat bark and seed rice.`, ['messenger', 'bell'], [i, ...S.adj[i]]);
    }
  });
  if (first) announce(L, 'event.winter', { year: cal.year, hungry: S.reg.map((g, i) => g.hunger >= .3 ? i : -1).filter(i => i >= 0), effects: { travel: .7 } },
    'Winter: snow on the passes, fewer travellers, wolves come down to the villages.', ['bell'], ALL(L));
}

// ---- disasters, rolled at the start of each season ----
export function natureSeason(L, cal, r) {
  const S = ST(L), s = cal.seasonIndex, cen = census(L), n = L.regions.length;
  const hit = (i, f) => { S.reg[i].harvest = +(S.reg[i].harvest * f).toFixed(3); };
  // drought: summer; one to three neighbouring regions
  if (s === 1 && r.chance(.45)) { const a = r.int(0, n - 1), rs = [a, ...r.shuffle(S.adj[a].slice()).slice(0, r.int(0, 2))];
    for (const i of rs) { hit(i, r.range(.5, .7)); S.reg[i].unrest = clamp(S.reg[i].unrest + .05); }
    announce(L, 'event.drought', { region: a, regions: rs, effects: { harvest: .6, prices: { rice: .3, water: .5 } } },
      `Drought over ${rs.map(i => regName(L, i)).join(', ')}: the paddies crack, wells go dry, the crop withers on the stalk.`, ['messenger', 'board'], rs); }
  // flood: spring and summer, where the ground is wet
  if (s <= 1) for (let k = 0; k < 2; k++) { const i = r.int(0, n - 1); if (!r.chance(.15 + S.geo[i].wet)) continue;
    hit(i, r.range(.65, .8)); const dead = toll(L, r, i, r.int(0, 2), 'flood', cen);
    announce(L, 'event.flood', { region: i, dead, effects: { harvest: .7, travel: .5 } }, `The river rose over ${regName(L, i)}: fields under water${dead ? `, ${dead} drowned` : ''}, the ford closed.`, ['bell', 'messenger']); }
  // typhoon: summer and autumn, along the coasts
  if ((s === 1 || s === 2) && r.chance(.4)) { const coast = S.geo.map((g, i) => g.coast > .08 ? i : -1).filter(i => i >= 0); if (coast.length) {
    let i = r.pick(coast); const path = [i];
    for (let k = r.int(1, 4); k > 0; k--) { const next = S.adj[i].filter(j => S.geo[j].coast > .05 && !path.includes(j)); if (!next.length) break; i = r.pick(next); path.push(i); }
    let dead = 0; for (const j of path) { hit(j, r.range(.75, .9)); S.reg[j].danger = clamp(S.reg[j].danger + .05); dead += toll(L, r, j, r.int(0, 2), 'typhoon', cen); }
    announce(L, 'event.typhoon', { region: path[0], regions: path, dead, effects: { harvest: .8, travel: .3, prices: { timber: .3 } } },
      `A typhoon came ashore at ${regName(L, path[0])} and tore inland over ${path.length} region${path.length > 1 ? 's' : ''}: roofs gone, boats smashed${dead ? `, ${dead} dead` : ''}.`, ['bell', 'smoke'], path); } }
  // earthquake: any season, rare
  if (r.chance(.035)) { const a = r.int(0, n - 1), rs = [a, ...S.adj[a].slice(0, 2)]; let dead = 0;
    for (const i of rs) { dead += toll(L, r, i, r.int(1, 3), 'earthquake', cen); S.reg[i].unrest = clamp(S.reg[i].unrest + .1); }
    announce(L, 'event.earthquake', { region: a, regions: rs, dead, effects: { prices: { timber: .4, labour: .3 } } },
      `The earth shook under ${regName(L, a)}: ${dead} dead under fallen beams, a shrine gate split in two. Priests say the land is angry.`, ['bell'], rs); }
  plague(L, cal, r, cen);
  // a comet: an omen, nothing more, and everyone reads it their own way
  if (s === 3 && r.chance(.025)) { for (const g of S.reg) g.unrest = clamp(g.unrest + .08);
    announce(L, 'event.comet', { year: cal.year }, 'A comet hangs over the land for nine nights. Lords consult priests; peasants whisper that the Mandate is ending.', ['bell'], ALL(L)); }
  // unrest drifts with hunger, taxes and war, and slowly calms
  for (const g of S.reg) { g.unrest = +clamp(g.unrest - .08 + g.hunger * .3 + Math.max(0, g.tax - .4) * .4 + (g.war ? .1 : 0)).toFixed(2);
    g.hunger = +clamp(g.hunger - (s === 0 ? .15 : 0)).toFixed(2); g.danger = +clamp(g.danger - .03 + (g.war ? .05 : 0)).toFixed(2); }
}

// plague: starts in a town on a road, spreads to neighbours season by season, and burns out
function plague(L, cal, r, cen) {
  const S = ST(L);
  if (!S.plague && r.chance(.025)) {
    const towns = L.regions.filter(g => S.geo[g.id].road > .15).map(g => g.id); if (!towns.length) return;
    const i = r.pick(towns); S.plague = { since: today(L), regions: [i], seasons: 0 }; S.reg[i].sick = .6;
    announce(L, 'event.plague', { region: i, effects: { travel: .4, prices: { medicine: .8 } } }, `Plague in ${regName(L, i)}: the sick are carried to the shrine and the roads are watched.`, ['bell', 'messenger'], [i, ...S.adj[i]]);
    return;
  }
  const P = S.plague; if (!P) return;
  P.seasons++; const now = [];
  for (const i of P.regions) {
    const g = S.reg[i]; if (g.sick <= 0) continue;
    const dead = toll(L, r, i, Math.round(g.sick * r.int(2, 6)), 'plague', cen); g.harvest = +(g.harvest * .92).toFixed(3); g.unrest = clamp(g.unrest + .05);
    if (dead) now.push(`${dead} in ${regName(L, i)}`);
    for (const j of S.adj[i]) if (!P.regions.includes(j) && r.chance(g.sick * .5)) { P.regions.push(j); S.reg[j].sick = +(g.sick * .8).toFixed(2); }
    g.sick = +clamp(g.sick - r.range(.15, .3)).toFixed(2);
  }
  const live = P.regions.filter(i => S.reg[i].sick > 0);
  if (!live.length) { announce(L, 'event.plagueEnds', { regions: P.regions, seasons: P.seasons }, `The plague has burnt out after ${P.seasons} season${P.seasons > 1 ? 's' : ''} and ${P.regions.length} region${P.regions.length > 1 ? 's' : ''}.`, ['bell'], P.regions); S.plague = null; }
  else if (now.length) announce(L, 'event.plagueSpreads', { region: live[0], regions: live, effects: { travel: .5 } }, `The plague goes on: dead this season, ${now.join('; ')}.`, ['bell'], live);
}

// the economy lane can tell us its stores ran out
export function onEconFamine(e, L) { const S = ST(L); if (e.region == null || !S.reg[e.region]) return; S.reg[e.region].hunger = Math.max(S.reg[e.region].hunger, e.severity ?? .6); }
