import test from 'node:test';
import assert from 'node:assert/strict';
import {Simulation,newArrival,legacyArrival} from '../src/simulation.js';
import {Ecosystem} from '../src/ecosystem.js';
import {lifeStep,lifeTarget,canEat,ensureLife} from '../src/npc-life.js';
import {fixedPost,hasFixedPost,yieldToConvoy} from '../src/npc-posts.js';
import {nightPlan} from '../src/night-life.js';
import {giveItem} from '../src/npc-actions.js';

const ids=['porter','scribe','fu'];
function setup(){const sim=new Simulation(newArrival(),()=>.99);sim.s.time=60;sim.save=()=>{};const eco=new Ecosystem(sim,[{id:'post-test-stall',kind:'stall',x:12,z:27,owner:'tea_host'}]);return {sim,eco};}
const rations=(eco,id)=>eco.s.items.filter(i=>i.postRationOwner===id);

test('fixed-post people eat real carried provisions at their posts without going to a table',()=>{
 for(const id of ids){const {sim,eco}=setup(),q=fixedPost(sim.s,id),before=rations(eco,id).length;
  eco.s.hunger[id]=80;eco.tick(.1,{[id]:q});
  assert.equal(sim.s.people[id].life.activity,'meal');assert.deepEqual(lifeTarget(sim,eco,id),q);
  assert.equal(rations(eco,id).filter(i=>i.location==='consumed').length,1);
  assert.equal(rations(eco,id).filter(i=>i.location==='npc:'+id).length,before-1);
  assert.equal(eco.s.hunger[id],5);assert.ok(sim.s.people[id].eatingUntil>eco.s.time);
 }
});

test('food is not eaten remotely; an exhausted pack does not create food or a meal errand',()=>{
 for(const id of ids){const {sim,eco}=setup(),q=fixedPost(sim.s,id);eco.s.hunger[id]=90;
  eco.tick(.1,{[id]:{x:q.x+3,z:q.z}});assert.equal(rations(eco,id).filter(i=>i.location==='consumed').length,0);
  for(const food of rations(eco,id))eco.transfer(food,'player','stolen');
  const count=eco.s.items.length;lifeStep(sim,eco,.1,{[id]:q});
  assert.equal(sim.s.people[id].life.activity,'duty');assert.deepEqual(lifeTarget(sim,eco,id),q);assert.equal(eco.s.items.length,count);
  assert.equal(canEat(sim,eco,id,q),false);
 }
});

test('post provisions migrate once and do not respawn after theft, consumption, dawn or reload',()=>{
 const {sim,eco}=setup();for(const id of ids){assert.equal(rations(eco,id).length,3);const [stolen,eaten]=rations(eco,id);eco.transfer(stolen,'player','stolen');eaten.location='consumed';}
 const count=eco.s.items.length;sim.s.day++;ensureLife(sim,eco);assert.equal(eco.s.items.length,count);
 const nextSim=new Simulation(JSON.parse(JSON.stringify(sim.s))),next=new Ecosystem(nextSim);
 assert.equal(next.s.items.length,count);for(const id of ids){assert.equal(rations(next,id).length,3);assert.equal(rations(next,id).filter(i=>i.location==='npc:'+id).length,1);}
 delete nextSim.s.people.porter.postRationsIssued;ensureLife(nextSim,next);assert.equal(rations(next,'porter').length,3,'item provenance also prevents a duplicated migration');
 const legacy=new Simulation(legacyArrival()),oldEco=new Ecosystem(legacy);
 assert.equal(hasFixedPost(legacy.s,'porter'),false);assert.equal(oldEco.s.items.filter(i=>i.postRationOwner).length,0);
});

test('giving food remains separate from eating and unknown poison follows the common consumption rules',()=>{
 const {sim,eco}=setup(),id='porter',q=fixedPost(sim.s,id),food=eco.items('player').find(i=>i.type==='food'),n=sim.s.people[id];
 eco.s.hunger[id]=40;assert.ok(giveItem(sim,eco,id,food.id).error);assert.equal(food.location,'player');
 eco.s.hunger[id]=80;food.poisoned=true;const hp=n.hp;assert.ok(!giveItem(sim,eco,id,food.id).error);
 assert.equal(food.location,'npc:'+id);assert.equal(n.hp,hp);assert.equal(n.eatingUntil,undefined);
 eco.tick(.1,{[id]:q});assert.equal(food.location,'consumed');assert.equal(n.hp,hp-25);assert.ok(n.sickUntil>eco.s.time);
 assert.equal(n.awareness?.caseOpen,undefined,'unknown poisoning does not invent an attacker');
});

test('danger, unconsciousness and investigating interrupt post meals',()=>{
 for(const state of ['fight','warn','flee','investigate','search']){
  const {sim,eco}=setup(),q=fixedPost(sim.s,'scribe'),n=sim.s.people.scribe;eco.s.hunger.scribe=90;n.awareness={state};
  eco.tick(.1,{scribe:q});assert.equal(rations(eco,'scribe').filter(i=>i.location==='consumed').length,0,state);assert.equal(n.awareness.state,state);
 }
 const {sim,eco}=setup(),q=fixedPost(sim.s,'porter'),n=sim.s.people.porter;eco.s.hunger.porter=90;n.stunnedUntil=50;
 eco.tick(.1,{porter:q});assert.equal(rations(eco,'porter').filter(i=>i.location==='consumed').length,0);
 n.stunnedUntil=0;eco.tick(.1,{porter:{x:-22,z:25}});assert.equal(n.life.activity,'escape');assert.ok(n.hp<60);assert.equal(canEat(sim,eco,'porter',{x:-22,z:25}),false);
});

test('the convoy crew follows moving posts at night, then eats and rests at the town posts',()=>{
 const {sim,eco}=setup();sim.s.time=180;sim.s.facts.enteredCity=true;
 sim.s.convoy={x:0,z:8,phase:'travel',posts:{porter:{x:-2.4,z:8},fu:{x:2.4,z:8}}};
 for(const id of ['porter','fu']){
  const q=fixedPost(sim.s,id);eco.s.hunger[id]=90;assert.equal(nightPlan(sim,id,q),null);
  eco.tick(.1,{[id]:q});assert.equal(sim.s.people[id].life.activity,'convoy');assert.deepEqual(lifeTarget(sim,eco,id),q);assert.equal(canEat(sim,eco,id,q),false);
 }
 sim.s.convoy={x:0,z:-18,phase:'town',posts:{porter:{x:-2.4,z:-18},fu:{x:2.4,z:-18}}};
 for(const id of ['porter','fu']){const q=fixedPost(sim.s,id),plan=nightPlan(sim,id,q);assert.equal(plan.activity,'doze');assert.deepEqual(plan.target,q);}
 sim.s.time=60;
 for(const id of ['porter','fu']){const q=fixedPost(sim.s,id);eco.tick(.1,{[id]:q});assert.equal(canEat(sim,eco,id,q),true);assert.equal(rations(eco,id).filter(i=>i.location==='consumed').length,1);assert.deepEqual(lifeTarget(sim,eco,id),q);}
});

test('nearby awake NPCs walk aside for the cart, keep a stable target, then resume their prior intention',()=>{
 const {sim,eco}=setup(),q={x:0,z:12},n=sim.s.people.su;
 sim.s.convoy={x:0,z:16,heading:0,phase:'travel'};n.life={activity:'idle',target:{x:1,z:12}};
 const original=structuredClone(n.life),positions={su:q};
 assert.equal(yieldToConvoy(sim,eco,'su',q,positions),true);assert.equal(n.life.activity,'yieldConvoy');
 assert.ok(Math.abs(n.life.target.x)>=3.1);assert.equal(n.life.target.z,q.z);
 const target={...n.life.target};assert.deepEqual(q,{x:0,z:12},'planning does not move the NPC');
 sim.s.convoy.z=15;assert.equal(yieldToConvoy(sim,eco,'su',{x:.5,z:12},positions),true);assert.deepEqual(n.life.target,target);
 assert.equal(canEat(sim,eco,'su',q),false);
 sim.s.convoy.z=8;assert.equal(yieldToConvoy(sim,eco,'su',target,{su:target}),false);assert.deepEqual(n.life,original);assert.equal(n.convoyYield,undefined);
});

test('cart yielding never wakes, revives or commands an unavailable NPC, or works through walls',()=>{
 for(const unavailable of [{hp:0},{stunnedUntil:30},{life:{activity:'sleep'}},{life:{activity:'doze'}},{awareness:{state:'fight'}},{awareness:{state:'investigate'}},{inCustody:true}]){
  const {sim,eco}=setup(),q={x:0,z:12},n=sim.s.people.su;sim.s.convoy={x:0,z:16,phase:'travel'};Object.assign(n,unavailable);
  const before=structuredClone(n);assert.equal(yieldToConvoy(sim,eco,'su',q,{su:q}),false);assert.deepEqual(n,before);
 }
 const {sim,eco}=setup(),q={x:0,z:12};sim.s.convoy={x:0,z:16,phase:'travel'};
 eco.obstacles=[{id:'wall',x:0,z:14,w:8,d:.4}];assert.equal(yieldToConvoy(sim,eco,'su',q,{su:q}),false);
 eco.obstacles=[];assert.equal(yieldToConvoy(sim,eco,'su',{x:0,z:-12},{su:q}),false,'far away actors do not react');
});

test('the gate guard yields while remaining on duty and handoff requires arrival at the actual side post',()=>{
 const {sim,eco}=setup(),positions={gate_guard:{x:0,z:23.8},gate_relief:{x:6,z:27}};
 sim.s.convoy={x:0,z:26,heading:0,phase:'travel'};
 lifeStep(sim,eco,.1,positions);const guard=sim.s.people.gate_guard,side={...guard.life.target};
 assert.equal(guard.life.activity,'yieldConvoy');assert.equal(guard.life.post,true);assert.equal(sim.s.watch.holder,'gate_guard');
 assert.deepEqual(positions.gate_guard,{x:0,z:23.8});assert.ok(Math.abs(side.x)>=3.1);
 sim.s.watch.incoming='gate_relief';positions.gate_guard=side;positions.gate_relief={x:0,z:23.8};
 lifeStep(sim,eco,.1,positions);assert.equal(sim.s.watch.holder,'gate_guard','reaching the old post cannot complete relief');
 delete sim.s.people.gate_relief.convoyYield;positions.gate_relief={x:side.x+.3,z:side.z};
 lifeStep(sim,eco,.1,positions);assert.equal(sim.s.watch.holder,'gate_relief');
 sim.s.convoy.z=19;lifeStep(sim,eco,.1,positions);
 assert.deepEqual(sim.s.people.gate_relief.life.target,{x:0,z:23.8});assert.equal(sim.s.people.gate_relief.life.activity,'duty');
});

test('yield destinations avoid occupied side spots and do not replace a danger response on cleanup',()=>{
 const {sim,eco}=setup(),q={x:0,z:12},n=sim.s.people.su;sim.s.convoy={x:0,z:16,heading:0,phase:'travel'};
 const positions={su:q,shen:{x:-3.1,z:12},gao:{x:3.1,z:12}};
 assert.equal(yieldToConvoy(sim,eco,'su',q,positions),true);
 assert.ok(Math.hypot(n.life.target.x-positions.shen.x,n.life.target.z-positions.shen.z)>=.85);
 assert.ok(Math.hypot(n.life.target.x-positions.gao.x,n.life.target.z-positions.gao.z)>=.85);
 n.life={activity:'escape',target:{x:9,z:12}};sim.s.convoy.phase='town';
 assert.equal(yieldToConvoy(sim,eco,'su',q,positions),false);assert.equal(n.life.activity,'escape');assert.equal(n.convoyYield,undefined);
});
