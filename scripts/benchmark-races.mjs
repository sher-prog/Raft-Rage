import{readFileSync,writeFileSync}from'node:fs';import{createGameServer}from'../dist/server/index.js';import{NetClient,readPublicConfig,delay}from'./net-client.mjs';
const requestedBase=process.argv[2];const counts=(process.argv[3]??'1,2,4,8').split(',').map(Number),seconds=Number(process.argv[4]??8);
let game,base=requestedBase,config;if(!base){config=JSON.parse(readFileSync('balance_constants.json'));game=createGameServer(config,{measure:true});base='http://127.0.0.1:'+await game.listen(0);}else config=await readPublicConfig(base);
const results=[];let failed=false,error;
try{
 for(const count of counts){
  const clients=[],rooms=[];
  try{
   for(let room=0;room<count;room++){
    const crew=Array.from({length:config.rooms.seats_2v2},(_,i)=>new NetClient(base,config,{debug:i===0}));clients.push(...crew);await Promise.all(crew.map(c=>c.connected()));
    const owner=await crew[0].create('Load0');await Promise.all(crew.slice(1).map((c,i)=>c.join(owner.code,`Load${i+1}`)));
    for(const c of crew)c.send({type:'ready',ready:true});await crew[0].wait(m=>m.type==='room'&&m.room.players.length===config.rooms.seats_2v2&&m.room.players.every(p=>p.ready));rooms.push({host:crew[0],crew});
   }
   for(const room of rooms)room.host.send({type:'start'});await Promise.all(rooms.map(r=>r.host.wait(m=>m.type==='snapshot'&&m.snapshot.phase==='race')));
   clients.forEach(c=>{c.startInputs();c.setInput({fire:true});});await delay(1000);
   const before=await Promise.all(rooms.map(r=>r.host.metrics()));const receivedBefore=clients.reduce((n,c)=>n+c.receivedBytes,0);
   await delay(seconds*1000);
   const after=await Promise.all(rooms.map(r=>r.host.metrics()));const elapsedMs=after[0].wallMs-before[0].wallMs;
   const cpuMs=(after[0].cpuUserUs+after[0].cpuSystemUs-before[0].cpuUserUs-before[0].cpuSystemUs)/1000;
   const rates=after.map((r,i)=>({simHz:(r.tick-before[i].tick)/((r.wallMs-before[i].wallMs)/1000),snapshotHz:(r.snapshotCount-before[i].snapshotCount)/((r.wallMs-before[i].wallMs)/1000),averageTickMs:r.tickAverageMs,worstTickMs:r.tickWorstMs,overruns:r.overruns,snapshotAverageMs:r.snapshotAverageMs,snapshotWorstMs:r.snapshotWorstMs,schedulerLateMaxMs:r.schedulerLateMaxMs}));
   const pass=rates.every(r=>r.simHz>=config.network.sim_hz-1&&r.snapshotHz>=config.network.snapshot_hz-1&&r.overruns===0&&r.schedulerLateMaxMs<config.network.interp_buffer_ms);
   const point={rooms:count,clients:clients.length,sampleMs:elapsedMs,cpuMs,cpuCores:cpuMs/elapsedMs,cpuCoresPerUser:cpuMs/elapsedMs/clients.length,rssBytes:after[0].rssBytes,activeRaceRoomsReported:after[0].activeRaceRooms,payloadOutBytesPerSecond:(after[0].bytesOut-before[0].bytesOut)/(elapsedMs/1000),payloadInBytesPerSecond:(after[0].bytesIn-before[0].bytesIn)/(elapsedMs/1000),nodeSocketOutBytesPerSecond:(after[0].socketBytesWritten-before[0].socketBytesWritten)/(elapsedMs/1000),nodeSocketInBytesPerSecond:(after[0].socketBytesRead-before[0].socketBytesRead)/(elapsedMs/1000),clientReceivedBytesPerSecond:(clients.reduce((n,c)=>n+c.receivedBytes,0)-receivedBefore)/(elapsedMs/1000),eventLoopMeanMs:after[0].eventLoopMeanMs,eventLoopMaxMs:after[0].eventLoopMaxMs,roomMetrics:rates,pass};
   results.push(point);console.log(JSON.stringify({rooms:count,pass,cpuCores:point.cpuCores,worstTickMs:Math.max(...rates.map(r=>r.worstTickMs)),simHzMin:Math.min(...rates.map(r=>r.simHz)),snapshotHzMin:Math.min(...rates.map(r=>r.snapshotHz)),overruns:rates.reduce((n,r)=>n+r.overruns,0)}));
   if(!pass){failed=true;break;}
  }finally{await Promise.all(clients.map(c=>c.close()));await delay(100);}
 }
}catch(e){failed=true;error=e.message;}finally{await game?.close();}
const report={timestamp:new Date().toISOString(),environment:requestedBase?'Actual public Render service':'Local Work container; CPU includes server and load clients in one process',base,configVersion:config._version,runtime:process.version,scenario:'Four human WebSocket clients per 2v2 room, all continuously firing, 10Hz input resend, native keepalive plus 2s clock pings, real fixed 60Hz authority and 20Hz snapshots. No-human rooms suspend after clients leave.',measurementLimits:'Node socket counters include WS framing/control/HTTP handshake. Render edge TLS/TCP/provider billing overhead is not measured. Histograms have 10ms resolution and include setup history. Graphics FPS is not measured. Largest tested passing load is a lower bound, not an unlimited capacity guarantee.',largestPassingRooms:Math.max(0,...results.filter(r=>r.pass).map(r=>r.rooms)),stoppedAfterFailure:failed,error,results};
writeFileSync(requestedBase?'reports/render-race-benchmark.json':'reports/local-race-benchmark.json',JSON.stringify(report,null,2)+'\n');

if(error){console.error(error);process.exitCode=1;}
