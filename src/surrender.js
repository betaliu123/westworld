import {conflictCapable,CONFLICT_OFFICERS} from './combat-conflict.js';
import {visibleBetween} from './npc-awareness.js';
import {abandonSurrender} from './complaints.js';
import {turnToward} from './interaction.js';
import {routinePath} from './npc-navigation.js';
import {icon} from './ui-icons.js';

const distance=(a,b)=>a&&b?Math.hypot(a.x-b.x,a.z-b.z):Infinity;
const hostile=n=>n.awareness?.suspect==='player'&&['fight','search','warn','flee'].includes(n.awareness.state);
function disputeFor(s,id){
 const current=s.complaint;
 if(current?.id===id&&!['report'].includes(current.phase))return current;
 const record=s.investigations?.cases.findLast(c=>!c.custody&&c.state!=='closed'&&(c.witnesses.some(w=>w.id===id)||c.reports.some(r=>r.officer===id&&r.kind==='testimony')));
 return record?.dispute||s.people[id]?.awareness?.surrenderDispute||null;
}
export function surrenderCandidates(s,{positions,obstacles=[],player=s.player}){
 if(s.chapterVersion!==2||s.player.hp<=0||s.player.bedRest||['prison','testimony'].includes(s.event?.gate?.phase))return [];
 return Object.entries(positions).filter(([id,q])=>q.visible!==false&&conflictCapable(s,id,true)&&distance(q,player)<=10&&visibleBetween(q,player,obstacles,s.ecosystem?.objects)&&hostile(s.people[id])&&(disputeFor(s,id)||s.people[id].awareness?.wantedCase))
  .sort(([a,qa],[b,qb])=>Number(CONFLICT_OFFICERS.includes(b))-Number(CONFLICT_OFFICERS.includes(a))||distance(qa,player)-distance(qb,player)).map(([id])=>id);
}
export function beginSurrender(sim,context){
 const s=sim.s;if(s.surrender)return {error:'正在停手交涉。'};
 const id=surrenderCandidates(s,context)[0];if(!id)return {error:'附近无人能接应，请靠近对方再投降。'};
 let c=disputeFor(s,id);const a=s.people[id].awareness;
 if(!c){const profile=a.wantedCase;c=a.surrenderDispute={id,type:profile.charges[0]?.code||'assault',severe:true,phase:'conflict',price:0,paid:true,payee:id,attempts:[],witnesses:[id],officers:[],subject:profile.subject,place:{...s.player}};}
 const record=s.investigations?.cases.find(r=>r.id===c.investigationId);
 c.id=id;c.subject=record?.witnesses.find(w=>w.id===id)?.subject||record?.reports.find(r=>r.officer===id&&r.kind==='testimony')?.subject||a.believedIdentity||c.subject;
 c.phase='surrender';c.since=s.npcClock||0;c.voluntary=true;s.complaint=c;
 s.surrender={id,until:(s.npcClock||0)+12,origin:{x:s.player.x,z:s.player.z},participants:Object.entries(context.positions).filter(([k,q])=>hostile(s.people[k])&&conflictCapable(s,k)&&distance(q,context.player||s.player)<=12&&visibleBetween(q,context.player||s.player,context.obstacles||[],s.ecosystem?.objects)).map(([k])=>k)};
 sim.save();return {id,complaint:c};
}
export function surrenderCurrent(s,context){
 const request=s.surrender,c=s.complaint,q=request&&context.positions[request.id];
 return !!request&&c?.id===request.id&&['surrender','ask','pause'].includes(c.phase)&&s.player.hp>0&&conflictCapable(s,request.id,true)&&q&&q.visible!==false&&distance(q,context.player||s.player)<=12&&visibleBetween(q,context.player||s.player,context.obstacles||[],s.ecosystem?.objects)&&distance(request.origin,context.player||s.player)<.8&&(c.phase==='ask'||(s.npcClock||0)<(c.phase==='pause'?c.until:request.until));
}
export function surrenderFrame(world){
 const sim=world.sim,s=sim.s;if(!s.surrender)return;
 const ctx={player:world.hero.position,positions:Object.fromEntries([...world.npcs].map(([id,n])=>[id,n.actor.position])),obstacles:world.obstacles};
 if(!surrenderCurrent(s,ctx)){abandonSurrender(sim);return;}
 const c=s.complaint;
 if(c.phase==='surrender'&&distance(ctx.positions[c.id],ctx.player)<=3.2){c.phase='ask';sim.emit('complaintAsk',c);sim.save();}
}
export function surrenderMotion(world,id,n,dt){
 const s=world.sim.s,request=s.surrender;if(!request?.participants.includes(id))return false;
 if(!conflictCapable(s,id))return false;
 const p=n.actor.position,hero=world.hero.position,receiver=id===request.id&&s.complaint?.phase==='surrender',d=distance(p,hero);
 if(receiver&&d>2.8&&dt>0){
  if(!n.surrenderPath||world.t>(n.surrenderRepath||0)){n.surrenderRepath=world.t+.65;n.surrenderPath=routinePath(p,hero,(x,z)=>world.collides(x,z,0,false),2.6);}
  while(n.surrenderPath?.length&&distance(p,n.surrenderPath[0])<.18)n.surrenderPath.shift();
  const q=n.surrenderPath?.[0];if(q){const dx=q.x-p.x,dz=q.z-p.z,len=Math.hypot(dx,dz)||1,step=Math.min(len,dt*2.4);world.move(n.actor,dx/len*step,dz/len*step);}
  world.animateActor(n.actor,n.surrenderPath?.length?1:0,dt,'');
 }else world.animateActor(n.actor,0,dt,'');
 n.actor.rotation.y=turnToward(n.actor.rotation.y,Math.atan2(hero.x-p.x,hero.z-p.z),dt);
 n.actor.userData.sword.visible=false;return true;
}
export function mountSurrenderHUD(root,{getSim,context,available,onSurrender}){
 const button=document.createElement('button');button.id='surrender-action';button.type='button';button.className='ink-float';button.hidden=true;button.setAttribute('aria-label','投降，停止战斗并接受问责');button.title='G · 投降，停止战斗并接受问责';button.innerHTML=icon('Hand')+'<kbd>G</kbd><span>投降</span>';button.onclick=onSurrender;root.prepend(button);
 return {update(){const s=getSim().s;button.hidden=!available()||!surrenderCandidates(s,context()).length;root.hidden=button.hidden;button.disabled=!!s.surrender;button.querySelector('span').textContent=s.surrender?'交涉中':'投降';}};
}
