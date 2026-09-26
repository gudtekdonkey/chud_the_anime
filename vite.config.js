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

export default defineConfig({
  base: './',            // relative paths, so the build runs from itch.io, GitHub Pages or a bare file
  publicDir: false,
  plugins: [viteSingleFile(), copyPrototypes()],
  build: { outDir: 'dist', emptyOutDir: true },
});
