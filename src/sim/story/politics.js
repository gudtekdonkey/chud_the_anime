import { newId, zoneAt } from '../ledger.js';
import { rngFor } from '../rng.js';
import { HOURS_PER_YEAR } from '../time.js';
import { ST, today, clamp, announce, kill, setLordFell, who, alive, actor, ageIn, regName, cultName, census, villagesOf } from './state.js';
import { post } from './quests.js';

// ---- Politics: lords fall ill and die, sons fight for the seat, cultures go to war, peasants rise, taxes climb, royals travel ----
// A war or a rising takes possession (region.occupier), never the title (owner, 2026-09-26); the title moves by succession, or after
// OCCUPATION_YEARS of holding it (owner: a long occupation can pass the title).

const MALE_HEIR_AGE = 15;
const sonsOf = (L, a) => a.children.map(id => actor(L, id)).filter(c => c && c.alive && c.sex === 'm' && ageIn(L, c) >= MALE_HEIR_AGE).sort((x, y) => x.born - y.born);

// ---- a lord's end, from the story (kill) or from the people lane (people.died) ----
setLordFell((L, region, id, cause) => succession(L, region, id, cause));
export function onPeopleDied(e, L) {
  const id = e.actor, a = actor(L, id); if (!a || a.lord == null) return;
  const g = L.regions[a.lord]; if (g && g.lord === id) succession(L, a.lord, id, e.cause || 'age');
}

export function succession(L, region, deadId, cause) {
  const S = ST(L), g = L.regions[region], dead = actor(L, deadId);
  if (!dead || S.disputes[region] || S.keys['fell:' + deadId] != null) return; S.keys['fell:' + deadId] = today(L);
  delete S.ill[deadId];
  const r = rngFor(L.seed, 'succession', region, L.hour), sons = sonsOf(L, dead);
  announce(L, 'event.lordDied', { region, actor: deadId, cause, culture: g.culture, zone: g.seat },
    `${who(L, deadId)}, lord of ${regName(L, region)}, is dead (${cause}). The bell tolls at the seat.`, ['bell', 'messenger'], [region, ...S.adj[region]]);
  let rival = S.keys['will:' + deadId] ? null : sons[1] || null;   // a will witnessed by the ronin (the dying quest) settles it
  if (!rival && sons[0] && !S.keys['will:' + deadId]) {   // one son: an uncle or an ambitious retainer may still want the seat
    const uncles = dead.parents.flatMap(p => (actor(L, p) || { children: [] }).children).map(id => actor(L, id)).filter(u => u && u.alive && u.id !== deadId && u.sex === 'm');
    if (uncles.length && r.chance(.5)) rival = uncles[0];
    else if (r.chance(.2)) { const ret = census(L).byRegion[region].fighters.map(id => actor(L, id)).filter(a => a.cls === 'retainer' || a.cls === 'noble'); if (ret.length) rival = r.pick(ret); }
  }
  if (sons[0] && rival && r.chance(sons[1] && rival === sons[1] ? .75 : 1)) {
    const d = S.disputes[region] = { a: sons[0].id, b: rival.id, since: today(L), dead: deadId };
    const q = post(L, 'succession', { key: 'succ:' + region + ':' + deadId, region, giver: d.b, target: d.a, other: d.b, days: 45 + r.int(0, 30), reward: 200 + r.int(0, 400),
      title: `Two claim the seat of ${regName(L, region)}`,
      text: `${who(L, deadId)} is dead, and ${who(L, d.a)} (the elder son) and ${who(L, d.b)} (${rival === sons[1] ? 'his younger brother' : rival.cls === 'retainer' ? 'a retainer with an army behind him' : 'their uncle'}) both claim the seat. Retainers are choosing sides; the villages are keeping their heads down.`,
      board: 'lord', stake: { renown: 3 } });
    d.quest = q && q.id;
    announce(L, 'event.successionDispute', { region, claimants: [d.a, d.b], quest: d.quest, effects: { danger: .2, unrest: .15 } },
      `${regName(L, region)}: ${who(L, d.a)} and ${who(L, d.b)} both claim their father's seat. Armed men on the roads.`, ['messenger', 'smoke'], [region, ...S.adj[region]]);
    S.reg[region].danger = clamp(S.reg[region].danger + .2); S.reg[region].unrest = clamp(S.reg[region].unrest + .15);
    return;
  }
  const heir = sons[0] || (dead.spouse && alive(L, dead.spouse) ? actor(L, dead.spouse) : null) || steward(L, r, region);
  setLord(L, region, heir ? heir.id : null, sons[0] ? 'his son' : heir && heir.id === dead.spouse ? 'his widow, as regent' : 'a steward of the house');
}
function steward(L, r, region) { const f = census(L).byRegion[region].nobles.concat(census(L).byRegion[region].fighters).map(id => actor(L, id)).filter(a => a.culture === L.regions[region].culture); return f.length ? r.pick(f) : null; }

export function setLord(L, region, id, how) {
  const g = L.regions[region], was = g.lord;
  g.lord = id; if (id) actor(L, id).lord = region;
  announce(L, 'event.succession', { region, actor: id, was, how, culture: g.culture, zone: g.seat },
    id ? `${who(L, id)} (${how}) now sits in the seat of ${regName(L, region)}.` : `The seat of ${regName(L, region)} stands empty.`, ['messenger', 'board'], [region, ...ST(L).adj[region]]);
}
// a disputed seat is settled: the winner takes it, the loser dies, flees or bows
export function settleDispute(L, region, winner, loserFate, how) {
  const S = ST(L), d = S.disputes[region]; if (!d) return;
  delete S.disputes[region];
  const loser = winner === d.a ? d.b : d.a;
  if (loserFate === 'killed') kill(L, loser, 'succession', winner);
  else if (loserFate === 'exiled' && actor(L, loser)) { actor(L, loser).home = null; }
  if (alive(L, winner)) setLord(L, region, winner, how);
  S.reg[region].danger = clamp(S.reg[region].danger - .15);
  announce(L, 'event.disputeSettled', { region, winner, loser, fate: loserFate }, `${regName(L, region)}: ${who(L, winner)} holds the seat; ${who(L, loser)} is ${loserFate === 'killed' ? 'dead' : loserFate === 'exiled' ? 'in exile' : 'bowed and pardoned'}.`, ['messenger'], [region]);
}

// ---- seasons: ageing lords (when no people lane lives them), wars, risings; years: taxes ----
export function politicsSeason(L, cal, r) {
  const S = ST(L), cen = census(L);
  if (!L.sys.people) for (const g of L.regions) {   // without the people lane, lords still grow old and ill
    const a = actor(L, g.lord); if (!a || !a.alive || S.ill[a.id]) continue;
    const age = ageIn(L, a); if (age < 55 || !r.chance((age - 52) * .004)) continue;   // about 5% a year at 60, 20% at 70
    S.ill[a.id] = { region: g.id, since: today(L), dies: today(L) + r.int(20, 70), fatal: r.chance(.7) };
    announce(L, 'event.lordIll', { region: g.id, actor: a.id }, `${who(L, a.id)}, lord of ${g.name}, has taken to his bed. Physicians come and go; his sons count retainers.`, ['messenger'], [g.id]);
    const kin = sonsOf(L, a)[1] || sonsOf(L, a)[0];
    post(L, 'dying', { key: 'ill:' + a.id, region: g.id, giver: g.lord, target: a.id, other: kin ? kin.id : null, days: S.ill[a.id].dies - today(L), reward: 150 + r.int(0, 200),
      title: `A healer for the lord of ${g.name}`, text: `${who(L, a.id)} is failing. His house will pay whoever brings a healer from the mountain shrines, and some would pay more for him to go quietly.`, board: 'lord' });
  }
  war(L, cal, r, cen);
  uprisings(L, cal, r, cen);
  processions(L, cal, r);
}
export function politicsDay(L, cal, r) {
  const S = ST(L), d = today(L);
  for (const id in S.ill) { const ill = S.ill[id]; if (!alive(L, id)) { delete S.ill[id]; continue; }
    if (d >= ill.dies) { if (ill.fatal) kill(L, id, 'illness'); else { delete S.ill[id]; announce(L, 'event.lordRecovers', { region: ill.region, actor: id }, `${who(L, id)}, lord of ${regName(L, ill.region)}, is up from his sickbed.`, ['messenger'], [ill.region]); } } }
  for (const g in S.uprisings) if (S.uprisings[g].quest == null && d >= S.uprisings[g].due) delete S.uprisings[g];
}
export function politicsYear(L, cal, r) {
  const S = ST(L);
  titleByOccupation(L, r);
  for (const g of L.regions) { const a = actor(L, g.lord), R = S.reg[g.id]; if (!a) continue;
    const greedy = a.traits.some(([t]) => ['proud', 'vain', 'regal', 'cocky'].includes(t)) || Object.values(S.wars).some(w => w.a === g.culture || w.b === g.culture);
    if (greedy && R.tax < .7 && r.chance(.14)) { R.tax = +(R.tax + .1).toFixed(2);
      announce(L, 'event.tax', { region: g.id, rate: R.tax, lord: a.id, effects: { unrest: .1, prices: { rice: .05 } } }, `${who(L, a.id)} raises the rice tax in ${g.name} to ${Math.round(R.tax * 100)}% of the crop. The tax collectors ride out with ashigaru.`, ['board'], [g.id]); }
    else if (R.tax > .3 && R.hunger > .4 && r.chance(.3)) { R.tax = +(R.tax - .1).toFixed(2);
      announce(L, 'event.taxRelief', { region: g.id, rate: R.tax, lord: a.id }, `${who(L, a.id)} lowers the rice tax in ${g.name} to ${Math.round(R.tax * 100)}% for the hungry year.`, ['board'], [g.id]); }
  }
}

// ---- war between cultures, by their relations; one battle a season on the front; the winner occupies (possession, not title) ----
function war(L, cal, r, cen) {
  const S = ST(L), wars = Object.values(S.wars);
  if (cal.seasonIndex === 0 && wars.length < 3) {
    const pairs = new Set();
    for (const g of L.regions) for (const n of S.adj[g.id]) { const a = g.culture, b = L.regions[n].culture; if (a !== b) pairs.add(Math.min(a, b) + '|' + Math.max(a, b)); }
    for (const pk of r.shuffle([...pairs])) { const [a, b] = pk.split('|').map(Number);
      if (L.cultures[a].relations[b] > -.5 || wars.some(w => [w.a, w.b].includes(a) || [w.a, w.b].includes(b)) || !r.chance(.18)) continue;
      const fronts = L.regions.filter(g => (g.culture === a || g.culture === b) && S.adj[g.id].some(n => L.regions[n].culture === (g.culture === a ? b : a))).map(g => g.id);
      const w = { id: newId(L, 'war'), a, b, since: today(L), score: 0, battles: 0, fronts }; S.wars[w.id] = w;
      for (const f of fronts) S.reg[f].war = w.id;
      announce(L, 'event.war', { war: w.id, cultures: [a, b], fronts, effects: { prices: { weapons: .4, rice: .15 }, danger: .3 } },
        `War: ${cultName(L, a)} and ${cultName(L, b)} have broken with each other. Levies are called, the border roads closed.`, ['messenger', 'smoke'], fronts);
      front(L, r, w, 'message'); break; }
  }
  for (const w of Object.values(S.wars)) {
    const fa = cen.fightersOf[w.a] + 5, fb = cen.fightersOf[w.b] + 5, pa = .15 + .7 * fa / (fa + fb), win = r.chance(pa) ? w.a : w.b, lose = win === w.a ? w.b : w.a;
    const at = r.pick(w.fronts.filter(f => L.regions[f].culture === lose)) ?? r.pick(w.fronts);
    w.score += win === w.a ? 1 : -1; w.battles++;
    let dead = 0;
    // owner (2026-09-26): where there is war, about 30% of the people die of it in a year. Every front region loses WAR_TOLL a season,
    // soldiers first, then the villagers caught in it; the battle region counts its dead in the battle's line
    const lost = [];
    for (const f of w.fronts) { const n = warToll(L, r, cen, f, w.id); if (f === at) dead += n; else if (n) lost.push(`${n} in ${regName(L, f)}`); }
    S.reg[at].harvest = +(S.reg[at].harvest * .85).toFixed(3); S.reg[at].danger = clamp(S.reg[at].danger + .2);
    announce(L, 'event.battle', { war: w.id, region: at, winner: win, loser: lose, dead, effects: { danger: .2, harvest: .85 } },
      `Battle at ${regName(L, at)}: ${cultName(L, win)} beat ${cultName(L, lose)}${dead ? `, ${dead} dead on the field and in the villages` : ''}. Smoke over the villages.${lost.length ? ` The war also took ${lost.join(', ')}.` : ''}`, ['smoke', 'messenger'], [at, ...S.adj[at]]);
    if (r.chance(.4)) front(L, r, w, r.chance(.5) ? 'defend' : 'message');
    if (Math.abs(w.score) >= 3 || w.battles >= 8) endWar(L, r, w);
  }
}
export const WAR_DEATHS_A_YEAR = .3, WAR_TOLL = 1 - Math.pow(1 - WAR_DEATHS_A_YEAR, 1 / 4);   // about 8.5% a season
function warToll(L, r, cen, region, war) {
  const C = cen.byRegion[region], fighters = C.fighters.filter(id => alive(L, id)), rest = C.all.filter(id => alive(L, id) && !fighters.includes(id));
  let n = Math.round((fighters.length + rest.length) * WAR_TOLL * r.range(.7, 1.3)), dead = 0;
  while (n-- > 0 && (fighters.length || rest.length)) { const pool = fighters.length && r.chance(.7) ? fighters : rest.length ? rest : fighters;
    if (kill(L, pool.splice(r.int(0, pool.length - 1), 1)[0], 'war')) dead++; }
  return dead;
}
function front(L, r, w, kind) {
  const S = ST(L), side = r.chance(.5) ? w.a : w.b, mine = w.fronts.filter(f => L.regions[f].culture === side); if (!mine.length) return;
  const reg = r.pick(mine), g = L.regions[reg], foe = side === w.a ? w.b : w.a;
  const foeLord = (L.regions[w.fronts.find(f => L.regions[f].culture === foe) ?? L.cultures[foe].regions[0]] || {}).lord ?? null;
  if (kind === 'message') { const ally = L.cultures.filter(c => c.id !== side && c.id !== foe && L.cultures[side].relations[c.id] > .1).sort((x, y) => L.cultures[side].relations[y.id] - L.cultures[side].relations[x.id])[0];
    if (!ally || !g.lord) return; const to = L.regions[ally.regions[0]];
    post(L, 'message', { key: 'msg:' + w.id + ':' + side, region: reg, giver: g.lord, target: to.lord, other: foeLord, culture: side, tculture: foe, days: 20 + r.int(0, 20), reward: 120 + r.int(0, 180),
      stake: { war: w.id, side, ally: ally.id, to: to.id }, title: `A sealed letter for ${to.name}`,
      text: `${who(L, g.lord)} needs a letter carried to ${who(L, to.lord)} at ${to.name}, asking ${ally.name} to march against ${cultName(L, foe)}. The road runs through enemy country; ${cultName(L, foe)} would pay well for it.`, board: 'lord' });
  } else { const vs = villagesOf(L, reg); if (!vs.length) return; const v = r.pick(vs);
    post(L, 'defend', { key: 'def:' + v.x + ',' + v.y, region: reg, zone: [v.x, v.y], giver: g.lord, other: foeLord, culture: side, tculture: foe, days: 14 + r.int(0, 14), reward: 150 + r.int(0, 150),
      stake: { war: w.id, attacker: foe, by: 'war' }, title: `Hold ${v.name} against ${cultName(L, foe)}`,
      text: `A column of ${cultName(L, foe)} is marching on ${v.name}. The headman begs for swords; the garrison is at the front.`, board: 'person' }); }
}
function endWar(L, r, w) {
  const S = ST(L), win = w.score > 0 ? w.a : w.score < 0 ? w.b : null; delete S.wars[w.id];
  for (const f of w.fronts) if (S.reg[f].war === w.id) S.reg[f].war = null;
  L.cultures[w.a].relations[w.b] = L.cultures[w.b].relations[w.a] = +clamp(L.cultures[w.a].relations[w.b] + .3, -1, 1).toFixed(2);
  let took = null;
  if (win != null) { const lose = win === w.a ? w.b : w.a;
    const freed = w.fronts.find(f => L.regions[f].culture === win && L.regions[f].occupier && L.regions[f].occupier.culture === lose);
    if (freed != null) { delete L.regions[freed].occupier; took = freed; }
    else { const cand = w.fronts.filter(f => L.regions[f].culture === lose && !L.regions[f].occupier); if (cand.length) { took = r.pick(cand); L.regions[took].occupier = { culture: win, since: L.hour, how: 'war' }; } } }
  announce(L, 'event.peace', { war: w.id, cultures: [w.a, w.b], winner: win, region: took, occupied: took != null && !!L.regions[took].occupier },
    win == null ? `Peace between ${cultName(L, w.a)} and ${cultName(L, w.b)}: nobody won.` : took == null ? `${cultName(L, win)} won the war; the border stays where it was.` :
      L.regions[took].occupier ? `${cultName(L, win)} won the war and hold ${regName(L, took)}. Its lord keeps his title on paper; their garrison keeps the land.` : `${cultName(L, win)} won the war and drove the occupiers out of ${regName(L, took)}.`,
    ['messenger', 'bell'], w.fronts);
}

// ---- peasant risings: hunger, taxes and war push unrest; past .65 a region may rise ----
function uprisings(L, cal, r, cen) {
  const S = ST(L);
  for (const g of L.regions) { const R = S.reg[g.id];
    if (R.unrest < .65 || S.uprisings[g.id] || L.cultures[g.culture].kind === 'bandits' || !g.lord || !r.chance(.5)) continue;
    const C = cen.byRegion[g.id], pool = C.all.map(id => actor(L, id)).filter(a => a.cls === 'rebel' || (a.cls === 'commoner' && a.household === a.id)); if (!pool.length) continue;
    const leader = r.pick(pool);
    const q = post(L, 'uprising', { key: 'up:' + g.id + ':' + cal.year, region: g.id, zone: leader.home, giver: leader.id, target: g.lord, other: leader.id, days: 25 + r.int(0, 25), reward: 80 + r.int(0, 120),
      title: `${regName(L, g.id)} rises`, text: `${who(L, leader.id)} leads the villages of ${g.name} against ${who(L, g.lord)}: rice taxed at ${Math.round(R.tax * 100)}%, children hungry. The rebels want a sword; the lord wants the ringleader's head.`, board: 'person', stake: { renown: 2 } });
    S.uprisings[g.id] = { leader: leader.id, since: today(L), quest: q && q.id };
    announce(L, 'event.uprising', { region: g.id, leader: leader.id, quest: q && q.id, effects: { danger: .25, prices: { rice: .1 } } }, `Uprising in ${g.name}: ${who(L, leader.id)} and the villages have taken up sickles and spears.`, ['smoke', 'messenger'], [g.id, ...S.adj[g.id]]);
  }
}
// the rising ends: rebels won (they hold the seat by force; the lord's house keeps its title) or were crushed
export function settleUprising(L, region, rebelsWon, r) {
  const S = ST(L), u = S.uprisings[region]; if (!u) return; delete S.uprisings[region];
  const g = L.regions[region], R = S.reg[region], cen = census(L);
  if (rebelsWon) { const lord = g.lord; if (alive(L, u.leader)) g.occupier = { actor: u.leader, culture: g.culture, since: L.hour, how: 'uprising' };
    if (lord && r.chance(.5)) kill(L, lord, 'uprising', u.leader); R.tax = .3; R.unrest = .2;
    announce(L, 'event.uprisingWon', { region, leader: u.leader }, `The rebels of ${g.name} hold the seat. ${who(L, u.leader)} opens the rice stores; the lord's house keeps its title, and waits.`, ['messenger', 'bell'], [region, ...S.adj[region]]);
  } else { kill(L, u.leader, 'executed', g.lord); const pool = cen.byRegion[region].all.filter(id => actor(L, id).cls === 'rebel');
    for (let k = r.int(1, 4); k > 0 && pool.length; k--) kill(L, pool.splice(r.int(0, pool.length - 1), 1)[0], 'executed', g.lord);
    R.unrest = .25; R.tax = +Math.min(.7, R.tax + .05).toFixed(2);
    announce(L, 'event.uprisingCrushed', { region, leader: u.leader }, `The rising in ${g.name} is crushed. Heads on the gate of the seat; the tax goes up for the trouble.`, ['messenger', 'smoke'], [region]); }
}

// ---- a royal procession: colour on the road (rare loot, and death to anyone who touches it) ----
function processions(L, cal, r) {
  const S = ST(L); if (cal.seasonIndex % 2 || !r.chance(.6)) return;
  for (const c of L.cultures) { if (c.kind !== 'court' || Object.keys(S.processions).length) continue;
    const royals = Object.values(L.actors).filter(a => a.alive && a.cls === 'royal' && a.culture === c.id); if (!royals.length) continue;
    const royal = r.pick(royals), from = L.regions[c.regions[0]], friends = L.cultures.filter(o => o.id !== c.id && c.relations[o.id] > .15); if (!friends.length) continue;
    const to = L.regions[r.pick(friends).regions[0]], route = routeOf(L, from.seat, to.seat);
    const id = newId(L, 'proc'); S.processions[id] = { royal: royal.id, from: from.id, to: to.id, route, end: today(L) + route.length * 3 + 6 };
    announce(L, 'event.procession', { procession: id, actor: royal.id, route, culture: c.id, effects: { prices: { silk: .2 }, danger: -.1 } },
      `A royal procession leaves ${from.name} for ${to.name}: ${who(L, royal.id)} in red silk, forty spears, the road cleared ahead. Kneel as it passes.`, ['messenger', 'board'], route);
    post(L, 'procession', { key: 'proc:' + id, region: route[Math.min(1, route.length - 1)], giver: from.lord, target: royal.id, culture: c.id, days: route.length * 3 + 6, reward: 250 + r.int(0, 250),
      stake: { procession: id, renown: 2 }, title: `Guard the royal road to ${to.name}`,
      text: `${who(L, royal.id)} travels in red silk through ${route.length} regions. The court hires swords to walk the road ahead; the outlaw camps along it have heard of the silk too.`, board: 'inn' });
  }
}
export function routeOf(L, [x0, y0], [x1, y1]) {
  const out = [], n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0));
  for (let i = 0; i <= n; i++) { const z = zoneAt(L, Math.round(x0 + (x1 - x0) * i / n), Math.round(y0 + (y1 - y0) * i / n)); if (z && z.region >= 0 && !out.includes(z.region)) out.push(z.region); }
  return out;
}

// ---- a long occupation becomes title (owner, 2026-09-26: "long occupation can, sure") ----
// After OCCUPATION_YEARS held by force, the deed follows the land: the occupier (or, after a war, a noble of the occupying culture)
// becomes lord, the region joins the occupier's culture, and the dispossessed house keeps a grudge.
export const OCCUPATION_YEARS = 1;   // owner (2026-09-26): one year
function titleByOccupation(L, r) {
  const S = ST(L), cen = census(L);
  for (const g of L.regions) { const o = g.occupier; if (!o || L.hour - o.since < OCCUPATION_YEARS * HOURS_PER_YEAR) continue;
    let heir = o.actor && alive(L, o.actor) ? o.actor : null;
    if (!heir) { const pool = L.cultures[o.culture].regions.flatMap(i => cen.byRegion[i].nobles.concat(cen.byRegion[i].fighters)).filter(id => alive(L, id) && actor(L, id).culture === o.culture && actor(L, id).lord == null);
      heir = pool.length ? r.pick(pool) : null; }
    if (!heir) continue;
    const was = g.lord, from = g.culture;
    if (o.culture !== g.culture) { const a = L.cultures[from], b = L.cultures[o.culture]; a.regions = a.regions.filter(i => i !== g.id); if (!b.regions.includes(g.id)) b.regions.push(g.id); g.culture = o.culture; }
    delete g.occupier; g.titled = { from: was, how: o.how, since: L.hour };
    if (was && alive(L, was)) S.grudges.push({ by: was, against: heir, why: 'stolen seat', d: today(L) });
    announce(L, 'event.titlePasses', { region: g.id, actor: heir, was, from, culture: g.culture, how: 'occupation' },
      `${OCCUPATION_YEARS === 1 ? "A year" : `${OCCUPATION_YEARS} years`} held by force, and now by law: ${who(L, heir)} is lord of ${g.name}${from !== g.culture ? `, and ${g.name} belongs to ${cultName(L, g.culture)}` : ''}. ${was ? `The house of ${who(L, was)} has only its grudge.` : ''}`.trim(), ['messenger', 'bell'], [g.id, ...S.adj[g.id]]);
    setLord(L, g.id, heir, 'by long occupation');
  }
}
