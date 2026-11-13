import {currentFace,identityName,identityFamiliar,disguiseObserverBlock} from './appearance.js';
import {visibleBetween} from './npc-awareness.js';
import {addCausalDeed} from './item-meaning.js';
import {routinePath} from './npc-navigation.js';
import {turnToward} from './interaction.js';

const distance=(a,b)=>a&&b?Math.hypot(a.x-b.x,a.z-b.z):Infinity;
const clock=s=>s.npcClock||0;
const state=s=>s.identityConsequences??={done:{},active:null,nextAt:0};
const clear=(s,a,b,obstacles)=>!!a&&!!b&&a.visible!==false&&b.visible!==false&&visibleBetween(a,b,obstacles,s.ecosystem?.objects);
function available(s,id){
 const n=s.people[id];return !disguiseObserverBlock(s,id)&&!n.concern&&!n.fear&&!n.burning&&
  !(n.sickUntil>(s.ecosystem?.time||0))&&!n.awareness?.caseOpen&&
  !['fight','warn','flee','search','investigate'].includes(n.awareness?.state)&&
  !['escape','privacy','escort','relieve'].includes(n.life?.activity)&&
  !s.deck?.actions?.active?.members?.includes(id)&&s.complaint?.id!==id;
}
function sees(s,id,a,b,obstacles,radius=8){
 if(distance(a,b)>radius||!clear(s,a,b,obstacles))return false;
 const facing=a.facing??s.people[id]?.facing;
 return !Number.isFinite(facing)||Math.sin(facing)*(b.x-a.x)+Math.cos(facing)*(b.z-a.z)>=0;
}
// Project only frozen witness knowledge. Never infer a culprit from today's face.
export function attributionLines(deed){
 return (deed.witnesses||[]).flatMap(id=>{
  const subject=deed.identities?.[id];if(!subject)return [];
  return [subject==='player'?identityName(id)+'认出是你。':identityName(id)+'以为是'+identityName(subject)+'干的。'];
 });
}
function usable(s,e,positions,obstacles){
 const a=positions[e.observer],b=positions[e.subject];
 if(!available(s,e.observer)||!available(s,e.subject)||!clear(s,a,b,obstacles)||distance(a,b)>10)return false;
 const change=s.appearance?.observedChanges?.[e.observer];
 if(e.serial&&(s.appearance?.exposed?.[e.observer]===e.serial||change?.fromSerial===e.serial))return false;
 // Seeing both faces is a live contradiction, not permission to rewrite history.
 if(currentFace(s)===e.subject&&sees(s,e.observer,a,s.player,obstacles))return false;
 return true;
}
function observable(s,e,positions,obstacles){
 return s.player.hp>0&&!s.player.bedRest&&[e.observer,e.subject].every(id=>distance(s.player,positions[id])<=10&&clear(s,s.player,positions[id],obstacles));
}
export function identityConsequenceCandidate(s,positions,obstacles=[]){
 if(s.chapterVersion!==2)return null;
 const done=s.identityConsequences?.done||{};
 for(const d of s.chronicle?.deeds||[]){
  const observer='tea_host',subject=d.identities?.[observer],key=d.id+':'+observer+':'+subject;
  if(d.valence!=='crime'||!d.witnesses?.includes(observer)||!subject||subject==='player'||subject===observer||
   done[key]===true||!identityFamiliar(s,observer,subject)||!['theft','tamper','damage','assault'].includes(d.incidentType))continue;
  const e={key,cause:d.id,observer,subject,type:d.incidentType,serial:d.identitySerials?.[observer],step:0};
  if(usable(s,e,positions,obstacles)&&sees(s,observer,positions[observer],positions[subject],obstacles))return e;
 }
 return null;
}
export function identityConsequenceLine(e){
 const accusation={theft:'伸手拿东西',tamper:'动人家的吃喝',damage:'砸坏东西',assault:'动手伤人'}[e.type];
 return [
  {id:e.observer,text:identityName(e.subject)+'！我亲眼见你'+accusation+'，还当没事人？'},
  {id:e.subject,text:'你说我？这事我没做过。你把地方、时辰说清楚，咱们对一对。'},
  {id:e.observer,text:'这张脸我还认不出？事情没说清，今日别指望我再给你续茶。'}
 ][e.step]||null;
}
// Commit only when the local bubble is actually shown; canceled queues do not
// consume a line. This never repeats the original relation/reputation penalty.
export function identityConsequenceSpoken(sim,key,step){
 const s=sim.s,e=s.identityConsequences?.active;if(!e||e.key!==key||e.step!==step)return false;
 if(step===0){
  addCausalDeed(s,{key:'mistaken-confrontation:'+key,cause:e.cause,title:'认错了人',
   text:identityName(e.observer)+'以为是'+identityName(e.subject)+'干的，当面拦住本人责问。',target:e.subject,subject:e.subject});
  const n=s.people[e.subject];n.memories??=[];n.memories.push(identityName(e.observer)+'为一件自己没做过的事当面责问。');n.memories=n.memories.slice(-12);
 }
 if(step===2){
  const host=s.people[e.observer];host.teaRefusals??={};host.teaRefusals[e.subject]={cause:e.cause,day:s.day};
  addCausalDeed(s,{key:'mistaken-refusal:'+key,cause:e.cause,title:'一盏茶的冷脸',
   text:identityName(e.subject)+'否认此事，'+identityName(e.observer)+'仍不信，今日不再替本人续茶。',target:e.subject,subject:e.subject});
 }
 e.step++;state(s).done[key]={step:e.step};e.until=clock(s)+6.8;sim.save();return true;
}
export function identityConsequenceStep(sim,positions,obstacles=[],{blocked=false,say=()=>false}={}){
 const s=sim.s;if(s.chapterVersion!==2)return;
 const c=state(s);if(blocked)return;
 let e=c.active;
 if(e&&(!usable(s,e,positions,obstacles)||!observable(s,e,positions,obstacles))){c.active=null;c.nextAt=clock(s)+4;sim.save();return;}
 if(!e){
  if(clock(s)<c.nextAt)return;
  e=identityConsequenceCandidate(s,positions,obstacles);if(!e||!observable(s,e,positions,obstacles))return;
  // Partial delivery survives an interruption/reload without replaying lines.
  e.step=c.done[e.key]?.step||0;e.started=clock(s);c.active=e;sim.save();
 }
 if(e.step>=3){if(clock(s)<e.until)return;c.done[e.key]=true;c.active=null;c.nextAt=clock(s)+18;sim.save();return;}
 if(clock(s)-e.started>45){c.active=null;c.nextAt=clock(s)+12;sim.save();return;}
 if(clock(s)<(e.until||0))return;
 // No teleport or infinite stationary lock if furniture blocks the approach.
 if(distance(positions[e.observer],positions[e.subject])>2.5){
  if(clock(s)-e.started>15){c.active=null;c.nextAt=clock(s)+12;sim.save();}return;
 }
 const line=identityConsequenceLine(e);
 if(say({...line,identityConsequence:e.key,consequenceStep:e.step}))e.until=clock(s)+.5;
}
export function identityConsequenceSpeechValid(world,line){
 const s=world.sim.s,e=s.identityConsequences?.active;
 return !!e&&e.key===line.identityConsequence&&e.step===line.consequenceStep&&
  usable(s,e,scenePositions(world),world.obstacles)&&observable(s,e,scenePositions(world),world.obstacles)&&!world.locked&&!world.cinematic&&!world.performance&&!world.combatReady;
}
function scenePositions(world){return Object.fromEntries([...world.npcs].map(([id,n])=>[id,{x:n.actor.position.x,z:n.actor.position.z,facing:n.actor.rotation.y,visible:n.actor.visible}]));}
export function identityConsequenceFrame(world){
 if(!world.playing)return;
 identityConsequenceStep(world.sim,scenePositions(world),world.obstacles,{
  blocked:world.locked||!!world.cinematic||!!world.performance||!!world.trainingActor||world.combatReady||!!world.sim.s.complaint,
  say:line=>world.onIdentityConsequenceSpeech?.(line)||false});
}
export function identityConsequenceMotion(world,id,n,dt){
 const s=world.sim.s,e=s.identityConsequences?.active;
 if(!e||![e.observer,e.subject].includes(id)||!usable(s,e,scenePositions(world),world.obstacles)||world.cinematic)return false;
 if(world.locked||world.performance||world.combatReady)dt=0;
 const actor=n.actor,other=world.npcs.get(id===e.observer?e.subject:e.observer)?.actor;
 if(!other)return false;
 const goal=other.position,d=distance(actor.position,goal),before={x:actor.position.x,z:actor.position.z};
 if(id===e.observer&&d>2.1&&dt){
  if(!n.identityPath||world.t>=(n.identityRepath||0)){n.identityRepath=world.t+.7;n.identityPath=routinePath(actor.position,goal,(x,z)=>world.collides(x,z,0,false),1.9);}
  while(n.identityPath.length&&distance(actor.position,n.identityPath[0])<.16)n.identityPath.shift();
  const q=n.identityPath[0];if(q){const len=distance(actor.position,q),step=Math.min(len,dt*1.8,d-2.1);if(len>.01)world.move(actor,(q.x-actor.position.x)/len*step,(q.z-actor.position.z)/len*step);}
 }
 actor.rotation.y=turnToward(actor.rotation.y,Math.atan2(goal.x-actor.position.x,goal.z-actor.position.z),dt);
 world.animateActor(actor,dt?distance(actor.position,before)/dt/2:0,dt,world.speaking===id?'talk':'');
 if(id===e.observer&&world.speaking===id)actor.userData.arms[0].rotation.x=-1.1;
 for(const prop of [n.heldFood,n.heldCup,n.heldKettle])if(prop)prop.visible=false;
 n.label.visible=!world.locked&&distance(actor.position,world.hero.position)<7;
 s.people[id].facing=actor.rotation.y;return true;
}
