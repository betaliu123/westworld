import test from 'node:test';
import assert from 'node:assert/strict';
import {Simulation,newArrival} from '../src/simulation.js';
import {Ecosystem} from '../src/ecosystem.js';
import {takeClothes} from '../src/clothes-interaction.js';
import {equipAppearance,clothing} from '../src/appearance.js';
import {WARDROBE_CHEST,TRAVEL_BUNDLE} from '../src/home-chest.js';
const assets=[TRAVEL_BUNDLE];
function setup(){const sim=new Simulation(newArrival(),()=>0);sim.save=()=>{};const eco=new Ecosystem(sim,assets);return {sim,eco};}
test('home chest opens, transfers real wearable stock, and does not restock on reload',()=>{
 const {sim,eco}=setup(),id=WARDROBE_CHEST,stock=()=>eco.items('object:'+id);
 assert.equal(stock().length,4);assert.ok(eco.act('chestOpen',id));assert.equal(eco.s.objects[id].open,undefined);
 Object.assign(sim.s.player,{x:TRAVEL_BUNDLE.x,z:TRAVEL_BUNDLE.z+1,crouched:true,stealing:true});
 assert.ok(eco.act('chestTakeAll',id),'closed chest does not give items');
 eco.obstacles=[{id:'wall',x:TRAVEL_BUNDLE.x,z:TRAVEL_BUNDLE.z+.5,w:2,d:.1,sightHeight:3}];
 assert.ok(eco.act('chestOpen',id),'cannot loot through a wall');eco.obstacles=[];
 assert.equal(eco.act('chestOpen',id),undefined);const robe=stock().find(i=>i.type==='clothing');
 assert.equal(eco.act('chestTake',id,robe.id),undefined);assert.equal(robe.location,'player');assert.ok(equipAppearance(sim,robe.id,'body').ok);assert.equal(clothing(sim.s).id,robe.id);
 assert.equal(eco.act('chestTakeAll',id),undefined);assert.equal(stock().length,0);assert.ok(eco.act('chestTake',id,robe.id));
 const restored=new Simulation(JSON.parse(JSON.stringify(sim.s))),other=new Ecosystem(restored,assets);
 assert.equal(other.items('object:'+id).length,0);assert.equal(other.items('player').filter(i=>i.chestSlot==='paste').length,3);
 other.transfer(other.s.items.find(i=>i.id===robe.id),'npc:tea_host');other.registerAssets(assets);assert.equal(other.items('object:'+id).length,0);
});
test('both uniform acquisition paths create one garment without changing equipped clothes',()=>{
 for(const action of ['g_buy','g_lift']){
  const {sim,eco}=setup(),before=sim.s.player.wornOutfit;Object.assign(sim.s.player,{x:-11,z:25.5});
  assert.ok(takeClothes(sim,action).success);const coat=eco.items('player').find(i=>i.storyId==='旧差役服');
  assert.ok(coat);assert.equal(sim.s.player.wornOutfit,before);assert.ok(equipAppearance(sim,coat.id,'body').ok);assert.equal(sim.s.player.disguise,'runner');
  assert.ok(equipAppearance(sim,null,'body').ok);assert.notEqual(sim.s.player.disguise,'runner');assert.equal(coat.location,'player');
  assert.ok(takeClothes(sim,action).error);assert.equal(eco.items('player').filter(i=>i.storyId==='旧差役服').length,1);
 }
});
test('legacy uniform flags recover a physical garment only once and never duplicate transferred clothes',()=>{
 const {sim}=setup();sim.s.player.inventory.push('旧差役服');sim.s.player.disguise='runner';
 const eco=new Ecosystem(sim,assets),coat=eco.items('player').find(i=>i.storyId==='旧差役服');
 assert.ok(coat);assert.equal(sim.s.player.wornOutfit,coat.id);
 eco.transfer(coat,'npc:relay');assert.equal(sim.s.player.wornOutfit,null);
 // Deliberately stale legacy flag from an old save must not create another coat.
 sim.s.player.inventory.push('旧差役服');const reloaded=new Simulation(JSON.parse(JSON.stringify(sim.s))),again=new Ecosystem(reloaded,assets);
 assert.equal(again.s.items.filter(i=>i.storyId==='旧差役服').length,1);assert.equal(again.s.items.find(i=>i.id===coat.id).location,'npc:relay');assert.ok(!reloaded.s.player.inventory.includes('旧差役服'));
});
