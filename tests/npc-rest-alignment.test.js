import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import * as T from '../vendor/three.module.js';
import {NpcMotion} from '../src/npc-motion.js';

// Actual shipped skeletons and clips, not synthetic bones that share a T pose.
function rig(kind){
 const root=new T.Group(),raw=readFileSync(new URL(`../src/models/npc-${kind}.glb`,import.meta.url));
 const doc=JSON.parse(raw.subarray(20,20+raw.readUInt32LE(12)));
 const nodes=doc.nodes.map(n=>{const b=new T.Bone();b.name=T.PropertyBinding.sanitizeNodeName(n.name||'');b.position.fromArray(n.translation||[0,0,0]);b.quaternion.fromArray(n.rotation||[0,0,0,1]);b.scale.fromArray(n.scale||[1,1,1]);return b;});
 doc.nodes.forEach((n,i)=>n.children?.forEach(j=>nodes[i].add(nodes[j])));doc.scenes[doc.scene||0].nodes.forEach(i=>root.add(nodes[i]));root.rotation.y=-Math.PI/2;
 const pack=JSON.parse(readFileSync(process.env.NPC_MOTION_DIR?`${process.env.NPC_MOTION_DIR}/npc-${kind}-motion.json`:new URL(`../src/models/npc-${kind}-motion.json`,import.meta.url)));
 const point=name=>root.getObjectByName('mixamorig'+name).getWorldPosition(new T.Vector3());
 return {root,raw,pack,point,clips:pack.clips.map(c=>T.AnimationClip.parse(c))};
}
function restingArms(r,label){
 r.root.updateMatrixWorld(true);const hip=r.point('Hips'),height=hip.y;
 for(const [side,sign]of [['Right',-1],['Left',1]]){
  const shoulder=r.point(side+'Arm'),elbow=r.point(side+'ForeArm'),hand=r.point(side+'Hand');
  const down=elbow.clone().sub(shoulder).normalize().y,local=hand.clone().sub(hip).divideScalar(height);
  assert.ok(down<-.72,`${label} ${side}: upper arm points out/up (${down.toFixed(3)})`);
  assert.ok(local.y<.18,`${label} ${side}: resting wrist raised above waist (${local.y.toFixed(3)})`);
  assert.ok(local.x*sign>.06,`${label} ${side}: wrist crosses to the wrong body side (${local.x.toFixed(3)})`);
  assert.ok(Math.abs(local.z)<.24,`${label} ${side}: wrist folds behind torso (${local.z.toFixed(3)})`);
 }
}
for(const kind of ['constable','sandgang','envoy']){
 test(kind+' neutral clips keep both arms resting beside the body throughout their loops',()=>{
  const r=rig(kind),mixer=new T.AnimationMixer(r.root);
  for(const name of ['idle','breathe','stand_relaxed']){
   const clip=r.clips.find(c=>c.name===name),a=mixer.clipAction(clip);a.play();
   for(let frame=0;frame<36;frame++){mixer.update(clip.duration/36);restingArms(r,kind+' '+name+' '+frame);}
   mixer.stopAllAction();
  }
 });
 test(kind+' gesture and walking transitions settle back to the corrected daily pose',()=>{
  const r=rig(kind),combat=JSON.parse(readFileSync(new URL(`../src/models/npc-${kind}-combat.json`,import.meta.url))),m=new NpcMotion(r.root,[...r.clips,...combat.clips.map(c=>T.AnimationClip.parse(c))],.21,1.8,'reserved');
  for(const state of [{speed:1.4},{talking:true,angry:true},{startleAt:1},{hurtAt:2},{armed:true}]){
   for(let i=0;i<90;i++)m.update(1/60,{hp:100,...state});
   for(let i=0;i<120;i++)m.update(1/60,{hp:100});
   restingArms(r,kind+' after '+JSON.stringify(state));
   assert.ok(Math.abs([...m.weights.values()].reduce((a,b)=>a+b,0)-1)<.0001);
  }
 });
 test(kind+' daily bake records the exact target rig and corrected rest alignment',()=>{
  const r=rig(kind);assert.equal(r.pack.restAlignment,'limb-and-palm-frame-v1');assert.equal(r.pack.targetSHA256,createHash('sha256').update(r.raw).digest('hex'));
 });
}
