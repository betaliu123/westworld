import test from 'node:test';import assert from 'node:assert/strict';import {perceiveIncident as sense} from '../src/npc-awareness.js';import {Simulation,newArrival} from '../src/simulation.js';
test('a hedge, distance or facing away protects an isolated attack from identification',()=>{
 const e={type:'assault',target:'gate_merchant'};assert.equal(sense(e,'gate_merchant',1,-1,true),'seen');assert.equal(sense(e,'gate_guard',5,1,true),'seen');assert.equal(sense(e,'gate_guard',7,1,true),null);assert.equal(sense(e,'gate_guard',3,-1,true),'heard');assert.equal(sense(e,'gate_guard',4,1,false),null);
 const sim=new Simulation(newArrival());sim.listeners.push((t,e)=>{if(t==='worldIncident')e.witnesses=['gate_merchant'];});sim.attack('gate_merchant',['gate_guard']);assert.notEqual(sim.s.people.gate_guard.mood,'angry');assert.ok(!sim.s.people.gate_guard.fear);
});
