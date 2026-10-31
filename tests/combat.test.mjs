import test from'node:test';import assert from'node:assert/strict';import{readFileSync}from'node:fs';import{Simulation,EventDeduper}from'../dist/server/index.js';
const c=JSON.parse(readFileSync('balance_constants.json'));
const setup=()=>{const sim=new Simulation(c,'2v2');sim.tick=sim.countdownTicks;Object.assign(sim.rafts[0],{x:40,y:100,heading:0});Object.assign(sim.rafts[1],{x:-40,y:100,heading:0});sim.animals[0].phi=-90;return sim;};
const press=(sim,seat,count=1)=>sim.input(seat,{seq:sim.animals[seat].seq+1,walk:0,fire:false,whackCount:count});
const advance=(sim,seconds)=>{for(let i=0;i<Math.round(seconds*c.network.sim_hz);i++)sim.step();};
test('whack has visible windup, 1.5s stun, 3s slow, blocks victim walking/fire and starts 2s immunity on recovery',()=>{
 const sim=setup();press(sim,0);sim.step();assert.equal(sim.animals[0].whackPhase,'windup');assert.equal(sim.rafts[1].stun,0);
 advance(sim,c.combat.whack_windup_s);assert.equal(sim.rafts[1].stun,c.combat.hit_stun_s);assert.equal(sim.rafts[1].slow,c.combat.hit_slow_s);assert.ok(sim.events.some(e=>e.type==='hit'));
 const phi=sim.animals[2].phi;sim.input(2,{seq:1,walk:1,fire:true,whackCount:1});advance(sim,.2);assert.equal(sim.animals[2].phi,phi);assert.ok(!sim.events.some(e=>e.type==='shot'&&e.raft===1));
 while(sim.rafts[1].stun>0)sim.step();assert.equal(sim.rafts[1].immunity,c.combat.immunity_s);
 press(sim,0,2);advance(sim,c.combat.whack_windup_s+c.network.sim_hz**-1);assert.equal(sim.rafts[1].stun,0);assert.ok(sim.events.some(e=>e.type==='immune'));
 advance(sim,c.combat.immunity_s);assert.ok(sim.rafts[1].immunity<c.simulation.epsilon);
});
test('defender starts during windup: BLOCK without stun on either raft, independent of defender facing; dedup counter safe',()=>{
 const sim=setup();press(sim,0);advance(sim,.1);press(sim,2);advance(sim,.3);assert.ok(sim.events.some(e=>e.type==='block'));assert.ok(sim.rafts.every(r=>r.stun===0));assert.ok(sim.animals.filter(a=>a.seat===0||a.seat===2).every(a=>a.whackPhase==='cooldown'));
 const starts=sim.events.filter(e=>e.type==='whack_windup').length;press(sim,0);advance(sim,.1);assert.equal(sim.events.filter(e=>e.type==='whack_windup').length,starts);
});
test('whack requires reach and arc; all stun sources stack to cap; spikes bypass whack immunity but cannot retrigger during stun',()=>{
 const sim=setup();sim.rafts[1].x=-200;press(sim,0);advance(sim,.4);assert.equal(sim.rafts[1].stun,0);
 const facing=setup();facing.animals[0].phi=-20;Object.assign(facing.rafts[1],{x:40,y:20});press(facing,0);advance(facing,.4);assert.equal(facing.rafts[1].stun,0);
 sim.stun(1,2);sim.stun(1,2);assert.equal(sim.rafts[1].stun,c.combat.stun_max_s);
 const [fraction,,bank]=c.course.spike_zones[0],p=sim.course.at(fraction*c.course.length,bank*c.course.half_width);Object.assign(sim.rafts[0],p,{stun:0,immunity:2});sim.collideBanks(sim.rafts[0]);assert.equal(sim.rafts[0].stun,c.course.spike_stun_s);sim.collideBanks(sim.rafts[0]);assert.equal(sim.rafts[0].stun,c.course.spike_stun_s);
});
test('one-shot IDs repeat for configured window, expire and are consumed once per race even across duplicate snapshots',()=>{
 const sim=setup();sim.input(0,{seq:1,walk:0,fire:true,whackCount:0});sim.step();sim.release(0);const first=sim.snapshot();assert.ok(first.events.some(e=>e.type==='shot'));
 const consumer=new EventDeduper(c.network.event_seen_max);assert.equal(consumer.consume(first.raceId,first.events).length,1);assert.equal(consumer.consume(first.raceId,first.events).length,0);
 advance(sim,c.network.event_repeat_s+.1);assert.equal(sim.snapshot().events.length,0);assert.equal(consumer.consume('next-race',first.events).length,1);
 for(let id=2;id<c.network.event_seen_max+10;id++)consumer.consume('next-race',[{...first.events[0],id}]);assert.equal(consumer.consume('next-race',first.events).length,0);
});
