import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../vendor/three.module.js';
import {HeroCombat,SWINGS,SPRINT,GUARD,guardChip,guardWindow,WAVE,DODGE,dodgeTravel,LUNGE,lungeStep,BODY_GAP,standOff,IMPACT,ImpactFeel} from '../src/hero-combat.js';
import {ViewPress,DRAG_START,DRAG_START_ARMED} from '../src/view-drag.js';
import {stepVitality,VITALITY} from '../src/npc-vitality.js';
import {NPC_SWING,NPC_REACH,inNpcReach,CROWD,crowdSlots,stepNpcCombat} from '../src/npc-combat.js';
import {Simulation,newArrival} from '../src/simulation.js';
import {skill,npcHitDamage} from '../src/skills.js';
import {defend} from '../src/martial.js';
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

test('a press with the blade drawn always cuts, however tired; being too tired to step is said once, not on every press',()=>{
  let told=0;const w=armed({onSpent(){told++;}});w.attack();assert.ok(w.heroCombat.swing);assert.equal(w.sim.s.player.energy,30,'cuts leave the stamina for stepping and guarding');
  assert.equal(World.prototype.takeBackSwing,undefined,'a press that turns into a view drag keeps its cut');
  const tired=armed({onSpent(){told++;}});tired.sim.s.player.energy=0;
  tired.attack();assert.ok(tired.heroCombat.swing);assert.equal(told,0);tired.heroCombat.cancel();tired.dodge();tired.dodge();assert.equal(tired.dodging,null);assert.equal(tired.sim.s.player.energy,0);assert.equal(told,1);
  tired.t+=1;tired.dodge();assert.equal(told,2);
  const winded=armed({onSpent(){told++;}});winded.sim.s.player.energy=DODGE.cost-1;assert.equal(winded.dodge(),false);assert.equal(told,3);
});

test('the quick step covers its distance, costs stamina once and cannot be chained',()=>{
  assert.equal(dodgeTravel(0),0);assert.ok(Math.abs(dodgeTravel(DODGE.time)-DODGE.distance)<1e-9);assert.equal(dodgeTravel(9),DODGE.distance);
  assert.ok(dodgeTravel(DODGE.time/2)>DODGE.distance*.7,'most of the ground is covered early');
  const w=armed();w.attack();
  assert.equal(w.dodge(),true);assert.equal(w.heroCombat.swing,null,'the step abandons the swing');
  assert.equal(w.sim.s.player.energy,30-DODGE.cost);
  assert.ok(Math.abs(w.dodging.z+1)<1e-9&&Math.abs(w.dodging.x)<1e-9,'with no direction held it goes straight back');
  assert.equal(w.dodge(),false);w.dodging=null;assert.equal(w.dodge(),false,'still cooling down');assert.equal(w.sim.s.player.energy,30-DODGE.cost);
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
  const step=w.aimSwing(SWINGS[0]),foe=w.npcs.get('foe').actor.position;
  assert.equal(step.foe,foe);assert.equal(w.hero.rotation.y,0,'the cut faces them');
  // Followed through the wind-up, the body arrives at striking distance as the cut lands, even if they are pushed back on the way.
  const close=(from,give=0)=>{let d=from,left=LUNGE.reach;const dt=1/60,strike=SWINGS[0].strike;for(let age=0;age<strike-1e-9;age+=dt){if(Math.abs(age-strike/2)<dt/2)d+=give;const s=lungeStep(d,left,strike-age,dt);d-=s;left-=s;}return d;};
  assert.ok(Math.abs(close(3.2)-LUNGE.keep)<.03,'it stops at striking distance');assert.ok(close(2.2,.45)<2.6,'a shove mid-swing does not leave the cut short');
  assert.equal(close(1.5),1.5,'already in reach');assert.ok(close(LUNGE.keep+LUNGE.reach+1)>=LUNGE.keep+1-1e-6,'one swing covers only so much');
  // Walking on into them stops at arm's length instead of passing through, well inside both sides' reach.
  const out=standOff(0,-.3);assert.ok(Math.abs(out.z+(BODY_GAP-.3))<1e-9&&out.x===0);assert.equal(standOff(0,BODY_GAP+.01),null);assert.ok(BODY_GAP<NPC_REACH.distance&&BODY_GAP<LUNGE.keep);
  w.sim.s.people.foe.awareness.state='idle';assert.equal(w.aimSwing(SWINGS[0]),null);
  w.sim.s.people.foe.awareness.state='fight';foe.set(0,0,LUNGE.sight+.5);assert.equal(w.aimSwing(SWINGS[0]),null,'too far to close');
  // A direction held roughly toward an opponent still turns the cut onto them; one held away from them is the player's own aim.
  w.npcs.get('foe').actor.position.set(2,0,2.2);w.keys.add('KeyD');
  assert.ok(w.aimSwing(SWINGS[0]));assert.ok(Math.abs(w.hero.rotation.y-Math.atan2(2,2.2))<1e-9,'the cut faces the opponent');
  w.npcs.get('foe').actor.position.set(-3,0,0);assert.equal(w.aimSwing(SWINGS[0]),null);assert.ok(Math.abs(w.hero.rotation.y-Math.PI/2)<1e-9,'the cut goes where the player pointed');
});

test('a cut at someone squarely faced lands on them, not on the object whose footprint they stand in',()=>{
  // The gate's footprint covers the whole gateway, so by distance alone it is always nearer than the guard standing under it.
  const guard={actor:{position:new T.Vector3(0,0,1.5)}},cut=[],limits=[];
  const w=armed({npcs:new Map([['guard',guard]]),obstacles:[],props:[],strike:World.prototype.strike,combatImpact(){},ecology:{hit(front,limit){limits.push(limit);return limit>.9;}}});
  w.sim.s.people={guard:{hp:100}};w.sim.attack=id=>{cut.push(id);w.sim.s.people[id].hp-=10;};
  w.strike();assert.deepEqual(cut,['guard']);assert.equal(limits[0],0,'no object takes this cut');
  // Something solid between them takes it instead.
  w.obstacles=[{id:'counter',x:0,z:.8,w:2,d:.3}];w.strike();assert.deepEqual(cut,['guard']);assert.equal(limits[1],1.5);
  // Someone off to the side of the cut does not shield a nearer object either.
  w.obstacles=[];guard.actor.position.set(1.4,0,.6);w.strike();assert.deepEqual(cut,['guard']);assert.ok(Math.abs(limits[2]-Math.hypot(1.4,.6))<1e-9);
});

test('a landed blow holds the frame briefly, then world time runs again',()=>{
  const f=new ImpactFeel();f.hit(IMPACT.light);
  const slowed=f.step(1/60);assert.ok(slowed<1/60*.1,'held');assert.ok(f.shake>0&&f.punch>0);
  let world=0;for(let i=0;i<45;i++)world+=f.step(1/60);
  assert.ok(Math.abs(.75-world-(IMPACT.light.stop-1/60)*.94)<1e-9,'only the held time is lost');assert.equal(f.shake,0);assert.equal(f.punch,0);
  const calm=new ImpactFeel(true);calm.hit(IMPACT.down);assert.equal(calm.shake,0);assert.equal(calm.punch,0);assert.ok(calm.step(1/60)<1/60);
  for(const k of Object.values(IMPACT))assert.ok(k.stop<=.16,'a hold is never long enough to feel like a stall');
  assert.ok(IMPACT.down.stop>IMPACT.light.stop&&IMPACT.parry.stop>IMPACT.guard.stop,'the blows that matter are held longer');
});

test('anyone can raise a blade; practice lets less through, and only a fresh raise turns a blow aside',()=>{
  const sim=new Simulation(newArrival(),()=>0),p=sim.s.player,foe='gate_guard',full=npcHitDamage(sim.s,foe);
  assert.equal(skill(p,'combat').tier<2,true,'a newcomer');
  let hp=p.hp,r=defend(sim,foe,{guarding:true,front:true});
  assert.ok(r.blocked&&!r.parried);assert.equal(r.damage,Math.ceil(full*GUARD.chip));assert.equal(p.hp,hp-r.damage);
  hp=p.hp;r=defend(sim,foe,{guarding:true,front:false});assert.equal(r.blocked,false,'not from behind');assert.equal(p.hp,hp-full);
  hp=p.hp;r=defend(sim,foe,{guarding:true,front:true,perfect:true});assert.ok(r.parried);assert.equal(p.hp,hp);assert.ok(sim.s.people[foe].stunnedUntil>(sim.s.npcClock||0));
  p.energy=GUARD.cost-1;r=defend(sim,foe,{guarding:true,front:true});assert.equal(r.blocked,false,'too tired to hold it');
  assert.ok(guardChip(2)<guardChip(1));assert.ok(guardWindow(3)>guardWindow(2));
  // The world decides which raise is fresh.
  const w=armed();w.keys.add('KeyF');w.raiseGuard();assert.equal(w.guarding,true);assert.ok(w.t-w.guardStarted<GUARD.window);
  w.t+=GUARD.repress-.1;w.raiseGuard();assert.ok(w.t-w.guardStarted>GUARD.windowTrained,'raised again at once, the moment is gone');
  w.t+=GUARD.repress+.1;w.raiseGuard();assert.equal(w.guardStarted,w.t);
  w.attack();assert.equal(w.guarding,false,'the blade is busy cutting');
  assert.equal(armed({readyUntil:0,keys:new Set(['KeyF'])}).guarding,false,'no blade, no guard');
});

test('several opponents each get a place of their own around the player, and no more than two wind up at once',()=>{
  const hero={x:3,z:-2},near=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
  // All arriving from the same side.
  const from=['a','b','c','d'].map((id,i)=>({id,x:hero.x+.2*i,z:hero.z+4+i*.3})),slots=crowdSlots(hero,from);
  const places=[...slots.values()];assert.equal(places.length,4);
  for(const s of places)assert.ok(Math.abs(near(s,hero)-CROWD.radius)<1e-6,'within striking distance');
  for(let i=0;i<places.length;i++)for(let j=i+1;j<places.length;j++)assert.ok(near(places[i],places[j])>=CROWD.gap-1e-3,'not on top of one another');
  assert.deepEqual([...crowdSlots(hero,from.slice().reverse())].sort(),[...slots].sort(),'the same people get the same places whatever the order');
  // Someone already standing clear keeps the bearing they are on.
  const alone=crowdSlots(hero,[{id:'a',x:hero.x+5,z:hero.z},{id:'b',x:hero.x-5,z:hero.z}]);
  assert.ok(Math.abs(alone.get('a').x-(hero.x+CROWD.radius))<1e-6&&Math.abs(alone.get('a').z-hero.z)<1e-6);
  // More than fit on the ring wait further out.
  const many=crowdSlots(hero,Array.from({length:12},(_,i)=>({id:'n'+String(i).padStart(2,'0'),x:hero.x+Math.sin(i)*(2+i*.1),z:hero.z+Math.cos(i)*(2+i*.1)}))),rings=[...many.values()].map(s=>s.ring);
  assert.ok(rings.includes(1));const all=[...many.values()];
  for(let i=0;i<all.length;i++)for(let j=i+1;j<all.length;j++)assert.ok(near(all[i],all[j])>=CROWD.gap-1e-3);
  assert.equal(CROWD.strikers,2);assert.ok(CROWD.radius<NPC_REACH.distance,'a place on the ring is close enough to strike from');
  assert.equal(inNpcReach(0,NPC_REACH.distance,0),true);assert.equal(inNpcReach(0,NPC_REACH.distance+.01,0),false);assert.equal(inNpcReach(0,-1,0),false,'not behind');
});

test('a third opponent holds back while two are winding up, and their swings do not start together',()=>{
  const hero=new T.Group(),people={},npcs=new Map(),world={t:0,playing:true,hero,obstacles:[],npcs,sim:{s:{people,player:{hp:100},npcClock:0}}};
  for(const [i,id] of ['a','b','c'].entries()){
    const actor=new T.Group();actor.userData.arms=[new T.Group()];actor.position.set(Math.sin(i*2.1)*1.5,0,Math.cos(i*2.1)*1.5);actor.rotation.y=Math.atan2(-actor.position.x,-actor.position.z);
    people[id]={hp:100,maxHp:100,weaponType:'sword',awareness:{state:'fight'}};npcs.set(id,{actor,model:{motion:{cue(){},cancelAttack(){}}}});
  }
  const step=dt=>{world.t+=dt;for(const [id,n] of npcs)stepNpcCombat(world,id,n,dt,()=>{});},winding=()=>[...npcs.values()].filter(n=>n.combat?.swing&&!n.combat.swing.hit).length;
  step(.05);assert.equal(winding(),1,'one starts');
  step(CROWD.stagger);assert.equal(winding(),2,'the next a beat later');
  step(.05);step(.05);assert.equal(winding(),2);assert.equal(npcs.get('c').combat.swing,null,'the third holds back');
  let most=0;for(let i=0;i<120;i++){step(.05);most=Math.max(most,winding());}
  assert.equal(most,CROWD.strikers);assert.ok([...npcs.values()].every(n=>n.nextHit>0),'everyone gets a turn');
});

test('the ink wave is thrown once per cooldown and settles each person it reaches once, harder than a cut',()=>{
  const at=(x,z)=>({actor:{position:new T.Vector3(x,0,z),userData:{}}}),struck=[];
  const w=armed({npcs:new Map([['near',at(.5,4)],['far',at(-1,9)],['aside',at(5,5)],['beyond',at(0,WAVE.range+4)]]),obstacles:[],collides:()=>false,shoves:[],onSound(){},
    sim:{s:{player:{energy:30,hp:100},people:{near:{hp:60},far:{hp:60},aside:{hp:60},beyond:{hp:60}}},attack(id,_,power){struck.push([id,power]);this.s.people[id].hp-=10*power;}}});
  w.attack();assert.equal(w.inkWave(),true);assert.equal(w.heroCombat.swing,null,'it replaces the cut under way');assert.equal(w.inkWave(),false,'already casting');
  assert.equal(w.waveCooldown,1);
  w.stepWave(WAVE.release-.05);assert.equal(w.wave,undefined,'not yet off the blade');
  for(let i=0;i<90;i++)w.stepWave(1/60);
  assert.deepEqual(struck,[['near',WAVE.power],['far',WAVE.power]],'each once, in the order reached; nobody off its path or past its range');
  assert.equal(w.wave,null);assert.equal(w.cast,null);
  assert.equal(w.inkWave(),false,'cooling');w.t+=WAVE.cooldown;assert.equal(w.waveCooldown,0);assert.equal(w.inkWave(),true);
  // A wall ends it.
  const walled=armed({npcs:new Map([['far',at(0,9)]]),obstacles:[],collides:(x,z)=>z>5,shoves:[],sim:{s:{player:{energy:30,hp:100},people:{far:{hp:60}}},attack(){struck.push('through the wall');}}});
  walled.inkWave();for(let i=0;i<90;i++)walled.stepWave(1/60);assert.equal(struck.length,2);assert.equal(walled.wave,null);
  assert.equal(armed({readyUntil:0}).inkWave(),false,'it needs the blade drawn');
  assert.ok(SPRINT.armed<SPRINT.plain);
});

test('a wound stroke shows only for wounds the player saw, lags behind the loss and fades',()=>{
  const frame=(v,o)=>stepVitality(v,{max:100,seen:true,dt:.1,...o});
  let v=frame(null,{hp:100,now:0});assert.equal(v.alpha,0,'healthy people carry no stroke');
  v=frame(v,{hp:80,now:.1});assert.equal(v.alpha,0,'someone who is not fighting shows nothing, even just wounded');
  v=frame(v,{hp:80,now:.2,fighting:true});assert.ok(v.alpha>0);assert.equal(v.part,.8);assert.equal(v.lag,1,'the lost length stays for a moment');
  for(let t=.3;t<1.3;t+=.1)v=frame(v,{hp:80,now:t,fighting:true});assert.ok(Math.abs(v.lag-.8)<1e-9);assert.equal(v.alpha,1);
  for(let t=1.3;t<3;t+=.1)v=frame(v,{hp:80,now:t});assert.equal(v.alpha,0,'it goes once they leave the fight');
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
