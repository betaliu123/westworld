import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {fileURLToPath} from 'node:url';
import * as T from '../engine/vendor/three.module.js';
import {GLTFLoader} from '../engine/vendor/GLTFLoader.js';
import {mountActorModel,npcLook} from '../engine/src/actor-model.js';
import {character} from '../engine/src/world.js';

// Parse shipped meshes and clips; only image decoding is stubbed in Node.
globalThis.self=globalThis;
globalThis.document={createElement(){return {};},createElementNS(){const handlers={};return {width:1024,height:1024,addEventListener:(n,f)=>handlers[n]=f,removeEventListener(){},set src(v){queueMicrotask(()=>handlers.load?.());}};}};
globalThis.fetch=async url=>({ok:true,json:async()=>JSON.parse(fs.readFileSync(fileURLToPath(url),'utf8'))});
GLTFLoader.prototype.load=function(url,done,progress,fail){const b=fs.readFileSync(fileURLToPath(url));this.parseAsync(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),'').then(done,fail);};

test('shipped NPC skins have a complete first pose even on a zero-delta frame',async()=>{
 for(const id of ['gate_guard','porter','traveler','tea_host']){
  const actor=character(0x385953);actor.position.set(3,0,11);
  const handle=mountActorModel(actor,npcLook(id));await handle.loaded;assert.equal(handle.ready,true,id);
  handle.sync(0x385953,{dt:0,hp:100,speed:0});actor.updateMatrixWorld(true);
  const pose=[];actor.traverse(o=>{if(o.isBone)pose.push([o,o.quaternion.clone()]);});
  // No bind-pose blend should remain waiting for elapsed time on the first frame.
  handle.sync(0x385953,{dt:0,hp:100,speed:0});
  for(const [bone,q]of pose)assert.ok(bone.quaternion.toArray().every((v,i)=>Math.abs(v-q.toArray()[i])<1e-6),id+' stable paused pose');
  const bounds=new T.Box3();let meshes=0;
  actor.traverse(m=>{if(!m.isSkinnedMesh)return;meshes++;m.skeleton.update();assert.ok([...m.skeleton.boneMatrices].every(Number.isFinite),id+' finite skin matrices');bounds.union(new T.Box3().setFromObject(m,true));assert.ok(m.material.map?.image,id+' original texture');});
  const size=bounds.getSize(new T.Vector3());assert.ok(meshes>0);assert.ok(size.y>1.6&&size.y<2.5,id+' body height');assert.ok(bounds.getCenter(new T.Vector3()).distanceTo(actor.position)<2,id+' body at actor');assert.equal(actor.userData.rig.visible,true);
 }
});
