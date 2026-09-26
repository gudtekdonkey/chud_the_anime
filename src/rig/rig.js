import { FW, FH, OX, OY, RC } from '../config.js';
import { KATANA_ART } from '../weapons/katana.js';
import { HILT } from './pose.js';

// ---- The ronin rig: side view, drawn pixel by pixel from joint angles, so every frame is a pose ----
// Two outputs share one drawing:
//   rig(g, fx, p, pal): straight onto a canvas in painter's order, the hat and mantle drawn with him (the samurai, the executions' pieces).
//   rigR(R, p): into a depth raster (src/wardrobe/raster.js), the body only: what he wears is items (src/wardrobe/items.js) layered
//   between his limbs by depth: the far arm and leg behind the body, the near arm over whatever he wears, a held blade over everything.
// The depths follow the painter's order, so the bare raster rig draws exactly what the canvas rig does without the hat and mantle.
// it works in its original 48x48 frame (feet at 24, 40) and is shifted by whole pixels into the bigger frame, so the rounding
//   of every pose stays exactly as it was
export const RX = 24, RY = 40;
const DX = OX - RX, DY = OY - RY;
const Z = { scab: -3.5, farArm: -3, offHand: -2.9, farLeg: -2.5, body: 0, obi: .01, nearLeg: 1.2, head: 2.5, eye: 2.51, hat: 3, mantle: 3.5, bblade: 40, nearArm: 45, blade: 50 };
export const NEAR_ARM_Z = Z.nearArm;
const HAT_SIDE = ['........GGGG........', '.....GGHHHHHHGG.....', '..GGHHHHHHHHHHHHGG..', '.GBBBBBBBBBBBBBBBBG.', '..KBBBBBBBBBBBBBBK..'];
// pal swaps the colours (the samurai's red-grey); p.bare drops the hat and mantle for a bare head and topknot
export function rig(g, fx, p, pal = RC) {
  // pixels past the frame's edge are dropped, so a long weapon never bleeds into the next frame of the sheet
  return draw((x, y, z, c) => { if (x < 0 || x >= FW || y < 0 || y >= FH) return; g.fillStyle = pal[c]; g.fillRect(fx + x, y, 1, 1); }, p, true);
}
// returns the head's centre, so the hat, hair and masks sit on exactly the pixels the head does.
// left: his true left side, still facing right (dress.js mirrors it after): the same pixels with his left arm and leg the
// near ones, the scabbard at the near hip, the sword arm behind him. Only the raster keeps it right (depths, not paint order).
export const rigR = (R, p, left = false) => draw((x, y, z, c) => R.px(x, y, z, c), p, false, left);

function draw(out, p, clothed, left = false) {
  let z = 0;
  const put = (x, y, c) => out(DX + Math.round(x), DY + Math.round(y), z, c);
  const blob = (x, y, w, c) => { const x0 = Math.round(x - (w - 1) / 2), y0 = Math.round(y - (w - 1) / 2);
    for (let j = 0; j < w; j++) for (let i = 0; i < w; i++) out(DX + x0 + i, DY + y0 + j, z, c); };
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
  const hip = [RX + p.hx, RY - 11 + p.hy];
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
  const arm = ([sh, el], c, zf = z) => { const s = L(7, 0), e = add(s, dir(sh), 4), h = add(e, dir(sh + el), 4);
    seg(s, e, 2, c); z = zf; seg(e, h, 1, c); blob(h[0], h[1], 2, c); return h; };
  const mouth = L(1.5, 2), sd = [-Math.cos(.32), Math.sin(.32)];

  if (p.noUpper) {   // cut in two: only the pelvis and legs are left, and they fold on their own
    z = Z.farLeg; leg(p.bl, 'D', -.5); z = Z.body; poly([L(0, -2), L(0, 2), L(2.6, 2.2), L(2.6, -2.2)], 'K'); z = Z.nearLeg; leg(p.fl, 'K', .5); return { hc: null };
  }
  // the weapon's art draws itself through these hooks (src/weapons/); a pose carries it as p.wp, the katana if none
  const wp = p.wp || KATANA_ART, kit = { put, seg, blob, add, L, p };
  // his left side (true left): what hangs at the hip comes round to the near side; a sling across the back stays behind him
  const near = left ? 'D' : 'K', far = left ? 'K' : 'D';
  // far side first: scabbard, far arm, far leg
  z = left && !(wp.d3 && wp.d3.back) ? Z.nearLeg + .1 : Z.scab; wp.far(kit, p, mouth, sd);
  // the back hand can carry the blade too, for the counter stances
  z = left ? Z.nearArm - 1 : Z.farArm; const bh = arm(p.ba, far); kit.bh = bh;   // a two-handed weapon runs its shaft through both hands
  z = left ? Z.nearArm - .5 : Z.offHand; if (wp.offHand) wp.offHand(kit, p, bh);   // a second weapon in the back hand (twin blades)
  z = left ? Z.nearLeg : Z.farLeg; leg(p.bl, far, -.5);
  // torso, near leg
  z = Z.body; poly([L(0, -2), L(0, 2), L(7, 2.3), L(8.2, 1.4), L(8.2, -1.6), L(7, -2.4)], 'K');
  z = Z.obi; for (let v = -2; v <= 2; v++) put(...L(2.2, v), 'D');                       // obi line
  z = left ? Z.farLeg : Z.nearLeg; leg(p.fl, near, .5);
  // head and hat
  // neck: the head lags and lolls on it (+ forward), carried by the chest
  const nk = p.neck || 0, hc = L(10 - p.bow * .7 - Math.abs(nk) * 1.2, .6 + p.bow * 1.1 + nk * 2.2);
  if (!p.noHead) {   // noHead: the head has come off and is its own piece now
    z = Z.head; for (let dy = -1; dy <= 1; dy++) for (let dx = -1.5; dx <= 1.5; dx++) put(hc[0] + dx, hc[1] + dy, 'K');
    const hf = p.headFlip ? -1 : 1;   // headFlip: the head is wrenched round to face backward
    z = Z.eye; put(hc[0] + 1.5 * hf, hc[1], p.dim ? 'e' : 'E'); z = Z.head;
    if (p.bare) { for (let dx = -1.5; dx <= 1.5; dx++) put(hc[0] + dx, hc[1] - 2, 'K'); put(hc[0] - hf, hc[1] - 3, 'K'); put(hc[0] - 2 * hf, hc[1] - 4, 'K'); put(hc[0] - 2 * hf, hc[1] - 3, 'D'); }
  }
  const hx0 = Math.round(hc[0]) - 9 + p.hat, hy0 = Math.round(hc[1]) - 6;
  // clothed (the canvas rig): the hat and mantle drawn with him; in the raster they are wardrobe items
  z = Z.hat; if (clothed && !p.bare) HAT_SIDE.forEach((r, y) => [...r].forEach((ch, x) => { if (ch !== '.') put(hx0 + x, hy0 + y, ch); }));
  // mantle over the shoulders, its back tip lifting a hair with the flutter
  const f = p.flutter;
  // it drapes flat down the back instead of standing off it, so it no longer reads as a hump
  z = Z.mantle; if (clothed && !p.bare) { poly([L(8.4, 2.3), L(8.9, -1.6), L(6.8, -2.9), L(3.0, -3.0 - f * .7), L(3.6, -1.2), L(5.4, 2.7)], 'M');
    seg(L(8.4, 2.1), L(8.8, -1.4), 1, 'm');
    if (f > .5) put(...L(2.6, -3.4), 'M'); }
  // the back hand's blade is drawn over the body and the sash, so it is never lost behind them
  z = Z.bblade; if (p.bsword != null) wp.backHeld(kit, bh, p.bsword);
  // near arm and the weapon: stowed, sliding home, or in the hand
  // from his left the sword arm is the far one; on the hilt, its forearm comes round the front of the belly to the near hip
  const onHilt = left && p.sword == null && Math.abs(p.fa[0] - HILT[0]) + Math.abs(p.fa[1] - HILT[1]) < .12;
  z = left ? Z.farArm : Z.nearArm; const hand = arm(p.fa, near, onHilt ? Z.nearLeg + .2 : z);
  z = Z.blade;
  if (p.sword === null && !p.sheathing && p.bsword == null && !p.empty) wp.stowed(kit, p, mouth, sd);
  else if (p.sheathing) wp.sheathing(kit, hand, mouth);
  else if (p.sword !== null) wp.held(kit, hand, p.sword);
  return { hc: p.noHead ? null : [hc[0] + DX, hc[1] + DY] };
}
