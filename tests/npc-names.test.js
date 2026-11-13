import test from 'node:test';
import assert from 'node:assert/strict';
import {Simulation,newArrival} from '../src/simulation.js';
import {Ecosystem} from '../src/ecosystem.js';
import {npcName,npcNameView,rememberNpcConversation} from '../src/npc-names.js';
import {npcInfo} from '../src/npc-discovery.js';
import {meet,knownOrganization} from '../src/factions.js';
import {knowsName} from '../src/impersonation.js';
import {chapterResolve} from '../src/chapter.js';
const setup=state=>{const sim=new Simulation(state||newArrival(),()=>0),eco=new Ecosystem(sim,[]);return {sim,eco};};

test('encounter, probe and opening a menu cannot reveal an ordinary name',()=>{
 const {sim,eco}=setup();meet(sim,'porter');sim.s.people.porter.probed=true;
 assert.equal(npcName(sim.s,'porter'),'挑夫');assert.equal(npcInfo(sim,eco,'porter').name,'挑夫');
 assert.equal(knownOrganization(sim).nodes.find(n=>n.id==='porter').name,'挑夫');
 for(const line of [{id:'porter',text:'（别挡着路。）'},{id:'porter',text:'扁担响了。',overheard:true},{id:'porter',text:'他挑起担子。',narration:true}])rememberNpcConversation(sim,line);
 assert.equal(knowsName(sim,'porter'),false);
});
test('first displayed ordinary reply learns the name once and restores it without rewards',()=>{
 const {sim,eco}=setup(),before=structuredClone(sim.s.player);let saves=0;sim.listeners.push(t=>{if(t==='save')saves++;});
 const line={id:'porter',text:'你也想随队抬箱？'};rememberNpcConversation(sim,line);rememberNpcConversation(sim,line);
 assert.equal(saves,1);assert.equal(npcInfo(sim,eco,'porter').name,'周大石');assert.equal(knowsName(sim,'porter'),true);
 assert.deepEqual(sim.s.player,before);assert.equal(sim.s.facts.nameSources.porter.source,'当面交谈');
 const loaded=setup(JSON.parse(JSON.stringify(sim.s)));assert.equal(npcName(loaded.sim.s,'porter'),'周大石');
});
test('knowing an ordinary name does not reveal a secret affiliation',()=>{
 const {sim,eco}=setup();rememberNpcConversation(sim,{id:'scribe',text:'你想刻什么字？'});
 assert.equal(npcInfo(sim,eco,'scribe').name,'刻字人');assert.equal(npcInfo(sim,eco,'scribe').faction,'？？？');
 assert.ok(!sim.s.facts.scribeIdentity);
});
test('reserved names stay hidden through ordinary replies and probes',()=>{
 const {sim,eco}=setup();for(const id of ['traveler','gate_merchant','thief']){meet(sim,id);sim.s.people[id].probed=true;rememberNpcConversation(sim,{id,text:'有什么事？'});assert.equal(npcNameView(sim.s,id).nameKnown,false);assert.equal(knowsName(sim,id),false);}
 assert.equal(npcInfo(sim,eco,'traveler').faction,'？？？');assert.equal(npcName(sim.s,'thief'),'闲汉');
 sim.s.facts.princeAlias=true;assert.equal(npcName(sim.s,'traveler'),'赵闲舟');assert.equal(knowsName(sim,'traveler'),true);assert.equal(npcInfo(sim,eco,'traveler').faction,'？？？');
 sim.s.chapter={done:{yan_secret:true}};assert.equal(npcName(sim.s,'thief'),'燕七');assert.equal(knowsName(sim,'thief'),true);
});
test('merchant name commits only after the authored reply, with the same knowledge used for impersonation',()=>{
 const {sim,eco}=setup();const r=chapterResolve(sim,eco,'gate_merchant','ch_merchant_name',{deferSpeech:true});
 assert.ok(r.pendingSpeech);rememberNpcConversation(sim,r.dialogue[0]);assert.equal(npcName(sim.s,'gate_merchant'),'行商');assert.equal(knowsName(sim,'gate_merchant'),false);
 chapterResolve(sim,eco,'gate_merchant','ch_merchant_name',{confirmedText:r.text});
 assert.equal(npcName(sim.s,'gate_merchant'),'赵成');assert.equal(knowsName(sim,'gate_merchant'),true);
});
test('carrying someone’s document or clothing is not reading their name',()=>{
 const {sim}=setup();sim.s.player.inventory.push('他人的路引','旧差役服');
 assert.equal(knowsName(sim,'gate_merchant'),false);assert.equal(npcName(sim.s,'gate_merchant'),'行商');
 rememberNpcConversation(sim,{id:'relay',text:'六文，针脚刚补好。'});assert.ok(!sim.s.facts.runnerNameKnown);
});
test('old v2 saves recover completed replies, not menu/probe flags or pending exchanges',()=>{
 const s=newArrival();s.people.porter.heardTopics={identity:true};s.people.su.metPlayer=true;s.people.su.probed=true;
 s.intelligence={people:{porter:true,su:true,traveler:true},clues:{}};
 s.history=[{motion:'talk',roll:null,dialogue:[{id:'tea_host',text:'请用茶。'}]},{motion:'talk',roll:null,pendingSpeech:true,dialogue:[{id:'elder',text:'请坐。'}]}];
 const {sim}=setup(s);assert.equal(npcName(s,'porter'),'周大石');assert.equal(npcName(s,'tea_host'),'宋茶娘');assert.equal(npcName(s,'su'),'行脚琴师');assert.equal(npcName(s,'elder'),'说书人');assert.equal(npcName(s,'traveler'),'锦衣客');
 const saved=JSON.stringify(sim.s);new Simulation(sim.s);assert.equal(JSON.stringify(sim.s),saved);
});
test('a completed credible introduction can supply another person’s name',()=>{
 const {sim,eco}=setup();sim.s.chapter={done:{tea_worry:true}};const r=chapterResolve(sim,eco,'tea_host','ch_tea_porter');assert.ok(!r.error);
 assert.equal(npcName(sim.s,'porter'),'周大石');assert.equal(knowsName(sim,'porter'),true);
});
