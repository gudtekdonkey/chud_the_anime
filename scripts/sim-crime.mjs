// node scripts/sim-crime.mjs [seed] [years]: live a world with the crime system for some years (10 by default) and print what happened:
// crimes by kind, bounties, land that changed hands by force vs by title. Asserts the lane's rules and exits 1 if one breaks.
import { generateWorld, advance, hoursFromYears, serialize, deserialize, HOURS_PER_YEAR, ownerOf } from '../src/sim/index.js';
import { crimeState, commit, takePlotByMurder, bountyOf, karmaName, payOff, claimantOf, courtCase, heirOf, payBloodPrice, fadeOf } from '../src/sim/crime/index.js';
const seed = +(process.argv[2] || 12345), years = +(process.argv[3] || 10);
let fails = 0; const check = (ok, what) => { console.log(`${ok ? 'ok  ' : 'FAIL'} ${what}`); if (!ok) fails++; };

let t0 = performance.now(); const L = generateWorld(seed, 0);
console.log(`world ${seed}: generated in ${(performance.now() - t0).toFixed(0)} ms, ${Object.keys(L.actors).length} people`);
const alive0 = Object.values(L.actors).filter(a => a.alive).length;

// ---- his crimes, in the start village: a theft nobody saw, a theft three people saw, a masked assault, a murder that takes a plot ----
const me = L.actors[L.player], [zx, zy] = me.at, folk = Object.values(L.actors).filter(a => a.alive && a.home && a.home[0] === zx && a.home[1] === zy && (L.hour - a.born) / HOURS_PER_YEAR >= 18);
const c = L.cultures[L.regions[L.zones[zy * 100 + zx].region].culture].id, [v1, v2, v3] = folk.filter(a => !a.holds.length), w = folk.slice(-3).map(a => a.id);
commit(L, 'theft', { by: me.id, victim: v1.id, witnesses: [], value: 30 });
check(me.karma === -3 && bountyOf(L, me.id, c) === 0, `unseen theft: karma ${me.karma}, no bounty`);
commit(L, 'theft', { by: me.id, victim: v2.id, witnesses: w, value: 30, victimSaw: false });
check(bountyOf(L, me.id, c) > 0 && me.standing[c] < 0, `seen theft: bounty ${bountyOf(L, me.id, c)} mon with ${L.cultures[c].name}, standing ${me.standing[c]}`);
const before = bountyOf(L, me.id, c); commit(L, 'assault', { by: me.id, victim: v3.id, witnesses: w, masked: true });
check(bountyOf(L, me.id, c) === before && me.karma < -3, `masked assault: karma ${me.karma}, bounty unchanged`);
const head = folk.find(a => a.holds.length && a.id !== L.regions[L.zones[zy * 100 + zx].region].lord), pid = head.holds[0];
takePlotByMurder(L, me.id, head.id, pid, { witnesses: w });
const o = ownerOf(L, pid);
check(o.holder === me.id && o.title === head.id, `plot ${pid} taken by murder: holder is him, title stays with ${head.given} (dead)`);
check(claimantOf(L, pid) === heirOf(L, head, me.id), `the heir claims it: ${claimantOf(L, pid)}`);
check(courtCase(L, pid).won === 'claimant' && ownerOf(L, pid).holder !== me.id, 'the heir sues with living witnesses and wins possession back');
console.log(`him: karma ${me.karma} (${karmaName(me.karma)}), bounty ${bountyOf(L, me.id, c)} mon, standing ${me.standing[c]}`);
me.money.ryo = 10; check(payOff(L, me.id, c, 'magistrate').ok && bountyOf(L, me.id, c) === 0, 'paid off at the magistrate');
const v4 = folk.find(a => a.alive && a.id !== v3.id && !a.holds.length && a.id !== v2.id && a.id !== v1.id && (L.hour - a.born) / HOURS_PER_YEAR < 60);
commit(L, 'murder', { by: me.id, victim: v4.id, witnesses: w });
check(bountyOf(L, me.id, c) >= 1000 && payBloodPrice(L, me.id, v4.id).ok && bountyOf(L, me.id, c) === 0, 'blood money to the heir clears a murder bounty');
const cl = w.filter(id => L.actors[id].alive); let seenThrough = 0;
for (let i = 0; i < 40; i++) seenThrough += commit(L, 'trespass', { by: me.id, witnesses: cl, close: cl, masked: true, culture: c }).unmasked ? 1 : 0;
check(seenThrough > 5 && seenThrough < 40, `masked, close witnesses see through it sometimes (${seenThrough} of 40)`);
check(fadeOf(me, 'regicide') === 0 && fadeOf({ cls: 'royal' }, 'regicide') > 0, 'killing royalty is forgiven only a royal');

// ---- the world lives ----
const days = [], H = hoursFromYears(years);
t0 = performance.now();
// the share of grown people (18 and over, the ones the world shows) alive at the start of each year who die in it
const grown = () => Object.values(L.actors).filter(a => a.alive && (L.hour - a.born) / HOURS_PER_YEAR >= 18), slain = [];
for (let y = 0; y < years; y++) { const g = grown(), t = performance.now(); advance(L, HOURS_PER_YEAR); days.push((performance.now() - t) / 112); slain.push(g.filter(a => !a.alive).length / g.length); }
const ms = performance.now() - t0;
const C = crimeState(L), s = C.stats;
console.log(`\nlived ${years} years (${H / 24} days) in ${ms.toFixed(0)} ms: ${(ms / (H / 24)).toFixed(3)} ms a day on average (per year: ${days.map(d => d.toFixed(3)).join(' ')})`);
console.log('crimes by kind', s.byKind);
console.log(`died by the sword each year (share of grown people): ${slain.map(x => (x * 100).toFixed(0) + '%').join(' ')}`);
console.log(`known ${s.known} · unseen ${s.unseen} · masked ${s.masked} · justice (the victim was wanted) ${s.justice}`);
console.log(`bounties raised ${s.bounties} · paid ${s.paid} · faded ${s.faded} · caught ${s.caught} (fined ${s.fined}, executed ${s.executed}) · raids ${s.raids} · feuds ${s.feuds} · hunters ${s.hunters}`);
const open = Object.entries(C.bounty).flatMap(([id, bs]) => Object.values(bs).map(b => b.mon));
console.log(`open bounties now ${open.length}, ${Math.round(open.reduce((a, b) => a + b, 0))} mon in all, biggest ${Math.round(Math.max(0, ...open))}`);
console.log(`land by force: ${s.land.force} seized, ${s.land.retaken} retaken · by title:`, s.land.title);
const plots = Object.entries(L.plots), split = plots.filter(([, p]) => p.title !== p.holder);
console.log(`plots where holder ≠ title now: ${split.length} (contested ${Object.keys(C.contested).length}, forged deeds ${Object.keys(C.forged).length})`);
const alive = Object.values(L.actors).filter(a => a.alive).length, dead = Object.values(L.actors).filter(a => !a.alive);
console.log(`people alive ${alive} of ${alive0} (by the sword: murder ${dead.filter(a => a.cause === 'murder').length}, executed ${dead.filter(a => a.cause === 'executed').length})`);
const ks = Object.values(L.actors).map(a => a.karma || 0); console.log(`karma: lowest ${Math.min(...ks)}, people below 0: ${ks.filter(k => k < 0).length}`);

check(slain[0] > .25 && slain[0] < .35, `a violent time: ${(slain[0] * 100).toFixed(0)}% died by the sword in the first year (owner: about 30%)`);
check(ms / (H / 24) < 1, 'under a millisecond a game day on average');
check(split.length > 0 && s.land.force > 0, 'possession and title split somewhere');
check(Object.keys(s.land.title).length >= 3, 'titles passed by several lawful mechanics');
check(['theft', 'assault', 'murder'].every(k => s.byKind[k] > 0), 'thefts, assaults and murders happen off screen');
check(s.caught > 0 && s.faded >= 0, 'magistrates catch some');
// the same world and the same years give the same result, and the ledger survives a save
const live = n => { const X = generateWorld(seed, 0); advance(X, hoursFromYears(n)); return JSON.stringify(X.sys.crime) + JSON.stringify(X.plots); };
check(live(2) === live(2), 'the same world and the same years give the same crimes');
const again = deserialize(serialize(L));
check(JSON.stringify(again.sys.crime.stats) === JSON.stringify(s), 'the crime state survives a save');
process.exit(fails ? 1 : 0);
