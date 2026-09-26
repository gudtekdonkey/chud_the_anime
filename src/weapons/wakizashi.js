import { blade3d } from './art3d.js';

// ---- The wakizashi: the katana's short companion, worn alone at the hip. Every cut is the katana's, closer in and lighter ----
const along = a => [Math.cos(a), Math.sin(a)];
export const WAKI_BLADE = 9, WAKI_SAYA = 9;   // against the katana's 13 and 12
// the short blade from a fist: a wrapped grip behind, the habaki, the blade
export function waki(k, at, d) { k.seg(at, k.add(at, d, -2), 1, 'K'); k.put(...at, 'S'); k.seg(k.add(at, d, 1), k.add(at, d, WAKI_BLADE), 1, 'W'); }
export const WAKI_ART = {
  d3: blade3d(WAKI_BLADE, WAKI_SAYA),
  far(k, p, mouth, sd) { k.seg(mouth, k.add(mouth, sd, WAKI_SAYA), 1, 's'); k.put(...k.add(mouth, sd, WAKI_SAYA), 'S'); },
  stowed(k, p, mouth, sd) { k.put(...mouth, 'S'); k.seg(k.add(mouth, sd, -1), k.add(mouth, sd, -3), 1, 'W'); },
  held(k, hand, a) { waki(k, hand, along(a)); },
  backHeld(k, bh, a) { k.blob(bh[0], bh[1], 2, 'D'); waki(k, bh, along(a)); },
  sheathing(k, hand, mouth) { const dx = hand[0] - mouth[0], dy = hand[1] - mouth[1], m = Math.hypot(dx, dy) || 1;
    k.seg(hand, mouth, 1, 'W'); k.put(...hand, 'S'); k.put(...k.add(hand, [dx / m, dy / m], 2), 'K'); },
  front: null, sit: null,
};
export const WAKIZASHI = { id: 'wakizashi', name: 'Wakizashi', about: 'The short sword, worn alone at the hip: the katana\'s cuts, drawn quicker and closer in, the lightest blade he carries.', art: WAKI_ART,
  reach: .85, weight: { stop: .8, shake: 1 }, poses: {} };
