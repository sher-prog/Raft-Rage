import * as THREE from 'three';
import {Course} from '../game/course.ts';
import type {Config,Snapshot} from '../shared.ts';
export function sign(text:string,color='#ffd34e'){
 const canvas=document.createElement('canvas');canvas.width=512;canvas.height=128;const ctx=canvas.getContext('2d')!;ctx.fillStyle='#113e40';ctx.fillRect(0,0,512,128);ctx.strokeStyle=color;ctx.lineWidth=10;ctx.strokeRect(7,7,498,114);ctx.fillStyle=color;ctx.font='900 66px system-ui';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text,256,67);const texture=new THREE.CanvasTexture(canvas);const mat=new THREE.MeshBasicMaterial({map:texture,transparent:true,side:THREE.DoubleSide});const mesh=new THREE.Mesh(new THREE.PlaneGeometry(100,25),mat);return mesh;
}
export class WorldArt {
 crocs:THREE.Group[]=[];jaws:THREE.Group[]=[];gate:THREE.Group|undefined;foam:THREE.Group;chunks:THREE.Group[]=[];projectiles:THREE.Mesh[]=[];
 constructor(readonly scene:THREE.Scene,readonly c:Config,readonly course:Course){
 const mat=(color:string)=>new THREE.MeshToonMaterial({color});const part=(group:THREE.Group,geometry:THREE.BufferGeometry,color:string,pos:number[],scale=[1,1,1])=>{const m=new THREE.Mesh(geometry,mat(color));m.position.set(...pos as [number,number,number]);m.scale.set(...scale as [number,number,number]);group.add(m);return m;};
 if(c.release.crocodiles)for(let i=0;i<c.crocodiles.count;i++){
  const g=new THREE.Group();part(g,new THREE.SphereGeometry(1,8,6),'#43864c',[0,6,0],[17,8,23]);part(g,new THREE.ConeGeometry(8,30,6),'#397340',[0,4,30]).rotation.x=Math.PI/2;
  const jaw=new THREE.Group();jaw.position.set(0,7,-17);part(jaw,new THREE.BoxGeometry(22,5,28),'#70aa58',[0,0,-6]);for(const side of [-1,1])for(let n=0;n<4;n++)part(jaw,new THREE.ConeGeometry(1.7,4,3),'#fff4d9',[side*9,-3,-16+n*7]).rotation.z=Math.PI;g.add(jaw);
  part(g,new THREE.BoxGeometry(22,4,27),'#a8c17a',[0,3,-22]);for(const side of [-1,1]){part(g,new THREE.SphereGeometry(3.8,6,6),'#e9e8a0',[side*7,13,-14]);part(g,new THREE.SphereGeometry(1.7,6,6),'#113e40',[side*7,13,-17]);}
  this.scene.add(g);this.crocs.push(g);this.jaws.push(jaw);
  const p=course.at(c.crocodiles.positions_frac[i]*c.course.length-100,c.course.half_width+16),warning=sign('CROC!');warning.scale.setScalar(.65);warning.position.set(p.x,42,-p.y);warning.rotation.y=-p.heading;scene.add(warning);
 }
 if(c.release.ramp){const p=course.at(c.ramp.position_frac*c.course.length),g=new THREE.Group();g.position.set(p.x,0,-p.y);g.rotation.y=-p.heading;const wood=part(g,new THREE.BoxGeometry(c.ramp.width,6,c.ramp.length),'#b37b45',[0,16,0]);wood.rotation.x=.28;for(let n=-3;n<=3;n++){const plank=part(g,new THREE.BoxGeometry(c.ramp.width+4,2,2),'#e4ba76',[0,17+n*3,-n*10]);plank.rotation.x=-.28;}scene.add(g);const label=sign('BIG AIR!');label.position.set(p.x,62,-p.y);label.rotation.y=-p.heading;scene.add(label);}
 if(c.release.shortcut){const p=course.at(c.shortcut.start_frac*c.course.length,c.shortcut.lateral),g=new THREE.Group();g.position.set(p.x,12,-p.y);g.rotation.y=-p.heading;part(g,new THREE.CylinderGeometry(8,8,c.shortcut.width,8),'#93623d',[0,0,0]).rotation.z=Math.PI/2;const label=sign('WHACK!');label.scale.setScalar(.6);label.position.y=35;g.add(label);scene.add(g);this.gate=g;
   const vertices:number[]=[];for(let n=0;n<24;n++){const a=course.at((c.shortcut.start_frac+(c.shortcut.end_frac-c.shortcut.start_frac)*n/24)*c.course.length,c.shortcut.lateral),b=course.at((c.shortcut.start_frac+(c.shortcut.end_frac-c.shortcut.start_frac)*(n+1)/24)*c.course.length,c.shortcut.lateral);const dx=Math.cos(a.heading)*c.shortcut.width/2,dy=-Math.sin(a.heading)*c.shortcut.width/2;for(const q of [[a.x-dx,-a.y+dy],[a.x+dx,-a.y-dy],[b.x-dx,-b.y+dy],[a.x+dx,-a.y-dy],[b.x+dx,-b.y-dy],[b.x-dx,-b.y+dy]])vertices.push(q[0],.5,q[1]);}const geom=new THREE.BufferGeometry();geom.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));const material=new THREE.MeshToonMaterial({color:'#83d3c4',side:THREE.DoubleSide});scene.add(new THREE.Mesh(geom,material));}
 this.foam=new THREE.Group();scene.add(this.foam);
 if(c.release.scenery)for(let f=0;f<c.course.length;f+=c.visuals.tree_spacing*5){const chunk=new THREE.Group();chunk.userData.progress=f;for(let n=0;n<5;n++)for(const side of [-1,1]){const progress=f+n*c.visuals.tree_spacing,p=course.at(progress,side*(c.course.half_width+c.visuals.bank_width+35));
  part(chunk,new THREE.CylinderGeometry(5,7,45,6),'#755138',[p.x,20,-p.y]);if((n+side)%2===0){part(chunk,new THREE.ConeGeometry(28,58,7),'#397b51',[p.x,63,-p.y]);part(chunk,new THREE.ConeGeometry(20,40,7),'#5b985b',[p.x,87,-p.y]);}else{part(chunk,new THREE.IcosahedronGeometry(25,0),'#5d9752',[p.x,62,-p.y],[1,1.4,1]);part(chunk,new THREE.IcosahedronGeometry(18,0),'#79a967',[p.x+12,50,-p.y+5]);}
  const b=course.at(progress,side*(c.course.half_width+13));part(chunk,new THREE.DodecahedronGeometry(18,0),'#607968',[b.x,9,-b.y],[1.4,.8,1]);
  if(n===0){const dock=course.at(progress,side*(c.course.half_width-15));part(chunk,new THREE.BoxGeometry(55,5,55),'#a87942',[dock.x,10,-dock.y]);for(let k=0;k<3;k++){part(chunk,new THREE.SphereGeometry(5,6,5),k%2?'#bd9a6b':'#aaa4bf',[dock.x+(k-1)*15,21,-dock.y]);part(chunk,new THREE.SphereGeometry(3,6,5),'#ffd34e',[dock.x+(k-1)*15,28,-dock.y]);}}
 }scene.add(chunk);this.chunks.push(chunk);}
 if(c.release.visuals){const label=sign('FINISH');const p=course.at(c.course.length);label.scale.set(1.7,1.2,1);label.position.set(p.x,c.visuals.finish_arch_height,-p.y);label.rotation.y=-p.heading;scene.add(label);}
 for(let i=0;i<8;i++){const m=new THREE.Mesh(new THREE.CylinderGeometry(c.pickups.projectile_radius,c.pickups.projectile_radius,40,8),mat('#9d6e43'));m.rotation.z=Math.PI/2;m.visible=false;scene.add(m);this.projectiles.push(m);}
 }
 update(state:Snapshot,progress:number,low:boolean){const c=this.c;this.crocs.forEach((g,i)=>{const lateral=c.crocodiles.sweep_frac_of_half_width*c.course.half_width*Math.sin(2*Math.PI*state.raceTime/c.crocodiles.periods_s[i]),p=this.course.at(c.crocodiles.positions_frac[i]*c.course.length,lateral);g.position.set(p.x,0,-p.y);g.rotation.y=-p.heading+Math.PI/2;const close=state.rafts.some(r=>Math.hypot(r.x-p.x,r.y-p.y)<c.crocodiles.jaw_fast_distance);this.jaws[i].rotation.x=-Math.max(0,Math.sin(state.raceTime*(close?12:3)))*.6;});if(this.gate)this.gate.visible=(state.world?.gateOpen??0)<=0;
 this.projectiles.forEach((m,i)=>{const p=state.world?.projectiles[i];m.visible=!!p;if(p){m.position.set(p.x,22,-p.y);m.rotation.y=state.raceTime*8;}});
 this.chunks.forEach(chunk=>{chunk.visible=!low&&Math.abs(Number(chunk.userData.progress)-progress)<c.visuals.scenery_distance;});
 }
}
