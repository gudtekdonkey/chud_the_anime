import { KATANA_3D } from './art3d.js';
// ---- The katana's art: how the rig draws it sheathed, drawn, in the back hand and sliding home ----
// every weapon's art has these hooks; k is the rig's drawing kit ({ put, seg, blob, add, L }), all in frame pixels
const along = a => [Math.cos(a), Math.sin(a)];
const nrm = d => [-d[1], d[0]];
// ---- 2x (k.hd): the same katana with the detail the pixels allow. Widths of .5 are one screen pixel ----
// the grip wrapped in dark and light diamonds down to a pale kashira, a tsuba across the blade at the hand, a habaki, and a blade
// with a white edge and a greyer back
function hilt(k, hand, d) { const n = 6; for (let i = 0; i <= n; i++) k.blob(...k.add(hand, d, -i * 3 / n), .5, i === n ? 'S' : i % 2 ? 'D' : 'K');
  const t = k.add(hand, d, .55), nn = nrm(d); k.seg(k.add(t, nn, -.9), k.add(t, nn, .9), .5, 'S'); }
function blade(k, hand, d) { const nn = nrm(d), a = k.add(hand, d, 1.1), b = k.add(hand, d, 13.3);
  k.seg(a, k.add(b, d, -.3), .5, 'W'); k.seg(k.add(a, nn, -.5), k.add(b, nn, -.6), .5, 'w'); k.put(...k.add(hand, d, 1), 'S'); }
const HD_ART = {
  far(k, p, mouth, sd) { const nn = nrm(sd); k.seg(mouth, k.add(mouth, sd, 11.6), 1, 's'); k.seg(k.add(mouth, sd, 11.4), k.add(mouth, sd, 12.3), 1, 'S');
    k.seg(k.add(mouth, sd, 2), k.add(k.add(mouth, sd, 3.4), nn, 1.4), .5, 'q'); },   // the saya, its kojiri, the sageo cord hanging from it
  stowed(k, p, mouth, sd) { const nn = nrm(sd); k.seg(k.add(mouth, nn, -.8), k.add(mouth, nn, .8), .5, 'S');
    for (let i = 1; i <= 6; i++) k.blob(...k.add(mouth, sd, -.6 - i * .5), .5, i === 6 ? 'S' : i % 2 ? 'w' : 'D'); },
  held(k, hand, a) { const d = along(a); hilt(k, hand, d); blade(k, hand, d); },
  backHeld(k, bh, a) { const d = along(a); k.blob(bh[0], bh[1], 1.8, 'D'); hilt(k, bh, d); blade(k, bh, d); },
  sheathing(k, hand, mouth) { const dx = hand[0] - mouth[0], dy = hand[1] - mouth[1], m = Math.hypot(dx, dy) || 1, d = [dx / m, dy / m];
    k.seg(hand, mouth, .5, 'W'); hilt(k, hand, [-d[0], -d[1]]); },
};

export const KATANA_ART = {
  d3: KATANA_3D,   // the same katana from any other facing (art3d.js)
  // the scabbard, far side of the hip, always there
  far(k, p, mouth, sd) { if (k.hd) return HD_ART.far(k, p, mouth, sd); k.seg(mouth, k.add(mouth, sd, 12), 1, 's'); k.put(...k.add(mouth, sd, 12), 'S'); },
  // sheathed: the hilt pokes forward-up out of the scabbard
  stowed(k, p, mouth, sd) { if (k.hd) return HD_ART.stowed(k, p, mouth, sd); k.put(...mouth, 'S'); k.seg(k.add(mouth, sd, -1), k.add(mouth, sd, -3.5), 1, 'W'); },
  held(k, hand, a) { if (k.hd) return HD_ART.held(k, hand, a); const d = along(a); k.seg(hand, k.add(hand, d, -2.5), 1, 'K'); k.put(...hand, 'S'); k.seg(k.add(hand, d, 1), k.add(hand, d, 13), 1, 'W'); },
  // the back hand's blade is drawn over the body and the sash, so it is never lost behind them
  backHeld(k, bh, a) { if (k.hd) return HD_ART.backHeld(k, bh, a); const d = along(a); k.blob(bh[0], bh[1], 2, 'D'); k.seg(bh, k.add(bh, d, -2.5), 1, 'K'); k.put(...bh, 'S'); k.seg(k.add(bh, d, 1), k.add(bh, d, 13), 1, 'W'); },
  // sliding home: blade runs from the hand into the scabbard mouth
  sheathing(k, hand, mouth) { if (k.hd) return HD_ART.sheathing(k, hand, mouth); const dx = hand[0] - mouth[0], dy = hand[1] - mouth[1], m = Math.hypot(dx, dy) || 1;
    k.seg(hand, mouth, 1, 'W'); k.put(...hand, 'S'); k.put(...k.add(hand, [dx / m, dy / m], 2), 'K'); },
  // hand-drawn rows: null keeps the katana pixels already in them
  front: null, sit: null,
};
