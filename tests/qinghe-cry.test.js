import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {Simulation,newArrival} from '../src/simulation.js';
import {Ecosystem} from '../src/ecosystem.js';
import {qingheCrying,hearsQingheCry,QingheCryAudio,QINGHE_CRY} from '../src/qinghe-cry.js';
import {QINGHE_RIVERSIDE,QINGHE_ROCK} from '../src/locations.js';
import {thoughtCandidates,showSituationalThought} from '../src/situational-thoughts.js';
import {chapterResolve,chapterOptions} from '../src/chapter.js';

function setup(){const sim=new Simulation(newArrival()),s=sim.s,eco=new Ecosystem(sim,[]);sim.save=()=>{};
 const q={...QINGHE_RIVERSIDE};eco.positions={qinghe:q};Object.assign(s.player,{x:-12,z:34.5});s.people.qinghe.life={activity:'riverside',target:q};s.people.qinghe.awareness=null;
 const world={sim,t:0,playing:true,obstacles:[QINGHE_ROCK],npcs:new Map([['qinghe',{actor:{position:q}}]])};
 const context={positions:eco.positions,obstacles:world.obstacles,qingheCryHeard:true};return {sim,s,eco,q,world,context};}
test('crying comes from the present conscious Qinghe, with rock diffraction but no transmission through walls',()=>{
 const g=setup();assert.ok(qingheCrying(g.s,g.q));assert.ok(hearsQingheCry(g.s,g.q,[QINGHE_ROCK]));
 assert.equal(hearsQingheCry(g.s,g.q,[QINGHE_ROCK,{id:'wall',x:-14,z:34.5,w:1,d:20}]),false);
 for(const change of [g=>g.q.x=0,g=>g.s.player.x=0,g=>g.s.people.qinghe.hp=0,g=>g.s.people.qinghe.hp=g.s.people.qinghe.maxHp*.3,g=>g.s.people.qinghe.muteUntil=100,g=>g.s.people.qinghe.restraint={},g=>g.s.people.qinghe.life.activity='sleep',g=>g.s.people.qinghe.awareness={state:'fight'},g=>g.s.facts.qingheConsent=true]){const h=setup();change(h);assert.equal(hearsQingheCry(h.s,h.q,[QINGHE_ROCK]),false);}
});
test('hearing guidance is silent, deduplicated and never reveals the hidden girl identity',()=>{
 const g=setup(),before=JSON.stringify({people:g.s.people,items:g.eco.s.items,facts:g.s.facts});
 let line=thoughtCandidates(g.s,g.context).find(t=>t.key==='qingheCry');assert.match(line.text,/石头后有哭声/);assert.doesNotMatch(line.text,/宋青禾/);
 const said=[];assert.ok(showSituationalThought(g.sim,g.context,30,text=>said.push(text)));assert.equal(showSituationalThought(g.sim,g.context,60,()=>true),false);
 assert.equal(JSON.stringify({people:g.s.people,items:g.eco.s.items,facts:g.s.facts}),before);
 const loaded=new Simulation(JSON.parse(JSON.stringify(g.s)));assert.equal(showSituationalThought(loaded,g.context,90,()=>true),false);
 g.s.player.x=-18;g.s.player.z=37;line=thoughtCandidates(g.s,g.context).find(t=>t.key==='qingheCry');assert.match(line.text,/那位姑娘/);assert.doesNotMatch(line.text,/石头后/);
});
test('only a finished explanation establishes hesitation; the disguise idea follows the decision to let her stay',()=>{
 const g=setup();Object.assign(g.s.player,{x:-18,z:37});const before=JSON.stringify(g.eco.s.items);
 const reply=chapterResolve(g.sim,g.eco,'qinghe','ch_qinghe_wish',{deferSpeech:true});assert.ok(reply.pendingSpeech);assert.match(reply.text,/想去京城.*我娘怎么办/);
 assert.equal(g.s.facts.qingheUnwillingKnown,undefined);assert.ok(!thoughtCandidates(g.s,g.context).some(t=>t.key==='qingheIdentity'));
 assert.ok(chapterResolve(g.sim,g.eco,'qinghe','ch_qinghe_wish',{confirmedText:reply.text}).success);
 assert.equal(qingheCrying(g.s,g.q),true);assert.ok(!thoughtCandidates(g.s,g.context).some(t=>t.key==='qingheIdentity'));assert.ok(chapterResolve(g.sim,g.eco,'qinghe','ch_qj_spare').success);assert.ok(thoughtCandidates(g.s,g.context).some(t=>t.key==='qingheIdentity'));assert.equal(g.s.facts.qingheConsent,undefined);assert.equal(g.s.player.face,undefined);assert.equal(JSON.stringify(g.eco.s.items),before);
 let count=0;assert.equal(showSituationalThought(g.sim,g.context,40,()=>++count,true),false);assert.equal(count,0);assert.ok(showSituationalThought(g.sim,g.context,40,()=>++count));assert.equal(count,1);
 for(const change of [g=>g.s.facts.qingheConsent=true,g=>g.s.convoy={phase:'travel'},g=>g.s.convoy={phase:'gate',closed:true},g=>g.s.player.x=20]){const h=setup();Object.assign(h.s.player,{x:-18,z:37});Object.assign(h.s.facts,{qingheUnwillingKnown:true,qingheRosterRouteKnown:true});change(h);assert.ok(!thoughtCandidates(h.s,h.context).some(t=>t.key==='qingheIdentity'));}
});
test('old saves may hear the newly specific departure concern once without replaying old gifts',()=>{
 const g=setup();chapterOptions(g.sim,'qinghe');g.s.chapter.done.qinghe_wish=true;g.s.facts.qingheWishKnown=true;
 assert.equal(qingheCrying(g.s,g.q),true);assert.ok(chapterOptions(g.sim,'qinghe').some(a=>a.id==='ch_qinghe_wish'));
 chapterResolve(g.sim,g.eco,'qinghe','ch_qinghe_wish');assert.ok(!chapterOptions(g.sim,'qinghe').some(a=>a.id==='ch_qinghe_wish'));
});
test('local cry playback is intermittent, follows the actual source and stops on interruption',()=>{
 const g=setup(),played=[];const audio={enabled:true,hidden:false,playReaction(id,options){if(this.reaction)return null;const node={id,...options};this.reaction=node;played.push(node);return node;},stopReaction(){this.reaction=null;}};
 const director=new QingheCryAudio(audio);director.update(g.world);g.world.t=2;director.update(g.world);assert.equal(played.length,1);assert.equal(played[0].priority,0);assert.equal(played[0].position(),g.q);
 audio.reaction=null;g.world.t=12;director.update(g.world);assert.equal(played.length,1);g.world.t=29;director.update(g.world);assert.equal(played.length,2);
 g.world.locked=true;director.update(g.world);assert.equal(audio.reaction,null);assert.equal(played[1].valid(),false);
 g.world.locked=false;g.world.t=60;audio.hidden=true;director.update(g.world);assert.equal(played.length,2);assert.equal(g.world.qingheCryHeard,false);audio.hidden=false;
 audio.enabled=false;director.update(g.world);assert.equal(played.length,2);assert.equal(g.world.qingheCryHeard,true);
 audio.enabled=true;director.update(g.world);assert.equal(played.length,3);g.s.player.x=0;director.update(g.world);assert.equal(audio.reaction,null);assert.equal(g.world.qingheCryHeard,false);
 g.s.player.x=-12;g.world.t=100;g.s.facts.qingheConsent=true;director.update(g.world);assert.equal(played.length,3);
});
test('cry is a local SeedAudio asset with a reproducible nonverbal prompt',()=>{
 const catalog=JSON.parse(readFileSync(new URL('../assets/audio/world/manifest.json',import.meta.url))),asset=catalog[QINGHE_CRY];
 assert.equal(asset.payload.model,'seed-audio-1.0');assert.match(asset.payload.text_prompt,/抽泣/);assert.match(asset.payload.text_prompt,/不包含任何可辨认的字句/);assert.ok(asset.seconds>1&&asset.seconds<9);assert.ok(existsSync(new URL('..'+asset.src,import.meta.url)));
});
