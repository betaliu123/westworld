import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../vendor/three.module.js';
import {World} from '../src/world.js';
import {Simulation,newArrival} from '../src/simulation.js';
import {Ecosystem} from '../src/ecosystem.js';
import {recordFactionPressure} from '../src/faction-discipline.js';

function setup(){
 const sim=new Simulation(newArrival(),()=>0);sim.save=()=>{};new Ecosystem(sim);const s=sim.s;s.facts.career='court';
 s.player.x=0;s.player.z=10;for(const id of ['scribe','inspector'])Object.assign(s.people[id],{fear:0,life:{activity:'idle'},awareness:null});
 s.people.scribe.awareness={state:'return',caseOpen:false,home:{x:20,z:0}};
 const actor=new T.Group(),chief=new T.Group();chief.position.set(-6,0,0);
 const reporter={actor,person:{id:'scribe'}},leader={actor:chief,person:{id:'inspector'}};
 const world=Object.create(World.prototype);Object.assign(world,{sim,t:0,performance:null,npcs:new Map([['scribe',reporter],['inspector',leader]]),obstacles:[],reactionCalls:0,steps:[]});
 world.collides=(x,z)=>world.obstacles.some(o=>Math.abs(x-o.x)<o.w/2&&Math.abs(z-o.z)<o.d/2);
 world.move=(a,dx,dz)=>{const x=a.position.x+dx,z=a.position.z+dz;if(!world.collides(x,z)){a.position.set(x,0,z);world.steps.push({x,z});}};
 world.animateActor=()=>{};world.reactNpc=()=>{world.reactionCalls++;return true;};
 const report=recordFactionPressure(sim,{cause:'motion-test',npc:'scribe',subject:'player',faction:'court',line:'我在六扇门当差，你还要纠缠？'});
 return {sim,s,world,reporter,leader,report};
}
function tick(c,dt=.05){c.world.t+=dt;c.s.npcClock=c.world.t;return c.world.reportOrReactionMotion('scribe',c.reporter,dt);}

test('a pending report immediately preempts the resolved dispute return route without a reload',()=>{
 const c=setup();assert.equal(tick(c),true);assert.ok(c.reporter.actor.position.x<0,'must move toward the leader, not the former home at x=20');assert.equal(c.world.reactionCalls,0);assert.equal(c.report.status,'pending');
 for(let i=0;i<160&&c.report.status==='pending';i++)tick(c);
 assert.equal(c.report.status,'reported');assert.equal(c.world.reactionCalls,0);assert.equal(c.s.people.scribe.awareness.home.x,20);
});

test('the reporting NPC follows the real path around an obstacle to a moving leader, then delivers once',()=>{
 const c=setup();c.world.obstacles=[{x:-2,z:0,w:.8,d:4}];
 for(let i=0;i<400&&c.report.status==='pending';i++){if(i<20)c.leader.actor.position.x-=.02;tick(c);}
 assert.equal(c.report.status,'reported');assert.ok(c.world.steps.some(q=>Math.abs(q.z)>2));assert.ok(c.world.steps.every(q=>!c.world.collides(q.x,q.z)));
 assert.ok(c.reporter.actor.position.distanceTo(c.leader.actor.position)<=2.4);const delivered=c.s.chronicle.deeds.filter(d=>d.key==='report:'+c.report.id).length;
 tick(c);assert.equal(c.s.chronicle.deeds.filter(d=>d.key==='report:'+c.report.id).length,delivered);
});

test('danger, incapacitation and unavailable leaders retain precedence over a pending report',()=>{
 for(const phase of ['fight','warn','search','flee','investigate','notice']){
  const c=setup();c.s.people.scribe.awareness.state=phase;tick(c);assert.equal(c.world.reactionCalls,1,phase);assert.equal(c.world.steps.length,0,phase);assert.equal(c.report.status,'pending');
 }
 for(const [id,field,value]of [['scribe','stunnedUntil',50],['scribe','muteUntil',50],['inspector','hp',0],['inspector','life',{activity:'sleep'}],['inspector','awareness',{state:'fight',caseOpen:true}],['scribe','life',{activity:'escape'}],['inspector','life',{activity:'escape'}],['scribe','burning',true],['inspector','burning',true]]){
  const c=setup();c.s.people[id][field]=value;tick(c);assert.equal(c.world.steps.length,0,id+':'+field);assert.equal(c.report.status,'pending');
 }
 const c=setup();c.s.people.scribe.stunnedUntil=1;tick(c);assert.equal(c.world.steps.length,0);c.world.t=2;tick(c);assert.ok(c.world.steps.length>0,'report resumes after restraint ends');
});

test('escaping fire blocks even an adjacent delivery, then the same report resumes after both people are safe',()=>{
 const c=setup();c.leader.actor.position.set(-1,0,0);c.s.people.scribe.life={activity:'escape',target:{x:3,z:3}};
 tick(c);assert.equal(c.report.status,'pending');assert.equal(c.world.steps.length,0);
 c.s.people.scribe.life={activity:'idle'};c.s.people.inspector.burning=true;tick(c);assert.equal(c.report.status,'pending');
 c.s.people.inspector.burning=false;tick(c);assert.equal(c.report.status,'reported');assert.equal(c.s.chronicle.deeds.filter(d=>d.key==='report:'+c.report.id).length,1);
});
