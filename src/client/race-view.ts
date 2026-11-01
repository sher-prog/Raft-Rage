import {makeCharacter} from './characters.ts';
import {RaceEffects} from './effects.ts';
import * as THREE from 'three';
import type {Config,Snapshot,RaftState,GameEvent} from '../shared.ts';
import {Course,rad,wrap} from '../game/course.ts';
export class RaceView {
  effects:RaceEffects;worldMeshes:THREE.Object3D[]=[];crateMeshes:THREE.Group[]=[];whirlMeshes:THREE.Group[]=[];
  renderer:THREE.WebGLRenderer;scene=new THREE.Scene();camera:THREE.PerspectiveCamera;
  cameraDirection=new THREE.Vector2(0,1);
  stunLabels:HTMLDivElement[]=[];
  rafts:THREE.Group[]=[];animals:THREE.Group[]=[];stars:THREE.Group[]=[];swings:THREE.Mesh[]=[];
  course:Course;resize:ResizeObserver;cameraReady=false;fps=0;frames=0;sample=0;fpsSampleStart=performance.now();lowSeconds=0;lowEffects=false;reduceMotion=false;
  constructor(readonly container:HTMLElement,readonly config:Config,readonly onAutoLow:()=>void=()=>{}){
    const v=config.visuals;this.course=new Course(config);this.effects=new RaceEffects(this.scene,config);
    this.renderer=new THREE.WebGLRenderer({antialias:false,alpha:false,powerPreference:'low-power'});
    this.renderer.setPixelRatio(Math.min(devicePixelRatio,v.max_pixel_ratio));this.renderer.setClearColor(v.sky_color);
    container.append(this.renderer.domElement);this.scene.fog=new THREE.Fog(v.sky_color,v.fog_near,v.fog_far);
    this.camera=new THREE.PerspectiveCamera(v.camera_fov_deg,1,v.camera_near,v.camera_far);
    this.scene.add(new THREE.AmbientLight(0xffffff,v.ambient_light));const sun=new THREE.DirectionalLight(0xffffff,v.sun_light);sun.position.set(...v.sun_position as [number,number,number]);this.scene.add(sun);
    const mat=(color:THREE.ColorRepresentation)=>new THREE.MeshToonMaterial({color});
    const ground=new THREE.Mesh(new THREE.PlaneGeometry(v.ground_half_size*2,v.ground_half_size*2),mat(v.ground_color));ground.rotation.x=-Math.PI/2;ground.position.y=-v.river_depth;this.scene.add(ground);
    // A continuous mitered river ribbon and matching bank strips.
    const sections=this.course.segments;
    const strip=(inner:number,outer:number,color:string,height:number)=>{
      const vertices:number[]=[],inside=this.course.bankPoints(inner),outside=this.course.bankPoints(outer);
      for(let i=0;i<sections.length;i++){
        const a=inside[i],b=outside[i],d=inside[i+1],e=outside[i+1];
        for(const p of [a,b,d,b,e,d])vertices.push(p.x,height,-p.y);
      }
      const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));geometry.computeVertexNormals();const m=mat(color);m.side=THREE.DoubleSide;this.scene.add(new THREE.Mesh(geometry,m));
    };
    strip(-config.course.half_width,config.course.half_width,v.river_color,0);
    for(const sign of [-1,1])strip(sign*config.course.half_width,sign*(config.course.half_width+v.bank_width),v.bank_color,v.bank_height);
    for(const rock of this.course.rocks){const mesh=new THREE.Mesh(new THREE.DodecahedronGeometry(rock.radius,0),mat(v.rock_color));mesh.scale.y=v.rock_height_mult;mesh.position.set(rock.x,0,-rock.y);this.scene.add(mesh);}
    for(const [fraction,length,bank]of config.course.spike_zones){
      for(let d=-length/2;d<length/2;d+=v.spike_spacing){const p=this.course.at(fraction*config.course.length+d,bank*(config.course.half_width-v.spike_radius));const spike=new THREE.Mesh(new THREE.ConeGeometry(v.spike_radius,v.spike_height,v.radial_segments),mat(v.vest_color));spike.position.set(p.x,v.spike_height/2,-p.y);this.scene.add(spike);}
    }
    for(const [f,lat]of config.course.log_positions){const p=this.course.at(f*config.course.length,lat),log=new THREE.Mesh(new THREE.CylinderGeometry(config.course.floating_log_width/2,config.course.floating_log_width/2,config.course.floating_log_length,v.radial_segments),mat('#76502d'));log.rotation.z=Math.PI/2;log.rotation.y=-p.heading;log.position.set(p.x,config.course.floating_log_width/3,-p.y);this.scene.add(log);}
    for(const [f,lat]of config.course.whirlpool_positions){const p=this.course.at(f*config.course.length,lat),g=new THREE.Group();g.position.set(p.x,1,-p.y);for(let i=1;i<=4;i++){const ring=new THREE.Mesh(new THREE.TorusGeometry(config.course.whirlpool_radius*i/4,2,4,24,Math.PI*1.7),mat(i%2?'#c4eee0':'#075457'));ring.rotation.x=-Math.PI/2;ring.rotation.z=i;g.add(ring);}this.scene.add(g);this.whirlMeshes.push(g);}
    for(const [f,lat]of config.course.crate_positions){const p=this.course.at(f*config.course.length,lat),g=new THREE.Group();g.position.set(p.x,config.pickups.crate_radius/2,-p.y);const box=new THREE.Mesh(new THREE.BoxGeometry(config.pickups.crate_radius,config.pickups.crate_radius,config.pickups.crate_radius),mat('#ffd34e'));g.add(box);for(const side of [-1,1]){const band=new THREE.Mesh(new THREE.BoxGeometry(config.pickups.crate_radius+1,3,config.pickups.crate_radius+1),mat('#113e40'));band.position.y=side*config.pickups.crate_radius/3;g.add(band);}this.scene.add(g);this.crateMeshes.push(g);}
    const finish=this.course.at(config.course.length);const arch=new THREE.Group();arch.position.set(finish.x,0,-finish.y);arch.rotation.y=-finish.heading;
    for(const sign of [-1,1]){const post=new THREE.Mesh(new THREE.BoxGeometry(v.finish_arch_post,v.finish_arch_height,v.finish_arch_post),mat(v.bank_color));post.position.set(sign*v.finish_arch_width/2,v.finish_arch_height/2,0);arch.add(post);}
    const beam=new THREE.Mesh(new THREE.BoxGeometry(v.finish_arch_width,v.finish_arch_post*2,v.finish_arch_post),mat(v.vest_color));beam.position.y=v.finish_arch_height;arch.add(beam);this.scene.add(arch);
    for(let i=0;i<2;i++){
      const raft=new THREE.Group();const team=i===0?v.red_color:v.blue_color;
      const tube=new THREE.Mesh(new THREE.TorusGeometry(config.raft.radius-v.tube_radius,v.tube_radius,v.radial_segments,v.tube_segments),mat(team));tube.rotation.x=Math.PI/2;raft.add(tube);
      const floor=new THREE.Mesh(new THREE.CylinderGeometry(config.raft.radius-v.tube_radius,config.raft.radius-v.tube_radius,v.tube_radius/2,v.tube_segments),mat(v.vest_color));floor.position.y=-v.tube_radius/2;raft.add(floor);
      const bench=new THREE.Mesh(new THREE.BoxGeometry(config.raft.radius, v.tube_radius/2,v.tube_radius),mat('#eed7a0'));raft.add(bench);
      const zones=new THREE.Group();zones.name='zones';
      for(const [lo,hi]of [config.walking.zone_2v2_left_deg,config.walking.zone_2v2_right_deg]){const vertices:number[]=[];for(let n=0;n<v.tube_segments;n++){const a=rad(lo+(hi-lo)*n/v.tube_segments),b=rad(lo+(hi-lo)*(n+1)/v.tube_segments);for(const [angle,r]of [[a,config.raft.radius-5],[a,config.raft.radius-2],[b,config.raft.radius-5],[a,config.raft.radius-2],[b,config.raft.radius-2],[b,config.raft.radius-5]])vertices.push(Math.sin(angle)*r,v.tube_radius+1,-Math.cos(angle)*r);}const geom=new THREE.BufferGeometry();geom.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));zones.add(new THREE.Mesh(geom,new THREE.MeshBasicMaterial({color:'#fff4c9',side:THREE.DoubleSide})));for(const angle of [rad(lo),rad(hi)]){const post=new THREE.Mesh(new THREE.SphereGeometry(v.star_radius,6,6),new THREE.MeshBasicMaterial({color:'#fff9e9'}));post.position.set(Math.sin(angle)*(config.raft.radius-3),v.tube_radius+3,-Math.cos(angle)*(config.raft.radius-3));zones.add(post);}}
      raft.add(zones);
      this.rafts.push(raft);this.scene.add(raft);
      const label=document.createElement('div');label.className='raft-stun-label';label.textContent=`${i===0?'▲ RED':'● BLUE'} · STUNNED`;label.hidden=true;container.append(label);this.stunLabels.push(label);
      const stars=new THREE.Group();for(let n=0;n<v.stun_stars;n++){const star=new THREE.Mesh(new THREE.OctahedronGeometry(v.star_radius),mat(v.vest_color));star.position.set(Math.sin(n/v.stun_stars*Math.PI*2)*config.raft.rim_radius,v.body_height*2,Math.cos(n/v.stun_stars*Math.PI*2)*config.raft.rim_radius);stars.add(star);}raft.add(stars);this.stars.push(stars);
    }
    this.resize=new ResizeObserver(()=>{this.renderer.setSize(container.clientWidth,container.clientHeight,false);this.camera.aspect=container.clientWidth/Math.max(1,container.clientHeight);this.camera.updateProjectionMatrix();});this.resize.observe(container);
  }
  ensureAnimals(snapshot:Snapshot){
    if(this.animals.length===snapshot.animals.length&&this.animals.every((m,i)=>m.userData.character===snapshot.animals[i].character))return;
    for(const animal of this.animals)animal.parent?.remove(animal);this.animals=[];this.swings=[];
    const v=this.config.visuals;
    for(const state of snapshot.animals){
      const group=makeCharacter(this.config,state.character,state.raft);this.swings.push(group.getObjectByName('swing') as THREE.Mesh);
      group.userData.character=state.character;this.rafts[state.raft].add(group);this.animals.push(group);
    }
  }
  event(e:GameEvent,state:Snapshot){this.effects.burst(e,state,this.lowEffects);}
  get triangles(){return this.renderer.info.render.triangles;}
  setEffects(lowEffects:boolean,reduceMotion:boolean){this.lowEffects=lowEffects;this.reduceMotion=reduceMotion;this.renderer.setPixelRatio(Math.min(devicePixelRatio,lowEffects?this.config.visuals.low_effects_pixel_ratio:this.config.visuals.max_pixel_ratio));}
  draw(snapshot:Snapshot,ownRaft:number,dt:number){
    this.ensureAnimals(snapshot);for(const r of this.rafts)r.getObjectByName('zones')!.visible=snapshot.animals.length===4;const v=this.config.visuals;
    snapshot.rafts.forEach((r,i)=>{this.rafts[i].position.set(r.x,v.raft_height+r.height,-r.y);this.rafts[i].rotation.y=-r.heading;this.stars[i].visible=r.stun>0;this.stars[i].rotation.y=-(snapshot.raceTime*v.stun_orbit_speed);});
    snapshot.animals.forEach((a,i)=>{const phi=rad(a.phi);this.animals[i].position.set(Math.sin(phi)*this.config.raft.rim_radius,0,-Math.cos(phi)*this.config.raft.rim_radius);this.animals[i].rotation.y=-phi+Math.PI;this.animals[i].scale.set(1+(a.charge||0)*.2,1+(a.fire?.08:0)+(a.charge||0)*.3,1+(a.charge||0)*.2);this.animals[i].rotation.z=a.walk*.12;this.swings[i].visible=a.whackPhase==='windup';this.swings[i].rotation.z=(a.whackWindup/this.config.combat.whack_windup_s)*Math.PI;});
    const raft=snapshot.rafts[ownRaft]??snapshot.rafts[0],p=this.course.project(raft.x,raft.y);
    const follow=1-Math.exp(-(this.reduceMotion?v.reduced_motion_camera_follow_rate:v.camera_follow_rate)*dt);
    if(!this.cameraReady)this.cameraDirection.set(p.tx,p.ty);else this.cameraDirection.lerp(new THREE.Vector2(p.tx,p.ty),follow).normalize();
    const {x:tx,y:ty}=this.cameraDirection;
    const target=new THREE.Vector3(raft.x-tx*v.camera_behind,v.camera_height,-raft.y+ty*v.camera_behind);
    if(!this.cameraReady){this.camera.position.copy(target);this.cameraReady=true;}else this.camera.position.lerp(target,1-Math.exp(-(this.reduceMotion?v.reduced_motion_camera_follow_rate:v.camera_follow_rate)*dt));
    this.camera.lookAt(raft.x+tx*v.camera_ahead,0,-raft.y-ty*v.camera_ahead);this.renderer.render(this.scene,this.camera);
    snapshot.rafts.forEach((r,i)=>{const label=this.stunLabels[i],position=new THREE.Vector3(r.x,v.body_height*2,-r.y).project(this.camera);label.hidden=r.stun<=0||Math.abs(position.z)>1;label.style.left=`${(position.x+1)/2*this.container.clientWidth}px`;label.style.top=`${(1-position.y)/2*this.container.clientHeight}px`;});
    this.effects.update(dt);this.crateMeshes.forEach((g,i)=>{g.visible=(snapshot.world?.crates[i]??0)<=0;g.rotation.y=snapshot.raceTime;});this.whirlMeshes.forEach(g=>g.rotation.y=-snapshot.raceTime);
    this.frames++;this.sample=(performance.now()-this.fpsSampleStart)/1000;if(this.sample>=v.fps_sample_s){this.fps=this.frames/this.sample;if(this.fps<v.auto_low_effects_below_fps)this.lowSeconds+=this.sample;else this.lowSeconds=0;if(!this.lowEffects&&this.lowSeconds>=v.auto_low_effects_after_s){this.setEffects(true,this.reduceMotion);this.onAutoLow();}this.frames=0;this.sample=0;this.fpsSampleStart=performance.now();}
  }
  dispose(){this.effects.dispose();for(const label of this.stunLabels)label.remove();this.resize.disconnect();this.scene.traverse(object=>{const m=object as THREE.Mesh;if(m.geometry)m.geometry.dispose();if(m.material)for(const material of Array.isArray(m.material)?m.material:[m.material])material.dispose();});this.renderer.dispose();this.renderer.forceContextLoss();this.renderer.domElement.remove();}
}
export function interpolate(a:Snapshot,b:Snapshot,t:number):Snapshot{
  const lerp=(x:number,y:number)=>x+(y-x)*t;
  return {...b,raceTime:lerp(a.raceTime,b.raceTime),rafts:b.rafts.map((r,i)=>{const prev=a.rafts[i]??r;return {...r,x:lerp(prev.x,r.x),y:lerp(prev.y,r.y),heading:prev.heading+wrap(r.heading-prev.heading)*t,progress:lerp(prev.progress,r.progress)};}),animals:b.animals.map((state,i)=>({...state,phi:(a.animals[i]?.phi??state.phi)+wrap(rad(state.phi-(a.animals[i]?.phi??state.phi)))*180/Math.PI*t}))};
}

