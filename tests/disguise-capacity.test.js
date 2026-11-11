import test from 'node:test';
import assert from 'node:assert/strict';
import {Vector3} from '../vendor/three.module.js';
import {Simulation,newArrival} from '../src/simulation.js';
import {Ecosystem} from '../src/ecosystem.js';
import {applyFace,rememberFace,currentFace,appearanceState,disguiseObserverBlock,disguiseReplies,disguisePreview,checkDisguise,needsDisguiseCheck,originalInSight} from '../src/appearance.js';
import {mountDisguiseEncounter} from '../src/disguise-encounter.js';
import {giveItem} from '../src/npc-actions.js';
import {flattenResponses} from '../src/contextual-responses.js';
import {identityFavorOptions,identityFavorPreview,resolveIdentityFavor} from '../src/identity-favors.js';

const incapable=[
 ['套索牵行',{restraint:{mode:'lead'}}],['原地捆绑',{restraint:{mode:'fixed'}}],
 ['实际拘押',{inCustody:true}],['重伤',{hp:30}],['倒地/死亡',{hp:0}],
 ['定身',{stunnedUntil:100}],['哑穴',{muteUntil:100}],
 ['熟睡',{life:{activity:'sleep'}}],['打盹',{life:{activity:'doze'}}],['溺水',{drowning:true}]
];
function fixture(id='gate_merchant'){
 const sim=new Simulation(newArrival(),()=>{throw Error('must not roll');});sim.save=()=>{};
 const eco=new Ecosystem(sim),s=sim.s;s.time=35;s.npcClock=10;
 Object.assign(s.player,{x:0,z:2,hp:100});
 const n=s.people[id];Object.assign(n,{hp:100,maxHp:100,restraint:null,inCustody:false,stunnedUntil:0,muteUntil:0,drowning:false,life:{activity:'idle'},awareness:null});
 s.people.gate_merchant.metPlayer=true;rememberFace(s,'gate_merchant');applyFace(sim,'gate_merchant');
 const ctx={positions:{[id]:{x:0,z:0,facing:0}},obstacles:[],player:s.player};eco.positions=ctx.positions;
 return {sim,s,eco,n,id,ctx};
}
function mounted(f){
 const played=[],screens=[],effects=[];
 const world={t:1,hero:{position:new Vector3(0,0,2)},npcs:new Map([[f.id,{actor:{position:new Vector3(0,0,0),rotation:{y:0},visible:true}}]]),obstacles:[],clearReady(){effects.push('ready');}};
 const dialogue={play(lines,callback){played.push({lines,callback});},choose(config){screens.push(config);}};
 const encounter=mountDisguiseEncounter({getSim:()=>f.sim,world,dialogue,checkReveal:{cancel(){},start(){effects.push('check');},play(){effects.push('roll');}},close(){effects.push('close');},log(){effects.push('log');},resume(){effects.push('resume');},available:()=>true});
 return {encounter,world,played,screens,effects};
}

test('incapable original owners and familiar observers never preview, roll, unmask or consume a check',()=>{
 for(const id of ['gate_merchant','gate_guard'])for(const [label,patch] of incapable){
  const f=fixture(id);Object.assign(f.n,structuredClone(patch));const before=JSON.stringify(f.s);
  assert.ok(disguiseObserverBlock(f.s,id),id+label);
  assert.equal(disguisePreview(f.s,id,{force:true,context:f.ctx}),null,id+label);
  assert.equal(needsDisguiseCheck(f.s,id,{force:true,context:f.ctx}),false);
  assert.deepEqual(disguiseReplies(f.s,id),[]);
  assert.ok(checkDisguise(f.sim,id,{context:f.ctx}).unavailable);
  assert.equal(currentFace(f.s),'gate_merchant');assert.equal(JSON.stringify(f.s),before,'no state changes: '+id+label);
 }
});
test('severe injury follows max health; recovery and control expiry restore deterministic recognition',()=>{
 const f=fixture();f.n.maxHp=200;f.n.hp=60;assert.equal(needsDisguiseCheck(f.s,f.id),false);
 f.n.hp=61;assert.equal(disguisePreview(f.s,f.id).original,true);
 f.n.stunnedUntil=11;assert.equal(needsDisguiseCheck(f.s,f.id),false);f.s.npcClock=11;
 assert.equal(needsDisguiseCheck(f.s,f.id),true);
 const result=checkDisguise(f.sim,f.id);assert.equal(result.success,false);assert.equal(result.roll,null);assert.equal(currentFace(f.s),'player');
});
test('old exposure and evidence survive control and reload, without being applied again while incapacitated',()=>{
 const f=fixture('gate_guard'),a=appearanceState(f.s),serial=f.s.player.face.serial;
 a.exposed[f.id]=serial;a.checks[f.id]={serial,until:99999};f.n.awareness={identifiedSerial:serial,caseOpen:true};f.n.restraint={mode:'fixed'};
 const sim=new Simulation(JSON.parse(JSON.stringify(f.s)));sim.save=()=>{};sim.rng=()=>{throw Error('no dice');};
 const before=JSON.stringify(sim.s);assert.ok(checkDisguise(sim,f.id).unavailable);assert.equal(JSON.stringify(sim.s),before);
 delete sim.s.people[f.id].restraint;assert.equal(disguisePreview(sim.s,f.id).certain,true);
 assert.equal(checkDisguise(sim,f.id).roll,null);assert.equal(currentFace(sim.s),'player');assert.ok(sim.s.people[f.id].awareness.caseOpen);
});
test('automatic and voluntary encounters skip every incapacity, then recover without a fake cooldown',()=>{
 for(const id of ['gate_merchant','gate_guard'])for(const [label,patch] of incapable){
  const f=fixture(id),ui=mounted(f);Object.assign(f.n,structuredClone(patch));const before=JSON.stringify(f.s);
  assert.equal(ui.encounter.intercept(id,true),false,label);ui.encounter.update();
  assert.deepEqual(ui.played,[]);assert.deepEqual(ui.screens,[]);assert.deepEqual(ui.effects,[]);assert.equal(JSON.stringify(f.s),before);
 }
 const f=fixture(),ui=mounted(f);f.n.restraint={mode:'lead'};ui.encounter.update();assert.equal(ui.played.length,0);
 delete f.n.restraint;ui.world.t=4;ui.encounter.update();assert.equal(ui.played.length,1);assert.equal(currentFace(f.s),'player');
});
test('incapacity during the question or after its choices prevents stale explanations and unmask admission',()=>{
 for(const [,patch] of incapable){
  const f=fixture('gate_guard'),ui=mounted(f);assert.ok(ui.encounter.intercept(f.id,true));
  Object.assign(f.n,structuredClone(patch));const before=JSON.stringify(f.s);ui.played[0].callback(false);
  assert.equal(ui.screens[0].options.length,0);assert.equal(JSON.stringify(f.s),before);
  for(const action of ['explain:default','admit']){
   const f=fixture('gate_guard'),ui=mounted(f);ui.encounter.intercept(f.id,true);ui.played[0].callback(false);
   const screen=ui.screens[0],choice=flattenResponses(screen.options).find(e=>e.action.id===action);assert.ok(choice);
   Object.assign(f.n,structuredClone(patch));const before=JSON.stringify(f.s);screen.onSelect(choice.action);
   assert.equal(JSON.stringify(f.s),before);assert.equal(currentFace(f.s),'gate_merchant');assert.equal(ui.played.length,1);assert.ok(!ui.effects.includes('roll'));
  }
 }
});
test('incapable observers cannot expose a duplicate; another capable witness retains their own observation',()=>{
 const f=fixture('gate_guard');f.ctx.positions.gate_merchant={x:1,z:2};
 assert.equal(disguisePreview(f.s,f.id,{context:f.ctx}).duplicate,true);
 f.n.restraint={mode:'fixed'};assert.equal(originalInSight(f.s,f.id,f.ctx),false);assert.equal(disguisePreview(f.s,f.id,{context:f.ctx}),null);
 delete f.n.restraint;f.s.people.gate_merchant.restraint={mode:'fixed'};
 assert.equal(disguisePreview(f.s,'gate_merchant',{context:f.ctx}),null);
 assert.equal(disguisePreview(f.s,f.id,{context:f.ctx}).duplicate,true,'a capable familiar observer can still see both people');
});
test('giving an item to a severely injured original cannot trigger automatic recognition',()=>{
 const f=fixture();f.n.hp=20;const item=f.eco.items('player').find(i=>i.type==='food');
 const result=giveItem(f.sim,f.eco,f.id,item.id);
 assert.ok(!result.needsRecognition);assert.equal(currentFace(f.s),'gate_merchant');assert.equal(appearanceState(f.s).exposed[f.id],undefined);
});
test('identity-based favours reject incapable speakers without a null preview or a payout',()=>{
 const f=fixture('porter');f.s.people.fu.metPlayer=true;rememberFace(f.s,'fu');applyFace(f.sim,'fu');f.n.hp=20;
 const action=identityFavorOptions(f.sim,f.id).find(a=>a.id==='if_loan');assert.ok(action);
 const before=JSON.stringify(f.s);assert.ok(identityFavorPreview(f.sim,f.id,action,f.eco).blocked);
 assert.ok(resolveIdentityFavor(f.sim,f.eco,f.id,action.id).error);assert.equal(JSON.stringify(f.s),before);
});
