// The enemy types' part of npm run check:iso (docs/enemies.md): on a fresh page (?iso&test&tick=8&ehp=.5, half health so
// the check is short), each type picked in the overlay's Enemies picker attacks with a telegraph (the 'telegraph'
// event, then the blow or the shot) and is cut down by the hero; then a patrol of four takes turns (never more than
// two attacking at once, at least two of them attacking) and spreads round him (two on opposite flanks). Everything
// is read from window.__iso.enemies, never steered through it; the hero is driven by keys like a player.
export async function enemySteps({ page, browser, base, OUT, fail, ok, setStep }) {
  await page.goto(new URL('?iso&test&solo&combo=free&tick=8&ehp=.5', base).href);
  await page.waitForFunction(() => window.__iso && window.__iso.ready && window.__iso.t > .2, undefined, { timeout: 60000 });
  await page.evaluate(() => document.querySelector('canvas').focus());   // a click would be a click to move (port.js)
  const E = () => page.evaluate(() => ({ ...window.__iso.enemies, hero: window.__iso.hero, t: window.__iso.t }));
  const gameWait = sec => page.evaluate(s => new Promise(r => { const t0 = window.__iso.t; const f = () => window.__iso.t - t0 >= s ? r() : requestAnimationFrame(f); f(); }), sec);
  const until = async (what, fn, arg, timeout = 90000) => { try { await page.waitForFunction(fn, arg, { timeout, polling: 50 }); }
    catch { const g = await E(); fail(`never reached ${what} (${g.enemies.map(e => `${e.kind} ${e.st} ${e.clip} hp ${e.hp}`).join('; ')})`); } };
  async function shot(name, u, v) {
    const buf = await page.locator('canvas').screenshot({ path: `${OUT}/${name}.png` });
    const z = await browser.newPage({ viewport: { width: 480, height: 400 } });
    await z.setContent('<body style="margin:0;background:#111"><canvas id=c width=480 height=400></canvas></body>');
    await z.evaluate(async ({ src, u, v }) => { const im = new Image(); im.src = src; await im.decode(); const g = document.getElementById('c').getContext('2d'); g.imageSmoothingEnabled = false;
      g.drawImage(im, u * im.width - 60, v * im.height - 85, 120, 100, 0, 0, 480, 400); }, { src: 'data:image/png;base64,' + buf.toString('base64'), u, v });
    await z.screenshot({ path: `${OUT}/${name}-zoom.png` }); await z.close();
  }
  const keysFor = (dx, dz) => [Math.abs(dx) > 3 ? (dx > 0 ? 'ArrowRight' : 'ArrowLeft') : null, Math.abs(dz) > 3 ? (dz > 0 ? 'ArrowDown' : 'ArrowUp') : null].filter(Boolean);
  const pick = async g => { await page.selectOption('#o-group', g); await page.locator('canvas').focus();
    await until(`the ${g} group`, g => window.__iso.enemies.group === g && window.__iso.enemies.enemies.length > 0, g); };

  for (const kind of ['swordsman', 'spearman', 'archer', 'heavy', 'ninja', 'duelist']) {
    setStep(`${kind}: telegraph and attack`); await pick(kind);
    const n0 = (await E()).log.length ? (await E()).log.at(-1).t : 0;
    // the wind-up comes first (the red flash), then the blow or the shot
    await until(`${kind} telegraphing`, ([k, t0]) => window.__iso.enemies.log.some(e => e.type === k && e.name === 'telegraph' && e.t > t0), [kind, n0]);
    { const g = await E(), e = g.enemies[0]; await shot(`enemy-${kind}-telegraph`, e.px[0], e.px[1]); }
    await until(`${kind} striking`, ([k, t0]) => { const L = window.__iso.enemies.log, i = L.findIndex(e => e.type === k && e.name === 'telegraph' && e.t > t0);
      return i >= 0 && L.slice(i).some(e => e.type === k && (e.name === 'swing' || e.name === 'shoot')); }, [kind, n0]);
    const tele = (await E()).log.filter(e => e.type === kind && e.name === 'telegraph' && e.t > n0).map(e => e.move);
    ok(`telegraphed ${[...new Set(tele)].join(', ')}, then struck`);
    // the kill: run at him and cut, as a player would, until he falls
    setStep(`${kind}: killed`);
    for (let i = 0; i < 400; i++) { const g = await E(), e = g.enemies.find(e => !e.dead); if (!e || g.log.some(l => l.type === kind && l.name === 'death')) break;
      if (e.hidden) { await gameWait(.15); continue; }
      const dx = e.x - g.hero.x, dz = e.z - g.hero.z;
      if (Math.hypot(dx, dz) > 34) { const k = keysFor(dx, dz); for (const x of k) await page.keyboard.down(x); await gameWait(.1); for (const x of k) await page.keyboard.up(x); }
      else { await page.keyboard.press('KeyJ'); await gameWait(.22); } }
    await until(`${kind} dying`, k => window.__iso.enemies.log.some(e => e.type === k && e.name === 'death'), kind, 20000);
    { const g = await E(), e = g.enemies[0]; if (e) await shot(`enemy-${kind}-death`, e.px[0], e.px[1]);
      const st = g.stats; ok(`dead; the hero landed ${st.hits}, ${st.blocked} blocked, ${st.parried} parried, ${st.broken} guards broken, ${st.armor} armoured, ${st.dodged} rolled through; took ${st.taken}`); }
  }

  // ---- a group takes turns: the patrol (three swords and a spear) on a hero standing still
  setStep('patrol: turns and the surround'); await pick('patrol');
  await page.evaluate(() => { window.__flank = 0; const f = () => { const g = window.__iso.enemies, h = window.__iso.hero; if (g.group !== 'patrol') return;
    const a = g.enemies.filter(e => !e.dead && Math.hypot(e.x - h.x, e.z - h.z) < 70).map(e => Math.atan2(e.x - h.x, e.z - h.z));
    for (const p of a) for (const q of a) window.__flank = Math.max(window.__flank, Math.abs(Math.atan2(Math.sin(p - q), Math.cos(p - q))));
    requestAnimationFrame(f); }; f(); });
  await until('four attacks from the patrol', () => window.__iso.enemies.enemies.reduce((s, e) => s + e.attacks, 0) >= 4);
  await gameWait(4);
  { const g = await E(), who = g.enemies.filter(e => e.attacks > 0).length, flank = await page.evaluate(() => window.__flank);
    await shot('enemy-patrol', ...(await page.evaluate(() => window.__iso.px.hero)));
    if (g.peakAttacking > 2) fail(`${g.peakAttacking} attacking at once (the tokens allow 2)`);
    if (g.tokens.peak.melee > 2) fail(`${g.tokens.peak.melee} melee tokens out at once`);
    if (who < 2) fail(`only ${who} of the patrol attacked`);
    if (flank < 2) fail(`they never spread round him (widest angle between two ${flank.toFixed(2)} rad)`);
    ok(`at most ${g.peakAttacking} attacking at once, ${who} of 4 took turns (${g.enemies.map(e => e.attacks).join('/')} attacks), flanked up to ${flank.toFixed(2)} rad apart; the hero took ${g.stats.taken}`); }
  await page.selectOption('#o-group', 'samurai');
}
