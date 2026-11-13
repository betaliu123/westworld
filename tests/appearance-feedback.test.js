import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Simulation,newArrival} from '../src/simulation.js';
import {Ecosystem} from '../src/ecosystem.js';
import {equipAppearance,applyFace,rememberFace,currentFace} from '../src/appearance.js';
import {syncAppearanceFeedback,outfitFeedbackCandidate,markOutfitNoticed,mountAppearanceFeedback} from '../src/appearance-feedback.js';

const ctx={player:{x:0,z:0},positions:{tea_host:{x:0,z:2,facing:Math.PI,visible:true}},obstacles:[]};
const lines={'tea_host.runner':['差爷，这身衣裳倒显眼。'],'tea_host.hat':['笠檐一遮，倒有几分江湖气。']};
function setup(){const sim=new Simulation(newArrival(),()=>{throw Error('Scene feedback must not roll dice');});sim.save=()=>{};const eco=new Ecosystem(sim),s=sim.s;
 Object.assign(s.player,{x:0,z:0});Object.assign(s.people.tea_host,{hp:100,maxHp:100,fear:0,life:{activity:'idle'},awareness:null});
 syncAppearanceFeedback(s);const coat=eco.create('差役服','clothing','player',{identityRole:'差役'});return {sim,s,eco,coat};}
function change(sim,coat){equipAppearance(sim,coat.id,'body');syncAppearanceFeedback(sim.s);}
const candidate=(s,c=ctx)=>outfitFeedbackCandidate(s,c,{lines});

test('acquisition does not trigger; actual wearing triggers one named local response without identity or reward changes',()=>{
 const {sim,s,coat}=setup();assert.equal(candidate(s),null);const before={money:s.player.money,relation:s.people.tea_host.relation,face:currentFace(s),rep:s.reputation,inventory:[...s.player.inventory]};
 change(sim,coat);const c=candidate(s);assert.equal(c.id,'tea_host');assert.equal(c.kind,'runner');assert.equal(markOutfitNoticed(sim,c),true);assert.equal(markOutfitNoticed(sim,c),false);assert.equal(candidate(s),null);
 assert.deepEqual({money:s.player.money,relation:s.people.tea_host.relation,face:currentFace(s),rep:s.reputation,inventory:[...s.player.inventory]},before);
});
test('old saves establish a baseline; pending and seen notices survive reload, repeated dressing is deduplicated',()=>{
 const {sim,s,coat}=setup();change(sim,coat);
 const loaded=new Simulation(JSON.parse(JSON.stringify(s)));loaded.save=()=>{};syncAppearanceFeedback(loaded.s);const c=candidate(loaded.s);assert.ok(c);markOutfitNoticed(loaded,c);
 equipAppearance(loaded,null,'body');syncAppearanceFeedback(loaded.s);assert.equal(candidate(loaded.s),null);change(loaded,coat);loaded.s.npcClock=(loaded.s.npcClock||0)+30;assert.equal(candidate(loaded.s),null);
 delete s.appearance.outfitFeedback;syncAppearanceFeedback(s);assert.equal(candidate(s),null);
});
test('no wall, rear, distant, hidden or incapacitated observer gives an appearance response',()=>{
 const {sim,s,coat}=setup();change(sim,coat);
 for(const patch of [{visible:false},{z:8},{facing:0}])assert.equal(candidate(s,{...ctx,positions:{tea_host:{...ctx.positions.tea_host,...patch}}}),null);
 assert.equal(candidate(s,{...ctx,obstacles:[{x:0,z:1,w:3,d:.2}]}),null);
 for(const patch of [{hp:0},{hp:30},{restraint:{mode:'bound'}},{inCustody:true},{stunnedUntil:999},{muteUntil:999},{drowning:true},{life:{activity:'sleep'}},{life:{activity:'doze'}},{life:{activity:'eat'}},{fear:2},{awareness:{state:'fight'}},{awareness:{caseOpen:true}}]){
  const original=structuredClone(s.people.tea_host);Object.assign(s.people.tea_host,patch);assert.equal(candidate(s),null,JSON.stringify(patch));s.people.tea_host=original;
 }
 assert.ok(candidate(s));
});
test('closer original/identity challenge takes precedence; familiar contradictions never receive a reassuring clothing aside',()=>{
 const {sim,s,coat}=setup();rememberFace(s,'gate_merchant');s.people.gate_merchant.metPlayer=true;applyFace(sim,'gate_merchant');syncAppearanceFeedback(s);change(sim,coat);
 assert.equal(candidate(s),null);assert.equal(currentFace(s),'gate_merchant');
 applyFace(sim,'player');syncAppearanceFeedback(s);equipAppearance(sim,null,'body');syncAppearanceFeedback(s);change(sim,coat);
 assert.equal(outfitFeedbackCandidate(s,ctx,{lines,blocked:()=>true}),null);
});
test('latest equipment wins; stale queued response cannot commit, and headwear from inventory is observed',()=>{
 const {sim,s,eco,coat}=setup();change(sim,coat);const c=candidate(s);const hat=eco.create('斗笠','hat','player');s.player.hat=hat.id;syncAppearanceFeedback(s);
 assert.equal(markOutfitNoticed(sim,c),false);assert.equal(candidate(s).kind,'hat');assert.equal(s.appearance.outfitFeedback.pending.kind,'hat');
});
test('nearest eligible observer wins; cooldown is global and no shared filler is spoken by unsupported characters',()=>{
 const {sim,s,eco,coat}=setup();change(sim,coat);Object.assign(s.people.porter,{hp:100,fear:0,life:{activity:'idle'},awareness:null});
 const c=candidate(s,{...ctx,positions:{...ctx.positions,porter:{x:0,z:1,facing:Math.PI}}});assert.equal(c.id,'porter');assert.equal(c.text,null);markOutfitNoticed(sim,c);
 const hat=eco.create('斗笠','hat','player');s.player.hat=hat.id;syncAppearanceFeedback(s);assert.equal(candidate(s),null);s.npcClock=(s.npcClock||0)+19;assert.equal(candidate(s).kind,'hat');
});
test('reviewed pack has 240 bounded lines and recorded generation provenance',()=>{
 const pack=JSON.parse(readFileSync(new URL('../assets/appearance-barks.json',import.meta.url),'utf8'));
 assert.equal(pack.reviewed,true);assert.equal(Object.keys(pack.lines).length,60);assert.equal(pack.sources.length,5);
 for(const values of Object.values(pack.lines)){assert.equal(values.length,4);assert.equal(new Set(values).size,4);for(const text of values){assert.ok(text.length>=8&&text.length<=28,text);assert.doesNotMatch(text,/[？?{}]|检定|成功率|少侠|腰牌|账册|绑腿|放行|免钱/);}}
});
test('scene controller defers while a panel is open, rechecks before display and only commits when shown',()=>{
 const {sim,s,coat}=setup();let open=true,queued;const position={x:0,z:2,clone(){return {add(){return this;}};}};
 const actor={position,visible:true,rotation:{y:Math.PI}},npc={actor},world={t:10,npcs:new Map([['tea_host',npc]]),hero:{position:{x:0,z:0}},obstacles:[],screenPoint:()=>({x:400,y:300,visible:true})};
 const oldWidth=globalThis.innerWidth,oldHeight=globalThis.innerHeight;globalThis.innerWidth=1280;globalThis.innerHeight=850;
 try{
  const feedback=mountAppearanceFeedback({getSim:()=>sim,world,available:()=>!open,canContinue:()=>!open,lines,say:line=>{queued=line;}});
  equipAppearance(sim,coat.id,'body');feedback.update();assert.equal(queued,undefined);assert.ok(s.appearance.outfitFeedback.pending);
  open=false;feedback.update();assert.ok(queued.valid());assert.equal(Object.keys(s.appearance.outfitFeedback.seen).length,0);assert.equal(npc.echoFacingUntil,12);
  position.z=9;assert.equal(queued.valid(),false);assert.equal(Object.keys(s.appearance.outfitFeedback.seen).length,0);
  position.z=2;assert.ok(queued.valid());assert.equal(queued.onShown(),true);assert.equal(Object.keys(s.appearance.outfitFeedback.seen).length,1);
  open=true;assert.equal(queued.valid(),false);
 }finally{if(oldWidth===undefined)delete globalThis.innerWidth;else globalThis.innerWidth=oldWidth;if(oldHeight===undefined)delete globalThis.innerHeight;else globalThis.innerHeight=oldHeight;}
});
