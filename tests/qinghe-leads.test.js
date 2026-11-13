import test from 'node:test';
import assert from 'node:assert/strict';
import {Simulation,newArrival,legacyArrival} from '../src/simulation.js';
import {Ecosystem} from '../src/ecosystem.js';
import {convoyState,stockConvoy} from '../src/convoy.js';
import {chapterResolve,chapterOptions,chapterFollowups} from '../src/chapter.js';
import {eventCandidates,commitDeal,eventsFor,deckState} from '../src/event-deck.js';
import {guidanceCandidates} from '../src/action-card-dialogue.js';
import {QINGHE_RIVERSIDE} from '../src/locations.js';
import {QINGHE_SEARCH_PLACE,qingheSearchChoice,syncOpeningLeads} from '../src/qinghe-leads.js';
import {ambientLine} from '../src/ambient-lines.js';
import {applyFace,rememberFace} from '../src/appearance.js';
import {contactOptions} from '../src/gate-society.js';

function setup(saved){
 const sim=new Simulation(saved||newArrival(),()=>{throw Error('pure speech must not roll');}),s=sim.s,eco=new Ecosystem(sim,[]);sim.save=()=>{};
 convoyState(s);stockConvoy(eco);s.chapter??={done:{}};s.chapter.done??={};
 s.people.fu.life={activity:'duty'};Object.assign(s.people.qinghe,QINGHE_RIVERSIDE,{life:{activity:'riverside'}});
 return {sim,s,eco};
}
const speak=g=>chapterResolve(g.sim,g.eco,'fu','ch_fu_waiting');
const candidates=(g,id='tea_host')=>eventCandidates(g.s,'route',id);
function deal(g,id,speaker='tea_host'){
 const event=candidates(g,speaker).find(e=>e.id===id);assert.ok(event,id);
 return commitDeal(g.sim,{card:'route',urgent:true,candidates:[event]},speaker,{event,line:event.lines[speaker]});
}
test('Fu offers a short direct reply, then search or leave; preparing and cancelling never grants a lead',()=>{
 const g=setup(),before=JSON.stringify(g.s.player),r=chapterResolve(g.sim,g.eco,'fu','ch_fu_waiting',{deferSpeech:true});
 assert.equal(r.presentation,'dialogue');assert.equal(r.roll,null);assert.ok(r.dialogue[0].verbatim);assert.match(r.text,/宋青禾怎么还没到/);
 assert.ok(!g.s.facts.fuWaitingKnown);assert.ok(!g.s.quests?.qinghe_search);assert.equal(qingheSearchChoice(g.s),null);
 const done=speak(g);assert.deepEqual(chapterFollowups(g.sim,'fu',done).map(a=>a.label),['我帮你去找找','告辞']);
 assert.deepEqual(qingheSearchChoice(g.s).place,QINGHE_SEARCH_PLACE);assert.equal(g.s.quests.qinghe_search.source,'符祥当面所言');
 assert.equal(JSON.stringify(g.s.player),before);assert.ok(!g.s.facts.qingheConsent&&!g.s.facts.qingheUnwillingKnown&&!g.s.facts.knownNames?.qinghe);
 assert.equal(ambientLine('fu','duty',0,g.s),null);assert.ok(speak(g).error);
 assert.ok(chapterOptions(g.sim,'fu').some(a=>a.mode==='qingheSearch'),'declining keeps the useful return option');
});
test('hearsay sends players to two distinct sites, persists its source, and deduplicates across speakers',()=>{
 const g=setup();const convoy=deal(g,'convoy_waiting'),cry=deal(g,'riverside_cry','relay');
 assert.deepEqual(convoy.place,{person:'fu'});assert.deepEqual(cry.place,QINGHE_SEARCH_PLACE);
 assert.doesNotMatch(JSON.stringify({title:cry.title,line:cry.line,lead:cry.lead,place:cry.place}),/宋青禾|qinghe/);
 assert.match(g.s.quests.qinghe_search.source,/口述/);assert.equal(g.s.quests.qinghe_search.title,'石后的哭声');
 assert.ok(!g.s.facts.knownNames?.qinghe&&!g.s.facts.qingheConsent);
 assert.ok(!guidanceCandidates(g.s,'old_constable').some(e=>['convoy_waiting','riverside_cry'].includes(e.id)));
 const loaded=setup(JSON.parse(JSON.stringify(g.s)));syncOpeningLeads(loaded.s);assert.equal(loaded.s.quests.qinghe_search.source,g.s.quests.qinghe_search.source);
 speak(loaded);assert.equal(loaded.s.quests.qinghe_search.title,'寻访宋青禾');assert.equal(loaded.s.quests.convoy_waiting.status,'complete');
 assert.equal(loaded.s.deck.leads.length,2);
});
test('meeting Qinghe first and returning after completion remove obsolete search recommendations',()=>{
 for(const first of [true,false]){
  const g=setup();if(!first){speak(g);deal(g,'uniform_rack');}
  chapterResolve(g.sim,g.eco,'qinghe','ch_qinghe_wish');syncOpeningLeads(g.s);
  assert.equal(qingheSearchChoice(g.s),null);assert.ok(!chapterOptions(g.sim,'fu').some(a=>a.id==='ch_fu_waiting'));
  assert.ok(!candidates(g).some(e=>['convoy_waiting','riverside_cry'].includes(e.id)));
  if(!first)assert.equal(g.s.quests.qinghe_search.status,'complete');
  assert.ok(!g.s.facts.qingheConsent);
 }
});
test('convoy departure, lost roster and Fu incapacity prevent stale waiting claims',()=>{
 for(const kind of ['departed','closed','roster','mute','bound','sleep','dead']){
  const g=setup();if(kind==='departed')g.s.convoy.phase='travel';if(kind==='closed')g.s.convoy.closed=true;
  if(kind==='roster')g.s.ecosystem.items.find(i=>i.storyId==='convoy-list').location='player';
  if(kind==='mute')g.s.people.fu.muteUntil=1000;if(kind==='bound')g.s.people.fu.restraint={};if(kind==='sleep')g.s.people.fu.life.activity='sleep';if(kind==='dead')g.s.people.fu.hp=0;
  assert.ok(speak(g).error,kind);assert.ok(!candidates(g).some(e=>e.id==='convoy_waiting'),kind);assert.equal(ambientLine('fu','duty',0,g.s),null,kind);
 }
});
test('stale clue commits do not consume cards, daily quotas or knowledge',()=>{
 const g=setup(),event=candidates(g).find(e=>e.id==='convoy_waiting'),before=JSON.stringify(deckState(g.s));g.s.convoy.phase='travel';
 assert.equal(commitDeal(g.sim,{card:'route',index:0},'tea_host',{event}),null);assert.equal(JSON.stringify(g.s.deck),before);assert.ok(!g.s.facts.convoyWaitingKnown);
});
test('disguised roster passenger retains their existing identity options and old chapters get neither new clue',()=>{
 const g=setup();g.s.people.qinghe.metPlayer=true;rememberFace(g.s,'qinghe');assert.ok(applyFace(g.sim,'qinghe').ok);
 assert.ok(!contactOptions(g.sim,'fu').some(a=>a.id==='ch_fu_waiting'));assert.ok(contactOptions(g.sim,'fu').some(a=>a.id==='if_qinghe_join'));
 assert.ok(!eventsFor(legacyArrival()).some(e=>['convoy_waiting','riverside_cry'].includes(e.id)));
});
test('old completed conversations repair only missing lead records, without repeat rewards',()=>{
 const g=setup();g.s.chapter.done.fu_waiting=true;const before=JSON.stringify(g.s.player);syncOpeningLeads(g.s);syncOpeningLeads(g.s);
 assert.equal(g.s.quests.qinghe_search.status,'active');assert.equal(JSON.stringify(g.s.player),before);assert.equal(Object.keys(g.s.quests).filter(k=>k==='qinghe_search').length,1);
});
