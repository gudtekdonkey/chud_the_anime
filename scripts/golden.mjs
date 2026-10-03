// node scripts/golden.mjs [--write]: the engine split's guard (docs/engine-extract.md). Fingerprints everything a move of
// files must not change: every flow clip played through an Actor frame by frame (pose, position, events, springs, feet),
// the tuning tables (hit-stop, weapons, styles, enemy types, beats, gear, hair, squad orders, traits), today's 2D
// trait bakes, and a world lived a year with every lane. --write stores the hashes in scripts/golden.json; without it
// the run compares and exits 1 on any difference. Runs in Node: no three.js scene, no DOM.
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

globalThis.addEventListener ??= () => {};   // a module that listens for keys at load (the close-up's skip) loads in Node
const ROOT = fileURLToPath(new URL('..', import.meta.url)), OUT = ROOT + 'scripts/golden.json', DUMP = ROOT + 'test-output/golden/';
// a game file by its old path; once moved into the engine (scripts/engine-moved.json) the same file from the package
const MOVED = existsSync(ROOT + 'scripts/engine-moved.json') ? JSON.parse(readFileSync(ROOT + 'scripts/engine-moved.json', 'utf8')) : {};
const src = p => import(MOVED[p] || ROOT + 'src/' + p);
// a module of the list that one side of the split no longer has (the weapons' clips: built by poses.js before, by arsenal.js after)
const opt = p => MOVED[p] || existsSync(ROOT + 'src/' + p) ? src(p) : null;
// functions become their source, so a table's behaviour is fingerprinted too; Sets and Maps as arrays
const replacer = (k, v) => typeof v === 'function' ? 'fn:' + v.toString() : v instanceof Set ? [...v] : v instanceof Map ? [...v.entries()] : v;
const json = v => JSON.stringify(v, replacer);
const sha = s => createHash('sha256').update(s).digest('hex').slice(0, 16);
const got = {}, dumps = {};
const put = (name, v) => { const s = typeof v === 'string' ? v : json(v); got[name] = sha(s); dumps[name] = s; };

// ---- the clips: every module that registers one, in the order the slice loads them ----
const flow = await src('iso/anim/flow.js');
for (const p of ['iso/fx/fx.js', 'iso/anim/moves.js', 'iso/anim/moves-extra.js', 'iso/anim/idles.js', 'iso/anim/moves-squad.js', 'iso/anim/moves-port.js', 'iso/exec/stage.js', 'iso/weapons/poses.js', 'iso/weapons/arsenal.js',
  'iso/enemies/moves.js', 'iso/skills/moves.js', 'iso/skills/reserved-moves.js', 'iso/exec/poses.js', 'iso/persona/gait.js']) await opt(p);
const { CLIPS, Actor, SETTINGS } = flow;
put('flow.settings', SETTINGS);
put('clips.data', Object.fromEntries(Object.keys(CLIPS).sort().map(k => [k, CLIPS[k]])));
// play each clip alone in a bare world at the slice's 1/120 s, as the hero would: running forward for the procedural ones
const DT = 1 / 120, frames = {}, { HOLD } = await src('iso/enemies/moves.js');
// an enemy's guard reads its weapon's hold: those clips play once per hold
const runs = Object.keys(CLIPS).sort().flatMap(n => n.startsWith('e_') ? Object.keys(HOLD).map(w => [n, w]) : [[n, null]]);
for (const [name, hold] of runs) {
  const evs = [], W = { t: 0, dt: DT, fx: [], actors: [], event: (a, n) => evs.push([+W.t.toFixed(6), n]) };
  const a = new Actor(W, { h: .3, ht: .3, vt: CLIPS[name].kind === 'proc' ? 110 : 0 });
  const at = name.indexOf('@'); if (at > 0) a.wid = name.slice(at + 1);
  if (hold) a.char = { T: { weapon: hold }, seed: 1 };
  const out = []; let err = null;
  try { a.play(name.slice(0, at > 0 ? at : undefined)); const dur = Math.min(CLIPS[name].dur ?? 1.5, 4);
    for (let i = 0; i * DT <= dur + .25; i++) { W.t += DT; a.update(DT); if (a.sample()) out.push(a.out); }
  } catch (e) { err = String(e.message); }
  frames[hold ? name + '#' + hold : name] = { out, evs, err, fx: W.fx.length, x: a.x, z: a.z, h: a.h };
}
put('clips.played', frames);

// ---- tables: tuning numbers, colours and timings ----
const tab = async (name, p, keys) => { const m = await src(p); put(name, Object.fromEntries(keys.map(k => [k, m[k]]))); };
await tab('sim.stop', 'iso/play/sim.js', ['STOP']);
await tab('weapons', 'iso/weapons/arsenal.js', ['ARSENAL']);
await tab('styles', 'iso/gfx/style.js', ['STYLES']);
await tab('palette', 'iso/gfx/palette.js', Object.keys(await src('iso/gfx/palette.js')));
await tab('enemies.types', 'iso/enemies/types.js', Object.keys(await src('iso/enemies/types.js')));
await tab('enemies.moves', 'iso/enemies/moves.js', ['HOLD', 'HITS']);
await tab('skills.beats', 'iso/skills/beats.js', Object.keys(await src('iso/skills/beats.js')));
await tab('gear', 'iso/gear/items.js', ['GEAR']);
await tab('hair', 'iso/hair/styles.js', ['HAIR']);
await tab('hats', 'iso/hair/hats.js', ['HATS']);
await tab('squad.orders', 'iso/squad/orders.js', Object.keys(await src('iso/squad/orders.js')));
await tab('ai.temper', 'iso/ai/temper.js', Object.keys(await src('iso/ai/temper.js')));
await tab('persona', 'iso/persona/behave.js', Object.keys(await src('iso/persona/behave.js')));
await tab('traits', 'traits/traits.js', ['TRAITS', 'GROUPS', 'PRESETS']);
await tab('cultures', 'traits/cultures.js', ['CULTURES']);
await tab('knobs', 'traits/knobs.js', ['BASE', 'ARMS']);

// ---- today's 2D game's bakes: the plain ronin, every preset, a person of every culture ----
const { bake } = await src('traits/bake.js'), { mix } = await src('traits/mix.js'), { PRESETS } = await src('traits/traits.js');
const { CULTURES, personOf } = await src('traits/cultures.js');
const bakes = { plain: bake([]), mixed: mix([]) };
for (const [k, p] of Object.entries(PRESETS)) bakes['preset:' + k] = bake(p);
for (const c of Object.keys(CULTURES)) bakes['culture:' + c] = bake(personOf(c, 7));
put('traits.bakes', bakes);
const { personaOf } = await src('iso/persona/persona.js');
put('persona', { plain: personaOf([]), unarmed: personaOf([], { armed: false }), ...Object.fromEntries(Object.entries(PRESETS).map(([k, p]) => [k, personaOf(p)])) });

// ---- the world: seed 1 with every lane, lived one year ----
const sim = await src('sim/index.js');
for (const l of ['people', 'economy', 'crime', 'story', 'travel', 'dominion']) await src(`sim/${l}/index.js`);
const L = sim.generateWorld(1, 0); put('sim.made', sim.serialize(L));
sim.advance(L, sim.hoursFromYears(1)); put('sim.year', sim.serialize(L));

// ---- the squad AI fighting a battle on plain bodies, traced four times a second ----
const { execFileSync } = await import('node:child_process');
for (const a of [[]]) put('squad.sim' + (a.length ? '.' + a.join('.') : ''), execFileSync('node', [ROOT + 'scripts/squad-sim.mjs', ...a], { env: { ...process.env, SQUAD_TRACE: '1' } }).toString());

// ---- compare or write ----
mkdirSync(DUMP, { recursive: true }); for (const [k, s] of Object.entries(dumps)) writeFileSync(DUMP + k + '.json', s);
if (process.argv.includes('--write')) { writeFileSync(OUT, JSON.stringify(got, null, 1) + '\n'); console.log(`wrote ${Object.keys(got).length} fingerprints to scripts/golden.json`); process.exit(0); }
const want = JSON.parse(readFileSync(OUT, 'utf8')); let bad = 0;
for (const k of new Set([...Object.keys(want), ...Object.keys(got)])) {
  const ok = want[k] === got[k]; if (!ok) bad++; console.log(`${ok ? 'ok  ' : 'FAIL'} ${k}${ok ? '' : `  (was ${want[k] || 'absent'}, now ${got[k] || 'absent'})`}`); }
console.log(bad ? `${bad} fingerprint(s) changed; the dumps are in test-output/golden/` : 'golden: all fingerprints match'); process.exit(bad ? 1 : 0);
