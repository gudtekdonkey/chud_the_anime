import { OX, OY, RC } from '../config.js';
import { KATANA_ART } from '../weapons/katana.js';

// ---- The ronin rig: side view, drawn pixel by pixel from joint angles, so every frame is a pose ----
const HAT_SIDE = ['........GGGG........', '.....GGHHHHHHGG.....', '..GGHHHHHHHHHHHHGG..', '.GBBBBBBBBBBBBBBBBG.', '..KBBBBBBBBBBBBBBK..'];
// pal swaps the colours (the samurai's red-grey); p.bare drops the hat and mantle for a bare head and topknot
export function rig(g, fx, p, pal = RC) {
  const put = (x, y, c) => { g.fillStyle = pal[c]; g.fillRect(fx + Math.round(x), Math.round(y), 1, 1); };
  const blob = (x, y, w, c) => { g.fillStyle = pal[c]; g.fillRect(fx + Math.round(x - (w - 1) / 2), Math.round(y - (w - 1) / 2), w, w); };
  const seg = (a, b, w, c) => { const n = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) * 2));
    for (let i = 0; i <= n; i++) blob(a[0] + (b[0] - a[0]) * i / n, a[1] + (b[1] - a[1]) * i / n, w, c); };
  const poly = (pts, c) => {
    const xs = pts.map(q => q[0]), ys = pts.map(q => q[1]);
    for (let y = Math.floor(Math.min(...ys)); y <= Math.ceil(Math.max(...ys)); y++)
      for (let x = Math.floor(Math.min(...xs)); x <= Math.ceil(Math.max(...xs)); x++) {
        let inside = false;
        for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
          const [xi, yi] = pts[i], [xj, yj] = pts[j];
          if ((yi > y + .5) !== (yj > y + .5) && x + .5 < (xj - xi) * (y + .5 - yi) / (yj - yi) + xi) inside = !inside;
        }
        if (inside) put(x, y, c);
      }
  };
  const hip = [OX + p.hx, OY - 11 + p.hy];
  const up = [Math.sin(p.lean), -Math.cos(p.lean)], fw = [Math.cos(p.lean), Math.sin(p.lean)];
  // breath lifts the chest, shoulders and head but not the hips, so it reads as breathing, not bobbing
  // the chest pivots at the waist (u = 4), so a cut can be driven by the hips and then the chest
  const up2 = [Math.sin(p.lean + p.chest), -Math.cos(p.lean + p.chest)], fw2 = [Math.cos(p.lean + p.chest), Math.sin(p.lean + p.chest)];
  const L = (u, v) => { const b = u > 4 ? p.breath * Math.min(1, (u - 4) / 3) : 0;
    if (u <= 4) return [hip[0] + up[0] * u + fw[0] * v, hip[1] + up[1] * u + fw[1] * v];
    const w = [hip[0] + up[0] * 4, hip[1] + up[1] * 4];
    return [w[0] + up2[0] * (u - 4) + fw2[0] * v, w[1] + up2[1] * (u - 4) + fw2[1] * v - b]; };
  const dir = a => [Math.sin(a), Math.cos(a)];
  const add = (a, d, k) => [a[0] + d[0] * k, a[1] + d[1] * k];
  const leg = ([th, kn], c, off) => { const h = L(0, off), k = add(h, dir(th), 5), f = add(k, dir(th - kn), 6);
    seg(h, k, 2, c); seg(k, f, 2, c); seg(f, [f[0] + 2, f[1]], 1, c); };
  const arm = ([sh, el], c) => { const s = L(7, 0), e = add(s, dir(sh), 4), h = add(e, dir(sh + el), 4);
    seg(s, e, 2, c); seg(e, h, 1, c); blob(h[0], h[1], 2, c); return h; };
  const mouth = L(1.5, 2), sd = [-Math.cos(.32), Math.sin(.32)];

  if (p.noUpper) {   // cut in two: only the pelvis and legs are left, and they fold on their own
    leg(p.bl, 'D', -.5); poly([L(0, -2), L(0, 2), L(2.6, 2.2), L(2.6, -2.2)], 'K'); leg(p.fl, 'K', .5); return;
  }
  // the weapon's art draws itself through these hooks (src/weapons/); a pose carries it as p.wp, the katana if none
  const wp = p.wp || KATANA_ART, kit = { put, seg, blob, add, L };
  // far side first: scabbard, far arm, far leg
  wp.far(kit, p, mouth, sd);
  // the back hand can carry the blade too, for the counter stances
  const bh = arm(p.ba, 'D');
  if (wp.offHand) wp.offHand(kit, p, bh);                  // a second weapon in the back hand (twin blades)
  leg(p.bl, 'D', -.5);
  // torso, near leg
  poly([L(0, -2), L(0, 2), L(7, 2.3), L(8.2, 1.4), L(8.2, -1.6), L(7, -2.4)], 'K');
  for (let v = -2; v <= 2; v++) put(...L(2.2, v), 'D');                       // obi line
  leg(p.fl, 'K', .5);
  // head and hat
  // neck: the head lags and lolls on it (+ forward), carried by the chest
  const nk = p.neck || 0, hc = L(10 - p.bow * .7 - Math.abs(nk) * 1.2, .6 + p.bow * 1.1 + nk * 2.2);
  if (!p.noHead) {   // noHead: the head has come off and is its own piece now
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1.5; dx <= 1.5; dx++) put(hc[0] + dx, hc[1] + dy, 'K');
    const hf = p.headFlip ? -1 : 1;   // headFlip: the head is wrenched round to face backward
    put(hc[0] + 1.5 * hf, hc[1], p.dim ? 'e' : 'E');
    if (p.bare) { for (let dx = -1.5; dx <= 1.5; dx++) put(hc[0] + dx, hc[1] - 2, 'K'); put(hc[0] - hf, hc[1] - 3, 'K'); put(hc[0] - 2 * hf, hc[1] - 4, 'K'); put(hc[0] - 2 * hf, hc[1] - 3, 'D'); }
  }
  const hx0 = Math.round(hc[0]) - 9 + p.hat, hy0 = Math.round(hc[1]) - 6;
  if (!p.bare) HAT_SIDE.forEach((r, y) => [...r].forEach((ch, x) => { if (ch !== '.') put(hx0 + x - fx + fx, hy0 + y, ch); }));
  // mantle over the shoulders, its back tip lifting a hair with the flutter
  const f = p.flutter;
  // it drapes flat down the back instead of standing off it, so it no longer reads as a hump
  if (!p.bare) { poly([L(8.4, 2.3), L(8.9, -1.6), L(6.8, -2.9), L(3.0, -3.0 - f * .7), L(3.6, -1.2), L(5.4, 2.7)], 'M');
    seg(L(8.4, 2.1), L(8.8, -1.4), 1, 'm');
    if (f > .5) put(...L(2.6, -3.4), 'M'); }
  // the back hand's blade is drawn over the body and the sash, so it is never lost behind them
  if (p.bsword != null) wp.backHeld(kit, bh, p.bsword);
  // near arm and the weapon: stowed, sliding home, or in the hand
  const hand = arm(p.fa, 'K');
  if (p.sword === null && !p.sheathing && p.bsword == null && !p.empty) wp.stowed(kit, p, mouth, sd);
  else if (p.sheathing) wp.sheathing(kit, hand, mouth);
  else if (p.sword !== null) wp.held(kit, hand, p.sword);
}
