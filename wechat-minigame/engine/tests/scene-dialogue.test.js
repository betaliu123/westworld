import test from 'node:test';
import assert from 'node:assert/strict';
import {Simulation,newArrival,legacyArrival} from '../src/simulation.js';
import {visitGate} from '../src/gate-scene.js';
import {sceneDialogueReady,continuesSceneDialogue} from '../src/dialogue.js';

test('new chapter NPC and object visits cannot select retired gate conversations',()=>{
 for(const [target,x,z] of [['relay',-7,24],['gate_merchant',6,24],['scribe',11,24],['runner-clothes',-11,24.5],['cargo-cover',4.4,25.5],['merchant-pass',4.4,24],['scribe-table',11,24.5]]){
  const sim=new Simulation(newArrival());Object.assign(sim.s.player,{x,z});
  const before=JSON.stringify(sim.s);
  assert.equal(visitGate(sim,target,true),false,target+' preview');
  assert.equal(visitGate(sim,target),false,target+' visit');
  assert.equal(JSON.stringify(sim.s),before,'visiting does not select a story');
 }
});

test('v2 saves in retired stages recover the gate without changing possessions or story facts',()=>{
 for(const phase of ['relay','clothes','merchant','cover','scribe']){
  const s=newArrival();s.event.gate={phase,attempts:['g_plead'],facts:{dispatchKnown:true}};
  s.event.point=[-7,24];s.event.cast=['relay'];s.player.inventory.push('旧差役服');s.facts.entryRulesKnown=true;
  const before=JSON.stringify([s.player,s.facts,s.event.gate.attempts,s.event.gate.facts]);
  const sim=new Simulation(s);
  assert.equal(sim.event.gate.phase,'gate');assert.deepEqual(sim.event.point,[0,24]);assert.deepEqual(sim.event.cast,['gate_guard']);
  assert.equal(JSON.stringify([s.player,s.facts,s.event.gate.attempts,s.event.gate.facts]),before);
  const saved=JSON.stringify(s);new Simulation(s);assert.equal(JSON.stringify(s),saved,'repair is idempotent');
 }
});

test('legacy tea scene and active jail continuation remain available',()=>{
 const old=new Simulation(legacyArrival());Object.assign(old.s.player,{x:-7,z:24});
 assert.equal(visitGate(old,'relay'),true);assert.ok(old.actions().some(a=>a.id==='g_brief'));
 for(const phase of ['prison','testimony']){const s=newArrival();s.event.gate.phase=phase;const sim=new Simulation(s);assert.equal(sim.event.gate.phase,phase);assert.ok(sim.actions().length);}
});

test('current guard still offers factual entry routes in the new chapter',()=>{
 const sim=new Simulation(newArrival());Object.assign(sim.s.player,{x:0,z:24});sim.s.player.inventory.push('他人的路引');
 assert.equal(visitGate(sim,'gate_guard'),true);assert.equal(sim.event.gate.phase,'papers');
 assert.ok(sim.actions().some(a=>a.id==='g_present'));assert.ok(sim.actions().some(a=>a.id==='g_plead'));
});

test('a dialogue continuation must belong to the chosen event and have actual choices',()=>{
 const sim=new Simulation(newArrival());
 const r={ongoing:true,type:sim.event.type,eventId:sim.event.id};
 assert.equal(continuesSceneDialogue(sim,r),true);
 assert.equal(continuesSceneDialogue(sim,{...r,type:'npc'}),false);
 assert.equal(continuesSceneDialogue(sim,{...r,eventId:'contact:relay'}),false);
 assert.equal(continuesSceneDialogue(sim,{...r,eventId:undefined}),false);
 assert.equal(continuesSceneDialogue(sim,{...r,ongoing:false}),false);
 sim.event.id++;assert.equal(continuesSceneDialogue(sim,r),false,'another event cannot hijack this reply');
 sim.event.gate.phase='relay';assert.equal(sceneDialogueReady(sim),false);
 assert.equal(continuesSceneDialogue(sim,{...r,eventId:sim.event.id}),false,'no blank response panel');
 sim.s.event=null;assert.equal(sceneDialogueReady(sim),false);assert.equal(continuesSceneDialogue(sim,r),false);
});

test('chosen jail testimony still continues but combat does not open response choices',()=>{
 const sim=new Simulation(newArrival());sim.event.gate.phase='prison';
 const r=sim.resolve(sim.event.id,'g_hear');
 assert.ok(!r.error);assert.equal(continuesSceneDialogue(sim,r),true);
 sim.event.gate.phase='fight';assert.equal(continuesSceneDialogue(sim,r),false);
});
