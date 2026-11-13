import test from 'node:test';
import assert from 'node:assert/strict';
import {Simulation,newArrival} from '../src/simulation.js';
import {Ecosystem} from '../src/ecosystem.js';
import {exchange,exchangePreview,tradeQuote,itemReactionContext,acceptItemReaction} from '../src/item-exchange.js';
import {chapterResolve,chapterOptions} from '../src/chapter.js';
import {observeItem,linkItemReports,knownItemLoss} from '../src/item-observations.js';
import {recordCrimeScene,acceptCrimeReport,investigationRisk,investigationQuestion} from '../src/crime-investigation.js';
import {mountItemExchange} from '../src/item-exchange-view.js';
import {factionRep} from '../src/reputation.js';
import {echoOptions,aftermathContext,applyAftermath} from '../src/event-deck.js';
import {pendingEcho,echoChoices,answerEcho} from '../src/aftermath-encounters.js';
import {requestApprenticeship} from '../src/apprenticeship.js';

function setup(saved){const sim=new Simulation(saved||newArrival(),()=>{throw Error('no unexpected roll');}),eco=new Ecosystem(sim,[]);sim.save=()=>{};return {sim,s:sim.s,eco};}
function near(g,id){Object.assign(g.s.player,{x:0,z:24});g.eco.positions[id]={x:0,z:25};Object.assign(g.s.people[id],{x:0,z:25});}
function take(g,predicate){const item=g.eco.s.items.find(predicate);g.eco.transfer(item,'player','stolen');return item;}
test('task dialogue opens item picker without transfer, read, roll or reward',()=>{
 const g=setup();near(g,'fu');const ledger=take(g,i=>i.type==='ledger');
 assert.equal(chapterResolve(g.sim,g.eco,'fu','ch_ledger_commit').needsItem,true);assert.equal(ledger.location,'player');assert.equal(factionRep(g.s,'yingfeng'),0);
 assert.equal(chapterResolve(g.sim,g.eco,'qinghe','ch_list_show').needsItem,true);
 assert.ok(chapterResolve(g.sim,g.eco,'fu','ch_ledger_commit',{submittedItem:g.eco.items('player').find(i=>i.type==='food').id}).error);assert.equal(ledger.location,'player');
});
test('wrong item in every task mode stays owned and DS receives no hidden ownership, toxin or disguise',()=>{
 const g=setup();near(g,'fu');const food=g.eco.items('player').find(i=>i.type==='food');food.poisoned=true;food.ownerId='traveler';
 for(const mode of ['show','gift','trade']){const r=exchange(g.sim,g.eco,'fu',food.id,mode,{task:'ledger'});assert.ok(r.rejected);assert.equal(food.location,'player');assert.ok(!g.s.facts.ledgerDelivered);const c=itemReactionContext(g.sim,'fu',r);assert.ok(!JSON.stringify(c).includes('poison'));assert.ok(!JSON.stringify(c).includes('traveler'));assert.equal(acceptItemReaction(c,{decision:'arrest',line:'抓住你'}),null);assert.equal(acceptItemReaction(c,{decision:'decline',line:'送你十两银子'}).text,r.text);}
});
test('show ledger then gift uses same physical original and rewards exactly once through reload',()=>{
 let g=setup();near(g,'fu');const item=take(g,i=>i.type==='ledger');const show=exchange(g.sim,g.eco,'fu',item.id,'show');assert.ok(show.follow.includes('ledger_commit'));assert.equal(item.location,'player');assert.equal(g.s.ledgerCase.read,undefined);
 g=setup(JSON.parse(JSON.stringify(g.s)));near(g,'fu');const r=exchange(g.sim,g.eco,'fu',item.id,'gift',{task:'ledger'});assert.ok(r.ledger);assert.equal(factionRep(g.s,'yingfeng'),40);assert.equal(g.eco.s.items.find(i=>i.id===item.id).location,'npc:fu');assert.ok(exchange(g.sim,g.eco,'fu',item.id,'gift').error);assert.equal(g.eco.s.items.filter(i=>i.ledgerPass).length,1);
});
test('manifest may be shown before any quest talk; show keeps, gift transfers and repeat does not reward',()=>{
 const g=setup();near(g,'qinghe');const item=take(g,i=>i.storyId==='convoy-list');assert.ok(chapterOptions(g.sim,'qinghe').some(a=>a.id==='ch_list_show'));
 assert.ok(exchange(g.sim,g.eco,'qinghe',item.id,'show').success);assert.equal(item.location,'player');assert.ok(g.s.facts.convoyNamesKnown);const deeds=g.s.chronicle.seq;
 exchange(g.sim,g.eco,'qinghe',item.id,'show');assert.equal(g.s.chronicle.seq,deeds);exchange(g.sim,g.eco,'qinghe',item.id,'gift');assert.equal(item.location,'npc:qinghe');
});
test('ring show never returns it; gift requires origin and returns once',()=>{
 const g=setup();near(g,'shen');const ring=take(g,i=>i.type==='ring');exchange(g.sim,g.eco,'shen',ring.id,'show');assert.equal(ring.location,'player');assert.ok(!g.s.facts.ringReturned);
 const quote=tradeQuote(g.sim,g.eco,'shen',ring.id);assert.equal(quote.offers.length,0);assert.ok(quote.recognized);assert.equal(ring.location,'player');
 assert.ok(exchange(g.sim,g.eco,'shen',ring.id,'gift').needsOrigin);exchange(g.sim,g.eco,'shen',ring.id,'gift',{answer:'truth'});assert.equal(ring.location,'npc:shen');assert.ok(g.s.facts.ringReturned);
});
test('gift, show and quotes enforce distance, walls, sleep, stun and actual possession',()=>{
 for(const mutate of [g=>g.s.player.z=40,g=>g.eco.obstacles=[{x:0,z:24.5,w:3,d:.2}],g=>g.s.people.merchant.life={activity:'sleep'},g=>g.s.people.merchant.stunnedUntil=99,g=>g.s.people.merchant.hp=0]){
  const g=setup();near(g,'merchant');const food=g.eco.items('player').find(i=>i.type==='food');mutate(g);for(const mode of ['show','gift','trade'])assert.ok(exchange(g.sim,g.eco,'merchant',food.id,mode).error);assert.equal(food.location,'player');
 }
});
test('trade offers real purse or stock; stale quotes and repeat confirmation never duplicate',()=>{
 const g=setup();near(g,'merchant');const item=g.eco.items('player').find(i=>i.type==='food'),money=g.s.player.money;
 const quote=tradeQuote(g.sim,g.eco,'merchant',item.id);assert.ok(quote.offers.some(o=>o.price));assert.equal(g.s.player.money,money);assert.equal(item.location,'player');
 const price=quote.offers.find(o=>o.price).price;g.s.people.merchant.purse=0;assert.ok(exchange(g.sim,g.eco,'merchant',item.id,'trade',{quote,offer:'coins'}).error);assert.equal(item.location,'player');
 g.s.people.merchant.purse=price;assert.ok(exchange(g.sim,g.eco,'merchant',item.id,'trade',{quote,offer:'coins'}).success);assert.equal(g.s.player.money,money+price);assert.equal(g.s.people.merchant.purse,0);assert.ok(exchange(g.sim,g.eco,'merchant',item.id,'trade',{quote,offer:'coins'}).error);
});
test('barter atomically transfers both physical entities and their toxicity',()=>{
 const g=setup();near(g,'merchant');g.s.people.merchant.purse=0;const item=g.eco.create('布袋','personal','player'),swap=g.eco.create('干粮','food','npc:merchant',{poisoned:true});
 const quote=tradeQuote(g.sim,g.eco,'merchant',item.id);assert.ok(quote.offers.some(o=>o.item===swap.id));exchange(g.sim,g.eco,'merchant',item.id,'trade',{quote,offer:swap.id});assert.equal(item.location,'npc:merchant');assert.equal(swap.location,'player');assert.ok(swap.poisoned);
});
test('royal badge grants passage without becoming a gift or royal identity; known report blocks it',()=>{
 for(const reported of [false,true]){const g=setup();near(g,'gate_guard');const badge=take(g,i=>i.credential==='royal-badge');if(reported){const c=recordCrimeScene(g.sim,{type:'theft',owner:'traveler',itemId:badge.id,transferred:true,x:0,z:25});acceptCrimeReport(g.sim,{caseId:c.id,reporter:'traveler',officer:'gate_guard'});}
 const r=exchange(g.sim,g.eco,'gate_guard',badge.id,'show');assert.equal(!!g.s.facts.enteredCity,!reported);assert.equal(badge.location,'player');assert.equal(!!r.rejected,reported);assert.ok(!g.s.facts.princeRoyal);}
});
test('possession links only after a real report reaches an observer; frozen disguise is not rewritten',()=>{
 const g=setup();near(g,'gate_relief');g.s.player.face={id:'gate_merchant',serial:5,until:1000};const badge=take(g,i=>i.credential==='royal-badge');observeItem(g.sim,'gate_relief',badge,'show');
 const c=recordCrimeScene(g.sim,{type:'theft',owner:'traveler',itemId:badge.id,transferred:true,x:0,z:25,witnesses:[]});linkItemReports(g.sim,g.eco.positions);assert.equal(c.reports.length,0);
 acceptCrimeReport(g.sim,{caseId:c.id,reporter:'traveler',officer:'guard'});g.eco.positions.guard={x:30,z:30};linkItemReports(g.sim,g.eco.positions);assert.equal(c.reports.length,1);
 g.s.player.face=null;g.eco.positions.guard={x:0,z:25};linkItemReports(g.sim,g.eco.positions);assert.equal(c.reports.length,2);assert.equal(c.reports[1].subject,'gate_merchant');assert.equal(c.reports[1].kind,'possession');assert.equal(g.s.wanted,0);
 assert.equal(investigationRisk(g.s,c,'guard').possession,false);g.s.player.face={id:'gate_merchant',serial:6,until:1000};assert.equal(investigationRisk(g.s,c,'guard').possession,true);assert.match(investigationQuestion(g.s,c,'guard'),/持有/);
 linkItemReports(g.sim,g.eco.positions);assert.equal(c.reports.length,2);assert.equal(knownItemLoss(g.s,'inspector',badge),undefined);assert.ok(echoOptions(g.s).some(o=>o.template==='item_inquiry'));assert.ok(aftermathContext(g.s).options.some(o=>o.template==='item_inquiry'));
});
test('handover animation cancels cleanly on movement, damage, escape or loss and settles once',()=>{
 for(const interruption of ['move','damage','escape','loss','none']){
 const g=setup();near(g,'fu');const item=take(g,i=>i.type==='ledger'),events=new EventTarget(),results=[];
 const world={t:0,performance:null,npcs:new Map([['fu',{actor:{position:g.eco.positions.fu}}]]),perform(){this.performance={start:this.t,duration:2.6};}};
 const view=mountItemExchange({world,getSim:()=>g.sim,getEco:()=>g.eco,close(){},notify(){},onOrigin(){},onResult:(id,key,r)=>results.push(r),events});view.start('fu',item.id,'gift',{task:'ledger'});world.t=1;view.update();assert.equal(item.location,'player');
 if(interruption==='move')g.s.player.x++;if(interruption==='damage')g.s.player.hp--;if(interruption==='escape'){const e=new Event('keydown');e.code='Escape';events.dispatchEvent(e);}if(interruption==='loss')g.eco.transfer(item,'ground');
 world.t=3;view.update();view.update();assert.equal(factionRep(g.s,'yingfeng'),interruption==='none'?40:0);assert.equal(results.length,interruption==='none'?1:0);
 }
});

test('inline item actions keep their panel, never request a camera shot, and cancel on closing',()=>{
 const g=setup();near(g,'merchant');const item=g.eco.items('player').find(i=>i.type==='food'),events=new EventTarget(),results=[],busy=[];let opened=true,closed=0,action;
 const world={t:0,performance:null,npcs:new Map([['merchant',{actor:{position:g.eco.positions.merchant}}]]),perform(a){action=a;this.performance={...a,start:this.t};}};
 const view=mountItemExchange({world,getSim:()=>g.sim,getEco:()=>g.eco,isOpen:()=>opened,close:()=>closed++,onPending:b=>busy.push(b),notify(){},onOrigin(){},onResult:(id,key,r)=>results.push(r),events});
 view.start('merchant',item.id,'show');assert.equal(action.motion,'present');assert.equal(action.camera,false);assert.equal(closed,0);assert.equal(world.itemExchange.phase,'inspect');
 opened=false;world.t=.2;view.update();assert.equal(world.performance,null);assert.equal(world.itemExchange,null);assert.equal(results.length,0);assert.equal(item.location,'player');assert.deepEqual(busy,[true,false]);
 opened=true;view.start('merchant',item.id,'show');world.t+=1;view.update();assert.equal(results.length,1);assert.equal(item.location,'player');assert.equal(closed,0);
 view.react('merchant','我看到了，先让我想想。');assert.equal(world.itemExchange.phase,'inspect');world.t+=.5;view.update();assert.equal(world.itemExchange.phase,'talk');opened=false;view.update();assert.equal(world.itemExchange,null);
});
test('medicine task and food-for-information choose a real item and do not consume it on browsing',()=>{
 const g=setup();near(g,'old_constable');const med=g.eco.create('托存伤药','medicine','player',{storyId:'du-medicine'});
 assert.ok(requestApprenticeship(g.sim,g.eco,'old_constable','ap_medicine_give').needsItem);exchange(g.sim,g.eco,'old_constable',med.id,'show',{task:'medicine'});assert.ok(!g.s.facts.duMedicineGiven);
 assert.ok(exchange(g.sim,g.eco,'old_constable',med.id,'gift').success);assert.ok(g.s.facts.duMedicineGiven);assert.equal(med.location,'npc:old_constable');
 near(g,'beggar');const food=g.eco.items('player').find(i=>i.type==='food'),beforeHp=g.s.people.beggar.hp;food.poisoned=true;
 const quote=tradeQuote(g.sim,g.eco,'beggar',food.id,{task:'ap_news_pass'});assert.equal(quote.offers.length,1);assert.equal(food.location,'player');assert.ok(!g.s.facts.beggarInfoBought);
 assert.ok(exchange(g.sim,g.eco,'beggar',food.id,'trade',{task:'ap_news_pass',quote,offer:'ap_news_pass'}).success);assert.ok(g.s.facts.knownNames.gate_merchant);assert.equal(food.location,'npc:beggar');assert.ok(food.poisoned);assert.equal(g.s.people.beggar.hp,beforeHp);
});
test('ledger barter advertises the actual route credential and rechecks before settling once',()=>{
 const g=setup();near(g,'inspector');const ledger=take(g,i=>i.type==='ledger'),quote=tradeQuote(g.sim,g.eco,'inspector',ledger.id);
 assert.equal(quote.offers[0].label,'副账查案荐书');assert.equal(ledger.location,'player');assert.ok(exchange(g.sim,g.eco,'inspector',ledger.id,'trade',{quote,offer:'ledger-route'}).ledger);assert.equal(ledger.location,'npc:inspector');assert.equal(factionRep(g.s,'court'),40);
});
test('original owner can contradict royal badge only while able to see and speak',()=>{
 for(const blocked of [false,'sleep','bound','wounded','wall']){
  const g=setup();near(g,'gate_guard');const badge=take(g,i=>i.credential==='royal-badge');g.eco.positions.traveler={x:1,z:24};
  if(blocked==='sleep')g.s.people.traveler.life={activity:'sleep'};if(blocked==='bound')g.s.people.traveler.restraint={};if(blocked==='wounded')g.s.people.traveler.hp=20;if(blocked==='wall')g.eco.obstacles=[{x:.5,z:24,w:.2,d:.2}];
  const preview=exchangePreview(g.sim,g.eco,'gate_guard',badge.id,'show'),r=exchange(g.sim,g.eco,'gate_guard',badge.id,'show');assert.equal(preview.chance,blocked?100:0);assert.equal(!!g.s.facts.enteredCity,!!blocked);if(!blocked)assert.equal(r.dialogue[0].id,'traveler');
 }
});
test('possession inquiry is a zero-reward aftermath response and keeps evidence',()=>{
 const g=setup();near(g,'gate_guard');const badge=take(g,i=>i.credential==='royal-badge');observeItem(g.sim,'gate_guard',badge,'show');const c=recordCrimeScene(g.sim,{type:'theft',owner:'traveler',itemId:badge.id,transferred:true,x:0,z:25});acceptCrimeReport(g.sim,{caseId:c.id,reporter:'traveler',officer:'gate_guard'});linkItemReports(g.sim,g.eco.positions);
 const ai={echoes:[{i:aftermathContext(g.s).options.findIndex(o=>o.template==='item_inquiry'),line:'我亲眼见你偷走腰牌了。'}]};
 applyAftermath(g.sim,ai);const e=pendingEcho(g.s,'gate_guard');assert.equal(e.template,'item_inquiry');assert.doesNotMatch(e.line,/亲眼|偷走/);assert.ok(echoChoices(g.s,e).some(x=>x.action.id==='clarify'));const before=g.s.people.gate_guard.relation;
 const r=answerEcho(g.sim,e.id,'clarify');assert.equal(r.delta,0);assert.equal(g.s.people.gate_guard.relation,before);assert.ok(c.reports.some(r=>r.kind==='possession'));assert.ok(answerEcho(g.sim,e.id,'clarify').error);
});
test('worn gift removes equipment, carries poison, and cannot repeatedly earn relation',()=>{
 const g=setup();near(g,'merchant');const shirt=g.eco.items('player').find(i=>i.type==='clothing');g.s.player.wornOutfit=shirt.id;
 const first=exchange(g.sim,g.eco,'merchant',shirt.id,'gift');assert.ok(first.delta>0);assert.equal(g.s.player.wornOutfit,null);g.eco.transfer(shirt,'player','stolen');const relation=g.s.people.merchant.relation;exchange(g.sim,g.eco,'merchant',shirt.id,'gift');assert.equal(g.s.people.merchant.relation,relation);
});
