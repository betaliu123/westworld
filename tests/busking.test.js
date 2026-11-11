import test from 'node:test';
import assert from 'node:assert/strict';
import {Simulation,newArrival} from '../src/simulation.js';
import {Ecosystem} from '../src/ecosystem.js';

test('busking preview and execution share requirements without rolling or charging on rejection',()=>{
 let rolls=0;const sim=new Simulation(newArrival(),()=>{rolls++;return 0;}),eco=new Ecosystem(sim),p=sim.s.player;
 function rejected(reason){const before={energy:p.energy,money:p.money,rolls};assert.match(eco.showRequirement(),reason);assert.equal(eco.startShow(p.x,p.z),eco.showRequirement());assert.ok(!eco.show);assert.deepEqual({energy:p.energy,money:p.money,rolls},before);}
 rejected(/乐器入门/);p.skills.music.tier=2;rejected(/竹笛/);
 const flute=eco.create('苏晚的竹笛','flute','player');flute.hp=0;rejected(/竹笛/);flute.hp=30;
 p.bedRest={bedId:'bed'};rejected(/起身/);delete p.bedRest;
 p.energy=14;rejected(/15/);p.energy=15;p.hp=0;rejected(/恢复/);p.hp=100;
 assert.equal(eco.showRequirement(),'');assert.equal(eco.startShow(p.x,p.z),undefined);assert.ok(eco.show);assert.equal(rolls,1);
 eco.tick(.5,{});assert.equal(p.energy,12.5);eco.stopShow();assert.equal(eco.show,null);
});

test('learned music and carried flute remain usable after loading without duplicating either',()=>{
 const sim=new Simulation(newArrival(),()=>0),eco=new Ecosystem(sim);sim.s.player.skills.music.tier=2;eco.create('苏晚的竹笛','flute','player');
 const saved=JSON.parse(JSON.stringify(sim.s)),loaded=new Simulation(saved,()=>0),restored=new Ecosystem(loaded);
 assert.equal(restored.showRequirement(),'');assert.equal(restored.items('player').filter(i=>i.type==='flute').length,1);
 restored.startShow(loaded.s.player.x,loaded.s.player.z);assert.ok(restored.show);restored.stopShow();assert.equal(restored.showRequirement(),'');
 assert.equal(restored.items('player').filter(i=>i.type==='flute').length,1);assert.equal(loaded.s.player.skills.music.tier,2);
});
