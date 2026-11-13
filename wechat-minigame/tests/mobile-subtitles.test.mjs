import test from 'node:test';import assert from 'node:assert/strict';
import {harness,touch} from './support/mobile-harness.mjs';
import {mountOpeningSequence} from '../engine/src/opening-sequence.js';
import {textureFiles} from '../runtime/texture-files.js';
import fs from 'node:fs';
const sizes=[[1280,850],[1024,768],[800,600],[844,390],[667,375]];
for(const [w,h] of sizes)test(`opening shows subtitles and preserves reveal, advance and skip at ${w}x${h}`,async()=>{
 const t=harness(w,h);globalThis.matchMedia=()=>({matches:true});const opening=mountOpeningSequence();
 t.p.assets=new Proxy({},{get:(_,key)=>({path:key})});t.p.clean=s=>s;t.p.image=()=>{const events={};return {width:1672,addEventListener:(n,f)=>events[n]=f,set src(v){this.path=v;queueMicrotask(()=>events.load());}};};
 await t.ui.prepareOpening();const drawn=()=>t.calls.filter(c=>c[0]==='drawImage').at(-1)?.[1].path;
 const done=opening.play();t.render();assert.equal(t.ui.layout.panel.kind,'opening');assert.ok(t.ui.layout.panel.h<h*.4);assert.ok(t.ui.layout.panel.y>h*.55);assert.match(drawn(),/genyue/);assert.ok(!t.calls.some(c=>c[0]==='fillText'&&c[1]==='初入江湖'));
 t.ui.zones.find(z=>z.label==='继续').action();t.render();assert.match(drawn(),/linxi/);assert.equal(t.ui.zones.find(z=>z.label==='入临溪').h,44);t.ui.zones.find(z=>z.label==='跳过').action();await done;assert.equal(opening.active,false);
});
for(const [w,h] of sizes)test(`object description fits content and retains actual actions at ${w}x${h}`,()=>{
 const t=harness(w,h),p=t.document.createElement('aside');p.id='environment-panel';p.innerHTML='<header><b>城外通缉榜</b><button data-close>关闭</button></header><p>燕七涉嫌窃取许行商的钱袋。协拿到案者赏二十文，须活口。</p><button data-action="bounty">揭榜 · 拘传燕七</button><small data-mobile-omit>点击别的物品切换目标 · / 拔刀后左键攻击</small>';t.document.body.append(p);let count=0;p.querySelector('[data-action]').onclick=()=>count++;t.render();let box=t.ui.layout.panel;assert.ok(box.w<=360);assert.ok(box.w*box.h/(w*h)<.2);assert.ok([14,16].includes(box.fontSize));assert.ok(!t.calls.some(c=>c[0]==='fillText'&&String(c[1]).includes('左键')));const action=t.ui.zones.find(z=>z.element?.dataset.action);assert.ok(action.h>=44);action.action();assert.equal(count,1);
 p.querySelector('p').textContent='物品来源、实际归属和关键线索不能因移动适配而截断。'.repeat(25);t.render();box=t.ui.layout.panel;assert.ok(t.ui.maxScroll>0);t.ui.zones.find(z=>z.kind==='scroll').move(-100);t.render();assert.ok(t.ui.scroll>0);assert.ok(t.ui.zones.find(z=>z.label==='关闭').h===44);
});
test('nearby talk is two characters, complete target remains available, and speech has no paper polygon',()=>{
 const t=harness();const inter=t.document.getElementById('interact');inter.hidden=false;inter.textContent='与韩校尉对话';let clicked=0;inter.onclick=()=>clicked++;const speech=t.document.createElement('div');speech.id='npc-speech';speech.style.left='420px';speech.style.top='160px';speech.innerHTML='<span>副账没交出去，才保住一条命。</span>';t.document.body.append(speech);t.tick(7000);t.calls.length=0;t.render();assert.equal(t.ui.layout.interaction.label,'对话');assert.equal(t.ui.layout.interaction.w,64);const z=t.ui.zones.find(z=>z.element===inter);assert.equal(z.label,'与韩校尉对话');z.action();assert.equal(clicked,1);assert.ok(t.ui.layout.speech.h<100);assert.ok(!t.calls.some(c=>c[0]==='fillRect'));assert.ok(!t.calls.some(c=>c[0]==='fillText'&&String(c[1]).includes('与韩')));
});
test('packaged model textures survive GLTF revoke before deferred native upload and reuse content paths',()=>{
 const files=new Map();let writes=0;const urls=textureFiles({writeFileSync:(p,b)=>{writes++;files.set(p,Buffer.from(b));}},'wxfile://usr');
 for(const f of fs.readdirSync('engine/src/models').filter(f=>f.endsWith('.glb'))){const b=fs.readFileSync('engine/src/models/'+f),n=b.readUInt32LE(12),j=JSON.parse(b.subarray(20,20+n).toString()),binary=28+n;for(const im of j.images||[]){const v=j.bufferViews[im.bufferView],bytes=b.subarray(binary+(v.byteOffset||0),binary+(v.byteOffset||0)+v.byteLength),blob={bytes,type:im.mimeType},url=urls.createObjectURL(blob),before=writes;urls.revokeObjectURL(url);assert.deepEqual(files.get(url),bytes,f+' deferred upload');assert.equal(urls.createObjectURL(blob),url);assert.equal(writes,before);assert.equal(files.get(url).readUInt16BE(0),0xffd8);}}
});
