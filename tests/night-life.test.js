import test from 'node:test';
import assert from 'node:assert/strict';
import {Simulation,newArrival} from '../src/simulation.js';
import {Ecosystem} from '../src/ecosystem.js';
import {HOMES,bedFor,homeFor,roomAt,applyNight,nightPlan,wakeNpc,wakeForIncident,isSleeping,homeOccupied,nightTheft} from '../src/night-life.js';
import {visibleBetween} from '../src/npc-awareness.js';
import {worldMix} from '../src/world-audio.js';
import {StreetStories} from '../src/street-stories.js';
import {stockBooks,bookAction} from '../src/bookshop.js';
const fixture=(hour=23)=>{const sim=new Simulation(newArrival());sim.s.chapterVersion=2;sim.s.time=((hour-6+24)%24)*10;sim.s.facts.enteredCity=true;const eco=new Ecosystem(sim);return {sim,eco};};
const atBed=(sim,id)=>{const b=bedFor(id),q={x:b.xTarget,z:b.zTarget};Object.assign(sim.s.people[id],q);applyNight(sim,id,q);return q;};

test('new chapter never starts or projects legacy street events, including restored active events',()=>{
 const {sim}=fixture(),stories=new StreetStories(sim);stories.tick(500,{});assert.equal(stories.active,null);assert.equal(stories.start('ribbon'),false);
 sim.s.street.active={type:'duel',cast:['shen','su']};assert.equal(stories.active,null);assert.equal(stories.reserved().size,0);assert.equal(stories.point(),null);
});
test('residents leave at staggered times, walk before sleep, and retain inventory',()=>{
 const {sim,eco}=fixture(20.2),before=eco.items('npc:bookseller').map(i=>i.id),q={x:-12,z:6.6};
 assert.equal(nightPlan(sim,'bookseller',q).activity,'home');assert.equal(nightPlan(sim,'tea',{x:10,z:-8}),null);
 applyNight(sim,'bookseller',q);assert.equal(isSleeping(sim.s.people.bookseller),false);
 atBed(sim,'bookseller');assert.equal(isSleeping(sim.s.people.bookseller),true);assert.deepEqual(eco.items('npc:bookseller').map(i=>i.id),before);
 sim.s.time=0;assert.equal(nightPlan(sim,'bookseller',sim.s.people.bookseller).activity,'returnDay');
});
test('necessary gate people doze while guard stays, late drinkers stay up, night patrol moves',()=>{
 const {sim}=fixture(23);sim.s.facts.enteredCity=false;
 assert.equal(nightPlan(sim,'tea_host',{x:-10,z:25}).activity,'doze');
 assert.equal(nightPlan(sim,sim.s.watch.holder,{x:0,z:24}),null);
 assert.equal(nightPlan(sim,'gao',{x:3,z:3}).activity,'nightDrink');
 const a=nightPlan(sim,'guard',{x:10,z:5});assert.equal(a.activity,'patrol');assert.notDeepEqual(nightPlan(sim,'guard',a.target).target,a.target);
});
test('beds have distinct reachable slots and occupancy reflects presence, not schedules',()=>{
 for(const h of HOMES){const slots=h.residents.map(id=>bedFor(id));assert.equal(new Set(slots.map(b=>b.x+','+b.z)).size,slots.length);for(const b of slots)assert.equal(roomAt({x:b.xTarget,z:b.zTarget})?.id,h.id);}
 const {sim}=fixture();const h=homeFor('bookseller');assert.equal(homeOccupied(sim.s,h),false);atBed(sim,'bookseller');assert.equal(homeOccupied(sim.s,h),true);sim.s.people.bookseller.hp=0;assert.equal(homeOccupied(sim.s,h),false);
});

test('morning routes reach the inner threshold before passing through the door and returning to work',()=>{
 const {sim}=fixture();const q=atBed(sim,'tea'),home=homeFor('tea');sim.s.time=4;
 const inner=nightPlan(sim,'tea',q);assert.deepEqual(inner.target,{x:home.x,z:home.z+home.d/2-.75});
 const outside=nightPlan(sim,'tea',inner.target);assert.ok(outside.target.z>home.z+home.d/2);
 const work=nightPlan(sim,'tea',outside.target);assert.notDeepEqual(work.target,outside.target);
});
test('wake validates distance and walls; refusal persists without repeat penalty',()=>{
 const {sim}=fixture(),q=atBed(sim,'bookseller');sim.s.player.x=20;assert.ok(wakeNpc(sim,'bookseller',{bookseller:q}).error);
 Object.assign(sim.s.player,{x:q.x+.8,z:q.z});const wall=[{id:'w',x:q.x+.4,z:q.z,w:.2,d:2}];assert.ok(wakeNpc(sim,'bookseller',{bookseller:q},wall).error);
 const r=wakeNpc(sim,'bookseller',{bookseller:q});assert.equal(r.refused,true);const relation=sim.s.people.bookseller.relation;
 sim.s.people.bookseller.life.activity='sleep';wakeNpc(sim,'bookseller',{bookseller:q});assert.equal(sim.s.people.bookseller.relation,relation);
 const restored=new Simulation(JSON.parse(JSON.stringify(sim.s)));assert.equal(restored.s.people.bookseller.nightAskedOut,true);
});
test('trusted visitor can wake and continue, sleeping people cannot see silent theft',()=>{
 const {sim}=fixture(),q=atBed(sim,'bookseller');Object.assign(sim.s.player,{x:q.x+.5,z:q.z});sim.s.people.bookseller.trust=10;
 assert.equal(wakeNpc(sim,'bookseller',{bookseller:q}).refused,false);sim.s.people.bookseller.nightWakeUntil=0;atBed(sim,'bookseller');
 assert.equal(wakeForIncident(sim,'bookseller',{type:'theft',x:q.x,z:q.z},q,true),false);
 assert.equal(wakeForIncident(sim,'bookseller',{type:'damage',x:q.x,z:q.z},q,true),true);assert.equal(sim.s.people.bookseller.awareness,undefined);
});

test('repeatedly waking an essential roadside person does not send them to another house',()=>{
 const {sim}=fixture(),q={x:-8,z:24};sim.s.facts.enteredCity=false;Object.assign(sim.s.player,q);const n=sim.s.people.relay;n.life={activity:'doze',target:q,night:true};n.nightWakeCount={[sim.s.day]:2};
 assert.equal(wakeNpc(sim,'relay',{relay:q}).refused,true);assert.deepEqual(nightPlan(sim,'relay',q).target,q);
});
test('night thieves transfer actual money once, without accusing player',()=>{
 const {sim,eco}=fixture(),q={x:2,z:12},p={x:3,z:12};eco.positions={thief:q,merchant:p};sim.s.people.thief.life={activity:'prowl',night:true};sim.rng=()=>0;
 const total=sim.s.people.thief.purse+sim.s.people.merchant.purse,wanted=sim.s.wanted,before=sim.s.people.merchant.purse;
 nightTheft(sim,eco,eco.positions);assert.equal(sim.s.people.merchant.purse,before-4);assert.equal(sim.s.people.thief.purse+sim.s.people.merchant.purse,total);nightTheft(sim,eco,eco.positions);assert.equal(sim.s.people.merchant.purse,before-4);assert.equal(sim.s.wanted,wanted);
});

test('stealing from a sleeper transfers once; a failed attempt wakes without losing the item',()=>{
 const {sim,eco}=fixture(),q=atBed(sim,'bookseller');Object.assign(sim.s.player,{x:q.x+.6,z:q.z,crouched:true,stealing:true});eco.positions={bookseller:q};
 sim.s.player.skills.theft.tier=2;sim.rng=()=>0;
 const item=eco.create('随身干粮','food','npc:bookseller',{ownerId:'bookseller'});assert.equal(eco.stealNpc('bookseller',item.id),undefined);assert.equal(item.location,'player');assert.equal(isSleeping(sim.s.people.bookseller),true);
 assert.ok(eco.stealNpc('bookseller',item.id));const restored=new Simulation(JSON.parse(JSON.stringify(sim.s))),restoredEco=new Ecosystem(restored);assert.equal(restoredEco.s.items.filter(i=>i.id===item.id).length,1);assert.equal(restoredEco.s.items.find(i=>i.id===item.id).location,'player');
 sim.rng=()=>.999;const other=eco.create('另一份干粮','food','npc:bookseller');eco.stealNpc('bookseller',other.id);assert.equal(other.location,'npc:bookseller');assert.equal(isSleeping(sim.s.people.bookseller),false);
});

test('a guard cannot detect the night thief behind their back or through walls',()=>{
 for(const wall of [false,true]){const {sim,eco}=fixture();eco.positions={thief:{x:2,z:12},merchant:{x:3,z:12},guard:{x:2,z:14}};sim.s.people.thief.life={activity:'prowl',night:true};sim.s.people.guard.facing=wall?Math.PI:0;eco.obstacles=wall?[{id:'wall',x:2,z:13,w:3,d:.2}]:[];sim.rng=()=>0;nightTheft(sim,eco,eco.positions);assert.equal(sim.s.people.guard.nightPursuit,undefined);assert.equal(sim.s.people.merchant.nightWakeUntil,undefined);}
});

test('sleeping shopkeepers cannot sell or charge remotely while goods remain available to steal',()=>{
 const {sim,eco}=fixture();stockBooks(eco);const q=atBed(sim,'bookseller'),item=eco.s.items.find(i=>i.sku==='boxing');eco.positions={bookseller:q};Object.assign(sim.s.player,{x:item.x,z:item.z,money:50});
 assert.match(bookAction(eco,'bookBuy',item),/歇业/);assert.equal(sim.s.player.money,50);assert.equal(item.location,'ground');
 Object.assign(sim.s.player,{crouched:true,stealing:true});sim.rng=()=>0;bookAction(eco,'bookSteal',item);assert.equal(item.location,'player');
 const stall={id:'night-stall',kind:'stall',owner:'tea_host',x:item.x,z:item.z};eco.registerAssets([stall]);const food=eco.items('object:night-stall')[0];sim.s.people.tea_host.life={night:true,activity:'sleep'};assert.match(eco.act('buy',stall.id,food.id),/歇业/);assert.equal(sim.s.player.money,50);assert.equal(food.location,'object:night-stall');
});
test('danger, unconsciousness and food rules outrank bedtime, restored sleep does not duplicate loot',()=>{
 const {sim,eco}=fixture(),q=atBed(sim,'bookseller');sim.s.people.bookseller.awareness={state:'flee',caseOpen:true};eco.tick(.1,{bookseller:q});assert.equal(sim.s.people.bookseller.awareness.state,'flee');assert.equal(isSleeping(sim.s.people.bookseller),false);
 const restored=new Simulation(JSON.parse(JSON.stringify(sim.s))),count=eco.s.items.length;new Ecosystem(restored);assert.equal(restored.s.ecosystem.items.length,count);
 sim.s.people.bookseller.awareness=null;eco.tick(1,{bookseller:{x:-22,z:3}});assert.equal(sim.s.people.bookseller.life.activity,'escape');assert.ok(sim.s.people.bookseller.hp<100);
});
test('opening a door changes sight without destroying it; night has no market and indoor ambience differs',()=>{
 const wall=[{id:'door',x:0,z:0,w:2,d:.15}],a={x:0,z:1},b={x:0,z:-1};assert.equal(visibleBetween(a,b,wall,{door:{hp:100}}),false);assert.equal(visibleBetween(a,b,wall,{door:{hp:100,open:true}}),true);
 const street=worldMix({x:0,z:0,time:170}),inn=worldMix({x:-11,z:-12,time:170});assert.equal(street.city,0);assert.equal(street.music,0);assert.ok(street['music-night']>0);assert.equal(street['night-inn'],0);assert.ok(inn['night-inn']>0);assert.ok(inn.night<street.night);
});
