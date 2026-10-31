import test from'node:test';import assert from'node:assert/strict';import{readFileSync,writeFileSync}from'node:fs';import{performance}from'node:perf_hooks';import{Simulation}from'../dist/server/index.js';import{setup}from'./support.mjs';
const c=JSON.parse(readFileSync('balance_constants.json'));
test('finish records authoritative time, freezes winner and ends exactly 15s later; timeout awards progress with DNF',()=>{
 const sim=new Simulation(c,'1v1');sim.tick=sim.countdownTicks;Object.assign(sim.rafts[0],sim.course.at(c.course.length+.1,-70));sim.step();assert.equal(sim.winner,0);assert.ok(sim.rafts[0].finishTime!==null);
 const first=sim.firstFinishTime,position={x:sim.rafts[0].x,y:sim.rafts[0].y};
 for(let i=0;i<c.network.sim_hz*c.race.finish_grace_s;i++)sim.step();assert.equal(sim.phase,'results');assert.ok(Math.abs(sim.raceTime-first-c.race.finish_grace_s)<c.simulation.epsilon);assert.equal(sim.rafts[0].x,position.x);assert.equal(sim.rafts[0].y,position.y);
 const timeout=new Simulation(c,'1v1');timeout.tick=timeout.countdownTicks+c.race.max_race_s*c.network.sim_hz-1;Object.assign(timeout.rafts[0],timeout.course.at(500,-70));Object.assign(timeout.rafts[1],timeout.course.at(1000,70));timeout.step();assert.equal(timeout.phase,'results');assert.equal(timeout.winner,1);assert.ok(timeout.rafts.every(r=>r.finishTime===null));
});
test('real clients get identical results within 15s of first finish; rematch retains seats, clears Ready, lets spectator sit',async t=>{
 const{client,game}=await setup(t,x=>{x.rooms.countdown_s=.05;});const a=await client(),b=await client();const owner=await a.create('Lia');await b.join(owner.code,'Ana');a.send({type:'ready',ready:true});b.send({type:'ready',ready:true});await a.wait(m=>m.type==='room'&&m.room.players.every(p=>p.ready));a.send({type:'start'});await a.wait(m=>m.type==='snapshot'&&m.snapshot.phase==='race');
 const d=await client();await d.join(owner.code,'Dee');await d.wait(m=>m.type==='room');const sim=game.rooms.get(owner.code).sim;
 sim.rafts.forEach((r,i)=>Object.assign(r,sim.course.at(c.course.length+.1,i===0?-70:70)));
 const first=(await a.wait(m=>m.type==='snapshot'&&m.snapshot.firstFinishTime!==null)).snapshot,start=performance.now();
 const ra=(await a.wait(m=>m.type==='room'&&m.room.phase==='results',17000)).room,elapsed=performance.now()-start;
 const rb=(await b.wait(m=>m.type==='room'&&m.room.phase==='results')).room;assert.deepEqual(ra.simulation,rb.simulation);assert.ok(elapsed<15100&&elapsed>14800);assert.ok(Math.abs(ra.simulation.raceTime-first.firstFinishTime-c.race.finish_grace_s)<.001);
 b.send({type:'rematch'});assert.equal((await b.wait(m=>m.type==='error')).code,'HOST_ONLY');
 a.send({type:'rematch'});const lobby=(await a.wait(m=>m.type==='room'&&m.room.phase==='lobby'&&m.room.revision>ra.revision)).room;
 assert.equal(lobby.players.find(p=>p.name==='Lia').seat,0);assert.equal(lobby.players.find(p=>p.name==='Ana').seat,1);assert.ok(lobby.players.every(p=>!p.ready));d.send({type:'seat',seat:3});await d.wait(m=>m.type==='room'&&m.room.players.find(p=>p.name==='Dee')?.seat===3);
 for(const client of[a,b,d])client.send({type:'ready',ready:true});await a.wait(m=>m.type==='room'&&m.room.phase==='lobby'&&m.room.revision>lobby.revision&&m.room.players.every(p=>p.ready));a.send({type:'start'});const fresh=(await a.wait(m=>m.type==='room'&&m.room.phase==='countdown'&&m.room.simulation.raceId!==first.raceId)).room.simulation;
 assert.notEqual(fresh.raceId,first.raceId);a.send({type:'input',raceId:first.raceId,inputEpoch:owner.inputEpoch,seat:0,seq:999,walk:1,fire:true,whackCount:0});await new Promise(r=>setTimeout(r,100));assert.equal(game.rooms.get(owner.code).sim.animals[0].seq,-1);
 writeFileSync('reports/results-timings.json',JSON.stringify({timestamp:new Date().toISOString(),resultsAfterFirstFinishSnapshotMs:elapsed,authoritativeFinishGraceS:ra.simulation.raceTime-first.firstFinishTime,identicalResults:true,rematchSeatsRetained:true,readyCleared:true,spectatorSat:true,oldRaceInputsRejected:true,environment:'Local real WebSocket clients; real 15-second grace; finish placement is a test fixture'},null,2)+'\n');
});
