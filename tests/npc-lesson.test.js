import test from 'node:test';
import assert from 'node:assert/strict';
import {Simulation,newArrival} from '../src/simulation.js';
import {Ecosystem} from '../src/ecosystem.js';
import {contactOptions,contactPreview,contactResolve,learnedFootwork} from '../src/gate-society.js';
const setup=()=>{const sim=new Simulation(newArrival(),()=>0);return {sim,eco:new Ecosystem(sim,[])};};
test('completed lesson becomes review across days and reloads without a roll or cost',()=>{
 const {sim,eco}=setup();assert.equal(contactResolve(sim,eco,'old_constable','training').success,true);
 const energy=sim.s.player.energy,growth=JSON.stringify(sim.s.player.growth),trust=sim.s.people.old_constable.trust;
 sim.s.day++;const restored=new Simulation(JSON.parse(JSON.stringify(sim.s)),()=>{throw Error('must not roll');});
 assert.ok(!contactOptions(restored,'old_constable').some(a=>a.id==='training'));
 const r=contactResolve(restored,eco,'old_constable','training');assert.equal(r.actionId,'training_review');assert.equal(r.roll,null);
 assert.equal(restored.s.player.energy,energy);assert.equal(JSON.stringify(restored.s.player.growth),growth);assert.equal(restored.s.people.old_constable.trust,trust);
});
test('legacy successful lesson migrates from reward or history; failure does not',()=>{
 const {sim}=setup();sim.s.player.growthClaims={'lesson:1:old_constable':true};assert.ok(learnedFootwork(sim));
 const {sim:other}=setup();other.s.history.push({eventId:'contact:1:old_constable:training',actionId:'training',success:false});assert.equal(learnedFootwork(other),false);
 other.s.history[0].success=true;assert.ok(learnedFootwork(other));
});
test('failed lessons remain available and displayed odds equal integer D100 threshold',()=>{
 const {sim,eco}=setup();sim.rng=()=>.99;sim.s.people.old_constable.trust=2;
 const a=contactOptions(sim,'old_constable').find(a=>a.id==='training'),p=contactPreview(sim,'old_constable',a);
 assert.ok(Number.isInteger(p.chance));assert.equal(p.chance,Math.floor(Math.max(5,Math.min(95,sim.s.player.stats.agility+40-45+2/3))));
 assert.equal(contactResolve(sim,eco,'old_constable','training').success,false);assert.equal(learnedFootwork(sim),false);
});

import {isDirectReply} from '../src/dialogue.js';
test('ordinary NPC answers bypass performance, while lessons and physical care retain it',()=>{
 const {sim,eco}=setup();
 assert.equal(isDirectReply(contactResolve(sim,eco,'gate_merchant','identity')),true);
 assert.equal(isDirectReply(contactResolve(sim,eco,'old_constable','training')),false);
 assert.equal(isDirectReply(contactResolve(sim,eco,'old_constable','training_review')),true);
 assert.equal(isDirectReply({type:'npc',roll:null,motion:'talk',actionId:'care',dialogue:[{text:'多谢'}]}),false);
 assert.equal(isDirectReply({type:'npc',roll:30,motion:'talk',dialogue:[{text:'好吧'}]}),false);
});
