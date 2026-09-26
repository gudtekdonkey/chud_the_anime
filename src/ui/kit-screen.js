import { OX, OY, FW, FH, W, H } from '../config.js';
import { g, game } from '../screen.js';
import { wear } from '../state.js';
import { held, taps } from '../input.js';
import { BY_ID } from '../wardrobe/items.js';
import { ICON } from './icons.js';
import { panel, slot } from './hud-kit.js';
import { text, textW } from './pixfont.js';
import { ROSTER, BAG, CHARMS, ROLES, WEAPON_NAME, SLOT_ROWS as ROW, party, inParty, charmSlots, wornIn, PARTY_MAX, FROM,
  putOn, takeOff, giveWeapon, charmFits, putCharm, dropCharm, toggleParty, pairsFor, SKILLS, STATS, expNeed, leansOf } from '../party/kit.js';
import { WEAPONS } from '../weapons/weapons.js';
import { allies, syncParty } from '../party/companions.js';
import { frames, poseOf, lenOf, paint, figureFor } from '../party/figures.js';

// ---- The kit screen (Tab, prototypes/34-companions.html): anyone in the roster, then any slot, then what goes in it. Keys or mouse ----
// The game is paused while it is open (main.js). His kit is the game's own state, so what he is given here is what he fights with.
export const KIT = { open: false, who: 0, row: 0, charm: 0, col: 'slots', opt: 0, scroll: 0, note: '', noteT: 0, clock: 0, hover: null };
const boxes = [], camp = new Map();
const CY = '#6ff3e4', WH = '#ffffff', GREY = '#7d868e', DIM = '#565e66', INK = '#e9eeee';
const sel = () => ROSTER[KIT.who = Math.min(KIT.who, ROSTER.length - 1)];
// the figure to dress: his own, a companion's in the room, or one kept here for those waiting at camp
const figOf = c => c.id === 'hero' ? wear : (allies.find(a => a.c === c) || {}).F || camp.get(c.id) || camp.set(c.id, figureFor(c)).get(c.id);
const about = w => WEAPONS.find(v => v.id === w).about;
const icon = id => ICON[id] || null;

function options() {
  const c = sel(), r = ROW[KIT.row];
  const role = w => about(w) + ' As a companion: ' + ROLES[w].name + '. ' + ROLES[w].about;
  if (r.key === 'weapon') return [{ label: WEAPON_NAME[c.kit.weapon], on: true, about: role(c.kit.weapon), act: () => '' },
    ...BAG.weapons.map(w => ({ label: WEAPON_NAME[w], tag: 'BAG', about: role(w) + ' Yours goes in the bag.', act: () => giveWeapon(c, w, null) })),
    ...ROSTER.filter(o => o !== c).map(o => ({ label: WEAPON_NAME[o.kit.weapon], tag: o.name, about: role(o.kit.weapon) + ' A trade: ' + o.name + ' takes yours.', act: () => giveWeapon(c, o.kit.weapon, o) }))];
  if (r.key === 'charms') {
    const i = KIT.charm, out = [{ label: 'NONE', about: 'Leave the slot empty. The charm goes back in the bag.', act: () => (dropCharm(c, i), '') }];
    BAG.charms.forEach((id, b) => out.push({ label: CHARMS[id].name, about: CHARMS[id].about, why: charmFits(c, id), act: () => putCharm(c, i, id, { bag: b }) }));
    for (const o of ROSTER) o.kit.charms.forEach((id, j) => { if (!CHARMS[id]) return; const self = o === c && j === i;
      out.push({ label: CHARMS[id].name, on: self, tag: self ? '' : o === c ? 'SLOT ' + (j + 1) : o.name, about: CHARMS[id].about, why: self ? '' : charmFits(c, id),
        act: () => self ? '' : putCharm(c, i, id, { who: o, i: j }) }); });
    return out;
  }
  const cur = wornIn(c, r.key), inBag = [...new Set(BAG.wear.filter(id => BY_ID[id].slot === r.key))];
  const worn = ROSTER.filter(o => o !== c).flatMap(o => [...o.kit.wear].filter(id => BY_ID[id] && BY_ID[id].slot === r.key).map(id => [id, o]));
  return [{ label: 'NONE', on: !cur, about: 'Nothing in this slot.', act: () => takeOff(c, r.key) },
    ...(cur ? [{ label: BY_ID[cur].name.toUpperCase(), on: true, about: BY_ID[cur].about, act: () => '' }] : []),
    ...inBag.map(id => { const n = BAG.wear.filter(x => x === id).length; return { label: BY_ID[id].name.toUpperCase(), tag: n > 1 ? 'BAG x' + n : 'BAG', about: BY_ID[id].about, act: () => putOn(c, id, null) }; }),
    ...worn.map(([id, o]) => ({ label: BY_ID[id].name.toUpperCase(), tag: o.name, about: BY_ID[id].about + ' Taken from ' + o.name + '.', act: () => putOn(c, id, o) }))];
}
const say = s => { if (s) { KIT.note = s; KIT.noteT = 2.4; } };
function apply(o) { if (o.why) return say(o.why); say(o.act()); syncParty(); KIT.col = 'slots'; }
function switchWho(d) { KIT.who = (KIT.who + d + ROSTER.length) % ROSTER.length; KIT.col = 'slots'; KIT.charm = Math.min(KIT.charm, charmSlots(sel()) - 1); }
const pickRow = i => { KIT.row = i; const o = options(); KIT.col = 'opts'; KIT.opt = Math.max(0, o.findIndex(x => x.on)); };

export function toggleKit(open = !KIT.open) { KIT.open = open; if (open) Object.assign(KIT, { who: 0, col: 'slots' });   /* it opens on him */ held.clear(); taps.clear(); KIT.hover = null; }
function key(k) {
  if (k === 'q') return switchWho(-1);
  if (k === 'e') return switchWho(1);
  if (k === ' ') { say(toggleParty(sel())); return syncParty(); }
  if (KIT.col === 'slots') {
    if (k === 'w') KIT.row = (KIT.row + ROW.length - 1) % ROW.length;
    if (k === 's') KIT.row = (KIT.row + 1) % ROW.length;
    if (ROW[KIT.row].key === 'charms' && (k === 'a' || k === 'd')) KIT.charm = (KIT.charm + (k === 'a' ? -1 : 1) + charmSlots(sel())) % charmSlots(sel());
    else if (k === 'a') switchWho(-1); else if (k === 'd') switchWho(1);
    if (k === 'j') pickRow(KIT.row);
    if (k === 'k') { const r = ROW[KIT.row]; if (r.key === 'charms') dropCharm(sel(), KIT.charm); else if (r.key !== 'weapon') takeOff(sel(), r.key); syncParty(); }
  } else {
    const n = options().length;
    if (k === 'w') KIT.opt = (KIT.opt + n - 1) % n;
    if (k === 's') KIT.opt = (KIT.opt + 1) % n;
    if (k === 'j') apply(options()[KIT.opt]);
    if (k === 'k' || k === 'Escape') KIT.col = 'slots';
  }
}
// on the window, in the capture phase: while the screen is open the game never sees a key; Tab opens and closes it
addEventListener('keydown', e => {
  if (document.activeElement !== game) return;
  if (e.key === 'Tab') { e.preventDefault(); e.stopImmediatePropagation(); if (!e.repeat) toggleKit(); return; }
  if (!KIT.open) return;
  e.preventDefault(); e.stopImmediatePropagation();
  if (e.key === 'Escape' && KIT.col === 'slots') return toggleKit(false);
  const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
  key({ ArrowUp: 'w', ArrowDown: 's', ArrowLeft: 'a', ArrowRight: 'd', Enter: 'j' }[k] || k);
}, true);
addEventListener('keyup', e => { if (KIT.open && document.activeElement === game) e.stopImmediatePropagation(); }, true);
const at = e => { const r = game.getBoundingClientRect(); return [(e.clientX - r.left) * W / r.width, (e.clientY - r.top) * H / r.height]; };
game.addEventListener('pointerdown', e => { if (!KIT.open) return; const [x, y] = at(e);
  for (let i = boxes.length - 1; i >= 0; i--) { const b = boxes[i]; if (x >= b.x && y >= b.y && x < b.x + b.w && y < b.y + b.h) return b.fn(); } });
game.addEventListener('pointermove', e => { if (!KIT.open) return; const [x, y] = at(e); KIT.hover = null;
  for (const b of boxes) if (b.hover && x >= b.x && y >= b.y && x < b.x + b.w && y < b.y + b.h) KIT.hover = b.hover; });
const box = (x, y, w, h, fn, hover) => boxes.push({ x, y, w, h, fn, hover });
const frameRect = (x, y, w, h, col) => { g.fillStyle = col; g.fillRect(x, y, w, 1); g.fillRect(x, y + h - 1, w, 1); g.fillRect(x, y, 1, h); g.fillRect(x + w - 1, y, 1, h); };
const fit = (s, w) => { while (s.length > 1 && textW(s) > w) s = s.slice(0, -2) + '.'; return s; };
function wrap(s, w) { const out = []; let line = '';
  for (const word of s.split(' ')) { const t = line ? line + ' ' + word : word; if (textW(t) > w && line) { out.push(line); line = word; } else line = t; }
  if (line) out.push(line); return out; }

// the preview plays a little loop: breathe, draw and cut, wait in guard, resheathe
function previewPose(c) {
  const parts = [[frames(c, 'idle'), 2.6], [frames(c, 'slash1')], [frames(c, 'ready'), 1.2], [frames(c, 'sheathe')]].map(([f, d]) => [f, d || lenOf(f)]);
  let u = KIT.clock % parts.reduce((a, [, d]) => a + d, 0);
  for (const [f, d] of parts) { if (u < d) return poseOf(f, u); u -= d; } return poseOf(parts[0][0], 0);
}
function figureAt(c, pose, dt, x, y, sc = 1, crop) {
  const cv = paint(figOf(c), pose, dt, c.id === 'hero' ? 'hero' : 'ally');
  g.save(); g.imageSmoothingEnabled = false;
  if (crop) g.drawImage(cv, OX - crop[0] / 2, OY - crop[1] + 2, crop[0], crop[1], x - crop[0] / 2, y - crop[1] + 2, crop[0], crop[1]);
  else g.drawImage(cv, 0, 0, FW, FH, Math.round(x - OX * sc), Math.round(y - OY * sc), FW * sc, FH * sc);
  g.restore();
}
function tabs() {
  text('KIT', 10, 9, WH, 2); text('PARTY ' + party.members.length + '/' + PARTY_MAX, 10, 23, GREY);
  const first = Math.max(0, Math.min(KIT.who - 2, ROSTER.length - 6));
  if (first > 0) text('<', 58, 18, CY); if (first + 6 < ROSTER.length) text('>', 452, 18, CY);
  ROSTER.slice(first, first + 6).forEach((o, k) => { const i = first + k, x = 64 + k * 64, y = 4, on = i === KIT.who;
    g.fillStyle = on ? '#182423' : 'rgba(12,13,17,.9)'; g.fillRect(x, y, 60, 34); frameRect(x, y, 60, 34, on ? CY : '#3b424c');
    figureAt(o, frames(o, 'idle').poses[0], 0, x + 13, y + 32, 1, [24, 30]);
    text(fit(o.name, 32), x + 26, y + 8, on ? WH : '#a9b1b6');
    const st = o.id === 'hero' ? 'YOU' : inParty(o) ? 'PARTY' : 'CAMP';
    text(st, x + 26, y + 16, st === 'CAMP' ? DIM : CY); text(WEAPON_NAME[o.kit.weapon].split(' ').pop(), x + 26, y + 24, GREY);
    box(x, y, 60, 34, () => { KIT.who = i; KIT.col = 'slots'; KIT.charm = Math.min(KIT.charm, charmSlots(o) - 1); });
  });
}
function whoPanel(c, dt) {
  panel(6, 42, 146, 182);
  figureAt(c, previewPose(c), dt, 79, 150, 2);
  text(c.name, 12, 156, WH, 2); text(c.title, 12, 170, GREY);
  if (FROM[c.from]) text(FROM[c.from], 11, 47, DIM);
  const hero = c.id === 'hero', lv = 'LV ' + c.lv;
  text(lv, 146 - textW(lv, 2), 156, CY, 2);
  text(hero ? 'COMPANIONS CHOOSE THEIR OWN STATS' : ROLES[c.kit.weapon].name, 12, 178, hero ? GREY : CY);
  g.fillStyle = '#23272d'; g.fillRect(12, 186, 134, 2); g.fillStyle = '#b8fff6'; g.fillRect(12, 186, Math.round(134 * Math.min(1, c.exp / expNeed(c.lv))), 2);
  if (!hero) Object.entries(STATS).forEach(([k, St], i) => { const x = 12 + i * 34, mine = c.chose === k;
    text(St.name, x, 191, mine ? CY : DIM); text(String(c.stats[k]), x + 14, 191, WH);
    box(x, 190, 30, 7, () => {}, { label: St.long, about: St.about + ' This companion chooses their own points.' }); });
  const tr = c.traits.length ? c.traits.map(([id]) => id.replace(/[A-Z]/g, m => ' ' + m).toUpperCase()).join(', ') : 'NONE: HIS OWN WALK';
  if (!hero) { const sk = c.skills.map(k => SKILLS[k]), pr = pairsFor(c);
    text('LEANS', 12, 200, DIM); text(fit(leansOf(c).join(', ') + (c.chose ? '. LAST: ' + STATS[c.chose].long : ''), 104), 40, 200, '#a9b1b6');
    text('PAIRS', 12, 208, DIM); text(fit(pr.length ? pr.map(x => x.name).join(', ') : 'NOT WITH THIS WEAPON', 104), 40, 208, pr.length ? CY : DIM);
    if (sk.length) text('KNOWS ' + sk.join(', '), 146 - textW('KNOWS ' + sk.join(', ')), 170, '#a9b1b6');
    const on = inParty(c); g.fillStyle = on ? '#182423' : 'rgba(12,13,17,.9)'; g.fillRect(104, 55, 44, 11); frameRect(104, 55, 44, 11, on ? CY : DIM);
    text(on ? 'IN PARTY' : 'AT CAMP', 107, 58, on ? CY : GREY); box(104, 55, 44, 11, () => { say(toggleParty(c)); syncParty(); }); }
  const my = hero ? 196 : 216; text('MOVES', 12, my, DIM); text(fit(tr, 104), 40, my, '#a9b1b6');
}
function slotsPanel(c) {
  panel(156, 42, 150, 182);
  ROW.forEach((r, i) => {
    const y = 47 + i * 14, focus = i === KIT.row;
    if (focus && r.key !== 'charms') { g.fillStyle = KIT.col === 'slots' ? '#182423' : '#15191b'; g.fillRect(158, y - 3, 146, 12); }
    text(r.name, 161, y, focus ? CY : GREY);
    if (r.key === 'weapon') text(WEAPON_NAME[c.kit.weapon], 208, y, INK);
    else if (r.key === 'charms') {
      for (let k = 0; k < 4; k++) { const x = 206 + k * 24, sy = y - 2, open = k < charmSlots(c), id = CHARMS[c.kit.charms[k]] ? c.kit.charms[k] : null;
        if (!open) { g.fillStyle = 'rgba(12,13,17,.5)'; g.fillRect(x, sy, 20, 20); frameRect(x, sy, 20, 20, '#23272d'); continue; }
        slot(x, sy, 20, 'charm', id && icon(id));
        if (id && !icon(id)) text(CHARMS[id].name.slice(0, 2), x + 6, sy + 8, INK);   // Iron Oath has no icon yet
        if (focus && k === KIT.charm) frameRect(x - 2, sy - 2, 24, 24, KIT.col === 'slots' ? CY : GREY);
        box(x, sy, 20, 20, () => { KIT.charm = k; pickRow(i); }, id ? { label: CHARMS[id].name, about: CHARMS[id].about } : null); }
    } else { const id = wornIn(c, r.key); text(id ? fit(BY_ID[id].name.toUpperCase(), 92) : '-', 208, y, id ? INK : DIM); }
    if (r.key !== 'charms') box(158, y - 3, 146, 12, () => pickRow(i));
  });
}
function optsPanel(opts, r) {
  panel(310, 42, 164, 182);
  const N = 13;
  text((r.key === 'charms' ? 'CHARM ' + (KIT.charm + 1) : r.name) + (KIT.col === 'opts' ? '' : ' (J)'), 315, 47, KIT.col === 'opts' ? CY : GREY);
  KIT.opt = Math.min(KIT.opt, opts.length - 1);
  if (KIT.opt < KIT.scroll) KIT.scroll = KIT.opt; if (KIT.opt >= KIT.scroll + N) KIT.scroll = KIT.opt - N + 1;
  KIT.scroll = Math.max(0, Math.min(KIT.scroll, opts.length - N));
  opts.slice(KIT.scroll, KIT.scroll + N).forEach((o, k) => { const i = k + KIT.scroll, y = 58 + k * 12, focus = KIT.col === 'opts' && i === KIT.opt;
    if (focus) { g.fillStyle = '#182423'; g.fillRect(312, y - 2, 160, 11); }
    if (o.on) { g.fillStyle = CY; g.fillRect(314, y + 1, 2, 3); }
    text(fit(o.label, o.tag ? 96 : 150), 319, y, o.why ? DIM : focus ? WH : o.on ? INK : '#a9b1b6');
    if (o.tag) text(o.tag, 470 - textW(o.tag), y, o.why ? '#3b424c' : GREY);
    box(312, y - 2, 160, 11, () => { KIT.opt = i; apply(o); }, o);
  });
  if (opts.length > N) { const h = Math.max(6, Math.round(160 * N / opts.length)), y = 56 + Math.round((160 - h) * KIT.scroll / (opts.length - N)); g.fillStyle = '#3b424c'; g.fillRect(472, y, 1, h); }
}
// what the highlighted thing does, and the keys
function aboutPanel(c, opts, r) {
  panel(6, 228, 468, 38);
  const worn = r.key !== 'weapon' && r.key !== 'charms' && wornIn(c, r.key), ch = CHARMS[c.kit.charms[KIT.charm]];
  const hv = KIT.hover || (KIT.col === 'opts' ? opts[KIT.opt] : r.key === 'charms' ? (ch ? { label: ch.name, about: ch.about } : { label: 'EMPTY CHARM SLOT', about: 'J to choose a charm.' })
    : r.key === 'weapon' ? { label: WEAPON_NAME[c.kit.weapon], about: about(c.kit.weapon) } : worn ? { label: BY_ID[worn].name.toUpperCase(), about: BY_ID[worn].about } : { label: r.name, about: 'Nothing worn here. J to choose.' });
  if (hv) { text(hv.label, 12, 233, WH); if (hv.why) text(hv.why, 12 + textW(hv.label) + 8, 233, '#ff5a4a');
    wrap(hv.about.toUpperCase(), 330).slice(0, 3).forEach((l, i) => text(l, 12, 242 + i * 7, '#a9b1b6')); }
  g.fillStyle = '#2c323b'; g.fillRect(352, 231, 1, 32);
  ['Q/E WHO   W/S SLOT', 'J PICK   K TAKE OFF', 'SPACE PARTY/CAMP', 'TAB CLOSE'].forEach((s, i) => text(s, 358, 233 + i * 8, i === 3 ? CY : GREY));
  if (KIT.noteT > 0) { const w = textW(KIT.note); g.save(); g.globalAlpha = Math.min(1, KIT.noteT * 3); g.fillStyle = 'rgba(12,13,17,.95)'; g.fillRect(474 - w - 10, 215, w + 10, 11);
    frameRect(474 - w - 10, 215, w + 10, 11, CY); text(KIT.note, 474 - w - 5, 218, CY); g.restore(); }
}
let last = 0;
export function drawKit() {
  const now = performance.now() / 1000, dt = Math.min(.05, last ? now - last : 0); last = now;
  KIT.clock += dt; KIT.noteT = Math.max(0, KIT.noteT - dt); boxes.length = 0;
  const c = sel(), r = ROW[KIT.row], opts = options();
  g.fillStyle = 'rgba(8,9,11,.95)'; g.fillRect(0, 0, W, H);
  tabs(); whoPanel(c, dt); slotsPanel(c); optsPanel(opts, r); aboutPanel(c, opts, r);
}
