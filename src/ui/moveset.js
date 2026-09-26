import { ANIMS } from '../anims/anims.js';

// ---- Moveset table ----
// the skills that play on another move's frames (or on none) get their own rows after the animations
const SKILL_ROWS = [
  ['hold I · Thousand Cuts', 'Hold I in the double slash\'s crouch (about 0.9 s to full) while his body gathers light, then let go: he vanishes to a point ahead and blinks round it seven times in about 0.3 s, a cyan afterimage and a crescent in a new direction at each spot, then lands the final double cut. Everything in a wide circle round the point is hit and bursts on the sheath click. Range and area grow with the charge; aim with the arrows while holding.'],
  ['P · Cross Rift', 'The dash, the two crossing cuts, the freeze and the resheathe of the double slash. The cuts open into a giant X of torn reality: jagged slits of void with crawling, flickering lips, star-specks drifting inside, stone chips and motes pulled into it. On the sheath click it snaps shut, implodes for three frames, then detonates outward in a white ring that hits everything inside. Tap for a mid-size rift, hold to charge a bigger one.'],
  ['Qi · Storm Chain', 'A passive. Every hit he lands fills the Qi meter at the bottom left (bigger moves fill more); out of the fight it slowly ebbs. When it fills, Storm Chain wakes for 8 s: the meter glows and crackles, bolts run over his body, and every hit he lands leaps as lightning from the struck enemy to up to three enemies nearby, hitting each. Then the meter empties.'],
];
export function fillMoveset() {
  document.getElementById('moves').innerHTML = [...Object.entries(ANIMS).filter(([, a]) => !a.hidden).map(([k, a]) => [k, a.about]), ...SKILL_ROWS]
    .map(([k, a]) => `<tr><td>${k}</td><td>${a}</td></tr>`).join('');
}
