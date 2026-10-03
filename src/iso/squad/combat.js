// ---- What the squad battle's swings do (play/rules.js's rules, for many fighters; docs/squad-ai.md): the hero's cuts land
// on a samurai in front of him and in reach (J3 sweeps two), with the owner's hit-stop weights, the flash, sparks and
// the clashes, exactly as on the single samurai; a companion's or a samurai's cut lands on his target (or whoever is in
// the arc); the samurai's fcut on the hero is the slice's strike (rolled through, or a recoil); arrows fly as
// projectiles and hit the first body on their line. Only the hero's own blows (dealt or taken) pause the world: a
// companion's hit flashes and sparks without stopping the fight.
import { W as FW, STOP } from 'ronin-engine/clock/world.js';
import { STATS } from '../play/rules.js';
import { CUT } from '../play/hero.js';
import { hOf, hv, wrapA, AF } from 'ronin-engine/flow/flow.js';
import { sparks, dust, crack, tear, focus, ring } from 'ronin-engine/render/fx.js';
import { shake } from 'ronin-engine/render/gfx/view.js';
import { SOLID } from '../world/room.js';
import { addThreat } from 'ronin-engine/ai/senses.js';

const DMG = { J1: 1, J2: 1, J3: 2, lunge: 1 };
export const ARROWS = [];
const R = v => v / AF;   // world units → rig px (the fx's units)

export function squadRules(G) {
  const { hero, H, A } = G;
  const opp = c => G.all().filter(o => o.team !== c.team && o.alive && !o.downed);
  const inArc = (c, h, reach, arc) => o => { const d = Math.hypot(o.x - c.x, o.z - c.z); return d < reach && Math.abs(wrapA(hOf(o.x - c.x, o.z - c.z) - h)) < arc; };
  const noise = (x, z, team, kind = 'hit', r = 110) => A.noises.push({ x, z, r, team, kind, at: A.t });
  const FX = { parry(t, src) { const h = src ? hOf(t.x - src.x, t.z - src.z) : 0; sparks(FW, R(t.x - Math.sin(h) * 3), 24, R(t.z - Math.cos(h) * 3), 9, { dir: h + Math.PI, spd: 140 }); ring(FW, R(t.x), R(t.z), { r: 10, life: .2 });
    if (src === H || t === H) FW.hitstop(STOP.light); } };
  G.FX = FX;
  // the hero hurt: his iframes dodge it; else the slice's recoil, a light hit-stop
  function hurtHero(src, dmg, heavy) {
    if (hero.iframes) { STATS.log.push('foe:dodged'); A.log(`dodged:${src.name}`); return false; }
    hero.taken++; H.hp = Math.max(1, H.hp - dmg); STATS.log.push('foe:hit'); A.log(`hurt:hero<${src.name}`);
    hero.a.flash = .034; hero.a.h = hero.a.ht = hOf(src.x - hero.x, src.z - hero.z); hero.a.play(heavy ? 'knock' : 'recoil', { rs: heavy ? .7 : .55 });
    FW.hitstop(heavy ? STOP.heavy : STOP.light); sparks(FW, hero.a.x, 22, hero.a.z, 8, { dir: src.a.h }); focus(FW, hero.a.x, 22, hero.a.z); hero.a.hitAt = FW.t; return true;
  }
  // a blow from c on t: weight w, damage; returns what happened
  function land(c, t, w, dmg) {
    const hd = hOf(t.x - c.x, t.z - c.z);
    if (t === H) return hurtHero(c, dmg, w >= 2) ? 'hurt' : 'dodged';
    const r = t.react(A, w, hd, dmg, c, FX); if (!r || r === 'parry') return r;
    const kill = r === 'kill', heavy = w > 1, fx = t.a.x - Math.sin(hd) * 4, fz = t.a.z - Math.cos(hd) * 4;
    sparks(FW, fx, 22, fz, 4 + w * 2, { dir: hd, spd: 120 }); t.a.hitAt = FW.t; noise(t.x, t.z, c.team);
    if (c === H) { FW.hitstop(kill ? STOP.kill : heavy ? STOP.heavy : STOP.light); if (kill) shake(1.5, 4 / 60); else if (heavy) shake(1, 2 / 60); focus(FW, fx, 22, fz); }
    if (heavy || kill) dust(FW, t.a.x, t.a.z, 6 + w * 2, { spd: 30, dir: hd, spread: 2, life: .5 });
    if (kill && (c === H || w >= 3)) tear(FW, t.a.x, 20, t.a.z, .5, 26, 5);
    return r;
  }
  FW.on.hit = a => {
    const c = a.char, name = a.clip.name;
    if (c === hero) { const cut = CUT[name]; if (!cut) return; STATS.swings++;
      const list = opp(H).filter(inArc(H, a.h, 23, 1.35)).sort((p, q) => Math.hypot(p.x - H.x, p.z - H.z) - Math.hypot(q.x - H.x, q.z - H.z)).slice(0, name === 'J3' ? 2 : 1);
      if (!list.length) { STATS.log.push(`${name}:miss`); return; }
      for (const t of list) { const r = land(H, t, cut.w, DMG[name]); if (r === 'parry') STATS.log.push(`${name}:parried`); else if (r) { STATS.hits++; hero.hits++; STATS.log.push(`${name}:hit`); G.struck(t); } }
      if (name === 'J3') tear(FW, list[0].a.x, 20, list[0].a.z, Math.PI / 2 + .35, 26, 5); return; }
    if (!c || !c.drive) return;
    const s = c.swing, w = name === 'J3' ? 3 : 1, list = opp(c).filter(inArc(c, a.h, c.reach + 4, 1.25));
    const t = s && list.includes(s.target) ? s.target : list[0]; if (!t) return;
    const r = land(c, t, s && s.exec ? 3 : w, (s && s.exec ? 99 : name === 'J3' ? 2 : 1) * c.dmg);
    if (s && s.exec && r === 'kill') A.log(`execute:${c.name}>${t.name}`);
  };
  FW.on.strike = a => { const c = a.char; if (!c || !c.drive) return; const v = hv(a.h), px = c.x + v[0] * 8, pz = c.z + v[1] * 8;
    dust(FW, R(px), R(pz), 5, { spd: 24, life: .35 });
    const list = opp(c).filter(o => Math.hypot(o.x - px, o.z - pz) < 10.5); const t = c.swing && list.includes(c.swing.target) ? c.swing.target : list[0];
    if (t) land(c, t, 2, 1.5 * c.dmg); };
  FW.on.impact = a => { const v = hv(a.h); crack(FW, a.x + v[0] * 15, a.z + v[1] * 15); dust(FW, a.x + v[0] * 15, a.z + v[1] * 15, 10, { spd: 34, life: .5 }); };
  FW.on.click = a => { const v = hv(a.h); sparks(FW, a.x + v[0] * 2, 17, a.z + v[1] * 2, 4, { spd: 30, spread: 6 }); };
  FW.on.tele = a => { a.tint = '#ff3b30'; a.tintA = .45; a.tintTill = FW.t + .26; a.char.tintOff = FW.t + .26; };
  // the bow: the arrow leaves toward where the target will be (a sharp archer leads him further)
  FW.on.loose = a => { const c = a.char, s = c && c.swing; if (!s) return; const T = s.target, d = Math.hypot(T.x - c.x, T.z - c.z), fl = d / 230, lead = .4 + .6 * c.temper.wit;
    const tx = T.x + (T.vx || 0) * fl * lead, tz = T.z + (T.vz || 0) * fl * lead, h = hOf(tx - c.x, tz - c.z);
    ARROWS.push({ x: c.x + Math.sin(h) * 6, z: c.z + Math.cos(h) * 6, y: 15, h, v: 230, t: 0, from: c, team: c.team }); noise(c.x, c.z, c.team, 'bow', 60); A.log(`loose:${c.name}>${T.name}`); };
  // the taunt: everyone on the other side within 85 wants the tank now (less if sharp)
  FW.on.taunt = a => { const c = a.char; let n = 0; for (const o of opp(c)) { if (!o.mind || Math.hypot(o.x - c.x, o.z - c.z) > 85) continue; addThreat(o, c, 45 * (1 - .5 * o.temper.wit)); o.mind.alert = Math.max(o.mind.alert, 1.1); o.mind.seen.set(c.id, { x: c.x, z: c.z, t: A.t, a: c }); n++; }
    ring(FW, c.a.x, c.a.z, { r: 30, life: .35 }); dust(FW, c.a.x, c.a.z, 8, { spd: 40, life: .4 }); A.log(`taunted:${c.name}:${n}`); };
  // arrows in flight: the first body on the line (a protector standing in it takes it), or the first wall
  G.arrowStep = dt => { for (const r of ARROWS) { const sx = Math.sin(r.h) * r.v * dt, sz = Math.cos(r.h) * r.v * dt; r.t += dt;
      for (const o of opp(r.from)) { const t = ((o.x - r.x) * sx + (o.z - r.z) * sz) / (sx * sx + sz * sz); if (t < 0 || t > 1) continue;
        if (Math.hypot(r.x + sx * t - o.x, r.z + sz * t - o.z) < 4.5) { r.dead = 1; land(r.from, o, 1, 1.5 * r.from.dmg); A.log(`arrow:${r.from.name}>${o.name}`); break; } }
      r.x += sx; r.z += sz; if (r.t > 1.3 || SOLID.some(b => r.x > b.x0 && r.x < b.x1 && r.z > b.z0 && r.z < b.z1)) r.dead = 1; }
    for (let i = ARROWS.length - 1; i >= 0; i--) if (ARROWS[i].dead) ARROWS.splice(i, 1); };
  return G;
}
