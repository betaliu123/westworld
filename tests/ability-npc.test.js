import test from 'node:test';
import assert from 'node:assert/strict';
import {Simulation,newArrival} from '../src/simulation.js';
import {Ecosystem} from '../src/ecosystem.js';
import {touchPreview,pressurePoint} from '../src/npc-actions.js';
import {probePreview,probeNpc,npcInfo} from '../src/npc-discovery.js';
import {aimOptionLabel} from '../src/aim-skills.js';

function setup(skillId='pressure',tier=1,id='relay'){
 const sim=new Simulation(newArrival()),eco=new Ecosystem(sim,[]),p=sim.s.player,n=sim.s.people[id],events=[];
 Object.assign(p,{x:0,z:-1,energy:100});Object.assign(p.stats,{agility:50,wit:50});
 p.skills[skillId]={tier,xp:0};Object.assign(n,{x:0,z:0,facing:0});
 sim.s.npcClock=100;eco.s.time=100;
 let rolls=0,die=1;sim.rng=()=>{rolls++;return (die-.5)/100;};
 sim.listeners.push((type,data)=>events.push({type,data}));
 return {sim,eco,p,n,id,events,rolls:()=>rolls,roll(value){die=value;}};
}
const checks={pressure:{preview:touchPreview,execute:pressurePoint},insight:{preview:probePreview,execute:probeNpc}};

for(const [skillId,{preview,execute}] of Object.entries(checks))for(const tier of [1,2,3,4]){
 test(`${skillId} tier ${tier}: preview is pure and the shown threshold is inclusive`,()=>{
  for(const pass of [true,false]){
   const g=setup(skillId,tier),before=JSON.stringify(g.sim.s),check=preview(g.sim,g.id);
   assert.equal(check.chance,[0,50,62,74,86][tier]);assert.equal(check.blocked,false);
   assert.deepEqual(preview(g.sim,g.id),check);assert.equal(JSON.stringify(g.sim.s),before);assert.equal(g.rolls(),0);
   g.roll(check.chance+(pass?0:1));const r=execute(g.sim,g.id);
   assert.equal(r.success,pass);assert.equal(r.roll,check.chance+(pass?0:1));assert.deepEqual(r.check,check);assert.equal(g.rolls(),1);
   assert.equal(r.check.practiceBonus,0,'the result retains the check before practice was awarded');
   const event=g.events.find(e=>e.type===(skillId==='pressure'?'result':'fieldCheck'));
   assert.equal(event.data,r);
   if(skillId==='pressure'){
    assert.equal(g.p.energy,90);assert.equal(g.n.hp,60);
    assert.equal(g.n.stunnedUntil,pass?100+[0,5,10,30,30][tier]:undefined);
    assert.equal(g.p.skills.pressure.xp,pass?8:3);
   }else{
    assert.equal(g.n.probedTier,pass?tier:undefined);assert.equal(g.p.skills.insight.xp,pass?5:0);
   }
  }
 });
}

for(const tier of [3,4])test(`mute tier ${tier} uses its own threshold without immobilizing`,()=>{
 for(const pass of [true,false]){
  const g=setup('pressure',tier),check=touchPreview(g.sim,g.id,'mute');
  assert.equal(check.chance,tier===3?62:74);assert.equal(touchPreview(g.sim,g.id).chance-check.chance,12);
  g.roll(check.chance+(pass?0:1));const r=pressurePoint(g.sim,g.id,'mute');
  assert.equal(r.success,pass);assert.deepEqual(r.check,check);assert.equal(g.rolls(),1);
  assert.equal(g.n.muteUntil,pass?130:undefined);assert.equal(g.n.stunnedUntil,undefined);
 }
});

test('pressure reads the target martial tier and current attention, with no generic rear bonus',()=>{
 const g=setup('pressure',2,'gate_guard');
 assert.equal(touchPreview(g.sim,g.id).chance,42,'the actual tier-three guard resists by 20');
 g.n.skills.combat.tier=1;assert.equal(touchPreview(g.sim,g.id).chance,62);
 g.p.z=1;assert.equal(touchPreview(g.sim,g.id).chance,62);g.p.z=-1;
 g.n.skills.combat.tier=4;assert.equal(touchPreview(g.sim,g.id).chance,32);
 g.n.awareness={state:'warn'};assert.equal(touchPreview(g.sim,g.id).chance,12);
 g.roll(13);const r=pressurePoint(g.sim,g.id);assert.equal(r.success,false);assert.equal(r.check.chance,12);
});

for(const [skillId,{preview}] of Object.entries(checks))test(`${skillId} applies bodily attention and capped practice`,()=>{
 for(const tier of [1,2,3,4]){
  const g=setup(skillId,tier),base=preview(g.sim,g.id).chance;
  g.p.skills[skillId].xp=30;assert.equal(preview(g.sim,g.id).chance,base+4);
  g.p.skills[skillId].xp=300;assert.equal(preview(g.sim,g.id).chance,base+4);
 }
 const g=setup(skillId),base=preview(g.sim,g.id).chance;
 g.n.life={activity:'meal'};assert.equal(preview(g.sim,g.id).chance,base,'an intended meal is not an actual distraction');
 g.n.eatingUntil=101;assert.equal(preview(g.sim,g.id).chance,base+15);
 g.eco.s.time=101;assert.equal(preview(g.sim,g.id).chance,base);
 g.n.drinkingUntil=102;assert.equal(preview(g.sim,g.id).chance,base+15);
 g.n.life={activity:'sleep'};assert.equal(preview(g.sim,g.id).chance,base+15);
 g.n.life.activity='doze';assert.equal(preview(g.sim,g.id).chance,base+10);
 for(const state of ['warn','fight','investigate','search']){
  g.n.awareness={state};assert.equal(preview(g.sim,g.id).chance,base-20,'alertness takes priority over dozing');
 }
 assert.equal(g.rolls(),0);
});

test('pressure refuses every unmet capability or bodily gate without spending or rolling',()=>{
 const cases=[
  {change:g=>delete g.sim.s.people[g.id],match:/目标已离开/},
  {change:g=>g.n.hp=0,match:/倒地/},
  {change:g=>g.p.skills.pressure.tier=0,match:/杜老捕/},
  {change:g=>g.p.z=1,match:/绕到.*身后/},
  {change:g=>g.p.energy=9,match:/10 点/},
  {change:g=>g.n.stunnedUntil=103,match:/3 秒/},
  {change:()=>{},point:'mute',match:/熟练/},
  {change:g=>g.p.skills.pressure.tier=2,point:'mute',match:/熟练/},
  {change:g=>{g.p.skills.pressure.tier=3;g.n.muteUntil=104;},point:'mute',match:/4 秒/}
 ];
 for(const c of cases){
  const g=setup();c.change(g);const before=JSON.stringify(g.sim.s),check=touchPreview(g.sim,g.id,c.point);
  assert.equal(check.blocked,true);assert.equal(check.chance,null);assert.match(check.reason,c.match);
  assert.equal(pressurePoint(g.sim,g.id,c.point).error,check.reason);
  assert.equal(g.rolls(),0);assert.equal(JSON.stringify(g.sim.s),before);assert.equal(g.events.length,0);
  const label=aimOptionLabel(check,{point:c.point});assert.match(label,c.match);assert.doesNotMatch(label,/%|null/);
 }
 const g=setup('pressure',3);g.n.muteUntil=104;
 assert.equal(touchPreview(g.sim,g.id,'bind').blocked,false,'a mute target may still be immobilized');
});

test('pressure confirmation rechecks admission and preserves the preview before capped practice',()=>{
 const g=setup();assert.equal(touchPreview(g.sim,g.id).blocked,false);
 g.p.z=1;assert.match(pressurePoint(g.sim,g.id).error,/身后/);assert.equal(g.rolls(),0);
 g.p.z=-1;g.p.skills.pressure.xp=29;const check=touchPreview(g.sim,g.id),r=pressurePoint(g.sim,g.id);
 assert.deepEqual(r.check,check);assert.ok(r.check.practiceBonus<4);assert.equal(g.p.skills.pressure.xp,30);
 g.sim.s.npcClock=106;pressurePoint(g.sim,g.id);assert.equal(g.p.skills.pressure.xp,30);
});

test('elusive traveler has a separate probe difficulty; no royal identity or letter content is granted',()=>{
 const g=setup('insight',2,'traveler');
 assert.equal(probePreview(g.sim,g.id).chance,37);assert.equal(probePreview(g.sim,'relay').chance,62);
 g.roll(37);const r=probeNpc(g.sim,g.id);assert.equal(r.success,true);assert.equal(r.check.difficulty,25);
 assert.ok(!g.sim.s.facts.princeRoyal);assert.ok(!g.sim.s.facts.princeLetter);
 const info=npcInfo(g.sim,g.eco,g.id);assert.equal(info.name,'锦衣客');assert.equal(info.faction,'？？？');
 assert.ok(info.items.some(i=>i.type==='sealed'));assert.doesNotMatch(JSON.stringify(info),/宗室|宋徽宗/);
});

test('same-tier cached probes persist, never roll or grant duplicate practice, and show no percentage',()=>{
 for(const tier of [1,2,3,4]){
  const g=setup('insight',tier);probeNpc(g.sim,g.id);g.n.probeRetryAt=150;
  const check=probePreview(g.sim,g.id),before=JSON.stringify(g.sim.s),count=g.events.length;
  assert.equal(check.certain,true);assert.equal(check.chance,100);assert.equal(check.blocked,false);
  const r=probeNpc(g.sim,g.id);assert.equal(r.cached,true);assert.equal(r.roll,null);assert.equal(g.rolls(),1);
  assert.equal(JSON.stringify(g.sim.s),before);assert.equal(g.events.length,count);
  assert.equal(aimOptionLabel(check,{probe:true}),'查看资料');
  const loaded=new Simulation(JSON.parse(before),()=>{throw Error('cached probe must not roll');});
  assert.equal(probeNpc(loaded,g.id).cached,true);assert.equal(loaded.s.player.skills.insight.xp,5);
 }
});
test('a cached novice observation remains readable without unlocking identity or inventory',()=>{
 const g=setup('insight',1,'scribe'),r=probeNpc(g.sim,g.id),info=npcInfo(g.sim,g.eco,g.id);
 assert.equal(info.observed,true);assert.equal(info.probed,false);assert.equal(info.observation,r.insight);
 assert.equal(info.name,'刻字人');assert.equal(info.nameKnown,false);assert.equal(info.faction,'？？？');assert.deepEqual(info.items,[]);assert.equal(info.money,null);
 const sim=new Simulation(JSON.parse(JSON.stringify(g.sim.s))),eco=new Ecosystem(sim);
 assert.equal(npcInfo(sim,eco,g.id).observation,r.insight);
});

test('higher-tier probing needs a new check and a failed attempt blocks until its real cooldown expires',()=>{
 const g=setup('insight');probeNpc(g.sim,g.id);g.p.skills.insight={tier:2,xp:0};
 assert.equal(probePreview(g.sim,g.id).certain,false);g.roll(63);assert.equal(probeNpc(g.sim,g.id).success,false);
 const check=probePreview(g.sim,g.id),before=JSON.stringify(g.sim.s),count=g.events.length;
 assert.equal(check.blocked,true);assert.equal(check.chance,null);assert.match(check.reason,/30 秒/);
 assert.equal(probeNpc(g.sim,g.id).error,check.reason);assert.equal(g.rolls(),2);
 assert.equal(JSON.stringify(g.sim.s),before);assert.equal(g.events.length,count);
 assert.doesNotMatch(aimOptionLabel(check,{probe:true}),/%|null/);
 g.eco.s.time=129.1;assert.match(probePreview(g.sim,g.id).reason,/1 秒/);
 g.eco.s.time=130;assert.equal(probePreview(g.sim,g.id).blocked,false);
 g.roll(62);assert.equal(probeNpc(g.sim,g.id).success,true);assert.equal(g.n.probedTier,2);
});

test('probe capability and missing or fallen targets are blocked without revealing facts or rolling',()=>{
 for(const [change,reason] of [
  [g=>delete g.sim.s.people[g.id],/目标已离开/],
  [g=>g.n.hp=0,/倒地/],
  [g=>g.p.skills.insight.tier=0,/瘸张/]
 ]){
  const g=setup('insight');change(g);const check=probePreview(g.sim,g.id),before=JSON.stringify(g.sim.s);
  assert.equal(check.chance,null);assert.equal(check.blocked,true);assert.equal(check.certain,false);assert.match(check.reason,reason);
  assert.equal(probeNpc(g.sim,g.id).error,check.reason);assert.equal(g.rolls(),0);assert.equal(JSON.stringify(g.sim.s),before);
 }
});
