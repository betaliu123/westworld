import test from 'node:test';import assert from 'node:assert/strict';
import {createFrameClock} from '../runtime/frame-clock.js';
import {LoaderUtils} from '../engine/vendor/three.module.js';
test('device microsecond clock is normalised to ms and rAF ignores unrelated native timestamps',()=>{
 let micros=9_000_000,callback,cancelled;const clock=createFrameClock({wxPerformance:{now:()=>micros},request:cb=>{callback=cb;return 23;},cancel:id=>cancelled=id});
 assert.equal(clock.performance.now(),0);let frame;const id=clock.requestAnimationFrame(t=>frame=t);micros+=16_000;callback(5_000_000_000);assert.equal(frame,16);assert.equal(clock.performance.now(),16);clock.cancelAnimationFrame(id);assert.equal(cancelled,23);
});
test('Date fallback never moves backwards and browser performance remains in milliseconds',()=>{
 let time=1000;const fallback=createFrameClock({now:()=>time});time=1017;assert.equal(fallback.performance.now(),17);time=900;assert.equal(fallback.performance.now(),17);
 let ms=22;const browser=createFrameClock({nativePerformance:{now:()=>ms},wxPerformance:{now:()=>9e9}});ms=38;assert.equal(browser.performance.now(),16);
});
test('GLTF embedded texture wxfile URLs remain absolute rather than gaining the model URL prefix',()=>{
 const file='wxfile://usr/jianghu-texture-1.jpg';assert.equal(LoaderUtils.resolveURL(file,'https://game.local/src/models/'),file);
 assert.equal(LoaderUtils.resolveURL('color.jpg','https://game.local/src/models/'),'https://game.local/src/models/color.jpg');
 assert.equal(LoaderUtils.resolveURL('https://tmp.local/image.jpg','https://game.local/src/models/'),'https://tmp.local/image.jpg');
});
