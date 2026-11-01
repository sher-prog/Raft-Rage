import {RacingSystems} from './racing-systems.ts';
import {sweepCircle} from './sweep.ts';
import type { Config, Mode, Snapshot, AnimalState, RaftState, InputState, GameEvent, Character, Difficulty } from '../shared.ts';
import { Course,rad,wrap,clamp } from './course.ts';
type Animal=AnimalState & {input:InputState;seenTick:number;pendingFire:boolean;whackStartTick:number;whackUntilTick:number};
type Shot={raft:number;phi:number;cant:number;dv:number;remaining:number;duration?:number};
export class Simulation {
  systems:RacingSystems;difficulty:Difficulty='chill';
  tick=0;
  readonly dt:number;readonly countdownTicks:number;
  readonly course:Course;readonly rafts:RaftState[]=[];readonly animals:Animal[]=[];shots:Shot[]=[];
  tickAverageMs=0;tickWorstMs=0;tickTotalMs=0;tickCount=0;
  botEscape=new Map<number,{until:number;dx:number;dy:number}>();
  botSeats=new Set<number>();botNext=new Map<number,number>();botProgress=new Map<number,{tick:number;progress:number}>();rngState:number;
  ended=false;winner:number|null=null;firstFinishTime:number|null=null;firstFinishTick:number|null=null;events:GameEvent[]=[];eventSeq=0;spikeLatch=new Set<RaftState>();
  constructor(readonly config:Config,readonly mode:Mode,public startServerTime=Date.now(),seed=config.simulation.default_seed,readonly raceId=`${startServerTime}-${seed}`,options:{characters?:Character[];difficulty?:Difficulty}={}){
    this.rngState=seed||config.simulation.default_seed;
    this.dt=1/config.network.sim_hz;this.countdownTicks=Math.round(config.rooms.countdown_s*config.network.sim_hz);this.course=new Course(config);
    const seats=mode==='1v1'?config.rooms.seats_1v1:config.rooms.seats_2v2;
    for(let i=0;i<2;i++){
      const pos=this.course.at(config.course.start_progress,(i===0?-1:1)*config.course.start_lateral_offset);
      this.rafts.push({height:0,vz:0,airTime:0,boost:0,turbo:0,turboMeter:0,item:null,bubble:false,slipstream:false,x:pos.x,y:pos.y,heading:pos.heading,vx:0,vy:config.simulation.initial_speed,omega:config.simulation.initial_omega,progress:config.course.start_progress,stun:0,slow:0,immunity:0,finishTime:null});
    }
    for(let seat=0;seat<seats;seat++)this.animals.push({character:options.characters?.[seat]??'hippo',heat:0,charge:0,stamina:config.characters.bear.stamina_s,lockout:0,pushing:false,stats:{thrusts:0,hits:0,blocks:0,close_calls:0,overheats:0},seat,raft:Math.floor(seat/(seats/2)),phi:mode==='1v1'?config.walking.initial_phi_1v1_deg:config.walking.initial_phi_2v2_deg[seat%(seats/2)],recharge:0,fire:false,walk:0,seq:-1,whackCount:0,input:{seq:-1,walk:0,fire:false,whackCount:0},seenTick:0,pendingFire:false,whackPhase:'idle',whackWindup:0,whackCooldown:0,whackStartTick:-Infinity,whackUntilTick:0});
    this.difficulty=options.difficulty??'chill';this.systems=new RacingSystems(this);
  }
  setBots(seats:number[]){this.botSeats=new Set(seats);}
  random(){let x=this.rngState;x^=x<<13;x^=x>>>17;x^=x<<5;this.rngState=x>>>0;return this.rngState/4294967296;}
  get phase():Snapshot['phase']{return this.ended?'results':this.tick<this.countdownTicks?'countdown':'race';}
  currentPhase():Snapshot['phase']{return this.phase;}
  get raceTime(){return Math.max(0,(this.tick-this.countdownTicks)*this.dt);}
  resetInput(seat:number){const a=this.animals[seat];if(a){a.input={seq:-1,walk:0,fire:false,whackCount:0};a.seq=-1;a.seenTick=this.tick;a.pendingFire=false;a.whackCount=0;}}
  release(seat:number){const a=this.animals[seat];if(a){a.input.fire=false;a.input.walk=0;a.pendingFire=false;}}
  input(seat:number,input:InputState){
    const a=this.animals[seat];if(!a||input.seq<=a.seq)return false;
    if(input.fire&&!a.input.fire)a.pendingFire=true;a.seq=input.seq;a.input={...input};a.seenTick=this.tick;return true;
  }
  step(){
    if(this.ended)return;this.tick++;if(this.tick<=this.countdownTicks)return;
    const beforeProgress=this.rafts.map(r=>r.progress);
    const c=this.config,dt=this.dt;
    this.systems.beginTick(dt);
    for(const raft of this.rafts){
      const wasStunned=raft.stun>0;raft.stun=Math.max(0,raft.stun-dt);
      if(raft.stun<c.simulation.epsilon)raft.stun=0;
      if(wasStunned&&raft.stun===0){raft.immunity=c.combat.immunity_s;this.spikeLatch.delete(raft);}else raft.immunity=Math.max(0,raft.immunity-dt);
      raft.slow=Math.max(0,raft.slow-dt);
    }
    for(const a of this.animals){
      a.whackCooldown=Math.max(0,a.whackCooldown-dt);if(a.whackCooldown<c.simulation.epsilon)a.whackCooldown=0;
      if(a.whackPhase==='cooldown'&&a.whackCooldown===0)a.whackPhase='idle';
      if(a.input.whackCount>a.whackCount){
        a.whackCount=a.input.whackCount;const raft=this.rafts[a.raft];
        if(raft.stun===0&&raft.finishTime===null&&a.whackPhase==='idle'){
          if(this.systems.throwLog(a))continue;this.systems.whackGate(a);a.whackPhase='windup';a.whackStartTick=this.tick;a.whackUntilTick=this.tick+Math.ceil(c.combat.whack_windup_s*c.network.sim_hz);a.whackWindup=(a.whackUntilTick-this.tick)*dt;this.emit('whack_windup',a.raft,a.seat);
        }
      }
    }
    // Process all starts before impacts: a parry on the final windup tick counts.
    for(const a of this.animals)if(a.whackPhase==='windup'){
      a.whackWindup=Math.max(0,(a.whackUntilTick-this.tick)*dt);
      if(this.tick<a.whackUntilTick)continue;
      const raft=this.rafts[a.raft],target=this.rafts[1-a.raft],dx=target.x-raft.x,dy=target.y-raft.y;
      const inReach=Math.hypot(dx,dy)<=c.combat.whack_reach&&Math.abs(wrap(Math.atan2(dx,dy)-raft.heading-rad(a.phi)))<=rad(c.combat.whack_arc_half_deg);
      if(raft.stun===0&&target.height===0&&target.finishTime===null&&inReach){
        const defender=this.animals.find(d=>d.raft!==a.raft&&d.whackStartTick>=a.whackStartTick&&d.whackStartTick<=this.tick);
        if(defender){defender.stats.blocks++;this.emit('block',defender.raft,defender.seat);if(c.combat.block_consumes_defender_swing)this.cooldownWhack(defender);}
        else if(target.immunity<=c.simulation.epsilon){this.emit('hit',1-a.raft,a.seat);this.systems.hit(1-a.raft,c.combat.hit_stun_s,c.combat.hit_slow_s,true,a.seat);}
        else this.emit('immune',1-a.raft,a.seat);
      }
      this.cooldownWhack(a);
    }
    for(const a of this.animals){
      if((this.tick-a.seenTick)*dt>c.network.stale_input_s)this.release(a.seat);
      const raft=this.rafts[a.raft];a.recharge=Math.max(0,a.recharge-dt);if(raft.finishTime!==null&&c.race.freeze_finished){a.pendingFire=false;a.fire=false;a.walk=0;continue;}a.fire=a.input.fire&&raft.stun===0;a.walk=raft.stun>0?0:a.input.walk;
      let phi=a.phi+a.walk*(this.mode==='1v1'?c.walking.speed_1v1_deg_s:c.walking.speed_2v2_deg_s)*(a.character==='frog'&&a.charge>0?c.characters.frog.walk_factor_while_charging:1)*dt;
      if(this.mode==='1v1')phi=((phi+180)%360+360)%360-180;
      else{
        const left=a.seat%2===0,zone=left?c.walking.zone_2v2_left_deg:c.walking.zone_2v2_right_deg;
        phi=clamp(phi,zone[0],zone[1]);const other=this.animals[a.seat+(left?1:-1)];
        const bound=360-c.walking.min_stern_gap_2v2_deg-Math.abs(other.phi);phi=left?Math.max(phi,-bound):Math.min(phi,bound);
      }
      a.phi=phi;
      this.systems.propel(a,dt);
      a.pendingFire=false;
    }
    for(const shot of this.shots){
      const r=this.rafts[shot.raft],portion=shot.dv*Math.min(dt,shot.remaining)/(shot.duration??c.firing.impulse_spread_s);
      const aim=r.heading+shot.phi+shot.cant,fx=-Math.sin(aim)*portion,fy=-Math.cos(aim)*portion;
      r.vx+=fx/c.raft.mass;r.vy+=fy/c.raft.mass;
      const rim=r.heading+shot.phi,rx=Math.sin(rim)*c.raft.rim_radius,ry=Math.cos(rim)*c.raft.rim_radius;
      // Clockwise compass heading: the clockwise cross product is ry*Fx-rx*Fy.
      r.omega+=(ry*fx-rx*fy)/(c.raft.inertia_factor*c.raft.radius**2);shot.remaining-=dt;
    }
    this.shots=this.shots.filter(s=>s.remaining>c.simulation.epsilon);
    for(const r of this.rafts){
      if(r.finishTime!==null&&c.race.freeze_finished)continue;
      const p=this.course.project(r.x,r.y),relax=1-Math.exp(-c.water.current_relax_rate*dt);
      const current=(r.slipstream?c.multipliers.current_slipstream:1)*(r.turbo>0?c.multipliers.current_turbo:1)*(c.release.shortcut&&r.progress>=c.shortcut.start_frac*c.course.length&&r.progress<=c.shortcut.end_frac*c.course.length&&Math.abs(p.lateral-c.shortcut.lateral)<c.shortcut.width/2?c.multipliers.current_shortcut:1);
      if(r.height===0){r.vx+=(p.tx*c.water.current_speed*current-r.vx)*relax;r.vy+=(p.ty*c.water.current_speed*current-r.vy)*relax;}
      if(r.height===0)r.omega*=Math.exp(-(r.stun>0?c.water.angular_damping_stunned:c.water.angular_damping)*dt);
      if(r.stun===0&&r.height===0)r.omega+=c.water.keel_gain*wrap(p.heading-r.heading)*dt;
      r.heading=wrap(r.heading+r.omega*dt);
      const speed=Math.hypot(r.vx,r.vy);if(r.height===0&&speed>c.water.speed_cap){r.vx*=c.water.speed_cap/speed;r.vy*=c.water.speed_cap/speed;}
      this.moveRaft(r,dt);r.progress=this.course.project(r.x,r.y).progress;
    }
    const [a,b]=this.rafts,dx=b.x-a.x,dy=b.y-a.y,d=Math.hypot(dx,dy),radius=c.raft.radius*2;
    if(a.height===0&&b.height===0&&a.finishTime===null&&b.finishTime===null&&d<radius&&d>c.simulation.epsilon){
      const nx=dx/d,ny=dy/d,overlap=(radius-d)/2;this.displaceRaft(a,-nx*overlap,-ny*overlap);this.displaceRaft(b,nx*overlap,ny*overlap);
      const rel=(b.vx-a.vx)*nx+(b.vy-a.vy)*ny;
      if(rel<0){const impulse=-(1+c.course.raft_raft_restitution)*rel/2;a.vx-=impulse*nx;a.vy-=impulse*ny;b.vx+=impulse*nx;b.vy+=impulse*ny;}
    }
    this.systems.afterStep(beforeProgress);
    const finish=this.course.at(c.course.length),last=this.course.segments.at(-1)!;
    const crossing:{index:number;fraction:number}[]=[];
    this.rafts.forEach((r,index)=>{
      if(r.finishTime!==null)return;
      const raw=r.progress>=c.course.length-c.simulation.epsilon?c.course.length+Math.max(0,(r.x-finish.x)*last.tx+(r.y-finish.y)*last.ty):r.progress;
      if(raw>=c.course.length-c.simulation.epsilon){
        crossing.push({index,fraction:clamp((c.course.length-beforeProgress[index])/Math.max(c.simulation.epsilon,raw-beforeProgress[index]),0,1)});
        r.finishTime=this.raceTime;r.progress=c.course.length;this.emit('finish',index,undefined,r.finishTime);
        if(c.race.freeze_finished){r.vx=0;r.vy=0;r.omega=0;}
      }
    });
    if(this.firstFinishTime===null&&crossing.length){crossing.sort((a,b)=>a.fraction-b.fraction||a.index-b.index);this.winner=crossing[0].index;this.firstFinishTime=this.raceTime;this.firstFinishTick=this.tick;}
    const graceEnded=this.firstFinishTick!==null&&this.tick-this.firstFinishTick>=Math.round(c.race.finish_grace_s*c.network.sim_hz);
    if(graceEnded||this.raceTime>=c.race.max_race_s){
      if(this.firstFinishTime===null){const difference=this.rafts[0].progress-this.rafts[1].progress;this.winner=Math.abs(difference)<c.simulation.epsilon?null:difference>0?0:1;}
      this.ended=true;
    }
    this.decideBots();this.events=this.events.filter(e=>(this.tick-e.tick)*this.dt<=c.network.event_repeat_s);
  }
  jump(raft:'red'|'blue'|'both',percent:number){
    if(this.phase!=='race'||this.firstFinishTime!==null)return false;
    const c=this.config;for(const[index,r]of this.rafts.entries()){
      if(raft!=='both'&&index!==(raft==='red'?0:1))continue;
      const progress=c.course.length*percent/100,p=this.course.at(progress,(index===0?-1:1)*c.course.start_lateral_offset),dir=this.course.project(p.x,p.y);
      Object.assign(r,p,{progress,vx:dir.tx*c.debug.jump_speed,vy:dir.ty*c.debug.jump_speed,omega:0,stun:0,slow:0,immunity:0});this.spikeLatch.delete(r);this.shots=this.shots.filter(s=>s.raft!==index);
    }return true;
  }
  cooldownWhack(a:Animal){a.whackPhase='cooldown';a.whackCooldown=this.config.combat.whack_cooldown_s;a.whackWindup=0;}
  stun(index:number,duration:number,slow=0){
    const r=this.rafts[index],c=this.config;r.stun=Math.min(c.combat.stun_max_s,r.stun+duration);r.slow=Math.max(r.slow,slow);
    for(const a of this.animals)if(a.raft===index){a.pendingFire=false;a.fire=false;a.walk=0;a.charge=0;if(a.whackPhase==='windup')this.cooldownWhack(a);}
    this.emit('stun',index,undefined,duration);
  }
  emit(type:string,raft:number,seat?:number,value?:number){const r=this.rafts[raft];this.events.push({id:++this.eventSeq,type,tick:this.tick,raft,seat,x:r.x,y:r.y,value});}
  decideBots(){
    if(this.config.release.phase===1){this.decideLegacyBots();return;}
    const c=this.config,b=c.bots,level=b.levels[this.difficulty];
    for(const seat of this.botSeats){
      const a=this.animals[seat],raft=this.rafts[a.raft];if(raft.finishTime!==null||this.tick<(this.botNext.get(seat)??0))continue;
      this.botNext.set(seat,this.tick+Math.round(level.decision_tick_s*c.network.sim_hz));
      // Bot takeover still owns an input stream while incapacitated. Release the
      // previous driver's held controls and resume decisions after recovery.
      if(raft.stun>0){this.input(seat,{seq:a.seq+1,walk:0,fire:false,whackCount:a.whackCount});continue;}
      const p=this.course.project(raft.x,raft.y);let lateral=0;
      for(const rock of this.course.rocks){
        if(rock.progress<p.progress||rock.progress>p.progress+b.lookahead)continue;
        const rockLateral=this.course.project(rock.x,rock.y).lateral,clearance=rock.radius+c.raft.radius+b.obstacle_clearance;
        if(Math.abs(rockLateral-lateral)<=clearance){const lo=-c.course.half_width+c.raft.radius+b.obstacle_clearance,hi=-lo,side=p.lateral>=rockLateral?1:-1,preferred=rockLateral+side*clearance,opposite=rockLateral-side*clearance;lateral=preferred>=lo&&preferred<=hi?preferred:clamp(opposite,lo,hi);}
      }
      const aim=this.course.at(Math.min(c.course.length,p.progress+b.lookahead),lateral);
      let dx=aim.x-raft.x,dy=aim.y-raft.y,length=Math.hypot(dx,dy)||1;
      dx=dx/length*level.target_speed-raft.vx;dy=dy/length*level.target_speed-raft.vy;
      const old=this.botProgress.get(seat);if(!old)this.botProgress.set(seat,{tick:this.tick,progress:p.progress});
      else if((this.tick-old.tick)*this.dt>=b.stuck_window_s){
        if(p.progress-old.progress<b.stuck_min_progress&&this.tick>=(this.botEscape.get(seat)?.until??-Infinity)+Math.round(b.stuck_window_s*c.network.sim_hz)){
          const escape=this.course.at(p.progress-b.lookahead/2,0);this.botEscape.set(seat,{until:this.tick+Math.round(b.stuck_window_s*c.network.sim_hz),dx:escape.x-raft.x,dy:escape.y-raft.y});
          let obstacle=this.course.rocks.reduce<{x:number;y:number;distance:number}|undefined>((best,rock)=>{const d=Math.hypot(raft.x-rock.x,raft.y-rock.y)-rock.radius;return !best||d<best.distance?{...rock,distance:d}:best;},undefined);
          if(obstacle&&obstacle.distance<c.raft.radius+b.obstacle_clearance){dx=raft.x-obstacle.x;dy=raft.y-obstacle.y;}
          else{dx=-p.ty*Math.sign(p.lateral)*level.target_speed;dy=p.tx*Math.sign(p.lateral)*level.target_speed+p.ty*c.water.current_speed;}
        }
        this.botProgress.set(seat,{tick:this.tick,progress:p.progress});
      }
      const escape=this.botEscape.get(seat);if(escape&&this.tick<escape.until){dx=escape.dx;dy=escape.dy;}
      length=Math.hypot(dx,dy)||1;dx/=length;dy/=length;
      const dv=this.mode==='1v1'?c.characters.hippo.dv_1v1*c.multipliers.impulse_1v1:c.characters.hippo.dv_2v2;
      const weight=Math.abs(raft.omega)>b.high_spin_threshold_rad_s?b.score_turn_weight_high_spin:b.score_turn_weight;
      const score=(phi:number)=>{
        const angle=rad(phi),cant=rad(-c.firing.general_cant_amplitude_deg*Math.sin(2*angle)),aim=raft.heading+angle+cant;
        const fx=-Math.sin(aim),fy=-Math.cos(aim),rim=raft.heading+angle;
        const dw=(Math.cos(rim)*fx-Math.sin(rim)*fy)*c.raft.rim_radius*dv/(c.raft.inertia_factor*c.raft.radius**2);
        return fx*dx+fy*dy-weight*(Math.abs(raft.omega+dw)-Math.abs(raft.omega));
      };
      const zone=this.mode==='1v1'?[-180,180]:a.seat%2===0?[c.walking.zone_2v2_left_deg[0]+b.stern_avoid_2v2_deg,c.walking.zone_2v2_left_deg[1]]:[c.walking.zone_2v2_right_deg[0],c.walking.zone_2v2_right_deg[1]-b.stern_avoid_2v2_deg];
      let best=a.phi,bestScore=-Infinity;for(let phi=zone[0];phi<=zone[1];phi+=b.candidate_step_deg){const value=score(phi);if(value>bestScore){best=phi;bestScore=value;}}
      const difference=this.mode==='1v1'?wrap(rad(best-a.phi))*180/Math.PI:best-a.phi;
      let walk=Math.abs(difference)<=b.walk_tolerance_deg?0:Math.sign(difference),fire=score(a.phi)>b.fire_threshold_hippo;
      if(this.random()<level.fumble){if(this.random()<b.fumble_walk_chance)walk=Math.floor(this.random()*3)-1;fire=false;}
      let whackCount=a.input.whackCount;
      const other=this.rafts[1-a.raft];
      if(Math.hypot(other.x-raft.x,other.y-raft.y)<=c.combat.whack_reach&&a.whackPhase==='idle'&&this.random()<level.whack_block_chance)whackCount++;
      if(a.character==='hippo'||a.character==='capybara'){if(a.heat>c.heat.warn_at)fire=false;}
      if(a.character==='frog')fire=a.charge<(b.frog_release_min_s+(b.frog_release_max_s-b.frog_release_min_s)*this.random())/c.characters.frog.charge_time_s&&bestScore>b.frog_charge_threshold;
      if(a.character==='bear')fire=fire&&a.stamina>b.bear_min_stamina_s;
      this.input(seat,{seq:a.seq+1,walk,fire,whackCount});
    }
  }
  decideLegacyBots(){
    const c=this.config,b=c.bots,level=b.levels.chill;
    for(const seat of this.botSeats){
      const a=this.animals[seat],raft=this.rafts[a.raft];if(raft.finishTime!==null||this.tick<(this.botNext.get(seat)??0))continue;
      this.botNext.set(seat,this.tick+Math.round(level.decision_tick_s*c.network.sim_hz));
      // Bot takeover still owns an input stream while incapacitated. Release the
      // previous driver's held controls and resume decisions after recovery.
      if(raft.stun>0){this.input(seat,{seq:a.seq+1,walk:0,fire:false,whackCount:a.whackCount});continue;}
      const p=this.course.project(raft.x,raft.y);let lateral=0;
      for(const rock of this.course.rocks){
        if(rock.progress<p.progress||rock.progress>p.progress+b.lookahead)continue;
        const rockLateral=this.course.project(rock.x,rock.y).lateral,clearance=rock.radius+c.raft.radius+b.obstacle_clearance;
        if(Math.abs(rockLateral-lateral)<clearance)lateral=clamp(rockLateral+(p.lateral>=rockLateral?1:-1)*clearance,-c.course.half_width+c.raft.radius+b.obstacle_clearance,c.course.half_width-c.raft.radius-b.obstacle_clearance);
      }
      const aim=this.course.at(Math.min(c.course.length,p.progress+b.lookahead),lateral);
      let dx=aim.x-raft.x,dy=aim.y-raft.y,length=Math.hypot(dx,dy)||1;
      dx=dx/length*level.target_speed-raft.vx;dy=dy/length*level.target_speed-raft.vy;
      const old=this.botProgress.get(seat);if(!old)this.botProgress.set(seat,{tick:this.tick,progress:p.progress});
      else if((this.tick-old.tick)*this.dt>=b.stuck_window_s){
        if(p.progress-old.progress<b.stuck_min_progress){
          let obstacle=this.course.rocks.reduce<{x:number;y:number;distance:number}|undefined>((best,rock)=>{const d=Math.hypot(raft.x-rock.x,raft.y-rock.y)-rock.radius;return !best||d<best.distance?{...rock,distance:d}:best;},undefined);
          if(obstacle&&obstacle.distance<c.raft.radius+b.obstacle_clearance){dx=raft.x-obstacle.x;dy=raft.y-obstacle.y;}
          else{dx=-p.ty*Math.sign(p.lateral)*level.target_speed;dy=p.tx*Math.sign(p.lateral)*level.target_speed+p.ty*c.water.current_speed;}
        }
        this.botProgress.set(seat,{tick:this.tick,progress:p.progress});
      }
      length=Math.hypot(dx,dy)||1;dx/=length;dy/=length;
      const dv=this.mode==='1v1'?c.characters.hippo.dv_1v1*c.multipliers.impulse_1v1:c.characters.hippo.dv_2v2;
      const weight=Math.abs(raft.omega)>b.high_spin_threshold_rad_s?b.score_turn_weight_high_spin:b.score_turn_weight;
      const score=(phi:number)=>{
        const angle=rad(phi),cant=rad(-c.firing.general_cant_amplitude_deg*Math.sin(2*angle)),aim=raft.heading+angle+cant;
        const fx=-Math.sin(aim),fy=-Math.cos(aim),rim=raft.heading+angle;
        const dw=(Math.cos(rim)*fx-Math.sin(rim)*fy)*c.raft.rim_radius*dv/(c.raft.inertia_factor*c.raft.radius**2);
        return fx*dx+fy*dy-weight*(Math.abs(raft.omega+dw)-Math.abs(raft.omega));
      };
      const zone=this.mode==='1v1'?[-180,180]:a.seat%2===0?[c.walking.zone_2v2_left_deg[0]+b.stern_avoid_2v2_deg,c.walking.zone_2v2_left_deg[1]]:[c.walking.zone_2v2_right_deg[0],c.walking.zone_2v2_right_deg[1]-b.stern_avoid_2v2_deg];
      let best=a.phi,bestScore=-Infinity;for(let phi=zone[0];phi<=zone[1];phi+=b.candidate_step_deg){const value=score(phi);if(value>bestScore){best=phi;bestScore=value;}}
      const difference=this.mode==='1v1'?wrap(rad(best-a.phi))*180/Math.PI:best-a.phi;
      let walk=Math.abs(difference)<=b.walk_tolerance_deg?0:Math.sign(difference),fire=score(a.phi)>b.fire_threshold_hippo;
      if(this.random()<level.fumble){if(this.random()<b.fumble_walk_chance)walk=Math.floor(this.random()*3)-1;fire=false;}
      let whackCount=a.input.whackCount;
      const other=this.rafts[1-a.raft];
      if(Math.hypot(other.x-raft.x,other.y-raft.y)<=c.combat.whack_reach&&a.whackPhase==='idle'&&this.random()<level.whack_block_chance)whackCount++;
      this.input(seat,{seq:a.seq+1,walk,fire,whackCount});
    }
  }
  /** Swept movement spends only this tick's travel budget; never reprojects position to a centreline. */
  moveRaft(r:RaftState,dt:number){
    const c=this.config;let remaining=dt;
    for(let i=0;i<c.simulation.collision_iterations&&remaining>c.simulation.epsilon;i++){
      const dx=r.vx*remaining,dy=r.vy*remaining;
      const hit=sweepCircle(r,dx,dy,c.raft.radius,r.height>0?this.course.banks:this.systems.walls,r.height>0?[]:this.course.rocks,c.simulation.epsilon);
      if(!hit){r.x+=dx;r.y+=dy;break;}
      r.x+=dx*hit.time;r.y+=dy*hit.time;remaining*=1-hit.time;
      const into=r.vx*hit.nx+r.vy*hit.ny;
      r.vx-=(1+c.course.bank_restitution)*into*hit.nx;r.vy-=(1+c.course.bank_restitution)*into*hit.ny;
      if(hit.side)this.bankSpike(r,hit.side);
      // If the contact budget is exhausted, stop at the last valid position.
    }
  }
  /** Collision-induced separation is also clipped against walls/rocks. */
  displaceRaft(r:RaftState,dx:number,dy:number){
    const c=this.config,hit=sweepCircle(r,dx,dy,c.raft.radius,r.height>0?this.course.banks:this.systems.walls,r.height>0?[]:this.course.rocks,c.simulation.epsilon),t=hit?.time??1;
    r.x+=dx*t;r.y+=dy*t;
  }
  bankSpike(r:RaftState,side:number){
    const c=this.config,p=this.course.project(r.x,r.y);
    if(r.bubble){r.bubble=false;this.emit('bubble_block',this.rafts.indexOf(r));return;}
    if(r.height===0&&!this.spikeLatch.has(r)&&c.course.spike_zones.some(([fraction,length,bank])=>bank===side&&Math.abs(p.progress-fraction*c.course.length)<=length/2)){
      this.spikeLatch.add(r);this.stun(this.rafts.indexOf(r),c.course.spike_stun_s);r.vx*=c.course.spike_speed_factor;r.vy*=c.course.spike_speed_factor;
    }
  }
  // Direct overlap helpers support deliberately invalid test fixtures. Normal
  // gameplay never calls these: movement and separation are swept above.
  collideBanks(r:RaftState){
    const c=this.config,p=this.course.project(r.x,r.y),limit=c.course.half_width-c.raft.radius;
    if(Math.abs(p.lateral)<=limit)return;
    // Translate only along the bank normal. Reconstructing from p.x/p.y
    // erased tangential distance whenever the projection hit a segment endpoint.
    const sign=Math.sign(p.lateral),penetration=Math.abs(p.lateral)-limit;
    r.x-=p.ty*sign*penetration;r.y+=p.tx*sign*penetration;
    const outward=(r.vx*p.ty-r.vy*p.tx)*sign;
    if(outward>0){r.vx-=(1+c.course.bank_restitution)*outward*p.ty*sign;r.vy+=(1+c.course.bank_restitution)*outward*p.tx*sign;}
    if(!this.spikeLatch.has(r)&&c.course.spike_zones.some(([fraction,length,bank])=>bank===sign&&Math.abs(p.progress-fraction*c.course.length)<=length/2)){
      this.spikeLatch.add(r);this.stun(this.rafts.indexOf(r),c.course.spike_stun_s);r.vx*=c.course.spike_speed_factor;r.vy*=c.course.spike_speed_factor;
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
    return {world:{crates:this.systems.crates.map(n=>q(n,this.config.network.time_quantum_s)),projectiles:this.systems.projectiles.map(p=>({x:q(p.x,n.position_quantum),y:q(p.y,n.position_quantum),raft:p.raft})),gateOpen:q(this.systems.gateOpen,n.time_quantum_s)},raceId:this.raceId,events:this.events.map(e=>({...e,x:q(e.x,n.position_quantum),y:q(e.y,n.position_quantum)})),winner:this.winner,firstFinishTime:this.firstFinishTime===null?null:q(this.firstFinishTime,n.time_quantum_s),tick:this.tick,raceTime:q(this.raceTime,n.time_quantum_s),phase:this.phase,startServerTime:this.startServerTime,serverTime:Date.now(),tickAverageMs:q(this.tickAverageMs,this.config.visuals.tick_time_quantum_ms),tickWorstMs:q(this.tickWorstMs,this.config.visuals.tick_time_quantum_ms),
      rafts:this.rafts.map(r=>({...r,height:q(r.height,n.position_quantum),vz:q(r.vz,n.velocity_quantum),stun:q(r.stun,n.time_quantum_s),slow:q(r.slow,n.time_quantum_s),immunity:q(r.immunity,n.time_quantum_s),boost:q(r.boost,n.time_quantum_s),turbo:q(r.turbo,n.time_quantum_s),turboMeter:q(r.turboMeter,n.time_quantum_s),x:q(r.x,n.position_quantum),y:q(r.y,n.position_quantum),heading:q(r.heading,rad(n.angle_quantum_deg)),vx:q(r.vx,n.velocity_quantum),vy:q(r.vy,n.velocity_quantum),progress:q(r.progress,n.position_quantum),finishTime:r.finishTime===null?null:q(r.finishTime,n.time_quantum_s)})),
      animals:this.animals.map(({input,seenTick,pendingFire,whackStartTick,whackUntilTick,...a})=>({...a,stats:{...a.stats},heat:q(a.heat,n.time_quantum_s),charge:q(a.charge,n.time_quantum_s),stamina:q(a.stamina,n.time_quantum_s),lockout:q(a.lockout,n.time_quantum_s),recharge:q(a.recharge,n.time_quantum_s),whackWindup:q(a.whackWindup,n.time_quantum_s),whackCooldown:q(a.whackCooldown,n.time_quantum_s),phi:q(a.phi,n.angle_quantum_deg)}))};
  }
}

