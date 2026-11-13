import {PEOPLE,ATTR} from './data.js';
import {npcName,rememberNpcConversation} from './npc-names.js';
import {icon} from './ui-icons.js';
import {mountReplyComposer} from './reply-composer.js';

export function isStoryChoice(action){return !!action.story||!!action.children?.some(isStoryChoice);}
const spokenNpc=line=>line&&!['hero','player'].includes(line.id)&&!line.narration&&!line.thought&&!/^[（(]/.test(line.text||'');

// Ordinary replies go straight to the speaker, without an action/check interlude.
export function isDirectReply(r){return (r?.type==='npc'||r?.presentation==='dialogue')&&!r.worldAction&&r.roll===null&&r.motion==='talk'&&r.actionId!=='care'&&Array.isArray(r.dialogue)&&r.dialogue.length>0;}
// Return to the guard who actually answered, after knowledge has been committed.
// A nearby gate event alone must never select or resume a conversation.
export function guardDialogueTarget(sim,target,r){
 if(sim.s.chapterVersion!==2||!isDirectReply(r)||!r.success||r.pendingSpeech)return null;
 const id=r.dialogue.findLast(spokenNpc)?.id;
 if(!['gate_guard','gate_relief'].includes(id))return null;
 if(target===id&&r.type==='npc'&&['ch_gate_rules','ch_gate_no_papers','ch_gate_guarantor'].includes(r.actionId))return id;
 if(target==='scene'&&r.type==='gate'&&r.actionId==='g_plead'&&r.ongoing&&sim.event?.type==='gate'&&sim.event.id===r.eventId&&['gate','refusal','papers','uniform'].includes(sim.event.gate?.phase))return id;
 return null;
}
// Continuations belong to the event the player chose, never merely a nearby event.
export function sceneDialogueReady(sim,eventId=sim.event?.id){return !!sim.event&&sim.event.id===eventId&&sim.actions().length>0;}
export function continuesSceneDialogue(sim,r){return !!r?.ongoing&&r.eventId!=null&&r.type===sim.event?.type&&sceneDialogueReady(sim,r.eventId)&&!!sim.sceneView()&&sim.event.proposal?.phase!=='duel'&&sim.event.gate?.phase!=='fight';}
// Sentence boundaries are presentation only: advancing never resolves a game action.
export function dialogueLines(lines,preserve=()=>false){return lines.flatMap(line=>{
 if(line.verbatim)return [{...line,text:String(line.text||'')}];
 if(preserve(line)&&String(line.text||'').length<=240)return [{...line,text:line.text.trim()}];
 const parts=String(line.text||'').match(/[^。！？!?\n]+[。！？!?]?/g)||[];
 return parts.filter(s=>s.trim()).map(text=>({...line,text:text.trim()}));
});}
export function shotPlan(speaker,listener,template='close',aspect=1.6){
 let dx=listener.x-speaker.x,dz=listener.z-speaker.z,d=Math.hypot(dx,dz);
 if(d<.2){dx=0;dz=1;d=1;}dx/=d;dz/=d;
 const side={x:dz,z:-dx};
 const pair=template==='two',over=template==='shoulder';
 const target={x:pair?(speaker.x+listener.x)/2:speaker.x,y:pair?1.25:1.65,z:pair?(speaker.z+listener.z)/2:speaker.z};
 if(template==='choice'){target.x+=side.x*.95;target.z+=side.z*.95;target.y=1.55;}
 const distance=template==='choice'?4.4:pair?Math.max(5,d*1.25)/Math.min(1,aspect/1.4):over?Math.min(4.8,d+1.3):3.1;
 const position={x:target.x+dx*distance+side.x*(pair?distance*.8:over?.65:1.15),y:pair?2.7:2.05,z:target.z+dz*distance+side.z*(pair?distance*.8:over?.65:1.15)};
 return {position,target,fov:pair?48:over?44:38};
}
export function chanceText(chance){return `成功率 ${chance}% · ${chance<=10?'极难':chance<=30?'困难':chance<=60?'有风险':chance<=85?'较有把握':'容易'}`;}
export function choiceCheckText(a,p){if(p.blocked)return p.reason||'眼下无法执行';if(p.certain)return p.reason||'无需检定';return (p.reason?p.reason+' · ':'')+(a.stat?`${ATTR[a.stat]} ${p.score} · ${chanceText(p.chance)}${p.bonus?' · 成长 +'+p.bonus:''}`:a.cost?'花费资源':'无需检定');}
export function mountDialogue(world,{journal,clear,speak,stopSpeech=()=>{},hasVoice=()=>false}){
 const el=document.createElement('section');el.id='dialogue-stage';el.hidden=true;el.setAttribute('role','dialog');el.setAttribute('aria-label','人物对白');
 el.innerHTML='<div class="dialogue-letterbox"></div><p class="dialogue-context" data-context hidden aria-live="polite"></p><div class="dialogue-card"><div class="dialogue-meta"><button data-back hidden aria-label="返回上层回应" title="返回上层回应（Esc）">'+icon('RotateCcw')+'</button><span data-scene></span><span data-progress></span><button data-close aria-label="关闭对白" title="关闭对白（Esc）">'+icon('X')+'</button></div><h2 data-speaker></h2><p data-line aria-live="polite"></p><footer><span class="dialogue-keys"><kbd>空格</kbd>继续<kbd>Esc</kbd>收起</span><button data-next>继续 ›</button></footer></div>';document.body.append(el);
 let lines=[],index=0,done=null,previousFocus=null,choosing=false,continuation=null,back=null,composing=false,disposeDraft=null;
 const choices=document.createElement('div');choices.className='cinematic-choices';el.querySelector('.dialogue-card').insertBefore(choices,el.querySelector('footer'));
 const field=name=>el.querySelector(`[data-${name}]`);
 function finish(cancelled=false){if(el.hidden)return;disposeDraft?.();disposeDraft=null;composing=false;el.classList.remove('composing');const heard=!cancelled&&!choosing?lines.slice(0,index+1).findLast(spokenNpc):null;stopSpeech();el.hidden=true;choosing=false;back=null;field('back').hidden=true;el.classList.remove('choosing','has-context');field('context').hidden=true;field('context').textContent='';choices.replaceChildren();world.cinematic=null;world.speaking=null;world.keys.clear();world.locked=false;document.body.classList.remove('cinematic');const cb=done;done=null;previousFocus?.isConnected&&previousFocus.focus({preventScroll:true});
  // Only a synchronous continuation of this completed exchange may reuse its line.
  continuation=heard;try{cb?.(cancelled);}finally{continuation=null;}
 }
 function show(){const line=lines[index];if(!line)return finish();
 if(spokenNpc(line)&&world.sim)rememberNpcConversation(world.sim,line);
 const next=lines.find((l,i)=>i>index&&l.id!==line.id&&world.npcs.has(l.id));
 const listener=line.listener||next?.id||'player';
 const template=line.shot||(['two','close','shoulder','reaction'][index%4]);
 world.cinematic={speaker:line.id,listener,template,cut:true};world.speaking=line.id;
 field('speaker').textContent=line.narration?'现场':world.sim?npcName(world.sim.s,line.id):PEOPLE.find(p=>p.id===line.id)?.name||(line.id==='player'?'你':'现场');field('line').textContent=line.text;field('scene').hidden=field('scene').textContent===field('speaker').textContent;field('progress').textContent=`${index+1} / ${lines.length}`;field('next').textContent=index===lines.length-1?'听完，继续 ›':'继续 ›';
 journal.add('chat',field('speaker').textContent,line.text);stopSpeech();if(!line.noVoice)speak(line);
 }
 // Replacing a presentation abandons its continuation; it is not a player response.
 const api={get active(){return !el.hidden;},play(input,onDone,title='临溪 · 对话'){
  if(api.active){done=null;finish(true);}lines=dialogueLines(input,hasVoice);index=0;if(!lines.length){onDone?.();return;}
  previousFocus=document.activeElement;clear();done=onDone;world.auto=null;world.keys.clear();world.clearReady();world.locked=true;el.hidden=false;field('scene').textContent=title;document.body.classList.add('cinematic');show();field('next').focus({preventScroll:true});
 },choose({title,listener='shen',context=continuation,options,onSelect,onClose,onBack}){
  const quote=spokenNpc(context)&&context.id===listener?context.text.trim():'';
  if(api.active){done=null;finish(true);}if(!options?.length){onClose?.();return;}stopSpeech();previousFocus=document.activeElement;choosing=true;done=onClose;el.hidden=false;el.classList.add('choosing');document.body.classList.add('cinematic');world.locked=true;world.keys.clear();world.auto=null;world.clearReady();world.speaking=null;world.cinematic=null;const partner=world.npcs.get(listener)?.actor;if(partner)world.hero.rotation.y=Math.atan2(partner.position.x-world.hero.position.x,partner.position.z-world.hero.position.z);
  back=onBack||null;field('back').hidden=!back;field('scene').textContent=title;field('scene').hidden=false;field('speaker').textContent='你会怎么回应？';field('line').textContent='';field('progress').textContent='';
  field('context').textContent=quote;field('context').hidden=!quote;el.classList.toggle('has-context',!!quote);
  choices.replaceChildren();options.forEach(({action:a,preview:p},i)=>{const b=document.createElement('button');b.dataset.action=a.id;b.dataset.choice=a.id;b.disabled=!!p.blocked;if(isStoryChoice(a)){b.classList.add('quest-needed');b.title='主线相关';b.setAttribute('aria-label',a.label+'（主线相关）');}const label=document.createElement('b'),detail=document.createElement('small');label.textContent=`${i+1}. ${a.label}`;detail.textContent=choiceCheckText(a,p)+(a.cost?` · ${a.cost} 文`:'');b.append(label);if(a.stat||a.cost||p.reason)b.append(detail);if(a.stat&&!p.blocked&&!p.certain){const bar=document.createElement('i');bar.className='ink-bar';bar.style.setProperty('--v',p.chance/100);bar.setAttribute('aria-hidden','true');b.append(bar);}b.onclick=()=>{if(b.disabled||!choosing)return;done=null;finish();onSelect(a);};choices.append(b);});choices.querySelector('button:not(:disabled)')?.focus({preventScroll:true});
 },compose({title,listener,context,prepare,onCommit,onClose,onBack,classify}){
  api.choose({title,listener,context,options:[{action:{id:'draft',label:'自己编一句'},preview:{certain:true}}],onSelect(){},onClose,onBack});
  composing=true;el.classList.add('composing');field('speaker').textContent='自己编一句';
  disposeDraft=mountReplyComposer(choices,{prepare,classify,formatCheck:choiceCheckText,onCommit:r=>{done=null;finish();onCommit(r);}});
 },finish};
 field('next').onclick=()=>{index++;show();};
 field('close').onclick=()=>finish(true);
 field('back').onclick=()=>back?.();
 window.addEventListener('keydown',e=>{if(!api.active)return;e.stopImmediatePropagation();if(composing){if(e.isComposing||e.keyCode===229)return;if(e.code==='Escape'){e.preventDefault();if(!e.repeat){if(back)back();else finish(true);}}return;}if(['Enter','Space'].includes(e.code)&&document.activeElement===field('close')){e.preventDefault();if(!e.repeat)finish(true);return;}if(choosing){if(e.code==='Tab')return;e.preventDefault();if(e.repeat)return;if(e.code==='Escape'){if(back)back();else finish();return;}if(['Enter','Space'].includes(e.code)&&document.activeElement===field('back')){back?.();return;}const b=/^Digit[1-4]$/.test(e.code)?choices.children[Number(e.code.slice(-1))-1]:['Enter','Space'].includes(e.code)&&choices.contains(document.activeElement)?document.activeElement:null;b?.click();return;}if(['Space','Enter','KeyE','Escape'].includes(e.code)){e.preventDefault();if(e.repeat)return;if(e.code==='Escape')finish(true);else{index++;show();}}},true);
 world.dialogue=api;return api;
}
