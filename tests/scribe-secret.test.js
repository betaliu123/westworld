import test from 'node:test';import assert from 'node:assert/strict';
import {Simulation,legacyArrival as newArrival} from '../src/simulation.js';import {Ecosystem} from '../src/ecosystem.js';import {contactOptions,contactResolve} from '../src/gate-society.js';import {probeNpc,npcInfo} from '../src/npc-discovery.js';
test('scribe: discover the sign, speak in confidence, transfer the one real packet',()=>{
 const sim=new Simulation(newArrival(),()=>0),eco=new Ecosystem(sim,[]);Object.assign(sim.s.player,{x:11,z:24});eco.positions.scribe={x:11,z:24};const opts=()=>contactOptions(sim,'scribe').map(a=>a.id);
 const packet=eco.items('npc:scribe').find(i=>i.type==='poison'),initial=sim.s.player.money;assert.ok(!opts().includes('ink_sign'));assert.notEqual(npcInfo(sim,eco,'scribe').faction,'赤砂帮');
 assert.ok(probeNpc(sim,'scribe').success);assert.equal(npcInfo(sim,eco,'scribe').faction,'赤砂帮');assert.ok(!opts().includes('ink_buy'));contactResolve(sim,eco,'scribe','ink_sign');assert.ok(opts().includes('ink_buy'));
 contactResolve(sim,eco,'scribe','ink_buy');assert.equal(packet.location,'player');assert.equal(sim.s.player.money,initial-5);assert.ok(!opts().includes('ink_buy'));assert.equal(new Ecosystem(sim,[]).items('npc:scribe').filter(i=>i.type==='poison').length,0);
});
