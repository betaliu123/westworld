import {bedFor,homeFor,roomAt,isSleeping} from './night-life.js';
import {visibleBetween} from './npc-awareness.js';
import {jailed,inPrisonCell} from './locations.js';
const distance=(a,b)=>a&&b?Math.hypot(a.x-b.x,a.z-b.z):Infinity;
export function bedOwner(id){return id?.startsWith('bed:')?id.slice(4):null;}
export function bedPreview(sim,id,positions={},obstacles=[]){
 const s=sim.s,p=s.player,owner=bedOwner(id),bed=bedFor(owner),o=s.ecosystem?.objects?.[id];
 const prison=bed?.home==='prison',allowed=prison||owner==='player'||!!s.facts.bedPermissions?.[id];
 let error='';
 if(!bed||o?.hp===0)error='这张床已经不能用了。';
 else if(p.hp<=0||p.drowning||p.burning)error='现在无法安稳休息。';
 else if(!(prison?inPrisonCell(p):roomAt(p)?.id===bed.home)||distance(p,bed)>2.8||!visibleBetween(p,{x:bed.xTarget,z:bed.zTarget},obstacles,s.ecosystem?.objects))error='走到床边，才能躺下。';
 else if(s.people[owner]&&isSleeping(s.people[owner])&&distance(positions[owner]||s.people[owner],{x:bed.xTarget,z:bed.zTarget})<.7)error='床上有人，不能挤上去。';
 else if(Object.entries(s.people).some(([id,n])=>n.hp>0&&!n.restraint&&!(n.stunnedUntil>(s.npcClock||0))&&n.awareness?.caseOpen&&n.awareness?.suspect==='player'&&(!prison||distance(positions[id]||n,p)<5&&visibleBetween(p,positions[id]||n,obstacles,s.ecosystem?.objects))))error='先摆脱眼前的冲突，才能安心躺下。';
 return {bed,owner,allowed,error,warning:allowed?'':'这是别人的床铺。擅自躺下，被看见可能会被叫起、逐客。'};
}
export function beginBedRest(sim,id,positions,obstacles,{untilRelease=false}={}){
 const check=bedPreview(sim,id,positions,obstacles);if(check.error)return check.error;
 if(untilRelease&&(!jailed(sim.s)||check.bed.home!=='prison'))return '只有服刑时才能睡到出狱。';
 const p=sim.s.player;if(p.bedRest)return '已经在歇息了。';
 p.bedRest={bedId:id,phase:'approach',elapsed:0,slept:0,hp:p.hp,party:sim.s.party?.active,unauthorized:!check.allowed,...(untilRelease?{releaseEventId:sim.event.id}:{})};p.stealing=p.crouched=false;sim.save();return null;
}
export function prisonSleepReady(s){const r=s.player.bedRest;return !!r&&jailed(s)&&r.releaseEventId===s.event.id&&r.phase==='sleep'&&r.slept>=1.2&&s.player.hp>0&&!s.player.drowning&&!s.player.burning;}
export function wakePlayer(sim,reason='起身'){const r=sim.s.player.bedRest;if(!r||r.phase==='rise')return false;r.riseFrom=r.phase==='approach'?0:r.phase==='lower'?Math.min(1,r.elapsed/1.8):1;r.phase='rise';r.elapsed=0;r.reason=reason;sim.save();return true;}
// Time and recovery run continuously in Simulation.tick; there is no reward on
// loading, confirming, cancelling, or reaching an animation marker.
export function bedRestStep(sim,eco,dt,positions,obstacles){
 const s=sim.s,p=s.player,r=p.bedRest;if(!r)return;
 const owner=bedOwner(r.bedId),bed=bedFor(owner),h=homeFor(owner)||(bed?.home==='prison'?{id:'prison',residents:[]}:null);
 if(!bed||eco.s.objects[r.bedId]?.hp===0||p.hp<=0||r.party!==s.party?.active){delete p.bedRest;return;}
 if(p.hp<r.hp||p.drowning||p.burning||!(bed.home==='prison'?inPrisonCell(p):roomAt(p)?.id===h.id))wakePlayer(sim,'难以安睡');r.hp=p.hp;
 const near=distance(p,{x:bed.xTarget,z:bed.zTarget})<.5;
 if(r.phase==='approach'&&near){r.phase='lower';r.elapsed=0;}
 else if(r.phase!=='approach'){r.elapsed+=dt;if(r.phase==='lower'&&r.elapsed>=1.8){r.phase='sleep';r.elapsed=0;}else if(r.phase==='sleep'){r.slept+=dt;if(r.slept>=20)wakePlayer(sim,'歇息过后，起身。');}else if(r.phase==='rise'&&r.elapsed>=1.5){delete p.bedRest;sim.save();return;}}
 if(r.phase==='approach'&&!near)return;
 if(!r.unauthorized||r.phase==='rise')return;
 // Only a present owner / resident / innkeeper who sees this use can object.
 for(const id of h.residents){const n=s.people[id],q=positions[id];if(!q||n.hp<=0||isSleeping(n)||n.stunnedUntil>(s.npcClock||0)||n.awareness?.caseOpen||roomAt(q)?.id!==h.id)continue;
  const d=distance(q,p),front=(Math.sin(n.facing||0)*(p.x-q.x)+Math.cos(n.facing||0)*(p.z-q.z))/Math.max(d,.01);
  if(d>4||front<.25||!visibleBetween(q,p,obstacles,eco.s.objects))continue;
  const key=s.day+':'+r.bedId;n.bedUseWitnesses??={};if(!n.bedUseWitnesses[key]){n.bedUseWitnesses[key]=true;sim.relation(id,-2);n.memories.push('亲眼见来客擅用住处的床，叫其起身离开。');}
  n.nightWakeUntil=(s.npcClock||0)+8;n.nightAskedOut=true;n.nightHostTarget={x:h.x,z:h.z+h.d/2-.85};n.life={activity:'host',target:n.nightHostTarget,night:true};
  wakePlayer(sim,'被叫起');if(s.nightVisit?.home===h.id&&!s.nightVisit.warned.includes(id))s.nightVisit.warned.push(id);eco.log('擅用床铺被当场看见，对方叫你起身离开。',[{id,text:id===owner?'这是我的床。请起来，到门外去。':'这张床有人住，请起来。没经允许，不能随便歇在这里。'}]);break;
 }
}
