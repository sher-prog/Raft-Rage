import { createGameServer } from './app.ts';
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import type { Config } from '../shared.ts';
export { Simulation } from '../game/simulation.ts';
export { createGameServer } from './app.ts';
// Kept explicit so importing this module in tests never starts a listener.
if(process.argv[1] && import.meta.url===pathToFileURL(process.argv[1]).href){
  const config:Config=JSON.parse(readFileSync(new URL('../../balance_constants.json',import.meta.url),'utf8'));
  const game=createGameServer(config);
  const port=await game.listen();
  const version=JSON.parse(readFileSync(new URL('../../package.json',import.meta.url),'utf8')).version;
  console.log(`Raft Rage checkpoint ${version} listening on ${port}`);
  const stop=()=>{void game.close().then(()=>process.exit(0));};
  process.on('SIGTERM',stop);process.on('SIGINT',stop);
}
