// node test/shots.mjs: the shots module (weapons/shots.js) and a gun's row (iso/weapons/fire.js), on plain bodies: a
// swept bullet never skips through a body at speed, a point arrow hits within its radius, walls stop shots, a magazine
// empties and reloads.
import { fire, stepShots } from '../src/weapons/shots.js';
import { fireFrom, reload } from '../src/iso/weapons/fire.js';

const fails = []; const ok = (c, m) => { console.log(`${c ? 'ok  ' : 'FAIL'} ${m}`); if (!c) fails.push(m); };
const run = (list, opts, secs = 1) => { for (let t = 0; t < secs; t += 1 / 120) stepShots(list, 1 / 120, opts); };
// a bullet at 900 units/s covers 7.5 a step: the swept test still finds a body 2 units wide
{ const L = [], hits = []; fire(L, { x: 0, z: 0, y: 15, h: Math.PI / 2, v: 900, life: 1, r: 2, test: 'swept' });
  run(L, { targets: () => [{ x: 300.4, z: .5 }], hit: (s, o) => (hits.push(o), true) }); ok(hits.length === 1 && !L.length, 'a swept bullet at 900/s hits a body 300 away and is spent'); }
{ const L = [], hits = []; fire(L, { x: 0, z: 0, h: 0, v: 560, life: 1.6, r: 9, test: 'point' });
  run(L, { targets: () => [{ x: 4, z: 200 }], hit: (s, o) => (hits.push(o), true) }); ok(hits.length === 1, "a point arrow (the archer's) hits within 9"); }
{ const L = []; let expired = 0; fire(L, { x: 0, z: 0, h: 0, v: 400, life: 2, r: 4, test: 'swept' });
  run(L, { solid: (x, z) => z > 100, expire: () => expired++ }); ok(expired === 1 && !L.length, 'a wall stops it'); }
// a six-gun: six rounds, then nothing until reloaded; shots leave his tip along his heading
const colt = { id: 'colt', fire: { shot: 'bullet', speed: 900, life: .5, radius: 2, dmg: 1, mag: 6, range: 400 } };
const gunman = { wpn: colt, team: 0, x: 10, z: 20, a: { h: Math.PI / 2 }, bladeWorld: () => ({ tip: [14, 16, 20] }) }, L = [];
let n = 0; while (fireFrom(gunman, L)) n++;
ok(n === 6 && L.length === 6 && L.every(s => s.x === 14 && s.k === 'bullet' && Math.abs(s.vx - 900) < 1e-9), 'six rounds from the muzzle along his heading, then empty');
reload(gunman); ok(!!fireFrom(gunman, L), 'reloaded, it fires again');
process.exit(fails.length ? 1 : 0);
