import test from 'node:test';
import assert from 'node:assert/strict';
import {Simulation,newArrival} from '../src/simulation.js';
import {Ecosystem} from '../src/ecosystem.js';
import {knownFaces,rememberFace} from '../src/appearance.js';
import {earnReputation,reputation} from '../src/reputation.js';
import {observeProgress,progressSnapshot} from '../src/progress.js';
import {World} from '../src/world.js';
import {rememberNpcConversation} from '../src/npc-names.js';
import {societyStep} from '../src/gate-society.js';
import {probeNpc} from '../src/npc-discovery.js';
import * as T from '../vendor/three.module.js';

const listen=sim=>{const rows=[];sim.listeners.push((type,data)=>{if(type==='actorDeltas')rows.push(...data);});return rows;};
test('wanted portrait unlock floats once; repeat reading and restored knowledge do not replay it',()=>{
 const sim=new Simulation(newArrival()),s=sim.s,board={id:'wanted-board',kind:'noticeboard',x:3,z:29},eco=new Ecosystem(sim,[board]);
 sim.progressBaseline=progressSnapshot(s);const rows=listen(sim);Object.assign(s.player,{x:3,z:29});
 assert.equal(eco.act('bounty',board.id),undefined);
 assert.deepEqual(rows,[{id:'player',label:'可易容面貌',delta:1}]);assert.ok(knownFaces(s).some(([id])=>id==='thief'));
 assert.ok(eco.act('bounty',board.id));sim.save();assert.equal(rows.length,1);
 const restored=JSON.parse(JSON.stringify(s));delete restored.appearance; // An older save with the same knowledge.
 const loaded=new Simulation(restored),after=listen(loaded);new Ecosystem(loaded,[board]);loaded.save();
 assert.equal(knownFaces(restored).length,1);assert.deepEqual(after,[]);
});
test('merely seeing a passer-by is not a usable face; learning the identity adds one',()=>{
 const sim=new Simulation(newArrival()),rows=listen(sim);rememberFace(sim.s,'tea');sim.save();assert.deepEqual(rows,[]);
 sim.s.people.tea.metPlayer=true;sim.save();assert.deepEqual(rows,[{id:'player',label:'可易容面貌',delta:1}]);
 rememberFace(sim.s,'tea');sim.save();assert.equal(rows.length,1);
});

test('meeting Qinghe unlocks her face in that conversation, never on a later approach',()=>{
 const sim=new Simulation(newArrival()),s=sim.s,rows=listen(sim);
 // A reply can finish before the wardrobe's one-second observation scan.
 rememberNpcConversation(sim,{id:'qinghe',text:'我想听听京里的曲子。'});
 assert.deepEqual(rows,[{id:'player',label:'可易容面貌',delta:1}]);
 assert.deepEqual(knownFaces(s).map(([id])=>id),['qinghe']);
 rememberNpcConversation(sim,{id:'fu',text:'名册上有这个名字。'});
 assert.deepEqual(rows.map(r=>r.delta),[1,1]);
 for(let i=0;i<3;i++){
  rememberFace(s,'qinghe');rememberFace(s,'fu');
  rememberNpcConversation(sim,{id:'qinghe',text:'娘有娘的怕，我也有我的打算。'});sim.save();
 }
 assert.equal(rows.length,2);assert.equal(knownFaces(s).length,2);
 const loaded=new Simulation(JSON.parse(JSON.stringify(s))),after=listen(loaded);
 rememberFace(loaded.s,'qinghe');loaded.save();assert.deepEqual(after,[]);
});

test('overhearing two newly met people reports two immediately, not on a later scan',()=>{
 const sim=new Simulation(newArrival()),s=sim.s,eco=new Ecosystem(sim,[]);
 Object.assign(s.player,{x:0,z:30});eco.positions={old_constable:{x:0,z:31},traveler:{x:1,z:31}};
 s.gateSociety={nextTalk:0,index:0};sim.progressBaseline=progressSnapshot(s);const rows=listen(sim);
 societyStep(sim,eco,{obstacles:[]},.1);
 assert.deepEqual(rows,[{id:'player',label:'可易容面貌',delta:2}]);
 assert.deepEqual(knownFaces(s).map(([id])=>id).sort(),['old_constable','traveler']);
 rememberFace(s,'old_constable');rememberFace(s,'traveler');sim.save();
 s.gateSociety={nextTalk:0,index:1};societyStep(sim,eco,{obstacles:[]},.1);sim.save();
 assert.equal(rows.length,1);
});

test('a successful probe unlocks its face before the next proximity scan, only once',()=>{
 const sim=new Simulation(newArrival(),()=>0),rows=listen(sim);
 assert.equal(probeNpc(sim,'qinghe').success,true);
 assert.deepEqual(rows,[{id:'player',label:'可易容面貌',delta:1}]);
 assert.equal(probeNpc(sim,'qinghe').cached,true);rememberFace(sim.s,'qinghe');sim.save();
 assert.equal(rows.length,1);
});
test('local and faction reputation float actual capped changes once without a duplicate global total',()=>{
 const sim=new Simulation(newArrival()),s=sim.s,r=reputation(s);s.reputation=r.seenGlobal=r.cities.linxi=99;
 r.factions.court=99;s.factions={六扇门:99};sim.progressBaseline=progressSnapshot(s);const rows=listen(sim);
 earnReputation(sim,{faction:'court',amount:5,reason:'送还失物',key:'return'});
 assert.deepEqual(rows,[{id:'player',label:'临溪镇声望',delta:1},{id:'player',label:'六扇门声望',delta:1}]);
 sim.save();earnReputation(sim,{faction:'court',amount:5,reason:'送还失物',key:'return'});assert.equal(rows.length,2);
 earnReputation(sim,{city:null,faction:'court',amount:-2,reason:'失信'});
 assert.deepEqual(rows.at(-1),{id:'player',label:'六扇门声望',delta:-2});assert.equal(rows.length,3);
 const loaded=new Simulation(JSON.parse(JSON.stringify(s))),after=listen(loaded);loaded.save();assert.deepEqual(after,[]);
});
test('direct legacy reputation writes in the new chapter use the same city ledger',()=>{
 const sim=new Simulation(newArrival()),rows=listen(sim);sim.s.reputation+=2;observeProgress(sim,'相助');
 assert.deepEqual(rows,[{id:'player',label:'临溪镇声望',delta:2}]);
});
test('disguised identity reputation and passive recovery do not become hero floats; hidden faction stays anonymous',()=>{
 const sim=new Simulation(newArrival()),s=sim.s,rows=listen(sim);
 earnReputation(sim,{subject:'gate_merchant',amount:-2,reason:'目击冒名者'});s.player.energy-=1;sim.save();assert.deepEqual(rows,[]);
 earnReputation(sim,{city:null,faction:'wuxiang',amount:2,reason:'暗中相助'});
 assert.deepEqual(rows,[{id:'player',label:'势力声望',delta:2}]);
 s.facts.scribeIdentity=true;sim.save();assert.equal(rows.length,1);
});
test('opposite consequences queue separately and visible lifetime pauses during dialogue',()=>{
 const previous=globalThis.document,ctx={clearRect(){},strokeText(){},fillText(){}};
 globalThis.document={createElement:()=>({getContext:()=>ctx})};
 try{
  const w={playing:true,t:0,hero:new T.Group(),npcs:new Map(),obstacles:[],sim:{s:{}}};
  World.prototype.queueActorDeltas.call(w,[{id:'player',label:'声望',delta:2},{id:'player',label:'声望',delta:-2}]);
  assert.deepEqual([...w.deltaQueue.values()].map(r=>r.delta),[2,-2]);
  const tick=dt=>{w.t+=dt;World.prototype.updateActorDeltas.call(w);};tick(0);tick(.1);tick(.1);
  const first=w.deltaSprites.get('player'),age=first.age;assert.equal(first.row.delta,2);assert.ok(first.sprite.material.opacity>0);
  w.cinematic=true;tick(3);assert.equal(first.age,age);assert.equal(first.sprite.visible,false);assert.equal(w.deltaQueue.size,1);
  w.cinematic=false;tick(.1);assert.equal(first.age,age);assert.equal(first.sprite.visible,true);
  for(let i=0;i<16;i++)tick(.1);
  assert.equal(w.deltaSprites.get('player').row.delta,-2);assert.equal(w.deltaQueue.size,0);
  for(let i=0;i<18;i++)tick(.1);assert.equal(w.deltaSprites.size,0);assert.equal(w.hero.children.length,0);
 }finally{globalThis.document=previous;}
});
