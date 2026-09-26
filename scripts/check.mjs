// npm run check: serves the built dist/ with `vite preview`, plays a key sequence in Chromium and asserts the player
// walks through the expected states with no page errors. Screenshots land in test-output/ (gitignored).
// Chromium comes from PLAYWRIGHT_BROWSERS_PATH (preinstalled); this never downloads a browser.
import { chromium } from 'playwright';
import { preview } from 'vite';
import fs from 'node:fs';

let step = '';
function fail(msg) { console.error(`\nFAIL${step ? ` at "${step}"` : ''}: ${msg}`); process.exitCode = 1; throw new Error(msg); }
const OUT = 'test-output';
fs.mkdirSync(OUT, { recursive: true });

// the build must be ONE self-contained page (plus the prototypes copied beside it)
const html = fs.readFileSync('dist/index.html', 'utf8');
const external = [...html.matchAll(/<(?:script|link)[^>]+(?:src|href)="([^"]+)"/g)].map(m => m[1]).filter(u => !u.startsWith('https://fonts.googleapis.com/'));
if (external.length) fail(`dist/index.html loads files it should inline: ${external.join(', ')}`);

const server = await preview({ logLevel: 'silent', preview: { port: 4173, strictPort: false, open: false } });
const base = server.resolvedUrls.local[0];
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1100, height: 900 } });
const errors = [];
page.on('pageerror', e => errors.push(`pageerror: ${e.message}`));
page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errors.push(`console: ${m.text()}`); });
await page.route(/^https?:\/\/(?!localhost|127\.0\.0\.1)/, r => r.abort());   // hermetic: no web fonts

try {
  const proto = await page.request.get(new URL('prototypes/15-counter-stance.html', base).href);
  if (proto.status() !== 200) fail(`prototypes are not served (status ${proto.status()})`);

  await page.goto(new URL('?test', base).href);
  await page.waitForFunction(() => window.__game && window.__game.P);
  // record every state he passes through (and the charged skill's name), once per animation frame
  await page.evaluate(() => { window.__log = [];
    const tick = () => { const { P } = window.__game, s = P.cv ? `${P.state}:${P.cv.name}` : P.state;
      if (window.__log[window.__log.length - 1] !== s) window.__log.push(s); requestAnimationFrame(tick); };
    tick(); });
  await page.locator('#game').click();

  const kb = page.keyboard, sleep = ms => page.waitForTimeout(ms);
  const state = () => page.evaluate(() => window.__game.P.state);
  const until = async (what, fn, arg, timeout = 6000) => {
    try { await page.waitForFunction(fn, arg, { timeout }); }
    catch { fail(`never reached ${what} (state now: ${await state()}, log tail: ${(await page.evaluate(() => window.__log.slice(-8))).join(' > ')})`); } };
  const reach = (re, timeout) => until(re.toString(), r => new RegExp(r).test(window.__game.P.state), re.source, timeout);
  const cv = name => until(`charged skill ${name}`, n => window.__game.P.cv && window.__game.P.cv.name === n, name);
  const FREE = /^(idle|run|idleGlitch|ready\d|runArmed|sheathe)$/;   // states that take a new command
  const shot = name => page.locator('#game').screenshot({ path: `${OUT}/${name}.png` });
  // walk him somewhere with the arrow keys: the vertical leg first, then the horizontal, so the route is predictable round the pillars
  const walkTo = async (x, y, timeout = 10000) => {
    const t0 = Date.now();
    for (const [axis, goal, neg, pos] of [['y', y, 'ArrowUp', 'ArrowDown'], ['x', x, 'ArrowLeft', 'ArrowRight']]) {
      for (;;) { const v = await page.evaluate(a => window.__game.P[a], axis), d = goal - v;
        if (Math.abs(d) <= 2) break;
        if (Date.now() - t0 > timeout) fail(`could not walk to ${x},${y} (${axis} ${v.toFixed(1)})`);
        const k = d < 0 ? neg : pos; await kb.down(k); await sleep(Math.min(120, Math.abs(d) / 78 * 1000)); await kb.up(k); } }
    await reach(FREE); };
  const inv = () => page.evaluate(() => JSON.parse(JSON.stringify(window.__game.INV)));
  const run = async (name, fn) => { step = name; await fn(); console.log(`  ok  ${name}`); };

  await run('move', async () => { await kb.down('d'); await reach(/^run$/); await sleep(300); await shot('01-run'); await kb.up('d'); await reach(/^idle$/); });
  await run('J, J: slash 1 flows into slash 2', async () => {
    await kb.press('j'); await reach(/^slash1$/);
    await until('slash 1 follow-through', () => window.__game.P.t > .18);
    await kb.press('j'); await reach(/^slash2$/); await shot('02-slash2');
    await reach(/^ready\d$/); });
  await run('Shift: ground slide', async () => { await kb.press('Shift'); await reach(/^slide$/); await reach(FREE); });
  await run('Space: jump, fall, land', async () => { await kb.press(' '); await reach(/^jump$/); await reach(/^fall$/); await reach(/^land$/); await reach(FREE); });
  await run('K: glitch teleport, then its cooldown refuses a second press', async () => {
    await kb.press('k'); await reach(/^tele$/); await reach(FREE);
    await until('K on cooldown', () => window.__game.P.cd.tele > 0);
    await kb.press('k'); await until('the refused press', () => window.__game.P.cdDeny.tele > 0);
    if (await state() === 'tele') fail('K teleported again while cooling down'); });
  await run('tap I: glitch double slash', async () => { await kb.press('i'); await reach(/^double$/); await reach(FREE); });
  await run('hold I: Thousand Cuts', async () => {
    await until('the I cooldown to end', () => !(window.__game.P.cd.double > 0), undefined, 4000);
    await kb.down('i'); await until('the I charge', () => window.__game.P.charge > .5); await shot('03-charge');
    await sleep(300); await kb.up('i'); await cv('Thousand Cuts'); await reach(FREE); });
  await run('hold O: Crescent Moon', async () => {
    await kb.down('o'); await reach(/^moonHold$/); await until('the O charge', () => window.__game.P.charge > .9);
    await kb.up('o'); await reach(/^moon$/); await sleep(120); await shot('04-moon'); await reach(FREE); });
  await run('P: Cross Rift', async () => { await kb.press('p'); await cv('Cross Rift'); await sleep(200); await shot('05-rift'); await reach(FREE); });
  await run('N: Mirror Meditation', async () => { await kb.press('n'); await reach(/^meditate$/); await sleep(500); await shot('06-mirrors'); await reach(FREE); });
  await run('U: storm slam', async () => { await kb.press('u'); await reach(/^sweep$/); await reach(FREE, 8000); });
  await run('skill bar: the skills just used are cooling down, K has recovered', async () => {
    const cd = await page.evaluate(() => ({ ...window.__game.P.cd }));
    for (const k of ['moon', 'rift', 'mirror', 'sweep']) if (!(cd[k] > 0)) fail(`${k} is not cooling down (${JSON.stringify(cd)})`);
    if (cd.tele !== 0) fail(`K is still cooling down (${cd.tele})`);
    await shot('08-skill-bar'); });
  await run('walk into coins: they fly to him and mon goes up', async () => {
    const m0 = (await inv()).mon; await walkTo(388, 150); await until('a coin collected', m => window.__game.INV.mon > m, m0); await shot('09-coins'); });
  await run('E at the shrine: brackets, pray, health full', async () => {
    await walkTo(78, 98); await sleep(250); await shot('10-lock-on'); await kb.press('e'); await reach(/^pray$/); await sleep(700); await shot('11-pray'); await reach(FREE);
    const v = await inv(); if (v.hp !== 1) fail(`health is ${v.hp} after praying`); });
  await run('E at the prayed shrine: offer 3 shards for an upgrade, power II', async () => {
    if ((await inv()).shards < 3) fail('not enough shards picked up on the way');
    await kb.press('e'); await reach(/^pray$/); await reach(FREE);
    const v = await inv(); if (v.upgrades !== 1 || v.power !== 2) fail(`upgrades ${v.upgrades}, power ${v.power}`); await shot('11b-power'); });
  await run('E at the grave: take the Grave Nodachi, then cut with it', async () => {
    await walkTo(203, 100); await kb.press('e'); await reach(/^take$/); await sleep(300); await shot('12-new-weapon'); await reach(FREE);
    if ((await inv()).weapon !== 'nodachi') fail('the weapon slot did not swap');
    await kb.press('j'); await reach(/^slash1$/); await reach(FREE); });
  await run('1: throw a static bomb from the quick slot', async () => {
    const n0 = (await inv()).quick[0].n; await kb.press('1'); await reach(/^bomb$/); await sleep(250); await shot('13-bomb'); await reach(FREE);
    if ((await inv()).quick[0].n !== n0 - 1) fail('the bomb count did not drop');
    if (!(await page.evaluate(() => window.__game.S.smoke > 0))) fail('the smoke is not up'); });
  await run('hold E by the fallen: Harvest turns them to EXP', async () => {
    await walkTo(160, 152); await kb.down('e'); await reach(/^harvest$/); await until('EXP', () => window.__game.INV.exp > 10 || window.__game.INV.lv > 1);
    await shot('14-harvest'); await kb.up('e'); await reach(FREE); });
  await run('power III (the test picker): the Crescent Moon comes with its twin and the slam with its pillars', async () => {
    await page.selectOption('#power', '3'); await until('power III', () => window.__game.INV.power === 3);
    await until('O ready', () => !(window.__game.P.cd.moon > 0), null, 12000);
    await kb.down('o'); await reach(/^moonHold$/); await until('the O charge', () => window.__game.P.charge > .9);
    await kb.up('o'); await reach(/^moon$/); await sleep(200); await shot('15-power-III-moon'); await reach(FREE);
    await until('U ready', () => !(window.__game.P.cd.sweep > 0), null, 10000);
    await kb.press('u'); await reach(/^sweep$/); await until('the slam', () => window.__game.P.t > 1.9); await shot('16-power-III-slam'); await reach(FREE, 8000);
    await page.selectOption('#power', '0'); });
  await run('C: sit, then a key to stand', async () => {
    await kb.press('c'); await reach(/^sitDown$/); await reach(/^sit$/); await shot('07-sit');
    await kb.down('w'); await reach(/^standUp$/); await kb.up('w'); await reach(/^(idle|run)$/); });
  await run('X: die and come back', async () => { await kb.press('x'); await reach(/^death$/); await reach(/^idleGlitch$/, 5000); });
  step = '';

  const log = await page.evaluate(() => window.__log);
  fs.writeFileSync(`${OUT}/states.txt`, log.join('\n') + '\n');
  if (errors.length) fail(`page errors:\n  ${errors.join('\n  ')}`);
  console.log(`\ncheck passed: ${log.length} state changes, no page errors. Screenshots and the state log are in ${OUT}/.`);
} catch (e) {
  if (!process.exitCode) { console.error(e); process.exitCode = 1; }
  if (errors.length) console.error(`page errors:\n  ${errors.join('\n  ')}`);
  await page.screenshot({ path: `${OUT}/failure.png`, fullPage: true }).catch(() => {});
} finally {
  await browser.close();
  await new Promise(r => server.httpServer.close(r));
}
