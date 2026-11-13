import {WorldAudio} from './world-audio.js';
import {NpcVoice} from './npc-voice.js';
import {VOICE_TRIAL} from './voice-lines.js';
const $=id=>document.getElementById(id),errors=[];
const audio=new WorldAudio({onError:e=>errors.push(e.message)}),voice=new NpcVoice({createContext:()=>audio.getContext(),onError:(stage,e)=>errors.push(stage+': '+e.message)});
let started=false,muted=false,performing=false,previous=0,lastCue='';voice.setEnabled(true);voice.init();
const players=['music','flute-poor','flute-good','creek','music-night','night','night-inn'].map($);
const pauseSamples=()=>players.forEach(p=>p.pause());
audio.init().then(c=>{for(const p of players)p.src=c[p.id]?.src||'';});
$('start').onclick=()=>{pauseSamples();started=true;audio.unlock();voice.unlock();};
$('stop').onclick=()=>{started=performing=false;$('performance').textContent='开始吹笛';audio.stop();voice.stop();pauseSamples();};
$('mute').onclick=()=>{muted=!muted;audio.setEnabled(!muted);voice.setEnabled(!muted);players.forEach(p=>p.muted=muted);if(!muted)audio.unlock();$('mute').textContent=muted?'恢复声音':'静音';};
for(const [id,label] of Object.entries({draw:'拔刀',attack:'空挥',wood:'击中木材',body:'衣甲受击',metal:'兵刃格挡',step:'脚步',coins:'铜钱',alert:'察觉',win:'检定成功',lose:'检定失利'})){
 const b=document.createElement('button');b.textContent=label;b.onclick=()=>{lastCue=audio.play(id)?label+' · 已播放':label+' · 尚未就绪';};$('effects').append(b);
}
$('voice').onclick=async()=>{voice.unlock();const cue=VOICE_TRIAL.find(c=>c.actor==='traveler');lastCue=await voice.play(cue,{generate:false})?'锦衣客 · 已播放':'对白未就绪或已中断';};
$('skip').onclick=()=>voice.stop();
$('performance').onclick=()=>{pauseSamples();started=true;audio.unlock();performing=!performing;$('performance').textContent=performing?'收起竹笛':'开始吹笛';};
for(const p of players)p.onplay=()=>{for(const other of players)if(other!==p)other.pause();started=performing=false;$('performance').textContent='开始吹笛';audio.stop();voice.stop();};
document.addEventListener('visibilitychange',()=>{audio.setHidden(document.hidden);if(document.hidden){voice.stop();pauseSamples();}});
window.addEventListener('pagehide',()=>{audio.stop();voice.stop();pauseSamples();});
function frame(now){
 const dt=Math.min(.05,(now-previous)/1000);previous=now;
 const position={gate:{x:-8,z:26},city:{x:0,z:0},creek:{x:-22,z:34},inn:{x:-11,z:-12}}[$('place').value];
 audio.update(dt,{started,...position,time:Number($('time').value),voice:!!voice.source,performing,musicTier:Number($('music-tier').value),hp:100});voice.update();
 const state=audio.status();$('status').textContent=`${state.running?'播放中':'已停止'} · ${state.context}\n已就绪 ${state.loaded.length} / ${Object.keys(audio.catalog||{}).length} · 循环 ${state.loops.join(' / ')}\n音乐 ${state.mix.music.toFixed(2)} · 夜曲 ${state.mix['music-night'].toFixed(2)} · 夜风 ${state.mix.night.toFixed(2)} · 客栈 ${state.mix['night-inn'].toFixed(2)} · 人群 ${state.mix.city.toFixed(2)} · 溪水 ${state.mix.creek.toFixed(2)} · 对白 ${voice.source?'播放中':'无'}\n${lastCue}${errors.length?'\n错误：'+errors.join('; '):''}`;
 requestAnimationFrame(frame);
}requestAnimationFrame(frame);
