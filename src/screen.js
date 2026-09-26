// ---- The page's game canvas (drawn 1:1 at 480x270, CSS-upscaled) and the HUD line under it ----
import { W, H, PX } from './config.js';
export const game = document.getElementById('game');
game.width = W * PX; game.height = H * PX;
export const g = game.getContext('2d');
export const hud = document.getElementById('hud');
