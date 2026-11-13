import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../vendor/three.module.js';
import {World} from '../src/world.js';
import {Simulation,newArrival} from '../src/simulation.js';

const DT=1/30;
function fixture(){
 const sim=new Simulation(newArrival()),hero=new T.Group(),npc=new T.Group();
 hero.position.set(5.5,0,33);npc.position.set(5.5,0,40);
 const w=Object.assign(Object.create(World.prototype),{sim,hero,npcs:new Map([['porter',{actor:npc}]]),props:[],obstacles:[],t:0,npcMoveDt:DT});
 return {w,npc};
}
// Ask for 3 m/s along heading for the given time; report how far the body went while it still faced away.
function walk(w,npc,heading,seconds,{free=false,before}={}){
 let slid=0;
 for(let i=0;i<Math.round(seconds/DT);i++){
  w.t+=DT;before?.();const from=npc.position.clone(),away=Math.cos(heading-npc.rotation.y)<.45;
  w.move(npc,Math.sin(heading)*3*DT,Math.cos(heading)*3*DT,free);
  if(away)slid+=npc.position.distanceTo(from);
 }
 return slid;
}

test('an NPC told to go the other way pivots on the spot, then walks facing where it goes',()=>{
 const {w,npc}=fixture(),start=npc.position.clone();
 assert.equal(walk(w,npc,Math.PI,.2),0,'no backwards travel');assert.ok(npc.position.equals(start));assert.ok(Math.abs(npc.rotation.y)>1);
 assert.equal(walk(w,npc,Math.PI,1.3),0);assert.ok(start.z-npc.position.z>2,'it sets off once it has turned');
 assert.ok(Math.cos(Math.PI-npc.rotation.y)>.95);
});

test('a quarter turn slows the first steps instead of sliding sideways at full speed',()=>{
 const {w,npc}=fixture();npc.rotation.y=Math.PI/3-.05;const from=npc.position.clone();
 walk(w,npc,0,DT);assert.ok(npc.position.distanceTo(from)<3*DT*.6);
});

test('a startled NPC keeps its feet planted until the startle has played',()=>{
 const {w,npc}=fixture(),start=npc.position.clone();w.t=5;npc.userData.startledAt=5;
 walk(w,npc,0,.65);assert.ok(npc.position.equals(start));assert.equal(npc.rotation.y,0);assert.ok(!npc.userData.attemptedMove,'standing startled is not being stuck');
 walk(w,npc,0,.6);assert.ok(npc.position.z-start.z>.8);
});

test('rope-led and escorting movers are not held, and slow settling steps are not turned',()=>{
 const {w,npc}=fixture(),start=npc.position.clone();npc.userData.startledAt=0;
 walk(w,npc,Math.PI,.2,{free:true});assert.ok(start.z-npc.position.z>.3);assert.equal(npc.rotation.y,0);
 const slow=fixture();slow.w.t=1;slow.w.move(slow.npc,0,-.2*DT);assert.ok(slow.npc.position.z<40);assert.equal(slow.npc.rotation.y,0);
});

test('a caller that keeps facing elsewhere is released after a short hold instead of freezing',()=>{
 const {w,npc}=fixture(),start=npc.position.clone();
 walk(w,npc,Math.PI,.5,{before:()=>npc.rotation.y=0});assert.ok(npc.position.equals(start));
 walk(w,npc,Math.PI,.6,{before:()=>npc.rotation.y=0});assert.ok(start.z-npc.position.z>.5);
});
