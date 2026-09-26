import { emit, zoneAt } from '../ledger.js';
import { HOURS_PER_YEAR } from '../time.js';
import { nameOf } from '../actors.js';

// ---- The story lane's own state (L.sys.story) and the few helpers every story file shares (docs/sim-story.md) ----
// Everything here is plain JSON in the ledger; the files around it only read and write it through these helpers.
export const ST = L => L.sys.story;
export const today = L => Math.floor(L.hour / 24);
export const clamp = (v, lo = 0, hi = 1) => Math.max(lo, Math.min(hi, v));
export const actor = (L, id) => (id != null ? L.actors[id] : null) || null;
export const alive = (L, id) => !!(id != null && L.actors[id] && L.actors[id].alive);
export const who = (L, id) => { const a = actor(L, id); return a ? nameOf(a) : 'someone'; };
export const ageIn = (L, a) => (L.hour - a.born) / HOURS_PER_YEAR;
export const regName = (L, r) => L.regions[r] ? L.regions[r].name : '?';
export const zoneName = (L, [x, y]) => { const z = zoneAt(L, x, y); return (z && z.name) || `the wilds of ${regName(L, z ? z.region : -1)}`; };
export const cultName = (L, c) => L.cultures[c] ? L.cultures[c].name : 'no people';
export const seatOf = (L, r) => L.regions[r].seat;
// a region's villages as zone records (from the list nature.js keeps in L.sys.story.villages)
export const villagesOf = (L, r) => (L.sys.story.villages[r] || []).map(([x, y]) => L.zones[y * L.size.w + x]);

// the story state, made once per world (init) and filled in by each file's own init
export function initState(L) {
  const S = L.sys.story;
  Object.assign(S, {
    v: 1,
    reg: L.regions.map(() => ({ harvest: 1, hunger: 0, unrest: 0, danger: 0, sick: 0, tax: .4, war: null })),
    adj: [], geo: [],            // region neighbours and ground mix (set by nature.js init)
    quests: {}, questOrder: [],  // every quest by id; ids in posting order (resolved ones are pruned after two years)
    keys: {},                    // dedupe: a situation's key -> the quest or thread it made, and the day
    news: [],                    // announced events, newest last, capped: what the boards and the map read
    ill: {}, disputes: {}, wars: {}, uprisings: {}, armies: {}, plague: null, processions: {},
    chiefs: {}, bounties: {}, grudges: [],
    rivals: {}, arc: { chapter: 1, renown: 0, done: 0, ways: {}, since: 0 },
    stats: { events: {}, quests: {}, endings: {} },
  });
}

// ---- telling the world: every story event is an emit() (other lanes listen), plus a line of news the boards read ----
// heralds: how people hear of it: 'messenger' (politics), 'board' (notices, bounties, taxes), 'smoke' (raids, battles, fires),
// 'bell' (disasters, festivals, deaths of the great). regions: where it is felt (the boards that post it).
const NEWS_CAP = 1500;
export function announce(L, type, data, text, heralds = ['board'], regions = null) {
  const S = ST(L), e = emit(L, type, { ...data, text, heralds, regions: regions || (data.region != null ? [data.region] : []) });
  S.news.push({ d: today(L), type, text, heralds, regions: e.regions, zone: data.zone || null });
  if (S.news.length > NEWS_CAP) S.news.splice(0, S.news.length - NEWS_CAP);
  S.stats.events[type] = (S.stats.events[type] || 0) + 1;
  return e;
}

// ---- the story's hand on the world. Each writes a shared fact on the core records and emits it so the owning lane can react ----
// a death the story causes (a battle, a famine, an execution, a duel). The people lane handles heirs and the household from story.killed.
export function kill(L, id, cause, by = null) {
  const a = actor(L, id); if (!a || !a.alive) return false;
  a.alive = false; a.died = L.hour;
  emit(L, 'story.killed', { actor: id, cause, by, zone: a.home || a.at || null, culture: a.culture });
  if (a.lord != null && L.regions[a.lord] && L.regions[a.lord].lord === id) lordFell(L, a.lord, id, cause);
  return true;
}
// a lord's fall is picked up by politics.js (it registers the hook, to keep this file free of imports that loop)
const HOOKS = { lordFell: null };
export const setLordFell = fn => { HOOKS.lordFell = fn; };
function lordFell(L, region, id, cause) { if (HOOKS.lordFell) HOOKS.lordFell(L, region, id, cause); }

// possession changes hands; the title never does (owner, 2026-09-26: raids take possession, not the legal title)
export function seize(L, pid, by, cause) {
  const was = L.plots[pid] || ownerOfDefault(L, pid);
  L.plots[pid] = { ...was, holder: by };
  emit(L, 'story.seized', { plot: pid, holder: by, was: was.holder, title: was.title, cause, zone: pid.split(':')[0].split(',').map(Number) });
}
function ownerOfDefault(L, pid) {
  const [zx, zy] = pid.split(':')[0].split(',').map(Number), z = zoneAt(L, zx, zy), reg = L.regions[z.region];
  if (z.kind === 'town' || z.kind === 'village' || z.kind === 'fort') return { title: reg.lord ?? null, holder: reg.lord ?? null };
  return { title: null, holder: z.holder ?? null };
}
// money moves between people (mon only; silver and ryō are the economy lane's)
export function pay(L, from, to, mon) {
  const a = actor(L, from), b = actor(L, to); let n = Math.max(0, Math.round(mon));
  if (a) { n = Math.min(n, a.money.mon); a.money.mon -= n; }
  if (b) b.money.mon += n;
  return n;
}
// the ronin's karma, standing and money after a quest (the story writes these core fields itself and says so in story.questResolved)
export function grant(L, id, { karma = 0, standing = {}, mon = 0 }) {
  const a = actor(L, id); if (!a) return;
  a.karma = +((a.karma || 0) + karma).toFixed(2);
  for (const [c, v] of Object.entries(standing)) a.standing[c] = +clamp((a.standing[c] || 0) + v, -1, 1).toFixed(2);
  a.money.mon = Math.max(0, a.money.mon + Math.round(mon));
}
export const dedupe = (L, key, days) => { const S = ST(L), k = S.keys[key]; if (k != null && today(L) - k < days) return false; S.keys[key] = today(L); return true; };

// ---- who lives where: one pass over the people (about 1 ms for 7,000), shared by every story file for the game week ----
// A derived view, rebuilt from the ledger each week (never saved, never the source of truth): callers still check `alive`,
// since someone in it may have died since.
const CENSUS = new WeakMap();
export function census(L) {
  const c = CENSUS.get(L); const wk = L.hour - L.hour % 168; if (c && c.h === wk) return c;
  const w = L.size.w, zones = L.zones, byZone = {}, byRegion = L.regions.map(() => ({ heads: [], merchants: [], fighters: [], nobles: [], monks: [], outlaws: [], all: [] })), byCulture = L.cultures.map(() => 0);
  const actors = L.actors;
  for (const id in actors) {
    const a = actors[id]; if (!a.alive || !a.home || id === L.player) continue;
    const z = zones[a.home[1] * w + a.home[0]], k = a.home[0] + ',' + a.home[1];
    (byZone[k] || (byZone[k] = [])).push(id);
    if (z.region < 0) continue;
    const R = byRegion[z.region]; R.all.push(id);
    if (a.household === id && a.holds.length) R.heads.push(id);
    const job = a.job, cls = a.cls;
    if (job === 'merchant' || job === 'innkeeper' || job === 'brewer') R.merchants.push(id);
    if (cls === 'retainer' || cls === 'ashigaru' || cls === 'noble') { R.fighters.push(id); if (a.culture != null) byCulture[a.culture]++; }
    if (cls === 'noble' || cls === 'royal') R.nobles.push(id); else if (cls === 'monk') R.monks.push(id); else if (cls === 'outlaw') R.outlaws.push(id);
  }
  const out = { h: wk, byZone, byRegion, fightersOf: byCulture };
  CENSUS.set(L, out);
  return out;
}
