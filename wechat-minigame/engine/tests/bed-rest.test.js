import test from 'node:test';
import assert from 'node:assert/strict';
import {Simulation,newArrival} from '../src/simulation.js';
import {Ecosystem} from '../src/ecosystem.js';
import {bedFor,homeFor,roomAt,applyNight,nightPlan,wakeNpc,finishNightConversation} from '../src/night-life.js';
import {bedPreview,beginBedRest,bedRestStep,wakePlayer} from '../src/bed-rest.js';
import * as T from '../vendor/three.module.js';
import {bedBones,npcBedPose} from '../src/bed-pose.js';
const fixture=()=>{const sim=new Simulation(newArrival()),eco=new Ecosystem(sim);sim.s.time=170;sim.s.npcClock=40;sim.s.facts.enteredCity=true;sim.s.event=null;const b=bedFor('bookseller');Object.assign(sim.s.player,{x:b.xTarget,z:b.zTarget,hp:80,energy:40});eco.s.objects['bed:bookseller']={id:'bed:bookseller',hp:180};return {sim,eco,b};};
test('waking interrupts bedtime briefly; neither refusal nor conversation opens a work shift',()=>{
 for(const trust of [0,10]){const {sim,b}=fixture(),n=sim.s.people.bookseller,q={x:b.xTarget,z:b.zTarget};Object.assign(n,q,{trust,life:{activity:'sleep',night:true}});wakeNpc(sim,'bookseller',{bookseller:q});
  assert.equal(roomAt(nightPlan(sim,'bookseller',q).target)?.id,'bookshop');finishNightConversation(sim,'bookseller');sim.s.npcClock+=3;
  assert.equal(nightPlan(sim,'bookseller',q).activity,'sleep');
  const restored=new Simulation(JSON.parse(JSON.stringify(sim.s)));assert.equal(nightPlan(restored,'bookseller',q).activity,'sleep');
 }
});
test('Mei has an indoor bed and must pass her entrance before sleeping',()=>{
 const {sim}=fixture(),h=homeFor('mei'),b=bedFor('mei');assert.equal(h.id,'redhouse');assert.equal(roomAt(b)?.id,h.id);
 assert.equal(nightPlan(sim,'mei',{x:22,z:8.9}).activity,'home');assert.equal(nightPlan(sim,'mei',{x:b.xTarget,z:b.zTarget}).activity,'sleep');
});
test('empty beds warn without gating sleep behind permission; no witness creates no accusation',()=>{
 const {sim,eco}=fixture(),before=sim.s.people.bookseller.relation;assert.match(bedPreview(sim,'bed:bookseller').warning,/别人的床/);
 assert.equal(beginBedRest(sim,'bed:bookseller',{},[]),null);bedRestStep(sim,eco,.1,{},[]);bedRestStep(sim,eco,2,{},[]);assert.equal(sim.s.player.bedRest.phase,'sleep');assert.equal(sim.s.people.bookseller.relation,before);
 const hp=sim.s.player.hp;sim.tick(2);assert.ok(sim.s.player.hp>hp);assert.ok(sim.s.player.energy>40);
});
test('occupied beds, walls and dangerous conditions refuse before any rest reward',()=>{
 const {sim,eco,b}=fixture(),n=sim.s.people.bookseller,q={x:b.xTarget,z:b.zTarget};Object.assign(n,q,{life:{activity:'sleep',night:true}});
 assert.match(beginBedRest(sim,'bed:bookseller',{bookseller:q},[]),/床上有人/);assert.equal(sim.s.player.bedRest,undefined);assert.equal(sim.s.player.hp,80);
 n.life={activity:'idle'};sim.s.player.x+=1;const wall={id:'wall',x:b.x+.5,z:b.zTarget,w:.1,d:2};assert.match(beginBedRest(sim,'bed:bookseller',{},[wall]),/床边/);
});
test('only awake, present, facing residents can object; the consequence is remembered once',()=>{
 for(const kind of ['sleep','away','behind','wall','seen']){const {sim,eco,b}=fixture(),n=sim.s.people.bookseller,q={x:b.xTarget,z:b.zTarget+1};Object.assign(n,q,{facing:kind==='behind'?0:Math.PI,life:{activity:kind==='sleep'?'sleep':'awake'}});if(kind==='away')q.z+=9;const relation=n.relation,obstacles=kind==='wall'?[{id:'w',x:q.x,z:q.z-.5,w:2,d:.1}]:[];
  beginBedRest(sim,'bed:bookseller',{},[]);bedRestStep(sim,eco,.1,{bookseller:q},obstacles);
  assert.equal(sim.s.player.bedRest.phase,kind==='seen'?'rise':'lower',kind);assert.equal(n.relation,relation-(kind==='seen'?2:0),kind);
  if(kind==='seen'){delete sim.s.player.bedRest;beginBedRest(sim,'bed:bookseller',{},[]);bedRestStep(sim,eco,.1,{bookseller:q},[]);assert.equal(n.relation,relation-2);assert.ok(n.memories.some(m=>m.includes('擅用')));}
 }
});
test('returning owner waits next to an occupied bed; cannot lie through the player',()=>{
 const {sim,b}=fixture();beginBedRest(sim,'bed:bookseller',{},[]);const plan=nightPlan(sim,'bookseller',{x:b.xTarget,z:b.zTarget});assert.notDeepEqual(plan.target,{x:b.xTarget,z:b.zTarget});assert.equal(nightPlan(sim,'bookseller',plan.target).activity,'bedWait');
});
test('cancellation, injury and reload never grant an instant rest reward or transfer the bed',()=>{
 const {sim,eco}=fixture();beginBedRest(sim,'bed:bookseller',{},[]);wakePlayer(sim);bedRestStep(sim,eco,2,{},[]);assert.equal(sim.s.player.bedRest,undefined);assert.equal(sim.s.player.hp,80);
 beginBedRest(sim,'bed:bookseller',{},[]);bedRestStep(sim,eco,.1,{},[]);bedRestStep(sim,eco,2,{},[]);
 const loaded=new Simulation(JSON.parse(JSON.stringify(sim.s))),loadedEco=new Ecosystem(loaded);assert.equal(loaded.s.player.hp,80);assert.equal(loaded.s.player.bedRest.phase,'sleep');loaded.s.player.hp=70;bedRestStep(loaded,loadedEco,.1,{},[]);assert.equal(loaded.s.player.bedRest.phase,'rise');assert.equal(loaded.s.player.hp,70);
});
test('bed arms follow the rig axes on both T and A pose skeletons',()=>{
 for(const angle of [0,1.2,-.8]){const rig=new T.Group(),bones={};rig.rotation.set(-Math.PI/2,.3,0);for(const side of ['right','left']){const arm=new T.Bone(),fore=new T.Bone(),hand=new T.Bone();rig.add(arm);arm.rotation.set(angle,.5,-.8);arm.add(fore);fore.position.set(.4,0,0);fore.add(hand);hand.position.set(.3,0,0);bones[side+'Arm']=arm;bones[side+'Fore']=fore;}
  bedBones(rig,bones,{weight:1});rig.updateMatrixWorld(true);for(const side of ['right','left']){const vector=bones[side+'Fore'].getWorldPosition(new T.Vector3()).sub(bones[side+'Arm'].getWorldPosition(new T.Vector3())).normalize().applyQuaternion(rig.quaternion.clone().invert());assert.ok(vector.y<-.97,'arms stay beside torso, not spread sideways');}
 }
});
test('missing bed is a seated doze; death and danger cancel the sleeping pose',()=>{
 const {sim,eco,b}=fixture();eco.s.objects['bed:bookseller'].hp=0;assert.equal(nightPlan(sim,'bookseller',{x:b.xTarget,z:b.zTarget}).activity,'doze');
 const actor=new T.Group();actor.userData={};const n={actor,bedWeight:1},world={sim,npcs:new Map([['bookseller',n]])};sim.s.people.bookseller.hp=0;npcBedPose(world,'bookseller',.1);assert.equal(n.bedWeight,0);assert.equal(actor.userData.bedPose,null);
});
