import {believedIdentity,currentFace} from './appearance.js';
import {caseBook,POLICE,investigationReady,investigationActive,inInvestigationArea,expireInvestigations,noticeInvestigations,acceptCrimeReport,discoverBodies,discoverMissingProperty,investigationRisk,investigationSignature,investigationContext,investigationCanAsk,investigationQuestion,investigationReplies,answerInvestigation} from './crime-investigation.js';
import {visibleBetween} from './npc-awareness.js';
import {routinePath} from './npc-navigation.js';
import {turnToward} from './interaction.js';

export function investigationMotion(world,id,n,dt){
 const sim=world.sim,s=sim.s;if(s.chapterVersion!==2)return false;expireInvestigations(sim);
 if(!investigationReady(s,id)||['fight','warn','flee'].includes(s.people[id].awareness?.state)||s.complaint?.id===id)return false;
 const now=s.npcClock||0,b=caseBook(s),positions=Object.fromEntries([...world.npcs].map(([id,n])=>[id,n.actor.position]));
 let c=b.cases.find(c=>c.assigned===id&&['enroute','search'].includes(c.state)),goal;
 if(!c&&POLICE.includes(id)){
  const escaped=b.cases.find(c=>c.immediate&&c.state==='unreported'&&now-c.lastAt>20&&c.witnesses.some(w=>w.id===id));
  if(escaped){acceptCrimeReport(sim,{caseId:escaped.id,reporter:id,officer:id});c=escaped;}
 }
 if(c){
  const p=n.actor.position,d=Math.hypot(p.x-c.place.x,p.z-c.place.z);
  if(c.state==='enroute'&&d<1.8&&visibleBetween(p,c.place,world.obstacles,s.ecosystem?.objects)){c.state='search';c.searchAt=now;sim.emit('npcRoutine',{id,text:'就在这附近。留意脚下，也问问附近的人。'});sim.save();}
  goal=c.place;
  if(c.state==='search'){
   const index=Math.floor((now-c.searchAt)/5)%4,offset=[[0,0],[2,0],[0,2],[-2,0]][index];goal={x:c.place.x+offset[0],z:c.place.z+offset[1]};
   const hero=world.hero.position,near=hero.distanceTo(n.actor.position)<5&&inInvestigationArea(c,hero)&&visibleBetween(p,hero,world.obstacles,s.ecosystem?.objects);
   const key=id+':'+investigationSignature(s),risk=investigationRisk(s,c,id);
   const testimony=c.reports.find(r=>r.officer===id&&r.kind==='testimony'&&r.subject===believedIdentity(s,id));
   if(near&&c.convoy&&c.severe&&testimony){
    s.people[id].awareness={home:{x:n.base?.x??p.x,z:n.base?.z??p.z},state:'fight',caseOpen:true,severe:true,suspect:'player',believedIdentity:testimony.subject,appearanceSerial:currentFace(s)==='player'?0:s.player.face.serial,lastKnown:{x:hero.x,z:hero.z},seen:true,until:now+20,lastIncident:now};
    c.state='pursuing';sim.emit('npcRoutine',{id,text:'有人当面指认你动了纲货。放下兵刃，随我去县狱！'});sim.save();return false;
   }
   if(near){c.linger[key]??=now;if(now>=c.nextAsk&&now-(c.linger[key]||0)>(risk.score>=25?2:8)&&investigationCanAsk(s,c,id)){goal=hero;if(hero.distanceTo(p)<3.1&&world.onInvestigation?.(c,id))c.nextAsk=now+15;}}else delete c.linger[key];
  }
 }else{
  c=b.cases.find(c=>!c.immediate&&c.state==='unreported'&&now-c.lastAt>12&&(c.discoverer===id||c.witnesses.some(w=>w.id===id))&&!c.reports.some(r=>r.reporter===id));
  if(!c||POLICE.includes(id))return false;
  const officer=POLICE.filter(k=>positions[k]&&investigationReady(s,k)&&!['fight','warn','flee'].includes(s.people[k].awareness?.state)&&!b.cases.some(c=>c.assigned===k&&['enroute','search'].includes(c.state))).sort((a,b)=>n.actor.position.distanceTo(positions[a])-n.actor.position.distanceTo(positions[b]))[0];
  if(!officer||!positions[officer])return false;goal=positions[officer];
  if(n.actor.position.distanceTo(goal)<2.4&&visibleBetween(n.actor.position,goal,world.obstacles,s.ecosystem?.objects)){acceptCrimeReport(sim,{caseId:c.id,reporter:id,officer});return true;}
 }
 if(!dt||world.performance)return true;
 if(!n.inquiryPath||world.t>=(n.inquiryRepath||0)){n.inquiryRepath=world.t+.8;n.inquiryPath=routinePath(n.actor.position,goal,(x,z)=>world.collides(x,z,0,false),.8);}
 while(n.inquiryPath.length&&n.actor.position.distanceTo({x:n.inquiryPath[0].x,y:0,z:n.inquiryPath[0].z})<.18)n.inquiryPath.shift();
 const q=n.inquiryPath[0];if(q){const dx=q.x-n.actor.position.x,dz=q.z-n.actor.position.z,d=Math.hypot(dx,dz);n.actor.rotation.y=turnToward(n.actor.rotation.y,Math.atan2(dx,dz),dt);if(d>.01)world.move(n.actor,dx/d*Math.min(d,2.6*dt),dz/d*Math.min(d,2.6*dt));}
 world.animateActor(n.actor,q?1:0,dt,'');return true;
}
export function investigationFrame(world){
 expireInvestigations(world.sim);
 if(world.sim.s.chapterVersion!==2||!world.playing||world.locked||world.cinematic||world.t<(world.nextBodyScan||0))return;
 world.nextBodyScan=world.t+1;const positions=Object.fromEntries([...world.npcs].map(([id,n])=>[id,{x:n.actor.position.x,z:n.actor.position.z,facing:n.actor.rotation.y}]));
 discoverBodies(world.sim,positions,world.obstacles);discoverMissingProperty(world.sim,positions,world.obstacles);noticeInvestigations(world.sim,positions,world.obstacles);
}
export function mountInvestigation({getSim,world,dialogue,checkReveal,available,close,log,wanted}){
 world.onInvestigation=(c,id)=>{
  if(available()&&wanted?.handles(id)){wanted.intercept(id);return true;}
  if(!available())return false;const sim=getSim();if(!investigationActive(sim.s,c)||!inInvestigationArea(c,sim.s.player)||!investigationCanAsk(sim.s,c,id))return false;
  const key=investigationSignature(sim.s),context=investigationContext(sim.s,c,id);c.playerNoticed=true;close();world.clearReady();world.auto=null;
  const question=investigationQuestion(sim.s,c,id);
  c.question={id,key};
  const cancel=()=>{c.question=null;c.nextAsk=(sim.s.npcClock||0)+15;close();sim.save();};
  const stillCurrent=()=>getSim()===sim&&key===investigationSignature(sim.s)&&context===investigationContext(sim.s,c,id);
  dialogue.play([{id,text:question}],cancelled=>{if(cancelled||!stillCurrent()){cancel();return;}dialogue.choose({title:'事发地盘查',listener:id,context:{id,text:question},options:investigationReplies(sim,c,id),onClose:cancel,onSelect:a=>{
   if(!stillCurrent()){cancel();return;}
   const option=investigationReplies(sim,c,id).find(e=>e.action.id===a.id);if(!option){cancel();return;}if(a.stat)checkReveal.start(a,option.preview);
   const r=answerInvestigation(sim,c.id,id,a.id,Object.fromEntries([...world.npcs].map(([id,n])=>[id,n.actor.position])),world.obstacles);if(r.error){checkReveal.cancel();cancel();return;}
   log(r.text);dialogue.play(r.dialogue,()=>{checkReveal.cancel();close();},'事发地盘查');if(r.roll!==null)checkReveal.play(r,()=>{});
  }});},'');return true;
 };
}
