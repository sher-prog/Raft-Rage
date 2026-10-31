import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync}from'node:fs';
import {Simulation}from'../dist/server/index.js';
import {setup}from'./support.mjs';
const c=JSON.parse(readFileSync('balance_constants.json'));
const create=(mode='2v2')=>{const sim=new Simulation(c,mode);sim.tick=sim.countdownTicks;return sim;};
const advance=(sim,seconds,inputs=[])=>{for(let i=0;i<Math.round(seconds*c.network.sim_hz);i++){for(const[seat,input]of inputs){if(i%Math.round(c.network.sim_hz/c.network.input_resend_hz)===0)sim.input(seat,{walk:0,fire:false,whackCount:0,...input,seq:sim.tick});}sim.step();}};
test('angled bank impacts at bends correct only penetration and preserve tangential position/velocity',()=>{
 const sim=create(),r=sim.rafts[0],limit=c.course.half_width-c.raft.radius;
 let samples=0;
 for(const s of sim.course.segments)for(const along of [-30,-5,0,5,s.length/2,s.length-5,s.length+5,s.length+30])for(const side of [-1,1])for(const depth of [1,10,34]){
  sim.spikeLatch.clear();Object.assign(r,{x:s.x+s.tx*along+s.ty*side*(limit+depth),y:s.y+s.ty*along-s.tx*side*(limit+depth),stun:0});
  const p=sim.course.project(r.x,r.y),penetration=Math.max(0,Math.abs(p.lateral)-limit);if(!penetration)continue;
  const sign=Math.sign(p.lateral),nx=p.ty*sign,ny=-p.tx*sign;
  r.vx=100*nx+75*p.tx;r.vy=100*ny+75*p.ty;
  const x=r.x,y=r.y;sim.collideBanks(r);
  assert.ok(Math.hypot(r.x-x,r.y-y)<=penetration+c.simulation.epsilon,`correction exceeds ${penetration} at bend ${s.start}/${along}`);
  assert.ok(Math.abs((r.x-x)*p.tx+(r.y-y)*p.ty)<c.simulation.epsilon);
  // Spike contacts intentionally halve velocity; restitution is measured away from those zones.
  const spike=c.course.spike_zones.some(([f,len,bank])=>bank===sign&&Math.abs(p.progress-f*c.course.length)<=len/2);
  const factor=spike?c.course.spike_speed_factor:1;
  assert.ok(Math.abs((r.vx*nx+r.vy*ny)-(-100*c.course.bank_restitution*factor))<c.simulation.epsilon);
  assert.ok(Math.abs(r.vx*p.tx+r.vy*p.ty-75*factor)<c.simulation.epsilon);samples++;
 }
 assert.ok(samples>100);
});
test('corrected P1-5 directions in ONE 2v2 simulation: Red Left stern=>forward, left=>right; Red Right right=>left',()=>{
 const sim=create();sim.animals[0].phi=-165;advance(sim,.16,[[0,{fire:true}]]);assert.ok(sim.rafts[0].vy>40);
 // Reset only motion and shot cooldown between the one-player-at-a-time checks, retaining the same 2v2 room model.
 Object.assign(sim.rafts[0],{vx:0,vy:0,heading:0,omega:0});sim.shots=[];sim.animals[0].recharge=0;sim.animals[0].phi=-90;
 advance(sim,.16,[[0,{fire:true}]]);assert.ok(sim.rafts[0].vx>40);
 sim.release(0);Object.assign(sim.rafts[0],{vx:0,vy:0,heading:0,omega:0});sim.shots=[];sim.animals[1].phi=90;
 advance(sim,.16,[[1,{fire:true}]]);assert.ok(sim.rafts[0].vx< -40);
});
test('walking uses own-left sign, both zones and 30-degree stern gap; simultaneous walk+fire works',()=>{
 const sim=create();advance(sim,1,[[0,{walk:1,fire:true}]]);assert.ok(sim.animals[0].phi>-165);assert.ok(sim.rafts[0].vy>0);
 advance(sim,3,[[0,{walk:1}],[1,{walk:-1}]]);assert.equal(sim.animals[0].phi,-20);assert.equal(sim.animals[1].phi,20);
 advance(sim,4,[[0,{walk:-1}],[1,{walk:1}]]);assert.ok(360-Math.abs(sim.animals[0].phi)-Math.abs(sim.animals[1].phi)>=c.walking.min_stern_gap_2v2_deg-c.simulation.epsilon);
 const solo=create('1v1');advance(solo,4,[[0,{walk:1}]]);assert.ok(solo.animals[0].phi>=-180&&solo.animals[0].phi<=180);
});
test('stale held input releases; duplicate and older sequences never replace newer input',()=>{
 const sim=create();assert.ok(sim.input(0,{seq:10,walk:1,fire:true,whackCount:0}));assert.equal(sim.input(0,{seq:9,walk:-1,fire:false,whackCount:0}),false);assert.equal(sim.input(0,{seq:10,walk:-1,fire:false,whackCount:0}),false);
 advance(sim,c.network.stale_input_s+.1);assert.equal(sim.animals[0].input.fire,false);assert.equal(sim.animals[0].input.walk,0);
});
test('keel restores heading; bank bounces, spikes stun once until recovery, rocks exclude overlap, speed capped',()=>{
 const sim=create();const r=sim.rafts[0];r.heading=Math.PI;advance(sim,4);assert.ok(Math.abs(r.heading)<.5);
 r.x=c.course.half_width;r.y=100;r.vx=100;sim.collideBanks(r);assert.ok(r.vx<0);assert.ok(Math.abs(r.x)<=c.course.half_width-c.raft.radius);
 const [fraction,,bank]=c.course.spike_zones[0],p=sim.course.at(fraction*c.course.length,bank*c.course.half_width);r.x=p.x;r.y=p.y;r.stun=0;sim.collideBanks(r);assert.equal(r.stun,c.course.spike_stun_s);sim.collideBanks(r);assert.equal(r.stun,c.course.spike_stun_s);
 const rock=sim.course.rocks[0];r.x=rock.x;r.y=rock.y;r.vx=100;sim.collideRocks(r);assert.ok(Math.hypot(r.x-rock.x,r.y-rock.y)>=rock.radius+c.raft.radius);
 r.vx=1000;r.vy=1000;sim.step();assert.ok(Math.hypot(r.vx,r.vy)<=c.water.speed_cap+c.simulation.epsilon);
});
test('real WS input is seat-bound and epoch-bound; reconnect starts a safe fresh sequence stream',async t=>{
 const {client,game}=await setup(t,x=>{x.rooms.countdown_s=.05;});const a=await client();const owner=await a.create('Ana',true);a.send({type:'start'});await a.wait(m=>m.type==='snapshot'&&m.snapshot.phase==='race');
 const send=(seq,walk=1,extra={})=>a.send({type:'input',seat:0,raceId:game.rooms.get(owner.code).sim.raceId,inputEpoch:owner.inputEpoch,seq,walk,fire:false,whackCount:0,...extra});
 send(50);let state=(await a.wait(m=>m.type==='snapshot'&&m.snapshot.animals[0].seq===50)).snapshot;assert.ok(state.animals[0].phi!==180);
 send(60,-1,{inputEpoch:'old-stream'});send(70,-1,{seat:1});await new Promise(r=>setTimeout(r,100));assert.equal(game.rooms.get(owner.code).sim.animals[0].seq,50);
 a.ws.terminate();await new Promise(r=>setTimeout(r,20));const b=await client();b.send({type:'resume',code:owner.code,name:'Ana',token:owner.token});const joined=await b.wait(m=>m.type==='joined');assert.notEqual(joined.inputEpoch,owner.inputEpoch);
 b.send({type:'input',seat:0,raceId:game.rooms.get(owner.code).sim.raceId,inputEpoch:joined.inputEpoch,seq:1,walk:0,fire:true,whackCount:0});await b.wait(m=>m.type==='snapshot'&&m.snapshot.animals[0].seq===1);
});

test('a short press/release arriving between ticks still fires exactly one Hippo shot',()=>{
 const sim=create('1v1');sim.input(0,{seq:1,walk:0,fire:true,whackCount:0});sim.input(0,{seq:2,walk:0,fire:false,whackCount:0});sim.step();assert.equal(sim.shots.length,1);advance(sim,.2);assert.ok(sim.rafts[0].vy>50);assert.equal(sim.shots.length,0);
});

