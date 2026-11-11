import test from 'node:test';
import assert from 'node:assert/strict';
import {Simulation,newArrival} from '../src/simulation.js';
import {Ecosystem} from '../src/ecosystem.js';
import {applyFace,rememberFace,currentFace,checkDisguise,appearanceTime,appearanceState} from '../src/appearance.js';
import {IDENTITY_RELATIONS} from '../src/identity-network.js';
import {identityOpportunityOptions,identityOpportunityPreview,resolveIdentityOpportunity,confirmIdentityRecognition,finishIdentityDialogue,recognizedIdentity,COURT_CHEST,courtChestAccess} from '../src/identity-opportunities.js';
import {chestAction,chestTakePreview} from '../src/home-chest.js';
import {takePayment,collectPayments} from '../src/cash-transfers.js';
import {contactOptions,contactFollowups} from '../src/gate-society.js';
import {disguiseLine} from '../src/disguise-reactions.js';
import {knownOrganization} from '../src/factions.js';
import {talkTree} from '../src/talk-tree.js';

const assets=[{id:COURT_CHEST,kind:'chest',name:'六扇门物资箱',x:12.2,z:-24.1,w:1.3,d:.8,owner:'inspector'}];
function setup(face='traveler',observer='inspector',rng=()=>0,saved){
 const sim=new Simulation(saved||newArrival(),rng);sim.save=()=>{};const eco=new Ecosystem(sim,assets),s=sim.s;
 Object.assign(s.player,{x:10,z:-22});s.time=35;eco.positions={[observer]:{x:10,z:-23},[face]:{x:-8,z:29}};
 if(!saved){s.people[face].metPlayer=true;rememberFace(s,face);assert.ok(applyFace(sim,face).ok);}
 return {sim,eco,s,face,observer};
}
const act=(g,kind)=>resolveIdentityOpportunity(g.sim,g.eco,g.observer,'if_identity_'+kind);
function recognize(g){const r=act(g,'greet');assert.ok(r.success);confirmIdentityRecognition(g.sim,g.observer);return r;}
const flatten=xs=>xs.flatMap(x=>x.children?flatten(x.children):[x]);

test('all directed acquaintances have distinct greetings and reachable actions without tasks',()=>{
 for(const [key,edge]of Object.entries(IDENTITY_RELATIONS)){
  const [face,observer]=key.split(':'),g=setup(face,observer);let rolls=0;g.sim.rng=()=>{rolls++;return 0;};
  for(let i=0;i<3;i++){const a=identityOpportunityOptions(g.sim,observer)[0];assert.equal(a.id,'if_identity_greet');assert.ok(identityOpportunityPreview(g.sim,observer,a,g.eco).chance>0);}
  assert.equal(rolls,0);const r=recognize(g);assert.equal(rolls,1);assert.equal(r.text,edge.greeting);assert.ok(recognizedIdentity(g.s,observer));
  const options=contactOptions(g.sim,observer);assert.ok(options.length);assert.ok(options.every(a=>a.id.startsWith('if_identity_')));
  const check=identityOpportunityPreview(g.sim,observer,options[0],g.eco);assert.equal(check.certain,true);assert.equal(check.chance,100);
 }
});
test('royal knowledge requires hearing the accepted greeting; names and sealed content remain separate',()=>{
 const g=setup();const r=act(g,'greet');assert.match(r.text,/王爷/);assert.equal(g.s.facts.princeRoyal,undefined);assert.equal(recognizedIdentity(g.s,'inspector'),false);
 confirmIdentityRecognition(g.sim,'inspector');assert.equal(g.s.facts.princeRoyal,true);assert.equal(g.s.facts.princeAlias,undefined);assert.equal(g.s.facts.princeLetter,undefined);assert.equal(g.s.facts.career,undefined);
 const org=knownOrganization(g.sim);assert.match(org.clues.find(c=>c.id==='royal-rank').source,/顾钦差/);assert.equal(org.nodes.find(n=>n.id==='traveler').name,'锦衣客 · 王爷');
 const failed=setup('traveler','fu',()=>.999);assert.equal(act(failed,'greet').success,false);confirmIdentityRecognition(failed.sim,'fu');assert.equal(failed.s.facts.princeRoyal,undefined);assert.equal(currentFace(failed.s),'player');
});
test('existing successful checks resume identity dialogue without another roll, then expose all followups',()=>{
 const g=setup();const r=checkDisguise(g.sim,'inspector',{context:{positions:g.eco.positions,player:g.s.player,obstacles:[]}});
 assert.match(disguiseLine('inspector','success',r.check),/王爷/);g.sim.rng=()=>{throw Error('accepted identity may not roll again');};
 recognize(g);const funds=act(g,'advance');assert.equal(funds.roll,null);
 const followups=contactFollowups(g.sim,'inspector',funds);assert.ok(followups.length<=3);assert.ok(flatten(followups).some(a=>a.id==='if_identity_stores'));assert.ok(flatten(followups).some(a=>a.id==='if_identity_ledger'));assert.ok(flatten(followups).some(a=>a.mode==='endTalk'));
 const walk=nodes=>{assert.ok(nodes.length<=3);for(const n of nodes)if(n.children)walk(n.children);};walk(talkTree('inspector',identityOpportunityOptions(g.sim,'inspector')));
});
test('money debits the actual NPC purse, needs pickup, survives reload and cannot be farmed by makeup',()=>{
 const g=setup();g.s.people.inspector.purse=70;recognize(g);const before=g.s.player.money;assert.ok(act(g,'advance').success);
 const receipt=g.s.identityAccounts.receipts['traveler:inspector:advance'];assert.equal(receipt.amount,70);assert.equal(g.s.people.inspector.purse,0);assert.equal(g.s.player.money,before);
 const loaded=setup('traveler','inspector',()=>0,structuredClone(g.s)),pile=loaded.eco.s.items.find(i=>i.id===receipt.itemId);
 assert.equal(takePayment(loaded.sim,loaded.eco,pile),undefined);assert.equal(loaded.s.player.money,before+70);assert.ok(takePayment(loaded.sim,loaded.eco,pile));
 assert.ok(act(loaded,'advance').error);applyFace(loaded.sim,'player');applyFace(loaded.sim,'traveler');recognize(loaded);loaded.s.people.inspector.purse=80;assert.ok(act(loaded,'advance').error);
 assert.equal(loaded.s.chronicle.deeds.find(d=>d.key==='identity:traveler:inspector:advance').subject,'traveler');
 assert.ok(act(loaded,'repay').success);assert.equal(loaded.s.player.money,before);assert.equal(loaded.s.people.inspector.purse,80);assert.ok(act(loaded,'repay').error);
 const debt=loaded.s.identityAccounts.receipts['traveler:inspector:advance'],refund=loaded.eco.s.items.find(i=>i.id===debt.repayment);loaded.eco.s.time=refund.collectAt;loaded.eco.positions.inspector={...refund.stand};
 collectPayments(loaded.sim,loaded.eco,loaded.eco.positions);loaded.eco.s.time+=2;collectPayments(loaded.sim,loaded.eco,loaded.eco.positions);assert.equal(loaded.s.people.inspector.purse,150);
});
test('court stock is finite, physically collected, provenance keeps the accepted identity; identity is not employment',()=>{
 const g=setup();recognize(g);Object.assign(g.s.player,{x:12.2,z:-22.8});chestAction(g.eco,'chestOpen',COURT_CHEST);
 assert.ok(chestTakePreview(g.eco,COURT_CHEST).blocked);assert.ok(act(g,'stores').success);assert.equal(courtChestAccess(g.s,g.eco),true);
 let crimes=0;g.sim.listeners.push(type=>{if(type==='worldIncident')crimes++;});const money=g.s.player.money;
 assert.equal(chestAction(g.eco,'chestTakeAll',COURT_CHEST),undefined);assert.equal(crimes,0);assert.equal(g.s.player.money,money);
 const purse=g.eco.items('player').find(i=>i.chestSlot==='purse');assert.equal(purse.value,120);assert.equal(purse.provenance.history.at(-1).subject,'traveler');assert.equal(purse.provenance.originalOwner,'inspector');
 g.eco.act('openPurse','',purse.id);assert.equal(g.s.player.money,money+120);assert.equal(g.s.facts.career,undefined);
 const loaded=setup('traveler','inspector',()=>0,structuredClone(g.s));assert.equal(loaded.eco.items('object:'+COURT_CHEST).length,0);assert.ok(chestAction(loaded.eco,'chestTakeAll',COURT_CHEST));assert.equal(loaded.eco.s.items.filter(i=>i.chestSlot==='purse').length,1);
});
test('permissions cannot survive another face, exposure, expiration or visible duplicate; renewal never refills stock',()=>{
 const g=setup();recognize(g);act(g,'stores');assert.ok(courtChestAccess(g.s,g.eco));
 g.eco.positions.traveler={x:10.5,z:-22};assert.equal(courtChestAccess(g.s,g.eco),false);g.eco.positions.traveler={x:-8,z:29};
 applyFace(g.sim,'player');assert.equal(courtChestAccess(g.s,g.eco),false);applyFace(g.sim,'traveler');assert.equal(courtChestAccess(g.s,g.eco),false);recognize(g);assert.ok(act(g,'stores').success);assert.ok(courtChestAccess(g.s,g.eco));
 appearanceState(g.s).exposed.inspector=g.s.player.face.serial;assert.equal(courtChestAccess(g.s,g.eco),false);delete appearanceState(g.s).exposed.inspector;
 g.s.player.face.until=appearanceTime(g.s);assert.equal(courtChestAccess(g.s,g.eco),false);
});
test('manifest actions transfer the same entity; possession, reading and testimony are distinct',()=>{
 const g=setup('traveler','fu');recognize(g);const item=g.eco.items('npc:fu').find(i=>i.storyId==='convoy-list');
 assert.ok(act(g,'manifest').success);assert.equal(item.location,'player');assert.equal(item.provenance.originalOwner,'fu');assert.equal(item.opened,undefined);assert.equal(g.s.facts.ledgerDelivered,undefined);assert.ok(act(g,'manifest').error);
 const h=setup('fu','traveler');const record=h.eco.items('npc:fu').find(i=>i.storyId==='convoy-list');h.eco.transfer(record,'player','stolen');recognize(h);assert.ok(act(h,'handover').success);assert.equal(record.location,'npc:traveler');assert.equal(h.s.facts.ledgerDelivered,undefined);
 const k=setup('inspector','fu');recognize(k);const testimony=act(k,'ledger');assert.ok(testimony.success);assert.equal(k.s.facts.taxLedgerLead,undefined);finishIdentityDialogue(k.sim,'fu',testimony);assert.equal(k.s.quests.ledger.status,'active');assert.match(k.s.quests.ledger.source,/符祥/);assert.equal(k.s.facts.ledgerDelivered,undefined);assert.ok(act(k,'ledger').error);
});
test('stale, remote, incapacitated and contradictory actions fail before payment or dice',()=>{
 const modifiers=[g=>g.eco.positions.inspector.x=40,g=>g.eco.obstacles=[{id:'wall',x:10,z:-22.5,w:2,d:.2}],g=>g.s.people.inspector.restraint={mode:'fixed'},g=>g.s.people.inspector.hp=g.s.people.inspector.maxHp*.3,g=>g.s.people.inspector.life={activity:'sleep'},g=>g.s.people.inspector.muteUntil=100,g=>g.eco.positions.traveler={x:10.5,z:-22}];
 for(const [index,modify] of modifiers.entries()){const g=setup();recognize(g);modify(g);g.sim.rng=()=>{throw Error('blocked actions cannot roll');};assert.ok(act(g,'advance').error,'modifier '+index);assert.equal(g.s.identityAccounts.receipts['traveler:inspector:advance'],undefined);}
 const g=setup();recognize(g);g.s.time+=13;const a=identityOpportunityOptions(g.sim,'inspector').find(a=>a.id==='if_identity_advance'),preview=identityOpportunityPreview(g.sim,'inspector',a,g.eco);g.sim.rng=()=>(preview.chance-1)/100;assert.equal(act(g,'advance').roll,preview.chance);
});
test('refused overreach changes the believed actor once, with no player penalty or property transfer',()=>{
 const g=setup('fu','tea_host');recognize(g);const before=g.s.people.tea_host.relation,money=g.s.player.money;assert.ok(act(g,'overreach').success);assert.equal(g.s.people.tea_host.relation,before);assert.equal(g.s.appearance.relations['tea_host:fu'],-2);assert.equal(g.s.player.money,money);assert.ok(act(g,'overreach').error);
 applyFace(g.sim,'player');assert.equal(g.s.chronicle.deeds.find(d=>d.key==='identity:fu:tea_host:overreach').subject,'fu');
});
test('unlicensed chest theft uses the real action check while authorization needs no roll',()=>{
 const g=setup();Object.assign(g.s.player,{x:12.2,z:-22.8,crouched:true,stealing:true});chestAction(g.eco,'chestOpen',COURT_CHEST);let checks=0,incidents=0;g.sim.listeners.push(type=>{if(type==='fieldCheck')checks++;if(type==='worldIncident')incidents++;});
 const preview=chestTakePreview(g.eco,COURT_CHEST);assert.equal(preview.certain,false);g.sim.rng=()=>0;assert.equal(chestAction(g.eco,'chestTakeAll',COURT_CHEST),undefined);assert.equal(checks,1);assert.equal(incidents,1);assert.equal(g.eco.items('player').find(i=>i.chestSlot==='purse').provenance.history.at(-1).method,'stolen');
});
test('hearing a clue through the live save observer keeps its true source and does not invent prisoner testimony',()=>{
 const g=setup('inspector','fu');recognize(g);g.sim.save=()=>g.sim.emit('save',g.s);
 const r=act(g,'ledger');assert.equal(g.s.intelligence?.clues?.ledger,undefined);assert.equal(g.s.quests.ledger,undefined);
 finishIdentityDialogue(g.sim,'fu',r);assert.equal(g.s.quests.ledger.source,'符祥当面口述');assert.match(g.s.intelligence.clues.ledger.source,/符祥/);assert.equal(g.s.intelligence.clues.ledger.text,r.text);
 const deeds=g.s.chronicle.deeds.length;finishIdentityDialogue(g.sim,'fu',r);assert.equal(g.s.chronicle.deeds.length,deeds);
});
