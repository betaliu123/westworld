import test from 'node:test';
import assert from 'node:assert/strict';
import {NpcReactionAudio,canReactVocally} from '../src/npc-reaction-audio.js';

function fixture(){
 const audio={enabled:true,hidden:false,reaction:null,calls:[],stopReaction(){this.reaction=null;},playReaction(id,options){const n={id,...options};this.calls.push(n);return this.reaction=n;}};
 const s={npcClock:10,player:{x:0,z:3,hp:100},people:{},ecosystem:{objects:{},time:0}};
 const world={t:10,sim:{s},playing:true,combatReady:true,locked:false,obstacles:[],hero:{position:s.player},npcs:new Map()};
 const add=(id,x,z,extra={})=>{s.people[id]={hp:100,maxHp:100,life:{activity:'idle'},...extra};world.npcs.set(id,{actor:{position:{x,z},rotation:{y:0},visible:true,userData:{}}});};
 add('gao',0,1);add('tea_host',1,0);add('elder',-1,0);
 const reactions=new NpcReactionAudio(audio);reactions.update(world);
 const tick=(dt=.3,options)=>{world.t+=dt;s.npcClock+=dt;reactions.update(world,options);};
 return {audio,s,world,add,reactions,tick};
}
test('draw uses the actual startled NPC and its own gender, with a shared cooldown',()=>{
 const {audio,world,reactions,tick}=fixture();world.npcs.get('tea_host').actor.userData.startledAt=world.t;
 reactions.draw(world);tick();assert.equal(audio.calls[0].id,'npc-gasp-female');
 audio.stopReaction();world.npcs.get('tea_host').actor.userData.startledAt=world.t;reactions.draw(world);tick();assert.equal(audio.calls.length,1);
});
test('a declared attack without actual health loss cannot make a pain or alarm sound',()=>{
 const {audio,world,reactions,tick}=fixture();reactions.incident(world,{type:'assault',target:'gao',witnesses:['tea_host']});tick();assert.equal(audio.calls.length,0);
});
test('real hits cry first, then one actual witness; turning to flee does not erase witnessing',()=>{
 const {audio,s,world,reactions,tick}=fixture();reactions.incident(world,{type:'assault',target:'gao',witnesses:['gao','tea_host']});
 s.people.gao.hp=85;s.people.tea_host.awareness={state:'flee'};world.npcs.get('tea_host').actor.rotation.y=Math.PI;
 tick();assert.equal(audio.calls[0].id,'npc-pain-male');assert.equal(audio.calls.length,1);
 audio.stopReaction();tick(1.3);assert.equal(audio.calls[1].id,'npc-alarm-female');
});
test('unseen bystanders and lasso attempts do not become assault screams',()=>{
 const {audio,s,world,reactions,tick}=fixture();reactions.incident(world,{type:'assault',target:'gao',witnesses:[]});s.people.gao.hp=90;
 tick();audio.stopReaction();tick();assert.equal(audio.calls.length,1);
 reactions.incident(world,{type:'assault',method:'lasso',target:'gao',witnesses:['tea_host']});tick();assert.equal(audio.calls.length,1);
});
test('dead, sleeping, silenced and stunned characters cannot vocalize',()=>{
 const {s}=fixture();for(const patch of [{hp:0},{life:{activity:'sleep'}},{life:{activity:'doze'}},{muteUntil:11},{stunnedUntil:11},{drowning:true}]){
  const original=s.people.gao;s.people.gao={...original,...patch};assert.equal(canReactVocally(s,'gao'),false);s.people.gao=original;
 }assert.equal(canReactVocally(s,'gao'),true);
});
test('walls, distance and disappearance suppress reaction voices',()=>{
 const {audio,world,reactions,tick}=fixture();const actor=world.npcs.get('gao').actor;
 for(const change of [()=>world.obstacles.push({id:'wall',x:0,z:2,w:8,d:.5}),()=>{world.obstacles=[];actor.position.x=30;},()=>{actor.position.x=0;actor.visible=false;}]){
  change();actor.userData.startledAt=world.t;reactions.draw(world);tick(9);
 }assert.equal(audio.calls.length,0);
});
test('new severe injuries cause one visible observer gasp, not a repeated loop',()=>{
 const {audio,s,tick}=fixture();s.people.gao.hp=20;tick();assert.equal(audio.calls.length,1);assert.match(audio.calls[0].id,/gasp/);
 audio.stopReaction();tick(15);assert.equal(audio.calls.length,1);
});
test('loaded severe injuries do not replay a surprise for observers already present',()=>{
 const {audio,s,world}=fixture();s.people.gao.hp=20;const fresh=new NpcReactionAudio(audio);fresh.update(world);world.t+=20;fresh.update(world);assert.equal(audio.calls.length,0);
});
test('bystanders can also notice a severely injured player',()=>{
 const {audio,s,tick}=fixture();s.player.hp=20;tick();assert.equal(audio.calls[0].id,'npc-gasp-male');
});
function escort(f,seen){f.s.people.gao.restraint={mode:'lead',street:{key:'escort:gao:1',seen}};}
test('crowd murmurs require two real noncombat observers and match their genders',()=>{
 const f=fixture();escort(f,{tea_host:{kind:'watch'}});f.tick();assert.equal(f.audio.calls.length,0);
 f.s.people.gao.restraint.street.seen.elder={kind:'watch'};f.tick();assert.equal(f.audio.calls[0].id,'npc-murmur-mixed');
 f.audio.stopReaction();f.tick(20);assert.equal(f.audio.calls.length,1,'same escort is heard only once');
});
test('crowd validity ends when rope is released, a witness leaves or danger interrupts',()=>{
 for(const invalidate of [f=>f.s.people.gao.restraint.mode='anchor',f=>f.world.npcs.get('elder').actor.position.x=30,f=>f.s.people.elder.awareness={state:'fight'}]){
  const f=fixture();escort(f,{tea_host:{kind:'watch'},elder:{kind:'watch'}});f.tick();const cue=f.audio.calls[0];assert.ok(cue);invalidate(f);assert.equal(cue.valid(),false);
 }
});
test('silence, dialogue and hidden pages discard events, without late replay',()=>{
 for(const change of [f=>f.audio.enabled=false,f=>f.audio.hidden=true,f=>f.world.locked=true]){
  const f=fixture();f.world.npcs.get('gao').actor.userData.startledAt=f.world.t;f.reactions.draw(f.world);change(f);f.tick();assert.equal(f.audio.calls.length,0);
  f.audio.enabled=true;f.audio.hidden=false;f.world.locked=false;f.tick();assert.equal(f.audio.calls.length,0);
 }
 const f=fixture();f.world.npcs.get('gao').actor.userData.startledAt=f.world.t;f.reactions.draw(f.world);f.tick(.1,{voice:true});f.tick();assert.equal(f.audio.calls.length,0);
});
test('a real hit can interrupt a gasp, and repeated strikes are throttled',()=>{
 const f=fixture();f.world.npcs.get('tea_host').actor.userData.startledAt=f.world.t;f.reactions.draw(f.world);f.tick();
 f.reactions.incident(f.world,{type:'assault',target:'gao',witnesses:[]});f.s.people.gao.hp=90;f.tick();assert.equal(f.audio.calls[1].id,'npc-pain-male');
 f.audio.stopReaction();for(let i=0;i<4;i++){f.reactions.incident(f.world,{type:'assault',target:'gao',witnesses:[]});f.s.people.gao.hp--;f.tick(.1);}assert.equal(f.audio.calls.length,2);
});
test('missing buffers and restored saves cannot replay expired events',()=>{
 const f=fixture();f.audio.playReaction=()=>null;f.world.npcs.get('gao').actor.userData.startledAt=f.world.t;f.reactions.draw(f.world);f.tick();assert.equal(f.reactions.queue.length,0);
 f.world.sim.s={...f.s};f.tick();assert.equal(f.reactions.events.length,0);assert.equal(f.reactions.queue.length,0);
});
test('a hidden tab with frozen game time cannot replay pending reactions on return',()=>{
 const f=fixture();f.world.npcs.get('gao').actor.userData.startledAt=f.world.t;f.reactions.draw(f.world);assert.equal(f.reactions.queue.length,1);
 f.audio.generation=1; // WorldAudio.stop() on pagehide, without an intervening frame.
 f.reactions.update(f.world);assert.equal(f.audio.calls.length,0);assert.equal(f.reactions.queue.length,0);
});
