import type {Simulation} from './simulation.ts';
import type {Character,Difficulty,Item,RaftState} from '../shared.ts';
import {clamp,rad,wrap} from './course.ts';
import type {Wall} from './sweep.ts';
type Animal=Simulation['animals'][number];
export class RacingSystems {
  crates:number[];projectiles:{x:number;y:number;vx:number;vy:number;raft:number;seat:number;left:number}[]=[];
  gateOpen=0;gatePinned=[0,0];gateHint=[0,0];ramped=new Set<number>();crocCooldown:number[][]=[];
  bearSyncUntil=new Map<number,number>();lastShots=new Map<number,{time:number;phi:number}>();bearTime=new Map<number,number>();fullHold=new Map<number,number>();lastHeld=new Map<number,boolean>();hot=new Set<number>();lastThrust=new Map<number,number>();closeSeen=new Set<string>();shortcutBots=new Map<number,boolean>();
  logs:Wall[]=[];readonly config;readonly course;
  constructor(readonly sim:Simulation){this.config=sim.config;this.course=sim.course;this.crates=this.config.course.crate_positions.map(()=>0);
    const c=this.config;this.logs=c.course.log_positions.map(([f,lat])=>{const p=this.course.at(f*c.course.length,lat),dx=Math.cos(p.heading)*(c.course.floating_log_length-c.course.floating_log_width)/2,dy=-Math.sin(p.heading)*(c.course.floating_log_length-c.course.floating_log_width)/2;return{a:{x:p.x-dx,y:p.y-dy},b:{x:p.x+dx,y:p.y+dy},padding:c.course.floating_log_width/2,side:0};});
    this.crocCooldown=c.crocodiles.positions_frac.map(()=>[0,0]);
  }
  get gate(){const c=this.config;return this.course.at(c.shortcut.start_frac*c.course.length,c.shortcut.lateral);}
  get walls(){if(this.config.release.phase===1)return this.course.banks;const walls=[...this.course.banks,...this.logs];if(this.config.release.shortcut&&this.gateOpen<=0){const p=this.gate,d=this.config.shortcut.width/2;walls.push({a:{x:p.x-Math.cos(p.heading)*d,y:p.y+Math.sin(p.heading)*d},b:{x:p.x+Math.cos(p.heading)*d,y:p.y-Math.sin(p.heading)*d},padding:this.config.course.floating_log_width/2,side:0});}return walls;}
  multiplier(r:RaftState){const m=this.config.multipliers;return (r.slow>0?m.thrust_slow:1)*(r.boost>0?m.thrust_boost:1)*(r.slipstream?m.thrust_slipstream:1)*(r.turbo>0?m.thrust_turbo:1);}
  beginTick(dt:number){const c=this.config;if(c.release.phase===1)return;this.gateOpen=Math.max(0,this.gateOpen-dt);this.crates=this.crates.map(n=>Math.max(0,n-dt));
    for(const [i,r]of this.sim.rafts.entries()){
      const behind=this.sim.rafts[1-i].progress-r.progress;r.slipstream=behind>=c.slipstream.min_behind&&behind<=c.slipstream.max_behind;
      r.boost=Math.max(0,r.boost-dt);r.turbo=Math.max(0,r.turbo-dt);
      if(c.release.turbo&&!(r.turboMeter>=1&&c.turbo.pause_decay_when_full))r.turboMeter=Math.max(0,r.turboMeter-c.turbo.decay_per_s*dt);
      if(r.height>0){r.airTime+=dt;r.height+=r.vz*dt;r.vz-=c.ramp.gravity*dt;if(r.height<=0){r.height=0;r.vz=0;this.sim.emit('landing',i,undefined,r.airTime);}}
      if(r.height===0)for(const [f,lat]of c.course.whirlpool_positions){const p=this.course.at(f*c.course.length,lat);if(Math.hypot(r.x-p.x,r.y-p.y)<c.course.whirlpool_radius){r.omega+=c.course.whirlpool_spin_rad_s2*dt;r.vx*=Math.exp(-c.course.whirlpool_drag_per_s*dt);r.vy*=Math.exp(-c.course.whirlpool_drag_per_s*dt);}}
    }
  }
  shot(a:Animal,dv:number,duration=this.config.firing.impulse_spread_s,record=true){const c=this.config,r=this.sim.rafts[a.raft],time=this.sim.raceTime;let multiplier=this.multiplier(r);const prev=this.lastShots.get(a.raft);
    if(record&&c.release.turbo){
      const pair=prev&&time-prev.time<=c.turbo.trigger_window_s&&Math.sign(a.phi)!==Math.sign(prev.phi);
      if(r.turboMeter>=1&&(this.sim.mode==='1v1'||pair)){const starting=r.turbo<=0;r.turbo=c.turbo.duration_s;r.turboMeter=0;this.sim.emit('turbo_start',a.raft);if(starting)multiplier*=c.multipliers.thrust_turbo;}
      else if(this.sim.mode==='1v1')r.turboMeter=Math.min(1,r.turboMeter+dv/c.turbo.fill_dv_divisor_1v1);
      else if(pair&&time-prev.time<=c.firing.sync_window_s){multiplier*=1+c.multipliers.thrust_sync_bonus;if(a.character==='bear')this.bearSyncUntil.set(a.seat,time+c.firing.bear_sync_bonus_window_s);r.turboMeter=Math.min(1,r.turboMeter+c.turbo.fill_per_sync_pair_2v2);this.sim.emit('sync',a.raft,a.seat);}
      if(r.turboMeter>=1)this.sim.emit('turbo_ready',a.raft);
    }
    if(!record&&a.character==='bear'&&(this.bearSyncUntil.get(a.seat)??0)>time)multiplier*=1+c.multipliers.thrust_sync_bonus;
    const cant=a.character==='capybara'?(a.phi===-180||a.phi===180?1:Math.sign(a.phi))*(this.sim.mode==='1v1'?c.characters.capybara.cant_deg_1v1:c.characters.capybara.cant_deg_2v2):-c.firing.general_cant_amplitude_deg*Math.sin(2*rad(a.phi));
    this.sim.shots.push({raft:a.raft,phi:rad(a.phi),cant:rad(cant),dv:dv*multiplier,remaining:duration,duration});
    if(record){if(a.character!=='bear')a.stats.thrusts++;this.lastThrust.set(a.seat,time);this.lastShots.set(a.raft,{time,phi:a.phi});this.sim.emit('shot',a.raft,a.seat);}
  }
  overheat(a:Animal){a.lockout=this.config.heat.overheat_lockout_s;a.stats.overheats++;this.hot.add(a.seat);this.sim.emit('overheat',a.raft,a.seat);}
  propel(a:Animal,dt:number){const c=this.config;
    if(c.release.phase===1){if((a.fire||a.pendingFire)&&this.sim.rafts[a.raft].stun===0&&a.recharge<=c.simulation.epsilon){this.shot(a,this.sim.mode==='1v1'?c.characters.hippo.dv_1v1*c.multipliers.impulse_1v1:c.characters.hippo.dv_2v2);a.recharge=this.sim.mode==='1v1'?c.characters.hippo.recharge_s_1v1:c.characters.hippo.recharge_s_2v2;}return;}
    const r=this.sim.rafts[a.raft],held=a.input.fire,valid=r.stun===0&&r.finishTime===null;a.lockout=Math.max(0,a.lockout-dt);a.pushing=false;
    const previous=this.lastHeld.get(a.seat)??false;this.lastHeld.set(a.seat,held);
    if(!held){a.heat=Math.max(0,a.heat-c.heat.cool_rate_per_s*dt);if(a.heat<1)this.hot.delete(a.seat);}
    if(!valid){a.charge=0;return;}
    if(a.character==='frog'){
      if(held&&a.lockout===0&&a.recharge===0){a.charge=Math.min(1,a.charge+dt/c.characters.frog.charge_time_s);if(a.charge>=1){const full=(this.fullHold.get(a.seat)??0)+dt;this.fullHold.set(a.seat,full);a.heat=Math.min(1,full/c.heat.frog_overheat_full_charge_hold_s);if(full>=c.heat.frog_overheat_full_charge_hold_s){a.charge=0;this.fullHold.set(a.seat,0);this.overheat(a);}}}
      if(!held){if((previous&&a.charge>0||a.pendingFire)&&a.lockout===0&&a.recharge===0){const f=c.characters.frog,max=this.sim.mode==='1v1'?f.dv_max_1v1:f.dv_max_2v2;this.shot(a,(f.dv_min+(max-f.dv_min)*a.charge)*(this.sim.mode==='1v1'?c.multipliers.impulse_1v1:1));a.recharge=this.sim.mode==='1v1'?f.recharge_s_1v1:f.recharge_s_2v2;}a.charge=0;this.fullHold.set(a.seat,0);}
      return;
    }
    if(a.character==='bear'){
      const b=c.characters.bear;
      if(held&&a.lockout===0&&a.stamina>0){const was=this.bearTime.get(a.seat)??0;this.shot(a,(this.sim.mode==='1v1'?b.dv_per_s_1v1*c.multipliers.impulse_1v1:b.dv_per_s_2v2)*dt,dt,was===0);this.bearTime.set(a.seat,was+dt);a.pushing=true;a.stamina=Math.max(0,a.stamina-dt);if(Math.floor((was+dt)/b.thrust_stat_every_s)>Math.floor(was/b.thrust_stat_every_s))a.stats.thrusts++;
        if(a.stamina<=c.simulation.epsilon){a.stamina=0;a.lockout=b.empty_lockout_s;a.stats.overheats++;this.sim.emit('tired',a.raft,a.seat);}}
      else{a.stamina=Math.min(b.stamina_s,a.stamina+b.stamina_refill_per_s*dt);this.bearTime.set(a.seat,0);}return;
    }
    if(held){const seconds=a.character==='hippo'?c.heat.hippo_overheat_hold_s:c.heat.capybara_overheat_hold_s;a.heat=Math.min(1,a.heat+dt/seconds);if(a.heat>=1-c.simulation.epsilon&&!this.hot.has(a.seat))this.overheat(a);}
    if((a.fire||a.pendingFire)&&a.lockout===0&&a.heat<1&&a.recharge<=c.simulation.epsilon){const ch=c.characters[a.character];this.shot(a,(this.sim.mode==='1v1'?ch.dv_1v1*c.multipliers.impulse_1v1:ch.dv_2v2));a.recharge=this.sim.mode==='1v1'?ch.recharge_s_1v1:ch.recharge_s_2v2;}
  }
  odds(index:number){const behind=this.sim.rafts[1-index].progress-this.sim.rafts[index].progress,c=this.config.pickups;return behind>c.catchup_behind_distance?c.odds_trailing_far:behind<0?c.odds_leader:c.odds_neutral;}
  pickup(index:number,item?:Item){const r=this.sim.rafts[index];if(!item){const roll=this.sim.random(),odds=this.odds(index);item=roll<odds.speed?'speed':roll<odds.speed+odds.log?'log':'bubble';}if(item==='speed')r.boost=this.config.pickups.speed_boost_s;else if(item==='bubble')r.bubble=true;else r.item='log';this.sim.emit('pickup_'+item,index);}
  hit(index:number,duration:number,slow=0,immune=false,attacker?:number){const r=this.sim.rafts[index];if(r.height>0||r.finishTime!==null)return false;if(r.bubble){r.bubble=false;this.sim.emit('bubble_block',index);return false;}if(immune&&r.immunity>0){this.sim.emit('immune',index);return false;}this.sim.stun(index,duration,slow);if(attacker!==undefined)this.sim.animals[attacker].stats.hits++;return true;}
  throwLog(a:Animal){const r=this.sim.rafts[a.raft],c=this.config;if(r.item!=='log')return false;const rival=this.sim.rafts[1-a.raft],near=Math.hypot(rival.x-r.x,rival.y-r.y)<=c.pickups.log_throw_range,dir=near?Math.atan2(rival.x-r.x,rival.y-r.y):this.course.project(r.x,r.y).heading;r.item=null;this.projectiles.push({x:r.x,y:r.y,vx:Math.sin(dir)*c.pickups.log_throw_speed,vy:Math.cos(dir)*c.pickups.log_throw_speed,raft:a.raft,seat:a.seat,left:c.pickups.log_throw_range});this.sim.emit('log_throw',a.raft,a.seat);return true;}
  whackGate(a:Animal){if(!this.config.release.shortcut)return;const r=this.sim.rafts[a.raft],g=this.gate;if(Math.hypot(r.x-g.x,r.y-g.y)<=this.config.combat.whack_reach){this.gateOpen=this.config.shortcut.gate_open_s;this.gatePinned=[0,0];this.sim.emit('gate_open',a.raft,a.seat);}}
  afterStep(beforeProgress:number[]){const c=this.config,dt=this.sim.dt;if(c.release.phase===1)return;
    for(const p of this.projectiles){const ox=p.x,oy=p.y;p.x+=p.vx*dt;p.y+=p.vy*dt;p.left-=Math.hypot(p.vx,p.vy)*dt;const r=this.sim.rafts[1-p.raft],dx=p.x-ox,dy=p.y-oy,t=clamp(((r.x-ox)*dx+(r.y-oy)*dy)/(dx*dx+dy*dy),0,1);if(Math.hypot(r.x-ox-dx*t,r.y-oy-dy*t)<c.raft.radius+c.pickups.projectile_radius){this.hit(1-p.raft,c.combat.hit_stun_s,c.combat.hit_slow_s,true,p.seat);p.left=0;}}
    this.projectiles=this.projectiles.filter(p=>p.left>0);
    for(const [i,r]of this.sim.rafts.entries()){
      if(r.finishTime!==null||r.height>0)continue;
      c.course.crate_positions.forEach(([f,lat],j)=>{if(this.crates[j]>0)return;const p=this.course.at(f*c.course.length,lat);if(Math.hypot(r.x-p.x,r.y-p.y)<c.raft.radius+c.pickups.crate_radius){this.pickup(i);this.crates[j]=c.pickups.respawn_s;}});
      if(c.release.crocodiles)c.crocodiles.positions_frac.forEach((f,j)=>{const lat=c.crocodiles.sweep_frac_of_half_width*c.course.half_width*Math.sin(2*Math.PI*this.sim.raceTime/c.crocodiles.periods_s[j]),p=this.course.at(f*c.course.length,lat);if(this.sim.raceTime>=this.crocCooldown[j][i]&&Math.hypot(r.x-p.x,r.y-p.y)<c.raft.radius+c.crocodiles.collision_radius){this.crocCooldown[j][i]=this.sim.raceTime+c.crocodiles.cooldown_per_raft_s;if(this.hit(i,c.crocodiles.chomp_stun_s,c.crocodiles.chomp_slow_s)){r.vx-=Math.sin(p.heading)*c.crocodiles.knockback_speed;r.vy-=Math.cos(p.heading)*c.crocodiles.knockback_speed;}this.sim.emit('chomp',i);}});
      if(c.release.ramp&&!this.ramped.has(i)&&beforeProgress[i]<c.ramp.position_frac*c.course.length&&r.progress>=c.ramp.position_frac*c.course.length&&Math.abs(this.course.project(r.x,r.y).lateral)<=c.ramp.width/2){this.ramped.add(i);const dir=this.course.project(r.x,r.y),speed=r.vx*dir.tx+r.vy*dir.ty;if(speed>c.ramp.launch_min_speed){r.height=c.simulation.epsilon;r.airTime=0;r.vz=c.ramp.launch_vz_base+c.ramp.launch_vz_per_speed*speed;r.vx*=c.ramp.launch_speed_mult;r.vy*=c.ramp.launch_speed_mult;this.sim.emit('launch',i);}else{r.vx*=c.ramp.too_slow_speed_mult;r.vy*=c.ramp.too_slow_speed_mult;this.sim.emit('too_slow',i);}}
      if(c.release.shortcut&&this.gateOpen===0&&Math.hypot(r.x-this.gate.x,r.y-this.gate.y)<c.raft.radius+c.shortcut.gate_radius){this.gatePinned[i]+=dt;this.gateHint[i]+=dt;if(this.gateHint[i]>=c.shortcut.gate_hint_interval_s){this.gateHint[i]=0;this.sim.emit('gate_hint',i);}if(this.gatePinned[i]>=c.shortcut.gate_give_way_s){this.gateOpen=c.shortcut.gate_open_s;this.sim.emit('gate_open',i);}}else this.gatePinned[i]=0;
      if(c.release.awards){for(const [j,rock]of this.course.rocks.entries()){const d=Math.hypot(r.x-rock.x,r.y-rock.y)-rock.radius-c.raft.radius,key=i+':'+j;if(d>0&&d<c.stats.close_call_margin&&!this.closeSeen.has(key)){this.closeSeen.add(key);const a=this.sim.animals.filter(a=>a.raft===i&&this.sim.raceTime-(this.lastThrust.get(a.seat)??-Infinity)<=c.stats.close_call_credit_s).sort((a,b)=>(this.lastThrust.get(b.seat)??0)-(this.lastThrust.get(a.seat)??0))[0];if(a){a.stats.close_calls++;this.sim.emit('close_call',i,a.seat);}}}}
    }
  }
}
