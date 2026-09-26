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
