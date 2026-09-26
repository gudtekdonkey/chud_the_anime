// ---- Drawing sprites from a sheet ----
const tint = document.createElement('canvas'), tg = tint.getContext('2d');

export function spriteTo(ctx, sheet, f, x, y, face, alpha = 1) {
  const w = sheet.fw, h = sheet.fh;
  ctx.save(); ctx.globalAlpha *= alpha;
  ctx.translate(Math.round(x), Math.round(y));
  if (face < 0) ctx.scale(-1, 1);
  ctx.drawImage(sheet.img, f * w, 0, w, h, -sheet.ox, -sheet.oy, w, h);
  ctx.restore();
}
// the current frame recoloured solid (source-in), so any sprite can flash or ghost
export function solid(sh, f, col) {
  tint.width = sh.fw; tint.height = sh.fh;
  tg.drawImage(sh.img, f * sh.fw, 0, sh.fw, sh.fh, 0, 0, sh.fw, sh.fh);
  tg.globalCompositeOperation = 'source-in'; tg.fillStyle = col; tg.fillRect(0, 0, sh.fw, sh.fh); tg.globalCompositeOperation = 'source-over';
  return { img: tint, fw: sh.fw, fh: sh.fh, ox: sh.ox, oy: sh.oy };
}
