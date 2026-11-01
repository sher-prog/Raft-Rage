import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {Simulation} from '../dist/server/index.js';
const c=JSON.parse(readFileSync('balance_constants.json'));
// Full Phase 2 stress: release to cool, then resume committed firing.
for(const key of Object.keys(c.release))if(key!=='phase'&&key!=='_assumed')c.release[key]=false;c.release.phase=2;
// Independent oracle for the renderer's mitered outline, not Course.project or collision normals.
function outline(sim){
 const s=sim.course.segments,points=s.map(p=>({x:p.x,y:p.y})),last=s.at(-1),extension=c.course.bank_end_extension??600;
 points.push({x:last.x+last.tx*last.length,y:last.y+last.ty*last.length});points[0].x-=s[0].tx*extension;points[0].y-=s[0].ty*extension;points.at(-1).x+=last.tx*extension;points.at(-1).y+=last.ty*extension;
 const side=sign=>points.map((p,i)=>{const a=s[Math.max(0,i-1)],b=s[Math.min(i,s.length-1)],nx=a.ty+b.ty,ny=-a.tx-b.tx,k=sign*c.course.half_width/(nx*b.ty-ny*b.tx);return{x:p.x+nx*k,y:p.y+ny*k};});
 const left=side(-1),right=side(1),polygon=[...left,...right.toReversed()];
 const edges=polygon.map((a,i)=>{const b=polygon[(i+1)%polygon.length],dx=b.x-a.x,dy=b.y-a.y;return {a,b,dx,dy,inverseLengthSquared:1/(dx*dx+dy*dy),slope:dy===0?0:dx/dy};});
 return {left,right,polygon,edges};
}
function clearance(p,shape){
 let inside=false,minSquared=Infinity;
 for(const {a,b,dx,dy,inverseLengthSquared,slope}of shape.edges){
  if((a.y>p.y)!==(b.y>p.y)&&p.x<slope*(p.y-a.y)+a.x)inside=!inside;
  const px=p.x-a.x,py=p.y-a.y,t=Math.max(0,Math.min(1,(px*dx+py*dy)*inverseLengthSquared)),x=px-dx*t,y=py-dy*t;
  minSquared=Math.min(minSquared,x*x+y*y);
 }
 const distance=Math.sqrt(minSquared);return inside?distance:-distance;
}
function valid(r,shape,label){const d=clearance(r,shape);assert.ok(d>=c.raft.radius-1e-6,`${label}: clearance ${d} < radius ${c.raft.radius} at ${r.x},${r.y}`);return d;}
const measurements={scenarios:0,ticks:0,maxDisplacement:0,minBankClearance:Infinity,fullCourse:[]};
test('swept raft hits both banks and every outer turn at 0.5x, 1x and cap, without leaving water or teleporting',()=>{
 const sim=new Simulation(c,'1v1'),shape=outline(sim),r=sim.rafts[0],speeds=[c.water.current_speed*.5,c.water.current_speed,c.debug.jump_speed*.5,c.debug.jump_speed,c.water.speed_cap],targets=[];
 for(const [side,points]of [[-1,shape.left],[1,shape.right]])for(let i=1;i<points.length;i++){
  const a=points[i-1],b=points[i],dx=b.x-a.x,dy=b.y-a.y,l=Math.hypot(dx,dy),nx=dy/l*side,ny=-dx/l*side;
  for(const t of [.04,.5,.96])targets.push({x:a.x+dx*t-nx*(c.raft.radius+.1),y:a.y+dy*t-ny*(c.raft.radius+.1),nx,ny});
 }
 // Approach each actual outer miter vertex from the bend's centre; test every sharp turn (including reversals).
 for(let i=1;i<sim.course.segments.length;i++){
  const prev=sim.course.segments[i-1],next=sim.course.segments[i],turn=prev.tx*next.ty-prev.ty*next.tx,side=turn>0?1:-1;
  const vertex=(side>0?shape.right:shape.left)[i],dx=vertex.x-next.x,dy=vertex.y-next.y,l=Math.hypot(dx,dy),nx=dx/l,ny=dy/l;
  const projection=Math.min(Math.abs(nx*prev.ty-ny*prev.tx),Math.abs(nx*next.ty-ny*next.tx)),depth=(c.raft.radius+.1)/projection;
  targets.push({x:vertex.x-nx*depth,y:vertex.y-ny*depth,nx,ny});
 }
 for(const target of targets)for(const speed of speeds)for(const degrees of [-75,-45,-15,0,15,45,75]){
  if(clearance(target,shape)<c.raft.radius)continue;
  const a=degrees*Math.PI/180;Object.assign(r,{x:target.x,y:target.y,vx:speed*(target.nx*Math.cos(a)-target.ny*Math.sin(a)),vy:speed*(target.nx*Math.sin(a)+target.ny*Math.cos(a)),stun:0});sim.spikeLatch.clear();
  let contacted=false;for(let tick=0;tick<180;tick++){
   const beforeVX=r.vx,beforeVY=r.vy;const x=r.x,y=r.y,budget=Math.hypot(r.vx,r.vy)*sim.dt;sim.moveRaft(r,sim.dt);const move=Math.hypot(r.x-x,r.y-y);
   if(Math.hypot(r.vx-beforeVX,r.vy-beforeVY)>1e-6)contacted=true;
   assert.ok(move<=budget+1e-6,`tick displacement ${move} exceeds own velocity budget ${budget}`);
   measurements.maxDisplacement=Math.max(measurements.maxDisplacement,move);measurements.minBankClearance=Math.min(measurements.minBankClearance,valid(r,shape,'impact'));measurements.ticks++;
  }assert.ok(contacted,`must actually hit a bank at speed ${speed}, angle ${degrees}`);measurements.scenarios++;
 }
 assert.ok(measurements.scenarios>=900);
});
test('swept bank contact preserves tangential velocity and exact 0.4 restitution',()=>{
 const sim=new Simulation(c,'1v1'),r=sim.rafts[0];Object.assign(r,{x:c.course.half_width-c.raft.radius-.5,y:500,vx:60,vy:80});
 sim.moveRaft(r,sim.dt);assert.ok(Math.abs(r.vx+60*c.course.bank_restitution)<1e-8);assert.ok(Math.abs(r.vy-80)<1e-8);assert.ok(r.x<=c.course.half_width-c.raft.radius);
});
test('fully committed non-bot input races deliberately hit walls along the entire course',()=>{
 for(const side of [-1,1]){
  const sim=new Simulation(c,'1v1',0,42),shape=outline(sim);sim.tick=sim.countdownTicks;const r=sim.rafts[0];sim.rafts[1].finishTime=0;
  let bankHits=0,steps=0,maxProgress=0,velocityBudget=0,maxTickDisplacement=0,lastProgress=0,lastProgressTime=0,escapeUntil=0;
  const integrate=sim.moveRaft.bind(sim);sim.moveRaft=(body,dt)=>{if(body===r)velocityBudget=Math.hypot(body.vx,body.vy)*dt;integrate(body,dt);};const hitSegments=new Set();
  // Human-style wall-banging driver: hold FIRE, hold a walk button to turn the cannon,
  // then keep firing towards alternating banks. No bot code, position rescue or debug jumps.
  while(!sim.ended&&r.finishTime===null){
   const p=sim.course.project(r.x,r.y),cycle=Math.floor(sim.raceTime/20),towards=cycle%2?side:-side;
   const nearBank=clearance(r,shape)<c.raft.radius+.1;
   let lateral=nearBank||sim.raceTime%20>=6?0:towards*(c.course.half_width-c.raft.radius+20);
   const obstacles=[...sim.course.rocks,...c.course.log_positions.map(([f,lat])=>({...sim.course.at(f*c.course.length,lat),progress:f*c.course.length,radius:c.course.floating_log_length/2}))];
   for(const obstacle of obstacles)if(obstacle.progress>p.progress-40&&obstacle.progress<p.progress+c.bots.lookahead*2){const lat=sim.course.project(obstacle.x,obstacle.y).lateral;lateral=-Math.sign(lat||1)*130;}
   const aim=sim.course.at(p.progress+c.bots.lookahead,lateral),dx=aim.x-r.x,dy=aim.y-r.y,len=Math.hypot(dx,dy)||1,targetWorld=Math.atan2(dx/len*240-r.vx,dy/len*240-r.vy)+Math.PI;
   let desired=0,best=Infinity;for(let phi=-180;phi<180;phi+=3){const angle=r.heading+(phi-c.firing.general_cant_amplitude_deg*Math.sin(2*phi*Math.PI/180))*Math.PI/180,error=Math.abs(Math.atan2(Math.sin(angle-targetWorld),Math.cos(angle-targetWorld)));if(error<best){best=error;desired=phi;}}
   const delta=((desired-sim.animals[0].phi+180+720)%360)-180;
   const walk=Math.abs(delta)>3?Math.sign(delta):0;
   if(steps%Math.round(c.network.sim_hz/c.network.input_resend_hz)===0)sim.input(0,{seq:steps,walk,fire:sim.animals[0].heat<c.heat.warn_at&&sim.animals[0].lockout===0,whackCount:0});
   const x=r.x,y=r.y;sim.step();const move=Math.hypot(r.x-x,r.y-y);
   assert.ok(move<=c.water.speed_cap*sim.dt+1e-6,`human input tick jumped ${move}`);
   assert.ok(move<=velocityBudget+1e-6,`human input tick ${move} exceeds own integrated velocity budget ${velocityBudget}`);maxTickDisplacement=Math.max(maxTickDisplacement,move);
   valid(r,shape,'human input');maxProgress=Math.max(maxProgress,r.progress);
   if(clearance(r,shape)<c.raft.radius+.5){bankHits++;hitSegments.add(sim.course.segments.findIndex(s=>p.progress<=s.start+s.length));}
   steps++;
  }
  assert.ok(bankHits>20,`must actually hit walls, got ${bankHits}`);assert.equal(r.progress,c.course.length,'human input stream must traverse whole course '+JSON.stringify({r,a:sim.animals[0]}));
  measurements.fullCourse.push({side,steps,finishTime:r.finishTime,bankContactTicks:bankHits,segmentsWithBankContact:[...hitSegments],maxTickDisplacement,maxProgress});
 }
});
test.after(()=>writeFileSync('reports/depth-bank-stress.json',JSON.stringify({timestamp:new Date().toISOString(),rates:{sim:60,snapshots:20,input:10},environment:'Accelerated fixed-step simulation, independent drawn-bank geometry oracle; no bot controllers',...measurements},null,2)+'\n'));
