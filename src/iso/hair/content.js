// ---- This game's hairstyles and hats into the engine's head slot (ronin-engine/iso/hair/registry.js), checked by the
// contract there; the hero starts in Iron Ash's jingasa, the samurai bare-headed with the topknot (owner)
import { defineHeads } from 'ronin-engine/iso/hair/registry.js';
import { HAIR, COLS, DEFAULT_HAIR } from './styles.js';
import { HATS } from './hats.js';

defineHeads({ hair: HAIR, hats: HATS, cols: COLS, defaults: DEFAULT_HAIR,
  heads: { hero: { hair: DEFAULT_HAIR.hero, hat: 'jingasa' }, foe: { hair: DEFAULT_HAIR.foe, hat: 'none' } } });
