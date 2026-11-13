import test from 'node:test';
import assert from 'node:assert/strict';
import {Simulation,newArrival} from '../src/simulation.js';
import {Ecosystem} from '../src/ecosystem.js';
import {witnessEvent,advanceAwareness} from '../src/npc-awareness.js';
import {startComplaint,abandonSurrender,answerComplaint,complaintChoices} from '../src/complaints.js';
import {beginSurrender,surrenderCandidates,surrenderCurrent,surrenderFrame} from '../src/surrender.js';
import {assaultReaction,activeConflict} from '../src/combat-conflict.js';
import {flattenResponses} from '../src/contextual-responses.js';

function setup(target='shen',witnesses=[target]){
 const sim=new Simulation(newArrival(),()=>.99);sim.save=()=>{};new Ecosystem(sim);const s=sim.s;
 s.event=null;Object.assign(s.player,{x:0,z:0});
 const positions=Object.fromEntries(witnesses.map((id,i)=>[id,{x:1+i*.6,z:0}]));
 for(const id of witnesses){s.people[id].life={activity:'idle'};s.people[id].hp=s.people[id].maxHp;}
 const event={type:'assault',target,x:0,z:0,witnesses,identities:Object.fromEntries(witnesses.map(id=>[id,'player']))};
 for(const id of witnesses)witnessEvent(sim,id,event,true,positions[id]);startComplaint(sim,event);
 return {sim,s,event,context:{positions,obstacles:[]}};
}
test('assault responds through world actions, never opens a complaint or rolls',()=>{
 for(const target of ['shen','gao','thief','gate_guard']){const {sim,s}=setup(target);assert.equal(s.complaint.phase,'conflict');assert.equal(s.people[target].awareness.state,['shen','gate_guard'].includes(target)?'fight':'flee');assert.ok(activeConflict(s));sim.rng=()=>{throw Error('no roll');};assert.ok(beginSurrender(sim,{positions:{[target]:{x:2,z:0}},obstacles:[]}).id);}
});
test('witnesses flee; trained relatives defend; injury overrides fighting',()=>{
 const {s}=setup('mei',['mei','gang_boss','gao','gate_guard']);
 assert.equal(s.people.mei.awareness.state,'fight');assert.equal(s.people.gang_boss.awareness.state,'fight');assert.equal(s.people.gao.awareness.state,'flee');assert.equal(s.people.gate_guard.awareness.state,'fight');
 s.people.gang_boss.hp=25;assert.equal(assaultReaction(s,'gang_boss',{target:'mei'}),'flee');
});
test('repeat blows and repeat surrender keep the same cause, payment and attempts',()=>{
 const {sim,s,event,context}=setup(),cause=s.complaint.cause;
 beginSurrender(sim,context);s.complaint.phase='ask';s.player.money=100;answerComplaint(sim,'pay',context);
 assert.equal(s.player.money,88);abandonSurrender(sim);s.npcClock=2;startComplaint(sim,{...event,investigationId:undefined});
 assert.equal(s.complaint.cause,cause);assert.ok(s.complaint.paid);beginSurrender(sim,context);s.complaint.phase='ask';assert.ok(answerComplaint(sim,'pay',context).error);assert.equal(s.player.money,88);
 assert.equal(s.investigations.cases.length,1);
});
test('surrender never targets remote, occluded, sleeping, bound, mute or incapacitated people',()=>{
 for(const patch of [{hp:0},{hp:20},{restraint:{by:'player'}},{inCustody:true},{stunnedUntil:20},{muteUntil:20},{drowning:true},{life:{activity:'sleep'}}]){const {s,context}=setup();Object.assign(s.people.shen,patch);assert.deepEqual(surrenderCandidates(s,context),[]);}
 const {s,context}=setup();context.positions.shen={x:11,z:0};assert.deepEqual(surrenderCandidates(s,context),[]);context.positions.shen.x=2;context.obstacles=[{x:1,z:0,w:.2,d:4}];assert.deepEqual(surrenderCandidates(s,context),[]);
});
test('pending surrender waits for contact; movement or timeout cancels without immunity',()=>{
 const {sim,s,context}=setup();context.positions.shen.x=7;beginSurrender(sim,context);const events=[];sim.listeners.push((type)=>events.push(type));
 const world={sim,hero:{position:s.player},obstacles:[],npcs:new Map([['shen',{actor:{position:context.positions.shen}}]])};
 surrenderFrame(world);assert.equal(s.complaint.phase,'surrender');assert.ok(!events.includes('complaintAsk'));
 context.positions.shen.x=2;surrenderFrame(world);assert.equal(s.complaint.phase,'ask');assert.equal(events.filter(t=>t==='complaintAsk').length,1);surrenderFrame(world);assert.equal(events.filter(t=>t==='complaintAsk').length,1);
 abandonSurrender(sim);assert.equal(s.people.shen.awareness.state,'fight');beginSurrender(sim,context);s.player.z=1;assert.equal(surrenderCurrent(s,context),false);surrenderFrame(world);assert.equal(s.surrender,undefined);assert.equal(s.complaint.phase,'conflict');
 s.player.z=0;context.positions.shen.x=7;beginSurrender(sim,context);s.npcClock=13;surrenderFrame(world);assert.equal(s.surrender,undefined);
});
test('reload drops transient surrender, keeps evidence and already paid compensation',()=>{
 const {sim,s,context}=setup();beginSurrender(sim,context);s.complaint.phase='ask';s.player.money=100;answerComplaint(sim,'pay',context);
 const loaded=new Simulation(JSON.parse(JSON.stringify(s)));assert.equal(loaded.s.complaint.phase,'conflict');assert.equal(loaded.s.surrender,undefined);assert.ok(loaded.s.complaint.paid);assert.equal(loaded.s.player.money,88);assert.equal(loaded.s.investigations.cases[0].dispute,loaded.s.complaint);
});
test('an injured player can flee; sight loss searches the last known place',()=>{
 const {sim,s}=setup('gate_guard');s.player.hp=20;advanceAwareness(sim,'gate_guard',{x:1,z:0},false,.1,true);assert.equal(s.people.gate_guard.awareness.state,'search');assert.equal(s.event,null);s.player.x=20;assert.equal(s.people.gate_guard.awareness.lastKnown.x,0);
});
test('officer accepts surrender with a real custody choice; civilians cannot imprison',()=>{
 for(const target of ['gate_guard','shen']){const {sim,s,context}=setup(target);beginSurrender(sim,context);s.complaint.phase='ask';const choices=flattenResponses(complaintChoices(sim));assert.equal(choices.some(e=>e.action.id==='submit'),target==='gate_guard');if(target==='gate_guard'){const r=answerComplaint(sim,'submit',context);assert.ok(r.success);assert.equal(s.event.gate.phase,'prison');assert.equal(s.surrender,undefined);}}
});

test('a granted breathing pause holds combat for ten seconds and cannot be farmed',()=>{
 const {sim,s,context}=setup();s.player.hp=20;sim.rng=()=>0;beginSurrender(sim,context);s.complaint.phase='ask';
 const choice=flattenResponses(complaintChoices(sim)).find(e=>e.action.response?.effect==='pause');assert.ok(choice);
 answerComplaint(sim,choice.action.id,context);assert.equal(s.complaint.phase,'pause');assert.ok(s.surrender);assert.equal(s.player.hp,20);
 s.npcClock=9;assert.ok(surrenderCurrent(s,context));s.npcClock=10;assert.equal(surrenderCurrent(s,context),false);abandonSurrender(sim);
 beginSurrender(sim,context);s.complaint.phase='ask';assert.ok(!flattenResponses(complaintChoices(sim)).some(e=>e.action.response?.effect==='pause'));
});

test('surrender during a non-assault pursuit resumes on cancel and reload without losing attempts',()=>{
 const {sim,s,context}=setup('gate_guard');s.investigations.cases=[];delete s.complaint;
 s.people.gate_guard.awareness.wantedCase={subject:'player',charges:[{code:'theft'}]};
 beginSurrender(sim,context);s.complaint.attempts.push('explain');assert.equal(s.complaint.type,'theft');assert.ok(abandonSurrender(sim));assert.equal(s.complaint.phase,'conflict');
 beginSurrender(sim,context);assert.deepEqual(s.complaint.attempts,['explain']);
 const loaded=new Simulation(JSON.parse(JSON.stringify(s)));assert.equal(loaded.s.surrender,undefined);assert.equal(loaded.s.complaint.phase,'conflict');assert.deepEqual(loaded.s.complaint.attempts,['explain']);assert.equal(loaded.s.people.gate_guard.awareness.surrenderDispute,loaded.s.complaint);
});
