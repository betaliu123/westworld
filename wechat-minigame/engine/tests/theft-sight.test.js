import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../vendor/three.module.js';
import {Simulation,newArrival} from '../src/simulation.js';
import {Ecosystem} from '../src/ecosystem.js';
import {World} from '../src/world.js';
import {theftObserver,advanceTheftAttention} from '../src/theft-sight.js';
import {beginTheftAttempt} from '../src/theft-attempt.js';
import {theftVisibleBetween} from '../src/npc-awareness.js';
import {clothesActions,takeClothes} from '../src/clothes-interaction.js';
import {turnForTheft} from '../src/stealth-attention.js';

function fixture(die=0){
 const sim=new Simulation(newArrival()),eco=new Ecosystem(sim),p=sim.s.player,n=sim.s.people.su;
 Object.assign(p,{x:0,z:-1.4,hp:100,crouched:true,stealing:true});p.skills.theft.tier=3;
 Object.assign(n,{x:0,z:0,facing:0,purse:16,life:{activity:'idle'},awareness:null});eco.positions.su={x:0,z:0};
 let rolls=0;sim.rng=()=>{rolls++;return die;};const events=[];sim.listeners.push((type,data)=>events.push({type,data}));
 function world(){const npcs=new Map(Object.entries(eco.positions).map(([id,q])=>{const actor=new T.Group();actor.position.set(q.x,0,q.z);actor.rotation.y=sim.s.people[id].facing||0;return [id,{actor,base:actor.position.clone(),person:{id,name:id}}];}));
  const w={sim,npcs,obstacles:eco.obstacles||[]};sim.listeners.push((type,data)=>{if(type==='worldIncident')World.prototype.noticeIncident.call(w,data);});return w;}
 return {sim,eco,p,n,events,world,rolls:()=>rolls};
}
test('rear, peripheral and frontal approach change the real rule, even with maximum skill',()=>{
 const f=fixture(),rear=f.eco.theftPreview('su');f.p.x=1.4;f.p.z=0;const side=f.eco.theftPreview('su');
 assert.equal(rear.sight.owner,'hidden');assert.equal(side.sight.owner,'edge');assert.equal(rear.chance-side.chance,20);
 f.p.x=0;f.p.z=1.4;f.p.stats.agility=100;f.p.skills.theft.tier=4;const front=f.eco.theftPreview('su');
 assert.equal(front.chance,0);assert.equal(front.certain,true);assert.match(front.sight.label,/拦住/);
 f.eco.stealNpc('su');assert.equal(f.rolls(),0);assert.equal(f.n.purse,16);
});
test('bystanders use distance, facing, head turn, obstruction and consciousness',()=>{
 const f=fixture();f.eco.positions.gao={x:0,z:-4};Object.assign(f.sim.s.people.gao,{hp:100,facing:0,life:{activity:'idle'}});
 assert.deepEqual(f.eco.theftPreview('su').sight.witnesses,['gao']);
 f.sim.s.people.gao.facing=Math.PI;assert.deepEqual(f.eco.theftPreview('su').sight.witnesses,[]);
 f.sim.s.people.gao.facing=1.1;f.eco.positions.gao.gazeOffset=-.6;assert.deepEqual(f.eco.theftPreview('su').sight.witnesses,['gao']);
 f.eco.obstacles=[{id:'wall',x:0,z:-3,w:3,d:.2}];assert.deepEqual(f.eco.theftPreview('su').sight.witnesses,[]);
 f.eco.s.objects.wall={hp:0};assert.deepEqual(f.eco.theftPreview('su').sight.witnesses,['gao']);
 for(const state of [{hp:0},{hp:100,stunnedUntil:10},{stunnedUntil:0,life:{activity:'sleep'}},{life:{activity:'doze'}}]){Object.assign(f.sim.s.people.gao,state);assert.deepEqual(f.eco.theftPreview('su').sight.witnesses,[]);}
});
test('a successful rear theft can be witnessed; only the actual bystander learns about it',()=>{
 const f=fixture();f.eco.positions.gao={x:0,z:-4};Object.assign(f.sim.s.people.gao,{facing:0,life:{activity:'idle'}});f.world();
 const preview=f.eco.theftPreview('su');f.eco.stealNpc('su');assert.equal(f.n.purse,0);assert.equal(f.rolls(),1);
 const incident=f.events.find(e=>e.type==='worldIncident').data;assert.deepEqual(incident.witnesses,preview.sight.witnesses);
 assert.equal(f.n.awareness,null);assert.equal(f.sim.s.people.gao.awareness.suspect,'player');
 const bag=f.eco.items('player').find(i=>i.type==='purse');assert.deepEqual(bag.provenance.history.at(-1).witnesses,['gao']);
 const restored=new Ecosystem(new Simulation(JSON.parse(JSON.stringify(f.sim.s))));assert.equal(restored.items('player').filter(i=>i.id===bag.id).length,1);
});
test('unseen failure causes a local investigation without accusing or penalizing the player',()=>{
 const f=fixture(.999),relation=f.n.relation,wanted=f.sim.s.wanted;f.world();f.eco.stealNpc('su');
 assert.equal(f.n.purse,16);assert.equal(f.n.relation,relation);assert.equal(f.sim.s.wanted,wanted);assert.equal(f.n.awareness.state,'investigate');assert.equal(f.n.awareness.suspect,undefined);
 assert.deepEqual(f.events.find(e=>e.type==='worldIncident').data.witnesses,[]);assert.equal(f.sim.s.complaint,undefined);
});
test('a sleeper feels a failed reach and wakes without seeing backwards or through a wall',()=>{
 const f=fixture(.999),relation=f.n.relation;f.n.life={activity:'sleep'};f.world();f.eco.stealNpc('su');
 assert.equal(f.n.life.activity,'awake');assert.equal(f.n.relation,relation);assert.equal(f.n.awareness.state,'investigate');assert.equal(f.n.awareness.suspect,undefined);
});
test('opening, sampling and cancelling a reach spend nothing and never roll',()=>{
 const f=fixture(),before=JSON.stringify(f.sim.s),task=beginTheftAttempt(f.eco,'su','purse');task.sample();task.cancel();task.finish();
 assert.equal(f.rolls(),0);assert.equal(JSON.stringify(f.sim.s),before);
});
test('turning during a reach is remembered even after looking away; interception is not a dice failure',()=>{
 const f=fixture(),task=beginTheftAttempt(f.eco,'su','purse');task.sample();f.n.facing=Math.PI;task.sample();f.n.facing=0;
 const result=task.finish();assert.equal(result.check.chance,0);assert.equal(result.check.certain,true);assert.equal(f.rolls(),0);assert.equal(f.n.purse,16);assert.equal(task.finish(),undefined);
 assert.deepEqual(f.events.find(e=>e.type==='worldIncident').data.sightWitnesses,['su']);
});
test('movement, death and lost contact interrupt the reach without loot, practice or stamina cost',()=>{
 for(const change of [f=>f.p.x+=1,f=>f.p.hp=0,f=>f.eco.positions.su.z=10,f=>f.p.crouched=false]){
  const f=fixture(),energy=f.p.energy,xp=f.p.skills.theft.xp,task=beginTheftAttempt(f.eco,'su','purse');change(f);assert.equal(task.interrupted(),true);assert.ok(task.finish().error);assert.equal(f.n.purse,16);assert.equal(f.p.energy,energy);assert.equal(f.p.skills.theft.xp,xp);assert.equal(f.rolls(),0);
 }
});
test('no turn: the staged reach uses the displayed chance once and transfers only once',()=>{
 const f=fixture(),task=beginTheftAttempt(f.eco,'su','purse');task.sample();const r=task.finish();assert.equal(r.check.chance,task.preview.chance);assert.equal(f.rolls(),1);assert.equal(f.n.purse,0);task.finish();assert.equal(f.rolls(),1);
 assert.equal(f.events.find(e=>e.type==='fieldCheck').data.staged,true);
});
test('attention builds only with local sight, decays behind cover, and cannot accuse by itself',()=>{
 const f=fixture();f.p.x=1.4;f.p.z=0;let value=0;
 for(let i=0;i<14;i++){const o=theftObserver(f.sim.s,'su',{x:0,z:0,attention:value},f.p,true);value=advanceTheftAttention(value,o,.1,true);}
 assert.ok(value>=.6&&value<.75);const o=theftObserver(f.sim.s,'su',{x:0,z:0,attention:value},f.p,false);
 for(let i=0;i<20;i++)value=advanceTheftAttention(value,o,.1,true);assert.equal(value,0);assert.equal(f.n.awareness,null);assert.equal(f.rolls(),0);
});
test('searching a helpless target is certain, but still visible to nearby observers',()=>{
 const f=fixture();f.n.hp=0;f.eco.positions.gao={x:0,z:-4};f.sim.s.people.gao.facing=0;f.world();const preview=f.eco.theftPreview('su');
 assert.equal(preview.chance,100);f.eco.stealNpc('su');assert.equal(f.rolls(),0);assert.equal(f.n.purse,0);assert.deepEqual(f.events.find(e=>e.type==='worldIncident').data.witnesses,['gao']);
});
test('crouching can hide behind a low obstacle, and broken/open cover no longer hides the reach',()=>{
 const a={x:0,z:0},p={x:0,z:4,crouched:false},obstacles=[{id:'low',x:0,z:3.5,w:2,d:.2,sightHeight:1.1}];
 assert.equal(theftVisibleBetween(a,p,obstacles,{}),true);p.crouched=true;assert.equal(theftVisibleBetween(a,p,obstacles,{}),false);
 assert.equal(theftVisibleBetween(a,p,obstacles,{low:{open:true}}),true);assert.equal(theftVisibleBetween(a,p,obstacles,{low:{hp:0}}),true);
 // A low obstacle near the observer is below the sight ray even when crouched.
 obstacles[0].z=.5;assert.equal(theftVisibleBetween(a,p,obstacles,{}),true);
});
test('unseen clothing failure has no invented witness and can be retried without a quest',()=>{
 const f=fixture(.999);Object.assign(f.p,{x:-11,z:25.5});f.eco.positions={};const before=f.sim.s.wanted,rel=f.sim.s.people.relay.relation;
 const preview=f.sim.preview(clothesActions(f.sim).find(a=>a.id==='g_lift')),r=takeClothes(f.sim,'g_lift');
 assert.equal(r.success,false);assert.deepEqual(r.check,preview);assert.equal(f.sim.s.wanted,before);assert.equal(f.sim.s.people.relay.relation,rel);assert.ok(!f.sim.s.facts.runnerClothesCaught);assert.match(r.text,/架子/);assert.ok(clothesActions(f.sim).some(a=>a.id==='g_lift'));
});
test('attention really turns the actor; walls, sleep and interruptions prevent the turn',()=>{
 const f=fixture(),actor=new T.Group(),hero=new T.Group(),n={actor,theftLookUntil:2};
 Object.assign(f.p,{x:1.4,z:0});hero.position.set(1.4,0,0);const w={sim:f.sim,hero,obstacles:[],t:0,locked:false};
 for(let i=0;i<8;i++)assert.equal(turnForTheft(w,'su',n,.1),true);
 assert.ok(actor.rotation.y>1.3);assert.equal(actor.position.x,0);
 actor.rotation.y=0;w.obstacles=[{x:.7,z:0,w:.2,d:3}];assert.equal(turnForTheft(w,'su',n,.1),false);assert.equal(actor.rotation.y,0);
 w.obstacles=[];f.n.life.activity='sleep';assert.equal(turnForTheft(w,'su',n,.1),false);
 f.n.life.activity='idle';w.locked=true;assert.equal(turnForTheft(w,'su',n,.1),false);assert.equal(actor.rotation.y,0);
});
