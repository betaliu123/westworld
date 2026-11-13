import test from 'node:test';
import assert from 'node:assert/strict';
import {Simulation,newArrival,legacyArrival} from '../src/simulation.js';
import {Ecosystem} from '../src/ecosystem.js';
import {chapterResolve,chapterOptions} from '../src/chapter.js';
import {guardDialogueTarget,continuesSceneDialogue} from '../src/dialogue.js';

const setup=()=>{const sim=new Simulation(newArrival());sim.save=()=>{};return {sim,eco:new Ecosystem(sim,[])};};

test('completed guard answers return to that guard with fresh, unheard choices',()=>{
 for(const id of ['gate_guard','gate_relief']){
  const {sim,eco}=setup();sim.s.facts.royalSawKindness=true;
  for(const key of ['gate_rules','gate_no_papers','gate_guarantor']){
   const pending=chapterResolve(sim,eco,id,'ch_'+key,{deferSpeech:true});
   assert.equal(guardDialogueTarget(sim,id,pending),null,'unheard or cancelled speech cannot continue');
   assert.ok(!sim.s.chapter.done[key]);
   const result=chapterResolve(sim,eco,id,pending.actionId,{confirmedText:pending.text});
   assert.equal(guardDialogueTarget(sim,id,result),id);
   assert.ok(!chapterOptions(sim,id).some(a=>a.id===result.actionId),'completed question is removed');
   assert.equal(guardDialogueTarget(sim,'tea_host',result),null,'another conversation cannot inherit it');
   if(key==='gate_no_papers')assert.ok(chapterOptions(sim,id).some(a=>a.id==='ch_gate_guarantor'));
  }
 }
});

test('a guard refusal can return to the NPC menu even when gate choices are exhausted',()=>{
 const {sim}=setup();Object.assign(sim.s.player,{x:0,z:26});
 const r=sim.resolve(sim.event.id,'g_plead');assert.ok(!r.error);
 assert.equal(continuesSceneDialogue(sim,r),false);
 assert.equal(guardDialogueTarget(sim,'scene',r),'gate_guard');
 sim.event.id++;assert.equal(guardDialogueTarget(sim,'scene',r),null,'replacement event cannot inherit the answer');
});

test('guard continuations do not select nearby stories or alter world state',()=>{
 const {sim,eco}=setup();const r=chapterResolve(sim,eco,'gate_guard','ch_gate_rules');
 const before=JSON.stringify(sim.s);
 assert.equal(guardDialogueTarget(sim,'gate_guard',r),'gate_guard');
 assert.equal(JSON.stringify(sim.s),before);
 for(const changed of [{actionId:'ch_merchant_name'},{roll:20},{worldAction:true},{success:false},{dialogue:[{id:'tea_host',text:'答复。'}]}])
  assert.equal(guardDialogueTarget(sim,'gate_guard',{...r,...changed}),null);
 assert.equal(guardDialogueTarget(new Simulation(legacyArrival()),'gate_guard',r),null);
});
