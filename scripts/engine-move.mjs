// node scripts/engine-move.mjs <from> <to> [<from> <to> ...]: moves game files into the engine (the engine/ submodule; commit there too) (docs/engine-extract.md)
// with git mv, so each keeps its history, and rewrites every import of them in the game (src/, scripts/, prototypes-src/)
// to the package's name ('ronin-engine/<to>'). A path ending in / moves a whole folder. Inside the package imports stay
// relative; a moved file that still imports the game is refused (the engine never imports a game), and nothing moves.
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, dirname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url))), PKG = join(ROOT, 'engine'), SRC = join(PKG, 'src'), NAME = 'ronin-engine';
const walk = d => readdirSync(d).flatMap(f => { const p = join(d, f); return statSync(p).isDirectory() ? (f === 'node_modules' || f === 'dist' ? [] : walk(p)) : /\.m?js$/.test(f) ? [p] : []; });
const args = process.argv.slice(2); if (!args.length || args.length % 2) { console.error('usage: engine-move.mjs <from> <to> ...'); process.exit(2); }

// the moves, file by file: absolute old path → absolute new path
const moves = new Map();
for (let i = 0; i < args.length; i += 2) { const from = resolve(ROOT, args[i]), to = join(SRC, args[i + 1]);
  if (args[i].endsWith('/')) for (const f of walk(from)) moves.set(f, join(to, relative(from, f)));
  else moves.set(from, to); }
for (const f of moves.keys()) if (!existsSync(f)) { console.error('missing ' + f); process.exit(2); }
const spec = abs => NAME + '/' + relative(SRC, abs).split('\\').join('/');
const IMP = /(\bfrom\s*|\bimport\s*\(?\s*)(['"])([^'"]+)\2/g;
const target = (file, s) => s.startsWith('.') ? resolve(dirname(file), s) : s.startsWith(NAME + '/') ? join(SRC, s.slice(NAME.length + 1)) : null;

// the engine must not import the game: every relative import of a moved file must land in the package
const bad = [];
for (const [from, to] of moves) for (const m of readFileSync(from, 'utf8').matchAll(IMP)) { const t = target(from, m[3]); if (!t) continue;
  if (!moves.has(t) && !t.startsWith(SRC)) bad.push(`${relative(ROOT, from)} imports ${m[3]}`); }
if (bad.length) { console.error('refused: the engine would import the game\n  ' + bad.join('\n  ')); process.exit(1); }

// rewrite: moved files' own imports (relative to their new place), then every game file that imports a moved one
const rewrite = (file, at) => { const s = readFileSync(file, 'utf8');
  const out = s.replace(IMP, (all, pre, q, p) => { const t = target(file, p); if (!t) return all;
    if (moves.has(t)) { const n = moves.get(t); if (at.startsWith(SRC)) { let r = relative(dirname(at), n).split('\\').join('/'); if (!r.startsWith('.')) r = './' + r; return pre + q + r + q; } return pre + q + spec(n) + q; }
    if (!at.startsWith(SRC)) return all;                    // a game file's other imports stay as written
    if (!t.startsWith(SRC)) throw new Error(`${file}: ${p}`);
    let r = relative(dirname(at), t).split('\\').join('/'); if (!r.startsWith('.')) r = './' + r; return pre + q + r + q; });
  if (out !== s) writeFileSync(file, out); return out !== s; };
let n = 0;
for (const f of [...walk(join(ROOT, 'src')), ...walk(join(ROOT, 'scripts')), ...(existsSync(join(ROOT, 'prototypes-src')) ? walk(join(ROOT, 'prototypes-src')) : []), ...walk(SRC)])
  if (!moves.has(f) && rewrite(f, f)) n++;
for (const [from, to] of moves) { rewrite(from, to); execFileSync('mkdir', ['-p', dirname(to)]); execFileSync('git', ['mv', from, to], { cwd: ROOT }); }
// the record of what moved where, for scripts that name game files by path (golden.mjs)
const REC = join(ROOT, 'scripts/engine-moved.json'), rec = existsSync(REC) ? JSON.parse(readFileSync(REC, 'utf8')) : {};
for (const [from, to] of moves) rec[relative(join(ROOT, 'src'), from).split('\\').join('/')] = spec(to);
writeFileSync(REC, JSON.stringify(rec, null, 1) + '\n');
console.log(`moved ${moves.size} file(s) into ${NAME}, rewrote imports in ${n} game file(s)`);
