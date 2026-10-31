import * as THREE from 'three';
import type {Config,Snapshot,RaftState} from '../shared.ts';
import {Course,rad,wrap} from '../game/course.ts';
export class RaceView {
  renderer:THREE.WebGLRenderer;scene=new THREE.Scene();camera:THREE.PerspectiveCamera;
  rafts:THREE.Group[]=[];animals:THREE.Group[]=[];stars:THREE.Group[]=[];
  course:Course;resize:ResizeObserver;cameraReady=false;fps=0;frames=0;sample=0;
  constructor(readonly container:HTMLElement,readonly config:Config){
    const v=config.visuals;this.course=new Course(config);
    this.renderer=new THREE.WebGLRenderer({antialias:false,alpha:false,powerPreference:'low-power'});
    this.renderer.setPixelRatio(Math.min(devicePixelRatio,v.max_pixel_ratio));this.renderer.setClearColor(v.sky_color);
    container.append(this.renderer.domElement);this.scene.fog=new THREE.Fog(v.sky_color,v.fog_near,v.fog_far);
    this.camera=new THREE.PerspectiveCamera(v.camera_fov_deg,1,v.camera_near,v.camera_far);
    this.scene.add(new THREE.AmbientLight(0xffffff,v.ambient_light));const sun=new THREE.DirectionalLight(0xffffff,v.sun_light);sun.position.set(...v.sun_position as [number,number,number]);this.scene.add(sun);
    const mat=(color:THREE.ColorRepresentation)=>new THREE.MeshToonMaterial({color});
    const ground=new THREE.Mesh(new THREE.PlaneGeometry(v.ground_half_size*2,v.ground_half_size*2),mat(v.ground_color));ground.rotation.x=-Math.PI/2;ground.position.y=-v.river_depth;this.scene.add(ground);
    // A continuous mitered river ribbon and matching bank strips.
    const sections=this.course.segments;
    const points=sections.map(s=>({x:s.x,y:s.y}));const last=sections.at(-1)!;points.push({x:last.x+last.tx*last.length,y:last.y+last.ty*last.length});
    const offset=(i:number,width:number)=>{
      const a=sections[Math.max(0,i-1)],b=sections[Math.min(i,sections.length-1)];
      const nx=a.ty+b.ty,ny=-a.tx-b.tx,length=Math.hypot(nx,ny),ux=nx/length,uy=ny/length;
      const distance=width/(ux*b.ty-uy*b.tx);return {x:points[i].x+ux*distance,y:points[i].y+uy*distance};
    };
    const strip=(inner:number,outer:number,color:string,height:number)=>{
      const vertices:number[]=[];
      for(let i=0;i<sections.length;i++){
        const a=offset(i,inner),b=offset(i,outer),d=offset(i+1,inner),e=offset(i+1,outer);
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
    const finish=this.course.at(config.course.length);const arch=new THREE.Group();arch.position.set(finish.x,0,-finish.y);arch.rotation.y=-finish.heading;
    for(const sign of [-1,1]){const post=new THREE.Mesh(new THREE.BoxGeometry(v.finish_arch_post,v.finish_arch_height,v.finish_arch_post),mat(v.bank_color));post.position.set(sign*v.finish_arch_width/2,v.finish_arch_height/2,0);arch.add(post);}
    const beam=new THREE.Mesh(new THREE.BoxGeometry(v.finish_arch_width,v.finish_arch_post*2,v.finish_arch_post),mat(v.vest_color));beam.position.y=v.finish_arch_height;arch.add(beam);this.scene.add(arch);
    for(let i=0;i<2;i++){
      const raft=new THREE.Group();const team=i===0?v.red_color:v.blue_color;
      const tube=new THREE.Mesh(new THREE.TorusGeometry(config.raft.radius-v.tube_radius,v.tube_radius,v.radial_segments,v.tube_segments),mat(team));tube.rotation.x=Math.PI/2;raft.add(tube);
      const floor=new THREE.Mesh(new THREE.CylinderGeometry(config.raft.radius-v.tube_radius,config.raft.radius-v.tube_radius,v.tube_radius/2,v.tube_segments),mat(v.vest_color));floor.position.y=-v.tube_radius/2;raft.add(floor);
      const bench=new THREE.Mesh(new THREE.BoxGeometry(config.raft.radius, v.tube_radius/2,v.tube_radius),mat('#eed7a0'));raft.add(bench);
      this.rafts.push(raft);this.scene.add(raft);
      const stars=new THREE.Group();for(let n=0;n<v.stun_stars;n++){const star=new THREE.Mesh(new THREE.OctahedronGeometry(v.star_radius),mat(v.vest_color));star.position.set(Math.sin(n/v.stun_stars*Math.PI*2)*config.raft.rim_radius,v.body_height*2,Math.cos(n/v.stun_stars*Math.PI*2)*config.raft.rim_radius);stars.add(star);}raft.add(stars);this.stars.push(stars);
    }
    this.resize=new ResizeObserver(()=>{this.renderer.setSize(container.clientWidth,container.clientHeight,false);this.camera.aspect=container.clientWidth/Math.max(1,container.clientHeight);this.camera.updateProjectionMatrix();});this.resize.observe(container);
  }
  ensureAnimals(snapshot:Snapshot){
    if(this.animals.length===snapshot.animals.length)return;
    for(const animal of this.animals)animal.parent?.remove(animal);this.animals=[];
    const v=this.config.visuals;
    for(const state of snapshot.animals){
      const group=new THREE.Group(),colors={vest:v.vest_color,hippo:v.hippo_color,team:state.raft===0?v.red_color:v.blue_color,white:'#fff9e9',ink:'#113e40'};
      for(const part of v.hippo_parts){
        const [kind,dimensions,position,color]=part as [string,number[],number[],keyof typeof colors];let geometry:THREE.BufferGeometry;
        if(kind==='sphere')geometry=new THREE.SphereGeometry(1,v.radial_segments,v.radial_segments);
        else if(kind==='cylinder')geometry=new THREE.CylinderGeometry(1,1,1,v.radial_segments);
        else geometry=new THREE.BoxGeometry(1,1,1);
        const mesh=new THREE.Mesh(geometry,new THREE.MeshToonMaterial({color:colors[color]}));mesh.scale.set(...dimensions as [number,number,number]);mesh.position.set(...position as [number,number,number]);group.add(mesh);
      }
      const cannon=new THREE.Mesh(new THREE.CylinderGeometry(v.cannon_radius,v.cannon_radius,v.cannon_length,v.radial_segments),new THREE.MeshToonMaterial({color:v.red_color}));cannon.rotation.x=Math.PI/2;cannon.position.set(0,v.body_height,v.cannon_length/2);group.add(cannon);
      this.rafts[state.raft].add(group);this.animals.push(group);
    }
  }
  draw(snapshot:Snapshot,ownRaft:number,dt:number){
    this.ensureAnimals(snapshot);const v=this.config.visuals;
    snapshot.rafts.forEach((r,i)=>{this.rafts[i].position.set(r.x,v.raft_height,-r.y);this.rafts[i].rotation.y=-r.heading;this.stars[i].visible=r.stun>0;this.stars[i].rotation.y=-(snapshot.raceTime*v.stun_orbit_speed);});
    snapshot.animals.forEach((a,i)=>{const phi=rad(a.phi);this.animals[i].position.set(Math.sin(phi)*this.config.raft.rim_radius,0,-Math.cos(phi)*this.config.raft.rim_radius);this.animals[i].rotation.y=-phi+Math.PI;});
    const raft=snapshot.rafts[ownRaft]??snapshot.rafts[0],p=this.course.project(raft.x,raft.y);
    const target=new THREE.Vector3(raft.x-p.tx*v.camera_behind,v.camera_height,-raft.y+p.ty*v.camera_behind);
    if(!this.cameraReady){this.camera.position.copy(target);this.cameraReady=true;}else this.camera.position.lerp(target,1-Math.exp(-v.camera_follow_rate*dt));
    this.camera.lookAt(raft.x+p.tx*v.camera_ahead,0,-raft.y-p.ty*v.camera_ahead);this.renderer.render(this.scene,this.camera);
    this.frames++;this.sample+=dt;if(this.sample>=v.fps_sample_s){this.fps=this.frames/this.sample;this.frames=0;this.sample=0;}
  }
  dispose(){this.resize.disconnect();this.scene.traverse(object=>{const m=object as THREE.Mesh;if(m.geometry)m.geometry.dispose();if(m.material)for(const material of Array.isArray(m.material)?m.material:[m.material])material.dispose();});this.renderer.dispose();this.renderer.forceContextLoss();this.renderer.domElement.remove();}
}
export function interpolate(a:Snapshot,b:Snapshot,t:number):Snapshot{
  const lerp=(x:number,y:number)=>x+(y-x)*t;
  return {...b,raceTime:lerp(a.raceTime,b.raceTime),rafts:b.rafts.map((r,i)=>{const prev=a.rafts[i]??r;return {...r,x:lerp(prev.x,r.x),y:lerp(prev.y,r.y),heading:prev.heading+wrap(r.heading-prev.heading)*t,progress:lerp(prev.progress,r.progress)};}),animals:b.animals.map((state,i)=>({...state,phi:(a.animals[i]?.phi??state.phi)+wrap(rad(state.phi-(a.animals[i]?.phi??state.phi)))*180/Math.PI*t}))};
}
