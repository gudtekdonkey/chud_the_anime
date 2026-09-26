// node scripts/proto-bundle.mjs <page.html> <entry.js> <out.html>
// A prototype must be one standalone page (CLAUDE.md), but pages built on the simulation core import src/sim/. This bundles the entry
// (and everything it imports) into one script and puts it where the page has <!-- BUNDLE -->. Keep the sources in prototypes-src/.
import { rolldown } from 'rolldown';
import fs from 'node:fs';
const [page, entry, out] = process.argv.slice(2);
if (!page || !entry || !out) { console.error('usage: node scripts/proto-bundle.mjs <page.html> <entry.js> <out.html>'); process.exit(1); }
const b = await rolldown({ input: entry, logLevel: 'warn' });
const { output } = await b.generate({ format: 'iife' });
const html = fs.readFileSync(page, 'utf8');
if (!html.includes('<!-- BUNDLE -->')) { console.error(`${page} has no <!-- BUNDLE --> marker`); process.exit(1); }
fs.writeFileSync(out, html.replace('<!-- BUNDLE -->', () => `<script>\n${output[0].code.replace(/<\/script/gi, '<\\/script')}\n</script>`));
console.log(`${out}: ${(fs.statSync(out).size / 1024).toFixed(0)} KB`);
