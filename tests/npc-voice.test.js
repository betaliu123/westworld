import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {NpcVoice,spokenActor,voiceRequest} from '../src/npc-voice.js';
import {dialogueLines} from '../src/dialogue.js';
import {PEOPLE} from '../src/data.js';
import {VOICE_TRIAL} from '../src/voice-lines.js';

const config=JSON.parse(readFileSync(new URL('../assets/audio/voice-cast.json',import.meta.url)));
const entries=JSON.parse(readFileSync(new URL('../assets/audio/npc/manifest.json',import.meta.url))).entries;
const line={id:'traveler',text:VOICE_TRIAL[0].text};
function fixture(fetchOverride){
 const starts=[],sources=[];
 const context={state:'running',destination:{},resume:async()=>{},decodeAudioData:async()=>({duration:4}),
  createGain:()=>({gain:{value:0},connect(){},disconnect(){}}),
  createBufferSource(){const source={connect(){},disconnect(){},start(){starts.push(this);},stop(){this.stopped=true;this.onended?.();}};sources.push(source);return source;}};
 const fetcher=async(url,options)=>{
  if(url.endsWith('voice-cast.json'))return {ok:true,json:async()=>config};
  if(url.endsWith('manifest.json'))return {ok:true,json:async()=>({entries})};
  if(url==='/api/voice')return fetchOverride(url,options);
  return {ok:true,arrayBuffer:async()=>new ArrayBuffer(8)};
 };
 const voice=new NpcVoice({fetcher,createContext:()=>context});voice.setEnabled(true);voice.unlock();
 return {voice,starts,sources};
}
function generated(text,actor='traveler'){
 const req=voiceRequest(config,actor,text);
 return {signature:req.signature,actor,text,url:'/fake/'+encodeURIComponent(text)+'.mp3',duration:4};
}

test('all NPCs have an explicit casting; generated Python hashes match browser requests',()=>{
 for(const p of PEOPLE)assert.ok(config.cast[p.id],p.id);
 for(const entry of entries){
  const request=voiceRequest(config,entry.actor,entry.text);
  assert.equal(request.signature,entry.signature,entry.actor+': '+entry.text);
  assert.equal(createHash('sha256').update(request.signature).digest('hex'),entry.hash);
 }
 for(const cue of VOICE_TRIAL)assert.ok(entries.some(e=>e.signature===voiceRequest(config,cue.actor,cue.text).signature));
});
test('text, voice, emotion, model and pace edits invalidate the old recording',()=>{
 const original=voiceRequest(config,line.id,line.text).signature;
 assert.notEqual(voiceRequest(config,line.id,line.text+'请说。').signature,original);
 assert.notEqual(voiceRequest(config,line.id,line.text,'angry').signature,original);
 for(const edit of [c=>c.model='changed-model',c=>c.cast.traveler.speed=.95,c=>c.cast.traveler.voice_id='another']){
  const copy=structuredClone(config);edit(copy);assert.notEqual(voiceRequest(copy,line.id,line.text).signature,original);
 }
});
test('thoughts, narration, muted/down NPCs and unknown player gender stay silent',()=>{
 const state={npcClock:1,player:{},people:{traveler:{hp:100,muteUntil:0}}};
 assert.equal(spokenActor(line,state),'traveler');
 for(const silent of [{...line,thought:true},{...line,narration:true},{...line,text:'（我明白了。）'},{id:'player',text:'好。'}])assert.equal(spokenActor(silent,state),null);
 state.people.traveler.muteUntil=2;assert.equal(spokenActor(line,state),null);
 state.people.traveler.muteUntil=0;state.people.traveler.hp=0;assert.equal(spokenActor(line,state),null);
 for(const gender of ['male','female']){state.player.gender=gender;assert.equal(spokenActor({id:'player',text:'好。'},state),'player_'+gender);}
 assert.equal(dialogueLines([line],()=>true)[0].text,line.text);
 assert.equal(dialogueLines([line],()=>true).length,1);
});
test('first playback waits for its catalog; cached bubbles never call generation',async()=>{
 let calls=0;const {voice,starts}=fixture(()=>{calls++;throw Error('not expected');});
 assert.equal(await voice.play(line,{channel:'bubble'}),true);
 assert.equal(starts.length,1);
 assert.equal(await voice.play({id:'traveler',text:'未配音的新句。'},{channel:'bubble'}),false);
 assert.equal(calls,0);
});
test('concurrent requests for a new sentence generate once',async()=>{
 let calls=0;const text='一条新的对白。';const {voice}=fixture(async()=>{calls++;return {ok:true,json:async()=>generated(text)};});
 await Promise.all([voice.prepare({id:'traveler',text},{generate:true}),voice.prepare({id:'traveler',text},{generate:true})]);
 assert.equal(calls,1);
 await voice.prepare({id:'traveler',text},{generate:true});assert.equal(calls,1);
});
test('skipped pending speech is cached without interrupting the next speaker',async()=>{
 let resolve;const text='迟到的录音。';const {voice,starts}=fixture(()=>new Promise(r=>resolve=r));
 await voice.init();const pending=voice.play({id:'traveler',text});await new Promise(r=>setImmediate(r));
 await voice.play({id:'tea_host',text:VOICE_TRIAL.find(c=>c.actor==='tea_host').text});
 const current=voice.source;resolve({ok:true,json:async()=>generated(text)});
 assert.equal(await pending,false);assert.equal(starts.length,1);assert.equal(voice.source,current);
 assert.ok(voice.entries.has(generated(text).signature));
});
test('mute, dialogue close, loss of validity and NPC silence stop playback',async()=>{
 const {voice}=fixture();await voice.init();
 await voice.play(line);let source=voice.source;voice.setEnabled(false);assert.equal(source.stopped,true);
 voice.setEnabled(true);await voice.play(line);source=voice.source;voice.stop();assert.equal(source.stopped,true);
 let valid=true;await voice.play(line,{valid:()=>valid});source=voice.source;valid=false;voice.update();assert.equal(source.stopped,true);
 await voice.play(line);source=voice.source;voice.canSpeak=()=>false;voice.update();assert.equal(source.stopped,true);
});
test('generation errors or stale responses never fall back to an unrelated cached voice',async()=>{
 let calls=0;const {voice,starts}=fixture(async()=>{calls++;return {ok:true,json:async()=>entries[0]};});
 const fresh={id:'traveler',text:'这是改过的台词。'};
 assert.equal(await voice.play(fresh),false);assert.equal(await voice.play(fresh),false);
 assert.equal(calls,1);assert.equal(starts.length,0);
});
