// builds prototypes/36-port-true-left.html: this page and the game modules it imports, bundled into one file
import { build } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';
import fs from 'node:fs';
const out = 'test-output/proto36';
await build({ root: 'scripts/proto36', base: './', publicDir: false, logLevel: 'warn', plugins: [viteSingleFile()],
  build: { outDir: '../../' + out, emptyOutDir: true, rollupOptions: { input: 'scripts/proto36/index.html' } } });
fs.copyFileSync(out + '/index.html', 'prototypes/36-port-true-left.html');
console.log('prototypes/36-port-true-left.html');
