import * as THREE from 'three';
import {Course} from '../game/course.ts';
import type {Config,Snapshot} from '../shared.ts';
/** Route-aligned chase camera. Framing is constrained by visible subjects, not a fixed zoom. */
export class ChaseCamera {
 ready=false;anchor=new THREE.Vector3();direction=new THREE.Vector2(0,1);scratch=new THREE.Vector3();points:THREE.Vector3[]=[];left;right;distance=0;
 constructor(readonly camera:THREE.PerspectiveCamera,readonly c:Config,readonly course:Course){this.left=course.bankPoints(-c.course.half_width);this.right=course.bankPoints(c.course.half_width);}
 reset(){this.ready=false;}
 bank(progress:number,side:number,target:THREE.Vector3){const sections=this.course.segments,index=sections.findIndex(s=>progress<=s.start+s.length),i=index<0?sections.length-1:index,s=sections[i],points=side<0?this.left:this.right,a=points[i],b=points[i+1],along=(a.x-s.x)*s.tx+(a.y-s.y)*s.ty,span=(b.x-a.x)*s.tx+(b.y-a.y)*s.ty,t=Math.max(0,Math.min(1,(progress-s.start-along)/span));return target.set(a.x+(b.x-a.x)*t,0,-a.y-(b.y-a.y)*t);}
 update(state:Snapshot,own:number,dt:number,reduceMotion=false,includeRival=true){const c=this.c,v=c.visuals,r=state.rafts[own],other=state.rafts[1-own],p=this.course.project(r.x,r.y),ahead=this.course.at(Math.min(c.course.length,p.progress+v.camera_ahead)),dx=ahead.x-p.x,dy=ahead.y-p.y,len=Math.hypot(dx,dy),desired=new THREE.Vector2(len>1?dx/len:p.tx,len>1?dy/len:p.ty),follow=1-Math.exp(-(reduceMotion?v.reduced_motion_camera_follow_rate:v.camera_follow_rate)*dt);
  const nextAnchor=this.scratch.set(p.x,r.height,-p.y);if(!this.ready){this.anchor.copy(nextAnchor);this.direction.copy(desired);}else{this.anchor.lerp(nextAnchor,follow);this.direction.lerp(desired,follow);if(this.direction.lengthSq()<.01)this.direction.copy(desired);else this.direction.normalize();}
  const speed=Math.min(1,Math.hypot(r.vx,r.vy)/c.water.speed_cap),fov=v.camera_fov_deg+v.camera_speed_fov_deg*speed;this.camera.fov=this.ready?this.camera.fov+(fov-this.camera.fov)*follow:fov;this.camera.updateProjectionMatrix();
  let n=0;const point=()=>this.points[n]??(this.points[n]=new THREE.Vector3());
  for(const progress of [Math.max(0,p.progress-c.raft.radius),p.progress,Math.min(c.course.length,p.progress+v.camera_ahead)])for(const side of [-1,1]){this.bank(progress,side,point());n++;}
  const subjects=[r],separation=Math.hypot(r.x-other.x,r.y-other.y),fade=Math.max(0,Math.min(1,(v.camera_opponent_range*1.25-separation)/(v.camera_opponent_range*.25)));if(includeRival&&fade>0)subjects.push({...other,x:r.x+(other.x-r.x)*fade,y:r.y+(other.y-r.y)*fade,height:r.height+(other.height-r.height)*fade});
  for(const body of subjects)for(const x of [-1,1])for(const y of [-1,1])for(const height of [0,v.camera_subject_height]){point().set(body.x+x*c.raft.radius,body.height+height,-body.y+y*c.raft.radius);n++;}
  this.points.length=n;let distance=v.camera_behind;
  const place=(d:number)=>{this.camera.far=Math.max(v.camera_far,d*3);this.camera.updateProjectionMatrix();this.camera.position.set(this.anchor.x-this.direction.x*d,this.anchor.y+d*v.camera_height/v.camera_behind,this.anchor.z+this.direction.y*d);this.camera.lookAt(this.anchor.x+this.direction.x*d*v.camera_ahead/v.camera_behind,this.anchor.y,this.anchor.z-this.direction.y*d*v.camera_ahead/v.camera_behind);this.camera.updateMatrixWorld(true);};
  for(let iteration=0;iteration<v.camera_fit_iterations;iteration++){
   place(distance);
   let violation=1;for(const source of this.points){const q=this.scratch.copy(source).project(this.camera);if(q.z>1||q.z< -1){violation=Math.max(violation,1.3);continue;}violation=Math.max(violation,Math.abs(q.x)/(1-v.camera_safe_margin),q.y>0?q.y/(1-2*v.camera_hud_fraction):Math.abs(q.y)/(1-v.camera_safe_margin));}
   if(violation<=1)break;distance*=Math.min(1.6,Math.max(1.005,violation*1.005));
  }
  const eased=this.ready&&distance<this.distance?this.distance+(distance-this.distance)*follow:distance;place(eased);this.distance=eased;this.ready=true;
 }
}
