// Development-only renderer: npm install --no-save @napi-rs/canvas
import {createCanvas,loadImage,GlobalFonts} from '@napi-rs/canvas';
import fs from 'node:fs';
import {harness,touch} from '../tests/support/mobile-harness.mjs';
fs.mkdirSync('work/ui-qa',{recursive:true});
for(const [file,family] of [['wenkai-core','Mobile Body'],['wenkai-ext','Mobile Extra'],['zhimangxing','Mobile Title'],['notoserifsc-600','Mobile Numbers']]){if(!GlobalFonts.registerFromPath('resources/fonts/'+file+'.woff2',family))throw Error('Cannot load '+file);}
const bg=await loadImage('resources/opening/linxi-gate-ink-v2.jpg');
for(const [w,h] of [[1280,850],[1024,768],[800,600],[844,390],[667,375]]){
 const canvas=createCanvas(w,h),ctx=canvas.getContext('2d'),t=harness(w,h,ctx);t.ui.fonts={body:'"Mobile Body", "Mobile Extra"',title:'"Mobile Title", "Mobile Body"',numbers:'"Mobile Numbers"'};
 const save=name=>{const frame=createCanvas(w,h),c=frame.getContext('2d');c.drawImage(bg,0,0,w,h);c.drawImage(canvas,0,0);fs.writeFileSync(`work/ui-qa/${name}-${w}x${h}.png`,frame.toBuffer('image/png'));};
 t.render();t.tick(7000);save('exploration');
 t.ui.toolsOpen=true;t.render();save('tools');t.ui.toolsOpen=false;t.render();
 t.document.getElementById('welcome').hidden=false;t.render();save('welcome');t.document.getElementById('welcome').hidden=true;t.render();
 t.events.start({changedTouches:[touch(1,105,h-140)]});t.events.move({changedTouches:[touch(1,130,h-165)]});t.render();save('stick');t.events.cancel();
 t.dialogue.play([{id:'hero',text:'（渡口的账目或许另有隐情，得问问当日在场的人。）'}],()=>{});t.render();save('dialogue');t.dialogue.finish(true);
 t.dialogue.choose({title:'韩校尉',options:[{action:{id:'papers',label:'说说过关的凭据'},preview:{certain:true}},{action:{id:'gate',label:'方才为何关城门？'},preview:{certain:true}}],onSelect(){}});t.render();save('two-replies');console.log('Two replies occupied area:',w,h,JSON.stringify(t.ui.layout.panel));t.dialogue.finish(true);
 t.dialogue.choose({title:'韩校尉',options:[{action:{id:'a',label:'打听封关的缘由'},preview:{certain:true}},{action:{id:'b',label:'说明来意，请对方通融',stat:'wit'},preview:{chance:63,score:15}},{action:{id:'c',label:'暂且告辞'},preview:{certain:true}}],onSelect(){}});t.render();save('choices');t.dialogue.finish(true);
 t.dialogue.play([{id:'hero',text:'（城门附近的行人都停下了脚步，还要核对所见与传闻的不同，不能只凭一面之词就认定这件事情）'.repeat(8)}],()=>{});t.render();save('long-dialogue');t.dialogue.finish(true);
 const panel=t.document.createElement('aside');panel.id='environment-panel';panel.innerHTML='<header><b>城外通缉榜</b><button data-close>关闭</button></header><p>燕七涉嫌窃取许行商的钱袋。协拿到案者赏二十文，须活口。</p><button data-action="bounty">揭榜 · 拘传燕七</button><small data-mobile-omit>点击别的物品切换目标 · / 拔刀后左键攻击</small>';t.document.body.append(panel);t.render();save('object-detail');panel.remove();
 const opening=t.document.createElement('section');opening.id='opening-sequence';opening.innerHTML='<div class="opening-copy"><p>你身中蛊毒，寻医无果。</p><p>听闻道君皇帝营建仙山艮岳，招聚天下异人，仙山上必有解毒之法。</p></div><button class="opening-skip">跳过</button><button class="opening-next">继续</button>';t.document.body.append(opening);t.render();save('opening-subtitles');opening.remove();
 const speech=t.document.createElement('div');speech.id='npc-speech';speech.style.left=w*.5+'px';speech.style.top=h*.38+'px';speech.innerHTML='<span>杜老捕亲将那位旧账房关进牢里了。副账没交出去，才保住一条命。</span>';t.document.body.append(speech);const inter=t.document.getElementById('interact');inter.hidden=false;const skills=t.document.getElementById('aim-skills');skills.hidden=false;skills.innerHTML='<button data-icon="Hand">点穴</button><button data-icon="Eye">探查</button><button data-icon="Rope">套索</button>';t.render();save('ambient-subtitles');speech.remove();inter.hidden=true;skills.hidden=true;
 console.log('Rendered',w,h);
}
