import { FW, FH, OX, OY, RC, PX } from '../config.js';
import { KATANA_ART } from '../weapons/katana.js';
import { Raster, packPal, TWO, twoTone } from '../wardrobe/raster.js';

// ---- The ronin rig: side view, drawn pixel by pixel from joint angles, so every frame is a pose ----
// Two outputs share one drawing:
//   rig(g, fx, p, pal): onto a canvas, the hat and mantle drawn with him (the samurai, the executions' pieces).
//   rigR(R, p): into a depth raster (src/wardrobe/raster.js), the body only: what he wears is items (src/wardrobe/items.js) layered
//   between his limbs by depth: the far arm and leg behind the body, the near arm over whatever he wears, a held blade over everything.
// The depths follow the painter's order, so the bare raster rig draws exactly what the canvas rig does without the hat and mantle.
// it works in its original 48x48 frame (feet at 24, 40), scaled by PX and shifted by whole pixels into the bigger frame, so at PX 1
//   the rounding of every pose stays exactly as it was. At PX 2 (?hd) it also draws the detail the extra pixels allow (HD below).
export const RX = 24, RY = 40;
export const HD = PX >= 2;
const Z = { scab: -3.5, farArm: -3, offHand: -2.9, farLeg: -2.5, body: 0, obi: .01, nearLeg: 1.2, head: 2.5, eye: 2.51, hat: 3, mantle: 3.5, bblade: 40, nearArm: 45, blade: 50 };
export const NEAR_ARM_Z = Z.nearArm;
const HAT_SIDE = ['........GGGG........', '.....GGHHHHHHGG.....', '..GGHHHHHHHHHHHHGG..', '.GBBBBBBBBBBBBBBBBG.', '..KBBBBBBBBBBBBBBK..'];
// rig coords to screen pixels in the frame (unrounded)
export const toPx = (x, y) => [OX + (x - RX) * PX, OY + (y - RY) * PX];
// pal swaps the colours (the samurai's red-grey); p.bare drops the hat and mantle for a bare head and topknot
const PALS = new WeakMap(), CR = new Map();
export function rig(g, fx, p, pal = RC) {
  // drawn into a raster first, so the HD pass can light its edges; pixels past the frame's edge are dropped,
  // so a long weapon never bleeds into the next frame of the sheet
  let pk = PALS.get(pal); if (!pk) PALS.set(pal, pk = packPal({ ...RC, ...pal }));
  let R = CR.get(pk); if (!R) CR.set(pk, R = new Raster(FW, FH, OX, OY, .3, pk));
  R.clear(); draw((x, y, z, c) => R.px(x, y, z, c), p, true);
  if (HD) R.rim();
  g.drawImage(R.flush(), fx, 0);
}
// returns the head's centre in frame pixels, so the hat, hair and masks sit on exactly the pixels the head does
export const rigR = (R, p) => draw((x, y, z, c) => R.px(x, y, z, c), p, false);

function draw(out, p, clothed) {
  let z = 0;
  const W = w => Math.max(1, Math.round(w * PX));    // a width in rig pixels, in screen pixels
  const px = (X, Y, c) => out(Math.round(X), Math.round(Y), z, c);
  const put = (x, y, c) => px(OX + (x - RX) * PX, OY + (y - RY) * PX, c);
  const blobS = (X, Y, w, c) => { const x0 = Math.round(X - (w - 1) / 2), y0 = Math.round(Y - (w - 1) / 2);
    for (let j = 0; j < w; j++) for (let i = 0; i < w; i++) out(x0 + i, y0 + j, z, c); };
  // blob and seg take widths in rig pixels (1 is PX screen pixels; .5 is one pixel at 2x); segT tapers
  const blob = (x, y, w, c) => blobS(OX + (x - RX) * PX, OY + (y - RY) * PX, W(w), c);
  const segT = (a, b, w0, w1, c) => { const n = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) * 2 * PX));
    for (let i = 0; i <= n; i++) { const k = i / n; blob(a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, w0 + (w1 - w0) * k, c); } };
  let weap = false;   // drawing the weapon: at 2x its one-unit lines are two-tone (lit top row, shaded bottom row)
  const seg = (a, b, w, c) => HD && weap && w === 1 && TWO[c] ? twoTone(toPx(...a), toPx(...b), c, (x, y, k) => out(x, y, z, k)) : segT(a, b, w, w, c);
  const poly = (pts, c) => {
    const P = pts.map(q => toPx(q[0], q[1])), xs = P.map(q => q[0]), ys = P.map(q => q[1]);
    for (let y = Math.floor(Math.min(...ys)); y <= Math.ceil(Math.max(...ys)); y++)
      for (let x = Math.floor(Math.min(...xs)); x <= Math.ceil(Math.max(...xs)); x++) {
        let inside = false;
        for (let i = 0, j = P.length - 1; i < P.length; j = i++) {
          const [xi, yi] = P[i], [xj, yj] = P[j];
          if ((yi > y + .5) !== (yj > y + .5) && x + .5 < (xj - xi) * (y + .5 - yi) / (yj - yi) + xi) inside = !inside;
        }
        if (inside) out(x, y, z, c);
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
    if (!HD) { seg(h, k, 2, c); seg(k, f, 2, c); seg(f, [f[0] + 2, f[1]], 1, c); return; }
    // hakama: full in the thigh, a crease at the knee, the hem flaring over a bound ankle; the foot, and a sandal sole under it
    const sd = dir(th - kn), hem = add(k, sd, 4.6), near = c === 'K';
    segT(h, k, 2.7, 2.5, c); segT(k, hem, 2.4, 2.9, c);
    seg(hem, f, .7, c); seg(f, [f[0] + 2.3, f[1]], .55, c);
    seg([f[0] - .4, f[1] + .6], [f[0] + 2.3, f[1] + .6], .5, near ? 'D' : 'q');
    seg(add(h, dir(th), 1.2), add(h, dir(th), 4.2), .5, near ? 'r' : 'G');   // a pleat down the thigh
  };
  const arm = ([sh, el], c) => { const s = L(7, 0), e = add(s, dir(sh), 4), h = add(e, dir(sh + el), 4);
    if (!HD) { seg(s, e, 2, c); seg(e, h, 1, c); blob(h[0], h[1], 2, c); return h; }
    // the kimono sleeve hangs off the upper arm, its lower edge pulled down; a bare forearm and a closed fist
    segT(s, e, 2.6, 2.2, c);
    const e2 = add(e, dir(sh + el), .8);
    poly([add(s, [0, 1], .6), e2, [e2[0], e2[1] + 1.3], [s[0], s[1] + 1.6]], c);
    segT(e, h, 1.5, 1.2, c); blob(h[0], h[1], 1.8, c); return h;
  };
  const mouth = L(1.5, 2), sd = [-Math.cos(.32), Math.sin(.32)];

  if (p.noUpper) {   // cut in two: only the pelvis and legs are left, and they fold on their own
    z = Z.farLeg; leg(p.bl, 'D', -.5); z = Z.body; poly([L(0, -2), L(0, 2), L(2.6, 2.2), L(2.6, -2.2)], 'K'); z = Z.nearLeg; leg(p.fl, 'K', .5); return { hc: null };
  }
  // the weapon's art draws itself through these hooks (src/weapons/); a pose carries it as p.wp, the katana if none.
  // Widths are in rig pixels; hd says the art may draw its finer detail (a width of .5 is one screen pixel)
  // at 2x a weapon's put is a whole rig pixel (PX square) and px one screen pixel, for its fine detail
  const wp = p.wp || KATANA_ART, kit = { put: HD ? (x, y, c) => blob(x, y, 1, c) : put, px: put, seg, segT, blob, poly, add, L, p, hd: HD };
  const W8 = (f, ...a) => { weap = true; f(kit, ...a); weap = false; };
  // far side first: scabbard, far arm, far leg
  z = Z.scab; W8(wp.far, p, mouth, sd);
  // the back hand can carry the blade too, for the counter stances
  z = Z.farArm; const bh = arm(p.ba, 'D'); kit.bh = bh;   // a two-handed weapon runs its shaft through both hands
  z = Z.offHand; if (wp.offHand) W8(wp.offHand, p, bh);                  // a second weapon in the back hand (twin blades)
  z = Z.farLeg; leg(p.bl, 'D', -.5);
  // torso, near leg
  z = Z.body; poly([L(0, -2), L(0, 2), L(7, 2.3), L(8.2, 1.4), L(8.2, -1.6), L(7, -2.4)], 'K');
  if (!HD) { z = Z.obi; for (let v = -2; v <= 2; v++) put(...L(2.2, v), 'D'); }   // obi line
  else {   // a real obi band with a lit top edge and the knot's end at the back; the kimono's crossed collar
    z = Z.obi; poly([L(1.6, -2.3), L(1.6, 2.3), L(2.9, 2.35), L(2.9, -2.35)], 'D'); seg(L(2.9, -2.2), L(2.9, 2.2), .5, 'G'); put(...L(2.2, -2.6), 'G');
    z = Z.body + .02; seg(L(7.9, 1.3), L(4.2, .2), .5, 'r'); seg(L(7.9, .4), L(5.4, -.4), .5, 'r'); }
  z = Z.nearLeg; leg(p.fl, 'K', .5);
  // head and hat
  // neck: the head lags and lolls on it (+ forward), carried by the chest
  const nk = p.neck || 0, hc = L(10 - p.bow * .7 - Math.abs(nk) * 1.2, .6 + p.bow * 1.1 + nk * 2.2);
  const hf = p.headFlip ? -1 : 1;   // headFlip: the head is wrenched round to face backward
  if (!p.noHead) {   // noHead: the head has come off and is its own piece now
    z = Z.head;
    if (!HD) for (let dy = -1; dy <= 1; dy++) for (let dx = -1.5; dx <= 1.5; dx++) put(hc[0] + dx, hc[1] + dy, 'K');
    else { const [cx, cy] = toPx(...hc), rx = 2.1 * PX, ry = 1.75 * PX;   // a rounded head, a jaw under the eye
      for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++)
        if (((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1) out(x, y, z, 'K');
      put(hc[0] + .6 * hf, hc[1] + 1.4, 'K'); }
    z = Z.eye; put(hc[0] + 1.5 * hf, hc[1], p.dim ? 'e' : 'E');
    if (HD) { put(hc[0] + .95 * hf, hc[1], p.dim ? 'e' : 'E'); put(hc[0] + .4 * hf, hc[1], 'e'); }   // an eye slit, its glow trailing back
    z = Z.head;
    if (p.bare && !HD) { for (let dx = -1.5; dx <= 1.5; dx++) put(hc[0] + dx, hc[1] - 2, 'K'); put(hc[0] - hf, hc[1] - 3, 'K'); put(hc[0] - 2 * hf, hc[1] - 4, 'K'); put(hc[0] - 2 * hf, hc[1] - 3, 'D'); }
    else if (p.bare) {   // his hair: a cap to the brow, the topknot tied back and folded forward, the tie a lighter band
      const [cx, cy] = toPx(...hc), rx = 2.2 * PX, ry = 2.1 * PX;
      for (let y = Math.floor(cy - ry); y <= cy - .3 * PX; y++) for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++)
        if (((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1) out(x, y, z, 'o');
      seg([hc[0] - .6 * hf, hc[1] - 2.4], [hc[0] - 2.4 * hf, hc[1] - 3.8], .55, 'o'); put(hc[0] - 1.1 * hf, hc[1] - 2.7, 'D');
      z = Z.eye; seg([hc[0] + .2 * hf, hc[1] - 1.7], [hc[0] + 1.6 * hf, hc[1] - 1.1], .5, 'r'); z = Z.head; }
  }
  // clothed (the canvas rig): the hat and mantle drawn with him; in the raster they are wardrobe items
  z = Z.hat; if (clothed && !p.bare) {
    if (!HD) { const hx0 = Math.round(hc[0]) - 9 + p.hat, hy0 = Math.round(hc[1]) - 6; HAT_SIDE.forEach((r, y) => [...r].forEach((ch, x) => { if (ch !== '.') put(hx0 + x, hy0 + y, ch); })); }
    else strawHD((x, y, c) => out(x, y, z, c), hc, p.hat);
  }
  // mantle over the shoulders, its back tip lifting a hair with the flutter
  const f = p.flutter;
  // it drapes flat down the back instead of standing off it, so it no longer reads as a hump
  z = Z.mantle; if (clothed && !p.bare) { poly([L(8.4, 2.3), L(8.9, -1.6), L(6.8, -2.9), L(3.0, -3.0 - f * .7), L(3.6, -1.2), L(5.4, 2.7)], 'M');
    seg(L(8.4, 2.1), L(8.8, -1.4), HD ? .5 : 1, 'm');
    if (HD) mantleHD(L, f, seg, 'M', 'B');
    if (f > .5) put(...L(2.6, -3.4), 'M'); }
  // the back hand's blade is drawn over the body and the sash, so it is never lost behind them
  z = Z.bblade; if (p.bsword != null) W8(wp.backHeld, bh, p.bsword);
  // near arm and the weapon: stowed, sliding home, or in the hand
  z = Z.nearArm; const hand = arm(p.fa, 'K');
  z = Z.blade;
  if (p.sword === null && !p.sheathing && p.bsword == null && !p.empty) W8(wp.stowed, p, mouth, sd);
  else if (p.sheathing) W8(wp.sheathing, hand, mouth);
  else if (p.sword !== null) W8(wp.held, hand, p.sword);
  return { hc: p.noHead ? null : toPx(...hc), hcR: p.noHead ? null : hc };
}

// ---- HD pieces shared with the wardrobe (src/wardrobe/items.js draws the same hat and mantle as items) ----
// the straw hat side on at 2x: a woven crown in rings, the brim's shadowed underside with straw ends at the rim, a knot at the peak,
// a chin cord. px(x, y, c) in screen pixels, hc the head's centre in rig coords, tip the pose's forward nudge (p.hat)
export function strawHD(px, hc, tip = 0) {
  const [cx0, cy0] = toPx(Math.round(hc[0]) + .5 + tip, Math.round(hc[1]) - 6), Hh = 5 * PX, hw = 10 * PX;
  for (let yy = 0; yy < Hh; yy++) { const t = (yy + .5) / Hh, brim = t > .62, last = yy === Hh - 1;
    const half = brim ? hw * (last ? .86 : 1) - .3 : PX * (1.8 + 7.4 * Math.pow(Math.min(1, t / .62), .95));
    const xa = Math.round(cx0 - half), xb = Math.round(cx0 + half) - 1;
    for (let x = xa; x <= xb; x++) { const edge = x === xa || x === xb;
      let c = brim ? (edge ? (last ? 'K' : 'G') : 'B') : edge ? 'G' : 'H';
      if (!brim && !edge && yy % 3 === 1 && (x + yy) % 2 === 0) c = 'B';                // the weave
      if (brim && !last && !edge && yy === Math.ceil(.62 * Hh) && x % 3 === 0) c = 'H';   // straw ends at the rim
      px(x, Math.round(cy0) + yy, c); } }
  px(Math.round(cx0 - .5), Math.round(cy0) - 1, 'G');
  const a = toPx(hc[0] - 1.6, hc[1] - 1.7), b = toPx(hc[0] + .3, hc[1] + 1.8), n = Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]));
  for (let i = 0; i <= n; i++) px(Math.round(a[0] + (b[0] - a[0]) * i / n), Math.round(a[1] + (b[1] - a[1]) * i / n), 'q');   // the chin cord
}
// the flat mantle's 2x detail over its polygon: two folds and a torn hem whose strips lift with the flutter.
// L(u, v): up the spine and forward, in whatever coords seg draws in (the rig's, or the wardrobe's bones)
export function mantleHD(L, f, seg, col, fold) {
  seg(L(7.9, .2), L(4.6, -2.2), .5, fold); seg(L(7.6, 1.6), L(5.6, 1.2), .5, fold);
  [[3.2, -2.8, 1.2], [3.5, -2.0, .8], [4.1, -2.6, 1.0]].forEach(([u, v, k], i) => {
    const dv = i === 0 ? -f * .7 : 0; seg(L(u, v + dv), L(u - k - (1 - f) * .3, v + dv - f * .3 * (i + 1)), .5, col); });
}
