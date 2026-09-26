import { KATANA_3D } from './art3d.js';
// ---- The katana's art: how the rig draws it sheathed, drawn, in the back hand and sliding home ----
// every weapon's art has these hooks; k is the rig's drawing kit ({ put, seg, blob, add, L }), all in frame pixels
const along = a => [Math.cos(a), Math.sin(a)];

export const KATANA_ART = {
  d3: KATANA_3D,   // the same katana from any other facing (art3d.js)
  // the scabbard, far side of the hip, always there
  far(k, p, mouth, sd) { k.seg(mouth, k.add(mouth, sd, 12), 1, 's'); k.put(...k.add(mouth, sd, 12), 'S'); },
  // sheathed: the hilt pokes forward-up out of the scabbard
  stowed(k, p, mouth, sd) { k.put(...mouth, 'S'); k.seg(k.add(mouth, sd, -1), k.add(mouth, sd, -3.5), 1, 'W'); },
  held(k, hand, a) { const d = along(a); k.seg(hand, k.add(hand, d, -2.5), 1, 'K'); k.put(...hand, 'S'); k.seg(k.add(hand, d, 1), k.add(hand, d, 13), 1, 'W'); },
  // the back hand's blade is drawn over the body and the sash, so it is never lost behind them
  backHeld(k, bh, a) { const d = along(a); k.blob(bh[0], bh[1], 2, 'D'); k.seg(bh, k.add(bh, d, -2.5), 1, 'K'); k.put(...bh, 'S'); k.seg(k.add(bh, d, 1), k.add(bh, d, 13), 1, 'W'); },
  // sliding home: blade runs from the hand into the scabbard mouth
  sheathing(k, hand, mouth) { const dx = hand[0] - mouth[0], dy = hand[1] - mouth[1], m = Math.hypot(dx, dy) || 1;
    k.seg(hand, mouth, 1, 'W'); k.put(...hand, 'S'); k.put(...k.add(hand, [dx / m, dy / m], 2), 'K'); },
  // hand-drawn rows: null keeps the katana pixels already in them
  front: null, sit: null,
};
