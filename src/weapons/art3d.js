// its own small vector kit: the skeleton imports the rig, which imports these arts, so importing it here would be a cycle
const V = {
  add: (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]], sub: (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]],
  mul: (a, k) => [a[0] * k, a[1] * k, a[2] * k], len: a => Math.hypot(a[0], a[1], a[2]),
  norm: a => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; },
};

// ---- Every weapon from any facing: the 3D twin of each weapon's side art, drawn by rig/body3d.js off the side ----
// hooks: carried(S, J, p, home) the scabbard or sling, always drawn (home: the blade is in it); held(S, A, d, top) in the lead hand;
// backHeld(S, A, d, top) in the back hand (default: held); sheathing(S, J, hand) on its way home; offHand(S, J, p, top) optional.
// J is the solved skeleton (wardrobe/skeleton.js): J.L(u, v, b) up the spine, forward, to his right. A held blade sits on the
// top layer (the owner's rule: never hidden by the body, sash or mantle) and the gripping hand is redrawn over its hilt.
const dotAt = (S, q, z, w, key) => { const s = S.P(q); S.dot(s[0], s[1], s[2] + z, w, key); };
const grip = (S, A, top) => dotAt(S, A.hand, top + 2, 2, A.col);

export const KATANA_3D = {
  carried(S, J, p, home) {
    const tip = V.add(J.mouth, V.mul(J.sd, 12)); S.seg(J.mouth, tip, 1, 's'); dotAt(S, tip, 0, 1, 'S');
    if (home && !p.empty) { dotAt(S, J.mouth, .2, 1, 'S'); S.seg(V.sub(J.mouth, J.sd), V.sub(J.mouth, V.mul(J.sd, 3.5)), 1, 'W', .2); } },
  held(S, A, d, top) { const h = A.hand; S.seg(h, V.sub(h, V.mul(d, 2.5)), 1, 'K', top); S.seg(V.add(h, d), V.add(h, V.mul(d, 13)), 1, 'W', top);
    grip(S, A, top); dotAt(S, V.add(h, V.mul(d, 1.2)), top + 3, 1, 'S'); },
  sheathing(S, J, hand) { S.seg(hand, J.mouth, 1, 'W', .3); },
};

// the yari: slung diagonally across his back, butt at his left hip, head up behind his right shoulder
const sling = J => [J.L(1, -2.5, -2), J.L(19, -6.5, 2)];
function spear(S, hand, d, back, front, z) {
  const b = V.sub(hand, V.mul(d, back)); S.seg(b, V.add(hand, V.mul(d, front)), 1, 'T', z); dotAt(S, b, z, 1, 'S');
  dotAt(S, V.add(hand, V.mul(d, front + 1)), z, 1, 'S'); S.seg(V.add(hand, V.mul(d, front + 2)), V.add(hand, V.mul(d, front + 5)), 1, 'W', z); }
export const YARI_3D = {
  carried(S, J, p, home) { if (!home) return; const [b, t] = sling(J), d = V.norm(V.sub(t, b));
    S.seg(b, t, 1, 'T'); dotAt(S, b, 0, 1, 'S'); S.seg(V.add(t, d), V.add(t, V.mul(d, 4)), 1, 'W'); },
  held(S, A, d, top) { spear(S, A.hand, d, 9, 11, top); grip(S, A, top); },
  backHeld(S, A, d, top) { spear(S, A.hand, d, 12, 6, top); grip(S, A, top); },
  // on its way to the back: along the sling, gripped low on the haft
  sheathing(S, J, hand) { const [b, t] = sling(J); spear(S, hand, V.norm(V.sub(t, b)), 4, 15, .3); },
};

// the nodachi: the long saya down his back, its mouth behind his right shoulder
const saya = J => [J.L(8, -3.2, 1.3), J.L(-9, -7.4, -1.3)];
function longBlade(S, hand, d, z, len = 19) {
  let n = len; while (n > 3 && hand[1] + d[1] * n < 0) n--;   // a point that would go under his feet is planted in the floor
  S.seg(hand, V.sub(hand, V.mul(d, 3.5)), 1, 'K', z); dotAt(S, V.add(hand, d), z, 1, 'S'); S.seg(V.add(hand, V.mul(d, 2)), V.add(hand, V.mul(d, n)), 1, 'W', z); }
export const NODACHI_3D = {
  carried(S, J, p, home) { const [m, e] = saya(J); S.seg(m, e, 1, 's'); dotAt(S, e, 0, 1, 'S');
    if (home) { const up = V.norm(V.sub(m, e)); dotAt(S, m, .1, 1, 'S'); S.seg(V.add(m, up), V.add(m, V.mul(up, 4)), 1, 'W', .1); } },
  held(S, A, d, top) { longBlade(S, A.hand, d, top); grip(S, A, top); },
  sheathing(S, J, hand) { S.seg(hand, saya(J)[0], 1, 'W', .3); },
};

// twin tanto: two short saya at the front of the obi; the back hand rides in a reverse grip along its forearm
function knife(S, hand, d, z, len = 6) { dotAt(S, V.sub(hand, V.mul(d, 1.5)), z, 1, 'K'); S.seg(V.add(hand, d), V.add(hand, V.mul(d, len)), 1, 'W', z); }
export const TANTO_3D = {
  carried(S, J, p, home) {
    for (const off of [0, .8]) { const m = V.add(J.mouth, [0, off, 0]); S.seg(m, V.add(m, V.mul(J.sd, 6)), 1, 's');
      if (home) { dotAt(S, m, .2, 1, 'S'); S.seg(V.sub(m, J.sd), V.sub(m, V.mul(J.sd, 2.5)), 1, off ? 'G' : 'W', .2); } } },
  held(S, A, d, top) { knife(S, A.hand, d, top); grip(S, A, top); },
  offHand(S, J, p, top) { if (p.sword == null || p.sheathing) return; const A = J.arm.l, d = V.norm(V.sub(A.el, A.hand));
    knife(S, A.hand, d, top, 5); grip(S, A, top); },
  sheathing(S, J, hand) { const d = V.sub(J.mouth, hand), l = V.len(d) || 1; knife(S, hand, V.mul(d, 1 / l), .3, Math.min(6, l)); },
};

// a straight blade at the hip like the katana's, of any length: the wakizashi, the daisho's short sword, the jitte (no edge)
export function blade3d(len, saya = len - 1, key = 'W') { return {
  carried(S, J, p, home) {
    const tip = V.add(J.mouth, V.mul(J.sd, saya)); if (saya) { S.seg(J.mouth, tip, 1, 's'); dotAt(S, tip, 0, 1, 'S'); }
    if (home && !p.empty) { dotAt(S, J.mouth, .2, 1, 'S'); S.seg(V.sub(J.mouth, J.sd), V.sub(J.mouth, V.mul(J.sd, 3)), 1, saya ? 'W' : key, .2); } },
  held(S, A, d, top) { const h = A.hand; S.seg(h, V.sub(h, V.mul(d, 2)), 1, 'K', top); S.seg(V.add(h, d), V.add(h, V.mul(d, len)), 1, key, top);
    grip(S, A, top); },
  sheathing(S, J, hand) { S.seg(hand, J.mouth, 1, key, .3); },
}; }
// a haft slung across the back like the yari's, no head: the bo (wood), the tetsubo (iron)
export function staff3d(key, back, front) { return {
  carried(S, J, p, home) { if (!home) return; const [b, t] = sling(J); S.seg(b, t, 1, key); dotAt(S, b, 0, 1, 'S'); dotAt(S, t, 0, 1, 'S'); },
  held(S, A, d, top) { const b = V.sub(A.hand, V.mul(d, back)), f = V.add(A.hand, V.mul(d, front));
    S.seg(b, f, 1, key, top); dotAt(S, b, top, 1, 'S'); dotAt(S, f, top, 1, 'S'); grip(S, A, top); },
  sheathing(S, J, hand) { const [b, t] = sling(J); S.seg(hand, V.add(hand, V.mul(V.norm(V.sub(t, b)), 15)), 1, key, .3); },
}; }
