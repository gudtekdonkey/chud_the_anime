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
  const run = async (name, fn) => { step = name; await fn(); console.log(`  ok  ${name}`); };

  await run('move', async () => { await kb.down('d'); await reach(/^run$/); await sleep(300); await shot('01-run'); await kb.up('d'); await reach(/^idle$/); });
  await run('J, J: slash 1 flows into slash 2', async () => {
    await kb.press('j'); await reach(/^slash1$/);
    await until('slash 1 follow-through', () => window.__game.P.t > .18);
    await kb.press('j'); await reach(/^slash2$/); await shot('02-slash2');
    await reach(/^ready\d$/); });
  await run('Shift: ground slide', async () => { await kb.press('Shift'); await reach(/^slide$/); await reach(FREE); });
  await run('Space: jump, fall, land', async () => { await kb.press(' '); await reach(/^jump$/); await reach(/^fall$/); await reach(/^land$/); await reach(FREE); });
  await run('K: glitch teleport', async () => { await kb.press('k'); await reach(/^tele$/); await reach(FREE); });
  await run('tap I: glitch double slash', async () => { await kb.press('i'); await reach(/^double$/); await reach(FREE); });
  await run('hold I: Thousand Cuts', async () => {
    await kb.down('i'); await until('the I charge', () => window.__game.P.charge > .5); await shot('03-charge');
    await sleep(300); await kb.up('i'); await cv('Thousand Cuts'); await reach(FREE); });
  await run('hold O: Crescent Moon', async () => {
    await kb.down('o'); await reach(/^moonHold$/); await until('the O charge', () => window.__game.P.charge > .9);
    await kb.up('o'); await reach(/^moon$/); await sleep(120); await shot('04-moon'); await reach(FREE); });
  await run('P: Cross Rift', async () => { await kb.press('p'); await cv('Cross Rift'); await sleep(200); await shot('05-rift'); await reach(FREE); });
  await run('N: Mirror Meditation', async () => { await kb.press('n'); await reach(/^meditate$/); await sleep(500); await shot('06-mirrors'); await reach(FREE); });
  await run('U: storm slam', async () => { await kb.press('u'); await reach(/^sweep$/); await reach(FREE, 8000); });
  await run('C: sit, then a key to stand', async () => {
    await kb.press('c'); await reach(/^sitDown$/); await reach(/^sit$/); await shot('07-sit');
    await kb.down('w'); await reach(/^standUp$/); await kb.up('w'); await reach(/^(idle|run)$/); });
  await run('every weapon (the picker) slashes, stands in a stance and sheathes', async () => {
    for (const id of ['yari', 'nodachi', 'tanto', 'katana']) {
      await page.selectOption('#weapon', id); await until(`weapon ${id}`, w => window.__game.P.weapon === w, id);
      await kb.press('j'); await reach(/^slash1$/); await sleep(200); await shot(`08-${id}-slash`);
      await reach(/^ready\d$/); await reach(/^idle$/, 5000); } });
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
