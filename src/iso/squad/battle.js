// ---- The squad battle in the iso slice (`?iso&squad`, docs/squad-ai.md): the hero and five companions against a
// samurai squad (an officer, three samurai, an archer on the engawa and a lone archer by the walkway). It builds the
// cast, the AI's world (ai/, squad/: engine side), and steps them: input → the hero → senses and thinks → the bodies →
// the flow world (main.js). The RTS controls (control.js), the order bar and the settings panel (panel.js) and the
// markers on the effects layer (draw.js) hang off it. Nothing here touches today's game or the single-samurai slice.
import { W as FW } from 'ronin-engine/clock/world.js';
import { CUT } from 'ronin-engine/iso/play/hero.js';
import { hOf, wrapA } from 'ronin-engine/flow/flow.js';
import { SOLID, ROOM } from '../world/room.js';
import { CAM, toScreen, VW, VH } from 'ronin-engine/iso/gfx/view.js';
import { Npc } from 'ronin-engine/iso/squad/npc.js';
import { squadRules, ARROWS } from 'ronin-engine/iso/squad/combat.js';
import { thinkSide, thinkFoe, BOUNDS } from 'ronin-engine/ai/brain.js';
import { thinkAlly } from 'ronin-engine/squad/mind.js';
import { temperOf } from 'ronin-engine/ai/temper.js';
import { died as moraleDied, wounded as moraleWounded } from 'ronin-engine/ai/director.js';
import { SQ, assignSlots } from 'ronin-engine/squad/squad.js';
import { initControl } from 'ronin-engine/iso/squad/control.js';
import { buildPanel } from 'ronin-engine/iso/squad/panel.js';
import { drawSquad } from 'ronin-engine/iso/squad/draw.js';
import 'ronin-engine/flow/moves-squad.js';

const STEEL = { c: [.62, .72, .8], a: .16 }, GOLD = { c: [.95, .72, .3], a: .13 };
// the cast (positions in world units; the courtyard is 600 × 300, the engawa raised at x 470–560)
export const CAST = {
  allies: [
    { name: 'Kuro', wpn: 'yari', traits: [['grim', 1], ['soldier', 1]], temper: { wit: .6 }, hp: 10, about: 'yari: holds the line' },
    { name: 'Suzume', wpn: 'tanto', traits: [['nimble', 1], ['restless', 1]], temper: { wit: .75 }, hp: 6, about: 'twin tanto: flanks' },
    { name: 'Tetsu', wpn: 'nodachi', traits: [['heavy', 1], ['lumbering', 1]], temper: { wit: .45 }, hp: 9, about: 'nodachi: breaks' },
    { name: 'Hana', wpn: 'bow', traits: [['wary', 1], ['calm', .6]], temper: { wit: .7 }, hp: 5, about: 'bow: keeps her distance' },
    { name: 'Ren', wpn: 'bo', traits: [['monk', 1], ['serene', .6]], temper: { wit: .65 }, hp: 7, about: 'bo staff: lifts the fallen' },
  ],
  foes: [
    { name: 'Taisho', kind: 'samurai', leader: true, x: 420, z: 122, h: -Math.PI / 2, hp: 9, traits: [['proud', 1], ['veteran', 1]], temper: { wit: .8 } },
    { name: 'Goro', kind: 'samurai', x: 392, z: 86, h: -Math.PI / 2, hp: 5, traits: [['eager', 1]], patrol: [[392, 86], [330, 66], [300, 110]] },
    { name: 'Ichi', kind: 'samurai', x: 440, z: 164, h: -Math.PI / 2, hp: 5, traits: [['soldier', 1], ['stoic', .6]] },
    { name: 'Saburo', kind: 'samurai', x: 384, z: 152, h: -Math.PI / 2 - .4, hp: 5, traits: [['nervous', 1], ['twitchy', .5]], temper: { wit: .35 } },
    { name: 'Yumi', kind: 'archer', wpn: 'bow', x: 478, z: 116, h: -Math.PI / 2, hp: 3, value: 2, traits: [['wary', 1]] },
    { name: 'Kage', kind: 'archer', wpn: 'bow', x: 528, z: 262, h: -Math.PI / 2 - .5, hp: 3, value: 2, traits: [['lazy', 1]], temper: { wit: .3 } },
  ],
};

export function squadGame({ hero, lookKind, canvas, root, scene, calm = false }) {   // calm: the foes stay at their posts (the check's order steps)
  // the AI's world: the agents, a seeded dice, walls for sight, the noises, the attack tokens, an event log for the check
  let seed = 7; const rng = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  Object.assign(BOUNDS, { x0: ROOM.x0 + 12, x1: ROOM.x1 - 12, z0: ROOM.z0 + 12, z1: 286 });
  const H = { id: 'hero', name: 'you', team: 0, kind: 'hero', hero: true, n: -1, value: 4, maxHp: 10, hp: 10, alive: true, downed: false, reach: 23, temper: temperOf(), a: hero.a, swing: null,
    get x() { return hero.x; }, get z() { return hero.z; }, get gy() { return hero.gy; }, get h() { return hero.a.h; }, get vx() { return hero.vx; }, get vz() { return hero.vz; },
    get busy() { const c = CUT[hero.state]; return c ? hero.a.ct < c.recover : hero.state === 'recoil' || hero.state === 'roll'; }, get loud() { return hero.a.v > 90; } };
  const A = { t: FW.t, dt: 1 / 60, agents: [H], noises: [], tokens: new Map(), rng, events: [], hero: H, focus: null, sprung: false, struckT: -99, known: new Set(),
    log(s) { this.events.push(`${this.t.toFixed(2)} ${s}`); if (this.events.length > 600) this.events.splice(0, 100); },
    blocked: (ax, az, bx, bz) => SOLID.some(b => segBox(ax, az, bx, bz, b)),
    knows: e => A.known.has(e),
    onTarget: (t, except) => A.agents.filter(o => o !== except && o.team === 0 && o.intent && o.intent.target === t && (o.intent.k === 'attack' || o.intent.k === 'shoot')).length,
    wounded: (ag, f) => moraleWounded(ag, f),
    died(ag) { moraleDied(A, ag); if (ag.leader) A.log(`leader-down:${ag.name}`); } };
  const allies = CAST.allies.map((o, i) => new Npc({ ...o, team: 0, kind: 'ally', x: 70 - (i % 3) * 14, z: 150 + (i - 2) * 16, h: Math.PI / 2, look: lookKind, tint: STEEL }));
  const foes = CAST.foes.map(o => new Npc({ ...o, team: 1, look: lookKind, post: [o.x + Math.sin(o.h) * 40, o.z + Math.cos(o.h) * 40], tint: o.leader ? GOLD : null }));
  const npcs = [...allies, ...foes]; A.agents.push(...npcs);
  for (const c of npcs) c.look.mount(scene);
  const G = { hero, H, A, all: () => A.agents, struck(t) { A.focus = t; A.focusT = A.struckT = A.t; A.sprung = true; } };
  squadRules(G);
  H.fh = Math.PI / 2;
  const ctl = initControl({ canvas, root, A, H, hero, npcs, allies, foes });
  const panel = buildPanel({ root, A, H, allies, foes, ctl }); panel.bind({ newWave });

  let clearT = null, lastCut = null, lastCt = 0, runN = 0, liftT = 0;
  function heroTarget() { let best = null, bs = 1e9;
    for (const f of foes) { if (!f.alive) continue; const d = Math.hypot(f.x - hero.x, f.z - hero.z), off = Math.abs(wrapA(hOf(f.x - hero.x, f.z - hero.z) - hero.a.h)); const s = d + off * 30; if (s < bs) { bs = s; best = f; } }
    return best; }
  // what the party knows: what the player sees (a foe on the screen), a foe engaged on the party, or one a companion sees
  function knowledge() { A.known.clear();
    for (const f of foes) { if (!f.alive) continue; if (f.mind.mode === 'engaged' && f.mind.target || Math.abs(f.x - CAM.x) < 240 && Math.abs(f.z - CAM.z) < 165) { A.known.add(f); continue; }
      for (const p of A.agents) if (p.team === 0 && p.alive && !p.downed && Math.hypot(p.x - f.x, p.z - f.z) < 170 && !A.blocked(p.x, p.z, f.x, f.z)) { A.known.add(f); break; } } }
  // the 60 Hz step (only outside a hit-stop; main.js calls it)
  function control(inp) {
    A.t = FW.t; A.noises = A.noises.filter(n => n.at > A.t - .6);
    if (panel.paused()) return;
    const tgt = heroTarget(); ctl.steer(inp, tgt);
    hero.control(inp, tgt && Math.hypot(tgt.x - hero.x, tgt.z - hero.z) < 90 ? tgt : null, FW.t);
    // his swing, for the foes' guards; his steps, for their ears; the formation's heading follows him while he runs
    const hs = hero.state; if (CUT[hs]) { if (hs !== lastCut || hero.a.ct < lastCt) H.swing = { clip: hs, target: tgt, heavy: hs === 'J3', t0: A.t }; lastCut = hs; lastCt = hero.a.ct; } else { H.swing = null; lastCut = null; }
    if (hero.a.v > 60) { H.fh = H.fh + wrapA(hero.a.h - H.fh) * .08; if (++runN % 18 === 0) A.noises.push({ x: hero.x, z: hero.z, r: 50, team: 0, kind: 'run', at: A.t }); }
    H.hp = Math.min(H.maxHp, H.hp + 1 / 60 * .15);
    if (A.focus && (!A.focus.alive || A.t - A.focusT > 6)) A.focus = null;
    if (!A.focus) { const e = foes.find(f => f.alive && f.mind.target === H && Math.hypot(f.x - hero.x, f.z - hero.z) < 70); if (e) A.focus = e; }
    knowledge(); assignSlots(A);
    if (!calm) thinkSide(A, 1, thinkFoe); thinkSide(A, 0, thinkAlly);
    for (const c of npcs) { c.drive(FW, A); c.tick(A, 1 / 60); }
    separate(); G.arrowStep(1 / 60);
    // E held by a downed companion lifts him (as in today's game)
    const dn = allies.find(c => c.downed && Math.hypot(c.x - hero.x, c.z - hero.z) < 16);
    if (dn && ctl.keys.has('KeyE')) { liftT += 1 / 60; if (liftT > .6) { dn.revive(A); A.log(`revive:you>${dn.name}`); liftT = 0; } } else liftT = 0;
    // the next wave, once the yard is clear; the fallen companions come back with it
    if (foes.every(f => !f.alive)) { if (clearT == null) clearT = A.t; if (A.t - clearT > 3.5) newWave(); } else clearT = null;
  }
  function newWave() { clearT = null; for (const f of foes) f.respawn(); A.tokens.clear(); A.focus = null;
    allies.forEach((c, i) => { if (!c.alive) c.respawn(hero.x - 16 - i * 4, hero.z + (i - 2) * 10); }); A.log('wave'); }
  // bodies keep apart (soft): two men never stand in one spot; the hero is never pushed
  function separate() { const L = A.agents.filter(o => o.alive && !o.downed);
    for (let i = 0; i < L.length; i++) for (let j = i + 1; j < L.length; j++) { const p = L[i], q = L[j], dx = q.x - p.x, dz = q.z - p.z, d = Math.hypot(dx, dz), min = 9;
      if (d >= min || d < 1e-3) continue; const k = (min - d) / d * .5, ux = dx * k, uz = dz * k;
      if (p.hero) { q.a.x += ux * 4; q.a.z += uz * 4; } else if (q.hero) { p.a.x -= ux * 4; p.a.z -= uz * 4; } else { p.a.x -= ux * 2; p.a.z -= uz * 2; q.a.x += ux * 2; q.a.z += uz * 2; } } }
  // ticks this frame: the order slow-motion (or pause) while orders are being given (the dominion note, D2C)
  let frac = 0; const scale = () => panel.paused() ? 0 : ctl.giving() ? (SQ.slow === 'pause' ? 0 : SQ.slow === 'slow' ? .25 : 1) : 1;
  function ticks(n) { frac += n * scale(); const k = Math.floor(frac); frac -= k; return k; }
  return {
    chars: npcs, control, ticks, scale, near: () => heroTarget(), newWave,
    draw(g) { drawSquad(g, { A, H, hero, allies, foes, ctl, arrows: ARROWS }); },
    hook: {
      get agents() { return A.agents.map(a => ({ id: a.id, name: a.name, team: a.team, kind: a.kind, role: a.role, liberty: a.liberty, charge: a.charge, order: a.order && { ...a.order, target: a.order.target && a.order.target.id }, formation: a.formation, tactic: a.tactic,
        x: a.x, z: a.z, hp: a.hp, maxHp: a.maxHp, alive: a.alive, downed: a.downed, state: a.hero ? hero.state : a.state, intent: a.intent && a.intent.k, why: a.mind ? a.mind.why : '', target: a.mind && a.mind.target ? a.mind.target.id : null,
        mode: a.mind ? a.mind.mode : null, alert: a.mind ? a.mind.alert : 0, morale: a.mind ? a.mind.morale : 1, slot: a.slot && { x: a.slot.x, z: a.slot.z }, sel: SQ.sel.has(a.id), px: (q => [q.x / VW, q.y / VH, q.top / VH])(ctl.px(a)) })); },
      screen: (x, z) => { const [u, v] = toScreen(x, 0, z); return [u / VW, v / VH]; },
      get sel() { return [...SQ.sel]; }, get groups() { return { ...SQ.groups }; }, get events() { return A.events.slice(); }, get slow() { return SQ.slow; }, get scale() { return scale(); },
      get arrows() { return ARROWS.length; }, get focus() { return A.focus && A.focus.id; }, get panel() { return panel.open(); },
    },
  };
}
// does the segment a→b cross the box (slab test)
function segBox(ax, az, bx, bz, b) { let t0 = 0, t1 = 1; const dx = bx - ax, dz = bz - az;
  for (const [p, d, lo, hi] of [[ax, dx, b.x0, b.x1], [az, dz, b.z0, b.z1]]) { if (Math.abs(d) < 1e-9) { if (p < lo || p > hi) return false; continue; }
    let u = (lo - p) / d, v = (hi - p) / d; if (u > v) [u, v] = [v, u]; t0 = Math.max(t0, u); t1 = Math.min(t1, v); if (t0 > t1) return false; }
  return true; }
