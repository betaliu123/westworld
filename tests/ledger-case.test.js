import test from 'node:test';
import assert from 'node:assert/strict';
import {Simulation,newArrival,legacyArrival} from '../src/simulation.js';
import {Ecosystem} from '../src/ecosystem.js';
import {PEOPLE} from '../src/data.js';
import {exchange} from '../src/item-exchange.js';
import {giveItem} from '../src/npc-actions.js';
import {chapterOptions,chapterResolve,chapterFollowups,chapterPreview} from '../src/chapter.js';
import {syncQuests,progressSnapshot} from '../src/progress.js';
import {cityRep,factionRep,reputationHTML} from '../src/reputation.js';
import {knownOrganization} from '../src/factions.js';
import {ledgerCase,heldLedger,readLedger,ledgerPreview,LEDGER_ROUTES} from '../src/ledger-case.js';
import {mountLedgerInteraction} from '../src/ledger-view.js';
function setup(){const sim=new Simulation(newArrival(),()=>{throw Error('ledger must not roll');}),eco=new Ecosystem(sim,[]);return {sim,eco,s:sim.s,ledger:eco.s.items.find(i=>i.type==='ledger')};}
function near(g,id){const q=PEOPLE.find(n=>n.id===id);g.eco.positions[id]={x:q.x,z:q.z};Object.assign(g.s.player,{x:q.x,z:q.z+1});Object.assign(g.s.people[id],{x:q.x,z:q.z});}
function take(g,method='stolen'){g.eco.transfer(g.ledger,'player',method);syncQuests(g.s);}
function act(g,id,key){near(g,id);const r=key==='commit'?exchange(g.sim,g.eco,id,g.ledger.id,'gift',{task:'ledger'}):chapterResolve(g.sim,g.eco,id,'ch_ledger_'+key,{submittedItem:key==='commit'?g.ledger.id:null});assert.ok(!r.error,r.error);return r;}
function reload(g){const sim=new Simulation(JSON.parse(JSON.stringify(g.s)),()=>{throw Error('ledger must not roll');}),eco=new Ecosystem(sim,[]);return {sim,eco,s:sim.s,ledger:eco.s.items.find(i=>i.type==='ledger')};}

for(const [route,r] of Object.entries(LEDGER_ROUTES))for(const id of r.recipients){
 test(`${id}: prior action and reload reach ${route}, one reward, explicit departure`,()=>{
  let g=setup();take(g);g=reload(g);const before=cityRep(g.s),originalOwner=g.ledger.ownerId;
  const offer=act(g,id,'offer');assert.equal(offer.presentation,'dialogue');assert.equal(g.ledger.location,'player');assert.equal(factionRep(g.s,r.faction),0);
  const choices=chapterFollowups(g.sim,id,offer);assert.equal(choices.length,3);assert.ok(choices.some(a=>a.id==='ch_ledger_decline'));
  act(g,id,'decline');assert.equal(g.ledger.location,'player');act(g,id,'offer');const delivered=act(g,id,'commit');
  assert.equal(factionRep(g.s,r.faction),40);assert.equal(cityRep(g.s),before);assert.equal(g.s.facts.career,undefined);assert.equal(g.s.facts.demoComplete,undefined);
  assert.equal(g.s.quests.ledger.status,'complete');assert.equal(g.s.quests.genyue.status,'active');assert.equal(g.ledger.location,'npc:'+id);
  assert.equal(g.ledger.provenance.originalOwner,originalOwner);assert.equal(g.ledger.provenance.history.at(-1).method,'donated');assert.ok(g.ledger.provenance.history.at(-1).cause);
  assert.equal(g.s.ledgerCase.read,undefined);assert.ok(delivered.changes.includes(r.name+'声望 +40'));assert.equal(g.s.facts.princeRoyal,undefined);
  g=reload(g);near(g,id);assert.ok(giveItem(g.sim,g.eco,id,g.ledger.id).error);
  g.eco.transfer(g.ledger,'player','stolen');near(g,'fu');assert.ok(giveItem(g.sim,g.eco,'fu',g.ledger.id).error);assert.equal(g.ledger.location,'player');
  near(g,id);act(g,id,'depart');assert.equal(g.s.facts.demoComplete,true);assert.equal(g.s.quests.genyue.status,'complete');assert.equal(factionRep(g.s,r.faction),40);
  assert.equal(g.eco.s.items.filter(i=>i.ledgerPass).length,1);assert.ok(!chapterOptions(g.sim,id).some(a=>a.id.startsWith('ch_ledger_')));
 });
}
test('testimony, convoy manifest and renamed gifts never count as the original or unlock royal evidence',()=>{
 const g=setup();near(g,'traveler');for(const name of ['狱友口供：东街副账','花石纲名册','副账抄写纸']){const item=g.eco.create(name,'document','player');giveItem(g.sim,g.eco,'traveler',item.id);}
 assert.equal(g.s.facts.ledgerDelivered,undefined);assert.equal(g.s.facts.princeEvidence,undefined);assert.equal(factionRep(g.s,'court'),0);assert.equal(g.s.ledgerCase.delivery,undefined);assert.equal(g.s.quests.ledger.status,'active');
});
test('read is distinct from acquisition, preserves uncertainty, and rereading after reload unlocks no duplicates',()=>{
 let g=setup();take(g);assert.equal(g.s.intelligence?.clues?.ledger_accounts,undefined);g.eco.act('read','',g.ledger.id);
 assert.match(g.s.quests.ledger.objective,/选择/);const clue=knownOrganization(g.sim).clues.find(c=>c.id==='ledger_accounts');assert.equal(clue.confidence,'账面记载');assert.deepEqual(clue.edges,[]);assert.match(clue.text,/尚未查明/);
 g=reload(g);g.eco.act('read','',g.ledger.id);assert.equal(g.s.chronicle.deeds.filter(d=>d.key==='ledger:read').length,1);assert.equal(g.s.player.xp,0);assert.equal(cityRep(g.s),0);
});
test('talk first and take first have the same faction reward, no old retrieval step when already held',()=>{
 const a=setup(),b=setup();a.s.facts.enteredCity=true;near(a,'prisoner');chapterResolve(a.sim,a.eco,'prisoner','ch_ledger_story');chapterResolve(a.sim,a.eco,'prisoner','ch_ledger_where');chapterResolve(a.sim,a.eco,'prisoner','ch_ledger_offer');chapterResolve(a.sim,a.eco,'prisoner','ch_ledger_get');
 take(b);b.s.facts.enteredCity=true;assert.ok(!chapterOptions(b.sim,'prisoner').some(a=>a.id==='ch_ledger_get'));
 for(const g of [a,b]){near(g,'qing');assert.ok(!giveItem(g.sim,g.eco,'qing',g.ledger.id).error);assert.equal(factionRep(g.s,'qingzhu'),40);assert.equal(g.s.quests.ledger.status,'complete');}
});
test('stale previews, refusal, distance, obstruction and incapacity never transfer, roll or reward',()=>{
 const cases=[g=>g.s.player.x+=10,g=>g.eco.obstacles.push({x:g.s.player.x,z:g.s.player.z-.5,w:2,d:.2}),g=>g.s.people.fu.restraint={by:'player'},g=>g.s.people.fu.life={activity:'sleep'},g=>g.s.people.fu.hp=0,g=>g.s.people.fu.relation=-30,g=>g.s.people.fu.stunnedUntil=99,g=>g.eco.transfer(g.ledger,'ground')];
 for(const change of cases){const g=setup();take(g);act(g,'fu','offer');g.eco.obstacles=[];const a=chapterOptions(g.sim,'fu').find(a=>a.id==='ch_ledger_commit');assert.equal(chapterPreview(g.sim,'fu',a,g.eco).blocked,false);change(g);
  assert.equal(chapterPreview(g.sim,'fu',a,g.eco).blocked,true);assert.ok(exchange(g.sim,g.eco,'fu',g.ledger.id,'gift',{task:'ledger'}).error);assert.ok(giveItem(g.sim,g.eco,'fu',g.ledger.id).error);assert.notEqual(g.ledger.location,'npc:fu');assert.equal(factionRep(g.s,'yingfeng'),0);}
});
test('faction reward is capped and reported as its actual delta; no unexplained rival losses',()=>{
 const g=setup();take(g);g.s.factions={'应奉局':95,'六扇门':12,'赤砂帮':8};near(g,'fu');const r=giveItem(g.sim,g.eco,'fu',g.ledger.id);
 assert.ok(r.changes.includes('应奉局声望 +5'));assert.equal(factionRep(g.s,'yingfeng'),100);assert.equal(factionRep(g.s,'court'),12);assert.equal(factionRep(g.s,'gang'),8);assert.equal(progressSnapshot(g.s)['faction:yingfeng'],100);assert.match(reputationHTML(g.s,x=>x),/应奉局/);
});
test('recognized actor is frozen for relation, faction, cause and credential; removing disguise cannot cash it',()=>{
 const g=setup();take(g);g.s.player.face={id:'gate_merchant',serial:9,until:1000};near(g,'qing');const before=g.s.people.qing.relation;assert.ok(!giveItem(g.sim,g.eco,'qing',g.ledger.id).error);
 assert.equal(g.s.people.qing.relation,before);assert.equal(factionRep(g.s,'qingzhu'),0);assert.equal(g.s.appearance.reputations.gate_merchant.factions.qingzhu,40);assert.equal(g.s.ledgerCase.delivery.subject,'gate_merchant');assert.equal(g.s.chronicle.deeds.find(d=>d.key==='ledger:delivery').subject,'gate_merchant');
 g.s.player.face=null;const a=chapterOptions(g.sim,'qing').find(a=>a.id==='ch_ledger_depart');assert.equal(ledgerPreview(g.sim,'qing',a,g.eco).blocked,true);assert.ok(chapterResolve(g.sim,g.eco,'qing',a.id).error);assert.equal(factionRep(g.s,'qingzhu'),0);
});
test('legacy physical delivery resumes once without regifting or relation reward; flags alone are insufficient',()=>{
 let g=setup();take(g);g.eco.transfer(g.ledger,'npc:traveler');g.s.facts.ledgerDelivered=true;g.s.itemSettlements={[g.ledger.id+':traveler']:true};delete g.s.ledgerCase;g=reload(g);const before=g.s.people.traveler.relation;
 assert.equal(g.s.ledgerCase.delivery.legacy,true);act(g,'traveler','claim');assert.equal(factionRep(g.s,'court'),40);assert.equal(g.s.people.traveler.relation,before);assert.equal(g.ledger.location,'npc:traveler');
 g=reload(g);near(g,'traveler');assert.ok(chapterResolve(g.sim,g.eco,'traveler','ch_ledger_claim').error);assert.equal(g.eco.s.items.filter(i=>i.ledgerPass).length,1);
 const b=setup();b.s.facts.ledgerDelivered=true;b.s.facts.taxLedgerLead=true;syncQuests(b.s);assert.equal(ledgerCase(b.s).delivery,undefined);assert.equal(b.s.quests.ledger.status,'active');
});
test('v2 stale task repairs in place, respects untracking, destroyed ledger and lost credential do not duplicate',()=>{
 const g=setup();g.s.quests.ledger={id:'ledger',title:'东街副账',objective:'调查东街税课司',source:'旧账房证言'};g.s.trackedQuest=null;take(g);syncQuests(g.s);assert.match(g.s.quests.ledger.objective,/行囊/);assert.equal(g.s.trackedQuest,null);
 g.ledger.hp=0;assert.ok(readLedger(g.sim,g.ledger).error);assert.equal(heldLedger(g.s),undefined);g.ledger.hp=30;near(g,'fu');giveItem(g.sim,g.eco,'fu',g.ledger.id);g.eco.transfer(g.eco.s.items.find(i=>i.ledgerPass),'ground');
 assert.ok(chapterResolve(g.sim,g.eco,'fu','ch_ledger_depart').error);assert.equal(g.eco.s.items.filter(i=>i.ledgerPass).length,1);
 const old=legacyArrival();old.facts.taxLedgerLead=true;syncQuests(old);assert.equal(old.quests.ledger.title,'东街副账');assert.equal(old.ledgerCase,undefined);
});
test('visible handover settles only at completion; movement, damage, escape and replacement cancel cleanly',()=>{
 for(const interrupt of ['move','damage','escape','replace','none']){
  const g=setup();take(g);act(g,'fu','offer');const action=chapterOptions(g.sim,'fu').find(a=>a.id==='ch_ledger_commit'),events=new EventTarget(),lines=[];
  const world={t:0,performance:null,npcs:new Map([['fu',{actor:{position:g.eco.positions.fu}}]]),perform(a,id){this.performance={start:this.t,duration:2.6,targetId:id};}};
  const view=mountLedgerInteraction({world,getSim:()=>g.sim,getEco:()=>g.eco,dialogue:{play:line=>lines.push(...line)},close(){},notify(){},choices(){},events});
  view.start('fu',action);world.t=1;view.update();assert.equal(g.ledger.location,'player');assert.equal(factionRep(g.s,'yingfeng'),0);
  if(interrupt==='move')g.s.player.x+=1;if(interrupt==='damage')g.s.player.hp-=1;if(interrupt==='escape'){const event=new Event('keydown');event.code='Escape';events.dispatchEvent(event);}if(interrupt==='replace')world.performance={start:1,duration:4};
  world.t=3;view.update();assert.equal(view.active,false);
  assert.equal(g.ledger.location,interrupt==='none'?'npc:fu':'player');assert.equal(factionRep(g.s,'yingfeng'),interrupt==='none'?40:0);assert.equal(lines.length,interrupt==='none'?1:0);view.update();assert.equal(g.eco.s.items.filter(i=>i.ledgerPass).length,interrupt==='none'?1:0);
 }
});
test('bare old delivery flags do not unlock court endings, joining later preserves earned faction reputation',()=>{
 const g=setup();g.s.facts.enteredCity=true;g.s.facts.ledgerDelivered=true;g.s.facts.career='court';g.s.reputation=70;chapterOptions(g.sim,'traveler');g.s.chapter.done.royal_task=true;
 assert.ok(!chapterOptions(g.sim,'traveler').some(a=>a.id==='ch_royal_end'));assert.ok(!chapterOptions(g.sim,'inspector').some(a=>a.id==='ch_court_end'));
 delete g.s.facts.career;take(g);near(g,'inspector');giveItem(g.sim,g.eco,'inspector',g.ledger.id);g.s.facts.courtTokenPresented=true;
 chapterResolve(g.sim,g.eco,'inspector','ch_court_join');assert.equal(factionRep(g.s,'court'),40);
});
test('confirmed faction restrictions block the credential, but a mere allegation cannot erase qualification',()=>{
 const g=setup();take(g);near(g,'inspector');giveItem(g.sim,g.eco,'inspector',g.ledger.id);assert.ok(knownOrganization(g.sim).clues.some(c=>c.id==='ledger_disposition'&&c.source==='当面献账与领书'));
 const action=chapterOptions(g.sim,'inspector').find(a=>a.id==='ch_ledger_depart');g.s.factionDiscipline={cases:{},reports:[{faction:'court',subject:'player',status:'reported'}]};assert.equal(ledgerPreview(g.sim,'inspector',action,g.eco).blocked,false);
 g.s.factionDiscipline.cases={a:{faction:'court',subject:'player'},b:{faction:'court',subject:'player'}};assert.equal(ledgerPreview(g.sim,'inspector',action,g.eco).blocked,true);assert.ok(chapterResolve(g.sim,g.eco,'inspector',action.id).error);assert.equal(g.s.facts.demoComplete,undefined);
});
