import * as THREE from 'three';
import type {Config,GameEvent,Snapshot} from '../shared.ts';
export class RaceEffects {
  trailTime=0;
  particles:{mesh:THREE.Mesh;vx:number;vy:number;vz:number;left:number}[]=[];geometry=new THREE.IcosahedronGeometry(1,0);
  constructor(readonly scene:THREE.Scene,readonly config:Config){}
  burst(e:GameEvent,state:Snapshot,low:boolean){const v=this.config.visuals,a=state.animals.find(a=>a.seat===e.seat),r=state.rafts[e.raft];if(!r)return;
    const shot=e.type==='shot',count=low?Math.ceil(v.particle_per_shot/3):v.particle_per_shot;if(!shot&&!['hit','block','stun','chomp','landing','pickup_speed','pickup_log','pickup_bubble','turbo_start'].includes(e.type))return;
    const color=e.type==='turbo_start'?'#ff76bf':shot?v.effect_colors[a?.character??'hippo']:e.type==='hit'?'#ffd34e':v.foam_color,phi=(a?.phi??180)*Math.PI/180+r.heading;
    for(let n=0;n<count&&this.particles.length<v.max_particles;n++){
      const mat=new THREE.MeshToonMaterial({color,transparent:true,opacity:.85}),mesh=new THREE.Mesh(this.geometry,mat),spread=(Math.random()-.5)*Math.PI;
      mesh.scale.setScalar(v.particle_size*(.5+Math.random()));mesh.position.set(e.x+Math.sin(phi)*this.config.raft.rim_radius,v.raft_height+r.height,-e.y-Math.cos(phi)*this.config.raft.rim_radius);this.scene.add(mesh);
      this.particles.push({mesh,vx:Math.sin(phi+spread)*v.particle_speed,vy:v.particle_speed*(.3+Math.random()),vz:-Math.cos(phi+spread)*v.particle_speed,left:v.particle_life_s});
    }
  }
  continuous(state:Snapshot,dt:number,low:boolean){this.trailTime+=dt;if(this.trailTime<this.config.visuals.particle_life_s/this.config.visuals.particle_per_shot)return;this.trailTime=0;for(const a of state.animals)if(a.pushing){const r=state.rafts[a.raft];this.burst({id:0,type:'shot',tick:state.tick,raft:a.raft,seat:a.seat,x:r.x,y:r.y},state,low);}for(const [i,r]of state.rafts.entries())if(r.turbo>0)this.burst({id:0,type:'turbo_start',tick:state.tick,raft:i,x:r.x,y:r.y},state,low);}
  update(dt:number){const life=this.config.visuals.particle_life_s;this.particles=this.particles.filter(p=>{p.left-=dt;if(p.left<=0){this.scene.remove(p.mesh);(p.mesh.material as THREE.Material).dispose();return false;}p.mesh.position.x+=p.vx*dt;p.mesh.position.z+=p.vz*dt;p.mesh.position.y+=p.vy*dt;p.vy-=this.config.ramp.gravity*dt*.2;p.mesh.scale.multiplyScalar(1+dt);(p.mesh.material as THREE.MeshToonMaterial).opacity=Math.max(0,p.left/life)*.8;return true;});}
  dispose(){for(const p of this.particles){this.scene.remove(p.mesh);(p.mesh.material as THREE.Material).dispose();}this.geometry.dispose();}
}
