import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as T from '../vendor/three.module.js';
import {modelFixture} from './model-fixture.js';
import {NpcMotion} from '../src/npc-motion.js';
import {BodyGrounding} from '../src/foot-grounding.js';

for(const kind of ['commoner','guard','woman','prince','constable','envoy','sandgang'])test(kind+' actually falls, stays grounded and holds the final skeleton over idle/talk/combat',async()=>{
 const {wrapper,model}=await modelFixture('npc-'+kind+'.glb',2),actor=new T.Group();actor.add(wrapper);
 const pack=JSON.parse(readFileSync(new URL('../src/models/npc-'+kind+'-death.json',import.meta.url))),clips=pack.clips.map(c=>T.AnimationClip.parse(c));
 const idle=new T.AnimationClip('breathe',1,[new T.VectorKeyframeTrack('mixamorigHips.position',[0,1],[0,1,0,0,1,0])]);
 const motion=new NpcMotion(model,[...clips,idle]),ground=new BodyGrounding(actor,wrapper,model),box=new T.Box3();
 motion.update(.01,{hp:100});const hip=model.getObjectByName('mixamorigHips');let early;
 for(let i=0;i<35;i++){
  assert.ok(motion.update(.05,{hp:0,speed:4,talking:true,armed:true,seated:true,stunned:true,fallback:true}));ground.apply(motion.actions.get('death').paused);actor.updateMatrixWorld(true);box.setFromObject(model,true);
  assert.ok(Math.abs(box.min.y-.015)<.035,kind+' bottom '+box.min.y);if(i===2)early=hip.quaternion.clone();
 }
 assert.ok(early.angleTo(hip.quaternion)>.2);assert.ok(box.max.y<1.1,kind+' must be lying down: '+box.max.y);assert.equal(motion.current,'death');
 const last=hip.quaternion.clone(),position=hip.position.clone();for(let i=0;i<20;i++)motion.update(.1,{hp:0,hurtAt:i,talking:true,armed:true});assert.equal(last.angleTo(hip.quaternion),0);assert.ok(position.equals(hip.position));
 motion.update(.05,{hp:100});assert.equal(motion.dead,false);assert.notEqual(motion.current,'death');
});
