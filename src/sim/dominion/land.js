import { zoneAt, emit } from '../ledger.js';
import { ownerOf, plotId, PLOTS } from '../zone.js';
import { nameOf } from '../actors.js';
import { N } from './data.js';

// ---- The ladder of land: plot → estate → zone (mura) → domain (han) → province (kuni) → realm (docs/dominion.md section 1) ----
// Each step has a title (on paper) and a holder (who has it now); raids and conquest move the holder, only lawful transfer moves a title.
// Plots are the core's (L.plots / ownerOf). Estates are computed from the plots a person holds (they merge themselves). Zones, domains,
// provinces and realms are records under L.sys.dominion (zt, dom, prov, realms).
export const D = L => L.sys.dominion;
export const key = (x, y) => x + ',' + y;
export const unkey = k => k.split(',').map(Number);
export const alive = (L, id) => !!(id && L.actors[id] && L.actors[id].alive);

// ---- lords: anyone who holds a zone, builds, taxes or keeps an army has a lord record (the ronin too, from his first plot) ----
export function lordOf(L, id) {
  const d = D(L); if (!id) return null;
  return d.lords[id] || (d.lords[id] = { id, rice: 0, tax: N.TAX, laws: {}, off: {}, liege: null, loyalty: .7, zones: [], titles: [], grudges: {}, claims: [],
    koku: 0, kokuAll: 0, next: 0, wars: [], truce: {}, tribute: [], seat: null, outlaw: false, since: L.hour });
}
// the lord at the top of a chain of fealty
// (cached per hour; every change of fealty calls fealtyChanged, which bumps L.sys.dominion.lv)
const TOPS = new WeakMap();
export function top(L, id) {
  const d = D(L); let c = TOPS.get(L); if (!c || c.h !== L.hour || c.v !== d.lv) TOPS.set(L, c = { h: L.hour, v: d.lv, m: new Map() });
  let t = c.m.get(id); if (t !== undefined) return t;
  t = id; for (let i = 0; i < 12 && d.lords[t] && d.lords[t].liege; i++) t = d.lords[t].liege;
  c.m.set(id, t); return t;
}
// which island a zone is on (the world is an archipelago: armies march only on their own). Derived from the zones, cached per world
const LAND = new WeakMap();
export function landOf(L, x, y) {
  let m = LAND.get(L.zones);
  if (!m) { const { w, h } = L.size; m = new Int16Array(w * h).fill(-1); let n = 0;
    for (let i = 0; i < w * h; i++) { if (m[i] >= 0 || L.zones[i].biome === 'sea') continue; const q = [i]; m[i] = n;
      while (q.length) { const c = q.pop(), cx = c % w, cy = (c - cx) / w;
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = cx + dx, ny = cy + dy; if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue; const j = ny * w + nx;
          if (m[j] < 0 && L.zones[j].biome !== 'sea') { m[j] = n; q.push(j); } } }
      n++; }
    LAND.set(L.zones, m); }
  return m[y * L.size.w + x];
}
export const landOfKey = (L, k) => { const [x, y] = unkey(k); return landOf(L, x, y); };
export const fealtyChanged = L => { D(L).lv = (D(L).lv || 0) + 1; };
// seats of domains and provinces (for the castle town tier), cached per hour
const SEATS = new WeakMap();
export function isSeat(L, k) {
  let c = SEATS.get(L); if (!c || c.h !== L.hour) { c = { h: L.hour, s: new Set([...Object.values(D(L).dom).map(m => m.seat), ...L.regions.map(r => key(...r.seat))]) }; SEATS.set(L, c); }
  return c.s.has(k);
}
export const sameSide = (L, a, b) => a && b && top(L, a) === top(L, b);
export const lordName = (L, id) => !id ? 'nobody' : L.actors[id] ? nameOf(L.actors[id]) : id;

// ---- zones: a zone's title and holder. Every change goes through setZone, so each lord's zones / titles lists stay true ----
export const zoneRec = (L, k) => D(L).zt[k] || null;
export function setZone(L, k, { title, holder }, how) {
  const d = D(L), z = d.zt[k] || (d.zt[k] = { title: null, holder: null }), was = { ...z };
  if (title !== undefined && title !== z.title) { drop(L, z.title, 'titles', k); z.title = title; add(L, title, 'titles', k);
    const [x, y] = unkey(k), r = zoneAt(L, x, y).region; if (r >= 0 && !d.regZ[r].includes(k)) d.regZ[r].push(k); }
  if (holder !== undefined && holder !== z.holder) {
    drop(L, z.holder, 'zones', k); const old = z.holder; z.holder = holder; z.since = L.hour; add(L, holder, 'zones', k);
    // possession of the lord's own plots follows; vassals' family plots stay theirs (they now owe the new holder)
    const [x, y] = unkey(k);
    for (let n = 0; n < PLOTS * PLOTS; n++) { const pid = plotId(x, y, n), o = ownerOf(L, pid);
      if (o.holder === old || (o.title && o.title === z.title)) {
        if (o.holder === holder) continue; (L.plots[pid] || (L.plots[pid] = { title: o.title, holder: o.holder })).holder = holder; } }
  }
  // news when the title moves; a change of holder alone is told by the event that caused it (war.taken, dom.uprising, dom.succession, war.treaty)
  if (was.title !== z.title && how !== 'world') emit(L, 'dom.zone', { zone: unkey(k), title: z.title, holder: z.holder, was, how });
  return z;
}
function add(L, id, list, k) { if (!id) return; const l = lordOf(L, id); if (!l[list].includes(k)) l[list].push(k); }
function drop(L, id, list, k) { const l = id && D(L).lords[id]; if (l) { const i = l[list].indexOf(k); if (i >= 0) l[list].splice(i, 1); } }

// the zone rule: hold every one of its 16 plots (directly, or through a vassal who holds land inside yours) and the zone's title is yours
export function checkZoneTitle(L, x, y) {
  const d = D(L), k = key(x, y), z = d.zt[k], titles = new Set();
  for (let n = 0; n < PLOTS * PLOTS; n++) { const t = ownerOf(L, plotId(x, y, n)).title; if (!t) return null; titles.add(d.vas[t] ? d.vas[t].liege : t); }
  if (titles.size !== 1) return null;
  const [t] = titles; if (z && z.title === t) return z;
  return setZone(L, k, { title: t, holder: z && z.holder && z.holder !== z.title ? z.holder : t }, 'all plots');
}
// a plot changed hands (the land lane's claim, the crime lane's transfer, an inheritance): the zone rule and the estates catch up
export function plotChanged(L, pid) {
  const [zx, zy] = pid.split(':')[0].split(',').map(Number), o = ownerOf(L, pid);
  checkZoneTitle(L, zx, zy);
  if (o.holder) { const e = estatesOf(L, o.holder).find(es => es.plots.includes(pid));
    if (e && e.plots.length > 1) emit(L, 'dom.estate', { actor: o.holder, plots: e.plots.length, zone: [zx, zy], name: e.name }); }
}

// ---- estates: the plots a person holds, merged where they touch (across zone edges too). Computed, never stored ----
export function plotsHeld(L, id) {
  const d = D(L), out = new Set(), a = L.actors[id];
  for (const pid of a ? a.holds : []) if (ownerOf(L, pid).holder === id) out.add(pid);
  for (const pid in L.plots) if (L.plots[pid].holder === id) out.add(pid);
  return [...out];
}
export function estatesOf(L, id) {
  const held = new Set(plotsHeld(L, id)), seen = new Set(), out = [];
  const nb = pid => { const [zk, n] = pid.split(':'), [zx, zy] = zk.split(',').map(Number), px = n % PLOTS, py = Math.floor(n / PLOTS), res = [];
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { let qx = px + dx, qy = py + dy, ax = zx, ay = zy;
      if (qx < 0) { qx += PLOTS; ax--; } if (qx >= PLOTS) { qx -= PLOTS; ax++; } if (qy < 0) { qy += PLOTS; ay--; } if (qy >= PLOTS) { qy -= PLOTS; ay++; }
      res.push(plotId(ax, ay, qy * PLOTS + qx)); } return res; };
  for (const p of held) { if (seen.has(p)) continue; const plots = [], q = [p]; seen.add(p);
    while (q.length) { const c = q.pop(); plots.push(c); for (const n of nb(c)) if (held.has(n) && !seen.has(n)) { seen.add(n); q.push(n); } }
    plots.sort(); const [zx, zy] = plots[0].split(':')[0].split(',').map(Number), z = zoneAt(L, zx, zy);
    out.push({ id: plots[0], plots, zones: [...new Set(plots.map(x => x.split(':')[0]))], name: `${z.name || cap(z.biome)} estate` }); }
  return out.sort((a, b) => b.plots.length - a.plots.length);
}
const cap = s => s[0].toUpperCase() + s.slice(1);

// ---- domains (han): a lord's titled zones within REACH of each other, joined under a named seat (a town or castle) ----
function clusters(keys) {
  const pts = keys.map(k => [k, ...unkey(k)]), used = new Uint8Array(pts.length), out = [];
  for (let s = 0; s < pts.length; s++) { if (used[s]) continue; used[s] = 1; const c = [s];
    for (let i = 0; i < c.length; i++) { const [, x, y] = pts[c[i]]; for (let j = 0; j < pts.length; j++) if (!used[j] && Math.max(Math.abs(pts[j][1] - x), Math.abs(pts[j][2] - y)) <= N.REACH) { used[j] = 1; c.push(j); } }
    out.push(c.map(i => pts[i][0])); }
  return out;
}
const tierAt = (L, k) => { const s = D(L).set[k]; return s ? s.tier : -1; };
// the ronin founds his own (it is a choice: docs/dominion.md); NPC lords found theirs when they can
export function canFound(L, who, seatK) {
  const l = D(L).lords[who]; if (!l || !l.titles.includes(seatK)) return 'the seat must be a zone you hold the title of';
  if (tierAt(L, seatK) < 3) return 'the seat must be a town or a castle town';
  if (Object.values(D(L).dom).some(m => m.seat === seatK)) return 'it is already a domain\'s seat';
  const c = clusters(l.titles).find(cl => cl.includes(seatK)); if (c.length < 2) return 'you need two or more zones near each other';
  return null;
}
export function foundDomain(L, who, seatK, name) {
  const why = canFound(L, who, seatK); if (why) return { error: why };
  const d = D(L), l = d.lords[who], c = clusters(l.titles).find(cl => cl.includes(seatK)), id = `han${(L.ids.han = (L.ids.han || 0) + 1)}`;
  const [sx, sy] = unkey(seatK), m = { id, name: name || `${zoneAt(L, sx, sy).name || 'the'} domain`, seat: seatK, zones: c, title: who, holder: d.zt[seatK].holder, founded: L.hour };
  // a domain already standing in this cluster is absorbed into the new one
  for (const o of Object.values(d.dom)) if (o.title === who && o.zones.some(z => c.includes(z))) delete d.dom[o.id];
  d.dom[id] = m; l.seat = seatK;
  emit(L, 'dom.domain', { domain: id, name: m.name, zone: [sx, sy], actor: who, how: 'founded', zones: c.length });
  return m;
}
export function refreshDomains(L) {
  const d = D(L);
  for (const m of Object.values(d.dom)) {
    const z = d.zt[m.seat]; if (!z || !z.title) { delete d.dom[m.id]; emit(L, 'dom.domain', { domain: m.id, name: m.name, how: 'dissolved' }); continue; }
    if (z.title !== m.title) { emit(L, 'dom.domain', { domain: m.id, name: m.name, zone: unkey(m.seat), actor: z.title, was: m.title, how: 'passed' }); m.title = z.title; }
    m.holder = z.holder;
    const l = lordOf(L, m.title), c = clusters(l.titles).find(cl => cl.includes(m.seat)) || [m.seat];
    const twin = Object.values(d.dom).find(o => o !== m && o.title === m.title && c.includes(o.seat) && d.dom[o.id] && (o.founded < m.founded || (o.founded === m.founded && o.id < m.id)));
    if (twin) { delete d.dom[m.id]; emit(L, 'dom.domain', { domain: m.id, name: m.name, zone: unkey(m.seat), actor: m.title, how: 'merged', into: twin.id }); continue; }
    if (c.length !== m.zones.length) emit(L, 'dom.domain', { domain: m.id, name: m.name, zone: unkey(m.seat), actor: m.title, how: c.length > m.zones.length ? 'grew' : 'shrank', zones: c.length });
    m.zones = c;
  }
  for (const l of Object.values(d.lords)) {
    if (!l.titles.length || !alive(L, l.id)) continue;
    for (const c of clusters(l.titles)) {
      if (c.length < 2 || Object.values(d.dom).some(m => m.title === l.id && c.includes(m.seat))) continue;
      const seat = c.filter(k => tierAt(L, k) >= 3).sort((a, b) => tierAt(L, b) - tierAt(L, a) || (d.set[b]?.pop || 0) - (d.set[a]?.pop || 0))[0];
      if (!seat) continue;
      if (l.id === L.player) { if (!l.ready) { l.ready = seat; emit(L, 'dom.domainReady', { actor: l.id, zone: unkey(seat) }); } continue; }
      foundDomain(L, l.id, seat);
    }
  }
}

// ---- provinces (kuni): the world's 100 regions. Hold the seat and most of its lordly zones: the province is held;
// hold the seat's title and most of the zones' titles: the province's title is yours (or it passes by treaty) ----
export function refreshProvinces(L) {
  const d = D(L);
  for (const reg of L.regions) {
    const sk = key(...reg.seat), zs = d.regZ[reg.id], seat = d.zt[sk], p = d.prov[reg.id] || (d.prov[reg.id] = { title: null, holder: null });
    if (!seat) continue;
    const held = zs.filter(k => d.zt[k].holder === seat.holder).length, titled = zs.filter(k => d.zt[k].title === seat.title).length;
    const holder = seat.holder && held * 2 > zs.length ? seat.holder : null, title = seat.title && titled * 2 > zs.length ? seat.title : p.title;
    if (holder !== p.holder || title !== p.title) { const was = { ...p }; p.holder = holder; p.title = title;
      emit(L, 'dom.province', { region: reg.id, name: reg.name, title, holder, was }); }
  }
}
// ---- realms: several provinces under one ruler, his own or his sworn governors' ----
export function refreshRealms(L) {
  const d = D(L), count = {};
  for (const [r, p] of Object.entries(d.prov)) if (p.title && alive(L, p.title)) { const t = top(L, p.title); (count[t] || (count[t] = [])).push(+r); }
  for (const rm of Object.values(d.realms)) {
    const provs = count[rm.title] || [];
    if (!alive(L, rm.title) || provs.length < 2) { delete d.realms[rm.id]; emit(L, 'dom.realm', { realm: rm.id, name: rm.name, actor: rm.title, how: 'fell' }); continue; }
    rm.provinces = provs; delete count[rm.title];
    const cap = d.prov[rm.capital]; rm.holder = cap && cap.holder ? top(L, cap.holder) : rm.title;
    if (!provs.includes(rm.capital)) rm.capital = provs[0];
  }
  for (const [t, provs] of Object.entries(count)) {
    if (provs.length < 2) continue;
    const l = d.lords[t], capR = l && l.seat ? zoneAt(L, ...unkey(l.seat)).region : provs[0], capital = provs.includes(capR) ? capR : provs[0];
    const id = `realm${(L.ids.realm = (L.ids.realm || 0) + 1)}`, rm = { id, name: `the realm of ${L.regions[capital].name}`, title: t, holder: t, capital, provinces: provs, founded: L.hour };
    d.realms[id] = rm; emit(L, 'dom.realm', { realm: id, name: rm.name, actor: t, how: 'rose', provinces: provs.length });
  }
}
export const realmOf = (L, id) => { const t = top(L, id); return Object.values(D(L).realms).find(r => r.title === t) || null; };

// ---- everything one person holds, for a page or the HUD ----
export function holdingsOf(L, id) {
  const d = D(L), l = d.lords[id];
  return { plots: plotsHeld(L, id), estates: estatesOf(L, id), zones: l ? l.zones.slice() : [], titles: l ? l.titles.slice() : [],
    domains: Object.values(d.dom).filter(m => m.title === id), provinces: Object.entries(d.prov).filter(([, p]) => p.title === id || p.holder === id).map(([r]) => +r),
    realm: realmOf(L, id), koku: l ? Math.round(l.kokuAll) : 0, liege: l ? l.liege : null,
    rank: rankOf(L, id) };
}
// the highest step someone stands on
export function rankOf(L, id) {
  const d = D(L), l = d.lords[id]; if (!l) return plotsHeld(L, id).length ? (estatesOf(L, id).some(e => e.plots.length > 1) ? 'estate' : 'plot') : 'none';
  if (Object.values(d.realms).some(r => r.title === id)) return 'realm';
  if (Object.values(d.prov).some(p => p.title === id || p.holder === id)) return 'province';
  if (Object.values(d.dom).some(m => m.title === id)) return 'domain';
  if (l.titles.length || l.zones.length) return 'zone';
  return plotsHeld(L, id).length ? (estatesOf(L, id).some(e => e.plots.length > 1) ? 'estate' : 'plot') : 'none';
}
