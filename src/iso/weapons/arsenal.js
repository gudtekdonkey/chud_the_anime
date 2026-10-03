// ---- The 15 weapons in the iso slice (owner 2026-10-02: "The 15 weapons in 3D. Only the katana exists there."): today's
// game's arsenal (src/weapons/), the same order, names, reach and weight (copied: the slice never imports today's game).
// Each weapon brings a 3D model (models.js), where it rides when stowed (stow.js) and how it is drawn (wield.js), and its
// own grips for every move (cuts.js), laid by the engine on the katana's keys and beats (ronin-engine/weapons/), so hit
// timing never moves.
//   reach   × the cut's reach (46 rig px) and how far short of the samurai the cut's step stops
//   weight  { stop: × the hit-stop, shake: × the heavy hit's shake }
//   carry   hip (a saya at the left hip) · obi (through the sash) · slung (across his back) · shoulder (down his back, grip over the right shoulder)
//   ext     [behind the right hand's grip, ahead of it] in world units: the model's length, the trail's and the floor's reach
//   hands   two (both hands on it, bh rig px apart along it) or one (the left hand free, or holding its `off` weapon)
import { defineWeapons, WEAPON, equip } from 'ronin-engine/weapons/registry.js';
import { CUTS } from './cuts.js';
import { STOW } from './stow.js';
import { MODELS } from './models.js';

export const ARSENAL = defineWeapons([
  { id: 'katana', name: 'Katana', reach: 1, weight: { stop: 1, shake: 1 }, carry: 'hip', ext: [2.6, 11.7], hands: 'two',
    about: 'The sheathed blade at his hip: quick draw, clean arcs, the slow resheathe.' },
  { id: 'yari', name: 'Yari', reach: 1.5, weight: { stop: 1, shake: 1 }, carry: 'slung', ext: [12, 21.5], hands: 'two', bh: 12,
    about: 'A straight-headed spear half again his height, slung across his back: every attack is led by the point.' },
  { id: 'nodachi', name: 'Nodachi', reach: 1.35, weight: { stop: 1.6, shake: 2 }, carry: 'shoulder', ext: [5.4, 21], hands: 'two', bh: 4.6,
    about: 'A greatsword on his back, hilt over the shoulder: wound up further, followed through low, every cut a beat heavier.' },
  { id: 'tanto', name: 'Twin tanto', reach: .8, weight: { stop: .7, shake: 1 }, carry: 'obi', ext: [1.6, 6.6], hands: 'one', off: { rev: 1 },
    about: 'Two short blades at the front of the obi: the lead hand cuts, the back hand answers in a reverse grip.' },
  { id: 'naginata', name: 'Naginata', reach: 1.4, weight: { stop: 1.1, shake: 1.2 }, carry: 'slung', ext: [11, 23], hands: 'two', bh: 12,
    about: 'A long haft with a curved blade, slung across his back: wide sweeps low at the legs and straight down from overhead.' },
  { id: 'kanabo', name: 'Kanabo', reach: 1.15, weight: { stop: 2, shake: 2.5 }, carry: 'shoulder', ext: [4.4, 17.6], hands: 'two', bh: 3.8,
    about: 'An iron-studded club hung down his back: raised high and dropped. The heaviest hit, the longest pause, the biggest shake.' },
  { id: 'kusarigama', name: 'Kusarigama', reach: 1.6, weight: { stop: .8, shake: 1 }, carry: 'obi', ext: [1.2, 5.4], hands: 'one', off: { chain: 1 },
    about: 'A sickle in the front hand, a weighted chain in the back hand: the chain is thrown out past anything else, the sickle hooks in close.' },
  { id: 'tessen', name: 'Tessen', reach: .7, weight: { stop: .6, shake: 1 }, carry: 'obi', ext: [1, 6.2], hands: 'one',
    about: 'An iron war fan: shut it strikes like a baton, open it guards his face and slices across. The shortest reach, the lightest hit.' },
  { id: 'bo', name: 'Bo staff', reach: 1.35, weight: { stop: .9, shake: 1.2 }, carry: 'slung', ext: [14, 14], hands: 'two', bh: 10,
    about: 'A hardwood staff a head taller than him, held at its middle so both ends strike: one cracks down, the other rises.' },
  { id: 'tetsubo', name: 'Tetsubo', reach: 1.3, weight: { stop: 1.8, shake: 2.2 }, carry: 'slung', ext: [6.5, 20], hands: 'two', bh: 7,
    about: "A long iron-banded staff gripped near the butt: the bo's moves, but every blow lands with the iron end. Slow and crushing." },
  { id: 'kama', name: 'Kama pair', reach: .85, weight: { stop: .8, shake: 1.1 }, carry: 'obi', ext: [1, 5.2], hands: 'one', off: { ang: 1.05 },
    about: "Two hand sickles through the obi: the twin tanto's footwork, but they hook and every cut drags back toward him." },
  { id: 'jitte', name: 'Jitte', reach: .75, weight: { stop: .8, shake: 1 }, carry: 'obi', ext: [2.4, 8], hands: 'one',
    about: "An iron truncheon with a blade-catching hook, through the obi: the katana's moves, short and blunt. Made for the counter." },
  { id: 'daisho', name: 'Daisho', reach: 1, weight: { stop: 1.1, shake: 1.1 }, carry: 'hip', ext: [2.6, 11.7], hands: 'one', off: { ang: .7 },
    about: 'The katana and the wakizashi together: the long blade leads, the short one rides in the back hand, and the answer cut is his.' },
  { id: 'nunchaku', name: 'Nunchaku', reach: .95, weight: { stop: .7, shake: 1 }, carry: 'obi', ext: [.9, 3.6], hands: 'one',
    about: 'Two short sticks on a cord, tucked in the obi: fast whipping swings, the free stick a beat behind the one in his fist.' },
  { id: 'wakizashi', name: 'Wakizashi', reach: .85, weight: { stop: .8, shake: 1 }, carry: 'hip', ext: [1.9, 8.6], hands: 'two',
    about: "The short sword alone at the hip: the katana's cuts, quicker and closer in, the lightest blade he carries." },
], { cuts: CUTS, stow: STOW, models: MODELS });
export { WEAPON, equip };
