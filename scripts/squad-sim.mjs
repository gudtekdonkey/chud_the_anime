// node scripts/squad-sim.mjs [seconds] [seed]: the squad AI's engine side (src/iso/ai/, src/iso/squad/{orders,squad,mind}.js)
// run in Node with no three.js and no DOM, on bodies made of plain numbers: proof that the decisions stand alone, the
// way the 2D game would drive them. Each body does what its intent says in the crudest way (walk at the speed, a swing
// lands after 0.3 s if the target is still in reach, a shot after 0.6 s); the brains are the slice's own.
import { initMind } from '../src/iso/ai/senses.js';
import { temperOf } from '../src/iso/ai/temper.js';
import { thinkSide, thinkFoe, BOUNDS } from '../src/iso/ai/brain.js';
import { dropToken, died, wounded } from '../src/iso/ai/director.js';
import { thinkAlly } from '../src/iso/squad/mind.js';
import { joinSquad, assignSlots, order } from '../src/iso/squad/squad.js';

const SECS = +(process.argv[2] || 60); let seed = +(process.argv[3] || 7);
const rng = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
Object.assign(BOUNDS, { x0: 12, x1: 588, z0: 12, z1: 288 });
const A = { t: 0, dt: 1 / 60, agents: [], noises: [], tokens: new Map(), rng, events: [], focus: null, sprung: false, struckT: -99, known: new Set(),
  log(s) { this.events.push(`${this.t.toFixed(2)} ${s}`); }, blocked: () => false, knows: e => A.known.has(e),
  onTarget: (t, ex) => A.agents.filter(o => o !== ex && o.team === 0 && o.intent && o.intent.target === t && o.intent.k === 'attack').length,
  wounded: (a, f) => wounded(a, f), died: a => died(A, a) };
// a body of plain numbers
function body(o) { const a = { n: A.agents.length, id: o.name, alive: true, downed: false, hp: o.hp, maxHp: o.hp, reach: o.ranged ? 18 : 22, range: 190, h: 0, busyT: 0, value: o.value || 1, ...o,
  temper: temperOf(o.traits || [], o.temper || {}), intent: { k: 'idle' }, get busy() { return this.busyT > 0; } };
  initMind(a); if (a.team === 0 && !a.hero) joinSquad(a, { role: o.role }); A.agents.push(a); return a; }
const hero = body({ name: 'you', team: 0, hero: true, x: 100, z: 150, hp: 10 }); A.hero = hero;
const allies = [['Kuro', 'tank', 10], ['Suzume', 'assassin', 6], ['Tetsu', 'striker', 9], ['Hana', 'ranged', 5, true], ['Ren', 'support', 7]].map(([name, role, hp, ranged], i) => body({ name, team: 0, ally: true, role, hp, ranged, x: 70, z: 120 + i * 15 }));
const foes = [['Taisho', 9, true], ['Goro', 5], ['Ichi', 5], ['Saburo', 5], ['Yumi', 3, false, true], ['Kage', 3, false, true]].map(([name, hp, leader, ranged], i) => body({ name, team: 1, kind: ranged ? 'archer' : 'samurai', hp, leader, ranged, value: leader ? 3 : ranged ? 2 : 1, x: i === 5 ? 528 : 400 + (i % 2) * 30, z: i === 5 ? 262 : 90 + i * 16, h: -Math.PI / 2 }));
const step = (a, x, z, sp) => { const d = Math.hypot(x - a.x, z - a.z); if (d < 1) return; const k = Math.min(1, sp / 60 / d); a.h = Math.atan2(x - a.x, z - a.z); a.x += (x - a.x) * k; a.z += (z - a.z) * k; };
function hit(a, t, dmg) { if (!t.alive || t.downed || Math.hypot(t.x - a.x, t.z - a.z) > (a.ranged ? 999 : a.reach + 4)) return; t.hp -= dmg; wounded(t, dmg / t.maxHp);
  if (t.mind) { t.mind.threat.set(a.id, (t.mind.threat.get(a.id) || 0) + dmg * 10); t.mind.alert = 1.2; t.mind.seen.set(a.id, { x: a.x, z: a.z, t: A.t, a }); }
  if (t.hp <= 0) { if (t.team === 0 && !t.hero) { t.downed = true; t.bleed = 15; A.log(`downed:${t.name}`); } else if (!t.hero) { t.alive = false; died(A, t); A.log(`kill:${t.name} by ${a.name}`); } else t.hp = 1; } }
order(A, 'charge');
for (let i = 0; i < SECS * 60; i++) {
  A.t += A.dt; A.known.clear(); for (const f of foes) if (f.alive) A.known.add(f);
  assignSlots(A); thinkSide(A, 1, thinkFoe); thinkSide(A, 0, thinkAlly);
  for (const a of A.agents) { if (a.hero || !a.alive || a.downed) continue; a.busyT -= A.dt; const it = a.intent;
    if (a.swingAt != null && A.t >= a.swingAt) { hit(a, a.swingT, a.ranged ? .9 : 1); a.swingAt = null; dropToken(A, a); a.mind.cd = a.team ? 1.5 : .5; a.intent = { k: 'idle' }; }
    if (a.busy) continue;
    if (it.k === 'move' || it.k === 'strafe') step(a, it.x, it.z, it.speed);
    else if (it.k === 'attack' || it.k === 'shoot') { const T = it.target, d = Math.hypot(T.x - a.x, T.z - a.z); if (it.k === 'attack' && d > a.reach) step(a, T.x, T.z, 60); else { a.busyT = it.k === 'shoot' ? .9 : .6; a.swingAt = A.t + (it.k === 'shoot' ? .6 : .3); a.swingT = T; } }
    else if (it.k === 'revive' && Math.hypot(it.target.x - a.x, it.target.z - a.z) > 10) step(a, it.target.x, it.target.z, 60); else if (it.k === 'revive') { it.target.downed = false; it.target.hp = it.target.maxHp * .4; A.log(`revive:${a.name}>${it.target.name}`); a.intent = { k: 'idle' }; }
    else if (it.k === 'taunt') { a.busyT = .8; a.mind.tauntT = A.t; for (const f of foes) if (f.alive && Math.hypot(f.x - a.x, f.z - a.z) < 85) f.mind.threat.set(a.id, (f.mind.threat.get(a.id) || 0) + 45); A.log(`taunt:${a.name}`); a.intent = { k: 'idle' }; } }
  for (const a of allies) if (a.downed && (a.bleed -= A.dt) <= 0) { a.downed = false; a.alive = false; A.log(`dead:${a.name}`); }
  if (foes.every(f => !f.alive)) { A.log('the yard is clear'); break; }
}
const kinds = {}; for (const e of A.events) { const k = e.split(' ')[1].split(':')[0]; kinds[k] = (kinds[k] || 0) + 1; }
console.log(`${A.t.toFixed(1)} s: foes standing ${foes.filter(f => f.alive).map(f => f.name).join(', ') || 'none'}; party ${allies.map(a => `${a.name} ${a.alive ? a.downed ? 'down' : a.hp.toFixed(1) : 'dead'}`).join(', ')}`);
console.log('events:', JSON.stringify(kinds)); console.log(A.events.filter(e => /kill|downed|revive|dead|break|execute|intercept|clear/.test(e)).join('\n'));
