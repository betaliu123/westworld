import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as T from '../vendor/three.module.js';
import {GLTFLoader} from '../vendor/GLTFLoader.js';
import {FootGrounding} from '../src/foot-grounding.js';
import {HeroMotion} from '../src/hero-motion.js';

// Load the real production skin without textures (no browser/image dependency).
async function heroRig(){
  const raw=readFileSync(new URL('../src/models/hero.glb',import.meta.url));
  const end=20+raw.readUInt32LE(12),doc=JSON.parse(raw.subarray(20,end));
  delete doc.images;delete doc.textures;delete doc.materials;
  for(const mesh of doc.meshes)for(const p of mesh.primitives)delete p.material;
  let json=Buffer.from(JSON.stringify(doc));json=Buffer.concat([json,Buffer.alloc((4-json.length%4)%4,32)]);
  const bin=raw.subarray(end),out=Buffer.alloc(20+json.length+bin.length);
  raw.copy(out,0,0,20);out.writeUInt32LE(out.length,8);out.writeUInt32LE(json.length,12);json.copy(out,20);bin.copy(out,20+json.length);
  const {scene:model}=await new GLTFLoader().parseAsync(out.buffer,'');
  const actor=new T.Group(),wrapper=new T.Group();actor.add(wrapper);wrapper.add(model);
  model.updateMatrixWorld(true);
  const box=new T.Box3(),part=new T.Box3();model.traverse(o=>{if(o.isMesh){o.geometry.computeBoundingBox();box.union(part.copy(o.geometry.boundingBox).applyMatrix4(o.matrixWorld));}});
  const scale=2.04/(box.max.y-box.min.y);wrapper.scale.setScalar(scale);wrapper.position.y=-box.min.y*scale;
  wrapper.rotation.y=-Math.PI/2;actor.updateMatrixWorld(true);
  const data=JSON.parse(readFileSync(new URL('../src/models/hero-stealth-motion.json',import.meta.url)));
  const motion=new HeroMotion(model,data.clips.map(c=>T.AnimationClip.parse(c)));
  return {actor,wrapper,model,motion,grounding:new FootGrounding(actor,wrapper,model)};
}

test('retargeted crouch feet stay grounded through repeated walking, stopping and world transforms',async()=>{
  const {actor,wrapper,motion,grounding}=await heroRig();
  actor.position.set(7,3,-8);actor.rotation.y=1.2;
  let min=Infinity,max=-Infinity;
  for(let i=0;i<600;i++){
    motion.update(1/60,{hp:100,crouched:true,speed:i%180<120?1.6:0});
    grounding.apply();actor.updateMatrixWorld(true);
    const sole=grounding.lowest();min=Math.min(min,sole);max=Math.max(max,sole);
    assert.ok(Number.isFinite(wrapper.position.y)&&Math.abs(wrapper.position.y)<.6);
  }
  assert.ok(min>=-.005&&max<.04,`shoe support range ${min} .. ${max}`);
  grounding.reset();assert.equal(wrapper.position.y,grounding.baseY);
});
