import { OX, OY } from '../config.js';

// ---- The ronin rig: side view, drawn pixel by pixel from joint angles into a depth raster (src/wardrobe/raster.js), so every frame is a pose ----
// The body only: the hat and everything else he wears are items (src/wardrobe/items.js).
// Every part carries a depth (Z), so the clothing drawn into the same raster layers between his limbs:
// the far arm and leg behind the body, the near arm over whatever he wears, a held blade over everything.
// The depths follow the old painter's order, so the bare rig draws exactly what it always did.
const Z = { scab: -3.5, farArm: -3, farLeg: -2.5, body: 0, obi: .01, nearLeg: 1.2, head: 2.5, eye: 2.51, bblade: 40, nearArm: 45, blade: 50 };
export const NEAR_ARM_Z = Z.nearArm;
export function rig(R, p) {
  let z = 0;
  const put = (x, y, c) => R.px(Math.round(x), Math.round(y), z, c);
  const blob = (x, y, w, c) => { const x0 = Math.round(x - (w - 1) / 2), y0 = Math.round(y - (w - 1) / 2);
    for (let j = 0; j < w; j++) for (let i = 0; i < w; i++) R.px(x0 + i, y0 + j, z, c); };
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
    z = Z.farLeg; leg(p.bl, 'D', -.5); z = Z.body; poly([L(0, -2), L(0, 2), L(2.6, 2.2), L(2.6, -2.2)], 'K'); z = Z.nearLeg; leg(p.fl, 'K', .5); return { hc: null };
  }
  // far side first: scabbard, far arm, far leg
  z = Z.scab; seg(mouth, add(mouth, sd, 12), 1, 's'); put(...add(mouth, sd, 12), 'S');
  // the back hand can carry the blade too, for the counter stances
  z = Z.farArm; const bh = arm(p.ba, 'D');
  z = Z.farLeg; leg(p.bl, 'D', -.5);
  // torso, near leg
  z = Z.body; poly([L(0, -2), L(0, 2), L(7, 2.3), L(8.2, 1.4), L(8.2, -1.6), L(7, -2.4)], 'K');
  z = Z.obi; for (let v = -2; v <= 2; v++) put(...L(2.2, v), 'D');                       // obi line
  z = Z.nearLeg; leg(p.fl, 'K', .5);
  // head: it lags and lolls on the neck (+ forward), carried by the chest
  const nk = p.neck || 0, hc = L(10 - p.bow * .7 - Math.abs(nk) * 1.2, .6 + p.bow * 1.1 + nk * 2.2);
  if (!p.noHead) {   // noHead: the head has come off and is its own piece now
    z = Z.head; for (let dy = -1; dy <= 1; dy++) for (let dx = -1.5; dx <= 1.5; dx++) put(hc[0] + dx, hc[1] + dy, 'K');
    const hf = p.headFlip ? -1 : 1;   // headFlip: the head is wrenched round to face backward
    z = Z.eye; put(hc[0] + 1.5 * hf, hc[1], p.dim ? 'e' : 'E');
    // bare: the samurai's bare head and topknot (the ronin's hair and hat are items)
    z = Z.head; if (p.bare) { for (let dx = -1.5; dx <= 1.5; dx++) put(hc[0] + dx, hc[1] - 2, 'K'); put(hc[0] - hf, hc[1] - 3, 'K'); put(hc[0] - 2 * hf, hc[1] - 4, 'K'); put(hc[0] - 2 * hf, hc[1] - 3, 'D'); }
  }
  // (the hat and the mantle are clothing now: src/wardrobe/items.js)
  // the back hand's blade is drawn over the body and the sash, so it is never lost behind them
  z = Z.bblade;
  if (p.bsword != null) { const d = [Math.cos(p.bsword), Math.sin(p.bsword)]; blob(bh[0], bh[1], 2, 'D'); seg(bh, add(bh, d, -2.5), 1, 'K'); put(...bh, 'S'); seg(add(bh, d, 1), add(bh, d, 13), 1, 'W'); }
  // near arm and the sword
  z = Z.nearArm; const hand = arm(p.fa, 'K');
  z = Z.blade;
  if (p.sword === null && !p.sheathing && p.bsword == null && !p.empty) {                    // sheathed (empty: no sword at all): hilt pokes forward-up out of the scabbard
    put(...mouth, 'S'); seg(add(mouth, sd, -1), add(mouth, sd, -3.5), 1, 'W');
  } else if (p.sheathing) {                                  // sliding home: blade runs from the hand into the scabbard mouth
    seg(hand, mouth, 1, 'W'); put(...hand, 'S'); put(...add(hand, [hand[0] - mouth[0], hand[1] - mouth[1]].map(v => v / (Math.hypot(hand[0] - mouth[0], hand[1] - mouth[1]) || 1)), 2), 'K');
  } else if (p.sword !== null) {
    const d = [Math.cos(p.sword), Math.sin(p.sword)];
    seg(hand, add(hand, d, -2.5), 1, 'K'); put(...hand, 'S');
    seg(add(hand, d, 1), add(hand, d, 13), 1, 'W');
  }
  return { hc };   // the head's centre, so the hat, hair and masks sit on exactly the pixels the head does
}
