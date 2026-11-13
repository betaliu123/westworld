import test from 'node:test';
import assert from 'node:assert/strict';
import {Vector3} from '../vendor/three.module.js';
import {Simulation,newArrival} from '../src/simulation.js';
import {Ecosystem} from '../src/ecosystem.js';
import {applyFace,rememberFace,currentFace,disguisePreview,checkDisguise,equipAppearance,spreadIdentityRumor} from '../src/appearance.js';
import {mountDisguiseEncounter} from '../src/disguise-encounter.js';
import {identityFavorOptions,identityFavorPreview,resolveIdentityFavor,identityEscortStep} from '../src/identity-favors.js';
import {contactOptions,contactFollowups} from '../src/gate-society.js';
import {giveItem} from '../src/npc-actions.js';
import {takePayment,collectPayments} from '../src/cash-transfers.js';
import {lifeStep,lifeTarget} from '../src/npc-life.js';
import {routinePath} from '../src/npc-navigation.js';

function setup(rng=()=>0){
 const sim=new Simulation(newArrival(),rng);sim.save=()=>{};const eco=new Ecosystem(sim),s=sim.s;s.time=35;
 Object.assign(s.player,{x:4,z:31});eco.positions={porter:{x:5,z:31},fu:{x:20,z:29},gate_guard:{x:0,z:23.8}};
 s.people.fu.metPlayer=true;rememberFace(s,'fu');applyFace(sim,'fu');
 return {sim,eco,s};
}
const action=(g,id)=>identityFavorOptions(g.sim,'porter').find(a=>a.id===id);
const resolve=(g,id)=>resolveIdentityFavor(g.sim,g.eco,'porter',id);
function reload(g){const sim=new Simulation(JSON.parse(JSON.stringify(g.s)),()=>0);sim.save=()=>{};const eco=new Ecosystem(sim);eco.positions=structuredClone(g.eco.positions);return {sim,eco,s:sim.s};}

test('Fu original gift is intercepted before inventory transfer, with deterministic recognition',()=>{
 const g=setup(),item=g.eco.items('player').find(i=>i.type==='clothing');g.eco.positions.fu={x:4,z:32};
 assert.ok(giveItem(g.sim,g.eco,'fu',item.id).needsRecognition);assert.equal(item.location,'player');
 g.sim.rng=()=>{throw Error('original cannot roll');};assert.equal(checkDisguise(g.sim,'fu').roll,null);assert.equal(currentFace(g.s),'player');
});
test('familiar porter notices wrong outfit; correct clothes never grant office or name knowledge',()=>{
 const g=setup();assert.ok(disguisePreview(g.s,'porter').known);assert.ok(disguisePreview(g.s,'porter').mismatch);
 const coat=g.eco.items('npc:fu').find(i=>i.type==='clothing');g.eco.transfer(coat,'player','stolen');equipAppearance(g.sim,coat.id,'body');
 assert.equal(disguisePreview(g.s,'porter'),null);assert.equal(disguisePreview(g.s,'porter',{force:true}).known,true);
 assert.equal(g.s.facts.career,undefined);assert.equal(g.s.facts.knownNames?.fu,undefined);
});
test('seeing both originals blocks favors; walls, distance and facing are actual evidence filters',()=>{
 const g=setup();g.eco.positions.porter={x:0,z:29,facing:0};Object.assign(g.s.player,{x:0,z:31});g.eco.positions.fu={x:1,z:31};
 assert.ok(identityFavorPreview(g.sim,'porter',action(g,'if_loan'),g.eco).blocked);
 g.eco.obstacles=[{id:'screen',x:.5,z:30,w:.3,d:.5}];assert.equal(identityFavorPreview(g.sim,'porter',action(g,'if_loan'),g.eco).blocked,undefined);
 g.eco.obstacles=[];g.eco.positions.fu={x:0,z:27};assert.equal(identityFavorPreview(g.sim,'porter',action(g,'if_loan'),g.eco).blocked,undefined);
 g.eco.positions.fu={x:0,z:40};assert.equal(identityFavorPreview(g.sim,'porter',action(g,'if_loan'),g.eco).blocked,undefined);
});
test('borrow preview never rolls; success uses its exact threshold and debits a real purse once',()=>{
 const g=setup(()=>{throw Error('preview must not roll');}),a=action(g,'if_loan'),before=g.s.player.money,purse=g.s.people.porter.purse;
 for(let i=0;i<4;i++)identityFavorPreview(g.sim,'porter',a,g.eco);
 const check=identityFavorPreview(g.sim,'porter',a,g.eco);g.sim.rng=()=>(check.chance-1)/100;
 const r=resolve(g,'if_loan');assert.equal(r.roll,check.chance);assert.equal(r.check.chance,check.chance);assert.ok(r.success);
 assert.equal(g.s.people.porter.purse,purse-6);assert.equal(g.s.player.money,before);
 const saved=reload(g);assert.ok(resolve(saved,'if_loan').error);const pile=saved.eco.s.items.find(i=>i.id===saved.s.identityFavors.loan.itemId);
 assert.equal(takePayment(saved.sim,saved.eco,pile),undefined);assert.equal(saved.s.player.money,before+6);assert.ok(takePayment(saved.sim,saved.eco,pile));
 assert.equal(saved.s.player.money,before+6);assert.equal(saved.s.chronicle.deeds.find(d=>d.key==='fu-favor:loan').subject,'fu');
 applyFace(saved.sim,'player');applyFace(saved.sim,'fu');assert.ok(resolve(saved,'if_loan').error);
});
test('failed impersonation never pays or starts a departure; lost money and stale actions never roll',()=>{
 for(const id of ['if_loan','if_depart']){const g=setup(()=>.99),money=g.s.people.porter.purse,r=resolve(g,id);assert.equal(r.success,false);assert.equal(currentFace(g.s),'player');assert.equal(g.s.people.porter.purse,money);assert.equal(g.s.identityFavors.loan,undefined);assert.equal(g.s.identityFavors.escort,undefined);}
 const g=setup(()=>{throw Error('blocked request cannot roll');});g.s.people.porter.purse=5;assert.ok(resolve(g,'if_loan').error);
 g.s.people.porter.purse=20;applyFace(g.sim,'player');assert.ok(resolve(g,'if_loan').error);
});
test('remote, wall-separated, sleeping, restrained and unconscious recipients cannot transact',()=>{
 const changes=[g=>g.eco.positions.porter.x=20,g=>g.eco.obstacles=[{id:'wall',x:4.5,z:31,w:.2,d:5}],g=>g.s.people.porter.life={activity:'sleep'},g=>g.s.people.porter.stunnedUntil=100,g=>g.s.people.porter.restraint={kind:'bound'},g=>g.s.people.porter.hp=0];
 for(const change of changes){const g=setup(()=>{throw Error('blocked');});change(g);assert.ok(resolve(g,'if_loan').error);assert.equal(g.s.identityFavors.loan,undefined);}
});
test('identity opportunities precede ordinary hiring; followups retain actions and a clear exit',()=>{
 const g=setup();assert.deepEqual(contactOptions(g.sim,'porter').map(a=>a.id),['if_loan','if_depart']);
 const r=resolve(g,'if_loan'),next=contactFollowups(g.sim,'porter',r);assert.ok(next.some(a=>a.id==='if_depart'));assert.ok(next.some(a=>a.mode==='endTalk'));assert.ok(next.length<=3);
});
test('repayment remains pending until the actual pile is collected and cannot debit twice',()=>{
 const g=setup();resolve(g,'if_loan');const money=g.s.player.money,purse=g.s.people.porter.purse;
 assert.ok(resolve(g,'if_repay').success);assert.equal(g.s.player.money,money-6);assert.equal(g.s.people.porter.purse,purse);
 assert.ok(resolve(g,'if_repay').error);assert.equal(g.s.player.money,money-6);
 identityEscortStep(g.sim,g.eco,g.eco.positions);assert.equal(g.s.identityFavors.loan.repaid,undefined);
 const restored=reload(g);restored.eco.s.time=10;collectPayments(restored.sim,restored.eco,restored.eco.positions);
 restored.eco.s.time=12;collectPayments(restored.sim,restored.eco,restored.eco.positions);identityEscortStep(restored.sim,restored.eco,restored.eco.positions);
 assert.equal(restored.s.identityFavors.loan.repaid,true);assert.equal(restored.s.people.porter.purse,purse+6);
 assert.ok(resolve(restored,'if_loan').error);assert.ok(resolve(restored,'if_repay').error);
});
test('both borrowed identities can order departure without prior tasks or a guarantor trip',()=>{
 for(const [subject,receiver]of [['fu','porter'],['porter','fu']]){
  const g=setup();applyFace(g.sim,'player');g.s.people[subject].metPlayer=true;rememberFace(g.s,subject);g.eco.create('易容膏','cosmetic','player',{discovered:true});applyFace(g.sim,subject);
  Object.assign(g.s.player,{x:7,z:29});g.eco.positions[receiver]={x:8,z:29};g.eco.positions[subject]={x:20,z:20};
  const before={x:g.s.player.x,z:g.s.player.z};const r=resolveIdentityFavor(g.sim,g.eco,receiver,'if_depart');assert.equal(r.success,true,r.error);
  assert.equal(g.s.convoy.phase,'travel');assert.equal(g.s.convoy.command.receiver,receiver);assert.equal(g.s.convoy.command.subject,subject);
  assert.equal(!!g.s.facts.enteredCity,false);assert.deepEqual({x:g.s.player.x,z:g.s.player.z},before);
  const saved=reload(g);assert.equal(saved.s.convoy.command.subject,subject);saved.sim.rng=()=>{throw Error('repeat may not roll');};assert.ok(resolveIdentityFavor(saved.sim,saved.eco,receiver,'if_depart').error);
 }
});
test('original in sight, missing cargo, and disabled receiver block commands before rolling',()=>{
 for(const change of [g=>{g.eco.positions.porter={x:4,z:29,facing:0};g.eco.positions.fu={x:5,z:31};},g=>g.s.convoy.closed=true,g=>g.s.people.porter.restraint={kind:'bound'},g=>g.s.people.porter.hp=0]){
  const g=setup();identityFavorOptions(g.sim,'porter');change(g);g.sim.rng=()=>{throw Error('blocked may not roll');};assert.ok(resolve(g,'if_depart').error);assert.equal(g.s.convoy.phase,'gate');
 }
});
test('old pending escort is retired without granting passage or deleting old debt and receipts',()=>{
 const g=setup();g.s.identityFavors={escort:{status:'walking',serial:1},loan:{amount:6}};identityEscortStep(g.sim,g.eco);assert.equal(g.s.identityFavors.escort.status,'superseded');assert.equal(g.s.identityFavors.loan.amount,6);assert.equal(!!g.s.facts.enteredCity,false);assert.ok(action(g,'if_depart'));
});
test('automatic proximity recognizes Fu and familiar porter; cancelled questioning does not roll',()=>{
 for(const id of ['fu','porter']){
  const g=setup(()=>{throw Error('opening cannot roll');}),played=[],world={t:1,hero:{position:new Vector3(4,0,31)},npcs:new Map([[id,{actor:{position:new Vector3(4,0,29),rotation:{y:0},visible:true}}]]),obstacles:[],clearReady(){}};
  const dialogue={play(lines,callback){played.push({lines,callback});},choose(){throw Error('cancelled dialogue cannot continue');}},checkReveal={cancel(){},play(){throw Error('no dice');}};
  const encounter=mountDisguiseEncounter({getSim:()=>g.sim,world,dialogue,checkReveal,close(){},log(){},resume(){},available:()=>true});encounter.update();
  assert.equal(played.length,1);assert.ok(played[0].lines[0].text.includes(id==='fu'?'扮作我':'符管事'));
  if(id==='fu')assert.equal(currentFace(g.s),'player');else {played[0].callback(true);assert.equal(currentFace(g.s),'fu');assert.equal(g.s.appearance.checks.porter,undefined);}
 }
});
