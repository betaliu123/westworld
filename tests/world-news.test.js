import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Simulation,newArrival,newGame} from '../src/simulation.js';
import {Ecosystem} from '../src/ecosystem.js';
import {convoyState,inspectConvoyCargo,recordConvoyTheft} from '../src/convoy.js';
import {recordConvoyAftermath} from '../src/convoy-aftermath.js';
import {societyStep} from '../src/gate-society.js';
import {WORLD_NEWS_LINES} from '../src/world-news-lines.js';
import {activeWorldNews,recordWorldNews,syncWorldNews,shareWorldNews,newsReady,newsContext,worldNewsLine,commitWorldNewsLine,createNewsDirector,worldNewsStep,nearbyWorldNews} from '../src/world-news.js';

function setup(){
 const sim=new Simulation(newArrival()),s=sim.s;sim.save=()=>{};const eco=new Ecosystem(sim);convoyState(s);
 for(const n of Object.values(s.people))Object.assign(n,{hp:100,life:{activity:'idle'},awareness:null});
 eco.positions={porter:{x:0,z:0},old_constable:{x:2,z:0},tea_host:{x:4,z:0},traveler:{x:6,z:0}};
 Object.assign(s.player,{x:4,z:2});s.time=10;s.npcClock=10;
 const world={playing:true,t:10,obstacles:[],onWorldNewsSpeech:line=>line.onShown()};
 return {sim,s,eco,world};
}
const news=s=>recordWorldNews(s,{id:'convoy-loss',type:'convoy_loss',knowers:['porter']});

test('unseen theft stays private until actual inventory discovery, without culprit attribution',()=>{
 const {sim,s,eco}=setup(),item=eco.s.items.find(i=>i.convoyCargo);eco.transfer(item,'player','stolen');
 syncWorldNews(s);assert.deepEqual(activeWorldNews(s),[]);
 const c=s.convoy;eco.positions.porter={x:c.x,z:c.z+1};inspectConvoyCargo(sim,eco,eco.positions);syncWorldNews(s);
 const event=activeWorldNews(s)[0];assert.equal(event.type,'convoy_loss');assert.deepEqual(Object.keys(event.known),['porter']);
 assert.equal(s.convoy.aftermath,undefined);assert.equal(s.wanted,0);assert.ok(!JSON.stringify(event).includes('subject'));
});
test('failed witnessed attempt is not reported as lost cargo; a successful witnessed theft is',()=>{
 const {sim,s,eco}=setup(),item=eco.s.items.find(i=>i.convoyCargo),incident={witnesses:['porter'],identities:{porter:'fu'},x:0,z:0};
 recordConvoyAftermath(sim,incident,item);syncWorldNews(s);assert.equal(activeWorldNews(s).length,0);
 eco.transfer(item,'player','stolen');recordConvoyTheft(sim,eco,incident,item);syncWorldNews(s);
 const event=activeWorldNews(s)[0];assert.equal(event.known.porter.direct,true);assert.ok(!JSON.stringify(newsContext(s,event)).includes('"fu"'));
 assert.equal(s.convoy.aftermath.known.porter.subject,'fu');
});
test('missing cargo is not announced by bound, mute or seriously injured crew; recovery permits discovery',()=>{
 const {sim,s,eco}=setup(),item=eco.s.items.find(i=>i.convoyCargo);eco.transfer(item,'player','stolen');const c=s.convoy;eco.positions={porter:{x:c.x,z:c.z+1}};
 for(const disabled of [{restraint:{}},{muteUntil:99},{hp:1}]){const n=s.people.porter;s.people.porter={...n,...disabled};inspectConvoyCargo(sim,eco,eco.positions);assert.equal(c.missing,undefined);s.people.porter=n;}
 inspectConvoyCargo(sim,eco,eco.positions);assert.equal(c.missing,true);assert.equal(c.missingObserver,'porter');
});
test('news travels through present conscious neighbours and preserves its source, never through walls',()=>{
 const {s,eco}=setup(),event=news(s);
 assert.equal(shareWorldNews(s,event,'porter','tea_host',eco.positions,[{x:2,z:0,w:.5,d:8}]),false);
 assert.equal(shareWorldNews(s,event,'porter','traveler',eco.positions),false);
 for(const disabled of [{hp:30},{restraint:{}},{inCustody:true},{stunnedUntil:99},{muteUntil:99},{life:{activity:'sleep'}},{drowning:true},{burning:true},{life:{night:true}},{awareness:{state:'fight'}}]){
  const original=s.people.old_constable;s.people.old_constable={...original,...disabled};
  assert.equal(shareWorldNews(s,event,'porter','old_constable',eco.positions),false);s.people.old_constable=original;
 }
 assert.ok(shareWorldNews(s,event,'porter','old_constable',eco.positions));assert.equal(event.known.old_constable.source,'porter');assert.equal(event.known.old_constable.direct,false);
 assert.ok(shareWorldNews(s,event,'old_constable','tea_host',eco.positions));assert.equal(event.known.tea_host.source,'old_constable');
});
test('spread is paced, cannot cascade in one tick and pauses during dialogue',()=>{
 const {sim,s,eco,world}=setup(),event=news(s);world.onWorldNewsSpeech=()=>false;s.time=15;
 worldNewsStep(sim,eco,world);assert.deepEqual(Object.keys(event.known),['porter','old_constable']);
 worldNewsStep(sim,eco,world);assert.equal(event.known.tea_host,undefined);
 world.locked=true;s.time=30;worldNewsStep(sim,eco,world);assert.equal(event.known.tea_host,undefined);
 world.locked=false;worldNewsStep(sim,eco,world);assert.ok(event.known.tea_host);
});
test('new gossip replaces old tea clues while hot; stale convoy demands never resume',()=>{
 const {sim,s,eco,world}=setup();news(s);shareWorldNews(s,s.worldNews.events['convoy-loss'],'porter','old_constable',eco.positions);
 let lines=[];sim.listeners.push((type,data)=>{if(type==='npcRoutine')lines.push(data.text);});
 s.gateSociety={nextTalk:0,index:1};eco.s.time=30;s.convoy.closed=true;societyStep(sim,eco,world,1);
 assert.deepEqual(lines,[]);assert.equal(s.knowledge?.clues?.tax,undefined);
 s.day=4;s.time=0;s.gateSociety.nextTalk=0;s.gateSociety.index=1;eco.s.time=800;societyStep(sim,eco,world,1);assert.deepEqual(lines,[]);
});
test('world news never changes money, relations, evidence, clues or reputation',()=>{
 const {sim,s,eco}=setup(),event=news(s);
 const snapshot=()=>JSON.stringify({money:s.player.money,relations:Object.values(s.people).map(n=>n.relation),wanted:s.wanted,reputation:s.reputation,knowledge:s.knowledge,items:eco.s.items,history:s.history});
 const before=snapshot();const line=worldNewsLine(s,event,'porter');commitWorldNewsLine(sim,event,line,eco.positions);
 assert.equal(snapshot(),before);assert.ok(!line.text.includes('你'));assert.ok(event.known.old_constable);
});
test('two-day expiry, line deduplication and cooldown survive reload and rest without refreshing',()=>{
 const {sim,s,eco}=setup(),event=news(s),first=worldNewsLine(s,event,'porter');commitWorldNewsLine(sim,event,first,eco.positions);
 const copy=JSON.parse(JSON.stringify(s)),restored=new Simulation(copy);restored.save=()=>{};
 const old=copy.worldNews.events['convoy-loss'];assert.notEqual(worldNewsLine(copy,old,'porter').lineId,first.lineId);assert.equal(copy.worldNews.nextSpeech,34);
 copy.day=3;copy.time=11;assert.deepEqual(activeWorldNews(copy),[]);news(copy);assert.equal(old.expires,490);assert.deepEqual(activeWorldNews(copy),[]);
});
test('late gossip is less frequent and emitted only near a visible, available speaker',()=>{
 const {sim,s,eco,world}=setup(),event=news(s);let emitted=0;world.onWorldNewsSpeech=line=>{emitted++;return line.onShown();};
 Object.assign(s.player,{x:100,z:100});worldNewsStep(sim,eco,world);assert.equal(emitted,0);
 Object.assign(s.player,{x:1,z:1});world.obstacles=[{x:.5,z:.5,w:8,d:.1}];worldNewsStep(sim,eco,world);assert.equal(emitted,0);
 world.obstacles=[];s.people.porter.muteUntil=100;worldNewsStep(sim,eco,world);assert.equal(emitted,0);
 s.people.porter.muteUntil=0;worldNewsStep(sim,eco,world);assert.equal(emitted,1);assert.equal(s.worldNews.nextSpeech,34);
 s.day=2;s.time=20;const line=worldNewsLine(s,event,'porter');commitWorldNewsLine(sim,event,line,eco.positions);assert.equal(s.worldNews.nextSpeech,308);
});
test('speech rejection consumes no line, and stale or interrupted visible speech is invalidated',()=>{
 const {sim,s,eco,world}=setup(),event=news(s);world.onWorldNewsSpeech=()=>false;worldNewsStep(sim,eco,world);assert.equal(event.spoken.porter,undefined);
 let line;world.onWorldNewsSpeech=l=>{line=l;return true;};worldNewsStep(sim,eco,world);assert.ok(line.valid());
 assert.equal(event.spoken.porter,undefined);world.combatReady=true;assert.equal(line.valid(),false);assert.equal(line.onShown(),false);assert.equal(event.spoken.porter,undefined);world.combatReady=false;s.people.porter.hp=0;assert.equal(line.valid(),false);
});
test('nearby news suppresses ordinary chatter from other people, but yields when all knowers are absent or unfit',()=>{
 const {s,eco}=setup();news(s);const position=id=>eco.positions[id];assert.ok(nearbyWorldNews(s,position));
 s.people.porter.restraint={};assert.equal(nearbyWorldNews(s,position),false);s.people.porter.restraint=null;
 assert.equal(nearbyWorldNews(s,position,[{x:2,z:1,w:8,d:.2}]),false);Object.assign(s.player,{x:100,z:100});assert.equal(nearbyWorldNews(s,position),false);
});
test('DS is bounded to one request, uses anonymous public facts, ignores arbitrary text and invalid IDs',async()=>{
 const {sim,s}=setup(),event=news(s);let calls=0;
 const direct=createNewsDirector(async context=>{calls++;assert.equal(context.mode,'world_atmosphere');assert.ok(!JSON.stringify(context).includes('player'));return {ids:['worker:2','unknown:0','worker:2','worker:1'],text:'玩家偷走了花石纲'};});
 await direct(sim,event,true);await direct(sim,event,true);assert.equal(calls,1);assert.deepEqual(event.order,['worker:2','worker:1']);assert.equal(worldNewsLine(s,event,'porter').lineId,'worker:2');
 assert.ok(!worldNewsLine(s,event,'porter').text.includes('玩家'));
 const restored=new Simulation(JSON.parse(JSON.stringify(s)));restored.save=()=>{};await direct(restored,restored.s.worldNews.events[event.id],true);assert.equal(calls,1);
});
test('offline and late DS responses retain valid local lines and do not touch a new game',async()=>{
 const {sim,s}=setup(),event=news(s);let resolve,calls=0;const direct=createNewsDirector(()=>{calls++;return new Promise(r=>resolve=r);});
 await direct(sim,event,false);assert.equal(calls,0);assert.ok(worldNewsLine(s,event,'porter'));
 const pending=direct(sim,event,true);sim.s=newArrival();resolve({ids:['worker:2']});await pending;assert.equal(sim.s.worldNews,undefined);assert.deepEqual(event.order,[]);
 const other=setup(),e=news(other.s);await createNewsDirector(async()=>{throw Error('offline');})(other.sim,e,true);assert.equal(e.director,'local');assert.ok(worldNewsLine(other.s,e,'porter'));
});
test('other public events register only established participants; hidden ledger facts and v1 stay private',()=>{
 const {s}=setup();s.facts.taxLedgerLead=true;s.facts.ledgerDelivered=true;syncWorldNews(s);assert.equal(activeWorldNews(s).length,0);
 s.facts.convoyPeace=true;s.history.push({day:1,actionId:'ch_convoy_peace',success:true,dialogue:[{id:'qing',text:'收据两边各留一份。'}]});
 s.investigations={cases:[{id:1,type:'assault',at:10,witnesses:[{id:'traveler',subject:'fu'}],reports:[]}]};s.people.thief.custodyDelivered=true;syncWorldNews(s);
 assert.deepEqual(activeWorldNews(s).map(e=>e.type).sort(),['convoy_wages','public_arrest','public_injury']);assert.deepEqual(Object.keys(s.worldNews.events['convoy-wages'].known),['qing']);
 const v1=newGame();assert.equal(recordWorldNews(v1,{id:'x',type:'convoy_loss',knowers:['porter']}),null);syncWorldNews(v1);assert.equal(v1.worldNews,undefined);
});
test('all 72 reviewed DS lines match the audited batch and contain no hidden names or system language',()=>{
 const audit=JSON.parse(readFileSync(new URL('../docs/offline/world-news-lines.json',import.meta.url),'utf8'));assert.equal(audit.review,'approved');assert.deepEqual(WORLD_NEWS_LINES,audit.lines);
 let count=0;for(const roles of Object.values(audit.lines))for(const lines of Object.values(roles))for(const text of lines){count++;assert.ok(text.length<=48);assert.doesNotMatch(text,/玩家|系统|检定|梁中书|蔡京|赵闲舟|假扮|幕后|[<>]/);}
 assert.equal(count,72);assert.equal(audit.batches.length+audit.priorFailedCalls,4);
});
