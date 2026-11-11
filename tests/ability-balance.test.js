import test from 'node:test';
import assert from 'node:assert/strict';
import {abilityCheck,resolveAbilityCheck} from '../src/ability-check.js';
import {Simulation,newArrival} from '../src/simulation.js';
import {Ecosystem} from '../src/ecosystem.js';
import {bookAction,stockBooks} from '../src/bookshop.js';
import {takePayment} from '../src/cash-transfers.js';
import {choiceCheckText} from '../src/dialogue.js';
import {takeClothes,clothesActions} from '../src/clothes-interaction.js';
import {npcActionAccess,npcActionRange} from '../src/npc-action-access.js';

function setup(tier=1){
 const sim=new Simulation(newArrival()),eco=new Ecosystem(sim),p=sim.s.player,n=sim.s.people.relay,checks=[];
 Object.assign(p,{x:0,z:0,crouched:true,stealing:true});p.stats.agility=60;p.skills.theft={tier,xp:0};
 Object.assign(n,{x:0,z:1,facing:0,life:{activity:'idle'}});eco.positions.relay={x:0,z:1};eco.s.time=100;
 let die=1,rolls=0;sim.rng=()=>{rolls++;return (die-.5)/100;};sim.listeners.push((t,r)=>{if(t==='fieldCheck')checks.push(r);});
 return {sim,eco,p,n,checks,roll:v=>{die=v;},rolls:()=>rolls};
}
test('approved curve, practice cap, final rounding and absolute probability bounds',()=>{
 const {p}=setup();for(const tier of [1,2,3,4]){p.skills.theft.tier=tier;assert.equal(abilityCheck(p).chance,[0,55,67,79,91][tier]);}
 p.skills.theft={tier:1,xp:30};assert.equal(abilityCheck(p).chance,59);p.skills.theft.xp=300;assert.equal(abilityCheck(p).chance,59);
 p.stats.agility=61;p.skills.theft.xp=3;assert.equal(abilityCheck(p,{difficulty:.5}).chance,55);
 assert.equal(abilityCheck(p,{difficulty:999}).chance,5);assert.equal(abilityCheck(p,{difficulty:-999}).chance,95);
 let rolls=0;const rng=()=>{rolls++;return 0;};assert.ok(resolveAbilityCheck(abilityCheck(p,{reason:'够不到'}),rng).error);
 assert.equal(resolveAbilityCheck(abilityCheck(p,{certain:true}),rng).success,true);assert.equal(rolls,0);
});
for(const tier of [1,2,3,4])test(`theft tier ${tier} uses the displayed boundary, once, before practice`,()=>{
 for(const pass of [true,false]){const g=setup(tier),item=g.eco.create('干粮','food','npc:relay'),before=JSON.stringify(g.sim.s),preview=g.eco.theftPreview('relay',item.id);
  assert.equal(preview.chance,[0,55,67,79,91][tier]);assert.equal(JSON.stringify(g.sim.s),before);assert.equal(g.rolls(),0);
  g.roll(preview.chance+(pass?0:1));g.eco.stealNpc('relay',item.id);assert.equal(g.rolls(),1);assert.deepEqual(g.checks[0].check,preview);
  assert.equal(item.location,pass?'player':'npc:relay');assert.equal(g.checks[0].success,pass);
 }
});
test('item difficulty and real attention change the same theft preview',()=>{
 const g=setup(3),item=g.eco.create('袖中小物','personal','npc:relay',{concealed:true});
 assert.equal(g.eco.theftPreview('relay').chance,69);assert.equal(g.eco.theftPreview('relay',item.id).chance,64);
 g.n.life.activity='meal';assert.equal(g.eco.theftPreview('relay',item.id).chance,64);
 g.n.eatingUntil=101;assert.equal(g.eco.theftPreview('relay',item.id).chance,79);g.eco.s.time=102;assert.equal(g.eco.theftPreview('relay',item.id).chance,64);
 g.n.life.activity='sleep';assert.equal(g.eco.theftPreview('relay',item.id).chance,79);
 g.n.awareness={state:'warn'};assert.equal(g.eco.theftPreview('relay',item.id).chance,44);
 g.n.awareness=null;g.n.life.activity='idle';g.eco.show={x:0,z:2,audience:['relay']};assert.equal(g.eco.theftPreview('relay',item.id).chance,79);
 g.eco.show.x=30;assert.equal(g.eco.theftPreview('relay',item.id).chance,64);
});
test('an absent owner cannot alter the probability of taking a loose object',()=>{
 const g=setup(),item={id:'loose'};g.n.awareness={state:'warn'};assert.equal(g.eco.chance({target:'relay',item}),35);
 g.eco.positions.relay.x=20;assert.equal(g.eco.chance({target:'relay',item}),55);
 g.eco.positions.relay.x=0;g.eco.obstacles=[{x:0,z:.5,w:3,d:.2}];assert.equal(g.eco.chance({target:'relay',item}),55);
});
for(const kind of ['food','book','coins','poison','plant'])test(`${kind} preview context matches the actual shared world check`,()=>{
 for(const pass of [true,false]){const g=setup(4),{sim,eco,p}=g;let item,context,run;
  if(kind==='book'){stockBooks(eco);item=eco.s.items.find(i=>i.sku==='boxing');Object.assign(p,{x:item.x,z:item.z});context={target:'bookseller',item};run=()=>bookAction(eco,'bookSteal',item);}
  else if(kind==='coins'){item=eco.create('铜钱','coins','ground',{x:0,z:0,amount:4,owner:'relay'});context={target:'relay',item};run=()=>takePayment(sim,eco,item);}
  else if(kind==='plant'){item=eco.items('player').find(i=>i.type==='food');context={target:'relay',difficulty:15,item:{id:item.id}};run=()=>eco.act('plant','relay',item.id);}
  else{eco.registerAssets([{id:'test-stall',kind:'stall',owner:'relay',name:'食摊',x:0,z:0}]);item=eco.items('object:test-stall')[0];context={target:'relay',item};
   if(kind==='poison'){p.skills.medicine={tier:2,xp:0};context.skillId='medicine';const toxin=eco.create('药粉','poison','player');run=()=>eco.poisonItem(toxin.id,item.id);}
   else run=()=>eco.act('steal','test-stall',item.id);
  }
  const preview=eco.actionPreview(context);g.roll(preview.chance+(pass?0:1));run();assert.equal(g.rolls(),1);assert.deepEqual(g.checks[0].check,preview);assert.equal(g.checks[0].success,pass);
  if(kind==='poison'){assert.equal(item.poisoned,pass);assert.equal(p.skills.theft.xp,0);assert.ok(p.skills.medicine.xp>0);}
 }
});
test('blocked and deterministic actions do not display invented percentages',()=>{
 assert.equal(choiceCheckText({stat:'agility'},{blocked:true,chance:null,reason:'尚未学会'}),'尚未学会');
 assert.equal(choiceCheckText({stat:'wit'},{certain:true,chance:100}),'无需检定');
 assert.equal(choiceCheckText({stat:'charm'},{certain:true,chance:0,reason:'守卫已认出原主'}),'守卫已认出原主');
});
test('world clothing theft uses the new curve without requiring a prior conversation',()=>{
 for(const pass of [true,false]){const g=setup();Object.assign(g.p,{x:-11,z:25.5});const action=clothesActions(g.sim).find(a=>a.id==='g_lift'),preview=g.sim.preview(action);
  assert.equal(preview.chance,45);g.roll(pass?45:46);const r=takeClothes(g.sim,action.id);assert.equal(r.success,pass);assert.deepEqual(r.check,preview);assert.equal(g.rolls(),1);
 }
});
test('aim and execution share the actual high-tier range and mode-specific line of sight',()=>{
 const {p}=setup(),origin={x:0,z:0},near={x:0,z:2},far={x:0,z:5},low=[{x:0,z:1,w:3,d:.2,sightHeight:1.3}];
 assert.equal(npcActionRange(p,'pressure'),2.2);assert.match(npcActionAccess(p,'pressure',origin,far),/距离/);
 p.skills.pressure.tier=4;assert.equal(npcActionRange(p,'pressure'),6);assert.equal(npcActionAccess(p,'pressure',origin,far),'');
 assert.match(npcActionAccess(p,'pressure',origin,{x:0,z:6.1}),/距离/);
 assert.equal(npcActionAccess(p,'probe',origin,near,low),'');assert.match(npcActionAccess(p,'pressure',origin,near,low),/视线/);
 assert.match(npcActionAccess(p,'probe',origin,near,[{...low[0],sightHeight:2}]),/视线/);
});
