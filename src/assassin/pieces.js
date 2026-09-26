import { FW, FH, OX, OY, RC } from '../config.js';
import { rig } from '../rig/rig.js';
import { pz, ease } from '../rig/pose.js';
import { rr } from '../fx/util.js';
import { weapon } from '../weapons/weapons.js';
import { EL, ec } from '../fx/element.js';

// ---- Execution bodies: the rig drawn live from a pose (ronin or enemy), and the enemy cut into real pieces of his own pixels ----
// the enemy samurai: his body, no hat or mantle, in a darker red-grey (from prototypes/14-executions-batch-1.html)
export const ERC = { ...RC, K: '#3a2e31', D: '#5a4a4e', E: '#ff5a4a', W: '#cfd4d6', S: '#7d868e', s: '#3a3033' };
const ERC_OUT = { ...ERC, E: '#2b2023' };   // his eye gone out
export const EYE_ON = 'rgb(255,90,74)', EYE_OFF = 'rgb(43,32,35)';
const off = document.createElement('canvas'); off.width = FW; off.height = FH; const og = off.getContext('2d', { willReadFrequently: true });
const tint = document.createElement('canvas'); tint.width = FW; tint.height = FH; const tg = tint.getContext('2d');
// the ronin carries his equipped weapon through the executions (katana poses, run through the weapon's adapt); enemies keep the katana
function armed(pose) { const w = weapon(); if (w.id === 'katana') return pose; return { ...(w.adapt ? w.adapt(pose) : pose), wp: w.art }; }
function paint(pose, enemy, dark) { og.clearRect(0, 0, FW, FH); rig(og, 0, enemy ? { ...pose, bare: true } : armed(pose), enemy ? dark ? ERC_OUT : ERC : RC); return off; }
// R: { x, y, z, face, pose, enemy, dark (his eye out), col (solid tint), glitch (0..2: rows jump sideways) }
export function figure(g, R, alpha = 1) {
  let img = paint(R.pose, R.enemy, R.dark);
  if (R.col) { tg.clearRect(0, 0, FW, FH); tg.drawImage(img, 0, 0); tg.globalCompositeOperation = 'source-in'; tg.fillStyle = ec(R.col); tg.fillRect(0, 0, FW, FH); tg.globalCompositeOperation = 'source-over'; img = tint; }
  g.save(); g.globalAlpha *= alpha; g.translate(Math.round(R.x), Math.round(R.y - (R.z || 0))); if (R.face < 0) g.scale(-1, 1);
  if (R.glitch && EL.cur.glitch) { for (let y = 0; y < FH;) { const h = 1 + (Math.random() * 3 | 0), o = Math.random() < R.glitch ? Math.round(rr(-5, 5) * R.glitch) : 0; g.drawImage(img, 0, y, FW, h, -OX + o, y - OY, FW, h); y += h; } }
  else g.drawImage(img, -OX, -OY);
  g.restore();
}
// his floor reflection and shadow, then the figure; a struck body is a white silhouette
export function withShadow(g, R, alpha = 1) {
  g.save(); g.globalAlpha = .17 * alpha; g.translate(0, 2 * R.y + 1); g.scale(1, -1); figure(g, { ...R, glitch: 0, col: R.flash ? null : R.col }); g.restore();
  g.globalAlpha = alpha; g.fillStyle = 'rgba(18,22,22,.4)'; g.fillRect(Math.round(R.x) - 5, Math.round(R.y) + 1, 10, 1); g.globalAlpha = 1;
  figure(g, R.flash ? { ...R, col: '#ffffff' } : R, alpha);
}

// ---- pieces: the enemy cut apart along lines, each chunk tumbling and falling ----
// cut from the body as it is seen (the stage enemy's springs), not from where it is headed; part: a pose of its own, as authored
export function pixelsOf(E) {
  const b = !E.part && E.body, pose = b ? { ...b.out, noHead: E.pose.noHead, noUpper: E.pose.noUpper, empty: E.pose.empty } : E.pose;
  paint(pose, true, E.dark); const d = og.getImageData(0, 0, FW, FH).data, out = [];
  for (let y = 0; y < FH; y++) for (let x = 0; x < FW; x++) { const i = (y * FW + x) * 4; if (d[i + 3] < 10) continue;
    out.push([E.x + E.face * (x - OX) + (E.face < 0 ? -1 : 0), E.y - (E.z || 0) + (y - OY), `rgb(${d[i]},${d[i + 1]},${d[i + 2]})`]); }
  return out;
}
export const side = (L, x, y) => (L[2] - L[0]) * (y - L[1]) - (L[3] - L[1]) * (x - L[0]) > 0 ? 1 : 0;
export function toPieces(pts, lines, floorY, push) {
  const groups = new Map();
  for (const p of pts) { const k = lines.map(L => side(L, p[0], p[1])).join(''); (groups.get(k) || groups.set(k, []).get(k)).push(p); }
  const out = [];
  for (const g of groups.values()) { if (g.length < 3) continue;
    const cx = g.reduce((s, p) => s + p[0], 0) / g.length, cy = g.reduce((s, p) => s + p[1], 0) / g.length;
    const P = { pts: g.map(p => [p[0] - cx, p[1] - cy, p[2]]), x: cx, fy: floorY, z: floorY - cy, vx: 0, vy: 0, vz: 0, a: 0, va: 0, rest: 0, life: 9 };
    push(P, cx, cy); out.push(P); }
  return out;
}
export function splitPiece(S, P, L, kick) {   // cut an airborne chunk in two along a world line
  const pts = P.pts.map(([dx, dy, c]) => { const ca = Math.cos(P.a), sa = Math.sin(P.a); return [P.x + dx * ca - dy * sa, P.fy - P.z + dx * sa + dy * ca, c]; });
  const i = S.pieces.indexOf(P); if (i >= 0) S.pieces.splice(i, 1);
  toPieces(pts, [L], P.fy, (Q, cx, cy) => { const s = side(L, cx, cy) ? 1 : -1; Q.vx = P.vx + s * kick * .6 + rr(-10, 10); Q.vz = P.vz + rr(-20, 30); Q.va = P.va + s * rr(4, 9); S.pieces.push(Q); });
}
export const lowest = P => Math.max(...P.pts.map(([dx, dy]) => dx * Math.sin(P.a) + dy * Math.cos(P.a)));
export function updatePieces(S, dt) {
  for (const P of S.pieces) {
    if (P.script) { P.st = (P.st || 0) + dt; const o = P.script(P.st); P.x = P.x0 + o.dx; P.a = o.a;
      P.z = Math.max(lowest(P), P.z0 + (o.dz || 0));
      if (o.done) P.life -= dt; continue; }
    if (P.rest < 1) { P.x += P.vx * dt; P.z += P.vz * dt; P.vz -= 320 * dt; P.a += P.va * dt;
      const low = lowest(P);
      // lands heavy: almost no bounce, then settles
      if (P.z - low <= 0 && P.vz < 0) { P.z = low; P.vz = -P.vz * .06; P.vx *= .55; P.va *= .3; if (Math.abs(P.vz) < 25) { P.vz = 0; P.va = 0; P.vx *= .6; P.rest += .34; } } }
    else {
      if (P.flatA == null) { const xs = P.pts.map(q => q[0]), ys = P.pts.map(q => q[1]), w = Math.max(...xs) - Math.min(...xs), h = Math.max(...ys) - Math.min(...ys);
        const q = h > w * 1.2 ? Math.PI / 2 : Math.PI; P.flatA = Math.round(P.a / q) * q; if (h > w * 1.2 && Math.abs(Math.round(P.a / Math.PI) * Math.PI - P.a) < .01) P.flatA = P.a >= 0 ? Math.PI / 2 : -Math.PI / 2; }
      P.a += (P.flatA - P.a) * Math.min(1, dt * 10);   // tip over onto its long side
      P.z = lowest(P);
      P.life -= dt;
    }
  }
  for (let i = S.pieces.length - 1; i >= 0; i--) if (S.pieces[i].life <= 0) S.pieces.splice(i, 1);
}
export function drawPieces(g, S, alpha = 1) {
  for (const P of S.pieces) { const ca = Math.cos(P.a), sa = Math.sin(P.a); g.globalAlpha = alpha * Math.min(1, P.life * 2);
    for (const [dx, dy, c] of P.pts) { g.fillStyle = c; g.fillRect(Math.round(P.x + dx * ca - dy * sa), Math.round(P.fy - P.z + dx * sa + dy * ca), 1, 1); } }
  g.globalAlpha = 1;
}
// a falling top half: the drop, the turn it was already making, then still
export const fallScript = (dir, turn, delay = 0) => t => { const u = Math.max(0, t - delay), g = Math.min(1, u / .42);
  return { dx: dir * (u * 9 + g * 4), dz: -46 * g * g, a: turn * 1.55 * ease(Math.min(1, u / .5)), done: t > 1.3 + delay }; };
// a diagonal cut: the top piece slides down the slope of the cut, then drops off and falls flat
export const slideOff = (dir, slope) => t => { const a1 = Math.min(1, t / .42), s = 7 * a1 * a1, u = Math.max(0, t - .36), g = Math.min(1, u / .45);
  return { dx: dir * (s + u * 10), dz: -s * slope - 46 * g * g, a: dir * 1.55 * g * g, done: t > 1.7 }; };
export function shatter(S, E, lines, push) { S.pieces.push(...toPieces(pixelsOf(E), lines, E.y, push)); E.gone = true; }
// cut in two: the upper part becomes pieces, the legs stay with him and fold on their own
export function sever(S, E, L, push) {
  const up = side(L, E.x, E.y - 40);
  S.pieces.push(...toPieces(pixelsOf(E).filter(q => side(L, q[0], q[1]) === up), [], E.y, push));
}
// what one pose has that another lacks (the head, the sword), as its own piece
export function partOf(E, pose, without) {
  const rest = new Set(pixelsOf({ ...E, part: true, pose: pz({ ...pose, ...without }) }).map(q => q[0] + ',' + q[1]));
  return pixelsOf({ ...E, part: true, pose }).filter(q => !rest.has(q[0] + ',' + q[1]));
}
// his sword leaves his hand as its own piece, cut from his pixels, and clatters down
export function dropSword(S, E, pose, dir = -1) {
  S.pieces.push(...toPieces(partOf(E, pose, { sword: null }), [], E.y, P => { P.x0 = P.x; P.z0 = P.z;
    P.script = tt => { const k = Math.min(1, tt / .3); return { dx: dir * k * 3, dz: -k * k * 40, a: -dir * k * 1.1, done: tt > 1.6 }; }; }));
}
