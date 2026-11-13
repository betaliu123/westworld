import test from 'node:test';
import assert from 'node:assert/strict';
import {Simulation,newArrival,legacyArrival} from '../src/simulation.js';
import {Ecosystem} from '../src/ecosystem.js';
import {restraintPreview,resolveRestraint,beginRestraintAttempt,restraintStep,ropeAllowsMove} from '../src/npc-restraints.js';
import {custodyStep} from '../src/faction-career.js';
import {lifeStep,canEat} from '../src/npc-life.js';
import {giveItem} from '../src/npc-actions.js';
import {equipAppearance} from '../src/appearance.js';
import {witnessEvent} from '../src/npc-awareness.js';
import {World,character} from '../src/world.js';
import {restraintMotion} from '../src/lasso-world.js';
function setup(){
 const sim=new Simulation(newArrival(),()=>0);sim.save=()=>{};const eco=new Ecosystem(sim),p=sim.s.player,n=sim.s.people.thief;
 Object.assign(p,{x:0,z:0,hp:100,energy:100});Object.assign(n,{x:0,z:2,hp:60,stunnedUntil:0,life:{activity:'idle'},awareness:null});eco.positions={thief:{x:0,z:2,facing:Math.PI}};
 let rolls=0;sim.rng=()=>{rolls++;return 0;};return {sim,eco,p,n,rolls:()=>rolls};
}
test('new and existing v2 receive a single reusable rope without changing legacy saves',()=>{
 const {sim,eco}=setup();assert.equal(sim.s.player.skills.lasso.tier,1);assert.equal(eco.items('player').filter(i=>i.type==='rope').length,1);
 delete sim.s.player.skills.lasso;const reloaded=new Simulation(JSON.parse(JSON.stringify(sim.s))),other=new Ecosystem(reloaded);
 assert.equal(other.items('player').filter(i=>i.type==='rope').length,1);assert.equal(reloaded.s.player.skills.lasso.tier,1);
 const old=new Simulation(legacyArrival());new Ecosystem(old);assert.ok(!old.s.ecosystem.items.some(i=>i.type==='rope'));assert.ok(!old.s.player.skills);
});
test('preview/cancel never roll or spend; contact resolves exactly once and failure preserves rope',()=>{
 const a=setup();for(let i=0;i<5;i++)restraintPreview(a.sim,a.eco,'thief');assert.equal(a.rolls(),0);
 const cancelled=beginRestraintAttempt(a.sim,a.eco,'thief','catch');cancelled.cancel();assert.ok(cancelled.finish().error);assert.equal(a.rolls(),0);assert.equal(a.p.energy,100);
 const attempt=beginRestraintAttempt(a.sim,a.eco,'thief','catch'),r=attempt.finish();assert.ok(r.success);assert.equal(r.check.chance,attempt.preview.chance);assert.equal(a.rolls(),1);assert.equal(a.p.energy,92);assert.ok(attempt.finish().error);assert.equal(a.rolls(),1);
 const b=setup();b.sim.rng=()=>.999;assert.equal(resolveRestraint(b.sim,b.eco,'thief').success,false);assert.ok(!b.n.restraint);assert.equal(b.eco.items('player').filter(i=>i.type==='rope').length,1);
});
test('wall, distance, movement, injury and a missing rope block settlement',()=>{
 for(const change of [a=>a.eco.obstacles=[{x:0,z:1,w:2,d:.1}],a=>a.eco.positions.thief.z=7,a=>a.p.x=.5,a=>a.p.hp--,a=>a.eco.items('player').find(i=>i.type==='rope').location='ground']){
  const a=setup(),attempt=beginRestraintAttempt(a.sim,a.eco,'thief','catch');change(a);assert.ok(attempt.finish().error);assert.equal(a.rolls(),0);assert.equal(a.p.energy,100);assert.ok(!a.n.restraint);
 }
});
test('tie, loot real clothes, equip, reload, lead and untie never duplicate possessions or identity knowledge',()=>{
 const a=setup(),{sim,eco,p,n}=a,coat=eco.items('npc:thief').find(i=>i.type==='clothing');
 assert.ok(resolveRestraint(sim,eco,'thief').success);Object.assign(p,{stealing:true,crouched:true});assert.ok(eco.theftPreview('thief',coat.id).blocked);
 assert.ok(resolveRestraint(sim,eco,'thief','fix').success);assert.equal(eco.theftPreview('thief',coat.id).chance,100);assert.equal(eco.stealNpc('thief',coat.id),undefined);assert.equal(coat.location,'player');assert.equal(coat.provenance.originalOwner,'thief');assert.ok(eco.stealNpc('thief',coat.id));assert.ok(equipAppearance(sim,coat.id,'body').ok);assert.ok(!sim.s.facts.knownNames?.thief);assert.ok(!sim.s.facts.career);
 const restored=new Simulation(JSON.parse(JSON.stringify(sim.s)));restored.save=()=>{};const again=new Ecosystem(restored);again.positions=eco.positions;assert.equal(restored.s.people.thief.restraint.mode,'fixed');assert.equal(again.s.items.filter(i=>i.id===coat.id).length,1);
 assert.ok(resolveRestraint(restored,again,'thief','lead').success);assert.ok(resolveRestraint(restored,again,'thief','release').success);assert.ok(!restored.s.people.thief.restraint);assert.equal(again.items('player').filter(i=>i.type==='rope').length,1);assert.ok(resolveRestraint(restored,again,'thief','release').error);assert.equal(a.rolls(),1);
});
test('bound bodies still see theft, cannot eat/receive/service/relieve, and take environmental damage',()=>{
 const a=setup(),{sim,eco,p,n}=a;resolveRestraint(sim,eco,'thief');resolveRestraint(sim,eco,'thief','fix');
 Object.assign(p,{stealing:true,crouched:true});const coat=eco.items('npc:thief').find(i=>i.type==='clothing');assert.ok(eco.theftPreview('thief',coat.id).sight.witnesses.includes('thief'));assert.equal(eco.theftPreview('thief',coat.id).sight.intercepted,false);
 assert.equal(canEat(sim,eco,'thief',eco.positions.thief),false);const food=eco.create('干粮','food','player');assert.ok(giveItem(sim,eco,'thief',food.id).error);assert.equal(food.location,'player');
 eco.positions.thief={x:-22,z:0};const hp=n.hp;lifeStep(sim,eco,1,eco.positions);assert.equal(n.hp,hp-8);assert.equal(n.restraint.mode,'fixed');
});
test('rope length stops the holder, collision stops the follower, and fixed NPCs ignore pursuit',()=>{
 const a=setup();resolveRestraint(a.sim,a.eco,'thief');assert.equal(ropeAllowsMove(a.sim.s,{x:0,z:-4},{x:0,z:-5},a.eco.positions),false);assert.equal(ropeAllowsMove(a.sim.s,{x:0,z:-4},{x:0,z:-3},a.eco.positions),true);
 const actor=character(0),hero=character(0,true);actor.position.set(0,0,2);hero.position.set(0,0,6);
 const n={actor,model:{},label:{},chasing:true,fleeing:true};let moves=0;
 const world={sim:a.sim,hero,t:1,npcs:new Map([['thief',n]]),obstacles:[],collides:()=>true,move(){moves++;},animateActor(){}};
 assert.equal(restraintMotion(world,'thief',n,.1),true);assert.equal(moves,0);assert.equal(n.chasing,false);
 a.n.restraint.mode='fixed';world.collides=()=>false;assert.equal(restraintMotion(world,'thief',n,.1),true);assert.equal(moves,0);assert.equal(actor.position.z,2);
 a.n.restraint.mode='lead';world.t=2;restraintMotion(world,'thief',n,.1);assert.ok(moves>0);
});
test('lawful lasso custody requires physical delivery and a free officer; reward and rope return once',()=>{
 const a=setup(),{sim,eco,p,n}=a;sim.s.facts.publicWarrant=true;assert.ok(resolveRestraint(sim,eco,'thief').success);assert.equal(n.inCustody,true);const money=p.money;
 eco.positions.inspector={x:0,z:20};custodyStep(sim,eco.positions);assert.equal(p.money,money);
 eco.positions.inspector={x:0,z:3};sim.s.people.inspector.restraint={mode:'fixed'};custodyStep(sim,eco.positions);assert.equal(p.money,money);delete sim.s.people.inspector.restraint;
 custodyStep(sim,eco.positions,[{x:0,z:2.5,w:2,d:.1}]);assert.equal(p.money,money);
 resolveRestraint(sim,eco,'thief','fix');custodyStep(sim,eco.positions);assert.equal(p.money,money);resolveRestraint(sim,eco,'thief','lead');custodyStep(sim,eco.positions);assert.equal(p.money,money+20);assert.ok(!n.restraint);assert.equal(eco.items('player').filter(i=>i.type==='rope').length,1);
 custodyStep(sim,eco.positions);assert.equal(p.money,money+20);
});
test('unlawful restraint retains evidence and local believed identity after release',()=>{
 const a=setup(),{sim,eco,n}=a;sim.s.law={served:['linxi-yan-theft']};sim.s.player.face={id:'gate_merchant',serial:1,until:99999};
 sim.listeners.push((type,e)=>{if(type==='worldIncident'){e.witnesses=['thief'];witnessEvent(sim,'thief',e,true,{x:0,z:2});}});
 resolveRestraint(sim,eco,'thief');assert.equal(n.awareness.believedIdentity,'gate_merchant');assert.ok(n.awareness.caseOpen);const relation=n.relation;sim.s.player.face=null;
 resolveRestraint(sim,eco,'thief','fix');resolveRestraint(sim,eco,'thief','release');assert.equal(n.relation,relation);assert.ok(n.awareness.caseOpen);assert.equal(sim.s.chronicle.deeds.find(d=>d.title==='抛套索').identities.thief,'gate_merchant');
});
test('incapacitation releases a held loop without losing the reusable tool or loosening completed knots',()=>{
 for(const fixed of [false,true]){const a=setup();resolveRestraint(a.sim,a.eco,'thief');if(fixed)resolveRestraint(a.sim,a.eco,'thief','fix');a.p.hp=0;restraintStep(a.sim,a.eco);assert.equal(!!a.n.restraint,fixed);assert.equal(a.eco.items('ground').filter(i=>i.type==='rope').length,0);assert.equal(a.eco.items('player').filter(i=>i.type==='rope').length,1);}
});
test('one reusable lasso can bind multiple people, with only one active tether and no extra items',()=>{
 const {sim,eco,n}=setup(),rope=eco.items('player').find(i=>i.lassoKit),count=eco.s.items.length,hp=rope.hp;
 eco.positions.merchant={x:1,z:1.5,facing:Math.PI};
 assert.ok(resolveRestraint(sim,eco,'thief').success);assert.equal(rope.location,'player');
 const blocked=restraintPreview(sim,eco,'merchant');assert.equal(blocked.blocked,true);assert.match(blocked.reason,/捆牢或松绑/);
 assert.ok(resolveRestraint(sim,eco,'thief','fix').success);
 assert.equal(restraintPreview(sim,eco,'merchant').blocked,false);assert.ok(resolveRestraint(sim,eco,'merchant').success);
 assert.equal(n.restraint.mode,'fixed');assert.equal(sim.s.people.merchant.restraint.mode,'lead');
 assert.ok(restraintPreview(sim,eco,'thief','lead').blocked);
 assert.ok(resolveRestraint(sim,eco,'merchant','fix').success);assert.ok(resolveRestraint(sim,eco,'thief','lead').success);
 const relation=n.relation;assert.ok(resolveRestraint(sim,eco,'thief','release').success);assert.ok(resolveRestraint(sim,eco,'merchant','release').success);
 assert.equal(eco.s.items.length,count);assert.equal(rope.hp,hp);assert.equal(rope.location,'player');assert.equal(n.relation,relation);assert.ok(!rope.provenance?.history.length);
});
test('multiple fixed knots survive reload and untying one does not release the others or refund tools',()=>{
 const {sim,eco,n}=setup();n.stunnedUntil=100;sim.s.people.merchant.stunnedUntil=100;eco.positions.merchant={x:1,z:1};
 assert.ok(resolveRestraint(sim,eco,'thief','bind').success);assert.ok(resolveRestraint(sim,eco,'merchant','bind').success);
 const restored=new Simulation(JSON.parse(JSON.stringify(sim.s)));restored.save=()=>{};const other=new Ecosystem(restored);other.positions=eco.positions;
 restraintStep(restored,other);assert.ok(restored.s.people.thief.restraint);assert.ok(restored.s.people.merchant.restraint);
 assert.ok(resolveRestraint(restored,other,'thief','release').success);restraintStep(restored,other);
 assert.ok(restored.s.people.merchant.restraint);assert.equal(other.s.items.filter(i=>i.lassoKit).length,1);
});
test('legacy v2 bound or automatically dropped tools upgrade once, preserving knots and witness history',()=>{
 for(const mode of ['lead','fixed','dropped']){
  const {sim,eco,n}=setup(),rope=eco.items('player').find(i=>i.lassoKit);resolveRestraint(sim,eco,'thief');
  const r=n.restraint;delete r.reusable;r.mode=mode==='fixed'?'fixed':'lead';r.street={key:'original-witness-event',seen:{elder:{announced:true,subject:'gate_merchant'}}};
  eco.transfer(rope,'npc:thief','restraint',['elder']);if(mode==='dropped'){eco.transfer(rope,'ground','dropped');delete n.restraint;}
  const money=sim.s.player.money,restored=new Simulation(JSON.parse(JSON.stringify(sim.s)));restored.save=()=>{};const other=new Ecosystem(restored);other.positions=eco.positions;
  assert.equal(other.items('player').find(i=>i.lassoKit).id,rope.id);assert.equal(restored.s.player.money,money);
  if(mode!=='dropped'){assert.equal(restored.s.people.thief.restraint.mode,mode);assert.equal(restored.s.people.thief.restraint.street.key,'original-witness-event');assert.equal(restored.s.people.thief.restraint.street.seen.elder.subject,'gate_merchant');}
  const snapshot=JSON.stringify(restored.s.people.thief.restraint),transfers=other.s.items.find(i=>i.id===rope.id).provenance.history.length;
  new Ecosystem(restored);assert.equal(JSON.stringify(restored.s.people.thief.restraint),snapshot);assert.equal(other.s.items.find(i=>i.id===rope.id).provenance.history.length,transfers);assert.equal(other.s.items.filter(i=>i.lassoKit).length,1);
 }
});
test('deliberately giving away or dropping a tool is not undone by the upgrade and fixed knots remain tied',()=>{
 for(const location of ['npc:elder','ground']){
  const {sim,eco}=setup();resolveRestraint(sim,eco,'thief');resolveRestraint(sim,eco,'thief','fix');
  const rope=eco.items('player').find(i=>i.lassoKit);eco.transfer(rope,location,location==='ground'?'transfer':'gifted');
  const restored=new Simulation(JSON.parse(JSON.stringify(sim.s)));restored.save=()=>{};const other=new Ecosystem(restored);other.positions=eco.positions;
  assert.equal(other.s.items.find(i=>i.id===rope.id).location,location);restraintStep(restored,other);assert.equal(restored.s.people.thief.restraint.mode,'fixed');
  assert.ok(restraintPreview(restored,other,'thief','lead').blocked);assert.ok(resolveRestraint(restored,other,'thief','release').success);assert.equal(other.s.items.find(i=>i.id===rope.id).location,location);
 }
});
test('lasso contact is a single beat after windup, not on menu selection',()=>{
 let strikes=0;const w={sim:new Simulation(newArrival()),hero:character(0,true),npcs:new Map(),performance:{motion:'lasso',start:0,duration:1.8,onStrike(){strikes++;}}};
 for(const t of [.1,.5,.79,.81,1,1.6]){w.t=t;World.prototype.animatePerformance.call(w,0,.016);assert.equal(strikes,t<.8?0:1);}
});
