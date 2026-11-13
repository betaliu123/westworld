import test from 'node:test';
import assert from 'node:assert/strict';
import {Simulation,newArrival} from '../src/simulation.js';
import {Ecosystem} from '../src/ecosystem.js';
import {applyFace,rememberFace,identityFamiliar,disguisePreview,checkDisguise,disguiseReplies,currentFace} from '../src/appearance.js';
import {disguiseLine} from '../src/disguise-reactions.js';
import {confirmIdentityRecognition,recognizedIdentity,identityOpportunityOptions,identityOpportunityPreview,resolveIdentityOpportunity,finishIdentityDialogue} from '../src/identity-opportunities.js';
import {contactOptions,contactFollowups} from '../src/gate-society.js';

function setup(saved){
 const sim=new Simulation(saved||newArrival(),()=>0);sim.save=()=>{};const eco=new Ecosystem(sim,[]),s=sim.s;
 Object.assign(s.player,{x:10,z:-22});eco.positions={tea_host:{x:10,z:-23,facing:0},qinghe:{x:-8,z:29}};
 if(!saved){s.people.qinghe.metPlayer=true;rememberFace(s,'qinghe');assert.ok(applyFace(sim,'qinghe').ok);}
 return {sim,eco,s,context:{positions:eco.positions,player:s.player,obstacles:[]}};
}
const act=(g,kind)=>resolveIdentityOpportunity(g.sim,g.eco,'tea_host','if_identity_'+kind);
function accept(g){const r=checkDisguise(g.sim,'tea_host',{context:g.context});assert.ok(r.success);confirmIdentityRecognition(g.sim,'tea_host');return r;}

test('mother uses family dialogue for the same acquaintance check and every available explanation',()=>{
 const g=setup(),preview=disguisePreview(g.s,'tea_host',{context:g.context});
 assert.equal(identityFamiliar(g.s,'tea_host'),true);assert.equal(preview.chance,50);
 assert.match(disguiseLine('tea_host','question',preview),/青禾.*娘/);
 for(const reply of disguiseReplies(g.s,'tea_host'))assert.match(reply.text,/娘/);
 g.s.player.hp=20;g.s.player.sickUntil=100;
 for(const reply of disguiseReplies(g.s,'tea_host'))assert.match(reply.text,/娘/);
 const r=accept(g);assert.match(disguiseLine('tea_host','success',r.check),/青禾.*娘/);
 assert.equal(recognizedIdentity(g.s,'tea_host'),true);
 assert.deepEqual(contactOptions(g.sim,'tea_host').map(a=>a.id),['if_identity_family']);
});
test('accepted mother conversation stays in character and is remembered only after hearing, once across reloads',()=>{
 const g=setup();accept(g);g.sim.rng=()=>{throw Error('accepted identity must not reroll');};
 const money=g.s.player.money,relation=g.s.people.tea_host.relation,items=JSON.stringify(g.eco.s.items),r=act(g,'family');
 assert.equal(r.roll,null);assert.match(r.dialogue[0].text,/娘/);assert.match(r.text,/青禾|娘/);
 assert.ok(identityOpportunityOptions(g.sim,'tea_host').some(a=>a.id==='if_identity_family'),'cancelled dialogue is still available');
 finishIdentityDialogue(g.sim,'tea_host',r);finishIdentityDialogue(g.sim,'tea_host',r);
 assert.deepEqual(identityOpportunityOptions(g.sim,'tea_host'),[],'no money/outsider fallback after family topics are exhausted');
 assert.ok(contactFollowups(g.sim,'tea_host',r).length<=3);
 assert.equal(g.s.player.money,money);assert.equal(g.s.people.tea_host.relation,relation);assert.equal(JSON.stringify(g.eco.s.items),items);
 assert.equal(g.s.facts.qingheConsent,undefined);assert.equal(g.s.facts.qingheAlternativeDiscussed,undefined);
 const deeds=g.s.chronicle.deeds.filter(d=>d.key==='identity:qinghe:tea_host:family');assert.equal(deeds.length,1);assert.equal(deeds[0].subject,'qinghe');assert.match(deeds[0].text,/宋茶娘.*认作宋青禾/);
 const loaded=setup(structuredClone(g.s));assert.deepEqual(contactOptions(loaded.sim,'tea_host'),[]);assert.ok(act(loaded,'family').error);
});
test('old accepted checks can hear the missing greeting without another roll; unmasking cancels pending family memory',()=>{
 const g=setup();checkDisguise(g.sim,'tea_host',{context:g.context});g.sim.rng=()=>{throw Error('old check must be reused');};
 assert.equal(recognizedIdentity(g.s,'tea_host'),false);const hello=act(g,'greet');assert.match(hello.text,/青禾.*娘/);assert.equal(hello.roll,null);
 finishIdentityDialogue(g.sim,'tea_host',hello);assert.equal(recognizedIdentity(g.s,'tea_host'),true);
 const r=act(g,'family');applyFace(g.sim,'player');finishIdentityDialogue(g.sim,'tea_host',r);
 assert.equal(g.s.identityAccounts.receipts['qinghe:tea_host:family'],undefined);
});
test('failed check exposes impersonation with mother dialogue, and never opens daughter conversation',()=>{
 const g=setup();g.sim.rng=()=>.999;const r=checkDisguise(g.sim,'tea_host',{context:g.context});
 assert.equal(r.success,false);assert.match(disguiseLine('tea_host','failure',r.check),/不是青禾|我女儿/);assert.equal(currentFace(g.s),'player');
 assert.equal(recognizedIdentity(g.s,'tea_host'),false);assert.deepEqual(identityOpportunityOptions(g.sim,'tea_host'),[]);
});
test('seeing both daughters overrides an accepted check without rolling; incapacity still prevents challenge',()=>{
 const g=setup();accept(g);g.eco.positions.qinghe={x:11,z:-22};g.sim.rng=()=>{throw Error('duplicate is deterministic');};
 const preview=disguisePreview(g.s,'tea_host',{context:g.context});assert.equal(preview.duplicate,true);assert.equal(preview.chance,0);
 const a=identityOpportunityOptions(g.sim,'tea_host')[0];assert.equal(a.id,'if_identity_family');assert.equal(identityOpportunityPreview(g.sim,'tea_host',a,g.eco).blocked,true);
 assert.match(disguiseLine('tea_host','failure',preview),/那边.*宋青禾/);
 g.s.people.tea_host.restraint={mode:'fixed'};assert.equal(disguisePreview(g.s,'tea_host',{context:g.context}),null);assert.ok(checkDisguise(g.sim,'tea_host',{context:g.context}).unavailable);
});
test('mother cannot answer remotely or through a wall, and hidden daughter does not become omniscient evidence',()=>{
 const g=setup();accept(g);const a=identityOpportunityOptions(g.sim,'tea_host')[0];assert.equal(a.id,'if_identity_family');g.sim.rng=()=>{throw Error('blocked conversations must not roll');};
 g.eco.positions.tea_host.x=30;assert.equal(identityOpportunityPreview(g.sim,'tea_host',a,g.eco).blocked,true);g.eco.positions.tea_host.x=10;
 g.eco.obstacles=[{id:'wall',x:10,z:-22.5,w:2,d:.2}];assert.equal(identityOpportunityPreview(g.sim,'tea_host',a,g.eco).blocked,true);
 g.eco.obstacles=[];g.eco.positions.qinghe={x:10,z:-25};assert.equal(disguisePreview(g.s,'tea_host',{context:g.context}).duplicate,undefined);
});
