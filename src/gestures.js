// ---- The touch gesture recogniser (from prototype 46, owner picks C7A … C9A): no game code here. It turns finger strokes on
// the play surface into named gestures and hands them to on(g); the game decides what each does (player/touch.js). Thresholds
// are CSS pixels and milliseconds, so it reads the same on any screen.
//   stick   C7A two thumbs: a press on the left 45% is a floating stick, wherever it lands (STICK_FULL px is full speed, under
//           half of it walks)
//   tap     down and up inside TAP_MOVE px and TAP_MS                       → J
//   double  a second finger down within DBL_MS and DBL_PX of a tap           → K, fired on the second DOWN so a single tap never waits
//   swipe   SWIPE_PX or more at SWIPE_SPEED px/ms (timed from when it left the tap radius) → one of 8 sectors of 45°
//   hold    still (inside HOLD_MOVE) for HOLD_MS                             → hold-start, then hold-end on release
//   flick   there and back inside FLICK_MS: FLICK_RATIO × the net distance or more of path, with a reversal → parry
//   two     two fingers down within TWO_MS of each other, both up without moving → a skill
export const G = { TAP_MS: 220, TAP_MOVE: 12, DBL_MS: 230, DBL_PX: 48, SWIPE_PX: 26, SWIPE_SPEED: .28, HOLD_MS: 280, HOLD_MOVE: 14,
  FLICK_MS: 380, FLICK_RATIO: 2.2, TWO_MS: 160, STICK_DEAD: 6, STICK_FULL: 34, WALK_BELOW: .5, LEFT: .45 };
export const DIR8 = ['R', 'DR', 'D', 'DL', 'L', 'UL', 'U', 'UR'];
export const VEC = { R: [1, 0], DR: [.707, .707], D: [0, 1], DL: [-.707, .707], L: [-1, 0], UL: [-.707, -.707], U: [0, -1], UR: [.707, -.707] };
// the stroke's direction, start to end, in 8 sectors (screen y points down)
export const sector = (dx, dy) => DIR8[((Math.round(Math.atan2(dy, dx) / (Math.PI / 4)) % 8) + 8) % 8];

// el: the play surface; on(g): every gesture { kind, dir?, pts, r, why }; touch(e): whether a pointer event is a finger (or pen)
export function gestures(el, on, touch) {
  const strokes = new Map(), stick = { id: null, ox: 0, oy: 0, x: 0, y: 0, mx: 0, my: 0, walk: false, on: false, w: 1, h: 1 };
  let lastTap = null, twoDown = null;
  const rel = e => { const r = el.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top, r]; };
  function stickTo(x, y) {
    const dx = x - stick.ox, dy = y - stick.oy, m = Math.hypot(dx, dy);
    stick.x = x; stick.y = y;
    if (m < G.STICK_DEAD) { stick.mx = stick.my = 0; stick.walk = false; return; }
    stick.mx = dx / m; stick.my = dy / m; stick.walk = m < G.STICK_FULL * G.WALK_BELOW;
  }
  const emit = (kind, s, extra = {}) => on({ kind, pts: s.pts.slice(), r: s.r, ms: Math.round(performance.now() - s.t0), ...extra });

  el.addEventListener('pointerdown', e => {
    if (!touch(e)) return;
    e.preventDefault(); try { el.setPointerCapture(e.pointerId); } catch { /* a pointer the browser no longer tracks */ }
    const [x, y, r] = rel(e), now = performance.now();
    if (x < r.width * G.LEFT && stick.id == null) { Object.assign(stick, { id: e.pointerId, ox: x, oy: y, on: true, w: r.width, h: r.height }); stickTo(x, y); return; }
    const s = { id: e.pointerId, x0: x, y0: y, t0: now, pts: [[x, y, now]], max: 0, path: 0, r, kind: null };
    strokes.set(e.pointerId, s);
    // a second finger down soon after the first, both still: the two-finger tap (decided when both lift)
    const others = [...strokes.values()].filter(o => o !== s);
    if (others.length === 1 && now - others[0].t0 < G.TWO_MS && others[0].max < G.TAP_MOVE) { twoDown = { a: others[0], b: s }; others[0].kind = s.kind = 'two?'; return; }
    // a tap just before, close by: the double tap, fired now on the second DOWN
    if (lastTap && now - lastTap.t < G.DBL_MS && Math.hypot(x - lastTap.x, y - lastTap.y) < G.DBL_PX) { s.kind = 'double'; lastTap = null; emit('double', s, { why: 'second tap' }); }
  }, { passive: false });

  el.addEventListener('pointermove', e => {
    if (!touch(e)) return;
    const [x, y] = rel(e), now = performance.now();
    if (e.pointerId === stick.id) { e.preventDefault(); stickTo(x, y); return; }
    const s = strokes.get(e.pointerId); if (!s) return;
    e.preventDefault();
    const [px, py] = s.pts[s.pts.length - 1]; s.path += Math.hypot(x - px, y - py);
    s.pts.push([x, y, now]); if (s.pts.length > 64) s.pts.shift();
    s.max = Math.max(s.max, Math.hypot(x - s.x0, y - s.y0));
    if (s.tGo == null && s.max >= G.TAP_MOVE) s.tGo = s.pts[Math.max(0, s.pts.length - 2)][2];   // a hesitation before a flick is not counted against its speed
  }, { passive: false });

  function up(e, cancel) {
    if (!touch(e)) return;
    if (e.pointerId === stick.id) { Object.assign(stick, { id: null, on: false, mx: 0, my: 0, walk: false }); return; }
    const s = strokes.get(e.pointerId); if (!s) return; strokes.delete(e.pointerId);
    const [x, y] = rel(e), now = performance.now(), ms = now - s.t0, dx = x - s.x0, dy = y - s.y0, dist = Math.hypot(dx, dy);
    if (cancel) { if (s.kind === 'hold') emit('hold-end', s); return; }
    if (s.kind === 'hold') return emit('hold-end', s);
    if (s.kind === 'double') return;
    if (s.kind === 'two?') {
      if (twoDown && (twoDown.a === s || twoDown.b === s)) { const o = twoDown.a === s ? twoDown.b : twoDown.a;
        if (!strokes.has(o.id)) { const ok = s.max < G.HOLD_MOVE * 1.5 && o.max < G.HOLD_MOVE * 1.5 && ms < 450; twoDown = null;
          emit(ok ? 'two' : 'none', s); } }
      return; }
    // a flick there and back: much more path than distance, quick, with one reversal along the main axis
    if (ms < G.FLICK_MS && s.path > G.SWIPE_PX * 1.6 && s.path >= G.FLICK_RATIO * Math.max(dist, 1) && reversed(s.pts))
      return emit('flick', s, { dir: sector(s.pts[farthest(s)][0] - s.x0, s.pts[farthest(s)][1] - s.y0) });
    const speed = dist / Math.max(now - (s.tGo ?? s.t0), 16);
    if (dist >= G.SWIPE_PX && speed >= G.SWIPE_SPEED) return emit('swipe', s, { dir: sector(dx, dy) });
    if (dist < G.TAP_MOVE && ms < G.TAP_MS) { lastTap = { t: now, x, y }; return emit('tap', s); }
    emit('none', s);
  }
  el.addEventListener('pointerup', e => up(e, false));
  el.addEventListener('pointercancel', e => up(e, true));
  // touch events too, with passive: false, so a stroke on the play area never scrolls or zooms the page
  for (const t of ['touchstart', 'touchmove', 'touchend']) el.addEventListener(t, e => e.preventDefault(), { passive: false });

  // the hold: polled each frame, since a finger held still sends no events
  function poll() {
    const now = performance.now();
    for (const s of strokes.values()) if (!s.kind && now - s.t0 >= G.HOLD_MS && s.max < G.HOLD_MOVE) { s.kind = 'hold'; emit('hold-start', s); }
  }
  const trails = () => [...strokes.values()].map(s => ({ pts: s.pts, r: s.r }));
  return { stick, poll, trails };
}
function farthest(s) { let k = 0, b = -1; s.pts.forEach(([x, y], i) => { const d = Math.hypot(x - s.x0, y - s.y0); if (d > b) { b = d; k = i; } }); return k; }
// a reversal: along the stroke's main axis the motion goes one way at least 10 px, then back at least 10 px
function reversed(pts) {
  const ax = Math.abs(pts[pts.length - 1][0] - pts[0][0]) + spread(pts, 0) >= spread(pts, 1) ? 0 : 1;
  let dir = 0, run = 0, legs = 0;
  for (let i = 1; i < pts.length; i++) { const d = pts[i][ax] - pts[i - 1][ax]; if (!d) continue; const sgn = Math.sign(d);
    if (sgn === dir) run += Math.abs(d); else { if (run >= 10) legs++; dir = sgn; run = Math.abs(d); } }
  if (run >= 10) legs++;
  return legs >= 2;
}
const spread = (pts, k) => Math.max(...pts.map(p => p[k])) - Math.min(...pts.map(p => p[k]));
