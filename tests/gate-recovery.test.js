import test from 'node:test';
import assert from 'node:assert/strict';
import {Simulation,newArrival} from '../src/simulation.js';
import {visitGate,gateView} from '../src/gate-scene.js';

function failedUniform(){
 const sim=new Simulation(newArrival(),()=>.99);
 Object.assign(sim.s.player,{x:0,z:24,disguise:'runner'});
 sim.s.player.inventory.push('旧差役服');
 assert.equal(sim.resolve(sim.event.id,'g_order').success,false);
 return sim;
}

for(const reload of [false,true])test(`learning the missing name reopens certain admission after failure, reload=${reload}`,()=>{
 let sim=failedUniform();
 sim.s.facts.runnerNameKnown=true;
 if(reload)sim=new Simulation(JSON.parse(JSON.stringify(sim.s)),()=>.99);
 assert.equal(sim.preview({id:'g_order'}).chance,100);
 assert.ok(sim.actions().some(a=>a.id==='g_order'));
 const r=sim.resolve(sim.event.id,'g_order');
 assert.equal(r.success,true);assert.equal(r.roll,null);
 assert.equal(sim.s.facts.entryRoute,'uniform');
 assert.equal(sim.s.player.skills.insight.xp,24,'six from the failed check plus eighteen for first admission; no repeated check reward');
});

test('unchanged or still uncertain circumstances do not permit another roll',()=>{
 const sim=failedUniform();
 assert.ok(!sim.actions().some(a=>a.id==='g_order'));
 assert.ok(sim.resolve(sim.event.id,'g_order').error);
 sim.s.player.disguise=null;sim.s.player.disguise='runner';
 assert.ok(!sim.actions().some(a=>a.id==='g_order'),'changing clothes does not reset the attempt');
 sim.s.facts.runnerNameKnown=true;sim.s.player.gender='female';
 assert.equal(sim.preview({id:'g_order'}).chance,35);
 assert.ok(!sim.actions().some(a=>a.id==='g_order'));
});

test('a reported pass is not reopened just because its owner name was learned',()=>{
 const sim=new Simulation(newArrival(),()=>.99);
 Object.assign(sim.s.player,{x:0,z:24});sim.s.player.inventory.push('他人的路引');
 sim.s.watch={holder:'gate_relief'};Object.assign(sim.s.people.gate_merchant,{x:12,z:24});
 assert.equal(sim.resolve(sim.event.id,'g_present').success,false);
 sim.s.facts.knownNames={gate_merchant:true};sim.s.facts.passReported=true;
 assert.equal(sim.preview({id:'g_present'}).chance,0);
 assert.ok(!sim.actions().some(a=>a.id==='g_present'));
});

test('the guard speaking before the check also gives its result',()=>{
 const sim=new Simulation(newArrival(),()=>.99);
 Object.assign(sim.s.player,{x:0,z:24,disguise:'runner'});
 sim.s.player.inventory.push('旧差役服');sim.s.watch={holder:'gate_relief'};
 visitGate(sim,'gate_relief');
 assert.equal(gateView(sim).listener,'gate_relief');
 assert.equal(sim.resolve(sim.event.id,'g_order').dialogue[0].id,'gate_relief');
});
