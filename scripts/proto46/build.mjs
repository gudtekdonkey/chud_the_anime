// builds prototypes/46-combo-prompts.html: this page and the game modules it imports, bundled into one file;
// and the same page in artifact form (no document wrapper, <title> and <style> first) for publishing:
//   node scripts/proto46/build.mjs [artifact-out.html]
import { build } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';
import fs from 'node:fs';
const out = 'test-output/proto46';
await build({ root: 'scripts/proto46', base: './', publicDir: false, logLevel: 'warn', plugins: [viteSingleFile()],
  build: { outDir: '../../' + out, emptyOutDir: true, rollupOptions: { input: 'scripts/proto46/index.html' } } });
// the inlined script goes last, so the charset meta stays inside the first 1024 bytes (the arrows must not be mis-decoded)
const raw = fs.readFileSync(out + '/index.html', 'utf8'), mods = raw.match(/<script type="module"[\s\S]*?<\/script>/g) || [];
const html = mods.reduce((h, m) => h.replace(m, () => ''), raw).replace(/\s*$/, '\n') + mods.join('\n') + '\n';
fs.writeFileSync('prototypes/46-combo-prompts.html', html);
console.log(`prototypes/46-combo-prompts.html: ${(html.length / 1024).toFixed(0)} KB`);
const art = process.argv[2];
if (art) {
  const one = re => { const m = html.match(re); if (!m) throw new Error('missing ' + re); return m[0]; };
  const title = one(/<title>[\s\S]*?<\/title>/), style = one(/<style[\s\S]*?<\/style>/), fonts = one(/<link rel="stylesheet" href="https:\/\/fonts[^>]*>/);
  const scripts = html.match(/<script type="module"[\s\S]*?<\/script>/g) || [];
  const head = html.slice(0, html.indexOf('<div class="wrap">'));
  const body = html.slice(html.indexOf('<div class="wrap">')).replace(/<\/body>[\s\S]*$/, '').replace(/<script type="module"[\s\S]*?<\/script>/g, '');
  const headScripts = (head.match(/<script type="module"[\s\S]*?<\/script>/g) || []);
  const all = [...new Set([...headScripts, ...scripts])];
  fs.writeFileSync(art, `${title}\n${style}\n${fonts}\n${body.trim()}\n${all.join('\n')}\n`);
  console.log(`${art}: ${(fs.statSync(art).size / 1024).toFixed(0)} KB`);
}
