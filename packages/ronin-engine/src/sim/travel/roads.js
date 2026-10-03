import { zoneAt, emit } from '../ledger.js';

// ---- The roads while he is away: each region's danger and weather, and outlaw bands roaming out of their camps (docs/sim-travel.md) ----
// All of it moves in onDay, so a long absence changes the roads too; encounters (encounters.js) read it live as he crosses a zone.
// L.sys.travel.regions[id]: { danger 0..1, base, camps, weather, wxDays, famine (days left) }
// L.sys.travel.camps: [[x, y]] every camp, recounted each season. L.sys.travel.bands: [{ id, culture, region, camp: [x, y], at: [x, y], goal: [x, y], members: [actor ids], days }]

// how dangerous a people's roads are before anything happens: outlaw coasts worst, temple lands safest
const KIND_DANGER = { bandits: .6, rebels: .3, shinobi: .3, miners: .25, clan: .2, merchants: .15, fishers: .15, court: .1, monastic: .08 };
// weather by season: [kind, weight]; a region's weather holds for a few days, then turns
const WEATHER = {
  spring: [['clear', 5], ['cloud', 3], ['rain', 3], ['fog', 2], ['wind', 1]],
  summer: [['clear', 6], ['cloud', 2], ['rain', 4], ['wind', 1]],
  autumn: [['clear', 4], ['cloud', 3], ['rain', 2], ['fog', 3], ['wind', 2]],
  winter: [['clear', 3], ['cloud', 3], ['snow', 5], ['fog', 1], ['wind', 2]],
};
// the mountains snow earlier and the coast fogs more: a weight bonus by the region's own ground
const BIOME_WX = { mountains: { snow: 3, wind: 2 }, hills: { snow: 1, fog: 1 }, coast: { fog: 2, wind: 2, rain: 1 }, marsh: { fog: 3 }, paddy: { rain: 1 } };

export function initRoads(L, st) {
  st.regions = L.regions.map(g => {
    const base = KIND_DANGER[L.cultures[g.culture].kind] ?? .2;
    return { danger: base, base, camps: 0, weather: 'clear', wxDays: 0, famine: 0, biome: zoneAt(L, ...g.seat).biome };
  });
  countCamps(L, st);
  st.bands = [];
}
// camps can be destroyed or built by other lanes: recount each season (a scan of 10,000 zones, four times a year)
export function countCamps(L, st) {
  for (const s of st.regions) s.camps = 0;
  st.camps = [];
  for (const z of L.zones) if (z.kind === 'camp' && z.region >= 0) { st.regions[z.region].camps++; st.camps.push([z.x, z.y]); }
}

export function roadsDay(L, st, cal, r) {
  // danger: drifts back toward the region's base, pushed up by camps, bands out and famine
  const out = new Array(st.regions.length).fill(0);
  for (const b of st.bands) out[b.region] = (out[b.region] || 0) + 1;
  st.regions.forEach((s, id) => {
    const target = Math.min(1, s.base + s.camps * .06 + out[id] * .08 + (s.famine > 0 ? .2 : 0));
    const was = s.danger;
    s.danger = +Math.max(0, Math.min(1, s.danger + (target - s.danger) * .15 + r.range(-.03, .03))).toFixed(3);
    if (s.famine > 0) s.famine--;
    // the notice board and the map hear only when a region's roads cross into unsafe or back
    if (was < .6 && s.danger >= .6) emit(L, 'travel.unsafe', { region: id, danger: s.danger, zone: L.regions[id].seat });
    if (was >= .6 && s.danger < .5) emit(L, 'travel.safe', { region: id, danger: s.danger, zone: L.regions[id].seat });
    // weather turns when its days run out
    if (--s.wxDays <= 0) {
      const bonus = BIOME_WX[s.biome] || {};
      let opts = WEATHER[cal.season].map(([k, w]) => [k, w + (bonus[k] || 0)]);
      // snow only in winter, and on the mountains in spring and autumn
      if (cal.season !== 'winter') { opts = opts.filter(([k]) => k !== 'snow'); if (s.biome === 'mountains' && cal.season !== 'summer') opts.push(['snow', 1.5]); }
      s.weather = r.weighted(opts);
      s.wxDays = r.int(1, 4);
    }
  });
  bandsDay(L, st, cal, r);
}

// ---- outlaw bands: a camp sends a few of its own out along the roads for some days, then they go home ----
const ROAM = 8, MAX_BANDS = 48;
function bandsDay(L, st, cal, r) {
  // a band sets out: from a random camp, more often in winter (hunger) and when its region is starving
  if (st.bands.length < MAX_BANDS) for (let k = 0; k < 3; k++) {
    const z = st.camps.length ? zoneAt(L, ...r.pick(st.camps)) : null; if (!z || z.kind !== 'camp' || st.bands.some(b => b.camp[0] === z.x && b.camp[1] === z.y)) continue;
    const s = st.regions[z.region], p = .12 * (cal.season === 'winter' ? 1.5 : 1) * (s.famine > 0 ? 2 : 1);
    if (!r.chance(p)) continue;
    const members = campMembers(L, z, r); if (members.length < 2) continue;
    const b = { id: 'band' + (st.nextBand = (st.nextBand || 0) + 1), culture: L.regions[z.region].culture, region: z.region, camp: [z.x, z.y], at: [z.x, z.y],
      goal: roadNear(L, z.x, z.y, r), members, days: r.int(4, 14) };
    st.bands.push(b);
    emit(L, 'travel.bandOut', { band: b.id, culture: b.culture, region: b.region, zone: b.camp, members: members.length });
  }
  // each band walks up to two zones a day toward its goal along the roads; a band on a road sometimes robs someone
  for (let i = st.bands.length - 1; i >= 0; i--) {
    const b = st.bands[i];
    b.members = b.members.filter(id => L.actors[id]?.alive);
    if (!b.members.length || --b.days <= 0 && b.at[0] === b.camp[0] && b.at[1] === b.camp[1]) { st.bands.splice(i, 1); emit(L, 'travel.bandHome', { band: b.id, zone: b.camp, members: b.members.length }); continue; }
    if (b.days <= 0) b.goal = b.camp;
    for (let s = 0; s < 2; s++) step(L, b);
    if (b.at[0] === b.goal[0] && b.at[1] === b.goal[1] && b.days > 0) b.goal = roadNear(L, b.camp[0], b.camp[1], r);
    const z = zoneAt(L, ...b.at); b.region = z.region >= 0 ? z.region : b.region;
    if (z.road && r.chance(.15)) emit(L, 'travel.robbery', { band: b.id, culture: b.culture, region: z.region, zone: b.at });
  }
}
// the camp's own people (the chief stays home): real ledger actors, so a man killed on the road is gone from his camp too.
// Who lives at which camp is a derived index (not ledger state), rebuilt each season: a scan of every person, not one per band
const CAMP_INDEX = new WeakMap();
function campMembers(L, z, r) {
  const season = Math.floor(L.hour / (24 * 28));
  let ix = CAMP_INDEX.get(L);
  if (!ix || ix.season !== season) { ix = { season, at: {} };
    for (const id in L.actors) { const a = L.actors[id]; if (a.alive && !a.chief && a.home && a.cls !== 'commoner' && zoneAt(L, a.home[0], a.home[1])?.kind === 'camp') (ix.at[a.home[0] + ',' + a.home[1]] ||= []).push(id); }
    CAMP_INDEX.set(L, ix); }
  const home = (ix.at[z.x + ',' + z.y] || []).filter(id => L.actors[id]?.alive), n = r.int(2, 5);
  return r.shuffle(home).slice(0, n);
}
// a road zone within ROAM of (x, y), or the camp itself if the land has none near
function roadNear(L, x, y, r) {
  for (let t = 0; t < 12; t++) { const z = zoneAt(L, x + r.int(-ROAM, ROAM), y + r.int(-ROAM, ROAM)); if (z && z.road) return [z.x, z.y]; }
  return [x, y];
}
// one zone toward the goal: roads first (they are faster and where the travellers are), open land if no road leads there, never the sea or a void
function step(L, b) {
  const [x, y] = b.at, [gx, gy] = b.goal; if (x === gx && y === gy) return;
  let best = null, bd = Math.abs(gx - x) + Math.abs(gy - y) + (zoneAt(L, x, y).road ? 0 : .5);
  for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const n = zoneAt(L, x + dx, y + dy); if (!n || n.kind === 'sea' || n.void) continue;   // outlaws keep out of the voids too
    const d = Math.abs(gx - n.x) + Math.abs(gy - n.y) + (n.road ? 0 : .5); if (d < bd) { bd = d; best = n; } }
  if (best) b.at = [best.x, best.y];
}
// the band standing in or next to a zone, if any
export function bandNear(st, x, y, reach = 1) { return st.bands.find(b => Math.abs(b.at[0] - x) <= reach && Math.abs(b.at[1] - y) <= reach) || null; }
