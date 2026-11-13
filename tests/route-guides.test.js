import test from 'node:test';
import assert from 'node:assert/strict';
import {Simulation,newArrival} from '../src/simulation.js';
import {Ecosystem} from '../src/ecosystem.js';
import {showSituationalThought,thoughtCandidates} from '../src/situational-thoughts.js';
import {finishContextGuide} from '../src/context-guide.js';
import {QINGHE_RIVERSIDE} from '../src/locations.js';
import {lifeStep} from '../src/npc-life.js';
import {qingheCrying} from '../src/qinghe-cry.js';

function setup(saved){const sim=new Simulation(saved||newArrival(),()=>0),eco=new Ecosystem(sim,[]);return {sim,s:sim.s,eco};}
test('a displayed disguise thought highlights wardrobe once; blocked and declined thoughts do not',()=>{
 const {sim,s}=setup();Object.assign(s.player,{x:-18,z:37});s.facts.qingheUnwillingKnown=s.facts.qingheRosterRouteKnown=true;
 const context={positions:{qinghe:QINGHE_RIVERSIDE}};
 assert.equal(showSituationalThought(sim,context,30,()=>true,true),false);assert.equal(s.chapter?.actionGuides,undefined);
 assert.equal(showSituationalThought(sim,context,30,()=>false),false);assert.equal(s.chapter.actionGuides,undefined);
 assert.equal(showSituationalThought(sim,context,30,()=>true),true);assert.equal(s.chapter.actionGuides.face.target,'wardrobe');
 finishContextGuide(sim,'face');const loaded=setup(JSON.parse(JSON.stringify(s)));
 assert.equal(showSituationalThought(loaded.sim,context,60,()=>true),false);
 assert.equal(loaded.s.player.face,undefined);assert.equal(loaded.s.facts.qingheConsent,undefined);
});
test('either actual uniform can introduce wardrobe without a prior conversation; dressing ends the candidate',()=>{
 for(const name of ['旧差役服','役夫短褂']){
  const {sim,s,eco}=setup();const coat=eco.create(name,'clothing','player',{discovered:true});if(name==='旧差役服')s.player.inventory.push(name);
  const key=name==='旧差役服'?'coatBag':'workCoat';assert.ok(thoughtCandidates(s).some(t=>t.key===key));
  assert.ok(showSituationalThought(sim,{},30,()=>true));assert.equal(s.chapter.actionGuides.clothes.target,'wardrobe');finishContextGuide(sim,'clothes');
  s.player.wornOutfit=coat.id;s.player.disguise=name==='旧差役服'?'runner':'borrowed';assert.ok(!thoughtCandidates(s).some(t=>t.key===key));
 }
});
test('merchant hint requires the visible real document holder, queues theft guidance, and survives reload once',()=>{
 const {sim,s,eco}=setup();Object.assign(s.player,{x:0,z:29});const context={positions:{gate_merchant:{x:0,z:31}},details:{gate_merchant:'guardLapel'}};
 const before=JSON.stringify(s.player);assert.ok(showSituationalThought(sim,context,30,()=>true));
 assert.equal(s.chapter.actionGuides.theft.target,'theft');assert.equal(JSON.stringify(s.player),before);assert.ok(!s.facts.knownNames?.gate_merchant);
 finishContextGuide(sim,'theft');const loaded=setup(JSON.parse(JSON.stringify(s)));assert.equal(showSituationalThought(loaded.sim,context,60,()=>true),false);
 const pass=eco.items('npc:gate_merchant').find(i=>i.documentId==='merchant-pass');pass.location='player';assert.ok(!thoughtCandidates(s,context).some(t=>t.key==='lapel'));
 pass.location='npc:gate_merchant';context.obstacles=[{id:'wall',x:0,z:30,w:6,d:1}];assert.ok(!thoughtCandidates(s,context).some(t=>t.key==='lapel'));
});
test('an old heard thought gets its missing control hint without repeating speech',()=>{
 const {sim,s}=setup();s.player.inventory.push('旧差役服');s.chapter={thoughts:{seen:{coatBag:true},sites:{coatBag:true},last:30}};
 assert.ok(showSituationalThought(sim,{},31,()=>{throw Error('already heard');}));assert.equal(s.chapter.actionGuides.clothes.target,'wardrobe');
 assert.equal(showSituationalThought(sim,{},60,()=>true),false);
});
test('Qinghe stays at the bank hungry and at night, eats real provisions there, and returns after danger',()=>{
 const {sim,s,eco}=setup(),n=s.people.qinghe,positions={qinghe:{...QINGHE_RIVERSIDE}};eco.positions=positions;
 for(const time of [35,190]){s.time=time;eco.s.hunger.qinghe=90;n.purse=20;s.facts.qingheWishKnown=true;lifeStep(sim,eco,.1,positions);assert.equal(n.life.activity,'riverside');assert.deepEqual(n.life.target,{...QINGHE_RIVERSIDE});assert.equal(eco.foodTarget('qinghe'),null);assert.ok(qingheCrying(s,positions.qinghe));}
 const foods=()=>eco.items('npc:qinghe').filter(i=>i.postRationOwner==='qinghe'&&i.location!=='consumed');assert.equal(foods().length,3);
 eco.tick(.1,positions);assert.equal(foods().length,2);assert.equal(eco.s.hunger.qinghe,5);assert.ok(n.eatingUntil>eco.s.time);
 const loaded=setup(JSON.parse(JSON.stringify(s)));lifeStep(loaded.sim,loaded.eco,.1,positions);assert.equal(loaded.eco.items('npc:qinghe').filter(i=>i.postRationOwner==='qinghe').length,2);
 n.restraint={mode:'fixed'};lifeStep(sim,eco,.1,positions);assert.equal(n.life.activity,'restrained');delete n.restraint;lifeStep(sim,eco,.1,positions);assert.equal(n.life.activity,'riverside');
 n.hp=0;lifeStep(sim,eco,.1,positions);assert.equal(n.life.activity,'down');
});
test('loose merchant pass has a shared +30 bonus; sight, failed rolls and unrelated loot still matter',()=>{
 for(const success of [true,false]){
  const {sim,s,eco}=setup(),n=s.people.gate_merchant;Object.assign(s.player,{x:0,z:-1.4,crouched:true,stealing:true});Object.assign(n,{x:0,z:0,facing:0,life:{activity:'idle'},awareness:null});eco.positions={gate_merchant:{x:0,z:0}};
  const pass=eco.items('npc:gate_merchant').find(i=>i.documentId==='merchant-pass'),ordinary=eco.create('普通纸片','document','npc:gate_merchant',{discovered:true});
  const check=eco.theftPreview('gate_merchant',pass.id),normal=eco.theftPreview('gate_merchant',ordinary.id);assert.equal(check.chance-normal.chance,30);assert.ok(check.chance>=80&&check.chance<=95);
  let rolls=0;sim.rng=()=>{rolls++;return success?(check.chance-1)/100:check.chance/100;};const events=[];sim.listeners.push((type,data)=>{if(type==='fieldCheck')events.push(data);});eco.stealNpc('gate_merchant',pass.id);
  assert.equal(rolls,1);assert.equal(events[0].check.chance,check.chance);assert.equal(events[0].success,success);assert.equal(pass.location,success?'player':'npc:gate_merchant');
 }
 const {sim,s,eco}=setup();Object.assign(s.player,{x:0,z:1.4,crouched:true,stealing:true});Object.assign(s.people.gate_merchant,{x:0,z:0,facing:0,life:{activity:'idle'}});eco.positions={gate_merchant:{x:0,z:0}};const pass=eco.items('npc:gate_merchant').find(i=>i.documentId==='merchant-pass');
 assert.equal(eco.theftPreview('gate_merchant',pass.id).chance,0);s.player.z=-1.4;eco.obstacles=[{id:'wall',x:0,z:-.7,w:5,d:.2}];assert.equal(eco.theftPreview('gate_merchant',pass.id).blocked,true);
});
