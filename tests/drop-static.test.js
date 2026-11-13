import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

function host(relay){
 const calls=[],base='https://drop.example/b/game/';
 const window={fetch:async(input,init)=>{calls.push({input,init});return new Response('asset');}};
 vm.runInNewContext(readFileSync(new URL('../tools/drop-static.js',import.meta.url),'utf8'),{
  window,document:{currentScript:{src:base+'drop-static.js',dataset:{aiRelay:relay}}},
  location:{href:base+'index.html',origin:'https://drop.example'},URL,Request,Response,Set,Promise
 });
 return {window,calls,base};
}
test('static publishing keeps recorded audio under the board path and preserves request options',async()=>{
 const {window,calls,base}=host();
 await window.fetch('/assets/audio/world/manifest.json',{cache:'no-store'});
 assert.equal(calls[0].input.href,base+'assets/audio/world/manifest.json');assert.equal(calls[0].init.cache,'no-store');
 await window.fetch(new Request('https://drop.example/assets/audio/npc/a.mp3',{headers:{Range:'bytes=0-100'}}));
 assert.equal(calls[1].input.url,base+'assets/audio/npc/a.mp3');assert.equal(calls[1].input.headers.get('Range'),'bytes=0-100');
 await window.fetch(new URL('https://cdn.example/assets/audio/a.mp3'));
 assert.equal(calls[2].input.href,'https://cdn.example/assets/audio/a.mp3');
});

test('configured Drop relay forwards only the three AI APIs and omits cookies',async()=>{
 const {window,calls}=host('https://relay.example/session');
 const signal=new AbortController().signal;
 await window.fetch('/api/status');
 await window.fetch('/api/director',{method:'POST',headers:{'Content-Type':'application/json'},body:'{"mode":"companion"}',signal});
 assert.equal(calls[0].input.href,'https://relay.example/session/api/status');
 assert.equal(calls[1].input.href,'https://relay.example/session/api/director');
 assert.equal(calls[1].init.body,'{"mode":"companion"}');
 assert.equal(calls[1].init.signal,signal);
 assert.equal(calls[1].init.credentials,'omit');assert.equal(calls[1].init.mode,'cors');
 assert.equal((await window.fetch('/api/voice',{method:'POST'})).status,503);
 assert.equal(calls.length,2);
 await window.fetch('https://other.example/api/director');
 assert.equal(calls[2].input,'https://other.example/api/director');
});

test('relay preserves Request payloads and abort signals',async()=>{
 const {window,calls}=host('https://relay.example/session/');
 const controller=new AbortController();
 const request=new Request('https://drop.example/api/reply-intent',{method:'POST',headers:{'Content-Type':'application/json'},body:'{"text":"test"}',signal:controller.signal});
 await window.fetch(request);
 assert.equal(calls[0].input.url,'https://relay.example/session/api/reply-intent');
 assert.equal(calls[0].input.method,'POST');
 assert.equal(await calls[0].input.text(),'{"text":"test"}');
 controller.abort();assert.equal(calls[0].input.signal.aborted,true);
});

test('invalid relay configuration remains offline',async()=>{
 for(const relay of ['http://relay.example','https://key@relay.example','https://relay.example/?key=secret','bad url']){
  const {window,calls}=host(relay);
  assert.equal((await (await window.fetch('/api/status')).json()).configured,false);
  assert.equal(calls.length,0);
 }
});
test('static publishing uses local API fallbacks and loads the real hero animation pack',async()=>{
 const {window,calls,base}=host();
 assert.equal((await (await window.fetch('/api/status')).json()).configured,false);
 for(const path of ['director','reply-intent','voice']){
  const response=await window.fetch('/api/'+path,{method:'POST',body:'game state'});assert.equal(response.status,503);
 }
 assert.equal(calls.length,0);
 const motionUrl=new URL(base+'src/models/sumiro-motion.local.json');
 assert.equal(await (await window.fetch(motionUrl)).text(),'asset');
 assert.equal(calls[0].input.href,motionUrl.href);
 await window.fetch('./src/models/npc-woman.glb');assert.equal(calls.length,2);
});
