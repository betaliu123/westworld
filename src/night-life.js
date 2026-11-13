import {PEOPLE} from './data.js';
import {visibleBetween} from './npc-awareness.js';
import {fixedPost,convoyTravelling} from './npc-posts.js';
import {QINGHE_RIVERSIDE} from './locations.js';

// Original schedules, inspired by the time-window / home-link structure in KCD2.
// All deadlines use the persistent NPC clock; clock jumps select a new intention,
// never teleport a person or regenerate possessions.
export const hourOf=s=>((6+(s.time||0)/10)%24+24)%24;
export const nightTime=s=>hourOf(s)>=19||hourOf(s)<6;
const distance=(a,b)=>a&&b?Math.hypot(a.x-b.x,a.z-b.z):Infinity;
export const HOMES=[
 {id:'inn',name:'听雨楼',x:-11,z:-12,w:7,d:6,residents:['inn','gao','su','traveler'],public:true},
 {id:'clinic',name:'回春堂',x:12,z:-13,w:6,d:5,residents:['tea','elder']},
 {id:'bookshop',name:'墨香斋',x:-12,z:3,w:5,d:5,residents:['bookseller']},
 {id:'lodging',name:'云来客栈',x:13,z:5,w:5,d:5,residents:['merchant','chi','matchmaker'],public:true},
 {id:'riverside',name:'临溪人家',x:-10,z:21,w:6,d:4,residents:['relay','tea_host','old_constable']},
 {id:'bamboo',name:'青竹会',x:11,z:21,w:6,d:4,residents:['qing','shen','gate_merchant']},
 {id:'office',name:'镇公所',x:0,z:-23,w:8,d:5,residents:['inspector','scribe']},
 {id:'redhouse',name:'绛云楼',x:22,z:5,w:6.7,d:6,residents:['mei']},
];
export const homeFor=id=>HOMES.find(h=>h.residents.includes(id));
export function roomAt(q){return HOMES.find(h=>Math.abs(q.x-h.x)<h.w/2-.18&&Math.abs(q.z-h.z)<h.d/2-.18)||null;}
export const doorId=h=>`house:${h.x}:${h.z}:door`;
export const porch=h=>({x:h.x,z:h.z+h.d/2+.9});
function leaveRoom(n,q,destination){const h=roomAt(q);if(!h){delete n.nightExitPhase;return destination;}
 const inner={x:h.x,z:h.z+h.d/2-.75};if(distance(q,inner)<.7)n.nightExitPhase=h.id;
 return n.nightExitPhase===h.id?porch(h):inner;
}
export function bedFor(id){const h=homeFor(id);if(!h)return null;const i=h.residents.indexOf(id);
 // Beds share a back-wall row, leaving the doorway and foot aisle clear.
 const count=h.residents.length,x=h.x+(count===1?-h.w/2+1.05:(i/(count-1)-.5)*(h.w-2.1)),z=h.z-h.d/2+1.25;
 return {x,z,xTarget:x,zTarget:z+1.15,home:h.id,index:i};
}
export function isSleeping(n){return n?.hp>0&&n.life?.activity==='sleep'&&!n.awareness?.caseOpen;}
export function quietSchedule(n){return !!n?.life?.night;}
const starts={bookseller:20,tea:21,elder:20.4,relay:21.2,tea_host:22.3,old_constable:21.7,gate_merchant:22,merchant:21.5,chi:23,matchmaker:20.6,qing:22.4,shen:22.8,su:23.4,traveler:23,gao:1,inn:1.5,inspector:22,scribe:23.7,mei:22};
const sleepWindow=(h,start)=>start<6?h>=start&&h<6:h>=start||h<6;
export function availability(id){const h=homeFor(id),start=starts[id];return h?`${h.name} · ${String(Math.floor(start)).padStart(2,'0')}:${String(Math.round(start%1*60)).padStart(2,'0')} 后歇息，卯时起身`:'夜间仍可在当值处寻人';}
export function nightPlan(sim,id,q){const s=sim.s,n=s.people[id],h=hourOf(s),now=s.npcClock||0;
 if(s.chapterVersion!==2)return null;
 if(convoyTravelling(s,id))return null;
 if(n.inCustody||n.escortingBy||n.life?.activity==='escort'&&n.life.until>(s.ecosystem?.time||0))return null;
 if(id==='traveler'&&s.facts.princeDeparture&&!s.facts.princeDeparture.arrived)return null;
 // A midnight conversation is a temporary interruption, never a new work shift.
 // Once the visitor leaves, the resident returns to the same bed promptly.
 if(n.nightAskedOut&&n.nightWakeUntil>now&&roomAt(s.player)?.id!==homeFor(id)?.id)n.nightWakeUntil=Math.min(n.nightWakeUntil,now+2);
 if(n.nightWakeUntil>now)return {activity:n.nightAskedOut?'host':'awake',target:n.nightAskedOut?(n.nightHostTarget||q):q,night:true};
 if(n.nightPursuit&&n.nightPursuit.until>now){const other=s.people[n.nightPursuit.target];if(other?.hp>0)return {activity:'nightPursuit',target:{x:other.x,z:other.z},night:true};}
 if(id==='thief'&&n.nightFleeUntil>now)return {activity:'escape',target:{x:-7,z:15},night:true};
 const atNight=nightTime(s),base=PEOPLE.find(p=>p.id===id);
 if(id===s.watch?.holder||id===s.watch?.incoming)return null;
 // People whose immediate responsibility cannot be abandoned remain reachable.
 if(atNight&&['porter','fu'].includes(id))return {activity:'doze',target:fixedPost(s,id),night:true};
 if(atNight&&id==='qinghe')return {activity:'riverside',target:{...QINGHE_RIVERSIDE}};
 if(atNight&&['relay','tea_host','scribe'].includes(id)&&!s.facts.enteredCity)
  return {activity:'doze',target:{x:base.x,z:base.z},night:true};
 if(atNight&&['gate_guard','gate_relief'].includes(id)&&(s.ecosystem?.hunger[id]||0)<65)return {activity:'doze',target:{x:id==='gate_guard'?-5:-8,z:27.2},night:true};
 if(atNight&&['guard','constable'].includes(id)){
  const route=[{x:7,z:15},{x:5,z:4},{x:5,z:-15},{x:17,z:-16},{x:17,z:11}];n.nightRound??=0;
  if(distance(q,route[n.nightRound])<.7)n.nightRound=(n.nightRound+1)%route.length;
  return {activity:'patrol',target:route[n.nightRound],night:true};
 }
 if(atNight&&id==='thief'){
  const route=[{x:-4,z:13},{x:8,z:10},{x:8,z:0},{x:-6,z:-4}];n.nightRound??=0;
  if(distance(q,route[n.nightRound])<.7)n.nightRound=(n.nightRound+1)%route.length;
  return {activity:'prowl',target:route[n.nightRound],night:true};
 }
 if(atNight&&['prisoner','beggar','gang_boss'].includes(id))return {activity:'doze',target:{x:base.x,z:base.z},night:true};
 if(id==='gao'&&(h>=19||h<1))return {activity:'nightDrink',target:{x:-8,z:-6.8},night:true};
 if(id==='inn'&&(h>=19||h<1.5))return {activity:'nightDesk',target:{x:-10,z:-7.8},night:true};
 const home=homeFor(id),bed=bedFor(id),start=starts[id];
 if(home&&sleepWindow(h,start)){
  let target={x:bed.xTarget,z:bed.zTarget};
  if(roomAt(q)?.id!==home.id){const entrance=porch(home);if(distance(q,entrance)<.7)n.nightDoorPhase=home.id;
   target=n.nightDoorPhase===home.id?{x:home.x,z:home.z+home.d/2-.75}:entrance;
  }else delete n.nightDoorPhase;
  if(roomAt(q)?.id!==home.id)return {activity:'home',target,home:home.id,night:true};
  if(s.ecosystem?.objects['bed:'+id]?.hp===0)return {activity:'doze',target:{x:home.x,z:home.z+home.d/2-1},home:home.id,night:true};
  const taken=s.player.bedRest?.bedId==='bed:'+id;
  if(taken)target={x:bed.xTarget+(bed.x<home.x?.65:-.65),z:bed.zTarget};
  return {activity:distance(q,target)<.48?(taken?'bedWait':'sleep'):'home',target,home:home.id,night:true};
 }
 if(n.life?.night||roomAt(q))return {activity:'returnDay',target:leaveRoom(n,q,fixedPost(s,id)||{x:base.x,z:base.z}),night:true};
 return null;
}
export function applyNight(sim,id,q){const n=sim.s.people[id],plan=nightPlan(sim,id,q);
 if(!plan)return false;
 if(plan.activity==='returnDay'&&!roomAt(q)&&distance(q,plan.target)<.55){n.life={activity:'idle'};return false;}
 const previous=n.life?.activity;n.life=plan;if(plan.activity==='sleep'&&previous!=='sleep')n.sleepStartedAt=sim.s.npcClock||0;
 if(previous!==plan.activity&&['home','sleep','nightDrink','doze','returnDay'].includes(plan.activity)){
  const text={home:'天晚了，回去歇下。',sleep:'明早再忙吧。',nightDrink:'再喝半盏，就该回去了。',doze:'还得候着……靠一会儿。',returnDay:'天亮了，该去忙了。'}[plan.activity];sim.emit('npcRoutine',{id,text});
 }
 return true;
}
export function wakeNpc(sim,id,positions,obstacles=[]){const n=sim.s.people[id],q=positions[id],p=sim.s.player,now=sim.s.npcClock||0;
 if(!n||n.hp<=0||n.stunnedUntil>now||!q||distance(p,q)>3||!visibleBetween(p,q,obstacles,sim.s.ecosystem?.objects))return {error:'走到对方身旁，才能叫醒。'};
 if(!['sleep','doze'].includes(n.life?.activity))return {error:'对方已经醒着。'};
 const home=homeFor(id),privateVisit=home&&!home.public&&roomAt(p)?.id===home.id;
 n.nightWakeUntil=now+10;n.nightConversation=true;n.nightWakeCount??={};const key=String(sim.s.day),count=n.nightWakeCount[key]||0;n.nightWakeCount[key]=count+1;
 const refused=!!(privateVisit&&(n.trust||0)<5&&(n.relation||0)<10)||count>=2;
 n.nightAskedOut=refused;n.nightHostTarget=privateVisit?{x:home.x,z:home.z+home.d/2-.85}:{x:q.x,z:q.z};n.life={activity:refused?'host':'awake',target:n.nightHostTarget&&refused?n.nightHostTarget:q,night:true};
 if(refused&&!n.nightWakePenalty?.[key]){n.nightWakePenalty??={};n.nightWakePenalty[key]=true;sim.relation(id,-2);n.memories.push('夜里被闯入叫醒，请来客离开。');}
 const text=refused?(privateVisit?'深更半夜怎么进来了？请到门外去，卯时再来。':'让我歇一会儿吧。有事等卯时再说。'):count?'我还没睡安稳。有什么急事，快说吧。':'嗯？有急事么？你说，我听着。';
 sim.save();return {text,refused};
}
export function finishNightConversation(sim,id){const n=sim.s.people[id];if(!n?.nightConversation)return;delete n.nightConversation;n.nightWakeUntil=Math.min(n.nightWakeUntil||0,(sim.s.npcClock||0)+2);sim.save();}
// Sleep blocks sight, not nearby sound or injury. Waking to a noise is not
// evidence of who caused it; the caller still applies normal perception rules.
export function wakeForIncident(sim,id,event,q,clear){const n=sim.s.people[id];if(!isSleeping(n))return true;
  const d=distance(q,event),direct=event.type==='assault'&&event.target===id,caught=event.type==='theft'&&(event.caughtBy===id||event.feltBy===id);
 if(!direct&&!caught&&(!['damage','assault'].includes(event.type)||d>(clear?5:2)))return false;
 n.nightWakeUntil=(sim.s.npcClock||0)+35;n.life={activity:'awake',target:{x:q.x,z:q.z},night:true};return true;
}
export function homeOccupied(s,h){return h.residents.some(id=>{const n=s.people[id];return n?.hp>0&&roomAt(n)?.id===h.id;});}

export function homeVisitStep(sim,eco,positions){const s=sim.s,h=roomAt(s.player),now=s.npcClock||0;
 if(s.chapterVersion!==2||!nightTime(s)||!h||h.public){delete s.nightVisit;return;}
 if(s.nightVisit?.home!==h.id)s.nightVisit={home:h.id,warned:[]};
 for(const id of h.residents){const n=s.people[id],q=positions[id];
  if(!q||roomAt(q)?.id!==h.id||n.hp<=0||isSleeping(n)||n.stunnedUntil>now||n.sickUntil>eco.s.time||n.awareness?.caseOpen||n.trust>=5||n.relation>=10||s.nightVisit.warned.includes(id)||n.nightAskedOut&&n.nightWakeUntil>now)continue;
  const d=distance(q,s.player),front=(Math.sin(n.facing||0)*(s.player.x-q.x)+Math.cos(n.facing||0)*(s.player.z-q.z))/Math.max(d,.01);
  if(d>4||front<.35||!visibleBetween(q,s.player,eco.obstacles||[],eco.s.objects))continue;
  s.nightVisit.warned.push(id);n.nightWakeUntil=now+8;n.nightAskedOut=true;n.nightHostTarget={x:h.x,z:h.z+h.d/2-.85};n.life={activity:'host',target:n.nightHostTarget,night:true};
  n.nightWakePenalty??={};if(!n.nightWakePenalty[s.day]){n.nightWakePenalty[s.day]=true;sim.relation(id,-2);n.memories.push('亲眼见来客夜里闯进住处，已请其离开。');}
  sim.emit('npcRoutine',{id,text:'这里是住处。夜深了，请到门外去，有事明早说。'});sim.save();break;
 }
}

export function nightTheft(sim,eco,positions){const s=sim.s,n=s.people.thief,q=positions.thief,now=s.npcClock||0;
 if(s.chapterVersion!==2||!nightTime(s)||!q||n.hp<=0||n.inCustody||n.stunnedUntil>now||n.awareness?.caseOpen||n.life?.activity!=='prowl'||n.nightTheftDay===s.day)return;
 const victim=['gao','merchant','gate_merchant','elder'].find(id=>{const v=s.people[id],p=positions[id];return v?.hp>0&&v.purse>0&&p&&!roomAt(p)&&distance(p,q)<2&&visibleBetween(q,p,eco.obstacles||[],eco.s.objects);});
 if(!victim)return;const v=s.people[victim],p=positions[victim];n.nightTheftDay=s.day;
 const success=sim.rng()*100<55;sim.emit('npcCheck',{id:'thief',label:'摸钱袋',success});
 if(success){const amount=Math.min(4,v.purse);v.purse-=amount;n.purse+=amount;n.memories.push(`夜里摸走路人${amount}文。`);}
 const guard=['guard','constable','gate_guard','gate_relief'].find(id=>{const g=s.people[id],at=positions[id],d=distance(q,at);
  if(!g||!at||g.hp<=0||isSleeping(g)||g.stunnedUntil>now||d>=5)return false;
  const front=(Math.sin(g.facing||0)*(q.x-at.x)+Math.cos(g.facing||0)*(q.z-at.z))/Math.max(d,.01);
  return front>.35&&visibleBetween(at,q,eco.obstacles||[],eco.s.objects);
 });
 if(!success||guard){n.nightFleeUntil=now+14;
  if(!success){v.nightWakeUntil=now+30;v.life={activity:'awake',target:p,night:true};v.memories.push('夜里有人伸手摸自己的钱袋，被当场发现。');}
  if(guard){s.people[guard].nightPursuit={target:'thief',until:now+12};s.people[guard].memories.push('巡夜时亲眼看见有人伸手摸路人的钱袋。');}
  sim.emit('npcRoutine',{id:success?guard:victim,text:success?'站住！我看见你摸那人的钱袋了！':'手往哪里伸！有人摸钱袋！'});
 }
 // A local NPC incident never borrows the player's crime/wanted accounting.
 sim.save();
}
