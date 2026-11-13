import {acceptCrimeReport,recordCrimeScene} from './crime-investigation.js';
import {conflictCapable,assaultReaction} from './combat-conflict.js';
import {detainByOfficer} from './gate-scene.js';
import {wantedProfile} from './wanted-records.js';
import {persona} from './npc-persona.js';
import {believedIdentity,changeRelation,applyFace,spreadIdentityRumor} from './appearance.js';
import {addCausalDeed,itemMeaning,settleMeaning} from './item-meaning.js';
import {contextualResponses,responseMenu,flattenResponses,responseRelation} from './contextual-responses.js';
import {recordFactionPressure,factionAuthority} from './faction-discipline.js';
import {visibleBetween} from './npc-awareness.js';
export const officials=['guard','gate_guard','gate_relief','inspector'];
const firm=id=>officials.includes(id)||persona(id)[0]==='blade';
const flash=(sim,id,label)=>sim.emit('npcCheck',{id,label,observation:true,success:false,priority:true});
function calm(sim,id){const n=sim.s.people[id];if(n.awareness){n.awareness.caseOpen=false;n.awareness.state='return';}n.mood='calm';n.fear=0;}
function escalate(sim,c,force=false){const n=sim.s.people[c.id];if(force||firm(c.id)){delete sim.s.complaint;n.awareness={...n.awareness,state:'fight',suspect:'player',caseOpen:true,until:(sim.s.npcClock||0)+20};n.fear=0;flash(sim,c.id,'⚔ 动手');}else{c.phase='report';c.since=sim.s.npcClock||0;flash(sim,c.id,'💨 去报官');}}
export function startComplaint(sim,event){if(event.convoy)return false;if(sim.s.chapterVersion===2&&event.type==='assault'&&event.method!=='lasso')return startAssaultComplaint(sim,event);const s=sim.s,victim=event.owner&&s.people[event.owner]?event.owner:event.target,id=event.witnesses?.includes(victim)?victim:event.witnesses?.find(k=>officials.includes(k)),n=s.people[id];if(!['assault','theft','damage','tamper'].includes(event.type)||!n||!event.witnesses?.includes(id)||!n.awareness)return false;
 const active=s.complaint;if(active){if(active.id===id&&n.muteUntil>(s.npcClock||0)){active.phase='report';active.since=s.npcClock||0;flash(sim,id,'失声 · 求援');return false;}if(active.id===id&&event.type==='assault'&&active.phase!=='report')escalate(sim,active);return false;}
 if(n.complaintUntil>(s.npcClock||0))return false;n.complaintUntil=(s.npcClock||0)+18;
 const c={id,investigationId:event.investigationId,payee:s.people[victim]?victim:id,type:event.type,phase:'approach',since:s.npcClock||0,officers:event.witnesses.filter(x=>officials.includes(x)&&x!==id),price:event.type==='assault'?12:6};
 if(s.chapterVersion===2){
  c.subject=event.identities?.[id]||believedIdentity(s,id);c.itemId=event.itemId;c.transferred=event.transferred;
  c.witnesses=[...event.witnesses];c.attempts=[];c.severe=event.type==='assault';c.place={x:event.x??s.player.x,z:event.z??s.player.z};
  event.identities??={};for(const witness of c.witnesses)event.identities[witness]??=believedIdentity(s,witness);
  const deed=addCausalDeed(s,{key:'complaint:'+s.day+':'+(s.responseSeq=(s.responseSeq||0)+1),title:'当面问责',text:({theft:'伸手取物',assault:'动手伤人',damage:'损坏物件',tamper:'动过吃喝'})[event.type],target:id,harmedTarget:victim,incidentType:event.type,method:event.method,subject:c.subject,identities:event.identities,witnesses:c.witnesses,valence:'harm'});c.cause=deed.id;event.cause=deed.id;
 }
 if(!firm(id)&&(n.hp<25||persona(id)[0]==='wary')&&sim.rng()<.65){calm(sim,id);n.fear=8;n.mood='afraid';flash(sim,id,'😨 不敢追究');return true;}
 if(n.muteUntil>(s.npcClock||0))c.phase='report';s.complaint=c;flash(sim,id,c.phase==='report'?'失声 · 求援':'❗ 上前问责');return true;}

function startAssaultComplaint(sim,event){
 const s=sim.s,record=s.investigations?.cases.find(c=>c.id===event.investigationId)||recordCrimeScene(sim,event);
 const victim=event.target,id=event.witnesses?.includes(victim)?victim:event.witnesses?.find(k=>officials.includes(k));
 if(!record||!id)return false;
 let c=record.dispute;
 if(!c){
  const identities=Object.fromEntries((event.witnesses||[]).map(k=>[k,event.identities?.[k]||believedIdentity(s,k)]));
  c=record.dispute={id,payee:victim,type:'assault',severe:true,phase:'conflict',since:s.npcClock||0,investigationId:record.id,subject:identities[id],identities,witnesses:[...event.witnesses],officers:event.witnesses.filter(k=>officials.includes(k)&&k!==id),price:12,attempts:[],place:{...record.place}};
  c.cause=record.cause||addCausalDeed(s,{key:'assault:'+record.id,title:'当街伤人',text:'动手伤人',target:id,harmedTarget:victim,incidentType:'assault',method:event.method,subject:c.subject,identities,witnesses:c.witnesses,valence:'harm'}).id;
  record.cause=c.cause;
 }
 c.phase='conflict';event.cause=c.cause;delete s.surrender;
 for(const witness of record.witnesses){if(!c.witnesses.includes(witness.id))c.witnesses.push(witness.id);c.identities[witness.id]??=witness.subject;}
 s.complaint=c;return true;
}

// Loaded dialogue is never a new consent to surrender. Keep paid/attempted facts.
export function repairAssaultComplaint(s){
 if(s.chapterVersion!==2)return;delete s.surrender;
 const c=s.complaint;if(!c||(c.type!=='assault'&&!c.voluntary))return;
 const record=s.investigations?.cases.find(r=>r.id===c.investigationId);
 if(record)record.dispute=c;
 if(['approach','ask','surrender','pause'].includes(c.phase))c.phase='conflict';
 const n=s.people[c.id];if(n&&c.phase==='conflict'&&conflictCapable(s,c.id)){
  n.awareness={...n.awareness,home:n.awareness?.home||c.place||{x:s.player.x,z:s.player.z},lastKnown:c.place||{x:s.player.x,z:s.player.z},suspect:'player',believedIdentity:c.subject||n.awareness?.believedIdentity,state:assaultReaction(s,c.id,{target:c.payee||c.id}),caseOpen:true,severe:true,until:(s.npcClock||0)+8};
  if(c.voluntary&&!record)n.awareness.surrenderDispute=c;
 }
}
export function abandonSurrender(sim){
 const c=sim.s.complaint;delete sim.s.surrender;
 if(c&&(c.type==='assault'||c.voluntary)&&sim.s.chapterVersion===2){c.phase='conflict';c.since=sim.s.npcClock||0;sim.save();return true;}
 return false;
}
export function complaintChoices(sim){const c=sim.s.complaint;if(!c)return [];const n=sim.s.people[c.id],p=sim.s.player;
 if(sim.s.chapterVersion===2)return currentComplaintChoices(sim,c);
 return [['argue','试着辩解','charm'],['threat','逼他收声','might'],['pay','赔钱了事'],['fight','动手']].map(([id,label,stat])=>({action:{id,label,stat,cost:id==='pay'?c.price:0},preview:{certain:!stat,blocked:id==='pay'&&p.money<c.price,score:p.stats[stat],chance:Math.max(5,Math.min(95,(p.stats[stat]||0)+20+(stat==='might'?(firm(c.id)?-20:5):Math.round(n.relation/4))-(c.type==='assault'?16:0)))}}));}
function exchange(c,id,ok){
 const official=officials.includes(c.id),prince=c.id==='traveler';
 const plea={theft:'方才人挤，我扶了一下。你点点东西，可少了什么？',assault:'我以为你要拔刀，情急才出了手。',damage:'我以为那处早已松脱，没想到会弄坏。',tamper:'我只动了下碗沿。你若不信，我们当面看。'};
 const player=id==='argue'?plea[c.type]:id==='threat'?'再纠缠，下一回我可不收手了。':id==='pay'?'这些钱赔给你，这事能不能就此揭过？':'那就手底下见。';
 const reply=id==='fight'?'好，那便动手！':id==='pay'?'钱我收下。这笔账，咱们两清。':ok?(id==='threat'?'你……好。我不拦你，你走。':official?(c.type==='theft'?'你的说法我记下了。这回先放你走。':'既然收了手，这回就到这儿。') :prince?(c.type==='theft'?'好一个顺手相扶。这回我不追问，请把手收回去。':'我听清了。这回姑且作罢。'):'好，我暂且信你。往后别再这样。'):c.phase==='report'?'这话留着跟官差说。我这就去找人！':official?'人证就在眼前，还想抵赖？站住！':'说不通了，看招！';
 return [{id:'player',listener:c.id,text:player,shot:'close'},{id:c.id,listener:'player',text:reply,shot:'reaction'}];}
export function answerComplaint(sim,id,world={}){const c=sim.s.complaint;if(!c||c.phase!=='ask')return {error:'先停手，当面回应。'};if(sim.s.chapterVersion===2)return answerCurrentComplaint(sim,c,id,world);const entry=complaintChoices(sim).find(x=>x.action.id===id);if(!entry||entry.preview.blocked)return;
 const n=sim.s.people[c.id],roll=entry.action.stat?1+Math.floor(sim.rng()*100):null,ok=roll===null||roll<=entry.preview.chance;
 if(id==='fight'||!ok)escalate(sim,c,id==='fight');else{if(id==='pay'){sim.s.player.money-=c.price;const recipient=sim.s.people[c.payee]||n;recipient.purse=(recipient.purse||0)+c.price;}if(id==='threat')sim.relation(c.id,-4);calm(sim,c.id);delete sim.s.complaint;flash(sim,c.id,id==='pay'?'收下赔偿':id==='threat'?'😨 退让':'暂且相信');}
 const text=id==='fight'?'双方动手。':id==='pay'?'收下 '+c.price+' 文赔偿，不再追究。':(roll+' / '+entry.preview.chance+' · '+(ok?'对方不再追究。':c.phase==='report'?'没有说服对方，对方跑去报官。':'谈崩了，对方动手。'));sim.emit('complaintResult',{id:c.id,text,dialogue:exchange(c,id,ok),roll,check:entry.preview,success:ok,label:entry.action.label});sim.save();}
export function receiveReport(sim,c,officer,home){if(sim.s.complaint!==c||c.phase!=='report')return;calm(sim,c.id);delete sim.s.complaint;if(sim.s.people[c.id].muteUntil>(sim.s.npcClock||0)){flash(sim,c.id,'失声 · 无法指认');sim.emit('complaintResult',{id:c.id,text:'拉住官差，却说不清发生了什么。'});sim.save();return;}if(sim.s.chapterVersion===2){acceptCrimeReport(sim,{caseId:c.investigationId,reporter:c.id,officer,place:c.place||sim.s.player,type:c.type,subject:c.subject});sim.save();return;}const n=sim.s.people[officer];n.awareness={...n.awareness,home:{x:home.x,z:home.z},lastKnown:{x:c.place?.x??sim.s.player.x,z:c.place?.z??sim.s.player.z},believedIdentity:c.subject||'player',appearanceSerial:sim.s.people[c.id].awareness?.appearanceSerial??0,suspect:'player',caseOpen:true,state:'investigate',until:(sim.s.npcClock||0)+10};if(c.subject&&c.subject!=='player')spreadIdentityRumor(sim.s,c.subject,8,'当面接报',officer);if(!(c.officers||[]).length)sim.s.wanted=Math.min(9,sim.s.wanted+1);flash(sim,officer,'已接报');sim.emit('complaintResult',{id:c.id,text:'已当面报官，官差前去查看。'});sim.save();}

function currentComplaintChoices(sim,c){
 const s=sim.s,p=s.player,n=s.people[c.id];if(!n||n.hp<=0)return [];const severe=c.severe??(c.type==='assault');
 const subject=c.subject||n.awareness?.believedIdentity||'player',relation=responseRelation(s,c.id,subject),chance=Math.max(5,Math.min(90,Math.round(p.stats.charm+20+relation/4-(severe?16:0))));
 const item=s.ecosystem?.items.find(i=>i.id===c.itemId);
 const special=contextualResponses(s,{who:c.id,kind:'complaint',cause:c.cause,subject,type:c.type,price:c.price,item,owner:c.payee,transferred:c.transferred,returned:c.returned,attempts:c.attempts,chance})
  .filter(e=>!e.action.response.faction||e.action.response.effect==='pressure'||factionAuthority(s,e.action.response.faction));
 const ordinary=[
  ...(!(c.attempts||[]).includes('explain')?[{action:{id:'argue',label:'说明缘由，试着让对方缓和',stat:'charm'},preview:{certain:false,score:p.stats.charm,chance,reason:severe?'只能缓和敌意，伤人仍须交代':'解释不改变已发生的事'}}]:[]),
  {action:{id:'pay',label:'赔付损失，认个不是',cost:c.price},preview:{certain:true,blocked:p.money<c.price||c.paid,reason:c.paid?'这笔赔款已经收过':severe?'赔付损失；伤人仍须交代':'赔付本次损失；不消除其他案件'}},
  officials.includes(c.id)?{action:{id:'submit',label:'不再抵抗，随官差到案核问'},preview:{certain:true,reason:'实际收押，按案情核问'}}:{action:{id:'report',label:'不再争辩，请官差当面核问'},preview:{certain:true,reason:'对方前去报官；尚未拘押或判罚'}},
  ...(!(c.attempts||[]).includes('threat')?[{action:{id:'threat',label:'出言威吓，逼对方退让',stat:'might'},preview:{certain:false,score:p.stats.might,chance:Math.max(5,Math.min(90,p.stats.might+20+(firm(c.id)?-20:5))),reason:'会损害关系，可能激化冲突'}}]:[])
 ];
 return responseMenu(special,ordinary);
}
function answerCurrentComplaint(sim,c,id,{eco,positions,obstacles=[]}={}){
 const s=sim.s,n=s.people[c.id],p=s.player,now=s.npcClock||0;
 if(!conflictCapable(s,c.id,true)||p.hp<=0)return {error:'对方现在无法应答。'};
 const pos=positions?.[c.id];if(positions&&(!pos||Math.hypot(pos.x-p.x,pos.z-p.z)>3.5||!visibleBetween(p,pos,obstacles,s.ecosystem?.objects)))return {error:'先回到对方面前，把事情说清。'};
 const entry=flattenResponses(complaintChoices(sim)).find(e=>e.action.id===id);if(!entry||entry.preview.blocked)return {error:'眼下的条件变了，请重新选择。'};
 const r=entry.action.response,subject=c.subject||n.awareness?.believedIdentity||'player';
 c.subject=subject;c.severe??=c.type==='assault';c.officers??=[];c.place??={x:p.x,z:p.z};
 if(!c.cause)c.cause=addCausalDeed(s,{key:'complaint:restored:'+(s.responseSeq=(s.responseSeq||0)+1),title:'当面问责',text:'继续处理尚未说清的事。',target:c.id,subject,witnesses:[c.id],valence:'harm'}).id;
 if(r?.effect==='return'&&!eco)return {error:'眼下无法交还实物。'};
 c.attempts??=[];const roll=entry.action.stat?1+Math.floor(sim.rng()*100):null,success=roll===null||roll<=entry.preview.chance;
 let spoken=r?.text||({argue:'方才的事，请容我把来由说清。',pay:'这笔损失我赔，是我做得不妥。',report:'我不再争辩，请官差来当面核问。',threat:'别再纠缠，给彼此留点余地。'})[id],reply,text;
 const continues=()=>{c.phase='ask';c.since=now;};
 if(r)c.attempts.push(r.id);
 if(r?.effect==='pressure')recordFactionPressure(sim,{cause:c.cause,npc:c.id,subject,faction:r.faction,line:spoken,positions,obstacles});
 if(r?.effect==='unmask'){
  applyFace(sim,'player');c.currentIdentified=true;n.awareness??={home:{x:pos?.x??p.x,z:pos?.z??p.z}};n.awareness.identifiedSerial=0;
  continues();reply=r.success;text='已卸去易容；原事的目击身份记录保留。';
 }else if(r?.effect==='return'){
  const item=eco.s.items.find(i=>i.id===r.itemId&&i.location==='player');if(!item)return {error:'原物已不在身上。'};
  if(itemMeaning(s,c.id,item))settleMeaning(sim,eco,c.id,item,'truth');else eco.transfer(item,'npc:'+c.id,'returned',[c.id]);
  c.returned=true;continues();reply=r.success;text='原物已交回，尚需交代本次行为。';
 }else if(id==='submit'){
  if(!detainByOfficer(sim,c.id,wantedProfile(s,c.id)))return {error:'眼下无法收押。'};
  spoken='我不再抵抗，随你到案把事情说清。';reply='先收押核问，伤人的事仍须交代。';text='已随官差到案，原案证据保留。';
 }else if(id==='report'){
  c.phase='report';c.since=now;reply='好，留待当面核问。';text='对方前去报官，尚未作出判罚。';
 }else if(id==='pay'){
  p.money-=c.price;const receiver=s.people[c.payee]||n;receiver.purse=(receiver.purse||0)+c.price;c.paid=true;
  if(c.severe){continues();reply='赔款收下。伤人的事，仍得交代。';text='赔付 '+c.price+' 文；伤人责任保留。';}
  else{calm(sim,c.id);delete s.complaint;reply='这笔损失收到了。这回的事记下，莫再犯。';text='赔付 '+c.price+' 文，本次当面争执结束。';}
 }else if(r?.effect==='pause'){
  c.attempts.push('pause');if(success){c.phase='pause';c.until=now+10;c.since=now;reply=r.success;text='获准原地缓息十秒；问责仍在。';}
  else{continues();reply='喘息可以，先把眼前的事说清，别再拿这个推脱。';text='对方没有答应暂缓问责。';}
 }else{
  c.attempts.push(r?.effect==='pressure'?'pressure':id==='threat'?'threat':'explain');
  if(id==='threat'||r?.effect==='pressure')changeRelation(sim,c.id,-4,subject);
  if(success){
   if(c.severe){continues();reply='我听过了，可以好好说。伤人的事，仍得交代。';text='敌意缓和；伤人责任保留。';}
   else{calm(sim,c.id);delete s.complaint;reply=r?.success||'这番解释我听见了。这回先作罢，莫再如此。';text='本次当面争执缓和；既有证据和嫌疑保留。';}
  }else{escalate(sim,c);reply=r?.failure||(c.phase==='report'?'这话留着当面跟官差说明。':'这番话我不信，事情还没完！');text=c.phase==='report'?'没有说服对方，对方去报官。':'问责升级为冲突。';}
 }
 const deed=addCausalDeed(s,{key:'response:'+c.cause+':'+c.id+':'+id,cause:c.cause,title:entry.action.label,text,target:c.id,subject,witnesses:[c.id]});
 s.responseHistory??=[];if(!s.responseHistory.some(h=>h.cause===c.cause&&h.who===c.id))s.responseHistory.push({cause:c.cause,who:c.id,subject,type:c.type,day:s.day,deed:deed.id});s.responseHistory=s.responseHistory.slice(-100);
 if(s.complaint!==c||!['ask','pause'].includes(c.phase))delete s.surrender;
 const result={id:c.id,text,dialogue:[{id:'player',listener:c.id,text:spoken,shot:'close'},{id:c.id,listener:'player',text:reply,shot:'reaction'}],roll,check:entry.preview,success,label:entry.action.label,continued:s.complaint===c&&c.phase==='ask',cause:c.cause};
 sim.emit('complaintResult',result);sim.save();return result;
}
