import {parseHTML} from 'linkedom';
import {MobileUI} from '../../runtime/mobile-ui.js';
import * as T from '../../engine/vendor/three.module.js';
import {mountDialogue} from '../../engine/src/dialogue.js';
export function harness(w=844,h=390,ctx=null){
 const {document,window}=parseHTML('<html><body><div id="welcome" hidden></div><button id="sound" aria-pressed="true"></button><button id="interact" hidden>与挑夫对话</button><div id="aim-skills" hidden></div><div id="journal-lines"></div></body></html>');
 globalThis.document=document;globalThis.window=window;
 const calls=[],events={},keys=[];let time=0;
 const context=ctx||new Proxy({measureText:text=>({width:String(text).length*16})},{get:(o,k)=>o[k]||((...args)=>{calls.push([k,...args]);})});
 globalThis.wx={createCanvas:()=>ctx?ctx.canvas:{width:w,height:h,getContext:()=>context},onTouchStart:f=>events.start=f,onTouchMove:f=>events.move=f,onTouchEnd:f=>events.end=f,onTouchCancel:f=>events.cancel=f,onHide:f=>events.hide=f};
 const p={document,dom:window,info:{safeArea:{left:24,right:w-24,top:0,bottom:h-16}},worldCanvas:document.createElement('canvas'),env:{innerWidth:w,innerHeight:h,performance:{now:()=>time}},key:(...args)=>keys.push(args)};
 const world={sim:{s:{player:{hp:100,energy:100,money:88}},},keys:new Set(),npcs:new Map(),clearReady(){this.combatReady=false;},hero:{rotation:{}},renderer:{autoClear:true,setRenderTarget(){},clearDepth(){},render(){}},yaw:0,pitch:.5,attack(){},jump(){},toggleWeapon(){this.combatReady=true;}};
 const ui=new MobileUI(p,T);const dialogue=mountDialogue(world,{journal:{add(){}},clear(){},speak(){}});
 const render=()=>{ui.dirty=true;ui.nextPaint=0;ui.render(world);};const tick=ms=>{time+=ms;render();};
 return {ui,world,document,window,dialogue,render,tick,calls,events,keys,p};
}
export const touch=(id,x,y)=>({identifier:id,clientX:x,clientY:y});
