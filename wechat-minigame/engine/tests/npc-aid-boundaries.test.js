import test from 'node:test';
import assert from 'node:assert/strict';
import {Simulation,newArrival} from '../src/simulation.js';
import {Ecosystem} from '../src/ecosystem.js';
import {witnessEvent} from '../src/npc-awareness.js';
import {resolveRestraint} from '../src/npc-restraints.js';
import {recordDeed,applyAftermath,echoOptions} from '../src/event-deck.js';
import {importantPeople,knownPersonalHarm,restoreHarmKnowledge} from '../src/npc-bonds.js';
import {aidBoundary,observeConcerns,concernMotion,concernLine} from '../src/npc-concerns.js';
import {actionCandidates,startActionCard,actionCardStep,pendingActionCard,actionCardChoices,answerActionCard} from '../src/action-cards.js';
import {character} from '../src/world.js';
import {lifeStep,canEat} from '../src/npc-life.js';
import {placePayment,collectPayments} from '../src/cash-transfers.js';
import {TEAPOT,TEA_CUPS,teaStep} from '../src/tea-service.js';

function setup(){const sim=new Simulation(newArrival(),()=>0);sim.save=()=>{};const s=sim.s,eco=new Ecosystem(sim);s.event=null;s.npcClock=1;s.player.x=0;s.player.z=0;s.player.satiety=10;
 const positions={tea_host:{x:0,z:-4,facing:0},qinghe:{x:0,z:-2,facing:Math.PI},tea:{x:4,z:0,facing:-Math.PI/2}};eco.positions=positions;
 for(const id of Object.keys(positions))Object.assign(s.people[id],{...positions[id],life:{activity:'idle'},relation:80,awareness:null});
 return {sim,s,eco,positions};
}
function harm(f,{who='tea_host',target='qinghe',seen=true,method='lasso',type='assault'}={}){const e={type,method,target,x:0,z:-2,witnesses:seen?[who]:[]};witnessEvent(f.sim,who,e,seen,f.positions[who]||{x:0,z:0});recordDeed(f.sim,'actionWitnessed',{...e,incidentType:type,text:'现场发生冲突。'});f.s.people[who].awareness=null;return e;}
const foodCandidate=f=>actionCandidates(f.s,f.positions).find(c=>c.template==='food'&&c.who==='tea_host');
function start(f){const e=startActionCard(f.sim,foodCandidate(f),f.positions);assert.ok(e);return e;}
function wait(f){f.positions.tea_host={x:1.1,z:.3};f.s.people.tea_host.facing=Math.atan2(-1.1,-.3);actionCardStep(f.sim,f.eco,.1,f.positions);assert.equal(f.s.deck.actions.active.phase,'waiting');}

test('a witnessed attack on a daughter immediately overrides positive goodwill, without a day change',()=>{
 const f=setup();assert.ok(foodCandidate(f));harm(f);assert.ok(f.s.people.tea_host.relation>0);assert.equal(foodCandidate(f),undefined);assert.equal(f.s.day,1);assert.equal(knownPersonalHarm(f.s,'tea_host','player').target,'qinghe');
 f.s.people.tea_host.relation=100;assert.equal(foodCandidate(f),undefined);
});
test('successful real restraint, release and save/load keep the witness memory without taking back earlier gifts',()=>{
 const f=setup();f.sim.listeners.push((type,e)=>{if(type==='worldIncident'){e.witnesses=['tea_host','qinghe'];for(const id of e.witnesses)witnessEvent(f.sim,id,e,true,f.positions[id]);}});
 assert.ok(resolveRestraint(f.sim,f.eco,'qinghe').success);assert.ok(knownPersonalHarm(f.s,'tea_host','player'));assert.ok(resolveRestraint(f.sim,f.eco,'qinghe','release').success);
 const restored=new Simulation(JSON.parse(JSON.stringify(f.s)));restored.save=()=>{};new Ecosystem(restored);restored.s.people.tea_host.awareness=null;restored.s.people.tea_host.relation=100;
 assert.ok(aidBoundary(restored.s,'tea_host','player',f.positions));assert.equal(restored.s.people.tea_host.harmKnowledge.filter(x=>x.target==='qinghe'&&x.kind==='restraint').length,1);
});
test('harm to self and other actual close relationships use the same rule; faction membership alone does not',()=>{
 const f=setup();harm(f,{who:'tea',target:'tea',method:'sword'});assert.ok(aidBoundary(f.s,'tea','player'));
 harm(f,{who:'gang_boss',target:'mei'});assert.ok(aidBoundary(f.s,'gang_boss','player'));
 harm(f,{who:'tea_host',target:'porter'});assert.equal(aidBoundary(f.s,'tea_host','player'),null);
 f.s.socialConnections=[{a:'tea',b:'qinghe',kind:'friend',source:'共同经历',known:false}];assert.ok(importantPeople(f.s,'tea').includes('qinghe'));
});
test('hearsay and unseen crime never grant immediate knowledge to an absent relative',()=>{
 const f=setup();harm(f,{who:'tea_host',seen:false});assert.equal(knownPersonalHarm(f.s,'tea_host','player'),null);assert.ok(foodCandidate(f));
 harm(f,{who:'qinghe'});assert.equal(knownPersonalHarm(f.s,'tea_host','player'),null);assert.ok(foodCandidate(f));
 const options=echoOptions(f.s),i=options.findIndex(o=>o.who==='tea_host'&&o.template==='rumor_spread');assert.ok(i>=0);applyAftermath(f.sim,{echoes:[{i,line:'青禾说，她被你伤过。'}]});assert.equal(foodCandidate(f),undefined);assert.equal(knownPersonalHarm(f.s,'tea_host','player').evidence,'told');
});
test('lawful restraint, self defense and unrelated minor misdeeds do not create a personal-harm veto',()=>{
 const f=setup();harm(f,{type:'warrant'});assert.equal(aidBoundary(f.s,'tea_host','player'),null);
 const event={type:'assault',target:'qinghe',selfDefense:true,x:0,z:0};witnessEvent(f.sim,'tea_host',event,true,f.positions.tea_host);assert.equal(knownPersonalHarm(f.s,'tea_host','player'),null);
 recordDeed(f.sim,'actionWitnessed',{incidentType:'theft',target:'qinghe',text:'拿走一只杯子',witnesses:['tea_host'],identities:{tea_host:'player'}});assert.equal(knownPersonalHarm(f.s,'tea_host','player'),null);
});
test('observed food tampering belongs to the actual NPC owner, without inspecting hidden poison',()=>{
 const f=setup(),e={type:'tamper',target:'bowl-1',owner:'qinghe',x:0,z:-2};witnessEvent(f.sim,'tea_host',e,true,f.positions.tea_host);
 assert.equal(knownPersonalHarm(f.s,'tea_host','player').kind,'tamper');assert.equal(knownPersonalHarm(f.s,'tea_host','player').target,'qinghe');
});
test('identity is frozen at sight and at retelling; removing a disguise does not rewrite blame',()=>{
 const f=setup();f.s.player.face={id:'gate_merchant',serial:1,until:9999};harm(f);assert.equal(foodCandidate(f),undefined);f.s.player.face=null;assert.ok(foodCandidate(f));assert.equal(knownPersonalHarm(f.s,'tea_host','player'),null);
 f.s.player.face={id:'gate_merchant',serial:2,until:9999};assert.equal(foodCandidate(f),undefined);assert.equal(f.s.people.tea_host.harmKnowledge[0].subject,'gate_merchant');
});
test('old witness and rumor records restore once; pruning the diary and apologies cannot erase harm knowledge',()=>{
 const f=setup();f.s.chronicle={seq:1,deeds:[{id:1,valence:'crime',title:'近身捆绑',target:'qinghe',witnesses:['qinghe'],identities:{qinghe:'gate_merchant'}}]};f.s.deck={echoes:[{template:'rumor_spread',who:'tea_host',teller:'qinghe',subject:'gate_merchant',cause:1}]};
 restoreHarmKnowledge(f.s);restoreHarmKnowledge(f.s);assert.equal(f.s.people.tea_host.harmKnowledge.length,1);assert.equal(knownPersonalHarm(f.s,'tea_host','player'),null);f.s.chronicle.deeds=[];f.s.deck.echoes=[];f.s.day++;assert.ok(knownPersonalHarm(f.s,'tea_host','gate_merchant'));
});
test('new harm cancels en-route, waiting and accepted aid before any item transfer',()=>{
 for(const phase of ['approach','waiting','act']){const f=setup(),e=start(f);if(phase!=='approach')wait(f);if(phase==='act')assert.ok(!answerActionCard(f.sim,'tea_host',e.cardId,'action_card_accept',f.positions).error);
  harm(f);assert.equal(pendingActionCard(f.s,'tea_host',f.positions),null);assert.deepEqual(actionCardChoices(f.s,'tea_host',e.cardId,f.positions),[]);assert.ok(answerActionCard(f.sim,'tea_host',e.cardId,'action_card_accept',f.positions).error);
  actionCardStep(f.sim,f.eco,2,f.positions);assert.equal(e.phase,'depart');assert.equal(e.outcome,'known-harm');assert.ok(!e.settled);assert.equal(f.eco.s.items.find(i=>i.id===e.item).location,'npc:tea_host');assert.match(f.s.deck.cards.at(-1).lead,/宋青禾/);
 }
});
test('a stale candidate cannot start and a completed gift is never reclaimed',()=>{
 const f=setup(),candidate=foodCandidate(f);harm(f);assert.equal(startActionCard(f.sim,candidate,f.positions),null);
 const g=setup(),e=start(g);wait(g);answerActionCard(g.sim,'tea_host',e.cardId,'action_card_accept',g.positions);actionCardStep(g.sim,g.eco,2,g.positions);assert.ok(e.settled);harm(g);actionCardStep(g.sim,g.eco,.1,g.positions);assert.equal(g.eco.s.items.find(i=>i.id===e.item).location,'player');assert.equal(e.withdrawal,undefined);
});
test('medical aid rechecks the same rule during bandaging, without consuming medicine or healing',()=>{
 const f=setup();f.s.player.hp=15;f.s.player.satiety=85;const e=startActionCard(f.sim,actionCandidates(f.s,f.positions).find(c=>c.template==='heal'),f.positions);assert.ok(e);
 f.positions.tea={x:1.1,z:.3};f.s.people.tea.facing=Math.atan2(-1.1,-.3);actionCardStep(f.sim,f.eco,.1,f.positions);answerActionCard(f.sim,'tea',e.cardId,'action_card_accept',f.positions);harm(f,{who:'tea',target:'tea',method:'sword'});actionCardStep(f.sim,f.eco,5,f.positions);
 assert.equal(e.outcome,'known-harm');assert.equal(f.s.player.hp,15);assert.equal(f.s.people.tea.favorOwed,undefined);assert.equal(f.eco.s.items.find(i=>i.id===e.item).location,'npc:tea');
});
test('seeing a bound relative suppresses aid and directs concern without learning the culprit',()=>{
 const f=setup();f.s.people.qinghe.restraint={mode:'fixed',ropeId:'r',at:1};assert.equal(foodCandidate(f),undefined);observeConcerns(f.sim,f.positions);assert.equal(f.s.people.tea_host.concern.target,'qinghe');assert.equal(knownPersonalHarm(f.s,'tea_host','player'),null);assert.match(concernLine(f.s,'tea_host'),/怎么被绑住/);
 const last={...f.s.people.tea_host.concern.lastSeen};f.positions.qinghe={x:30,z:30};observeConcerns(f.sim,f.positions);assert.deepEqual(f.s.people.tea_host.concern.lastSeen,last);
});
test('walls, looking away, distance, sleep and incapacitation prevent discovery',()=>{
 for(const mode of ['wall','back','far','sleep','stun']){const f=setup();f.s.people.qinghe.restraint={mode:'fixed'};let walls=[];if(mode==='wall')walls=[{x:0,z:-3,w:6,d:.2}];if(mode==='back')f.positions.tea_host.facing=Math.PI;if(mode==='far')f.positions.qinghe.z=20;if(mode==='sleep')f.s.people.tea_host.life.activity='sleep';if(mode==='stun')f.s.people.tea_host.stunnedUntil=20;observeConcerns(f.sim,f.positions,walls);assert.equal(f.s.people.tea_host.concern,undefined,mode);assert.equal(knownPersonalHarm(f.s,'tea_host','player'),null);}
});
test('concern walks to the last seen place and speaks once; danger pauses it without freeing or healing remotely',()=>{
 const f=setup();f.s.people.qinghe.restraint={mode:'fixed',ropeId:'r',at:1};observeConcerns(f.sim,f.positions);const actor=character(0);actor.position.set(0,0,-4);const npc={actor},lines=[];
 const world={sim:f.sim,playing:true,t:0,obstacles:[],collides:()=>false,move(a,x,z){a.position.x+=x;a.position.z+=z;},animateActor(){},onActionCardSpeech:l=>{lines.push(l);return true;}};
 for(let i=0;i<40;i++){world.t+=.1;concernMotion(world,'tea_host',npc,.1);}assert.ok(actor.position.z>-4);assert.ok(Math.hypot(actor.position.x,actor.position.z+2)<=1.6);assert.equal(lines.length,1);assert.ok(f.s.people.qinghe.restraint);assert.equal(f.s.player.hp,100);
 f.s.people.tea_host.awareness={state:'fight'};assert.equal(concernMotion(world,'tea_host',npc,.1),false);f.s.people.tea_host.awareness=null;
 f.s.people.tea_host.life.activity='escape';assert.equal(concernMotion(world,'tea_host',npc,.1),false);f.s.people.tea_host.life.activity='idle';
 f.s.people.tea_host.concern.announced=false;f.s.people.tea_host.muteUntil=100;concernMotion(world,'tea_host',npc,.1);assert.equal(lines.length,1,'muted NPC may approach but cannot speak');
 delete f.s.people.qinghe.restraint;observeConcerns(f.sim,f.positions);assert.equal(f.s.people.tea_host.concern,undefined);
});
test('daily service, eating and money collection yield to concern and preserve real stock',()=>{
 const f=setup();f.s.people.qinghe.restraint={mode:'fixed'};observeConcerns(f.sim,f.positions);lifeStep(f.sim,f.eco,.1,f.positions);assert.equal(f.s.people.tea_host.life.activity,'concern');assert.equal(canEat(f.sim,f.eco,'tea_host',f.positions.tea_host),false);
 const pile=placePayment(f.sim,f.eco,{payer:'player',payee:'tea_host',amount:1,...f.positions.tea_host});f.eco.s.time=10;collectPayments(f.sim,f.eco,f.positions);assert.equal(pile.location,'ground');assert.equal(f.s.people.tea_host.life.activity,'concern');
 f.eco.s.objects[TEAPOT.id]={...TEAPOT,hp:100};for(const cup of TEA_CUPS)f.eco.s.objects[cup.id]={...cup,hp:100};teaStep(f.sim,f.eco,f.positions);f.eco.s.time=30;teaStep(f.sim,f.eco,f.positions);assert.equal(f.s.people.tea_host.life.activity,'concern');
});
