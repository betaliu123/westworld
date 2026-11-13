import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../vendor/three.module.js';
import {groundSeatWanted,npcGroundSeat,groundSeatBones,atStool} from '../src/ground-seat.js';
import {bunMesh,placeStallBuns} from '../src/food-model.js';
import {modelFixture} from './model-fixture.js';

function fixture(id='porter'){
 const actor=new T.Group(),rig=new T.Group();actor.add(rig);actor.userData={rig,head:new T.Group(),sword:{visible:false}};
 const state={hp:100,life:{activity:'doze',target:{x:0,z:0}}},n={actor},s={chapterVersion:2,npcClock:10,ecosystem:{time:10},people:{[id]:state}};
 return {state,n,s,world:{sim:{s},npcs:new Map([[id,n]]),t:10}};
}
test('ground sitting uses the actual activity and seat, including restored night plans',()=>{
 for(const id of ['beggar','porter','fu']){
  const {s,state}=fixture(id);assert.equal(groundSeatWanted(s,id,{x:0,z:0}),true);
  assert.equal(groundSeatWanted(JSON.parse(JSON.stringify(s)),id,{x:0,z:0}),true);
  assert.equal(groundSeatWanted(s,id,{x:2,z:0}),false);
  state.life.target={x:-5,z:27.2};assert.equal(atStool(state.life.target),true);assert.equal(groundSeatWanted(s,id,state.life.target),false);
 }
 const {s,state}=fixture();state.life.activity='duty';assert.equal(groundSeatWanted(s,'porter',{x:0,z:0}),true);
 s.convoy={phase:'travel'};assert.equal(groundSeatWanted(s,'porter',{x:0,z:0}),false);
});
test('sitting eases in and rises before a route; danger, death, restraint and movement win',()=>{
 const {world,n,state}=fixture();npcGroundSeat(world,'porter',.2);const first=n.actor.userData.groundPose.weight;assert.ok(first>0&&first<1);
 for(let i=0;i<70;i++)npcGroundSeat(world,'porter',1/60);assert.equal(n.actor.userData.groundPose.weight,1);
 n.groundRising=true;state.life.target={x:3,z:0};for(let i=0;i<40;i++)npcGroundSeat(world,'porter',1/60);assert.equal(n.groundWeight,0);assert.equal(n.actor.userData.groundPose,null);
 for(const update of [{hp:0},{stunnedUntil:20},{restraint:{kind:'bound'}},{drowning:true},{awareness:{state:'fight'}},{sickUntil:20}]){
  Object.assign(state,{hp:100,stunnedUntil:0,restraint:null,drowning:false,awareness:null,sickUntil:0},update);n.groundWeight=1;npcGroundSeat(world,'porter',.01);assert.equal(n.actor.userData.groundPose,null);
 }
 Object.assign(state,{sickUntil:0});n.groundWeight=1;npcGroundSeat(world,'porter',.01,1);assert.equal(n.groundWeight,0);
});
test('production commoner legs fold forward and meet the ground without moving the world root',async()=>{
 const {model,wrapper}=await modelFixture('npc-commoner.glb',1.98),actor=new T.Group(),rig=new T.Group();actor.add(rig);rig.add(wrapper);actor.position.set(5,0,31);actor.rotation.y=.8;actor.updateMatrixWorld(true);
 const bones={};for(const [key,name]of Object.entries({rightLeg:'RightUpLeg',rightShin:'RightLeg',leftLeg:'LeftUpLeg',leftShin:'LeftLeg',rightArm:'RightArm',rightFore:'RightForeArm',leftArm:'LeftArm',leftFore:'LeftForeArm'}))bones[key]=model.getObjectByName('mixamorig'+name);
 const hip=model.getObjectByName('mixamorigHips'),height=rig.worldToLocal(hip.getWorldPosition(new T.Vector3())).y;
 groundSeatBones(rig,bones,height,{weight:1});actor.updateMatrixWorld(true);
 const local=b=>actor.worldToLocal(b.getWorldPosition(new T.Vector3()));
 assert.ok(local(hip).y<.3&&local(hip).y>.2);
 for(const side of ['right','left']){const knee=local(bones[side+'Shin']),ankle=local(bones[side+'Shin'].children.find(c=>c.isBone));assert.ok(knee.z>.25);assert.ok(ankle.y>0&&ankle.y<.2,JSON.stringify(ankle));assert.ok(knee.y<.25);}
 assert.deepEqual(actor.position.toArray(),[5,0,31]);
});
test('the pleated bun remains one directly raycastable item with a flat base',()=>{
 const bun=bunMesh(),box=new T.Box3().setFromObject(bun),ray=new T.Raycaster(new T.Vector3(0,1,0),new T.Vector3(0,-1,0));
 assert.equal(ray.intersectObject(bun)[0]?.object,bun);assert.ok(box.max.y-box.min.y<.17);assert.ok(Math.abs(box.min.y+.105*bun.scale.y)<.001);
 assert.equal(bun.children.length,0);assert.equal(bun.userData.foodModel,'bun');
});
test('buns rest on the production stall surface instead of hovering over its baskets',async()=>{
 const {wrapper}=await modelFixture('stall.glb',2.4);wrapper.rotation.y=0;
 const stall=new T.Group();stall.position.set(-10,0,27);stall.add(wrapper);
 const foods=Array.from({length:5},()=>bunMesh());stall.add(...foods);placeStallBuns(wrapper,foods);stall.updateMatrixWorld(true);
 for(const bun of foods){
  const pos=bun.getWorldPosition(new T.Vector3()),hit=new T.Raycaster(new T.Vector3(pos.x,1.5,pos.z),new T.Vector3(0,-1,0)).intersectObject(wrapper,true)[0];
  assert.ok(hit);assert.ok(pos.y<.9&&pos.y>.7);assert.ok(Math.abs(pos.y-.105*bun.scale.y-hit.point.y)<.004);
 }
});
