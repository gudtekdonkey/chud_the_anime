import { COL } from '../config.js';
import { g } from '../screen.js';
import { P, S, INV } from '../state.js';
import { zap } from '../fx/bolts.js';
import { rr, sgn, residue, ring, spark } from '../fx/util.js';
import { setState, once, blink, afterAttack } from '../player/actions.js';
import { chainHit } from '../player/qi.js';
import { WS } from './item-sprites.js';
import { tinted } from '../ui/sprites.js';
import { takeQuick, heal } from './inventory.js';
import { arc, plusPop } from './item-fx.js';
import { DUMMIES } from '../world/dummies.js';

// ---- Consumables, used from quick slots 1-4: each use is short so it never breaks a fight (incense is the slow heal) ----
const WH = '#ffffff', CY = '#6ff3e4', CY2 = '#b8fff6';
export const USE_STATE = { bomb: 'bomb', talisman: 'talisman', whetstone: 'whet', incense: 'incense' };
export const EDGE_T = 20;
export function useQuick(i) { const id = takeQuick(i); if (!id) return false; setState(USE_STATE[id]); P.useSlot = i; if (id === 'whetstone') INV.edgeSlot = i; return true; }
const hand = () => [P.x + P.face * 3, P.y - 27];   // the raised hand, roughly, in the RAISE pose
const nearest = (x, y, skip, max) => { let b = null, best = max; for (const d of DUMMIES) { const r = Math.hypot(d.x - x, (d.y - y) * 1.3); if (d !== skip && r < best) { best = r; b = d; } } return b; };
let cloud = null, stick = null;
export const USE = {
  // dash it at his feet: black static; enemies lose him and he glitches a few steps back
  bomb(T) {
    if (once('go', true)) P.bx = P.x;
    P.hidden = T >= .15 && T < .32;
    if (once('boom', T >= .15)) { const cx = P.bx + P.face * 6, cy = P.y - 2; residue(P.bx, P.y, 10); S.hitstop = .04; S.shake = .05; ring(cx, P.y - 1, 4, 2, .2, 3.5);
      P.unseen = 2;   // for the enemies: they lose track of him for 2 s
      cloud = { x: cx, y: cy, t: 0, za: 0, p: Array.from({ length: 320 }, (_, i) => { const a = rr(0, 6.28), r = Math.sqrt(Math.random());
        return { dx: Math.cos(a) * r * 24, dy: -Math.abs(Math.sin(a)) * r * 20 + rr(-2, 3), c: ['#0c0d11', '#1b1e25', '#2c323b', '#1b1e25', '#565e66'][i % 5], die: rr(1.05, 1.7), w: 1 + (i % 2 === 0) }; }) }; }
    if (once('back', T >= .32)) { blink(34, [-P.face, 0]); P.glitchNow = .25; residue(P.x, P.y, 6); }
  },
  // raise it: lightning strikes the nearest enemy and jumps once, at no Qi cost
  talisman(T) {
    const [hx, hy] = hand();
    if (once('call', T >= .2)) { residue(hx, hy + 4, 6); zap(hx, hy - 7, hx + 3, -4, .08, 2, CY2); }
    if (once('hit1', T >= .24)) { const a = P.t1 = nearest(P.x, P.y, null, 220); if (a) { zap(a.x + 2, -4, a.x, a.y - 16, .22, 3, WH); zap(a.x - 2, -4, a.x, a.y - 16, .2, 3, CY);
      ring(a.x, a.y, 5, 2, .25, 2.8, CY); for (let i = 0; i < 10; i++) { const r = rr(0, 6.28); spark(a.x, a.y - 14, Math.cos(r) * 120, Math.sin(r) * 80, rr(.1, .2), [WH, CY2, CY][i % 3], true); }
      chainHit(a); S.hitstop = .07; S.shake = .05; } }
    if (once('hit2', T >= .36) && P.t1) { const a = P.t1, b = nearest(a.x, a.y, a, 130); if (b) { zap(a.x, a.y - 14, b.x, b.y - 14, .2, 2.5, CY); zap(a.x, a.y - 14, b.x, b.y - 14, .14, 3, CY2);
      chainHit(b); S.hitstop = .05; S.shake = 1 / 60; } }
  },
  // draw and hone: sparks run along the blade, then the edge turns cyan for 20 s
  whet(T, dt, moving) {
    const bl = INV.weapon === 'nodachi' ? 19 : 13, bx = k => P.x + P.face * (7 + k * bl), by = P.y - 16;
    if (T >= .12 && T < .5 && (P.sp = (P.sp || 0) + dt) > .03) { P.sp = 0; const k = ((T - .12) % .26) / .26; spark(bx(k), by, P.face * rr(10, 60), rr(-50, -10), rr(.08, .16), Math.random() < .5 ? WH : CY2, true); }
    if (once('lit', T >= .5)) { INV.edge = EDGE_T; S.hitstop = .05; for (let k = 0; k < 1; k += .1) if (Math.random() < .5) spark(bx(k), by, rr(-20, 20), rr(-40, -5), rr(.12, .25), Math.random() < .5 ? CY : CY2, false); }
    if (T >= .8) { P.armed = true; P.still = 0; setState(afterAttack(moving)); return true; }
  },
  // kneel and light it: heals 60% over 1.5 s; moving or a hit puts it out
  incense(T, dt, moving) {
    if (once('go', true)) stick = { x: P.x + P.face * 12, y: P.y, t: 0, lit: true };
    if (moving && T > .1) { putOut(); setState('run'); return true; }
    const H0 = .3, H1 = 1.8;
    if (T > H0 && T < H1) { heal(.6 * dt / (H1 - H0));
      if ((P.pa = (P.pa || 0) + dt) > .32) { P.pa = 0; plusPop(P.x + rr(-4, 5), P.y - 18); }
      if ((P.th = (P.th || 0) + dt) > .05) { P.th = 0; arc(stick.x + rr(-1, 1), stick.y - 6, { dur: .7, h: 9, col: '#d6dad6', col2: CY2, trail: false }); } }
    if (once('done', T >= H1)) stick.lit = false;
  },
};
export function putOut() { if (stick && stick.lit) { stick.lit = false; spark(stick.x, stick.y - 5, 0, -12, .5, '#7d868e'); } }
export function updateQuickFx(dt) {
  if (cloud) { cloud.t += dt; if (cloud.t > 1.8) cloud = null;
    else if (cloud.t < 1.05 && (cloud.za += dt) > .07) { cloud.za = 0; const a = rr(0, 6.28), x = cloud.x + Math.cos(a) * rr(0, 14), y = cloud.y - rr(2, 12); zap(x, y, x + rr(-7, 7), y + rr(-4, 4), .06, 1.2, Math.random() < .5 ? CY : CY2); } }
  if (stick) { stick.t += dt; if (!stick.lit && stick.t > 3) stick = null; }
}
// world-space pieces that sort by depth: the static cloud and the incense stick
export function quickDrawables() {
  const out = [];
  if (cloud) out.push({ y: cloud.y + 3, d: () => { const c = cloud, ta = c.t, k = Math.min(1, ta / .12), f = Math.floor(ta * 30);
    c.p.forEach((p, i) => { if (ta > p.die || (i * 7 + f) % 11 === 0) return; const j = (i + f) % 4 === 0 ? sgn() : 0;
      g.fillStyle = p.c; g.fillRect(Math.round(c.x + p.dx * k + j), Math.round(c.y + p.dy * k - ta * 3), p.w, 1); }); } });
  if (stick) out.push({ y: stick.y + 2, d: () => { const s = stick, burn = Math.min(1, Math.max(0, (s.t - .25) / 1.55)), h = Math.round(6 - 4 * burn);
    g.fillStyle = '#0c0d11'; g.fillRect(s.x - 1, s.y + 1, 3, 1); g.fillStyle = '#565e66'; g.fillRect(s.x, s.y + 1 - h, 1, h);
    if (s.lit && s.t > .25) { g.fillStyle = Math.floor(s.t * 12) % 2 ? CY : WH; g.fillRect(s.x, s.y - h, 1, 1); } } });
  return out;
}
// over the world: the bomb in flight, the talisman held up
export function drawQuickOver() {
  const T = P.t;
  if (P.state === 'bomb' && T >= .07 && T < .15) { const [hx, hy] = hand(), k = (T - .07) / .08, bx = hx + (P.x + P.face * 7 - hx) * k, by = hy + (P.y - 1 - hy) * k * k;
    g.drawImage(WS.bomb.c, Math.round(bx) - 3, Math.round(by) - 4); }
  if (P.state === 'talisman' && T < .24) { const [hx, hy] = hand(); g.drawImage(T > .1 && T < .16 && Math.floor(T * 60) % 2 ? tinted(WS.talisman, WH) : WS.talisman.c, Math.round(hx) - 1, Math.round(hy) - 8); }
}
