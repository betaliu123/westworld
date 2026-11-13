import {wantedProfile,LAW_OFFICERS} from './wanted-records.js';
import {activeConflict} from './combat-conflict.js';
import {currentFace,disguiseObserverBlock,checkDisguise,originalInSight} from './appearance.js';
import {abilityCheck,resolveAbilityCheck} from './ability-check.js';
import {visibleBetween} from './npc-awareness.js';
import {detainByOfficer} from './gate-scene.js';
import {addCausalDeed} from './item-meaning.js';
import {chooseResponses} from './response-menu.js';
import {REPLY_INTENTS,replyRuleNote,replyText,validReply} from './reply-intent.js';

const now=s=>s.npcClock||0;
const memory=(s,p)=>s.law?.interviews?.[p.key];
export function wantedContact(s,id,context){
 const q=context.positions?.[id],p=context.player||s.player;
 return LAW_OFFICERS.includes(id)&&s.player.hp>0&&!disguiseObserverBlock(s,id)&&q&&q.visible!==false&&Math.hypot(q.x-p.x,q.z-p.z)<=3.5&&visibleBetween(q,p,context.obstacles||[],s.ecosystem?.objects)&&!['prison','testimony'].includes(s.event?.gate?.phase);
}
export function wantedQuestion(profile){return (profile.direct?'方才的事我亲眼看见了。':profile.subject==='player'?'有人指认你涉案。':`你这面貌像${profile.name}。`)+`${profile.detail}。案由是${profile.chargeText}，须随我到案核问。`;}
export function wantedPreview(s,profile){return abilityCheck(s.player,{stat:'charm',skillId:'disguise',difficulty:18,reason:profile.direct?'这名官差亲眼目击，不能以认错人搪塞。':''});}
export function wantedReplies(s,profile){
 const previous=memory(s,profile),entries=[];
 if(!previous)entries.push({action:{id:'deny',label:'狡辩：不是我，你认错人了',stat:'charm'},preview:wantedPreview(s,profile)});
 entries.push({action:{id:'submit',label:'放下兵刃，随官差到案核问'},preview:{certain:true}},{action:{id:'flee',label:'拒绝到案，设法脱身'},preview:{certain:true}});return entries;
}
export function startWantedPursuit(sim,id,profile,context){
 const s=sim.s,n=s.people[id],q=context.positions[id],p=context.player||s.player;
 n.awareness={...n.awareness,home:n.awareness?.home||{x:q.x,z:q.z},state:'fight',caseOpen:true,severe:true,suspect:'player',believedIdentity:profile.subject,appearanceSerial:currentFace(s)==='player'?0:s.player.face.serial,lastKnown:{x:p.x,z:p.z},seen:true,until:now(s)+20,lastIncident:now(s),wantedCase:profile};
}
export function answerWanted(sim,id,choice,context,expectedKey,typed){
 const s=sim.s,profile=wantedProfile(s,id);
 if(!profile||expectedKey&&profile.key!==expectedKey||!wantedContact(s,id,context))return {error:'身份、案情或现场已改变，问话中止。'};
 if(!wantedReplies(s,profile).some(e=>e.action.id===choice))return {error:'同一通缉案由已经回应过。'};
 if(typed&&(choice!=='deny'||!Object.hasOwn(REPLY_INTENTS,typed.intent)||!validReply(typed.text)))return {error:'这句尚无可用说法。'};
 if(choice==='submit'){
  if(!detainByOfficer(sim,id,profile))return {error:'眼下无法收押。'};
  return {success:true,roll:null,profile,detained:true,text:`已按${profile.name}的口供身份，因${profile.chargeText}收押核验。`};
 }
 const check=choice==='deny'?wantedPreview(s,profile):null;if(check?.blocked)return {error:check.reason};
 const r=choice==='deny'?resolveAbilityCheck(check,sim.rng):{roll:null,success:false};
 s.law??={};s.law.interviews??={};s.law.interviews[profile.key]={choice,success:r.success,at:now(s),...(typed?{intent:typed.intent,text:replyText(typed.text)}:{})};
 if(!r.success)startWantedPursuit(sim,id,profile,context);
 const text=r.success?'官差暂且接受这番解释，通缉案与原证言仍保留。':`官差不再放行，按${profile.chargeText}追捕眼前的人。`;
 const spoken=typed?replyText(typed.text):choice==='flee'?'我不随你走。':'不是我，你认错人了。请把人和案情核对清楚。';
 const reply=r.success?(typed?'先记下你的说法，案情还要核实。':'有认错的可能。先记下你的说法，案子仍要查。'):`这桩${profile.chargeText}尚未核清，站住，随我到案！`;
 addCausalDeed(s,{key:'wanted:'+profile.key+':'+choice,title:'回应通缉盘问',text,target:id,subject:profile.subject,witnesses:[id]});sim.save();
 return {...r,check,profile,text,label:'通缉身份盘问',changes:[],dialogue:[{id:'player',text:spoken,...(typed?{verbatim:true,noVoice:true}:{})},{id,text:reply}]};
}

export function mountWantedEncounter({getSim,world,dialogue,checkReveal,close,log,available}){
 let due=0;
 const context=()=>({player:world.hero.position,obstacles:world.obstacles,positions:Object.fromEntries([...world.npcs].map(([id,n])=>[id,{x:n.actor.position.x,z:n.actor.position.z,facing:n.actor.rotation.y,visible:n.actor.visible}]))});
 function intercept(id,voluntary=false){
  const sim=getSim(),s=sim.s,ctx=context();if(!wantedContact(s,id,ctx)||!voluntary&&activeConflict(s,ctx.positions))return false;
  const mask=wantedProfile(s,id,{appearance:true}),observed=s.appearance?.observedChanges?.[id];
  if(mask&&currentFace(s)!=='player'&&(s.appearance?.exposed?.[id]===s.player.face?.serial||originalInSight(s,id,ctx))){
   const seenChange=observed?.serial===s.player.face?.serial&&observed?.to===mask.subject;
   close();const r=checkDisguise(sim,id,{context:ctx});if(r.error)return false;
   const line=seenChange?`我亲眼看见你换了面貌。${mask.name}因${mask.chargeText}在案，这副假面不能把你变成案中人。先用本来面目说话。`:`这不是${mask.name}本人。${mask.chargeText}的案情与冒名之事，须分别核对。`;
   log(line);dialogue.play([{id,text:line}],()=>{due=world.t+2;},'当面识破');return true;
  }
  const profile=wantedProfile(s,id);if(!profile)return false;
  const previous=memory(s,profile);if(previous?.success)return !voluntary;
  if(previous&&!voluntary){if(!['fight','search'].includes(s.people[id].awareness?.state)){startWantedPursuit(sim,id,profile,ctx);sim.save();}return true;}
  close();world.clearReady();world.auto=null;const serial=s.player.face?.serial||0,question=wantedQuestion(profile);
  const valid=()=>getSim()===sim&&(s.player.face?.serial||0)===serial&&wantedProfile(s,id)?.key===profile.key&&wantedContact(s,id,context());
  const cancel=()=>{due=world.t+8;close();};
  const prepare=intent=>{if(!valid()||memory(s,profile)||!Object.hasOwn(REPLY_INTENTS,intent))return null;return {intent,action:{id:'deny',label:'说出自己的辩解',stat:'charm'},preview:wantedPreview(s,wantedProfile(s,id)),note:intent==='weakness'?'仍须按案情核问':replyRuleNote(intent,'deny')};};
  const showResult=r=>{if(r.error){checkReveal.cancel();log(r.error);cancel();return;}log(r.text);dialogue.play(r.dialogue,()=>{checkReveal.cancel();due=world.t+8;close();},'通缉身份盘问');if(r.roll!==null)checkReveal.play(r,()=>{});};
  const showChoices=()=>chooseResponses(dialogue,{title:'通缉身份盘问',listener:id,context:{id,text:question},getOptions:()=>!valid()?[]:wantedReplies(s,wantedProfile(s,id)).map(entry=>entry.action.id==='deny'&&s.chapterVersion===2&&!entry.preview.blocked?{action:{id:'deny',label:'试着辩解',children:[{action:{id:'typed',label:'自己编一句'},preview:{certain:true}},entry]},preview:{certain:true}}:entry),onClose:cancel,onSelect:a=>{
    if(!valid()){cancel();return;}
    if(a.id==='typed'){dialogue.compose({title:'通缉身份盘问',listener:id,context:{id,text:question},prepare,onBack:showChoices,onClose:cancel,onCommit:r=>{const fresh=prepare(r.intent);if(!fresh||fresh.preview.blocked){cancel();return;}checkReveal.start(fresh.action,fresh.preview);showResult(answerWanted(sim,id,'deny',context(),profile.key,{intent:r.intent,text:r.text}));}});return;}
    if(a.id==='submit'){
     dialogue.play([{id:'player',text:'我愿随你到案，把身份和这桩案子核对清楚。'},{id,text:`先按${profile.chargeText}收押核验，口供身份另记。`}],cancelled=>{
      if(cancelled||!valid()){cancel();return;}const r=answerWanted(sim,id,'submit',context(),profile.key);if(r.error)log(r.error);else{world.clearReady();world.syncEvent();log(r.text);}close();
     },'到案');return;
    }
    if(a.id==='deny'){const preview=wantedPreview(s,wantedProfile(s,id));if(preview.blocked){log(preview.reason);cancel();return;}checkReveal.start(a,preview);}
    showResult(answerWanted(sim,id,a.id,context(),profile.key));
   }});
  dialogue.play([{id,text:question}],cancelled=>{if(cancelled||!valid()){cancel();return;}showChoices();},'');return true;
 }
 return {intercept,handles:id=>!!wantedProfile(getSim().s,id)||!!wantedProfile(getSim().s,id,{appearance:true}),update(){
  if(world.t<due||!available())return;due=world.t+.8;
  const s=getSim().s,ctx=context();for(const id of LAW_OFFICERS){const q=ctx.positions[id];if(!q||!wantedContact(s,id,ctx))continue;
   const dx=ctx.player.x-q.x,dz=ctx.player.z-q.z,d=Math.hypot(dx,dz);if(d>.1&&(Math.sin(q.facing)*dx+Math.cos(q.facing)*dz)/d<.35)continue;
   if(intercept(id))break;
  }
 }};
}
