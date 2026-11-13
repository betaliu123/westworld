import test from 'node:test';import assert from 'node:assert/strict';import vm from 'node:vm';import fs from 'node:fs';
import {parse} from 'acorn';
const source=fs.readFileSync('dist/boot.js','utf8');
function boot(realTimers=false){
 const frames=[],context=new Proxy({measureText:s=>({width:String(s).length*16})},{get:(o,k)=>o[k]||(()=>{})});
 const calls=[],gl=new Proxy({getShaderParameter:()=>true,getProgramParameter:()=>true,getAttribLocation:()=>0,createBuffer:()=>({}),createTexture:()=>({}),createShader:()=>({}),createProgram:()=>({})},{get:(o,k)=>o[k]||((...v)=>calls.push([k,...v]))});
 let downloads,progress,contexts=[],canvasCount=0,required=[];
 const wx={getWindowInfo:()=>({windowWidth:844,windowHeight:390,pixelRatio:3}),createCanvas:()=>{const first=canvasCount++===0;return {getContext:k=>{contexts.push([first,k]);return k==='2d'?context:gl;}};},onTouchEnd(){},offTouchEnd(){},hideLoading(){},loadSubpackage:o=>{assert.ok(calls.some(c=>c[0]==='drawArrays'),'draw before starting the resource download');downloads=o;return {onProgressUpdate:f=>progress=f};},restartMiniProgram(){},showModal(){}};
 const GameGlobal={},contextGlobal=vm.createContext({wx,GameGlobal,requestAnimationFrame:f=>frames.push(f),setTimeout:realTimers?setTimeout:f=>f(),clearTimeout,console,require:p=>{if(p==='./dist/boot.js')vm.runInContext(source,contextGlobal);else required.push(p);}});
 vm.runInContext(fs.readFileSync('game.js','utf8'),contextGlobal);
 return {GameGlobal,calls,contexts,required,get downloads(){return downloads;},get progress(){return progress;},async frame(){frames.shift()?.();await new Promise(r=>setTimeout(r,0));}};
}
test('bootstrap draws before resource loading, keeps the screen WebGL-only and reports byte progress',async()=>{
 assert.doesNotThrow(()=>parse(source,{ecmaVersion:2017}));const t=boot(),state=t.GameGlobal.__jianghuLoading;
 assert.ok(t.calls.some(c=>c[0]==='drawArrays'));assert.ok(!t.contexts.some(([screen,type])=>screen&&type==='2d'));
 t.progress({totalBytesWritten:300,totalBytesExpectedToWrite:1000});assert.equal(state.done,300);assert.equal(state.total,1000);assert.equal(t.required.length,0);
 const ready=t.downloads.success();await Promise.resolve();await t.frame();await ready;assert.deepEqual(t.required,['./game.js']);assert.equal(state.stage,'铺展江湖');assert.equal(state.total,0);
 state.handoff();assert.ok(t.calls.some(c=>c[0]==='deleteProgram'));
});
test('resource failure remains visible and retry starts a fresh download without touching saves',()=>{
 const t=boot(),state=t.GameGlobal.__jianghuLoading,old=console.error;console.error=()=>{};try{t.downloads.fail(Error('offline'));}finally{console.error=old;}
 assert.ok(state.error);assert.equal(state.active,true);state.retry();assert.equal(state.error,'');assert.equal(state.stage,'读取画卷');assert.equal(t.required.length,0);
});
test('background-suspended animation frames cannot stall entry after package download',async()=>{
 const t=boot(true);
 await t.downloads.success();
 assert.deepEqual(t.required,['./game.js']);
});
