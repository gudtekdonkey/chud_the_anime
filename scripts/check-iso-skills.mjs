// The skills' steps of npm run check:iso (scripts/check-iso.mjs calls skillSteps once the core loop has passed): each
// skill cast on the samurai through its own key, its hit beats landing, its effects on screen, its cooldown refusing
// a second press; Storm Chain, Storm breath, the sit, the kata, the Seiza shield taking a real cut, the Lotus by the tōrō;
// the skills in every style and with the pixel look; power III's versions. Every wait is on the game's clock or state.
export async function skillSteps({ page, G, until, gameWait, settle, walkTo, shot, seen, forget, ok, fail, errorsCheck, base, setStep }) {
  const SK = () => page.evaluate(() => window.__iso.skills);
  const marked = k => until(`the skills' mark ${k}`, k => window.__iso.skills.marks.includes(k), k);   // a moment, however brief, the skills noted
  // a log entry (or one starting so) written after entry number n0
  const logged = (what, n0, timeout) => until(`"${what}" in the skills' log`, ([w, n0]) => { const s = window.__iso.skills, k = Math.min(s.log.length, s.n - n0); return k > 0 && s.log.slice(-k).some(e => e.startsWith(w)); }, [what, n0], timeout);
  const since = async n0 => { const s = await SK(), k = Math.min(s.log.length, s.n - n0); return k > 0 ? s.log.slice(-k) : []; };
  const count = (log, w) => log.filter(e => e.startsWith(w)).length;
  const cool = k => until(`${k} cooled down`, k => !(window.__iso.skills.cd[k] > 0), k, 90000);
  const standing = () => until('the samurai standing', () => !window.__iso.foe.dead, undefined, 90000);
  const near = async (d = 22) => { await settle(); const f = (await G()).foe; await walkTo(f.x - d, f.z, 6); await settle(); };
  const hold = async (keys, sec) => { for (const k of keys) await page.keyboard.down(k); await gameWait(sec); for (const k of keys) await page.keyboard.up(k); };
  const landJ = async () => { await until('the samurai up', () => !window.__iso.foe.dead && window.__iso.foe.hp > 0, undefined, 90000); await near(); const n = (await G()).log.length; await page.keyboard.press('KeyJ'); await until('a J landing', n => window.__iso.STATS.log.length > n, n); await gameWait(.4); };

  // ---- I tapped: the double slash; a second press while it cools down is refused
  setStep('skills: I, the double slash'); await standing(); await near(); await forget();
  { const n0 = (await SK()).n; await page.keyboard.press('KeyI'); await logged('double:cast', n0); const cd = (await SK()).cd.double; if (!(cd > 0)) fail('no cooldown on I');
    await logged('double:click', n0); const c0 = (await SK()).casts.double; await page.keyboard.press('KeyI'); await gameWait(.25);   // still cooling down: refused
    if ((await SK()).casts.double !== c0) fail('I cast again while cooling down');
    await shot('skill-I', ['hero', 'foe']); const log = await since(n0); if (count(log, 'd:hit') < 2) fail(`the double slash landed ${count(log, 'd:hit')} cuts: ${log.join(' ')}`);
    ok(`${log.join(' ')}; a ${cd.toFixed(1)} s cooldown refused the second press`); }
  { const n0 = (await SK()).n; await cool('double'); await standing(); await near(); await page.keyboard.press('KeyI'); await logged('d:hit', n0); await shot('skill-I-cut', ['hero', 'foe']); await logged('double:click', n0); }

  // ---- I held: Thousand Cuts (the charge, the vanish, the cuts from every side, the click)
  setStep('skills: I held, Thousand Cuts'); await cool('double'); await standing(); await near(); await forget();
  { const n0 = (await SK()).n; await page.keyboard.down('KeyI'); await until('the charge', () => window.__iso.hero.state === 'skCharge'); await gameWait(.95); await page.keyboard.up('KeyI');
    await logged('tc:release', n0); await gameWait(.12); await shot('skill-tc', ['hero', 'foe']); await logged('tc:click', n0);
    const log = await since(n0); if (!count(log, 'tc:hit')) fail(`Thousand Cuts landed nothing: ${log.join(' ')}`); await marked('vanish'); ok(log.join(' ')); }

  // ---- P: Cross Rift, charged half a second: the X, the room drawn in, the detonation on the click
  setStep('skills: P, Cross Rift'); await cool('rift'); await standing(); await near(40); await forget();
  { const n0 = (await SK()).n; await hold(['KeyP'], .5); await logged('rift:release', n0); await gameWait(.25); await shot('skill-rift', ['hero', 'foe']); await logged('rift:detonate', n0);
    const log = await since(n0); if (!count(log, 'cr:hit') && !count(log, 'crB:hit')) fail(`the rift caught nobody: ${log.join(' ')}`); ok(log.join(' ')); }

  // ---- O held: Crescent Moon: the sweep, the hit, the shatter
  setStep('skills: O, Crescent Moon'); await standing(); await near(); await forget();
  { const n0 = (await SK()).n; await hold(['KeyO'], .6); await logged('moon:unleash', n0); await gameWait(.12); await shot('skill-moon', ['hero', 'foe']); await logged('moon:shatter', n0);
    const log = await since(n0); if (!count(log, 'cm:hit')) fail(`the moon cut nobody: ${log.join(' ')}`); ok(log.join(' ')); }

  // ---- N: Mirror Meditation: three images of his own model step out and cut
  setStep('skills: N, Mirror Meditation'); await standing(); await near(36); await forget();
  { const n0 = (await SK()).n; await page.keyboard.press('KeyN'); await seen('images'); await shot('skill-mirror', ['hero', 'foe']); await logged('mi:hit', n0); await gameWait(1.6);
    const log = await since(n0); if (count(log, 'mirror:image') < 3) fail(`${count(log, 'mirror:image')} images stepped out`); ok(`${count(log, 'mirror:image')} images, cuts landed: ${count(log, 'mi:hit')}`); }

  // ---- U: Sky Drop: up out of sight of the floor, down blade first, the crater
  setStep('skills: U, Sky Drop'); await standing(); await near(40); await forget();
  { const n0 = (await SK()).n; await page.keyboard.press('KeyU'); await until('the top of the blink', () => window.__iso.skills.ct > .22 && window.__iso.hero.state === 'skDrop');
    await shot('skill-drop-up', ['hero']); await logged('sweep:slam', n0); await shot('skill-drop-crater', ['hero', 'foe']); await gameWait(.5);
    const log = await since(n0); await marked('aloft'); if (!count(log, 'sw:hit')) fail(`the crater caught nobody: ${log.join(' ')}`); ok(log.join(' ')); }

  // ---- U on a kill: the full-screen close-up (J brings him low first)
  setStep('skills: Sky Drop on a kill, the close-up'); await standing(); await cool('sweep'); await forget();
  { while ((await G()).foe.hp > 2) await landJ(); await near(40); const n0 = (await SK()).n; await page.keyboard.press('KeyU');
    await seen('cine'); await logged('sweep:cine', n0); await until('the samurai dying', () => window.__iso.foe.dead); ok('the close-up played and he died'); }

  // ---- Storm Chain: landed hits fill the meter; full, the storm; a hit in the storm throws the lightning
  setStep('skills: Storm Chain'); await until('a calm meter', () => !(window.__iso.skills.storm > 0), undefined, 90000); await standing();
  { for (let i = 0; i < 20 && !((await SK()).storm > 0); i++) await landJ(); if (!((await SK()).storm > 0)) fail('the meter never woke the storm');
    const n0 = (await SK()).n; await landJ(); await logged('chain', n0); ok(`storm ${(await SK()).storm.toFixed(1)} s left`); }

  // ---- C in the storm: Storm breath (the rest of the storm at once, a heal, the samurai thrown)
  setStep('skills: C in the storm, Storm breath'); { await near(30); const s0 = await SK(); if (!(s0.storm > 0)) fail('the storm ended before C');
    const n0 = s0.n; await page.keyboard.press('KeyC'); await until('the in-breath', () => window.__iso.skills.ct > 1.2 && window.__iso.hero.state === 'skStorm'); await shot('skill-sbreath', ['hero', 'foe']);
    await logged('breath:exhale', n0); const s = await SK(), log = await since(n0); if (!(s.hp > s0.hp) && s0.hp < 1) fail(`no heal: ${s0.hp} → ${s.hp}`); if (s.storm > 0) fail('the storm is still running');
    if (!count(log, 'sbreath:thrown')) fail(`nobody thrown: ${log.join(' ')}`); ok(`health ${s0.hp.toFixed(2)} → ${s.hp.toFixed(2)}`); }

  // ---- C tapped: he sits, his back to the camera; a direction gets him up
  setStep('skills: C tapped, the sit'); await settle(); await gameWait(1);
  { await page.keyboard.press('KeyC'); await until('the sit', () => window.__iso.hero.state === 'skSit'); await gameWait(.5); const h = (await G()).hero;
    if (Math.abs(Math.abs(h.yaw) - Math.PI) > .05) fail(`sitting facing ${h.yaw.toFixed(2)}, not his back to the camera`); await shot('skill-sit', ['hero']);
    await hold(['ArrowLeft'], .25); await until('standing up', () => !['skSit', 'skStand'].includes(window.__iso.hero.state)); ok(); }

  // ---- C held: the kata (needs a notch of Qi: J fills it), an out-breath heals, letting go ends it
  setStep('skills: C held, the kata'); await standing();
  { for (let i = 0; i < 8 && (await SK()).qi < .34; i++) await landJ(); await settle(); await gameWait(.3);
    const s0 = await SK(), n0 = s0.n; await page.keyboard.down('KeyC'); await logged('breath:kata', n0); await until('the in-breath', () => window.__iso.skills.ct > 1.05); await shot('skill-kata', ['hero']);
    await logged('breath:out', n0); await page.keyboard.up('KeyC'); await until('the kata over (let go, or the meter spent)', () => window.__iso.hero.state !== 'skKata'); const s = await SK();
    if (!(s.heals > s0.heals)) fail('the out-breath did not heal'); if (!(s.qi < s0.qi)) fail('the out-breath spent no Qi'); ok(`health ${s0.hp.toFixed(2)} → ${s.hp.toFixed(2)}, Qi ${s0.qi.toFixed(2)} → ${s.qi.toFixed(2)}`); }

  // ---- every style draws the skills its own way: a double slash in each
  setStep('skills: in every style');
  for (let i = 0; i < 4; i++) { await cool('double'); await standing(); await near(); await page.keyboard.press('KeyV'); const st = await page.evaluate(() => window.__iso.style);
    const n0 = (await SK()).n; await page.keyboard.press('KeyI'); await logged('d:hit', n0); await shot(`skill-style-${st.replace(/\W+/g, '-').toLowerCase()}`, ['hero', 'foe']); await logged('double:click', n0); }
  ok(`back to ${await page.evaluate(() => window.__iso.style)}`);

  // ---- the pixel look: the images are the pixel drawing too; Sky Drop through the same seam
  setStep('skills: the pixel look'); await page.keyboard.press('KeyM'); await until('the pixel look', () => window.__iso.look === 'pixel');
  { await cool('mirror'); await standing(); await near(36); await forget(); let n0 = (await SK()).n; await page.keyboard.press('KeyN'); await seen('images'); await shot('skill-pixel-mirror', ['hero', 'foe']); await logged('mi:hit', n0);
    await cool('sweep'); await standing(); await near(40); n0 = (await SK()).n; await page.keyboard.press('KeyU'); await logged('sweep:slam', n0); await shot('skill-pixel-drop', ['hero', 'foe']); ok(); }
  await page.keyboard.press('KeyM'); await until('the 3D look', () => window.__iso.look === '3d');

  // ---- power III: the moon's twin, the rift's echo
  setStep('skills: power III'); await page.selectOption('#o-power', '3'); await page.locator('canvas').focus();
  { await cool('moon'); await standing(); await near(); let n0 = (await SK()).n; await hold(['KeyO'], .5); await logged('moon:twin', n0); await shot('skill-moon-III', ['hero', 'foe']);
    await cool('rift'); await standing(); await near(40); n0 = (await SK()).n; await hold(['KeyP'], .4); await logged('rift:echo', n0); ok('the twin moon and the echo'); }
  await page.selectOption('#o-power', '1'); await page.locator('canvas').focus();
  errorsCheck();

  // ---- the Seiza shield against a real cut: the samurai off his leash (no &calm), a full meter. The setup is waited for,
  // never the outcome steered: he only cuts from his guard with the hero inside his reach (48 rig px, 24 world units), and
  // he stops closing in at his hold distance (76 rig px), so the hero kneels only once the samurai stands in guard within
  // 20 units of him; the cut then comes inside the dome's window (0.55–2.95 s) unless it was already on its way, and a
  // try whose kneel is broken by that cut (or that spent the meter) starts again on a fresh page, its meter full
  setStep('skills: Seiza, the shield');
  { let absorbed = 0, tries = '';
    for (let i = 0; i < 6 && !absorbed; i++) {
      await page.goto(new URL('?iso&test&solo&combo=free&tick=8&qi=1&foes=1', base).href);
      await page.waitForFunction(() => window.__iso && window.__iso.ready && window.__iso.t > .2, undefined, { timeout: 60000 }); await page.evaluate(() => document.querySelector('canvas').focus());   // a click would be a click to move (port.js)
      for (let k = 0; k < 12; k++) { const g = await G(); if (g.foe.state === 'guard' && Math.hypot(g.foe.x - g.hero.x, g.foe.z - g.hero.z) < 20 && ['idle', 'guard'].includes(g.hero.state)) break;
        await walkTo(g.foe.x - 14, g.foe.z, 3); await gameWait(.2); }
      await until('ready to kneel, in his reach', () => { const h = window.__iso.hero, f = window.__iso.foe; return ['idle', 'guard'].includes(h.state) && f.state === 'guard' && Math.hypot(f.x - h.x, f.z - h.z) < 20; });
      const n0 = (await SK()).n;
      await page.keyboard.down('KeyC'); await page.keyboard.down('ArrowDown');   // together: the hold reads ↓ when it counts (0.2 s)
      await until('the kneel or the end of the try', n0 => { const s = window.__iso.skills, k = Math.min(s.log.length, s.n - n0), L = s.log.slice(-k);
        return L.includes('foe:blocked') || (L.includes('breath:seiza') && window.__iso.hero.state !== 'skSeiza') || (!L.includes('breath:seiza') && (window.__iso.hero.state === 'recoil' || L.some(e => /^breath:(kata|sit|fizzle|lotus)/.test(e)))); }, n0, 60000);
      const log = await since(n0); tries += `${i + 1}: ${log.join(' ') || '-'}; `;
      if (log.includes('foe:blocked')) { absorbed = 1; await shot('skill-seiza', ['hero', 'foe']); }
      await page.keyboard.up('ArrowDown'); await page.keyboard.up('KeyC'); }
    if (!absorbed) fail(`the samurai never cut into the dome (${tries})`); ok(`the dome took the cut (${(await SK()).absorbed}); ${tries}`); }

  // ---- Lotus by the tōrō: one long breath, the meter into health
  setStep('skills: Lotus by the tōrō'); await page.goto(new URL('?iso&test&solo&combo=free&calm&tick=8&qi=1&hp=.3&foes=1', base).href);
  await page.waitForFunction(() => window.__iso && window.__iso.ready && window.__iso.t > .2, undefined, { timeout: 60000 }); await page.evaluate(() => document.querySelector('canvas').focus());   // a click would be a click to move (port.js)
  { await walkTo(204, 152, 6); await settle(); const n0 = (await SK()).n; await page.keyboard.down('KeyC'); await logged('breath:lotus', n0); await until('aloft', () => window.__iso.skills.ct > 1.6);
    await shot('skill-lotus', ['hero']); await until('the lotus ending', () => window.__iso.hero.state !== 'skLotus', undefined, 60000); await page.keyboard.up('KeyC'); const s = await SK();
    if (s.hp < .95) fail(`the lotus healed to ${s.hp.toFixed(2)}`); if (s.qi > .02) fail(`the lotus left Qi ${s.qi.toFixed(2)}`); ok(`health .30 → ${s.hp.toFixed(2)}, the meter spent`); }
  errorsCheck();
}
