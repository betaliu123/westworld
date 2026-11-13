import test from 'node:test';
import assert from 'node:assert/strict';
import {Simulation,newArrival,legacyArrival} from '../src/simulation.js';
import {Ecosystem} from '../src/ecosystem.js';
import {World,character} from '../src/world.js';
import {stepNpcCombat} from '../src/npc-combat.js';
import {resolveRestraint} from '../src/npc-restraints.js';
import {knownPersonalHarm} from '../src/npc-bonds.js';
import {concernLine} from '../src/npc-concerns.js';
import {escortResponse,observeEscorts,seesEscort,escortObserverReady,escortReactionMotion,escortReactionFrame,escortSpeechCurrent} from '../src/restraint-witnesses.js';

function setup(target='inspector',ids=['guard','chi','elder','merchant','qing'],served=[]){
 const sim=new Simulation(newArrival(),()=>0);sim.save=()=>{};const eco=new Ecosystem(sim),s=sim.s;
 Object.assign(s.player,{x:0,z:2,hp:100,energy:100});s.npcClock=1;s.law={served};
 for(const n of Object.values(s.people))Object.assign(n,{hp:100,awareness:null,life:{activity:'idle'},fear:0,stunnedUntil:0,muteUntil:0});
 eco.positions={[target]:{x:0,z:0,facing:0}};resolveRestraint(sim,eco,target,'catch');
 sim.rng=()=>{throw Error('observing an escort cannot roll');};
 const positions={...eco.positions};ids.forEach((id,i)=>positions[id]={x:(i-2)*.6,z:5,facing:Math.PI});
 return {sim,eco,s,target,positions};
}
function worldFor(g){
 const hero=character(0,true);hero.position.set(g.s.player.x,0,g.s.player.z);
 const npcs=new Map(Object.entries(g.positions).map(([id,q])=>{const actor=character(0);actor.position.set(q.x,0,q.z);actor.rotation.y=q.facing;return [id,{actor,base:actor.position.clone(),person:{id},label:{visible:false}}];}));
 const lines=[],moves=[];
 const world={sim:g.sim,hero,npcs,t:g.s.npcClock,playing:true,locked:false,obstacles:[],collides(x,z){return this.obstacles.some(o=>Math.abs(x-o.x)<o.w/2&&Math.abs(z-o.z)<o.d/2);},move(a,dx,dz){const x=a.position.x+dx,z=a.position.z+dz;if(!this.collides(x,z)){a.position.set(x,0,z);moves.push({x,z});}},animateActor(){},onActionCardSpeech(line){lines.push(line);line.onShown?.();return true;}};
 return {...g,world,lines,moves};
}
function tick(g,id,seconds=.1){g.world.t+=seconds;g.s.npcClock+=seconds;return escortReactionMotion(g.world,id,g.world.npcs.get(id),seconds);}

function captureLu(){
 const g=worldFor(setup('guard',['old_constable','shen','elder','chi','merchant']));
 // Use the real incident listener: a bound officer retains his assault evidence/fight state.
 resolveRestraint(g.sim,g.eco,'guard','release');g.sim.rng=()=>0;
 g.sim.listeners.push((type,event)=>{if(type==='worldIncident')World.prototype.noticeIncident.call(g.world,event);});
 resolveRestraint(g.sim,g.eco,'guard','catch');
 return g;
}
test('catching Lu through the world incident path does not silence the whole street',()=>{
 const g=captureLu();assert.equal(g.s.people.guard.awareness.state,'fight');
 observeEscorts(g.sim,g.positions);
 for(let i=0;i<80&&!g.lines.length;i++){escortReactionFrame(g.world);tick(g,'old_constable');}
 assert.ok(g.lines.some(l=>l.id==='old_constable'),'杜老捕 must actually warn despite the captive retaining fight evidence');
 assert.equal(g.s.people.guard.awareness.caseOpen,true);
});
test('a moving captive and blocked speech cannot turn all interveners into permanent followers',()=>{
 const g=captureLu();g.world.onActionCardSpeech=()=>false;observeEscorts(g.sim,g.positions);
 const ids=['old_constable','shen'];
 for(let i=0;i<300;i++){
  // Walk slowly enough that the old implementation can follow for the entire test.
  g.world.t+=.1;g.s.npcClock+=.1;g.s.player.z+=.025;g.world.hero.position.z=g.s.player.z;
  g.world.npcs.get('guard').actor.position.z=g.s.player.z-1.7;
  escortReactionFrame(g.world);for(const id of ids)escortReactionMotion(g.world,id,g.world.npcs.get(id),.1);
 }
 for(const id of ids){assert.ok(g.world.npcs.get(id).actor.position.z<6,id+' must stop at the observed encounter, not follow silently');assert.equal(g.s.people[id].escortReaction,undefined);assert.notEqual(g.s.people[id].awareness?.state,'fight');}
 assert.equal(g.lines.length,0);
});
test('interveners reserve separate stopping spots and a second warning is not suppressed by the first rescue',()=>{
 const g=captureLu();observeEscorts(g.sim,g.positions);const ids=['old_constable','shen'];
 for(let i=0;i<150;i++){
  g.world.t+=.1;g.s.npcClock+=.1;escortReactionFrame(g.world);
  for(const id of ids)escortReactionMotion(g.world,id,g.world.npcs.get(id),.1);
 }
 for(const id of ids){assert.equal(g.lines.filter(l=>l.id===id).length,1);assert.equal(g.s.people[id].awareness.state,'fight');}
 assert.ok(g.world.npcs.get(ids[0]).actor.position.distanceTo(g.world.npcs.get(ids[1]).actor.position)>=.9);
});
test('a queued warning only settles and starts the response window when its bubble is shown',()=>{
 const g=worldFor(setup('inspector',['guard']));observeEscorts(g.sim,g.positions);
 const relation=g.s.people.guard.relation;let pending;
 g.world.onActionCardSpeech=line=>{pending=line;return true;};tick(g,'guard');
 assert.equal(g.s.people.guard.relation,relation);assert.equal(g.s.people.guard.escortReaction.warnedAt,undefined);
 tick(g,'guard',4);assert.equal(pending.onShown(),true);assert.equal(g.s.people.guard.escortReaction.warnedAt,g.s.npcClock);
 assert.equal(g.s.people.guard.relation,relation-2);pending.onShown();assert.equal(g.s.people.guard.relation,relation-2);
 tick(g,'guard',3);assert.equal(g.s.people.guard.awareness,null);
 delete g.s.people.inspector.restraint;assert.equal(pending.valid(),false);
});
test('rival commentary ignores a restrained fight record but yields to a real nearby fight',()=>{
 const g=captureLu();observeEscorts(g.sim,g.positions);tick(g,'chi');assert.equal(g.lines.at(-1).id,'chi');
 const h=captureLu();observeEscorts(h.sim,h.positions);h.s.people.old_constable.awareness={state:'fight'};
 tick(h,'chi');assert.equal(h.lines.length,0);tick(h,'shen');assert.equal(h.lines.at(-1).id,'shen');
});
test('an already stalled v2 save gets a bounded stopping point without losing evidence or duplicating settlement',()=>{
 const g=captureLu();observeEscorts(g.sim,g.positions);g.s.npcClock+=60;
 const sim=new Simulation(JSON.parse(JSON.stringify(g.s)));sim.save=()=>{};const eco=new Ecosystem(sim);
 const h=worldFor({sim,eco,s:sim.s,target:g.target,positions:g.positions});escortReactionFrame(h.world);tick(h,'old_constable');
 assert.ok(h.s.people.old_constable.escortReaction.stand);assert.equal(h.lines[0].id,'old_constable');
 assert.equal(h.s.people.guard.awareness.caseOpen,true);assert.ok(h.s.people.old_constable.harmKnowledge.length);
});

test('later passers-by discover the held rope; positions alone before approaching grant no knowledge',()=>{
 const g=setup();const far=Object.fromEntries(Object.entries(g.positions).map(([id,q])=>[id,id===g.target?q:{...q,z:30}]));
 observeEscorts(g.sim,far);assert.equal(g.s.people.inspector.restraint.street,undefined);
 observeEscorts(g.sim,g.positions);
 assert.equal(g.s.people.guard.escortReaction.kind,'intervene');assert.equal(g.s.people.chi.escortReaction.kind,'mock');
 assert.equal(g.s.people.elder.escortReaction.kind,'watch');assert.equal(g.s.people.merchant.escortReaction.kind,'avoid');assert.equal(g.s.people.qing.escortReaction.kind,'intervene');
 assert.equal(g.s.people.guard.harmKnowledge[0].evidence,'seen-escort');
 assert.equal(g.s.chronicle.deeds.find(d=>d.title==='沿途目击').cause,g.s.people.inspector.restraint.cause);
 assert.ok(g.s.chronicle.deeds.some(d=>d.id===g.s.people.inspector.restraint.cause));
});
test('affiliation, personal bonds and duty determine reaction, not the captive ID alone',()=>{
 const g=setup('chi',['gang_boss','guard','qing']);
 assert.equal(escortResponse(g.s,'gang_boss','chi').kind,'intervene');assert.equal(escortResponse(g.s,'guard','chi').reason,'duty');
 assert.equal(escortResponse(g.s,'qing','chi').reason,'protect');
 g.s.people.elder.faction='赤砂帮';assert.equal(escortResponse(g.s,'elder','chi').kind,'intervene');
 g.s.socialConnections=[{a:'elder',b:'inspector',kind:'friend',source:'当面结交'}];assert.equal(escortResponse(g.s,'elder','inspector').reason,'ally');
 assert.equal(escortResponse(g.s,'old_constable','inspector').kind,'intervene');
 assert.equal(escortResponse(g.s,'traveler','inspector').kind,'intervene');
});
test('lawful custody is distinguished from a uniform, badge or a warrant obtained after kidnapping',()=>{
 const g=setup('thief',['guard','chi'],['linxi-yan-theft']);g.s.player.disguise='runner';g.eco.create('腰牌','personal','player',{badge:'court'});
 assert.equal(escortResponse(g.s,'guard','thief').kind,'intervene');g.s.law.served=[];g.s.facts.publicWarrant=true;
 assert.equal(escortResponse(g.s,'guard','thief').kind,'intervene');
 g.s.people.thief.restraint.lawful=true;g.s.people.thief.inCustody=true;
 assert.equal(escortResponse(g.s,'guard','thief').kind,'yield');assert.equal(escortResponse(g.s,'chi','thief').kind,'yield');
 observeEscorts(g.sim,g.positions);assert.equal(g.s.people.guard.harmKnowledge,undefined);
});
test('only sight of both captive and holder counts; no walls, backs, hidden models or remote seeing',()=>{
 const g=setup();assert.equal(seesEscort(g.s,'guard',g.target,g.positions),true);
 for(const alter of [p=>p.guard.facing=0,p=>p.guard.z=15,p=>p.inspector.visible=false,p=>p.guard.visible=false]){
  const p=structuredClone(g.positions);alter(p);assert.equal(seesEscort(g.s,'guard',g.target,p),false);
 }
 for(const z of [1,3])assert.equal(seesEscort(g.s,'guard',g.target,g.positions,[{x:0,z,w:20,d:.2}]),false);
 g.s.people.inspector.restraint.mode='fixed';observeEscorts(g.sim,g.positions);assert.equal(g.s.people.guard.escortReaction,undefined);
});
test('sleep, restraint, custody, serious wounds, mute, water, fire and fear suppress active reactions until recovery',()=>{
 for(const fields of [{hp:0},{hp:30},{restraint:{}},{inCustody:true},{stunnedUntil:10},{muteUntil:10},{life:{activity:'sleep'}},{life:{activity:'doze'}},{life:{activity:'escape'}},{drowning:true},{burning:true},{fear:2},{sickUntil:999}]){
  const g=setup();Object.assign(g.s.people.guard,fields);assert.equal(escortObserverReady(g.s,'guard'),false,JSON.stringify(fields));
  observeEscorts(g.sim,g.positions);assert.equal(g.s.people.guard.escortReaction,undefined);
 }
 const g=setup();g.s.people.guard.stunnedUntil=10;observeEscorts(g.sim,g.positions);g.s.npcClock=11;observeEscorts(g.sim,g.positions);assert.ok(g.s.people.guard.escortReaction);
});
test('the same continuous escort, fixing then leading and reloading never reattribute or duplicate observations',()=>{
 const g=setup();g.s.player.face={id:'gate_merchant',serial:7,until:99999};observeEscorts(g.sim,g.positions);
 const count=g.s.chronicle.deeds.length,entry=g.s.people.inspector.restraint.street.seen.guard;
 g.s.player.face=null;g.s.people.inspector.restraint.mode='fixed';observeEscorts(g.sim,g.positions);g.s.people.inspector.restraint.mode='lead';observeEscorts(g.sim,g.positions);
 const sim=new Simulation(JSON.parse(JSON.stringify(g.s)));sim.save=()=>{};new Ecosystem(sim);observeEscorts(sim,g.positions);
 assert.equal(sim.s.chronicle.deeds.length,count);assert.equal(sim.s.people.inspector.restraint.street.seen.guard.subject,'gate_merchant');
 assert.equal(entry.subject,'gate_merchant');assert.equal(sim.s.people.guard.harmKnowledge[0].subject,'gate_merchant');
});
test('close relations remember observed mistreatment as a future aid boundary without claiming the original tying',()=>{
 const g=setup('qinghe',['tea_host']);observeEscorts(g.sim,g.positions);const harm=knownPersonalHarm(g.s,'tea_host','player');
 assert.equal(harm.target,'qinghe');assert.equal(harm.kind,'restraint');assert.equal(harm.evidence,'seen-escort');
 g.s.people.tea_host.concern={kind:'bound',target:'qinghe'};assert.match(concernLine(g.s,'tea_host'),/我看见你牵着绳子/);
});
test('bystanders turn, step aside or gather without combat, rewards or repeat speech',()=>{
 const g=worldFor(setup());observeEscorts(g.sim,g.positions);const money=g.s.player.money,relation=g.s.people.chi.relation;
 const merchant=g.world.npcs.get('merchant').actor,before=merchant.position.clone();tick(g,'merchant');assert.ok(merchant.position.distanceTo(g.world.hero.position)>before.distanceTo(g.world.hero.position));
 for(let i=0;i<70;i++){escortReactionFrame(g.world);tick(g,'chi');}assert.equal(g.lines.at(-1).id,'chi');assert.match(g.lines.at(-1).text,/顾大人/);assert.equal(g.s.people.chi.awareness,null);
 for(let i=0;i<10;i++)tick(g,'chi');assert.equal(g.lines.filter(l=>l.id==='chi').length,1);
 assert.equal(g.s.player.money,money);assert.equal(g.s.people.chi.relation,relation);
});
test('interveners walk to the player, warn once, then use the existing combat path if restraint continues',()=>{
 const g=worldFor(setup('inspector',['guard']));observeEscorts(g.sim,g.positions);const actor=g.world.npcs.get('guard').actor,start=actor.position.distanceTo(g.world.hero.position),relation=g.s.people.guard.relation;
 for(let i=0;i<100&&!g.s.people.guard.awareness;i++){escortReactionFrame(g.world);tick(g,'guard');}
 assert.ok(actor.position.distanceTo(g.world.hero.position)<start);assert.equal(g.lines.length,1);assert.equal(g.s.people.guard.relation,relation-2);
 assert.equal(g.s.people.guard.awareness.state,'fight');assert.equal(g.s.people.guard.awareness.believedIdentity,'player');
 // Real shared combat dispatch, not a bespoke damage or teleport settlement.
 let hits=0;Object.assign(g.world,{alertBudget:{change:()=>false},combatReady:false,receiveHit(){hits++;return {damage:0};},burst(){}});
 actor.position.copy(g.world.hero.position).add({x:0,y:0,z:1.5});actor.rotation.y=Math.PI;
 const npc=g.world.npcs.get('guard');World.prototype.reactNpc.call(g.world,'guard',npc,.1);
 stepNpcCombat(g.world,'guard',npc,.1,id=>g.world.receiveHit(id));assert.equal(hits,0,'approach starts a swing without instant damage');
 g.world.t+=.51;stepNpcCombat(g.world,'guard',npc,.51,id=>g.world.receiveHit(id));assert.equal(hits,1);
});
test('warnings wait for available speech; dialogue and incapacitation do not move or silently escalate',()=>{
 const g=worldFor(setup('inspector',['guard']));observeEscorts(g.sim,g.positions);g.world.onActionCardSpeech=()=>false;
 for(let i=0;i<100;i++){escortReactionFrame(g.world);tick(g,'guard');}assert.equal(g.s.people.guard.awareness,null);assert.equal(g.s.people.guard.escortReaction.warnedAt,undefined);
 g.world.locked=true;const before=g.world.npcs.get('guard').actor.position.clone();tick(g,'guard');assert.deepEqual(g.world.npcs.get('guard').actor.position,before);
 g.world.locked=false;g.s.people.guard.restraint={mode:'fixed'};assert.equal(tick(g,'guard'),false);
});
test('release stops the escort and stale speech; records remain and unrelated attacks still pursue',()=>{
 const g=worldFor(setup('inspector',['guard']));observeEscorts(g.sim,g.positions);tick(g,'guard');const line=g.lines[0];assert.ok(escortSpeechCurrent(g.s,line));
 delete g.s.people.inspector.restraint;assert.equal(escortSpeechCurrent(g.s,line),false);assert.equal(tick(g,'guard'),false);assert.ok(g.s.people.guard.harmKnowledge.length);
 for(const attacked of [false,true]){
  const c=worldFor(setup('inspector',['guard']));observeEscorts(c.sim,c.positions);
  for(let i=0;i<100&&!c.s.people.guard.awareness;i++){escortReactionFrame(c.world);tick(c,'guard');}
  delete c.s.people.inspector.restraint;if(attacked)c.s.people.guard.awareness.lastIncident++;
  c.world.t++;escortReactionFrame(c.world);assert.equal(c.s.people.guard.awareness.state,attacked?'fight':'return');assert.ok(c.s.people.guard.awareness.caseOpen);
 }
});
test('obstructed pursuit only goes to last seen position and expires; it never uses the hidden player position',()=>{
 const g=worldFor(setup('inspector',['guard']));observeEscorts(g.sim,g.positions);
 g.world.obstacles=[{x:0,z:3,w:20,d:.2}];g.world.hero.position.x=7;g.s.player.x=7;const last={...g.s.people.guard.escortReaction.lastSeen};
 tick(g,'guard');assert.deepEqual(g.s.people.guard.escortReaction.lastSeen,last);assert.equal(g.lines.length,0);
 tick(g,'guard',6);assert.equal(g.s.people.guard.escortReaction,undefined);
});
test('actual routes go around furniture and never teleport or transfer the rope',()=>{
 const g=worldFor(setup('inspector',['guard']));observeEscorts(g.sim,g.positions);g.world.obstacles=[{x:-.6,z:3.6,w:1,d:.7}];const rope=g.eco.s.items.find(i=>i.id===g.s.people.inspector.restraint.ropeId);
 for(let i=0;i<40;i++)tick(g,'guard');assert.ok(g.moves.length>0);assert.ok(g.moves.every(p=>!g.world.collides(p.x,p.z)));assert.equal(rope.location,'player');
});
test('v1 and a missing rope do not acquire the new reaction',()=>{
 const g=setup();g.eco.s.items.find(i=>i.id===g.s.people.inspector.restraint.ropeId).location='ground';observeEscorts(g.sim,g.positions);assert.equal(g.s.people.guard.escortReaction,undefined);
 const sim=new Simulation(legacyArrival());sim.save=()=>{};observeEscorts(sim,g.positions);assert.equal(sim.s.people.guard.escortReaction,undefined);
});
test('fixing then resuming the same escort cannot silence an officer or charge another relationship penalty',()=>{
 const g=worldFor(setup('inspector',['guard']));observeEscorts(g.sim,g.positions);tick(g,'guard');const relation=g.s.people.guard.relation;
 const r=g.s.people.inspector.restraint;r.mode='fixed';tick(g,'guard');r.mode='lead';observeEscorts(g.sim,g.positions);
 for(let i=0;i<100&&!g.s.people.guard.awareness;i++){escortReactionFrame(g.world);tick(g,'guard');}
 assert.equal(g.s.people.guard.awareness.state,'fight');assert.equal(g.s.people.guard.relation,relation);assert.equal(g.lines.length,1);
 r.mode='fixed';g.world.t++;escortReactionFrame(g.world);assert.equal(g.s.people.guard.awareness.state,'return');
 r.mode='lead';g.world.t++;escortReactionFrame(g.world);assert.ok(g.s.people.guard.escortReaction);
});
test('a bound complainant cannot reserve the responding officers and freeze their real intervention',()=>{
 const g=worldFor(setup('inspector',['guard']));g.s.complaint={id:'inspector',phase:'approach',officers:['guard']};
 g.s.people.guard.awareness={state:'fight',caseOpen:true};
 assert.equal(World.prototype.complaintMotion.call(g.world,'guard',g.world.npcs.get('guard'),.1),false);
 assert.equal(g.s.complaint,undefined);assert.equal(g.s.people.guard.awareness.state,'fight');
});
test('reload after a warning retains the spoken flag, identity, relationship settlement and next combat step',()=>{
 const g=worldFor(setup('inspector',['guard']));observeEscorts(g.sim,g.positions);tick(g,'guard');const relation=g.s.people.guard.relation;
 const sim=new Simulation(JSON.parse(JSON.stringify(g.s)));sim.save=()=>{};const eco=new Ecosystem(sim);
 const again=worldFor({sim,eco,s:sim.s,target:g.target,positions:g.positions});observeEscorts(sim,again.positions);
 for(let i=0;i<100&&!again.s.people.guard.awareness;i++){escortReactionFrame(again.world);tick(again,'guard');}
 assert.equal(again.lines.length,0);assert.equal(again.s.people.guard.relation,relation);assert.equal(again.s.people.guard.awareness.state,'fight');
});
