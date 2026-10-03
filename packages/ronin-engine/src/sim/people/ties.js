import { TIES } from '../packs/edo/people.js';

// ---- Ties outside the family: actor.ties = [[id, kind, value], ...], at most TIES.MAX, kind 'friend' | 'rival' | 'grudge' | 'lover' ----
// value -1..1. A small array, not an object keyed by id: it is read for everyone every season, and arrays stay fast.
export const tieOf = (a, id) => { const t = a.ties; if (t) for (let i = 0; i < t.length; i++) if (t[i][0] === id) return t[i]; return null; };
export const tieValue = (a, id) => { const e = tieOf(a, id); return e ? e[2] : 0; };
const r2 = x => Math.round(x * 100) / 100;
export function setTie(a, id, kind, v) {
  const e = tieOf(a, id); if (e) { e[1] = kind; e[2] = r2(v); return e; }
  const t = a.ties || (a.ties = []);
  t.push([id, kind, r2(v)]);
  if (t.length > TIES.MAX) { let wi = -1, wv = 2; for (let i = 0; i < t.length; i++) if (t[i][1] !== 'grudge' && Math.abs(t[i][2]) < wv) { wv = Math.abs(t[i][2]); wi = i; } if (wi >= 0) t.splice(wi, 1); }
  return t[t.length - 1];
}
// warm or cool a tie by dv; friend or rival follows the sign, a grudge or a lover keeps its kind
export function bond(a, id, dv) {
  const e = tieOf(a, id), v = Math.max(-1, Math.min(1, (e ? e[2] : 0) + dv));
  return setTie(a, id, e && (e[1] === 'grudge' || e[1] === 'lover') ? e[1] : v >= 0 ? 'friend' : 'rival', v);
}
// a season passes: ties fade toward nothing unless renewed (grudges slowest); ties to the dead end
export function fade(L, a) {
  const t = a.ties; let w = 0;
  for (let i = 0; i < t.length; i++) {
    const e = t[i], o = L.actors[e[0]]; if (!o || !o.alive) continue;
    const step = e[1] === 'grudge' ? TIES.GRUDGE_FADE : TIES.FADE, nv = e[2] > 0 ? e[2] - step : e[2] + step;
    if (Math.abs(nv) < TIES.DROP) continue;
    e[2] = Math.round(nv * 1000) / 1000; t[w++] = e;
  }
  t.length = w;
  if (!w) a.ties = null;
}
