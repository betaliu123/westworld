import test from 'node:test';
import assert from 'node:assert/strict';
import {harness} from './support/mobile-harness.mjs';
import {mountOpeningSequence} from '../engine/src/opening-sequence.js';

function setup(){
 const t=harness(),images=[];
 t.p.assets=new Proxy({},{get:(_,key)=>({path:key})});t.p.clean=s=>s;
 t.p.image=()=>{const events={};const image={width:0,addEventListener:(n,f)=>events[n]=f,load(){this.width=1672;events.load();},fail(){events.error();}};images.push(image);return image;};
 globalThis.matchMedia=()=>({matches:true});
 const opening=mountOpeningSequence(),ready=t.ui.prepareOpening();
 return {...t,images,opening,ready};
}
test('slow native decode holds the previous painting; every opening frame covers the world',async()=>{
 const t=setup(),done=t.opening.play();let ready=false;t.ready.then(()=>ready=true);
 const frame=()=>{t.calls.length=0;t.render();const fills=t.calls.filter(c=>c[0]==='fillRect');assert.ok(fills.some(c=>c.slice(1).join(',')==='0,0,844,390'),'opaque full-screen sheet');return t.calls.filter(c=>c[0]==='drawImage').at(-1)?.[1];};
 assert.equal(frame(),undefined);
 t.images[0].load();await Promise.resolve();assert.equal(ready,false);assert.equal(frame(),t.images[0]);
 t.ui.zones.find(z=>z.label==='继续').action();
 for(let i=0;i<3;i++)assert.equal(frame(),t.images[0],'never exposes the 3D world while second image decodes');
 t.images[1].load();await t.ready;assert.equal(frame(),t.images[1]);assert.equal(ready,true);
 t.ui.zones.find(z=>z.label==='入临溪').action();await done;assert.equal(t.opening.active,false);
});
test('image failures reject startup preparation and signal the opening error instead of silently revealing 3D',async()=>{
 const t=setup(),done=t.opening.play();t.images[0].load();t.images[1].fail();
 await assert.rejects(t.ready,/未能/);
 t.render();t.ui.zones.find(z=>z.label==='继续').action();t.render();
 assert.equal(t.document.querySelector('.opening-image-error').hidden,false);
 assert.equal(t.calls.filter(c=>c[0]==='drawImage').at(-1)?.[1],t.images[0]);
 t.ui.zones.find(z=>z.label==='跳过').action();await done;
});
