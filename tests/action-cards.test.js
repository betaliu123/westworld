import test from 'node:test';
import assert from 'node:assert/strict';
import {Simulation,newArrival,legacyArrival} from '../src/simulation.js';
import {Ecosystem} from '../src/ecosystem.js';
import {actionCandidates,actionCardState,startActionCard,actionCardStep,actionTarget,actionLine,pendingActionCard,actionCardChoices,answerActionCard} from '../src/action-cards.js';
import {deckState,peek,recordDeed} from '../src/event-deck.js';
import {appearanceState,appearanceTime} from '../src/appearance.js';
import {defend} from '../src/martial.js';
import {lifeStep} from '../src/npc-life.js';
import {recoverNpc} from '../src/npc-recovery.js';
import {actionCardMotion} from '../src/action-cards-view.js';
import {apprenticeshipOptions,requestApprenticeship,finishDemonstration,attemptLesson,completeLesson} from '../src/apprenticeship.js';

function setup(template='food'){
 const sim=new Simulation(newArrival(),()=>0);sim.save=()=>{};const s=sim.s,eco=new Ecosystem(sim);s.npcClock=1;s.event=null;s.facts.enteredCity=true;
 Object.assign(s.player,{x:0,z:0,hp:template==='heal'?15:100,satiety:template==='food'?10:85});
 const id=template==='heal'?'tea':template==='revenge'?'qing':'old_constable',positions={[id]:{x:0,z:-5}};
 Object.assign(s.people[id],{facing:0,life:{activity:'idle'},relation:template==='revenge'?-30:5});
 if(template==='revenge'){positions.shen={x:2,z:-6};Object.assign(s.people.shen,{facing:0,life:{activity:'idle'}});recordDeed(sim,'actionWitnessed',{incidentType:'assault',target:'qing',text:'林青舟亲眼看见你动手伤人。',identities:{qing:'player'},witnesses:['qing']});}
 const lines=[],step=(seconds=.1,options={})=>{s.npcClock+=seconds;eco.s.time+=seconds;actionCardStep(sim,eco,seconds,positions,{say:l=>{lines.push(l);return true;},hit:id=>defend(sim,id).damage,...options});};
 const start=()=>startActionCard(sim,actionCandidates(s,positions).find(c=>c.template===template),positions);
 return {sim,s,eco,id,positions,lines,step,start};
}
function waitNearby(f){f.positions[f.id]=f.id==='qing'?{x:0,z:-1.6}:{x:1.1,z:.3};f.s.people[f.id].facing=Math.atan2(-f.positions[f.id].x,-f.positions[f.id].z);f.step();}
function answer(f,choice='action_card_accept',cardId=f.s.deck.actions.active.cardId){return answerActionCard(f.sim,f.id,cardId,choice,f.positions);}
function arrive(f){waitNearby(f);assert.equal(f.s.deck.actions.active.phase,'waiting');assert.ok(!answer(f).error);}

test('an active visitor lets the ordinary movement controller carry out wagon yielding',()=>{
 const f=setup(),e=f.start(),n=f.s.people[f.id];n.life={activity:'yieldConvoy',target:{x:3.1,z:-5}};
 const actor={userData:{}},world={sim:f.sim,playing:true};
 assert.equal(actionCardMotion(world,f.id,{actor},.1),false);
 assert.equal(f.s.deck.actions.active,e);assert.equal(e.settled,undefined);
 assert.equal(f.eco.s.items.find(i=>i.id===e.item).location,'npc:'+f.id);
});
test('hungry aid walks in before transferring one actual item; receiving never consumes it',()=>{
 const f=setup(),{s,eco,start,step}=f,e=start(),food=eco.s.items.find(i=>i.id===e.item),pointer={...s.deck.pointer};
 assert.equal(e.phase,'approach');step(1);assert.equal(food.location,'npc:old_constable');
 arrive(f);assert.equal(e.phase,'act');assert.equal(food.location,'npc:old_constable');step(2);
 assert.equal(food.location,'player');assert.equal(s.player.satiety,10);assert.equal(s.player.hp,100);assert.equal(food.provenance.history.at(-1).cause,e.cause);
 assert.deepEqual(s.deck.pointer,pointer);assert.equal(s.deck.cards.at(-1).actionTemplate,'food');assert.equal(s.deck.cards.at(-1).card,'aid');
 for(let i=0;i<20;i++)step(1);assert.equal(food.provenance.history.length,1);assert.equal(actionCandidates(s,f.positions).length>=0,true);
 assert.equal(startActionCard(f.sim,{template:'food',who:f.id},f.positions),null);
});
test('poison properties travel with a donated food; NPC only knows observed risk',()=>{
 const f=setup(),food=f.eco.items('npc:'+f.id).find(i=>i.type==='food');Object.assign(food,{poisoned:true,poisonDelay:25,poisonConceal:3});
 const e=f.start();arrive(f);f.step(2);assert.equal(food.location,'player');assert.equal(food.poisoned,true);assert.equal(food.poisonDelay,25);assert.equal(f.s.player.hp,100);assert.ok(e.settled);
 const g=setup(),bad=g.eco.items('npc:'+g.id).find(i=>i.type==='food');bad.knownPoisonBy=[g.id];assert.equal(actionCandidates(g.s,g.positions).length,0);
});
test('healing only completes after contact and time, consumes medicine once, records debt',()=>{
 const f=setup('heal'),e=f.start();arrive(f);f.step(3.9);assert.equal(f.s.player.hp,15);assert.equal(f.s.people.tea.favorOwed,undefined);f.step(.2);
 assert.equal(f.s.player.hp,45);assert.equal(f.s.people.tea.favorOwed,1);assert.equal(f.eco.s.items.find(i=>i.id===e.item).location,'consumed');assert.equal(f.s.people.tea.rescueDebts[0].cause,e.cause);
 const saved=JSON.parse(JSON.stringify(f.s)),sim=new Simulation(saved);sim.save=()=>{};const eco=new Ecosystem(sim);for(let i=0;i<100;i++)actionCardStep(sim,eco,.1,f.positions,{say:()=>true});
 assert.equal(saved.player.hp,45);assert.equal(saved.people.tea.favorOwed,1);assert.equal(eco.s.items.filter(i=>i.type==='bandage').length,3);
});
test('walking away, obstacles, incapacitation and combat interrupt before settlement',()=>{
 for(const mode of ['walk','wall','stun','death','armed','fight']){const f=setup('heal'),e=f.start();arrive(f);
  const options={};if(mode==='walk')f.s.player.x=4;if(mode==='wall')options.obstacles=[{x:.55,z:.15,w:.2,d:5}];if(mode==='stun')f.s.people.tea.stunnedUntil=100;if(mode==='death')f.s.people.tea.hp=0;if(mode==='armed')options.armed=true;if(mode==='fight')f.s.people.tea.awareness={state:'fight'};
  f.step(5,options);assert.equal(f.s.player.hp,15,mode);assert.equal(f.s.people.tea.favorOwed,undefined,mode);assert.equal(f.eco.s.items.find(i=>i.id===e.item).location,'npc:tea',mode);assert.equal(e.phase,'depart',mode);
 }
});
test('save during treatment resumes remaining time and does not reseed medical supplies',()=>{
 const f=setup('heal'),e=f.start();arrive(f);f.step(2);const sim=new Simulation(JSON.parse(JSON.stringify(f.s)));sim.save=()=>{};const eco=new Ecosystem(sim);
 actionCardStep(sim,eco,1,f.positions,{say:()=>true});assert.equal(sim.s.player.hp,15);actionCardStep(sim,eco,1.1,f.positions,{say:()=>true});assert.equal(sim.s.player.hp,45);assert.equal(eco.s.items.filter(i=>i.type==='bandage').length,3);
});
test('sight, actual stock, duty and existing activity determine eligibility',()=>{
 const f=setup('heal');assert.equal(actionCandidates(f.s,f.positions).length,1);
 f.s.people.tea.facing=Math.PI;assert.equal(actionCandidates(f.s,f.positions).length,0);f.s.people.tea.facing=0;
 assert.equal(actionCandidates(f.s,f.positions,[{x:0,z:-2,w:6,d:.5}]).length,0);
 assert.equal(actionCandidates(f.s,f.positions,[],new Set(['tea'])).length,0);
 f.s.people.tea.life.activity='sleep';assert.equal(actionCandidates(f.s,f.positions).length,0);f.s.people.tea.life.activity='idle';
 f.s.watch.holder='tea';assert.equal(actionCandidates(f.s,f.positions).length,0);f.s.watch.holder='gate_guard';
 f.eco.items('npc:tea').forEach(i=>i.location='ground');assert.equal(actionCandidates(f.s,f.positions).length,0);
});
test('more seriously wounded nearby person suppresses player healing, arrears reduce treatment',()=>{
 const f=setup('heal');f.positions.shen={x:1,z:-5};f.s.people.shen.hp=1;assert.equal(actionCandidates(f.s,f.positions).length,0);
 delete f.positions.shen;f.s.people.tea.favorOwed=2;f.start();arrive(f);f.step(4.1);assert.equal(f.s.player.hp,23);assert.equal(f.s.people.tea.favorOwed,3);assert.equal(f.s.people.tea.rescueDebtLegacy,2);
});
test('revenge requires remembered evidence and actual willing allies, not only a negative number',()=>{
 const f=setup('revenge'),c=actionCandidates(f.s,f.positions)[0];assert.equal(c.cause,1);assert.deepEqual(c.allies,['shen']);assert.match(actionLine(f.s,c),/当街伤人/);
 assert.equal(actionCandidates(f.s,{qing:f.positions.qing}).length,0);f.s.people.shen.life.activity='sleep';assert.equal(actionCandidates(f.s,f.positions).length,0);f.s.people.shen.life.activity='idle';
 f.s.chronicle.deeds=[];assert.equal(actionCandidates(f.s,f.positions).length,0);
});
test('revenge recruits face to face, warns first, then uses shared combat and departs',()=>{
 const f=setup('revenge');f.positions.shen={x:4,z:-6};const e=f.start();f.step();assert.equal(e.recruited.length,0);assert.equal(f.s.player.hp,100);
 f.positions.qing={x:4,z:-4};f.step();assert.deepEqual(e.recruited,['shen']);assert.equal(f.s.people.shen.actionGrudges[0].source,'qing');f.step();assert.equal(e.phase,'approach');
 arrive(f);assert.equal(e.phase,'combat');assert.equal(f.s.player.hp,100);f.step();assert.ok(f.s.player.hp<100);assert.equal(f.s.wanted,0);assert.ok(e.damage>0);
 const hp=f.s.player.hp;f.step(.1);assert.equal(f.s.player.hp,hp,'no per-frame hit');f.step(20);assert.equal(e.phase,'depart');assert.equal(f.s.deck.cards.at(-1).card,'echo');
 f.s.day++;f.s.deck.actions.active=null;assert.equal(actionCandidates(f.s,f.positions).some(c=>c.template==='revenge'),false,'same cause never schedules twice');
});
test('revenge never follows a borrowed face back to the true player',()=>{
 const f=setup('revenge'),s=f.s;appearanceState(s).relations['qing:gate_merchant']=-35;s.chronicle.deeds[0].identities.qing='gate_merchant';
 assert.equal(actionCandidates(s,f.positions).length,0);s.player.face={id:'gate_merchant',until:appearanceTime(s)+100,serial:1};
 assert.equal(actionCandidates(s,f.positions).length,1);const e=f.start();s.player.face=null;f.step();assert.equal(e.phase,'depart');assert.equal(s.people.qing.relation,-30);
});
test('selection rolls once per cause/day and reads, menus, or reloads do not reroll',()=>{
 const f=setup('revenge');let rolls=0;f.sim.rng=()=>{rolls++;return .9;};for(let i=0;i<10;i++){actionCandidates(f.s,f.positions);f.step(3);}assert.equal(rolls,1);assert.equal(f.s.deck.actions.active,null);
 const sim=new Simulation(JSON.parse(JSON.stringify(f.s)),()=>{rolls++;return 0;});sim.save=()=>{};const eco=new Ecosystem(sim);sim.s.npcClock+=10;actionCardStep(sim,eco,1,f.positions);assert.equal(rolls,1);
});
test('pause freezes action time, target uses last sight and departure restores original location',()=>{
 const f=setup('heal'),e=f.start();f.step(30,{blocked:true});assert.equal(e.age,0);f.s.player.x=20;assert.deepEqual(actionTarget(f.s,'tea',f.positions).point,{x:1.1,z:.3});f.step(9);assert.equal(e.phase,'depart');assert.deepEqual(actionTarget(f.s,'tea',f.positions).point,{x:0,z:-5});
});
test('legacy game retains talk aid; chapter v2 cannot heal by flipping a line',()=>{
 const f=setup('heal');assert.equal(peek(f.s,'talk','tea')?.candidates?.some(c=>c.heal),false);
 const old=new Simulation(legacyArrival());old.s.player.hp=15;assert.equal(peek(old.s,'talk','tea_host').card,'aid');assert.equal(actionCandidates(old.s,f.positions).length,0);
});
test('daily schedule yields to active action, but environmental danger still interrupts',()=>{
 const f=setup('heal');f.start();lifeStep(f.sim,f.eco,.1,f.positions);assert.equal(f.s.people.tea.life.activity,'action-card');f.positions.tea={x:-23,z:26};lifeStep(f.sim,f.eco,1,f.positions);assert.equal(f.s.people.tea.drowning,true);assert.equal(f.s.people.tea.life.activity,'escape');
});
test('blocked action-card movement replans without teleporting the visitor',()=>{
 const f=setup('heal');f.start();const actor={position:{x:0,y:0,z:-5},userData:{}},n={actor,cardPath:[{x:1,z:0}],base:{x:10,z:10}},world={sim:f.sim,playing:true,t:0};const results=[];
 for(let i=0;i<220;i++){world.t+=.05;actor.userData.attemptedMove=true;const r=recoverNpc(world,'tea',n,.05);if(r)results.push(r);}
 assert.deepEqual(actor.position,{x:0,y:0,z:-5});assert.ok(results.length>=2);assert.ok(results.every(r=>r==='repath'));assert.equal(n.cardPath,null);assert.equal(f.s.people.tea.navigationRecoveries,undefined);
});
test('player can defend against actual revenge members; strangers and ended fights retain normal consequences',()=>{
 const f=setup('revenge'),e=f.start();e.recruited=['shen'];e.phase='combat';const before=f.s.people.qing.hp,events=[];f.sim.listeners.push((type,data)=>{if(type==='worldIncident')events.push(data);});
 f.sim.attack('qing');assert.ok(f.s.people.qing.hp<before);assert.equal(f.s.wanted,0);assert.equal(events[0].selfDefense,true);assert.equal(f.s.people.qing.fear,0);
 f.sim.attack('gao');assert.equal(events[1].selfDefense,false);assert.ok(f.s.wanted>0);const wanted=f.s.wanted;e.phase='depart';f.sim.attack('qing');assert.ok(f.s.wanted>wanted);
});
test('treatment debt has a real grinding repayment, once per completed practice without farming friendship',()=>{
 const f=setup('heal');f.start();arrive(f);f.step(4.1);f.s.deck.actions.active=null;f.s.facts.herbsGround=true;const relation=f.s.people.tea.relation;
 assert.ok(apprenticeshipOptions(f.sim,'tea').some(a=>a.id==='ap_grind'));
 const r=requestApprenticeship(f.sim,f.eco,'tea','ap_grind');assert.ok(r.training);finishDemonstration(f.sim,r.training);
 for(let i=0;i<3;i++)assert.ok(attemptLesson(f.sim,r.training,{step:i,phase:.6}));
 assert.ok(completeLesson(f.sim,f.eco,r.training).success);assert.equal(f.s.people.tea.favorOwed,0);assert.equal(f.s.people.tea.relation,relation);
 const count=f.eco.items('npc:tea').filter(i=>i.type==='medicine').length;completeLesson(f.sim,f.eco,r.training);assert.equal(f.eco.items('npc:tea').filter(i=>i.type==='medicine').length,count);
 assert.ok(!apprenticeshipOptions(f.sim,'tea').some(a=>a.id==='ap_grind'));
});

test('all three templates wait without effects or forced speech until an explicit response',()=>{
 for(const template of ['food','heal','revenge']){const f=setup(template),e=f.start();if(template==='revenge'){e.recruited=['shen'];e.phase='approach';}waitNearby(f);
  const hp=f.s.player.hp,inventory=JSON.stringify(f.eco.s.items);f.step(180);assert.equal(e.phase,'waiting');assert.equal(f.s.player.hp,hp);assert.equal(JSON.stringify(f.eco.s.items),inventory);assert.equal(f.lines.length,0);assert.ok(pendingActionCard(f.s,f.id,f.positions));
  for(let i=0;i<3;i++){assert.ok(actionCardChoices(f.s,f.id,e.cardId,f.positions).length<=3);assert.ok(answer(f,'action_card_later').deferred);}
  assert.equal(e.phase,'waiting');assert.equal(e.accepted,undefined);assert.equal(e.settled,undefined);
 }
});
test('refusing aid keeps stock, health and debt unchanged; duplicate or stale response has no effect',()=>{
 for(const template of ['food','heal']){const f=setup(template),e=f.start();waitNearby(f);const stock=JSON.stringify(f.eco.s.items),hp=f.s.player.hp;
  assert.ok(answer(f,'action_card_accept',e.cardId+1).error);assert.equal(e.phase,'waiting');assert.ok(answer(f,'action_card_decline').dialogue);assert.equal(e.phase,'depart');assert.equal(e.outcome,'declined');assert.ok(answer(f).error);f.step(8);
  assert.equal(JSON.stringify(f.eco.s.items),stock);assert.equal(f.s.player.hp,hp);assert.equal(f.s.people.tea.favorOwed,undefined);assert.match(f.s.deck.cards.at(-1).lead,/婉拒/);
 }
});
test('marker and choices share reach, visibility, identity and awareness checks',()=>{
 const f=setup('heal'),e=f.start();waitNearby(f);const wall=[{x:.55,z:.15,w:.2,d:5}];assert.equal(pendingActionCard(f.s,f.id,f.positions,wall),null);assert.deepEqual(actionCardChoices(f.s,f.id,e.cardId,f.positions,wall),[]);
 f.s.player.x=7;assert.equal(pendingActionCard(f.s,f.id,f.positions),null);assert.ok(answer(f).error);f.step(30);assert.equal(e.phase,'waiting');f.s.player.x=0;assert.ok(pendingActionCard(f.s,f.id,f.positions));
 f.s.people.tea.muteUntil=100;assert.equal(pendingActionCard(f.s,f.id,f.positions),null);f.s.people.tea.muteUntil=0;f.s.people.tea.awareness={state:'fight'};assert.ok(answer(f).error);f.step();assert.equal(e.phase,'depart');
});
test('acceptance rechecks stock and need, then physically closes the gap before acting',()=>{
 const f=setup('heal'),e=f.start();waitNearby(f);const item=f.eco.s.items.find(i=>i.id===e.item);item.location='ground';assert.ok(actionCardChoices(f.s,f.id,e.cardId,f.positions)[0].preview.blocked);assert.ok(answer(f).error);item.location='npc:tea';f.s.player.hp=50;assert.ok(answer(f).error);f.s.player.hp=15;
 f.s.player.x=-1;assert.ok(!answer(f).error);assert.equal(e.phase,'approach');assert.equal(f.s.player.hp,15);f.positions.tea={x:.1,z:.3};f.step();assert.equal(e.phase,'act');f.step(4.1);assert.equal(f.s.player.hp,45);
});
test('waiting saves and old unfinished v2 actions resume waiting without granting or duplicating rewards',()=>{
 for(const oldPhase of ['waiting','announce','listen','act']){const f=setup('heal'),e=f.start();waitNearby(f);e.phase=oldPhase;if(oldPhase!=='waiting')delete e.interactionVersion;
  const sim=new Simulation(JSON.parse(JSON.stringify(f.s)));sim.save=()=>{};const eco=new Ecosystem(sim);actionCardStep(sim,eco,120,f.positions,{say:()=>true});const restored=actionCardState(sim.s).active;
  assert.equal(restored.phase,'waiting');assert.equal(sim.s.player.hp,15);assert.equal(sim.s.people.tea.favorOwed,undefined);assert.ok(!answerActionCard(sim,'tea',e.cardId,'action_card_accept',f.positions).error);actionCardStep(sim,eco,4.1,f.positions,{say:()=>true});assert.equal(sim.s.player.hp,45);assert.equal(sim.s.people.tea.favorOwed,1);
  delete restored.interactionVersion;actionCardState(sim.s);assert.equal(restored.phase,'thanks');assert.equal(sim.s.player.hp,45);
 }
});
