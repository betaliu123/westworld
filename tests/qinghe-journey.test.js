import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../vendor/three.module.js';
import {Simulation,newArrival} from '../src/simulation.js';
import {Ecosystem} from '../src/ecosystem.js';
import {TRAVEL_BUNDLE} from '../src/home-chest.js';
import {CART,CONVOY_GATE} from '../src/convoy.js';
import {convoyPosts} from '../src/convoy-scene.js';
import {chapterResolve,chapterFollowups,chapterOptions} from '../src/chapter.js';
import {chapterSpeech} from '../src/chapter-speech.js';
import {contactOptions} from '../src/gate-society.js';
import {qingheJourneyStep,qingheJourneyPreview,qingheJourneyOptions,resolveQingheJourney,finishQingheGoodbye,noticeForcedMother,qinghePassengerReady,releaseQingheCompanion} from '../src/qinghe-journey.js';
import {restraintPreview,resolveRestraint,ropeAllowsMove} from '../src/npc-restraints.js';
import {restraintMotion} from '../src/lasso-world.js';
import {QINGHE_ROCK} from '../src/locations.js';
import {factionRep,cityRep} from '../src/reputation.js';
import {witnessEvent} from '../src/npc-awareness.js';
import {thoughtCandidates} from '../src/situational-thoughts.js';

function setup(saved){
 const sim=new Simulation(saved||newArrival(),()=>0);sim.save=()=>{};
 const assets=[{id:CART,name:'纲车',group:new T.Group(),kind:'convoy',owner:'fu',...CONVOY_GATE,w:2.9,d:3.7,max:360,material:'wood'},{...TRAVEL_BUNDLE,group:new T.Group(),max:120}];
 const eco=new Ecosystem(sim,assets),s=sim.s;s.time=35;s.npcClock=2;eco.obstacles=[];eco.s.objects['town-gate']={id:'town-gate',hp:900,open:false};
 eco.positions={qinghe:{x:-18,z:34.5,facing:0},tea_host:{x:-11.9,z:27,facing:Math.PI},fu:{x:8,z:29},porter:{x:5,z:31},gate_guard:{x:0,z:23.8}};
 for(const [id,q]of Object.entries(eco.positions))Object.assign(s.people[id],{...q,hp:100,stunnedUntil:0,sickUntil:0,muteUntil:0,life:{activity:'idle'},awareness:null});
 Object.assign(s.player,{x:-18,z:36,energy:100,hp:100});
 return {sim,s,eco};
}
const choose=(g,key,options={})=>chapterResolve(g.sim,g.eco,key==='deliver'||key==='recall'?'fu':'qinghe','ch_qj_'+key,options);
function intro(g){return chapterResolve(g.sim,g.eco,'qinghe','ch_qinghe_wish');}
function setPos(g,id,x,z,facing=0){const q={x,z,facing};Object.assign(g.s.people[id],q);g.eco.positions[id]=q;}
function bundle(g){setPos(g,'qinghe',TRAVEL_BUNDLE.x+1,TRAVEL_BUNDLE.z);qingheJourneyStep(g.sim,g.eco,1.21,g.eco.positions);}
function goodbye(g){setPos(g,'qinghe',-12.5,28.8);Object.assign(g.s.player,{x:-12,z:30});assert.equal(finishQingheGoodbye(g.sim,g.eco,g.eco.positions),true);}
function atFu(g){setPos(g,'qinghe',8,26.8);Object.assign(g.s.player,{x:9.5,z:28});}
function force(g){intro(g);assert.ok(choose(g,'force').success);g.sim.listeners.push((type,event)=>{if(type==='worldIncident')witnessEvent(g.sim,'qinghe',event,true,g.eco.positions.qinghe);});assert.ok(resolveRestraint(g.sim,g.eco,'qinghe','catch').success);}

test('intro differs only with actual Fu knowledge; hearing it offers exactly three routes, cancellation commits nothing',()=>{
 for(const known of [false,true]){const g=setup();g.s.facts.fuWaitingKnown=known;
  const r=chapterResolve(g.sim,g.eco,'qinghe','ch_qinghe_wish',{deferSpeech:true});assert.equal(g.s.facts.qingheHesitationKnown,undefined);assert.match(r.text,known?/符管事/:/京城/);
  const end=chapterResolve(g.sim,g.eco,'qinghe','ch_qinghe_wish',{confirmedText:r.text});assert.ok(end.success);
  assert.deepEqual(chapterFollowups(g.sim,'qinghe',end).map(a=>a.id),['ch_qj_spare','ch_qj_persuade','ch_qj_force']);
  assert.ok(!thoughtCandidates(g.s,{positions:g.eco.positions}).some(t=>t.key==='qingheIdentity'));
  const choice=choose(g,'persuade',{deferSpeech:true});assert.ok(choice.pendingSpeech);assert.equal(g.s.qingheJourney,undefined);
 }
});
test('letting her stay guides the real wardrobe without issuing clothes, a face, consent or reputation',()=>{
 const g=setup();intro(g);const before=JSON.stringify(g.eco.s.items),rep=factionRep(g.s,'yingfeng');assert.ok(choose(g,'spare').success);
 assert.equal(g.s.qingheJourney.mode,'spare');assert.equal(g.s.chapter.actionGuides.face.target,'wardrobe');
 assert.ok(thoughtCandidates(g.s,{positions:g.eco.positions}).some(t=>t.key==='qingheIdentity'));
 assert.equal(JSON.stringify(g.eco.s.items),before);assert.equal(g.s.player.face,undefined);assert.equal(g.s.facts.qingheConsent,undefined);assert.equal(factionRep(g.s,'yingfeng'),rep);
 assert.ok(choose(g,'persuade').error);assert.ok(!contactOptions(g.sim,'qinghe').some(a=>a.id==='ch_qinghe_wish'));
});
test('persuasion physically takes remaining stock and waits for a real goodbye, without duplicate transfers on reload',()=>{
 const g=setup();intro(g);choose(g,'persuade');const stock=g.eco.items('object:'+TRAVEL_BUNDLE.id),taken=stock[0];g.eco.transfer(taken,'player','stolen');
 qingheJourneyStep(g.sim,g.eco,20,g.eco.positions);assert.equal(g.s.qingheJourney.phase,'bundle');assert.equal(g.eco.items('npc:qinghe').filter(i=>i.sourceContainer===TRAVEL_BUNDLE.id).length,0);
 bundle(g);assert.equal(g.s.qingheJourney.phase,'farewell');assert.equal(taken.location,'player');assert.equal(g.s.qingheJourney.bundleItems.length,stock.length-1);assert.equal(g.eco.s.objects[TRAVEL_BUNDLE.id].removed,true);
 assert.equal(finishQingheGoodbye(g.sim,g.eco,g.eco.positions),false);assert.ok(choose(g,'deliver').error);
 const loaded=setup(JSON.parse(JSON.stringify(g.s)));assert.equal(loaded.s.qingheJourney.phase,'farewell');const count=loaded.eco.s.items.length;bundle(loaded);assert.equal(loaded.eco.s.items.length,count);
 goodbye(loaded);assert.equal(loaded.s.qingheJourney.phase,'follow');assert.equal(loaded.s.facts.qingheWishShared,true);assert.equal(finishQingheGoodbye(loaded.sim,loaded.eco,loaded.eco.positions),false);
});
test('already missing luggage is acknowledged, never refilled, and does not prevent voluntary departure',()=>{
 const g=setup();intro(g);for(const i of g.eco.items('object:'+TRAVEL_BUNDLE.id))g.eco.transfer(i,'player','stolen');const count=g.eco.s.items.length;
 assert.match(choose(g,'persuade').text,/行李/);qingheJourneyStep(g.sim,g.eco,.1,g.eco.positions);assert.equal(g.s.qingheJourney.phase,'farewell');goodbye(g);assert.equal(g.eco.s.items.length,count);
});
test('danger, sleep, restraint, occlusion and cancellation cannot finish collecting luggage or saying goodbye',()=>{
 for(const change of [g=>g.s.people.qinghe.hp=0,g=>g.s.people.qinghe.stunnedUntil=99,g=>g.s.people.qinghe.restraint={},g=>g.s.people.qinghe.awareness={state:'fight'},g=>g.eco.obstacles=[{x:TRAVEL_BUNDLE.x+.5,z:TRAVEL_BUNDLE.z,w:.1,d:3}]]){
  const g=setup();intro(g);choose(g,'persuade');change(g);bundle(g);assert.equal(g.s.qingheJourney.phase,'bundle');assert.equal(g.s.qingheJourney.bundleItems,undefined);
 }
 const g=setup();intro(g);choose(g,'persuade');bundle(g);setPos(g,'qinghe',-12.5,28.8);Object.assign(g.s.player,{x:-12,z:30});
 g.s.people.tea_host.life.activity='sleep';assert.equal(finishQingheGoodbye(g.sim,g.eco,g.eco.positions),false);g.s.people.tea_host.life.activity='idle';
 qingheJourneyStep(g.sim,g.eco,.1,g.eco.positions,{say:(key,lines,valid,finish)=>{assert.ok(valid());finish(true);return true;}});
 assert.equal(g.s.qingheJourney.phase,'farewell');assert.equal(g.s.qingheJourney.farewellDeferred,true);assert.ok(qingheJourneyOptions(g.s,'qinghe').some(a=>a.id==='ch_qj_goodbye'));
 assert.ok(choose(g,'goodbye').success);assert.equal(g.s.qingheJourney.farewellDeferred,false);
});
test('real nearby handoff gives +40 only to Yingfeng, starts walking and survives reload without repeat rewards',()=>{
 const g=setup();intro(g);choose(g,'persuade');bundle(g);goodbye(g);atFu(g);const city=cityRep(g.s),items=g.eco.s.items.length;
 const before=choose(g,'deliver',{deferSpeech:true});assert.ok(before.pendingSpeech);assert.equal(g.s.qingheJourney.delivered,undefined);
 const r=choose(g,'deliver',{confirmedText:before.text});assert.ok(r.success,r.error);assert.equal(factionRep(g.s,'yingfeng'),40);assert.equal(cityRep(g.s),city);assert.equal(g.s.convoy.phase,'travel');assert.ok(g.s.convoy.qinghePassenger);assert.equal(g.s.convoy.passenger,undefined);assert.equal(g.s.facts.falseName,null);assert.equal(g.s.player.x,9.5);assert.equal(g.s.facts.entryReceipt.route,'qinghe-escort');assert.equal(g.eco.s.items.length,items);
 const loaded=setup(JSON.parse(JSON.stringify(g.s)));atFu(loaded);assert.ok(choose(loaded,'deliver').error);assert.ok(choose(loaded,'recall').success);assert.equal(factionRep(loaded.s,'yingfeng'),40);
 assert.match(chapterSpeech(g.s,'gate_guard','gate_rules').text,/随纲队进去/);
 assert.equal(loaded.s.chronicle.deeds.filter(d=>d.key==='qinghe-handoff').length,1);
});
test('handoff revalidates real person, manifest, visibility and crew at commit; cap feedback is actual delta',()=>{
 for(const change of [g=>setPos(g,'qinghe',-18,34),g=>g.s.people.qinghe.hp=0,g=>g.s.people.qinghe.stunnedUntil=99,g=>g.eco.items('npc:fu').find(i=>i.storyId==='convoy-list').location='player',g=>g.s.convoy.closed=true,g=>g.s.people.porter.hp=0,g=>g.eco.obstacles=[{x:8,z:27.8,w:1,d:.1}]]){
  const g=setup();intro(g);choose(g,'persuade');bundle(g);goodbye(g);atFu(g);const pending=choose(g,'deliver',{deferSpeech:true});change(g);assert.ok(choose(g,'deliver',{confirmedText:pending.text}).error);assert.equal(g.s.qingheJourney.delivered,undefined);assert.equal(factionRep(g.s,'yingfeng'),0);
 }
 const g=setup();intro(g);choose(g,'persuade');bundle(g);goodbye(g);atFu(g);g.s.factions??={};g.s.factions['应奉局']=92;const r=choose(g,'deliver');assert.deepEqual(r.changes,['应奉局声望 +8']);assert.equal(factionRep(g.s,'yingfeng'),100);
});
test('forced choice highlights the real lasso; 100 percent requires actual range, sight, energy and a tool',()=>{
 const g=setup();intro(g);choose(g,'force');assert.equal(g.s.people.qinghe.restraint,undefined);assert.equal(g.s.chapter.actionGuides.lasso.target,'lasso');
 const check=restraintPreview(g.sim,g.eco,'qinghe','catch');assert.equal(check.chance,100);assert.equal(check.certain,true);assert.equal(check.storyCertain,true);
 for(const change of [g=>g.s.player.x=0,g=>g.eco.obstacles=[{x:-18,z:35.2,w:3,d:.1}],g=>g.s.player.energy=0,g=>g.eco.items('player').find(i=>i.lassoKit).location='ground']){
  const h=setup();intro(h);choose(h,'force');change(h);assert.equal(restraintPreview(h.sim,h.eco,'qinghe','catch').blocked,true);assert.ok(resolveRestraint(h.sim,h.eco,'qinghe','catch').error);assert.equal(h.s.people.qinghe.restraint,undefined);
 }
 g.sim.rng=()=>{throw Error('must not roll');};assert.ok(resolveRestraint(g.sim,g.eco,'qinghe','catch').success);assert.equal(g.s.people.qinghe.restraint.mode,'lead');assert.equal(g.s.facts.qingheVoluntaryTravel,undefined);
});
test('coercive handoff accepts a preceding real capture, preserves harm evidence, releases the player tether only at handoff',()=>{
 const g=setup();g.sim.listeners.push((type,e)=>{if(type==='worldIncident')witnessEvent(g.sim,'qinghe',e,true,g.eco.positions.qinghe);});
 assert.ok(resolveRestraint(g.sim,g.eco,'qinghe','catch').success);assert.equal(g.s.qingheJourney.mode,'force');assert.equal(g.s.facts.qingheWishKnown,undefined);const cause=g.s.people.qinghe.restraint.cause;
 atFu(g);const r=choose(g,'deliver');assert.ok(r.success,r.error);assert.equal(g.s.people.qinghe.restraint,undefined);assert.equal(g.s.people.qinghe.awareness.caseOpen,true);assert.equal(g.s.qingheJourney.captureCause,cause);assert.equal(g.s.convoy.qinghePassenger.mode,'force');assert.equal(factionRep(g.s,'yingfeng'),40);
 g.s.convoy.posts=convoyPosts(g.s.convoy);g.eco.positions.qinghe={...g.s.convoy.posts.qinghe};assert.ok(qinghePassengerReady(g.s,g.eco.positions));g.s.people.qinghe.awareness.lastIncident=20;g.s.people.qinghe.awareness.state='fight';assert.equal(qinghePassengerReady(g.s,g.eco.positions),false);
});
test('untying her before handoff restores the capture objective, without erasing the witnessed act or granting a reward',()=>{
 const g=setup();force(g);qingheJourneyStep(g.sim,g.eco,.1,g.eco.positions);assert.match(g.s.quests.qinghe_journey.objective,/牵青禾/);
 assert.ok(resolveRestraint(g.sim,g.eco,'qinghe','release').success);qingheJourneyStep(g.sim,g.eco,.1,g.eco.positions);
 assert.match(g.s.quests.qinghe_journey.objective,/用套索/);assert.equal(g.s.qingheJourney.mode,'force');atFu(g);assert.ok(choose(g,'deliver').error);assert.equal(factionRep(g.s,'yingfeng'),0);
});
test('mother must actually see the captive, approaches before reprimanding, freezes attribution and only settles once',()=>{
 const g=setup();force(g);g.eco.obstacles=[{x:-14,z:30.5,w:.2,d:20}];assert.equal(noticeForcedMother(g.sim,g.eco,g.eco.positions),false);
 g.eco.obstacles=[];setPos(g,'qinghe',-12,29.5);Object.assign(g.s.player,{x:-11.9,z:31});setPos(g,'tea_host',-11.9,27,0);
 assert.ok(noticeForcedMother(g.sim,g.eco,g.eco.positions));assert.equal(g.s.qingheJourney.mother.subject,'player');let count=0;
 assert.ok(g.s.people.tea_host.harmKnowledge.some(k=>k.target==='qinghe'&&k.subject==='player'&&k.kind==='restraint'&&k.evidence==='seen'));
 const say=(key,lines,valid,finish)=>{count++;assert.ok(valid());finish(false);return true;};qingheJourneyStep(g.sim,g.eco,.1,g.eco.positions,{say});assert.equal(count,0);
 setPos(g,'tea_host',-11.9,29);const relation=g.s.people.tea_host.relation;qingheJourneyStep(g.sim,g.eco,.1,g.eco.positions,{say});assert.equal(count,1);assert.equal(g.s.people.tea_host.relation,relation-20);assert.equal(g.s.qingheJourney.mother.phase,'done');
 qingheJourneyStep(g.sim,g.eco,.1,g.eco.positions,{say});assert.equal(count,1);assert.equal(g.s.people.tea_host.relation,relation-20);
});
test('the moving convoy waits for Qinghe and interruptions; arrival stays at the real town post',()=>{
 const g=setup();intro(g);choose(g,'persuade');bundle(g);goodbye(g);atFu(g);choose(g,'deliver');g.s.convoy.posts=convoyPosts(g.s.convoy);
 assert.equal(qinghePassengerReady(g.s,g.eco.positions),false);g.eco.positions.qinghe={...g.s.convoy.posts.qinghe};assert.equal(qinghePassengerReady(g.s,g.eco.positions),true);
 g.s.people.qinghe.restraint={};assert.equal(qinghePassengerReady(g.s,g.eco.positions),false);delete g.s.people.qinghe.restraint;
 Object.assign(g.s.convoy,{phase:'town',x:0,z:-16});g.s.convoy.posts=convoyPosts(g.s.convoy);g.eco.positions.qinghe={...g.s.convoy.posts.qinghe};qingheJourneyStep(g.sim,g.eco,.1,g.eco.positions);assert.equal(g.s.qingheJourney.phase,'arrived');assert.equal(g.s.facts.qingheArrived,true);
});
test('a short tether follows closer while walking, allowing the pair around the actual riverside rock without crossing it',()=>{
 const g=setup();force(g);const actor=new T.Group();actor.position.set(-18.05,0,34.5925);actor.userData.sword={visible:false};
 const hero=new T.Group();hero.position.set(-17.2122,0,36);const n={actor,label:{visible:true}},rock=QINGHE_ROCK;
 const world={sim:g.sim,hero,t:0,auto:[[-17,36]],keys:new Set(),obstacles:[rock],collides:(x,z)=>Math.abs(x-rock.x)<rock.w/2+.3&&Math.abs(z-rock.z)<rock.d/2+.3,animateActor(){},move(a,x,z){if(!this.collides(a.position.x+x,a.position.z+z)){a.position.x+=x;a.position.z+=z;}}};
 const next={x:-17.05,z:36},positions={qinghe:actor.position};assert.equal(ropeAllowsMove(g.s,hero.position,next,positions,[rock]),false);
 const original=actor.position.clone();for(let i=0;i<35;i++){world.t+=.05;restraintMotion(world,'qinghe',n,.05);}
 assert.ok(actor.position.distanceTo(original)>.3);assert.equal(ropeAllowsMove(g.s,hero.position,next,positions,[rock]),true);assert.equal(world.collides(actor.position.x,actor.position.z),false);
});
