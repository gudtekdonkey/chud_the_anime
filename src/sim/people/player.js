import { emit } from '../ledger.js';
import { HOURS_PER_YEAR } from '../time.js';
import { AGE } from './rules.js';
import { alive, age, livingChildren, grandchildren } from './kin.js';

// ---- The ronin's line: his deeds, his heir, and what happens when he dies (owner 2026-09-26: death costs everything unless he has an heir) ----
// L.player is always the actor being played. His house is marked actor.dynasty (him, his wives, his children and theirs).

// people the world keeps a full record of: his house, lords and their seats, the high-born
export const notable = (L, a) => !!(a && (a.dynasty || a.id === L.player || a.lord != null || a.rank >= 5));
// deeds: what the world remembers of a person, carved on the grave (other lanes add theirs: recordDeed(L, id, 'cleared Kurosawa camp'))
export function recordDeed(L, id, text) {
  const a = L.actors[id]; if (!a || !notable(L, a)) return;
  (a.deeds || (a.deeds = [])).push({ h: L.hour, text });
  if (a.deeds.length > 40) a.deeds.splice(0, a.deeds.length - 40);
}
// who could carry on after him, in order: the heir he named (if of his blood), then his sons, his daughters, his grandchildren
export function playableHeirs(L, p) {
  const kids = livingChildren(L, p).filter(c => c.cls !== 'monk'), sons = kids.filter(c => c.sex === 'm'), daughters = kids.filter(c => c.sex === 'f');
  const out = [...sons, ...daughters, ...grandchildren(L, p, false)];
  const named = alive(L, p.heir);
  if (named && out.includes(named)) { out.splice(out.indexOf(named), 1); out.unshift(named); }
  return out;
}
// he names his heir (any living child or grandchild): they take everything when he dies
export function nameHeir(L, id) {
  const p = L.actors[L.player], c = alive(L, id);
  if (!p || !c || !playableHeirs(L, p).includes(c)) return false;
  p.heir = c.id; recordDeed(L, p.id, `named ${c.given} as his heir`); emit(L, 'people.heirNamed', { actor: p.id, heir: c.id });
  return true;
}
// killActor calls this when the played actor dies: the estate has already passed (death.js); the heir becomes L.player, or the run ends
export function handOff(L, p, est) {
  const P = L.sys.people, heir = est.heir && playableHeirs(L, p).includes(est.heir) ? est.heir : playableHeirs(L, p)[0] || null;
  P.lineage.push({ actor: p.id, from: p.playedFrom ?? 0, died: L.hour, cause: p.cause, grave: p.grave });
  if (!heir) {
    P.over = { h: L.hour, actor: p.id, grave: p.grave, cause: p.cause };
    emit(L, 'people.lineEnded', { actor: p.id, zone: p.grave && p.grave.zone, cause: p.cause });
    return null;
  }
  L.player = heir.id; heir.dynasty = true; heir.playedFrom = L.hour;
  heir.weapon = p.weapon;                            // the family blade passes with the name (proposal)
  heir.at = heir.home ? [...heir.home] : p.grave ? [...p.grave.zone] : p.at;
  const ag = age(L, heir);
  P.waiting = ag < AGE.ADULT ? { heir: heir.id, until: heir.born + AGE.ADULT * HOURS_PER_YEAR } : null;
  recordDeed(L, heir.id, `took up the name of ${p.given} ${p.family}`);
  emit(L, 'people.heir', { actor: heir.id, from: p.id, zone: p.grave && p.grave.zone, age: Math.floor(ag), waiting: !!P.waiting });
  return heir;
}
// the heir is too young to play: the world lives on until he comes of age (the page fast-forwards; the game shows the years pass)
export const waitingYears = L => { const w = L.sys.people.waiting; return w ? Math.max(0, (w.until - L.hour) / HOURS_PER_YEAR) : 0; };
