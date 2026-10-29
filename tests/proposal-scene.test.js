import test from 'node:test';
import assert from 'node:assert/strict';
import {Simulation,newGame} from '../src/simulation.js';
import {growth,earnGrowth,combatDamage,checkGrade} from '../src/growth.js';
import {DRAMAS,dramaTarget} from '../src/street-dramas.js';
import {SCENES} from '../src/data.js';
import {StreetStories} from '../src/street-stories.js';
import {World} from '../src/world.js';
import * as THREE from '../vendor/three.module.js';
const setup=(roll=0)=>{const sim=new Simulation(newGame(),()=>roll);sim.s.player.x=-1;sim.s.player.z=3;return sim;};
const act=(s,id)=>{const r=s.resolve(s.event?.id,id);assert.equal(r.error,undefined,id);return r;};
test('new and unstarted old saves use three immediate choices without changing progress',()=>{
 const s=setup();assert.equal(s.actions().length,3);assert.equal(s.actions()[0].id,'p_listen');
 const restored=new Simulation(JSON.parse(JSON.stringify(s.s)));assert.equal(restored.actions().length,3);assert.equal(restored.s.player.money,80);
});
test('listening reveals a motive, persuasion changes the scene, only the decision settles',()=>{
 const s=setup();act(s,'p_listen');assert.equal(s.event.proposal.phase,'talk');assert.equal(s.s.pending,null);
 act(s,'p_persuade');assert.equal(s.event.proposal.phase,'decision');assert.equal(s.s.pending,null);
 const r=act(s,'p_private');assert.equal(r.ongoing,false);assert.equal(s.event,null);assert.equal(s.s.pending.type,'favor');
 assert.ok(s.s.player.inventory.includes('催缴条抄件'));assert.equal(growth(s.s.player,'social').level,1);
 const before=s.s.player.money;s.advanceDay();const action=s.actions().find(a=>a.id==='c_ask'),withLead=s.preview(action).chance;
 s.s.facts.extortionLead=false;assert.equal(withLead-s.preview(action).chance,12);s.s.facts.extortionLead=true;
 assert.equal(s.s.player.money,before);assert.equal(s.s.facts.couple,false);
});
test('theft can be prepared, fails into an immediate confrontation and does not end the event',()=>{
 const s=setup();s.event.proposal={phase:'hands',facts:{},attempts:[]};const direct=s.preview(s.actions().find(a=>a.id==='p_take')).chance;act(s,'p_divert');
 assert.ok(s.preview(s.actions().find(a=>a.id==='p_take_ready')).chance>direct);
 s.rng=()=>.999;const r=act(s,'p_take_ready');assert.equal(r.grade,'大失败');assert.equal(s.s.wanted,1);
 assert.equal(s.event.proposal.phase,'caught');assert.equal(s.s.pending,null);assert.equal(s.s.player.inventory.includes('ring'),false);
 act(s,'p_yield');act(s,'p_support');act(s,'p_end');assert.equal(s.s.pending.type,'confidence');
 assert.equal(growth(s.s.player,'theft').level,1);
});
test('every authored phase and both check outcomes finish, with no more than three actions',()=>{
 let leaves=0;
 function walk(s,depth=0){
  assert.ok(depth<12,'must not loop');
  if(!s.event){assert.ok(s.s.pending);leaves++;return;}
  if(s.event.proposal?.phase==='duel'){while(s.event.proposal.phase==='duel')s.attack('shen');walk(s,depth+1);return;}
  const actions=s.actions();assert.ok(actions.length>0&&actions.length<=3);
  for(const a of actions)for(const roll of a.stat?[0,.999]:[0]){
   const c=new Simulation(JSON.parse(JSON.stringify(s.s)),()=>roll);const r=act(c,a.id);
   assert.ok(r.text);assert.ok(Number.isFinite(c.s.player.money));walk(c,depth+1);
  }
 }
 walk(setup());assert.ok(leaves>50);
});
test('read/load preserves a mid-scene decision, blocks stale actions and grants rewards only once',()=>{
 const s=setup();s.event.proposal={phase:'hands',facts:{},attempts:[]};act(s,'p_divert');const restored=new Simulation(JSON.parse(JSON.stringify(s.s)),()=>0);
 assert.equal(restored.event.proposal.phase,'ready');const before=JSON.stringify(restored.s);
 assert.ok(restored.resolve(1,'p_divert').error);assert.equal(JSON.stringify(restored.s),before);
 act(restored,'p_take_ready');assert.equal(restored.event.proposal.facts.note,true);act(restored,'p_read');act(restored,'p_private');
 const settled=JSON.stringify(restored.s);assert.ok(restored.resolve(1,'p_private').error);assert.equal(JSON.stringify(restored.s),settled);
});
test('actual sparring needs hits, does not create crime or injure witnesses, and yields combat growth',()=>{
 const s=setup();act(s,'p_interpose');act(s,'p_duel');assert.equal(s.event.proposal.phase,'duel');
 assert.equal(s.s.people.shen.hp,100);s.attack('shen',['su','gao']);assert.equal(s.s.people.shen.hp,78);
 assert.equal(s.s.wanted,0);assert.equal(s.s.people.su.fear,0);assert.equal(s.event.proposal.phase,'duel');
 s.attack('shen');s.attack('shen');assert.equal(s.event.proposal.phase,'decision');assert.equal(s.s.people.shen.mood,'calm');
 act(s,'p_private');assert.equal(growth(s.s.player,'combat').level,1);assert.ok(combatDamage(s.s.player)>22);
});
test('sparring loss and leaving the area lead to a conversation, with no fabricated win',()=>{
 for(const cause of ['injury','leave','timeout']){
  const s=setup();act(s,'p_interpose');act(s,'p_duel');
  if(cause==='injury')s.s.player.hp=24;if(cause==='leave')s.s.player.z=20;
  s.tickStory(cause==='timeout'?61:1);
  assert.equal(s.event.proposal.phase,'setback');assert.equal(s.s.people.shen.mood,'calm');
  assert.equal(s.s.history.at(-1).success,false);
 }
});
test('outside an agreed sparring match assault still causes crime and closes the conversation',()=>{
 const s=setup();s.attack('shen',['su']);assert.equal(s.s.wanted,1);assert.equal(s.s.pending.type,'dispute');assert.equal(s.event,null);
});
test('unaffordable preparation, repeated checks and old actor moods cannot grant unearned growth',()=>{
 const s=setup();act(s,'p_listen');s.s.player.money=0;assert.ok(s.resolve(1,'p_offer').error);assert.equal(s.event.proposal.phase,'talk');
 const p=s.s.player,before=growth(p,'social').xp;earnGrowth(p,'wit',30,'once');assert.equal(growth(p,'social').xp,before+30);earnGrowth(p,'wit',30,'once');assert.equal(growth(p,'social').xp,before+30);
});
test('the four check grades obey the same advertised probability',()=>{
 assert.equal(checkGrade(1,50),'大成功');assert.equal(checkGrade(50,50),'成功');assert.equal(checkGrade(51,50),'失败');assert.equal(checkGrade(100,50),'大失败');
 const s=setup();act(s,'p_listen');const a=s.actions()[0],chance=s.preview(a).chance;
 s.rng=()=>((chance-1)+.1)/100;assert.equal(act(s,a.id).success,true);
 const t=setup();act(t,'p_listen');t.rng=()=>(chance+.1)/100;assert.equal(act(t,a.id).success,false);
});
test('proposal survives time passing nearby and stepping away preserves authored facts',()=>{
 const s=setup();act(s,'p_listen');s.tickStory(160);assert.equal(s.event.proposal.phase,'talk');
 s.s.player.z=24;s.tickStory(1);assert.equal(s.event,null);assert.equal(s.s.pending.type,'confidence');
 assert.equal(s.s.people.shen.mood,'calm');
});
test('remote dramas have disjoint interaction/witness areas and reachable central-street marks',()=>{
 const points=[SCENES.proposal.point,DRAMAS.ribbon.point,DRAMAS.duel.point];
 for(let i=0;i<points.length;i++)for(let j=i+1;j<points.length;j++)assert.ok(Math.hypot(points[i][0]-points[j][0],points[i][1]-points[j][1])>17);
 for(const type of ['ribbon','duel']){
  const e={type,cast:DRAMAS[type].cast,stage:'报名'};
  for(const id of e.cast){const mark=dramaTarget(e,DRAMAS[type],id,{}).point;assert.ok(Math.abs(mark[1])<29);const proxy={hero:{position:{x:0,z:2}},collides:(x,z)=>Math.abs(x)>31||Math.abs(z)>29};assert.equal(World.prototype.routeTo.call(proxy,mark,.6),true);}
 }
});
test('old live matchmaking locations migrate once, without resetting results or the proposal',()=>{
 const s=setup();const d=new StreetStories(s);d.start('ribbon');delete s.s.street.layoutVersion;s.s.street.active.positions={mei:{x:0,z:8}};
 s.s.street.completed.theft=true;act(s,'p_listen');const restored=new Simulation(JSON.parse(JSON.stringify(s.s)));
 const migrated=new StreetStories(restored);assert.equal(migrated.active,null);assert.equal(migrated.s.completed.theft,true);assert.equal(restored.event.proposal.phase,'talk');
});
test('every matchmaking mark is reachable around the actual town buildings',()=>{
 const previous=globalThis.document;
 globalThis.document={createElement:()=>({getContext:()=>({fillText(){}})})};
 try{
  const world=Object.create(World.prototype);
  Object.assign(world,{scene:new THREE.Scene(),sim:setup(),obstacles:[],environmentAssets:[],props:[],hero:{position:{x:0,z:2}}});
  world.build();
  for(const type of ['ribbon','duel'])for(const id of DRAMAS[type].cast){
   const target=dramaTarget({type,cast:DRAMAS[type].cast,stage:'报名'},DRAMAS[type],id,{}).point;
   assert.equal(world.collides(...target),false,`${type}:${id} must not stand inside a building`);
   assert.equal(world.routeTo(target,.6),true,`${type}:${id} must have a path`);
  }
 }finally{globalThis.document=previous;}
});
test('talking down a proposed duel earns social skill, never fabricated combat experience',()=>{
 const s=setup();act(s,'p_interpose');const combat=growth(s.s.player,'combat').xp;act(s,'p_reason');act(s,'p_end');
 assert.equal(growth(s.s.player,'combat').xp,combat);assert.equal(growth(s.s.player,'social').level,1);
});
test('learned stealth changes both the prepared action and its executed pose',()=>{
 const s=setup();earnGrowth(s.s.player,'agility',30,'prior-practice');
 s.event.proposal={phase:'hands',facts:{},attempts:[]};act(s,'p_divert');const a=s.actions().find(a=>a.id==='p_take_ready');
 assert.match(a.label,/伏低/);assert.equal(act(s,a.id).motion,'crouch');
});

test('risky opening routes roll their advertised attributes and fail forward',()=>{
 const expected={p_watch:'caught_ring',p_interpose:'setback'};
 for(const [id,phase] of Object.entries(expected)){const s=setup(.999),a=s.actions().find(a=>a.id===id),chance=s.preview(a).chance;assert.ok(a.stat);const r=act(s,id);assert.equal(r.roll,100);assert.equal(r.check.chance,chance);assert.equal(r.success,false);assert.equal(s.event.proposal.phase,phase);assert.equal(s.s.pending,null);assert.ok(s.actions().length);}
});
