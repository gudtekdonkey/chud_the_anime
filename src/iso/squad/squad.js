// ---- The squad: the selection, saved groups, and the instructions a companion carries (docs/squad-ai.md). Engine side:
// it reads and writes plain agents. Each companion keeps its OWN settings and order (as each dominion squad keeps its
// own order, D2C): role, liberty, charge (whom he protects), aggression (null = his temper's), formation, tactic,
// order { k, x, z, h, target }. An instruction goes to the selection, or to everyone when nothing is selected.
import { ROLES, LIBERTY, FORMATIONS, TACTICS, ORDERS, ROLE_LIBERTY, defaultRole, slotOffset, slotAt } from './orders.js';
import { dist, headTo, enemies } from '../ai/senses.js';

export const SQ = { sel: new Set(), groups: {}, slow: 'slow', log: [] };   // slow: 'slow' | 'pause' | 'off' while orders are being given

export function joinSquad(ag, o = {}) {
  ag.role = o.role || defaultRole(ag.wpnId); ag.liberty = o.liberty || ROLE_LIBERTY[ag.role]; ag.charge = o.charge ?? null; ag.aggression = o.aggression ?? null;
  ag.formation = o.formation || 'line'; ag.tactic = o.tactic || 'focus'; ag.order = { k: 'follow' };
}
const note = (W, s) => { SQ.log.push(s); W.log(s); };
export const allies = W => W.agents.filter(a => a.ally && a.alive);
export const chosen = W => { const s = allies(W).filter(a => SQ.sel.has(a.id)); return s.length ? s : allies(W); };

// ---- selection and groups (ctrl + number saves, number recalls) ----
export function select(W, ids, add = false) { if (!add) SQ.sel.clear(); for (const id of ids) { const a = W.agents.find(o => o.id === id); if (a && a.ally && a.alive) SQ.sel.add(id); } }
export function toggle(W, id) { if (SQ.sel.has(id)) SQ.sel.delete(id); else select(W, [id], true); }
export const clearSel = () => SQ.sel.clear();
export function saveGroup(n) { SQ.groups[n] = [...SQ.sel]; return SQ.groups[n].length; }
export function recallGroup(W, n, add) { const g = SQ.groups[n]; if (!g || !g.length) return false; select(W, g, add); return true; }
export const selectRole = (W, role, add) => select(W, allies(W).filter(a => a.role === role).map(a => a.id), add);

// ---- instructions (to the selection; everyone when none) ----
export function order(W, k, arg = {}) {
  const list = chosen(W), hero = W.hero;
  for (const a of list) {
    if (k === 'hold') a.order = { k, x: arg.x ?? hero.x, z: arg.z ?? hero.z, h: arg.h ?? holdFacing(W, arg.x ?? hero.x, arg.z ?? hero.z, hero.h), at: W.t };
    else if (k === 'goto') a.order = { k, x: arg.x, z: arg.z, h: holdFacing(W, arg.x, arg.z, headTo(hero, arg)), at: W.t };
    else if (k === 'attack') a.order = { k, target: arg.target, prev: a.order.k === 'attack' ? a.order.prev : a.order, at: W.t };
    else a.order = { k, at: W.t };
  }
  note(W, `order:${k}:${list.map(a => a.name).join(',')}`); return list;
}
export function protect(W, charge) { const list = chosen(W).filter(a => a !== charge); for (const a of list) { a.role = 'protector'; a.charge = charge.id; a.liberty = 'close'; if (a.order.k !== 'hold') a.order = { k: 'follow' }; }
  note(W, `protect:${charge.name}:${list.map(a => a.name).join(',')}`); return list; }
export function set(W, key, v) { const list = chosen(W); for (const a of list) { a[key] = v; if (key === 'role' && v !== 'protector') a.charge = null; if (key === 'role' && v === 'protector' && a.charge == null) a.charge = W.hero.id; }
  note(W, `set:${key}=${v}:${list.map(a => a.name).join(',')}`); return list; }
// hold / follow me on one key (G, as in today's game)
export function holdOrFollow(W) { const list = chosen(W); return order(W, list.every(a => a.order.k === 'hold') ? 'follow' : 'hold'); }

// facing for a held line: toward the nearest foe the party knows of, else as given
function holdFacing(W, x, z, h) { let best = null, bd = 1e9; for (const e of W.agents) if (e.team === 1 && e.alive && W.knows(e)) { const d = Math.hypot(e.x - x, e.z - z); if (d < bd) { bd = d; best = e; } }
  return best && bd < 260 ? Math.atan2(best.x - x, best.z - z) : h; }

// ---- anchors and formation slots, once a step: who is round what, in which order, at which point ----
export function anchorOf(W, a) {
  const o = a.order, hero = W.hero;
  if ((o.k === 'hold' || o.k === 'goto') && o.x != null) return { x: o.x, z: o.z, h: o.h, key: `p${Math.round(o.x)},${Math.round(o.z)}`, follow: false };
  if (o.k === 'fallback') { const foes = enemies(W, hero).filter(e => W.knows(e) && dist(e, hero) < 240);
    const away = foes.length ? Math.atan2(hero.x - foes.reduce((s, e) => s + e.x, 0) / foes.length, hero.z - foes.reduce((s, e) => s + e.z, 0) / foes.length) : hero.h + Math.PI;
    return { x: hero.x + Math.sin(away) * 40, z: hero.z + Math.cos(away) * 40, h: away + Math.PI, key: 'back', follow: false }; }
  if (a.tactic === 'weakest') { const w = weakest(W); if (w && w !== hero) return { x: w.x, z: w.z, h: w.h, key: 'w' + w.id, follow: false, circle: true }; }
  return { x: hero.x, z: hero.z, h: hero.fh ?? hero.h, key: 'hero', follow: true };
}
export function weakest(W) { let w = null; for (const a of W.agents) if (a.team === 0 && a.alive && !a.downed && a.hp / a.maxHp < .75 && (!w || a.hp / a.maxHp < w.hp / w.maxHp)) w = a; return w; }
export function assignSlots(W) {
  const groups = new Map();
  for (const a of allies(W)) { if (a.downed) continue; const an = anchorOf(W, a); a.anchor = an; const k = an.key + ':' + (an.circle ? 'circle' : a.formation);
    if (!groups.has(k)) groups.set(k, []); groups.get(k).push(a); }
  for (const [k, list] of groups) { const form = k.split(':')[1];
    list.sort((p, q) => (p.ranged - q.ranged) || p.n - q.n);   // blades in front, the bows in the rear slots
    list.forEach((a, i) => { a.slotN = i; a.slot = slotAt(a.anchor, a.anchor.h, slotOffset(form, i, list.length, a.anchor.follow)); }); }
}
export { ROLES, LIBERTY, FORMATIONS, TACTICS, ORDERS };
