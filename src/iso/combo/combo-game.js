// ---- The combo prompts (the engine's, ronin-engine/iso/combo/prompts.js) wired to this game: today's INV counts the
// landed basic cuts, a PERFECT feeds its Qi, the grade is said over his head in the effect colour (COL, live: an
// element re-skins it)
import { COMBO } from 'ronin-engine/iso/combo/prompts.js';
import { INV, qiAdd } from '../items/inv.js';
import { say } from '../hud/world-ui.js';
import { COL } from '../../config.js';

Object.assign(COMBO, { inv: INV, qiAdd, say }); Object.defineProperty(COMBO, 'perfect', { get: () => COL.fx2 });
export * from 'ronin-engine/iso/combo/prompts.js';
