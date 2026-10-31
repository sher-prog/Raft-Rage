import test from 'node:test';
import assert from 'node:assert/strict';
import { performance } from 'node:perf_hooks';
import { readFileSync,writeFileSync } from 'node:fs';
import { Simulation } from '../dist/server/index.js';
import { setup } from './support.mjs';
const config=JSON.parse(readFileSync('balance_constants.json'));
test('fixed-step countdown transitions on exact tick; race time derives only from ticks',()=>{
 const sim=new Simulation(config,'1v1',1000);
 for(let i=0;i<config.network.sim_hz*config.rooms.countdown_s-1;i++)sim.step();
 assert.equal(sim.phase,'countdown');assert.equal(sim.raceTime,0);sim.step();assert.equal(sim.phase,'race');assert.equal(sim.raceTime,0);
 for(let i=0;i<config.network.sim_hz;i++)sim.step();assert.equal(sim.raceTime,1);
});
test('Start is host-only and Ready-gated; two real clients receive identical clock snapshots',async t=>{
 const {client}=await setup(t);const a=await client(),b=await client();const owner=await a.create('Lia');await b.join(owner.code,'Ana');
 b.send({type:'start'});assert.equal((await b.wait(m=>m.type==='error')).code,'HOST_ONLY');
 a.send({type:'start'});assert.equal((await a.wait(m=>m.type==='error')).code,'NOT_READY');
 a.send({type:'ready',ready:true});b.send({type:'ready',ready:true});await a.wait(m=>m.type==='room'&&m.room.players.every(p=>p.ready));
 const started=performance.now();a.send({type:'start'});const state=await a.wait(m=>m.type==='room'&&m.room.phase==='countdown');assert.equal(state.room.simulation.raceTime,0);
 const sa=(await a.wait(m=>m.type==='snapshot')).snapshot;const sb=(await b.wait(m=>m.type==='snapshot'&&m.snapshot.tick===sa.tick)).snapshot;assert.deepEqual(sa,sb);
 const went=await a.wait(m=>m.type==='room'&&m.room.phase==='race',4000);const countdownMs=performance.now()-started;
 assert.ok(Math.abs(countdownMs-config.rooms.countdown_s*1000)<200);assert.equal(went.room.simulation.raceTime,0);
 a.send({type:'mode',mode:'1v1'});assert.equal((await a.wait(m=>m.type==='error')).code,'PHASE');
 const c=await client();await c.join(owner.code,'Dee');const late=(await c.wait(m=>m.type==='room')).room;assert.equal(late.players.find(p=>p.name==='Dee').seat,null);
 const now=performance.now(),first=(await a.wait(m=>m.type==='snapshot'&&m.snapshot.phase==='race')).snapshot;
 a.messages.splice(0);await new Promise(r=>setTimeout(r,1000));const snaps=a.messages.filter(m=>m.type==='snapshot');assert.ok(snaps.length>=18&&snaps.length<=22);
 writeFileSync('reports/clock-timings.json',JSON.stringify({measuredAt:new Date().toISOString(),countdownMs,identicalSnapshotTick:sa.tick,snapshotCount:snaps.length,sampleMs:performance.now()-now,firstRaceTick:first.tick,environment:'Local real WebSocket clients; no physical/cellular claim'},null,2)+'\n');
});
