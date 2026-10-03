// ---- RTS control in the slice (owner 2026-10-02: "You should be able to use your mouse and click + drag over a
// group"; docs/squad-ai.md). The rule that keeps the hero's clicks and the squad's apart: the LEFT button never gives
// an order and the RIGHT button never moves the hero.
//   left click: the ground or a foe: the hero goes there (click to move; on a foe he closes and cuts);
//               a companion: select him (Shift adds or removes; double-click: everyone of his role); the hero: clear
//   left drag:  a selection box (Shift adds); it never moves the hero
//   right click (with a selection): the ground: go there, in formation, then hold · a foe: attack him · an ally or
//               the hero: protect him. Held still for 0.28 s: the radial (charge, hold, fall back, follow, regroup,
//               the tactics). With nothing selected the order goes to the whole party.
//   keys: Ctrl + 1–9 saves the selection as a group, 1–9 recalls it (Shift adds); Esc clears; G hold / follow me;
//         E held by a downed companion lifts him; Tab the companions' settings (panel.js)
//   touch: a long press (0.35 s) then drag selects; a tap on a companion selects him; with a selection, a tap on the
//          ground, a foe or an ally is the right click's order; with none, the hero goes there. The order bar is the radial.
import { CAM, U, OBL, VW, VH, toScreen } from 'ronin-engine/render/gfx/view.js';
import { SQ, select, toggle, clearSel, saveGroup, recallGroup, selectRole, order, protect, holdOrFollow } from 'ronin-engine/squad/squad.js';

export const RADIAL = [['charge', 'Charge'], ['hold', 'Hold'], ['fallback', 'Fall back'], ['follow', 'Follow me'], ['regroup', 'Regroup'], ['t:focus', 'Focus'], ['t:spread', 'Spread out'], ['t:ambush', 'Ambush']];

export function initControl({ canvas, root, A, H, hero, allies, foes }) {
  const keys = new Set(), st = { drag: null, down: null, move: null, radial: null, hover: null, overBar: 0, slowTill: 0, marks: [], last: null, touch: null };
  const ctl = { keys, st };
  const rel = e => { const r = canvas.getBoundingClientRect(); return [(e.clientX - r.left) / r.width * VW, (e.clientY - r.top) / r.height * VH]; };
  const floor = ([sx, sy]) => ({ x: CAM.px + (sx - VW / 2) / (U * CAM.zoom), z: CAM.py + (sy - VH / 2) / (U * CAM.zoom * OBL.a) });
  // where a body is on the screen (render px): feet and the top of his head
  ctl.px = a => { const y = a.gy ?? 0, f = toScreen(a.x, y, a.z), t = toScreen(a.x, y + 24, a.z); return { x: f[0], y: f[1], top: t[1] }; };
  const all = () => A.agents.filter(a => a.alive);
  function pick(p) { let best = null, bs = 1e9;
    for (const a of all()) { const q = ctl.px(a); if (Math.abs(p[0] - q.x) > 13 || p[1] < q.top - 5 || p[1] > q.y + 7) continue; const s = Math.hypot(p[0] - q.x, p[1] - (q.y + q.top) / 2) - q.y * .01;
      if (s < bs) { bs = s; best = a; } } return best; }
  const mark = (x, z, kind) => st.marks.push({ x, z, kind, t: A.t });
  const gave = () => { st.slowTill = performance.now() + 450; };
  // ---- the orders a right click (or a tap with a selection) gives
  function context(p) {
    const who = pick(p); if (!who && !A.agents.some(a => a.ally && a.alive)) return;
    if (who && who.team === 1) { order(A, 'attack', { target: who }); mark(who.x, who.z, 'attack'); }
    else if (who && (who.hero || who.ally)) { if (!(SQ.sel.size === 1 && SQ.sel.has(who.id))) { protect(A, who); mark(who.x, who.z, 'protect'); } }
    else { const f = floor(p); order(A, 'goto', f); mark(f.x, f.z, 'goto'); }
    gave();
  }
  function radialPick(p) { const r = st.radial, dx = p[0] - r.x, dy = p[1] - r.y; if (Math.hypot(dx, dy) < 16) return null;
    return RADIAL[((Math.round(Math.atan2(dx, -dy) / (Math.PI * 2 / RADIAL.length)) % RADIAL.length) + RADIAL.length) % RADIAL.length]; }
  function radialGive(item) { if (!item) return; const [k] = item; if (k.startsWith('t:')) { for (const a of chosenOrAll()) a.tactic = k.slice(2); if (k === 't:ambush') A.sprung = false; A.log(`set:tactic=${k.slice(2)}`); }
    else order(A, k, k === 'hold' ? floor([st.radial.x, st.radial.y]) : {}); gave(); }
  const chosenOrAll = () => { const s = A.agents.filter(a => a.ally && a.alive && SQ.sel.has(a.id)); return s.length ? s : A.agents.filter(a => a.ally && a.alive); };
  function boxSelect(add) { const d = st.drag, x0 = Math.min(d.x0, d.x1), x1 = Math.max(d.x0, d.x1), y0 = Math.min(d.y0, d.y1), y1 = Math.max(d.y0, d.y1);
    const ids = allies.filter(a => a.alive).filter(a => { const q = ctl.px(a); return q.x >= x0 - 4 && q.x <= x1 + 4 && q.y >= y0 - 4 && q.top <= y1 + 4; }).map(a => a.id);
    if (ids.length || !add) select(A, ids, add); A.log(`select:${[...SQ.sel].join(',')}`); }
  function leftClick(p, e) {
    const who = pick(p), now = performance.now();
    if (who && who.ally) { if (st.last && st.last.id === who.id && now - st.last.t < 350) { selectRole(A, who.role, e.shiftKey); A.log(`select-role:${who.role}`); }
      else if (e.shiftKey) toggle(A, who.id); else select(A, [who.id]); st.last = { id: who.id, t: now }; A.log(`select:${[...SQ.sel].join(',')}`); return; }
    st.last = null;
    if (who && who.hero) { clearSel(); return; }
    if (who && who.team === 1) { st.move = { foe: who }; return; }
    const f = floor(p); st.move = f; mark(f.x, f.z, 'move');
  }
  canvas.addEventListener('contextmenu', e => e.preventDefault());
  canvas.addEventListener('pointerdown', e => {
    const p = rel(e); canvas.focus(); canvas.setPointerCapture(e.pointerId);
    if (e.pointerType === 'touch') { st.touch = { x: p[0], y: p[1], id: e.pointerId, timer: setTimeout(() => { st.drag = { x0: p[0], y0: p[1], x1: p[0], y1: p[1] }; }, 350) }; return; }
    if (e.button === 2) { st.down = { x: p[0], y: p[1], b: 2 }; st.rtimer = setTimeout(() => { st.radial = { x: p[0], y: p[1], hot: null }; }, 280); return; }
    if (e.button === 0) st.down = { x: p[0], y: p[1], b: 0, shift: e.shiftKey };
  });
  canvas.addEventListener('pointermove', e => {
    const p = rel(e); st.hover = pick(p); st.cursor = p;
    if (st.touch && !st.drag && Math.hypot(p[0] - st.touch.x, p[1] - st.touch.y) > 12) { clearTimeout(st.touch.timer); st.touch.moved = 1; }
    if (st.radial) { st.radial.hot = radialPick(p); return; }
    if (st.down && st.down.b === 2 && Math.hypot(p[0] - st.down.x, p[1] - st.down.y) > 8) clearTimeout(st.rtimer);
    if (st.down && st.down.b === 0 && !st.drag && Math.hypot(p[0] - st.down.x, p[1] - st.down.y) > 6) st.drag = { x0: st.down.x, y0: st.down.y, x1: p[0], y1: p[1] };
    if (st.drag) { st.drag.x1 = p[0]; st.drag.y1 = p[1]; }
  });
  canvas.addEventListener('pointerup', e => {
    const p = rel(e);
    if (e.pointerType === 'touch' && st.touch) { clearTimeout(st.touch.timer);
      if (st.drag) { boxSelect(false); st.drag = null; }
      else if (!st.touch.moved) { const who = pick(p); if (who && who.ally) leftClick(p, {});
        else if (SQ.sel.size) context(p); else leftClick(p, {}); }
      st.touch = null; return; }
    if (e.button === 2) { clearTimeout(st.rtimer); if (st.radial) { radialGive(st.radial.hot); st.radial = null; } else if (st.down) context(p); st.down = null; return; }
    if (e.button === 0) { if (st.drag) { boxSelect(st.down && st.down.shift); st.drag = null; } else if (st.down) leftClick(p, e); st.down = null; }
  });
  addEventListener('keydown', e => {
    if (e.target.tagName === 'SELECT' || e.target.tagName === 'INPUT') return;
    keys.add(e.code); if (e.repeat) return;
    const dg = /^Digit([1-9])$/.exec(e.code);
    if (dg) { e.preventDefault(); if (e.ctrlKey || e.metaKey) { const n = saveGroup(+dg[1]); A.log(`group-save:${dg[1]}:${n}`); } else if (!e.altKey && recallGroup(A, +dg[1], e.shiftKey)) A.log(`group-recall:${dg[1]}`); return; }
    if (e.code === 'Escape') { clearSel(); st.radial = null; st.drag = null; }
    if (e.code === 'KeyG' && !e.altKey) { holdOrFollow(A); gave(); }   // Alt+G is the hair panel's grid
  });
  addEventListener('keyup', e => keys.delete(e.code)); addEventListener('blur', () => keys.clear());

  // click to move: when no key steers him, he walks to the clicked point (to a foe: closes, then cuts once)
  ctl.steer = (inp) => {
    if (inp.dir != null) { st.move = null; return; }
    const m = st.move; if (!m) return; const tx = m.foe ? m.foe.x : m.x, tz = m.foe ? m.foe.z : m.z, d = Math.hypot(tx - hero.x, tz - hero.z);
    if (m.foe && (!m.foe.alive)) { st.move = null; return; }
    if (m.foe ? d < 19 : d < 4) { st.move = null; if (m.foe) { dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyJ' })); dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyJ' })); } return; }
    inp.dir = Math.atan2(tx - hero.x, tz - hero.z);
  };
  // orders are being given: a drag, the radial, the order bar under the pointer, or a moment after an order
  ctl.giving = () => !!(st.drag || st.radial || (SQ.sel.size && performance.now() - st.overBar < 1500) || performance.now() < st.slowTill);
  ctl.gave = gave; ctl.floor = floor; ctl.pick = pick;
  return ctl;
}
