import {yieldToConvoy} from '../src/npc-posts.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../vendor/three.module.js';
import {Simulation,newArrival} from '../src/simulation.js';
import {Ecosystem} from '../src/ecosystem.js';
import {World} from '../src/world.js';
import {convoyState,recordConvoyTheft} from '../src/convoy.js';
import {recordConvoyAftermath,shareConvoyNews,convoyAftermathFrame,convoyAftermathMotion,convoyAftermathOptions,resolveConvoyAftermath} from '../src/convoy-aftermath.js';
import {recordCrimeScene,acceptCrimeReport,caseBook} from '../src/crime-investigation.js';
import {investigationMotion} from '../src/investigation-world.js';
import {advanceAwareness} from '../src/npc-awareness.js';
import {detainByOfficer,resolveGate,gateActions} from '../src/gate-scene.js';
import {knownOrganization} from '../src/factions.js';
import {cityRep,factionRep} from '../src/reputation.js';
import {PRISON} from '../src/locations.js';

function setup(){
 const sim=new Simulation(newArrival(),()=>0);sim.save=()=>{};const s=sim.s,eco=new Ecosystem(sim);convoyState(s);
 for(const n of Object.values(s.people))Object.assign(n,{life:{activity:'idle'},awareness:null,fear:0});
 Object.assign(s.player,{x:0,z:0,hp:100});
 eco.positions={porter:{x:0,z:1},fu:{x:1,z:1},qing:{x:1,z:0},gang_boss:{x:2,z:0},inspector:{x:2,z:1},tea_host:{x:-1,z:1}};
 const item=eco.create('黄封绢包','cargo','player',{convoyCargo:'silk',ownerId:'fu',discovered:true});
 const event={type:'theft',convoy:true,severe:true,owner:'fu',x:0,z:0,witnesses:['porter'],identities:{porter:'player'}};
 return {sim,s,eco,item,event};
}
function worldFor(g){
 const world=Object.create(World.prototype),npcs=new Map(Object.entries(g.eco.positions).map(([id,q])=>{const actor=new T.Group();actor.position.set(q.x,0,q.z);actor.userData={arms:[new T.Group(),new T.Group()],sword:{visible:false}};return [id,{actor,base:actor.position.clone(),label:{visible:true}}];}));
 const hero=new T.Group();hero.position.set(g.s.player.x,0,g.s.player.z);
 Object.assign(world,{sim:g.sim,t:1,npcs,hero,obstacles:[],playing:true,locked:false,steps:[],alertBudget:{change:()=>false},animateActor(){},clearReady(){},burst(){}});
 world.collides=(x,z)=>world.obstacles.some(o=>Math.abs(x-o.x)<o.w/2+.1&&Math.abs(z-o.z)<o.d/2+.1);
 world.move=(actor,dx,dz)=>{const x=actor.position.x+dx,z=actor.position.z+dz;if(!world.collides(x,z)){actor.position.set(x,0,z);world.steps.push({x,z});}};
 world.receiveHit=()=>({damage:0});return world;
}
test('unknown missing cargo and failed attempts give no heroic fame or invitation',()=>{
 const g=setup();g.item.location='object:flowerstone-cart';assert.equal(recordConvoyAftermath(g.sim,g.event,g.item),null);
 g.item.location='player';g.event.witnesses=[];assert.equal(recordConvoyAftermath(g.sim,g.event,g.item),null);assert.equal(g.s.convoy.aftermath,undefined);
 assert.equal(convoyAftermathOptions(g.sim,'qing').length,0);
});
test('physical reports preserve observed identity and different factions react only after hearing',()=>{
 const g=setup();g.event.identities.porter='fu';recordConvoyAftermath(g.sim,g.event,g.item);
 assert.equal(factionRep(g.s,'qingzhu'),0);assert.equal(g.s.convoy.aftermath.known.qing,undefined);
 const wall=[{x:.5,z:.5,w:.1,d:4}];assert.equal(shareConvoyNews(g.sim,'porter','qing',g.eco.positions,wall),false);
 g.s.people.qing.life={activity:'sleep'};assert.equal(shareConvoyNews(g.sim,'porter','qing',g.eco.positions),false);g.s.people.qing.life={activity:'idle'};
 assert.equal(shareConvoyNews(g.sim,'porter','qing',g.eco.positions),true);
 assert.equal(g.s.convoy.aftermath.known.qing.subject,'fu');assert.equal(g.s.appearance.reputations.fu.factions.qingzhu,18);assert.equal(factionRep(g.s,'qingzhu'),0);
 assert.equal(convoyAftermathOptions(g.sim,'qing').length,0,'unmasked player is not the subject of the invitation');
 shareConvoyNews(g.sim,'porter','gang_boss',g.eco.positions);shareConvoyNews(g.sim,'porter','inspector',g.eco.positions);
 assert.equal(g.s.appearance.reputations.fu.factions.gang,-8);assert.equal(g.s.appearance.reputations.fu.factions.court,-20);assert.ok(g.s.appearance.rumors.fu.hearers.includes('qing'));
});
test('one convoy creates one reputation consequence per faction and one public renown claim across reload',()=>{
 const g=setup();const before=cityRep(g.s);recordConvoyTheft(g.sim,g.eco,g.event,g.item);
 shareConvoyNews(g.sim,'porter','qing',g.eco.positions);shareConvoyNews(g.sim,'porter','tea_host',g.eco.positions);
 assert.equal(cityRep(g.s),before+5);assert.equal(factionRep(g.s,'qingzhu'),18);
 const other=g.eco.create('第二件纲货','cargo','player',{convoyCargo:'stone'});recordConvoyTheft(g.sim,g.eco,g.event,other);
 const sim=new Simulation(JSON.parse(JSON.stringify(g.s)));sim.save=()=>{};
 assert.equal(shareConvoyNews(sim,'porter','qing',g.eco.positions),false);assert.equal(cityRep(sim.s),before+5);assert.equal(factionRep(sim.s,'qingzhu'),18);
});
test('a messenger walks around a wall and delivers only when near; incapacitation pauses the route',()=>{
 const g=setup();recordConvoyAftermath(g.sim,g.event,g.item);g.eco.positions.porter={x:0,z:0};g.eco.positions.qing={x:6,z:0};
 const world=worldFor(g);world.obstacles=[{x:3,z:0,w:1,d:3}];const n=world.npcs.get('porter');g.s.people.porter.stunnedUntil=100;
 assert.equal(convoyAftermathMotion(world,'porter',n,.1),false);assert.equal(world.steps.length,0);g.s.people.porter.stunnedUntil=0;
 for(let i=0;i<300&&!g.s.convoy.aftermath.known.qing;i++){world.t+=.1;g.s.npcClock=world.t;convoyAftermathMotion(world,'porter',n,.1);}
 assert.ok(g.s.convoy.aftermath.known.qing);assert.ok(world.steps.some(q=>Math.abs(q.z)>1.5));assert.ok(world.steps.every(q=>!world.collides(q.x,q.z)));assert.ok(n.actor.position.distanceTo(world.npcs.get('qing').actor.position)<3);
});
test('inviter visits the reported scene without locating an unseen player, and invitation waits for real speech',()=>{
 const g=setup();recordConvoyAftermath(g.sim,g.event,g.item);shareConvoyNews(g.sim,'porter','qing',g.eco.positions);
 g.eco.positions.qing={x:6,z:0};Object.assign(g.s.player,{x:20,z:20});const world=worldFor(g),n=world.npcs.get('qing');
 convoyAftermathMotion(world,'qing',n,.1);assert.ok(n.actor.position.x<6);assert.equal(g.s.convoy.aftermath.invitation.lastSeen,undefined);
 Object.assign(g.s.player,{x:1,z:2});world.hero.position.set(1,0,2);n.actor.position.set(1,0,0);n.actor.rotation.y=0;world.onConvoySpeech=()=>false;convoyAftermathFrame(world);assert.equal(g.s.convoy.aftermath.invitation.offered,undefined);
 world.onConvoySpeech=()=>true;world.t+=2;convoyAftermathFrame(world);assert.equal(g.s.convoy.aftermath.invitation.offered,true);assert.ok(g.s.quests['qingzhu-invitation']);
});
test('invitation supports defer, accept, decline; enrollment and token settle once and do not clear the case',()=>{
 const g=setup();recordConvoyAftermath(g.sim,g.event,g.item);shareConvoyNews(g.sim,'porter','qing',g.eco.positions);
 assert.equal(resolveConvoyAftermath(g.sim,g.eco,'qing','ca_offer').success,true);assert.equal(convoyAftermathOptions(g.sim,'qing').length,3);
 resolveConvoyAftermath(g.sim,g.eco,'qing','ca_later');assert.equal(g.s.convoy.aftermath.invitation.status,'pending');g.s.wanted=4;
 assert.equal(resolveConvoyAftermath(g.sim,g.eco,'qing','ca_join').success,true);assert.equal(g.s.facts.career,'qingzhu');assert.equal(g.s.wanted,4);assert.ok(resolveConvoyAftermath(g.sim,g.eco,'qing','ca_join').error);
 assert.equal(g.eco.items('player').filter(i=>i.badge==='qingzhu').length,1);const org=knownOrganization(g.sim);assert.equal(org.nodes.find(n=>n.id==='player').faction,'青竹会');assert.ok(org.clues.some(c=>c.edges.some(([a,b])=>a==='qing'&&b==='player')));
 const other=setup();recordConvoyAftermath(other.sim,other.event,other.item);shareConvoyNews(other.sim,'porter','qing',other.eco.positions);resolveConvoyAftermath(other.sim,other.eco,'qing','ca_offer');resolveConvoyAftermath(other.sim,other.eco,'qing','ca_decline');assert.equal(other.s.facts.career,undefined);assert.equal(convoyAftermathOptions(other.sim,'qing').length,0);
});
test('reported severe convoy theft leads an officer to the scene and actual pursuit; unknown reports cannot convict',()=>{
 for(const subject of ['player',null]){
  const g=setup();g.event.identities.porter=subject;const c=recordCrimeScene(g.sim,g.event);assert.ok(c.convoy);acceptCrimeReport(g.sim,{caseId:c.id,reporter:'porter',officer:'inspector'});
  const world=worldFor(g);g.s.npcClock=20;world.t=20;world.npcs.get('inspector').actor.position.set(0,0,1);investigationMotion(world,'inspector',world.npcs.get('inspector'),.1);
  assert.equal(g.s.people.inspector.awareness?.state,subject?'fight':undefined);
 }
});
test('severe pursuers keep pursuing an unarmed suspect and path around obstacles',()=>{
 const g=setup();Object.assign(g.s.player,{x:6,z:0});g.eco.positions.inspector={x:0,z:0};g.s.people.inspector.awareness={state:'fight',home:{x:0,z:0},lastKnown:{x:6,z:0},severe:true,caseOpen:true,suspect:'player',until:200};
 assert.equal(advanceAwareness(g.sim,'inspector',{x:0,z:0},true,.1,false).state,'fight');
 const world=worldFor(g);world.obstacles=[{x:3,z:0,w:.5,d:2}];const n=world.npcs.get('inspector');
 for(let i=0;i<100&&n.actor.position.distanceTo(world.hero.position)>1.8;i++){world.t+=.1;g.s.npcClock=world.t;world.reactNpc('inspector',n,.1);}
 assert.ok(n.actor.position.distanceTo(world.hero.position)<1.8);assert.ok(world.steps.some(q=>Math.abs(q.z)>1));assert.ok(world.steps.every(q=>!world.collides(q.x,q.z)));
});
test('every officer captures into the actual prison from either side of the gate, with one imprisonment penalty',()=>{
 for(const id of ['guard','gate_guard','gate_relief','inspector'])for(const entered of [false,true]){
  const g=setup();g.s.facts.enteredCity=entered;if(entered)g.s.event={id:99,type:'ending',status:'resolved'};
  assert.equal(detainByOfficer(g.sim,id),true);assert.equal(g.s.event.gate.phase,'prison');assert.equal(g.s.player.x,PRISON.spawn.x);assert.equal(g.s.player.z,PRISON.spawn.z);
  const stats=JSON.stringify(g.s.player.stats);assert.equal(detainByOfficer(g.sim,id),false);assert.equal(JSON.stringify(g.s.player.stats),stats);
  assert.ok(gateActions(g.sim).some(a=>a.id==='g_serve'));assert.equal(resolveGate(g.sim,g.s.event.id,'g_serve').success,true);assert.equal(g.s.player.x,PRISON.release.x);
 }
});

test('a bystander reselects a real safe position when the wagon turns across the previous yielding place',()=>{
 const g=setup();Object.assign(g.s.convoy,{x:7.2,z:27.5,phase:'travel',heading:Math.PI/2});
 g.s.people.gate_relief={...g.s.people.gate_relief,hp:100,life:{activity:'yieldConvoy',target:{x:4.7,z:26.64}},convoyYield:{target:{x:4.7,z:26.64},direction:{x:0,z:-1},anchor:{x:4.7,z:29},previous:{activity:'idle'}}};
 g.eco.positions.gate_relief={x:4.98,z:26.7};assert.equal(yieldToConvoy(g.sim,g.eco,'gate_relief',g.eco.positions.gate_relief,g.eco.positions),true);
 assert.ok(Math.abs(g.s.people.gate_relief.life.target.z-27.5)>=3.1);assert.ok(Math.abs(g.s.people.gate_relief.convoyYield.direction.x+1)<.001);
});

test('capture closes only the attributed case and a disguised sentence stays on that observed identity',()=>{
 const g=setup();g.event.identities.porter='fu';const c=recordCrimeScene(g.sim,g.event);g.s.people.gate_relief.awareness={believedIdentity:'fu'};
 g.s.player.face={id:'fu',serial:12,until:1000};const before=cityRep(g.s);assert.ok(detainByOfficer(g.sim,'gate_relief'));assert.equal(c.state,'closed');assert.equal(c.custody.subject,'fu');assert.equal(g.s.player.face,null);
 resolveGate(g.sim,g.s.event.id,'g_serve');assert.equal(cityRep(g.s),before);assert.equal(g.s.appearance.reputations.fu.cities.linxi,-10);
});

test('a smaller turn also invalidates a yield target that has slipped back inside the new wagon lane',()=>{
 const g=setup();Object.assign(g.s.convoy,{x:0,z:25.4,phase:'travel',heading:0});g.s.watch={holder:'gate_guard'};
 const n=g.s.people.gate_guard;n.life={activity:'yieldConvoy',target:{x:1.726,z:23.14}};n.convoyYield={target:n.life.target,direction:{x:-.4,z:-.9165},anchor:{x:0,z:23.8},previous:{activity:'duty'}};g.eco.positions.gate_guard={x:1.4,z:23.3};
 assert.ok(yieldToConvoy(g.sim,g.eco,'gate_guard',g.eco.positions.gate_guard,g.eco.positions));assert.ok(Math.abs(n.life.target.x)>=3.1);
});

test('an NPC clipped by an old wagon margin can step out, but never advance deeper through it or another wall',()=>{
 const g=setup();Object.assign(g.s.convoy,{x:0,z:23.7,heading:0});g.eco.positions.gate_guard={x:1.72,z:23};const w=worldFor(g),actor=w.npcs.get('gate_guard').actor;
 w.props=[];w.obstacles=[{id:'flowerstone-cart',x:0,z:23.7,w:2.9,d:3.7}];w.collides=World.prototype.collides;w.move=World.prototype.move;w.npcMoveDt=.1;
 const before=actor.position.x;w.move(actor,-.01,0);assert.equal(actor.position.x,before);
 for(let i=0;i<10;i++){w.t+=.1;w.move(actor,.02,0);}assert.ok(actor.position.x>1.75);assert.equal(actor.position.z,23);
 w.obstacles.push({id:'test-wall',x:2.2,z:23,w:.2,d:3});const at=actor.position.x;w.move(actor,.2,0);assert.equal(actor.position.x,at);
});
