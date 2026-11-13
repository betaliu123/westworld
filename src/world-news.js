import {factionNewsStep} from './faction-news.js';
import {visibleBetween} from './npc-awareness.js';
import {WORLD_NEWS_LINES} from './world-news-lines.js';

// Public facts are deliberately separate from witness attribution, evidence,
// reputation and quests. A rumour about a theft never identifies its thief.
export const NEWS_DURATION=480; // two game days, including rest/time skips
export const NEWS_FACTS={
 convoy_loss:'花石纲的纲货失窃了。',
 convoy_wages:'花石纲脚夫的工钱有人垫上了，两边留了收据。',
 public_injury:'镇上出了伤人的事。',
 public_arrest:'官差收押了人。'
};
const now=s=>Math.max(0,((s.day||1)-1)*240+(s.time||0));
const distance=(a,b)=>a&&b?Math.hypot(a.x-b.x,a.z-b.z):Infinity;
const state=s=>s.worldNews??={events:{},nextSpread:0,nextSpeech:0,recent:[]};
const eventAt=(s,at)=>Number.isFinite(at)?Math.max(0,now(s)-Math.max(0,(s.npcClock||0)-at)):now(s);
const dayAt=(s,day)=>!day||day===s.day?now(s):Math.max(0,(day-1)*240);
const role=id=>['tea_host','inn'].includes(id)?'host':['old_constable','guard','gate_guard','gate_relief','inspector'].includes(id)?'elder':id==='traveler'?'traveler':['merchant','gate_merchant'].includes(id)?'merchant':['porter','qing','chi'].includes(id)?'worker':'neighbor';
export function newsReady(s,id){
 const n=s.people[id],clock=s.npcClock||0;
 return !!n&&n.hp>(n.maxHp||100)*.3&&!n.restraint&&!n.inCustody&&!n.drowning&&!n.burning&&!(n.stunnedUntil>clock)&&!(n.muteUntil>clock)&&!(n.sickUntil>(s.ecosystem?.time||0))&&!n.life?.night&&!['sleep','doze','escape','privacy','identity-dispute'].includes(n.life?.activity)&&!['notice','warn','fight','flee','search','investigate'].includes(n.awareness?.state)&&!n.awareness?.caseOpen;
}
export function recordWorldNews(s,{id,type,knowers=[],at=now(s),cause=id}){
 if(s.chapterVersion!==2||!Object.hasOwn(NEWS_FACTS,type)||!id||!knowers.some(k=>s.people[k]))return null;
 const events=state(s).events;
 const event=events[id]??={id,type,cause,at,expires:at+NEWS_DURATION,known:{},spoken:{},order:[]};
 if(event.type!==type||event.expires<=now(s))return event;
 for(const who of knowers)if(s.people[who]&&!event.known[who])event.known[who]={source:who,direct:true,at:now(s)};
 return event;
}
export function activeWorldNews(s,id){
 if(s.chapterVersion!==2)return [];
 return Object.values(s.worldNews?.events||{}).filter(e=>e.expires>now(s)&&(!id||e.known[id])).sort((a,b)=>b.at-a.at||a.id.localeCompare(b.id));
}
export function nearbyWorldNews(s,positionOf,obstacles=[]){
 return activeWorldNews(s).some(e=>Object.keys(e.known).some(id=>newsReady(s,id)&&distance(positionOf(id),s.player)<8&&visibleBetween(positionOf(id),s.player,obstacles,s.ecosystem?.objects)));
}
// Pull only established records. Old saves recover from their actual witnesses
// and discoverers; carrying stolen cargo alone does not create public knowledge.
export function syncWorldNews(s){
 if(s.chapterVersion!==2)return;
 const c=s.convoy,a=c?.aftermath;
 if(a){const e=recordWorldNews(s,{id:'convoy-loss',type:'convoy_loss',knowers:Object.keys(a.known),at:eventAt(s,a.at),cause:a.id});
  if(e?.expires>now(s))for(const [id,k] of Object.entries(a.known))if(e.known[id])e.known[id]={source:k.source||id,direct:!!k.direct,at:e.known[id].at};
 }
 if(c?.missing){const report=(s.investigations?.cases||[]).find(k=>k.convoy&&k.discoverer),who=c.missingObserver||report?.discoverer;
  recordWorldNews(s,{id:'convoy-loss',type:'convoy_loss',knowers:who?[who]:[],at:eventAt(s,c.missingAt??report?.at),cause:'convoy-missing'});
 }
 if(s.facts.convoyPeace){const h=s.history.findLast(h=>h.actionId==='ch_convoy_peace'&&h.success),who=h?.dialogue?.find(l=>l.id!=='player')?.id;
  recordWorldNews(s,{id:'convoy-wages',type:'convoy_wages',knowers:who?[who]:[],at:dayAt(s,h?.day),cause:'chapter:convoy_peace'});
 }
 for(const c of s.investigations?.cases||[]){
  if(c.type==='assault'||c.type==='body')recordWorldNews(s,{id:'injury:'+c.id,type:'public_injury',knowers:[...(c.witnesses||[]).map(w=>w.id),...(c.reports||[]).map(r=>r.officer),...(c.discoverer?[c.discoverer]:[])],at:eventAt(s,c.discoveryAt??c.at),cause:'case:'+c.id});
 }
 const custody=s.facts.lastCustody;
 if(custody&&(['prison','testimony'].includes(s.event?.gate?.phase)||(s.investigations?.cases||[]).some(c=>c.custody===custody||c.custody?.day===custody.day&&c.custody?.officer===custody.officer)))recordWorldNews(s,{id:'custody:'+custody.day+':'+custody.officer,type:'public_arrest',knowers:[custody.officer],at:dayAt(s,custody.day),cause:'custody'});
 for(const [id,n]of Object.entries(s.people))if(n.custodyDelivered)recordWorldNews(s,{id:'delivered:'+id,type:'public_arrest',knowers:['inspector'],cause:'custody:'+id});
}
export function shareWorldNews(s,event,from,to,positions,obstacles=[]){
 const k=event?.known[from];
 if(!k||event.expires<=now(s)||event.known[to]||!newsReady(s,from)||!newsReady(s,to)||distance(positions[from],positions[to])>4||!visibleBetween(positions[from],positions[to],obstacles,s.ecosystem?.objects))return false;
 event.known[to]={source:from,direct:false,at:now(s)};return true;
}
export function newsCandidates(event,id){
 const entries=WORLD_NEWS_LINES[event.type]?.[role(id)]||[];
 return entries.map((text,i)=>({id:role(id)+':'+i,text}));
}
export function newsContext(s,event){
 return {mode:'world_atmosphere',fact:NEWS_FACTS[event.type],phase:now(s)-event.at<240?'初闻':'余谈',
  candidates:Object.keys(WORLD_NEWS_LINES[event.type]||{}).flatMap(key=>WORLD_NEWS_LINES[event.type][key].map((text,i)=>({id:key+':'+i,text})))};
}
// Exactly one bounded selection request per event, persisted across reloads.
// DS only arranges reviewed wording; arbitrary returned text is never played.
export function createNewsDirector(request){
 return async function prefetch(sim,event,ready){
  if(!ready||!event||event.director||event.expires<=now(sim.s))return;
  const owner=sim.s,context=newsContext(owner,event);event.director='pending';sim.save();
  try{
   const result=await request(context);
   if(sim.s!==owner||owner.worldNews?.events[event.id]!==event||event.expires<=now(owner))return;
   const allowed=new Set(context.candidates.map(c=>c.id));
   event.order=Array.isArray(result?.ids)?[...new Set(result.ids.filter(id=>typeof id==='string'&&allowed.has(id)))].slice(0,18):[];
   event.director=event.order.length?'selected':'local';sim.save();
  }catch{if(sim.s===owner&&owner.worldNews?.events[event.id]===event){event.director='local';sim.save();}}
 };
}
export function worldNewsLine(s,event,id){
 const list=newsCandidates(event,id),used=event.spoken[id],rank=x=>{const n=event.order.indexOf(x.id);return n<0?99:n;};
 list.sort((a,b)=>rank(a)-rank(b));
 const recent=s.worldNews?.recent||[],candidate=list.find(c=>!recent.includes(event.id+':'+c.id)&&c.id!==used?.line)||list.find(c=>c.id!==used?.line)||list[0];
 if(!candidate)return null;
 const introduction=event.known[id].direct?'':'听说';
 return {id,text:introduction+NEWS_FACTS[event.type]+candidate.text,ambient:true,worldNews:event.id,lineId:candidate.id};
}
export function commitWorldNewsLine(sim,event,line,positions,obstacles=[]){
 const s=sim.s,book=state(s),clock=now(s);
 if(event.expires<=clock||!newsReady(s,line.id))return false;
 event.spoken[line.id]={line:line.lineId,at:clock};book.nextSpeech=clock+(clock-event.at<240?24:48);
 book.recent=[...book.recent,event.id+':'+line.lineId].slice(-8);
 for(const to of Object.keys(positions))shareWorldNews(s,event,line.id,to,positions,obstacles);
 sim.save();return true;
}
export function worldNewsStep(sim,eco,world){
 const s=sim.s;if(s.chapterVersion!==2)return;
 if(world.playing&&!world.locked&&!world.cinematic)factionNewsStep(sim,eco.positions,world.obstacles||[]);
 syncWorldNews(s);const book=state(s),clock=now(s),events=activeWorldNews(s);
 if(!events.length||!world.playing||world.locked||world.cinematic||world.performance)return;
 // One physical conversation per interval, no same-tick transitive spread.
 if(clock>=book.nextSpread){book.nextSpread=clock+6;
  outer:for(const e of events)for(const [from,k]of Object.entries(e.known)){
   if(clock-k.at<4)continue;
   for(const to of Object.keys(eco.positions))if(shareWorldNews(s,e,from,to,eco.positions,world.obstacles)){sim.save();break outer;}
  }
 }
 if(world.combatReady||s.player.hp<=0||clock<book.nextSpeech)return;
 for(const event of events)for(const id of Object.keys(event.known)){
  const q=eco.positions[id];
  if(!newsReady(s,id)||distance(q,s.player)>8||!visibleBetween(q,s.player,world.obstacles||[],eco.s.objects)||clock-(event.spoken[id]?.at??-100)<70)continue;
  const actor=world.npcs?.get(id)?.actor,screen=actor&&world.screenPoint?.(actor.position);
  if(screen&&!screen.visible)continue;
  const line=worldNewsLine(s,event,id);if(!line)continue;
  world.prefetchWorldNews?.(event);
  line.valid=()=>sim.s===s&&s.worldNews?.events[event.id]===event&&event.expires>now(s)&&newsReady(s,id)&&!world.locked&&!world.combatReady&&distance(eco.positions[id],s.player)<8&&visibleBetween(eco.positions[id],s.player,world.obstacles||[],eco.s.objects);
  line.onShown=()=>line.valid()&&commitWorldNewsLine(sim,event,line,eco.positions,world.obstacles);
  if(world.onWorldNewsSpeech?.(line)){
   world.nextAmbient=(world.t||0)+24;return;
  }
 }
}
