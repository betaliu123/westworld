import {npcName} from './npc-names.js';
import {currentFace,needsDisguiseCheck,disguisePreview,checkDisguise,applyFace,identityName,disguiseReplies,disguiseObserverBlock} from './appearance.js';
import {disguiseLine} from './disguise-reactions.js';
import {visibleBetween} from './npc-awareness.js';
import {PEOPLE} from './data.js';
import {chooseResponses} from './response-menu.js';
import {confirmIdentityRecognition} from './identity-opportunities.js';
import {REPLY_INTENTS,disguiseReplyApproach,replyRuleNote} from './reply-intent.js';

export const official=id=>['guard','gate_guard','gate_relief','inspector'].includes(id);
export function mountDisguiseEncounter({getSim,world,dialogue,checkReveal,close,log,resume,available,wanted}){
 let due=0;
 const context=()=>({player:world.hero.position,obstacles:world.obstacles,positions:Object.fromEntries([...world.npcs].filter(([,n])=>n.actor.visible!==false).map(([id,n])=>[id,{x:n.actor.position.x,z:n.actor.position.z,facing:n.actor.rotation.y}]))});
 function intercept(id,voluntary=false,onAccepted=null){
  if(wanted?.handles(id))return false;
  const sim=getSim(),s=sim.s,npc=world.npcs.get(id);
  if(!npc||npc.actor.visible===false||disguiseObserverBlock(s,id)||npc.actor.position.distanceTo(world.hero.position)>3.5||!visibleBetween(npc.actor.position,world.hero.position,world.obstacles,s.ecosystem?.objects))return false;
  if(voluntary)npc.actor.rotation.y=Math.atan2(world.hero.position.x-npc.actor.position.x,world.hero.position.z-npc.actor.position.z);
  if(!needsDisguiseCheck(s,id,{context:context()}))return false;
  const check=disguisePreview(s,id,{context:context()}),face=currentFace(s),serial=s.player.face?.serial,explanation=check.mismatch?'只是换身衣裳，今日有些私事。':check.known?'这才几日不见，莫非不认得我了？':'近来的传言不过以讹传讹，怎可当真。';close();world.clearReady();world.auto=null;
  const valid=()=>{const n=world.npcs.get(id),q=n?.actor.position;return getSim()===sim&&s.player.hp>0&&currentFace(s)===face&&s.player.face?.serial===serial&&n?.actor.visible!==false&&q&&q.distanceTo(world.hero.position)<=4&&!disguiseObserverBlock(s,id)&&!['fight','search'].includes(s.people[id]?.awareness?.state)&&visibleBetween(q,world.hero.position,world.obstacles,s.ecosystem?.objects);};
  const n=world.npcs.get(id);if(n)n.actor.rotation.y=Math.atan2(world.hero.position.x-n.actor.position.x,world.hero.position.z-n.actor.position.z);
  const finish=(r,spoken=explanation,typed=false)=>{if(r.error){checkReveal.cancel();log(npcName(s,id),r.error);return;}const resolved=r.check||check,line=disguiseLine(id,r.success?'success':resolved.original?'original':'failure',resolved,s);log(npcName(s,id),`${r.success?'盘问通过':'易容被识破'}${r.roll==null?'':` · ${r.roll} / ${r.check.chance}`} · ${r.reason}`);
   const reply=()=>dialogue.play([{id:'player',text:spoken,...(typed?{verbatim:true,noVoice:true}:{})},{id,text:line}],cancelled=>{checkReveal.cancel();world.quietUntil=world.t+6;if(!cancelled&&r.success){confirmIdentityRecognition(sim,id);if(onAccepted)onAccepted();else resume(id);}},'身份盘问');
   if(r.roll!=null){reply();checkReveal.play({...r,stat:'charm',changes:[]},()=>{});}
   else {checkReveal.cancel();dialogue.play([{id,text:line}],()=>{world.quietUntil=world.t+6;},'身份识破');}
  };
  if(check.original||check.certain){finish(checkDisguise(sim,id,{context:context()}));return true;}
  const question=disguiseLine(id,'question',check);
  const prepare=intent=>{if(!valid()||!Object.hasOwn(REPLY_INTENTS,intent))return null;const approach=disguiseReplyApproach(s,intent),preview=disguisePreview(s,id,{force:true,approach,context:context()});if(!preview)return null;return {intent,approach,action:{id:'explain:'+approach,label:'说出自己的辩解',stat:'charm'},preview:preview.certain?{...preview,blocked:true}:preview,note:replyRuleNote(intent,approach)};};
  const showChoices=()=>chooseResponses(dialogue,{title:npcName(s,id),listener:id,context:{id,text:question},getOptions:()=>!valid()?[]:[
   ...(s.chapterVersion===2?[{action:{id:'typed',label:'自己编一句'},preview:{certain:true}}]:[]),
   ...disguiseReplies(s,id).map(r=>({action:{id:'explain:'+r.id,label:r.label,stat:'charm'},preview:disguisePreview(s,id,{force:true,approach:r.id,context:context()})})),
   {action:{id:'admit',label:'【易容中】不再掩饰，卸去易容。'},preview:{certain:true}},
   {action:{id:'leave',label:'先告辞。'},preview:{certain:true}}
  ],onClose:close,onSelect:a=>{if(a.id==='leave'){close();due=world.t+8;return;}
   if(!valid()){close();return;}
   if(a.id==='typed'){dialogue.compose({title:npcName(s,id),listener:id,context:{id,text:question},prepare,onBack:showChoices,onClose:close,onCommit:r=>{const fresh=prepare(r.intent);if(!fresh||fresh.preview.blocked){close();return;}checkReveal.start(fresh.action,fresh.preview);finish(checkDisguise(sim,id,{approach:fresh.approach,context:context()}),r.text,true);}});return;}
   if(a.id==='admit'){applyFace(sim,'player');dialogue.play([{id:'player',text:'只是借个模样行路，唐突了。'},{id,text:'行走江湖，还是用自己的面目好。'}],()=>close(),'');return;}
   const approach=a.id.slice('explain:'.length),chosen=disguiseReplies(s,id).find(r=>r.id===approach),preview=disguisePreview(s,id,{force:true,approach,context:context()});if(!chosen||!preview||preview.blocked){close();return;}if(!preview.certain)checkReveal.start(a,preview);finish(checkDisguise(sim,id,{approach,context:context()}),chosen.text);}});
  dialogue.play([{id,text:question}],cancelled=>{if(!cancelled)showChoices();},'');return true;
 }
 return {intercept,update(){if(world.t<due||!available())return;due=world.t+2;const s=getSim().s,face=currentFace(s);if(face==='player')return;
  for(const [id,n]of [...world.npcs].sort(([a],[b])=>Number(b===face)-Number(a===face))){const p=s.people[id];if(!n.actor.visible||disguiseObserverBlock(s,id)||p.life?.night||n.actor.position.distanceTo(world.hero.position)>3.3)continue;
   const dx=world.hero.position.x-n.actor.position.x,dz=world.hero.position.z-n.actor.position.z,d=Math.hypot(dx,dz);if(d>.1&&(Math.sin(n.actor.rotation.y)*dx+Math.cos(n.actor.rotation.y)*dz)/d<.35)continue;
   if(!visibleBetween(n.actor.position,world.hero.position,world.obstacles,s.ecosystem?.objects))continue;if(intercept(id)){due=world.t+15;break;}}
 }};
}
