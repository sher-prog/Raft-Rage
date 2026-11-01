import test from'node:test';import assert from'node:assert/strict';import{readFileSync,writeFileSync}from'node:fs';import{Simulation}from'../dist/server/index.js';import{setup}from'./support.mjs';
const c=JSON.parse(readFileSync('balance_constants.json'));
// Original Phase 1 deterministic bot regressions retain their original ruleset.
c.release.phase=1;
test('bot takeover while stunned acknowledges neutral input and cannot walk or fire',()=>{
 const sim=new Simulation(c,'2v2');sim.tick=sim.countdownTicks;sim.input(2,{seq:10,walk:1,fire:true,whackCount:0});sim.stun(1,c.combat.hit_stun_s);sim.setBots([2]);
 const phi=sim.animals[2].phi;sim.step();assert.ok(sim.animals[2].seq>10);assert.equal(sim.animals[2].input.fire,false);assert.equal(sim.animals[2].input.walk,0);assert.equal(sim.animals[2].phi,phi);assert.equal(sim.shots.length,0);
});
test('seeded Chill bots complete both rafts over full fixed course across ten games',()=>{
 const runs=[];
 for(const mode of ['1v1','2v2'])for(const seed of [1,2,3,4,5]){
  const sim=new Simulation(c,mode,0,seed);sim.setBots(sim.animals.map(a=>a.seat));const times=[null,null];
  while(sim.phase!=='results'&&sim.raceTime<c.race.max_race_s){sim.step();sim.rafts.forEach((r,i)=>{if(r.progress>=c.course.length-c.simulation.epsilon&&times[i]===null)times[i]=sim.raceTime;});if(times.every(x=>x!==null))break;}
  assert.ok(times.every(x=>x!==null),`Both rafts must finish seed ${seed} mode ${mode}`);runs.push({mode,seed,times});
 }
 writeFileSync('reports/bot-full-course.json',JSON.stringify({timestamp:new Date().toISOString(),runs,environment:'Accelerated authoritative fixed-step simulation in Work; race times are simulated seconds, not wall time'},null,2)+'\n');
});
test('same seeded bot simulation replays deterministically; no hidden propulsion is applied',()=>{
 const a=new Simulation(c,'2v2',0,42),b=new Simulation(c,'2v2',0,42);a.setBots([0,1,2,3]);b.setBots([0,1,2,3]);
 for(let i=0;i<c.network.sim_hz*15;i++){a.step();b.step();}
 assert.deepEqual(a.rafts,b.rafts);assert.deepEqual(a.animals,b.animals);assert.equal(a.rngState,b.rngState);
});
test('disconnect becomes bot after real 3s, continues driving, reclaims mid-race by same code/name',async t=>{
 const{client,game}=await setup(t,x=>{x.rooms.countdown_s=.05;});const a=await client(),b=await client();const owner=await a.create('Lia');await b.join(owner.code,'Ben');b.send({type:'seat',seat:2});await b.wait(m=>m.type==='room'&&m.room.players.find(p=>p.name==='Ben').seat===2);
 a.send({type:'ready',ready:true});b.send({type:'ready',ready:true});await a.wait(m=>m.type==='room'&&m.room.players.every(p=>p.ready));a.send({type:'start'});await a.wait(m=>m.type==='snapshot'&&m.snapshot.phase==='race');
 b.ws.terminate();await a.wait(m=>m.type==='room'&&m.room.players.find(p=>p.name==='Ben')?.botDriving,4500);
 await new Promise(r=>setTimeout(r,700));const sim=game.rooms.get(owner.code).sim;assert.ok(sim.botSeats.has(2));assert.ok(sim.animals[2].seq>=0);assert.ok(sim.rafts[1].progress>0);
 const back=await client();await back.join(owner.code,'Ben');await new Promise(r=>setTimeout(r,100));assert.ok(!sim.botSeats.has(2));assert.equal(sim.animals[2].seq,-1);
});
