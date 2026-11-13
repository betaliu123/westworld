import {isDirectReply} from '../src/dialogue.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {Simulation,newArrival,legacyArrival} from '../src/simulation.js';
import {Ecosystem} from '../src/ecosystem.js';
import {PEOPLE} from '../src/data.js';
import {chapterOptions,chapterResolve,chapterFollowups,chapterPreview} from '../src/chapter.js';
import {syncQuests,questsHTML} from '../src/progress.js';
import {genyueRoutes,genyuePreview,genyueRequirements} from '../src/genyue.js';
import {giveItem} from '../src/npc-actions.js';
import {factionRep} from '../src/reputation.js';
import {syncFactionNews,shareFactionNews} from '../src/faction-news.js';
import {recordCrimeScene,acceptCrimeReport} from '../src/crime-investigation.js';
import {custodyStep} from '../src/faction-career.js';
import {mountGenyueInteraction} from '../src/genyue-view.js';
const setup=()=>{const sim=new Simulation(newArrival(),()=>{throw Error('deterministic routes do not roll');}),eco=new Ecosystem(sim,[]);sim.s.facts.enteredCity=true;syncQuests(sim.s);return {sim,eco,s:sim.s};};
function near(g,id){const q=PEOPLE.find(p=>p.id===id);Object.assign(g.s.player,{x:q.x,z:q.z+1});g.eco.positions[id]={x:q.x,z:q.z};Object.assign(g.s.people[id],{x:q.x,z:q.z});}
function act(g,id,key,options){near(g,id);return chapterResolve(g.sim,g.eco,id,'ch_'+key,options);}
function reload(g){const sim=new Simulation(JSON.parse(JSON.stringify(g.s)),()=>{throw Error('unexpected roll');}),eco=new Ecosystem(sim,[]);return {sim,eco,s:sim.s};}
function take(g){const item=g.eco.s.items.find(i=>i.type==='ledger');g.eco.transfer(item,'player','stolen');syncQuests(g.s);return item;}

test('every entry route receives the persistent main objective, respecting untracking and old v1',()=>{
 for(const route of ['papers','royal','river','breach','prison']){const g=setup();g.s.facts.entryRoute=route;syncQuests(g.s);assert.equal(g.s.quests.genyue.kind,'main');assert.equal(g.s.trackedQuest,'genyue');assert.match(g.s.quests.genyue.objective,/打听/);assert.deepEqual(genyueRoutes(g.s),[]);g.s.trackedQuest=null;assert.equal(reload(g).s.trackedQuest,null);}
 const old=legacyArrival();old.facts.enteredCity=true;syncQuests(old);assert.equal(old.genyue,undefined);
});
test('both optional offers are heard before discovery, decline does not commit, and lookup is a tracking choice',()=>{
 const g=setup();for(const [id,key]of [['traveler','royal_task_offer'],['fu','fu_ledger_offer']]){
  const r=act(g,id,key,{deferSpeech:true});assert.ok(r.pendingSpeech);assert.match(r.text,/原账|原本/);assert.match(r.text,/艮岳/);assert.equal(g.s.genyue.offers[id],undefined);
  const heard=act(g,id,key,{confirmedText:r.text});assert.ok(heard.success);const next=chapterFollowups(g.sim,id,heard);assert.ok(next.length<=3);assert.ok(next.some(a=>a.id==='ch_gy_seek'));assert.ok(next.some(a=>a.mode==='endTalk'));
 }
 assert.equal(genyueRoutes(g.s).filter(r=>r.ledger).length,2);assert.match(g.s.quests.genyue.objective,/打听赴/);
 const seek=act(g,'fu','gy_seek');assert.ok(seek.success);assert.ok(isDirectReply(seek));assert.match(g.s.quests.genyue.objective,/打听花石纲副账/);assert.equal(g.s.facts.taxLedgerLead,undefined);assert.equal(g.s.ledgerCase.delivery,undefined);
 const restored=reload(g);assert.equal(restored.s.genyue.focus,'ledger');assert.equal(genyueRoutes(restored.s).length,2);
});
test('old v2 goals recover stale tracking without inventing the revised royal promise',()=>{
 for(const tracked of ['removed','old',null,'side']){const g=setup();delete g.s.quests.genyue;g.s.trackedQuest=tracked;g.s.quests.old={id:'old',status:'complete'};g.s.quests.side={id:'side',status:'active'};syncQuests(g.s);assert.equal(g.s.trackedQuest,['side',null].includes(tracked)?tracked:'genyue');}
 const g=setup();chapterOptions(g.sim,'traveler');g.s.chapter.done.royal_task_offer=true;syncQuests(g.s);assert.equal(g.s.genyue.offers.traveler,undefined);assert.ok(chapterOptions(g.sim,'traveler').some(a=>a.id==='ch_royal_task_offer'));assert.ok(act(g,'traveler','royal_task_offer').success);assert.ok(g.s.genyue.offers.traveler.ledger);
});
test('prior acquisition, read and reload all lead to one exclusive delivery and no forced search replay',()=>{
 for(const recipient of ['traveler','fu']){let g=setup();act(g,'traveler','royal_task_offer');act(g,'fu','fu_ledger_offer');act(g,'traveler','gy_seek');take(g);g=reload(g);assert.match(g.s.quests.genyue.objective,/原账在手/);
  const offer=act(g,recipient,'ledger_offer',{deferSpeech:true});assert.ok(offer.pendingSpeech);assert.ok(isDirectReply(offer));assert.equal(g.s.ledgerCase.offers[recipient],undefined);act(g,recipient,'ledger_offer',{confirmedText:offer.text});
  const commit=chapterOptions(g.sim,recipient).find(a=>a.id==='ch_ledger_commit');assert.match(commit.label,/其他献账门路关闭/);
  near(g,recipient);const item=g.eco.s.items.find(i=>i.type==='ledger');assert.ok(giveItem(g.sim,g.eco,recipient,item.id).success);
  assert.equal(genyueRoutes(g.s).filter(r=>r.closed).length,1);assert.match(g.s.quests.genyue.objective,/携凭据/);
  const rep=factionRep(g.s,recipient==='fu'?'yingfeng':'court');g.eco.transfer(item,'player','stolen');near(g,recipient==='fu'?'traveler':'fu');assert.ok(giveItem(g.sim,g.eco,recipient==='fu'?'traveler':'fu',item.id).error);assert.equal(factionRep(g.s,recipient==='fu'?'yingfeng':'court'),rep);
 }
 const first=setup();take(first);const offer=act(first,'fu','ledger_offer');assert.match(offer.text,/艮岳/);assert.ok(!chapterOptions(first.sim,'fu').some(a=>a.id==='ch_gy_seek'));
});
test('unknown route conditions stay out of HTML; heard offers show exact requirements',()=>{
 const g=setup();assert.doesNotMatch(questsHTML(g.s,x=>x),/1000|50|花鸟使|王爷/);
 act(g,'inspector','genyue_court_offer');act(g,'gang_boss','genyue_gang_offer');const html=questsHTML(g.s,x=>x);assert.match(html,/0\/50/);assert.match(html,/12\/1000/);assert.doesNotMatch(html,/王爷/);
 assert.equal(chapterFollowups(g.sim,'gang_boss',{actionId:'ch_genyue_gang_offer',follow:['gy_buy_gang','gy_favor_gang']}).length,3);
});
test('court route checks reputation, referral, unsettled cases and physical pass independently',()=>{
 const g=setup();act(g,'inspector','genyue_court_offer');g.s.factions={'六扇门':50};let a=chapterOptions(g.sim,'inspector').find(a=>a.id==='ch_gy_claim_court');assert.ok(chapterPreview(g.sim,'inspector',a,g.eco).blocked);
 g.s.people.thief.custodyDelivered=true;assert.equal(genyueRequirements(g.s,'court').referral,true);g.s.wanted=1;assert.ok(act(g,'inspector','gy_claim_court').error);g.s.wanted=0;
 assert.ok(act(g,'inspector','gy_claim_court').success);assert.equal(g.eco.s.items.filter(i=>i.genyuePass).length,1);assert.ok(act(g,'inspector','gy_claim_court').error);
 const item=g.eco.s.items.find(i=>i.genyuePass);g.eco.transfer(item,'ground');assert.ok(act(g,'inspector','gy_depart_court').error);g.eco.transfer(item,'player');assert.ok(act(g,'inspector','gy_depart_court').success);assert.equal(g.s.quests.genyue.status,'complete');assert.ok(act(g,'inspector','gy_depart_court').error);
});
test('gang purchase rechecks money, distance and condition; pays once, persists identity and original ticket',()=>{
 let g=setup();act(g,'gang_boss','genyue_gang_offer');assert.ok(act(g,'gang_boss','gy_buy_gang').error);g.s.player.money=1000;near(g,'gang_boss');const a=chapterOptions(g.sim,'gang_boss').find(a=>a.id==='ch_gy_buy_gang');
 g.s.player.x+=10;assert.ok(genyuePreview(g.sim,'gang_boss',a,g.eco).blocked);g.s.people.gang_boss.restraint={};assert.ok(act(g,'gang_boss','gy_buy_gang').error);delete g.s.people.gang_boss.restraint;
 g.s.player.face={id:'gate_merchant',serial:8,until:10000};const purse=g.s.people.gang_boss.purse||0;assert.ok(act(g,'gang_boss','gy_buy_gang').success);assert.equal(g.s.player.money,0);assert.equal(g.s.people.gang_boss.purse,purse+1000);
 g=reload(g);assert.ok(act(g,'gang_boss','gy_buy_gang').error);g.s.player.face=null;assert.ok(act(g,'gang_boss','gy_depart_gang').error);assert.equal(g.eco.s.items.filter(i=>i.genyuePass).length,1);
});
test('interrupted visible handover never pays or grants a ticket',()=>{
 for(const interrupt of ['move','hurt','escape','none']){const g=setup();act(g,'gang_boss','genyue_gang_offer');g.s.player.money=1000;const action=chapterOptions(g.sim,'gang_boss').find(a=>a.id==='ch_gy_buy_gang'),events=new EventTarget();
  const world={t:0,npcs:new Map([['gang_boss',{actor:{position:g.eco.positions.gang_boss}}]]),perform(){this.performance={start:0,duration:2};}};
  const ui=mountGenyueInteraction({world,getSim:()=>g.sim,getEco:()=>g.eco,dialogue:{active:false,play(){}},close(){},notify(){},choices(){},events});ui.start('gang_boss',action);assert.equal(g.s.player.money,1000);
  if(interrupt==='move')g.s.player.x+=1;if(interrupt==='hurt')g.s.player.hp--;if(interrupt==='escape'){const e=new Event('keydown');e.code='Escape';events.dispatchEvent(e);}world.t=3;ui.update();ui.update();
  assert.equal(g.s.player.money,interrupt==='none'?0:1000);assert.equal(g.eco.s.items.filter(i=>i.genyuePass).length,interrupt==='none'?1:0);
 }
});
test('a confirmed departure cannot be overwritten by a competing ending',()=>{
 const g=setup();act(g,'gang_boss','genyue_gang_offer');g.s.player.money=1000;act(g,'gang_boss','gy_buy_gang');act(g,'gang_boss','gy_depart_gang');const ending=g.s.chapter.ending.title;
 g.s.facts.qingheConsent=true;assert.ok(!chapterOptions(g.sim,'qinghe').some(a=>a.id==='ch_qinghe_end'));
 const item=take(g);near(g,'fu');assert.ok(giveItem(g.sim,g.eco,'fu',item.id).success);assert.equal(g.s.quests.genyue.status,'complete');assert.ok(!chapterOptions(g.sim,'fu').some(a=>a.id==='ch_ledger_depart'));assert.equal(g.s.chapter.ending.title,ending);
});
function crime(g,{witness='tea_host',subject='player',victim='fu',type='theft'}={}){return recordCrimeScene(g.sim,{type,target:victim,owner:victim,x:0,z:0,witnesses:witness?[witness]:[],identities:{[witness]:subject},itemId:'test-cargo',transferred:type==='theft'});}
test('crime reputation follows real news, not wanted counters, discovery or current disguise',()=>{
 const g=setup();g.s.wanted=8;const c=crime(g,{subject:'gate_merchant'});syncFactionNews(g.sim);assert.equal(factionRep(g.s,'gang'),0);assert.equal(factionRep(g.s,'court'),0);
 const positions={tea_host:{x:0,z:0},gang_boss:{x:1,z:0},inspector:{x:2,z:0}};g.s.player.face=null;assert.ok(shareFactionNews(g.sim,c,'tea_host','gang_boss',positions));assert.equal(g.s.appearance.reputations.gate_merchant.factions.gang,12);assert.equal(factionRep(g.s,'gang'),0);
 assert.ok(shareFactionNews(g.sim,c,'tea_host','inspector',positions));assert.equal(g.s.appearance.reputations.gate_merchant.factions.court,-10);syncFactionNews(g.sim);assert.equal(g.s.appearance.reputations.gate_merchant.factions.court,-10);
 const h=setup(),unknown=crime(h,{witness:null});unknown.discoverer='fu';syncFactionNews(h.sim);assert.deepEqual(unknown.factionKnown,{});assert.equal(factionRep(h.s,'court'),0);
});
test('reporting testimony changes court standing once; prison does not restore it',()=>{
 const g=setup(),c=crime(g);acceptCrimeReport(g.sim,{caseId:c.id,reporter:'tea_host',officer:'inspector'});syncFactionNews(g.sim);assert.equal(factionRep(g.s,'court'),-10);g.s.wanted=0;c.custody={subject:'player'};const h=reload(g);syncFactionNews(h.sim);assert.equal(factionRep(h.s,'court'),-10);
});
test('walls, distance and incapacitation prevent propagation; civilian abuse earns no gang standing',()=>{
 const g=setup(),c=crime(g,{victim:'tea_host',type:'assault'});syncFactionNews(g.sim);const pos={tea_host:{x:0,z:0},gang_boss:{x:2,z:0}};
 assert.equal(shareFactionNews(g.sim,c,'tea_host','gang_boss',pos,[{x:1,z:0,w:.5,d:3}]),false);g.s.people.gang_boss.life={activity:'sleep'};assert.equal(shareFactionNews(g.sim,c,'tea_host','gang_boss',pos),false);g.s.people.gang_boss.life={activity:'idle'};assert.ok(shareFactionNews(g.sim,c,'tea_host','gang_boss',pos));assert.equal(factionRep(g.s,'gang'),0);
});
test('earned court path reaches 50 through physical custody and propagated wage mediation, without ledger',()=>{
 const g=setup();near(g,'qing');g.s.player.money=10;chapterOptions(g.sim,'qing');g.s.chapter.done.convoy_dispute=true;assert.ok(act(g,'qing','convoy_peace').success);syncFactionNews(g.sim);const merit=g.s.factionNews.merits.wages;
 shareFactionNews(g.sim,merit,'qing','inspector',{qing:{x:0,z:0},inspector:{x:1,z:0}});assert.equal(factionRep(g.s,'court'),20);
 g.s.people.thief.inCustody=true;near(g,'inspector');g.eco.positions.thief={...g.eco.positions.inspector};custodyStep(g.sim,g.eco.positions);assert.equal(factionRep(g.s,'court'),50);assert.ok(act(g,'inspector','gy_claim_court').success);assert.equal(g.s.facts.ledgerDelivered,undefined);
});
