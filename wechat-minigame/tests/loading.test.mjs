import test from 'node:test';import assert from 'node:assert/strict';
import {createLoadingState} from '../runtime/loading-state.js';
import {harness,touch} from './support/mobile-harness.mjs';
const deferred=()=>{let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;});return {promise,resolve,reject};};
test('model progress counts completed jobs and does not finish the loading screen early',async()=>{
 const state=createLoadingState(),a=deferred(),b=deferred(),updates=[];state.subscribe(s=>updates.push([s.stage,s.done,s.total]));
 const ready=state.models([a,b].map((job,i)=>({label:i,promise:job.promise,ready:v=>v===true})));
 assert.equal(state.total,2);assert.equal(state.done,0);a.resolve(true);await new Promise(r=>setTimeout(r,0));assert.equal(state.done,1);assert.equal(state.active,true);
 b.resolve(true);assert.equal(await ready,true);assert.equal(state.done,2);assert.equal(state.active,true);
 state.set('绘制场景');assert.equal(state.total,0);state.finish();assert.equal(state.active,false);assert.ok(updates.some(x=>x[1]===1&&x[2]===2));
});
test('failed and stalled models keep an explicit retry screen and never report ready',async()=>{
 const state=createLoadingState({timeout:10}),hang=deferred();assert.equal(await state.models([{label:'missing',promise:hang.promise,ready:()=>true}]),false);
 assert.match(state.error,/超时/);assert.equal(state.finish(),false);assert.equal(state.active,true);
 hang.resolve(true);await new Promise(r=>setTimeout(r,0));assert.match(state.error,/超时/);
 state.reset();const old=console.error;console.error=()=>{};try{assert.equal(await state.models([{label:'broken',promise:Promise.resolve(false),ready:v=>v}]),false);}finally{console.error=old;}assert.match(state.error,/未能/);
});
test('preparation jobs each yield a frame and preserve their queue order',async()=>{
 const order=[],state=createLoadingState({yieldFrame:async()=>{order.push('paint');}});
 await Promise.all([1,2,3].map(async n=>{await state.turn();order.push(n);}));
 assert.deepEqual(order,['paint',1,'paint',2,'paint',3]);
});
test('loading covers welcome and exploration; retry remains tappable across repaints',()=>{
 const t=harness(),state=createLoadingState();t.p.env.__jianghuLoading=state;t.document.getElementById('welcome').hidden=false;
 state.set('人物入画',3,10);t.render();assert.ok(t.ui.layout.loading);assert.equal(t.ui.zones.length,0);assert.equal(t.ui.layout.interaction,undefined);
 let retries=0;state.fail('人物资源未能载入，请重试');state.retry=()=>retries++;t.render();const b=t.ui.zones[0];assert.equal(b.label,'重新载入');
 t.events.start({changedTouches:[touch(1,b.x+20,b.y+20)]});t.tick(150);t.events.end({changedTouches:[touch(1,b.x+20,b.y+20)]});assert.equal(retries,1);
 state.reset();state.finish();t.render();assert.equal(t.ui.layout.loading,undefined);assert.ok(t.ui.zones.some(z=>z.label==='声音'));
});
test('loading layout fits desktop and mobile validation sizes',()=>{
 for(const [w,h]of [[1280,850],[1024,768],[800,600],[844,390],[667,375]]){
  const t=harness(w,h),state=createLoadingState();t.p.env.__jianghuLoading=state;state.fail('资源读取失败，请重试');t.render();const {bar,retry}=t.ui.layout.loading;
  for(const b of [bar,retry]){assert.ok(b.x>=0&&b.y>=0);assert.ok(b.x+b.w<=w&&b.y+b.h<=h);}assert.ok(retry.h>=44);
 }
});
