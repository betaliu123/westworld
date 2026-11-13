import test from 'node:test';import assert from 'node:assert/strict';
import {stuckStep,nearestWalkable,routinePath,recoverySpot} from '../src/npc-navigation.js';
import {recoverNpc} from '../src/npc-recovery.js';
import * as T from '../vendor/three.module.js';
import {Simulation,newArrival} from '../src/simulation.js';
import {SEATS} from '../src/npc-life.js';import {TEA_CUPS} from '../src/tea-service.js';
test('blocked locomotion replans first and recovers only after sustained lack of progress',()=>{const watch={},actions=[];for(let i=0;i<200;i++){const result=stuckStep(watch,{x:0,z:0},true,.05);if(result)actions.push({result,time:i*.05});}assert.deepEqual(actions.map(a=>a.result),['repath','recover']);assert.ok(actions[0].time>=2.9);assert.ok(actions[1].time>=8.9);});
test('sitting, stunned, paused and genuine travel never trigger recovery',()=>{for(const eligible of [false,true]){const watch={};for(let i=0;i<400;i++)assert.equal(stuckStep(watch,{x:0,z:0},false,.05,eligible),null);}const watch={};for(let i=0;i<400;i++)assert.equal(stuckStep(watch,{x:i*.05,z:0},true,.05),null);const paused={};for(let i=0;i<400;i++)assert.equal(stuckStep(paused,{x:0,z:0},true,.05,false),null);});
test('small blocked oscillations cannot disguise a stuck NPC as forward progress',()=>{const watch={};let recovered=false;for(let i=0;i<200;i++)if(stuckStep(watch,{x:i%2*.08,z:0},true,.05)==='recover')recovered=true;assert.ok(recovered);});

test('short turning gaps preserve blocked attempts, but waiting resets them',()=>{
 const watch={},actions=[];for(let i=0;i<220;i++){const a=stuckStep(watch,{x:0,z:0},i%20!==0,.05);if(a)actions.push(a);}
 assert.deepEqual(actions,['repath','recover']);
 for(let i=0;i<170;i++)stuckStep(watch,{x:0,z:0},true,.05);
 for(let i=0;i<20;i++)stuckStep(watch,{x:0,z:0},false,.05);
 assert.equal(watch.elapsed,0);
});

test('recovery rejects a clear but enclosed pocket and searches beyond the old three metre radius',()=>{
 const blocked=(x,z)=>Math.hypot(x,z)>.55&&Math.hypot(x,z)<3.7;
 const safe=recoverySpot({x:0,z:0},{x:0,z:2},blocked);
 assert.ok(safe&&Math.hypot(safe.x,safe.z)>3.7);assert.equal(blocked(safe.x,safe.z),false);
 assert.equal(recoverySpot({x:0,z:0},{x:0,z:2},()=>true),null);
});

function recoveryFixture(){
 const sim=new Simulation(newArrival());sim.s.npcClock=1;sim.s.ecosystem={objects:{},items:[{id:'kept',location:'npc:inspector',poisoned:true}]};
 let saves=0;sim.save=()=>saves++;
 const actor=new T.Group();actor.position.set(0,0,-20.2);
 const n={actor,base:new T.Vector3(10,0,-23),route:[{x:0,z:0}],routeKey:'old',motionPosition:actor.position.clone()};
 const hero=new T.Group();hero.position.set(10,0,-23);
 const world={sim,hero,npcs:new Map([['inspector',n]]),playing:true,t:0,collides:()=>false};
 return {world,sim,n,saves:()=>saves};
}
function blockedFrames(g,frames=200,attempted=true){for(let i=0;i<frames;i++){g.world.t+=.05;g.n.actor.userData.attemptedMove=attempted;recoverNpc(g.world,'inspector',g.n,.05);}}

test('teleport changes only position/recovery metadata, avoids occupied ground and survives reload',()=>{
 const g=recoveryFixture(),state=g.sim.s.people.inspector;Object.assign(state,{hp:37,energy:21,relation:-8,purse:6,pendingPoison:{at:500,itemId:'kept'},memories:['旧事'],life:{activity:'returnDay'}});
 const before=structuredClone(g.sim.s);blockedFrames(g);
 assert.equal(state.navigationRecoveries,1);assert.ok(g.n.actor.position.distanceTo(g.world.hero.position)>.85);assert.ok(g.n.motionPosition.equals(g.n.actor.position));
 for(const key of ['hp','energy','relation','purse','pendingPoison','memories','life'])assert.deepEqual(state[key],before.people.inspector[key],key);
 assert.deepEqual(g.sim.s.ecosystem,before.ecosystem);assert.deepEqual(g.sim.s.facts,before.facts);assert.equal(g.saves(),1);
 const loaded=new Simulation(JSON.parse(JSON.stringify(g.sim.s)));assert.equal(loaded.s.people.inspector.x,state.x);assert.equal(loaded.s.people.inspector.navigationRecoveries,1);
 blockedFrames(g);assert.equal(g.saves(),1,'cooldown prevents repeated teleport');
});

test('combat, pursuit, custody, danger, sleep and intentional pauses cannot use recovery',()=>{
 const changes=[g=>g.world.locked=true,g=>g.world.cinematic={},g=>g.world.performance={},g=>g.world.trainingActor='inspector',
  g=>g.n.chasing=true,g=>g.n.fleeing=true,...['fight','flee','warn','investigate','search'].map(state=>g=>g.sim.s.people.inspector.awareness={state}),
  ...['sleep','escape','nightPursuit','escort'].map(activity=>g=>g.sim.s.people.inspector.life={activity}),
  g=>g.sim.s.people.inspector.hp=0,g=>g.sim.s.people.inspector.stunnedUntil=100,g=>g.sim.s.people.inspector.inCustody=true,g=>g.sim.s.people.inspector.drowning=true,g=>g.sim.s.people.inspector.burning=true];
 for(const change of changes){const g=recoveryFixture();change(g);blockedFrames(g);assert.equal(g.saves(),0);assert.equal(g.n.actor.position.x,0);}
 const idle=recoveryFixture();blockedFrames(idle,400,false);assert.equal(idle.saves(),0);
});

test('no safe landing leaves the actor and game state intact',()=>{
 const g=recoveryFixture();g.world.collides=()=>true;blockedFrames(g);assert.equal(g.saves(),0);assert.equal(g.n.actor.position.z,-20.2);assert.equal(g.sim.s.people.inspector.navigationRecoveries,undefined);
});
test('tea guests have distinct seats and the new table has a usable serving approach',()=>{const seats=Object.values(SEATS);for(let i=0;i<seats.length;i++)for(let j=i+1;j<seats.length;j++)assert.ok(Math.hypot(seats[i].x-seats[j].x,seats[i].z-seats[j].z)>1.1);const cup=TEA_CUPS.find(c=>c.guest==='gate_merchant');assert.ok(cup);const blocked=(x,z)=>Math.abs(z)>34||[27.2,30,32.6].some(t=>Math.abs(x+6.5)<1.15&&Math.abs(z-t)<.8);const target={x:-6.5,z:cup.z+1.15};assert.ok(routinePath({x:-11.8,z:30.2},target,blocked).length);const safe=nearestWalkable({x:-6.5,z:30},blocked);assert.ok(safe&&!blocked(safe.x,safe.z));assert.equal(nearestWalkable({x:0,z:0},()=>true),null);});
