import test from 'node:test';
import assert from 'node:assert/strict';
import {Simulation,newArrival} from '../src/simulation.js';
import {Ecosystem} from '../src/ecosystem.js';
import {resolveRestraint} from '../src/npc-restraints.js';
import {restraintConversation,finishRestraintConversation,restraintReplies} from '../src/restraint-dialogue.js';
import {contactOptions,contactPreview,contactResolve,contactFollowups} from '../src/gate-society.js';
import {socialOptions,socialPreview,socialResolve} from '../src/npc-social.js';
import {peek,commitDeal,pickEvent,deckState} from '../src/event-deck.js';
import {pendingEcho,seesEchoPlayer,echoChoices,answerEcho} from '../src/aftermath-encounters.js';

function fixture(id='scribe'){
 const sim=new Simulation(newArrival(),()=>0);sim.save=()=>{};
 const eco=new Ecosystem(sim),s=sim.s,n=s.people[id];
 Object.assign(s.player,{x:0,z:0,hp:100,energy:100});
 Object.assign(n,{x:0,z:1.5,hp:100,stunnedUntil:0,muteUntil:0,life:{activity:'idle'},awareness:null,fear:0});
 eco.positions[id]={x:0,z:1.5,facing:Math.PI};
 return {sim,eco,s,n,id,bind:()=>resolveRestraint(sim,eco,id),release:()=>resolveRestraint(sim,eco,id,'release')};
}
test('what someone caught up in a fight would refuse is shown as refused, with the reason, not left to do nothing when pressed',()=>{
 for(const [name,upset,spared] of [['running',n=>{n.awareness={state:'flee'};},[]],['an open case',n=>{n.awareness={state:'calm',caseOpen:true};},['appearance_paste']]]){
  const f=fixture(),{sim,eco,s,n,id}=f;s.player.money=20;n.probedTier=2;
  const options=contactOptions(sim,id).filter(a=>['appearance_paste','ch_scribe_secret'].includes(a.id));assert.equal(options.length,2,name);
  for(const a of options)assert.equal(contactPreview(sim,id,a,eco).blocked,false,name+': offered while calm');
  upset(n);
  for(const a of options){const preview=contactPreview(sim,id,a,eco),refused=!!contactResolve(sim,eco,id,a.id).error;
   assert.equal(refused,!spared.includes(a.id),name+': '+a.id);assert.equal(preview.blocked,refused,name+': '+a.id+' is previewed as it settles');if(refused)assert.ok(preview.reason,name+': '+a.id+' says why');}
 }
});
test('ordinary proposals become bound replies; stale purchases, clues and lessons cannot settle',()=>{
 const f=fixture(),{sim,eco,s,id}=f;
 const purchase=contactOptions(sim,id).find(a=>a.id==='appearance_paste');assert.ok(purchase);
 f.bind();const before=JSON.stringify(s);sim.rng=()=>{throw Error('conversation must not roll');};
 assert.deepEqual(contactOptions(sim,id),[]);
 assert.equal(contactPreview(sim,id,purchase,eco).blocked,true);
 for(const action of ['appearance_paste','ch_scribe_secret','ap_disguise','if_loan','fd_explain'])assert.ok(contactResolve(sim,eco,id,action).error,action);
 assert.deepEqual(contactFollowups(sim,id,{actionId:'ch_scribe_secret',success:true}),[]);
 assert.deepEqual(socialOptions(sim,id),[]);assert.ok(socialPreview(sim,id,{id:'befriend'}).blocked);assert.ok(socialResolve(sim,id,'befriend').error);
 const exchange=restraintConversation(s,id);assert.match(exchange.dialogue[0].text,/绳头.*生意.*松绑/);
 assert.deepEqual(restraintReplies(s,id).map(a=>a.mode),['lasso','endTalk']);
 assert.equal(JSON.stringify(s),before,'preview and refusals change no money, facts, relationship or deck');
 f.release();assert.ok(contactOptions(sim,id).some(a=>a.id===purchase.id));
});
test('lead, fixed and lawful custody have factual replies, without invented guilt or rewards',()=>{
 const f=fixture('thief');f.s.facts.publicWarrant=true;f.bind();
 assert.ok(f.n.restraint.lawful);assert.ok(f.n.inCustody);
 const lead=restraintConversation(f.s,f.id);assert.match(lead.dialogue[0].text,/绳头.*到案.*不能替我认罪/);
 resolveRestraint(f.sim,f.eco,f.id,'fix');assert.match(restraintConversation(f.s,f.id).dialogue[0].text,/手脚都捆着/);
 const porter=fixture('porter');porter.bind();assert.match(restraintConversation(porter.s,porter.id).dialogue[0].text,/没法干活/);
 const artist=fixture('su');artist.bind();assert.doesNotMatch(restraintConversation(artist.s,artist.id).dialogue[0].text,/好感|赠|奖励|王爷/);
 const unlawful=fixture('thief');unlawful.s.law={served:['linxi-yan-theft']};unlawful.bind();unlawful.s.law.served=[];unlawful.s.facts.publicWarrant=true;
 assert.doesNotMatch(restraintConversation(unlawful.s,unlawful.id).dialogue[0].text,/既是押我到案/,'later paperwork does not rewrite the original restraint');
});
test('cancelled/browsed dialogue remains available; heard dialogue deduplicates across reload',()=>{
 const f=fixture();f.bind();const before=JSON.stringify(f.s),exchange=restraintConversation(f.s,f.id);
 restraintConversation(f.s,f.id);restraintReplies(f.s,f.id);assert.equal(JSON.stringify(f.s),before);
 assert.ok(restraintConversation(f.s,f.id),'cancel is no completion');
 assert.equal(finishRestraintConversation(f.s,f.id,exchange),true);
 assert.equal(restraintConversation(f.s,f.id),null);
 assert.equal(finishRestraintConversation(f.s,f.id,exchange),false);
 const restored=new Simulation(JSON.parse(JSON.stringify(f.s)));assert.equal(restraintConversation(restored.s,f.id),null);
 assert.equal(restraintReplies(restored.s,f.id).length,2,'release remains available after hearing');
 resolveRestraint(f.sim,f.eco,f.id,'fix');assert.ok(restraintConversation(f.s,f.id),'changed knot reopens its factual reply');
});
test('an interrupted or replaced binding never completes an old dialogue callback',()=>{
 for(const mutate of [f=>f.release(),f=>{f.release();f.bind();},f=>resolveRestraint(f.sim,f.eco,f.id,'fix'),f=>{f.n.hp=0;}]){
  const f=fixture();f.bind();const exchange=restraintConversation(f.s,f.id);mutate(f);
  const before=JSON.stringify(f.s);assert.equal(finishRestraintConversation(f.s,f.id,exchange),false);assert.equal(JSON.stringify(f.s),before);
 }
});
test('dead, stunned, muted and sleeping NPCs cannot speak while bound',()=>{
 for(const patch of [{hp:0},{stunnedUntil:99999},{muteUntil:99999},{life:{activity:'sleep'}},{life:{activity:'doze'}}]){
  const f=fixture();f.bind();Object.assign(f.n,patch);assert.equal(restraintConversation(f.s,f.id),null);assert.deepEqual(restraintReplies(f.s,f.id),[]);
 }
});
test('news and pending thanks wait for release without losing clues or consuming the deck',()=>{
 const f=fixture('tea_host'),{sim,s,id}=f,draw=peek(s,'talk',id);assert.ok(draw?.candidates?.length);
 const d=deckState(s),echo={id:997,who:id,subject:'player',cause:33,template:'thanks_letter',channel:'talk',due:s.day,line:'先前多谢照看。'};
 d.echoes.push(echo);f.bind();const before=JSON.stringify(s);
 assert.equal(peek(s,'talk',id),null);assert.equal(commitDeal(sim,draw,id,pickEvent(draw,id)),null);
 assert.equal(pendingEcho(s,id),null);assert.equal(seesEchoPlayer(s,id,{x:0,z:0},{x:0,z:2},0,true),false);
 assert.deepEqual(echoChoices(s,echo),[]);assert.ok(answerEcho(sim,echo.id,'accept').error);
 assert.equal(JSON.stringify(s),before);f.release();assert.equal(pendingEcho(s,id),echo);assert.ok(peek(s,'talk',id));
});
test('existing bound saves work; talking and release keep evidence, identity attribution and relation',()=>{
 const f=fixture(),{s,sim,eco,id,n}=f;f.bind();
 n.awareness={state:'warn',caseOpen:true,believedIdentity:'gate_merchant'};n.relation=-19;s.wanted=2;
 s.facts.testEvidence=true;s.player.face={id:'gate_merchant',serial:8,until:99999};
 const restored=new Simulation(JSON.parse(JSON.stringify(s)));restored.save=()=>{};const restoredEco=new Ecosystem(restored);restoredEco.positions=eco.positions;
 const exchange=restraintConversation(restored.s,id);assert.ok(exchange);assert.doesNotMatch(exchange.dialogue[0].text,/易容|冒名|赵成|真面目/);
 finishRestraintConversation(restored.s,id,exchange);
 const money=restored.s.player.money;assert.ok(resolveRestraint(restored,restoredEco,id,'release').success);
 assert.equal(restored.s.people[id].relation,-19);assert.equal(restored.s.people[id].awareness.believedIdentity,'gate_merchant');
 assert.ok(restored.s.people[id].awareness.caseOpen);assert.equal(restored.s.wanted,2);assert.ok(restored.s.facts.testEvidence);assert.equal(restored.s.player.money,money);
 assert.ok(resolveRestraint(restored,restoredEco,id,'release').error);assert.equal(restoredEco.items('player').filter(i=>i.type==='rope').length,1);
});
