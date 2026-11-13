import test from 'node:test';
import assert from 'node:assert/strict';
import {Simulation,newArrival} from '../src/simulation.js';
import {Ecosystem} from '../src/ecosystem.js';
import {applyFace,rememberFace,observeFaceChange,currentFace,believedIdentity} from '../src/appearance.js';
import {wantedProfile,wantedRecords} from '../src/wanted-records.js';
import {wantedQuestion,wantedPreview,wantedReplies,answerWanted,mountWantedEncounter} from '../src/wanted-encounter.js';
import {recordCrimeScene,acceptCrimeReport} from '../src/crime-investigation.js';
import {advanceAwareness} from '../src/npc-awareness.js';
import {resolveGate,detainByOfficer} from '../src/gate-scene.js';
import {mountInvestigation} from '../src/investigation-world.js';
import {PRISON} from '../src/locations.js';

function setup(){const sim=new Simulation(newArrival(),()=>0);sim.save=()=>{};const eco=new Ecosystem(sim),s=sim.s;s.npcClock=10;Object.assign(s.player,{x:0,z:0});const context={player:s.player,positions:{guard:{x:0,z:2,facing:Math.PI},gate_guard:{x:0,z:4,facing:Math.PI}},obstacles:[]};return {sim,s,eco,context};}
function mask(sim,id='thief'){sim.s.people[id].metPlayer=true;rememberFace(sim.s,id);return applyFace(sim,id);}

test('public wanted identity includes crime fields and does not require the player to read the notice first',()=>{
 const {sim,s}=setup();mask(sim);const before=JSON.stringify(s),p=wantedProfile(s,'guard');assert.equal(p.subject,'thief');assert.equal(p.charges[0].code,'theft');assert.match(wantedQuestion(p),/燕七.*钱袋.*盗窃嫌疑/);assert.equal(wantedProfile(s,'tea_host'),null);assert.equal(JSON.stringify(s),before);assert.ok(!s.facts.publicWarrant);
});
test('another wanted identity uses the same charges and decisions, with officer-local knowledge',()=>{
 const {sim,s,context}=setup();s.law={warrants:[{id:'test-assault',subject:'merchant',status:'active',knownBy:['guard'],charges:[{code:'assault',label:'伤人嫌疑',detail:'码头斗殴，伤者当面指认'}]}]};mask(sim,'merchant');
 const p=wantedProfile(s,'guard');assert.match(wantedQuestion(p),/伤人嫌疑/);assert.equal(wantedProfile(s,'gate_guard'),null);assert.deepEqual(wantedReplies(s,p).map(e=>e.action.id),['deny','submit','flee']);
 const r=answerWanted(sim,'guard','submit',context,p.key);assert.ok(r.detained);assert.equal(s.facts.lastCustody.subject,'merchant');assert.equal(s.facts.lastCustody.charges[0].code,'assault');assert.equal(s.facts.custodyIdentity,'merchant');assert.equal(s.player.z,PRISON.spawn.z);assert.equal(currentFace(s),'player');assert.ok(wantedRecords(s,'guard').some(r=>r.subject==='merchant'));
});
test('reports retain their perceived culprit and crime type; body discovery cannot manufacture a wanted identity',()=>{
 const {sim,s}=setup();mask(sim,'merchant');const c=recordCrimeScene(sim,{type:'damage',target:'town-gate',x:0,z:0,witnesses:['tea_host'],identities:{tea_host:'merchant'}});acceptCrimeReport(sim,{caseId:c.id,reporter:'tea_host',officer:'guard'});
 assert.equal(wantedProfile(s,'guard').charges[0].code,'damage');assert.equal(wantedProfile(s,'gate_guard'),null);applyFace(sim,'player');assert.equal(wantedProfile(s,'guard'),null);assert.equal(c.reports[0].subject,'merchant');
 acceptCrimeReport(sim,{reporter:'tea',officer:'guard',place:{x:0,z:0},type:'body'});assert.equal(wantedProfile(s,'guard'),null);
});
test('only close conscious observers facing the real unobstructed change identify the mask',()=>{
 const {sim,s,context}=setup();let event;sim.listeners.push((type,data)=>{if(type==='faceChanged')event=data;});mask(sim);
 assert.deepEqual(observeFaceChange(sim,event,context.positions,[{x:0,z:1,w:2,d:.1}]),[]);assert.equal(believedIdentity(s,'guard'),'thief');
 s.people.guard.stunnedUntil=99;assert.deepEqual(observeFaceChange(sim,event,{guard:context.positions.guard}),[]);s.people.guard.stunnedUntil=0;
 assert.deepEqual(observeFaceChange(sim,event,{guard:{x:0,z:2,facing:0}}),[]);assert.deepEqual(observeFaceChange(sim,event,{guard:{x:0,z:9,facing:Math.PI}}),[]);
 assert.deepEqual(observeFaceChange(sim,event,{guard:context.positions.guard}),['guard']);assert.equal(believedIdentity(s,'guard'),'player');assert.equal(believedIdentity(s,'gate_guard'),'thief');assert.equal(wantedProfile(s,'guard'),null);assert.equal(wantedProfile(s,'guard',{appearance:true}).subject,'thief');
});
test('an officer who actually witnessed the offence cannot be dismissed by a probability check',()=>{
 const {sim,s,context}=setup();recordCrimeScene(sim,{type:'assault',target:'merchant',x:0,z:0,witnesses:['guard'],identities:{guard:'player'}});const p=wantedProfile(s,'guard');assert.ok(wantedPreview(s,p).blocked);sim.rng=()=>{throw Error('deterministic identification rolled');};assert.ok(answerWanted(sim,'guard','deny',context).error);assert.ok(!s.law?.interviews);
});
test('denial preview equals resolution and cannot reroll after reload or reapplying the same face',()=>{
 const {sim,s,context}=setup();mask(sim);const p=wantedProfile(s,'guard'),check=wantedPreview(s,p);let rolls=0;sim.rng=()=>{rolls++;return (check.chance-1)/100;};
 const r=answerWanted(sim,'guard','deny',context,p.key);assert.equal(r.roll,check.chance);assert.equal(r.success,true);assert.equal(r.check.chance,check.chance);assert.ok(answerWanted(sim,'guard','deny',context).error);s.player.face.serial++;
 const copy=new Simulation(JSON.parse(JSON.stringify(s)));assert.ok(answerWanted(copy,'guard','deny',{...context,player:copy.s.player}).error);assert.equal(rolls,1);assert.equal(wantedProfile(s,'guard').charges[0].code,'theft');
});
test('failed denial and refusal start real pursuit with the perceived identity and exact charges',()=>{
 for(const choice of ['deny','flee']){const {sim,s,context}=setup();mask(sim);sim.rng=()=>.999;const r=answerWanted(sim,'guard',choice,context);assert.equal(r.success,false);const a=s.people.guard.awareness;assert.equal(a.state,'fight');assert.equal(a.believedIdentity,'thief');assert.equal(a.wantedCase.charges[0].code,'theft');assert.equal(advanceAwareness(sim,'guard',context.positions.guard,true,.1,false).state,'fight');assert.ok(detainByOfficer(sim,'guard'));assert.equal(s.facts.lastCustody.subject,'thief');assert.equal(s.facts.lastCustody.charges[0].code,'theft');}
});
test('custody is physical, once only, preserves confession identity and uses the normal release flow',()=>{
 const {sim,s,context}=setup();mask(sim);const charm=s.player.stats.charm;assert.ok(answerWanted(sim,'guard','submit',{...context,positions:{guard:{x:0,z:20}}}).error);assert.equal(s.player.stats.charm,charm);
 assert.ok(answerWanted(sim,'guard','submit',context).detained);const cost=s.player.stats.charm;assert.ok(cost<charm);assert.ok(answerWanted(sim,'guard','submit',context).error);assert.equal(s.player.stats.charm,cost);
 assert.ok(!resolveGate(sim,sim.event.id,'g_serve').error);assert.equal(s.player.z,PRISON.release.z);assert.equal(s.facts.lastCustody.subject,'thief');assert.equal(s.facts.lastCustody.charges[0].code,'theft');
});
test('personal witnessed crime records close on actual custody rather than transferring to an innocent disguise',()=>{
 const {sim,s,context}=setup();const c=recordCrimeScene(sim,{type:'damage',target:'town-gate',x:0,z:0,witnesses:['guard'],identities:{guard:'player'}});assert.ok(answerWanted(sim,'guard','submit',context).detained);assert.equal(c.custody.subject,'player');assert.equal(wantedProfile(s,'guard'),null);assert.equal(c.witnesses[0].subject,'player');
});
function uiFixture(){const f=setup();let heard=[],done,menu;const world={hero:{position:f.s.player},npcs:new Map(Object.entries(f.context.positions).map(([id,p])=>[id,{actor:{position:p,rotation:{y:p.facing},visible:true}}])),obstacles:[],t:10,clearReady(){},syncEvent(){}};
 const dialogue={play(lines,cb){heard.push(...lines);done=cb;},choose(c){menu=c;}},checkReveal={start(){},cancel(){},play(){}};
 const wanted=mountWantedEncounter({getSim:()=>f.sim,world,dialogue,checkReveal,close(){},log(){},available:()=>true});return {...f,world,dialogue,checkReveal,wanted,get heard(){return heard;},done:()=>done,get menu(){return menu;}};
}
test('watched transformation names the wanted charge but deterministically exposes the impersonation',()=>{
 const f=uiFixture();f.sim.listeners.push((type,e)=>{if(type==='faceChanged')observeFaceChange(f.sim,e,f.context.positions);});mask(f.sim);f.sim.rng=()=>{throw Error('seen transformation rolled');};assert.ok(f.wanted.intercept('guard',true));assert.equal(currentFace(f.s),'player');assert.match(f.heard.at(-1).text,/亲眼看见.*燕七.*盗窃嫌疑/);assert.ok(!f.s.facts.custodyIdentity);assert.ok(f.s.chronicle.deeds.some(d=>d.title==='冒名被识破'&&d.subject==='player'));
});
test('wanted identity takes priority over ordinary scene questioning; cancelled surrender never detains',()=>{
 const f=uiFixture();mask(f.sim);const c=acceptCrimeReport(f.sim,{reporter:'tea',officer:'guard',place:{x:0,z:0},type:'body'});c.state='search';
 mountInvestigation({getSim:()=>f.sim,world:f.world,dialogue:f.dialogue,checkReveal:f.checkReveal,available:()=>true,close(){},log(){},wanted:f.wanted});
 assert.ok(f.world.onInvestigation(c,'guard'));assert.match(f.heard.at(-1).text,/盗窃嫌疑/);f.done()(false);assert.deepEqual(f.menu.options.map(e=>e.action.id),['deny','submit','flee']);f.menu.onSelect({id:'submit'});f.done()(true);assert.ok(!f.s.facts.lastCustody);assert.equal(f.s.player.z,0);
});
test('an officer reacquires a refused wanted identity without reopening or rolling the same question',()=>{
 const f=uiFixture();mask(f.sim);answerWanted(f.sim,'guard','flee',f.context);f.s.people.guard.awareness.state='return';f.sim.rng=()=>{throw Error('reacquisition rolled');};assert.ok(f.wanted.intercept('guard'));assert.equal(f.s.people.guard.awareness.state,'fight');assert.equal(f.heard.length,0);
});
