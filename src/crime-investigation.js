import {currentFace,clothing,appearanceTime,spreadIdentityRumor} from './appearance.js';
import {visibleBetween} from './npc-awareness.js';
import {abilityCheck,resolveAbilityCheck} from './ability-check.js';
import {addCausalDeed} from './item-meaning.js';
import {crimeCharges} from './wanted-records.js';

export const POLICE=['guard','gate_guard','gate_relief','inspector'];
export const INVESTIGATION_RADIUS=8,INVESTIGATION_DURATION=150;
const clock=s=>s.npcClock||0;
const distance=(a,b)=>a&&b?Math.hypot(a.x-b.x,a.z-b.z):Infinity;
export const caseBook=s=>s.investigations??={seq:0,cases:[],bodySeen:{}};
export const investigationReady=(s,id)=>{const n=s.people[id];return n?.hp>0&&!n.restraint&&!n.inCustody&&!(n.stunnedUntil>clock(s))&&!(n.muteUntil>clock(s))&&!n.drowning&&!['sleep','doze','escape'].includes(n.life?.activity);};
const dangerous=n=>['fight','warn','flee'].includes(n?.awareness?.state);
export const investigationActive=(s,c)=>['enroute','search'].includes(c.state)&&c.expires>clock(s);
export const inInvestigationArea=(c,position)=>distance(position,c.place)<INVESTIGATION_RADIUS;
// Rendering is a read-only projection: no hidden reports, names or witness identities.
export function investigationAreas(s,position=s.player){
 if(s.chapterVersion!==2)return [];
 return (s.investigations?.cases||[]).filter(c=>c.playerNoticed&&investigationActive(s,c)).map(c=>({id:c.id,x:c.place.x,z:c.place.z,radius:INVESTIGATION_RADIUS,expires:c.expires,seconds:Math.ceil(c.expires-clock(s)),inside:inInvestigationArea(c,position)})).sort((a,b)=>Number(b.inside)-Number(a.inside)||distance(position,a)-distance(position,b)||a.id-b.id);
}
export function expireInvestigations(sim){
 let changed=false;for(const c of sim.s.investigations?.cases||[]){
  if(['enroute','search'].includes(c.state)&&c.expires<=(sim.s.npcClock||0)){c.state='closed';c.question=null;c.closedAt=clock(sim.s);changed=true;}
 }if(changed)sim.save();return changed;
}
export function noticeInvestigations(sim,positions,obstacles=[]){
 const s=sim.s;if(s.chapterVersion!==2||s.player.hp<=0)return;
 for(const c of s.investigations?.cases||[]){
  const officer=positions[c.assigned];
  if(c.playerNoticed||c.state!=='search'||!investigationActive(s,c)||!officer||!investigationReady(s,c.assigned)||distance(s.player,officer)>10||!visibleBetween(s.player,officer,obstacles,s.ecosystem?.objects))continue;
  c.playerNoticed=true;sim.save();
 }
}
export function recordCrimeScene(sim,event){
 const s=sim.s;if(s.chapterVersion!==2||event.selfDefense||!['assault','theft','damage','tamper'].includes(event.type))return null;
 const b=caseBook(s),victim=event.owner||event.target,now=clock(s);
 let c=b.cases.findLast(c=>c.victim===victim&&c.type===event.type&&now-c.lastAt<20&&c.state!=='closed');
 if(!c){c={id:++b.seq,type:event.type,victim,place:{x:event.x,z:event.z},at:now,lastAt:now,witnesses:[],reports:[],state:'unreported',checks:{},linger:{},nextAsk:now+12};b.cases.push(c);}
 c.lastAt=now;if(event.convoy)c.convoy=true;if(event.severe)c.severe=true;event.investigationId=c.id;
 c.charges??=crimeCharges(c);
 // Missing property is discoverable later, but does not tell its owner who took it.
 if(event.type==='theft'&&event.transferred&&event.itemId){c.missingItems??=[];if(!c.missingItems.includes(event.itemId))c.missingItems.push(event.itemId);}
 for(const id of event.witnesses||[])if(!c.witnesses.some(w=>w.id===id))c.witnesses.push({id,subject:event.identities?.[id]||null,face:currentFace(s),garment:clothing(s)?.name||null});
 // Officers who actually witnessed it already own the immediate response.
 if((event.witnesses||[]).some(id=>POLICE.includes(id)))c.immediate=true;
 return c;
}
export function acceptCrimeReport(sim,{caseId,reporter,officer,place,type='assault',subject=null}){
 const s=sim.s;if(s.chapterVersion!==2)return null;const b=caseBook(s);
 let c=b.cases.find(c=>c.id===caseId);
 if(!c){c={id:++b.seq,type,victim:reporter,place:{...place},at:clock(s),lastAt:clock(s),witnesses:[],reports:[],state:'unreported',checks:{},linger:{},nextAsk:clock(s)+8};b.cases.push(c);}
 if(c.state==='closed'||c.reports.some(r=>r.reporter===reporter&&r.officer===officer))return c;
 const witness=c.witnesses.find(w=>w.id===reporter);
 c.reports.push({reporter,officer,at:clock(s),kind:witness?'testimony':'discovery',subject:witness?.subject||subject,face:witness?.face||null,garment:witness?.garment||null});
 c.assigned=officer;c.state='enroute';c.expires=clock(s)+INVESTIGATION_DURATION;c.immediate=false;
 const reported=witness?.subject||subject;if(reported&&reported!=='player')spreadIdentityRumor(s,reported,10,'事后当面报案',officer);
 sim.emit('npcRoutine',{id:officer,text:reporter===officer?(c.type==='body'?'这里有人倒下了，先查看四周。':'先回事发处看看，留意附近的人。'):'记下了。我去事发处看看，旁人若知情，也请当面说。'});sim.save();return c;
}
export function discoverBodies(sim,positions,obstacles=[]){
 const s=sim.s;if(s.chapterVersion!==2)return;const b=caseBook(s);
 for(const [id,n] of Object.entries(s.people)){
  if(n.hp>0){delete b.bodySeen[id];continue;}if(b.bodySeen[id]||!positions[id])continue;
  const q=positions[id],finder=Object.keys(positions).find(k=>k!==id&&investigationReady(s,k)&&!dangerous(s.people[k])&&distance(positions[k],q)<4&&visibleBetween(positions[k],q,obstacles,s.ecosystem?.objects)&&(()=>{const p=positions[k],angle=p.facing??s.people[k].facing;return !Number.isFinite(angle)||Math.sin(angle)*(q.x-p.x)+Math.cos(angle)*(q.z-p.z)>0;})());
  if(!finder)continue;b.bodySeen[id]=true;
  let c=b.cases.findLast(c=>c.victim===id&&c.state!=='closed');
  if(!c){c={id:++b.seq,type:'body',victim:id,place:{x:q.x,z:q.z},at:clock(s),lastAt:clock(s),witnesses:[],reports:[],state:'unreported',checks:{},linger:{},nextAsk:clock(s)+8};b.cases.push(c);}
  c.discoverer=finder;c.discoveryAt=clock(s);c.place={x:q.x,z:q.z};
  if(POLICE.includes(finder))acceptCrimeReport(sim,{caseId:c.id,reporter:finder,officer:finder});
  else sim.emit('npcRoutine',{id:finder,text:'这里有人倒下了！得去找官差来。'});
 }
}
export function discoverMissingProperty(sim,positions,obstacles=[]){
 const s=sim.s;if(s.chapterVersion!==2)return;
 for(const c of caseBook(s).cases){
  if(c.state!=='unreported'||c.discoverer||clock(s)-c.lastAt<25||!investigationReady(s,c.victim)||dangerous(s.people[c.victim]))continue;
  const q=positions[c.victim];if(!q)continue;
  const missing=(c.missingItems||[]).some(id=>{
   const item=s.ecosystem?.items.find(i=>i.id===id);if(!item)return false;
   const theft=item.provenance?.history.findLast(h=>h.method==='stolen'&&h.at>=c.at);
   if(!theft||item.location===theft.from)return false;
   if(theft.from==='npc:'+c.victim)return true;
   const o=s.ecosystem.objects[theft.from?.replace(/^object:/,'')];
   return o&&distance(q,o)<3&&visibleBetween(q,o,obstacles,s.ecosystem.objects);
  });
  if(!missing)continue;c.discoverer=c.victim;c.discoveryAt=clock(s);
  sim.emit('npcRoutine',{id:c.victim,text:'东西不见了……得请官差来查一查。'});sim.save();
 }
}
const memoryKey=(s,officer)=>officer+':'+currentFace(s);
function investigationMemory(s,c,officer){
 const key=memoryKey(s,officer);if(c.checks?.[key])return c.checks[key];
 // Earlier saves keyed checks by makeup serial. Reapplying the same face must
 // not erase the officer's memory, and reading the preview must not migrate it.
 const old=Object.entries(c.checks||{}).filter(([k])=>k.startsWith(key+':')).map(([,v])=>v);
 return {until:Math.max(0,...old.map(v=>v.until||0)),doubtUntil:Math.max(0,...old.filter(v=>v.success===false).map(v=>v.doubtUntil||0))};
}
const knownReports=(c,officer)=>(c.reports||[]).filter(r=>r.officer===officer);
const evidenceKey=(c,officer)=>JSON.stringify(knownReports(c,officer).map(r=>[r.reporter,r.kind,r.subject,r.face,r.garment,r.at]));
// Physical descriptions, not item IDs or makeup serials: cycling identical
 // clothes/faces or reloading does not buy another roll against the same facts.
export const investigationContext=(s,c,officer)=>JSON.stringify([officer,currentFace(s),clothing(s)?.name||null,evidenceKey(c,officer)]);
export function investigationCanAsk(s,c,officer){
 return investigationActive(s,c)&&!(investigationMemory(s,c,officer).until>clock(s))&&!c.responses?.[investigationContext(s,c,officer)];
}
export function investigationRisk(s,c,officer){
 const face=currentFace(s),garment=clothing(s)?.name,known=knownReports(c,officer);
 const faceMatch=known.some(r=>r.kind==='testimony'&&r.face===face),coatMatch=!!garment&&known.some(r=>r.garment===garment);
 const describedCoats=known.filter(r=>r.kind==='testimony'&&r.garment),coatMismatch=!!garment&&describedCoats.length>0&&!coatMatch;
 const rumor=s.appearance?.rumors?.[face],heard=!!(rumor?.hearers?.includes(officer)&&rumor.until>appearanceTime(s));
 const doubts=investigationMemory(s,c,officer).doubtUntil>clock(s);
 const score=(faceMatch?35:0)+(coatMatch?25:0)+(heard?15:0)+(doubts?15:0);
 return {score,faceMatch,coatMatch,coatMismatch,heard,doubts,testimony:known.some(r=>r.kind==='testimony'),reason:faceMatch?(coatMismatch?'衣着不符，但面貌符合证言':'面貌符合证言'):coatMatch?'衣着符合证言':heard?'官差听过此面貌的传闻':doubts?'上次解释仍有疑点':'只在事发地附近，尚无指认'};
}
export function investigationPreview(sim,c,officer,choice='explain'){
 const risk=investigationRisk(sim.s,c,officer);
 const modifiers=choice==='deny'&&risk.coatMismatch?[{label:'现穿衣着不符证言',value:12}]:[];
 return {...abilityCheck(sim.s.player,{stat:'charm',skillId:'disguise',difficulty:risk.score/2,modifiers,reason:investigationReady(sim.s,officer)?'':'官差眼下无法问话。'}),risk};
}
export const investigationSignature=s=>currentFace(s)+':'+(s.player.face?.serial||0);
export function investigationQuestion(s,c,officer){
 const r=investigationRisk(s,c,officer);
 if(r.faceMatch&&r.coatMismatch)return '衣裳与报案说的不同，可这面貌仍有几分相似。方才你在哪里？';
 if(r.faceMatch&&r.coatMatch)return '报案中说的衣着面貌，与你有相似之处。方才你在哪里？';
 if(r.faceMatch)return '报案中提到的面貌，与你有几分相似。方才你在哪里？';
 if(r.coatMatch)return '报案中提过这样的衣着。请说说，方才你在哪里？';
 if(r.heard)return '我听过与你这面貌有关的传闻。此处出了事，请说明来由。';
 if(r.doubts)return '方才那番说法还有疑处，可有什么能核对的？';
 return '此处出了事。你在附近停留，可看见了什么？';
}
export function investigationReplies(sim,c,officer){
 if(!investigationCanAsk(sim.s,c,officer))return [];
 const risk=investigationRisk(sim.s,c,officer),entries=[{action:{id:'explain',label:'说明来由，解释为何在场',stat:'charm'},preview:investigationPreview(sim,c,officer)}];
 if(risk.testimony||risk.heard||risk.doubts)entries.push({action:{id:'deny',label:risk.coatMismatch?'狡辩：衣着都不同，你认错人了':'狡辩：不是我，你们认错人了',stat:'charm'},preview:investigationPreview(sim,c,officer,'deny')});
 else entries.push({action:{id:'cooperate',label:'配合询问，留下说法'},preview:{certain:true}});
 entries.push({action:{id:'leave',label:'暂不作答，告辞'},preview:{certain:true}});return entries;
}
export function answerInvestigation(sim,caseId,officer,choice,positions,obstacles=[]){
 const s=sim.s,c=caseBook(s).cases.find(c=>c.id===caseId),now=clock(s),key=memoryKey(s,officer);
 if(!c||c.assigned!==officer||c.state!=='search'||!investigationActive(s,c)||!inInvestigationArea(c,s.player)||!investigationReady(s,officer)||s.player.hp<=0||distance(positions[officer],s.player)>3.5||!visibleBetween(positions[officer],s.player,obstacles,s.ecosystem?.objects))return {error:'盘查已中断。'};
 if(!investigationReplies(sim,c,officer).some(e=>e.action.id===choice))return {error:'这轮说法已经答过，或眼下的证言不容这样回应。'};
 const contested=choice==='explain'||choice==='deny',check=contested?investigationPreview(sim,c,officer,choice):null,r=contested?resolveAbilityCheck(check,sim.rng):{roll:null,success:null};
 const old=investigationMemory(s,c,officer);
 c.responses??={};c.responses[investigationContext(s,c,officer)]={choice,at:now,success:r.success};
 // Cooperation/refusal is a statement, not a successful persuasion check.
 c.checks[key]=contested?{until:now+60,choice,success:r.success,doubtUntil:r.success?0:now+120}:{...old,until:Math.max(old.until||0,now+15)};c.nextAsk=now+15;c.question=null;
 if(r.success===false)c.expires=Math.max(c.expires||0,now+180);
 const different=check?.risk.coatMismatch;
 const text=choice==='cooperate'?'已留下说法供核对，未作身份排除；官差继续查看现场。':choice==='leave'?'你暂不作答，原有疑点与证据保留。':r.success?(choice==='deny'?'官差暂且接受了认错人的说法，已有证言仍留待核对。':'官差暂且接受解释，现场调查仍在继续。'):'说法未能消除疑点，官差延长了现场调查；同样的说法不能反复蒙混。';
 const spoken=choice==='cooperate'?'我愿配合询问，请说要核对什么。':choice==='leave'?'眼下不便作答，先告辞。':choice==='deny'?(different?'你看清楚，我这身衣裳与报案说的不同。不是我，认错人了。':'不是我。相貌衣着有相似，也不能就认定是我做的。'):'我在此停留自有缘故，请将证言和发生的时辰核对清楚。';
 const reply=choice==='cooperate'?'好，先把你知道的说清。我仍要核对现场与报案。':choice==='leave'?'你不愿说，我也记下。先前的疑处仍要查。':r.success?(choice==='deny'?'也有认错的可能。暂且记下，证言还要继续核对。':'这番说法暂且记下。若有新证据，再请你来说明。'):choice==='deny'&&different&&check.risk.faceMatch?'衣裳不同我看见了，可报案还提到了面貌。这一点，你仍未说清。':'你的说法还有疑处。我会继续核对，同样的话不必反复说。';
 addCausalDeed(s,{key:'investigation:'+c.id+':'+key+':'+now,title:'事发地盘查',text,target:officer,witnesses:[officer],cause:c.cause||null});
 const result={...r,check,text,label:'事发地盘查',dialogue:[{id:'player',text:spoken},{id:officer,text:reply}],changes:[]};sim.save();return result;
}
