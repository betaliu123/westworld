import test from 'node:test';import assert from 'node:assert/strict';
import {Simulation,legacyArrival as newArrival} from '../src/simulation.js';
import {Ecosystem} from '../src/ecosystem.js';
import {contactResolve} from '../src/gate-society.js';
import {socialPreview,socialResolve,socialOptions} from '../src/npc-social.js';
test('care for the prince changes the actual friendship roll and survives old saves',()=>{
 const sim=new Simulation(newArrival(),()=>.60),eco=new Ecosystem(sim,[]),id='traveler',n=sim.s.people[id];
 const chance=()=>socialPreview(sim,id,socialOptions(sim,id)[0]).chance;
 const before=chance();n.sickUntil=eco.s.time+20;eco.positions[id]={x:sim.s.player.x,z:sim.s.player.z};
 const r=contactResolve(sim,eco,id,'care');assert.ok(r.success);assert.ok(chance()>=before+45);
 const after=chance();delete n.receivedCare;assert.equal(chance(),after);
 const result=socialResolve(sim,id,'befriend');assert.equal(result.check.chance,after);assert.ok(result.success);
});
