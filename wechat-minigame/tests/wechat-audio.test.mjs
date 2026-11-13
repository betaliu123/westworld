import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {createAudioContextClass} from '../runtime/wechat-audio.js';import {WorldAudio} from '../engine/src/world-audio.js';
function fixture(automation=true){
 const sources=[],requests=[];let decoded=0;
 const param=()=>automation?({value:0,setValueAtTime(v){this.value=v;},setTargetAtTime(v){this.value=v;},linearRampToValueAtTime(v){this.value=v;}}):({value:0});
 const native={state:'suspended',currentTime:0,destination:{},resume(){this.state='running';},suspend(){this.state='suspended';},
 createGain:()=>({gain:param(),connect(){},disconnect(){}}),createBufferSource(){const s={playbackRate:{value:1},connect(){},disconnect(){},start(){this.started=true;},stop(t){if(t==null){this.stopped=true;this.onended?.();}}};sources.push(s);return s;},
 decodeAudioData(data,success,failure){assert.ok(data.byteLength>0);assert.equal(typeof success,'function');assert.equal(typeof failure,'function');decoded++;queueMicrotask(()=>success({duration:4}));}};
 const Context=createAudioContextClass({createWebAudioContext:()=>native});
 const catalog=JSON.parse(fs.readFileSync('resources/audio/world/manifest.json'));
 const fetcher=async url=>{requests.push(url);if(url.endsWith('manifest.json'))return {ok:true,json:async()=>catalog};const data=fs.readFileSync('resources/'+url.replace(/^\/assets\//,''));return {ok:true,arrayBuffer:async()=>data.buffer.slice(data.byteOffset,data.byteOffset+data.byteLength)};};
 const errors=[];const audio=new WorldAudio({fetcher,createContext:()=>new Context(),onError:e=>errors.push(e)});
 return {audio,native,Context,catalog,sources,requests,errors,get decoded(){return decoded;}};
}
test('callback-only WeChat decoder and void resume load actual packaged MP3 bytes and schedule music plus effects',async()=>{
 const f=fixture();f.audio.unlock();await f.audio.init();await Promise.all(Object.keys(f.catalog).map(id=>f.audio.load(id)));
 assert.equal(f.errors.length,0);assert.equal(f.decoded,Object.keys(f.catalog).length);assert.ok(f.audio.buffers.get('music'));
 f.audio.update(.016,{started:true,x:0,z:27,time:0,hp:100,grounded:true});assert.ok(f.audio.status().loops.includes('music'));assert.ok(f.sources.some(s=>s.started));
 assert.ok(f.audio.play('attack'));f.audio.setEnabled(false);assert.equal(f.audio.status().loops.length,0);assert.equal(f.audio.status().effects,0);
 f.audio.setEnabled(true);f.audio.update(.016,{started:true,hp:100});assert.ok(f.audio.status().loops.includes('music'));
});
test('audio interruption suspends native playback and resume restores it; decoder errors reject rather than cache undefined',async()=>{
 const f=fixture();const ctx=new f.Context();await f.Context.resumeAll();assert.equal(ctx.state,'running');await f.Context.suspendAll();assert.equal(ctx.state,'suspended');await f.Context.resumeAll();assert.equal(ctx.state,'running');
 f.native.decodeAudioData=(_data,_ok,fail)=>queueMicrotask(()=>fail(Error('decode failed')));await assert.rejects(ctx.decodeAudioData(new ArrayBuffer(1)),/decode failed/);
});
test('Promise-returning decoders also work and a resumed facade always returns a Promise',async()=>{
 const native={state:'running',resume(){},decodeAudioData(){return Promise.resolve({duration:2});}};const Context=createAudioContextClass({createWebAudioContext:()=>native});const ctx=new Context();assert.equal(typeof ctx.resume().then,'function');assert.equal((await ctx.decodeAudioData(new ArrayBuffer(4))).duration,2);
});
test('voice catalog points only to packaged recordings and keeps distinct character voice profiles',()=>{
 const catalog=JSON.parse(fs.readFileSync('resources/audio/npc/manifest.json'));const cast=JSON.parse(fs.readFileSync('resources/audio/voice-cast.json'));assert.equal(catalog.entries.length,35);for(const e of catalog.entries){assert.ok(fs.existsSync('resources/'+e.url.replace(/^\/assets\//,'')),e.url);assert.ok(e.signature);assert.ok(cast.cast[e.actor]);}assert.ok(new Set(Object.values(cast.cast).map(c=>c.voice_id)).size>3);
});

test('value-only WeChat AudioParams play, fade and mute BGM without blocking the game frame',async()=>{
 const f=fixture(false);f.audio.unlock();await f.audio.init();await Promise.all(Object.keys(f.catalog).map(id=>f.audio.load(id)));
 const frame=(time,extra={})=>{f.native.currentTime=time;f.audio.update(.1,{started:true,hp:100,x:0,z:27,time:0,...extra});};
 frame(0);frame(.8);frame(1.5);const music=f.audio.loops.get('music'),node=[...music.sources][0];
 assert.equal(node.source.started,true);assert.equal(node.source.stopped,undefined);assert.ok(node.gain.gain.value>.9);assert.ok(f.audio.buses.music.gain.value>0);assert.ok(f.audio.play('attack'));
 const normal=f.audio.buses.music.gain.value;for(let i=0;i<10;i++)frame(1.6+i*.1,{voice:true});assert.ok(f.audio.buses.music.gain.value<normal);
 const first=node.source;frame(3);assert.ok(music.sources.size>=2,'next buffer overlaps the fading tail');frame(4.2);assert.equal(first.stopped,true);assert.ok(music.sources.size>=1);
 frame(4.3,{performing:true});assert.equal(f.audio.loops.has('music'),false);assert.ok(f.audio.loops.has('flute-poor'));
 frame(4.4,{time:140});assert.ok(f.audio.loops.has('music-night'));assert.equal(f.audio.loops.has('flute-poor'),false);
 f.audio.setHidden(true);assert.equal(f.audio.master.gain.value,0);assert.equal(f.audio.loops.size,0);f.audio.setHidden(false);frame(5);assert.equal(f.audio.master.gain.value,1);assert.ok(f.audio.loops.has('music'));
 f.audio.setEnabled(false);frame(6);assert.equal(f.audio.loops.size,0);assert.equal(f.audio.shots.size,0);assert.equal(f.errors.length,0);
});
