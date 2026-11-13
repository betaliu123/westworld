import test from 'node:test';
import assert from 'node:assert/strict';
import {Simulation,newArrival} from '../src/simulation.js';
import {Ecosystem} from '../src/ecosystem.js';
import {beginTheftAttempt} from '../src/theft-attempt.js';
import {recordCrimeScene,acceptCrimeReport,discoverBodies} from '../src/crime-investigation.js';
import {publishWantedNotices,publicWantedNotices,wantedProfile} from '../src/wanted-records.js';
import {bountyPreview,redeemBounty,requestBountyHandover} from '../src/bounty.js';
import {bountyOfficerMotion} from '../src/bounty-world.js';
import {wantedBoardMarkup} from '../src/wanted-board.js';
import {lawfulRestraint} from '../src/npc-restraints.js';
import * as T from '../vendor/three.module.js';

function setup(){
 const sim=new Simulation(newArrival(),()=>{throw Error('certain action rolled');});sim.save=()=>{};const s=sim.s,eco=new Ecosystem(sim,[{id:'wanted-board',kind:'noticeboard',name:'通缉榜',x:0,z:0,max:150}]);
 Object.assign(s.player,{x:0,z:1,hp:100,energy:100,crouched:false,stealing:false});s.event=null;s.npcClock=0;
 eco.positions={merchant:{x:0,z:2,facing:Math.PI},guard:{x:1,z:1,facing:Math.PI},inspector:{x:1,z:2,facing:Math.PI}};
 return {sim,s,eco};
}
function report(f,subject='merchant'){
 f.s.player.face=subject==='player'?null:{id:subject,serial:1,until:99999};
 const c=recordCrimeScene(f.sim,{type:'theft',target:'tea',x:0,z:0,witnesses:['tea'],identities:{tea:subject}});
 acceptCrimeReport(f.sim,{caseId:c.id,reporter:'tea',officer:'guard'});f.s.npcClock+=21;publishWantedNotices(f.sim);f.s.player.face=null;return c;
}
test('standing loot uses the real inventory, no rolls, including concealed goods and one purse after reload',()=>{
 for(const condition of ['bound','dead','stunned']){
  const f=setup(),n=f.s.people.merchant;if(condition==='bound')n.restraint={mode:'fixed'};if(condition==='dead')n.hp=0;if(condition==='stunned')n.stunnedUntil=100;
  const goods=f.eco.create('袖中信','sealed','npc:merchant',{concealed:true,poisoned:true,ownerId:'merchant'}),before=JSON.stringify(f.s);
  assert.equal(f.eco.theftPreview('merchant',goods.id).certain,true);assert.equal(JSON.stringify(f.s),before);
  const cancelled=beginTheftAttempt(f.eco,'merchant',goods.id);cancelled.cancel();assert.equal(cancelled.finish(),undefined);assert.equal(goods.location,'npc:merchant');
  const attempt=beginTheftAttempt(f.eco,'merchant',goods.id);attempt.sample();assert.equal(attempt.finish().error,undefined);assert.equal(goods.location,'player');assert.equal(goods.poisoned,true);assert.equal(goods.opened,undefined);assert.equal(goods.provenance.originalOwner,'merchant');
  const purse=n.purse;assert.equal(f.eco.stealNpc('merchant','purse'),undefined);assert.equal(n.purse,0);assert.equal(f.eco.items('player').find(i=>i.type==='purse').value,purse);
  const reloaded=new Simulation(JSON.parse(JSON.stringify(f.s)));reloaded.save=()=>{};const eco=new Ecosystem(reloaded);eco.positions=f.eco.positions;assert.ok(eco.stealNpc('merchant',goods.id));assert.ok(eco.stealNpc('merchant','purse'));
 }
});
test('loot rechecks recovery, distance, walls and injury before contact; no loss on interruption',()=>{
 for(const change of [f=>delete f.s.people.merchant.restraint,f=>f.eco.positions.merchant.z=20,f=>f.eco.obstacles=[{x:0,z:1.5,w:3,d:.1}],f=>f.s.player.hp--]){
  const f=setup();f.s.people.merchant.restraint={mode:'fixed'};const item=f.eco.items('npc:merchant')[0],attempt=beginTheftAttempt(f.eco,'merchant',item.id);change(f);assert.ok(attempt.finish().error);assert.equal(item.location,'npc:merchant');
 }
});
test('a surviving witness must actually report before a public warrant exists; frozen face and clothes survive unmask/reload',()=>{
 const f=setup();f.s.player.face={id:'merchant',serial:3,until:99999};const coat=f.eco.s.items.find(i=>i.id===f.s.player.wornOutfit),oldName=coat.name;
 const c=recordCrimeScene(f.sim,{type:'assault',target:'tea',x:0,z:0,witnesses:['tea'],identities:{tea:'merchant'}});f.s.npcClock=30;publishWantedNotices(f.sim);assert.equal(publicWantedNotices(f.s).length,1);
 f.s.player.face=null;coat.name='新衣';acceptCrimeReport(f.sim,{caseId:c.id,reporter:'tea',officer:'guard'});publishWantedNotices(f.sim);
 const notice=publicWantedNotices(f.s).find(w=>w.subject==='merchant');assert.ok(notice);assert.match(notice.description.text,new RegExp(oldName));assert.doesNotMatch(notice.description.text,/新衣/);assert.equal(wantedProfile(f.s,'guard'),null);
 const copy=new Simulation(JSON.parse(JSON.stringify(f.s)));copy.save=()=>{};publishWantedNotices(copy);assert.equal(publicWantedNotices(copy.s).length,2);assert.ok(lawfulRestraint(copy,'merchant'));
});
test('own crimes post descriptions instead of claiming a new name and survive wardrobe cycling',()=>{
 const f=setup();report(f,'player');const notice=publicWantedNotices(f.s).find(w=>w.subject==='player');assert.equal(notice.description.name,'无名行客');assert.ok(wantedProfile(f.s,'gate_guard'));
 const before=JSON.stringify(notice.description);f.s.player.wornOutfit=null;publishWantedNotices(f.sim);assert.equal(JSON.stringify(publicWantedNotices(f.s).find(w=>w.subject==='player').description),before);
});
test('finding a corpse does not identify the killer, and a later patrol can discover what an incapacitated finder could not report',()=>{
 const f=setup();f.s.people.merchant.hp=0;discoverBodies(f.sim,{merchant:{x:0,z:0},tea:{x:0,z:1,facing:Math.PI}});assert.equal(f.s.investigations.cases[0].discoverer,'tea');f.s.people.tea.restraint={mode:'fixed'};
 discoverBodies(f.sim,{merchant:{x:0,z:0},tea:{x:0,z:1},guard:{x:1,z:0,facing:-Math.PI/2}});const c=f.s.investigations.cases[0];assert.equal(c.assigned,'guard');assert.equal(c.state,'enroute');f.s.npcClock=40;publishWantedNotices(f.sim);assert.equal(publicWantedNotices(f.s).length,1);
 discoverBodies(f.sim,{merchant:{x:0,z:0},guard:{x:1,z:0}});assert.equal(c.reports.length,1);
});
test('a patrol cannot discover bodies through walls, backwards, asleep or tied',()=>{
 for(const kind of ['wall','back','sleep','bound']){const f=setup();f.s.people.merchant.hp=0;const positions={merchant:{x:0,z:0},guard:{x:0,z:2,facing:kind==='back'?0:Math.PI}};if(kind==='sleep')f.s.people.guard.life={activity:'sleep'};if(kind==='bound')f.s.people.guard.restraint={mode:'fixed'};discoverBodies(f.sim,positions,kind==='wall'?[{x:0,z:1,w:4,d:.1}]:[]);assert.equal(f.s.investigations.cases.length,0);}
});
test('bounty delivery validates live captive, ready receiver, distance, walls and self-wanted identity',()=>{
 for(const change of [f=>f.s.people.merchant.hp=0,f=>f.eco.positions.merchant.z=20,f=>f.s.people.guard.restraint={mode:'fixed'},f=>f.s.people.guard.life={activity:'sleep'},f=>f.s.people.guard.muteUntil=100,f=>f.eco.obstacles=[{x:.5,z:1.5,w:.1,d:4}],f=>f.s.player.face={id:'merchant',serial:2,until:99999}]){
  const f=setup();report(f);f.s.people.merchant.restraint={mode:'lead'};const money=f.s.player.money;change(f);assert.ok(redeemBounty(f.sim,'merchant','guard',f.eco.positions,f.eco.obstacles).error);assert.equal(f.s.player.money,money);assert.ok(!f.s.people.merchant.custodyDelivered);
 }
});
test('framed original can be delivered, pays once, keeps evidence and does not shift blame to player on reload',()=>{
 const f=setup(),c=report(f);f.s.people.merchant.restraint={mode:'lead'};const before=f.s.player.money,expected=bountyPreview(f.s,'merchant','guard',f.eco.positions).reward;
 assert.ok(redeemBounty(f.sim,'merchant','guard',f.eco.positions).success);assert.equal(f.s.player.money,before+expected);assert.equal(c.witnesses[0].subject,'merchant');assert.equal(c.custody.subject,'merchant');assert.equal(wantedProfile(f.s,'guard'),null);assert.equal(publicWantedNotices(f.s).find(w=>w.subject==='merchant').status,'served');
 const sim=new Simulation(JSON.parse(JSON.stringify(f.s)));sim.save=()=>{};assert.ok(redeemBounty(sim,'merchant','guard',f.eco.positions).error);publishWantedNotices(sim);assert.equal(sim.s.player.money,before+expected);assert.equal(publicWantedNotices(sim.s).length,2);
});
test('board and receiver use same single settlement; request alone pays nothing and the officer walks to contact',()=>{
 const f=setup();report(f);f.s.people.merchant.restraint={mode:'fixed'};delete f.eco.positions.inspector;f.eco.positions.guard={x:0,z:8};const before=f.s.player.money;
 assert.ok(requestBountyHandover(f.sim,'merchant',null,f.eco.positions,[],true).pending);assert.equal(f.s.player.money,before);
 const npcs=new Map(Object.entries(f.eco.positions).map(([id,p])=>{const actor=new T.Group();actor.position.set(p.x,0,p.z);return [id,{actor}];}));
 let moves=0;const world={sim:f.sim,npcs,obstacles:[],t:0,collides:()=>false,move(a,x,z){moves++;a.position.x+=x;a.position.z+=z;},animateActor(){}};
 for(let i=0;i<100&&f.s.law.handover;i++){world.t+=.1;f.s.npcClock+=.1;bountyOfficerMotion(world,'guard',npcs.get('guard'),.1);}
 assert.ok(moves>0);assert.equal(f.s.player.money,before+20);assert.equal(f.s.people.merchant.custodyReceiver,'guard');
});
test('dynamic board refresh lists frozen descriptions and received status, without player-only knowledge changes',()=>{
 const f=setup();report(f);const before=JSON.stringify(f.s);const html=wantedBoardMarkup(f.s,f.eco.positions,[],s=>s);assert.match(html,/货郎/);assert.match(html,/盗窃嫌疑/);assert.equal(JSON.stringify(f.s),before);
 f.s.people.merchant.restraint={mode:'fixed'};redeemBounty(f.sim,'merchant','guard',f.eco.positions);assert.match(wantedBoardMarkup(f.s,f.eco.positions,[],s=>s),/已到案/);
});
