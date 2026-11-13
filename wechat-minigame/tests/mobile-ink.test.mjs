import test from 'node:test';import assert from 'node:assert/strict';
import {harness,touch} from './support/mobile-harness.mjs';
import {iconGeometry,icon} from '../engine/src/ui-icons.js';
import {loadInkFonts} from '../runtime/ink-canvas.js';
import fs from 'node:fs';import zlib from 'node:zlib';
const sizes=[[1280,850],[1024,768],[800,600],[844,390],[667,375]];
const overlap=(a,b)=>a.x<b.x+b.w&&b.x<a.x+a.w&&a.y<b.y+b.h&&b.y<a.y+a.h;
for(const [w,h] of sizes)test(`compact dialogue, long text scrolling and reachable exit at ${w}x${h}`,()=>{
 const t=harness(w,h);let closed=0;
 t.dialogue.play([{id:'hero',text:'城门前的人群渐渐安静下来我还要问清此事的来历'.repeat(35)+'。'}],()=>closed++);t.render();
 const box=t.ui.layout.panel;assert.equal(box.kind,'dialogue');assert.ok(box.y>=h*.5);assert.ok(box.h<=h*.43);assert.ok(t.ui.maxScroll>0);
 const close=t.ui.zones.find(z=>z.label==='关闭对白');assert.ok(close.x>=24&&close.x+close.w<=w-24&&close.y+close.h<=h-16);
 const scroll=t.ui.zones.find(z=>z.kind==='scroll');scroll.move(-120);t.render();assert.ok(t.ui.scroll>0);
 close.action();assert.equal(closed,1);assert.equal(t.dialogue.active,false);
});
for(const [w,h] of sizes)test(`exploration actions remain distinct and use ink icons at ${w}x${h}`,()=>{
 const t=harness(w,h);t.world.combatReady=true;t.document.getElementById('interact').hidden=false;t.document.getElementById('aim-skills').hidden=false;t.document.getElementById('aim-skills').innerHTML='<button data-icon="Eye">探查</button><button data-icon="Hand">点穴</button><button data-icon="Rope">套索</button>';t.render();
 const buttons=t.ui.zones.filter(z=>['button','hold'].includes(z.kind));
 for(const b of buttons){assert.ok(b.w>=44&&b.h>=44,b.label);assert.ok(b.x>=24&&b.x+b.w<=w-24&&b.y>=0&&b.y+b.h<=h-16,b.label);}
 for(let i=0;i<buttons.length;i++)for(let j=i+1;j<buttons.length;j++)assert.equal(overlap(buttons[i],buttons[j]),false,buttons[i].label+' / '+buttons[j].label);
 assert.ok(buttons.some(b=>b.label==='江湖菜单'));assert.ok(!buttons.some(b=>b.label==='行囊'));assert.equal(t.ui.layout.stickVisible,false);
 t.ui.zones.find(b=>b.label==='江湖菜单').action();t.render();const expanded=t.ui.zones.filter(z=>['button','hold'].includes(z.kind));assert.ok(expanded.some(b=>b.label==='行囊'));for(let i=0;i<expanded.length;i++)for(let j=i+1;j<expanded.length;j++)assert.equal(overlap(expanded[i],expanded[j]),false,expanded[i].label+' / '+expanded[j].label);
});
test('floating stick appears only on contact, fades on release and cancels on background',()=>{
 const t=harness();t.render();const zone=t.ui.zones.find(z=>z.kind==='stick');const f=touch(1,zone.x+65,zone.y+45);
 t.events.start({changedTouches:[f]});t.render();assert.equal(t.ui.layout.stickVisible,true);
 t.events.move({changedTouches:[touch(1,f.clientX+30,f.clientY-30)]});assert.ok(t.ui.input.held.has('KeyW'));
 t.events.end({changedTouches:[f]});assert.equal(t.ui.input.held.size,0);t.tick(181);assert.equal(t.ui.layout.stickVisible,false);
 t.events.start({changedTouches:[f]});t.events.move({changedTouches:[touch(1,f.clientX,f.clientY+30)]});t.events.hide();t.render();assert.equal(t.ui.input.held.size,0);assert.equal(t.ui.layout.stickVisible,false);
});
test('toolbar avoids the native WeChat menu capsule in landscape',()=>{
 for(const [w,h] of [[844,390],[667,375]]){const t=harness(w,h),capsule={left:w-100,right:w-8,top:8,bottom:40,width:92,height:32};wx.getMenuButtonBoundingClientRect=()=>capsule;t.render();for(const b of t.ui.zones.filter(z=>z.kind==='button'))assert.equal(overlap(b,{x:capsule.left,y:capsule.top,w:capsule.width,h:capsule.height}),false,b.label);}
});
test('second left touch never steals or releases the first stick',()=>{
 const t=harness();t.render();const zone=t.ui.zones.find(z=>z.kind==='stick'),a=touch(1,80,220),b=touch(2,120,240);t.ui.input.start(a,zone);t.ui.input.move(touch(1,80,180));t.ui.input.start(b,zone);t.ui.input.end(b);assert.ok(t.ui.input.held.has('KeyW'));t.ui.input.end(a);assert.equal(t.ui.input.held.size,0);
});
test('choice scroll preserves full checks; clipped rows cannot be activated outside the sheet',()=>{
 const t=harness(667,375);let selected=0;
 t.dialogue.choose({title:'韩校尉',options:Array.from({length:3},(_,i)=>({action:{id:'ask'+i,label:'说明此行的缘由，请对方听我把话说完',stat:'wit'},preview:{chance:63,score:15,reason:'此前听过公文线索'}})),onSelect:()=>selected++});t.render();
 assert.ok(t.ui.layout.panel.h<=375*.55);assert.ok(t.ui.maxScroll>0);
 const row=t.ui.zones.find(z=>z.element?.dataset.choice==='ask0');assert.match(row.label,/63%/);const finger=touch(1,row.x+20,row.y+12);t.ui.input.start(finger,row);t.ui.input.move(touch(1,finger.clientX,finger.clientY-100));t.ui.input.end(touch(1,finger.clientX,finger.clientY-100));assert.equal(selected,0);t.render();
 const box=t.ui.layout.panel.clip;for(const z of t.ui.zones.filter(z=>z.element&&z.h>0))assert.ok(z.y>=box.y&&z.y+z.h<=box.y+box.h);
});
test('native icon paths come from the desktop ink source and fonts stay local',()=>{
 const t=harness();for(const name of ['Backpack','Swords','UserRound','EyeOff','Rope','X']){assert.ok(iconGeometry(name).length>0);assert.match(icon(name),/ink-icon/);}
 const paths=[];const fonts=loadInkFonts({loadFont:path=>{paths.push(path);return 'font'+paths.length;}},Object.fromEntries(['wenkai-core.ttf','wenkai-ext.ttf','zhimangxing.ttf','notoserifsc-600.ttf'].map(name=>['assets/fonts/'+name,{path:'packages/resources/assets/fonts/'+name}])));
 assert.equal(paths.length,4);assert.match(fonts.body,/font1/);assert.doesNotMatch(Object.values(fonts).join(),/sans-serif|Segoe|Georgia|微软雅黑/);
});
test('NPC action menu stays compact and keeps an independent movement surface',()=>{
 const t=harness(844,390),menu=t.document.createElement('aside');menu.id='panel';menu.className='npc-action-menu';menu.innerHTML='<header><b>挑夫</b><button data-close>关闭</button></header><div><button data-action="talk">攀谈</button><button data-action="gift">送物</button><button data-action="probe">探查</button></div>';t.document.body.append(menu);t.render();assert.equal(t.ui.layout.panel.kind,'menu');assert.ok(t.ui.layout.panel.w<=380);assert.ok(t.ui.layout.panel.h<=390*.62);assert.ok(t.ui.zones.some(z=>z.kind==='stick'));assert.equal(t.world.locked,undefined);
});
test('native font loading expands packaged TTF into local files before calling wx.loadFont',()=>{
 const assets=JSON.parse(fs.readFileSync('runtime/asset-map.json')),writes=new Map(),loaded=[];
 const read=key=>new Uint8Array(zlib.gunzipSync(fs.readFileSync(assets[key].path)));
 const fonts=loadInkFonts({env:{USER_DATA_PATH:'wxfile://usr'},getFileSystemManager:()=>({writeFileSync:(p,b)=>writes.set(p,new Uint8Array(b))}),loadFont:p=>{assert.ok(writes.has(p));assert.ok(writes.get(p).length>1000);assert.match(p,/^wxfile:\/\/usr\/jianghu-font-.*\.ttf$/);loaded.push(p);return 'native'+loaded.length;}},assets,read);
 assert.equal(loaded.length,4);assert.match(fonts.body,/native1/);assert.match(fonts.title,/native3/);
});
for(const [w,h] of sizes)test(`two short replies stay at the edge and occupy less than 13 percent at ${w}x${h}`,()=>{
 const t=harness(w,h);let selected=0;t.dialogue.choose({title:'韩校尉',options:[{action:{id:'papers',label:'说说过关的凭据'},preview:{certain:true}},{action:{id:'gate',label:'方才为何关城门？'},preview:{certain:true}}],onSelect:()=>selected++});t.render();
 const box=t.ui.layout.panel;assert.ok(box.w*box.h/(w*h)<.13);assert.ok(box.x>w*.55);assert.ok(box.h<=140);assert.equal(t.ui.maxScroll,0);
 const rows=t.ui.zones.filter(z=>z.element?.dataset.choice);assert.equal(rows.length,2);assert.ok(rows.every(z=>z.h>=44));const row=rows[1],finger=touch(1,row.x+30,row.y+20);t.events.start({changedTouches:[finger]});t.events.end({changedTouches:[finger]});assert.equal(selected,1);
});
test('short subtitles let close take priority over the whole-screen advance target',()=>{
 const t=harness(667,375);let cancelled;t.dialogue.play([{id:'hero',text:'（得问清楚。）'}],value=>cancelled=value);t.render();const close=t.ui.zones.find(z=>z.label==='关闭对白'),finger=touch(1,close.x+20,close.y+20);t.events.start({changedTouches:[finger]});t.events.end({changedTouches:[finger]});assert.equal(cancelled,true);assert.ok(t.ui.layout.panel.h<=90);
});
test('pushing the invisible stick farther runs; release and cancel also release run',()=>{
 const t=harness();t.render();const zone=t.ui.zones.find(z=>z.kind==='stick'),finger=touch(1,100,220);t.ui.input.start(finger,zone);t.ui.input.move(touch(1,100,190));assert.ok(!t.ui.input.held.has('ShiftLeft'));t.ui.input.move(touch(1,100,150));assert.ok(t.ui.input.held.has('ShiftLeft'));t.ui.input.end(touch(1,100,150));assert.equal(t.ui.input.held.size,0);t.ui.input.start(finger,zone);t.ui.input.move(touch(1,100,150));t.ui.input.cancel();assert.equal(t.ui.input.held.size,0);
});
test('object actions keep real checks in a compact list and use the real cancel handler',()=>{
 const t=harness(844,390),panel=t.document.createElement('aside');panel.id='object-actions';panel.innerHTML='<b>衣架</b><button data-object-close>关闭</button><button data-object-action="take">取下衣服<small>身法 12 · 成功率 60% · 有风险</small></button>';t.document.body.append(panel);let closed=0,executed=0;panel.querySelector('[data-object-close]').onclick=()=>closed++;panel.querySelector('[data-object-action]').onclick=()=>executed++;t.render();assert.equal(t.ui.layout.panel.kind,'menu');assert.ok(t.ui.layout.panel.w<=320);const row=t.ui.zones.find(z=>z.element?.dataset.objectAction);assert.match(row.label,/成功率 60%/);t.ui.zones.find(z=>z.label==='关闭').action();assert.equal(closed,1);assert.equal(executed,0);
});
