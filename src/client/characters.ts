import * as THREE from 'three';
import type {Character,Config,AnimalState,RaftState} from '../shared.ts';
/** Original crouched rigs: separate silhouettes, bent limbs and snapshot-driven expressions. */
export function makeCharacter(c:Config,kind:Character,team:number){
 const v=c.visuals,g=new THREE.Group(),skin=v.animal_skin_colors[kind],ink='#173b3b',cream='#fff5d8',teamColor=team===0?v.red_color:v.blue_color,materials=new Map<string,THREE.MeshToonMaterial>();
 const material=(color:string)=>{let m=materials.get(color);if(!m){m=new THREE.MeshToonMaterial({color});materials.set(color,m);}return m;};
 const sphere=new THREE.SphereGeometry(1,v.character_segments,v.character_segments),box=new THREE.BoxGeometry(1,1,1),cylinder=new THREE.CylinderGeometry(1,1,1,v.radial_segments);
 const group=(name:string,parent:THREE.Group,pos:number[])=>{const p=new THREE.Group();p.name=name;p.position.set(...pos as [number,number,number]);parent.add(p);return p;};
 const part=(parent:THREE.Group,shape:'sphere'|'box'|'cylinder',size:number[],pos:number[],color:string,name='')=>{const m=new THREE.Mesh(shape==='sphere'?sphere:shape==='box'?box:cylinder,material(color));m.scale.set(...size as [number,number,number]);m.position.set(...pos as [number,number,number]);m.name=name;parent.add(m);return m;};
 const frog=kind==='frog',capy=kind==='capybara',bear=kind==='bear',body=group('body-rig',g,[0,frog?5:capy?6:7,0]);
 part(body,'sphere',frog?[5.6,3.7,4.6]:capy?[5.5,4.8,6.2]:bear?[6.1,6.1,4.8]:[6.3,5.8,4.8],[0,0,0],skin);
 part(body,'sphere',frog?[5.8,2.2,4.7]:capy?[5.65,2.6,5.8]:[6.35,3.1,4.9],[0,0,-.25],v.vest_color);
 for(const side of [-1,1])part(body,'box',[1,4,.55],[side*2,0,-4.85],'#f7dc98');part(body,'box',[2,1.3,.7],[0,-.3,-5.15],ink);
 if(bear)part(body,'sphere',[3.4,3.6,.55],[0,.5,-4.6],'#d8b88c');
 const head=group('head-rig',g,[0,frog?10:capy?11.5:13.5,-1]),headY=head.position.y;
 part(head,'sphere',frog?[5.6,3.7,4.1]:capy?[4.7,3.7,5.4]:bear?[5.2,4.6,4.5]:[5.4,4.8,4.4],[0,0,0],skin);
 if(!frog){part(head,'sphere',capy?[3.6,2.6,3.8]:bear?[3.2,2.5,2.2]:[4.6,2.8,3.1],[0,-1,-3.6],bear?'#ddbd95':skin);for(const side of [-1,1]){part(head,'sphere',capy?[1.1,1.2,.9]:[1.6,1.7,1.2],[side*(capy?3.3:4),capy?3.3:4.1,.1],skin);part(head,'sphere',[.7,.8,.45],[side*(capy?3.3:4),capy?3.3:4.1,-.7],bear?'#d9af81':'#cf9fa2');}}
 const pupils:THREE.Mesh[]=[],brows:THREE.Mesh[]=[],spirals:THREE.Group[]=[];
 for(const side of [-1,1]){const eyeX=side*(frog?3.4:2.3),eyeY=frog?2.9:1.4,eyeZ=frog?-2.5:-4.2;part(head,'sphere',frog?[1.9,2.2,1.35]:capy?[1.35,1.15,.9]:[1.6,1.75,1],[eyeX,eyeY,eyeZ],cream);pupils.push(part(head,'sphere',[.65,frog?1:.8,.45],[eyeX,eyeY,eyeZ-.85],ink,'pupil'));const brow=part(head,'box',[2.3,.45,.55],[eyeX,eyeY+1.6,eyeZ-.5],ink,'brow');brows.push(brow);
  const spiral=group('spiral-eye',head,[eyeX,eyeY,eyeZ-1.3]),points:THREE.Vector3[]=[];for(let n=0;n<=v.character_segments*3;n++){const t=n/(v.character_segments*3),a=t*Math.PI*v.stun_stars;points.push(new THREE.Vector3(Math.cos(a)*t*1.25,Math.sin(a)*t*1.25,0));}spiral.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(points),new THREE.LineBasicMaterial({color:ink})));spiral.visible=false;spirals.push(spiral);
  if(!frog&&!bear)part(head,'sphere',[.55,.4,.25],[side*1.6,-.7,capy?-7:-6.55],'#725148');}
 if(bear)part(head,'sphere',[1.1,.7,.55],[0,-.3,-5.9],ink);
 const mouth=part(head,'box',[frog?4.2:3.5,.65,.45],[0,frog?-1.1:-2.5,frog?-4.1:capy?-6.7:-6.2],ink,'mouth');
 if(kind==='hippo')for(const side of [-1,1])part(head,'box',[.85,.95,.7],[side,-2.3,-6.35],cream);
 part(head,'sphere',frog?[3.2,1,2.8]:capy?[4.5,1.2,4.2]:[5.1,1.3,4.4],[0,frog?3.4:4.3,.2],teamColor);part(head,'box',[frog?3.5:5.4,.55,2],[0,frog?3.3:4.15,-2.8],teamColor);
 const arms:THREE.Group[]=[],legs:THREE.Group[]=[];
 for(const side of [-1,1]){const arm=group('arm-rig',g,[side*(frog?4.8:5.4),frog?6.2:8.3,-.5]);part(arm,'sphere',[1.65,2.3,1.8],[0,-1.2,0],skin);const forearm=part(arm,'sphere',[1.55,1.9,1.7],[-side*.4,-3,-1.6],skin);forearm.rotation.x=-.6;part(arm,'sphere',[1.9,1.3,2],[-side*.6,-4.2,-3.1],skin);arms.push(arm);
  const leg=group('leg-rig',g,[side*(frog?4.2:3),frog?2.7:3,1]);part(leg,'sphere',frog?[2.8,2.8,3.1]:[2,2.1,2.3],[0,0,.3],skin);part(leg,'sphere',[1.6,1.6,1.6],[0,-1.1,-.7],skin);part(leg,'sphere',frog?[2.4,1,3.1]:[2,1.1,2.7],[0,-2,-1.7],skin);for(let toe=-1;toe<=1;toe++)part(leg,'sphere',[.55,.4,.85],[toe*.95,-2,-3.5],frog?'#a6d166':bear?'#ddb88b':skin);legs.push(leg);}
 if(bear)part(g,'sphere',[1.8,1.8,1.8],[0,3.5,5.1],skin);
 const cannon=group('cannon-rig',g,[0,frog?6:8,v.cannon_length/2-v.cannon_radius*.3]);const barrel=part(cannon,'cylinder',[v.cannon_radius,v.cannon_length,v.cannon_radius],[0,0,0],v.red_color);barrel.rotation.x=Math.PI/2;const lip=new THREE.Mesh(new THREE.TorusGeometry(v.cannon_radius,.4,5,v.character_segments),material('#8f382e'));lip.position.z=v.cannon_length/2; cannon.add(lip);part(cannon,'sphere',[v.cannon_radius*.7,v.cannon_radius*.7,.2],[0,0,v.cannon_length/2+.1],ink);
 const swing=new THREE.Mesh(new THREE.TorusGeometry(v.whack_arc_radius,v.whack_arc_tube,v.radial_segments,v.character_segments,Math.PI),material(v.vest_color));swing.rotation.x=Math.PI/2;swing.position.y=v.head_height;swing.name='swing';g.add(swing);
 g.userData.pose={body,head,headY,arms,legs,pupils,brows,mouth,spirals,kind};return g;
}
export function animateCharacter(g:THREE.Group,a:AnimalState,r:RaftState,time:number,reduceMotion:boolean,c:Config){const rig=g.userData.pose;if(!rig)return;const v=c.visuals,walk=reduceMotion?0:a.walk,phase=time*v.pose_walk_speed,breath=reduceMotion?0:Math.sin(time*v.pose_idle_speed+a.seat)*v.pose_breath_amplitude,stunned=r.stun>0,windup=a.whackPhase==='windup';g.scale.set(v.character_scale,v.character_height_scale,v.character_scale);g.rotation.z=walk*v.pose_walk_lean;
 rig.body.scale.y=1+breath*.03+(a.character==='frog'?a.charge*.2:0);rig.body.rotation.x=stunned?.14:a.pushing?-.14:a.fire?-.06:0;rig.head.position.y=rig.headY+breath;rig.head.rotation.set(stunned?.25:a.charge?-.12:a.fire?-.06:0,walk*.12,stunned?.12:0);
 rig.arms.forEach((arm:THREE.Group,i:number)=>{const sign=i===0?-1:1;arm.rotation.set(windup?-.8:stunned?.2:Math.sin(phase+i*Math.PI)*Math.abs(walk)*v.pose_walk_swing,0,sign*(stunned?.2:windup?.3:.08));});rig.legs.forEach((leg:THREE.Group,i:number)=>{leg.rotation.x=Math.sin(phase+i*Math.PI)*Math.abs(walk)*v.pose_walk_swing;});rig.pupils.forEach((p:THREE.Mesh)=>p.visible=!stunned);rig.spirals.forEach((p:THREE.Group)=>{p.visible=stunned;p.rotation.z=time*v.stun_orbit_speed;});rig.brows.forEach((b:THREE.Mesh,i:number)=>b.rotation.z=(i===0?-1:1)*(windup?.4:a.fire?.25:.08));rig.mouth.scale.y=stunned||r.height>0?2:a.fire?1.5:1;
}
