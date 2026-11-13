import test from 'node:test';
import assert from 'node:assert/strict';
import {Simulation,newArrival} from '../src/simulation.js';
import {Ecosystem} from '../src/ecosystem.js';
import {chapterOptions,chapterResolve,chapterFollowups} from '../src/chapter.js';
import {chapterSpeech} from '../src/chapter-speech.js';
import {entryObjective} from '../src/progress.js';
import {collectPayments,takePayment} from '../src/cash-transfers.js';
import {royalEscortStep,finishRoyalGuarantee,postponeRoyalGuarantee} from '../src/royal-escort.js';
import {showSituationalThought,thoughtCandidates,THOUGHTS} from '../src/situational-thoughts.js';
import {talkTree} from '../src/talk-tree.js';
import {PEOPLE} from '../src/data.js';
const setup=()=>{const sim=new Simulation(newArrival(),()=>0),eco=new Ecosystem(sim,[]);return {sim,eco,s:sim.s,p:sim.s.player};};
const act=(g,id,key,options)=>chapterResolve(g.sim,g.eco,id,'ch_'+key,options);

test('preparing or cancelling speech grants no name, evidence, quest or completed topic',()=>{
 const g=setup();const r=act(g,'gate_merchant','merchant_name',{deferSpeech:true});
 assert.ok(r.pendingSpeech);assert.equal(g.s.facts.knownNames?.gate_merchant,undefined);assert.ok(!g.s.chapter.done.merchant_name);
 const saved=new Simulation(JSON.parse(JSON.stringify(g.s))),eco=new Ecosystem(saved,[]);
 const heard=chapterResolve(saved,eco,'gate_merchant','ch_merchant_name',{confirmedText:r.text});
 assert.ok(heard.success);assert.equal(saved.s.facts.knownNames.gate_merchant,'赵成');assert.ok(!saved.s.facts.merchantGuardKnown);
 assert.ok(chapterResolve(saved,eco,'gate_merchant','ch_merchant_name').error);
 assert.ok(chapterResolve(saved,eco,'gate_merchant','ch_merchant_guard').success);assert.equal(saved.s.facts.merchantGuardKnown,true);
});
test('guard explains the immediate duty without revealing unseen routes',()=>{
 const g=setup(),r=act(g,'gate_guard','gate_rules');assert.ok(r.success);assert.doesNotMatch(r.text,/担保|役夫|水路|冒名/);
 assert.doesNotMatch(entryObjective(g.s),/担保|役夫|水路/);assert.ok(!g.s.facts.runnerNameKnown&&!g.s.facts.convoySchedule);
 assert.deepEqual(chapterFollowups(g.sim,'gate_guard',r).map(a=>a.id),['ch_gate_no_papers','ch_end']);
});
test('tea offer leads directly to payment or decline; placement is not receipt',()=>{
 const g=setup();Object.assign(g.p,{x:-5,z:30});g.eco.positions.tea_host={x:-5,z:30};g.eco.positions.traveler={x:25,z:30};
 act(g,'tea_host','tea_worry');const offer=act(g,'tea_host','tea_fee'),choices=chapterFollowups(g.sim,'tea_host',offer),before=g.p.money;
 assert.deepEqual(choices.map(a=>a.id),['ch_help_mother','ch_end']);assert.equal(choices[1].mode,'endTalk');assert.equal(g.p.money,before);
 const r=act(g,'tea_host','help_mother');assert.ok(r.success);assert.equal(g.p.money,before-2);assert.ok(!g.s.facts.convoyFeePaid&&!g.s.facts.royalSawKindness);assert.doesNotMatch(r.text,/交清/);
 const pile=g.eco.s.items.find(i=>i.chapterFee);assert.ok(pile);const purse=g.s.people.fu.purse;
 g.eco.s.time=8;collectPayments(g.sim,g.eco,{fu:{x:20,z:30}});assert.ok(!g.s.facts.convoyFeePaid);
 collectPayments(g.sim,g.eco,{fu:pile.stand});g.eco.s.time=10;collectPayments(g.sim,g.eco,{fu:pile.stand});assert.equal(g.s.facts.convoyFeePaid,true);assert.equal(g.s.people.fu.purse,purse+2);
 collectPayments(g.sim,g.eco,{fu:pile.stand});assert.equal(g.s.people.fu.purse,purse+2);assert.ok(act(g,'tea_host','help_mother').error);
});
test('a stolen fee pile never becomes a settled fee',()=>{
 const g=setup();g.s.facts.teaFeeKnown=true;Object.assign(g.p,{x:-5,z:30});g.eco.positions.tea_host={x:-5,z:30};act(g,'tea_host','help_mother');const pile=g.eco.s.items.find(i=>i.chapterFee);
 g.p.stealing=g.p.crouched=true;takePayment(g.sim,g.eco,pile);g.eco.s.time=10;collectPayments(g.sim,g.eco,{fu:pile.stand});assert.ok(!g.s.facts.convoyFeePaid);assert.notEqual(pile.location,'collected');
});
test('royal sponsorship requires actual arrival, audible participants and completed reply',()=>{
 const g=setup();g.s.facts.royalSawKindness=true;g.eco.positions.traveler={x:-5,z:30};Object.assign(g.p,{x:-5,z:31});act(g,'traveler','royal_offer');assert.ok(act(g,'traveler','royal_vouch').success);assert.ok(!g.s.facts.enteredCity&&!g.s.facts.princeDebt);
 royalEscortStep(g.sim,g.eco,g.eco.positions);assert.deepEqual(g.s.people.traveler.life.target,{x:-3,z:29});
 Object.assign(g.p,{x:0,z:26});Object.assign(g.eco.positions,{traveler:{x:0,z:25},gate_guard:{x:0,z:24}});g.s.watch={holder:'gate_guard'};g.s.facts.royalEscort.stage=2;
 g.s.people.gate_guard.muteUntil=100;royalEscortStep(g.sim,g.eco,g.eco.positions);assert.equal(g.s.facts.royalEscort.status,'walking');
 g.s.people.gate_guard.muteUntil=0;royalEscortStep(g.sim,g.eco,g.eco.positions);assert.equal(g.s.facts.royalEscort.status,'ready');
 postponeRoyalGuarantee(g.sim);assert.ok(!g.s.facts.princeDebt);g.s.npcClock=10;royalEscortStep(g.sim,g.eco,g.eco.positions);
 const point=[g.p.x,g.p.z];assert.equal(finishRoyalGuarantee(g.sim,g.eco),true);assert.deepEqual([g.p.x,g.p.z],point);assert.equal(g.s.facts.entryRoute,'royal');assert.ok(g.s.facts.princeDebt);
 assert.equal(finishRoyalGuarantee(g.sim,g.eco),false);const r=act(g,'traveler','entry_story');assert.doesNotMatch(r.text,/(怎么|哪条路).*进(城|来)|如何.*进城/);assert.match(r.text,/我替你|我.*担/);assert.deepEqual(r.follow,['royal_task_offer']);
});
test('a harmed, distant or unconscious guarantor never remotely grants passage',()=>{
 for(const mutate of [g=>g.s.people.traveler.hp=1,g=>g.s.people.traveler.restraint={},g=>g.s.facts.royalSawHarm=true,g=>g.p.x=25]){
  const g=setup();g.s.facts.royalEscort={status:'ready',guard:'gate_guard'};g.eco.positions={traveler:{x:0,z:25},gate_guard:{x:0,z:24}};Object.assign(g.p,{x:0,z:26});mutate(g);assert.equal(finishRoyalGuarantee(g.sim,g.eco),false);assert.ok(!g.s.facts.princeDebt);
 }
});

test('an interrupted ready guarantee resumes after reload without granting passage early',()=>{
 const g=setup();Object.assign(g.p,{x:0,z:26});g.s.facts.royalEscort={stage:2,status:'ready',guard:'gate_guard',retryAt:2};
 const loaded=new Simulation(JSON.parse(JSON.stringify(g.s))),eco=new Ecosystem(loaded,[]);eco.positions={traveler:{x:0,z:25},gate_guard:{x:0,z:24}};loaded.s.watch={holder:'gate_guard'};
 let ready=0;loaded.listeners.push(type=>{if(type==='royalGuaranteeReady')ready++;});loaded.s.npcClock=3;
 royalEscortStep(loaded,eco,eco.positions);assert.equal(ready,1);assert.ok(!loaded.s.facts.enteredCity);
 royalEscortStep(loaded,eco,eco.positions);assert.equal(ready,1);
 assert.equal(finishRoyalGuarantee(loaded,eco),true);assert.equal(finishRoyalGuarantee(loaded,eco),false);
});
test('thoughts defer under interruption, recheck facts and deduplicate through reload',()=>{
 const g=setup();g.s.facts.guardResponsibilityHeard=true;Object.assign(g.p,{x:0,z:26});const context={positions:{gate_guard:{x:0,z:24}}};let calls=0;
 assert.equal(showSituationalThought(g.sim,context,30,()=>++calls,true),false);assert.equal(calls,0);
 assert.equal(showSituationalThought(g.sim,context,30,()=>false),false);assert.equal(showSituationalThought(g.sim,context,30,()=>++calls),true);
 const loaded=new Simulation(JSON.parse(JSON.stringify(g.s)));assert.equal(showSituationalThought(loaded,context,60,()=>++calls),false);assert.equal(calls,1);
 for(const text of Object.values(THOUGHTS))assert.match(text,/^（[^\n]+）$/,text);
});
test('knowledge-only replies and all recursively grouped menus remain short',()=>{
 const g=setup();for(const id of PEOPLE.map(p=>p.id)){const actions=chapterOptions(g.sim,id);const check=rows=>{assert.ok(rows.length<=3);for(const a of rows)if(a.children){assert.equal(a.mode,'topic');assert.ok(!a.reply);check(a.children);}};check(talkTree(id,actions));}
 assert.ok(!chapterSpeech(g.s,'qinghe','qinghe_wish').text.includes('答应'));assert.ok(!g.s.facts.qingheConsent);
});
test('natural wording keeps the lapel contents unknown and the herb worktable physical',()=>{
 const g=setup();Object.assign(g.p,{x:0,z:12});const positions={gate_merchant:{x:0,z:14}};
 assert.ok(!thoughtCandidates(g.s,{positions}).some(t=>t.key==='lapel'));
 const thought=thoughtCandidates(g.s,{positions,details:{gate_merchant:'guardLapel'}}).find(t=>t.key==='lapel');
 assert.ok(thought);assert.match(thought.text,/衣襟/);assert.doesNotMatch(thought.text,/路引|银票|钱袋/);
 assert.ok(!thoughtCandidates(g.s,{positions:{gate_merchant:{x:0,z:30}},details:{gate_merchant:'guardLapel'}}).some(t=>t.key==='lapel'));
 const offer=chapterSpeech(g.s,'tea','herb_offer');assert.match(offer.text,/两文/);assert.match(offer.text,/药案.*用/);assert.doesNotMatch(offer.text,/翻看|翻阅/);
 const deed=chapterSpeech(g.s,'prisoner','ledger_offer');assert.match(deed.text,/愿|若/);assert.equal(g.eco.items('player').some(i=>i.type==='ledger'),false);
});
