import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import type {ComicStyle} from './comic-style.ts';
/** Bake static pieces within each animated rig. Original transforms, colors and outline bounds are retained. */
export function batchStatic(root:THREE.Object3D,style:ComicStyle,preserve:(mesh:THREE.Mesh)=>boolean=mesh=>['pupil','brow','mouth','swing','cheering-arm'].includes(mesh.name)){
 for(const child of [...root.children])if(!(child as THREE.Mesh).isMesh)batchStatic(child,style,preserve);
 const groups=new Map<string,{material:THREE.Material;geometries:THREE.BufferGeometry[];outline:boolean}>(),remove:THREE.Mesh[]=[],oldOutlines=new Set<THREE.Mesh>();
 const add=(mesh:THREE.Mesh,matrix:THREE.Matrix4,outline:boolean)=>{const material=mesh.material as THREE.MeshBasicMaterial;if(Array.isArray(mesh.material)||material.map||(material.transparent&&!mesh.userData.batchTransparent))return false;const key=[material.type,material.color?.getHex(),material.side,material.transparent,material.opacity,Object.keys(mesh.geometry.attributes).sort().join(','),!!mesh.geometry.index,outline].join('|');let group=groups.get(key);if(!group){group={material,geometries:[],outline};groups.set(key,group);}group.geometries.push(mesh.geometry.clone().applyMatrix4(matrix));return true;};
 for(const child of [...root.children]){const mesh=child as THREE.Mesh;if(!mesh.isMesh||(mesh as THREE.InstancedMesh).isInstancedMesh||preserve(mesh)||mesh.children.some(c=>c.name!=='outline'))continue;mesh.updateMatrix();if(!add(mesh,mesh.matrix,false))continue;for(const node of mesh.children){const line=node as THREE.Mesh;if(!line.isMesh)continue;line.updateMatrix();add(line,mesh.matrix.clone().multiply(line.matrix),true);oldOutlines.add(line);}remove.push(mesh);}
 for(const mesh of remove)root.remove(mesh);style.outlines=style.outlines.filter(mesh=>!oldOutlines.has(mesh));
 for(const group of groups.values()){if(!group.geometries.length)continue;const geometry=mergeGeometries(group.geometries,false);for(const part of group.geometries)part.dispose();if(!geometry)throw Error('Static mesh attributes do not match');geometry.computeBoundingSphere();const mesh=new THREE.Mesh(geometry,group.material);mesh.userData.outlined=true;if(group.outline){mesh.name='outline';style.outlines.push(mesh);}root.add(mesh);}
}
