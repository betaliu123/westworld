import {WorldAudio} from './world-audio.js';
import {NpcVoice} from './npc-voice.js';
import {VOICE_TRIAL} from './voice-lines.js';
const $=id=>document.getElementById(id),errors=[];
const audio=new WorldAudio({onError:e=>errors.push(e.message)}),voice=new NpcVoice({createContext:()=>audio.getContext(),onError:(stage,e)=>errors.push(stage+': '+e.message)});
let started=false,muted=false,performing=false,previous=0,lastCue='';voice.setEnabled(true);voice.init();
audio.init().then(c=>{$('music').src=c.music?.src||'';});
$('start').onclick=()=>{started=true;audio.unlock();voice.unlock();};
$('stop').onclick=()=>{started=false;audio.stop();voice.stop();$('music').pause();};
$('mute').onclick=()=>{muted=!muted;audio.setEnabled(!muted);voice.setEnabled(!muted);if(!muted)audio.unlock();$('mute').textContent=muted?'恢复声音':'静音';};
for(const [id,label] of Object.entries({draw:'拔刀',attack:'空挥',wood:'击中木材',body:'衣甲受击',metal:'兵刃格挡',step:'脚步',coins:'铜钱',alert:'察觉',win:'检定成功',lose:'检定失利'})){
 const b=document.createElement('button');b.textContent=label;b.onclick=()=>{lastCue=audio.play(id)?label+' · 已播放':label+' · 尚未就绪';};$('effects').append(b);
}
$('voice').onclick=async()=>{voice.unlock();const cue=VOICE_TRIAL.find(c=>c.actor==='traveler');lastCue=await voice.play(cue,{generate:false})?'锦衣客 · 已播放':'对白未就绪或已中断';};
$('skip').onclick=()=>voice.stop();
$('performance').onclick=()=>{performing=!performing;$('performance').textContent=performing?'恢复探索配乐':'卖艺时淡出配乐';};
$('music').onplay=()=>{started=false;audio.stop();voice.stop();};
document.addEventListener('visibilitychange',()=>{audio.setHidden(document.hidden);if(document.hidden){voice.stop();$('music').pause();}});
window.addEventListener('pagehide',()=>{audio.stop();voice.stop();});
function frame(now){
 const dt=Math.min(.05,(now-previous)/1000);previous=now;
 const position={gate:{x:-8,z:26},city:{x:0,z:0},creek:{x:-22,z:34}}[$('place').value];
 audio.update(dt,{started,...position,time:Number($('time').value),voice:!!voice.source,performing,hp:100});voice.update();
 const state=audio.status();$('status').textContent=`${state.running?'播放中':'已停止'} · ${state.context}\n已就绪 ${state.loaded.length} / 10 · 循环 ${state.loops.join(' / ')}\n音乐 ${state.mix.music.toFixed(2)} · 人群 ${state.mix.city.toFixed(2)} · 溪水 ${state.mix.creek.toFixed(2)} · 对白 ${voice.source?'播放中':'无'}\n${lastCue}${errors.length?'\n错误：'+errors.join('; '):''}`;
 requestAnimationFrame(frame);
}requestAnimationFrame(frame);
