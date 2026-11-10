import test from 'node:test';import assert from 'node:assert/strict';
import {Simulation,legacyArrival as newArrival} from '../src/simulation.js';import {Ecosystem} from '../src/ecosystem.js';
import {contactResolve,contactFollowups,contactPreview} from '../src/gate-society.js';
import {lifeStep,POST} from '../src/npc-life.js';
test('offer immediately branches into purchase or decline and disappears when stock leaves',()=>{
 const sim=new Simulation(newArrival()),eco=new Ecosystem(sim,[]);sim.s.people.scribe.probed=true;sim.s.player.money=0;
 const quote=contactResolve(sim,eco,'scribe','ink_sign'),options=contactFollowups(sim,'scribe',quote);assert.deepEqual(options.map(a=>a.id),['ink_buy','ink_decline']);assert.ok(contactPreview(sim,'scribe',options[0]).blocked);assert.equal(sim.s.player.money,0);eco.transfer(eco.items('npc:scribe').find(i=>i.type==='poison'),'player');assert.deepEqual(contactFollowups(sim,'scribe',quote),[]);
});
test('each relief patrol reverses between grove and river; posted guard remains on duty',()=>{
 for(const off of ['gate_guard','gate_relief']){const sim=new Simulation(newArrival()),eco=new Ecosystem(sim,[]),holder=off==='gate_guard'?'gate_relief':'gate_guard';sim.s.watch.holder=holder;eco.s.hunger[off]=20;const reached=new Set();let pos=POST;
 for(let i=0;i<12;i++){lifeStep(sim,eco,.1,{[holder]:POST,[off]:pos});const n=sim.s.people[off];assert.equal(n.life.activity,'patrol');assert.equal(sim.s.people[holder].life.activity,'duty');pos=n.life.target;reached.add(pos.x);}
 assert.ok(reached.has(21)&&reached.has(-17));}
});
