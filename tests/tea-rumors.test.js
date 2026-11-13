import test from 'node:test';
import assert from 'node:assert/strict';
import {Simulation,newArrival,legacyArrival} from '../src/simulation.js';
import {Ecosystem} from '../src/ecosystem.js';
import {TEA_RUMORS,teaRumorsStep} from '../src/tea-rumors.js';
import {societyStep} from '../src/gate-society.js';
import {recordWorldNews} from '../src/world-news.js';

function setup(state=newArrival()){
 const sim=new Simulation(state),s=sim.s,eco=new Ecosystem(sim,[]),lines=[];sim.save=()=>{};
 eco.positions={tea_host:{x:-11.9,z:27},old_constable:{x:-8,z:30},traveler:{x:-5,z:30}};
 Object.assign(s.player,{x:-8,z:28});for(const id of Object.keys(eco.positions))Object.assign(s.people[id],{hp:100,life:{activity:'tea'},awareness:null});
 eco.s.time=20;s.teaRumors??={heard:{},nextAt:0};
 const world={playing:true,t:20,obstacles:[],onWorldNewsSpeech:line=>{lines.push(line);return true;}};
 return {sim,s,eco,world,lines};
}
function advance(g,time){g.eco.s.time=time;g.world.t=time;teaRumorsStep(g.sim,g.eco,g.world);return g.lines.at(-1);}
test('opening tea-table exchange is paced, heard once, and never introduces identities or grants rewards',()=>{
 const g=setup(),snapshot=()=>JSON.stringify({people:g.s.people,money:g.s.player.money,reputation:g.s.reputation,factions:g.s.factions,knowledge:g.s.knowledge,quests:g.s.quests,facts:g.s.facts});
 const before=snapshot();let line=advance(g,20);assert.equal(line.id,'tea_host');assert.match(line.text,/听过路客说.*艮岳.*修道/);assert.equal(g.s.teaRumors.heard.genyue_retreat,undefined);
 assert.ok(line.onShown());assert.ok(line.valid());advance(g,22);assert.equal(g.lines.length,1);
 line=advance(g,30);assert.equal(line.id,'old_constable');assert.ok(line.onShown());
 line=advance(g,54);assert.equal(line.id,'old_constable');assert.match(line.text,/真神仙/);assert.ok(line.onShown());
 line=advance(g,64);assert.equal(line.id,'traveler');assert.match(line.text,/未必.*不曾亲见.*不敢妄言/);assert.doesNotMatch(line.text,/本王|父皇|皇兄|确有神仙/);assert.ok(line.onShown());
 assert.equal(snapshot(),before);advance(g,100);assert.equal(g.lines.length,4);
 const restored=setup(JSON.parse(JSON.stringify(g.s)));advance(restored,200);assert.equal(restored.lines.length,0);
});
test('both participants must be at the tea stall, conscious, near and unobstructed',()=>{
 for(const condition of ['absent','far','wall','playerFar','mute','bound','injured','sleep','fight','offscreen']){
  const g=setup();if(condition==='absent')delete g.eco.positions.old_constable;if(condition==='far')g.eco.positions.old_constable.x=12;
  if(condition==='wall')g.world.obstacles=[{x:-10,z:28.5,w:.2,d:12}];if(condition==='playerFar')g.s.player.x=20;
  Object.assign(g.s.people.old_constable,({mute:{muteUntil:100},bound:{restraint:{}},injured:{hp:30},sleep:{life:{activity:'sleep'}},fight:{awareness:{state:'fight'}}}[condition]||{}));
  if(condition==='offscreen'){g.world.npcs=new Map([['tea_host',{actor:{position:g.eco.positions.tea_host}}]]);g.world.screenPoint=()=>({visible:false});}
  advance(g,20);assert.equal(g.lines.length,0,condition);
 }
});
test('visible speech yields to current events, combat, dialogue and the existing news channel',()=>{
 for(const condition of ['locked','cinematic','performance','combatReady','complaint','news','town','v1']){
  const g=setup(condition==='v1'?legacyArrival():newArrival());if(['locked','cinematic','performance','combatReady'].includes(condition))g.world[condition]=true;
  if(condition==='complaint')g.s.complaint={};if(condition==='town')g.s.facts.enteredCity=true;
  if(condition==='news')recordWorldNews(g.s,{id:'nearby',type:'convoy_loss',knowers:['old_constable']});advance(g,20);assert.equal(g.lines.length,0,condition);
 }
 const g=setup();g.world.onWorldNewsSpeech=()=>false;advance(g,20);assert.deepEqual(g.s.teaRumors.heard,{});assert.equal(g.world.teaRumorQueued,undefined);
});
test('queued but interrupted speech does not count as heard; late replies are not replayed',()=>{
 const g=setup(),first=advance(g,20);g.s.people.old_constable.muteUntil=100;assert.equal(first.valid(),false);assert.equal(first.onShown(),false);assert.deepEqual(g.s.teaRumors.heard,{});
 g.s.people.old_constable.muteUntil=0;const retry=advance(g,29);assert.ok(retry.onShown());
 g.eco.positions.old_constable.x=20;advance(g,40);assert.equal(g.lines.length,2);g.eco.positions.old_constable.x=-8;
 const next=advance(g,75);assert.equal(next.id,'old_constable');assert.equal(next.text,TEA_RUMORS[1].lines[0]);assert.notEqual(next.text,TEA_RUMORS[0].lines[1]);
 const switched=setup(),queued=advance(switched,20);switched.sim.s=newArrival();assert.equal(queued.onShown(),false);
});
test('society scheduler routes lore through local bubbles and does not overwrite it with old gossip',()=>{
 const g=setup(),old=[];g.s.gateSociety={nextTalk:0,index:0};g.sim.listeners.push((type,data)=>{if(type==='npcRoutine')old.push(data);});
 societyStep(g.sim,g.eco,g.world,.1);assert.equal(g.lines.length,1);assert.ok(g.lines[0].onShown());assert.equal(old.length,0);assert.equal(g.s.gateSociety.index,0);
});
