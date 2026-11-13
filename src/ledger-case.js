import {courtRouteBlock,syncGenyue} from './genyue.js';
import {PEOPLE} from './data.js';
import {believedIdentity,appearanceState,identityName,disguisePreview} from './appearance.js';
import {visibleBetween} from './npc-awareness.js';
import {earnReputation,factionRep} from './reputation.js';
import {addCausalDeed} from './item-meaning.js';
import {factionStanding} from './faction-discipline.js';

// The original is one world object. Offers, gifts and old saves use this same case.
export const LEDGER_ROUTES={
 court:{faction:'court',name:'六扇门',recipients:['traveler','inspector'],pass:'副账查案荐书',title:'携证入京',
  offer:'这本账得留下原本，我要核对上头的经手人。你若肯交来封存，我便给你查案荐书，荐你赴艮岳继续查账。',
  received:'原账我收下封存，这封查案荐书你拿好。到了艮岳，还要靠你继续核对账目。',
  ending:'你收好查案荐书，准备赴艮岳核对纲银。原账留在临溪封存，经手的名字还要逐一查明。'},
 yingfeng:{faction:'yingfeng',name:'应奉局',recipients:['fu'],pass:'应奉局随纲勘账帖',title:'黄封入苑',
  offer:'这本账留在外人手里，难免生出事端。你把原账交来，我给你赴艮岳随纲勘账的帖子。至于旧账房能不能出去，我可没答应。',
  received:'原账我收下了，随纲勘账帖也交给你。收好帖子，旧账房那边的事，可别再往这上头牵扯。',
  ending:'你收好随纲勘账帖，准备从应奉局的门路赴艮岳。副账留在符祥手中，旧账房手里少了替自己申辩的原件。'},
 qingzhu:{faction:'qingzhu',name:'青竹会',recipients:['qing'],pass:'青竹会护送核账凭书',title:'护账赴京',
  offer:'我想拿这本原账核一核役钱，看看账上报的和人手里拿的差在哪里。你把账留在青竹会，我给你赴艮岳核账的凭书。',
  received:'原账就由青竹会保管，这份赴艮岳核账的凭书你收好。那些役钱究竟落到了哪里，还得接着查。',
  ending:'你收好护送核账凭书，准备循纲运路线赴艮岳。青竹会保管原账，要查役钱，也要替被征发的人留一条归路。'},
 gang:{faction:'gang',name:'赤砂帮',recipients:['gang_boss','chi'],pass:'赤砂帮赴苑核工凭书',title:'为工赴苑',
  offer:'扛货的人出了力，工钱总得算明白。你把原账交给赤砂堂，我们留着对账，赴艮岳核工的名额就给你。',
  received:'账留在赤砂堂，核工的凭书你拿好。这趟去艮岳，把工钱的账看仔细些，弟兄们不能白出力。',
  ending:'你收好赴苑核工凭书，准备跟着运石的门路赴艮岳。赤砂帮留住原账，要拿它对工钱，也要保住船工往后的生计。'}
};
const who=id=>PEOPLE.find(p=>p.id===id)?.name||'收账人';
export const isLedger=item=>item?.type==='ledger';
export const heldLedger=s=>s.ecosystem?.items.find(i=>isLedger(i)&&i.hp>0&&i.location==='player');
export const ledgerRoute=id=>Object.entries(LEDGER_ROUTES).find(([,r])=>r.recipients.includes(id))?.[0];
const choice=(key,label)=>({id:'ch_ledger_'+key,label,mode:'contact',kind:'listen',story:key!=='decline'});
function rewardAmount(s,faction,subject){const rep=subject==='player'?factionRep(s,faction):(appearanceState(s).reputations[subject]?.factions?.[faction]||0);return Math.max(0,Math.min(40,100-rep));}

export function ledgerCase(s){
 const c=s.ledgerCase??={version:1,offers:{}};c.offers??={};
 // A flag or testimony is not proof of delivery. Only migrate a settled physical original.
 if(!c.delivery&&s.facts.ledgerDelivered){
  const item=s.ecosystem?.items.find(i=>isLedger(i)&&Object.keys(s.itemSettlements||{}).some(k=>k.startsWith(i.id+':')));
  const id=item&&Object.keys(s.itemSettlements).find(k=>k.startsWith(item.id+':')&&ledgerRoute(k.slice(item.id.length+1)))?.slice(item.id.length+1);
  if(id){const deed=s.chronicle?.deeds?.find(d=>d.key===item.id+':'+id);c.delivery={item:item.id,recipient:id,route:ledgerRoute(id),subject:deed?.subject||'player',day:deed?.day||s.day,cause:deed?.id,legacy:true,rewarded:false};}
 }
 return c;
}
export function syncLedgerQuest(s){
 if(s.chapterVersion!==2)return;
 const c=ledgerCase(s),item=heldLedger(s),hasLead=s.facts.taxLedgerLead||s.intelligence?.clues?.ledger||s.player.inventory.includes('狱友口供：东街副账');
 if(!item&&!hasLead&&!c.delivery&&!s.quests?.ledger)return;
 s.quests??={};const fresh=!s.quests.ledger,q=s.quests.ledger??={id:'ledger',day:s.day,source:item?'副账实物':c.delivery?'当面献账':'旧账房证言'};
 if(item)c.seenOriginal=true;
 q.title='花石纲副账';q.status=c.delivery?'complete':'active';
 if(c.delivery){const d=c.delivery,r=LEDGER_ROUTES[d.route];q.objective=`已向${who(d.recipient)}献账，${r.name}记下这份功劳`;q.note=d.rewarded?'赴艮岳凭据与收账身份相符时，可再向收账人确认启程。':'回到收账人处，续谈赴艮岳的门路。';}
 else if(item){q.objective=c.read?'选择把原账交给哪一方，换取赴艮岳门路':'副账已在行囊，可先翻阅，再决定交给谁';q.note=s.facts.ledgerCourtLead?'旧账房盼锦衣客或顾钦差接手；原账只献一方。':'拿到原账不等于读过内容。各方用途需当面询问。';}
 else if(c.seenOriginal){q.objective='原账已不在行囊，取回实物后再议献交';q.note='先前见过的账目仍记着，实物须重新找到。';}
 else{q.objective='向县狱旧账房追查副账实物';q.note='东街税课的副账曾由他经手；口供不能代替账本。';}
 if(fresh&&s.trackedQuest===undefined)s.trackedQuest='ledger';
 if(s.quests.royal&&c.delivery){s.quests.royal.status=c.delivery.route==='court'?'complete':'closed';s.quests.royal.objective=c.delivery.route==='court'?'副账已交查案一方，赴艮岳门路已接上':'副账另有所托；这条献账门路已关闭';}
}
export function readLedger(sim,item){
 const s=sim.s;if(!isLedger(item)||item.location!=='player'||item.hp<=0)return {error:'完整副账不在行囊中。'};
 const c=ledgerCase(s),text='副账分记三笔：税银转入花石纲，役钱按全额报出，漕工实领却另列扣项。末页有应奉局收讫记号；谁侵吞了差额，还须核对经手人。';
 if(!c.read){const deed=addCausalDeed(s,{key:'ledger:read',title:'翻阅花石纲副账',text,subject:'player'});c.read={item:item.id,day:s.day,cause:deed.id};
  s.intelligence??={people:{},clues:{}};s.intelligence.clues.ledger_accounts={source:'亲自翻阅东街副账',day:s.day};}
 item.opened=true;syncLedgerQuest(s);return {text};
}
function available(s,id,eco){
 const n=s.people[id],p=s.player,now=s.npcClock||0;if(p.hp<=0||!n||n.hp<=0||n.restraint||n.inCustody||n.drowning||n.stunnedUntil>now||n.muteUntil>now||['sleep','doze'].includes(n.life?.activity))return '对方现在无法接账或应答。';
 const actor=believedIdentity(s,id),relation=actor==='player'?n.relation:(appearanceState(s).relations[id+':'+actor]||0);if(relation< -15)return '对方不愿同你议账，原账仍由你保管。';
 if(['restricted','expelled'].includes(factionStanding(s,ledgerRoute(id),actor).status))return '这方已暂停或撤销对你的委任，不能靠献账绕过处分。';
 if(n.awareness?.caseOpen||['fight','flee','warn'].includes(n.awareness?.state))return '先处理眼前的冲突。';
 const q=eco?.positions?.[id]||(Number.isFinite(n.x)?n:PEOPLE.find(p=>p.id===id));
 if(!q||Math.hypot(p.x-q.x,p.z-q.z)>3.3)return '走近收账人再谈。';
 if(!visibleBetween(p,q,eco?.obstacles||[],s.ecosystem?.objects||{}))return '中间有遮挡，无法递账。';
 const recognition=disguisePreview(s,id,{context:{positions:eco?.positions||{},obstacles:eco?.obstacles||[],player:p}});
 if(recognition?.certain&&recognition.chance===0)return '对方认出了冒名，先把身份说清。';
 return '';
}
export function ledgerOptions(s,id){
 if(s.chapterVersion!==2||!ledgerRoute(id))return [];
 const c=ledgerCase(s),d=c.delivery;
 if(d){if(d.recipient!==id)return [];if(!d.rewarded)return [choice('claim','续谈副账的赴京酬答')];
  return c.departed||s.facts.demoComplete?[]:[choice('depart','凭献账凭书，确认赴艮岳')];}
 if(!heldLedger(s))return [];
 const offer=c.offers[id];return offer&&offer.subject===believedIdentity(s,id)&&offer.item===heldLedger(s).id?
  [choice('commit',`献出原账 · ${LEDGER_ROUTES[ledgerRoute(id)].name}声望 +${rewardAmount(s,LEDGER_ROUTES[ledgerRoute(id)].faction,believedIdentity(s,id))} · 其他献账门路关闭`),choice('decline','原账我再留一留')]:
  [choice('offer','谈谈这本副账，你打算怎么用？')];
}
export function ledgerPreview(sim,id,a,eco,item=heldLedger(sim.s)){
 const s=sim.s,c=ledgerCase(s),d=c.delivery;let reason=available(s,id,eco);
 if(!reason&&!ledgerRoute(id))reason='对方不接这宗副账。';
 if(!reason&&ledgerRoute(id)==='court'&&a.id!=='ch_ledger_offer')reason=courtRouteBlock(s,id);
 if(!reason&&['ch_ledger_offer','ch_ledger_commit'].includes(a.id)){if(d)reason='这本原账已献过，不能再向另一方记功。';else if(!item||!isLedger(item)||item.location!=='player'||item.hp<=0)reason='原账已不在行囊中。';}
 if(!reason&&['ch_ledger_claim','ch_ledger_depart'].includes(a.id)){
  if(!d||d.recipient!==id)reason='对方没有收过你的原账。';
  else if(d.subject!==believedIdentity(s,id))reason='这份赴京名额记在交账时的身份下。';
  else if(a.id==='ch_ledger_depart'&&(c.departed||!s.ecosystem?.items.some(i=>i.id===d.pass&&i.hp>0&&i.location==='player')))reason=c.departed?'已确认过启程。':'先取回那份赴艮岳凭书。';
 }
 return {certain:true,chance:reason?0:100,blocked:!!reason,reason,score:0};
}
function reward(sim,eco,d){
 if(d.rewarded)return [];
 const s=sim.s,r=LEDGER_ROUTES[d.route],amount=rewardAmount(s,r.faction,d.subject);d.rewarded=true;
 earnReputation(sim,{city:null,faction:r.faction,amount,subject:d.subject,reason:'献交花石纲原账',key:'ledger:original'});
 const pass=eco.create(r.pass,'document','npc:'+d.recipient,{material:'paper',discovered:true,ownerId:d.recipient,ledgerPass:true,subject:d.subject,route:d.route,cause:d.cause});
 eco.transfer(pass,'player','granted',[d.recipient]);d.pass=pass.id;
 s.intelligence??={people:{},clues:{}};s.intelligence.people[d.recipient]=true;s.people[d.recipient].metPlayer=true;
 s.intelligence.clues.ledger_disposition={source:'当面献账与领书',day:s.day,cause:d.cause,text:`副账已献给${who(d.recipient)}，取得${r.pass}。这份功劳记入${r.name}，原账此后的用途尚待追查。`};
 s.quests.genyue??={id:'genyue',title:'赴艮岳',status:'active',source:who(d.recipient)+'的凭书',objective:'携凭书回到收账人处，确认赴艮岳',note:'资格已取得；可暂留临溪。凭书不等于入职，也不能免除已有罪责。'};
 return [`${d.subject==='player'?'':identityName(d.subject)+'的'}${r.name}声望 +${amount}`,'获得：'+r.pass];
}
export function deliverLedger(sim,eco,id,item){
 const s=sim.s,check=ledgerPreview(sim,id,{id:'ch_ledger_commit'},eco,item);if(check.blocked)return {error:check.reason};
 const c=ledgerCase(s),route=ledgerRoute(id),r=LEDGER_ROUTES[route],subject=believedIdentity(s,id);
 eco.transfer(item,'npc:'+id,'donated',[id]);
 const deed=addCausalDeed(s,{key:'ledger:delivery',title:'献账给'+r.name,text:who(id)+'收下花石纲原账。'+r.received,target:id,subject,witnesses:[id],valence:'neutral'});
 const d=c.delivery={item:item.id,recipient:id,route,subject,day:s.day,cause:deed.id,rewarded:false};
 item.provenance.history.at(-1).cause=deed.id;s.itemSettlements??={};s.itemSettlements[item.id+':'+id]=true;s.facts.ledgerDelivered=true;
 if(route==='court'){s.facts.ledgerCourtEvidence=true;if(id==='traveler')s.facts.princeEvidence=true;}
 const before=subject==='player'?s.people[id].relation:(appearanceState(s).relations[id+':'+subject]||0);sim.relation(id,6,subject);
 const after=subject==='player'?s.people[id].relation:(appearanceState(s).relations[id+':'+subject]||0),changes=reward(sim,eco,d);
 s.people[id].memories.push('收到了'+identityName(subject)+'交来的花石纲原账，已给赴艮岳凭书。');
 syncLedgerQuest(s);syncGenyue(s);const result={ledger:true,follow:['ledger_depart'],recognized:true,item:item.name,delta:after-before,text:r.received,success:true,roll:null,check,changes:[...changes,`${who(id)}好感 +${after-before}`]};
 sim.emit('sandbox',{text:r.received,dialogue:[],ai:false});sim.save();return result;
}
export function resolveLedger(sim,eco,id,action,{deferSpeech=false,confirmedText=null}={}){
 const s=sim.s,a=ledgerOptions(s,id).find(a=>a.id===action);if(!a)return {error:'原账或这次约定已不在，重新看看眼前的情况。'};
 const check=ledgerPreview(sim,id,a,eco);if(check.blocked)return {error:check.reason};
 const c=ledgerCase(s),r=LEDGER_ROUTES[ledgerRoute(id)];let text='',changes=[],follow=[];
 if(action==='ch_ledger_offer'&&confirmedText!==null&&confirmedText!==r.offer)return {error:'眼前的约定已变，请重新问清。'};
 if(action==='ch_ledger_offer'&&deferSpeech)return {type:'npc',presentation:'dialogue',actionId:action,label:a.label,kind:'listen',motion:'talk',roll:null,check,success:true,text:r.offer,changes:[],dialogue:[{id,text:r.offer}],follow:['ledger_commit','ledger_decline'],authored:true,pendingSpeech:true};
 if(action==='ch_ledger_offer'){c.offers[id]={item:heldLedger(s).id,subject:believedIdentity(s,id)};text=r.offer;follow=['ledger_commit','ledger_decline'];}
 if(action==='ch_ledger_decline'){delete c.offers[id];text='也好。原账还在你手里，想定了再来。';}
 if(action==='ch_ledger_commit'){const result=deliverLedger(sim,eco,id,heldLedger(s));if(result.error)return result;text=result.text;changes=result.changes;follow=['ledger_depart'];}
 if(action==='ch_ledger_claim'){changes=reward(sim,eco,c.delivery);text=r.received;follow=['ledger_depart'];}
 if(action==='ch_ledger_depart'){c.departed=true;s.facts.genyueRoute=c.delivery.route==='court'?(id==='traveler'?'royal':'court'):c.delivery.route;s.facts.demoComplete=true;
  s.chapter??={done:{},fame:{gate:0,town:0},titles:[],heard:{}};s.chapter.ending={title:r.title,text:r.ending};text='凭书收好了，赴艮岳的门路已经替你留定。此去要办的事，也别忘了。';
  s.quests.genyue.status='complete';s.quests.genyue.objective='已确认赴艮岳资格';s.quests.genyue.note=r.ending;}
 const result={type:'npc',presentation:'dialogue',day:s.day,eventId:'ledger:'+action,actionId:action,label:a.label,kind:'listen',motion:'talk',roll:null,check,success:true,text,changes,dialogue:[{id,text}],authored:true,follow,causalRecorded:true};
 if(action==='ch_ledger_depart')addCausalDeed(s,{key:'ledger:departure',title:r.title,text:r.ending,target:id,subject:c.delivery.subject,cause:c.delivery.cause});
 s.history.push(result);syncLedgerQuest(s);syncGenyue(s);sim.emit('result',result);if(action==='ch_ledger_depart')sim.emit('chapterComplete',{route:s.facts.genyueRoute});sim.save();return result;
}
