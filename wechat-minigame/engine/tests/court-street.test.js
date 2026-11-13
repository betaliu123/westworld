import test from 'node:test';import assert from 'node:assert/strict';
import {Simulation,legacyArrival as newArrival} from '../src/simulation.js';import {Ecosystem} from '../src/ecosystem.js';
import {contactResolve} from '../src/gate-society.js';import {knownOrganization} from '../src/factions.js';import {arrestWitness} from '../src/court-street.js';
for(const solved of [true,false])test('old officer save and competitive appointment: delivered='+solved,()=>{
 const s=newArrival();s.facts.career='court';const sim=new Simulation(s,()=>0),eco=new Ecosystem(sim,[]);
 assert.equal(s.factions['六扇门'],20);assert.ok(knownOrganization(sim).nodes.some(n=>n.id==='vacancy'));
 contactResolve(sim,eco,'inspector','court_run');s.people.thief.custodyDelivered=solved;s.wanted=0;
 contactResolve(sim,eco,'inspector','court_review');assert.equal(s.facts.courtHead,solved?'player':'gate_guard');assert.ok(contactResolve(sim,eco,'inspector','court_review').error);
});
test('warrant witnesses do not criminalize lawful custody; gang enforcer intervenes',()=>{
 const sim=new Simulation(newArrival()),q={x:1,z:2},wanted=sim.s.wanted;
 for(const id of ['merchant','gate_guard','chi'])arrestWitness(sim,id,q,{...q,target:'thief'});
 assert.equal(sim.s.people.chi.awareness.state,'fight');assert.ok(!sim.s.people.merchant.awareness);assert.ok(!sim.s.people.gate_guard.awareness);assert.equal(sim.s.wanted,wanted);
});
