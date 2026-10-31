import { readFileSync } from 'node:fs';
import { performance } from 'node:perf_hooks';
import { WebSocket } from 'ws';
import { createGameServer } from '../dist/server/index.js';
const original=JSON.parse(readFileSync(new URL('../balance_constants.json',import.meta.url)));
export async function setup(t,overrides){
  const config=structuredClone(original);overrides?.(config);
  const game=createGameServer(config);const port=await game.listen(0);const base=`http://127.0.0.1:${port}`;
  t.after(()=>game.close());
  async function client(bootId,options={}){
    const ws=new WebSocket(`${base.replace('http','ws')}/ws`,{origin:base,...options});
    const messages=[];ws.on('message',data=>messages.push(JSON.parse(data)));
    const wait=async(predicate,timeout=2000)=>{
      const start=performance.now();
      while(performance.now()-start<timeout){const index=messages.findIndex(predicate);if(index>=0)return messages.splice(index,1)[0];await new Promise(r=>setTimeout(r,5));}
      throw new Error('Expected protocol response was not received before timeout');
    };
    const send=m=>ws.send(JSON.stringify(m));
    const hello=await wait(m=>m.type==='hello');send({type:'hello',protocol:config.network.protocol_version,bootId:bootId??hello.bootId});
    if(!bootId||bootId===hello.bootId)await wait(m=>m.type==='connected');
    return {ws,wait,send,messages,hello,create:async(name,solo=false)=>{send({type:'create',name,solo});return wait(m=>m.type==='joined');},join:async(code,name,extra={})=>{send({type:'join',code,name,...extra});return wait(m=>m.type==='joined');}};
  }
  return {game,base,client};
}
