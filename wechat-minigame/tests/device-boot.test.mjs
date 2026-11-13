import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {build} from 'esbuild';
import {atob,btoa} from '../runtime/base64.js';

test('base64 primitive handles binary bytes, unpadded and whitespace input without Buffer',()=>{
 const binary=Array.from({length:256},(_,i)=>String.fromCharCode(i)).join('');
 assert.equal(atob(btoa(binary)),binary);
 assert.equal(btoa(binary),Buffer.from(binary,'latin1').toString('base64'));
 assert.equal(atob(' YW\nJjZA== '),'abcd');assert.equal(atob('YWI'),'ab');assert.equal(atob('YQ'),'a');
 for(const bad of ['A','a===','YQ=','YW!j','你好'])assert.throws(()=>atob(bad),{name:'InvalidCharacterError'});
 assert.throws(()=>btoa('江'),{name:'InvalidCharacterError'});
});

test('browser DOM dependency initialises and parses real page in a device-like VM without atob, Buffer or process',async()=>{
 const {outputFiles}=await build({entryPoints:['runtime/platform.js'],bundle:true,write:false,platform:'browser',target:'es2017',format:'iife',globalName:'DevicePlatform',inject:['runtime/base64.js']});
 const canvas=()=>({width:0,height:0,getContext:()=>({})});
 const storage=new Map();
 const sandbox={console,setTimeout,clearTimeout,GameGlobal:{canvas:canvas()},wx:{getWindowInfo:()=>({windowWidth:844,windowHeight:390,pixelRatio:2}),createCanvas:canvas,createImage:()=>({}),getFileSystemManager:()=>({}),getStorageSync:k=>storage.get(k)||'',setStorageSync:(k,v)=>storage.set(k,v),removeStorageSync:k=>storage.delete(k),onHide(){},onShow(){},onWindowResize(){},env:{USER_DATA_PATH:'device-test'}}};
 vm.createContext(sandbox);
 vm.runInContext(outputFiles[0].text,sandbox,{timeout:10000});
 const result=vm.runInContext(`(()=>{const p=DevicePlatform.installPlatform();const el=p.document.createElement('p');el.innerHTML='&copy; &#x6C5F;&#x6E56; &NotEqualTilde;';return [p.document.getElementById('start').textContent,el.textContent,typeof Buffer,typeof atob,typeof process]})()`,sandbox);
 assert.deepEqual(Array.from(result),['初入江湖','© 江湖 ≂̸','undefined','undefined','undefined']);
});

test('actual shipped bundle passes dependency startup without browser or Node base64 globals',()=>{
 const marker=new Error('DEVICE_BOOT_REACHED_PLATFORM');const sandbox={console,setTimeout,clearTimeout,GameGlobal:{},wx:{getWindowInfo(){throw marker;}}};vm.createContext(sandbox);
 assert.throws(()=>vm.runInContext(fs.readFileSync('dist/game.js','utf8'),sandbox,{timeout:10000}),error=>error===marker);
});
