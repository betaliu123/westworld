import test from 'node:test';import assert from 'node:assert/strict';
import {createDisplayQuality} from '../runtime/display-quality.js';import {World} from '../engine/src/world.js';import {renderQuality} from '../engine/src/render-quality.js';import {mobileScene} from '../engine/src/mobile-scene.js';import * as T from '../engine/vendor/three.module.js';
const phone={windowWidth:844,windowHeight:390,pixelRatio:3};
test('auto budgets world pixels independently while HUD stays native in all quality modes',()=>{
 const q=createDisplayQuality(phone);assert.equal(q.mode,'auto');assert.equal(q.sceneRatio,1.8);assert.equal(q.hudRatio,3);for(let i=0;i<4;i++){q.cycle();assert.equal(q.hudRatio,3);assert.ok(q.sceneRatio>=1.25);}assert.equal(q.mode,'auto');
});
test('high-density pixel bounds and explicit quality selection survive restart',()=>{
 const memory=new Map(),storage={getItem:k=>memory.get(k),setItem:(k,v)=>memory.set(k,v)},q=createDisplayQuality({windowWidth:1280,windowHeight:720,pixelRatio:4},storage);assert.ok(1280*720*q.sceneRatio**2<=1_500_001);assert.ok(1280*720*q.hudRatio**2<=4_000_001);q.cycle();assert.equal(createDisplayQuality(phone,storage).mode,'clear');
});
test('World keeps the output sharp and changes only scene buffers plus shadow budget',()=>{
 const display=createDisplayQuality(phone);globalThis.mobileDisplay=display;globalThis.devicePixelRatio=3;globalThis.innerWidth=844;globalThis.innerHeight=390;let ratio=0;const shadow={mapSize:{x:2048,set(x){this.x=x;}}},w={quality:renderQuality('full'),renderer:{getPixelRatio:()=>ratio,setPixelRatio:r=>ratio=r,shadowMap:{}},ink:{setSize(){}},sun:{shadow}};World.prototype.applyQuality.call(w);assert.equal(ratio,3);assert.equal(shadow.mapSize.x,768);assert.equal(w.renderer.shadowMap.autoUpdate,false);display.cycle();World.prototype.applyQuality.call(w);assert.equal(ratio,3);assert.equal(shadow.mapSize.x,1024);display.cycle();w.ink.enabled=false;World.prototype.applyQuality.call(w);assert.equal(ratio,1.6);delete globalThis.mobileDisplay;
});
test('auto lowers shadows first and restores pixels when lowering resolution brings no benefit',()=>{
 const q=createDisplayQuality(phone);for(let i=0;i<190;i++)q.frame(50);assert.equal(q.shadowSize,512);for(let i=0;i<1000;i++)q.frame(50);assert.equal(q.sceneRatio,1.8);assert.equal(q.hudRatio,3);let count=0;for(let ms=0;ms<1000;ms+=1000/60)count+=q.shadowDue(ms);assert.ok(count<=6);
});
test('HDR scene target preserves tone-mapping order and never downsamples HUD output',()=>{
 const calls=[],renderer={capabilities:{isWebGL2:true},extensions:{has:()=>true},setRenderTarget:t=>calls.push(['target',t]),render:(s,c)=>calls.push(['render',s,c])},scene=new T.Scene(),camera=new T.Camera(),q=createDisplayQuality(phone),pass=mobileScene(renderer,scene,camera,q);pass.setSize(844,390);pass.render();const rt=calls[0][1];assert.equal(rt.width,1519);assert.equal(rt.height,702);assert.equal(rt.texture.type,T.HalfFloatType);assert.equal(rt.samples,2);assert.equal(calls[1][1],scene);assert.equal(calls[2][1],null);assert.equal(calls[3][1].children[0].material.toneMapped,true);assert.equal(calls[3][1].children[0].material.map,rt.texture);
 const fallback=mobileScene({...renderer,extensions:{has:()=>false}},scene,camera,q);assert.equal(fallback.enabled,false);assert.doesNotThrow(()=>fallback.render());
});
