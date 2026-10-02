// prototypes/46-combo-prompts.html: the touch (and mouse-drag) gesture recogniser. No game code here: it turns pointer strokes
// into named gestures and hands them to on(g). Every threshold is in CSS pixels and milliseconds, so it reads the same on any screen.
//   tap        down and up inside TAP_MOVE px and TAP_MS              → J
//   double     a second finger down within DBL_MS and DBL_PX of a tap  → K (fired on the second DOWN, so the first cut is still in its wind-up)
//   swipe      SWIPE_PX or more, at SWIPE_SPEED px/ms or faster (timed from when it left the tap radius) → a direction, one of 8 sectors of 45°
//   hold       still (inside HOLD_MOVE) for HOLD_MS                     → hold-start, then hold-end on release
//   flick      there and back inside FLICK_MS: the path is FLICK_RATIO × the net distance or more, with a reversal → parry
//   two        two fingers down within TWO_MS of each other, both up without moving → a skill
//   drag       (one-thumb layout only) a stroke still moving after DRAG_MS that never reached swipe speed → a floating stick
export const G = { TAP_MS: 220, TAP_MOVE: 12, DBL_MS: 230, DBL_PX: 48, SWIPE_PX: 26, SWIPE_SPEED: .28, HOLD_MS: 280, HOLD_MOVE: 14,
  FLICK_MS: 380, FLICK_RATIO: 2.2, TWO_MS: 160, DRAG_MS: 170, STICK_DEAD: 6, STICK_FULL: 34, WALK_BELOW: .5 };
export const DIR8 = ['R', 'DR', 'D', 'DL', 'L', 'UL', 'U', 'UR'];
export const ARROW = { R: '→', DR: '↘', D: '↓', DL: '↙', L: '←', UL: '↖', U: '↑', UR: '↗' };
export const VEC = { R: [1, 0], DR: [.707, .707], D: [0, 1], DL: [-.707, .707], L: [-1, 0], UL: [-.707, -.707], U: [0, -1], UR: [.707, -.707] };
// the stroke's direction: start to end, in 8 sectors (screen y points down)
export const sector = (dx, dy) => DIR8[((Math.round(Math.atan2(dy, dx) / (Math.PI / 4)) % 8) + 8) % 8];

// el: the play surface; layout(): 'two' (a floating stick on the left 45%, gestures on the right) or 'one' (gestures everywhere, a slow drag moves)
// on(g): every recognised gesture { kind, dir?, x, y (0..1 of the surface), ms, why }; stick: the floating stick, read by the game loop
export function gestures(el, layout, on, gate = () => true) {
  const strokes = new Map(), stick = { id: null, ox: 0, oy: 0, x: 0, y: 0, mx: 0, my: 0, walk: false, on: false };
  let lastTap = null, twoDown = null;
  const rel = e => { const r = el.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top, r]; };
  const norm = (x, y, r) => [x / r.width, y / r.height];
  function stickTo(x, y) {
    const dx = x - stick.ox, dy = y - stick.oy, m = Math.hypot(dx, dy);
    stick.x = x; stick.y = y;
    if (m < G.STICK_DEAD) { stick.mx = stick.my = 0; stick.walk = false; return; }
    stick.mx = dx / m; stick.my = dy / m; stick.walk = m < G.STICK_FULL * G.WALK_BELOW;
  }
  const emit = (kind, s, extra = {}) => { const [nx, ny] = norm(s.x0, s.y0, s.r); on({ kind, x: nx, y: ny, ms: Math.round(performance.now() - s.t0), pts: s.pts.slice(), r: s.r, ...extra }); };

  el.addEventListener('pointerdown', e => {
    e.preventDefault();
    if (!gate()) return;   // the first press only wakes the play area (focus), it is not a move
    el.setPointerCapture?.(e.pointerId);
    const [x, y, r] = rel(e), now = performance.now();
    // two-thumb: a press on the left 45% is the floating stick, wherever it lands
    if (layout() === 'two' && x < r.width * .45 && stick.id == null) { Object.assign(stick, { id: e.pointerId, ox: x, oy: y, on: true }); stickTo(x, y); return; }
    const s = { id: e.pointerId, x0: x, y0: y, t0: now, pts: [[x, y, now]], max: 0, path: 0, r, kind: null };
    strokes.set(e.pointerId, s);
    // a second finger down soon after the first, both still: the two-finger tap (decided when both lift)
    const others = [...strokes.values()].filter(o => o !== s);
    if (others.length === 1 && now - others[0].t0 < G.TWO_MS && others[0].max < G.TAP_MOVE) { twoDown = { a: others[0], b: s }; others[0].kind = s.kind = 'two?'; return; }
    // a tap just before, close by: the double tap, fired now on the second DOWN (no waiting on a single tap's J)
    const lastT = lastTap ? lastTap.t : 0;
    if (lastTap && now - lastTap.t < G.DBL_MS && Math.hypot(x - lastTap.x, y - lastTap.y) < G.DBL_PX) { s.kind = 'double'; lastTap = null; emit('double', s, { why: `2nd tap ${Math.round(now - lastT)}ms after the 1st` }); return; }
  }, { passive: false });

  el.addEventListener('pointermove', e => {
    const [x, y] = rel(e), now = performance.now();
    if (e.pointerId === stick.id) { e.preventDefault(); stickTo(x, y); return; }
    const s = strokes.get(e.pointerId); if (!s) return;
    e.preventDefault();
    const [px, py] = s.pts[s.pts.length - 1]; s.path += Math.hypot(x - px, y - py);
    s.pts.push([x, y, now]); if (s.pts.length > 64) s.pts.shift();
    s.max = Math.max(s.max, Math.hypot(x - s.x0, y - s.y0));
    if (s.tGo == null && s.max >= G.TAP_MOVE) s.tGo = s.pts[Math.max(0, s.pts.length - 2)][2];   // when the finger really set off: a hesitation before a flick is not counted against its speed
    if (s.kind === 'drag') { stickTo(x, y); return; }
    // one-thumb: still moving after DRAG_MS but never quick enough for a swipe: it becomes the stick, from where it started
    if (!s.kind && layout() === 'one' && now - s.t0 > G.DRAG_MS && s.max >= G.HOLD_MOVE && s.max / (now - s.t0) < G.SWIPE_SPEED) {
      s.kind = 'drag'; Object.assign(stick, { id: null, ox: s.x0, oy: s.y0, on: true }); stickTo(x, y); emit('drag', s, { why: `slow: ${(s.max / (now - s.t0)).toFixed(2)} px/ms` }); }
  }, { passive: false });

  function up(e, cancel) {
    if (e.pointerId === stick.id) { Object.assign(stick, { id: null, on: false, mx: 0, my: 0, walk: false }); return; }
    const s = strokes.get(e.pointerId); if (!s) return; strokes.delete(e.pointerId);
    const [x, y] = rel(e), now = performance.now(), ms = now - s.t0, dx = x - s.x0, dy = y - s.y0, dist = Math.hypot(dx, dy);
    if (s.kind === 'drag') { Object.assign(stick, { on: false, mx: 0, my: 0, walk: false }); return; }
    if (cancel) { if (s.kind === 'hold') emit('hold-end', s); return; }
    if (s.kind === 'hold') return emit('hold-end', s, { why: `${Math.round(ms)}ms` });
    if (s.kind === 'double') return;
    if (s.kind === 'two?') {
      if (twoDown && (twoDown.a === s || twoDown.b === s)) { const o = twoDown.a === s ? twoDown.b : twoDown.a;
        if (!strokes.has(o.id)) { const ok = s.max < G.HOLD_MOVE * 1.5 && o.max < G.HOLD_MOVE * 1.5 && ms < 450; twoDown = null;
          if (ok) emit('two', s, { why: `fingers ${Math.round(Math.abs(o.t0 - s.t0))}ms apart` }); else emit('none', s, { why: 'two fingers that moved' }); } }
      return; }
    // a flick there and back: much more path than distance, quick, with one reversal along the main axis
    if (ms < G.FLICK_MS && s.path > G.SWIPE_PX * 1.6 && s.path >= G.FLICK_RATIO * Math.max(dist, 1) && reversed(s.pts))
      return emit('flick', s, { dir: sector(s.pts[farthest(s)][0] - s.x0, s.pts[farthest(s)][1] - s.y0), why: `path ${Math.round(s.path)} / net ${Math.round(dist)} px` });
    const speed = dist / Math.max(now - (s.tGo ?? s.t0), 16);
    if (dist >= G.SWIPE_PX && speed >= G.SWIPE_SPEED) return emit('swipe', s, { dir: sector(dx, dy), why: `${Math.round(dist)} px at ${speed.toFixed(2)} px/ms` });
    if (dist < G.TAP_MOVE && ms < G.TAP_MS) { lastTap = { t: now, x, y }; return emit('tap', s, { why: `${Math.round(ms)}ms, ${Math.round(dist)} px` }); }
    emit('none', s, { why: dist >= G.SWIPE_PX ? `too slow: ${speed.toFixed(2)} px/ms` : ms >= G.TAP_MS ? `too long for a tap: ${Math.round(ms)}ms` : `too short: ${Math.round(dist)} px` });
  }
  el.addEventListener('pointerup', e => up(e, false));
  el.addEventListener('pointercancel', e => up(e, true));
  // touch events too, with passive: false, so a swipe on the play area never scrolls or zooms the page
  for (const t of ['touchstart', 'touchmove', 'touchend']) el.addEventListener(t, e => e.preventDefault(), { passive: false });

  // the hold: polled each frame, since a finger held still sends no events
  function poll() {
    const now = performance.now();
    for (const s of strokes.values()) if (!s.kind && now - s.t0 >= G.HOLD_MS && s.max < G.HOLD_MOVE) { s.kind = 'hold'; emit('hold-start', s, { why: `still ${G.HOLD_MS}ms` }); }
  }
  const trails = () => [...strokes.values()].map(s => ({ pts: s.pts, r: s.r }));
  return { stick, poll, trails, strokes };
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
