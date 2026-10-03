// ---- Prototype 41: the road view. He runs across the zone he is crossing; a scene puts its people on the road ahead of him ----
// Everyone moves by the trait system: the ronin with no traits (his own idle, walk and run), everyone else as one person of their culture.
import { bake } from 'ronin-engine/traits/bake.js';
import { personOf } from '../../src/traits/cultures.js';
import { pz } from 'ronin-engine/rig/pose.js';
import { hash } from 'ronin-engine/sim/rng.js';
import { W, H, ROAD_Y, PALS, figure, eyes, sprite, ground, weather, night, horse, coffin } from './stage.js';
import { makeStorm, stormUpdate, stormDraw, glitchFigure, hold } from './storm-look.js';

// the sim's kinds of people to the trait system's cultures (src/traits/cultures.js)
const MANNER = { clan: 'clan', court: 'court', rebels: 'village', monastic: 'monastery', bandits: 'outlaws', shinobi: 'shinobi', merchants: 'port', fishers: 'port', miners: 'village' };
// no sword at all for the people who carry none (the rig draws a weapon through these hooks)
const NONE = new Proxy({}, { get: () => () => {} });
const GAITS = new Map();
const gaitOf = (manner, seed) => { const k = manner + ':' + seed; if (!GAITS.has(k)) GAITS.set(k, manner ? bake(personOf(manner, seed)) : bake([])); return GAITS.get(k); };
const RONIN = gaitOf(null, 0);
const KNEEL = pz({ hy: 7, lean: .5, chest: .35, fl: [1.35, 2.3], bl: [-.35, 2.45], fa: [.85, 1.7], ba: [.55, 1.3], bow: .6, empty: true });

// how a person of the scene looks and moves, from who they are
function look(w, L, scKind) {
  const kind = L.cultures[w.culture]?.kind, seed = hash(w.name) % 9973;
  const armed = w.fighter !== false;
  let pal = PALS.earth, bare = true, manner = MANNER[kind] || 'village';
  if (w.cls === 'outlaw') { pal = PALS.samurai; manner = 'outlaws'; }
  else if (w.cls === 'ashigaru' || w.cls === 'retainer' || w.cls === 'noble') { pal = PALS.samurai; manner = 'clan'; }
  else if (w.cls === 'shinobi') { pal = PALS.samurai; manner = 'shinobi'; }
  else if (w.cls === 'ronin') { pal = PALS.rival; bare = false; manner = 'clan'; }
  else if (w.cls === 'monk') { pal = PALS.monk; bare = false; manner = 'monastery'; }
  else if (w.job === 'merchant') { bare = false; manner = 'port'; }
  if (scKind === 'funeral') { pal = PALS.mourner; bare = true; manner = 'village'; }
  if (scKind === 'pilgrims') bare = false;
  return { pal, bare, wp: armed ? undefined : NONE, empty: !armed, gait: gaitOf(manner, seed) };
}

export function makeRoad(cv) {
  const g = cv.getContext('2d'), S = makeStorm(W, H);
  const R = { g, S, zone: null, bg: null, x: 0, dir: 1, run: true, stop: null, people: [], props: [], t: 0, arrived: null, flash: 0, caption: '' };
  // a new zone: its ground, and he comes in at the edge he left the last one by
  R.enter = (zone, dir, season, dark) => { R.zone = zone; R.dir = dir; R.bg = ground(zone, season, dark); R.x = dir > 0 ? -12 : W + 12; R.people = []; R.props = []; R.stop = null; R.arrived = null; };
  R.redrawGround = (season, dark) => { if (R.zone) R.bg = ground(R.zone, season, dark); };
  // a scene: he stops a third of the way in, its people wait on the road ahead of him (or come down it)
  R.scene = (sc, L) => {
    const d = R.dir, stopX = d > 0 ? 170 : W - 170; R.stop = stopX; R.people = []; R.props = [];
    const ahead = (i, gap = 26) => stopX + d * (70 + i * gap), face = -d;
    const put = (w, i, o = {}) => { const lk = look(w, L, sc.type); R.people.push({ w, ...lk, x: o.x ?? ahead(i), y: ROAD_Y + (o.dy ?? ((i % 2) * 5 - 2)), face: o.face ?? face, mode: o.mode || 'idle', t: i * .37, vx: o.vx || 0, alpha: 1 }); };
    const n = sc.who.length;
    if (sc.type === 'raiders') sc.who.forEach((w, i) => w.fighter === false ? put(w, i, { x: stopX + d * (60 + i * 14), mode: 'kneel', face: d }) : put(w, i, { x: stopX + d * (120 + i * 22) }));
    else if (sc.type === 'wounded') { put(sc.who[0], 0, { mode: 'kneel', x: stopX + d * 64, dy: -14, face: -d }); R.props.push({ kind: 'blood', x: stopX + d * 64, y: ROAD_Y - 14 }); }
    else if (sc.type === 'funeral') { sc.who.forEach((w, i) => put(w, i, { x: stopX + d * (80 + i * 18), mode: 'walk', vx: -d * 14, dy: (i % 2) * 4 - 2 })); R.props.push({ kind: 'coffin', follow: 2 }); }
    else if (sc.type === 'pilgrims') sc.who.forEach((w, i) => put(w, i, { x: stopX + d * (90 + i * 18), mode: 'walk', vx: -d * 18 }));
    else if (sc.type === 'merchant') { put(sc.who[0], 0, { x: stopX + d * 80 }); R.props.push({ kind: 'packhorse', x: stopX + d * 108, y: ROAD_Y + 1, face: -d }); }
    else if (sc.type === 'horse') R.props.push({ kind: 'horse', x: d > 0 ? W + 30 : -30, y: ROAD_Y + 2, face: -d, vx: -d * 150 });
    else sc.who.forEach((w, i) => put(w, i));
    R.halt = { x: stopX, n };
  };
  // what the choice did, shown on the road: the slain buckle and go, the others go their way, he goes on
  R.after = (sc, out) => {
    const slain = new Set(out.fight?.slain || []), fought = !!out.fight;
    if (fought) R.flash = .034;   // the ~2-frame white flash of a landed blow on everyone he fought
    for (const p of R.people) {
      const dead = fought && p.w.fighter !== false && (slain.has(p.w.id) || (!p.w.id && out.fight.won && out.fight.lethal));
      if (dead) { p.mode = 'fall'; p.t = 0; }
      else if (out.again) continue;
      else if (sc.type === 'wounded' && out.hours) { p.mode = 'gone'; }
      else { p.mode = 'walk'; p.vx = (sc.type === 'duelist' || fought && !out.fight.won) ? R.dir * 30 : -R.dir * 22; p.face = Math.sign(p.vx); }
    }
    const h = R.props.find(p => p.kind === 'horse');
    if (h && sc.type === 'horse') { if (out.again) { h.vx = 0; h.x = R.stop + R.dir * 26; h.caught = true; } else if (!h.caught) h.vx = -R.dir * 150; else h.vx = 0; }
    if (out.loot?.some(l => l.item === 'horse')) R.riding = true;
    if (!out.again) { R.stop = null; R.halt = null; }
  };

  // one frame: k the storm here, side where its heart lies on screen, wx the weather, dark 0..1, layers the storm look's switches
  R.frame = (dt, { k, side, drift, wx, dark, layers, moving, onEdge }) => {
    R.t += dt;
    stormUpdate(S, dt, k, side, drift, layers, R.x, [ROAD_Y - 34, ROAD_Y + 2]);
    if (S.freeze > 0) { stormDraw(g, S, k, layers); return; }   // the picture holds (lost time)
    // he runs on unless a scene holds him
    const going = moving && (R.stop == null || Math.abs(R.x - R.stop) > 2);
    if (going) { const sp = (R.run ? RONIN.speed.run : RONIN.speed.walk) * (R.fast ? 4 : 1); R.x += R.dir * sp * dt; if (R.stop != null && (R.x - R.stop) * R.dir > 0) R.x = R.stop; }
    if (!R.arrived && (R.dir > 0 ? R.x > W + 12 : R.x < -12)) { R.arrived = true; onEdge(); }
    g.drawImage(R.bg, 0, 0);
    // everyone on the road, back to front by their feet
    const list = [];
    for (const p of R.props) list.push({ y: p.y ?? ROAD_Y, draw: () => prop(p, dt) });
    for (const p of R.people) if (p.mode !== 'gone') list.push({ y: p.y, draw: () => person(p, dt, k, layers) });
    const rp = pose(RONIN, going ? (R.run ? 'run' : 'walk') : 'idle', R.t);
    list.push({ y: ROAD_Y + 1, draw: () => figure(g, rp, R.x, ROAD_Y + 1, R.dir, PALS.ronin, { slice: layers.people && k > 0 ? img => glitchFigure(img, k * .6) : null }) });
    list.sort((a, b) => a.y - b.y).forEach(o => o.draw());
    if (wx !== 'clear' && wx !== 'cloud') weather(g, wx, R.t, drift);
    if (wx === 'cloud') { g.fillStyle = 'rgba(10,14,18,.08)'; g.fillRect(0, 0, W, H); }
    night(g, dark);
    // eyes stay lit in the dark: his cyan, a samurai's red
    if (dark > .3) { eyes(g, rp, R.x, ROAD_Y + 1, R.dir, PALS.ronin); for (const p of R.people) if (p.mode !== 'gone' && p.mode !== 'fall') eyes(g, pp(p), p.x, p.y, p.face, p.pal); }
    stormDraw(g, S, k, layers);
    if (layers.stutter) hold(S, g);
  };
  const pose = (gait, mode, t) => { const m = gait[mode]; return m.poses[Math.floor(t * m.fps) % m.poses.length]; };
  const pp = p => ({ ...(p.mode === 'kneel' ? KNEEL : pose(p.gait, p.mode === 'walk' ? 'walk' : 'idle', p.t)), bare: p.bare, wp: p.wp, empty: p.empty });
  function person(p, dt, k, layers) {
    p.t += dt;
    if (p.mode === 'walk') { p.x += p.vx * dt; if (p.x < -40 || p.x > W + 40) p.mode = 'gone'; }
    let q = pp(p), alpha = p.alpha;
    // the slain: knees go, the body folds down over them, and they are gone from the road (the game cuts them into pieces; not here)
    if (p.mode === 'fall') { const u = Math.min(1, p.t / .45); q = { ...pose(p.gait, 'idle', 0), hy: 9 * u * u, bow: u, lean: .6 * u, fl: [.1 + 1.2 * u, .08 + 2.2 * u], bl: [-.1 - .3 * u, .04 + 2.3 * u], bare: p.bare, wp: p.wp, empty: p.empty };
      alpha = p.t < .8 ? 1 : Math.max(0, 1 - (p.t - .8) / .6); if (alpha <= 0) p.mode = 'gone'; }
    const flash = R.flash > 0 && p.w.fighter !== false && p.mode !== 'kneel';
    figure(g, q, p.x, p.y, p.face, flash ? WHITE : p.pal, { alpha, slice: layers.people && k > 0 ? img => glitchFigure(img, k) : null });
  }
  function prop(p, dt) {
    if (p.kind === 'blood') { g.fillStyle = '#5a2320'; g.fillRect(Math.round(p.x) - 3, Math.round(p.y) + 1, 7, 1); g.fillRect(Math.round(p.x) + 5, Math.round(p.y) + 2, 2, 1); return; }
    if (p.kind === 'coffin') { const a = R.people[p.follow - 1], b = R.people[p.follow]; if (a && b && a.mode !== 'gone') { p.y = (a.y + b.y) / 2 + 1; coffin(g, (a.x + b.x) / 2, p.y); } return; }
    if (p.kind === 'packhorse') { const m = R.people[0]; if (m && m.mode === 'walk') { p.x = m.x - m.face * 28; p.face = m.face; } if (!m || m.mode === 'gone') return; horse(g, p.x, p.y, p.face, m.mode === 'walk' ? R.t * .5 : 0); return; }
    // what a storm left on the ground: glitch shards, glinting
    if (p.kind === 'shard') { if (Math.random() < .85) { g.fillStyle = Math.random() < .3 ? '#ffffff' : '#52e8d6'; g.fillRect(Math.round(p.x), Math.round(p.y), 2, 1); g.fillStyle = '#b8fff6'; g.fillRect(Math.round(p.x), Math.round(p.y) - 1, 1, 1); } return; }
    if (p.kind === 'horse') { p.x += (p.vx || 0) * dt; horse(g, p.x, p.y, p.face, p.vx ? R.t : 0); }
  }
  R.tick = dt => { if (R.flash > 0) R.flash -= dt; };
  return R;
}
const WHITE = Object.fromEntries(Object.keys(PALS.ronin).map(k => [k, '#ffffff']));
export { sprite };
