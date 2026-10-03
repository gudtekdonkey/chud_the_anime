// node test/boundary.mjs: the engine's one structural rule. Outside render/, nothing imports three.js or touches the
// page (document, window, localStorage), so the core runs in Node, the browser and on a server. Input listens only to the
// element a game hands it; the world's saves reach storage only in sim/save.js. Nothing imports outside the package.
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const SRC = resolve(fileURLToPath(new URL('../src', import.meta.url)));
const walk = d => readdirSync(d).flatMap(f => { const p = join(d, f); return statSync(p).isDirectory() ? walk(p) : p.endsWith('.js') ? [p] : []; });
const PAGE = /\b(document|window|localStorage|indexedDB|requestAnimationFrame)\b/;
const ALLOW_PAGE = new Set(['sim/save.js']);   // the storage adapter
const bad = [];
for (const f of walk(SRC)) { const rel = relative(SRC, f).split('\\').join('/'), render = rel.startsWith('render/');
  const code = readFileSync(f, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').split('\n').map(l => l.replace(/(^|[^:'"`])\/\/.*$/, '$1'));
  code.forEach((l, i) => {
    for (const m of l.matchAll(/(?:\bfrom\s*|\bimport\s*\(?\s*)['"]([^'"]+)['"]/g)) { const s = m[1];
      if (s === 'three' || s.startsWith('three/')) { if (!render) bad.push(`${rel}:${i + 1} imports three outside render/`); }
      else if (s.startsWith('.')) { if (!resolve(dirname(f), s).startsWith(SRC)) bad.push(`${rel}:${i + 1} imports outside the package: ${s}`); }
      else bad.push(`${rel}:${i + 1} imports a package the engine does not declare: ${s}`); }
    if (!render && !ALLOW_PAGE.has(rel) && PAGE.test(l)) bad.push(`${rel}:${i + 1} touches the page: ${l.trim().slice(0, 90)}`);
  }); }
console.log(bad.length ? 'FAIL the core boundary\n  ' + bad.join('\n  ') : `ok   the core boundary: ${walk(SRC).length} files, no three.js or page outside render/`);
process.exit(bad.length ? 1 : 0);
