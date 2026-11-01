import * as THREE from 'three';
import type {Config,Item} from '../shared.ts';
/** Original layered inflatable, clipped plank deck and authoritative carried item. */
export function makeRaft(c:Config,team:number){
 const v=c.visuals,g=new THREE.Group(),mat=(color:string)=>new THREE.MeshToonMaterial({color});
 const part=(geometry:THREE.BufferGeometry,color:string,x=0,y=0,z=0)=>{const m=new THREE.Mesh(geometry,mat(color));m.position.set(x,y,z);g.add(m);return m;};
 const band=team===0?v.red_color:v.blue_color;
 const lower=part(new THREE.TorusGeometry(c.raft.radius-v.tube_radius,v.tube_radius,v.radial_segments,v.tube_segments),band,0,-v.tube_radius/2);lower.rotation.x=Math.PI/2;
 const upper=part(new THREE.TorusGeometry(c.raft.radius-v.tube_radius,v.tube_radius,v.radial_segments,v.tube_segments),v.raft_cream_color,0,v.tube_radius/2);upper.rotation.x=Math.PI/2;upper.scale.z=.7;
 const deckRadius=c.raft.radius-v.tube_radius;
 part(new THREE.CylinderGeometry(deckRadius,deckRadius,v.tube_radius/2,v.tube_segments),v.deck_color,0,v.tube_radius/2).name='deck';
 for(let x=-deckRadius+v.deck_plank_width;x<deckRadius-v.deck_plank_width;x+=v.deck_plank_width){const edge=Math.abs(x)+v.deck_plank_width/2,length=2*Math.sqrt(Math.max(0,deckRadius*deckRadius-edge*edge));part(new THREE.BoxGeometry(v.deck_plank_width*.94,v.tube_radius/5,length),v.deck_color,x,v.tube_radius*.8);}
 const rope=part(new THREE.TorusGeometry(c.raft.radius-v.tube_radius/2,v.star_radius/2,5,v.tube_segments),v.rope_color,0,v.tube_radius);rope.rotation.x=Math.PI/2;
 for(let n=0;n<8;n++){const a=n*Math.PI/4;const tie=part(new THREE.TorusGeometry(v.tube_radius*.65,v.star_radius/2,5,10),v.rope_color,Math.sin(a)*(c.raft.radius-v.tube_radius),v.tube_radius/2,-Math.cos(a)*(c.raft.radius-v.tube_radius));tie.rotation.y=-a;}
 const log=new THREE.Group();log.name='loaded-log';log.position.set(0,v.tube_radius*2,-v.tube_radius*2.5);const wood=new THREE.Mesh(new THREE.CylinderGeometry(v.loaded_log_radius,v.loaded_log_radius,v.loaded_log_length,v.radial_segments),mat('#93613c'));wood.rotation.z=Math.PI/2;log.add(wood);
 for(const side of [-1,1]){const end=new THREE.Mesh(new THREE.CircleGeometry(v.loaded_log_radius*.85,v.radial_segments),mat('#e9bd7c'));end.rotation.y=side*Math.PI/2;end.position.x=side*v.loaded_log_length/2;log.add(end);const strap=new THREE.Mesh(new THREE.TorusGeometry(v.loaded_log_radius+.2,v.star_radius/2,5,12),mat(v.rope_color));strap.rotation.y=Math.PI/2;strap.position.x=side*v.loaded_log_length/3;log.add(strap);}log.visible=false;g.add(log);return g;
}
export function updateRaftItem(raft:THREE.Group,item:Item|null){const log=raft.getObjectByName('loaded-log');if(log)log.visible=item==='log';}
