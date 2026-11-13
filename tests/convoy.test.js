import test from 'node:test';
import assert from 'node:assert/strict';
import {Simulation,newArrival} from '../src/simulation.js';
import {Ecosystem} from '../src/ecosystem.js';
import {chapterOptions,chapterPreview,chapterResolve,chapterFollowups} from '../src/chapter.js';
import {equipAppearance} from '../src/appearance.js';
import {witnessEvent} from '../src/npc-awareness.js';
import {CART,CONVOY_STONE,convoyState,convoyApproved,convoyBlock,beginConvoyStrength,settleConvoyStrength,resolveConvoyTalk,convoyTheftPreview,stealConvoyCargo,inspectConvoyCargo} from '../src/convoy.js';

function setup(rng=()=>0){const sim=new Simulation(newArrival(),rng);sim.save=()=>{};const eco=new Ecosystem(sim,[{id:'convoy-trial-stone',name:'试力石',kind:'prop',material:'stone',...CONVOY_STONE,max:260},{id:CART,name:'花石纲货车',kind:'convoy',owner:'fu',material:'wood',x:7.8,z:32.5,w:2.9,d:3.7,max:300}]);Object.assign(sim.s.player,{x:4.2,z:31.5});eco.positions={porter:{x:5,z:31},fu:{x:8,z:29}};return {sim,eco,s:sim.s,p:sim.s.player};}
const act=(g,key)=>chapterResolve(g.sim,g.eco,'porter','ch_convoy_'+key);
function dress(g,role='挑夫'){const item=g.eco.create(role==='挑夫'?'役夫短褂':'素色罗裙','clothing','player',{identityRole:role,material:'cloth',ownerId:'porter'});equipAppearance(g.sim,item.id,'body');return item;}

test('porter refuses first and offers money, strength and actual feminine clothing charm in the same turn',()=>{
 const g=setup();g.p.gender='male';dress(g,'女装行客');const before=g.eco.items('player').length,r=act(g,'work');
 assert.match(r.text,/人手.*够了/);assert.equal(g.eco.items('player').length,before);assert.equal(convoyApproved(g.s),false);
 assert.deepEqual(chapterFollowups(g.sim,'porter',r).map(a=>a.id),['ch_convoy_bribe','ch_convoy_strength','ch_convoy_charm']);
 const original=g.eco.items('player').find(i=>i.name==='旧布衣');equipAppearance(g.sim,original.id,'body');
 assert.ok(!chapterOptions(g.sim,'porter').some(a=>a.id==='ch_convoy_charm'));assert.ok(act(g,'charm').error);
 g.p.gender='female';assert.ok(!chapterOptions(g.sim,'porter').some(a=>a.id==='ch_convoy_charm'),'gender alone does not qualify');
});

test('six coin bribe is paid once, approval persists, outfit must actually be worn at every hour',()=>{
 for(const time of [0,30,90,110,180,239]){const g=setup();g.s.time=time;act(g,'work');const r=act(g,'bribe');assert.equal(g.p.money,6);assert.equal(g.eco.items('ground').filter(i=>i.reason==='托周大石通融入队').length,1);assert.ok(convoyApproved(g.s));assert.equal(r.roll,null);
  const coat=g.eco.items('player').find(i=>i.name==='役夫短褂'),a=chapterOptions(g.sim,'porter').find(a=>a.id==='ch_convoy_enter');assert.ok(chapterPreview(g.sim,'porter',a).blocked);assert.ok(act(g,'bribe').error);assert.equal(g.p.money,6);
  equipAppearance(g.sim,coat.id,'body');assert.equal(chapterPreview(g.sim,'porter',a).blocked,false);assert.ok(act(g,'enter').success);assert.equal(g.s.facts.entryRoute,'convoy');assert.equal(g.s.convoy.phase,'travel');assert.ok(act(g,'enter').error);
 }
});

test('early outfit does not grant a promise, old promised saves remain valid and no extra coat is created',()=>{
 const g=setup();dress(g);assert.ok(!chapterOptions(g.sim,'porter').some(a=>a.id==='ch_convoy_enter'));act(g,'work');act(g,'bribe');assert.equal(g.eco.items('player').filter(i=>i.name==='役夫短褂').length,1);
 const sim=new Simulation(JSON.parse(JSON.stringify(g.s))),eco=new Ecosystem(sim,[]);assert.ok(convoyApproved(sim.s));assert.ok(chapterResolve(sim,eco,'porter','ch_convoy_enter').success);
 const old=setup();delete old.s.convoy;old.s.chapter={done:{convoy_work:true},titles:[],heard:{}};dress(old);assert.ok(convoyApproved(old.s));assert.ok(act(old,'enter').success);
});

test('strength only settles at physical contact, cancellation cannot award or reroll the cached check',()=>{
 const g=setup();act(g,'work');const result=act(g,'strength');assert.ok(result.trainingConvoy);assert.equal(convoyApproved(g.s),false);
 const ticket=beginConvoyStrength(g.sim,g.eco);assert.ok(settleConvoyStrength(g.sim,g.eco,ticket).error);ticket.ready=true;
 g.p.x=20;assert.ok(settleConvoyStrength(g.sim,g.eco,ticket).error);g.p.x=CONVOY_STONE.x;
 const energy=g.p.energy,rolled=settleConvoyStrength(g.sim,g.eco,ticket);assert.ok(rolled.success);assert.equal(g.p.energy,energy-6);assert.equal(convoyApproved(g.s),false,'lifting alone has not finished the demonstration');
 assert.ok(settleConvoyStrength(g.sim,g.eco,ticket).error);g.sim.rng=()=>{throw Error('must reuse interrupted roll');};
 const next=beginConvoyStrength(g.sim,g.eco);next.ready=true;const again=settleConvoyStrength(g.sim,g.eco,next);assert.equal(again.roll,rolled.roll);assert.equal(g.p.energy,energy-6);
 const r=resolveConvoyTalk(g.sim,g.eco,'ch_convoy_strength',again);assert.ok(r.success);assert.ok(convoyApproved(g.s));assert.equal(g.eco.items('player').filter(i=>i.name==='役夫短褂').length,1);
});

test('failed strength and charm leave a money option without rewards; charm preview equals resolution',()=>{
 const g=setup(()=>.999);dress(g,'女装行客');act(g,'work');const a=chapterOptions(g.sim,'porter').find(a=>a.id==='ch_convoy_charm'),check=chapterPreview(g.sim,'porter',a),r=act(g,'charm');assert.equal(r.success,false);assert.equal(r.check.chance,check.chance);assert.equal(convoyApproved(g.s),false);assert.ok(chapterFollowups(g.sim,'porter',r).some(a=>a.id==='ch_convoy_bribe'));
 const ticket=beginConvoyStrength(g.sim,g.eco);ticket.ready=true;const roll=settleConvoyStrength(g.sim,g.eco,ticket);assert.equal(roll.success,false);resolveConvoyTalk(g.sim,g.eco,'ch_convoy_strength',roll);assert.ok(!chapterOptions(g.sim,'porter').some(a=>a.stat));assert.ok(act(g,'bribe').success);
});

test('cargo preview is read-only, rejects remote/walled theft and transfers each real item only once',()=>{
 const g=setup(),item=g.eco.items('object:'+CART)[0];g.p.stealing=true;g.p.crouched=true;g.p.x=5.6;g.p.z=32.5;const before=JSON.stringify(g.s);const check=convoyTheftPreview(g.eco,item.id);assert.equal(check.blocked,false);assert.equal(JSON.stringify(g.s),before);
 g.eco.obstacles=[{id:'wall',x:5.9,z:32.5,w:.1,d:10}];assert.ok(convoyTheftPreview(g.eco,item.id).blocked);g.eco.obstacles=[];g.p.x=20;assert.ok(stealConvoyCargo(g.eco,item.id));g.p.x=5.6;
 const wanted=g.s.wanted;assert.equal(stealConvoyCargo(g.eco,item.id),null);assert.equal(item.location,'player');assert.equal(g.s.wanted,wanted);assert.ok(stealConvoyCargo(g.eco,item.id));assert.equal(item.provenance.history.at(-1).method,'stolen');
});

test('a discovered shortage shuts admission without inventing a culprit or laundering the loss by returning goods',()=>{
 const g=setup(),item=g.eco.items('object:'+CART)[0];act(g,'work');act(g,'bribe');dress(g);g.eco.transfer(item,'player','stolen');const wanted=g.s.wanted;
 inspectConvoyCargo(g.sim,g.eco,{});assert.equal(convoyBlock(g.s),'');inspectConvoyCargo(g.sim,g.eco,g.eco.positions);assert.match(convoyBlock(g.s),/清点/);assert.equal(g.s.wanted,wanted);assert.deepEqual(g.s.convoy.banned,{});assert.ok(act(g,'enter').error);
 g.eco.transfer(item,'object:'+CART,'returned');assert.match(convoyBlock(g.s),/清点/);assert.ok(act(g,'bribe').error);
});

test('witnessed cargo theft is severe, closes entry and keeps the observed identity after disguise is removed',()=>{
 for(const disguised of [false,true]){const g=setup();if(disguised)g.p.face={id:'gate_merchant',serial:1,until:9999};g.p.stealing=true;g.p.crouched=true;g.p.x=5.6;g.p.z=32.5;
  g.sim.listeners.push((type,e)=>{if(type!=='worldIncident')return;e.witnesses=['fu'];witnessEvent(g.sim,'fu',e,true,{x:8,z:29});});
  const item=g.eco.items('object:'+CART)[0],before=g.s.wanted;stealConvoyCargo(g.eco,item.id);assert.equal(g.s.wanted,before+(disguised?0:4));assert.equal(g.s.convoy.banned[disguised?'gate_merchant':'player'],true);assert.ok(g.s.people.fu.awareness.severe);assert.equal(g.s.people.fu.awareness.state,'notice');g.p.face=null;assert.equal(g.s.convoy.banned.player,disguised?undefined:true);assert.ok(convoyBlock(g.s));
 }
});

test('fixed posts never seek a stall even after provisions are gone',()=>{const g=setup();for(const id of ['porter','fu','scribe']){g.s.ecosystem.hunger[id]=100;for(const i of g.eco.items('npc:'+id).filter(i=>i.type==='food'))g.eco.transfer(i,'consumed');assert.equal(g.eco.foodTarget(id),null);}});

test('interrupted strength cannot waive the energy requirement for another face',()=>{const g=setup();act(g,'work');g.p.energy=6;const ticket=beginConvoyStrength(g.sim,g.eco);ticket.ready=true;settleConvoyStrength(g.sim,g.eco,ticket);g.p.face={id:'gate_merchant',serial:1,until:9999};assert.ok(beginConvoyStrength(g.sim,g.eco).error);assert.equal(g.p.energy,0);});
test('an unrelated witness does not inform absent crew; departure rechecks the wagon and both handlers',()=>{const g=setup();act(g,'work');act(g,'bribe');dress(g);const a=chapterOptions(g.sim,'porter').find(a=>a.id==='ch_convoy_enter');for(const damage of [()=>g.eco.s.objects[CART].hp=0,()=>g.s.people.fu.hp=0,()=>g.s.people.porter.stunnedUntil=999]){damage();assert.ok(chapterPreview(g.sim,'porter',a).blocked);assert.ok(act(g,'enter').error);g.eco.s.objects[CART].hp=300;g.s.people.fu.hp=100;g.s.people.porter.stunnedUntil=0;}
 g.p.stealing=g.p.crouched=true;g.p.x=5.6;g.p.z=32.5;g.sim.listeners.push((type,e)=>{if(type==='worldIncident'){e.witnesses=['tea_host'];witnessEvent(g.sim,'tea_host',e,true,g.p);}});stealConvoyCargo(g.eco,g.eco.items('object:'+CART)[0].id);assert.equal(convoyBlock(g.s),'');assert.deepEqual(g.s.convoy.theftKnown.tea_host,['player']);assert.equal(g.s.convoy.theftKnown.porter,undefined);
});
