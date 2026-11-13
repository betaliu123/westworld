import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../vendor/three.module.js';
import {World} from '../src/world.js';
import {Simulation,newArrival} from '../src/simulation.js';
import {CART,CONVOY_GATE,CONVOY_STONE} from '../src/convoy.js';
import {routinePath} from '../src/npc-navigation.js';

function fixture(state=newArrival()){
 const sim=new Simulation(state),hero=new T.Group(),npc=new T.Group();
 hero.position.set(5.5,0,33);npc.position.copy(hero.position);
 const w=Object.assign(Object.create(World.prototype),{sim,hero,npcs:new Map([['porter',{actor:npc}]]),props:[],t:0,npcMoveDt:.1,
  obstacles:[{id:CART,...CONVOY_GATE,w:2.9,d:3.7},{id:'convoy-trial-stone',...CONVOY_STONE,w:1,d:1}]});
 return {sim,w,hero,npc};
}

test('player and NPC can walk across the former south boundary and behind the cart',()=>{
 const {w,hero,npc}=fixture();
 for(const actor of [hero,npc]){
  for(let i=0;i<120;i++){w.t+=.1;w.move(actor,0,.1);}
  assert.ok(actor.position.z>40,'movement must cross the old z=34 wall');
 }
 const blocked=(x,z)=>w.collides(x,z,0,false);
 const path=routinePath({x:5,z:35.5},{x:11,z:35.5},blocked);
 assert.ok(path.length,'NPC can use the open passage behind the cart');
 for(let x=5;x<=11;x+=.1)assert.equal(w.collides(x,35.5),false);
 assert.equal(w.collides(CONVOY_GATE.x,CONVOY_GATE.z),true,'cart stays solid');
 assert.equal(w.collides(CONVOY_STONE.x,CONVOY_STONE.z),true,'trial stone stays solid');
});

test('south verge survives saving without changing progress or the actual world limits',()=>{
 const {sim}=fixture();Object.assign(sim.s.player,{x:5,z:40,money:7});sim.s.people.porter.relation=12;
 const {w}=fixture(JSON.parse(JSON.stringify(sim.s)));
 assert.equal(w.sim.s.player.z,40);assert.equal(w.sim.s.player.money,7);assert.equal(w.sim.s.people.porter.relation,12);
 assert.equal(w.collides(5,40),false);assert.equal(w.collides(5,49.6),false);
 assert.equal(w.collides(5,49.8),true,'body stays on the visible ground');
 for(const [x,z]of [[31.1,40],[-31.1,40],[5,-34.1],[0,20]])assert.equal(w.collides(x,z),true);
 w.sim.s.event.gate.phase='prison';assert.equal(w.collides(5,40),true,'detention still confines the player');
});
