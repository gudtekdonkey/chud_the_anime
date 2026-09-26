import { newId, zoneAt } from '../ledger.js';
import { ST, today, clamp, announce, kill, seize, pay, who, alive, actor, regName, zoneName, census, dedupe, villagesOf } from './state.js';
import { post } from './quests.js';

// ---- Crime and order, as the story sees it: camps that raid, merchants robbed, famous bounties, bandit armies, crackdowns ----
// The crime lane owns crimes, witnesses and bounties on people. While it is absent (no L.sys.crime), the camps raid and rob here so
// the world still has outlaws; once it is there, its crime.* events feed the same quests instead (docs/sim-story.md, "What story needs").

const key = z => z.x + ',' + z.y;
export function initOrder(L) {
  const S = ST(L); S.camps = {};
  const villages = L.zones.filter(z => z.kind === 'village' || z.kind === 'town');
  for (const z of L.zones) if (z.kind === 'camp') {
    const near = villages.map(v => [v, Math.abs(v.x - z.x) + Math.abs(v.y - z.y)]).filter(([, d]) => d <= 14).sort((a, b) => a[1] - b[1]).slice(0, 4).map(([v]) => [v.x, v.y]);
    S.camps[key(z)] = { zone: [z.x, z.y], region: z.region, near, raids: 0, notoriety: 0, razed: false };
  }
}
const chiefOf = (L, c) => { const z = zoneAt(L, ...c.zone); return z.holder && alive(L, z.holder) ? z.holder : null; };

// ---- each week, while the crime lane is absent: camps raid villages and rob merchants on the roads ----
export function orderWeek(L, cal, r) {
  if (L.sys.crime) return;
  const S = ST(L); let cen = null;
  for (const k in S.camps) { const c = S.camps[k]; if (c.razed) continue;
    const chief = chiefOf(L, c); if (!chief || !c.near.length) continue;
    const R = S.reg[c.region];
    if (r.chance(.035 + R.hunger * .1 + (R.war ? .03 : 0))) { cen = cen || census(L);
      const vz = r.pick(c.near), heads = (cen.byZone[vz[0] + ',' + vz[1]] || []).filter(id => actor(L, id).household === id);
      if (!heads.length) continue;
      const victim = r.pick(heads), took = pay(L, victim, chief, r.int(20, 120)), killed = r.chance(.1) && kill(L, victim, 'raid', chief);
      raided(L, c, chief, { victim, took, killed, zone: vz });
    }
    if (S.geo[c.region].road > .08 && r.chance(.02)) { cen = cen || census(L);
      const ms = cen.byRegion[c.region].merchants.concat(...ST(L).adj[c.region].map(n => cen.byRegion[n].merchants)); if (!ms.length) continue;
      const victim = r.pick(ms); robbed(L, { victim, thief: chief, mon: pay(L, victim, chief, r.int(60, 400)), zone: actor(L, victim).home, camp: k });
    }
  }
}
function raided(L, c, chief, { victim, took, killed, zone }) {
  const S = ST(L); c.raids++; c.notoriety++; S.reg[c.region].danger = clamp(S.reg[c.region].danger + .03);
  announce(L, 'event.raid', { region: zoneAt(L, ...zone).region, zone, by: chief, victim, took, killed: !!killed, camp: c.zone },
    `Raiders from ${zoneName(L, c.zone)} hit ${zoneName(L, zone)}: ${took ? `${took} mon taken` : 'nothing worth taking'}${killed ? `, ${who(L, victim)} cut down at his door` : ''}.`, ['smoke']);
  if (killed) grudge(L, victim, chief, 'raid');
  if (c.notoriety >= 4 && dedupe(L, 'raiders:' + c.zone, 112)) {
    const g = L.regions[c.region];
    post(L, 'raiders', { key: 'raidq:' + c.zone, region: c.region, zone: c.zone, giver: g.lord, target: chief, tculture: actor(L, chief).culture, days: 28 + (c.notoriety * 3), reward: 60 * c.notoriety,
      stake: { camp: c.zone.join(','), renown: 2 }, title: `The ${zoneName(L, c.zone)} preys on the road`,
      text: `${who(L, chief)}'s band has raided ${c.raids} times from ${zoneName(L, c.zone)}. The magistrate pays for the camp broken; the villages would settle for the raids stopping.`, board: 'magistrate' });
  }
}
export function robbed(L, { victim, thief, mon, zone, camp = null, item = null }) {
  const v = actor(L, victim); if (!v) return;
  const region = zoneAt(L, ...(zone || v.home)).region;
  announce(L, 'event.robbery', { region, zone, victim, by: thief, mon, item }, `${who(L, victim)} was robbed on the road near ${regName(L, region)}: ${item || `${mon} mon`} gone.`, ['board']);
  if (camp && ST(L).camps[camp]) ST(L).camps[camp].notoriety++;
  if ((mon >= 150 || item) && alive(L, thief))
    post(L, 'robbed', { key: 'rob:' + victim + ':' + (item || ''), region, zone: v.home || zone, giver: victim, target: thief, tculture: actor(L, thief).culture, days: 21, reward: Math.round((mon || 300) * .3),
      stake: { mon, item }, title: `${who(L, victim)} was robbed`, text: `${who(L, victim)} lost ${item || `${mon} mon`} to ${who(L, thief)}'s men on the road. He will give a third of it to whoever brings it back.`, board: 'person' });
}
export function grudge(L, victim, killer, why) {
  const S = ST(L), v = actor(L, victim); if (!v || !actor(L, killer)) return;
  const kin = v.children.concat(v.spouse ? [v.spouse] : [], v.parents).filter(id => alive(L, id))[0]; if (!kin) return;
  S.grudges.push({ by: kin, against: killer, why, d: today(L) }); if (S.grudges.length > 200) S.grudges.shift();
}

// ---- each season: famous bounties, bandit armies, crackdowns on him ----
export function orderSeason(L, cal, r) {
  const S = ST(L);
  // the most notorious chief gets a famous bounty
  const worst = Object.values(S.camps).filter(c => !c.razed && c.notoriety >= 6).map(c => [c, chiefOf(L, c)]).filter(([, id]) => id && !S.bounties[id]).sort((a, b) => b[0].notoriety - a[0].notoriety)[0];
  if (worst) postBounty(L, worst[1], Math.min(1500, 100 * worst[0].notoriety), worst[0].region, `${worst[0].notoriety} raids and robberies on the road`);
  refound(L, r);
  // a bandit army gathers where camps are many and notorious
  const byReg = {}; for (const c of Object.values(S.camps)) if (!c.razed && chiefOf(L, c)) (byReg[c.region] || (byReg[c.region] = [])).push(c);
  for (const [reg, cs] of Object.entries(byReg)) {
    const nt = cs.reduce((s, c) => s + c.notoriety, 0);
    if (cs.length < 2 || nt < 10 || Object.values(S.armies).some(a => a.region === +reg) || S.keys['army:' + reg] != null && today(L) - S.keys['army:' + reg] < 224 || !r.chance(.2)) continue;
    S.keys['army:' + reg] = today(L);
    const lead = cs.sort((a, b) => b.notoriety - a.notoriety)[0], chief = chiefOf(L, lead);
    const targets = [+reg, ...S.adj[+reg]].filter(g => L.cultures[L.regions[g].culture].kind !== 'bandits').flatMap(g => villagesOf(L, g));
    if (!targets.length) continue;
    const v = targets.sort((a, b) => (Math.abs(a.x - lead.zone[0]) + Math.abs(a.y - lead.zone[1])) - (Math.abs(b.x - lead.zone[0]) + Math.abs(b.y - lead.zone[1])))[0];
    const id = newId(L, 'army'); S.armies[id] = { region: +reg, chief, camps: cs.map(c => c.zone.join(',')), target: [v.x, v.y], strength: cs.length * 6 + Math.round(nt / 2) };
    announce(L, 'event.banditArmy', { army: id, region: +reg, chief, camps: S.armies[id].camps, target: [v.x, v.y], effects: { danger: .3 } },
      `A bandit army gathers under ${who(L, chief)}: ${cs.length} camps of ${regName(L, +reg)} have joined. Their fires can be seen from ${v.name}.`, ['smoke', 'messenger'], [+reg, v.region]);
    const head = (census(L).byZone[v.x + ',' + v.y] || []).find(id2 => actor(L, id2).household === id2);
    post(L, 'defend', { key: 'def:' + v.x + ',' + v.y, region: v.region, zone: [v.x, v.y], giver: head || L.regions[v.region].lord, other: chief, tculture: actor(L, chief).culture, days: 21 + r.int(0, 14), reward: 100 + r.int(0, 100),
      stake: { army: id, attacker: chief, by: 'bandits', renown: 3 }, title: `Defend ${v.name} from the bandit army`,
      text: `${who(L, chief)}'s army will fall on ${v.name} within the month. The villagers have sickles, a wall of brushwood, and a little rice to pay a sword.`, board: 'person' });
  }
  // a crackdown in a culture he has made an enemy of
  const p = actor(L, L.player);
  if (p) for (const [c, v] of Object.entries(p.standing)) if (v <= -.5 && dedupe(L, 'crack:' + c, 112))
    announce(L, 'event.crackdown', { culture: +c, target: L.player, effects: { danger: .3 } }, `${L.cultures[c].name} post the ronin's likeness at every gate: patrols doubled, inns told to send word.`, ['board', 'messenger'], L.cultures[c].regions);
}
// a burnt camp does not stay empty for ever: after a year a new band may take the ground (a broke ronin turns bandit)
function refound(L, r) {
  const S = ST(L), cen = census(L);
  for (const k in S.camps) { const c = S.camps[k], z = zoneAt(L, ...c.zone); if (!c.razed || L.hour - z.razed < 2688 || !r.chance(.15)) continue;
    const pool = [c.region, ...S.adj[c.region]].flatMap(g => cen.byRegion[g].outlaws.concat(cen.byRegion[g].all.filter(id => actor(L, id).cls === 'ronin'))).filter(id => alive(L, id) && !actor(L, id).chief && id !== L.player);
    if (!pool.length) continue; const chief = actor(L, r.pick(pool));
    chief.chief = true; chief.home = c.zone.slice(); z.holder = chief.id; delete z.razed; c.razed = false; c.notoriety = 0; c.raids = 0;
    S.reg[c.region].danger = clamp(S.reg[c.region].danger + .1);
    announce(L, 'event.campFounded', { region: c.region, zone: c.zone, by: chief.id }, `Smoke over the old camp at ${zoneName(L, c.zone)} again: ${who(L, chief.id)} has gathered a band there.`, ['smoke'], [c.region]); }
}
export function postBounty(L, target, reward, region, why) {
  const S = ST(L), t = actor(L, target); if (!t || S.bounties[target]) return;
  S.bounties[target] = { reward, since: today(L), region };
  const regions = [region, ...S.adj[region]];
  announce(L, 'event.bounty', { region, actor: target, reward, effects: {} }, `A famous bounty: ${reward} mon for ${who(L, target)}, dead or alive (${why}).`, ['board'], regions);
  post(L, 'bounty', { key: 'bounty:' + target, region, zone: t.home || L.regions[region].seat, giver: L.regions[region].lord, target, tculture: t.culture, days: 112, reward, stake: { renown: 3 },
    title: `Wanted: ${who(L, target)}, ${reward} mon`, text: `${who(L, target)} (${why}) is wanted by the lord of ${regName(L, region)}. The reward is paid at the magistrate's on proof.`, board: 'magistrate' });
}

// a camp broken: its chief and some of his men dead, its ground nobody's (claimable); nothing raids from there again
export function razeCamp(L, zkey, by, why) {
  const S = ST(L), c = S.camps[zkey]; if (!c || c.razed) return;
  const z = zoneAt(L, ...c.zone), chief = z.holder, men = (census(L).byZone[zkey] || []);
  if (chief) kill(L, chief, why || 'camp razed', by);
  for (const id of men.slice(0, 3)) kill(L, id, why || 'camp razed', by);
  z.holder = null; z.razed = L.hour; c.razed = true; S.reg[c.region].danger = clamp(S.reg[c.region].danger - .15);
  for (const a in S.armies) if (S.armies[a].camps.includes(zkey)) S.armies[a].strength = Math.max(0, S.armies[a].strength - 8);
  announce(L, 'event.campRazed', { region: c.region, zone: c.zone, by }, `The camp at ${zoneName(L, c.zone)} is burnt. Its ground belongs to nobody now.`, ['smoke'], [c.region]);
}
// a bandit army falls on its village: possession of the village's plots goes to the chief (never the title), or the army breaks
export function settleArmy(L, id, defended, r) {
  const S = ST(L), A = S.armies[id]; if (!A) return; delete S.armies[id];
  for (const k of A.camps) if (S.camps[k]) S.camps[k].notoriety = Math.floor(S.camps[k].notoriety / 2);
  const v = zoneAt(L, ...A.target), pre = A.target.join(',') + ':';
  if (!defended && alive(L, A.chief)) {
    const cen = census(L), people = cen.byZone[A.target.join(',')] || [];
    for (let k = r.int(1, 4); k > 0 && people.length; k--) kill(L, people.splice(r.int(0, people.length - 1), 1)[0], 'bandit army', A.chief);
    const plots = Object.keys(L.plots).filter(p => p.startsWith(pre)); for (const p of plots) seize(L, p, A.chief, 'bandit army');
    S.reg[v.region].danger = clamp(S.reg[v.region].danger + .2);
    announce(L, 'event.villageTaken', { region: v.region, zone: A.target, by: A.chief, plots }, `${v.name} has fallen to ${who(L, A.chief)}'s army. The families still hold their deeds; the bandits hold their fields.`, ['smoke', 'messenger'], [v.region, A.region]);
  } else {
    if (alive(L, A.chief)) kill(L, A.chief, 'bandit army broken');
    const k = A.camps.find(c => S.camps[c] && !S.camps[c].razed); if (k) razeCamp(L, k, null, 'bandit army broken');
    announce(L, 'event.armyBroken', { region: v.region, zone: A.target }, `The bandit army broke on the brushwood wall of ${v.name}.`, ['messenger'], [v.region, A.region]);
  }
}

// ---- the crime lane's events, when it is there ----
export function onCrime(e, L) {
  const S = ST(L);
  if (e.type === 'crime.raid' && e.camp) { const c = S.camps[[].concat(e.camp).join(',')]; if (c) raided(L, c, e.by || chiefOf(L, c), { victim: e.victim, took: e.mon || 0, killed: !!e.killed, zone: e.zone || c.zone }); }
  else if (e.type === 'crime.robbery' && e.victim && (e.by || e.thief)) robbed(L, { victim: e.victim, thief: e.by || e.thief, mon: e.mon ?? e.amount ?? 0, zone: e.zone, item: e.item || null });
  else if (e.type === 'crime.murder' && e.victim && e.by) grudge(L, e.victim, e.by, 'murder');
  else if (e.type === 'crime.bounty' && e.actor && e.actor !== L.player && (e.mon ?? e.amount ?? 0) >= 300) { const a = actor(L, e.actor); if (a && a.home) postBounty(L, e.actor, e.mon ?? e.amount, zoneAt(L, ...a.home).region, e.why || 'wanted by the law'); }
}
