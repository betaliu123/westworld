import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../vendor/three.module.js';
import {HeroCombat,SWINGS,SWING_COST,DODGE,dodgeTravel,LUNGE,IMPACT,ImpactFeel} from '../src/hero-combat.js';
import {ViewPress,DRAG_START,DRAG_START_ARMED} from '../src/view-drag.js';
import {stepVitality,VITALITY} from '../src/npc-vitality.js';
import {NPC_SWING} from '../src/npc-combat.js';
import {World} from '../src/world.js';

test('a left press is a click or a view drag, never both',()=>{
  const p=new ViewPress();
  p.down(100,100);assert.deepEqual(p.move(100+DRAG_START,100),{turn:false,began:false});assert.equal(p.up(),true,'a still press acts on release');
  p.down(100,100);assert.deepEqual(p.move(100+DRAG_START+1,100),{turn:true,began:true});assert.deepEqual(p.move(101,100),{turn:true,began:false},'once a drag, always a drag');assert.equal(p.up(),false);
  assert.deepEqual(p.move(300,300),{turn:false,began:false},'no button held, no turning');assert.equal(p.up(),false);
  p.down(0,0);p.cancel();assert.equal(p.up(),false);
});

test('a press that already struck does not act again, and needs a longer pull to become a drag',()=>{
  const p=new ViewPress();p.down(0,0,true);
  assert.equal(p.move(DRAG_START+2,0).turn,false);assert.equal(p.move(DRAG_START_ARMED+1,0).began,true);assert.equal(p.up(),false);
  p.down(0,0,true);assert.equal(p.up(),false);
});

function armed(extra={}){
  const w=Object.create(World.prototype),hero=new T.Group();hero.rotation.y=0;
  Object.assign(w,{readyUntil:Infinity,playing:true,t:10,yaw:0,keys:new Set(),npcs:new Map(),hero,heroCombat:new HeroCombat(),sim:{s:{player:{energy:30,hp:100},people:{}}},strike(){},...extra});
  return w;
}

test('a swing started by a press that became a drag is withdrawn with its stamina; a landed one is not',()=>{
  const w=armed();w.attack();w.pressSwing=w.heroCombat.swing;assert.equal(w.sim.s.player.energy,30-SWING_COST);
  w.takeBackSwing();assert.equal(w.heroCombat.swing,null);assert.equal(w.sim.s.player.energy,30);
  w.attack();w.pressSwing=w.heroCombat.swing;w.heroCombat.step(SWINGS[0].strike+.01,true,()=>{},()=>{});
  w.takeBackSwing();assert.ok(w.heroCombat.swing,'contact has happened');assert.equal(w.sim.s.player.energy,30-SWING_COST);
  // A drag during an earlier swing drops the buffered click but leaves that swing alone.
  const v=armed();v.attack();const first=v.heroCombat.swing;v.heroCombat.step(.11,true,()=>{},()=>{});v.attack();v.pressSwing=null;
  v.takeBackSwing();assert.equal(v.heroCombat.swing,first);assert.equal(v.heroCombat.queued,undefined);assert.equal(v.sim.s.player.energy,30-SWING_COST);
});

test('the quick step covers its distance, costs stamina once and cannot be chained',()=>{
  assert.equal(dodgeTravel(0),0);assert.ok(Math.abs(dodgeTravel(DODGE.time)-DODGE.distance)<1e-9);assert.equal(dodgeTravel(9),DODGE.distance);
  assert.ok(dodgeTravel(DODGE.time/2)>DODGE.distance*.7,'most of the ground is covered early');
  const w=armed();w.attack();
  assert.equal(w.dodge(),true);assert.equal(w.heroCombat.swing,null,'the step abandons the swing');
  assert.equal(w.sim.s.player.energy,30-SWING_COST-DODGE.cost);
  assert.ok(Math.abs(w.dodging.z+1)<1e-9&&Math.abs(w.dodging.x)<1e-9,'with no direction held it goes straight back');
  assert.equal(w.dodge(),false);w.dodging=null;assert.equal(w.dodge(),false,'still cooling down');assert.equal(w.sim.s.player.energy,30-SWING_COST-DODGE.cost);
  w.t+=DODGE.cooldown;w.keys.add('KeyD');assert.equal(w.dodge(),true);assert.ok(Math.abs(w.dodging.x-1)<1e-9,'a held direction is followed');
});

test('the quick step needs a drawn weapon, stamina and free feet',()=>{
  assert.equal(armed({readyUntil:0}).dodge(),false);
  assert.equal(armed({locked:true}).dodge(),false);
  const tired=armed();tired.sim.s.player.energy=DODGE.cost-1;assert.equal(tired.dodge(),false);assert.equal(tired.sim.s.player.energy,DODGE.cost-1);
  const air=armed();air.hero.position.y=.5;assert.equal(air.dodge(),false);
  const low=armed();low.sim.s.player.crouched=true;assert.equal(low.dodge(),false);
});

test('stepping back from striking distance leaves an opponent\'s reach before their blow lands',()=>{
  // An opponent starts a swing within 2.05 and it connects only within 1.95 at contact.
  assert.ok(DODGE.time<NPC_SWING.strike,'there is time to react to the wind-up');assert.ok(DODGE.distance>1.95,'even from touching distance');
  assert.equal(Object.hasOwn(DODGE,'immune'),false);
});

test('a swing closes on an opponent who is fighting the player, never on a bystander',()=>{
  const at=(x,z)=>({actor:{position:new T.Vector3(x,0,z)}});
  const w=armed({npcs:new Map([['foe',at(0,3.2)],['passer',at(.4,2)]])});w.sim.s.people={foe:{hp:60,awareness:{state:'fight'}},passer:{hp:100}};
  const step=w.aimSwing(SWINGS[0]);
  assert.ok(Math.abs(step.z-1)<1e-9);assert.ok(Math.abs(step.speed*SWINGS[0].strike-(3.2-LUNGE.keep))<1e-9,'it stops at striking distance');
  w.sim.s.people.foe.awareness.state='idle';assert.equal(w.aimSwing(SWINGS[0]),null);
  w.sim.s.people.foe.awareness.state='fight';w.npcs.get('foe').actor.position.set(0,0,1.5);assert.equal(w.aimSwing(SWINGS[0]),null,'already in reach');
  w.npcs.get('foe').actor.position.set(0,0,LUNGE.sight+.5);assert.equal(w.aimSwing(SWINGS[0]),null,'too far to close');
  // A held direction is the player's aim: an opponent off to the side is not closed on.
  w.npcs.get('foe').actor.position.set(0,0,3);w.keys.add('KeyD');assert.equal(w.aimSwing(SWINGS[0]),null);
});

test('a landed blow holds the frame briefly, then world time runs again',()=>{
  const f=new ImpactFeel();f.hit(IMPACT.light);
  const slowed=f.step(1/60);assert.ok(slowed<1/60*.1,'held');assert.ok(f.shake>0&&f.punch>0);
  let world=0;for(let i=0;i<30;i++)world+=f.step(1/60);
  assert.ok(Math.abs(.5-world-(IMPACT.light.stop-1/60)*.94)<1e-9,'only the held time is lost');assert.equal(f.shake,0);assert.equal(f.punch,0);
  const calm=new ImpactFeel(true);calm.hit(IMPACT.down);assert.equal(calm.shake,0);assert.equal(calm.punch,0);assert.ok(calm.step(1/60)<1/60);
  for(const k of Object.values(IMPACT))assert.ok(k.stop<=.12,'a hold is never long enough to feel like a stall');
});

test('a wound stroke shows only for wounds the player saw, lags behind the loss and fades',()=>{
  const frame=(v,o)=>stepVitality(v,{max:100,seen:true,dt:.1,...o});
  let v=frame(null,{hp:100,now:0});assert.equal(v.alpha,0,'healthy people carry no stroke');
  v=frame(v,{hp:80,now:.1});assert.ok(v.alpha>0);assert.equal(v.part,.8);assert.equal(v.lag,1,'the lost length stays for a moment');
  for(let t=.2;t<1.2;t+=.1)v=frame(v,{hp:80,now:t});assert.ok(Math.abs(v.lag-.8)<1e-9);assert.equal(v.alpha,1);
  for(let t=1.2;t<VITALITY.linger+2;t+=.1)v=frame(v,{hp:80,now:t});assert.equal(v.alpha,0,'it does not stay over someone left alone');
  v=frame(v,{hp:80,now:20,fighting:true});assert.ok(v.alpha>0,'a wounded opponent keeps it while fighting');
  v=frame(v,{hp:25,now:20.1,fighting:true});assert.equal(v.low,true);
  let unseen=frame(null,{hp:100,now:0});unseen=frame(unseen,{hp:40,now:.1,seen:false});assert.equal(unseen.alpha,0);assert.equal(unseen.lag,.4);
  unseen=frame(unseen,{hp:40,now:.2});assert.equal(unseen.alpha,0,'seeing them later does not replay the blow');
  let whole=frame(null,{hp:100,now:0,fighting:true});assert.equal(whole.alpha,0,'an unhurt opponent shows nothing');
});

test('the blade stroke is swept by the tip end of whatever sword model is held',async()=>{
  const {bladeEnds}=await import('../src/ink-fx.js');
  const sword=new T.Group();assert.equal(bladeEnds(sword),null,'nothing to sweep until the model has loaded');
  const blade=new T.Mesh(new T.BoxGeometry(.04,1,.02));blade.position.y=-.4;sword.add(blade);
  const ends=bladeEnds(sword);
  assert.ok(Math.abs(ends.far.y+.9)<1e-9,'the tip is the end away from the hand');assert.ok(ends.near.y<0&&ends.near.y>ends.far.y);
  assert.ok(Math.abs(ends.far.x)<1e-9&&Math.abs(ends.far.z)<1e-9);
});
