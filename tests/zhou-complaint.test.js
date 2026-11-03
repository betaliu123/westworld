import test from 'node:test';import assert from 'node:assert/strict';
import * as T from '../vendor/three.module.js';import {World} from '../src/world.js';import {Simulation,newArrival} from '../src/simulation.js';
test('failed pocketing from behind: Zhou turns, approaches and asks after the check',()=>{
 const sim=new Simulation(newArrival()),actor=new T.Group(),hero=new T.Group(),base=new T.Vector3();hero.position.set(0,0,-2.65);const n={actor,person:{id:'gate_relief',name:'周伍长'},base},w={sim,hero,npcs:new Map([['gate_relief',n]]),obstacles:[],t:0,showNpcCheck(){},collides(){return false;},animateActor(){},move(a,x,z){a.position.x+=x;a.position.z+=z;}};
 let asked=0;sim.listeners.push(type=>{if(type==='complaintAsk')asked++;});World.prototype.noticeIncident.call(w,{type:'theft',target:'gate_relief',owner:'gate_relief',caughtBy:'gate_relief',x:0,z:-2.65});assert.equal(sim.s.complaint.id,'gate_relief');
 for(let i=0;i<100&&!asked;i++){w.t+=.05;sim.s.npcClock=w.t;World.prototype.complaintMotion.call(w,'gate_relief',n,.05);}
 assert.equal(asked,1);assert.ok(actor.position.z<-.9);assert.ok(Math.cos(actor.rotation.y)<-.99);
});
