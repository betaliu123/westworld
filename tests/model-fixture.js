import {readFileSync} from 'node:fs';
import * as T from '../vendor/three.module.js';
import {GLTFLoader} from '../vendor/GLTFLoader.js';

// Use production geometry and skin weights, omitting only browser-loaded images.
export async function modelFixture(file='hero.glb',height=2.04){
  const raw=readFileSync(new URL('../src/models/'+file,import.meta.url));
  const end=20+raw.readUInt32LE(12),doc=JSON.parse(raw.subarray(20,end));
  delete doc.images;delete doc.textures;delete doc.materials;
  for(const mesh of doc.meshes)for(const p of mesh.primitives)delete p.material;
  let json=Buffer.from(JSON.stringify(doc));json=Buffer.concat([json,Buffer.alloc((4-json.length%4)%4,32)]);
  const bin=raw.subarray(end),out=Buffer.alloc(20+json.length+bin.length);
  raw.copy(out,0,0,20);out.writeUInt32LE(out.length,8);out.writeUInt32LE(json.length,12);json.copy(out,20);bin.copy(out,20+json.length);
  const {scene:model}=await new GLTFLoader().parseAsync(out.buffer,'');
  const wrapper=new T.Group();wrapper.add(model);model.updateMatrixWorld(true);
  const box=new T.Box3(),part=new T.Box3();model.traverse(o=>{if(o.isMesh){o.geometry.computeBoundingBox();box.union(part.copy(o.geometry.boundingBox).applyMatrix4(o.matrixWorld));}});
  const scale=height/(box.max.y-box.min.y);wrapper.scale.setScalar(scale);wrapper.position.y=-box.min.y*scale;wrapper.rotation.y=-Math.PI/2;
  wrapper.updateMatrixWorld(true);
  return {wrapper,model};
}
