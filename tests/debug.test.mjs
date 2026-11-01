import test from'node:test';import assert from'node:assert/strict';import{readFileSync,writeFileSync}from'node:fs';import{performance}from'node:perf_hooks';import{setup}from'./support.mjs';
const c=JSON.parse(readFileSync('balance_constants.json'));
test('production build exposes version and compressed assets with same executable content',async t=>{
 const{base}=await setup(t);const version=await(await fetch(base+'/version')).json();assert.equal(version.version,'0.3.5');assert.equal(version.configVersion,c._version);
 const response=await fetch(base+'/main.js',{headers:{'accept-encoding':'br'}});assert.equal(response.headers.get('content-encoding'),'br');const script=await response.text();assert.ok(script.includes('SPOUT'));assert.ok(Number(response.headers.get('content-length'))<Buffer.byteLength(script));
});
test('jump is debug-host-only, accepts listed percentages and updates both clients; real CPU/snapshot metrics are available',async t=>{
 const{client}=await setup(t,x=>{x.rooms.countdown_s=.05;});const a=await client(undefined,{debug:true}),b=await client(undefined,{debug:true});const owner=await a.create('Lia');await b.join(owner.code,'Ana');a.send({type:'ready',ready:true});b.send({type:'ready',ready:true});await a.wait(m=>m.type==='room'&&m.room.players.every(p=>p.ready));a.send({type:'start'});await a.wait(m=>m.type==='snapshot'&&m.snapshot.phase==='race');
 b.send({type:'debug_jump',raft:'both',percent:95});assert.equal((await b.wait(m=>m.type==='error')).code,'HOST_ONLY');a.send({type:'debug_jump',raft:'both',percent:94});assert.equal((await a.wait(m=>m.type==='error')).code,'DEBUG');
 a.send({type:'debug_jump',raft:'both',percent:95});const room=(await a.wait(m=>m.type==='room'&&m.room.banner==='Jumped both to 95%')).room;const other=(await b.wait(m=>m.type==='room'&&m.room.banner==='Jumped both to 95%')).room;assert.deepEqual(room.simulation,other.simulation);assert.ok(room.simulation.rafts.every(r=>Math.abs(r.progress-c.course.length*.95)<.1));
 a.send({type:'debug_metrics'});const before=(await a.wait(m=>m.type==='metrics')).metrics,start=performance.now();await new Promise(r=>setTimeout(r,1000));a.send({type:'debug_metrics'});const after=(await a.wait(m=>m.type==='metrics')).metrics;
 assert.ok(after.cpuUserUs+after.cpuSystemUs>=before.cpuUserUs+before.cpuSystemUs);assert.ok(after.snapshotCount>before.snapshotCount);assert.ok(after.tickAverageMs>=0&&after.tickWorstMs>=after.tickAverageMs);assert.ok(after.eventLoopMaxMs>0);assert.equal(after.overruns,0,`worst tick ${after.tickWorstMs}ms, scheduler lateness ${after.schedulerLateMaxMs}ms`);
 writeFileSync('reports/debug-timings.json',JSON.stringify({timestamp:new Date().toISOString(),sampleMs:performance.now()-start,ticks:after.tick-before.tick,snapshots:after.snapshotCount-before.snapshotCount,tickAverageMs:after.tickAverageMs,tickWorstMs:after.tickWorstMs,overruns:after.overruns},null,2)+'\n');
});
test('rooms with zero connected humans suspend simulation, retain reservations, then resume shared clock on token reclaim',async t=>{
 const{client,game}=await setup(t);const a=await client();const owner=await a.create('Ana',true);a.send({type:'start'});await a.wait(m=>m.type==='snapshot');const sim=game.rooms.get(owner.code).sim;
 a.ws.terminate();await new Promise(r=>setTimeout(r,40));const pausedTick=sim.tick,start=sim.startServerTime;await new Promise(r=>setTimeout(r,150));assert.equal(sim.tick,pausedTick);
 const back=await client();back.send({type:'resume',code:owner.code,name:'Ana',token:owner.token});await back.wait(m=>m.type==='joined');await new Promise(r=>setTimeout(r,50));assert.ok(sim.tick>pausedTick);assert.ok(sim.startServerTime-start>=150);
});

