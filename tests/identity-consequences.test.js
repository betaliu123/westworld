import test from 'node:test';
import assert from 'node:assert/strict';
import {Simulation,newArrival} from '../src/simulation.js';
import {Ecosystem} from '../src/ecosystem.js';
import {applyFace,rememberFace,observeFaceChange} from '../src/appearance.js';
import {witnessEvent} from '../src/npc-awareness.js';
import {recordDeed} from '../src/event-deck.js';
import {ledgerHTML} from '../src/jianghu-ui.js';
import {identityConsequenceCandidate,identityConsequenceStep,identityConsequenceSpoken,identityConsequenceMotion} from '../src/identity-consequences.js';
import {teaStep,TEAPOT,TEA_CUPS} from '../src/tea-service.js';
import {placePayment,collectPayments} from '../src/cash-transfers.js';

globalThis.window={lucide:{icons:{},createElement:()=>({outerHTML:'<svg></svg>'})}};
const assets=[{...TEAPOT,kind:'teapot',owner:'tea_host',material:'stone'},...TEA_CUPS.map(c=>({...c,kind:'teacup',owner:'tea_host',material:'stone'}))];
function setup({masked=true,witness=true}={}){
 const sim=new Simulation(newArrival(),()=>.5),s=sim.s,eco=new Ecosystem(sim,assets);
 s.people.gate_merchant.metPlayer=true;rememberFace(s,'gate_merchant');
 if(masked)applyFace(sim,'gate_merchant');
 const event={type:'theft',x:-4,z:30,owner:'tea_host'};
 if(witness)witnessEvent(sim,'tea_host',event,true,{x:-7,z:30});
 const d=recordDeed(sim,'actionWitnessed',{...event,incidentType:'theft',witnesses:witness?['tea_host']:[],text:'茶棚前伸手取物'});
 // Concealed removal: no one observed the connection between the two faces.
 applyFace(sim,'player');s.people.tea_host.awareness=null;s.complaint=null;
 s.player.x=-5;s.player.z=34;
 for(const id of ['tea_host','gate_merchant'])Object.assign(s.people[id],{life:{activity:'idle'},fear:0});
 const positions={tea_host:{x:-7,z:30,facing:Math.PI/2},gate_merchant:{x:-5,z:30,facing:-Math.PI/2}};
 return {sim,s,eco,d,positions};
}
function speakNext(sim,positions){
 sim.s.npcClock=(sim.s.npcClock||0)+8;let line;
 identityConsequenceStep(sim,positions,[],{say:l=>{line=l;return true;}});
 if(line)assert.ok(identityConsequenceSpoken(sim,line.identityConsequence,line.consequenceStep));
 return line;
}
test('frozen attribution is visible without the deduction view, including mixed witnesses',()=>{
 const {s,d}=setup();d.witnesses.push('guard');d.identities.guard='player';
 const html=ledgerHTML(s,x=>String(x));assert.match(html,/茶娘以为是赵行商干的/);assert.match(html,/陆捕头认出是你/);
 assert.equal(d.identities.tea_host,'gate_merchant');assert.doesNotMatch(html,/本地规则|AI 推演/);
});
test('real merchant answers the accusation and loses tea service without another player penalty',()=>{
 const {sim,s,positions}=setup(),before=JSON.stringify([s.player,s.reputation,s.appearance.relations,s.appearance.reputations]);
 assert.equal(speakNext(sim,positions).id,'tea_host');assert.equal(speakNext(sim,positions).id,'gate_merchant');
 assert.match(speakNext(sim,positions).text,/续茶/);assert.ok(s.people.tea_host.teaRefusals.gate_merchant);
 assert.equal(before,JSON.stringify([s.player,s.reputation,s.appearance.relations,s.appearance.reputations]));
 speakNext(sim,positions);assert.equal(s.identityConsequences.active,null);assert.equal(identityConsequenceCandidate(s,positions),null);
 const consequences=s.chronicle.deeds.filter(d=>d.cause);assert.equal(consequences.length,2);assert.ok(consequences.every(d=>d.subject==='gate_merchant'));
});
test('no actual witness, identified player, unknown identity, wall and hidden original cannot stage blame',()=>{
 for(const options of [{masked:false},{witness:false}]){const {s,positions}=setup(options);assert.equal(identityConsequenceCandidate(s,positions),null);}
 const {s,d,positions}=setup();const wall=[{x:-6,z:30,w:.4,d:5}];assert.equal(identityConsequenceCandidate(s,positions,wall),null);
 positions.gate_merchant.visible=false;assert.equal(identityConsequenceCandidate(s,positions),null);delete positions.gate_merchant.visible;
 positions.gate_merchant.x=30;assert.equal(identityConsequenceCandidate(s,positions),null);positions.gate_merchant.x=-5;
 positions.tea_host.facing=-Math.PI/2;assert.equal(identityConsequenceCandidate(s,positions),null);positions.tea_host.facing=Math.PI/2;
 d.identities.tea_host='guard';positions.guard=positions.gate_merchant;assert.equal(identityConsequenceCandidate(s,positions),null);
});
test('incapacity and danger interrupt, and a resumed/reloaded scene never repeats spoken lines or rewards',()=>{
 const {sim,s,positions}=setup();speakNext(sim,positions);
 const states=[{hp:0},{hp:1},{restraint:{}},{inCustody:true},{stunnedUntil:999},{muteUntil:999},{drowning:true},{life:{activity:'sleep'}},{awareness:{state:'fight'}},{concern:{}}];
 for(const patch of states){const prior={...s.people.gate_merchant};Object.assign(s.people.gate_merchant,patch);assert.equal(identityConsequenceCandidate(s,positions),null,JSON.stringify(patch));s.people.gate_merchant=prior;}
 s.people.gate_merchant.restraint={};identityConsequenceStep(sim,positions);assert.equal(s.identityConsequences.active,null);s.people.gate_merchant.restraint=null;
 const restored=new Simulation(JSON.parse(JSON.stringify(s)));assert.equal(speakNext(restored,positions).id,'gate_merchant');
 assert.equal(restored.s.chronicle.deeds.filter(d=>d.title==='认错了人').length,1);
 speakNext(restored,positions);speakNext(restored,positions);assert.equal(identityConsequenceCandidate(restored.s,positions),null);
});
test('speech rejected or canceled before appearing cannot settle a consequence; blocked frame does not speak',()=>{
 const {sim,s,positions}=setup();identityConsequenceStep(sim,positions,[],{blocked:true,say:()=>{throw Error('blocked');}});
 assert.equal(s.identityConsequences.active,null);identityConsequenceStep(sim,positions,[],{say:()=>false});assert.equal(s.identityConsequences.active.step,0);
 assert.equal(s.chronicle.deeds.length,1);assert.equal(identityConsequenceSpoken(sim,'wrong',0),false);
});
test('leaving releases both NPCs; speech contention times out without consuming the scene',()=>{
 const {sim,s,positions}=setup();identityConsequenceStep(sim,positions);assert.ok(s.identityConsequences.active);
 s.player.x=40;identityConsequenceStep(sim,positions);assert.equal(s.identityConsequences.active,null);
 s.npcClock=(s.npcClock||0)+8;identityConsequenceStep(sim,positions);assert.equal(s.identityConsequences.active,null);
 s.player.x=-5;identityConsequenceStep(sim,positions);assert.ok(s.identityConsequences.active);
 s.npcClock+=46;identityConsequenceStep(sim,positions);assert.equal(s.identityConsequences.active,null);assert.equal(s.chronicle.deeds.length,1);
});
test('witnessed removal stops a future accusation without rewriting earlier attribution',()=>{
 const {sim,s,d,positions}=setup();const serial=d.identitySerials.tea_host;
 observeFaceChange(sim,{face:'gate_merchant',to:'player',fromSerial:serial,serial:0},positions);
 // Move into the observer's view for the explicitly observed removal.
 s.player.x=-5;s.player.z=30;observeFaceChange(sim,{face:'gate_merchant',to:'player',fromSerial:serial,serial:0},positions);
 assert.equal(identityConsequenceCandidate(s,positions),null);assert.equal(d.identities.tea_host,'gate_merchant');
});
test('seeing two identical faces pauses blame; wearing the face elsewhere does not erase it',()=>{
 const {sim,s,positions}=setup();applyFace(sim,'gate_merchant');s.player.x=-5;s.player.z=31;
 assert.equal(identityConsequenceCandidate(s,positions),null);s.player.x=20;assert.ok(identityConsequenceCandidate(s,positions));
});
test('old v2 witnessed records need no serial migration and v1 never gets the new scene',()=>{
 const {s,d,positions}=setup();delete d.identitySerials;assert.ok(identityConsequenceCandidate(s,positions));
 s.chapterVersion=1;assert.equal(identityConsequenceCandidate(s,positions),null);
});
test('tea refusal stops only new servings for the named guest, retains carried/existing tea and expires next day',()=>{
 const {sim,s,eco,positions}=setup();for(let i=0;i<3;i++)speakNext(sim,positions);speakNext(sim,positions);
 const cup=TEA_CUPS.find(c=>c.guest==='gate_merchant');const served=eco.create('热茶','food','object:'+cup.id,{drink:true,drinkAt:999});
 const carried=eco.create('热茶','food','npc:tea_host',{drink:true,poisoned:true});eco.s.teaService={index:4,nextAt:0,carried:carried.id};eco.s.time=100;
 const pos={tea_host:{x:-6.5,z:cup.z+1.15}};teaStep(sim,eco,pos);assert.equal(eco.s.teaService.index,5);assert.equal(carried.location,'npc:tea_host');assert.equal(served.location,'object:'+cup.id);
 served.location='consumed';s.day++;eco.s.teaService.index=4;eco.s.time+=10;teaStep(sim,eco,pos);assert.equal(carried.location,'object:'+cup.id);assert.equal(carried.poisoned,true);
});
test('cash collection yields during confrontation and resumes without duplicating coins',()=>{
 const {sim,s,eco,positions}=setup(),host=s.people.tea_host,purse=host.purse;
 const pile=placePayment(sim,eco,{payer:'player',payee:'tea_host',amount:4,x:-7,z:30});
 host.life={activity:'collect'};identityConsequenceStep(sim,positions);assert.ok(s.identityConsequences.active);
 eco.s.time=20;collectPayments(sim,eco,positions);assert.equal(pile.location,'ground');assert.equal(host.purse,purse);
 s.identityConsequences.active=null;collectPayments(sim,eco,positions);eco.s.time+=2;collectPayments(sim,eco,positions);
 assert.equal(pile.location,'collected');assert.equal(host.purse,purse+4);collectPayments(sim,eco,positions);assert.equal(host.purse,purse+4);
});
test('actual scene motion approaches and turns toward the original, never the player',()=>{
 const {sim,s,positions}=setup();positions.tea_host.x=-10;identityConsequenceStep(sim,positions);let moves=0;
 const npc=(pos)=>({actor:{position:{...pos},rotation:{y:Math.PI/2},visible:true,userData:{arms:[{rotation:{x:0}}]}},label:{}});
 const ns=new Map(Object.entries(positions).map(([id,pos])=>[id,npc(pos)]));
 const world={sim,npcs:ns,hero:{position:s.player},obstacles:[],t:1,collides:()=>false,move:(a,x,z)=>{a.position.x+=x;a.position.z+=z;moves++;},animateActor:()=>{}};
 assert.ok(identityConsequenceMotion(world,'tea_host',ns.get('tea_host'),.5));assert.ok(moves);assert.ok(ns.get('tea_host').actor.position.x>-10);
 s.people.gate_merchant.hp=0;assert.equal(identityConsequenceMotion(world,'tea_host',ns.get('tea_host'),.5),false);
});
