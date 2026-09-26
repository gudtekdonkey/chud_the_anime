// node scripts/sim-economy.mjs [seed] [years]: make a world, live it with the economy (src/sim/economy/), and print what balance needs
// checking: prices by season, the books each year (money in, money out, and anything unexplained), wealth by class, lords, events, speed.
// Exits non-zero if money is made or lost unaccounted, so it doubles as a test.
import '../src/sim/economy/index.js';
import { generateWorld, advance, calendar, TIME, serialize, deserialize } from '../src/sim/index.js';
import { GOODS, GOOD, moneySupply, wealthByClass, economyIndex, worth } from '../src/sim/economy/index.js';
const seed = +(process.argv[2] || 12345), years = +(process.argv[3] || 10);
let t0 = performance.now(); const L = generateWorld(seed, 0); console.log(`world ${seed}: generated in ${Math.round(performance.now() - t0)} ms`);
const E = L.sys.economy, pad = (s, n) => String(s).padStart(n), avg = f => E.regions.reduce((s, R) => s + f(R), 0) / E.regions.length, sum = f => E.regions.reduce((s, R) => s + f(R), 0);
const m0 = moneySupply(L);
console.log(`money at the start: ${Math.round(m0.total).toLocaleString()} mon (purses ${Math.round(m0.purses).toLocaleString()}, guilds ${Math.round(m0.guild).toLocaleString()})`);
console.log('\nmean price over the regions, mon, at the end of each season');
console.log('year  season  ' + GOODS.map(g => pad(g, 8)).join('') + '  famine  hungry');
console.log('      base    ' + GOODS.map(g => pad(GOOD[g].base, 8)).join(''));
// conservation: day by day, the change in all the money must equal what was minted and looted less what the temples and hoards took
let hungerSum = 0, hungerN = 0, unexplained = 0, total = 0, last = m0.total, fl = { ...E.flow }, msYear = [];
const flowNet = () => { const f = E.flow, d = (f.mint - fl.mint) + (f.loot - fl.loot) + (f.other - fl.other) - (f.temple - fl.temple) - (f.buried - fl.buried); fl = { ...f }; return d; };
for (let y = 1; y <= years; y++) {
  let ms = 0;
  for (let s = 0; s < 4; s++) {
    for (let d = 0; d < TIME.DAYS_PER_SEASON; d++) {
      t0 = performance.now(); advance(L, TIME.HOURS_PER_DAY); ms += performance.now() - t0;
      if (fl.mint > E.flow.mint) fl = { mint: 0, loot: 0, other: 0, temple: 0, buried: 0, fees: 0 };   // the year's books were closed
      const now = moneySupply(L).total; unexplained += now - last - flowNet(); last = now;
      if (y > 1) { hungerSum += sum(R => R.hungry) / sum(R => R.pop); hungerN++; }
    }
    const c = calendar(L.hour - 1);
    console.log(`${pad(c.year, 4)}  ${c.season.padEnd(6)}  ${GOODS.map((g, i) => pad(Math.round(avg(R => R.price[i])), 8)).join('')}  ${pad(E.regions.filter(R => R.famine).length, 6)}  ${pad(Math.round(sum(R => R.hungry)), 6)}`);
  }
  msYear.push(ms / 112);
  const Y = E.years[E.years.length - 1];
  console.log(`  books, year ${Y.year}: money ${Y.total.toLocaleString()} | in: mint ${Y.mint.toLocaleString()}, loot ${Y.loot} | out: temples ${Y.temple.toLocaleString()}, buried ${Y.buried.toLocaleString()} | unexplained ${Math.round(unexplained)} | crop ${Math.round(sum(R => R.crop))} koku, tax ${Math.round(sum(R => R.tax))} | caravans ${Y.caravans.sent} out, ${Y.caravans.arrived} in, ${Y.caravans.robbed} robbed`);
  total += Math.abs(unexplained); unexplained = 0;
}
const people = economyIndex(L).pop.reduce((a, b) => a + b, 0), m = moneySupply(L);
console.log(`\nmoney now ${Math.round(m.total).toLocaleString()} mon (${((m.total / m0.total - 1) * 100).toFixed(1)}% over ${years} years): purses ${Math.round(m.purses).toLocaleString()}, guilds ${Math.round(m.guild).toLocaleString()}, temples ${Math.round(m.temple).toLocaleString()}, pools ${Math.round(m.pools).toLocaleString()}; buried in the ground ${Math.round(m.buried).toLocaleString()}`);
console.log(`short of rice: ${(hungerSum / Math.max(1, hungerN) * 100).toFixed(0)}% of people on an average day after the first year`);
console.log(`people ${people}; hungry now ${Math.round(sum(R => R.hungry))}; rice stolen by outlaws ${Math.round(sum(R => R.stolen || 0))} koku; alms ${Math.round(sum(R => R.alms || 0)).toLocaleString()} mon`);
console.log('\nwealth by household (head\'s class, mon):  households     mean   median   under 20');
{ const by = {}; for (const h of economyIndex(L).hh) { let v = 0; for (const a of h.m) if (a.alive) v += worth(a.money); (by[h.head.cls] = by[h.head.cls] || []).push(v); }
  for (const [k, l] of Object.entries(by).map(([k, l]) => [k, l.sort((a, b) => a - b)]).sort((a, b) => b[1].reduce((s, v) => s + v, 0) / b[1].length - a[1].reduce((s, v) => s + v, 0) / a[1].length))
    console.log(`  ${k.padEnd(10)} ${pad(l.length, 18)} ${pad(Math.round(l.reduce((s, v) => s + v, 0) / l.length), 8)} ${pad(Math.round(l[l.length >> 1]), 8)} ${pad((l.filter(v => v < 20).length / l.length * 100).toFixed(0) + '%', 10)}`); }
console.log('\nwealth by person (mon):                 people     mean   median');
for (const [k, o] of Object.entries(wealthByClass(L)).sort((a, b) => b[1].mean - a[1].mean)) console.log(`  ${k.padEnd(10)} ${pad(o.n, 18)} ${pad(Math.round(o.mean), 8)} ${pad(Math.round(o.median), 8)}`);
const lords = Object.entries(E.lords).map(([id, l]) => ({ id, ...l, a: L.actors[id] })).filter(l => l.a).sort((a, b) => b.koku - a.koku);
console.log('\ntop lords by koku:'); for (const l of lords.slice(0, 5)) console.log(`  ${l.a.given} ${l.a.family} (${l.a.cls}) of ${L.regions[l.region].name}: ${l.koku} koku; this year's tax ${l.taxIn}, granary ${l.granary.toFixed(1)}, purse ${Math.round(worth(l.a.money)).toLocaleString()} mon`);
const ev = {}; for (const e of L.log) if (e.type.startsWith('econ.')) ev[e.type] = (ev[e.type] || 0) + 1; console.log('\neconomy events in the log:', ev);
console.log('save size', (JSON.stringify(L).length / 1024).toFixed(0), 'KB; the economy\'s share', (JSON.stringify(E).length / 1024).toFixed(0), 'KB');
const later = msYear.slice(1), steady = later.length ? later.reduce((a, b) => a + b, 0) / later.length : msYear[0];
console.log(`speed: ${(msYear.reduce((a, b) => a + b, 0) / msYear.length).toFixed(3)} ms a day on average (year 1, with the code warming up: ${msYear[0].toFixed(3)}; after: ${steady.toFixed(3)})`);
// determinism (docs/sim-core.md rules 1 and 3): a save loaded and lived on matches the original, and an absence lived in one go matches
// the same days lived one at a time
{ const A = generateWorld(seed, 0); advance(A, 24 * 150); const B = deserialize(serialize(A));
  advance(A, 24 * 120); for (let d = 0; d < 120; d++) advance(B, 24);
  const same = JSON.stringify(A.sys.economy) === JSON.stringify(B.sys.economy) && JSON.stringify(A.actors) === JSON.stringify(B.actors);
  console.log(`determinism: save, load and live on, one long absence against day by day: ${same ? 'identical' : 'DIFFERENT'}`); if (!same) process.exitCode = 1; }
if (total > years * 100) { console.error(`money unaccounted for: ${Math.round(total)} mon`); process.exit(1); }
