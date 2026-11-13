import test from 'node:test';
import assert from 'node:assert/strict';
import {Simulation,newArrival} from '../src/simulation.js';
import {Ecosystem} from '../src/ecosystem.js';
import {actionCandidates,actionCardState,startActionCard,actionCardStep,actionCardChoices,answerActionCard,openActionVisit,heardActionVisit,beginActionGuidance,finishActionGuidance} from '../src/action-cards.js';
import {guidanceCandidates,visitContext,pickVisit,rememberVisit} from '../src/action-card-dialogue.js';
import {dialogueLines} from '../src/dialogue.js';
import {createVisitDirector} from '../src/action-card-director.js';

function fixture(){const sim=new Simulation(newArrival());sim.save=()=>{};const s=sim.s,eco=new Ecosystem(sim),id='old_constable';
 Object.assign(s.player,{x:0,z:12,hp:100,satiety:10});s.npcClock=1;Object.assign(s.people[id],{metPlayer:true,relation:10,life:{activity:'idle'},facing:0});
 const pos={[id]:{x:0,z:7}},step=(dt=.1)=>{s.npcClock+=dt;actionCardStep(sim,eco,dt,pos);};
 const start=template=>startActionCard(sim,actionCandidates(s,pos).find(c=>c.template===template),pos);
 const arrive=e=>{pos[id]={x:1.1,z:12.3};s.people[id].facing=Math.atan2(-1.1,-.3);step();assert.equal(e.phase,'waiting');};
 return {sim,s,eco,id,pos,step,start,arrive};}

test('one unresolved hunger episode cannot produce a daily food gift, even after reload',()=>{
 const f=fixture(),e=f.start('food');f.arrive(e);answerActionCard(f.sim,f.id,e.cardId,'action_card_accept',f.pos);f.step(2);
 assert.ok(e.settled);f.s.deck.actions.active=null;
 for(let day=0;day<5;day++){f.s.day++;assert.equal(actionCandidates(f.s,f.pos).some(c=>c.template==='food'),false);}
 const sim=new Simulation(JSON.parse(JSON.stringify(f.s)));assert.equal(actionCandidates(sim.s,f.pos).some(c=>c.template==='food'),false);
 assert.equal(actionCandidates(f.s,f.pos).some(c=>c.template==='guide'),true);
});
test('food aid rearms only after recovery and a three-day interval; refusing does not farm a new offer',()=>{
 const f=fixture(),e=f.start('food');f.arrive(e);answerActionCard(f.sim,f.id,e.cardId,'action_card_decline',f.pos);f.s.deck.actions.active=null;
 f.s.player.satiety=60;f.step();f.s.deck.actions.active=null;f.s.player.satiety=10;f.s.day++;
 assert.equal(actionCandidates(f.s,f.pos).some(c=>c.template==='food'),false);f.s.day+=2;assert.equal(actionCandidates(f.s,f.pos).some(c=>c.template==='food'),true);
});
test('old food cards seed pacing once without claiming an unrecorded gift or changing inventory',()=>{
 const f=fixture();f.s.deck={cards:[{id:1,day:1,actionTemplate:'food'}]};const stock=JSON.stringify(f.eco.s.items),a=actionCardState(f.s);
 assert.equal(a.food.handled,true);assert.deepEqual(a.visits,{});assert.equal(JSON.stringify(f.eco.s.items),stock);
 assert.equal(actionCandidates(f.s,f.pos).some(c=>c.template==='food'),false);
 a.food.handled=false;actionCardState(f.s);assert.equal(a.food.handled,false);
});
test('guidance speaks the real topic immediately without confirmation; cancel, reload and completion cannot grant twice',()=>{
 const f=fixture();f.s.player.satiety=80;const e=f.start('guide');f.arrive(e);const stock=JSON.stringify(f.eco.s.items),hp=f.s.player.hp;
 const begin=()=>beginActionGuidance(f.sim,f.id,e.cardId,f.pos);const visit=begin(),topic=guidanceCandidates(f.s,f.id).find(t=>t.id===e.topic);
 assert.deepEqual(actionCardChoices(f.s,f.id,e.cardId,f.pos),[]);assert.equal(visit.dialogue[0].id,f.id);assert.ok(visit.dialogue[0].text.includes(topic.line));assert.ok(!/愿闻其详|愿不愿听|想听吗|可愿听/.test(visit.dialogue[0].text));
 assert.equal(dialogueLines(visit.dialogue)[0].text,visit.dialogue[0].text,'opening and fact stay on the first page');
 assert.equal(f.s.deck.used[e.topic],undefined);assert.equal(finishActionGuidance(f.sim,f.id,e.cardId,f.pos,[],true,visit.token),null);
 assert.equal(e.phase,'waiting');assert.equal(f.s.deck.used[e.topic],undefined);
 const sim=new Simulation(JSON.parse(JSON.stringify(f.s)));sim.save=()=>{};const saved=sim.s.deck.actions.active;
 const replay=beginActionGuidance(sim,f.id,e.cardId,f.pos);assert.ok(replay);
 const card=finishActionGuidance(sim,f.id,e.cardId,f.pos,[],false,replay.token);assert.ok(card);assert.equal(saved.phase,'depart');assert.ok(saved.settled);
 assert.equal(finishActionGuidance(sim,f.id,e.cardId,f.pos,[],false,replay.token),null);assert.equal(sim.s.deck.leads.filter(l=>l.event===card.event).length,1);
 assert.equal(JSON.stringify(f.eco.s.items),stock);assert.equal(f.s.player.hp,hp);
});
test('new knowledge, distance, a harmful act and identity change invalidate a pending guide settlement',()=>{
 for(const changed of ['known','distance','harm','identity']){
  const f=fixture();f.s.player.satiety=80;const e=f.start('guide');f.arrive(e);const visit=beginActionGuidance(f.sim,f.id,e.cardId,f.pos);
  if(changed==='known')f.s.deck.used[e.topic]=f.s.day;
  if(changed==='distance')f.s.player.x=20;
  if(changed==='harm')f.s.people[f.id].harmKnowledge=[{subject:'player',target:f.id,kind:'assault',cause:1}];
  if(changed==='identity')e.subject='gate_merchant';
  assert.equal(finishActionGuidance(f.sim,f.id,e.cardId,f.pos,[],false,visit.token),null,changed);assert.equal(f.s.deck.leads.length,0,changed);
 }
});
test('route facts and harm mechanics exhaust, no filler appears and no route entry is unlocked by hearing',()=>{
 const f=fixture();let topics=guidanceCandidates(f.s,f.id);assert.ok(topics.some(t=>t.card==='route'));assert.ok(topics.some(t=>t.id==='visit_blades'));
 for(const t of topics)f.s.deck.used[t.id]=f.s.day;assert.deepEqual(guidanceCandidates(f.s,f.id),[]);assert.equal(actionCandidates(f.s,f.pos).some(c=>c.template==='guide'),false);
 assert.ok(!f.s.facts.enteredCity);assert.ok(!f.s.facts.guardVouched);
 f.s.facts.enteredCity=true;assert.ok(!guidanceCandidates(f.s,f.id).some(t=>t.stage==='gate'));
 assert.ok(guidanceCandidates(f.s,'tea').find(t=>t.id==='visit_poison').lead.includes('不保证致命'));
});
test('DS only chooses eligible IDs; greetings remember the right face, location and actual conversation',()=>{
 const f=fixture(),e={who:f.id,subject:'player',template:'guide',cardId:12};actionCardState(f.s);
 rememberVisit(f.s,e,'先前说过的一句。');f.s.day++;e.cardId++;
 let context=visitContext(f.s,e);assert.ok(context.openings.some(v=>v.id.startsWith('guide_gate:')));
 const blade=pickVisit(f.s,e,{opening:'guide_gate:0',topic:'visit_blades',line:'赠给你一万两。'});assert.equal(blade.topic.id,'visit_blades');assert.ok(!blade.opening.id.startsWith('guide_gate:'));
 const invalid=pickVisit(f.s,e,{opening:'fake',topic:'unknown'});assert.equal(invalid.ai,false);assert.ok(context.openings.some(v=>v.id===invalid.opening.id));
 f.s.facts.enteredCity=true;assert.ok(!visitContext(f.s,e).openings.some(v=>v.id.startsWith('guide_gate:')));
 e.subject='gate_merchant';assert.equal(visitContext(f.s,e).encounter.seenBefore,false);
 f.s.chronicle={deeds:[{text:'secret ledger'}]};assert.ok(!JSON.stringify(visitContext(f.s,e)).includes('secret ledger'));
});
test('DS prefetch is once per visit, non-blocking, and late replies cannot overwrite opened or replaced dialogue',async()=>{
 for(const mode of ['normal','opened','replaced','offline']){
  const f=fixture(),e=f.start('food');let resolve,calls=0;const request=new Promise(r=>resolve=r),prefetch=createVisitDirector(()=>{calls++;return request;});
  const job=prefetch(f.sim,e,mode!=='offline');prefetch(f.sim,e,mode!=='offline');assert.equal(calls,mode==='offline'?0:1);
  if(mode==='opened')openActionVisit(f.sim,e);if(mode==='replaced')f.s.deck.actions.active=null;
  resolve({opening:'food_first:1',line:'凭空送银子'});await job;
  assert.equal(!!e.dialogueChoice,mode==='normal');if(e.dialogueChoice)assert.equal(e.dialogueChoice.line,undefined);
 }
});
test('reopening after entering town rechecks a previously frozen outside greeting and route',()=>{
 const f=fixture();f.s.player.satiety=80;actionCardState(f.s);rememberVisit(f.s,{who:f.id,subject:'player',cardId:0},'旧日谈话');f.s.day++;
 const e=f.start('guide');f.arrive(e);e.dialogueChoice={opening:'guide_gate:0',topic:guidanceCandidates(f.s,f.id).find(t=>t.card==='route').id};
 assert.match(openActionVisit(f.sim,e),/怎么还在这儿/);f.s.facts.enteredCity=true;f.s.player.z=22;
 assert.doesNotMatch(openActionVisit(f.sim,e),/关外|入城|还在这/);assert.equal(e.topic,'visit_blades');
});
test('old saved guide openings are replaced, exhausted facts end quietly and obsolete callbacks cannot finish a new reading',()=>{
 const f=fixture();f.s.player.satiety=80;const e=f.start('guide');f.arrive(e);
 e.opening='有件事或许有用，可愿听我讲讲？';e.dialogueLocked=true;e.openingContext=JSON.stringify(['gate',false,true,guidanceCandidates(f.s,f.id).map(t=>t.id)]);
 const first=beginActionGuidance(f.sim,f.id,e.cardId,f.pos);assert.ok(!first.dialogue[0].text.includes('可愿听'));
 const second=beginActionGuidance(f.sim,f.id,e.cardId,f.pos);
 assert.equal(finishActionGuidance(f.sim,f.id,e.cardId,f.pos,[],false,first.token),null);assert.equal(e.telling,true);
 const result=finishActionGuidance(f.sim,f.id,e.cardId,f.pos,[],false,second.token);assert.ok(result);assert.equal(result.line,second.dialogue[0].text);
 const g=fixture();g.s.player.satiety=80;const other=g.start('guide');g.arrive(other);
 for(const t of guidanceCandidates(g.s,g.id))g.s.deck.used[t.id]=g.s.day;
 assert.equal(beginActionGuidance(g.sim,g.id,other.cardId,g.pos),null);assert.equal(other.phase,'depart');assert.equal(g.s.deck.leads.length,0);
});
