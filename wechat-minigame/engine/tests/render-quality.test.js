import test from 'node:test';import assert from 'node:assert/strict';
import {renderQuality,qualityMode} from '../src/render-quality.js';

// Plays `seconds` of frames whose cost is given by the machine model, and records every quality change.
function play(quality,cost,seconds,log=[]){
 for(let t=0;t<seconds*1000;){const ms=cost(quality,t);t+=ms;if(quality.frame(ms))log.push({at:Math.round(t),step:quality.step,scale:quality.scale});}
 return log;
}
// Frame time split into a fixed processor part and a graphics part that grows with the pixels drawn.
const machine=(cpu,gpu)=>q=>Math.max(cpu*(q.lightShadows?.93:1),gpu*q.scale*q.scale*(q.lightShadows?.9:1));

test('a machine that holds its frame rate keeps full quality for the whole session',()=>{
 const q=renderQuality();assert.deepEqual(play(q,machine(12,10),300),[]);
 assert.equal(q.step,0);assert.equal(q.scale,1);assert.equal(q.lightShadows,false);
});

test('a graphics-limited machine steps down until play is smooth, then stays put',()=>{
 const q=renderQuality(),log=play(q,machine(11,48),120);
 assert.deepEqual(log.map(c=>c.step),[1,2,3],'shadows first, then resolution one step at a time');
 assert.ok(machine(11,48)(q)<=24,'it stops as soon as the frame rate is playable');
 assert.ok(log.at(-1).at<20000,'the lowest needed step is reached within twenty seconds of play');
 assert.deepEqual(play(q,machine(11,10),120),[],'quality is not raised again mid-session');
});

test('a processor-limited machine gets its resolution back, because fewer pixels did not help',()=>{
 const q=renderQuality(),log=play(q,machine(34,8),120);
 assert.equal(q.step,1);assert.equal(q.scale,1);assert.ok(q.lightShadows);
 assert.equal(log.filter(c=>c.step===2).length,2,'resolution is tried twice at most');
 assert.deepEqual(play(q,machine(34,8),300),[],'and then left alone');
});

test('a browser frame cap is not mistaken for a slow graphics card',()=>{
 const q=renderQuality();play(q,()=>33.4,120);assert.equal(q.scale,1);
});

test('stalls and short slow spells do not cost quality',()=>{
 const q=renderQuality();
 // A half-second freeze every two seconds, and one slow second in every ten.
 assert.deepEqual(play(q,(_,t)=>t%2000<16?500:t%10000<1000?40:16,300),[]);
 // Loading in the first seconds of play is ignored as well.
 const fresh=renderQuality();assert.deepEqual(play(fresh,(_,t)=>t<4500?60:16,60),[]);
});

test('a machine crawling at a few frames a second is helped too',()=>{
 const q=renderQuality(),crawl=machine(11,1400);play(q,crawl,60);
 assert.equal(q.scale,.5);assert.ok(q.lightShadows);assert.ok(crawl(q)<400);
 // A choked graphics card often delivers frames in uneven pairs: one quick, one very late.
 const uneven=renderQuality();let turn=0;play(uneven,u=>(turn^=1)?10:700*u.scale*u.scale,60);
 assert.ok(uneven.scale<1,'the late frames count as the frame rate, not as isolated stalls');
});

test('the address bar can pin the level',()=>{
 assert.equal(qualityMode('?playtest=a&quality=low'),'low');assert.equal(qualityMode('?quality=full'),'full');assert.equal(qualityMode('?quality=lowest'),'auto');assert.equal(qualityMode(''),'auto');
 const full=renderQuality('full');play(full,machine(11,60),60);assert.equal(full.step,0);
 const low=renderQuality('low');assert.equal(low.scale,.5);assert.ok(low.lightShadows);play(low,machine(11,10),60);assert.equal(low.scale,.5);
});
