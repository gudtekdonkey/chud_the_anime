// ---- Each weapon's arms on the katana's keys, mapped from today's per-weapon poses (src/weapons/*.js: GUARD, WIND,
// THRUST, BEAT, SWEEP, HOOK... and their two-handed grips) onto the Animation Flow rig. One entry per key of the
// katana's clip (anim/moves.js): J1 has 10 (rest, hand to the weapon, drawn, wind, HIT .185, follow, hold .27, settle,
// settle, guard), J2 9 (from J1's follow, wind, swing, HIT .145, follow ×3, guard ×2), J3 9 (from J2's follow, wind up,
// top, swing, HIT .265, impact .305, hold, settle, guard), the lunge 9 (rest, hand, drawn, HIT .15, ...). null keeps the
// katana's key, 'D1' / 'D2' are the draw from where the weapon hangs (stow.js). The legs, the body's lean and travel
// and every beat stay the katana's. A spec: s(forward of the pelvis, up from the hip height H, angle, {two, bh (the
// hands' spacing on a haft), x, lat, hF (the left hand), off (its weapon), spread (the fan), chain (thrown, rig px)}).
// Angles are the side rig's (0 ahead, π/2 straight up); past π or under −π/2 they swing over his back.
const s = (f, u, ang, o = {}) => ({ g: [f, 19.8 + u], ang, ...o, ...(o.hF ? { hF: [o.hF[0], 19.8 + o.hF[1]] } : {}) });
const T = Math.PI * 2;

// ---- the yari: chudan, the draw-back, the thrust (the back fist driven up to the front one), tataki overhead and down
const YG = s(10, 4, .22), YT = s(15.5, 5, .05, { bh: 6 }), YB = s(13, 2.5, -.5, { bh: 9 });
const YARI = { guard: YG, run: s(9, 5, .12, { bh: 11 }),
  J1: [null, 'D1', 'D2', s(4, 3, .15), s(15, 5, .06, { bh: 6 }), YT, YT, s(12, 4.5, .15, { bh: 9 }), s(10.5, 4, .2), YG],
  J2: [YT, s(3, 2, .2), s(5, 17, .35, { bh: 11 }), s(13, 4, -.45, { bh: 9 }), YB, YB, s(12, 3, -.4, { bh: 10 }), YG, YG],
  J3: [YB, s(2, 18, .6, { bh: 11 }), s(1, 18.5, .7, { bh: 11 }), s(9, 15, .1), s(14, 5, -.4, { bh: 8 }), s(13, 1, -.42, { bh: 8 }), s(13, 1, -.42, { bh: 8 }), s(13, 3, -.3), YG],
  lunge: [null, 'D1', 'D2', s(16, 4, .02, { bh: 5 }), s(15.5, 4.5, .05, { bh: 6 }), s(14, 5, .1, { bh: 8 }), s(12, 4.5, .18, { bh: 10 }), s(11, 4, .2), YG] };
// ---- the naginata: the blade up at the face; wound high behind, swept low at the shins, carried up; spun, raised, chopped
const NG = s(9, 6, .55), NC = s(12, 10, .7, { bh: 10 }), NK = s(14, 2, -.55, { bh: 9 });
const NAGINATA = { guard: NG, run: s(-2, 3, 2.9, { bh: 9 }),
  J1: [null, 'D1', 'D2', s(-2, 15, 2.3, { bh: 10 }), s(14, 1, -.15, { bh: 10 }), s(15, 1.5, -.05, { bh: 10 }), NC, s(11, 8, .6, { bh: 11 }), NG, NG],
  J2: [NC, s(-3, 4, 2.6, { bh: 10 }), s(3, 18, 1.2, { bh: 11 }), s(14, 3, -.5, { bh: 9 }), NK, NK, s(13, 3, -.45, { bh: 10 }), NG, NG],
  J3: [NK, s(1, 18, 1.5, { bh: 11 }), s(0, 18.5, 1.7, { bh: 11 }), s(9, 15, .4), s(15, 5, -.35, { bh: 9 }), s(14, 1, -.5, { bh: 9 }), s(14, 1, -.5, { bh: 9 }), s(13, 3, -.3), NG],
  lunge: [null, 'D1', 'D2', s(17, 2, -.1, { bh: 10 }), s(15, 1.5, -.05, { bh: 10 }), NC, s(11, 8, .6), NG, NG] };
// ---- the bo: held at its middle; the front end cracked down from overhead, then spun so the back end leads and rises
const BG = s(9, 6, .35), BS = s(15.5, 5.5, -.55, { bh: 9 }), BR = s(6.5, 8, -2.3 + T, { bh: 9 });
const BO = { guard: BG, run: s(7, 4, -.4, { bh: 9 }),
  J1: [null, 'D1', 'D2', s(-3, 15, 2.2, { bh: 9 }), s(15, 5, -.6, { bh: 9 }), BS, BS, s(12, 5, -.2), BG, BG],
  J2: [BS, s(3, 6, 2.94), s(4, 5, 2.9), s(6, 7, -2.4 + T, { bh: 9 }), BR, BR, s(8, 7, -2.6 + T), BG, BG],
  J3: [BR, s(-1, 16, 2.0, { bh: 9 }), s(-2, 16.5, 2.2, { bh: 9 }), s(8, 15, .5), s(15, 5, -.55, { bh: 9 }), s(14, 2, -.7, { bh: 9 }), s(14, 2, -.7, { bh: 9 }), s(12, 4, -.3), BG],
  lunge: [null, 'D1', 'D2', s(16, 6, .05, { bh: 8 }), s(15, 6, .1, { bh: 8 }), s(12, 7, .3), s(10, 6, .35), BG, BG] };
// ---- the tetsubo: the bo's moves, both fists near the butt so the iron end lands
const near = t => { const o = {}; for (const k in t) o[k] = Array.isArray(t[k]) ? t[k].map(x => x && typeof x === 'object' ? { ...x, bh: 7 } : x) : { ...t[k], bh: 7 }; return o; };
// ---- the nodachi: hasso beside the head; drawn up over the shoulder as the wind-up, down through the front, followed through low
const DG = s(4, 11, 1.65, { x: -2 }), DF = s(8.5, 1.5, -1.3), DO = s(3, 17, 1.92);
const NODACHI = { guard: DG, run: s(2, 12, 2.8, { two: 0, x: -2 }),
  J1: [null, 'D1', 'D2', s(-1, 17, 2.9), s(10, 8, -.2), s(8, 2, -1.25), DF, s(8, 4, -.8), s(5, 9, .8), DG],
  J2: [DF, s(4, 3, -2.5), s(6, 6, -.6), s(7, 13, .8), s(3, 17, 1.95), DO, DO, DG, DG],
  J3: [DO, s(0, 17, 2.6), s(-.5, 17.5, 2.75), s(7, 16, 1.4), s(14, 5, -.6), s(13, 0, -1.2), s(13, 0, -1.2), s(13, 3, -.9), DG],
  lunge: [null, 'D1', 'D2', s(14, 8, -.15), s(8, 2, -1.25), DF, s(8, 4, -.8), s(5, 9, .8), DG] };
// ---- the kanabo: on the shoulder; drawn straight up as high as he can reach and dropped onto the floor; swung back up and over
const KG = s(3, 11, 2.7, { x: -1.6 }), KS = s(11, 5, -.9), KH = s(3, 17, 1.66);
const KANABO = { guard: KG, run: s(2, 11, 2.8, { two: 0, x: -1.6 }),
  J1: [null, 'D1', s(0, 18, 2.3), s(8, 13, .6), KS, KS, KS, s(10, 7, -.5), s(6, 10, 1.5), KG],
  J2: [KS, s(5, 3, -2.2), s(6, 12, .9), s(5, 16, 1.4), s(3, 17, 1.7), KH, KH, KG, KG],
  J3: [KH, s(0, 18.5, 2.4), s(-.5, 18.5, 2.5), s(8, 14, .6), KS, s(12, 3, -1.0), s(12, 3, -1.0), s(10, 6, -.6), KG],
  lunge: [null, 'D1', s(0, 18, 2.3), s(14, 5, -.8), KS, KS, s(10, 7, -.5), s(6, 10, 1.5), KG] };
// ---- twin tanto: low and coiled, the back fist up by the chin; a backhand across the front; the back hand's reverse-grip
//   hook; both blades brought down from overhead. The kama pair moves the same (their own grip: arsenal.js `off`)
const TG = s(7, 3, -.1, { hF: [4, 9] }), TC = s(10.5, 5.5, -.75, { hF: [1, 9] }), TH = s(2, 4, -2.2, { hF: [12, 6.5] });
const TANTO = { guard: TG, run: s(5, 5, -.2),
  J1: [null, 'D1', s(-1, 8, 2.6, { hF: [5, 6] }), s(9, 8, .2, { hF: [3, 8] }), s(10, 6, -.7, { hF: [1, 9] }), TC, TC, s(8, 4, -.4, { hF: [3, 8] }), TG, TG],
  J2: [TC, s(6, 7, .4, { hF: [-2, 8] }), s(4, 5, -1.5, { hF: [6, 6] }), s(2, 4, -2.2, { hF: [11, 7] }), TH, TH, TH, TG, TG],
  J3: [TH, s(2, 16, 2.0, { hF: [1, 15] }), s(1.5, 16.5, 2.2, { hF: [.5, 15.5] }), s(8, 13, .8, { hF: [7, 12] }), s(12, 5, -1.0, { hF: [11, 4] }), s(12, 2, -1.3, { hF: [11, 1.5] }),
    s(12, 2, -1.3, { hF: [11, 1.5] }), s(9, 4, -.6, { hF: [6, 6] }), TG],
  lunge: [null, 'D1', s(-1, 8, 2.6, { hF: [5, 6] }), s(14, 6, -.4, { hF: [2, 9] }), TC, s(10, 6, -.5, { hF: [3, 8] }), s(9, 5, -.3, { hF: [4, 8] }), TG, TG] };
// ---- the kusarigama: the sickle up in front, the chain hanging; the chain arm cocked behind, flung through, the chain out
//   straight past any other weapon's reach and yanked home; the sickle hooked in close; the weight whirled overhead and slammed
const hang = { chain: 0, off: { ang: -Math.PI / 2 } }, ch = (n, a) => ({ chain: n, off: { ang: a } });
const QG = s(6, 9, 1.2, { hF: [3, 3], ...hang }), QT = s(4, 8, .9, { hF: [10, 9], ...ch(52, .02) }), QH = s(10, 4, -1.3, { hF: [0, 5], ...hang });
const KUSARIGAMA = { guard: QG, run: s(5, 8, 1.0, ch(16, 3.0)),
  J1: [null, 'D1', s(5, 9, 1.3, { hF: [-6, 7], ...hang }), s(5, 9, 1.3, { hF: [-7, 8], ...hang }), s(4, 8, .9, { hF: [11, 9], ...ch(54, .04) }), s(4, 8, .9, { hF: [11, 9], ...ch(56, 0) }), QT,
    s(5, 8, 1.0, { hF: [7, 7], ...ch(20, -.7) }), s(6, 9, 1.2, { hF: [4, 4], ...hang }), QG],
  J2: [QT, s(-1, 13, 2.5, { hF: [5, 5], ...ch(10, -1) }), s(8, 10, .3, { hF: [3, 5], ...hang }), s(10, 6, -1.0, { hF: [-1, 5], ...hang }), QH, QH, QH, QG, QG],
  J3: [QH, s(4, 8, 1.2, { hF: [0, 18], ...ch(18, 2.4) }), s(4, 8, 1.2, { hF: [1, 18.5], ...ch(22, 2.0) }), s(5, 8, 1.1, { hF: [8, 16], ...ch(40, .6) }), s(5, 8, 1.1, { hF: [10, 10], ...ch(50, -.3) }),
    s(5, 8, 1.1, { hF: [10, 8], ...ch(46, -.45) }), s(5, 8, 1.1, { hF: [10, 8], ...ch(46, -.45) }), s(6, 9, 1.2, { hF: [7, 7], ...ch(24, -.8) }), QG],
  lunge: [null, 'D1', 'D2', s(14, 6, -.6, { hF: [3, 4], ...hang }), s(10, 5, -1.0, hang), s(10, 5, -1.0, hang), s(8, 7, .2, hang), QG, QG] };
// ---- the tessen: open before his face; snapped shut and driven down like a baton; flicked open and swept across at the throat
const FG = s(6, 12, 1.2, { spread: 1, hF: [5, 5] }), FS = s(10.5, 5.5, -.65, { spread: 0, hF: [0, 7] }), FW = s(11, 9.5, -.3, { spread: 1, hF: [-1, 8] });
const TESSEN = { guard: FG, run: s(4, 8, .9, { spread: 0 }),
  J1: [null, 'D1', s(1, 15, 2.2, { spread: 0, hF: [4, 6] }), s(9, 10, .4, { spread: 0, hF: [3, 7] }), s(10, 6, -.6, { spread: 0, hF: [0, 7] }), FS, FS, s(8, 8, .2, { spread: .5, hF: [3, 6] }), FG, FG],
  J2: [FS, s(1, 14, 2.6, { spread: .2, hF: [4, 6] }), s(8, 11, .6, { spread: .6, hF: [2, 7] }), s(11, 10, -.2, { spread: 1, hF: [-1, 8] }), FW, FW, FW, FG, FG],
  J3: [FW, s(0, 17, 2.3, { spread: 0, hF: [4, 7] }), s(-.5, 17.5, 2.5, { spread: 0, hF: [4, 7] }), s(7, 15, 1.2, { spread: 0 }), s(12, 6, -.7, { spread: 0, hF: [0, 7] }), s(12, 3, -1.0, { spread: 0 }),
    s(12, 3, -1.0, { spread: 0 }), s(9, 6, -.4, { spread: .3 }), FG],
  lunge: [null, 'D1', s(1, 15, 2.2, { spread: 0 }), s(14, 7, -.4, { spread: 0 }), FS, s(9, 7, -.2, { spread: .4 }), s(8, 9, .3, { spread: .7 }), FG, FG] };
// ---- the daisho: the katana's moves one-handed, the wakizashi in the back hand; the answer cut (J2) is the short blade's
const DAISHO = {
  J2: [null, s(2, 9, 2.6, { hF: [-2, 8], off: { ang: 2.4 } }), s(1, 7, 2.8, { hF: [6, 9], off: { ang: .8 } }), s(-1, 4, 2.6, { hF: [13, 8], off: { ang: -.3 } }),
    s(-1, 4, 2.6, { hF: [13, 6], off: { ang: -.6 } }), s(-1, 4, 2.6, { hF: [13, 6], off: { ang: -.6 } }), s(0, 5, 2.2, { hF: [11, 7], off: { ang: -.2 } }), null, null] };

export const CUTS = { yari: YARI, naginata: NAGINATA, bo: BO, tetsubo: near(BO), nodachi: NODACHI, kanabo: KANABO, tanto: TANTO, kama: TANTO,
  kusarigama: KUSARIGAMA, tessen: TESSEN, daisho: DAISHO };
