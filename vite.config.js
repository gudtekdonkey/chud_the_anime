import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';
import fs from 'node:fs';
import path from 'node:path';

// prototypes/ stays where it is: the dev server serves it from the root, and the build copies it next to the game,
// so /prototypes/15-counter-stance.html works in both
const copyPrototypes = () => ({
  name: 'copy-prototypes',
  apply: 'build',
  // after the bundle is written, so the single-file plugin never mistakes a prototype for the game page
  writeBundle(opts) { fs.cpSync('prototypes', path.join(opts.dir, 'prototypes'), { recursive: true }); },
});

// three.js (the ?iso slice only) comes from node_modules; a checkout whose node_modules is shared and lacks it can point
// ISO_DEPS at another install (`npm install --prefix $ISO_DEPS three@<the pinned version>`)
const isoDeps = process.env.ISO_DEPS && !fs.existsSync('node_modules/three') ? path.resolve(process.env.ISO_DEPS, 'node_modules/three/build/three.module.js') : null;

export default defineConfig({
  base: './',            // relative paths, so the build runs from itch.io, GitHub Pages or a bare file
  publicDir: false,
  plugins: [viteSingleFile(), copyPrototypes()],
  resolve: { alias: isoDeps ? { three: isoDeps } : {} },
  server: { fs: { allow: ['.', ...(isoDeps ? [path.dirname(isoDeps)] : [])] } },
  build: { outDir: 'dist', emptyOutDir: true },
});
