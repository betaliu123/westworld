import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../vendor/three.module.js';
import {Simulation,newArrival} from '../src/simulation.js';
import {Ecosystem} from '../src/ecosystem.js';
import {World} from '../src/world.js';
import {TRAVEL_BUNDLE,WARDROBE_CHEST,chestOpenPreview} from '../src/home-chest.js';
import {applyFace,rememberFace,checkDisguise} from '../src/appearance.js';
import {confirmIdentityRecognition,identityOpportunityOptions,resolveIdentityOpportunity,finishIdentityDialogue,identityGreeting} from '../src/identity-opportunities.js';
import {offersTravelBundle,bundleGiftStep,beginBundleGift,bundleGiftMotion} from '../src/travel-bundle-gift.js';
import {buildTravelBundle,updateTravelBundle} from '../src/travel-bundle-scene.js';
import {visibleBetween} from '../src/npc-awareness.js';

function setup(saved){
 const sim=new Simulation(saved||newArrival(),()=>0);sim.save=()=>{};const eco=new Ecosystem(sim,[TRAVEL_BUNDLE]),s=sim.s;
 Object.assign(s.player,{x:-15.5,z:29});eco.positions={tea_host:{x:-14.5,z:27.9,facing:Math.PI/2},qinghe:{x:-18,z:37}};eco.obstacles=[];
 if(!saved){s.people.qinghe.metPlayer=true;rememberFace(s,'qinghe');applyFace(sim,'qinghe');const r=checkDisguise(sim,'tea_host',{context:{positions:eco.positions,player:s.player,obstacles:[]}});assert.ok(r.success);confirmIdentityRecognition(sim,'tea_host');}
 return {sim,eco,s,o:eco.s.objects[WARDROBE_CHEST]};
}
const act=g=>resolveIdentityOpportunity(g.sim,g.eco,'tea_host','if_identity_bundle');
const start=g=>{const r=act(g);assert.equal(r.success,true);finishIdentityDialogue(g.sim,'tea_host',r,g.eco);return r;};
const stock=g=>g.eco.items('object:'+WARDROBE_CHEST);

test('recognition immediately offers the real bundle; cancellation and speech alone never grant it',()=>{
 const g=setup(),ids=stock(g).map(i=>i.id);g.sim.rng=()=>{throw Error('no extra gift roll');};
 assert.match(identityGreeting(g.s,'tea_host'),/包裹/);assert.equal(identityOpportunityOptions(g.sim,'tea_host')[0].id,'if_identity_bundle');
 const r=act(g);assert.equal(r.roll,null);assert.deepEqual(stock(g).map(i=>i.id),ids);assert.equal(g.s.travelBundleGift,undefined);
 finishIdentityDialogue(g.sim,'tea_host',r,g.eco);assert.equal(g.s.travelBundleGift.phase,'giving');assert.deepEqual(stock(g).map(i=>i.id),ids);
 bundleGiftStep(g.sim,g.eco,.6,g.eco.positions);assert.equal(stock(g).length,4);assert.equal(g.o.removed,undefined);
 bundleGiftStep(g.sim,g.eco,.6,g.eco.positions);assert.equal(g.s.travelBundleGift.phase,'done');assert.equal(g.o.removed,true);assert.equal(g.o.hp,120);
 for(const id of ids){const item=g.eco.items('player').find(i=>i.id===id);assert.ok(item);assert.equal(item.provenance.originalOwner,'tea_host');assert.equal(item.provenance.history.at(-1).method,'gift');assert.equal(item.provenance.history.at(-1).subject,'qinghe');assert.equal(item.provenance.history.at(-1).cause,g.s.travelBundleGift.cause);}
 assert.equal(g.s.chronicle.deeds.filter(d=>d.key==='qinghe-travel-bundle').length,1);assert.equal(g.s.facts.qingheConsent,undefined);assert.equal(g.s.wanted,0);
 finishIdentityDialogue(g.sim,'tea_host',r,g.eco);bundleGiftStep(g.sim,g.eco,2,g.eco.positions);assert.ok(act(g).error);
 const loaded=setup(structuredClone(g.s));loaded.eco.registerAssets([TRAVEL_BUNDLE]);assert.equal(stock(loaded).length,0);assert.equal(loaded.o.removed,true);assert.equal(loaded.eco.items('player').filter(i=>ids.includes(i.id)).length,4);assert.equal(offersTravelBundle(loaded.s,'tea_host'),false);
});
test('only remaining stock is given; previously taken items retain their own history and partial saves do not refill',()=>{
 const g=setup(),robe=stock(g).find(i=>i.type==='clothing');g.eco.transfer(robe,'player','stolen');const taken=JSON.stringify(robe.provenance);
 const h=setup(structuredClone(g.s));start(h);bundleGiftStep(h.sim,h.eco,1.2,h.eco.positions);
 assert.equal(h.s.travelBundleGift.items.length,3);assert.equal(JSON.stringify(h.eco.s.items.find(i=>i.id===robe.id).provenance),taken);assert.equal(h.eco.items('player').filter(i=>i.sourceContainer===WARDROBE_CHEST).length,4);
 const empty=setup();for(const i of stock(empty))empty.eco.transfer(i,'player','stolen');assert.equal(offersTravelBundle(empty.s,'tea_host'),false);assert.doesNotMatch(identityGreeting(empty.s,'tea_host'),/包裹/);assert.ok(act(empty).error);
});
test('interruption, face changes, visible duplicate, incapacity and leaving never transfer or hide the bundle',()=>{
 const changes=[g=>applyFace(g.sim,'player'),g=>g.s.people.tea_host.restraint={},g=>g.s.people.tea_host.hp=g.s.people.tea_host.maxHp*.3,g=>g.s.people.tea_host.life={activity:'sleep'},g=>g.s.player.x=10,g=>{g.eco.positions.qinghe={x:-14.4,z:28.6};g.eco.positions.tea_host.facing=0;},g=>g.eco.obstacles=[{id:'wall',x:-15,z:28.5,w:.2,d:3}]];
 for(const [index,change] of changes.entries()){const g=setup();start(g);bundleGiftStep(g.sim,g.eco,.4,g.eco.positions);change(g);bundleGiftStep(g.sim,g.eco,2,g.eco.positions);assert.equal(stock(g).length,4,'interruption '+index);assert.equal(g.o.removed,undefined);assert.equal(g.s.travelBundleGift.phase,'interrupted');}
 const g=setup(),r=act(g);applyFace(g.sim,'player');finishIdentityDialogue(g.sim,'tea_host',r,g.eco);assert.equal(g.s.travelBundleGift,undefined);
 const paused=setup();start(paused);bundleGiftStep(paused.sim,paused.eco,5,paused.eco.positions,{paused:true});assert.equal(stock(paused).length,4);assert.equal(paused.s.travelBundleGift.reach,0);
});
test('unrecognized, destroyed, burning or distant bundles cannot be promised or granted',()=>{
 const g=setup();g.s.identityAccounts.recognitions={};assert.equal(beginBundleGift(g.sim,g.eco,g.s.player.face.serial),false);
 for(const modify of [h=>h.o.hp=0,h=>h.o.burning=1,h=>h.o.removed=true]){const h=setup();modify(h);assert.equal(offersTravelBundle(h.s,'tea_host'),false);assert.ok(act(h).error);}
 const remote=setup();remote.eco.positions.tea_host={x:10,z:-23};Object.assign(remote.s.player,{x:10,z:-22});assert.ok(act(remote).error);assert.equal(stock(remote).length,4);
});
test('a mid-reach reload still needs contact; delivery removes model, collision and property access without rubble or damage',()=>{
 const g=setup();start(g);bundleGiftStep(g.sim,g.eco,.6,g.eco.positions);const h=setup(structuredClone(g.s));
 const world={sim:h.sim,scene:new T.Scene(),obstacles:[],props:[],registerObject(){}};buildTravelBundle(world);updateTravelBundle(world,h.s,0);assert.equal(world.travelBundle.g.visible,true);
 assert.equal(World.prototype.collides.call(world,h.o.x,h.o.z,0,false),true);
 bundleGiftStep(h.sim,h.eco,.6,h.eco.positions);updateTravelBundle(world,h.s,0);
 assert.equal(world.travelBundle.g.visible,false);assert.equal(World.prototype.collides.call(world,h.o.x,h.o.z,0,false),false);assert.equal(chestOpenPreview(h.eco,WARDROBE_CHEST).blocked,true);assert.equal(h.eco.damage(WARDROBE_CHEST),false);
 assert.equal(visibleBetween({x:h.o.x-2,z:h.o.z},{x:h.o.x+2,z:h.o.z},world.obstacles,h.eco.s.objects,[.3,.3]),true);
 assert.equal(h.o.hp,120);assert.equal(h.s.broken.includes(WARDROBE_CHEST),false);
});
test('mother actually walks toward the package before handover can settle',()=>{
 const g=setup();g.eco.positions.tea_host={x:-14.5,z:26};Object.assign(g.s.player,{x:-15.5,z:27});start(g);
 const actor=new T.Group();actor.position.set(-14.5,0,26);const n={actor},world={sim:g.sim,playing:true,t:0,hero:new T.Group(),collides:()=>false,move:(a,x,z)=>{a.position.x+=x;a.position.z+=z;},animateActor:()=>{}};world.hero.position.set(g.s.player.x,0,g.s.player.z);
 assert.equal(bundleGiftMotion(world,'tea_host',n,.4),true);assert.ok(actor.position.z>26);assert.equal(stock(g).length,4);
});
