import test from 'node:test';
import assert from 'node:assert/strict';
import {Simulation,newGame} from '../src/simulation.js';
import {switchMember,localCommand,validCommand} from '../src/party-state.js';
import {Ecosystem} from '../src/ecosystem.js';
test('switch keeps independent physical state and shares money and ring ownership across save/load',()=>{
 const sim=new Simulation(newGame());const a=sim.s.player;a.hp=40;a.stats.charm=80;a.inventory.push('ring');assert.ok(switchMember(sim.s,'companion'));const b=sim.s.player;assert.equal(b.hp,100);b.x=8;b.money-=4;assert.equal(a.money,76);b.inventory=[];assert.equal(a.inventory.length,0);
 const restored=new Simulation(JSON.parse(JSON.stringify(sim.s)));assert.equal(restored.s.player.x,8);assert.equal(restored.s.party.active,'companion');switchMember(restored.s,'main');assert.equal(restored.s.player.hp,40);assert.equal(restored.s.player.stats.charm,80);assert.equal(restored.s.player.money,76);assert.equal(switchMember(restored.s,'unknown'),false);
});
test('A performs while B leaves: A spends stamina, earns charm and shared money; exhausted A stops',()=>{
 const sim=new Simulation(newGame(),()=>0),eco=new Ecosystem(sim,[]),a=sim.s.player;eco.startShow(a.x,a.z);switchMember(sim.s,'companion');const b=sim.s.player;b.x=24;b.z=24;eco.tick(8,{elder:{x:1,z:14}});assert.ok(eco.show);assert.equal(a.energy,60);assert.equal(b.energy,100);assert.equal(a.stats.charm,41);assert.equal(b.stats.charm,65);assert.equal(b.money,84);eco.tick(13,{});assert.equal(eco.show,null);assert.equal(a.energy,0);assert.equal(b.energy,100);
});
test('B performance also survives switching to A and cannot be silently replaced',()=>{
 const sim=new Simulation(newGame()),eco=new Ecosystem(sim,[]);switchMember(sim.s,'companion');eco.startShow(sim.s.player.x,sim.s.player.z);switchMember(sim.s,'main');assert.ok(eco.startShow(0,14));eco.tick(2,{});assert.equal(sim.s.party.members.companion.energy,90);assert.equal(sim.s.player.energy,100);assert.equal(eco.show.owner,'companion');
});
test('companion action settlement uses their location and team wallet',()=>{
 const sim=new Simulation(newGame()),eco=new Ecosystem(sim,[{id:'foodstall',kind:'stall',name:'食摊',x:12,z:14,owner:'inn'}]);const food=eco.items('object:foodstall')[0];assert.ok(eco.act('buy','foodstall',food.id));const a=sim.s.player,b=sim.s.party.members.companion;b.x=12;b.z=14;try{sim.s.player=b;assert.equal(eco.act('buy','foodstall',food.id),undefined);}finally{sim.s.player=a;}assert.equal(a.money,76);assert.equal(food.location,'player');
});
test('command targets validate type and location; unsupported commands cannot execute',()=>{
 assert.equal(validCommand('buy',{x:0,z:0,kind:'tree'}),false);assert.equal(validCommand('pickup',{x:0,z:0,kind:'ground'}),true);assert.equal(validCommand('move',null),false);assert.equal(validCommand('attack',{}),false);assert.equal(localCommand('留在这里吹笛'),'perform');assert.equal(localCommand('不要吹笛'),'wait');assert.equal(localCommand('今天天气怎么样'),null);
});
