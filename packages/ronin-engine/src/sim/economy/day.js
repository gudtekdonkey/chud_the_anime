import { emit } from '../ledger.js';
import { TIME, HOURS_PER_YEAR } from '../time.js';
import { GOODS, GOOD, NEED, JOBS, SPEND, GUILD_CUT, GUILD_SPEND, RICE_CREDIT, MERCH_SHARE, GUILD_FLOAT, TEMPLE_SHARE, TEMPLE_SINK, ALMS, MINT,
  PRICE_MIN, PRICE_MAX, PRICE_EASE, WAR_RICE, WAR_ARMS, KEEP_DAYS, RICE_HOLD, HARVEST, HOARD, HOARD_OVER, CHANGE_UP, FAMINE_DAYS, FAMINE_END_DAYS, ADULT, SETTLE, CHILD } from './tune.js';
import { G, GI, JOB_LIST, JI, index, minStock } from './setup.js';
import { worth, pay, changeUp } from './money.js';

// ---- One day of the economy, for every region at once: producers sell to the guild, lords pay stipends and sell their rice,
// households earn by job and spend by class (food, then need, then taste), and each market's prices answer its stock.
// Regions settle in turn, one in SETTLE each day, SETTLE days at a time (every rate below is per day, times DT): the same flows at a
// quarter of the cost, and still lived through by day, so a long absence gives exactly what staying would have ----
const YEAR_DAYS = TIME.DAYS_PER_SEASON * 4, HARVEST_DAY = HARVEST.season * TIME.DAYS_PER_SEASON;
export const daysToHarvest = cal => ((HARVEST_DAY - cal.day % YEAR_DAYS + YEAR_DAYS - 1) % YEAR_DAYS) + 1;
const RICE = GI.rice, NJ = JOB_LIST.length, FIGHTERS = ['ashigaru', 'guard', 'retainer', 'ronin', 'bounty hunter', 'shinobi'];
const NEEDS = Object.entries(NEED).filter(([g]) => g !== 'rice').map(([g, q]) => [GI[g], q]);
const SERVICE = ['innkeeper', 'carpenter', 'courier', 'healer'];
// payers: where a job's wage comes from
const P_GUILD = 0, P_LORD = 1, P_SERVICE = 2, P_TEMPLE = 3, P_MERCH = 4;
const MINS = GOODS.map((g, i) => minStock(i)), DAYS = GOODS.map(g => GOOD[g].days);
const p0 = (R, g) => R.price[g];   // the step's price (prices move only at close, after this)
export const target = (R, g) => Math.max(MINS[g], R.dem[g] * DAYS[g]);

const DT = SETTLE, per = x => 1 - Math.pow(1 - x, DT);   // a daily share compounded over a step
const LOW = 2000, RICE_DAY = NEED.rice, PER_SPEND = per(SPEND), PER_HOARD = per(HOARD / TIME.DAYS_PER_SEASON), SELL_STEP = Math.min(1, DT / 14);
const PER = { guild: per(GUILD_SPEND), temple: per(TEMPLE_SHARE), sink: per(TEMPLE_SINK), merch: per(MERCH_SHARE), ease: per(PRICE_EASE), made: per(.1), dem: per(.03) };
const KEEP = GOODS.map(g => Math.pow(1 - GOOD[g].rot, DT)), GDEF = GOODS.map(g => GOOD[g]);
export function economyDay(L, cal) {
  const E = L.sys.economy, ix = index(L), toH = daysToHarvest(cal), turn = cal.day % SETTLE;
  const lo = L.hour - ADULT[1] * HOURS_PER_YEAR, hi = L.hour - ADULT[0] * HOURS_PER_YEAR;
  for (let r = turn; r < E.regions.length; r += SETTLE) {
    const R = E.regions[r], S = prep(L, E, R, ix, toH);
    for (const h of ix.byRegion[r]) household(E, h, R, S, lo, hi, toH);
    close(L, E, R, S, ix);
  }
}

// jobs as indices, pre-split by what they do (JOBS is data; this is only its shape for a fast loop). The loops below index their
// arrays instead of for…of with destructuring: prep and close run a few times a day, too rarely to be optimised, and unoptimised
// iterators allocate enough to cost a tenth of a millisecond a day in garbage collection
const MAKERS = JOB_LIST.map((j, i) => [i, JOBS[j]]).filter(([, d]) => d.make)
  .map(([i, d]) => ({ j: i, make: Object.entries(d.make).map(([g, q]) => [GI[g], q, g]), use: d.use ? Object.entries(d.use).map(([g, q]) => [GI[g], q]) : null }));
const OTHERS = JOB_LIST.map((j, i) => [i, JOBS[j]]).filter(([, d]) => !d.make && d.kind !== 'none');
const J_ = name => JI[name], SVC = SERVICE.map(J_), FIGHT = FIGHTERS.map(J_), MONKS = [J_('monk'), J_('abbot')], MERCH = J_('merchant'), MINER = J_('miner');
const sum = (J, list) => { let t = 0; for (let i = 0; i < list.length; i++) t += J[list[i]]; return t; };

// a region's rates for today, from yesterday's prices: what each job earns and who pays it
function prep(L, E, R, ix, toH) {
  const J = ix.jobs[R.id], p = R.price, S = ix.scratch[R.id];
  S.rate.fill(0); S.payer.fill(0); S.inputs.fill(0); S.cap.fill(0); S.capOf.fill(0); S.paid.fill(0); S.want.fill(0); S.buy.fill(0); S.made.fill(0); S.rev = 0; S.svcIn = 0; S.offer = 0; S.hungry = 0; S.almsPaid = 0; S.alms = Math.max(0, R.temple) * ALMS;
  const reg = L.regions[R.id], lord = reg.lord != null && L.actors[reg.lord] && L.actors[reg.lord].alive ? L.actors[reg.lord] : null; S.lord = lord;
  // producers: what they make goes into the market's stock (not past its cap: the rest spoils where it was made), and they are paid
  // from what their goods sold for over the last step (R.owe, held by the guild for them), shared by what each job made this step
  for (let k = 0; k < MAKERS.length; k++) { const m = MAKERS[k], n = J[m.j]; if (!n) continue;
    let q0 = -1;
    for (let e = 0, gi, q1, g; e < m.make.length && ((gi = m.make[e][0]), (q1 = m.make[e][1]), (g = m.make[e][2]), true); e++) { const x = q1 * (R.land[g] ?? 1); if (x > 0) { S.cap[k * G + gi] = x * n; S.capOf[gi] += x * n; } if (x > 0 && R.stock[gi] <= GOOD[g].cap * target(R, gi) && q0 < 0) q0 = x; }
    if (q0 < 0) continue;
    // inputs (a smith's iron, a brewer's rice) are bought from the market; short of them, he makes less of his first good
    let avail = 1;
    if (m.use) for (let e = 0, ui, u; e < m.use.length && ((ui = m.use[e][0]), (u = m.use[e][1]), true); e++) { const need = u * q0 * n * DT; if (need > 0) avail = Math.min(avail, R.stock[ui] / need); }
    let first = true;
    for (let e = 0, gi, q1, g; e < m.make.length && ((gi = m.make[e][0]), (q1 = m.make[e][1]), (g = m.make[e][2]), true); e++) { let x = q1 * (R.land[g] ?? 1); if (x <= 0 || R.stock[gi] > GOOD[g].cap * target(R, gi)) continue;
      if (first) { x *= avail; first = false; } S.made[gi] += x * n * DT; }
    if (m.use) for (let e = 0, ui, u; e < m.use.length && ((ui = m.use[e][0]), (u = m.use[e][1]), true); e++) S.inputs[k * G + ui] = u * q0 * n * DT * avail; }
  let owed = 0;
  for (let k = 0; k < MAKERS.length; k++) { const m = MAKERS[k], n = J[m.j]; if (!n) continue;
    // his share of what sold: by what his trade can make here, so a glutted market still pays for what it sold of his earlier work
    let v = 0; for (let g = 0; g < G; g++) if (S.cap[k * G + g] > 0) v += R.owe[g] * S.cap[k * G + g] / S.capOf[g];
    let cost = 0; if (m.use) for (let e = 0, ui; e < m.use.length && ((ui = m.use[e][0]), true); e++) { const used = S.inputs[k * G + ui]; S.inputs[k * G + ui] = 0; if (used > 0) { cost += used * p[ui]; S.buy[ui] += used; } }
    const inp = Math.min(cost, v);            // the inputs come out of his takings (what they cannot cover, the guild loses)
    S.rate[m.j] = (v - inp) / n / DT; S.payer[m.j] = P_GUILD; owed += v - inp; }
  const budget = Math.max(0, R.guild);
  if (owed > budget) { const s = budget / owed; for (let k = 0, m; k < MAKERS.length && ((m = MAKERS[k]), true); k++) S.rate[m.j] *= s; owed = budget; }
  let left = budget - owed;   // what the guild can spend on more than its producers this step
  // hired swords and robbers take at most half of what the guild has left to spend this step; rice buying gets half the rest
  let hired = 0; for (let o = 0, j, d; o < OTHERS.length && ((j = OTHERS[o][0]), (d = OTHERS[o][1]), true); o++) if (d.kind === 'hire' || d.kind === 'rob' || (d.kind === 'stipend' && !lord)) hired += (d.wage || d.take) * J[j] * DT;
  const cash = hired > 0 ? Math.min(1, left * .5 / hired) : 1; left -= Math.min(hired, left * .5);
  // rice, the staple, the guild may buy on credit (rice bills) down to RICE_CREDIT mon a head in debt: sold, it pays the debt back
  S.riceRoom = R.stock[RICE] < RICE_HOLD * target(R, RICE);
  S.riceBudget = Math.max(0, left + RICE_CREDIT * R.pop) * PER.guild;
  // the lord: mints coin from his mines and sells his granary through the year, before he pays his men
  const miners = J[MINER];
  if (miners) { const m = miners * MINT * (R.land.iron ?? 1) * DT; E.flow.mint += m; if (lord) lord.money.mon += m; else R.guild += m; }
  const Lr = lord && E.lords[lord.id];
  if (Lr && Lr.granary > 0 && S.riceRoom && S.riceBudget > 0) {
    const q = Math.min(Lr.granary * Math.min(1, DT / Math.max(14, toH)), S.riceBudget / (p[RICE] * (1 - GUILD_CUT))), v = q * p[RICE] * (1 - GUILD_CUT);
    Lr.granary -= q; S.made[RICE] += q; lord.money.mon += v; S.paid[P_GUILD] += v; S.riceBudget -= v; }
  // stipends from the region lord, set aside from his purse now so he cannot spend them first (the guild pays where there is no lord)
  let stip = 0; for (let o = 0, j, d; o < OTHERS.length && ((j = OTHERS[o][0]), (d = OTHERS[o][1]), true); o++) if (d.kind === 'stipend') stip += d.wage * J[j];
  const sStip = stip > 0 && lord ? Math.min(1, worth(lord.money) / (stip * DT)) : 1;
  if (lord && sStip < 1 && !R.unpaid && L.hour - (R.unpaidAt || -1e9) > 24 * 28) { R.unpaid = true; R.unpaidAt = L.hour; emit(L, 'econ.unpaid', { region: R.id, lord: lord.id, zone: reg.seat, share: +sStip.toFixed(2) }); }
  if (sStip >= 1) R.unpaid = false;
  S.escrow = lord ? pay(lord.money, Math.min(worth(lord.money), stip * sStip * DT * 1.1)) : 0;
  // every other job's rate: stipends, hired swords and robbers, and the service, temple and merchant pools shared out
  const svc = sum(J, SVC), monks = sum(J, MONKS), merch = J[MERCH];
  for (let o = 0, j, d; o < OTHERS.length && ((j = OTHERS[o][0]), (d = OTHERS[o][1]), true); o++) { if (!J[j]) continue;
    if (d.kind === 'stipend') { S.rate[j] = d.wage * (lord ? sStip : cash); S.payer[j] = lord ? P_LORD : P_GUILD; }
    else if (d.kind === 'hire' || d.kind === 'rob') { S.rate[j] = (d.wage || d.take) * cash; S.payer[j] = P_GUILD; }
    else if (d.kind === 'service') { S.rate[j] = svc ? Math.max(0, R.pool.service) / svc / DT : 0; S.payer[j] = P_SERVICE; }
    else if (d.kind === 'temple') { S.rate[j] = monks ? R.temple * PER.temple / monks / DT : 0; S.payer[j] = P_TEMPLE; }
    else if (d.kind === 'guild') { S.rate[j] = merch ? Math.max(0, R.pool.guild) / merch / DT : 0; S.payer[j] = P_MERCH; } }
  // at war, the lord arms and feeds his men
  if (R.war > L.hour && lord) { const men = sum(J, FIGHT);
    for (const [g, q] of [[RICE, R.pop * NEED.rice * (WAR_RICE - 1) * DT], [GI.weapons, men * WAR_ARMS.weapons * DT], [GI.horses, men * WAR_ARMS.horses * DT]]) {
      S.want[g] += q; const c = pay(lord.money, q * R.fill[g] * p[g]); S.buy[g] += c / p[g]; S.rev += c; } }
  return S;
}

// one household's step (DT days): wages in to the head's purse, food from the pantry or the market, need, then what its class
// likes; a farm sells the rice it will not need before the next harvest. h.mm/h.bb/h.jj: the members' purses, births and jobs (setup.js)
function household(E, h, R, S, lo, hi, toH) {
  const A = h.m, M = h.mm, B = h.bb, JJ = h.jj, rate = S.rate, paid = S.paid, payer = S.payer;
  let n = 0, W = 0, head = null, income = 0;
  for (let k = 0; k < A.length; k++) { if (!A[k].alive) continue; const m = M[k]; if (head === null) head = m; const b = B[k]; n += b > hi ? CHILD : 1;
    const j = JJ[k]; if (j >= 0) { if (b <= hi && b > lo) { const inc = rate[j]; if (inc > 0) { income += inc; paid[payer[j]] += inc * DT; } } }
  }
  if (n === 0) return;
  // the household spends from the head's purse; the others' savings count only when his runs low (and are then drawn on)
  income *= DT; head.mon += income; W = head.mon + head.silver * 16 + head.ryo * 1000;
  if (W < LOW) for (let k = 0; k < A.length; k++) { const m = M[k]; if (m !== head && A[k].alive) W += m.mon + m.silver * 16 + m.ryo * 1000; }
  const p = R.price, f = R.fill, want = S.want, bought = S.buy, key = h.key;
  let spend = 0, rice = n * RICE_DAY * DT, pan = E.pantry[key] || 0;
  if (pan > 0) { const t = pan < rice ? pan : rice; pan -= t; rice -= t; }
  // need: rice, then fish, salt, cloth, timber, iron, as far as the market has them and the purse reaches
  if (rice > 0) { want[RICE] += rice; let got = rice * f[RICE], c = got * p[RICE]; if (c > W) { c = W; got = c / p[RICE]; } spend += c; bought[RICE] += got;
    // outlaws who cannot pay take it: rice gone from the market, no coin paid (the region's losses show in R.stolen)
    if (got < rice * .8 && h.outlaw) { const take = rice * f[RICE] - got; bought[RICE] += take; R.stolen = (R.stolen || 0) + take; got += take; }
    // short: the temple's alms, while its offerings last
    if (got < rice * .8 && S.alms > 0) { const q = Math.min(rice * f[RICE] - got, S.alms / p[RICE]); S.alms -= q * p[RICE]; S.almsPaid += q * p[RICE]; bought[RICE] += q; got += q; }
    if (got < rice * .8) S.hungry += n; }
  for (let k = 0; k < NEEDS.length; k++) { const g = NEEDS[k][0], q = n * NEEDS[k][1] * DT; want[g] += q; let got = q * f[g], c = got * p[g];
    if (c > W - spend) { c = W - spend; got = c / p[g]; } spend += c; bought[g] += got; }
  // taste: a share of wealth above the household's reserve
  const D = PER_SPEND * (W - spend - h.reserve * (1 + .25 * (n - 1)));   // n: mouths (a child is half)
  if (D > 0) { const T = h.taste; for (let k = 0; k < T.length; k += 2) { const g = T[k], v = D * T[k + 1];
    if (g === -1) { S.svcIn += v; spend += v; } else if (g === -2) { S.offer += v; spend += v; } else { const q = v / p[g]; want[g] += q; bought[g] += q * f[g]; spend += v * f[g]; } } }
  if (spend > 0) { let left = spend - pay(head, spend); for (let k = 0; k < A.length && left > 1e-9; k++) if (A[k].alive && M[k] !== head) left -= pay(M[k], left); S.rev += spend - left; }
  // a farm sells the rice it will not need before the next harvest
  if (h.farm && S.riceBudget > 0) { const extra = pan - n * RICE_DAY * toH * KEEP_DAYS;
    if (extra > .01 && S.riceRoom) { const q = Math.min(extra * SELL_STEP, S.riceBudget / (p[RICE] * (1 - GUILD_CUT))), v = q * p[RICE] * (1 - GUILD_CUT);
      pan -= q; S.made[RICE] += q; head.mon += v; paid[P_GUILD] += v; S.riceBudget -= v; } }
  if (pan !== 0 || E.pantry[key] !== undefined) E.pantry[key] = pan;
  // buried and lost coin: a household past HOARD_OVER × its reserve loses a little of the excess (a money sink the quests can dig up)
  const over = W - spend - HOARD_OVER * h.reserve * (1 + .25 * (n - 1));
  if (over > 0) { const lost = pay(head, over * PER_HOARD); R.buried += lost; E.flow.buried += lost; }
  if (head.mon > CHANGE_UP) changeUp(head);
  else head.mon = Math.round(head.mon * 100) / 100;
}

// the region's books for the day: the guild takes the takings and pays the pools; prices move toward what the stock says
function close(L, E, R, S, ix) {
  const J = ix.jobs[R.id], svcWorkers = sum(J, SVC);
  R.guild += S.rev - S.svcIn - S.offer - S.paid[P_GUILD];
  if (svcWorkers) R.pool.service += S.svcIn - S.paid[P_SERVICE]; else { R.guild += S.svcIn; R.pool.service -= S.paid[P_SERVICE]; }
  // offerings where no monk lives keep the shrine through its keepers (the service pool)
  if (sum(J, MONKS)) R.temple += S.offer - S.paid[P_TEMPLE]; else { R.pool.service += S.offer; R.temple -= S.paid[P_TEMPLE]; }
  R.temple -= S.almsPaid; R.guild += S.almsPaid; R.alms = (R.alms || 0) + S.almsPaid;   // alms: the temple bought rice for the hungry
  R.pool.guild -= S.paid[P_MERCH];
  // stipends: the lord pays; what he cannot (he spent it today) the guild fronts, so no coin is made from nothing
  // stipends came out of the lord's escrow: the rest goes back to him; anything past it the guild fronts, so no coin is made from nothing
  if (S.lord) { const back = S.escrow - S.paid[P_LORD]; if (back >= 0) S.lord.money.mon += back; else R.guild += back + pay(S.lord.money, -back); } else R.guild -= S.paid[P_LORD];
  const sink = R.temple * PER.sink; R.temple -= sink; E.flow.temple += sink;
  // what this step's goods sold for, less the guild's cut and what came in by caravan (already paid for), plus what our goods fetched
  // abroad (R.exp), is owed to their makers next step
  let owes = 0;
  for (let g = 0; g < G; g++) { if (g === RICE || !S.capOf[g]) { R.owe[g] = 0; R.imp[g] = 0; R.exp[g] = 0; continue; }
    const local = S.made[g] + R.imp[g] > 0 ? S.made[g] / (S.made[g] + R.imp[g]) : 1;
    R.owe[g] = S.buy[g] * p0(R, g) * (1 - GUILD_CUT) * local + R.exp[g]; R.imp[g] = 0; R.exp[g] = 0; owes += R.owe[g]; }
  // the merchants take a share of what the guild holds past what it owes and a working float
  const extra = R.guild - owes - GUILD_FLOAT * R.pop;
  if (extra > 0 && J[MERCH] > 0) { const m = extra * PER.merch; R.guild -= m; R.pool.guild += m; }
  // goods: made in, sold out, a little spoils; demand remembered; tomorrow's fill and price
  for (let g = 0; g < G; g++) {
    const def = GDEF[g], st = Math.max(0, R.stock[g] + S.made[g] - S.buy[g]) * KEEP[g]; R.stock[g] = st;
    R.made[g] += (S.made[g] / DT - R.made[g]) * PER.made; R.sold[g] += (S.buy[g] / DT - R.sold[g]) * PER.made; R.dem[g] += (S.want[g] / DT - R.dem[g]) * PER.dem;
    R.fill[g] = S.want[g] > 0 ? Math.min(1, (st + S.made[g]) / S.want[g]) : 1;
    const t = target(R, g), x = Math.pow(t / Math.max(st, t * .01), def.eps), want = def.base * (x < PRICE_MIN ? PRICE_MIN : x > PRICE_MAX ? PRICE_MAX : x);
    R.price[g] += (want - R.price[g]) * PER.ease;
  }
  R.hungry = S.hungry;
  const days = R.stock[RICE] / Math.max(1e-6, R.dem[RICE]);
  if (!R.famine && days < FAMINE_DAYS && R.dem[RICE] > .05) { R.famine = true; emit(L, 'econ.famine', { region: R.id, zone: L.regions[R.id].seat, price: Math.round(R.price[RICE]) }); }
  else if (R.famine && days > FAMINE_END_DAYS) { R.famine = false; emit(L, 'econ.famine.end', { region: R.id, zone: L.regions[R.id].seat }); }
}
