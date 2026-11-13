import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {WorldAudio,worldMix,hitSound,damageSound,fluteTrack} from '../src/world-audio.js';
import {environmentStep} from '../src/world-rules.js';

function fixture(){
 const sources=[],errors=[],requests=[];
 const param=()=>({value:0,setValueAtTime(v){this.value=v;},setTargetAtTime(v){this.value=v;},linearRampToValueAtTime(v){this.value=v;},cancelScheduledValues(){}});
 const context={currentTime:0,state:'running',destination:{},resume:async()=>{},decodeAudioData:async()=>({duration:4}),
  createGain:()=>({gain:param(),connect(){},disconnect(){}}),
  createBufferSource(){const source={playbackRate:{value:1},connect(){},disconnect(){},start(t=0){this.started=t;},
   stop(t){if(t!=null){this.ends=t;return;}this.stopped=true;this.onended?.();}};sources.push(source);return source;}};
 const catalog=Object.fromEntries(['music','music-opening','city','creek','flute-poor','flute-good','swing','body','wood','metal','draw','step','coins'].map(id=>[id,{src:'/'+id+'.wav'}]));
 const fetcher=async url=>{requests.push(url);return {ok:true,json:async()=>catalog,arrayBuffer:async()=>new ArrayBuffer(4)};};
 const audio=new WorldAudio({fetcher,createContext:()=>context,random:()=>.5,onError:e=>errors.push(e)});
 return {audio,context,sources,errors,requests};
}
const state={started:true,x:0,z:0,time:0,hp:100};
async function ready(){const f=fixture();f.audio.getContext();await f.audio.init();await Promise.all(Object.keys(f.audio.catalog).map(id=>f.audio.load(id)));f.audio.update(.016,state);return f;}

test('music is audible in the initial scene; voices duck it and performance silences it',()=>{
 const base=worldMix();assert.ok(base.music>=.4);
 const spoken=worldMix({voice:true});assert.ok(spoken.music<base.music*.4);
 assert.equal(worldMix({performing:true}).music,0);
 assert.ok(worldMix({hp:0}).music<base.music);
});
test('crowd fades outside and at night; creek fades with distance',()=>{
 assert.ok(worldMix({z:0}).city>worldMix({z:40}).city);
 assert.ok(worldMix({z:0,time:170}).city<worldMix({z:0,time:20}).city);
 assert.ok(worldMix({x:-22}).creek>worldMix({x:20}).creek);
 assert.equal(hitSound('wood'),'wood');assert.equal(hitSound('metal'),'metal');assert.equal(hitSound('cloth'),'body');
});
test('no audio starts without a gesture; loop overlap has complementary fades',async()=>{
 const {audio,sources,context}=fixture();await audio.init();audio.update(.016,state);assert.equal(sources.length,0);
 audio.getContext();await audio.load('music');audio.update(.016,state);
 assert.equal(sources.length,1);assert.ok(sources[0].ends>sources[0].started);
 context.currentTime=2.7;audio.update(.016,state);assert.equal(sources.length,2);
 assert.ok(sources[1].started<sources[0].ends,'overlap avoids a hard loop seam');
 audio.update(.016,state);assert.equal(sources.length,2,'no duplicate scheduling in one frame');
});
test('mute/hidden stop all scheduled and current sources; unmute resumes only once',async()=>{
 const {audio,sources,context}=await ready();audio.play('attack');const before=[...sources];
 audio.setEnabled(false);assert.ok(before.every(s=>s.stopped));assert.equal(audio.play('attack'),null);
 audio.setEnabled(true);context.currentTime=20;audio.update(.016,state);assert.equal(audio.loops.size,3);
 const count=sources.length;audio.update(.016,state);assert.equal(sources.length,count);
 audio.setHidden(true);assert.equal(audio.loops.size,0);assert.equal(audio.shots.size,0);
 audio.update(.016,state);assert.equal(sources.length,count);
 audio.setHidden(false);audio.update(.016,state);assert.equal(audio.loops.size,3);
});
test('delayed downloads only populate the cache; cannot sound after mute',async()=>{
 const {audio,context}=fixture();audio.getContext();await audio.init();let resolve;
 context.decodeAudioData=()=>new Promise(r=>resolve=r);
 const pending=audio.load('music');await new Promise(r=>setImmediate(r));audio.setEnabled(false);
 resolve({duration:4});await pending;audio.update(.016,state);assert.equal(audio.loops.size,0);
});
test('transients are bounded, distant events silent, footsteps exclude teleports and airborne travel',async()=>{
 const {audio,context}=await ready();assert.equal(audio.play('metal',{x:100,z:100}),null);
 assert.ok(audio.play('attack'));assert.equal(audio.play('attack'),null,'same frame duplicate is suppressed');
 const count=audio.shots.size;audio.update(.016,{...state,x:100});assert.equal(audio.shots.size,count);
 for(let i=0;i<6;i++){context.currentTime+=.1;audio.update(.1,{...state,x:100+i*.4,grounded:false});}
 assert.equal(audio.shots.size,count);
 for(let i=0;i<6;i++){context.currentTime+=.1;audio.update(.1,{...state,x:102+i*.4});}
 assert.ok(audio.shots.size>count);
 audio.stop();assert.equal(audio.shots.size,0);
});
test('shipping catalog contains actual recorded files for every cue and music, no credentials',()=>{
 const root=new URL('../',import.meta.url),manifest=JSON.parse(readFileSync(new URL('assets/audio/world/manifest.json',root)));
 for(const id of ['music','city','creek','flute-poor','flute-good','swing','wood','body','metal','draw','coins','step']){
  const row=manifest[id];assert.ok(row,id);assert.ok(existsSync(new URL(row.src.slice(1),root)));
  assert.equal(row.payload.model,'seed-audio-1.0');assert.ok(row.seconds>.1);
 }
 assert.doesNotMatch(JSON.stringify(manifest),/Bearer |sk-[a-zA-Z0-9]{12}/);
});

test('continuous river damage never retriggers an impact; a real hit in water still sounds',()=>{
 const player={x:-22,z:0,hp:100};let impacts=0;
 for(let i=0;i<180;i++){
  const before=player.hp;environmentStep(player,1/60);
  if(damageSound(before,player.hp,before-player.hp))impacts++;
 }
 assert.equal(impacts,0);assert.ok(player.hp<77&&player.hp>75,'water damage remains intact');
 const before=player.hp;environmentStep(player,1/60);const waterLoss=before-player.hp;
 player.hp-=8;assert.equal(damageSound(before,player.hp,waterLoss),'hurt');
 assert.equal(damageSound(100,92),'hurt');assert.equal(damageSound(92,100),null);
});

test('flute uses music tier, never overlaps another solo, and stops on action exit',async()=>{
 const {audio,context}=await ready();assert.equal(fluteTrack(2),'flute-poor');assert.equal(fluteTrack(3),'flute-good');
 audio.update(.016,{...state,performing:true,musicTier:2});
 const poor=[...audio.loops.get('flute-poor').sources][0].source;
 context.currentTime=3.7;audio.update(.016,{...state,performing:true,musicTier:2});
 const solos=[...audio.loops.get('flute-poor').sources];
 assert.equal(solos.length,2);assert.ok(solos[1].source.started>=poor.ends,'solo phrases do not overlap');
 audio.update(.016,{...state,performing:true,musicTier:3});
 assert.ok(poor.stopped);assert.ok(audio.loops.has('flute-good'));assert.ok(!audio.loops.has('flute-poor'));
 const good=[...audio.loops.get('flute-good').sources][0].source;
 audio.update(.016,state);assert.ok(good.stopped);assert.equal(audio.mix.music,worldMix(state).music);
});

test('flute obeys mute, hidden, dialogue, death and water; late load cannot replay a finished action',async()=>{
 const {audio,context}=await ready(),perform={...state,performing:true,musicTier:3};
 for(const interrupted of [{talking:true},{hp:0},{drowning:true},{burning:true}]){
  audio.update(.016,perform);const source=[...audio.loops.get('flute-good').sources][0].source;
  audio.update(.016,{...perform,...interrupted});assert.ok(source.stopped);assert.ok(!audio.loops.has('flute-good'));
 }
 audio.update(.016,perform);audio.setEnabled(false);assert.equal(audio.loops.size,0);
 audio.setEnabled(true);audio.update(.016,perform);audio.setHidden(true);assert.equal(audio.loops.size,0);
 audio.setHidden(false);audio.update(.016,state);assert.ok(!audio.loops.has('flute-good'));
 audio.buffers.delete('flute-good');audio.loading.delete('flute-good');let finish;
 context.decodeAudioData=()=>new Promise(resolve=>finish=resolve);
 const loading=audio.load('flute-good');await new Promise(r=>setImmediate(r));
 audio.update(.016,perform);audio.update(.016,state);finish({duration:4});await loading;
 audio.update(.016,state);assert.ok(!audio.loops.has('flute-good'));
});

test('swimming does not create stone footsteps and repeated impact cues are bounded',async()=>{
 const {audio,context}=await ready();
 for(let i=1;i<60;i++){context.currentTime+=.1;audio.update(.1,{...state,x:i*.4,drowning:true});}
 assert.equal(audio.shots.size,0);
 assert.ok(audio.play('hurt'));context.currentTime+=.1;assert.equal(audio.play('hurt'),null);
 context.currentTime+=.6;assert.ok(audio.play('hurt'));
});

test('the opening piece plays once before the world runs and fades out under the town music',async()=>{
 const {audio,context,sources}=fixture();audio.getContext();await audio.init();
 const node=await audio.playOpening();assert.ok(node);assert.equal(node.source.loop,undefined);
 audio.update(.016,{...state,started:false});assert.equal(audio.opening,node,'the world being idle does not cut the opening');
 context.currentTime=20;audio.endOpening();assert.equal(audio.opening,null);
 assert.equal(node.gain.gain.value,0);assert.ok(Math.abs(node.source.ends-23.55)<1e-6,'stops after the fade, not at once');
 audio.update(.016,state);assert.ok(audio.mix.music>0);assert.equal(sources.filter(s=>s===node.source).length,1);
});

test('the opening piece is never started late, muted or after the shots are gone',async()=>{
 const muted=fixture();muted.audio.setEnabled(false);assert.equal(await muted.audio.playOpening(),null);
 const late=fixture();late.audio.getContext();const pending=late.audio.playOpening();late.audio.endOpening();
 assert.equal(await pending,null);assert.equal(late.audio.opening??null,null);
 const hidden=fixture();hidden.audio.getContext();await hidden.audio.playOpening();hidden.audio.setHidden(true);assert.equal(hidden.audio.opening,null);
});
