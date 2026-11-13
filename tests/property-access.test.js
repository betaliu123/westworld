import test from 'node:test';
import assert from 'node:assert/strict';
import {Simulation,newArrival} from '../src/simulation.js';
import {Ecosystem} from '../src/ecosystem.js';
import {COURT_CHEST} from '../src/identity-opportunities.js';
import {TRAVEL_BUNDLE,WARDROBE_CHEST,chestOpenPreview,chestTakePreview} from '../src/home-chest.js';
import {propertyLabel} from '../src/property-rules.js';
import {appearanceState,rememberFace,applyFace,checkDisguise} from '../src/appearance.js';
import {buildTravelBundle,updateTravelBundle} from '../src/travel-bundle-scene.js';
import {propertyStopMotion} from '../src/property-motion.js';
import * as T from '../vendor/three.module.js';
const assets=[{id:COURT_CHEST,kind:'chest',name:'六扇门物资箱',owner:'inspector',x:12.2,z:-24.1,w:1.3,d:.8,max:140},TRAVEL_BUNDLE];
function setup(id=COURT_CHEST,saved){const sim=new Simulation(saved||newArrival(),()=>0);sim.save=()=>{};const eco=new Ecosystem(sim,assets),chest=eco.s.objects[id],s=sim.s;Object.assign(s.player,{x:chest.x,z:chest.z+1.2,crouched:false,stealing:false});eco.positions[chest.owner]={x:chest.x,z:chest.z-1,facing:0};return {sim,eco,s,chest,id};}
function sneak(g){Object.assign(g.s.player,{crouched:true,stealing:true});g.eco.positions[g.chest.owner].facing=Math.PI;}
function face(g,id){g.s.people[id].metPlayer=true;rememberFace(g.s,id);assert.ok(applyFace(g.sim,id).ok);}

test('opening in plain sight is intercepted without dice, reward, offence or repeated barks',()=>{
 const g=setup(),events=[];g.sim.listeners.push((t,e)=>events.push([t,e]));g.sim.rng=()=>{throw Error('no dice for certain interception');};
 for(let n=0;n<3;n++)assert.equal(chestOpenPreview(g.eco,g.id).interceptor,'inspector');
 assert.equal(events.length,0);
 for(let n=0;n<3;n++)assert.ok(g.eco.act('chestOpen',g.id));
 assert.equal(g.chest.open,undefined);assert.equal(g.eco.items('object:'+g.id).length,4);assert.equal(g.s.wanted,0);
 assert.equal(events.filter(([t])=>t==='sandbox').length,1);assert.equal(events.filter(([t])=>t==='worldIncident').length,0);assert.equal(g.s.people.inspector.propertyStop.object,g.id);
});
test('an open chest is checked again when the owner turns; browsing never transfers',()=>{
 const g=setup();sneak(g);g.eco.act('chestOpen',g.id);g.eco.positions.inspector.facing=0;
 assert.equal(chestTakePreview(g.eco,g.id).interceptor,'inspector');assert.ok(g.eco.act('chestTakeAll',g.id));assert.equal(g.eco.items('object:'+g.id).length,4);
});
test('unseen theft takes directly without dice and retains owner, method, cause and finite stock after reload',()=>{
 const g=setup();sneak(g);g.eco.act('chestOpen',g.id);const item=g.eco.items('object:'+g.id)[0],preview=chestTakePreview(g.eco,g.id,item.id),events=[];
 assert.equal(preview.certain,true);g.sim.rng=()=>{throw Error('container take must not roll');};g.sim.listeners.push((t,e)=>events.push([t,e]));g.eco.act('chestTake',g.id,item.id);
 assert.equal(item.location,'player');
 assert.equal(events.filter(([t])=>t==='fieldCheck').length,0);assert.equal(events.find(([t])=>t==='worldIncident')[1].type,'theft');assert.equal(g.s.wanted,0);
 assert.equal(item.provenance.originalOwner,'inspector');assert.equal(item.provenance.history.at(-1).method,'stolen');assert.ok(item.provenance.history.at(-1).cause);assert.deepEqual(item.provenance.history.at(-1).witnesses,[]);
 const h=setup(g.id,structuredClone(g.s));assert.equal(h.eco.items('object:'+g.id).length,3);assert.equal(h.eco.items('player').filter(i=>i.id===item.id).length,1);assert.ok(h.eco.act('chestTake',g.id,item.id));
});
test('taking all court or bundle stock cannot fail randomly, cost skill energy or grant practice',()=>{
 for(const id of [COURT_CHEST,WARDROBE_CHEST]){
  const g=setup(id);sneak(g);g.eco.act('chestOpen',g.id);g.sim.rng=()=>{throw Error('no container dice');};let incident;g.sim.listeners.push((t,e)=>{if(t==='worldIncident')incident=e;});
  const money=g.s.player.money,energy=g.s.player.energy,skills=structuredClone(g.s.player.skills);
  g.eco.act('chestTakeAll',g.id);assert.equal(g.eco.items('object:'+g.id).length,0);assert.equal(incident.transferred,true);assert.deepEqual(incident.sightWitnesses,[]);assert.equal(g.s.player.money,money);assert.equal(g.s.wanted,0);assert.equal(g.s.player.energy,energy);assert.deepEqual(g.s.player.skills,skills);
  assert.ok(g.eco.act('chestTakeAll',g.id));assert.equal(g.eco.items('player').filter(i=>i.sourceContainer===id).length,4);
 }
});
test('a bystander can see a successful theft even when the owner faces away',()=>{
 const g=setup();sneak(g);g.eco.positions.merchant={x:g.s.player.x+1,z:g.s.player.z,facing:-Math.PI/2};g.eco.act('chestOpen',g.id);let incident;
 g.sim.listeners.push((t,e)=>{if(t==='worldIncident'){incident=e;e.witnesses=e.sightWitnesses;}});g.eco.act('chestTakeAll',g.id);
 assert.ok(incident.transferred);assert.deepEqual(incident.witnesses,['merchant']);assert.deepEqual(g.eco.items('player').find(i=>i.sourceContainer===g.id).provenance.history.at(-1).witnesses,['merchant']);
});
test('outfit is not permission; a recognized royal face needs no prior stores dialogue',()=>{
 const g=setup();const coat=g.eco.create('官服','clothing','player',{identityRole:'官兵'});g.s.player.wornOutfit=coat.id;assert.equal(chestOpenPreview(g.eco,g.id).interceptor,'inspector');
 face(g,'traveler');assert.equal(chestOpenPreview(g.eco,g.id).challenge,'inspector');assert.ok(g.eco.act('chestOpen',g.id));assert.ok(!g.chest.open);
 checkDisguise(g.sim,'inspector',{context:{positions:g.eco.positions,obstacles:[],player:g.s.player}});assert.equal(chestOpenPreview(g.eco,g.id).allowed,true);
 g.sim.rng=()=>{throw Error('accepted authority does not roll for theft');};g.eco.act('chestOpen',g.id);g.eco.act('chestTakeAll',g.id);
 const purse=g.eco.items('player').find(i=>i.chestSlot==='purse');assert.equal(purse.provenance.history.at(-1).method,'identity-requisition');assert.equal(purse.provenance.history.at(-1).subject,'traveler');assert.equal(g.s.facts.career,undefined);
});
test('an active original, exposed face, expired face and visible duplicate do not authorize taking',()=>{
 const original=setup();face(original,'inspector');assert.equal(chestOpenPreview(original.eco,original.id).challenge,'inspector');
 for(const mode of ['exposed','expired','duplicate']){const g=setup();face(g,'traveler');checkDisguise(g.sim,'inspector');
  if(mode==='exposed')appearanceState(g.s).exposed.inspector=g.s.player.face.serial;
  if(mode==='expired')g.s.player.face.until=0;
  if(mode==='duplicate')g.eco.positions.traveler={x:g.chest.x+.5,z:g.chest.z+1};
  assert.ok(chestOpenPreview(g.eco,g.id).blocked,mode);assert.ok(g.eco.act('chestOpen',g.id));assert.ok(!g.chest.open);
 }
});
test('incapacity and sight obstacles prevent active interception without removing ownership',()=>{
 for(const mutate of [n=>n.hp=0,n=>n.hp=n.maxHp*.3,n=>n.restraint={mode:'fixed'},n=>n.stunnedUntil=999,n=>n.muteUntil=999,n=>n.life={activity:'sleep'},n=>n.drowning=true,n=>n.inCustody=true]){
  const g=setup();Object.assign(g.s.player,{crouched:true,stealing:true});mutate(g.s.people.inspector);assert.equal(chestOpenPreview(g.eco,g.id).allowed,false);assert.ok(!chestOpenPreview(g.eco,g.id).blocked);assert.equal(g.eco.act('chestOpen',g.id),undefined);
 }
 const g=setup();sneak(g);g.eco.positions.inspector.facing=0;g.eco.obstacles=[{id:'wall',x:g.chest.x,z:g.chest.z-.5,w:4,d:.1,sightHeight:3}];assert.ok(!chestOpenPreview(g.eco,g.id).blocked);
 g.eco.obstacles=[{id:'wall',x:g.chest.x,z:g.chest.z+.6,w:4,d:.1,sightHeight:3}];assert.ok(chestOpenPreview(g.eco,g.id).blocked);
});
test('real membership needs a valid badge; a court face is distinct from unrelated official clothes',()=>{
 const g=setup();g.s.facts.career='court';assert.ok(chestOpenPreview(g.eco,g.id).blocked);
 const badge=g.eco.create('腰牌','personal','player',{badge:'court'});assert.equal(chestOpenPreview(g.eco,g.id).allowed,true);badge.badgeSuspended=true;assert.ok(chestOpenPreview(g.eco,g.id).blocked);
 const h=setup();face(h,'inspector');h.s.people.inspector.stunnedUntil=999;assert.equal(chestOpenPreview(h.eco,h.id).allowed,true);assert.equal(h.s.facts.career,undefined);const k=setup();face(k,'fu');assert.ok(chestOpenPreview(k.eco,k.id).blocked);
});
test('tea bundle migrates only remaining stock; already acquired clothing is never reclaimed or restocked',()=>{
 const g=setup(WARDROBE_CHEST);assert.match(propertyLabel(g.eco,g.chest),/宋茶娘/);assert.equal(chestOpenPreview(g.eco,g.id).interceptor,'tea_host');sneak(g);g.eco.act('chestOpen',g.id);const robe=g.eco.items('object:'+g.id).find(i=>i.type==='clothing');g.eco.act('chestTake',g.id,robe.id);assert.equal(robe.provenance.originalOwner,'tea_host');
 Object.assign(g.chest,{x:-12.15,z:22.15,name:'旧木箱',owner:null});delete robe.ownerId;const h=setup(g.id,structuredClone(g.s));
 assert.equal(h.chest.x,TRAVEL_BUNDLE.x);assert.equal(h.chest.material,'cloth');assert.equal(h.eco.items('player').find(i=>i.id===robe.id).ownerId,undefined);assert.equal(h.eco.items('object:'+g.id).length,3);
 h.eco.registerAssets(assets);assert.equal(h.eco.items('object:'+g.id).length,3);
});
test('scattered property stays owned; dropping recovered property is not a second theft',()=>{
 const g=setup();sneak(g);g.eco.damage(g.id,'physical',999);const item=g.eco.s.items.find(i=>i.sourceContainer===g.id);assert.equal(item.location,'ground');Object.assign(g.s.player,{x:item.x,z:item.z,crouched:false,stealing:false});assert.ok(g.eco.act('pickup','',item.id));
 Object.assign(g.s.player,{crouched:true,stealing:true});g.sim.rng=()=>{throw Error('scattered container stock must not roll');};g.eco.act('pickup','',item.id);assert.equal(item.location,'player');g.eco.act('drop','',item.id);g.s.player.crouched=false;g.s.player.stealing=false;g.sim.rng=()=>{throw Error('own drop cannot reroll');};g.eco.act('pickup','',item.id);assert.equal(item.location,'player');
});
test('bundle model and open view share one location and use a cloth knot with finite visible contents',()=>{
 const g=setup(WARDROBE_CHEST),world={scene:new T.Scene(),obstacles:[],registerObject(...args){this.asset=args.at(-1);}};buildTravelBundle(world);assert.equal(world.travelBundle.g.position.x,g.chest.x);assert.ok(g.chest.x+g.chest.w/2<-13-.3,'bundle is west of the tea tree without overlapping its trunk');assert.equal(world.asset.owner,'tea_host');
 updateTravelBundle(world,g.s,.1);assert.equal(world.travelBundle.knot.visible,true);g.chest.open=true;updateTravelBundle(world,g.s,.1);assert.equal(world.travelBundle.knot.visible,false);assert.ok(world.travelBundle.robe.visible);
 g.chest.hp=0;updateTravelBundle(world,g.s,.1);assert.equal(world.travelBundle.g.visible,false);
});
test('property refusal schedules actual approach and turn, then yields to incapacity',()=>{
 const g=setup();g.eco.act('chestOpen',g.id);const actor=new T.Group();actor.position.set(g.chest.x,0,g.chest.z-1);actor.userData.arms=[new T.Group(),new T.Group()];const n={actor};let moved=0;
 const w={sim:g.sim,hero:{position:new T.Vector3(g.s.player.x,0,g.s.player.z)},t:1,obstacles:[],collides:()=>false,move:(a,x,z)=>{a.position.x+=x;a.position.z+=z;moved++;},animateActor:()=>{}};
 assert.equal(propertyStopMotion(w,'inspector',n,.1),true);assert.ok(moved>0);g.s.people.inspector.stunnedUntil=999;assert.equal(propertyStopMotion(w,'inspector',n,.1),false);
});
