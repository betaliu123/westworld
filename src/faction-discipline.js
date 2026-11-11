import {PEOPLE} from './data.js';
import {believedIdentity,identityName} from './appearance.js';
import {visibleBetween} from './npc-awareness.js';
import {addCausalDeed} from './item-meaning.js';
import {earnReputation,factionRep} from './reputation.js';

const FACTIONS={qingzhu:{name:'青竹会',leader:'qing'},court:{name:'六扇门',leader:'inspector'},gang:{name:'赤砂帮',leader:'gang_boss'}};
const name=id=>PEOPLE.find(p=>p.id===id)?.name||identityName(id);
const clock=s=>s.npcClock||0;
function state(s){const d=s.factionDiscipline??={};d.reports??=[];d.cases??={};d.seq??=0;return d;}
function available(s,id){const n=s.people[id];return !!n&&n.hp>0&&!n.inCustody&&!n.drowning&&!n.burning&&!(n.stunnedUntil>clock(s))&&!(n.muteUntil>clock(s))&&!(n.sickUntil>(s.ecosystem?.time||0))&&!['sleep','doze','escape'].includes(n.life?.activity)&&!n.awareness?.caseOpen&&!['fight','warn','flee','search'].includes(n.awareness?.state)&&!(n.fear>0);}
const close=(a,b,obstacles,objects,distance=3)=>!!a&&!!b&&Number.isFinite(a.x)&&Number.isFinite(a.z)&&Number.isFinite(b.x)&&Number.isFinite(b.z)&&Math.hypot(a.x-b.x,a.z-b.z)<=distance&&visibleBetween(a,b,obstacles,objects);
const caseKey=r=>JSON.stringify([r.faction,r.subject,r.cause]);
function corroborate(s,r,positions,obstacles){r.testimony=[...new Set([...(r.testimony||[]),...(r.witnesses||[]).filter(id=>id===r.leader||available(s,id)&&close(positions?.[id],positions?.[r.leader],obstacles,s.ecosystem?.objects))])];return r.testimony;}
export function factionStanding(s,faction,subject='player'){
 const cases=Object.values(s.factionDiscipline?.cases||{}).filter(c=>c.faction===faction&&c.subject===subject),count=cases.length;
 const status=count>=3?'expelled':count===2?'restricted':count===1?'warned':'active';
 return {faction,subject,status,count,label:({active:'在籍',warned:'受诫',restricted:'限权',expelled:'除名'})[status]};
}
export function factionAuthority(s,faction){return s.facts.career===faction&&!['restricted','expelled'].includes(factionStanding(s,faction).status);}
export function factionJoinBlock(s,faction){
 const f=FACTIONS[faction];if(!f)return '没有这项入职。';const standing=factionStanding(s,faction);
 if(standing.status==='expelled')return `已被${f.name}除名，不能重新领牌入职。`;
 if(standing.status==='restricted')return `${f.name}已暂停你的职权，不能重新入职绕过处分。`;
 if(s.facts.career)return '已有归属，不能重复入职。';
 if(s.facts.factionEnrollments?.[faction]||s.chapter?.done?.[faction+'_join'])return '入职已登记，不能重复领取信物与奖励。';
 return null;
}
export function recordFactionEnrollment(s,faction){s.facts.factionEnrollments??={};s.facts.factionEnrollments[faction]??={day:s.day};}
// Only the explicit pressure response calls this. Merely showing a badge is not an offence.
// Optional scene data freezes direct witnesses now; delivery never invents past witnesses.
export function recordFactionPressure(sim,{cause,npc,subject,faction,line,positions,obstacles=[]}){
 const s=sim.s,f=FACTIONS[faction];if(!f||!cause||!line||!s.people[npc]||s.facts.career!==faction)return null;
 const actor=subject||believedIdentity(s,npc),d=state(s),key=JSON.stringify([faction,actor,String(cause),npc]);
 const old=d.reports.find(r=>r.key===key);if(old)return old;
 const witnesses=[];
 if(positions)for(const [id,q]of Object.entries(positions))if(id!==npc&&available(s,id)&&close(q,s.player,obstacles,s.ecosystem?.objects,5)&&believedIdentity(s,id)===actor)witnesses.push(id);
 const r={id:'faction-report-'+(++d.seq),key,cause:String(cause),npc,subject:actor,faction,leader:f.leader,line:String(line),day:s.day,at:clock(s),status:'pending',witnesses};d.reports.push(r);
 addCausalDeed(s,{key:'pressure:'+r.id,title:'借势施压',text:`${identityName(actor)}向${name(npc)}说：“${r.line}”${name(npc)}准备向${f.name}递话。`,target:npc,subject:actor,cause:r.cause,valence:'harm',witnesses:[npc,...witnesses]});
 sim.save();return r;
}
export function pendingFactionReport(s,npc){if(!available(s,npc))return null;return (s.factionDiscipline?.reports||[]).find(r=>r.npc===npc&&r.status==='pending'&&available(s,r.leader))||null;}
export function deliverFactionReport(sim,reportId,leaderId,positions,obstacles=[]){
 const s=sim.s,r=state(s).reports.find(r=>r.id===reportId);if(!r||r.leader!==leaderId)return {error:'这封口信并非递给此人。'};
 if(r.status!=='pending')return {delivered:false,alreadyDelivered:true,report:r};
 if(!available(s,r.npc)||!available(s,leaderId)||!close(positions?.[r.npc],positions?.[leaderId],obstacles,s.ecosystem?.objects))return {error:'须由报信人亲自走到清醒的负责人面前。'};
 r.status='reported';r.deliveredDay=s.day;r.deliveredAt=clock(s);
 // A second direct witness must actually be present to corroborate. A lone report stays unverified.
 corroborate(s,r,positions,obstacles);
 const text=`${name(r.npc)}已当面向${name(leaderId)}转述${identityName(r.subject)}的原话。负责人尚未核实。`;
 addCausalDeed(s,{key:'report:'+r.id,title:'当面递报',text,target:leaderId,subject:r.subject,cause:r.cause,witnesses:[r.npc,...r.testimony]});
 sim.emit('npcRoutine',{id:leaderId,text:'话我记下了。先问清原委，不能凭一面之词定夺。'});sim.save();return {delivered:true,report:r};
}
const option=(r,answer,label)=>({id:'fd_'+r.id+'_'+answer,label:'【'+(answer==='review'?'有人递报':'门内核问')+'】'+label,mode:'contact',kind:'listen',presentation:'dialogue',disciplineReport:r.id});
function pendingInquiry(s,id){const reports=(s.factionDiscipline?.reports||[]).filter(r=>r.leader===id&&['reported','disputed'].includes(r.status)&&r.subject===believedIdentity(s,id));return reports.find(r=>r.questioned)||reports.sort((a,b)=>(a.lastDiscussed||0)-(b.lastDiscussed||0))[0];}
function responses(r){return [option(r,'explain',r.explained?'请按原话和在场人继续核对':'解释原委，请核对当时在场的人'),option(r,'admit','是我借门里的名头压人，我认'),option(r,'later','容我想清楚，稍后再来回话')];}
export function factionDisciplineOptions(sim,id){const s=sim.s,r=pendingInquiry(s,id);if(!r||!available(s,id))return [];return r.questioned?responses(r):[option(r,'review','回应'+name(r.npc)+'递来的口信')];}
export function factionDisciplinePreview(sim,id,a){const r=pendingInquiry(sim.s,id);return {certain:true,chance:100,blocked:!r||a.disciplineReport!==r.id};}
function prove(sim,r,proof){
 const s=sim.s,d=state(s),key=caseKey(r);if(d.cases[key]){r.status='proven';r.proof=d.cases[key].proof;return {changes:[],text:'同一件事已经核过，不重复处分。'};}
 d.cases[key]={faction:r.faction,subject:r.subject,cause:r.cause,report:r.id,proof,day:s.day};
 for(const other of d.reports)if(caseKey(other)===key){other.status='proven';other.proof=proof;other.provenDay=s.day;}
 const standing=factionStanding(s,r.faction,r.subject),f=FACTIONS[r.faction],penalty=standing.count===1?-3:standing.count===2?-6:standing.count===3?-12:0;
 const before=r.subject==='player'?factionRep(s,r.faction):s.appearance?.reputations?.[r.subject]?.factions?.[r.faction]||0;
 earnReputation(sim,{city:null,faction:r.faction,subject:r.subject,amount:penalty,key:'discipline:'+key,reason:f.name+'查实借势施压'});
 const after=r.subject==='player'?factionRep(s,r.faction):s.appearance?.reputations?.[r.subject]?.factions?.[r.faction]||0;
 if(r.subject==='player'){
  recordFactionEnrollment(s,r.faction);
  if(standing.status==='expelled'&&s.facts.career===r.faction){s.facts.formerCareer=r.faction;delete s.facts.career;}
  if(['restricted','expelled'].includes(standing.status)){
   if(r.faction==='court'){if(s.facts.courtHead==='player')s.facts.courtHead=null;s.facts.courtCandidate=false;}
   for(const item of s.ecosystem?.items||[])if(item.location==='player'&&item.badge===r.faction){item.badgeSuspended=true;if(standing.status==='expelled')item.badgeRevoked=true;}
  }
 }
 const text=standing.status==='warned'?'这回事已核清，记一次告诫。门里的名头，不许拿来欺人。':standing.status==='restricted'?'这是第二件查实的借势欺人。即日起暂停你的职权，不得再凭门内身份办差。':standing.count===3?'又一件独立的事核实了。即日起将你除名。信物留着也不再作数，学过的本事是你自己的。':'这件事也已核清。除名记录保留，不再重复处分。';
 const changes=[...(standing.count<=3?[f.name+'：'+standing.label]:[]),...(after!==before?[f.name+'声望 '+(after-before>0?'+':'')+(after-before)]:[])];
 addCausalDeed(s,{key:'discipline-case:'+key,title:f.name+'核实：'+standing.label,text:(proof==='admission'?'当事人当面承认。':'负责人核对了现场证言。')+text+(changes.length?'（'+changes.join('；')+'）':''),target:r.leader,subject:r.subject,cause:r.cause,witnesses:[r.leader,r.npc,...(r.testimony||[])]});
 return {text,changes};
}
export function resolveFactionDiscipline(sim,eco,id,action){
 const s=sim.s,r=pendingInquiry(s,id);if(!r||!available(s,id)||s.player.hp<=0||s.player.bedRest||!close(s.player,eco.positions?.[id],eco.obstacles||[],eco.s?.objects,4))return {error:'走到负责人面前，才能把这件事说清。'};
 const choices=factionDisciplineOptions(sim,id),a=choices.find(a=>a.id===action);if(!a)return {error:'先听清要核对的是哪件事。'};
 corroborate(s,r,eco.positions,eco.obstacles||[]);
 const answer=action.slice(action.lastIndexOf('_')+1),check=factionDisciplinePreview(sim,id,a);let text,player='',changes=[],phase='answers';
 if(answer==='review'){r.questioned=true;const testimony=r.npc===id||r.testimony.includes(id)?'这话我当场听见了。':r.testimony.length?`${r.testimony.map(name).join('、')}也到我面前作了证。`:'';text=`${name(r.npc)}说你借${FACTIONS[r.faction].name}的名头压人。原话是“${r.line}”。${testimony}这话是何用意？`;}
 else if(answer==='later'){r.questioned=false;const d=state(s);r.lastDiscussed=d.inquirySeq=(d.inquirySeq||0)+1;phase='deferred';player='容我把前后想清楚，再来回话。';text='可以。口信先记着，未核清之前不作处分。';}
 else{
  player=answer==='admit'?'那话是我说的。我借门里的名头逼人退让，这件事我认。':'我想把前后说清。请按我的原话，找当时在场的人一并核对。';
  const reliable=r.npc===id||(r.testimony||[]).length>0;
  if(answer==='admit'||reliable){const result=prove(sim,r,answer==='admit'?'admission':'corroborated-testimony');text=result.text;changes=result.changes;phase='settled';}
  else{r.status='disputed';r.explained=true;phase='explained';text='你的说法我也记下。现在只有一份口述，尚不足以查实；有在场人作证，再当面核对。';}
 }
 const dialogue=[...(player?[{id:'player',listener:id,text:player,shot:'close'}]:[]),{id,listener:'player',text,shot:'reaction'}];
 const result={type:'npc',presentation:'dialogue',eventId:'discipline:'+r.id+':'+answer,actionId:action,label:a.label,kind:'listen',motion:'talk',check,roll:null,success:true,text,changes,dialogue,authored:true,disciplineReport:r.id,disciplinePhase:phase,causalRecorded:true};
 if(answer!=='review'&&answer!=='later')addCausalDeed(s,{key:result.eventId,title:answer==='admit'?'承认借势施压':'当面解释',text:player+' '+text,target:id,subject:r.subject,cause:r.cause,valence:'deed',witnesses:[id]});
 s.history.push(result);sim.emit('result',result);sim.save();return result;
}
export function factionDisciplineFollowups(sim,id,result){if(!result?.disciplineReport||['settled','deferred'].includes(result.disciplinePhase))return [];const r=pendingInquiry(sim.s,id);return r?.id===result.disciplineReport?responses(r):[];}
