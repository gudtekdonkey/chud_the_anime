// builds prototypes/47-gear-catalogue.html: the gear catalogue and the slice modules it imports (three.js included),
// bundled into one file:   node scripts/proto47/build.mjs
import { build } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';
import fs from 'node:fs';
const out = 'test-output/proto47';
await build({ root: 'scripts/proto47', base: './', publicDir: false, logLevel: 'warn', plugins: [viteSingleFile()],
  build: { outDir: '../../' + out, emptyOutDir: true, rollupOptions: { input: 'scripts/proto47/index.html' } } });
// the inlined script goes last, so the charset meta stays inside the first 1024 bytes
const raw = fs.readFileSync(out + '/index.html', 'utf8'), mods = raw.match(/<script type="module"[\s\S]*?<\/script>/g) || [];
const html = mods.reduce((h, m) => h.replace(m, () => ''), raw).replace(/\s*$/, '\n') + mods.join('\n') + '\n';
fs.writeFileSync('prototypes/47-gear-catalogue.html', html);
console.log(`prototypes/47-gear-catalogue.html: ${(html.length / 1024).toFixed(0)} KB`);
