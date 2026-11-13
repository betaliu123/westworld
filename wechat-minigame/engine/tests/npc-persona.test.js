import test from 'node:test';import assert from 'node:assert/strict';
import {Simulation,newGame} from '../src/simulation.js';import {Ecosystem} from '../src/ecosystem.js';import {probeNpc} from '../src/npc-discovery.js';import {response,markEncounter} from '../src/npc-persona.js';import {careBonus} from '../src/care-rule.js';
test('betrayal changes friendship and probe reports live thoughts only once',()=>{
 const sim=new Simulation(newGame(),()=>0),n=sim.s.people.traveler;n.trust=8;n.receivedCare=true;
 assert.match(response(sim.s,'traveler','assault'),/递水/);markEncounter(sim.s,'traveler','assault');assert.equal(careBonus(sim.s,'traveler','befriend'),0);
 assert.match(probeNpc(sim,'traveler').insight,/出手/);assert.ok(probeNpc(sim,'traveler').cached);
 sim.rng=()=>.999;const r=probeNpc(sim,'scribe');assert.equal(r.success,false);assert.match(r.insight,/印面/);assert.ok(probeNpc(sim,'scribe').error);
});
test('120 performances: a shaky opening still draws individuals; payment costs the listener real coins',()=>{
 let pass=0,stay=0,pay=0,poorTip=0,ticks=0;
 for(let i=1;i<=120;i++){let seed=i*19283;const rng=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
 const sim=new Simulation(newGame(),rng),eco=new Ecosystem(sim,[]),p=sim.s.player,q={x:p.x,z:p.z},ids=['elder','gao','porter'];eco.startShow(q.x,q.z);const show=eco.show;
 let glances=0;sim.listeners.push(type=>{if(type==='musicLook')glances++;});const before=p.money;
 for(let t=0;t<48;t++){eco.tick(.25,Object.fromEntries(ids.map(id=>[id,q])));ticks++;}
 assert.equal(glances,3);const spent=ids.reduce((a,id)=>a+20-sim.s.people[id].purse,0);assert.equal(p.money,before);for(const i of eco.items('ground').filter(i=>i.owner==='player'))eco.act('pickup',null,i.id);assert.equal(p.money-before,spent);
 for(const id of ids){if(sim.s.people[id].purse<20){pay++;if(show.quality<0)poorTip++;}else if(show.paid.has(id))stay++;else pass++;}}
 assert.ok(pass&&stay&&pay&&poorTip);console.log({ticks,pass,stay,pay,poorTip});
});
