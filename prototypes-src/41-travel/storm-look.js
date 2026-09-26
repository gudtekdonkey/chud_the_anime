// ---- The glitch storm's look at game scale (480 × 270, whole pixels) ----
// The game's glitch language only: cyan #52e8d6 / #6ff3e4 / #b8fff6 and white on the dark; torn scanlines that slide sideways like his
// idle glitch and sliceGlitch; the Rewind execution's damaged tape (a held frame, a noise band); his teleport's slivers; jagged
// whole-pixel bolts; and one thing of its own, the tear: a seam in the air that opens on nothing and closes.
// Restraint (owner-taste.md): nothing on the floor (no ripples, no rings, no sigils), nothing rising off his head, no smoke.
// Written to move into src/fx/ once the owner approves the look: it needs only a 2D context, k (0..1) and the storm's side.
const FX = '#52e8d6', FX1 = '#6ff3e4', FX2 = '#b8fff6', WH = '#ffffff', VOID = '#050607', INK = '#0d1012';
const rr = (a, b) => a + Math.random() * (b - a), ri = (a, b) => Math.floor(rr(a, b + 1)), sgn = () => Math.random() < .5 ? -1 : 1;
export const LAYERS = { pall: 'The light', slices: 'Torn scanlines', split: 'Cyan split', tears: 'Tears in the air', slivers: 'Slivers', bolts: 'Bolts', stutter: 'Lost time (tape)', people: 'People glitching' };

export function makeStorm(W, H) {
  const tmp = document.createElement('canvas'); tmp.width = W; tmp.height = H;
  const held = document.createElement('canvas'); held.width = W; held.height = H;
  return { W, H, tmp, held, burst: null, tears: [], slivers: [], bolts: [], freeze: 0, noise: 0, t: 0, flash: 0 };
}
// where on the screen things happen: at the edge of a storm they gather on the side it lies (side: -1 left, 1 right, 0 all over)
const across = (S, k, side) => { const u = Math.random(); if (!side || k > .55) return u * S.W; const b = Math.pow(u, 1 + (0.55 - k) * 5) * S.W; return side > 0 ? S.W - b : b; };

// step the storm's pieces; k: strength here, side: which side of the screen the storm's heart is on, drift: the storm's heading in x (-1..1)
export function stormUpdate(S, dt, k, side, drift, L, avoidX, focus = [S.H * .4, S.H * .7]) {
  S.t += dt; if (S.freeze > 0) { S.freeze--; if (!S.freeze) S.noise = 2; return; }
  if (S.noise > 0) S.noise--;
  if (S.flash > 0) S.flash -= dt;
  // torn scanlines come in bursts of a few frames, more often and wider toward the heart
  if (L.slices || L.split) {
    if (S.burst && --S.burst.frames <= 0) S.burst = null;
    if (!S.burst && Math.random() < (.35 + 5 * k * k) * dt) {
      const n = ri(1, 1 + Math.round(6 * k)), bands = [];
      for (let i = 0; i < n; i++) { const big = k > .7 && Math.random() < .12, x0 = Math.max(0, across(S, k, side) - rr(40, 220));
        // half the strips run through where the people stand, so the slide shows on real pixels, not on bare floor
        bands.push({ y: Math.random() < .5 ? ri(focus[0], focus[1]) : ri(0, S.H - 4), h: big ? ri(6, 16) : ri(1, 1 + Math.round(3 * k)), x0: Math.round(x0), x1: Math.round(Math.min(S.W, x0 + rr(40, 140 + 200 * k))), off: sgn() * ri(2, 2 + Math.round(12 * k)) }); }
      S.burst = { frames: ri(2, 3 + Math.round(6 * k)), bands };
    } else if (S.burst) for (const b of S.burst.bands) if (Math.random() < .3) b.off = sgn() * ri(1, 2 + Math.round(12 * k));
  } else S.burst = null;
  // tears open only in a real storm, never on top of him
  if (L.tears && k > .3 && Math.random() < (k - .3) * 2.4 * dt && S.tears.length < 1 + k * 4) {
    let x = 0; for (let t = 0; t < 8; t++) { x = Math.round(across(S, k, side)); if (Math.abs(x - avoidX) > 28 && x > 8 && x < S.W - 8) break; }
    const h = ri(24, 40 + Math.round(80 * k)), top = ri(4, S.H - h - 30), jag = [];
    let o = 0; for (let y = 0; y <= h; y += ri(3, 5)) { o = Math.max(-3, Math.min(3, o + ri(-2, 2))); jag.push([y, o]); }
    S.tears.push({ x, top, h, jag, w: rr(2, 2 + 4 * k), age: 0, open: .07, hold: rr(.2, .35 + .4 * k), close: .05 });
  }
  for (let i = S.tears.length - 1; i >= 0; i--) { const t = S.tears[i]; t.age += dt;
    if (t.age > t.open + t.hold + t.close) { S.tears.splice(i, 1); if (L.slivers) spray(S, t.x, t.top, t.h, 10, drift); } }
  // slivers: a steady drift of fragments on the storm's wind, like his teleport's residue
  if (L.slivers) { const want = 6 + 70 * k; while (S.slivers.length < want && Math.random() < .5 + k) spray(S, across(S, k, side), rr(0, S.H), 1, 1, drift); }
  for (let i = S.slivers.length - 1; i >= 0; i--) { const s = S.slivers[i]; s.life -= dt; if (s.life <= 0) { S.slivers.splice(i, 1); continue; }
    s.x += s.vx * dt; s.y += s.vy * dt; if (Math.random() < .08) s.x += sgn(); s.on = Math.random() > .15; }
  // bolts: rare, from an open tear down to the ground, two frames and gone
  if (L.bolts && k > .6 && S.tears.length && Math.random() < (k - .6) * 1.8 * dt) { const t = S.tears[ri(0, S.tears.length - 1)];
    S.bolts.push({ pts: jag(t.x, t.top + t.h, t.x + ri(-30, 30), Math.min(S.H - 4, t.top + t.h + ri(30, 80))), life: 2 }); S.flash = .04; }
  for (let i = S.bolts.length - 1; i >= 0; i--) if (--S.bolts[i].life < 0) S.bolts.splice(i, 1);
  // lost time: the picture holds for a few frames like a caught tape, then jumps on through a band of noise
  if (L.stutter && k > .5 && Math.random() < (k - .5) * .5 * dt) S.freeze = ri(4, 4 + Math.round(8 * k));
}
function spray(S, x, y, h, n, drift) { for (let i = 0; i < n; i++) { const life = rr(.35, 1.1);
  S.slivers.push({ x: x + rr(-6, 6), y: y + rr(0, h), w: ri(1, 4), col: [FX, FX2, WH, INK][ri(0, 3)], vx: drift * rr(14, 34) + rr(-4, 4), vy: rr(-3, 3), life, on: true }); } }
function jag(x0, y0, x1, y1) { const pts = [[x0, y0]], n = Math.max(3, Math.round(Math.hypot(x1 - x0, y1 - y0) / 5));
  for (let i = 1; i < n; i++) pts.push([Math.round(x0 + (x1 - x0) * i / n + ri(-3, 3)), Math.round(y0 + (y1 - y0) * i / n)]); pts.push([x1, y1]); return pts; }
function line(g, [x0, y0], [x1, y1]) { const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)); for (let i = 0; i <= n; i++) g.fillRect(Math.round(x0 + (x1 - x0) * i / n), Math.round(y0 + (y1 - y0) * i / n), 1, 1); }

// is the picture held this frame? (the page skips drawing the world and shows the held frame)
export const frozen = S => S.freeze > 0;
export function hold(S, g) { S.held.getContext('2d').drawImage(g.canvas, 0, 0); }

// over the finished frame: the light, the tears, the torn scanlines, slivers, bolts, the noise band
export function stormDraw(g, S, k, L) {
  const { W, H } = S;
  if (S.freeze > 0) { g.drawImage(S.held, 0, 0); return; }
  if (L.pall && k > 0) { g.fillStyle = `rgba(6,10,12,${(.24 * k).toFixed(3)})`; g.fillRect(0, 0, W, H); g.fillStyle = `rgba(82,232,214,${(.025 * k).toFixed(3)})`; g.fillRect(0, 0, W, H); }
  // tears: the world pushed apart on either side of a seam, and nothing inside it
  for (const t of S.tears) {
    const a = t.age, op = a < t.open ? a / t.open : a < t.open + t.hold ? 1 : 1 - (a - t.open - t.hold) / t.close, pulse = .8 + .2 * Math.sin(a * 40);
    const w = t.w * op * pulse;
    for (let i = 0; i < t.jag.length - 1; i++) { const [y0, o0] = t.jag[i], [y1, o1] = t.jag[i + 1];
      for (let y = y0; y < y1; y++) { const u = (y) / t.h, hw = Math.round(w * Math.pow(Math.sin(Math.PI * u), .6)), cx = t.x + Math.round(o0 + (o1 - o0) * (y - y0) / (y1 - y0)), yy = t.top + y;
        if (hw >= 1) { // push the world aside by the tear's width, then the void, cyan lips, a light edge
          g.drawImage(g.canvas, cx - 14, yy, 14, 1, cx - 14 - hw, yy, 14, 1); g.drawImage(g.canvas, cx + 1, yy, 14, 1, cx + 1 + hw, yy, 14, 1);
          g.fillStyle = VOID; g.fillRect(cx - hw, yy, 2 * hw + 1, 1);
          g.fillStyle = FX; g.fillRect(cx - hw - 1, yy, 1, 1); g.fillRect(cx + hw + 1, yy, 1, 1);
          if (Math.random() < .12) { g.fillStyle = Math.random() < .5 ? FX2 : WH; g.fillRect(cx + ri(-hw, hw), yy, 1, 1); }
        } else { g.fillStyle = Math.random() < .7 ? WH : FX2; g.fillRect(cx, yy, 1, 1); } } }
  }
  // torn scanlines: strips of the frame slide sideways by whole pixels, a cyan lip along the tear, a cyan ghost of the strip beside it
  if (S.burst) {
    const tg = S.tmp.getContext('2d');
    for (const b of S.burst.bands) {
      const w = b.x1 - b.x0; if (w <= 0) continue;
      tg.clearRect(0, 0, w, b.h); tg.drawImage(g.canvas, b.x0, b.y, w, b.h, 0, 0, w, b.h);
      if (L.split) { g.save(); g.globalAlpha = .22 + .2 * k; g.globalCompositeOperation = 'screen';
        tg.globalCompositeOperation = 'source-atop'; tg.fillStyle = FX; tg.fillRect(0, 0, w, b.h); tg.globalCompositeOperation = 'source-over';
        g.drawImage(S.tmp, 0, 0, w, b.h, b.x0 + b.off + sgn() * 2, b.y, w, b.h); g.restore();
        tg.clearRect(0, 0, w, b.h); tg.drawImage(g.canvas, b.x0, b.y, w, b.h, 0, 0, w, b.h); }
      if (L.slices) { g.drawImage(S.tmp, 0, 0, w, b.h, b.x0 + b.off, b.y, w, b.h);
        // tape scanlines inside a heavy strip
        if (b.h > 4) { g.fillStyle = 'rgba(0,0,0,.18)'; for (let y = b.y + 1; y < b.y + b.h; y += 2) g.fillRect(b.x0 + b.off, y, w, 1); }
        // the torn lip: a few short cyan marks along the strip's edge, not a drawn line
        g.fillStyle = FX; for (let x = b.x0 + b.off + ri(0, 20); x < b.x0 + b.off + w; x += ri(10, 36)) g.fillRect(x, b.y, ri(1, 5), 1);
        if (Math.random() < .5) { g.fillStyle = WH; g.fillRect(b.off > 0 ? b.x0 + b.off : b.x0 + b.off + w - 1, b.y, 1, b.h); } }
    }
  }
  for (const s of S.slivers) if (s.on) { g.globalAlpha = Math.min(1, s.life * 2); g.fillStyle = s.col; g.fillRect(Math.round(s.x), Math.round(s.y), s.w, 1); }
  g.globalAlpha = 1;
  for (const b of S.bolts) { g.fillStyle = FX; for (let i = 0; i < b.pts.length - 1; i++) { const [x0, y0] = b.pts[i], [x1, y1] = b.pts[i + 1]; line(g, [x0 - 1, y0], [x1 - 1, y1]); line(g, [x0 + 1, y0], [x1 + 1, y1]); }
    g.fillStyle = WH; for (let i = 0; i < b.pts.length - 1; i++) line(g, b.pts[i], b.pts[i + 1]); }
  if (S.flash > 0) { g.fillStyle = 'rgba(184,255,246,.07)'; g.fillRect(0, 0, W, H); }
  // the tape catching up: one frame of a noise band where the picture jumped
  if (S.noise > 0) { const y = ri(10, H - 20), h = ri(2, 6); for (let yy = y; yy < y + h; yy++) for (let x = 0; x < W; x += 1) if (Math.random() < .55) { const v = ri(90, 255); g.fillStyle = `rgb(${v},${v},${v})`; g.fillRect(x, yy, 1, 1); } }
}

// a person inside the storm: his own pixels sliced sideways (sliceGlitch's way), now and then with a cyan double a step off.
// Returns a canvas to draw in place of the sprite, or the sprite itself on a quiet frame
const fcv = document.createElement('canvas'), fcg = fcv.getContext('2d');
export function glitchFigure(img, k, seedT) {
  if (k <= 0 || Math.random() > .06 + k * .35) return img;
  fcv.width = img.width; fcv.height = img.height; fcg.clearRect(0, 0, fcv.width, fcv.height);
  for (let y = 0; y < img.height;) { const h = ri(1, 3), off = Math.random() < k * .8 ? sgn() * ri(1, 1 + Math.round(5 * k)) : 0;
    fcg.drawImage(img, 0, y, img.width, h, off, y, img.width, h); y += h; }
  // the cyan double, one step behind or ahead, and a few dashes (sliceGlitch's cyan marks)
  if (Math.random() < k * .5) { fcg.save(); fcg.globalCompositeOperation = 'destination-over'; fcg.globalAlpha = .45; fcg.drawImage(tint(img), sgn() * ri(2, 4), 0); fcg.restore(); }
  fcg.fillStyle = FX; for (let i = 0; i < 3 * k; i++) fcg.fillRect(ri(34, 54), ri(22, 52), ri(2, 7), 1);
  return fcv;
}
const tcv = document.createElement('canvas'), tcg = tcv.getContext('2d');
function tint(img) { tcv.width = img.width; tcv.height = img.height; tcg.clearRect(0, 0, tcv.width, tcv.height); tcg.drawImage(img, 0, 0);
  tcg.globalCompositeOperation = 'source-atop'; tcg.fillStyle = FX1; tcg.fillRect(0, 0, tcv.width, tcv.height); tcg.globalCompositeOperation = 'source-over'; return tcv; }
