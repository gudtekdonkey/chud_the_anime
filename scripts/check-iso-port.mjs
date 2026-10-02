// check:iso, part two: the rest of today's game in the slice (src/iso/port.js). A fresh load (?iso&test&calm&tick=8:
// the samurai keeps his guard, the companions, items, HUD, prompts and click to move as the slice starts them), then:
// the HUD over the frame, the party following, fighting, down / lifted / dead and levelling, a paired execution with
// its close-up, Harvest facing north, each big item's act, the pickups' magnet and the relic, the four quick slots,
// the combo prompts (a right answer, a wrong one), click to move round the tōrō and onto a samurai, and the swipes.
// Every wait is on the game's clock or state; the page's hook is read, never steered.
export async function portSteps({ page, base, fail, ok, setStep, shot, OUT }) {
  const D = () => page.evaluate(() => ({ ...window.__iso.port, hero: window.__iso.hero, foe: window.__iso.foe, t: window.__iso.t }));
  const until = async (what, fn, arg, timeout = 60000) => { try { await page.waitForFunction(fn, arg, { timeout, polling: 50 }); }
    catch { const d = await D(); fail(`never reached ${what} (hero ${d.hero.state} at ${d.hero.x.toFixed(0)},${d.hero.z.toFixed(0)}; busy ${d.busy}; foe ${d.foe.state} hp ${d.foe.hp})`); } };
  const gameWait = sec => page.evaluate(s => new Promise(r => { const t0 = window.__iso.t; const f = () => window.__iso.t - t0 >= s ? r() : requestAnimationFrame(f); f(); }), sec);
  const settle = () => until('a standstill', () => ['idle', 'guard'].includes(window.__iso.hero.state) && Math.abs(window.__iso.hero.v) < 1 && !window.__iso.port.busy);
  const canvas = page.locator('canvas');
  // a left click on the world point (x, z): its place on the canvas from the page's own projection
  const clickWorld = async (x, z, y = 0) => { const [u, v] = await page.evaluate(([x, z, y]) => window.__iso.screenOf(x, z, y), [x, z, y]), b = await canvas.boundingBox();
    await page.mouse.click(b.x + u * b.width, b.y + v * b.height); };
  // by click (the click step's own) or by the keys, as the core loop's check walks
  const clickTo = async (x, z, near = 8) => { await clickWorld(x, z); await until(`running to ${x},${z}`, ([x, z, n]) => Math.hypot(window.__iso.hero.x - x, window.__iso.hero.z - z) < n, [x, z, near]); await settle(); };
  const goTo = async (tx, tz, r = 6) => { for (let i = 0; i < 60; i++) { const g = (await D()).hero; const dx = tx - g.x, dz = tz - g.z; if (Math.hypot(dx, dz) < r) break;
    const keys = [Math.abs(dx) > 3 ? (dx > 0 ? 'ArrowRight' : 'ArrowLeft') : null, Math.abs(dz) > 3 ? (dz > 0 ? 'ArrowDown' : 'ArrowUp') : null].filter(Boolean);
    for (const k of keys) await page.keyboard.down(k); await gameWait(Math.min(.3, Math.hypot(dx, dz) / 110)); for (const k of keys) await page.keyboard.up(k); } await settle(); };
  // a finger on the canvas (PointerEvents with pointerType touch), at canvas fractions
  const touch = (pts, ms = 60) => page.evaluate(async ({ pts, ms }) => { const c = document.querySelector('canvas'), r = c.getBoundingClientRect(), id = 7 + Math.floor(Math.random() * 1000);
    const ev = (type, [u, v]) => c.dispatchEvent(new PointerEvent(type, { pointerId: id, pointerType: 'touch', clientX: r.left + u * r.width, clientY: r.top + v * r.height, bubbles: true, cancelable: true, isPrimary: true }));
    ev('pointerdown', pts[0]); for (const p of pts.slice(1)) { await new Promise(res => setTimeout(res, ms / pts.length)); ev('pointermove', p); } ev('pointerup', pts.at(-1)); }, { pts, ms });

  setStep('port: boot');
  await page.goto(new URL('?iso&test&calm&tick=8&foes=1&folk=0', base).href);
  await page.waitForFunction(() => window.__iso && window.__iso.ready && window.__iso.t > .3, undefined, { timeout: 60000 });
  await page.evaluate(() => document.querySelector('canvas').focus()); await settle();
  await page.evaluate(() => { window.__seen = new Set(); const f = () => { const h = window.__iso.hero, p = window.__iso.port; window.__seen.add(h.state); if (window.__iso.cine) window.__seen.add('cine'); if (p.combo.prompt) window.__seen.add('prompt:' + p.combo.prompt.ans);
    if (p.pair.run) window.__seen.add('pair:' + p.pair.run); window.__cdMax = Math.max(window.__cdMax || 0, p.pair.cd); if (h.state === 'harvest') window.__seen.add('harvest@' + h.yaw.toFixed(2)); for (const a of p.party) window.__seen.add(a.id + ':' + a.state); requestAnimationFrame(f); }; f(); });
  const seen = (w, t) => until(w, w => window.__seen.has(w), w, t), forget = () => page.evaluate(() => window.__seen.clear());

  // ---- the HUD: health (60%) and Qi top left, the bottom bar, crisp over the frame (its pixels read off the canvas)
  setStep('port: HUD'); { await shot('port-hud', ['hero']);
    const buf = await canvas.screenshot();
    const px = await page.evaluate(async src => { const im = new Image(); im.src = src; await im.decode(); const o = document.createElement('canvas'); o.width = 480; o.height = 270; const g = o.getContext('2d'); g.imageSmoothingEnabled = false; g.drawImage(im, 0, 0, 480, 270);
      const at = (x, y) => [...g.getImageData(x, y, 1, 1).data]; return { hp: at(30, 10), hpEnd: at(76, 10), bar: at(140, 236), panel: at(7, 7) }; }, 'data:image/png;base64,' + buf.toString('base64'));
    const white = p => p[0] > 200 && p[1] > 200 && p[2] > 200;
    if (!white(px.hp)) fail(`the health bar's fill is not drawn: ${px.hp}`); if (white(px.hpEnd)) fail(`the health bar is full past 60%: ${px.hpEnd}`);
    ok(`health fill ${px.hp.slice(0, 3)}, past it ${px.hpEnd.slice(0, 3)}`); }

  // ---- the party: three companions in their kit; they follow him in rank
  setStep('port: the party follows'); { const d = await D(); if (d.party.length !== 3) fail(`${d.party.length} companions`);
    await goTo(200, 170); await gameWait(1.2); const e = await D(), far = e.party.map(a => Math.hypot(a.x - e.hero.x, a.z - e.hero.z));
    if (far.some(f => f > 45)) fail(`a companion is ${Math.max(...far).toFixed(0)} units behind`); await shot('port-follow', ['hero']);
    ok(`${e.party.map(a => `${a.name} (${a.weapon}) ${Math.hypot(a.x - e.hero.x, a.z - e.hero.z).toFixed(0)}`).join(', ')}`); }

  // ---- click to move round the tōrō (a solid at 163..177, 143..157): he goes round it and arrives
  setStep('port: click to move round the tōrō'); { await clickTo(170, 128, 8); const path = await page.evaluate(() => { window.__trace = []; const f = () => { window.__trace.push([window.__iso.hero.x, window.__iso.hero.z]); if (window.__trace.length < 4000) requestAnimationFrame(f); }; f(); });
    void path; await clickTo(170, 172, 8); const tr = await page.evaluate(() => window.__trace);
    if (tr.some(([x, z]) => x > 163 && x < 177 && z > 143 && z < 157)) fail('he walked through the tōrō'); ok(`${tr.length} frames round it`); }

  // ---- the combo prompts: J lands J1, a prompt shows over him; the right answer is the next cut; a wrong one ends the chain
  setStep('port: combo prompts'); { const f = (await D()).foe; await goTo(f.x - 22, f.z, 6); await forget();
    const keyOf = { R: 'ArrowRight', L: 'ArrowLeft', U: 'ArrowUp', D: 'ArrowDown' };
    const n0 = (await D()).combo.grades.length;
    await page.keyboard.press('KeyJ'); await until('a prompt over him', () => !!window.__iso.port.combo.prompt);
    let ans = await page.evaluate(() => window.__iso.port.combo.prompt.ans);   // answered at once: a screenshot here outlasts the window
    const answerWith = async a => { const k = keyOf[a]; if (k) await page.keyboard.down(k); await page.keyboard.press('KeyJ'); await gameWait(.1); if (k) await page.keyboard.up(k); };
    await forget(); await answerWith(ans); await until('a grade', n => window.__iso.port.combo.grades.length > n, n0);
    let g = (await D()).combo.grades.at(-1); if (!/PERFECT|GOOD|LATE/.test(g)) fail(`the right answer (${ans}) was graded ${g}: ${JSON.stringify((await D()).combo.answers)}`);
    const cut = { J: 'J2', R: 'lunge' }[ans] || 'J1'; await seen(cut);   // the answer is that cut
    ok(`asked ${ans}, graded ${g}, he cut ${cut}`);
    // the next prompt (or the finisher's): answer it wrong on purpose
    await until('the next prompt', () => !!window.__iso.port.combo.prompt || window.__iso.port.combo.chain === 0);
    const p = await page.evaluate(() => window.__iso.port.combo.prompt);
    if (p) { ans = p.ans; const wrong = ans === 'J' ? 'L' : 'J'; const n1 = (await D()).combo.grades.length; await answerWith(wrong);
      await until('the miss', n => window.__iso.port.combo.grades.length > n, n1); g = (await D()).combo.grades.at(-1);
      if (ans !== 'K' && g !== 'MISS') fail(`a wrong answer (${wrong} for ${ans}) was graded ${g}`);
      if (ans !== 'K' && !((await D()).combo.recover > 0 || (await D()).combo.chain === 0)) fail('no recovery after the miss'); ok(`asked ${ans}, answered ${wrong}: ${g}`); }
    for (let i = 0; i < 4; i++) { await settle(); await gameWait(.5); const d = await D(); if (d.foe.dead) continue; await goTo(d.foe.x - 22, d.foe.z, 6); await page.keyboard.press('KeyJ');   /* a picture of one */
      if (await page.waitForFunction(() => !!window.__iso.port.combo.prompt, undefined, { timeout: 8000, polling: 50 }).then(() => true, () => false)) { await shot('port-prompt', ['hero', 'foe']); break; } } }

  // ---- the companions fight beside him: his blade out, the samurai near: they cut him
  let e0 = (await D()).party.map(a => a.exp + a.lv * 1000);   // their EXP before the fight
  setStep('port: the party fights'); { await settle(); const hits = async () => (await D()).party.reduce((s, a) => s + a.hits, 0), h0 = await hits();
    for (let i = 0; i < 20 && (await hits()) === h0; i++) { await until('the samurai standing', () => !window.__iso.foe.dead, undefined, 90000); const d = await D();
      if (Math.hypot(d.foe.x - d.hero.x, d.foe.z - d.hero.z) > 26) await goTo(d.foe.x - 22, d.foe.z, 7); await page.keyboard.press('KeyJ'); await gameWait(.5); }
    if ((await hits()) === h0) fail('no companion landed a cut'); await shot('port-fight', ['hero', 'foe']);
    ok(((await D()).party.map(a => `${a.name} ${a.hits}`)).join(', ')); }

  // ---- a kill: EXP to the companions in the fight; the body to Harvest; hold E: he faces north and the light streams in
  setStep('port: kill, EXP, Harvest'); {
    for (let i = 0; i < 30 && !(await D()).foe.dead; i++) { const d = await D(); if (Math.hypot(d.foe.x - d.hero.x, d.foe.z - d.hero.z) > 26) await goTo(d.foe.x - 22, d.foe.z, 7); await page.keyboard.press('KeyJ'); await gameWait(.35); }
    await until('the samurai falling', () => window.__iso.foe.dead || window.__iso.port.items.fallen.length > 0);
    await until('a body to Harvest', () => window.__iso.port.items.fallen.length > 0);
    const e1 = (await D()).party.map(a => a.exp + a.lv * 1000); if (!e1.some((v, i) => v > e0[i])) fail('no companion earned EXP from the kill');
    const fl = (await D()).items.fallen[0]; await settle(); await goTo(fl.x, fl.z - 14, 10); await gameWait(2.8);
    const x0 = (await D()).inv.exp + (await D()).inv.lv * 1000; await page.keyboard.down('KeyE'); await seen('harvest'); await gameWait(.4); await shot('port-harvest', ['hero']);
    await until('the body harvested', () => window.__iso.port.items.harvested > 5); await page.keyboard.up('KeyE'); await settle();
    const yaw = [...(await page.evaluate(() => [...window.__seen]))].find(s => s.startsWith('harvest@')); if (!yaw || Math.abs(Math.abs(+yaw.split('@')[1]) - Math.PI) > .05) fail(`Harvest faced ${yaw}, not north`);
    const x1 = (await D()).inv.exp + (await D()).inv.lv * 1000; if (!(x1 > x0)) fail('Harvest gave no EXP');
    ok(`companions ${(await D()).party.map(a => `LV ${a.lv} ${a.exp.toFixed(0)} EXP`).join(', ')}; Harvest ${(x1 - x0).toFixed(0)} EXP facing ${yaw.split('@')[1]}`); }

  // ---- a paired execution: K on the lone samurai with a partner set up for it; the close-up on the kill; the 5 s party cooldown
  setStep('port: paired execution'); { await until('the samurai back', () => !window.__iso.foe.dead && window.__iso.foe.hp === 5, undefined, 90000); await settle(); await forget();
    const f = (await D()).foe; await goTo(f.x - 30, f.z, 8); await until('a partner ready', () => window.__iso.port.pair.candidate, undefined, 30000);
    const done0 = (await D()).pair.done; await page.keyboard.press('KeyK');
    await until('the paired execution', () => !!window.__iso.port.pair.run); const id = (await D()).pair.run; await gameWait(.5); await shot('port-paired', ['hero', 'foe']);
    await until('it ending', () => !window.__iso.port.pair.run); const cd = await page.evaluate(() => window.__cdMax); await seen('cine'); const d = await D();   // cd: the most it showed (the screenshot outlasts some of it)
    if (d.pair.done !== done0 + 1 || !(d.foe.dead || d.foe.deaths > f.deaths)) fail(`the paired kill did not land (done ${d.pair.done}, foe dead ${d.foe.dead})`);
    if (!(cd > 4.5)) fail(`the party cooldown is ${cd}`);
    ok(`${id}: the kill, the close-up, the party's cooldown ${cd.toFixed(1)} s`); }

  // ---- down, lifted, dead: H cuts the nearest companion down; a click on them takes him there and holds E; H twice kills
  setStep('port: down and lifted'); { await settle(); await page.keyboard.press('KeyH'); await until('a companion down', () => window.__iso.port.party.some(a => a.downed));
    await gameWait(.5); const a = (await D()).party.find(a => a.downed); await shot('port-downed', ['hero']);   // read where he lies after he has fallen (he slides as he goes down)
    await clickWorld(a.x, a.z, 6); await page.waitForFunction(() => window.__iso.port.click.log.at(-1) === 'lift' || window.__iso.port.items.lifting, undefined, { timeout: 5000, polling: 50 }).catch(() => {});
    { const d = await D(); if (d.click.log.at(-1) !== 'lift' && !d.items.lifting) fail(`the click on ${a.name} (${a.x.toFixed(0)},${a.z.toFixed(0)}) read ${d.click.log.at(-1)}; screen ${JSON.stringify(await page.evaluate(([x, z]) => window.__iso.screenOf(x, z, 6), [a.x, a.z]))}; ${JSON.stringify(d.click.dbg)}; ${JSON.stringify(d.party.map(p => [p.name, p.state, p.downed]))}`); }
    await until('him lifting', () => window.__iso.port.items.lifting, undefined, 60000); await until('them back up', id => !window.__iso.port.party.find(a => a.id === id).downed, a.id);
    const b = (await D()).party.find(x => x.id === a.id); if (Math.abs(b.hp - .35) > .01) fail(`lifted at ${b.hp}`); ok(`${a.name} lifted at ${b.hp}`); }
  setStep('port: dead for good'); { await settle(); const bag0 = (await D()).bag.weapons, n0 = (await D()).party.length;
    await page.keyboard.press('KeyH'); await until('one down', () => window.__iso.port.party.some(a => a.downed)); await page.keyboard.press('KeyH');
    await until('one dead', () => window.__iso.port.party.some(a => a.dead)); await until('buried', n => window.__iso.port.party.length < n, n0);
    const d = await D(); if (d.bag.weapons !== bag0 + 1) fail(`the weapon did not go back to the bag (${bag0} → ${d.bag.weapons})`); ok(`party ${n0} → ${d.party.length}, the bag's weapons ${bag0} → ${d.bag.weapons}`); }

  // ---- the big items, each by a click on it: PRAY fills health and Qi; TAKE the Grave Nodachi; CUT the seal and the loot; READ the tablet
  setStep('port: big items'); { const use = async (id, x, z, h, done) => { await settle(); await goTo(x + 20, z - 50, 10); await forget(); await clickWorld(x, z, h);   /* on the screen first, then a click on it */ await until(`${id}'s act`, done, undefined, 90000); await settle(); await shot('port-' + id, ['hero']); };
    await use('shrine', 64, 70, 8, () => window.__iso.port.items.used.shrine); let d = await D(); if (d.inv.hp < .99 || d.inv.qi < .99) fail(`after praying health ${d.inv.hp}, Qi ${d.inv.qi}`); if (!(await page.evaluate(() => window.__seen.has('pray')))) fail('he never prayed');
    await use('nodachi', 214, 246, 10, () => window.__iso.port.items.used.nodachi); d = await D(); if (d.inv.weapon !== 'nodachi') fail(`weapon ${d.inv.weapon}`);
    const mon0 = d.inv.mon; await use('chest', 380, 222, 6, () => window.__iso.port.items.used.chest); await until('the loot in', m => window.__iso.port.inv.mon >= m + 4, mon0);
    await use('tablet', 100, 226, 10, () => window.__iso.port.items.used.tablet); d = await D(); if (!d.inv.rift) fail('the tablet taught nothing');
    ok(`prayed (health ${d.inv.hp.toFixed(2)}), the nodachi taken, the chest's loot (+${d.inv.mon - mon0} mon), the tablet read`); }

  // ---- the pickups: the coins fly in within the magnet's reach; the relic to the empty charm slot
  setStep('port: pickups and the relic'); { const d0 = await D(), it = d0.items.pickups.filter(i => i.kind !== 'qi' || d0.inv.qi < .9).sort((a, b) => Math.hypot(a.x - d0.hero.x, a.z - d0.hero.z) - Math.hypot(b.x - d0.hero.x, b.z - d0.hero.z))[0];
    if (!it) fail('nothing left on the floor'); await goTo(it.x, it.z - 16, 6); await until(`the ${it.kind} flying in`, n => window.__iso.port.items.got > n, d0.items.got);
    await goTo(452, 150, 6); await until('the relic in its slot', () => window.__iso.port.inv.charms[3] === 'tsuba'); ok(`picked ${(await D()).items.got - d0.items.got}, charms ${(await D()).inv.charms.join(' ')}`); }

  // ---- the quick slots: 1 the static bomb (smoke over the screen), 2 the talisman, 3 the whetstone (the cyan edge), 4 the incense (heals)
  setStep('port: quick slots'); { await settle(); const q0 = (await D()).inv.quick.map(q => q && q.n);
    await page.keyboard.press('Digit1'); await until('the smoke', () => window.__iso.port.inv.smoke > 0); await gameWait(.2); await shot('port-bomb', ['hero']); await settle();
    await until('the samurai standing', () => !window.__iso.foe.dead, undefined, 90000); const f = (await D()).foe, h0 = f.hits; await page.keyboard.press('Digit2'); await until('the talisman striking', h => window.__iso.foe.hits > h || window.__iso.foe.dead, h0); await settle();
    await page.keyboard.press('Digit3'); await until('the edge', () => window.__iso.port.inv.edge > 15); await shot('port-whetstone', ['hero']); await settle();
    await page.keyboard.press('KeyH'); await page.keyboard.press('KeyH');   // two cuts on him if nobody is left to take them, else on a companion
    const hp0 = (await D()).inv.hp, n4 = (await D()).inv.quick[3].n; await page.keyboard.press('Digit4'); await until('the incense lit', n => (window.__iso.port.inv.quick[3] || { n: 0 }).n < n, n4);
    await until('the incense healing', h => window.__iso.port.inv.hp > h + .05 || h > .95, hp0); await settle();
    const q1 = (await D()).inv.quick.map(q => q && q.n); if (!q0.every((n, i) => (q1[i] || 0) === n - 1)) fail(`stacks ${q0} → ${q1}`); ok(`stacks ${q0.join(' ')} → ${q1.join(' ')}`); }

  // ---- a click on the samurai: he runs in and cuts
  setStep('port: click on a samurai'); { await until('the samurai standing', () => !window.__iso.foe.dead, undefined, 90000); await settle(); await page.keyboard.press('KeyT');   // free mode: the plain ladder
    const f = (await D()).foe, n0 = (await D()).stats; await clickWorld(f.x, f.z, 12); await until('a cut at him', n => window.__iso.port.stats > n, n0, 60000);
    const d = await D(); if (Math.hypot(d.foe.x - d.hero.x, d.foe.z - d.hero.z) > 40) fail('he cut from afar'); ok(`clicked: ${d.click.log.at(-1)}`); }

  // ---- swipes: the stick on the left runs him; a tap cuts; a swipe away dashes (the roll); a swipe at the samurai is the lunge; a double tap is K
  setStep('port: swipes'); { await settle(); await forget(); const a = (await D()).hero;
    await touch([[.2, .6], [.24, .6], [.3, .6], [.3, .6]], 900); await until('the stick running him', ([x]) => window.__iso.hero.x > x + 4, [a.x]); await settle();
    await touch([[.7, .5], [.7, .5]], 40); await until('a tap cut', () => window.__seen.has('J1')); await settle();
    const f = (await D()).foe, h = (await D()).hero; const away = f.x > h.x ? [[.75, .5], [.6, .5]] : [[.6, .5], [.75, .5]];
    await touch(away, 80); await until('a swipe dash', () => window.__seen.has('roll')); await settle();
    await touch([[.7, .5], [.7, .5]], 30); await touch([[.7, .5], [.7, .5]], 30); await until('a double tap', () => window.__iso.port.touch.log.includes('double'));
    ok((await D()).touch.log.join(' ')); }

  // ---- the companions through the look seam: M swaps everyone's model, theirs included
  setStep('port: the pixel look'); { await page.keyboard.press('KeyM'); await until('the pixel look', () => window.__iso.look === 'pixel'); await gameWait(.4); await shot('port-pixel', ['hero']);
    await page.keyboard.press('KeyM'); await until('the 3D look', () => window.__iso.look === '3d'); ok(`him and ${(await D()).party.length} companion(s) redrawn`); }
  void OUT;
}
