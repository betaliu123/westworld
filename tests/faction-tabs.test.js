import test from 'node:test';import assert from 'node:assert/strict';
import {Simulation,newArrival} from '../src/simulation.js';
import {organizationHTML,meet,learn,personTab} from '../src/factions.js';
test('rumors, personal acquaintances and discovered affiliations have distinct views',()=>{
 const sim=new Simulation(newArrival()),html=tab=>organizationHTML(sim,x=>x,tab);
 learn(sim,'watch','旁听');meet(sim,'scribe');sim.s.people.scribe.relation=-7;
 assert.match(html('官府'),/韩校尉/);assert.doesNotMatch(html('我的结交'),/韩校尉/);
 assert.match(html('我的结交'),/好感 -7/);assert.doesNotMatch(html('赤砂帮'),/刻字人/);
 sim.s.people.scribe.probed=true;assert.equal(personTab(sim,'scribe'),'赤砂帮');
 assert.match(html('赤砂帮'),/刻字人/);assert.doesNotMatch(html('官府'),/刻字人/);
});
