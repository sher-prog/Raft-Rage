import { build } from 'esbuild';
import { mkdir, copyFile, rm } from 'node:fs/promises';
await rm('dist', { recursive: true, force: true });
await mkdir('dist/client', { recursive: true });
await Promise.all([
  build({entryPoints:['src/server/index.ts'], outfile:'dist/server/index.js', bundle:true, platform:'node', target:'node24', format:'esm', packages:'external', sourcemap:true}),
  build({entryPoints:['src/client/main.ts'], outfile:'dist/client/main.js', bundle:true, platform:'browser', format:'esm', target:['safari16','chrome110','firefox115'], sourcemap:true}),
  copyFile('src/client/index.html','dist/client/index.html'),
  copyFile('src/client/style.css','dist/client/style.css'),
  copyFile('balance_constants.json','dist/client/balance_constants.json')
]);
