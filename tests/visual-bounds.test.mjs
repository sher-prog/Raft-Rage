import test from'node:test';import assert from'node:assert/strict';import{readFileSync}from'node:fs';import{build}from'esbuild';import * as THREE from'three';
const c=JSON.parse(readFileSync('balance_constants.json'));c.release.visuals=true;
test('comic outlines never scale world-space river/bank surfaces or enlarge local raft bounds',async()=>{
 await build({entryPoints:['src/client/comic-style.ts'],outfile:'work/comic-style-check.mjs',bundle:true,platform:'node',format:'esm',packages:'external'});
 const{ComicStyle}=await import('../work/comic-style-check.mjs');const scene=new THREE.Scene(),style=new ComicStyle(c,scene),geom=new THREE.BufferGeometry();const coords=[1000,0,-5000,1400,0,-5000,1000,0,-6000,1400,0,-5000,1400,0,-6000,1000,0,-6000];geom.setAttribute('position',new THREE.Float32BufferAttribute([...coords,...coords,...coords],3));const water=new THREE.Mesh(geom,new THREE.MeshToonMaterial({color:'#199795'}));scene.add(water);scene.updateMatrixWorld(true);const before=new THREE.Box3().setFromObject(water).clone();
 const raft=new THREE.Mesh(new THREE.TorusGeometry(c.raft.radius-c.visuals.tube_radius,c.visuals.tube_radius,8,24),new THREE.MeshToonMaterial({color:'#f16d46'}));scene.add(raft);style.decorate(scene);scene.updateMatrixWorld(true);
 assert.deepEqual(water.scale.toArray(),[1,1,1]);const after=new THREE.Box3().setFromObject(water);assert.deepEqual(after.min.toArray(),before.min.toArray());assert.deepEqual(after.max.toArray(),before.max.toArray());
 const bounds=new THREE.Box3().setFromObject(raft);assert.ok(bounds.max.x<=c.raft.radius+1e-6);assert.ok(bounds.min.x>=-c.raft.radius-1e-6);assert.equal(raft.children.filter(x=>x.name==='outline').length,1);style.dispose();
});
