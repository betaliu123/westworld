import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as T from '../vendor/three.module.js';
import {NpcMotion, npcMotionName,npcMotionProfile} from '../src/npc-motion.js';

test('daily animation respects movement, seated speech and authored action priority', () => {
  assert.equal(npcMotionName({}), 'breathe');
  assert.equal(npcMotionName({formal:true}), 'idle');
  assert.equal(npcMotionName({talking:true}), 'talk');
  assert.equal(npcMotionName({talking:true}, 1), 'question');
  assert.equal(npcMotionName({talking:true,angry:true}), 'argue');
  assert.equal(npcMotionName({seated:true}), 'sit_idle');
  assert.equal(npcMotionName({seated:true,talking:true}), 'sit_talk');
  assert.equal(npcMotionName({seated:true,talking:true,speed:1}), 'walk');
  for (const exceptional of [{hp:0},{armed:true},{stunned:true},{fallback:true}])
    assert.equal(npcMotionName({...exceptional,talking:true,speed:1}), null);
});

function rig() {
  const model=new T.Group(), hips=new T.Bone();
  hips.name='mixamorigHips';model.add(hips);
  const clips=['breathe','walk','talk','question','argue','sit_idle','sit_talk','idle'].map(name =>
    new T.AnimationClip(name,2,[new T.VectorKeyframeTrack('mixamorigHips.position',[0,1,2],[0,1,0,0,1.05,0,0,1,0])]));
  return {model,hips,clips};
}
test('speech advances without restarting every frame; interruptions release animation ownership', () => {
  const {model,hips,clips}=rig(), m=new NpcMotion(model,clips,.1);
  m.update(.1,{talking:true});const action=m.actions.get(m.current), before=action.time;
  m.update(.1,{talking:true});assert.ok(action.time>before);
  m.update(.1,{armed:true});assert.equal(m.current,null);
  assert.deepEqual(hips.position.toArray(),[0,0,0]);
  m.update(.1,{seated:true});assert.equal(m.current,'sit_idle');
});
test('shared clips retain independent playback and never move the gameplay actor', () => {
  const a=rig(),b=rig(),ma=new NpcMotion(a.model,a.clips,.1),mb=new NpcMotion(b.model,a.clips,.8);
  a.model.position.set(3,0,4);ma.update(.1,{});mb.update(.1,{});
  assert.notEqual(ma.actions.get('breathe').time,mb.actions.get('breathe').time);
  assert.deepEqual(a.model.position.toArray(),[3,0,4]);
});

test('stop/start preserves walk phase and blends weight instead of restarting the cycle',()=>{
 const {model,clips}=rig(),motion=new NpcMotion(model,clips,.2);
 for(let i=0;i<30;i++)motion.update(1/60,{speed:1.5});
 const walk=motion.actions.get('walk'),before=walk.time;
 motion.update(1/60,{speed:0});
 assert.ok(walk.time>before);
 assert.ok(motion.weights.get('walk')>0);
 for(let i=0;i<180;i++)motion.update(1/60,{speed:0});
 const stopped=walk.time;
 motion.update(.1,{speed:0});assert.equal(walk.time,stopped);
 motion.update(1/60,{speed:1.5});
 assert.ok(walk.time>=stopped&&walk.time-stopped<.1);
 assert.notEqual(walk.time,.2*walk.getClip().duration);
});

test('holding a prop keeps locomotion and breathing rather than generic speech gestures',()=>{
 assert.equal(npcMotionName({upperBody:{kind:'ribbon'},talking:true,formal:true}),'breathe');
 assert.equal(npcMotionName({upperBody:{kind:'pour'},speed:1.3}),'walk');
 assert.equal(npcMotionName({upperBody:{kind:'drink'},seated:true,talking:true}),'sit_idle');
});

for (const kind of ['prince','guard','woman','commoner']) {
  test(kind+' baked motion binds to its model with finite rotations and in-place roots', () => {
    const base=new URL('../src/models/',import.meta.url);
    const glb=readFileSync(new URL('npc-'+kind+'.glb',base));
    const doc=JSON.parse(glb.subarray(20,20+glb.readUInt32LE(12)).toString());
    const names=new Set(doc.nodes.map(n=>T.PropertyBinding.sanitizeNodeName(n.name||'')));
    const data=JSON.parse(readFileSync(new URL('npc-'+kind+'-motion.json',base)));
    assert.deepEqual(data.clips.map(c=>c.name).sort(),['argue','breathe','elder_idle','idle','idle_weightshift','question','sit_idle','sit_talk','stand_relaxed','talk','walk']);
    for(const clip of data.clips) {
      assert.ok(clip.duration>0);
      for(const track of clip.tracks) {
        const size=track.type==='quaternion'?4:3;
        assert.ok(names.has(track.name.split('.')[0]),track.name);
        assert.equal(track.values.length,track.times.length*size);
        assert.ok(track.values.every(Number.isFinite));
        for(let i=1;i<track.times.length;i++)assert.ok(track.times[i]>track.times[i-1]);
        if(size===4)for(let i=0;i<track.values.length;i+=4)
          assert.ok(Math.abs(Math.hypot(...track.values.slice(i,i+4))-1)<.00001);
        else for(let i=0;i<track.values.length;i+=3) {
          assert.equal(track.values[i],track.values[0]);
          assert.equal(track.values[i+2],track.values[2]);
        }
      }
    }
  });
}

test('temperament controls conversation, with stable per-utterance choices and restrained arms',()=>{
  assert.equal(npcMotionProfile('traveler','prince'),'reserved');
  assert.equal(npcMotionProfile('old_constable','commoner'),'elder');
  assert.equal(npcMotionProfile('tea_host','woman'),'lively');
  const {model,clips}=rig();
  for(const name of ['stand_relaxed','elder_idle','idle_weightshift']){const c=clips[0].clone();c.name=name;clips.push(c);}
  const m=new NpcMotion(model,clips,.37,1.8,'reserved'),used=new Set();
  for(let turn=0;turn<8;turn++){
    m.update(.1,{talking:false});m.update(.1,{talking:true});used.add(m.idle);
    const selected=m.idle;
    for(let i=0;i<90;i++){m.update(1/60,{talking:true});assert.equal(m.idle,selected);}
    assert.ok(['idle','stand_relaxed'].includes(selected));
    assert.ok((m.weights.get('talk')||0)+(m.weights.get('question')||0)<=.17);
    assert.ok(Math.abs([...m.weights.values()].reduce((a,b)=>a+b,0)-1)<1e-6);
  }
  assert.equal(used.size,2);
  for(let i=0;i<60;i++)m.update(1/60,{talking:true,angry:true});
  assert.ok(m.weights.get('argue')>.65,'anger keeps meaningful expression');
  for(let i=0;i<120;i++)m.update(1/60,{talking:true,upperBody:{kind:'ribbon'}});
  assert.ok(m.weights.get('argue')<.001,'prop ownership releases speech gestures');
});
