import { build } from 'esbuild';
import { brotliCompressSync,gzipSync } from 'node:zlib';
import { mkdir, copyFile, rm,readFile,writeFile } from 'node:fs/promises';
await rm('dist', { recursive: true, force: true });
await mkdir('dist/client', { recursive: true });
const version=JSON.parse(await readFile('package.json','utf8')).version;
await Promise.all([
  build({entryPoints:['src/server/index.ts'], outfile:'dist/server/index.js', bundle:true, platform:'node', target:'node24', format:'esm', packages:'external', sourcemap:true}),
  build({entryPoints:['src/client/main.ts'], outfile:'dist/client/main.js', bundle:true, platform:'browser', format:'esm', minify:true, define:{__BUILD_VERSION__:JSON.stringify(version)}, target:['safari16','chrome110','firefox115'], sourcemap:true}),
  copyFile('src/client/index.html','dist/client/index.html'),
  copyFile('src/client/style.css','dist/client/style.css'),
  copyFile('balance_constants.json','dist/client/balance_constants.json')
]);

for(const name of ['index.html','main.js','style.css','balance_constants.json']){const data=await readFile('dist/client/'+name);await Promise.all([writeFile('dist/client/'+name+'.br',brotliCompressSync(data)),writeFile('dist/client/'+name+'.gz',gzipSync(data))]);}
