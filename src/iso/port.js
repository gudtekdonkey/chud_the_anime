// ---- The rest of today's game, carried into the slice (owner: "companions and paired executions, items and Harvest,
// the HUD and skill bar, combo prompts, and click-to-move"): one place that wires them to the slice's loop, so main.js
// only calls initPort once and four hooks a frame. Everything here keeps to src/iso/ apart from today's light modules it
// imports as they are (state.js INV, items/inventory.js, party/kit.js, traits/, ui/hud-kit.js, ui/pixfont.js, ui/icons.js,
// items/item-sprites.js, fx/numbers.js): the HUD canvas they draw on is hud/canvas.js's.
import './hud/canvas.js';
import { CTX, lone } from 'ronin-engine/iso/ctx.js';
import { W } from 'ronin-engine/clock/world.js';
import { STATS } from 'ronin-engine/iso/play/rules.js';
import { PARTY, initParty, tickParty, partyKill, hurtAlly } from './party/party.js';
import { BAG } from '../party/kit.js';
import { startPaired, startSolo, tickPaired, swallowsHit, pairCandidate, PAIR } from './party/paired.js';
import { buildBig, BIG } from './items/big.js';
import { initItemKeys, tickItems, addFallen, drawFallen, IT, FALLEN } from './items/items.js';
import { drawPickups, PICKUPS, GOT } from './items/pickups.js';
import { drawItemFx, drawSmoke } from './items/item-fx.js';
import { USE } from './items/quick.js';
import { P, S, INV, hurt, qiAdd, QI_HIT, tickMeters } from './items/inv.js';
import { CP, tickPrompts, onLanded, answer } from './combo/combo-game.js';
import { CLICK, initClick, clickDir, tickClick, drawClick, clickAt, floorAt } from './input/click.js';
import { TOUCH, initTouch, touchDir } from 'ronin-engine/iso/input/touch.js';
import { drawHud, hudCanvas } from './hud/hud.js';
import { numAt, tickWorldUi } from './hud/world-ui.js';
import { BLADE_LEN } from './party/ally-look.js';
import { VW, VH } from 'ronin-engine/iso/gfx/view.js';
import { consume } from 'ronin-engine/input/keys.js';
import 'ronin-engine/flow/moves-port.js';

// kit: the I O P N U C skills' state (skills/skills.js SK), when they run: then today's HUD shows their Qi, storm and
// health (one meter each, bridged every step below) and a landed cut's Qi is theirs to give. execute(f): the real
// executions (gore.js), K's finisher on a combo when no partner is set up for a paired one
export function initPort({ scene, hero, foes, chars, canvas, root, pipe, lookKind, Q, kit = null, execute = null }) {
  Object.assign(CTX, { scene, hero, foes, chars, canvas, root, pipe, W, lookKind, party: PARTY });
  pipe.setHud(hudCanvas);
  buildBig(scene);
  if (!Q.has('solo')) initParty();
  CP.on = Q.get('combo') !== 'free';
  // while a system has him (an item's act, Harvest, a lift, a paired execution) his cuts' own hits are its business
  const prevHit = W.on.hit; W.on.hit = (a, w) => { if (CTX.busy && (a === hero.a || swallowsHit(a))) return; return prevHit && prevHit(a, w); };
  // K on a combo finisher: a paired execution when a partner is set up for one, else the solo finisher (the executions
  // work, claude/3d-executions, replaces CTX.execute with the real ones)
  CTX.execute = f => startPaired() || (execute && execute(f)) || startSolo(f);
  initItemKeys(); initClick(canvas); initTouch(canvas, Q.has('swipe')); CLICK.swipeMouse = Q.has('swipe');
  addEventListener('keydown', e => { if (e.repeat || e.ctrlKey || e.metaKey || e.altKey) return;
    // K answers a combo's K, else starts a paired execution when a partner is set up; either way the press is used here,
    // so the lone-samurai execution (gore.js, the 'exec' press) takes K only when neither did
    if (e.code === 'KeyK') { e.preventDefault(); if (CP.prompt && CP.prompt.ans === 'K') { answer('K'); consume('exec', () => true); } else if (startPaired(Q.get('pair'))) consume('exec', () => true); }   // &pair=<id>: that one when it fits (testing)
    // H (testing, as today's): cut the nearest companion down, or finish one who is down; with nobody, a cut on him
    if (e.code === 'KeyH') { let b = null, d0 = 1e9; for (const al of PARTY.allies) { if (al.dead) continue; const d = Math.hypot(al.x - hero.x, al.z - hero.z); if (d < d0) { d0 = d; b = al; } }
      if (b) hurtAlly(b, 9, null); else { const n = hurt(.1); if (n) numAt(hero, n * 100, 'take'); } }
    if (e.code === 'Quote') { CP.on = !CP.on;   // ' (T is the facings)
      const el = root.querySelector('#o-combo'); if (el) el.checked = CP.on; } });
  addControls(root);
  const seen = new Map(foes.map(f => [f, { deaths: f.deaths, hits: f.hits }])); let heroHits = hero.hits, taken = hero.taken;
  const clamp01 = v => Math.max(0, Math.min(1, v)), br = kit ? { q: kit.qi, h: kit.hp } : null;
  if (kit) { kit.hpExt = true; P.qi = kit.qi; INV.hp = kit.hp; }   // the kit's start (&qi, &hp) is the HUD's
  const port = {
    // the direction his controller gets this step: the keys, else the touch stick or a swipe's dash, else a click's path
    // (the prompts go first: a J while one is up is its answer, never his controller's own chain)
    input(inp) { const td = touchDir(); if (inp.dir == null && td != null) inp.dir = td;
      if (W.stop <= 0) tickPrompts(1 / 60, inp);   // (the keys' or the stick's direction answers; a click's path never does)
      const cd = clickDir(inp.dir); if (inp.dir == null && cd != null) inp.dir = cd; return inp; },
    // after the hero's and the samurai's controllers, once a game step (1/60 s)
    tick(dt) {
      if (W.stop <= 0) { tickPaired(dt); tickParty(dt); tickItems(dt); tickClick(); }
      tickMeters(dt); tickWorldUi(dt);
      // one Qi and one health with the kit: what today's side changed since the last step (items, a hurt, a heal) goes
      // into the kit's, and the HUD shows the kit's (its breath heals, its storm drains the meter)
      if (kit) { kit.qi = clamp01(kit.qi + P.qi - br.q); kit.hp = clamp01(kit.hp + INV.hp - br.h);
        P.qi = br.q = kit.qi; INV.hp = br.h = kit.hp; P.storm = kit.storm; }
      // what the controllers did this step, read off their counters: hits landed, hits taken, deaths
      if (hero.hits > heroHits) { heroHits = hero.hits; const f = foes.find(o => o.a.hitAt === W.t) || foes[0]; if (!kit) qiAdd(QI_HIT); numAt(f, f.dead ? 20 : 10, f.dead ? 'big' : 'deal'); onLanded(f); }
      if (hero.taken > taken) { const n = hurt(.12 * (hero.taken - taken)); taken = hero.taken; if (n) numAt(hero, n * 100, 'take'); }
      for (const f of foes) { const s = seen.get(f); if (f.deaths > s.deaths) { s.deaths = f.deaths; addFallen(f.x, f.z); partyKill(f); } }
      // his blade: the Grave Nodachi's length once he has taken it (the 3D look's blade, a placeholder for the weapons work)
      const rig = hero.look.rig; if (rig && rig.blade) rig.blade.scale.z = BLADE_LEN[P.weapon] ?? 1;
    },
    // whom a samurai goes for (him or a companion); during the bomb's smoke nobody (they lose him)
    targetFor(f) { if (S.smoke > 0) return { a: f.a, iframes: true, x: f.x, z: f.z }; return PARTY.targetFor(f); },
    held: c => CTX.held.has(c),
    get busy() { return !!CTX.busy; },
    // on the effects layer (render pixels), after the slice's own effects
    drawFx(g) { g.imageSmoothingEnabled = false; drawFallen(g); drawPickups(g); drawItemFx(g); drawClick(g); drawSmoke(g, VW, VH); },
    drawHud,
    setLook(kind) { CTX.lookKind = kind; },
  };
  // the check's read-only view (dev or ?test)
  port.debug = () => ({ bag: { wear: BAG.wear.length, weapons: BAG.weapons.length, charms: BAG.charms.length }, party: PARTY.allies.map(a => ({ id: a.c.id, name: a.c.name, x: a.x, z: a.z, state: a.state, hp: a.hp, downed: a.downed, dead: a.dead, lv: a.c.lv, exp: a.c.exp, hits: a.hits, weapon: a.c.kit.weapon })),
    pair: { cd: PAIR.cd, run: PAIR.run && PAIR.run.ex.id, done: PAIR.done, solo: PAIR.solo || 0, log: PAIR.log.slice(), candidate: !!pairCandidate() }, busy: CTX.busy,
    inv: { hp: INV.hp, qi: P.qi, storm: P.storm, mon: INV.mon, shards: INV.shards, exp: INV.exp, lv: INV.lv, weapon: P.weapon, quick: INV.quick.map(q => q && { ...q }), charms: INV.charms.slice(), edge: INV.edge, power: INV.power, upgrades: INV.upgrades, banner: S.banner && S.banner.big, rift: !!(INV.sk && INV.sk.rift && INV.sk.rift.known), smoke: S.smoke, useSlot: USE.slot, using: USE.id },
    items: { locked: IT.locked && IT.locked.id, used: Object.fromEntries(BIG.map(i => [i.id, i.used])), fallen: FALLEN.map(f => ({ x: f.x, z: f.z, left: f.left })), harvesting: !!IT.harvesting, lifting: !!IT.lifting, harvested: IT.harvested, pickups: PICKUPS.filter(i => !i.relic && !i.pull).map(i => ({ kind: i.kind, x: i.x, z: i.z })), got: GOT.n },
    combo: { on: CP.on, chain: CP.chain, prompt: CP.prompt && { ans: CP.prompt.ans, kind: CP.prompt.kind, beat: CP.prompt.beat }, grades: CP.grades.slice(-12), answers: CP.answers.slice(), log: CP.log.slice(-12), recover: CP.recover, queued: CP.queued && CP.queued.clip },
    click: { goal: CLICK.goal && CLICK.goal.kind, log: CLICK.log.slice(-8), dbg: CLICK.dbg }, touch: { log: TOUCH.log.slice(-12), dir: TOUCH.dir }, lone: foes.map(f => lone(f)), stats: STATS.log.length });
  port.clickAt = (cx, cy) => clickAt(floorAt(canvas, cx, cy));
  return port;
}
// the overlay's own lines for the port: the combo prompts' switch and what the new keys do
function addControls(root) {
  const aside = root.querySelector('aside'); if (!aside) return; const d = document.createElement('div');
  d.innerHTML = `<h2>The game, in 3D</h2><label><input type="checkbox" id="o-combo">Combo prompts (off: the plain J ladder)<kbd>'</kbd></label>
    <div class="keys"><div><kbd>E</kbd> tap: the item's verb · hold: Harvest, or lift a companion</div><div><kbd>1</kbd>–<kbd>4</kbd> quick slots</div><div><kbd>K</kbd> paired execution with a companion; the finisher on a combo</div>
    <div>Left click: run there, cut a samurai, use an item</div><div>Touch: stick on the left, tap J, swipe dash / lunge, double tap K</div><div><kbd>Alt</kbd>+<kbd>1</kbd>…<kbd>0</kbd> the pipeline steps</div></div>`;
  aside.insertBefore(d, aside.querySelector(':scope > h2:last-of-type'));   // a direct child (other sections nest their h2 in a div) const el = d.querySelector('#o-combo'); el.checked = CP.on; el.onchange = () => { CP.on = el.checked; };
}
export { PARTY, CTX };
