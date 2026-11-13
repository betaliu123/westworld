import test from 'node:test';
import assert from 'node:assert/strict';
import {Simulation,newArrival} from '../src/simulation.js';
import {Ecosystem} from '../src/ecosystem.js';
import {actionCandidates,startActionCard,actionCardStep,beginActionGuidance,finishActionGuidance} from '../src/action-cards.js';
import {ledgerHTML} from '../src/jianghu-ui.js';

globalThis.window={lucide:{icons:{},createElement:()=>({outerHTML:'<svg></svg>'})}};
const esc=x=>String(x??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;');
function visit(){
 const sim=new Simulation(newArrival());sim.save=()=>{};const s=sim.s,eco=new Ecosystem(sim),id='old_constable';
 Object.assign(s.player,{x:0,z:12,hp:100,satiety:80});s.npcClock=1;
 Object.assign(s.people[id],{metPlayer:true,relation:10,life:{activity:'idle'},facing:0});
 const pos={[id]:{x:0,z:7}},e=startActionCard(sim,actionCandidates(s,pos).find(c=>c.template==='guide'),pos);
 pos[id]={x:1.1,z:12.3};s.people[id].facing=Math.atan2(-1.1,-.3);actionCardStep(sim,eco,.1,pos);
 e.dialogueChoice={topic:'river_fence'};
 const telling=beginActionGuidance(sim,id,e.cardId,pos);
 return {sim,s,e,finish:cancelled=>finishActionGuidance(sim,id,e.cardId,pos,[],cancelled,telling.token)};
}
function legacy(s){
 s.chronicle={seq:2,diaries:[],deeds:[
  {id:1,day:1,at:1038,clock:'上午 09:38',title:'再度相逢',text:'杜老捕见到你，想说一件尚未谈过的事。',target:'old_constable',valence:'deed',witnesses:['old_constable']},
  {id:2,day:1,at:1069,clock:'上午 10:09',title:'上前提点',text:'杜老捕当面提起「朽了的河栅」。',target:'old_constable',cause:1,valence:'deed',witnesses:['old_constable']}
 ]};
 const line='有件事你兴许用得上：西边那道河栅泡了十几年，木头早糟了。';
 s.deck.cards=[
  {id:1,day:1,at:1038,clock:'上午 09:38',card:'route',speaker:'old_constable',event:'action:guide',actionTemplate:'guide',cause:1,title:'上前提点',line,lead:s.chronicle.deeds[1].text,outcome:'completed'},
  {id:2,day:1,at:1069,clock:'上午 10:09',card:'route',speaker:'old_constable',event:'river_fence',title:'朽了的河栅',line,lead:'关西河道上的木栅泡了多年，木头已经糟了。'}
 ];
 s.deck.echoes=[];return s;
}
test('a completed visit updates its original card at completion time and grants its clue once',()=>{
 const f=visit(),firstId=f.e.cardId,startAt=f.s.deck.cards[0].at;f.s.time+=31;
 const card=f.finish(false);assert.ok(card);assert.equal(card.id,firstId);assert.equal(f.s.deck.cards.length,1);
 assert.ok(card.at>startAt);assert.equal(card.title,'朽了的河栅');assert.match(card.lead,/木头已经糟了/);
 assert.equal(f.s.deck.leads.length,1);assert.equal(f.s.deck.leads[0].id,firstId);assert.equal(f.finish(false),null);
 const before=JSON.stringify(f.s),html=ledgerHTML(f.s,esc);assert.equal(JSON.stringify(f.s),before);
 assert.equal(html.split(esc(card.line)).length-1,1);assert.doesNotMatch(html,/上前提点|再度相逢|当面提起/);
 assert.match(html,new RegExp('id="deed-'+card.deed+'"'));assert.match(html,new RegExp('id="deed-'+card.cause+'"'));
 const saved=new Simulation(JSON.parse(before));assert.equal(ledgerHTML(saved.s,esc).split(esc(card.line)).length-1,1);
});
test('legacy duplicate guide cards and their bookkeeping rows fold without mutating saved facts',()=>{
 const f=visit(),s=legacy(f.s),before=JSON.stringify(s),html=ledgerHTML(s,esc);
 assert.equal((html.match(/<article class="jh-card/g)||[]).length,1);
 assert.doesNotMatch(html,/上前提点|再度相逢|当面提起|上午 09:38/);assert.match(html,/上午 10:09/);
 assert.match(html,/id="deed-1"/);assert.match(html,/id="deed-2"/);
 assert.match(ledgerHTML(s,esc,true),/再度相逢/);assert.equal(JSON.stringify(s),before);
});
test('equal wording alone never folds another visit, speaker, day or interrupted result',()=>{
 for(const mode of ['speaker','time','cause','interrupted']){
  const {s}=visit();legacy(s);
  if(mode==='speaker')s.deck.cards[1].speaker='tea_host';
  if(mode==='time')s.deck.cards[1].at+=1000;
  if(mode==='cause')s.chronicle.deeds[1].cause=99;
  if(mode==='interrupted')s.chronicle.deeds[1].text='杜老捕的来访中断，尚未谈完。';
  assert.equal((ledgerHTML(s,esc).match(/<article class="jh-card/g)||[]).length,2,mode);
 }
});
test('cancelled guidance grants no clue and never exposes the uncompleted topic',()=>{
 const f=visit();assert.equal(f.finish(true),null);assert.equal(f.s.deck.leads.length,0);
 assert.doesNotMatch(ledgerHTML(f.s,esc),/朽了的河栅|西边那道河栅/);
});
test('finishing a long visit retains intervening records and puts the completed card last',()=>{
 const f=visit(),other={id:++f.s.deck.seq,day:f.s.day,card:'route',title:'另一件事',event:'other'};
 f.s.deck.cards.push(other);f.s.day++;f.s.time=1;const card=f.finish(false);
 assert.ok(card);assert.equal(f.s.deck.cards.length,2);assert.equal(f.s.deck.cards[0],other);
 assert.equal(f.s.deck.cards.at(-1),card);assert.equal(card.day,f.s.day);
 assert.doesNotMatch(ledgerHTML(f.s,esc),/上前提点|再度相逢/);
});
