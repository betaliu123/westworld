import test from 'node:test';import assert from 'node:assert/strict';
import {harness,touch} from './support/mobile-harness.mjs';
const tap=(t,x,y,id=1)=>{const f=touch(id,x,y);t.events.start({changedTouches:[f]});t.events.end({changedTouches:[f]});};
const sizes=[[1280,850],[1024,768],[800,600],[844,390],[667,375]];
test('objective, nearby speech, small meters and bottom actions fit all validation sizes',()=>{
 const overlap=(a,b)=>a.x<b.x+b.w&&b.x<a.x+a.w&&a.y<b.y+b.h&&b.y<a.y+a.h;
 for(const [w,h]of sizes){const t=harness(w,h);t.world.sim.s.player.hp=80;t.world.sim.s.player.energy=70;
  const quest=t.document.createElement('button');quest.id='tracked-quest';quest.innerHTML='<span>黄旗封关，先问问当值守卫，再寻找自己的过关门路。</span>';t.document.body.append(quest);
  const speech=t.document.createElement('div');speech.id='npc-speech';speech.textContent='这里还有一段需要听清的对白。';speech.style.left='90px';speech.style.top='50px';t.document.body.append(speech);t.render();
  const {quest:q,speech:b,actions,vitals}=t.ui.layout;assert.equal(overlap(q,b),false);
  for(const box of [q,b,actions,...vitals])assert.ok(box.x>=0&&box.y>=0&&box.x+box.w<=w&&box.y+box.h<=h);
  for(const bar of vitals)assert.equal(overlap(bar,actions),false);
 }
});
for(const [w,h]of sizes)test(`tap anywhere advances only pure dialogue at ${w}x${h}`,()=>{
 const t=harness(w,h);let finished=0;t.dialogue.play([{id:'hero',text:'第一句。第二句。'}],()=>finished++);t.render();
 assert.ok(!t.ui.zones.some(z=>z.icon==='Hand'));tap(t,60,60);assert.equal(t.document.querySelector('[data-line]').textContent,'第二句。');t.render();
 const clip=t.ui.layout.panel.clip;tap(t,clip.x+20,clip.y+12);assert.equal(finished,1);
 let chosen=0;t.dialogue.choose({title:'回应',options:[{action:{id:'yes',label:'答应'},preview:{certain:true}},{action:{id:'no',label:'拒绝'},preview:{certain:true}}],onSelect:()=>chosen++});t.render();tap(t,60,60);assert.equal(chosen,0);assert.ok(t.dialogue.active);
 const option=t.ui.zones.find(z=>z.element?.dataset.choice==='no');tap(t,option.x+20,option.y+20);assert.equal(chosen,1);
});
test('dragging subtitles or the scene does not skip; two held fingers cannot skip two lines',()=>{
 const t=harness(667,375);t.dialogue.play([{id:'hero',text:'长对白'.repeat(120)+'。第二句。第二句。'}],()=>{});t.render();const clip=t.ui.layout.panel.clip,f=touch(1,clip.x+30,clip.y+35);
 t.events.start({changedTouches:[f]});t.events.move({changedTouches:[touch(1,f.clientX,f.clientY-30)]});t.events.end({changedTouches:[touch(1,f.clientX,f.clientY-30)]});assert.ok(t.ui.scroll>0);assert.match(t.document.querySelector('[data-line]').textContent,/长对白/);
 t.events.start({changedTouches:[touch(2,70,80),touch(3,90,80)]});t.events.end({changedTouches:[touch(2,70,80),touch(3,90,80)]});assert.equal(t.document.querySelector('[data-line]').textContent,'第二句。');assert.ok(t.dialogue.active);
});
test('full vitals stay hidden, only changed non-full bars appear briefly, money cannot wake them',()=>{
 const t=harness();t.render();assert.equal(t.ui.layout.vitals.length,0);const p=t.world.sim.s.player;p.energy=97;t.tick(100);assert.deepEqual(t.ui.layout.vitals.map(v=>v.key),['energy']);assert.ok(t.ui.layout.vitals[0].w<=100);
 p.hp=88;t.tick(100);assert.equal(t.ui.layout.vitals.length,2);p.energy=100;t.tick(100);assert.deepEqual(t.ui.layout.vitals.map(v=>v.key),['hp']);t.tick(4100);assert.equal(t.ui.layout.vitals.length,0);p.money--;t.render();assert.equal(t.ui.layout.vitals.length,0);
});
test('journal is opt-in and scrollable; current objective is still visible and opens the real quest entry',()=>{
 const t=harness(667,375),journal=t.document.getElementById('journal-lines');journal.innerHTML=Array.from({length:35},(_,i)=>'<p>记录 '+i+'：这件事已经发生。</p>').join('');
 const quest=t.document.createElement('button');quest.id='tracked-quest';quest.innerHTML='<small>入城</small><span>黄旗封关，先问问当值守卫。</span>';let opened=0;quest.onclick=()=>opened++;t.document.body.append(quest);t.render();
 assert.ok(!t.calls.some(([fn,text])=>fn==='fillText'&&String(text).includes('这件事已经发生')));assert.ok(t.ui.layout.quest);assert.ok(t.ui.zones.some(z=>z.label.includes('黄旗封关')));t.ui.zones.find(z=>z.label.startsWith('任务与线索：')).action();assert.equal(opened,1);
 t.tick(7000);assert.ok(t.ui.layout.quest);quest.hidden=true;t.render();assert.equal(t.ui.layout.quest,undefined);
 t.ui.toolsOpen=true;t.render();t.ui.zones.find(z=>z.label==='记录').action();t.render();assert.equal(t.ui.layout.panel.kind,'detail');assert.ok(t.ui.maxScroll>0);assert.equal(journal.children.length,35);
 t.ui.zones.find(z=>z.label==='关闭').action();t.render();assert.equal(t.document.getElementById('mobile-journal'),null);assert.equal(journal.children.length,35);
});
