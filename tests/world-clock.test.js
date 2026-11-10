import test from 'node:test';
import assert from 'node:assert/strict';
import {Simulation,newArrival} from '../src/simulation.js';
import {clockText,untilTime} from '../src/world-clock.js';

test('waiting through midnight leaves the gate active and sleeping until dawn restores rest',()=>{
 const sim=new Simulation(newArrival()),s=sim.s,p=s.player;
 p.hp=50;
 sim.passTime(untilTime(s,'00:15'));
 assert.equal(clockText(s),'深夜 00:15');
 assert.equal(s.day,1);
 assert.equal(p.hp,50);
 assert.ok(p.satiety<25);
 const rest=p.rested;
 sim.passTime(untilTime(s,'06:00'),true);
 assert.equal(s.day,2);
 assert.equal(sim.event.type,'gate');
 assert.ok(p.rested>rest && p.hp>50);
});
test('a pending letter arrives at the following dawn, not at midnight',()=>{
 const sim=new Simulation(),s=sim.s;
 sim.resolve(1,'cheer');
 sim.passTime(untilTime(s,'05:59'));
 assert.equal(s.mail.length,0);
 sim.passTime(untilTime(s,'06:00'));
 assert.equal(s.mail.length,1);
 assert.equal(clockText(s),'清晨 06:00');
});
