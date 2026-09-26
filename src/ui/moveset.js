import { ANIMS } from '../anims/anims.js';

// ---- Moveset table ----
// the skills that play on another move's frames (or on none) get their own rows after the animations
const SKILL_ROWS = [
  ['Weapons', 'The picker under the game switches weapon: katana, yari, nodachi, twin tanto, naginata, kanabo, kusarigama, tessen. Every move works with every weapon on the same timing and hits; each weapon brings its own poses for the cuts, the guard and the six stances, and is stowed its own way (the katana at the hip, the yari and nodachi on his back, the tanto at the obi). Reach and weight differ too: the nodachi reaches further and every hit holds a longer pause and shake; the yari, a spear half again his height held in both hands, thrusts and reaches furthest; the tanto is short and light.'],
  ['hold I · Thousand Cuts', 'Hold I in the double slash\'s crouch (about 0.9 s to full) while his body gathers light, then let go: he vanishes to a point ahead and blinks round it seven times in about 0.3 s, a cyan afterimage and a crescent in a new direction at each spot, then lands the final double cut. Everything in a wide circle round the point is hit and bursts on the sheath click. Range and area grow with the charge; aim with the arrows while holding.'],
  ['P · Cross Rift', 'The dash, the two crossing cuts, the freeze and the resheathe of the double slash. The cuts open into a giant X of torn reality: jagged slits of void with crawling, flickering lips, star-specks drifting inside, stone chips and motes pulled into it. On the sheath click it snaps shut, implodes for three frames, then detonates outward in a white ring that hits everything inside. Tap for a mid-size rift, hold to charge a bigger one.'],
  ['Qi · Storm Chain', 'A passive. Every hit he lands fills the Qi meter at the bottom left (bigger moves fill more); out of the fight it slowly ebbs. When it fills, Storm Chain wakes for 8 s: the meter glows and crackles, bolts run over his body, and every hit he lands leaps as lightning from the struck enemy to up to three enemies nearby, hitting each. Then the meter empties.'],
  ['Skill bar · cooldowns', 'Along the bottom of the screen, like League of Legends: the Storm Chain passive, then I, O, P, N and U, then K and slide. Every active has a cooldown, shown as a dark clockwise sweep over its icon with the seconds left; a key pressed too soon does nothing and its slot blinks. K 3 s (none with no enemy near, and only 0.2 s after an assassination), I 2 s (Thousand Cuts 8 s), O 10 s, P 12 s, N 14 s, U 8 s, slide 1 s. O, P and Thousand Cuts start cooling down when you let go.'],
];
export function fillMoveset() {
  document.getElementById('moves').innerHTML = [...Object.entries(ANIMS).filter(([, a]) => !a.hidden).map(([k, a]) => [k, a.about]), ...SKILL_ROWS]
    .map(([k, a]) => `<tr><td>${k}</td><td>${a}</td></tr>`).join('');
}
