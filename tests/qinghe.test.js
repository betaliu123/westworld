import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../vendor/three.module.js';
import {Simulation,newArrival} from '../src/simulation.js';
import {Ecosystem} from '../src/ecosystem.js';
import {applyFace,rememberFace,checkDisguise,disguisePreview,appearanceState,identityFamiliar,needsDisguiseCheck,spreadIdentityRumor,observeFaceChange} from '../src/appearance.js';
import {identityFavorOptions,identityFavorPreview,resolveIdentityFavor} from '../src/identity-favors.js';
import {contactOptions} from '../src/gate-society.js';
import {CART,CONVOY_GATE,convoyState,convoyCrew,stockConvoy} from '../src/convoy.js';
import {admitCommandConvoy,convoyPosts,updateConvoyScene,convoyClear} from '../src/convoy-scene.js';
import {QINGHE_RIVERSIDE,QINGHE_ROCK} from '../src/locations.js';
import {qingheAtRiver,qingheRiverPose} from '../src/qinghe-riverside.js';
import {NpcGesture} from '../src/npc-gesture.js';
import {groundSeatBones} from '../src/ground-seat.js';
import {modelFixture} from './model-fixture.js';
import {lifeStep} from '../src/npc-life.js';
import {groundSeatWanted} from '../src/ground-seat.js';
import {visibleBetween} from '../src/npc-awareness.js';
import {inDeepWater} from '../src/world-rules.js';
import {routinePath} from '../src/npc-navigation.js';
import {ambientLine} from '../src/ambient-lines.js';
import {chapterSpeech,chapterSpeechOptions} from '../src/chapter-speech.js';
import {releaseQinghePassage} from '../src/convoy-passenger.js';

function setup(state=newArrival()){
 const sim=new Simulation(state,()=>0);sim.save=()=>{};const group=new T.Group(),asset={id:CART,group,kind:'convoy',owner:'fu',name:'花石纲货车',...CONVOY_GATE,w:2.9,d:3.7,max:360,material:'wood'};
 const eco=new Ecosystem(sim,[asset]),s=sim.s;s.time=35;s.npcClock=4;stockConvoy(eco);eco.s.objects['town-gate']??={id:'town-gate',hp:900,open:false};
 Object.assign(s.player,{x:8,z:27.5});const positions={fu:{x:8,z:29,facing:Math.PI},porter:{x:5,z:31},qinghe:{...QINGHE_RIVERSIDE},gate_guard:{x:0,z:23.8}};eco.positions=positions;
 for(const [id,q] of Object.entries(positions))Object.assign(s.people[id],q,{life:{activity:'idle'},awareness:null});
 s.people.qinghe.metPlayer=true;rememberFace(s,'qinghe');applyFace(sim,'qinghe');
 const world={sim,convoyVisual:group,convoyCargo:{},convoyWheels:[],environmentAssets:[asset],obstacles:[],props:[],hero:new T.Group(),npcs:new Map(Object.entries(positions).map(([id,q])=>{const actor=new T.Group();actor.position.set(q.x,0,q.z);actor.rotation.y=q.facing||0;return [id,{actor,base:new T.Vector3(q.x,0,q.z)}];}))};
 return {sim,s,eco,world,positions};
}
const action=g=>identityFavorOptions(g.sim,'fu').find(a=>a.id==='if_qinghe_join');
const join=g=>resolveIdentityFavor(g.sim,g.eco,'fu','if_qinghe_join');
test('both handlers stand clear of the turning wagon even when stopping short of their targets',()=>{
 const g=setup();join(g);const c=convoyState(g.s);Object.assign(c,{x:7.8,z:27.5,route:1});g.world.hero.position.set(-10,0,30);
 for(let h=0;h<Math.PI/2-.1;h+=.03){c.heading=h;const posts=convoyPosts(c,Math.PI/2);
  for(const id of ['fu','porter']){const target=posts[id],d=Math.hypot(target.x-c.x,target.z-c.z),short=.35;g.world.npcs.get(id).actor.position.set(target.x+(c.x-target.x)*short/d,0,target.z+(c.z-target.z)*short/d);}
  assert.ok(convoyClear(g.world,g.eco,{...c,heading:h+.03}),'blocked turning at '+h);
 }
});
test('Qinghe uses the actual seated skeleton to reach the water and lift a hand to her face',async()=>{
 const {model,wrapper}=await modelFixture('npc-woman.glb',1.88),actor=new T.Group(),rig=new T.Group();actor.add(rig);rig.add(wrapper);actor.updateMatrixWorld(true);
 const aliases={RightUpLeg:'R_Thigh',RightLeg:'R_Calf',LeftUpLeg:'L_Thigh',LeftLeg:'L_Calf',RightArm:'R_Upperarm',RightForeArm:'R_Forearm',LeftArm:'L_Upperarm',LeftForeArm:'L_Forearm'};
 const bones={};for(const [key,name]of Object.entries({rightLeg:'RightUpLeg',rightShin:'RightLeg',leftLeg:'LeftUpLeg',leftShin:'LeftLeg',rightArm:'RightArm',rightFore:'RightForeArm',leftArm:'LeftArm',leftFore:'LeftForeArm'}))bones[key]=model.getObjectByName('mixamorig'+name)||model.getObjectByName(aliases[name]);
 const hip=model.getObjectByName('mixamorigHips')||model.getObjectByName('Hip'),height=rig.worldToLocal(hip.getWorldPosition(new T.Vector3())).y,gesture=new NpcGesture(actor,model,1.88);
 for(const kind of ['waterPlay','pensive']){
  for(let i=0;i<60;i++){groundSeatBones(rig,bones,height,{weight:1});gesture.update(1/60,{kind},true);}
  const hand=actor.worldToLocal(gesture.handPoint(1));
  assert.ok(kind==='waterPlay'?hand.y<.16&&hand.z>.48:hand.y>.6&&hand.z<.4,kind+' '+JSON.stringify(hand));
 }
});
function atGate(g){const c=convoyState(g.s);Object.assign(c,{x:0,z:24,route:2,heading:0});c.posts=convoyPosts(c);for(const [id,q]of Object.entries(c.posts)){g.world.npcs.get(id).actor.position.set(q.x,0,q.z);Object.assign(g.s.people[id],q);g.eco.positions[id]=q;}
 Object.assign(g.s.player,{x:-2.2,z:25.7});g.world.hero.position.set(-2.2,0,25.7);return c;
}

test('Fu only knows the roster name: Qinghe entry is certain without a quest, consent or dice',()=>{
 for(const beforeTalk of [false,true]){const g=setup();if(beforeTalk)g.s.chapter={...g.s.chapter,done:{...g.s.chapter?.done,fu_manifest:true,qinghe_wish:true}};
  assert.ok(contactOptions(g.sim,'fu').some(a=>a.id==='if_qinghe_join'));const check=identityFavorPreview(g.sim,'fu',action(g),g.eco);assert.equal(check.certain,true);assert.equal(check.chance,100);
  assert.equal(identityFamiliar(g.s,'fu'),false);assert.equal(disguisePreview(g.s,'fu',{context:{positions:g.positions}}),null);assert.equal(needsDisguiseCheck(g.s,'fu'),false);
  g.sim.rng=()=>{throw Error('a name-only roster must not roll');};const money=g.s.player.money,result=join(g);
  assert.ok(result.success,result.error);assert.equal(result.roll,null);assert.equal(result.check.chance,check.chance);
  assert.equal(g.s.facts.enteredCity,true);assert.equal(g.eco.s.objects['town-gate'].open,true);assert.deepEqual({x:g.s.player.x,z:g.s.player.z},{x:8,z:27.5});assert.equal(g.s.facts.qingheConsent,undefined);assert.equal(g.s.facts.genyueRoute,undefined);assert.equal(g.s.player.money,money);
  assert.equal(g.s.convoy.command,undefined);assert.deepEqual(convoyCrew(g.s),['porter']);assert.equal(g.s.convoy.passenger.subject,'qinghe');assert.equal(g.s.chronicle.deeds.at(-1).subject,'qinghe');
  assert.deepEqual({x:g.s.convoy.x,z:g.s.convoy.z},CONVOY_GATE);assert.equal(g.s.facts.entryReceipt.subject,'qinghe');assert.deepEqual(g.s.facts.entryReceipt.witnesses,['fu','gate_guard']);assert.match(result.dialogue.at(-1).text,/符管事已核过名册/);
  assert.ok(join(g).error);assert.equal(g.s.chronicle.deeds.filter(d=>d.key==='convoy-qinghe-passenger').length,1);
 }
});
test('only rumors Fu actually heard can challenge the roster, with a shared preview and one roll',()=>{
 const unknown=setup();spreadIdentityRumor(unknown.s,'qinghe',12,'有人冒名','tea_host');assert.equal(identityFavorPreview(unknown.sim,'fu',action(unknown),unknown.eco).chance,100);
 const g=setup();spreadIdentityRumor(g.s,'qinghe',12,'有人冒名','fu');const preview=identityFavorPreview(g.sim,'fu',action(g),g.eco);assert.equal(preview.certain,false);assert.equal(preview.known,false);assert.ok(preview.chance<100);
 let rolls=0;g.sim.rng=()=>{rolls++;return 0;};const checked=checkDisguise(g.sim,'fu',{context:{positions:g.positions,obstacles:[],player:g.s.player}});assert.equal(checked.check.chance,preview.chance);assert.equal(rolls,1);g.sim.rng=()=>{throw Error('duplicate roll');};assert.equal(identityFavorPreview(g.sim,'fu',action(g),g.eco).certain,true);assert.ok(join(g).success);
 const h=setup();spreadIdentityRumor(h.s,'qinghe',12,'有人冒名','fu');h.sim.rng=()=>.999;assert.equal(join(h).success,false);assert.equal(h.s.convoy.phase,'gate');assert.equal(h.s.convoy.passenger,undefined);assert.equal(h.s.facts.enteredCity,undefined);
});
test('physical roster, live crew, distance, sight and real identity contradictions gate preview and execution',()=>{
 const changes=[g=>g.eco.items('npc:fu').find(i=>i.storyId==='convoy-list').location='player',g=>g.s.people.porter.hp=0,g=>g.s.people.fu.restraint={},g=>g.s.convoy.closed=true,g=>g.eco.s.objects[CART].hp=0,g=>g.positions.fu.x=30,g=>g.eco.obstacles=[{x:8,z:28.3,w:4,d:.1}],g=>observeFaceChange(g.sim,{face:'player',to:'qinghe',serial:g.s.player.face.serial,fromSerial:0},g.positions,[]),g=>appearanceState(g.s).exposed.fu=g.s.player.face.serial];
 for(const change of changes){const g=setup();convoyState(g.s);const a=action(g);change(g);g.sim.rng=()=>{throw Error('blocked roll');};assert.equal(identityFavorPreview(g.sim,'fu',a,g.eco).blocked,true);assert.ok(join(g).error);assert.equal(g.s.convoy.passenger,undefined);}
});
test('saved passage remains open without waiting for the wagon or repeating the entry settlement',()=>{
 let g=setup();join(g);const saved=JSON.parse(JSON.stringify(g.s));g=setup(saved);assert.ok(g.s.convoy.passenger);assert.ok(join(g).error);
 const at={x:g.s.player.x,z:g.s.player.z},money=g.s.player.money;let entries=0;
 g.sim.listeners.push(type=>{if(type==='entry')entries++;});
 assert.equal(admitCommandConvoy(g.world,g.eco),false);assert.deepEqual({x:g.s.player.x,z:g.s.player.z},at);assert.equal(g.s.facts.falseName,'宋青禾');assert.equal(g.s.facts.entryReceipt.subject,'qinghe');assert.equal(g.s.facts.entryRoute,'convoy-passenger');assert.equal(g.s.player.money,money);assert.equal(entries,0);
 assert.equal(admitCommandConvoy(g.world,g.eco),false);assert.ok(identityFavorOptions(g.sim,'fu').some(a=>a.id==='if_qinghe_recall'));
 assert.equal(resolveIdentityFavor(g.sim,g.eco,'fu','if_qinghe_recall').success,true);assert.equal(g.s.player.money,money);assert.equal(g.s.facts.qingheConsent,undefined);
});
test('before approval, a changed face, remote player, stopped crew or actual unmasking prevents passage',()=>{
 for(const change of [g=>applyFace(g.sim,'player'),g=>g.s.player.x=20,g=>g.s.people.porter.restraint={},g=>{g.world.npcs.get('qinghe').actor.position.set(1,0,25);checkDisguise(g.sim,'qinghe');},g=>appearanceState(g.s).exposed.gate_guard=g.s.player.face.serial]){
  const g=setup();change(g);assert.ok(join(g).error);assert.equal(g.s.facts.enteredCity,undefined);assert.equal(g.eco.s.objects['town-gate'].open,false);
 }
});
test('Fu walks ahead while the real puller still controls wagon movement and interruptions',()=>{
 const g=setup();join(g);const c=convoyState(g.s);g.world.hero.position.set(-10,0,27);g.s.player.x=-10;
 for(const [id,q]of Object.entries(convoyPosts(c))){g.world.npcs.get(id).actor.position.set(q.x,0,q.z);Object.assign(g.s.people[id],q);}
 assert.ok(c.posts.fu?.z<0||convoyPosts(c).fu.z<0);assert.deepEqual(convoyCrew(g.s),['porter']);
 const before=c.z;g.s.people.porter.restraint={};updateConvoyScene(g.world,g.eco,.1);assert.equal(c.z,before);delete g.s.people.porter.restraint;updateConvoyScene(g.world,g.eco,.1);assert.ok(c.z<before);assert.equal(g.s.facts.enteredCity,true);
});
test('guard dialogue changes immediately and unavailable or remote guards cannot hear a release order',()=>{
 const g=setup();join(g);assert.match(chapterSpeech(g.s,'gate_guard','gate_rules').text,/宋姑娘先进去/);assert.match(chapterSpeech(g.s,'gate_guard','gate_no_papers').text,/纲车随后/);
 const options=chapterSpeechOptions(g.s,'gate_guard');assert.ok(options.some(a=>a.id==='ch_gate_passage'));assert.ok(!options.some(a=>['ch_gate_rules','ch_gate_no_papers','ch_gate_guarantor'].includes(a.id)));
 assert.doesNotMatch(chapterSpeech(g.s,'gate_relief','gate_passage').text,/宋姑娘|核过名册/);
 for(const change of [g=>g.s.people.gate_guard.hp=0,g=>g.s.people.gate_guard.muteUntil=100,g=>g.s.people.gate_guard.life.activity='sleep',g=>g.positions.gate_guard={x:25,z:-20},g=>g.eco.obstacles=[{id:'wall',x:4,z:26,w:.3,d:8}]]){
  const h=setup();change(h);const preview=identityFavorPreview(h.sim,'fu',action(h),h.eco);assert.equal(preview.blocked,true);assert.ok(join(h).error);assert.equal(h.s.facts.enteredCity,undefined);
 }
});
test('legacy approved passengers gain the immediate release once, without replaying rewards or moving anyone',()=>{
 const g=setup();join(g);delete g.s.facts.enteredCity;delete g.s.facts.entryRoute;delete g.s.facts.entryReceipt;delete g.s.convoy.passenger.ahead;g.s.event=newArrival().event;g.eco.s.objects['town-gate'].open=false;
 const cause=g.s.convoy.passenger.cause,deeds=g.s.chronicle.deeds.length,money=g.s.player.money,where={x:g.s.player.x,z:g.s.player.z};let entries=0;g.sim.listeners.push(type=>{if(type==='entry')entries++;});
 assert.ok(releaseQinghePassage(g.sim,g.eco));assert.equal(releaseQinghePassage(g.sim,g.eco),false);assert.equal(entries,1);assert.equal(g.s.facts.entryReceipt.cause,cause);assert.equal(g.s.chronicle.deeds.length,deeds);assert.equal(g.s.player.money,money);assert.deepEqual({x:g.s.player.x,z:g.s.player.z},where);assert.equal(g.eco.s.objects['town-gate'].open,true);
 const fuBefore={...g.positions.fu};lifeStep(g.sim,g.eco,.1,g.positions);assert.equal(g.s.people.fu.life.activity,'convoy');assert.deepEqual(g.positions.fu,fuBefore);updateConvoyScene(g.world,g.eco,0);assert.ok(g.s.convoy.posts.fu.z<0);
});
test('riverside routine is reached by walking from old saves and never resets injury, items or relationships',()=>{
 const g=setup(),n=g.s.people.qinghe;Object.assign(n,{x:-11,z:29.5,hp:70,relation:9});g.positions.qinghe={x:-11,z:29.5};const pack=JSON.stringify(g.eco.items('npc:qinghe'));
 lifeStep(g.sim,g.eco,.1,g.positions);assert.equal(n.life.activity,'riverside');assert.deepEqual(n.life.target,QINGHE_RIVERSIDE);assert.equal(n.x,-11);assert.equal(n.hp,70);assert.equal(n.relation,9);assert.equal(JSON.stringify(g.eco.items('npc:qinghe')),pack);
 const blocked=(x,z)=>inDeepWater(x,z)||Math.abs(x-QINGHE_ROCK.x)<QINGHE_ROCK.w/2+.3&&Math.abs(z-QINGHE_ROCK.z)<QINGHE_ROCK.d/2+.3;
 const path=routinePath(g.positions.qinghe,QINGHE_RIVERSIDE,blocked);assert.ok(path.length>0);assert.ok(path.every(p=>!blocked(p.x,p.z)));assert.equal(inDeepWater(QINGHE_RIVERSIDE.x,QINGHE_RIVERSIDE.z),false);
 g.positions.qinghe={...QINGHE_RIVERSIDE};lifeStep(g.sim,g.eco,.1,g.positions);assert.ok(groundSeatWanted(g.s,'qinghe',g.positions.qinghe));
 const h=new Simulation(JSON.parse(JSON.stringify(g.s))),eco=new Ecosystem(h);lifeStep(h,eco,.1,g.positions);assert.equal(h.s.people.qinghe.life.activity,'riverside');
 const foodTarget=g.eco.foodTarget.bind(g.eco);g.eco.foodTarget=()=>({x:-10,z:27,kind:'stall'});n.purse=8;lifeStep(g.sim,g.eco,.1,g.positions);assert.equal(n.life.activity,'riverside');g.eco.foodTarget=foodTarget;lifeStep(g.sim,g.eco,.1,g.positions);assert.equal(n.life.activity,'riverside');
 n.restraint={};lifeStep(g.sim,g.eco,.1,g.positions);assert.equal(n.life.activity,'restrained');delete n.restraint;n.awareness={state:'fight'};lifeStep(g.sim,g.eco,.1,g.positions);assert.notEqual(n.life.activity,'riverside');n.awareness=null;lifeStep(g.sim,g.eco,.1,g.positions);assert.equal(n.life.activity,'riverside');
 n.hp=0;lifeStep(g.sim,g.eco,.1,g.positions);assert.equal(n.life.activity,'down');
});
test('the rock really occludes the tea stall while the bank is reachable; gestures stop for dialogue or danger',()=>{
 const g=setup(),n=g.s.people.qinghe;n.life={activity:'riverside',target:QINGHE_RIVERSIDE};
 assert.equal(visibleBetween({x:-8,z:30},QINGHE_RIVERSIDE,[QINGHE_ROCK]),false);assert.equal(visibleBetween({x:-18,z:32},QINGHE_RIVERSIDE,[QINGHE_ROCK]),true);
 assert.equal(qingheAtRiver(g.s,QINGHE_RIVERSIDE),true);assert.equal(qingheRiverPose(g.world).kind,'cry');g.s.facts.qingheWishKnown=true;assert.equal(qingheRiverPose(g.world).kind,'cry');g.s.facts.qingheConsent=true;assert.equal(qingheRiverPose(g.world).kind,'waterPlay');g.s.npcClock=12;assert.equal(qingheRiverPose(g.world).kind,'pensive');g.world.cinematic={speaker:'qinghe'};assert.equal(qingheRiverPose(g.world),null);g.world.cinematic=null;n.awareness={state:'fight'};assert.equal(qingheRiverPose(g.world),null);
 g.s.facts.qingheConsent=false;assert.match(ambientLine('qinghe','riverside',0,g.s),/黄旗.*随车.*汴京/);assert.equal(ambientLine('qinghe','sleep',0,g.s),null);
});
test('Fu waits for a roster name only before departure; ambient hints neither grant knowledge nor imply consent',()=>{
 const g=setup();convoyState(g.s);const before=JSON.stringify(g.s);
 assert.match(ambientLine('fu','duty',0,g.s),/宋青禾.*怎么还没来/);assert.match(ambientLine('fu','duty',1,g.s),/黄旗/);
 assert.match(ambientLine('qinghe','riverside',0,g.s),/汴京/);assert.equal(JSON.stringify(g.s),before);
 for(const phase of ['travel','town']){g.s.convoy.phase=phase;assert.equal(ambientLine('fu','duty',0,g.s),null);}g.s.convoy.phase='gate';
 for(const mode of ['sleep','doze','convoy','escape'])assert.equal(ambientLine('fu',mode,0,g.s),null);
 g.s.convoy.passenger={subject:'qinghe'};assert.equal(ambientLine('fu','duty',0,g.s),null);delete g.s.convoy.passenger;
 g.eco.items('npc:fu').find(i=>i.storyId==='convoy-list').location='player';assert.equal(ambientLine('fu','duty',0,g.s),null);
 assert.equal(identityFamiliar(g.s,'tea_host'),true);assert.equal(disguisePreview(g.s,'qinghe').original,true);
});
