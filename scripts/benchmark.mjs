import { createGameServer } from '../dist/server/index.js';
import { WebSocket } from 'ws';
import { readFileSync,writeFileSync } from 'node:fs';
import { performance } from 'node:perf_hooks';
import os from 'node:os';
const config=JSON.parse(readFileSync('balance_constants.json'));
const results=[];
for(const count of [1,8,16]){
  const game=createGameServer(config,{measure:true});const port=await game.listen(0);const origin=`http://127.0.0.1:${port}`;const clients=[];
  const open=()=>new Promise((resolve,reject)=>{const ws=new WebSocket(`ws://127.0.0.1:${port}/ws`,{origin});ws.on('error',reject);ws.on('message',data=>{const m=JSON.parse(data);if(m.type==='hello')ws.send(JSON.stringify({type:'hello',protocol:1,bootId:m.bootId}));if(m.type==='connected')resolve(ws);});});
  const join=(ws,message)=>new Promise(resolve=>{const listener=data=>{const m=JSON.parse(data);if(m.type==='joined'){ws.off('message',listener);resolve(m.code);}};ws.on('message',listener);ws.send(JSON.stringify(message));});
  for(let i=0;i<count;i++){const host=await open();clients.push(host);const code=await join(host,{type:'create',name:'Player0'});for(let p=1;p<4;p++){const ws=await open();clients.push(ws);await join(ws,{type:'join',code,name:`Player${p}`});}}
  const start=performance.now(),cpu=process.cpuUsage(),before=game.metrics();
  const timer=setInterval(()=>{for(const ws of clients)ws.send(JSON.stringify({type:'ping',clientTime:Date.now()}));},config.network.clock_sync_interval_s*1000);
  await new Promise(r=>setTimeout(r,6000));clearInterval(timer);
  const elapsedMs=performance.now()-start,used=process.cpuUsage(cpu),after=game.metrics();
  results.push({rooms:count,clients:clients.length,elapsedMs,cpuMs:(used.user+used.system)/1000,cpuPercentOneCore:(used.user+used.system)/1000/elapsedMs*100,eventLoopMeanMs:after.eventLoopMeanMs,eventLoopMaxMs:after.eventLoopMaxMs,applicationBytesOutPerSecond:(after.bytesOut-before.bytesOut)/(elapsedMs/1000),applicationBytesInPerSecond:(after.bytesIn-before.bytesIn)/(elapsedMs/1000),messagesOut:after.messagesOut-before.messagesOut,snapshotHzActual:0,simHzActual:0,rssBytes:process.memoryUsage().rss});
  await game.close();
}
const report={timestamp:new Date().toISOString(),environment:'Local Work container, NOT Render Free',runtime:process.version,cpu:os.cpus()[0].model,cpuCount:os.availableParallelism(),scope:'Lobby baseline only. CPU includes server AND load clients in one process. WebSocket framing/TLS/TCP overhead is not included in application byte counters. No physics or snapshots exist yet: this is NOT a 60Hz room-capacity result.',configuredRates:{simHz:config.network.sim_hz,snapshotHz:config.network.snapshot_hz,inputHz:config.network.input_resend_hz},results};
writeFileSync('reports/skeleton-benchmark.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
