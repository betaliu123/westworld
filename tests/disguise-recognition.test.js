import test from 'node:test';
import assert from 'node:assert/strict';
import {Vector3} from '../vendor/three.module.js';
import {Simulation,newArrival} from '../src/simulation.js';
import {Ecosystem} from '../src/ecosystem.js';
import {applyFace,rememberFace,currentFace,identityFamiliar,disguisePreview,observeFaceChange,spreadIdentityRumor} from '../src/appearance.js';
import {witnessEvent,advanceAwareness} from '../src/npc-awareness.js';
import {mountDisguiseEncounter} from '../src/disguise-encounter.js';
import {disguiseLine} from '../src/disguise-reactions.js';
import {flattenResponses} from '../src/contextual-responses.js';

function setup(observer='gate_relief'){
 const sim=new Simulation(newArrival(),()=>{throw Error('unexpected roll');});sim.save=()=>{};
 const eco=new Ecosystem(sim),s=sim.s;s.time=35;s.npcClock=10;
 Object.assign(s.player,{x:0,z:2,hp:100});
 Object.assign(s.people[observer],{hp:100,maxHp:100,life:{activity:'idle'},awareness:null});
 const context={player:s.player,positions:{[observer]:{x:0,z:0,facing:0}},obstacles:[]};
 sim.listeners.push((type,event)=>{if(type==='faceChanged')observeFaceChange(sim,event,context.positions,context.obstacles);});
 const mask=(id,hidden=true)=>{s.people[id].metPlayer=true;rememberFace(s,id);const x=s.player.x;if(hidden)s.player.x=30;assert.ok(applyFace(sim,id).ok);s.player.x=x;};
 return {sim,s,eco,context,observer,mask};
}
function mount(f){
 const played=[],menus=[],checks=[],effects=[];
 const world={t:1,hero:{position:new Vector3(0,0,2)},npcs:new Map([[f.observer,{actor:{position:new Vector3(0,0,0),rotation:{y:0},visible:true}}]]),obstacles:[],clearReady(){}};
 const dialogue={play(lines,callback,title){played.push({lines,callback,title});},choose(menu){menus.push(menu);}};
 const checkReveal={start(a,p){checks.push(p);},play(r){effects.push(r);},cancel(){}};
 const encounter=mountDisguiseEncounter({getSim:()=>f.sim,world,dialogue,checkReveal,close(){},log(){},resume(){},available:()=>true});
 return {encounter,played,menus,checks,effects};
}

test('Zhou and Fu do not know Zhao: a privately applied face alone never triggers an inspection',()=>{
 for(const id of ['gate_relief','fu']){
  const f=setup(id);f.mask('gate_merchant');assert.equal(identityFamiliar(f.s,id),false);
  assert.equal(disguisePreview(f.s,id,{context:f.context}),null);
  const ui=mount(f);assert.equal(ui.encounter.intercept(id,true),false);ui.encounter.update();
  assert.equal(ui.played.length,0);assert.equal(currentFace(f.s),'gate_merchant');
 }
});
test('Fu knows Qinghe by roster name only: neither approaching nor opening dialogue starts an identity check',()=>{
 const f=setup('fu');f.mask('qinghe');const ui=mount(f);
 assert.equal(ui.encounter.intercept('fu',true),false);ui.encounter.update();assert.equal(ui.played.length,0);assert.equal(ui.checks.length,0);assert.equal(identityFamiliar(f.s,'fu'),false);
 spreadIdentityRumor(f.s,'qinghe',12,'有人冒名','fu');assert.ok(ui.encounter.intercept('fu',true));assert.match(ui.played[0].lines[0].text,/名册.*传言/);assert.doesNotMatch(ui.played[0].lines[0].text,/眼熟|认识|几日不见/);
});

test('a stranger who heard a rumor asks, previews and rolls only on the chosen explanation',()=>{
 for(const succeeds of [true,false]){
  const f=setup();f.mask('gate_merchant');spreadIdentityRumor(f.s,'gate_merchant',12,'目击转述',f.observer);
  const ui=mount(f);let rolls=0;
  assert.ok(ui.encounter.intercept(f.observer,true));ui.played[0].callback(true);
  assert.equal(ui.menus.length,0);assert.equal(f.s.appearance.checks[f.observer],undefined);
  assert.ok(ui.encounter.intercept(f.observer,true));ui.played[1].callback(false);
  const menu=ui.menus[0],choice=flattenResponses(menu.options).find(e=>e.action.id==='explain:default');
  assert.equal(choice.preview.certain,false);assert.ok(choice.preview.chance>0&&choice.preview.chance<100);
  f.sim.rng=()=>{rolls++;return (choice.preview.chance-(succeeds?1:0))/100;};
  menu.onSelect(choice.action);assert.equal(rolls,1);assert.equal(ui.checks[0].chance,choice.preview.chance);
  assert.equal(ui.effects[0].check.chance,choice.preview.chance);assert.equal(ui.effects[0].success,succeeds);
  assert.equal(ui.played.at(-1).title,'身份盘问');
  if(succeeds)assert.equal(ui.encounter.intercept(f.observer,true),false,'same round has an inspection grace period');
 }
});

test('witnessed face changes deterministically expose with the actual reason, including after reload',()=>{
 for(const id of ['gate_relief','fu']){
  const f=setup(id);f.mask('gate_merchant',false);
  const sim=new Simulation(JSON.parse(JSON.stringify(f.s)),()=>{throw Error('witnessed change cannot roll');});sim.save=()=>{};
  f.sim=sim;f.s=sim.s;const check=disguisePreview(f.s,id);
  assert.equal(check.evidence,'faceChange');assert.equal(check.chance,0);assert.match(check.reason,/亲眼.*易容/);
  const ui=mount(f);assert.ok(ui.encounter.intercept(id,true));assert.equal(ui.played[0].title,'身份识破');
  assert.match(ui.played[0].lines[0].text,/亲眼看见.*换.*面貌/);assert.doesNotMatch(ui.played[0].lines[0].text,/膏痕|举止|做不得买卖/);
  assert.equal(currentFace(f.s),'player');assert.equal(ui.checks.length,0);assert.equal(ui.effects.length,0);
 }
});

test('nearby alone is not a witness: wall, facing, distance, visibility and capacity apply at the change',()=>{
 const variants=[
  f=>f.context.obstacles.push({x:0,z:1,w:2,d:.2}),
  f=>f.context.positions[f.observer].facing=Math.PI,
  f=>f.context.positions[f.observer].z=-7,
  f=>f.context.positions[f.observer].visible=false,
  f=>f.s.people[f.observer].life.activity='sleep',
  f=>f.s.people[f.observer].restraint={mode:'fixed'},
 ];
 for(const change of variants){const f=setup();change(f);f.mask('gate_merchant',false);
  assert.equal(f.s.appearance.exposed[f.observer],undefined);assert.equal(f.s.appearance.observedChanges?.[f.observer],undefined);
 }
});

test('seeing a new face after an unseen change cannot unmask or move the old incident onto the player',()=>{
 for(const state of ['warn','fight','search','return'])for(const reload of [false,true]){
  const f=setup();f.mask('thief');const event={type:'theft',x:0,z:2};
  witnessEvent(f.sim,f.observer,event,true,{x:0,z:0});f.s.people[f.observer].awareness.state=state;
  f.mask('gate_merchant');const sim=reload?new Simulation(JSON.parse(JSON.stringify(f.s))):f.sim,s=sim.s;
  const before={wanted:s.wanted,relation:s.people[f.observer].relation,identities:JSON.stringify(event.identities)};
  advanceAwareness(sim,f.observer,{x:0,z:0},true,.1,false);
  assert.equal(s.people[f.observer].awareness.identifiedSerial,undefined,state);
  assert.equal(s.people[f.observer].awareness.believedIdentity,'thief');assert.equal(disguisePreview(s,f.observer),null);
  assert.equal(s.wanted,before.wanted);assert.equal(s.people[f.observer].relation,before.relation);
  assert.equal(JSON.stringify(event.identities),before.identities);assert.equal(currentFace(s),'gate_merchant');
 }
});

test('a real observed transition keeps pursuit attached without rewriting the incident identity',()=>{
 const f=setup();f.mask('thief');const event={type:'theft',x:0,z:2};witnessEvent(f.sim,f.observer,event,true,{x:0,z:0});
 f.mask('gate_merchant',false);advanceAwareness(f.sim,f.observer,{x:0,z:0},true,.1,false);
 assert.equal(f.s.people[f.observer].awareness.identifiedSerial,f.s.player.face.serial);
 assert.equal(f.s.people[f.observer].awareness.believedIdentity,'player');assert.equal(event.identities[f.observer],'thief');
 assert.equal(disguisePreview(f.s,f.observer).evidence,'faceChange');
});

test('unseen reapplication of the same face preserves the perceived suspect without revealing a mask',()=>{
 const f=setup();f.mask('gate_merchant');const event={type:'theft',x:0,z:2};witnessEvent(f.sim,f.observer,event,true,{x:0,z:0});
 f.s.player.x=30;applyFace(f.sim,'player');f.mask('gate_merchant');f.s.player.x=0;
 advanceAwareness(f.sim,f.observer,{x:0,z:0},true,.1,false);
 const a=f.s.people[f.observer].awareness;assert.equal(a.believedIdentity,'gate_merchant');assert.equal(a.identifiedSerial,undefined);
 assert.equal(a.caseOpen,true);assert.equal(disguisePreview(f.s,f.observer).certain,false);
});

test('old exposure records still work but do not claim a witnessed transformation without that evidence',()=>{
 const f=setup();f.mask('gate_merchant');f.s.appearance.exposed[f.observer]=f.s.player.face.serial;
 const check=disguisePreview(f.s,f.observer);assert.equal(check.evidence,'exposed');assert.equal(check.certain,true);
 const line=disguiseLine(f.observer,'failure',check);assert.match(line,/已经识破/);assert.doesNotMatch(line,/亲眼|膏痕/);
});
