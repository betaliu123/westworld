import test from 'node:test';
import assert from 'node:assert/strict';
import {Simulation,newArrival} from '../src/simulation.js';
import {DECKS,peek,commitDeal,pickEvent,validLine,recordDeed,applyAftermath,echoOptions,deliverMail,deckState,dealContext,aftermathContext,stageOf} from '../src/event-deck.js';

const fresh=()=>{const sim=new Simulation(newArrival());sim.save=()=>{};return sim;};

test('the deck is a fixed sequence: dealing advances the pointer without shuffling',()=>{
 const sim=fresh(),s=sim.s;assert.equal(stageOf(s),'gate');
 const first=peek(s,'talk','tea_host');assert.equal(first.card,DECKS.gate[0]);
 assert.deepEqual(peek(s,'talk','tea_host'),first,'peeking twice draws nothing');
 commitDeal(sim,first,'tea_host',pickEvent(first,'tea_host',null));
 assert.equal(deckState(s).pointer.gate,1);
 assert.equal(peek(s,'talk','tea_host'),null,'the same person has nothing new today');
});

test('cards the player already knows are skipped instead of repeated',()=>{
 const sim=fresh(),s=sim.s;s.player.inventory.push('旧差役服');
 s.facts.gatePassTaken=true;s.facts.princeInvitation=true;s.facts.merchantContract={agreed:true};
 const draw=peek(s,'talk','tea_host');
 assert.ok(!draw.candidates?.some(e=>['uniform_rack','merchant_pass','prince_waiting','merchant_escort'].includes(e.id)));
 assert.notEqual(draw.card,'route','every route this speaker could mention is already known');
 assert.ok(draw.skipped.includes('route'));
});

test('a badly hurt player gets the aid card first, and it does not advance the deck',()=>{
 const sim=fresh(),s=sim.s;s.player.hp=20;
 const draw=peek(s,'talk','tea_host');assert.equal(draw.card,'aid');assert.ok(draw.urgent);
 const card=commitDeal(sim,draw,'tea_host',pickEvent(draw,'tea_host',null));
 assert.equal(s.player.hp,32);assert.equal(deckState(s).pointer.gate,0);assert.equal(card.card,'aid');
 assert.equal(s.people.tea_host.favorOwed,1);
});

test('AI may only choose among candidates with a compliant line; otherwise local lines are used',()=>{
 const sim=fresh(),s=sim.s,draw=peek(s,'talk','tea_host');
 const id=draw.candidates[0].id;
 assert.equal(pickEvent(draw,'tea_host',{event:'invented',line:'城东有宝藏。'}).ai,false);
 assert.equal(pickEvent(draw,'tea_host',{event:id,line:'去偷那件衣服，完成任务。'}).ai,false);
 assert.equal(pickEvent(draw,'tea_host',{event:id,line:'有3个守卫。'}).ai,false);
 const ok=pickEvent(draw,'tea_host',{event:id,line:'那身差衣还晾在驿舍，补衣人说明日交回。',reason:'茶娘常见驿舍来往'});
 assert.equal(ok.ai,true);assert.equal(ok.event.id,id);
 assert.ok(validLine('风大，夜里关门要早些。'));assert.ok(!validLine('一。二。三。'));
 const ctx=dealContext(s,draw,'tea_host');assert.equal(ctx.mode,'deal');assert.ok(ctx.candidates.every(c=>c.fact&&c.id));
});

test('witnessed deeds become rumors carried by real witnesses, once per deed',()=>{
 const sim=fresh(),s=sim.s;
 recordDeed(sim,'actionWitnessed',{text:'你从行商腰间摸走了路引。',dialogue:[{id:'tea_host',text:'我看见了。'}]});
 const options=echoOptions(s);
 assert.ok(options.length);assert.ok(options.every(o=>o.who!=='gate_guard'||o.teller==='tea_host'));
 assert.ok(options.every(o=>o.template==='grudge'?o.who==='tea_host':o.teller==='tea_host'));
 const before=JSON.stringify(s.people);
 const {diary,echoes}=applyAftermath(sim,null);
 assert.ok(diary.lines.length>=1);assert.ok(echoes.length>=1&&echoes.length<=3);
 assert.notEqual(JSON.stringify(s.people),before,'the hearer remembers what was said');
 assert.equal(echoOptions(s).length,0,'the same night is not inferred twice');
 const again=applyAftermath(sim,null);assert.equal(again.echoes.length,0);
});

test('AI aftermath cannot invent people: picks are indexed into local options and lines validated',()=>{
 const sim=fresh(),s=sim.s;
 recordDeed(sim,'npc',{id:'gate_merchant',text:'你把一张饼递给赵行商。'});
 const ctx=aftermathContext(s);assert.equal(ctx.options.length,1);
 const r=applyAftermath(sim,{echoes:[{i:7,line:'无中生有。'},{i:0,line:'饼还热着，多谢你。',reason:'他饿了半日'}],diary:['关前递了一张饼。','行商道了声谢。']});
 assert.equal(r.echoes.length,1);assert.equal(r.echoes[0].ai,true);assert.equal(r.diary.ai,true);
 assert.equal(r.echoes[0].channel,'mail');
 assert.equal(deliverMail(sim).length,0,'a letter is not delivered the same night');
 s.day++;const cards=deliverMail(sim);assert.equal(cards.length,1);
 assert.equal(s.mail.filter(m=>m.echo===r.echoes[0].id).length,1);
 assert.equal(deliverMail(sim).length,0,'delivered once');
});

test('deeds done after the night is read wait for the next night, and the diary keeps the day they happened',()=>{
 const sim=fresh(),s=sim.s;
 recordDeed(sim,'npc',{id:'gate_merchant',text:'你把一张饼递给赵行商。'});
 const upTo=s.chronicle.seq,day=s.day;s.day++;
 recordDeed(sim,'actionWitnessed',{text:'你打晕了驿舍补衣人。',dialogue:[{id:'relay',text:'住手！'}]});
 const r=applyAftermath(sim,null,upTo);
 assert.equal(r.diary.day,day);assert.ok(r.echoes.every(e=>e.template==='thanks_letter'));
 assert.ok(echoOptions(s).some(o=>o.template==='grudge'),'the later deed is still waiting');
});

test('a rumor is delivered by its hearer when talked to, before the normal sequence',()=>{
 const sim=fresh(),s=sim.s;
 recordDeed(sim,'actionWitnessed',{text:'你打晕了驿舍补衣人。',dialogue:[{id:'relay',text:'住手！'}]});
 const {echoes}=applyAftermath(sim,null);const grudge=echoes.find(e=>e.template==='grudge');
 assert.ok(grudge);const draw=peek(s,'talk','relay');
 assert.equal(draw.card,'echo');assert.equal(draw.echo.id,grudge.id);
 const card=commitDeal(sim,draw,'relay',{});assert.equal(card.echo,grudge.id);assert.ok(grudge.delivered);
});
