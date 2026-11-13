import test from 'node:test';
import assert from 'node:assert/strict';
import {Simulation,newArrival} from '../src/simulation.js';
import {deckState,peek,deliverMail} from '../src/event-deck.js';
import {pendingEcho,seesEchoPlayer,markEchoHeard,echoChoices,answerEcho} from '../src/aftermath-encounters.js';
import {progressSnapshot} from '../src/progress.js';

function fixture(template='rumor_spread',who='old_constable'){
 const sim=new Simulation(newArrival());sim.save=()=>{};
 const s=sim.s,n=s.people[who];n.hp=100;n.fear=0;n.awareness={state:'idle'};n.life={activity:'idle'};n.relation=-8;
 const e={id:1,cause:9,causeTitle:'关前动手',who,teller:'gate_guard',template,channel:template==='thanks_letter'?'mail':'talk',due:s.day,day:s.day,line:'韩校尉说你当街动手，老夫想听你亲口讲一遍。',title:'传开了',delta:-2};
 deckState(s).echoes=[e];s.deck.seq=1;sim.progressBaseline=progressSnapshot(s);return {sim,s,n,e};
}
test('aftermath outranks the daily conversation cap and does not advance the deck',()=>{
 const {sim,s,e}=fixture();s.deck.heard[e.who]=s.day;
 assert.equal(peek(s,'talk',e.who).echo,e);const before=s.deck.pointer.gate;
 markEchoHeard(sim,e);markEchoHeard(sim,e);
 assert.equal(s.deck.cards.length,1);assert.equal(s.deck.pointer.gate,before);
 assert.equal(pendingEcho(s,e.who),e,'hearing is not answering');
});
test('a proactive echo does not spend the ordinary news quota',()=>{
 const {sim,s,e}=fixture();markEchoHeard(sim,e);
 assert.notEqual(s.deck.heard[e.who],s.day);
 assert.notEqual(peek(s,'talk',e.who)?.card,'echo');
});
test('old delivered echoes gain replies; a postponed reply survives a reload',()=>{
 const {sim,s,e}=fixture();e.delivered=true;
 assert.equal(pendingEcho(s,e.who),e);
 assert.equal(answerEcho(sim,e.id,'later').deferred,true);
 const loaded=JSON.parse(JSON.stringify(s));
 assert.equal(pendingEcho(loaded,e.who).id,e.id);
});
test('seeing the player requires proximity, facing, visibility and conscious peaceful participants',()=>{
 const {s,n,e}=fixture(),p={x:0,z:0},hero={x:0,z:3};
 const sees=(h=0,clear=true,q=hero)=>seesEchoPlayer(s,e.who,p,q,h,clear);
 assert.ok(sees());assert.ok(!sees(Math.PI));assert.ok(!sees(0,false));assert.ok(!sees(0,true,{x:0,z:6.1}));
 for(const patch of [{hp:0},{stunnedUntil:999},{muteUntil:999},{life:{activity:'sleep'}},{life:{activity:'doze'}},{inCustody:true},{awareness:{state:'fight'}},{awareness:{state:'idle',caseOpen:true}},{fear:4}]){
  const backup=structuredClone(n);Object.assign(n,patch);assert.ok(!sees(),JSON.stringify(patch));Object.assign(n,backup);
 }
 s.complaint={id:e.who};assert.ok(!sees());delete s.complaint;s.player.hp=0;assert.ok(!sees());
});
test('preview and resolution agree; firsthand witnesses are harder to persuade',()=>{
 const {sim,s,e}=fixture();const rumor=echoChoices(s,e)[0].preview.chance;
 e.template='grudge';const chance=echoChoices(s,e)[0].preview.chance;assert.ok(chance<rumor);
 const r=answerEcho(sim,e.id,'argue',()=> (chance-1)/100);
 assert.equal(r.roll,chance);assert.ok(r.success);assert.equal(r.check.chance,chance);
 assert.equal(r.dialogue[0].id,'player');assert.equal(r.dialogue[1].id,e.who);
});
test('apology repairs only once, links to the cause, and preserves evidence and wanted status',()=>{
 const {sim,s,n,e}=fixture('grudge');n.memories=['亲眼看见动手'];s.wanted=3;s.facts.testEvidence=true;
 const floats=[];sim.listeners.push((type,data)=>{if(type==='actorDeltas')floats.push(...data);});
 s.deck.echoes.push({...e,id:2,template:'rumor_spread'});
 const r=answerEcho(sim,e.id,'apologize');assert.equal(r.delta,2);assert.equal(n.relation,-6);
 assert.deepEqual(floats,[{id:e.who,label:'好感',delta:2}]);
 assert.equal(s.wanted,3);assert.ok(s.facts.testEvidence);assert.ok(n.memories.includes('亲眼看见动手'));
 assert.equal(s.chronicle.deeds.at(-1).cause,9);assert.equal(s.deck.echoes[1].response.answer,'apologize');
 assert.ok(answerEcho(sim,2,'apologize').error);assert.equal(n.relation,-6);
 const restored=new Simulation(JSON.parse(JSON.stringify(s)));restored.save=()=>{};
 assert.ok(answerEcho(restored,1,'apologize').error);
});
test('failed argument adds distrust, while leaving does not roll or consume the response',()=>{
 const {sim,s,n,e}=fixture();
 answerEcho(sim,e.id,'later',()=>{throw Error('must not roll');});assert.equal(n.relation,-8);assert.equal(e.response,undefined);
 const r=answerEcho(sim,e.id,'argue',()=>.99);assert.equal(r.success,false);assert.equal(r.delta,-1);assert.equal(n.relation,-9);
 assert.equal(pendingEcho(s,e.who),null);
});
test('thank-you letters are also surfaced on meeting, without duplicating thanks rewards or mail',()=>{
 const {sim,s,n,e}=fixture('thanks_letter');deliverMail(sim);assert.ok(e.delivered);assert.equal(s.mail.length,1);
 assert.equal(pendingEcho(s,e.who),e);markEchoHeard(sim,e);
 assert.deepEqual(echoChoices(s,e).map(o=>o.action.id),['accept','later']);
 assert.equal(answerEcho(sim,e.id,'accept').delta,0);assert.equal(n.relation,-8);
 assert.equal(deliverMail(sim).length,0);
});
