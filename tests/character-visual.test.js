import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../vendor/three.module.js';
import {character,World} from '../src/world.js';
import {bodyFeedback} from '../src/body-feedback.js';
import {NpcGesture} from '../src/npc-gesture.js';
import {mountAppearanceModel} from '../src/appearance-model.js';
import {modelFixture} from './model-fixture.js';

test('unloaded actors contain no legacy body or sword geometry, and keep their pivots',()=>{
  for(const hero of [true,false]){const actor=character(0x385953,hero);let meshes=0;actor.traverse(o=>meshes+=Number(o.isMesh===true));assert.equal(meshes,0);assert.equal(actor.userData.arms.length,2);assert.equal(actor.userData.legs.length,2);assert.equal(actor.userData.rig.visible,false);}
});
test('a downed saved actor remains finite while its real skin is loading',()=>{
  const actor=character(0x385953);World.prototype.animateActor.call({t:0},actor,0,.016,'down');bodyFeedback(actor,0,0,.016);assert.ok(actor.userData.rig.position.toArray().every(Number.isFinite));
});
test('a restored cape field does not mount back geometry or break the real appearance update',async()=>{
  const {wrapper,model}=await modelFixture(),actor=character(0x385953,true);actor.userData.rig.add(wrapper);
  const bindPose=[];model.traverse(bone=>{if(bone.isBone)bindPose.push({bone,position:bone.position.clone(),quaternion:bone.quaternion.clone()});});
  const appearance=mountAppearanceModel({ready:true,wrapper,bindPose},actor);
  const s={time:35,player:{hp:100,hat:true,cape:'old-cape',wornOutfit:'shirt'},people:{},ecosystem:{items:[{id:'shirt',type:'clothing',appearanceModel:'hero',location:'player',hp:100}]}};
  appearance.update(s);await Promise.resolve();appearance.update(s);
  let backMeshes=0;appearance.root.traverseVisible(o=>{if(o.isMesh)backMeshes++;});
  assert.equal(backMeshes,0);assert.equal(s.player.cape,'old-cape');assert.equal(appearance.root.userData.version,1);
});
test('every shipped NPC skin has usable hand and hip anchors without a block fallback',async()=>{
  for(const kind of ['prince','guard','woman','commoner','constable','envoy','sandgang','maskopera']){
    const {wrapper,model}=await modelFixture('npc-'+kind+'.glb');const actor=new T.Group();actor.add(wrapper);actor.updateMatrixWorld(true);
    const gesture=new NpcGesture(actor,model,2);assert.ok(Number.isFinite(gesture.hipRest),kind);assert.ok(gesture.handPoint(-1)?.toArray().every(Number.isFinite),kind);assert.ok(gesture.handPoint(1)?.toArray().every(Number.isFinite),kind);
  }
});
