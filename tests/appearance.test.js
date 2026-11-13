import test from 'node:test';
import assert from 'node:assert/strict';
import {Simulation,newArrival} from '../src/simulation.js';
import {Ecosystem} from '../src/ecosystem.js';
import {appearanceState,appearanceTime,currentFace,applyFace,rememberFace,knownFaces,recentFaces,mainRouteFace,canUseFace,feminineBody,equipAppearance,appearanceView,disguisePreview,checkDisguise,needsDisguiseCheck,believedIdentity,spreadIdentityRumor,rumorRisk,attributeIncident} from '../src/appearance.js';
import {witnessEvent,advanceAwareness} from '../src/npc-awareness.js';
import {recordDeed,aftermathContext,applyAftermath} from '../src/event-deck.js';
import {pendingEcho} from '../src/aftermath-encounters.js';
import {surrenderAsYan,gateState,resolveGate} from '../src/gate-scene.js';
import {identityCheck} from '../src/arrival-check.js';
import {earnReputation,cityRep,factionRep} from '../src/reputation.js';
import {chapterOptions,chapterResolve,chapterPreview} from '../src/chapter.js';
import {addCausalDeed} from '../src/item-meaning.js';
import {PRISON} from '../src/locations.js';

function setup(rng=()=>0){const sim=new Simulation(newArrival(),rng);sim.save=()=>{};const eco=new Ecosystem(sim);return {sim,s:sim.s,eco};}
function face(sim,id){rememberFace(sim.s,id);sim.s.people[id].metPlayer=true;return applyFace(sim,id);}
test('new wardrobes omit the unused cape; old item records survive without a wearable cape slot',()=>{
 const {sim,s,eco}=setup();assert.equal(eco.items('player').some(i=>i.slot==='cape'),false);
 const old=eco.create('行路斗篷','accessory','player',{slot:'cape',discovered:true});s.player.cape=old.id;
 const restored=new Simulation(JSON.parse(JSON.stringify(s))),restoredEco=new Ecosystem(restored);
 assert.equal(restoredEco.items('player').filter(i=>i.slot==='cape').length,1);
 assert.ok(equipAppearance(restored,old.id,'cape').error);assert.equal(restoredEco.items('player').find(i=>i.id===old.id).location,'player');
 assert.ok(equipAppearance(restored,restored.s.player.wornOutfit,'body').ok);
});
test('face, clothing and credentials stay independent; appearance consumes exactly one owned paste',()=>{
 const {sim,s,eco}=setup();assert.ok(applyFace(sim,'thief').error);const count=()=>eco.items('player').filter(i=>i.type==='cosmetic').length;
 const before=count();assert.ok(face(sim,'thief').ok);assert.equal(count(),before-1);assert.ok(applyFace(sim,'thief').error);assert.equal(count(),before-1);
 const robe=eco.create('女装罗裙','clothing','player',{ownerId:'mei'});equipAppearance(sim,robe.id,'body');assert.equal(appearanceView(s).face,'thief');assert.equal(appearanceView(s).role,'女装行客');assert.equal(identityCheck(s).blocked,true);
 equipAppearance(sim,null,'body');assert.equal(appearanceView(s).role,'挑夫');assert.equal(currentFace(s),'thief');assert.ok(equipAppearance(sim,robe.id,'head').error);
 s.time+=61;assert.equal(currentFace(s),'player');assert.equal(count(),before-1);
});
test('the displayed chance is the actual roll threshold; new clothing invalidates the earlier inspection',()=>{
 const {sim,s,eco}=setup();face(sim,'gate_merchant');const c=disguisePreview(s,'gate_guard');sim.rng=()=> (c.chance-1)/100;const r=checkDisguise(sim,'gate_guard');assert.ok(r.success);assert.equal(r.roll,c.chance);assert.equal(r.check.chance,c.chance);assert.equal(needsDisguiseCheck(s,'gate_guard'),false);
 const i=eco.create('罗裙','clothing','player',{ownerId:'mei'});equipAppearance(sim,i.id,'body');assert.ok(needsDisguiseCheck(s,'gate_guard'));assert.ok(disguisePreview(s,'gate_guard').mismatch);assert.ok(disguisePreview(s,'gate_guard').chance<c.chance);
 sim.rng=()=>.99;assert.equal(checkDisguise(sim,'gate_guard').success,false);assert.equal(currentFace(s),'player');
});
test('the original owner exposes the mask with no dice; a new face is not globally known',()=>{
 const {sim,s}=setup();face(sim,'gate_merchant');assert.ok(disguisePreview(s,'gate_merchant').original);assert.equal(checkDisguise(sim,'gate_merchant').success,false);assert.equal(currentFace(s),'player');
 face(sim,'thief');assert.equal(believedIdentity(s,'gate_merchant'),'thief');
});
test('witness attribution is frozen at the incident and propagates to face-specific aftermath',()=>{
 const {sim,s}=setup();face(sim,'gate_merchant');const relation=s.people.gate_guard.relation;const e={type:'theft',x:0,z:24,text:'当街取物'};
 witnessEvent(sim,'gate_guard',e,true,{x:0,z:24});assert.equal(e.identities.gate_guard,'gate_merchant');assert.equal(s.people.gate_guard.relation,relation);assert.equal(appearanceState(s).relations['gate_guard:gate_merchant'],-3);
 applyFace(sim,'player');recordDeed(sim,'actionWitnessed',{...e,witnesses:['gate_guard']});const ctx=aftermathContext(s);assert.ok(ctx.options.length);assert.ok(ctx.options.every(x=>x.subject==='gate_merchant'&&x.subjectName==='赵行商'));
 const made=applyAftermath(sim,null);assert.ok(made.echoes.length);const echo=made.echoes[0];assert.equal(pendingEcho(s,echo.who),null);face(sim,'gate_merchant');assert.equal(pendingEcho(s,echo.who),echo);
 const risky=disguisePreview(s,echo.who,{force:true});assert.ok(risky.reasons.some(t=>t.includes('传闻')));s.day+=3;assert.equal(rumorRisk(s),0);
});
test('an observer cannot identify a concealed costume change through a wall',()=>{
 const {sim,s}=setup();face(sim,'gate_merchant');witnessEvent(sim,'gate_guard',{type:'theft',x:0,z:0},true,{x:0,z:0});s.people.gate_guard.awareness.state='search';applyFace(sim,'player');advanceAwareness(sim,'gate_guard',{x:0,z:0},false,.1,false);assert.equal(s.people.gate_guard.awareness.state,'return');assert.equal(s.people.gate_guard.awareness.caseOpen,false);
});
test('reputation earned while disguised belongs to the perceived identity, including faction reputation',()=>{
 const {sim,s}=setup();face(sim,'gate_merchant');const before=cityRep(s);earnReputation(sim,{observer:'tea_host',faction:'court',amount:10,reason:'帮忙',key:'help:one'});assert.equal(cityRep(s),before);assert.equal(factionRep(s,'court'),0);assert.equal(appearanceState(s).reputations.gate_merchant.factions.court,10);
 assert.equal(earnReputation(sim,{observer:'tea_host',amount:10,key:'help:one'}),false);
});
test('Yan surrender uses the actual jail, clears pursuit, and releases inside the city',()=>{
 const {sim,s}=setup();assert.ok(surrenderAsYan(sim,'gate_guard').error);face(sim,'thief');const r=surrenderAsYan(sim,'gate_guard');assert.ok(!r.error);assert.equal(gateState(sim.event).phase,'prison');assert.equal(s.player.x,PRISON.spawn.x);assert.equal(s.player.z,PRISON.spawn.z);assert.equal(s.facts.custodyIdentity,'thief');
 const release=resolveGate(sim,sim.event.id,'g_serve');assert.ok(!release.error);assert.ok(s.facts.enteredCity);assert.equal(s.facts.entryRoute,'prison');assert.equal(s.player.x,PRISON.release.x);assert.equal(s.player.z,PRISON.release.z);assert.equal(s.wanted,0);assert.equal(currentFace(s),'player');
});

 test('passing strangers stay out of the face list and cannot be applied; known and warrant faces remain usable',()=>{
  const {sim,s,eco}=setup();rememberFace(s,'gate_merchant');assert.equal(canUseFace(s,'gate_merchant'),false);assert.equal(knownFaces(s).length,0);assert.ok(applyFace(sim,'gate_merchant').error);
  s.people.gate_merchant.metPlayer=true;assert.ok(applyFace(sim,'gate_merchant').ok);assert.equal(appearanceView(s).name,'赵行商');const skirt=eco.create('罗裙','clothing','player');equipAppearance(sim,skirt.id,'body');assert.equal(disguisePreview(s,'du'),null);assert.ok(disguisePreview(s,'gate_guard').mismatch);
  rememberFace(s,'thief');rememberFace(s,'thief','通缉榜画像');assert.ok(canUseFace(s,'thief'));rememberFace(s,'mei');s.people.mei.probed=true;assert.ok(canUseFace(s,'mei'));assert.equal(feminineBody(s),false);face(sim,'mei');assert.equal(feminineBody(s),true);equipAppearance(sim,null,'body');assert.equal(appearanceView(s).role,'江湖行客');s.time=12;assert.equal(chapterPreview(sim,'porter',{id:'ch_convoy_enter'}).blocked,true);
 });
 test('unmasking records misconduct against the actual player; earlier incidents retain the borrowed identity',()=>{
  const {sim,s}=setup();face(sim,'gate_merchant');const e={type:'theft'};attributeIncident(s,'gate_guard',e);checkDisguise(sim,'gate_merchant');assert.equal(e.identities.gate_guard,'gate_merchant');assert.ok(s.chronicle.deeds.some(d=>d.title==='冒名被识破'&&d.subject==='player'));assert.equal(cityRep(s),-2);
 });
 test('a gift remembers whom the recipient believed and the porter route recognizes a prepared bare chest after securing a place',()=>{
  const {sim,s,eco}=setup();face(sim,'gate_merchant');const deed=addCausalDeed(s,{title:'照看',text:'递水照看',target:'tea_host',valence:'kind'});assert.equal(deed.subject,'gate_merchant');applyFace(sim,'player');equipAppearance(sim,null,'body');s.time=12;chapterResolve(sim,eco,'porter','ch_convoy_work');chapterResolve(sim,eco,'porter','ch_convoy_bribe');const a=chapterOptions(sim,'porter').find(a=>a.id==='ch_convoy_enter');assert.ok(a);assert.equal(chapterPreview(sim,'porter',a).blocked,false);const result=chapterResolve(sim,eco,'porter',a.id);assert.ok(!result.error);assert.equal(s.facts.entryRoute,'convoy');assert.equal(s.player.wornOutfit,null);
 });
test('the face list puts the most recently usable face first and marks only a learned main route',()=>{
 const {s}=setup();s.chapterVersion=2;rememberFace(s,'qinghe');rememberFace(s,'porter');s.time+=5;rememberFace(s,'gate_guard');
 s.people.gate_guard.metPlayer=true;s.people.porter.metPlayer=true;assert.deepEqual(recentFaces(s).map(([id])=>id),['gate_guard','porter']);
 s.people.qinghe.metPlayer=true;assert.deepEqual(recentFaces(s).map(([id])=>id),['qinghe','gate_guard','porter']);
 assert.equal(mainRouteFace(s,'qinghe'),false);s.facts.qingheRosterRouteKnown=true;assert.equal(mainRouteFace(s,'qinghe'),true);assert.equal(mainRouteFace(s,'porter'),false);
 s.facts.enteredCity=true;assert.equal(mainRouteFace(s,'qinghe'),false);
});
