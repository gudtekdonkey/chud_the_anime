// ---- The party in the slice: today's roster (src/party/kit.js ROSTER, `party.members`: Kuro, Suzume, Tetsu) given
// bodies in the courtyard (ally.js). This module owns their PRESENCE: spawning, their cuts landing, the samurai's cuts
// landing on them, going down / lifted / dead (buried: their gear back in the bag), EXP and levels (kit.js gainExp: they
// pick their own stats). Their DECISIONS default to today's (fight beside you by role, else follow in ranks of six);
// the squad AI (claude/3d-squad-ai) drives them through PARTY (docs/iso-slice.md, "The party's interface").
import { Ally } from './ally.js';
import { ROSTER, party as KIT, byId, gainExp, bury, stat } from '../../party/kit.js';
import { CTX, nearestFoe } from '../ctx.js';
import { W } from 'ronin-engine/clock/world.js';
import { hOf, wrapA, hv, AF } from 'ronin-engine/flow/flow.js';
import { sparks, focus } from 'ronin-engine/render/fx.js';
import { qiAdd, QI_HIT, showBanner, HURT_HOOKS } from '../items/inv.js';
import { say, numAt } from '../hud/world-ui.js';

const TONES = { kuro: '#2b3443', suzume: '#323a26', tetsu: '#4d2c1d' }, MORE = ['#3d2a35', '#2a3a3a', '#3a3426', '#33303f'];
const HEAVY = new Set(['nodachi', 'kanabo', 'tetsubo']);
export const EXP_KILL = 60, EXP_NEAR = 30, NEAR = 160, FIGHT = 140;   // EXP for the kill, for being in the fight; how near counts; how near him a samurai starts a fight

export const PARTY = {
  allies: [],
  standing() { return this.allies.filter(a => a.standing); },
  downed() { return this.allies.filter(a => a.downed); },
  byId(id) { return this.allies.find(a => a.c.id === id); },
  // hooks: fn(ally, ...) — the squad AI and the HUD listen here
  on: { down: [], lift: [], die: [], level: [], hit: [], kill: [] },
  // the decision a companion with no brain and no order makes (today's): a samurai near him → fight it, else follow
  // (a fight: he has his blade out, the samurai was cut lately, or he is swinging)
  defaultBrain(al) { const hero = CTX.hero, f = nearestFoe(hero.x, hero.z, FIGHT);
    const on = f && (hero.armed || f.state === 'fcut' || W.t - (f.a.hitAt ?? -9) < 3);
    return on ? { kind: 'attack', target: f } : { kind: 'follow' }; },
  // whom a samurai goes for: whoever standing is nearest him (him or a companion)
  targetFor(foe) { let best = CTX.hero, d0 = Math.hypot(CTX.hero.x - foe.x, CTX.hero.z - foe.z);
    for (const al of this.standing()) { const d = Math.hypot(al.x - foe.x, al.z - foe.z); if (d < d0 - 6) { d0 = d; best = al; } } return best; },
  add(c, x, z) { const al = new Ally(c, { x, z, look: CTX.lookKind, tone: TONES[c.id] || MORE[this.allies.length % MORE.length] });
    al.slot = this.allies.length; this.allies.push(al); CTX.chars.push(al); al.look.mount(CTX.scene); return al; },
  remove(al) { const i = this.allies.indexOf(al); if (i >= 0) this.allies.splice(i, 1); const j = CTX.chars.indexOf(al); if (j >= 0) CTX.chars.splice(j, 1);
    const k = W.actors.indexOf(al.a); if (k >= 0) W.actors.splice(k, 1); al.look.dispose(); this.allies.forEach((a, n) => { a.slot = n; }); },
};
const fire = (k, ...a) => { for (const fn of PARTY.on[k]) fn(...a); };

// spawn today's party behind him
export function initParty() {
  const hero = CTX.hero;
  KIT.members.map(byId).filter(Boolean).forEach((c, i) => PARTY.add(c, hero.x - 14 + i * 12, hero.z - 18 - (i % 2) * 6));
  // a companion's cut lands on the samurai in front of them; anything else is the hero's (rules.js)
  const prevHit = W.on.hit; W.on.hit = (a, w) => a.char && a.char.ally ? allyHit(a.char) : prevHit && prevHit(a, w);
  // the samurai's falling cut lands on any companion where it falls (rules.js lands it on him)
  const prevStrike = W.on.strike; W.on.strike = (a, w) => { prevStrike && prevStrike(a, w); const v = hv(a.h), px = a.x + v[0] * 16, pz = a.z + v[1] * 16;
    for (const al of PARTY.allies) if (!al.dead && Math.hypot(al.a.x - px, al.a.z - pz) < 16) hurtAlly(al, .3, hOf(a.x - al.a.x, a.z - al.a.z)); };
  // Iron Oath (today's companion-only charm): once per area its wearer steps in and takes a blow meant for him
  HURT_HOOKS.push(n => { const al = PARTY.standing().find(a => a.c.kit.charms.includes('oath') && !a.oathUsed && Math.hypot(a.x - hero.x, a.z - hero.z) < 40);
    if (!al) return false; al.oathUsed = true; say(al, 'IRON OATH'); hurtAlly(al, n * 1.4, hOf(hero.x - al.x, hero.z - al.z)); return true; });
}

function allyHit(al) {
  const a = al.a, f = nearestFoe(al.x, al.z, al.reach + 2); if (!f) return;
  const hd = hOf(f.x - al.x, f.z - al.z); if (Math.abs(wrapA(hd - a.h)) > 1.35) return;
  const heavy = HEAVY.has(al.c.kit.weapon) || Math.random() < .08 * stat(al.c, 'edge'), dmg = heavy ? 2 : 1;
  f.lastBy = al; const r = f.react(heavy ? 2 : 1, hd, dmg); if (!r) return;
  al.hits++; fire('hit', al, f);
  if (Math.random() < .3 || r === 'kill') W.hitstop(r === 'kill' ? 5 / 60 : .03);   // today's: a companion's hit pauses 30% of the time
  const fx = f.a.x - Math.sin(hd) * 4, fz = f.a.z - Math.cos(hd) * 4; sparks(W, fx, 22, fz, 4 + dmg * 2, { dir: hd, spd: 110 }); f.a.hitAt = W.t;
  if (r === 'kill') focus(W, fx, 22, fz);
  numAt(f, dmg * 10, r === 'kill' ? 'big' : 'deal'); qiAdd(QI_HIT * .5);
}
// a hit on a companion: the red number, down at nothing, dead if struck while down
export function hurtAlly(al, n, from) {
  const was = al.hp, r = al.hurt(n, from); if (r !== 'dead') numAt(al, Math.max(1, (was - al.hp) * 100), 'take');
  sparks(W, al.a.x, 22, al.a.z, 6, { dir: from ?? 0 });
  if (r === 'down') { say(al, 'DOWN'); fire('down', al); }
  if (r === 'dead') { showBanner('FALLEN', al.c.name); fire('die', al); }
  return r;
}
// a samurai fell: EXP to the killer and to everyone standing in the fight (today's: kills and fights nearby)
export function partyKill(f) {
  const killer = f.lastBy && f.lastBy.ally ? f.lastBy : null; f.lastBy = null;
  for (const al of PARTY.standing()) { if (al !== killer && Math.hypot(al.x - f.x, al.z - f.z) > NEAR) continue;
    const n = al === killer ? EXP_KILL : EXP_NEAR, ups = gainExp(al.c, n);
    if (ups) { say(al, 'LV ' + al.c.lv + ' +' + al.c.chose.slice(0, 3).toUpperCase()); fire('level', al); } }
  fire('kill', f, killer);
}
export function liftAlly(al) { al.lift(); say(al, 'BACK UP'); fire('lift', al); }
// one game step: the bodies do what they are told; the bleed-out clock; the dead dissolve and are buried
export function tickParty(dt) {
  for (const al of [...PARTY.allies]) {
    if (al.dead) { const since = W.t - al.diedAt; if (since > 2.4) al.a.alpha = Math.max(0, 1 - (since - 2.4) / .6);
      if (since > 3.1) { const c = ROSTER.includes(al.c) ? al.c : null; if (c) bury(c); PARTY.remove(al); } continue; }
    if (al.downT > 0) { al.downT -= dt; if (al.downT <= 0) { al.downT = 0; al.die(); showBanner('FALLEN', al.c.name); fire('die', al); continue; } }
    if (!CTX.held.has(al)) al.control(dt, a => PARTY.defaultBrain(a));
  }
  // nobody stands inside anybody: companions step out of each other and out of him
  const bodies = [CTX.hero, ...PARTY.allies.filter(a => !a.dead)];
  for (const al of PARTY.allies) { if (al.dead || CTX.held.has(al)) continue;
    for (const o of bodies) { if (o === al) continue; const dx = al.x - o.x, dz = al.z - o.z, d = Math.hypot(dx, dz);
      if (d > 1e-3 && d < 13) { const k = (13 - d) / d * .2; al.a.x += dx * k / AF; al.a.z += dz * k / AF; } } }
}
