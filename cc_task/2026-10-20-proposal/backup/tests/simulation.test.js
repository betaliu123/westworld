import test from 'node:test';import assert from 'node:assert/strict';
import {Simulation,newGame} from '../src/simulation.js';import {PROPOSAL,SCENES,actionsFor,LETTERS} from '../src/data.js';
const setup=(r=0)=>new Simulation(newGame(),()=>r);
test('a wedding cannot recur after reconciliation on day four',()=>{
 const s=setup();s.resolve(1,'cheer');s.advanceDay();assert.equal(s.event.type,'banquet');assert.equal(s.s.facts.banquetDay,2);
 s.rng=()=>.999;s.resolve(s.event.id,'toast');s.advanceDay();assert.equal(s.event.type,'truce');
 s.rng=()=>0;s.resolve(s.event.id,'toast');assert.equal(s.s.pending.type,'favor');assert.equal(s.s.pending.allowed.includes('banquet'),false);
 assert.equal(s.direct(s.s.pending.id,'banquet','celebrate again'),false);
 const r=s.s.history.at(-1);assert.equal(s.applyReaction(r.reactionId,{dialogue:[{id:'shen',text:'多谢你来喝喜酒。'}],template:'banquet'}),false);
 s.advanceDay();assert.equal(s.s.day,4);assert.equal(s.event.type,'favor');assert.equal(s.s.mail.filter(m=>m.text===LETTERS.banquet).length,1);assert.equal(s.s.facts.banquetDay,2);
});
test('an older save with a repeat wedding queued delivers a favor instead',()=>{
 const s=setup();s.resolve(1,'cheer');s.advanceDay();s.resolve(s.event.id,'eat');
 delete s.s.facts.banquetDay;s.s.pending.type='banquet';s.s.pending.allowed=['banquet','favor'];
 const restored=new Simulation(JSON.parse(JSON.stringify(s.s)));restored.advanceDay();assert.equal(restored.event.type,'favor');assert.equal(restored.s.facts.couple,true);
});
test('32 unique choices with actual attribute checks',()=>{assert.equal(PROPOSAL.length,32);assert.equal(new Set(PROPOSAL.map(a=>a.id)).size,32);const s=setup();assert.equal(s.preview(PROPOSAL[0]).chance,40);assert.equal(s.preview(PROPOSAL[2]).chance,100);});
test('successful unseen theft preserves secret and leads to inquiry',()=>{const s=setup();const r=s.resolve(1,'steal');assert.equal(r.success,true);assert.deepEqual(s.s.player.inventory,['ring']);assert.equal(s.s.people.shen.relation,0);assert.match(s.s.people.shen.memories[0],/无人知道/);assert.equal(s.event.type,'inquiry');assert.equal(s.s.pending,null);assert.equal(s.event.elapsed,0);});
test('failed theft creates visible suspicion, no ring',()=>{const s=setup(.999);assert.equal(s.resolve(1,'steal').success,false);assert.equal(s.s.player.inventory.length,0);assert.equal(s.s.wanted,1);assert.equal(s.s.pending.type,'dispute');});
test('same advertised chance resolves D100 boundary exactly',()=>{const s=setup(.39);assert.equal(s.resolve(1,'steal').success,true);const f=setup(.4);assert.equal(f.resolve(1,'steal').success,false);});
test('resolved and unaffordable actions cannot be repeated',()=>{const s=setup();s.s.player.money=0;assert.ok(s.resolve(1,'gift').error);s.resolve(1,'cheer');const before=JSON.stringify(s.s);assert.ok(s.resolve(1,'cheer').error);assert.equal(JSON.stringify(s.s),before);});
test('success and failure both leave persistent consequences',()=>{for(const a of PROPOSAL)for(const roll of [0,.999]){const s=setup(roll),r=s.resolve(1,a.id);assert.ok(r.text);assert.ok(SCENES[s.s.pending?.type||s.event?.type]);assert.ok(s.s.player.xp>0);assert.ok(Number.isFinite(s.s.reputation));}});
test('letters arrive once when world day changes and highest relation sends',()=>{const s=setup();s.s.people.su.relation=60;s.resolve(1,'listen');s.advanceDay();assert.equal(s.s.mail[0].sender,'su');s.tick(.2);assert.equal(s.s.mail.length,1);const restored=new Simulation(JSON.parse(JSON.stringify(s.s)));assert.equal(restored.event.type,'confidence');assert.equal(restored.s.mail.length,1);});
test('returning ring removes ownership before compatible followup',()=>{const s=setup();s.resolve(1,'steal');s.advanceDay();s.resolve(s.event.id,'return');assert.equal(s.s.player.inventory.length,0);assert.equal(s.s.facts.missing,false);});
test('direct violence records witnesses and leads to scene consequences',()=>{const s=setup();s.attack('shen',['su','gao','guard']);assert.ok(s.s.people.gao.fear>0);assert.equal(s.s.people.guard.mood,'angry');assert.equal(s.s.pending.type,'dispute');});
test('destroying three banquet props enters same consequence system once',()=>{const s=setup();s.resolve(1,'cheer');s.advanceDay();for(let i=0;i<3;i++)s.breakProp('feast-'+i);assert.equal(s.s.history.at(-1).kind,'disrupt');assert.equal(s.s.pending.type,'dispute');const count=s.s.history.length;s.breakProp('feast-2');assert.equal(s.s.history.length,count);});
test('ignoring an active scene never fabricates a player action',()=>{const s=setup();s.tick(241);assert.equal(s.event,null);assert.equal(s.s.history.length,0);});
test('all followup actions settle without invalid state',()=>{for(const type of Object.keys(SCENES))for(const a of actionsFor(type,true))for(const roll of [0,.999]){const s=setup(roll);s.s.event.type=type;s.s.player.inventory=['ring'];const r=s.resolve(1,a.id);assert.equal(r.error,undefined,type+':'+a.id);assert.ok(s.s.player.money>=0);}});
test('physical damage is already a fact and cannot fail a second roll',()=>{const s=setup(.999);s.resolve(1,'cheer');s.advanceDay();for(let i=0;i<3;i++)s.breakProp('feast-'+i);assert.equal(s.s.history.at(-1).success,true);assert.equal(s.s.history.at(-1).roll,null);});
test('AI director is constrained by facts, delivered scenes and allowed templates',()=>{const s=setup();s.resolve(1,'cheer');const id=s.s.pending.id;assert.equal(s.direct(id,'inquiry','invent ring loss'),false);assert.equal(s.direct(id,'banquet','celebrate'),true);s.advanceDay();assert.equal(s.direct(id,'banquet','late'),false);});
test('greeting and gift affection cannot be farmed repeatedly in one day',()=>{const s=setup();s.npcAction('gao','gift');const money=s.s.player.money,affinity=s.s.people.gao.relation;s.npcAction('gao','gift');assert.equal(s.s.player.money,money);assert.equal(s.s.people.gao.relation,affinity);});
test('ordinary NPC checks have real success and failure, and remember them',()=>{for(const rng of [0,.999]){const s=setup(rng);const r=s.npcCheck('tea','befriend');assert.equal(r.success,rng===0);assert.equal(s.s.people.tea.relation,rng===0?8:-2);assert.ok(s.s.people.tea.memories.length);assert.ok(s.npcCheck('tea','befriend').error);}});
import {World} from '../src/world.js';
test('buildings and intact tables block walking; jumping clears low tables',()=>{const w={obstacles:[{x:4,z:0,w:2,d:2}],props:[{id:'table',x:0,z:0}],sim:{s:{broken:[]}}};assert.equal(World.prototype.collides.call(w,0,0),true);assert.equal(World.prototype.collides.call(w,0,0,1.2),false);assert.equal(World.prototype.collides.call(w,4,0,1.2),true);w.sim.s.broken=['table'];assert.equal(World.prototype.collides.call(w,0,0),false);});
test('navigation finds a walkable path around solid obstacles',()=>{const w={hero:{position:{x:0,z:8}},obstacles:[{x:0,z:3,w:4,d:3}],props:[],sim:{s:{broken:[]}}};w.collides=(...p)=>World.prototype.collides.call(w,...p);assert.equal(World.prototype.routeTo.call(w,[0,-3]),true);assert.ok(w.auto.every(p=>!w.collides(...p)));assert.ok(w.auto.some(p=>Math.abs(p[0])>=3));});

test('only explicit draw enables left-click attacks and sheathing cancels it',()=>{
 const sim=setup(),w=Object.create(World.prototype);Object.assign(w,{sim,playing:true,locked:false,t:10,readyUntil:0});let strikes=0;w.attack=()=>strikes++;
 w.primaryAction();w.primaryAction();assert.equal(strikes,0);assert.equal(w.combatReady,false);
 w.toggleWeapon();assert.equal(w.combatReady,true);w.t+=100;w.primaryAction();assert.equal(strikes,1);
 w.toggleWeapon();w.primaryAction();assert.equal(strikes,1);w.locked=true;w.toggleWeapon();assert.equal(w.combatReady,false);
 w.locked=false;sim.s.player.hp=0;w.toggleWeapon();assert.equal(w.combatReady,false);
});
test('respawn ends pursuit but retains consequences, including across save reload',()=>{
 const sim=setup();sim.attack('shen',['guard']);sim.s.wanted=9;sim.s.people.shen.relation=-30;
 const memory=[...sim.s.people.shen.memories],history=JSON.stringify(sim.s.history),pending=sim.s.pending.id;
 assert.equal(sim.isPursuing('guard',2),true);sim.s.player.hp=0;assert.equal(sim.isPursuing('guard',2),false);assert.equal(sim.isPursuing('shen',2),false);
 assert.equal(sim.respawn(),true);assert.equal(sim.s.player.hp,60);assert.equal(sim.s.wanted,0);assert.equal(sim.s.people.shen.relation,-30);assert.deepEqual(sim.s.people.shen.memories,memory);assert.equal(JSON.stringify(sim.s.history),history);assert.equal(sim.event.id,pending);
 const restored=new Simulation(JSON.parse(JSON.stringify(sim.s)));for(const id of Object.keys(restored.s.people))assert.equal(restored.isPursuing(id,1),false);
 assert.equal(sim.respawn(),false);assert.equal(sim.s.day,2);restored.attack('porter',['guard']);assert.equal(restored.isPursuing('guard',2),true);
});
test('natural day changes never revive a dead player into ongoing pursuit',()=>{const sim=setup();sim.s.player.hp=0;sim.s.wanted=9;sim.tick(241);assert.equal(sim.s.player.hp,0);assert.equal(sim.isPursuing('guard',1),false);});
test('rest resets positions, movement, combat animation and NPC hit timers',()=>{
 const position=()=>({x:8,y:0,z:8,set(x,y,z){Object.assign(this,{x,y,z});},copy(p){Object.assign(this,p);}});
 const actor={position:position()},base={x:2,y:0,z:3};const w=Object.create(World.prototype);Object.assign(w,{sim:setup(),readyUntil:10,attackTime:.4,jumpV:7,auto:[[2,3]],keys:new Set(['KeyW']),hero:{position:position()},npcs:new Map([['guard',{actor,base,nextHit:90}]])});
 w.resetAfterRest();assert.equal(w.readyUntil,0);assert.equal(w.attackTime,0);assert.equal(w.jumpV,0);assert.equal(w.auto,null);assert.equal(w.keys.size,0);assert.equal(w.hero.position.z,14);assert.equal(actor.position.x,2);assert.equal(w.npcs.get('guard').nextHit,0);
});

import {groupActions,motionFor,turnToward,arriveStep} from '../src/interaction.js';
import {character} from '../src/world.js';
import * as THREE from '../vendor/three.module.js';
test('all scene choices remain reachable exactly once through category pages',()=>{
 for(const type of Object.keys(SCENES)){const actions=actionsFor(type,true),groups=groupActions(actions),flat=groups.flatMap(g=>g.actions);assert.equal(flat.length,actions.length);assert.equal(new Set(flat.map(a=>a.id)).size,actions.length);for(const a of actions)assert.ok(motionFor(a));}
 const feast=groupActions(actionsFor('banquet'));assert.equal(feast.find(g=>g.id==='food').actions.some(a=>a.kind==='eat'),true);assert.equal(feast.find(g=>g.id==='leave').actions.length,1);
});
test('every selectable scene action plays a finite pose and completes exactly once',()=>{
 for(const a of [...PROPOSAL,...actionsFor('banquet'),{id:'intimidate',kind:'intimidate'}]){
 const w=Object.create(World.prototype);Object.assign(w,{sim:setup(),t:0,hero:character(0x385953,true),npcs:new Map(),actionStool:new THREE.Group()});let done=0;w.onPerformanceEnd=()=>done++;w.perform(a,'shen');
 w.t=.8;w.animateActor(w.hero,0,.016);w.animatePerformance(0,.016);assert.ok(w.performance,a.id);assert.ok(w.hero.userData.arms.some(arm=>Math.abs(arm.rotation.x)>.2),a.id);w.hero.traverse(o=>assert.ok(Number.isFinite(o.rotation.x),a.id));
 w.t=5;w.animatePerformance(0,.016);w.animatePerformance(0,.016);assert.equal(w.performance,null);assert.equal(done,1);
 }
});
test('NPC turns take shortest arc and arrival movement cannot overshoot',()=>{
 let angle=Math.PI-.02;const next=turnToward(angle,-Math.PI+.02,.016);assert.ok(next>angle);assert.ok(next-angle<.02);
 let distance=.14;for(let i=0;i<200;i++){distance-=arriveStep(distance,1.3,.045);assert.ok(distance>=.12-1e-10);}assert.ok(Math.abs(distance-.12)<1e-10);
});

test('betting success and failure have distinct truthful outcomes and NPC dialogue',()=>{
 for(const [roll,outcome]of [[0,'settled'],[.999,'refused']]){
 const sim=setup(roll),r=sim.resolve(1,'bet');assert.equal(r.actionId,'bet');assert.equal(sim.s.facts.wager,outcome);assert.ok(r.dialogue.length>=1);assert.equal(r.dialogue[0].id,'gao');assert.match(r.text,/赌/);assert.doesNotMatch(r.text,/酒盏落地|人群惊散/);assert.equal(sim.s.player.money,roll===0?110:80);assert.equal(sim.s.wanted,0);assert.equal(sim.isPursuing('shen',1),false);assert.equal(motionFor({id:'bet',kind:'disrupt'}),'gamble');
 assert.equal(sim.s.pending.type,'dispute');assert.equal(sim.s.pending.causeAction,'bet');assert.equal(sim.s.people.su.memories.at(-1),r.text);sim.advanceDay();assert.match(sim.s.mail.at(-1).text,/开赌/);
 const restored=new Simulation(JSON.parse(JSON.stringify(sim.s)));assert.deepEqual(restored.s.history[0].dialogue,r.dialogue);
 }
});
test('scene replies survive resolution and secret theft never exposes culprit',()=>{
 for(const a of PROPOSAL){const sim=setup(),r=sim.resolve(1,a.id);assert.ok(r.dialogue.length);assert.ok(r.dialogue.every(d=>sim.s.people[d.id]&&d.text));}
 const r=setup().resolve(1,'steal');assert.doesNotMatch(r.dialogue.map(d=>d.text).join(''),/你偷|你拿|你的手/);
});


test('every action has unique success and failure facts and explicit motion',()=>{
 const actions=[...new Map(Object.keys(SCENES).flatMap(type=>actionsFor(type,true)).map(a=>[a.id,a])).values()];
 const successTexts=new Set(),failureTexts=new Set();
 for(const a of actions){const beat=actionBeat(a,true),fail=actionBeat(a,false);assert.notEqual(beat.text,fail.text);successTexts.add(beat.text);failureTexts.add(fail.text);assert.equal(motionFor(a),beat.motion);}
 assert.equal(successTexts.size,actions.length);assert.equal(failureTexts.size,actions.length);
});
test('performance rewards settle once and failed performances pay nothing',()=>{
 for(const [id,amount]of Object.entries(BONUS)){const s=setup(),r=s.resolve(1,id);assert.equal(s.s.player.money,80+amount,id);assert.ok(r.changes.some(c=>c.includes('盘缠 +'+amount)));s.resolve(1,id);assert.equal(s.s.player.money,80+amount);const f=setup(.999);f.resolve(1,id);assert.equal(f.s.player.money,80);}
});
test('NLP reaction incorporates context, changes future and memory but never money or roll',()=>{
 const s=setup();s.s.people.su.relation=30;s.s.people.su.memories=['你曾认真听我谈游历。'];const r=s.resolve(1,'bet');
 assert.match(r.reactionContext.characters.find(n=>n.id==='su').personality,/自主/);assert.equal(r.reactionContext.characters.find(n=>n.id==='su').relationshipBefore,30);assert.ok(r.reactionContext.characters.find(n=>n.id==='su').memories.includes('你曾认真听我谈游历。'));
 const before=JSON.stringify(s.s.player),roll=r.roll;
 assert.equal(s.applyReaction(r.reactionId,{dialogue:[{id:'su',text:'我原以为你愿意听我的心事，没想到你也拿它取乐。'}],template:'confidence',reason:'旧交的冒犯让苏晚想私下问清。',money:99999}),true);
 assert.equal(JSON.stringify(s.s.player),before);assert.equal(r.roll,roll);assert.equal(s.s.pending.type,'confidence');assert.match(s.s.people.su.memories.at(-1),/我原以为/);assert.equal(s.applyReaction(r.reactionId,{dialogue:[],template:'dispute'}),false);
});
test('invalid, stale and late NLP responses cannot corrupt subsequent stories',()=>{
 const s=setup(),r=s.resolve(1,'bet');assert.equal(s.applyReaction(r.reactionId,{dialogue:[{id:'unknown',text:'瞎说。'}],template:'confidence'}),false);assert.equal(s.applyReaction(r.reactionId,{dialogue:[{id:'su',text:'不要拿我取乐。'}],template:'banquet'}),false);
 const defaultType=s.s.pending.type;s.advanceDay();assert.equal(s.applyReaction(r.reactionId,{dialogue:[{id:'su',text:'不要拿我取乐。'}],template:'confidence'}),true);assert.equal(s.event.type,defaultType);
 const fresh=setup(),old=fresh.resolve(1,'bet');fresh.npcCheck('elder','befriend');assert.equal(fresh.applyReaction(old.reactionId,{dialogue:[{id:'su',text:'不要拿我取乐。'}],template:'confidence'}),false);
});
test('successful theft hides culprit and restricts AI knowledge and followup',()=>{
 const s=setup(),r=s.resolve(1,'steal');assert.deepEqual(r.reactionContext.allowed,['inquiry']);assert.deepEqual(r.reactionContext.recentEvents,[]);assert.equal(s.applyReaction(r.reactionId,{dialogue:[{id:'shen',text:'是你偷走了戒指！'}],template:'inquiry'}),false);
});

import {actionBeat,BONUS} from '../src/action-contracts.js';


import {bubbleLayout} from '../src/interaction.js';
test('ambient NPC attention has hysteresis instead of alternating at the old boundary',()=>{
 const w=Object.create(World.prototype);w.hero=new THREE.Group();w.t=0;w.move=()=>{throw Error('should remain attending');};
 const n={actor:new THREE.Group(),base:new THREE.Vector3(),phase:1};w.hero.position.set(0,0,2.7);
 for(let i=0;i<300;i++){w.t+=1/60;const dist=i===0?2.7:3+Math.sin(i)*.15;assert.equal(w.updateAmbientNpc(n,dist,1/60),'talk');assert.equal(n.attending,true);assert.equal(n.wanderTarget,null);}
});
test('wander destination stays fixed until arrival, then NPC rests without reversing',()=>{
 const w=Object.create(World.prototype);w.hero=new THREE.Group();w.hero.position.set(20,0,20);w.t=0;w.move=(a,x,z)=>{a.position.x+=x;a.position.z+=z;};const n={actor:new THREE.Group(),base:new THREE.Vector3(),phase:.5};
 w.updateAmbientNpc(n,20,1/60);const destination=n.wanderTarget.clone();let arrived=false;
 for(let i=0;i<1200;i++){w.t+=1/60;const angle=n.actor.rotation.y;w.updateAmbientNpc(n,20,1/60);assert.ok(Math.abs(n.actor.rotation.y-angle)<=2.8/60+1e-9);if(!n.wanderTarget){arrived=true;break;}assert.ok(n.wanderTarget.equals(destination));}
 assert.equal(arrived,true);const position=n.actor.position.clone(),angle=n.actor.rotation.y;for(let i=0;i<60;i++){w.t+=1/60;w.updateAmbientNpc(n,20,1/60);}assert.ok(n.actor.position.equals(position));assert.equal(n.actor.rotation.y,angle);
});
test('lower menu stays inside desktop and compact viewports',()=>{
 for(const [width,height]of [[1280,720],[903,529],[533,453]]){const point={x:width/2,y:height*.4},layout=bubbleLayout(width,height,point);assert.ok(layout.y>point.y+40);assert.ok(layout.y+170*layout.scale<=height-44);assert.ok(layout.x-330*layout.scale>=11);assert.ok(layout.x+330*layout.scale<=width-11);}
});

test('ignored missing ring search ends, persists and creates a quarrel without opening mail',()=>{
 const s=setup();s.resolve(1,'steal');s.tick(26);assert.equal(s.event.round,1);
 const restored=new Simulation(JSON.parse(JSON.stringify(s.s)));restored.tick(50);assert.equal(restored.event,null);assert.equal(restored.s.pending.type,'ring_quarrel');assert.equal(restored.s.facts.couple,false);
 restored.advanceDay();assert.equal(restored.event.type,'ring_quarrel');assert.equal(restored.s.mail.at(-1).read,false);restored.tick(66);assert.equal(restored.event,null);
});
test('returning via dialogue really transfers ownership and cancels stale search decisions',()=>{
 const s=setup();s.resolve(1,'steal');s.tick(26);const id=s.event.id;const r=s.reply('shen','我把银戒还给你。');assert.equal(r.success,true);assert.equal(s.s.player.inventory.includes('ring'),false);assert.equal(s.s.facts.missing,false);assert.equal(s.s.pending.type,'truce');assert.equal(s.applySearchDecision(id,1,{decision:'disperse'}),false);
 const relation=s.s.people.shen.relation;s.reply('shen','我把银戒还给你。');assert.equal(s.s.people.shen.relation,relation);
});
test('denials check charm without teleporting the ring or accusing without evidence',()=>{
 for(const rng of [0,.999]){const s=setup();s.resolve(1,'steal');s.rng=()=>rng;const r=s.reply('shen','我没看见那枚戒指。');assert.equal(r.success,rng===0);assert.ok(r.roll);assert.equal(s.s.player.inventory.includes('ring'),true);assert.equal(s.event.type,'inquiry');assert.doesNotMatch(r.dialogue[0].text,/你偷/);}
});
test('chat and repeated searches cannot reset the exit timer or manufacture rewards',()=>{
 const s=setup();s.resolve(1,'steal');s.tick(60);for(let i=0;i<10;i++)s.reply('shen','我帮你一起找找。');assert.equal(s.event.elapsed,60);assert.equal(s.s.player.money,80);s.tick(16);assert.equal(s.s.pending.type,'ring_quarrel');
});
test('AI search decision is bounded, stale-safe, and can end the search early',()=>{
 const s=setup();s.resolve(1,'steal');s.tick(26);const id=s.event.id;assert.equal(s.applySearchDecision(id,1,{decision:'banquet'}),false);assert.equal(s.applySearchDecision(id,0,{decision:'disperse'}),false);assert.equal(s.applySearchDecision(id,1,{decision:'disperse'}),true);assert.equal(s.s.pending.type,'ring_quarrel');
});
test('walking away from search does not erase NPC search progress',()=>{const s=setup();s.resolve(1,'steal');s.tick(30);s.resolve(s.event.id,'leave');assert.equal(s.event.type,'inquiry');assert.equal(s.event.elapsed,30);s.tick(46);assert.equal(s.s.pending.type,'ring_quarrel');});

test('questions, refusals and the wrong recipient do not hand over inventory',()=>{for(const line of ['我不把银戒还给你。','如果把戒指还给你会怎样？']){const s=setup();s.resolve(1,'steal');s.reply('shen',line);assert.equal(s.s.player.inventory.includes('ring'),true);}const s=setup();s.resolve(1,'steal');s.reply('gao','我把银戒还给你。');assert.equal(s.s.player.inventory.includes('ring'),true);});
