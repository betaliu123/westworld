import {PEOPLE,ATTR} from './data.js';

// Ordinary replies go straight to the speaker, without an action/check interlude.
export function isDirectReply(r){return (r?.type==='npc'||r?.presentation==='dialogue')&&!r.worldAction&&r.roll===null&&r.motion==='talk'&&r.actionId!=='care'&&Array.isArray(r.dialogue)&&r.dialogue.length>0;}
// Sentence boundaries are presentation only: advancing never resolves a game action.
export function dialogueLines(lines){return lines.flatMap(line=>{
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
export function choiceCheckText(a,p){return a.stat?`${ATTR[a.stat]} ${p.score} · ${chanceText(p.chance)}${p.bonus?' · 成长 +'+p.bonus:''}`:a.cost?'花费资源':'无需检定';}
export function mountDialogue(world,{journal,clear,speak}){
 const el=document.createElement('section');el.id='dialogue-stage';el.hidden=true;el.setAttribute('role','dialog');el.setAttribute('aria-label','人物对白');
 el.innerHTML='<div class="dialogue-letterbox"></div><div class="dialogue-card"><div class="dialogue-meta"><span data-scene></span><span data-progress></span></div><h2 data-speaker></h2><p data-line aria-live="polite"></p><footer><span>空格 / Enter 继续 · Esc 收起对白</span><button data-next>继续 ›</button></footer></div>';document.body.append(el);
 let lines=[],index=0,done=null,previousFocus=null,choosing=false;
 const choices=document.createElement('div');choices.className='cinematic-choices';el.querySelector('.dialogue-card').insertBefore(choices,el.querySelector('footer'));
 const field=name=>el.querySelector(`[data-${name}]`);
 function finish(){if(el.hidden)return;el.hidden=true;choosing=false;el.classList.remove('choosing');choices.replaceChildren();world.cinematic=null;world.speaking=null;world.keys.clear();world.locked=false;document.body.classList.remove('cinematic');const cb=done;done=null;previousFocus?.isConnected&&previousFocus.focus({preventScroll:true});cb?.();}
 function show(){const line=lines[index];if(!line)return finish();
 const next=lines.find((l,i)=>i>index&&l.id!==line.id&&world.npcs.has(l.id));
 const listener=line.listener||next?.id||'player';
 const template=line.shot||(['two','close','shoulder','reaction'][index%4]);
 world.cinematic={speaker:line.id,listener,template,cut:true};world.speaking=line.id;
 field('speaker').textContent=line.narration?'现场':PEOPLE.find(p=>p.id===line.id)?.name||(line.id==='player'?'你':'现场');field('line').textContent=line.text;field('progress').textContent=`${index+1} / ${lines.length}`;field('next').textContent=index===lines.length-1?'听完，继续 ›':'继续 ›';
 journal.add('chat',field('speaker').textContent,line.text);speak(line.text);
 }
 const api={get active(){return !el.hidden;},play(input,onDone,title='临溪 · 对话'){
  if(api.active)finish();lines=dialogueLines(input);index=0;if(!lines.length){onDone?.();return;}
  previousFocus=document.activeElement;clear();done=onDone;world.auto=null;world.keys.clear();world.clearReady();world.locked=true;el.hidden=false;field('scene').textContent=title;document.body.classList.add('cinematic');show();field('next').focus({preventScroll:true});
 },choose({title,listener='shen',options,onSelect,onClose}){
  if(api.active)finish();previousFocus=document.activeElement;choosing=true;done=onClose;el.hidden=false;el.classList.add('choosing');document.body.classList.add('cinematic');world.locked=true;world.keys.clear();world.auto=null;world.clearReady();world.speaking=null;world.cinematic={speaker:'player',listener,template:'choice'};const partner=world.npcs.get(listener)?.actor;if(partner)world.hero.rotation.y=Math.atan2(partner.position.x-world.hero.position.x,partner.position.z-world.hero.position.z);
  field('scene').textContent=title;field('speaker').textContent='你会怎么回应？';field('line').textContent='';field('progress').textContent='选择回应';
  choices.replaceChildren();options.forEach(({action:a,preview:p},i)=>{const b=document.createElement('button');b.dataset.action=a.id;b.dataset.choice=a.id;b.disabled=!!p.blocked;const label=document.createElement('b'),detail=document.createElement('small');label.textContent=`${i+1}. ${a.label}`;detail.textContent=choiceCheckText(a,p)+(a.cost?` · ${a.cost} 文`:'');b.append(label,detail);b.onclick=()=>{if(b.disabled||!choosing)return;done=null;finish();onSelect(a);};choices.append(b);});choices.querySelector('button:not(:disabled)')?.focus({preventScroll:true});
 },finish};
 field('next').onclick=()=>{index++;show();};
 window.addEventListener('keydown',e=>{if(!api.active)return;e.stopImmediatePropagation();if(choosing){if(e.code==='Tab')return;e.preventDefault();if(e.repeat)return;if(e.code==='Escape'){finish();return;}const b=/^Digit[1-3]$/.test(e.code)?choices.children[Number(e.code.slice(-1))-1]:['Enter','Space'].includes(e.code)&&choices.contains(document.activeElement)?document.activeElement:null;b?.click();return;}if(['Space','Enter','KeyE','Escape'].includes(e.code)){e.preventDefault();if(e.repeat)return;if(e.code==='Escape')finish();else{index++;show();}}},true);
 world.dialogue=api;return api;
}
