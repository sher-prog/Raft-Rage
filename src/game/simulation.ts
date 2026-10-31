import type { Config, Mode, Snapshot, AnimalState, RaftState, InputState } from '../shared.ts';
import { Course,rad,wrap,clamp } from './course.ts';
type Animal=AnimalState & {input:InputState;seenTick:number};
type Shot={raft:number;phi:number;cant:number;dv:number;remaining:number};
export class Simulation {
  tick=0;
  readonly dt:number;readonly countdownTicks:number;
  readonly course:Course;readonly rafts:RaftState[]=[];readonly animals:Animal[]=[];shots:Shot[]=[];
  tickAverageMs=0;tickWorstMs=0;tickTotalMs=0;tickCount=0;
  constructor(readonly config:Config,readonly mode:Mode,readonly startServerTime=Date.now()){
    this.dt=1/config.network.sim_hz;this.countdownTicks=Math.round(config.rooms.countdown_s*config.network.sim_hz);this.course=new Course(config);
    const seats=mode==='1v1'?config.rooms.seats_1v1:config.rooms.seats_2v2;
    for(let i=0;i<2;i++){
      const pos=this.course.at(config.course.start_progress,(i===0?-1:1)*config.course.start_lateral_offset);
      this.rafts.push({x:pos.x,y:pos.y,heading:pos.heading,vx:0,vy:config.simulation.initial_speed,omega:config.simulation.initial_omega,progress:config.course.start_progress,stun:0,slow:0,immunity:0,finishTime:null});
    }
    for(let seat=0;seat<seats;seat++)this.animals.push({seat,raft:Math.floor(seat/(seats/2)),phi:mode==='1v1'?config.walking.initial_phi_1v1_deg:config.walking.initial_phi_2v2_deg[seat%(seats/2)],recharge:0,fire:false,walk:0,seq:-1,whackCount:0,input:{seq:-1,walk:0,fire:false,whackCount:0},seenTick:0});
  }
  get phase():Snapshot['phase']{return this.tick<this.countdownTicks?'countdown':'race';}
  get raceTime(){return Math.max(0,(this.tick-this.countdownTicks)*this.dt);}
  resetInput(seat:number){const a=this.animals[seat];if(a){a.input={seq:-1,walk:0,fire:false,whackCount:0};a.seq=-1;a.seenTick=this.tick;}}
  release(seat:number){const a=this.animals[seat];if(a){a.input.fire=false;a.input.walk=0;}}
  input(seat:number,input:InputState){
    const a=this.animals[seat];if(!a||input.seq<=a.seq)return false;
    a.seq=input.seq;a.input={...input};a.seenTick=this.tick;return true;
  }
  step(){
    this.tick++;if(this.tick<=this.countdownTicks)return;
    const c=this.config,dt=this.dt;
    for(const raft of this.rafts){raft.stun=Math.max(0,raft.stun-dt);raft.slow=Math.max(0,raft.slow-dt);raft.immunity=Math.max(0,raft.immunity-dt);}
    for(const a of this.animals){
      if((this.tick-a.seenTick)*dt>c.network.stale_input_s)this.release(a.seat);
      const raft=this.rafts[a.raft];a.recharge=Math.max(0,a.recharge-dt);a.fire=a.input.fire&&raft.stun===0;a.walk=raft.stun>0?0:a.input.walk;
      let phi=a.phi+a.walk*(this.mode==='1v1'?c.walking.speed_1v1_deg_s:c.walking.speed_2v2_deg_s)*dt;
      if(this.mode==='1v1')phi=((phi+180)%360+360)%360-180;
      else{
        const left=a.seat%2===0,zone=left?c.walking.zone_2v2_left_deg:c.walking.zone_2v2_right_deg;
        phi=clamp(phi,zone[0],zone[1]);const other=this.animals[a.seat+(left?1:-1)];
        const bound=360-c.walking.min_stern_gap_2v2_deg-Math.abs(other.phi);phi=left?Math.max(phi,-bound):Math.min(phi,bound);
      }
      a.phi=phi;
      if(a.fire&&a.recharge<=c.simulation.epsilon){
        const character=c.characters.hippo;
        this.shots.push({raft:a.raft,phi:rad(a.phi),cant:rad(-c.firing.general_cant_amplitude_deg*Math.sin(2*rad(a.phi))),dv:(this.mode==='1v1'?character.dv_1v1*c.multipliers.impulse_1v1:character.dv_2v2)*(raft.slow>0?c.multipliers.thrust_slow:1),remaining:c.firing.impulse_spread_s});
        a.recharge=this.mode==='1v1'?character.recharge_s_1v1:character.recharge_s_2v2;
      }
    }
    for(const shot of this.shots){
      const r=this.rafts[shot.raft],portion=shot.dv*Math.min(dt,shot.remaining)/c.firing.impulse_spread_s;
      const aim=r.heading+shot.phi+shot.cant,fx=-Math.sin(aim)*portion,fy=-Math.cos(aim)*portion;
      r.vx+=fx/c.raft.mass;r.vy+=fy/c.raft.mass;
      const rim=r.heading+shot.phi,rx=Math.sin(rim)*c.raft.rim_radius,ry=Math.cos(rim)*c.raft.rim_radius;
      // Clockwise compass heading: the clockwise cross product is ry*Fx-rx*Fy.
      r.omega+=(ry*fx-rx*fy)/(c.raft.inertia_factor*c.raft.radius**2);shot.remaining-=dt;
    }
    this.shots=this.shots.filter(s=>s.remaining>c.simulation.epsilon);
    for(const r of this.rafts){
      const p=this.course.project(r.x,r.y),relax=1-Math.exp(-c.water.current_relax_rate*dt);
      r.vx+=(p.tx*c.water.current_speed-r.vx)*relax;r.vy+=(p.ty*c.water.current_speed-r.vy)*relax;
      r.omega*=Math.exp(-(r.stun>0?c.water.angular_damping_stunned:c.water.angular_damping)*dt);
      if(r.stun===0)r.omega+=c.water.keel_gain*wrap(p.heading-r.heading)*dt;
      r.x+=r.vx*dt;r.y+=r.vy*dt;r.heading=wrap(r.heading+r.omega*dt);
      const speed=Math.hypot(r.vx,r.vy);if(speed>c.water.speed_cap){r.vx*=c.water.speed_cap/speed;r.vy*=c.water.speed_cap/speed;}
      this.collideBanks(r);this.collideRocks(r);r.progress=this.course.project(r.x,r.y).progress;
    }
    const [a,b]=this.rafts,dx=b.x-a.x,dy=b.y-a.y,d=Math.hypot(dx,dy),radius=c.raft.radius*2;
    if(d<radius&&d>c.simulation.epsilon){
      const nx=dx/d,ny=dy/d,overlap=(radius-d)/2;a.x-=nx*overlap;a.y-=ny*overlap;b.x+=nx*overlap;b.y+=ny*overlap;
      const rel=(b.vx-a.vx)*nx+(b.vy-a.vy)*ny;
      if(rel<0){const impulse=-(1+c.course.raft_raft_restitution)*rel/2;a.vx-=impulse*nx;a.vy-=impulse*ny;b.vx+=impulse*nx;b.vy+=impulse*ny;}
    }
  }
  collideBanks(r:RaftState){
    const c=this.config,p=this.course.project(r.x,r.y),limit=c.course.half_width-c.raft.radius;
    if(Math.abs(p.lateral)<=limit)return;
    const sign=Math.sign(p.lateral),lateral=sign*limit;r.x=p.x+p.ty*lateral;r.y=p.y-p.tx*lateral;
    const outward=(r.vx*p.ty-r.vy*p.tx)*sign;
    if(outward>0){r.vx-=(1+c.course.bank_restitution)*outward*p.ty*sign;r.vy+=(1+c.course.bank_restitution)*outward*p.tx*sign;}
    if(r.stun===0&&c.course.spike_zones.some(([fraction,length,bank])=>bank===sign&&Math.abs(p.progress-fraction*c.course.length)<=length/2)){
      r.stun=c.course.spike_stun_s;r.vx*=c.course.spike_speed_factor;r.vy*=c.course.spike_speed_factor;
    }
  }
  collideRocks(r:RaftState){
    const c=this.config;
    for(const rock of this.course.rocks){const dx=r.x-rock.x,dy=r.y-rock.y,d=Math.hypot(dx,dy),radius=c.raft.radius+rock.radius;if(d>=radius)continue;
      const nx=d>c.simulation.epsilon?dx/d:1,ny=d>c.simulation.epsilon?dy/d:0;
      r.x=rock.x+nx*(radius+c.simulation.collision_push_epsilon);r.y=rock.y+ny*(radius+c.simulation.collision_push_epsilon);
      const velocity=r.vx*nx+r.vy*ny;if(velocity<0){r.vx-=(1+c.course.bank_restitution)*velocity*nx;r.vy-=(1+c.course.bank_restitution)*velocity*ny;}
    }
  }
  snapshot():Snapshot{
    const n=this.config.network,q=(value:number,quantum:number)=>Math.round(value/quantum)*quantum;
    return {tick:this.tick,raceTime:q(this.raceTime,n.time_quantum_s),phase:this.phase,startServerTime:this.startServerTime,serverTime:Date.now(),tickAverageMs:this.tickAverageMs,tickWorstMs:this.tickWorstMs,
      rafts:this.rafts.map(r=>({...r,x:q(r.x,n.position_quantum),y:q(r.y,n.position_quantum),heading:q(r.heading,rad(n.angle_quantum_deg)),vx:q(r.vx,n.velocity_quantum),vy:q(r.vy,n.velocity_quantum),progress:q(r.progress,n.position_quantum)})),
      animals:this.animals.map(({input,seenTick,...a})=>({...a,phi:q(a.phi,n.angle_quantum_deg)}))};
  }
}
