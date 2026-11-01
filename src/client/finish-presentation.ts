import * as THREE from 'three';
import type {Config,Snapshot} from '../shared.ts';
import {Course,clamp} from '../game/course.ts';
/** Cosmetic run-through keeps authoritative finish times and frozen race results intact. */
export function finishPresentation(state:Snapshot,c:Config,course:Course):Snapshot{
 const last=course.segments.at(-1)!;
 return {...state,rafts:state.rafts.map(r=>{if(r.finishTime===null)return r;const t=clamp((state.raceTime-r.finishTime)/c.visuals.finish_runout_s,0,1),distance=c.visuals.finish_runout_u*(1-(1-t)**3);return {...r,x:r.x+last.tx*distance,y:r.y+last.ty*distance};})};
}
export function crocodileHeading(base:number,time:number,period:number,softness:number){return base+Math.PI/2*Math.tanh(Math.cos(2*Math.PI*time/period)/softness);}

export function makeFinishArch(c:Config,course:Course){
 const v=c.visuals,p=course.at(c.course.length),arch=new THREE.Group();arch.name='finish-arch';arch.position.set(p.x,0,-p.y);arch.rotation.y=-p.heading;
 const material=(color:string)=>new THREE.MeshToonMaterial({color});
 for(const side of [-1,1]){const post=new THREE.Mesh(new THREE.BoxGeometry(v.finish_arch_post,v.finish_arch_height,v.finish_arch_post),material(v.bank_color));post.name='finish-post';post.position.set(side*(c.course.half_width+v.finish_arch_post/2),v.finish_arch_height/2,0);arch.add(post);}
 const beam=new THREE.Mesh(new THREE.BoxGeometry(v.finish_arch_width,v.finish_arch_post*2,v.finish_arch_post),material(v.vest_color));beam.position.y=v.finish_arch_height;arch.add(beam);
 const line=new THREE.Group();line.name='finish-line';
 for(let row=0;row<2;row++)for(let col=0;col<v.finish_line_columns;col++){const tile=new THREE.Mesh(new THREE.PlaneGeometry(c.course.half_width*2/v.finish_line_columns,v.finish_line_depth/2),new THREE.MeshBasicMaterial({color:(row+col)%2?'#113e40':'#fff9e9',side:THREE.DoubleSide}));tile.rotation.x=-Math.PI/2;tile.position.set(-c.course.half_width+(col+.5)*c.course.half_width*2/v.finish_line_columns,1,(row-.5)*v.finish_line_depth/2);line.add(tile);}arch.add(line);return arch;
}
