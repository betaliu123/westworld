import test from 'node:test';
import assert from 'node:assert/strict';
import {mountCheckReveal} from '../src/check-reveal.js';

test('live reach keeps movement and stand-up available only before the check settles',()=>{
 const previous={document:globalThis.document,window:globalThis.window,matchMedia:globalThis.matchMedia};
 const node=()=>({children:new Map(),classList:{add(){},remove(){}},append(){},setAttribute(){},querySelector(key){if(!this.children.has(key))this.children.set(key,node());return this.children.get(key);}});
 let keydown;
 globalThis.document={createElement:node,body:node(),getElementById:()=>node()};
 globalThis.window={addEventListener(type,fn){if(type==='keydown')keydown=fn;}};
 globalThis.matchMedia=()=>({matches:true});
 try{
  const reveal=mountCheckReveal(()=>false),action={stat:'agility',label:'偷取随身物品'},check={chance:70};
  const blocked=code=>{let stopped=false;keydown({code,preventDefault(){},stopImmediatePropagation(){stopped=true;}});return stopped;};
  reveal.start(action,check,{live:true});
  for(const code of ['KeyW','KeyA','KeyS','KeyD','KeyZ','KeyC'])assert.equal(blocked(code),false,code);
  reveal.play({roll:20,success:true,check},()=>{},true);
  assert.equal(blocked('KeyZ'),true,'a completed result keeps its ordinary input lock');
  reveal.cancel();reveal.start(action,check);
  assert.equal(blocked('KeyW'),true,'ordinary checks still block movement');
  reveal.cancel();reveal.start(action,check,{live:true});
  assert.equal(blocked('Escape'),true);assert.equal(reveal.active,false,'skip only dismisses the presentation');
  reveal.cancel();
 }finally{Object.assign(globalThis,previous);}
});
