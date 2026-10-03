// npm run check:gear: dresses all 200 gear pieces (src/iso/gear/, docs/gear.md) and many outfits in Node, no browser:
// each piece alone and over a full outfit; every preset; 600 random outfits (any family and each family). Every
// outfit is built in 3D (gear/dress.js), posed through the core loop's moves in all 8 facings (rig.js applyPose), and
// drawn by the pixel look's engine (gear/pixel.js). It asserts: no errors; the schema's counts (200 pieces, every slot
// and layer stocked, the three families); no missing slots (every slot worn shows at least one part, unless a piece
// over it hides it by rule, which the check names); finite, bounded geometry; the shells nesting outward; presets that
// fill every slot; the outfit string round-tripping.
import { GEAR, BY_ID, BY_CELL } from '../src/iso/gear/items.js';
import { SLOTS, LAYERS, FAMILIES, STAT_KEYS, STAT_SHORT, statSum } from 'ronin-engine/iso/gear/schema.js';
import { makeDressed, resolve } from 'ronin-engine/iso/gear/dress.js';
import { pixStyle } from 'ronin-engine/iso/gear/pixel.js';
import { PRESETS, randomOutfit, empty, encode, decode, outfitStats } from '../src/iso/gear/outfits.js';
import { applyPose } from 'ronin-engine/iso/rig3d.js';
import { Actor, FA } from 'ronin-engine/flow/flow.js';
import { drawFigure, toPix } from 'ronin-engine/iso/pixel/engine.js';
import 'ronin-engine/flow/moves.js';

let step = '', fails = 0, checks = 0;
const fail = m => { fails++; console.error(`FAIL ${step}: ${m}`); if (fails > 20) { console.error('too many failures'); process.exit(1); } };
const ok = m => console.log(`  ok  ${step}${m ? ': ' + m : ''}`);
const t0 = Date.now();

// ---- the schema ----
step = 'schema';
if (GEAR.length !== 200) fail(`${GEAR.length} pieces, wanted 200`);
for (const s of SLOTS) for (const l of LAYERS) if (!BY_CELL[s][l].length) fail(`nothing for ${s}/${l}`);
const fam = Object.fromEntries(FAMILIES.map(f => [f, GEAR.filter(p => p.family === f).length]));
if (Math.min(...Object.values(fam)) < 50) fail(`families unbalanced ${JSON.stringify(fam)}`);
for (const p of GEAR) { const n = statSum(p.stats); if (n < 1 || n > 4) fail(`${p.id} stats ${n}`); }
ok(`${GEAR.length} pieces · ${SLOTS.map(s => `${s} ${LAYERS.map(l => BY_CELL[s][l].length).join('/')}`).join(' · ')} · ${Object.entries(fam).map(([f, n]) => `${f} ${n}`).join(' ')}`);

// ---- poses: the core loop's moments, in all 8 facings ----
const W = { t: 0, dt: 1 / 120, fx: [], event() {}, actors: [] };
const POSES = [['idle', .6], ['run', .2], ['run', .4], ['J1', .185], ['J2', .145], ['J3', .265], ['roll', .2], ['guard', .5], ['sheathe', .4], ['skid', .1]].map(([c, t]) => {
  const a = new Actor(W, { x: 0, z: 0, h: 0, foe: 0 }); a.v = c === 'run' ? 110 : 0; a.vt = a.v; a.play(c, { blend: 0 }); for (let i = 0, n = Math.round(t / W.dt); i <= n; i++) a.update(W.dt); return a.pose; });

// one outfit through everything; `full` asks that every slot worn shows something
const C0 = { chains: [] };
function dress(o, what, { poses = 3, pixel = true } = {}) {
  checks++;
  let rig;
  try { rig = makeDressed(o); } catch (e) { return fail(`${what}: build threw ${e.message}`); }
  const { entries } = resolve(o);
  // no missing slots: a slot worn shows at least one part (a fully hidden piece is fine when its slot's other layer shows)
  for (const s of SLOTS) { const ids = LAYERS.map(l => o[s][l]).filter(Boolean); if (!ids.length) continue;
    const shown = entries.some(e => ids.includes(e.p.id) && !e.hidden);
    if (!shown) fail(`${what}: the ${s} slot shows nothing (${ids.join(', ')} all hidden by ${entries.filter(e => ids.includes(e.p.id)).map(e => e.hidden && e.hidden.id).join(', ')})`); }
  for (const [id, r] of Object.entries(rig.report)) if (r.built + r.hidden === 0) fail(`${what}: ${id} has no parts`);
  // geometry: finite, near him
  for (const m of rig.meshes) { const a = m.geometry.attributes.position.array; for (let i = 0; i < a.length; i++) if (!Number.isFinite(a[i])) return fail(`${what}: NaN in a mesh`);
    const bs = m.geometry.boundingSphere; if (!bs || bs.radius > 30) return fail(`${what}: a mesh ${bs ? bs.radius.toFixed(1) : '?'} units across`); }
  // the shells nest: every zone's pad only grows outward and stays thin enough to look worn, not inflated
  for (const [z, p] of Object.entries(rig.pads)) for (const v of p) if (!(v >= 0 && v < 3.2)) return fail(`${what}: zone ${z} stands ${v.toFixed(2)} off the body`);
  // posed in every facing: the springs, the IK, the katana
  for (let i = 0; i < poses; i++) { const P = POSES[(checks + i * 3) % POSES.length]; for (const yaw of FA) { rig.body.rotation.y = yaw; try { applyPose(rig, P); rig.root.updateMatrixWorld(true); } catch (e) { return fail(`${what}: pose threw ${e.message}`); } } }
  if (pixel) { const S = pixStyle(o); for (let i = 0; i < poses; i++) { const P = POSES[(checks + i) % POSES.length]; const yaw = FA[(checks + i) % 8];
    try { toPix(drawFigure(S, P, C0, { a: yaw, p: 1, cp: .727, sp: .6 }, { W: 96, H: 100, X0: 48, Y0: 72 })); } catch (e) { return fail(`${what}: pixel look threw ${e.message}`); } } }
  return rig;
}

// ---- every piece alone, and over a full outfit ----
step = 'every piece';
const hiddenBy = {};
for (const p of GEAR) { const o = empty(); o[p.slot][p.layer] = p.id; const r = dress(o, `${p.id} alone`, { poses: 4 }); if (r && r.report[p.id].built === 0) fail(`${p.id} alone builds nothing`); }
for (const p of GEAR) { const o = randomOutfit(GEAR.indexOf(p) + 1); o[p.slot][p.layer] = p.id; const r = dress(o, `${p.id} in a full outfit`, { poses: 2 });
  if (r && r.report[p.id].built === 0) (hiddenBy[p.id] = 1); }
ok(`200 alone, 200 in full outfits (${Object.keys(hiddenBy).length} of them fully under an armour piece that hides them, by rule)`);

// ---- presets ----
step = 'presets';
for (const pr of PRESETS) { for (const s of SLOTS) for (const l of LAYERS) { const id = pr.o[s][l]; if (!id) fail(`${pr.id}: ${s}/${l} empty`); else if (!BY_ID[id]) fail(`${pr.id}: no piece ${id}`); }
  dress(pr.o, `preset ${pr.id}`, { poses: 10 }); }
ok(`${PRESETS.length} presets, every slot filled, posed in 10 moments × 8 facings`);

// ---- random outfits ----
step = 'random outfits';
const used = new Set();
for (let i = 0; i < 600; i++) { const family = i < 300 ? null : FAMILIES[i % 3], o = randomOutfit(1000 + i, family);
  for (const s of SLOTS) for (const l of LAYERS) { if (!o[s][l]) fail(`random ${i}: ${s}/${l} empty`); used.add(o[s][l]); }
  if (family) for (const s of SLOTS) for (const l of LAYERS) if (BY_ID[o[s][l]].family !== family) fail(`random ${family} outfit wears ${o[s][l]}`);
  dress(o, `random outfit ${i}${family ? ' (' + family + ')' : ''}`, { poses: 2, pixel: i % 3 === 0 });
  if (decode(encode(o)) && encode(decode(encode(o))) !== encode(o)) fail(`random ${i}: the outfit string does not round-trip`); }
ok(`600 outfits (300 any family, 100 per family), every slot filled; ${used.size} different pieces worn`);

// ---- stats ----
step = 'stats';
{ const st = outfitStats(PRESETS[0].o); if (STAT_KEYS.some(k => !Number.isInteger(st[k]) || st[k] < 0)) fail(`stats ${JSON.stringify(st)}`); ok(`Iron Ash in gear adds ${STAT_KEYS.map(k => STAT_SHORT[k] + ' +' + st[k]).join(' ')}`); }

console.log(fails ? `\n${fails} failure(s) in ${checks} outfits` : `\nall gear checks passed: ${checks} outfits dressed, posed and drawn in ${((Date.now() - t0) / 1000).toFixed(1)} s`);
process.exitCode = fails ? 1 : 0;
