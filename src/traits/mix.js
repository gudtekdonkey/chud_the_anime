import { BASE, MUL, MODES, ARMS } from './knobs.js';
import { FIDGETS } from './fidgets.js';
import { TRAITS } from './traits.js';

// ---- Mixing: a personality is a list of [trait id, strength]; the result is one set of knobs per mode ----
// Strength scales a trait: .5 is half as proud, 1.5 prouder still. Mixing is plain addition, so order never matters.
const clone = o => JSON.parse(JSON.stringify(o));
// add a trait of your own (or replace one) at runtime; `like` works the same as in traits.js
export function defineTrait(id, spec) { check(id, spec); TRAITS[id] = spec; }
// a trait with `like` expands into its parent first, at the same strength
const expand = (id, k, seen = new Set()) => {
  const t = TRAITS[id]; if (!t) throw new Error(`unknown trait "${id}"`);
  if (seen.has(id)) throw new Error(`trait "${id}" is its own ancestor`); seen.add(id);
  return [...(t.like ? expand(t.like, k, seen) : []), [t, k]];
};
function nudge(m, key, v, k) {
  if (key === 'f' || key === 'b') { for (const a in v) m[key][a] = (m[key][a] || 0) + v[a] * k; return; }
  if (!(key in m)) return;                           // an `all` knob this mode doesn't have
  if (Array.isArray(m[key])) m[key] = m[key].map((x, i) => x + v[i] * k);
  else if (MUL.has(key)) m[key] *= Math.pow(v, k);
  else m[key] += v * k;
}
export function mix(list = [], extra) {
  const out = clone(BASE); out.fidgets = [];
  for (const [id, k] of list) for (const [t, kk] of expand(id, k)) {
    for (const mode of MODES) for (const blk of [t.all, t[mode]]) if (blk) for (const key in blk) nudge(out[mode], key, blk[key], kk);
    if (kk > .25) for (const f of t.fidgets || []) if (!out.fidgets.includes(f)) out.fidgets.push(f);
  }
  // hand-tuning on top of the traits: { walk: { speed: 1.2 } } in the same shape as a trait
  if (extra) for (const mode of MODES) for (const blk of [extra.all, extra[mode]]) if (blk) for (const key in blk) nudge(out[mode], key, blk[key], 1);
  out.fidgets = out.fidgets.slice(0, 4);             // keeps the idle loop a sensible length
  return out;
}

// ---- Validation: a typo in a trait fails loudly at load instead of silently doing nothing ----
function check(id, t) {
  const bad = m => { throw new Error(`trait "${id}": ${m}`); };
  if (!t.name || !t.about) bad('needs a name and an about');
  if (t.like && !TRAITS[t.like]) bad(`like "${t.like}" is not a trait`);
  for (const mode of ['all', ...MODES]) for (const key in t[mode] || {}) {
    if (key === 'f' || key === 'b') { for (const a in t[mode][key]) if (!ARMS[a]) bad(`no hand target "${a}"`); continue; }
    if (!MODES.some(m => key in BASE[m]) || (mode !== 'all' && !(key in BASE[mode]))) bad(`${mode} has no knob "${key}"`);
  }
  for (const f of t.fidgets || []) if (!FIDGETS[f]) bad(`no fidget "${f}"`);
}
for (const id in TRAITS) check(id, TRAITS[id]);
