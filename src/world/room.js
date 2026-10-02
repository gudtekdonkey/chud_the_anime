import { W, H } from '../config.js';

// ---- Room ----
const FLOOR = { x0: 14, y0: 58, x1: 466, y1: 262 };
export const PILLARS = [{ x: 120, y: 132, w: 22, h: 12 }, { x: 338, y: 132, w: 22, h: 12 }, { x: 230, y: 214, w: 22, h: 12 }];
export const bg = document.createElement('canvas'); bg.width = W; bg.height = H;
(() => {
  const g = bg.getContext('2d'); let r = 11;
  const rnd = () => (r = (r * 16807) % 2147483647) / 2147483647;
  g.fillStyle = '#474c4a'; g.fillRect(0, 0, W, H);
  for (let i = 0; i < 2600; i++) { g.fillStyle = rnd() < .5 ? '#434846' : '#4b504e'; g.fillRect(rnd() * W | 0, rnd() * H | 0, 2, 1); }
  g.fillStyle = '#414644';
  for (let y = 70; y < H; y += 32) g.fillRect(0, y, W, 1);
  for (let x = 16; x < W; x += 32) for (let y = 70; y < H; y += 32) g.fillRect(x + ((y / 32 | 0) % 2) * 16, y, 1, 32);
  // back wall
  g.fillStyle = '#2b2f2e'; g.fillRect(0, 0, W, 46);
  g.fillStyle = '#343938'; g.fillRect(0, 46, W, 12);
  g.fillStyle = '#5b615e'; g.fillRect(0, 57, W, 1);
  g.fillStyle = '#262a29';
  for (let y = 6; y < 46; y += 10) for (let x = (y / 10 % 2) * 12; x < W; x += 24) g.fillRect(x, y, 1, 10);
  for (let y = 6; y < 46; y += 10) g.fillRect(0, y, W, 1);
  g.fillStyle = '#1d2020'; g.fillRect(0, 0, 14, H); g.fillRect(W - 14, 0, 14, H);
})();
// the room drawn MARGIN px past every edge of the screen (its edges mirrored out), so the camera's look-ahead and the shake
// (world/camera.js) never show past the room
export const MARGIN = 12;
export const bgX = document.createElement('canvas'); bgX.width = W + 2 * MARGIN; bgX.height = H + 2 * MARGIN;
(() => { const g = bgX.getContext('2d'), M = MARGIN, flip = (src, sx, sy, sw, sh, tx, ty, fx, fy, dx, dy) => {
    g.save(); g.translate(tx, ty); g.scale(fx, fy); g.drawImage(src, sx, sy, sw, sh, dx, dy, sw, sh); g.restore(); };
  g.drawImage(bg, M, M);
  flip(bg, 0, 0, M, H, M, M, -1, 1, 0, 0); flip(bg, W - M, 0, M, H, W + M, M, -1, 1, -M, 0);   // the side walls
  const c = document.createElement('canvas'); c.width = bgX.width; c.height = bgX.height; c.getContext('2d').drawImage(bgX, 0, 0);
  flip(c, 0, M, W + 2 * M, M, 0, M, 1, -1, 0, 0); flip(c, 0, H, W + 2 * M, M, 0, H + M, 1, -1, 0, -M); })();   // the back wall, the floor
export function drawPillar(g, p) {
  g.fillStyle = '#2b2f2e'; g.fillRect(p.x, p.y - 30, p.w, p.h + 30);
  g.fillStyle = '#3c4140'; g.fillRect(p.x, p.y - 34, p.w, 6);
  g.fillStyle = '#5b615e'; g.fillRect(p.x, p.y - 34, p.w, 1);
  g.fillStyle = '#232625'; g.fillRect(p.x + p.w - 4, p.y - 28, 4, p.h + 28);
}
export function collide(nx, ny) {
  nx = Math.max(FLOOR.x0 + 6, Math.min(FLOOR.x1 - 6, nx));
  ny = Math.max(FLOOR.y0, Math.min(FLOOR.y1, ny));
  for (const p of PILLARS) {
    if (nx > p.x - 5 && nx < p.x + p.w + 5 && ny > p.y - 2 && ny < p.y + p.h + 2) {
      const dx = Math.min(nx - (p.x - 5), p.x + p.w + 5 - nx), dy = Math.min(ny - (p.y - 2), p.y + p.h + 2 - ny);
      if (dx < dy) nx = nx - (p.x - 5) < p.x + p.w + 5 - nx ? p.x - 5 : p.x + p.w + 5;
      else ny = ny - (p.y - 2) < p.y + p.h + 2 - ny ? p.y - 2 : p.y + p.h + 2;
    }
  }
  return [nx, ny];
}
