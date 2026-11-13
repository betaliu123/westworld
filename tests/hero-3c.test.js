import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../vendor/three.module.js';
import {HeroCombat,SWINGS,SWING_COST} from '../src/hero-combat.js';
import {HeroMotion} from '../src/hero-motion.js';
import {clearCameraPosition,followOrbit} from '../src/orbit-camera.js';
import {World} from '../src/world.js';

test('swing hits at contact, only once; repeated input buffers only one combo',()=>{
  const combat=new HeroCombat();let hits=0,starts=0;
  combat.begin();const next=id=>{starts++;combat.begin(id);};
  combat.step(.11,true,()=>hits++,next);assert.equal(hits,0);
  for(let i=0;i<10;i++)combat.begin('gate');
  combat.step(.05,true,()=>hits++,next);assert.equal(hits,1);assert.equal(starts,0);
  combat.step(.25,true,()=>hits++,next);assert.equal(starts,1);assert.equal(combat.swing.index,1);
  combat.step(.8,true,()=>hits++,next);assert.equal(hits,2);assert.equal(combat.swing,null);
});

test('a buffered click chains after contact; an unbuffered swing plays out its recovery',()=>{
  for(const s of SWINGS)assert.ok(s.strike<s.chain&&s.chain<=s.duration);
  const lone=new HeroCombat();lone.begin();lone.step(SWINGS[0].chain+.01,true,()=>{},()=>assert.fail('nothing was buffered'));
  assert.ok(lone.swing&&lone.remaining>0);lone.step(SWINGS[0].duration,true,()=>{},()=>{});assert.equal(lone.swing,null);
  const late=new HeroCombat();let starts=0;late.begin();late.step(SWINGS[0].chain+.02,true,()=>{},()=>starts++);
  late.begin();late.step(.016,true,()=>{},()=>starts++);assert.equal(starts,1,'a click during recovery starts the next swing on the next frame');
});

test('interruption before contact prevents damage and clears queued attacks',()=>{
  for(const elapsed of [.05,.12]){
    const c=new HeroCombat();let hits=0;c.begin();c.step(elapsed,true,()=>hits++,()=>{});c.begin();
    c.step(.6,false,()=>hits++,()=>assert.fail('must not chain after interruption'));
    c.step(1,true,()=>hits++,()=>{});assert.equal(hits,0);assert.equal(c.remaining,0);
  }
});

test('an impact may open dialogue and cancel its own chain',()=>{
  const c=new HeroCombat();c.begin();c.step(.12,true,()=>{},()=>{});c.begin();
  c.step(1,true,()=>c.cancel(),()=>assert.fail('dialogue must cancel queued strike'));
  assert.equal(c.swing,null);
});

test('world attack spends stamina once, defers damage, and sheathing cancels it',()=>{
  const w=Object.create(World.prototype);let hits=0;
  Object.assign(w,{readyUntil:Infinity,playing:true,heroCombat:new HeroCombat(),sim:{s:{player:{energy:30,hp:100}}},strike(){hits++;}});
  w.attack();assert.equal(w.sim.s.player.energy,30-SWING_COST);assert.equal(hits,0);
  w.heroCombat.step(.12,true,()=>w.strike(),()=>{});w.attack();assert.equal(w.sim.s.player.energy,30-SWING_COST);
  w.clearReady();w.heroCombat.step(1,false,()=>w.strike(),()=>{});assert.equal(hits,0);
});

const focus=new T.Vector3(0,1.45,0),eye=new T.Vector3(0,2.5,7),wall={id:'wall',x:0,z:3,w:5,d:.3};
test('camera retracts before a wall and uses its full boom when the wall is destroyed',()=>{
  const near=clearCameraPosition(focus,eye,[wall]);assert.ok(near.z<2.7);
  assert.ok(clearCameraPosition(focus,eye,[wall],{wall:{hp:0}}).equals(eye));
  assert.ok(clearCameraPosition(focus,eye,[{...wall,id:'book-desk'}]).equals(eye));
});

test('camera smoothing never leaves the eye behind a blocking wall',()=>{
  const camera=new T.PerspectiveCamera();camera.position.copy(eye);
  followOrbit(camera,focus,eye,[wall],{},1/60,48);
  assert.ok(camera.position.z<2.7);
  const before=camera.position.z;followOrbit(camera,focus,eye,[],{},1/60,48);
  assert.ok(camera.position.z>before&&camera.position.z<eye.z);
});

function motion(stealth=false){
  const model=new T.Group(),bone=new T.Bone();bone.name='hip';model.add(bone);
  const names=['stand_idle','walk','jog','sprint','idle_sword','run_sword','draw','sheathe','hit','death','jump_up','jump_fwd','fall','land','attack_1'];
  if(stealth)names.push('crouch_idle','crouch_walk');
  const clips=names.map((n,i)=>new T.AnimationClip(n,1,[new T.NumberKeyframeTrack('hip.rotation[x]',[0,1],[i*.01,.4+i*.01])]));
  return new HeroMotion(model,clips);
}
const standing={hp:100,speed:0,armed:false,airborne:false};
test('bone mixer selects distinct idle/run clips and holds death until revival',()=>{
  const m=motion();m.update(.2,standing);assert.equal(m.base,'stand_idle');
  m.update(.2,{...standing,speed:3.3});assert.equal(m.base,'jog');
  assert.notEqual(m.actions.get('jog'),m.actions.get('stand_idle'));
  for(let i=0;i<120;i++)m.update(1/60,{...standing,hp:0,speed:6,airborne:true});
  assert.equal(m.base,'death');assert.equal(m.actions.get('death').paused,true);
  m.update(.2,standing);assert.equal(m.base,'stand_idle');
});

test('crouching and bespoke interaction use procedural fallback, then resume motion cleanly',()=>{
  const m=motion();m.cue('attack_1');
  assert.equal(m.update(.1,{...standing,crouched:true}),false);assert.equal(m.once,null);
  assert.equal(m.update(.1,{...standing,fallback:true}),false);
  assert.equal(m.update(.1,standing),true);assert.equal(m.base,'stand_idle');
});

test('drawing on the move plays no standing draw, and a raised guard is held still until let go',()=>{
  const still=motion();still.update(.1,standing);still.update(.1,{...standing,armed:true});assert.equal(still.base,'draw');
  const running=motion();running.update(.1,{...standing,speed:5});running.update(.1,{...standing,speed:5,armed:true});assert.equal(running.base,'run_sword','the feet keep running');
  running.update(.1,{...standing,speed:5});assert.equal(running.base,'sprint','sheathing on the move likewise');
  const m=motion(true);m.actions.set('parry',m.mixer.clipAction(new T.AnimationClip('parry',.5,[new T.NumberKeyframeTrack('hip.rotation[x]',[0,.5],[0,1])])));
  const armed={...standing,armed:true};m.weapon=true;m.update(.1,armed);assert.equal(m.base,'idle_sword');
  m.update(.1,{...armed,guard:true});const pose=m.actions.get('parry');assert.equal(m.base,'parry');assert.equal(pose.paused,true);
  const held=pose.time;m.update(.4,{...armed,guard:true});assert.equal(pose.time,held,'it does not play on');
  m.update(.1,armed);assert.equal(m.base,'idle_sword');
  assert.equal(motion().update(.1,{...armed,guard:true}),true,'a model without the clip simply stands');
});

test('an attack cue can skip wind-up and still ends on the clip\'s last frame',()=>{
  const m=motion(),a=m.actions.get('attack_1');m.update(.1,standing);m.cue('attack_1',.5,false,{skip:.2,fade:.07});
  assert.equal(a.time,.2);assert.ok(Math.abs(a.getEffectiveTimeScale()-1.6)<1e-9);
  m.update(.25,standing);assert.ok(Math.abs(a.time-.6)<1e-6);assert.equal(m.base,'attack_1');
  m.update(.3,standing);assert.equal(m.base,'stand_idle');
});

test('takeoff, falling, landing and actual injury choose their corresponding clips',()=>{
  const m=motion();m.update(.1,standing);m.update(.1,{...standing,airborne:true});assert.equal(m.base,'jump_up');
  m.update(.4,{...standing,airborne:true});assert.equal(m.base,'fall');
  m.update(.05,standing);assert.equal(m.base,'land');
  m.update(.3,standing);m.update(.05,{...standing,hurt:true});assert.equal(m.base,'hit');
});

test('installed crouch clips bend the skeleton, preserve phase and yield to death and authored actions',()=>{
  const m=motion(true);m.update(.1,{...standing,crouched:true});assert.equal(m.base,'crouch_idle');
  m.update(.1,{...standing,crouched:true,speed:1.6});assert.equal(m.base,'crouch_walk');
  const time=m.actions.get('crouch_walk').time;
  m.update(.1,{...standing,crouched:true,speed:1.6});assert.ok(m.actions.get('crouch_walk').time>time);
  m.update(.1,standing);assert.equal(m.base,'stand_idle');
  assert.equal(m.update(.1,{...standing,crouched:true,fallback:true}),false);
  m.update(.1,{...standing,crouched:true,hp:0});assert.equal(m.base,'death');
});

test('a partial optional motion pack yields missing actions to the existing controller',()=>{
  const model=new T.Group(),m=new HeroMotion(model,[]);
  assert.equal(m.update(.1,standing),false);
  assert.equal(m.update(.1,{...standing,hp:0}),false);
  assert.equal(m.update(.1,{...standing,airborne:true}),false);
});
