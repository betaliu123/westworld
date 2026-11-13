import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../vendor/three.module.js';
import {Simulation,newArrival} from '../src/simulation.js';
import {World} from '../src/world.js';
import {HeroMotion} from '../src/hero-motion.js';
import {beginPlayerCapture,captureFrame,CAPTURE_TIMING,captureHeroPose} from '../src/player-capture.js';
import {PRISON,jailed} from '../src/locations.js';

function setup(id='gate_guard'){
 const sim=new Simulation(newArrival(),()=>.5),s=sim.s;sim.save=()=>{};s.event=null;s.player.hp=0;s.player.x=0;s.player.z=14;
 Object.assign(s.people[id],{hp:100,maxHp:100,life:{activity:'idle'},awareness:{suspect:'player',state:'fight',believedIdentity:'gate_merchant'}});
 const actor=new T.Group();actor.position.set(0,0,12.2);
 const hero=new T.Group();hero.position.set(0,0,14);
 const events=[],world={sim,hero,npcs:new Map([[id,{actor}]]),playing:true,keys:new Set(),heroVel:new T.Vector3(),obstacles:[],camera:new T.PerspectiveCamera(),yaw:0,distance:6,
 clearReady(){},collides(){return false;},move(a,x,z){a.position.x+=x;a.position.z+=z;},onHurt(){events.push('hurt');},onCaptureFade(k){world.fade=k;}};
 sim.listeners.push((type,r)=>events.push({type,r}));return {sim,s,world,events};
}
function until(world,phase){for(let i=0;i<500;i++){captureFrame(world,.02);if(world.captureShot?.phase===phase)return;}assert.fail('did not reach '+phase);}
function finish(world){for(let i=0;i<500&&(world.captureShot||world.sim.s.capture);i++)captureFrame(world,.02);}

test('a real officer hit only starts capture at zero HP, never teleports low-health players',()=>{
 const {world,s}=setup();world.receiveHit=()=>({damage:5});world.combatImpact=()=>{};
 s.player.hp=20;World.prototype.npcImpact.call(world,'gate_guard');assert.equal(s.capture,undefined);assert.equal(s.event,null);
 s.player.hp=0;World.prototype.npcImpact.call(world,'gate_guard');assert.ok(s.capture);assert.equal(s.player.z,14);assert.equal(s.event,null);
});
test('capture shows down, contact, lift and escort before a single custody settlement',()=>{
 for(const id of ['gate_guard','guard','gate_relief','inspector']){
  const {world,sim,s,events}=setup(id),charm=s.player.stats.charm;assert.ok(beginPlayerCapture(world,id));assert.equal(beginPlayerCapture(world,id),false);
  for(let i=0;i<60;i++)captureFrame(world,.02);
  assert.equal(world.captureShot.phase,'down');assert.equal(s.player.hp,0);assert.equal(s.player.stats.charm,charm);assert.equal(sim.respawn(),false);
  until(world,'secure');assert.ok(world.npcs.get(id).actor.position.distanceTo(world.hero.position)<=1);assert.equal(s.facts.lastCustody,undefined);
  until(world,'lift');assert.equal(captureHeroPose(world).phase,'lift');until(world,'escort');const z=world.hero.position.z;
  until(world,'fade');assert.ok(Math.abs(world.hero.position.z-z)>.5);assert.equal(s.player.hp,0);assert.equal(s.player.stats.charm,charm);
  finish(world);assert.ok(jailed(s));assert.equal(s.player.x,PRISON.spawn.x);assert.equal(s.player.z,PRISON.spawn.z);assert.equal(s.player.stats.charm,charm-3);assert.equal(s.facts.lastCustody.subject,'gate_merchant');assert.equal(s.capture,undefined);assert.equal(world.fade,0);
  assert.equal(events.filter(e=>e.type==='relocate').length,1);assert.equal(events.filter(e=>e.type==='result').length,1);assert.ok(events.find(e=>e.type==='result').r.handledPresentation);
  finish(world);assert.equal(s.player.stats.charm,charm-3);
 }
});
test('reload during capture restarts presentation and keeps frozen identity without charging twice',()=>{
 const {world,s}=setup();beginPlayerCapture(world,'gate_guard');until(world,'lift');
 const loaded=new Simulation(JSON.parse(JSON.stringify(s)));loaded.save=()=>{};world.sim=loaded;world.captureShot=null;captureFrame(world,.02);
 assert.equal(world.captureShot.phase,'down');const charm=loaded.s.player.stats.charm;finish(world);assert.ok(jailed(loaded.s));assert.equal(loaded.s.player.stats.charm,charm-3);
 const jailedSave=new Simulation(JSON.parse(JSON.stringify(loaded.s)));assert.equal(jailedSave.s.player.stats.charm,charm-3);assert.equal(jailedSave.s.capture,undefined);
});
test('officer interruption or an unreachable body cancels capture without remote imprisonment',()=>{
 for(const patch of [{hp:0},{stunnedUntil:100},{restraint:{by:'player'}},{life:{activity:'sleep'}},{drowning:true},{inCustody:true}]){
  const {world,s,events}=setup();beginPlayerCapture(world,'gate_guard');until(world,'secure');Object.assign(s.people.gate_guard,patch);captureFrame(world,.02);
  assert.equal(s.capture,undefined);assert.equal(s.event,null);assert.ok(events.includes('hurt'));
 }
 const {world,s}=setup();beginPlayerCapture(world,'gate_guard');world.collides=()=>true;world.move=()=>{};finish(world);finish(world);assert.equal(s.event,null);assert.equal(s.capture,undefined);
});
test('civilians, occluded officers and restored stale captures never cause a second custody',()=>{
 const {world,s}=setup('shen');assert.equal(beginPlayerCapture(world,'shen'),false);
 const other=setup();other.world.obstacles=[{x:0,z:13,w:4,d:.3}];assert.equal(beginPlayerCapture(other.world,'gate_guard'),false);
 const done=setup();beginPlayerCapture(done.world,'gate_guard');finish(done.world);const charm=done.s.player.stats.charm;done.s.capture={officer:'gate_guard'};captureFrame(done.world,.02);assert.equal(done.s.capture,undefined);assert.equal(done.s.player.stats.charm,charm);
});
test('the lift samples the fall backwards, then the restrained walk leaves gameplay HP at zero',()=>{
 const model=new T.Group(),bone=new T.Bone();bone.name='hip';model.add(bone);
 const motion=new HeroMotion(model,['death','stand_idle','walk'].map(name=>new T.AnimationClip(name,1,[new T.NumberKeyframeTrack('hip.rotation[x]',[0,1],[0,1])])));
 const s={hp:0,armed:false,speed:0};motion.update(1.4,s);
 motion.update(.1,{...s,custody:{phase:'lift',progress:.25}});assert.ok(Math.abs(bone.rotation.x-.75)<.001);
 motion.update(.1,{...s,custody:{phase:'lift',progress:.8}});assert.ok(Math.abs(bone.rotation.x-.2)<.001);
 motion.update(.1,{...s,speed:.65,custody:{phase:'escort'}});assert.equal(motion.base,'walk');assert.equal(s.hp,0);
 motion.update(.1,{...s,hp:25});assert.equal(motion.base,'stand_idle');
});
