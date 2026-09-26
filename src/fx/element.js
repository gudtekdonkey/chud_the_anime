import { COL, RC } from '../config.js';
import { FRAG_COLS } from './util.js';
import { FIRE, SLIME, WATER, WIND, PSYCHIC } from './matter.js';

// ---- Elements: a palette, and a kit of matter that replaces the lightning and the glitch; every effect goes through these ----
// fx / fx2 / eye: the three effect tones (dark, pale, glow). core: what the hot white centre becomes. flash: the screen flash.
// kit: flames, goo, water, wind or motes (fx/matter.js); none means lightning, drawn in the `bolt` shape. glitch: he breaks into slices.
export const ELEMENTS = {
  storm:  { name: 'Storm', chain: 'STORM',  fx: '#52e8d6', fx2: '#b8fff6', eye: '#6ff3e4', eyeD: '#2e6a64', core: '#ffffff', flash: '#e4fffb', bolt: 'jag', glitch: true },
  fire:   { name: 'Fire', chain: 'BLAZE',   fx: '#ff6a2a', fx2: '#ffc15a', eye: '#ff9440', eyeD: '#6a2e14', core: '#fff2c4', flash: '#fff0dc', kit: FIRE },
  slime:  { name: 'Slime', chain: 'OOZE',  fx: '#6fcf2e', fx2: '#c4ef62', eye: '#94e645', eyeD: '#35601a', core: '#f0fcc4', flash: '#efffd6', kit: SLIME },
  water:  { name: 'Water', chain: 'TIDE',  fx: '#3b8ff0', fx2: '#a2d6ff', eye: '#62b2ff', eyeD: '#1f4a78', core: '#eef8ff', flash: '#e2f1ff', kit: WATER },
  wind:   { name: 'Wind', chain: 'GALE',   fx: '#9fc9b4', fx2: '#e2f3ea', eye: '#c6e6d6', eyeD: '#4a6358', core: '#ffffff', flash: '#f2faf6', kit: WIND },
  energy: { name: 'Energy', chain: 'SURGE', fx: '#a45cff', fx2: '#dcb6ff', eye: '#c27cff', eyeD: '#4e2a78', core: '#fbefff', flash: '#f2e4ff', bolt: 'beam', glitch: true },
  psychic: { name: 'Psychic', chain: 'PSI', fx: '#e0509a', fx2: '#ffb8dc', eye: '#ff79bd', eyeD: '#6a2448', core: '#fff0f8', flash: '#ffe6f2', kit: PSYCHIC },
};
export const EL = { key: 'storm', cur: ELEMENTS.storm };
export function setElement(k) {
  const e = ELEMENTS[k]; if (!e) return; EL.key = k; EL.cur = e;
  COL.fx = e.fx; COL.fx2 = e.fx2; COL.eye = e.eye; COL.core = e.core; COL.flash = e.flash;
  RC.E = e.eye; RC.e = e.eyeD;       // his eyes too; the sheets are rebaked after a swap
  FRAG_COLS[0] = e.fx; FRAG_COLS[1] = e.fx2;
}
// white is the hot core of every effect; it takes the element's core tone at draw time (his hit flash stays pure white)
export const cc = c => c === '#ffffff' ? COL.core : c;
// the executions keep storm hexes on their stage; this maps them to the element's tones when they are drawn
const STORM_HEX = { '#6ff3e4': 'eye', '#b8fff6': 'fx2', '#52e8d6': 'fx', '#ffffff': 'core' };
export const ec = c => STORM_HEX[c] ? COL[STORM_HEX[c]] : c;
