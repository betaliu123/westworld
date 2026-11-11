import test from 'node:test';
import assert from 'node:assert/strict';
import {Simulation,newArrival} from '../src/simulation.js';
import {Ecosystem} from '../src/ecosystem.js';
import {recordCrimeScene,acceptCrimeReport,discoverBodies,discoverMissingProperty,caseBook,investigationRisk,investigationPreview,answerInvestigation} from '../src/crime-investigation.js';
import {restraintPreview,resolveRestraint,restraintOptions} from '../src/npc-restraints.js';
import {investigationMotion} from '../src/investigation-world.js';
import {character} from '../src/world.js';
function setup(){const sim=new Simulation(newArrival(),()=>0);sim.save=()=>{};const eco=new Ecosystem(sim);sim.s.npcClock=10;Object.assign(sim.s.player,{x:0,z:0,hp:100,energy:100});return {sim,eco,s:sim.s};}
test('immobilized target can be tied directly without a lasso roll, including when no mission exists',()=>{
 const {sim,eco,s}=setup();let rolls=0;sim.rng=()=>{rolls++;return .99;};eco.positions.thief={x:0,z:1};s.people.thief.stunnedUntil=30;
 assert.equal(restraintOptions(s,'thief')[0].id,'bind');assert.equal(restraintPreview(sim,eco,'thief','bind').certain,true);assert.ok(resolveRestraint(sim,eco,'thief','bind').success);assert.equal(s.people.thief.restraint.mode,'fixed');assert.equal(rolls,0);
});
test('unseen body is evidence only after a nearby conscious person sees it, never culprit knowledge',()=>{
 const {sim,s}=setup();s.people.thief.hp=0;const positions={thief:{x:0,z:2},merchant:{x:0,z:0,facing:0}};
 discoverBodies(sim,positions,[{x:0,z:1,w:2,d:.1}]);assert.equal(caseBook(s).cases.length,0);
 s.people.merchant.stunnedUntil=20;discoverBodies(sim,positions);assert.equal(caseBook(s).cases.length,0);s.people.merchant.stunnedUntil=0;
 discoverBodies(sim,positions);const c=caseBook(s).cases[0];assert.equal(c.discoverer,'merchant');assert.equal(c.witnesses.length,0);assert.equal(c.state,'unreported');discoverBodies(sim,positions);assert.equal(caseBook(s).cases.length,1);
 acceptCrimeReport(sim,{caseId:c.id,reporter:'merchant',officer:'guard'});assert.equal(c.reports[0].subject,null);assert.equal(investigationRisk(s,c,'guard').score,0);
});
test('masked testimony and clothing remain frozen; knowledge spreads only to the receiving officer',()=>{
 const {sim,s}=setup();s.player.face={id:'gate_merchant',serial:1,until:99999};const event={type:'theft',owner:'merchant',target:'merchant',x:0,z:0,witnesses:['merchant'],identities:{merchant:'gate_merchant'}};
 const c=recordCrimeScene(sim,event);recordCrimeScene(sim,event);assert.equal(caseBook(s).cases.length,1);
 acceptCrimeReport(sim,{caseId:c.id,reporter:'merchant',officer:'guard'});assert.ok(investigationRisk(s,c,'guard').score>=60);assert.equal(investigationRisk(s,c,'gate_guard').score,0);
 s.player.face=null;s.player.wornOutfit=null;assert.equal(investigationRisk(s,c,'guard').score,0);assert.equal(c.reports[0].subject,'gate_merchant');assert.equal(c.reports[0].face,'gate_merchant');
});
test('preview is pure, one response rolls once, expiry/reload and clothing changes do not reroll the same questioning',()=>{
 const {sim,s}=setup();const c=recordCrimeScene(sim,{type:'assault',target:'thief',x:0,z:0,witnesses:['merchant'],identities:{merchant:'player'}});acceptCrimeReport(sim,{caseId:c.id,reporter:'merchant',officer:'guard'});c.state='search';let rolls=0;sim.rng=()=>{rolls++;return 0;};const positions={guard:{x:0,z:1}};
 const preview=investigationPreview(sim,c,'guard');investigationPreview(sim,c,'guard');assert.equal(rolls,0);
 const money=s.player.money,wanted=s.wanted,r=answerInvestigation(sim,c.id,'guard','explain',positions);assert.equal(r.check.chance,preview.chance);assert.equal(rolls,1);assert.equal(s.player.money,money);assert.equal(s.wanted,wanted);s.player.wornOutfit=null;assert.ok(answerInvestigation(sim,c.id,'guard','explain',positions).error);assert.equal(rolls,1);
 const restored=new Simulation(JSON.parse(JSON.stringify(s)));assert.ok(answerInvestigation(restored,c.id,'guard','explain',positions).error);
});
test('discovery alone and failed explanations do not magically convict or erase evidence',()=>{
 const {sim,s}=setup();const c=acceptCrimeReport(sim,{reporter:'merchant',officer:'guard',place:{x:0,z:0},type:'body'});c.state='search';sim.rng=()=>.999;const wanted=s.wanted,before=investigationPreview(sim,c,'guard').chance;const r=answerInvestigation(sim,c.id,'guard','explain',{guard:{x:0,z:1}});assert.equal(r.success,false);assert.equal(s.wanted,wanted);assert.equal(c.reports.length,1);assert.equal(c.state,'search');assert.ok(!s.people.guard.awareness?.suspect);assert.ok(investigationPreview(sim,c,'guard').chance<before);assert.equal(investigationRisk(s,c,'gate_guard').score,0);assert.equal(c.expires,s.npcClock+180);
});
test('reporters and officers walk to their real destinations; blocked routes do not teleport',()=>{
 const {sim,s}=setup();const c=recordCrimeScene(sim,{type:'theft',target:'merchant',x:0,z:0,witnesses:['merchant'],identities:{merchant:'player'}});s.npcClock=25;
 const merchant={actor:character(0),base:{x:0,z:0}},guard={actor:character(0),base:{x:0,z:6}};guard.actor.position.z=6;
 for(const id of ['gate_guard','gate_relief','inspector'])s.people[id].hp=0;
 const w={sim,t:1,hero:character(0,true),npcs:new Map([['merchant',merchant],['guard',guard]]),obstacles:[],collides:()=>true,move(){throw Error('blocked route moved');},animateActor(){}};
 assert.equal(investigationMotion(w,'merchant',merchant,.1),true);assert.equal(c.state,'unreported');assert.equal(merchant.actor.position.z,0);
 guard.actor.position.z=1;w.t=2;investigationMotion(w,'merchant',merchant,.1);assert.equal(c.state,'enroute');assert.equal(c.reports.length,1);
 w.t=3;investigationMotion(w,'guard',guard,.1);assert.equal(c.state,'search');assert.ok(!s.people.gate_guard.awareness);
});
test('unseen missing property can be reported after discovery without inventing a culprit; returned property is not missing',()=>{
 const {sim,eco,s}=setup(),coat=eco.items('npc:merchant').find(i=>i.type==='clothing');eco.transfer(coat,'player','stolen');
 const c=recordCrimeScene(sim,{type:'theft',target:'merchant',owner:'merchant',itemId:coat.id,transferred:true,x:0,z:0,witnesses:[]});
 const positions={merchant:{x:0,z:0}};discoverMissingProperty(sim,positions);assert.ok(!c.discoverer);s.npcClock=40;s.people.merchant.restraint={mode:'fixed'};discoverMissingProperty(sim,positions);assert.ok(!c.discoverer);delete s.people.merchant.restraint;
 eco.transfer(coat,'npc:merchant','returned');discoverMissingProperty(sim,positions);assert.ok(!c.discoverer);
 eco.transfer(coat,'player','stolen');discoverMissingProperty(sim,positions);assert.equal(c.discoverer,'merchant');acceptCrimeReport(sim,{caseId:c.id,reporter:'merchant',officer:'guard'});assert.equal(c.reports[0].subject,null);assert.equal(investigationRisk(s,c,'guard').score,0);
});
test('an officer who lost an immediate chase returns to the recorded scene instead of forgetting the case',()=>{
 const {sim,s}=setup(),c=recordCrimeScene(sim,{type:'assault',target:'thief',x:0,z:0,witnesses:['guard'],identities:{guard:'player'}});
 s.npcClock=35;const guard={actor:character(0),base:{x:0,z:0}};guard.actor.position.z=5;
 const w={sim,t:1,hero:character(0,true),npcs:new Map([['guard',guard]]),obstacles:[],collides:()=>true,move(){throw Error('blocked route moved');},animateActor(){}};
 s.people.guard.awareness={state:'fight'};assert.equal(investigationMotion(w,'guard',guard,.1),false);assert.equal(c.state,'unreported');
 s.people.guard.awareness.state='return';assert.equal(investigationMotion(w,'guard',guard,.1),true);assert.equal(c.state,'enroute');assert.equal(c.reports[0].kind,'testimony');assert.ok(investigationRisk(s,c,'guard').faceMatch);
});
