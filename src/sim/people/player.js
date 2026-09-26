import { emit } from '../ledger.js';
import { AGE } from './rules.js';
import { alive, age, livingChildren, grandchildren, siblings, pickRegent } from './kin.js';

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
// who could carry on after him, in order (owner 2026-09-26: his children and grandchildren, maybe a brother): the heir he named (if one of
// these), then his sons, his daughters, his grandchildren, his brothers
export function playableHeirs(L, p) {
  const kids = livingChildren(L, p).filter(c => c.cls !== 'monk'), sons = kids.filter(c => c.sex === 'm'), daughters = kids.filter(c => c.sex === 'f');
  const brothers = siblings(L, p).filter(s => s.alive && s.sex === 'm' && s.cls !== 'monk');
  const out = [...sons, ...daughters, ...grandchildren(L, p, false), ...brothers];
  const named = alive(L, p.heir);
  if (named && out.includes(named)) { out.splice(out.indexOf(named), 1); out.unshift(named); }
  return out;
}
// he names his heir (any of the above): they take everything when he dies
export function nameHeir(L, id) {
  const p = L.actors[L.player], c = alive(L, id);
  if (!p || !c || !playableHeirs(L, p).includes(c)) return false;
  p.heir = c.id; recordDeed(L, p.id, `named ${c.given} as his heir`); emit(L, 'people.heirNamed', { actor: p.id, heir: c.id });
  return true;
}
// what he carried lies with him (owner 2026-09-26: finders keepers). killActor calls this before his estate passes: his weapon and his
// purse become the grave's goods, there for whoever reaches his body first, his heir included
export function layOut(L, p) {
  if (!p.grave) return;
  p.grave.goods = { weapon: p.weapon || null, money: { mon: p.money.mon || 0, silver: p.money.silver || 0, ryo: p.money.ryo || 0 } };
  p.money.mon = p.money.silver = p.money.ryo = 0;
}
// someone reaches a grave and takes what lies there. Returns the goods taken, or null if it was already bare
export function lootGrave(L, deadId, finderId) {
  const d = L.actors[deadId], f = alive(L, finderId), g = d && d.grave && d.grave.goods;
  if (!g || !f || (!g.weapon && !g.money.mon && !g.money.silver && !g.money.ryo)) return null;
  const taken = { weapon: g.weapon, money: { ...g.money } };
  for (const k of ['mon', 'silver', 'ryo']) f.money[k] = (f.money[k] || 0) + g.money[k];
  if (g.weapon) f.weapon = g.weapon;
  d.grave.goods = { weapon: null, money: { mon: 0, silver: 0, ryo: 0 } };
  const kin = f.dynasty && d.dynasty;
  recordDeed(L, f.id, kin ? `took up ${d.given}'s ${taken.weapon || 'purse'} from his grave` : `robbed the grave of ${d.given} ${d.family}`);
  emit(L, 'people.graveLooted', { actor: f.id, from: d.id, zone: d.grave.zone, kin, weapon: taken.weapon, money: taken.money });
  return taken;
}
// killActor calls this when the played actor dies: the estate has already passed (death.js); the heir becomes L.player, or the run ends.
// A child heir is played at once (owner 2026-09-26); his mother, else his next of kin, is his regent until he is 16
export function handOff(L, p, est) {
  const P = L.sys.people, heir = est.heir && playableHeirs(L, p).includes(est.heir) ? est.heir : playableHeirs(L, p)[0] || null;
  P.lineage.push({ actor: p.id, from: p.playedFrom ?? 0, died: L.hour, cause: p.cause, grave: p.grave });
  if (!heir) {
    P.over = { h: L.hour, actor: p.id, grave: p.grave, cause: p.cause };
    emit(L, 'people.lineEnded', { actor: p.id, zone: p.grave && p.grave.zone, cause: p.cause });
    return null;
  }
  L.player = heir.id; heir.dynasty = true; heir.playedFrom = L.hour;
  heir.at = heir.home ? [...heir.home] : p.grave ? [...p.grave.zone] : p.at;
  const ag = age(L, heir);
  if (ag < AGE.ADULT && !alive(L, heir.regent)) { const reg = pickRegent(L, heir, p); if (reg) { heir.regent = reg.id; (reg.wards || (reg.wards = [])).push(heir.id); } }
  recordDeed(L, heir.id, `took up the name of ${p.given} ${p.family}`);
  emit(L, 'people.heir', { actor: heir.id, from: p.id, zone: p.grave && p.grave.zone, age: Math.floor(ag), regent: heir.regent || null });
  return heir;
}
