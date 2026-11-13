import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../vendor/three.module.js';
import {solveArm,handGoals} from '../src/npc-gesture.js';
import {npcArriveStep,npcTravelStep} from '../src/npc-locomotion.js';

function armRig() {
 const root=new T.Group(),upper=new T.Bone(),fore=new T.Bone(),hand=new T.Bone();
 root.add(upper);upper.add(fore);fore.add(hand);
 upper.position.set(.25,1.5,0);fore.position.set(0,-.3,0);hand.position.set(0,-.3,0);
 root.position.set(5,0,-3);root.rotation.y=.9;root.scale.setScalar(1.3);root.updateMatrixWorld(true);
 return {root,upper,fore,hand};
}
test('hand IK reaches a prop with a bent elbow under rotated/scaled actors',()=>{
 const {root,upper,fore,hand}=armRig();
 const goal=root.localToWorld(new T.Vector3(.2,1.25,.3)),pole=root.localToWorld(new T.Vector3(.65,1.1,-.1));
 const before=hand.getWorldPosition(new T.Vector3());
 solveArm(upper,fore,hand,goal,pole);
 assert.ok(hand.getWorldPosition(new T.Vector3()).distanceTo(goal)<1e-6);
 assert.ok(before.distanceTo(goal)>.3);
 assert.ok(upper.quaternion.angleTo(new T.Quaternion())>.1);
 assert.ok(fore.quaternion.angleTo(new T.Quaternion())>.1);
});
test('IK blends into gestures and clamps unreachable hands without stretching bones',()=>{
 const {root,upper,fore,hand}=armRig(),goal=root.localToWorld(new T.Vector3(.2,1.2,.3));
 const pole=root.localToWorld(new T.Vector3(.6,1,-.1)),before=hand.getWorldPosition(new T.Vector3()).distanceTo(goal);
 solveArm(upper,fore,hand,goal,pole,.4);
 const after=hand.getWorldPosition(new T.Vector3()).distanceTo(goal);
 assert.ok(after>0&&after<before);
 solveArm(upper,fore,hand,new T.Vector3(30,10,20),pole);
 assert.ok(hand.getWorldPosition(new T.Vector3()).distanceTo(upper.getWorldPosition(new T.Vector3()))<=.6*1.3*.941);
 assert.equal(fore.position.length(),.3);assert.equal(hand.position.length(),.3);
 assert.ok(upper.quaternion.toArray().every(Number.isFinite));
});
test('held props use two hands; drinking leaves the other arm to the captured clip',()=>{
 assert.equal(handGoals({kind:'drink'})[0],null);
 assert.equal(handGoals({kind:'ribbon'}).filter(Boolean).length,2);
 assert.ok(handGoals({kind:'ribbon',throwTime:.55})[0][1]>handGoals({kind:'ribbon'})[0][1]);
 assert.equal(handGoals({kind:'unknown'}),null);
});
test('NPC travel eases in, brakes near goals and never crosses stopping radius',()=>{
 let distance=4,speed=0,first=0;
 for(let i=0;i<600;i++){
  const request=npcArriveStep(distance,1.6,1/60,.18),step=npcTravelStep(request,speed,1/60);
  if(!i)first=step*60;
  assert.ok(step>=0&&step<=request);
  distance-=step;speed=step*60;
 }
 assert.ok(first>0&&first<.5);
 assert.ok(distance>=.18&&distance<.181);
 assert.ok(speed<.01);
 assert.equal(npcTravelStep(1,1,0),0);
 assert.equal(npcArriveStep(.1,2,.1,.18),0);
});
