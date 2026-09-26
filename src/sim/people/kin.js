import { HOURS_PER_YEAR } from '../time.js';
import { AGE } from './rules.js';

// ---- Family: who is whose, read from the actor records (parents, children, spouse). No state of its own ----
export const act = (L, id) => id == null ? null : L.actors[id] || null;
export const alive = (L, id) => { const a = act(L, id); return a && a.alive ? a : null; };
export const age = (L, a) => (L.hour - a.born) / HOURS_PER_YEAR;
export const adult = (L, a) => age(L, a) >= AGE.ADULT;
// memoised key strings (plain constants, not ledger state): building 'a' + n or 'x,y' afresh for every lookup was most of a day's cost
const IDK = [], ZK = [];
export const idKey = n => IDK[n] || (IDK[n] = 'a' + n);
export const zk = (x, y) => ZK[y * 1024 + x] || (ZK[y * 1024 + x] = x + ',' + y);
export const zkey = xy => xy ? zk(xy[0], xy[1]) : null;
const byBirth = (a, b) => a.born - b.born || (a.id < b.id ? -1 : 1);

export const children = (L, a) => a.children.map(id => act(L, id)).filter(Boolean).sort(byBirth);
export const livingChildren = (L, a) => children(L, a).filter(c => c.alive);
export const eldest = list => list.length ? list[0] : null;
export function siblings(L, a) {
  const out = new Map();
  for (const pid of a.parents) { const p = act(L, pid); if (p) for (const c of p.children) if (c !== a.id && L.actors[c]) out.set(c, L.actors[c]); }
  return [...out.values()].sort(byBirth);
}
// the heir line through the dead: children of dead children, eldest line first
export function grandchildren(L, a, sonsOnly) {
  const out = [];
  for (const c of children(L, a)) if (!c.alive && (!sonsOnly || c.sex === 'm')) out.push(...livingChildren(L, c).filter(g => !sonsOnly || g.sex === 'm'));
  return out;
}
// too close to marry: parent and child, siblings and half-siblings, grandparent and grandchild (cousins may wed)
export function closeKin(L, a, b) {
  if (a.parents.includes(b.id) || b.parents.includes(a.id)) return true;
  if (a.parents.some(p => b.parents.includes(p))) return true;
  for (const p of a.parents) { const pa = act(L, p); if (pa && pa.parents.includes(b.id)) return true; }
  for (const p of b.parents) { const pb = act(L, p); if (pb && pb.parents.includes(a.id)) return true; }
  return false;
}
// the living people a person answers for: spouse, parents, children, siblings (grudges and grief reach them)
export function nearKin(L, a) {
  const ids = new Set([a.spouse, ...a.parents, ...a.children, ...siblings(L, a).map(s => s.id)]);
  ids.delete(null); ids.delete(a.id);
  return [...ids].map(id => alive(L, id)).filter(Boolean);
}
// ancestors and descendants of one person as a plain tree: { id, name, born, died, cause, spouse, kids: [...] } (the prototype and the test)
export function tree(L, id, depth = 4) {
  const a = act(L, id); if (!a) return null;
  const sp = act(L, a.spouse);
  return { id, name: `${a.given} ${a.family}`, sex: a.sex, born: a.born, died: a.alive ? null : a.died, cause: a.cause || null, job: a.job, cls: a.cls,
    spouse: sp ? `${sp.given} ${sp.family}` : null, kids: depth > 0 ? children(L, a).map(c => tree(L, c.id, depth - 1)) : [] };
}
// the eldest ancestor up the father's line, up to n generations
export function founder(L, a, n = 6) { let x = a; for (let i = 0; i < n; i++) { const f = act(L, x.parents[0]); if (!f) break; x = f; } return x; }
