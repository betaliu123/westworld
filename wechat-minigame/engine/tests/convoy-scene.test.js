import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../vendor/three.module.js';
import {Simulation,newArrival} from '../src/simulation.js';
import {Ecosystem} from '../src/ecosystem.js';
import {CART,CONVOY_GATE,CONVOY_TOWN,convoyState,stockConvoy} from '../src/convoy.js';
import {updateConvoyScene,convoyPosts,convoyClear,convoyOverlaps,convoyPointCollision,admitCommandConvoy} from '../src/convoy-scene.js';
import {routinePath} from '../src/npc-navigation.js';

function fixture(state){
 const sim=new Simulation(state||newArrival());sim.save=()=>{};
 const group=new T.Group(),asset={id:CART,group,kind:'convoy',owner:'fu',name:'花石纲货车',...CONVOY_GATE,w:2.9,d:3.7,max:360,material:'wood'};
 const eco=new Ecosystem(sim,[asset]);stockConvoy(eco);
 const hero=new T.Group();hero.position.set(-10,0,10);
 const npcs=new Map(['porter','fu'].map((id,i)=>{const actor=new T.Group(),p=sim.s.people[id];actor.position.set(p.x??(i?8:5),0,p.z??(i?29:31));p.life={activity:'idle'};return [id,{actor,base:new T.Vector3()}];}));
 const obstacles=[{id:CART,...CONVOY_GATE,w:2.9,d:3.7},{id:'wanted-board',x:3.3,z:29.5,w:2.3,d:.18},{id:'cargo-cover',x:4.4,z:25.5,w:1.95,d:.75},{id:'bread-stall',x:6,z:22.95,w:2.3,d:1.1},{id:'west-wall',x:-4.95,z:21,w:3.9,d:.5},{id:'east-wall',x:5.45,z:21,w:4.9,d:.5},{id:'office-front',x:0,z:-20.5,w:8,d:.25}];
 const world={sim,convoyVisual:group,convoyCargo:Object.fromEntries(['stone','silk','cage'].map(k=>[k,new T.Group()])),convoyWheels:[],environmentAssets:[asset],obstacles,props:[],hero,npcs};
 return {sim,eco,world};
}
function advanceCrew(g,dt=.1){
 const c=convoyState(g.sim.s),blocked=(x,z)=>Math.abs(x)>31||Math.abs(z)>34||g.world.obstacles.some(o=>g.eco.s.objects[o.id]?.hp!==0&&(o.id===CART?convoyPointCollision(g.sim.s,x,z):Math.abs(x-o.x)<o.w/2+.3&&Math.abs(z-o.z)<o.d/2+.3));
 for(const [id,n]of g.world.npcs){const goal=c.posts[id];if(!goal)continue;
  const path=routinePath(n.actor.position,goal,blocked,.35),q=path[0]||goal,dx=q.x-n.actor.position.x,dz=q.z-n.actor.position.z,d=Math.hypot(dx,dz),step=Math.min(d,1.35*dt);
  if(d>.05){const x=n.actor.position.x+dx/d*step,z=n.actor.position.z+dz/d*step;if(!blocked(x,z)){n.actor.position.x=x;n.actor.position.z=z;}}
  Object.assign(g.sim.s.people[id],{x:n.actor.position.x,z:n.actor.position.z});
 }
}

test('cart and both crew physically cross the staging bay and stop by the office',()=>{
 const g=fixture(),c=convoyState(g.sim.s);updateConvoyScene(g.world,g.eco,.1);assert.equal(c.phase,'gate');
 g.sim.s.facts.enteredCity=true;
 const original=[...g.world.npcs.values()].map(n=>n.actor.position.clone());updateConvoyScene(g.world,g.eco,.1);
 assert.equal(c.phase,'travel');assert.ok([...g.world.npcs.values()].every((n,i)=>n.actor.position.equals(original[i])),'controller never teleports crew');
 let stalled=0,previous='';
 for(let frame=0;frame<3000&&c.phase!=='town';frame++){advanceCrew(g);updateConvoyScene(g.world,g.eco,.1);const progress=[c.x,c.z,c.heading].join(':');stalled=progress===previous?stalled+1:0;previous=progress;if(stalled>90)break;}
 assert.equal(c.phase,'town',JSON.stringify({x:c.x,z:c.z,route:c.route,heading:c.heading,posts:c.posts,crew:[...g.world.npcs].map(([id,n])=>[id,n.actor.position])}));
 assert.equal(c.x,CONVOY_TOWN.x);assert.equal(c.z,CONVOY_TOWN.z);assert.equal(g.sim.s.facts.convoyArrived,true);
 for(let i=0;i<80;i++){advanceCrew(g);updateConvoyScene(g.world,g.eco,.1);}
 for(const [id,n]of g.world.npcs)assert.ok(Math.hypot(n.actor.position.x-c.posts[id].x,n.actor.position.z-c.posts[id].z)<.6,JSON.stringify({id,position:n.actor.position,post:c.posts[id]}));
 assert.deepEqual({x:c.x,z:c.z},CONVOY_TOWN);
 for(const o of [g.world.environmentAssets[0],g.world.obstacles[0],g.eco.s.objects[CART]])assert.deepEqual({x:o.x,z:o.z},CONVOY_TOWN);
});

test('danger, incapacitation and missing crew pause the same cart without healing or teleporting',()=>{
 for(const change of [n=>n.hp=0,n=>n.stunnedUntil=100,n=>n.awareness={state:'fight',caseOpen:true},n=>n.life={activity:'sleep'}]){
  const g=fixture(),c=convoyState(g.sim.s);g.sim.s.facts.enteredCity=true;change(g.sim.s.people.porter);
  for(let i=0;i<10;i++)updateConvoyScene(g.world,g.eco,.1);
  assert.deepEqual({x:c.x,z:c.z},CONVOY_GATE);assert.equal(c.phase,'gate');
 }
 const g=fixture();g.sim.s.facts.enteredCity=true;g.world.npcs.delete('fu');updateConvoyScene(g.world,g.eco,.1);assert.equal(g.sim.s.convoy.phase,'gate');
});

test('cargo visibility, cart damage and an in-flight save keep the same physical state',()=>{
 const g=fixture(),c=convoyState(g.sim.s);Object.assign(c,{phase:'travel',x:0,z:4,route:2,heading:0});
 const item=g.eco.s.items.find(i=>i.convoyCargo==='silk');g.eco.transfer(item,'player','stolen');updateConvoyScene(g.world,g.eco,0);
 assert.equal(g.world.convoyCargo.silk.visible,false);assert.equal(g.world.convoyCargo.stone.visible,true);
 const loaded=fixture(JSON.parse(JSON.stringify(g.sim.s)));updateConvoyScene(loaded.world,loaded.eco,0);
 assert.equal(loaded.world.convoyVisual.position.z,4);assert.equal(loaded.sim.s.convoy.route,2);assert.equal(loaded.world.convoyCargo.silk.visible,false);
 assert.equal(loaded.eco.s.items.filter(i=>i.convoyCargo).length,3);
 loaded.eco.s.objects[CART].hp=0;updateConvoyScene(loaded.world,loaded.eco,.1);assert.equal(loaded.world.convoyVisual.visible,false);assert.equal(loaded.sim.s.convoy.z,4);
});

test('wagon footprint blocks walls and player while excluding only its own collision object',()=>{
 const g=fixture();g.world.npcs.clear();g.world.hero.position.set(-10,0,10);
 const cart={x:0,z:0,heading:0};assert.equal(convoyClear(g.world,g.eco,cart),true);
 g.world.obstacles.push({id:'solid',x:1,z:0,w:.2,d:2});assert.equal(convoyClear(g.world,g.eco,cart),false);
 g.eco.s.objects.solid={hp:0};assert.equal(convoyClear(g.world,g.eco,cart),true);
 g.world.hero.position.set(0,0,-2);assert.equal(convoyClear(g.world,g.eco,cart),false);
 assert.equal(convoyOverlaps({x:0,z:27.5,heading:Math.PI/4},{x:3.3,z:29.5,w:2.3,d:.18}),false);
 assert.deepEqual(convoyPosts({...CONVOY_TOWN,phase:'town'}),{porter:{x:-2.4,z:CONVOY_TOWN.z},fu:{x:2.4,z:CONVOY_TOWN.z}});
});

test('parked wagon leaves a walkable office porch and cross passage',()=>{
 const g=fixture(),c=convoyState(g.sim.s);Object.assign(c,{...CONVOY_TOWN,phase:'town',heading:0});
 const blocked=(x,z)=>convoyPointCollision(g.sim.s,x,z)||
  Math.abs(z+20.5)<.425&&Math.abs(x)>.45&&Math.abs(x)<4.3;
 assert.equal(blocked(0,-19.6),false);
 assert.ok(routinePath({x:0,z:-21.25},{x:0,z:-19.6},blocked).length,'walk out through the open door');
 assert.ok(routinePath({x:0,z:-19.6},{x:5,z:-19.6},blocked).length,'walk sideways past the wagon');
});

test('old parked saves back the same wagon out once, and resume mid-adjustment',()=>{
 let g=fixture(),c=convoyState(g.sim.s);Object.assign(c,{x:0,z:-17.8,phase:'town',heading:0});
 g.sim.s.facts.convoyArrived=true;g.eco.s.objects[CART].hp=123;
 const cargo=g.eco.s.items.find(i=>i.convoyCargo==='silk');g.eco.transfer(cargo,'player','stolen');
 for(const [id,n]of g.world.npcs){const p=convoyPosts(c)[id];n.actor.position.set(p.x,0,p.z);Object.assign(g.sim.s.people[id],p);}
 const facts=JSON.stringify(g.sim.s.facts),count=g.eco.s.items.length;
 updateConvoyScene(g.world,g.eco,.1);assert.ok(c.z>-17.8&&c.z<-17.6,'adjustment walks instead of snapping');
 g=fixture(JSON.parse(JSON.stringify(g.sim.s)));c=convoyState(g.sim.s);
 for(let i=0;i<100;i++){advanceCrew(g);updateConvoyScene(g.world,g.eco,.1);}
 assert.deepEqual({x:c.x,z:c.z},CONVOY_TOWN);assert.equal(c.reparking,undefined);assert.equal(c.phase,'town');
 assert.equal(g.eco.s.objects[CART].hp,123);assert.equal(g.eco.s.items.find(i=>i.id===cargo.id).location,'player');
 assert.equal(g.eco.s.items.length,count);assert.equal(JSON.stringify(g.sim.s.facts),facts);
 updateConvoyScene(g.world,g.eco,.1);assert.deepEqual({x:c.x,z:c.z},CONVOY_TOWN);
});

test('either recipient physically drives the commanded convoy through the real staging obstacles',()=>{
 for(const [subject,receiver]of [['fu','porter'],['porter','fu']]){
  const g=fixture(),c=convoyState(g.sim.s);c.command={subject,receiver,originalPost:{x:20,z:30}};c.phase='travel';g.world.npcs.get(subject).actor.position.set(20,0,30);g.world.npcs.get(receiver).actor.position.set(5,0,31);
  const original=g.world.npcs.get(subject).actor.position.clone();let crossed=false;
  for(let i=0;i<1800&&c.phase!=='town';i++){updateConvoyScene(g.world,g.eco,.1);advanceCrew(g);if(c.z<21)crossed=true;}
  assert.equal(crossed,true,subject+' convoy must cross without the original following');assert.equal(c.phase,'town');assert.ok(g.world.npcs.get(subject).actor.position.distanceTo(original)<.2);
 }
});

test('command passage checks real convoy proximity, guard sight and contradictions without relocating player',()=>{
 const g=fixture(),c=convoyState(g.sim.s),s=g.sim.s;c.phase='travel';c.x=0;c.z=24;c.command={subject:'fu',receiver:'porter',originalPost:{x:20,z:30}};
 s.player.face={id:'fu',serial:12,until:1000};Object.assign(s.player,{x:-1.9,z:26.5});g.world.hero.position.set(-1.9,0,26.5);g.world.npcs.get('porter').actor.position.set(0,0,21);g.world.npcs.get('fu').actor.position.set(20,0,30);
 const guard=new T.Group();guard.position.set(0,0,23.8);g.world.npcs.set('gate_guard',{actor:guard,base:new T.Vector3()});g.world.obstacles=[];
 g.sim.s.people.gate_guard.hp=0;assert.equal(admitCommandConvoy(g.world,g.eco),false);g.sim.s.people.gate_guard.hp=100;
 const at={x:s.player.x,z:s.player.z};assert.equal(admitCommandConvoy(g.world,g.eco),true);assert.equal(s.facts.entryRoute,'convoy-command');assert.deepEqual({x:s.player.x,z:s.player.z},at);assert.equal(admitCommandConvoy(g.world,g.eco),false);
});
