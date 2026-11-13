import test from 'node:test';import assert from 'node:assert/strict';
import {frameSeconds,poseStep,sweepMove} from '../engine/src/mobile-performance.js';import {HeroCombat} from '../engine/src/hero-combat.js';import {harness} from './support/mobile-harness.mjs';
for(const fps of [60,30,20,15,10])test(`world time and single sword impact remain real-time at ${fps} fps`,()=>{
 let time=0,prev=0,hits=0;const combat=new HeroCombat();combat.begin('guard');for(let i=1;i<=fps*2;i++){const now=i*1000/fps,dt=frameSeconds(now,prev);prev=now;time+=dt;combat.step(dt,true,()=>hits++,()=>{});}assert.ok(Math.abs(time-2)<1e-6);assert.equal(hits,1);assert.equal(combat.remaining,0);
});
test('background and resume do not catch up actions',()=>{assert.equal(frameSeconds(500,100,true),0);assert.equal(frameSeconds(10000,100),0);assert.equal(frameSeconds(-1,100),0);assert.equal(frameSeconds(1200,1100),.1);});
test('low frame rate movement cannot tunnel through thin walls',()=>{const p={x:0,z:0};sweepMove(p,1.8,0,(x,z)=>x<.4||x>.9);assert.ok(p.x<.4);const q={x:0,z:0};sweepMove(q,1.8,1,(x,z)=>x<.4||x>.9);assert.ok(q.x<.4);assert.ok(Math.abs(q.z-1)<1e-6);});
test('distant pose sampling preserves accumulated time; nearby/action actors update each frame',()=>{
 for(const [distance,critical,visible,cap] of [[4,false,true,60],[40,false,false,8],[20,false,true,15],[40,true,false,60]]){const c={};let frames=0,time=0;for(let i=0;i<600;i++){const dt=poseStep(c,1/60,distance,critical,visible);if(dt){frames++;time+=dt;}}assert.ok(frames<=cap*10+1);assert.ok(Math.abs(time+(c.poseElapsed||0)-10)<1e-6);if(critical||distance<14)assert.equal(frames,600);}
});
test('unchanged exploration HUD uploads only ten times a second; touch refresh stays responsive',()=>{
 const t=harness();let now=0;t.p.env.performance.now=()=>now;for(let i=0;i<60;i++){now=i*1000/60;t.ui.render(t.world);}const clears=t.calls.filter(c=>c[0]==='clearRect').length;assert.ok(clears<=10);const count=t.calls.length;t.events.start({changedTouches:[{identifier:1,clientX:100,clientY:220}]});t.ui.render(t.world);assert.ok(t.calls.length>count);assert.equal(t.ui.layout.stickVisible,true);
});
import {NpcMotion} from '../engine/src/npc-motion.js';import * as T from '../engine/vendor/three.module.js';
test('dormant animation tracks stop evaluating and become active again when walking resumes',()=>{
 const model=new T.Object3D();model.name='Root';const clips=['idle','breathe','stand_relaxed','walk','talk','question'].map(name=>new T.AnimationClip(name,1,[new T.NumberKeyframeTrack('Root.position[x]',[0,1],[0,1])]));const motion=new NpcMotion(model,clips,.2);for(let i=0;i<60;i++)motion.update(1/60,{hp:100,speed:2});for(let i=0;i<240;i++)motion.update(1/60,{hp:100,speed:0});assert.equal(motion.actions.get('walk').enabled,false);for(let i=0;i<30;i++)motion.update(1/60,{hp:100,speed:2});assert.equal(motion.actions.get('walk').enabled,true);assert.ok(motion.actions.get('walk').getEffectiveWeight()>.8);assert.ok(Number.isFinite(model.position.x));
});
