// The squad battle's steps for npm run check:iso (scripts/check-iso.mjs runs them after the core loop; docs/squad-ai.md).
// Part 1, `?iso&squad&calm` (the foes keep their posts): a drag box selects, Ctrl+1 / 1 save and recall a group, a right
// click on the ground sends the selection there in formation, the formations hold their slots (circle, line), follow me
// and hold do what they say, and a left click still moves the hero without touching the selection.
// Part 2, `?iso&squad` (the AI fights): a right click on an ally makes a protector, Charge takes the party in, the foes
// take turns (attack tokens), the tank's taunt pulls them onto him, the archer companion keeps her distance and looses,
// the protector stays by his charge and intercepts, Fall back takes them out, and the assassin finds the isolated archer
// and executes him. Everything waits on the game's clock; the input is the mouse and the keys, the hook is only read.
export async function squadSteps({ page, base, until, gameWait, ok, fail, setStep, shotPage, errorsCheck }) {
  const S = () => page.evaluate(() => window.__iso.squad.agents);
  const by = async n => (await S()).find(a => a.name === n);
  const ev = () => page.evaluate(() => window.__iso.squad.events);
  const box = async () => page.locator('canvas').boundingBox();
  const at = async ([u, v]) => { const b = await box(); return [b.x + u * b.width, b.y + v * b.height]; };
  const screen = (x, z) => page.evaluate(([x, z]) => window.__iso.squad.screen(x, z), [x, z]);
  const click = async (sel) => { await page.locator(sel).click(); };
  const near = (a, b, r) => Math.hypot(a.x - b.x, a.z - b.z) < r;
  const evWait = (what, re, timeout = 90000) => until(what, re => window.__iso.squad.events.some(e => new RegExp(re).test(e)), re, timeout);
  const boot = async q => { await page.goto(new URL(q, base).href); await page.waitForFunction(() => window.__iso && window.__iso.squad && window.__iso.t > .4, undefined, { timeout: 60000 }); await page.locator('canvas').focus(); };

  // ---------------- part 1: the controls, the foes calm ----------------
  setStep('squad: boot'); await boot('?iso&test&squad&calm&tick=8'); errorsCheck();
  { const a = await S(); if (a.length !== 12) fail(`${a.length} agents, wanted the hero, 5 companions and 6 foes`);
    // the click above (a corner, the ground) may have sent the hero off: let him arrive
    await gameWait(1.2); ok(`${a.filter(x => x.team === 0).length - 1} companions, ${a.filter(x => x.team === 1).length} foes`); }
  await shotPage('squad-00-start');

  setStep('squad: drag-select'); {
    const want = ['Kuro', 'Tetsu', 'Hana', 'Ren'], ag = await S(), pick = ag.filter(a => want.includes(a.name)), sz = ag.find(a => a.name === 'Suzume');
    const x0 = Math.min(...pick.map(a => a.px[0])) - .012, x1 = Math.max(...pick.map(a => a.px[0])) + .012, y0 = Math.min(...pick.map(a => a.px[2])) - .012, y1 = Math.max(...pick.map(a => a.px[1])) + .012;
    const [ax, ay] = await at([x0, y0]), [bx, by] = await at([x1, y1]);
    await page.mouse.move(ax, ay); await page.mouse.down(); for (let i = 1; i <= 6; i++) await page.mouse.move(ax + (bx - ax) * i / 6, ay + (by - ay) * i / 6); await shotPage('squad-01-drag'); await page.mouse.up();
    const sel = await page.evaluate(() => window.__iso.squad.sel);
    for (const n of want) if (!sel.includes(n)) fail(`the box missed ${n}: selected ${sel.join(', ')}`);
    const szIn = sz.px[0] > x0 && sz.px[0] < x1 && sz.px[1] > y0 && sz.px[2] < y1; if (!szIn && sel.includes('Suzume')) fail('Suzume was outside the box but selected');
    ok(sel.join(', ')); }

  setStep('squad: groups (Ctrl+1 saves, 1 recalls)'); {
    const sel0 = await page.evaluate(() => window.__iso.squad.sel);
    await page.keyboard.press('Control+Digit1'); await page.keyboard.press('Escape');
    if ((await page.evaluate(() => window.__iso.squad.sel)).length) fail('Esc did not clear the selection');
    await page.keyboard.press('Digit1'); const sel = await page.evaluate(() => window.__iso.squad.sel);
    if (sel.sort().join() !== sel0.sort().join()) fail(`group 1 recalled ${sel.join(', ')}, saved ${sel0.join(', ')}`);
    ok(`group 1 = ${sel.join(', ')}`); }

  const SEL = ['Kuro', 'Tetsu', 'Hana', 'Ren'];
  setStep('squad: right click orders a move'); {
    const h = await by('you'), tx = h.x + 40, tz = h.z - 70, p = await at(await screen(tx, tz));
    await page.mouse.click(p[0], p[1], { button: 'right' });
    const o = (await S()).filter(a => SEL.includes(a.name)); if (!o.every(a => a.order.k === 'goto')) fail(`orders after the right click: ${o.map(a => a.order.k).join(', ')}`);
    await until('the selection arriving and holding there', ([tx, tz, sel]) => window.__iso.squad.agents.filter(a => sel.includes(a.name)).every(a => a.order.k === 'hold' && Math.hypot(a.x - a.slot.x, a.z - a.slot.z) < 10 && Math.hypot(a.x - tx, a.z - tz) < 40), [tx, tz, SEL]);
    ok(`went to ${tx.toFixed(0)},${tz.toFixed(0)}, holding`); await shotPage('squad-02-goto'); }

  setStep('squad: formation holds'); {
    for (const [btn, check] of [['Circle', 'ring'], ['Line', 'rank']]) {
      await page.locator('.sq-row button', { hasText: new RegExp(`^${btn}$`) }).click(); await gameWait(.2);   // the slots are laid out on the next step
      await until(`the ${btn.toLowerCase()} formed`, sel => window.__iso.squad.agents.filter(a => sel.includes(a.name)).every(a => Math.hypot(a.x - a.slot.x, a.z - a.slot.z) < 8), SEL);
      const m = (await S()).filter(a => SEL.includes(a.name)), o = m[0].order, d = m.map(a => Math.hypot(a.slot.x - o.x, a.slot.z - o.z));
      if (check === 'ring' && d.some(v => Math.abs(v - 24) > 2)) fail(`the circle's slots are ${d.map(v => v.toFixed(1)).join(', ')} from the point held, wanted 24`);
      if (check === 'rank') { const fx = Math.sin(o.h), fz = Math.cos(o.h), fw = m.map(a => (a.slot.x - o.x) * fx + (a.slot.z - o.z) * fz); if (Math.max(...fw) - Math.min(...fw) > 1) fail(`the line is not a rank: forward offsets ${fw.map(v => v.toFixed(1)).join(', ')}`); }
      await gameWait(1); const m2 = (await S()).filter(a => SEL.includes(a.name)); if (m2.some(a => Math.hypot(a.x - a.slot.x, a.z - a.slot.z) > 8)) fail(`the ${btn} did not hold: ${m2.map(a => Math.hypot(a.x - a.slot.x, a.z - a.slot.z).toFixed(1)).join(', ')}`);
      await shotPage(`squad-03-${btn.toLowerCase()}`); }
    ok('circle and line formed and held'); }

  setStep('squad: follow me'); {
    await page.locator('.sq-row button', { hasText: /^Follow me$/ }).click(); await page.locator('canvas').focus();
    await page.keyboard.down('ArrowRight'); await gameWait(1.4); await page.keyboard.up('ArrowRight'); await gameWait(3);
    const h = await by('you'), m = (await S()).filter(a => SEL.includes(a.name)), far = m.filter(a => !near(a, h, 50));
    if (far.length) fail(`not with him (at ${h.x.toFixed(0)},${h.z.toFixed(0)}): ${far.map(a => `${a.name} ${Math.hypot(a.x - h.x, a.z - h.z).toFixed(0)} away at ${a.x.toFixed(0)},${a.z.toFixed(0)}, ${a.order.k}, ${a.why}, slot ${a.slot.x.toFixed(0)},${a.slot.z.toFixed(0)}`).join('; ')}`);
    ok(`all within 50 of him at ${h.x.toFixed(0)},${h.z.toFixed(0)}`); }

  setStep('squad: hold'); {
    await page.keyboard.press('KeyG'); const h0 = await by('you'), m0 = (await S()).filter(a => SEL.includes(a.name));
    if (!m0.every(a => a.order.k === 'hold')) fail(`G gave ${m0.map(a => a.order.k).join(', ')}`);
    await page.keyboard.down('ArrowLeft'); await gameWait(1.6); await page.keyboard.up('ArrowLeft'); await gameWait(1.5);
    const h = await by('you'), m = (await S()).filter(a => SEL.includes(a.name)), o = m[0].order;
    if (near(h, h0, 50)) fail('the hero did not get away from the hold point');
    const off = m.filter(a => Math.hypot(a.x - o.x, a.z - o.z) > 45); if (off.length) fail(`left the held ground: ${off.map(a => a.name).join(', ')}`);
    ok(`held at ${o.x.toFixed(0)},${o.z.toFixed(0)} while he went ${Math.hypot(h.x - h0.x, h.z - h0.z).toFixed(0)} away`); }

  setStep('squad: left click moves the hero, not the squad'); {
    const h = await by('you'), sel0 = await page.evaluate(() => window.__iso.squad.sel), tx = h.x + 50, tz = h.z + 30, p = await at(await screen(tx, tz));
    await page.mouse.click(p[0], p[1]);
    await until('the hero at the clicked point', ([x, z]) => { const h = window.__iso.hero; return Math.hypot(h.x - x, h.z - z) < 6; }, [tx, tz]);
    const sel = await page.evaluate(() => window.__iso.squad.sel), m = (await S()).filter(a => SEL.includes(a.name));
    if (sel.sort().join() !== sel0.sort().join()) fail('the left click changed the selection');
    if (!m.every(a => a.order.k === 'hold')) fail('the left click gave the squad an order');
    ok('he walked there; the selection and its order stayed'); }
  errorsCheck();

  // ---------------- part 2: the fight ----------------
  setStep('squad: fight boot'); await boot('?iso&test&squad&tick=8'); errorsCheck();
  // what the fight does, recorded every frame in the page (a poll from here can miss it)
  await page.evaluate(() => { const R = window.__rec = { foeOnKuro: 0, foeOnHana: 0, hanaD: [], guardD: [], maxOn: 0, frames: 0 };
    const f = () => { const A = window.__iso.squad.agents, g = n => A.find(a => a.name === n), hana = g('Hana'), tetsu = g('Tetsu'), foes = A.filter(a => a.team === 1 && a.alive);
      if (window.__recOn) { R.frames++;
        if (foes.some(a => a.target === 'Kuro')) R.foeOnKuro++; if (foes.some(a => a.target === 'Hana' && a.kind === 'samurai' && Math.hypot(a.x - hana.x, a.z - hana.z) < 100)) R.foeOnHana++;   // a blade coming for her (an archer is body-blocked, not intercepted)
        const melee = foes.filter(a => a.kind === 'samurai'); if (hana.alive && !hana.downed && melee.length) R.hanaD.push(Math.min(...melee.map(a => Math.hypot(a.x - hana.x, a.z - hana.z))));
        if (tetsu.alive && !tetsu.downed && hana.alive) R.guardD.push(Math.hypot(tetsu.x - hana.x, tetsu.z - hana.z));
        const on = {}; for (const a of foes) if (a.state === 'fcut') on[a.target] = (on[a.target] || 0) + 1; R.maxOn = Math.max(R.maxOn, ...Object.values(on), 0); }
      requestAnimationFrame(f); }; f(); });

  setStep('squad: right click on an ally makes a protector'); {
    const t = await by('Tetsu'), p = await at([t.px[0], (t.px[1] + t.px[2]) / 2]); await page.mouse.click(p[0], p[1]);
    if ((await page.evaluate(() => window.__iso.squad.sel)).join() !== 'Tetsu') fail('clicking Tetsu did not select him alone');
    const h = await by('Hana'), q = await at([h.px[0], (h.px[1] + h.px[2]) / 2]); await page.mouse.click(q[0], q[1], { button: 'right' });
    const t2 = await by('Tetsu'); if (t2.role !== 'protector' || t2.charge !== 'Hana') fail(`Tetsu is ${t2.role} of ${t2.charge}`);
    ok('Tetsu: protector of Hana'); }

  setStep('squad: charge'); {
    await click('#sq-all'); await page.locator('.sq-row button', { hasText: /^Charge$/ }).click(); await page.evaluate(() => { window.__recOn = true; });
    const m = (await S()).filter(a => a.kind === 'ally'); if (!m.every(a => a.order.k === 'charge')) fail(`orders: ${m.map(a => a.order.k).join(', ')}`);
    await evWait('a companion swinging at a foe', 'swing:(Kuro|Tetsu|Ren|Suzume)>', 60000);
    await until('the foes engaged', () => window.__iso.squad.agents.filter(a => a.team === 1 && a.mode === 'engaged').length >= 3, undefined, 60000);
    await shotPage('squad-04-charge'); ok((await ev()).filter(e => /shout/.test(e)).length + ' shouts; the foes are engaged'); }

  setStep('squad: the tank pulls aggro'); {
    await evWait('Kuro taunting foes onto him', 'taunted:Kuro:[1-9]', 90000);
    await until('a foe on Kuro', () => window.__rec.foeOnKuro > 0, undefined, 60000);
    ok((await ev()).filter(e => /taunted:Kuro/.test(e)).join('; ')); }

  setStep('squad: the foes take turns'); { const r = await page.evaluate(() => window.__rec);
    if (r.maxOn > 3) fail(`${r.maxOn} samurai swung at one man at once`); ok(`at most ${r.maxOn} swinging at one man at once (cap 2, one steal)`); }

  setStep('squad: the archer keeps her distance'); {
    await evWait('Hana loosing', 'loose:Hana>', 60000); await gameWait(4);
    const d = (await page.evaluate(() => window.__rec.hanaD)).slice().sort((a, b) => a - b), med = d[d.length >> 1], close = d.filter(v => v < 22).length / d.length;
    if (!(med > 40)) fail(`Hana's median distance to the nearest samurai is ${med && med.toFixed(1)}`); if (close > .2) fail(`Hana was within reach ${(close * 100).toFixed(0)}% of the time`);
    ok(`median ${med.toFixed(0)} units from the nearest blade, within reach ${(close * 100).toFixed(0)}% of the time`); }

  setStep('squad: the protector intercepts'); {
    const r = await page.evaluate(() => window.__rec), g = r.guardD.slice().sort((a, b) => a - b), med = g[g.length >> 1];
    if (!(med < 32)) fail(`Tetsu's median distance to Hana is ${med && med.toFixed(1)}`);
    if (!r.foeOnHana) {   // no blade came for her by itself: send her (a right click) beside a living samurai, and he must step in
      const a = await S(), f = a.filter(x => x.team === 1 && x.alive && x.kind === 'samurai').sort((p, q) => Math.hypot(p.x - 96, p.z - 150) - Math.hypot(q.x - 96, q.z - 150))[0];
      if (f) { await page.locator('.sq-por[data-id="Hana"]').click(); const p = await at(await screen(f.x - 18, f.z)); await page.mouse.click(p[0], p[1], { button: 'right' }); { const b = await box(); await page.mouse.move(b.x + 4, b.y + 4); } } }
    await evWait('Tetsu intercepting the blade on Hana', 'intercept:Tetsu>', 60000);
    ok(`stayed ${med.toFixed(0)} from her; ${r.foeOnHana ? '' : 'sent her among the blades; '}intercepted: ${(await ev()).filter(e => /intercept:Tetsu/.test(e)).join('; ')}${(await ev()).some(e => /bodyblock:Tetsu/.test(e)) ? '; body-blocked an archer' : ''}`); }

  setStep('squad: fall back'); {
    const foeC = a => { const f = a.filter(x => x.team === 1 && x.alive); return f.length ? { x: f.reduce((s, x) => s + x.x, 0) / f.length, z: f.reduce((s, x) => s + x.z, 0) / f.length } : null; };
    const a0 = await S(), c0 = foeC(a0), sel = ['Kuro', 'Ren', 'Hana'];
    await click('#sq-none'); for (const n of sel) { const a = a0.find(x => x.name === n); if (a.alive && !a.downed) await page.locator(`.sq-por[data-id="${n}"]`).click({ modifiers: ['Shift'] }); }   // the portraits: Shift adds
    const chosen = await page.evaluate(() => window.__iso.squad.sel); if (!chosen.length) fail('nobody selected to fall back');
    await page.locator('.sq-row button', { hasText: /^Fall back$/ }).click(); { const b = await box(); await page.mouse.move(b.x + 4, b.y + 4); } await gameWait(3);   // off the bar: hovering it slows the game
    const a1 = await S(), c1 = foeC(a1) || c0, h = a1.find(x => x.name === 'you'), d = n => { const a = a1.find(x => x.name === n), b = a0.find(x => x.name === n); return [Math.hypot(b.x - c0.x, b.z - c0.z), Math.hypot(a.x - c1.x, a.z - c1.z)]; };
    const moved = chosen.map(n => [n, ...d(n), a1.find(x => x.name === n)]);
    if (!moved.every(([, , , a]) => a.order.k === 'fallback')) fail('the order did not take');
    // pressing in = closer to where the foes stood when the order was given (c0) and still among them now; measured
    // against the foes' centre alone it read a retreat as an advance whenever the foes chased him
    const toC0 = n => { const a = a1.find(x => x.name === n), b = a0.find(x => x.name === n); return Math.hypot(a.x - c0.x, a.z - c0.z) - Math.hypot(b.x - c0.x, b.z - c0.z); };
    const fwd = moved.filter(([n, , a, ag]) => ag.alive && !ag.downed && toC0(n) < -4 && a < 60); if (fwd.length) fail(`still pressing in: ${fwd.map(m => `${m[0]} (${toC0(m[0]).toFixed(0)} toward where they stood, ${m[2].toFixed(0)} from them)`).join(', ')}`);
    ok(moved.map(([n, b, a]) => `${n} ${b.toFixed(0)}→${a.toFixed(0)}`).join(', ') + ' from the foes'); }

  setStep('squad: the assassin finds the isolated target'); {
    // she picks the lone archer by the walkway from the start (the other archer, beside the officer, is not alone), goes
    // round the squad and his sight, and executes the isolated high-value foe she reaches unseen (Kage, or Yumi if Yumi
    // has kited away from the officer and is alone first)
    if (!(await ev()).some(x => /prey:Suzume>Kage \(isolated\)/.test(x))) fail('Suzume never picked Kage, the lone archer');
    await evWait('Suzume executing an isolated archer', 'execute:Suzume>(Kage|Yumi)', 150000);
    const e = (await ev()).filter(x => /prey:Suzume|execute:Suzume|kill:(Kage|Yumi)/.test(x));
    await shotPage('squad-05-execute'); ok(e.join('; ')); }
  errorsCheck();
}
