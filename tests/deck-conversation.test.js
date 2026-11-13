import test from 'node:test';
import assert from 'node:assert/strict';
import {Simulation,newArrival} from '../src/simulation.js';
import {CARDS,DECKS,deckState,eventsFor,eventCandidates,dealContext,peek,commitDeal,pickEvent} from '../src/event-deck.js';

function fresh(){const sim=new Simulation(newArrival());sim.save=()=>{};return sim;}
function exhaust(s){const d=deckState(s);for(const e of eventsFor(s))d.used[e.id]=s.day;return d;}

test('asking for news skips a rest beat and delivers a real lead',()=>{
 const sim=fresh(),d=deckState(sim.s);d.pointer.gate=DECKS.gate.indexOf('rest');
 const before=JSON.stringify(d),draw=peek(sim.s,'talk','tea_host');
 assert.notEqual(draw?.card,'rest');assert.ok(draw?.candidates?.length);
 assert.ok(draw.skipped.includes('rest'));assert.equal(JSON.stringify(d),before,'preview does not consume a beat');
 const result=commitDeal(sim,draw,'tea_host',pickEvent(draw,'tea_host'));
 assert.ok(result.event&&result.line&&result.lead);assert.ok(d.leads.some(l=>l.event===result.event));
});

test('exhausted news has no dialogue entry for any persona, even after a new day or reload',()=>{
 const sim=fresh();exhaust(sim.s);
 for(let round=0;round<2;round++){
  for(const id of ['tea_host','gate_merchant','scribe','traveler','gate_guard','beggar','su'])
   assert.equal(peek(sim.s,'talk',id),null,id+' must not substitute shared small talk');
  sim.s=JSON.parse(JSON.stringify(sim.s));sim.s.day++;
 }
});

test('a speaker with no usable event cannot invent news while other speakers retain theirs',()=>{
 const sim=fresh();
 assert.equal(peek(sim.s,'talk','beggar'),null);
 assert.ok(peek(sim.s,'talk','tea_host')?.candidates?.length);
});

test('news never sends a speaker to themselves in either chapter or stage',()=>{
 for(const chapterVersion of [1,2])for(const enteredCity of [false,true]){
  const sim=fresh();sim.s.chapterVersion=chapterVersion;sim.s.facts.enteredCity=enteredCity;
  for(const id of Object.keys(sim.s.people))for(const card of Object.keys(CARDS)){
   assert.ok(eventCandidates(sim.s,card,id).every(e=>e.place?.person!==id),`${chapterVersion}/${enteredCity}/${id}/${card}`);
  }
 }
});

test('porter has no self-referral news while the tea host can introduce the clothing route',()=>{
 const sim=fresh(),d=deckState(sim.s);
 assert.equal(peek(sim.s,'talk','porter'),null);
 assert.equal(d.heard.porter,undefined);
 const draw=peek(sim.s,'talk','tea_host'),route=draw.candidates.find(e=>e.id==='merchant_escort');
 assert.equal(route.place.person,'porter');
 const ctx=dealContext(sim.s,draw,'tea_host');
 assert.match(ctx.candidates.find(e=>e.id===route.id).fact,/周大石|役夫/);
 assert.doesNotMatch(JSON.stringify(route),/辰时|申时|点名|误了时候/);
});

test('pending aftermath still wins when all normal news is exhausted',()=>{
 const sim=fresh(),d=exhaust(sim.s);d.heard.tea_host=sim.s.day;
 d.echoes.push({id:99,who:'tea_host',channel:'talk',due:sim.s.day,delivered:false,line:'先前那件事，我还记着。'});
 const draw=peek(sim.s,'talk','tea_host');assert.equal(draw.card,'echo');assert.equal(draw.echo.id,99);
});

test('rest is silent pacing; it never fabricates an NPC line or news quota',()=>{
 const sim=fresh(),d=deckState(sim.s);d.pointer.gate=DECKS.gate.indexOf('rest');
 const draw=peek(sim.s,'rest','tea_host');assert.equal(draw.card,'rest');
 const card=commitDeal(sim,draw,'tea_host');
 assert.equal(card.line,'');assert.equal(card.lead,'');assert.equal(d.heard.tea_host,undefined);
 assert.equal(d.leads.length,0);assert.equal(d.pointer.gate,draw.index+1);
});

test('a missing or empty content draw does not consume news or advance the deck',()=>{
 const sim=fresh(),d=deckState(sim.s),before=JSON.stringify(d);
 assert.equal(commitDeal(sim,null,'tea_host'),null);
 assert.equal(commitDeal(sim,{card:'route',index:0,candidates:[],skipped:[]},'tea_host'),null);
 assert.equal(JSON.stringify(d),before);
});
