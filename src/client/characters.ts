import * as THREE from 'three';
import type {Character,Config} from '../shared.ts';
/** Original modular models; replace this factory to integrate approved character designs. */
export function makeCharacter(config:Config,kind:Character,team:number){
 const v=config.visuals,g=new THREE.Group(),skin=({hippo:'#aaa4bf',frog:'#79bf55',bear:'#a57c55',capybara:'#bd9a6b'})[kind];
 const mesh=(shape:'sphere'|'box'|'cylinder',size:number[],pos:number[],color:string,name='')=>{const geom=shape==='sphere'?new THREE.SphereGeometry(1,v.character_segments,v.character_segments):shape==='box'?new THREE.BoxGeometry(1,1,1):new THREE.CylinderGeometry(1,1,1,v.radial_segments);const m=new THREE.Mesh(geom,new THREE.MeshToonMaterial({color}));m.scale.set(...size as [number,number,number]);m.position.set(...pos as [number,number,number]);m.name=name;g.add(m);return m;};
 mesh('sphere',[6.2,8,4.8],[0,9,0],skin);mesh('sphere',[6.3,4.3,4.9],[0,8,0],v.vest_color);
 for(const side of [-1,1]){mesh('sphere',[1.9,4.6,1.9],[side*6.2,8,-1],skin);mesh('sphere',[2.4,2,3],[side*3,1,-2],skin);mesh('box',[.8,6,.5],[side*2.5,6,-4.5],'#ffe3a2');}
 const head=kind==='frog'?[5.5,4.3,4.5]:kind==='capybara'?[4.7,4.6,5.3]:[5.2,5.2,4.5];mesh('sphere',head,[0,14,0],skin,'head');
 if(kind==='hippo'||kind==='capybara')mesh('sphere',kind==='hippo'?[4.4,2.8,3.3]:[3.7,3.2,3.4],[0,12,-3],skin);
 if(kind!=='frog')for(const side of [-1,1]){mesh('sphere',[1.6,1.7,1.2],[side*4,18,0],skin);mesh('sphere',[.85,1,.6],[side*4,18,-.8],kind==='bear'?'#dfb38e':'#d0a2ad');}
 mesh('sphere',[5.4,2,4.6],[0,18,0],team===0?v.red_color:v.blue_color);mesh('box',[6.4,.8,3],[0,17.7,-3],team===0?v.red_color:v.blue_color);
 for(const side of [-1,1]){mesh('sphere',[1.65,2,1],[side*2.4,15.2,-4.1],'#fff9e9');mesh('sphere',[.7,1,.5],[side*2.4,15.2,-5],'#113e40','pupil');const brow=mesh('box',[2.7,.55,.65],[side*2.4,17.1,-4.7],'#113e40','brow');brow.rotation.z=side*.12;}
 mesh('box',[3.7,1.5,.7],[0,11.1,-5],'#113e40','mouth');for(const side of [-1,1])mesh('box',[.9,1,.9],[side,11.5,-5.1],'#fff9e9');
 for(const side of [-1,1]){mesh('sphere',[1.4,2.8,1.5],[side*2.8,2,0],skin);mesh('sphere',[1.8,1.8,1.8],[side*6.2,4.5,-2],skin);if(kind==='hippo'||kind==='capybara')mesh('sphere',[.6,.45,.3],[side*1.5,13,-6], '#654c49');}
 const cannon=mesh('cylinder',[v.cannon_radius,v.cannon_length,v.cannon_radius],[0,v.body_height,v.cannon_length/2-v.cannon_radius**2/(2*config.raft.radius)],v.red_color,'cannon');cannon.rotation.x=Math.PI/2;
 const swing=new THREE.Mesh(new THREE.TorusGeometry(v.whack_arc_radius,v.whack_arc_tube,v.character_segments,v.character_segments,Math.PI),new THREE.MeshToonMaterial({color:v.vest_color}));swing.rotation.x=Math.PI/2;swing.position.y=v.head_height;swing.name='swing';g.add(swing);
 return g;
}
