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
import { living } from '../world/enemies.js';

// ---- Consumables, used from quick slots 1-4: each use is short so it never breaks a fight (incense is the slow heal) ----
const WH = '#ffffff', CY = '#6ff3e4', CY2 = '#b8fff6';
export const USE_STATE = { bomb: 'bomb', talisman: 'talisman', whetstone: 'whet', incense: 'incense' };
export const EDGE_T = 20, SMOKE_T = 6;   // the whetstone's edge; the bomb's smoke over the whole screen
export function useQuick(i) { const id = takeQuick(i); if (!id) return false; setState(USE_STATE[id]); P.useSlot = i; if (id === 'whetstone') INV.edgeSlot = i; return true; }
const hand = () => [P.x + P.face * 3, P.y - 27];   // the raised hand, roughly, in the RAISE pose
const nearest = (x, y, skip, max) => { let b = null, best = max; for (const d of living()) { const r = Math.hypot(d.x - x, (d.y - y) * 1.3); if (d !== skip && r < best) { best = r; b = d; } } return b; };
let cloud = null, stick = null, smoke = null;
const SMOKE_COLS = ['#0c0d11', '#1b1e25', '#2c323b', '#1b1e25', '#565e66'];
// the smoke's body: pixel-edged blobs of dark static baked once, two layers that drift against each other
const smokeLayer = seed => { const c = document.createElement('canvas'); c.width = 520; c.height = 300; const cg = c.getContext('2d'); let r = seed;
  const rnd = () => (r = (r * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < 520; i++) { const x = rnd() * 520, y = rnd() * 300, R = 4 + rnd() * 12; cg.fillStyle = SMOKE_COLS[i % 4]; cg.globalAlpha = .22;
    for (let dy = -R; dy <= R; dy++) { const w = Math.round(Math.sqrt(R * R - dy * dy) * 1.5); cg.fillRect(Math.round(x - w), Math.round(y + dy * .7), 2 * w, 1); } }
  return c; };
const SMOKE_BODY = [smokeLayer(7), smokeLayer(29)];
export const USE = {
  // dash it at his feet: black static; enemies lose him and he glitches a few steps back
  bomb(T) {
    if (once('go', true)) P.bx = P.x;
    P.hidden = T >= .15 && T < .32;
    if (once('boom', T >= .15)) { const cx = P.bx + P.face * 6, cy = P.y - 2; residue(P.bx, P.y, 10); S.hitstop = .04; S.shake = .05; ring(cx, P.y - 1, 4, 2, .2, 3.5);
      S.smoke = SMOKE_T; P.unseen = SMOKE_T;   // enemies lose him, and every one of them is open to K while it lasts
      smoke = { x: cx, y: P.y, t: 0, za: 0, p: Array.from({ length: 2200 }, (_, i) => { const x = rr(0, 480), y = rr(28, 270), d = Math.hypot(x - cx, (y - P.y) * 1.4);
        return { x, y, d: d / 900, c: SMOKE_COLS[i % 5], die: SMOKE_T - rr(0, 1.6), w: 1 + (i % 3 === 0), ph: rr(0, 6.28) }; }) };
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
      chainHit(a, P.x); S.hitstop = .07; S.shake = .05; } }
    if (once('hit2', T >= .36) && P.t1) { const a = P.t1, b = nearest(a.x, a.y, a, 130); if (b) { zap(a.x, a.y - 14, b.x, b.y - 14, .2, 2.5, CY); zap(a.x, a.y - 14, b.x, b.y - 14, .14, 3, CY2);
      chainHit(b, a.x); S.hitstop = .05; S.shake = 1 / 60; } }
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
  S.smoke = Math.max(0, S.smoke - dt);
  if (smoke) { smoke.t += dt; if (smoke.t > SMOKE_T) smoke = null;
    else if ((smoke.za += dt) > .05 && smoke.t < SMOKE_T - 1) { smoke.za = 0; const x = rr(20, 460), y = rr(50, 262); if (Math.hypot(x - smoke.x, y - smoke.y) / 900 < smoke.t) zap(x, y, x + rr(-8, 8), y + rr(-5, 5), .06, 1.2, Math.random() < .5 ? CY : CY2); } }
}
// the smoke on the floor across the whole screen, rolling out from the burst; he and the enemies stand in it (under the depth sort)
export function drawSmoke(front) {
  if (!smoke) return; const c = smoke, t = c.t, f = Math.floor(t * 20);
  // it rolls out from the burst to fill the screen in about half a second, holds, and thins over the last 1.5 s
  const a = Math.min(1, (SMOKE_T - t) / 1.5), R = t * 900;
  g.save(); g.beginPath(); g.ellipse(c.x, c.y, R, R / 1.4, 0, 0, 6.29); g.clip();
  SMOKE_BODY.forEach((L, i) => { g.globalAlpha = (front ? .28 : .75) * a; g.drawImage(L, Math.round(-20 + Math.sin(t * .5 + i * 2) * 12 * (i ? -1 : 1)), Math.round(-15 - (front ? 10 : 0) - t * (i + 1)), 520, 300); });
  g.restore();
  g.globalAlpha = front ? .45 : 1;
  c.p.forEach((p, i) => { if (front && i % 4) return; const k = t - p.d; if (k < 0 || t > p.die || (i * 7 + f) % 13 === 0) return;
    const j = (i + f) % 5 === 0 ? sgn() : 0, rise = front ? 6 + (i % 7) * 3 : 0;
    g.fillStyle = p.c; g.fillRect(Math.round(p.x + Math.sin(t * .8 + p.ph) * 3 + j), Math.round(p.y - rise - Math.min(1, k * 4) * 2), p.w, 1); });
  g.globalAlpha = 1;
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
