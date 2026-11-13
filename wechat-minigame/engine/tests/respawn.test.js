import test from 'node:test';
import assert from 'node:assert/strict';
import {Simulation,newArrival,newGame} from '../src/simulation.js';
import {World} from '../src/world.js';
import {PRISON} from '../src/locations.js';
import * as T from '../vendor/three.module.js';

function movementWorld(sim){
 const w=Object.create(World.prototype);
 Object.assign(w,{sim,props:[],obstacles:[],hero:{position:new T.Vector3(sim.s.player.x,0,sim.s.player.z)},heroVel:new T.Vector3(),keys:new Set(['KeyW']),npcs:new Map()});
 return w;
}
for(const stage of ['outside','inside','prison'])test(`respawn permits movement in all four directions: ${stage}`,()=>{
 const s=stage==='inside'?newGame():newArrival();
 if(stage==='prison')s.event.gate.phase='prison';
 const sim=new Simulation(s),w=movementWorld(sim);
 s.player.hp=0;s.player.bedRest={phase:'sleep'};s.player.crouched=s.player.stealing=true;
 assert.equal(sim.respawn(),true);w.resetAfterRest();
 assert.equal(s.player.bedRest,undefined);assert.equal(s.player.crouched,false);assert.equal(s.player.stealing,false);
 const point=stage==='outside'?{x:0,z:27}:stage==='prison'?PRISON.spawn:{x:0,z:14};
 assert.equal(s.player.x,point.x);assert.equal(s.player.z,point.z);
 assert.equal(w.hero.position.x,point.x);assert.equal(w.hero.position.z,point.z);
 for(const [dx,dz]of [[.1,0],[-.1,0],[0,.1],[0,-.1]]){
  w.hero.position.set(point.x,0,point.z);w.move(w.hero,dx,dz);
  assert.equal(w.hero.position.x,point.x+dx);assert.equal(w.hero.position.z,point.z+dz);
 }
});
test('a legacy gate save stranded at the old respawn point is repaired without clearing progress',()=>{
 const s=newArrival();s.player.x=0;s.player.z=14;s.player.hp=60;s.player.money=7;s.facts.gatePassTaken=true;s.people.scribe.relation=12;
 const sim=new Simulation(s);
 assert.equal(s.player.z,27);assert.equal(s.player.hp,60);assert.equal(s.player.money,7);assert.equal(s.facts.gatePassTaken,true);assert.equal(s.people.scribe.relation,12);assert.equal(s.day,1);
 const restored=new Simulation(JSON.parse(JSON.stringify(sim.s)));assert.equal(restored.s.player.z,27);
});
test('valid city and gate positions are not moved while loading',()=>{
 for(const s of [newGame(),newArrival()]){const before={x:s.player.x,z:s.player.z};new Simulation(s);assert.equal(s.player.x,before.x);assert.equal(s.player.z,before.z);}
});
