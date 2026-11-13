import test from 'node:test';import assert from 'node:assert/strict';import {Simulation,legacyArrival as newArrival} from '../src/simulation.js';import {encounterStep,occupied} from '../src/npc-territory.js';
const pos={gang_boss:{x:23,z:-5},guard:{x:23,z:-4}};
function setup(){let sim=new Simulation(newArrival(),()=>0);sim.s.player.x=23;sim.s.player.z=-5;sim.s.wanted=2;return sim;}
for(const wins of [true,false])test('territory contest with actual opposing rolls: defender wins '+wins,()=>{
 const sim=setup(),s=sim.s;let rolls=[wins?.9:0,wins?0:.99];sim.rng=()=>rolls.shift();const step=t=>{s.npcClock=t;encounterStep(sim,pos);};
 step(0);assert.ok(occupied(s,'guard'));step(1);assert.equal(s.territory.active.phase,'bout');step(3);assert.equal(s.territory.active.loser,wins?'guard':'gang_boss');assert.equal(rolls.length,0);assert.ok(s.people.guard.hp>0&&s.people.gang_boss.hp>0);assert.equal(s.wanted,2);step(16);assert.equal(occupied(s,'guard'),wins);s.player.z=9;step(17);assert.ok(!occupied(s,'guard'));
});
test('a personal ally can cross hostile faction lines, an unseen guest causes no response',()=>{const sim=setup();encounterStep(sim,pos,[{x:23,z:-4.5,w:2,d:.6}]);assert.ok(!sim.s.territory.active);sim.s.people.gang_boss.bonds={guard:55};sim.s.npcClock=2;encounterStep(sim,pos);assert.equal(sim.s.people.gang_boss.bonds.guard,56);assert.ok(!sim.s.territory.active);});
test('nearby journal receives one verdict or an explicit interruption',()=>{
 for(const interrupted of [false,true]){const sim=setup(),log=[];sim.listeners.push((type,d)=>{if(type==='territoryReport')log.push(d.text);});
 for(const t of [0,1,3,4]){sim.s.npcClock=t;encounterStep(sim,interrupted&&t>=3?{...pos,guard:{x:23,z:0}}:pos);}
 assert.equal(log.length,1);assert.match(log[0],interrupted?/未分胜负/:/梅掌舵.*比.*陆捕头.*梅掌舵胜.*门外/);}
});
