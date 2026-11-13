import test from 'node:test';import assert from 'node:assert/strict';import {parseHTML} from 'linkedom';import {MobileUI} from '../runtime/mobile-ui.js';import * as T from '../engine/vendor/three.module.js';import {createDisplayQuality} from '../runtime/display-quality.js';import {mountDialogue} from '../engine/src/dialogue.js';
test('real story dialogue takes priority over the old NPC menu, choices settle once and cancel does not select',()=>{
 const {document,window}=parseHTML('<html><body><div id="welcome" hidden></div><div id="panel"><button>交谈</button></div></body></html>');globalThis.document=document;globalThis.window=window;
 const ctx=new Proxy({measureText:t=>({width:String(t).length*16})},{get:(o,k)=>o[k]||(()=>{})});const canvas=()=>({width:844,height:390,getContext:()=>ctx});
 globalThis.wx={createCanvas:canvas,onTouchStart(){},onTouchMove(){},onTouchEnd(){},onTouchCancel(){},onHide(){}};
 const p={document,dom:window,info:{},env:{innerWidth:844,innerHeight:390,mobileDisplay:createDisplayQuality({windowWidth:844,windowHeight:390,pixelRatio:3})},key(){}};const ui=new MobileUI(p,T);
 const world={keys:new Set(),npcs:new Map(),clearReady(){},hero:{rotation:{}},renderer:{autoClear:true,setRenderTarget(){},clearDepth(){},render(){}}};
 let selected=0,closed=0;const dialogue=mountDialogue(world,{journal:{add(){}},clear(){},speak(){}});
 const open=()=>dialogue.choose({title:'韩校尉',options:[{action:{id:'ask',label:'为何封关'},preview:{certain:true}}],onSelect:()=>selected++,onClose:()=>closed++});
 open();ui.render(world);assert.equal(ui.lastPanel.id,'dialogue-stage');assert.equal(ui.surface.width,2532);assert.equal(ui.surface.height,1170);assert.equal(ui.lastPanel.querySelector('[data-choice]').textContent,'1. 为何封关');
 const button=ui.zones.find(z=>z.element?.dataset.choice==='ask');assert.ok(button);const t={identifier:1,clientX:button.x+10,clientY:button.y+10};ui.input.start(t,button);ui.input.end(t);assert.equal(selected,1);assert.equal(dialogue.active,false);
 open();dialogue.finish(true);assert.equal(selected,1);assert.equal(closed,1);
});
test('scrolling a choice row never submits the choice',()=>{
 const {document,window}=parseHTML('<html><body></body></html>');const ctx=new Proxy({measureText:()=>({width:50})},{get:(o,k)=>o[k]||(()=>{})});globalThis.wx={createCanvas:()=>({getContext:()=>ctx}),onTouchStart(){},onTouchMove(){},onTouchEnd(){},onTouchCancel(){},onHide(){}};
 const ui=new MobileUI({document,dom:window,key(){},info:{}},T);let selected=0,scroll=0;const zone={kind:'button',action:()=>selected++,move:dy=>scroll+=dy};ui.input.start({identifier:1,clientX:20,clientY:20},zone);ui.input.move({identifier:1,clientX:20,clientY:80});ui.input.end({identifier:1,clientX:20,clientY:80});assert.equal(selected,0);assert.equal(scroll,60);
});
