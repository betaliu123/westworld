import {believedIdentity,identityName,spreadIdentityRumor} from './appearance.js';
import {visibleBetween} from './npc-awareness.js';
import {routinePath} from './npc-navigation.js';
import {turnToward} from './interaction.js';
import {earnReputation,reputation} from './reputation.js';
import {addCausalDeed} from './item-meaning.js';
import {factionJoinBlock,recordFactionEnrollment} from './faction-discipline.js';
import {meet} from './factions.js';
import {POLICE,recordCrimeScene} from './crime-investigation.js';

const distance=(a,b)=>a&&b?Math.hypot(a.x-b.x,a.z-b.z):Infinity;
const now=s=>s.npcClock||0;
const leaders=['qing','gang_boss','inspector'];
const name=id=>({qing:'林青舟',gang_boss:'梅掌舵',inspector:'顾钦差',fu:'符祥',porter:'周大石'})[id]||identityName(id);
const safe=(s,id)=>{const n=s.people[id];return n?.hp>0&&!n.restraint&&!n.inCustody&&!n.drowning&&!n.burning&&!(n.stunnedUntil>now(s))&&!(n.muteUntil>now(s))&&!(n.sickUntil>(s.ecosystem?.time||0))&&!['sleep','doze','escape','privacy'].includes(n.life?.activity)&&!['fight','warn','flee','search','investigate'].includes(n.awareness?.state);};
const close=(s,a,b,obstacles,r=3)=>distance(a,b)<r&&visibleBetween(a,b,obstacles||[],s.ecosystem?.objects);

// A single convoy has one public aftermath, even if several bundles are taken.
// Frozen witness identities are the only seeds; missing stock alone has no culprit.
export function recordConvoyAftermath(sim,event,item){
 const s=sim.s;if(item?.location!=='player'||!event.witnesses?.length)return null;
 const c=s.convoy,a=c.aftermath??={id:'convoy-heist',place:{x:event.x,z:event.z},at:now(s),known:{},spoken:{},responses:{},invitation:{status:'pending'},nextSpread:now(s)+4};
 for(const id of event.witnesses){const subject=event.identities?.[id];if(subject&&!a.known[id])a.known[id]={subject,source:id,direct:true,at:now(s)};}
 return a;
}
function reactToNews(sim,id,k){
 const s=sim.s,a=s.convoy.aftermath,subject=k.subject,key=a.id+':'+subject;
 if(id==='qing')earnReputation(sim,{city:null,faction:'qingzhu',subject,amount:18,key:key+':qingzhu',reason:'青竹会听闻截取纲货，愿当面结识'});
 if(id==='gang_boss')earnReputation(sim,{city:null,faction:'gang',subject,amount:-8,key:key+':gang',reason:'赤砂帮担忧货路因此受查'});
 if(POLICE.includes(id))earnReputation(sim,{city:null,faction:'court',subject,amount:-20,key:key+':court',reason:'官府收到盗纲指认'});
 if(subject!=='player'&&!k.rumored){spreadIdentityRumor(s,subject,12,'盗取纲货的传闻',id);k.rumored=true;}
 const heard=Object.entries(a.known).filter(([who,k])=>k.subject===subject&&!POLICE.includes(who)&&!['fu','porter'].includes(who));
 if(heard.length>=2)earnReputation(sim,{subject,amount:20,key:key+':renown',reason:'截纲的名声在街坊间传开'});
}
export function shareConvoyNews(sim,from,to,positions,obstacles=[]){
 const s=sim.s,a=s.convoy?.aftermath,k=a?.known[from];
 if(!k||a.known[to]||!safe(s,from)||!safe(s,to)||!close(s,positions[from],positions[to],obstacles))return false;
 a.known[to]={subject:k.subject,source:from,direct:false,at:now(s)};reactToNews(sim,to,a.known[to]);
 addCausalDeed(s,{key:a.id+':heard:'+to,title:'盗纲消息传开',text:name(from)+'当面向'+name(to)+'转述盗纲一事，指称'+identityName(k.subject)+'。',target:to,subject:k.subject,cause:a.id,witnesses:[from,to]});sim.save();return true;
}
export function convoyAftermathFrame(world){
 const sim=world.sim,s=sim.s,c=s.convoy;if(s.chapterVersion!==2||!c||!world.playing||world.locked||world.cinematic||world.performance||world.t<(world.nextConvoyNews||0))return;
 world.nextConvoyNews=world.t+1;
 const positions=Object.fromEntries([...world.npcs].map(([id,n])=>[id,n.actor.position]));
 // Recover witnessed old v2 thefts from their recorded attribution, never from
 // the current face. Preserve old penalties and all existing item ownership.
 if(!c.aftermathRevision){
  c.aftermathRevision=1;const rep=reputation(s);rep.claims??={};for(const subjects of Object.values(c.theftKnown||{}))for(const subject of subjects)rep.claims['convoy-theft:'+subject]=true;
  const item=s.ecosystem?.items.find(i=>i.convoyCargo&&i.location==='player');
  if(item&&c.theftKnown){const witnesses=Object.keys(c.theftKnown),identities=Object.fromEntries(witnesses.map(id=>[id,c.theftKnown[id][0]]));recordConvoyAftermath(sim,{witnesses,identities,x:c.x,z:c.z},item);}
  const stuck=Object.keys(c.theftKnown||{}).filter(id=>s.people[id]?.awareness?.severe);
  if(stuck.length&&!s.investigations?.cases.some(k=>k.convoy)){
   const event={type:'theft',convoy:true,severe:true,owner:'fu',x:c.x,z:c.z,witnesses:stuck,identities:Object.fromEntries(stuck.map(id=>[id,c.theftKnown[id][0]]))};recordCrimeScene(sim,event);
   for(const id of stuck){const r=s.people[id].awareness;if(POLICE.includes(id)&&r.suspect==='player')r.state='fight';else if(['fu','porter'].includes(id)&&r.state==='warn'){r.state='notice';r.until=now(s)+2;}}
  }sim.save();
 }
 const a=c.aftermath;if(!a)return;
 for(const [id,k]of Object.entries(a.known))reactToNews(sim,id,k);
 if(now(s)>=a.nextSpread){
  outer:for(const from of Object.keys(a.known))for(const to of Object.keys(positions))if(from!==to&&shareConvoyNews(sim,from,to,positions,world.obstacles)){a.nextSpread=now(s)+5;break outer;}
 }
 if(s.player.hp<=0||s.player.bedRest||world.combatReady||s.event?.gate?.phase==='prison')return;
 for(const [id,k]of Object.entries(a.known).sort(([a],[b])=>Number(b==='qing')-Number(a==='qing'))){
  if(a.spoken[id]||!safe(s,id)||!close(s,positions[id],world.hero.position,world.obstacles,5))continue;
  const q=positions[id],heading=world.npcs.get(id)?.actor.rotation.y||0,dx=s.player.x-q.x,dz=s.player.z-q.z;
  if(Math.sin(heading)*dx+Math.cos(heading)*dz<0)continue;
  const recognized=believedIdentity(s,id)===k.subject;
  if(id==='qing'&&!recognized)continue;
  const text=id==='qing'?'听说是你截了纲货。我是青竹会林青舟，想同你谈谈入会的事。':id==='gang_boss'?recognized?'这趟纲货是你动的？官府若封路，沿路吃饭的人都得受累。':'纲货一丢，官府怕要查货路。堂里走货得更谨慎了。':POLICE.includes(id)?'纲货失窃，已有指认。知情的人，来当面说明。':'花石纲也有人敢动了。听说是'+(k.subject==='player'?(recognized?'你':'一位江湖客'):identityName(k.subject))+'，这事怕是小不了。';
  if(world.onConvoySpeech?.({id,text})){
   a.spoken[id]=true;
   if(id==='qing'){
    a.invitation.offered=true;a.invitation.subject=k.subject;meet(sim,'qing');
    s.quests??={};s.quests['qingzhu-invitation']??={id:'qingzhu-invitation',title:'青竹来邀',source:'林青舟当面邀约',day:s.day,status:'active',objective:'与林青舟谈谈是否加入青竹会',note:'青竹会听到了盗纲的消息；入会不会撤销官府追查。'};
   }sim.save();break;
  }
 }
}
// A witness delivers news to actual faction members; the inviter then visits
// the reported scene and only follows a suspect he can currently see.
export function convoyAftermathMotion(world,id,n,dt){
 const sim=world.sim,s=sim.s,a=s.convoy?.aftermath;if(!a||!safe(s,id)||s.complaint?.id===id||POLICE.includes(id))return false;
 let goal;const k=a.known[id];if(!k)return false;
 const positions=Object.fromEntries([...world.npcs].map(([key,v])=>[key,v.actor.position]));
 if(id==='qing'&&a.invitation.status==='pending'&&!a.invitation.offered){
  if(['prison','testimony'].includes(s.event?.gate?.phase))return false;
  const sees=close(s,n.actor.position,world.hero.position,world.obstacles,8)&&believedIdentity(s,id)===k.subject&&s.player.hp>0;
  if(sees){a.invitation.lastSeen={x:s.player.x,z:s.player.z};goal=world.hero.position;}
  else goal=a.invitation.lastSeen||a.place;
  if(distance(n.actor.position,goal)<2.4){n.actor.rotation.y=turnToward(n.actor.rotation.y,Math.atan2(goal.x-n.actor.position.x,goal.z-n.actor.position.z),dt);return true;}
 }else if(!leaders.includes(id)){
  // One living eyewitness carries the message. Another can take over if that
  // person is incapacitated; no duplicate instant deliveries.
  const messenger=Object.keys(a.known).find(who=>a.known[who].direct&&!POLICE.includes(who)&&safe(s,who));if(messenger!==id)return false;
  const to=leaders.find(who=>!a.known[who]&&safe(s,who)&&positions[who]);if(!to)return false;
  if(shareConvoyNews(sim,id,to,positions,world.obstacles))return true;goal=positions[to];
 }else return false;
 if(!dt||world.performance)return true;
 if(!n.newsPath||world.t>=(n.newsRepath||0)){n.newsRepath=world.t+1;n.newsPath=routinePath(n.actor.position,goal,(x,z)=>world.collides(x,z,0,false),1.5);}
 while(n.newsPath.length&&distance(n.actor.position,n.newsPath[0])<.2)n.newsPath.shift();
 const q=n.newsPath[0];if(q){const dx=q.x-n.actor.position.x,dz=q.z-n.actor.position.z,d=Math.hypot(dx,dz);n.actor.rotation.y=turnToward(n.actor.rotation.y,Math.atan2(dx,dz),dt);if(d>.01)world.move(n.actor,dx/d*Math.min(d,1.8*dt),dz/d*Math.min(d,1.8*dt));}
 world.animateActor(n.actor,q?1:0,dt,'');return true;
}
export function convoyAftermathOptions(sim,id){
 const s=sim.s,a=s.convoy?.aftermath,k=a?.known[id];if(!k||believedIdentity(s,id)!==k.subject||!safe(s,id))return [];
 const opt=(key,label)=>({id:'ca_'+key,label,mode:'contact',kind:'listen',presentation:'dialogue',story:true});
 if(id==='qing'&&a.invitation.status==='pending')return a.invitation.offered?[opt('join','愿入青竹会，一同做事'),opt('decline','谢过好意，我暂不入会'),opt('later','容我想想，稍后再谈')]:[opt('offer','你找我，有什么事？')];
 if(id==='gang_boss'&&!a.responses[id])return [opt('gang','回应纲货失窃的风声')];
 if(POLICE.includes(id)&&!a.responses[id])return [opt('court','询问官府如何处理盗纲案')];
 return [];
}
export function convoyAftermathPreview(sim,id,action){const reason=action.id==='ca_join'?factionJoinBlock(sim.s,'qingzhu'):null;return {certain:true,chance:reason?0:100,blocked:!!reason,reason};}
export function resolveConvoyAftermath(sim,eco,id,action){
 const s=sim.s,a=s.convoy?.aftermath,choice=convoyAftermathOptions(sim,id).find(x=>x.id===action);
 if(!choice||s.player.hp<=0||!close(s,s.player,eco.positions[id],eco.obstacles,3.5))return {error:'走到对方面前，才能接着谈。'};
 const check=convoyAftermathPreview(sim,id,choice);if(check.blocked)return {error:check.reason};
 let text='',changes=[];const subject=a.known[id].subject;
 if(action==='ca_offer'){meet(sim,id);s.quests??={};s.quests['qingzhu-invitation']??={id:'qingzhu-invitation',title:'青竹来邀',source:'林青舟当面邀约',day:s.day,status:'active',objective:'与林青舟谈谈是否加入青竹会',note:'入会不会撤销官府追查。'};a.invitation.offered=true;a.invitation.subject=subject;text='我林青舟在青竹会护路。听说你截了纲货，想邀你一起做事。入会要守约，不拿无辜脚夫撒气。你愿意么？';}
 if(action==='ca_join'){
  a.invitation.status='accepted';s.facts.career='qingzhu';recordFactionEnrollment(s,'qingzhu');s.facts.factionEnrollments.qingzhu.subject=subject;meet(sim,'qing');
  eco.create('青竹会竹符','personal','player',{discovered:true,material:'wood',badge:'qingzhu',ownerId:'qing'});
  text='好，我替你登记，往后由我与你接洽。这枚竹符收好；官府的案子还在，入会可免不了追查。';changes=['加入青竹会','获得：青竹会竹符'];
 }else if(action==='ca_decline'){a.invitation.status='declined';text='人各有志，我不强求。这趟纲货的风声紧，你自己保重。';}
 else if(action==='ca_later'){a.invitation.offered=true;text='可以，等你想清楚，再来找我。';}
 else if(action==='ca_gang'){a.responses[id]=true;text='纲货的风声我听到了。官府查货，沿路商旅都要受累。赤砂帮往后与你谈事，会多留一分心。';}
 else if(action==='ca_court'){a.responses[id]=true;text='已派人查现场和证言。有人受了伤、货去了何处，都要查；江湖上怎么议论，不能销掉案子。';}
 if(['accepted','declined'].includes(a.invitation.status)&&s.quests?.['qingzhu-invitation'])s.quests['qingzhu-invitation'].status='complete';
 addCausalDeed(s,{key:'convoy-response:'+action,title:choice.label,text,target:id,subject,cause:a.id,witnesses:[id]});
 const r={type:'npc',actionId:action,eventId:'convoy-aftermath:'+action,presentation:'dialogue',handledPresentation:true,kind:'listen',motion:'talk',label:choice.label,check,roll:null,success:true,text,changes,dialogue:[{id:'player',text:choice.label},{id,text}],authored:true,causalRecorded:true};s.history.push(r);sim.emit('result',r);sim.save();return r;
}
