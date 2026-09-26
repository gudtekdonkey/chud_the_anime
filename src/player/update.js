import { COL } from '../config.js';
import { P, parts, S, frags, cuts, rings, timers, debris } from '../state.js';
import { dur } from '../anims/sheets.js';
import { zap } from '../fx/bolts.js';
import { gather, debrisXY, fling, crack } from '../fx/debris.js';
import { storm, updateFx } from '../fx/fx.js';
import { unleashMoon } from '../fx/moon.js';
import { strike, updateCuts } from '../fx/slash.js';
import { rr, residue, spark, dust, after } from '../fx/util.js';
import { held } from '../input.js';
import { afterAttack, pickStance, setState, once, moveBy, blink, ghost, inputDir } from './actions.js';
import { motes } from './body.js';
import { hit, hitSeg, burst } from './hits.js';
import { meditate, spawnMirror, updateMirrors } from './mirror.js';
import { TAP, chargeUp, TC, RIFT, release, charged } from './skills.js';
import { gate, startCd, updateCds } from './cooldowns.js';
import { CUTS, GO, nextCut, updateFlow } from './combo.js';
import { updateEnemies } from '../world/enemies.js';
import { assassinate, tickStages, updateStages } from '../assassin/assassinate.js';
import { K, updateMarkers } from '../assassin/markers.js';
import { EL } from '../fx/element.js';
import { reach } from '../weapons/weapons.js';
import { updateItems, itemInput, itemState, mirrorCut } from '../items/items.js';
import { sheathClick } from '../items/harvest.js';
import { updateParty, liftInput, toggleOrder, hurtNearest } from '../party/companions.js';
import { recruitInput, updateRecruits } from '../party/recruit.js';
import { X, pairCandidate, startPair, pairStep } from '../party/paired.js';
import { T as pT, powerCast } from './power.js';

// ---- The state machine: one fixed 1/60 s step ----
export function update(dt, inp) {
  for (const q of parts) { q.x += q.vx * dt; q.y += q.vy * dt; q.vy += q.grav * dt; q.life -= dt; }
  for (let i = parts.length - 1; i >= 0; i--) if (parts[i].life <= 0) parts.splice(i, 1);
  P.ghosts.forEach(g => { g.age += dt; g.white -= dt; }); P.ghosts = P.ghosts.filter(g => g.age < g.hold + .25);
  if (P.hide > 0 && P.state !== 'tele' && P.state !== 'idle' && P.state !== 'run') P.hide = 0;   // acting mid-slither: he re-forms at once
  P.hide = Math.max(0, (P.hide || 0) - dt); if (!(P.hide > 0)) P.goo = Math.max(0, (P.goo || 0) - dt);
  S.shake = Math.max(0, S.shake - dt); S.impact = Math.max(0, S.impact - 1); P.flash = Math.max(0, P.flash - dt); S.scr.t -= dt;
  updateCds(dt); updateFlow(dt); gate(inp);   // cooldowns run in real time, through hit pauses too
  updateFx(dt); updateEnemies(dt, S.hitstop > 0); updateStages(dt); updateMarkers();
  updateParty(dt, S.hitstop > 0, X && X.a); updateRecruits(dt);   // the partner in a paired execution is moved by it, not by their own head
  if (inp.order) toggleOrder();   // party orders are not lost to a hit pause
  if (inp.hurt) hurtNearest();
  if (S.hitstop > 0) { S.hitstop -= dt; return; }
  updateCuts(dt); updateMirrors(dt); tickStages(dt);
  for (const t of timers.splice(0)) if ((t.t -= dt) <= 0) t.fn(); else timers.push(t); // sequenced payoffs (implosions, chain links)
  if (pairStep(dt)) return;   // a paired execution moves him (party/paired.js)

  P.t += dt;
  const s = P.state, T = P.t, D = dur(s), u = T / D;
  const free = s === 'idle' || s === 'run' || s === 'walk' || s === 'idleGlitch' || s === 'sit' || s === 'sitDown';
  const canAttack = free || s === 'land' || s === 'sheathe' || s.startsWith('ready') || s === 'runArmed';
  if (inp.mx) P.face = Math.sign(inp.mx);
  // the way he faces as he moves: side on, three-quarters or straight toward or away from the camera (the west side mirrors the east)
  if (inp.mx || inp.my) P.view = inp.my > 0 ? (inp.mx ? 'SE' : 'S') : inp.my < 0 ? (inp.mx ? 'NE' : 'N') : 'E';
  const moving = inp.mx || inp.my;

  updateItems(dt, canAttack && s !== 'sit' && s !== 'sitDown');
  if (s === 'exec') return;   // the execution's stage moves him (assassin/assassinate.js)
  if (inp.die && s !== 'death') { setState('death'); return; }
  if (s === 'sit' || s === 'sitDown') {
    if (moving || inp.slash || inp.jump || inp.slide || inp.tele || inp.double || inp.sweep || inp.sit || inp.moon || inp.rift || inp.mirror) {
      P.pending = { slash: inp.slash, jump: inp.jump, slide: inp.slide, tele: inp.tele, double: inp.double, sweep: inp.sweep,
        moon: inp.moon, rift: inp.rift, mirror: inp.mirror, dir: inputDir(inp) };
      setState('standUp');
    }
    if (s === 'sitDown' && T >= D) setState('sit');
    return;
  }
  if (s === 'standUp') { if (T >= D) { /* handled in the switch */ } else return; }
  // E beside a downed companion is for lifting them (hold); beside a recruit, a tap takes them on; otherwise it is the items'
  if (liftInput(dt, held.has('act')) || (canAttack && recruitInput(inp))) { inp.act = false; P.ePress = false; }
  if (itemInput(inp, canAttack, dt)) return;
  if (canAttack) {
    if (inp.slash) return setState(P.armed ? 'slash1r' : 'slash1');
    if (inp.jump) { setState('jump'); P.vz = 150; return; }
    if (inp.slide) { setState('slide'); P.slideDir = inputDir(inp); dust(6, P.slideDir[0]); startCd('slide'); return; }
    if (inp.tele) { const c = pairCandidate(); if (c) return startPair(c); }   // a companion close by and set up for it: they cut him down together
    if (inp.tele && K.pick) return assassinate(K.pick);   // an isolated enemy in reach: K flashes to him and executes
    if (inp.tele) { setState('tele'); P.blinkDir = inputDir(inp); startCd('tele'); return; }
    if (inp.double) { setState('double'); P.blinkDir = inputDir(inp); P.hk = 'double'; startCd('double'); return; }
    if (inp.rift) { setState('double'); P.blinkDir = inputDir(inp); P.hk = 'rift'; return; }   // O and P cool down from the release
    if (inp.moon) { setState('moonHold'); P.charge = 0; return; }
    if (inp.mirror) { startCd('mirror'); return meditate(); }
    if (inp.sweep) { startCd('sweep'); return setState('sweep'); }
    if (inp.sit && s !== 'sit' && s !== 'sitDown') return setState('sitDown');
  }

  switch (s) {
    case 'ready': case 'ready0': case 'ready1': case 'ready2': case 'ready3': case 'ready4': case 'ready5': case 'runArmed': {
      // blade out: he waits in guard or runs with it trailing; after ~2 s of calm he puts it away
      if (moving) { const [dx, dy] = inputDir(inp); moveBy(dx * 74 * dt, dy * 74 * dt); if (s !== 'runArmed') setState('runArmed'); P.still = 0; }
      else { if (s === 'runArmed') setState(pickStance()); P.still += dt; if (P.still > 2) { P.still = 0; setState('sheathe'); } }
      break;
    }
    case 'idle': case 'run': case 'walk': case 'idleGlitch': case 'sit': case 'sitDown': {
      if (moving) {
        // hold V to walk; both speeds come from his personality
        const [dx, dy] = inputDir(inp), gait = held.has('walk') ? 'walk' : 'run';
        moveBy(dx * P.gait[gait] * dt, dy * P.gait[gait] * dt);
        if (s !== gait) setState(gait);
        if (EL.cur.kit && Math.floor(T / .09) !== Math.floor((T - dt) / .09)) EL.cur.kit.step(P.x, P.y);   // his footsteps leave the element behind
        P.still = 0;
      } else {
        P.still += dt;
        if (s === 'run' || s === 'walk') setState('idle');
        if (s === 'idle' && P.still > 4) { setState('idleGlitch'); P.still = 0; const k = EL.cur.kit; if (k) { if (k.idle) k.idle(); else k.residue(P.x, P.y, 6); } }
        if (s === 'idleGlitch' && T >= D) setState('idle');
        if (s === 'sitDown' && T >= D) setState('sit');
      }
      break;
    }
    case 'slide': {
      const sp = 260 * (1 - u) + 50;
      moveBy(P.slideDir[0] * sp * dt, P.slideDir[1] * sp * dt);
      if (u < .7 && Math.random() < .5) dust(1, P.slideDir[0]);
      if (EL.cur.kit && u < .8 && Math.random() < .5) EL.cur.kit.step(P.x - P.slideDir[0] * 4, P.y);   // the slide smears the element along the floor
      if (Math.floor(T / .04) !== Math.floor((T - dt) / .04)) ghost();
      if (T >= D + .08) setState(moving ? 'run' : 'idle');
      break;
    }
    case 'jump': case 'fall': {
      if (moving) { const [dx, dy] = inputDir(inp); moveBy(dx * 70 * dt, dy * 70 * dt); }
      P.vz -= 520 * dt; P.z += P.vz * dt;
      if (s === 'jump' && P.vz < 0) { P.state = 'fall'; P.t = 0; }
      if (P.z <= 0) { P.z = 0; P.vz = 0; setState('land'); dust(8); if (EL.cur.kit) for (let i = 0; i < 4; i++) EL.cur.kit.step(P.x + rr(-4, 4), P.y); }
      break;
    }
    case 'land': if (T >= D) setState(moving ? 'run' : 'idle'); break;
    case 'slash1': case 'slash1r': case 'slash2': case 'slash3': case 'slash4': case 'slash5': case 'slash6': {
      // one fluid motion: the lunge travels with the hips through the cut, the strike lands as the blade passes level.
      // J again during a cut's follow-through flows into the next, as far as his basic skill reaches (player/combo.js)
      const c = CUTS[s], SK = c.sk, nx = nextCut(s);
      if (once('go', true)) P.cutFace = P.face;
      const fd = P.cutFace;
      if (c.spin) P.face = T >= c.spin[0] && T < c.spin[1] ? -fd : fd;   // the whirl: his back to the enemy for a beat
      if (T >= SK - .05 && T < SK + .08) moveBy(fd * c.lunge * dt, 0);
      if (c.hop) { const [h0, h1] = c.hop, k = (T - h0) / (h1 - h0); P.z = k > 0 && k < 1 ? Math.round(Math.sin(k * Math.PI) * c.height) : 0; }
      if (c.step && once('step', T >= c.step[0])) { const x0 = P.x, y0 = P.y; ghost(.05); P.inv = true; residue(x0, y0, 8);
        blink(c.step[1], [fd, 0]); residue(P.x, P.y, 8); P.stepFrom = [x0, y0];
        cuts.push({ x0: Math.round(Math.min(x0, P.x)), x1: Math.round(Math.max(x0, P.x)), y: Math.round(P.y - 12), life: .16, max: .16 });
        hitSeg(s, x0, y0 - 12, P.x, P.y - 12, 16); }
      if (c.step && T >= SK + .1) P.inv = false;
      if (once('strike', T >= SK)) {
        if (c.kick) { P.flash = .034; dust(10, fd); S.shake = Math.max(S.shake, 2 / 60);
          rings.push({ x: P.x + fd * 14, y: P.y - 9, rx: 8, ry: 5, life: 2 / 60 }); }
        else strike(c.rot, c.flip, !!c.big);
        ghost();
        if (c.big) { P.flash = .05; S.shake = Math.max(S.shake, 2 / 60); dust(8); }
        if (!c.kick) for (let k = 0; k < 5; k++) { const life = rr(.06, .12); frags.push({ x: P.x - fd * rr(4, 20), y: P.y - rr(4, 24), w: 3 + (Math.random() * 7 | 0), col: k % 2 ? '#ffffff' : COL.fx2, vx: fd * rr(10, 30), vy: 0, life, max: life, jx: 0, on: true }); } }
      if (once('trail', T >= SK + .03)) ghost();
      if (T >= SK && T < SK + .1) { const kind = s === 'slash1r' ? 'slash1' : s;
        if (c.around) hit(kind, P.x + fd * 4, P.y - 12, reach(14, 26)[1]);   // the spin cuts all the way round
        else { const [d, r] = reach(c.big ? 18 : c.kick ? 12 : 14, c.big ? 28 : c.kick ? 18 : 22); hit(kind, P.x + fd * d, P.y - 12, r); } }
      if (nx && inp.slash && T > .15) P.combo = true;
      if (nx && P.combo && T >= GO) { P.z = 0; P.face = fd; P.inv = false; setState(nx); break; }   // flow straight out of the follow-through
      if (T >= D) { P.z = 0; P.face = fd; P.inv = false; P.armed = true; P.still = 0; setState(afterAttack(moving)); }
      break;
    }
    case 'tele': {
      P.inv = true;
      if (u >= .45 && !P.moved) { P.moved = true; const fx = P.x, fy = P.y; blink(56, P.blinkDir);
        if (EL.cur.kit) { EL.cur.kit.travel(fx, fy); mirrorCut(fx, fy); break; }
        residue(fx, fy, 12); residue(P.x, P.y, 12); storm(P.x, P.y); mirrorCut(fx, fy);
        const n = Math.hypot(P.x - fx, P.y - fy) | 0;
        for (let i = 0; i < n; i += 2) spark(fx + (P.x - fx) * i / n, fy - 12 + (P.y - fy) * i / n + (Math.random() - .5) * 10, 0, 0, .18, COL.fx, false); }
      if (T >= D) { P.moved = false; P.inv = false; setState('idle'); }
      break;
    }
    case 'double': {
      if (P.cv) { charged(dt); break; }
      // I held past the tap window (or P, which always charges): hold the crouch's clean frame 1 and charge; letting go fires
      const hk = P.hk || 'double';
      if (P.charge != null || (T >= (hk === 'rift' ? 0 : TAP) && T < TAP + .03 && held.has(hk))) { P.t = TAP; P.inv = true; P.fr = 1;
        if (held.has(hk)) chargeUp(dt, inp); else release(hk === 'rift' ? RIFT : TC, hk === 'rift' ? .5 : 0);
        break; }
      if (hk === 'rift') { release(RIFT, .5); break; } // P tapped and let go before the first frame: a mid-size rift
      P.inv = T < .2;
      if (T >= .15 && !P.moved) { P.moved = true; const fx0 = P.x, fy0 = P.y; blink(44, P.blinkDir); residue(fx0, fy0, 8); }
      // two big crescents crossing like an X, 0.1 s apart, the second drawing a cut line through the target
      if (once('c1', T >= .225)) { strike(-.5, 1, true); moveBy(P.face * 3, 0); }
      if (once('c2', T >= .325)) { strike(.5, -1, true); moveBy(P.face * 3, 0);
        cuts.push({ x0: P.x + P.face * 2, x1: P.x + P.face * 48, y: Math.round(P.y - 12), life: .1, max: .1 }); }
      const [rd, rr2] = reach(14, 26);
      if (T >= .225 && T < .3) hit('d1', P.x + P.face * rd, P.y - 12, rr2);
      if (T >= .325 && T < .4) hit('d2', P.x + P.face * rd, P.y - 12, rr2);
      // the sheath click: whatever he cut bursts now, a beat after the blades
      if (once('click', T >= .6)) { spark(P.x + P.face * 3, P.y - 10, 0, -10, .12, '#ffffff', false); sheathClick();
        if (P.struck.size) { S.hitstop = .06; S.shake = 1 / 60; for (const d of P.struck) burst(d); } }
      if (T >= D) { P.moved = false; P.inv = false; P.armed = false; setState('idle'); }
      break;
    }
    case 'sheathe': {
      if (once('flick', T >= .12)) for (let k = 0; k < 4; k++) spark(P.x + P.face * rr(8, 14), P.y - rr(6, 12), P.face * rr(20, 50), rr(-10, 10), .15, COL.fx2, true);
      if (once('click', T >= .82)) { P.armed = false; sheathClick(); spark(P.x + P.face * 3, P.y - 12, P.face * 6, -12, .12, '#ffffff', false); }
      if (moving) { setState(P.armed ? 'runArmed' : 'run'); break; }
      if (T >= D) setState('idle');
      break;
    }
    case 'sweep': {
      const cx = P.x, cy = P.y - 13, W = pT('sweep', 'r'), KNEEL = .3, RISE = 1.3, TOP = 1.7, SLAM = 1.8;
      // the gather: stone chips lift off the floor all around, drift in and start circling him
      if (T >= KNEEL && T < RISE) { const k = (T - KNEEL) / (RISE - KNEEL);
        if (Math.random() < .35 + k * .5) gather(P.x, P.y);
        if (Math.random() < k * .5 && debris.length > 3) { const a = debris[Math.random() * debris.length | 0], b = debris[Math.random() * debris.length | 0];
          if (a !== b) zap(...debrisXY(a), ...debrisXY(b), rr(.04, .07), 1.4, Math.random() < .6 ? COL.fx : COL.fx2); }
        if (Math.random() < .4) { const a = rr(0, 6.28), R = rr(34, 60); spark(P.x + Math.cos(a) * R, P.y + Math.sin(a) * R * .45, -Math.cos(a) * 40, -Math.sin(a) * 18, .5, '#8f9692'); } }
      // the cyclone: bolts whipping round him in a rising spiral while he comes up out of the kneel
      if (T >= RISE && T < TOP) { const k = (T - RISE) / (TOP - RISE);
        P.z = Math.round(k * 7);
        for (let i = 0; i < 2; i++) { const a = T * 26 + i * Math.PI + rr(-.3, .3), R = 10 + k * 8, y = P.y - 4 - k * 20 - rr(0, 6);
          zap(cx + Math.cos(a) * R, y, cx + Math.cos(a + 1.1) * R, y + Math.sin(a) * 3, rr(.05, .09), 1.6, [COL.fx, COL.fx2, '#ffffff'][i + (Math.random() * 2 | 0)]); }
        if (Math.random() < .5) { const a = rr(0, 6.28); spark(cx + Math.cos(a) * 30, P.y - 1, -Math.cos(a) * 60, -rr(5, 20), .3, '#8f9692'); } }
      if (T >= TOP && T < SLAM) P.z = 8;
      if (once('slam', T >= SLAM)) {
        fling(P.x, P.y); powerCast();
        P.z = 0; P.flash = .05; S.hitstop = .08; S.shake = .3; P.shakeAmp = 3;
        const n = 10 + (Math.random() * 4 | 0);
        for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2 + rr(-.2, .2), R = rr(48, 60) * W;
          zap(cx + P.face * 8, P.y - 2, cx + P.face * 8 + Math.cos(a) * R, P.y - 2 + Math.sin(a) * R * .5, rr(.12, .2), 3.2, i % 2 ? '#ffffff' : COL.fx2, { every: 1, fork: true }); }
        rings.push({ x: cx + P.face * 8, y: P.y - 2, rx: 56 * W, ry: 28 * W, life: 1 / 60 });
        rings.push({ x: cx + P.face * 8, y: P.y - 2, rx: 30, ry: 15, life: 2 / 60 });
        crack(cx + P.face * 10, P.y);
        if (pT('sweep', 'pillars')) pillars(cx + P.face * 10, P.y, W);
        dust(24);
      }
      if (T >= SLAM && T < SLAM + .1) hit('sw', cx + P.face * 8, P.y - 6, 60 * W);
      if (T > SLAM + .04 && Math.random() < (1 - (T - SLAM) / .4) * .7) { const a = rr(0, 6.28), R = rr(10, 55), x = cx + Math.cos(a) * R, y = P.y + Math.sin(a) * R * .5;
        zap(x, y, x + rr(-7, 7), y + rr(-4, 4), rr(.06, .12), 2, Math.random() < .7 ? COL.fx : COL.fx2); }
      if (T >= D) { P.z = 0; P.armed = true; P.still = 0; setState(afterAttack(false)); }
      break;
    }
    case 'moonHold': { // O held: he charges in place, blade raised; letting go brings it down
      if (held.has('moon')) chargeUp(dt, inp); else { const pw = P.charge || 0; setState('moon'); P.pow = pw; startCd('moon'); }
      break;
    }
    case 'moon': {
      if (once('cut', T >= .04)) { unleashMoon(P.pow); ghost(); }
      if (T >= D) { P.armed = true; P.still = 0; setState(afterAttack(moving)); }
      break;
    }
    case 'meditate': { // he cannot move; the mirror images step out of him one by one
      P.aura = Math.min(.55, T * 1.2); motes(.25);
      P.mq.forEach((q, j) => { if (once('m' + j, T >= .22 + j * .17)) spawnMirror(j, q); });
      if (T >= 1.4) setState('idle');
      break;
    }
    case 'standUp': {
      if (T >= D) { const q = P.pending || {}; P.pending = null; setState('idle');
        if (q.slash) setState('slash1'); else if (q.tele) { setState('tele'); P.blinkDir = q.dir; startCd('tele'); }
        else if (q.double) { setState('double'); P.blinkDir = q.dir; P.hk = 'double'; startCd('double'); } else if (q.sweep) { setState('sweep'); startCd('sweep'); }
        else if (q.rift) { setState('double'); P.blinkDir = q.dir; P.hk = 'rift'; } else if (q.moon) { setState('moonHold'); P.charge = 0; }
        else if (q.mirror) { meditate(); startCd('mirror'); }
        else if (q.slide) { setState('slide'); P.slideDir = q.dir; dust(6, q.dir[0]); startCd('slide'); } else if (q.jump) { setState('jump'); P.vz = 150; } }
      break;
    }
    default: itemState(s, T, D, dt, moving); break;
    case 'death': {
      if (u > .8 && !P.burst) { P.burst = true; if (EL.cur.kit) EL.cur.kit.residue(P.x, P.y, 16); for (let i = 0; i < 30; i++) spark(P.x + (Math.random() - .5) * 26, P.y - Math.random() * 8, (Math.random() - .5) * 40, -20 - Math.random() * 40, .7, Math.random() < .5 ? COL.fx : COL.body, false); }
      if (T >= D + 1) { P.burst = false; setState('idleGlitch'); }
      break;
    }
  }
}
// power III: bolts climb out of the cracks one after another, straight up, round the slam
function pillars(x, y, W) {
  for (let i = 0; i < 7; i++) { const a = i / 7 * 6.28 + rr(-.3, .3), R = rr(22, 40) * W, px = x + Math.cos(a) * R, py = y + Math.sin(a) * R * .5;
    after(.05 + i * .035, () => { zap(px, py, px + rr(-3, 3), py - rr(26, 38), rr(.12, .18), 2.5, i % 2 ? '#ffffff' : COL.fx2, { every: 1, fork: true }); spark(px, py - 2, 0, -20, .2, COL.fx2, false, 0); }); }
}
