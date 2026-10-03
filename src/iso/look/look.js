// ---- The game's looks behind the engine's seam (ronin-engine/render/look.js): Iron Ash in 3D and the pages' pixel
// drawing, interchangeable (owner 2026-10-02: "should be interchangeable though")
import { LOOKS, makeLook } from 'ronin-engine/render/look.js';
import { threeLook } from './three/look3d.js';
import { pixelLook } from './pixel/lookpix.js';

Object.assign(LOOKS, { '3d': threeLook, pixel: pixelLook });
export { LOOKS, makeLook };
