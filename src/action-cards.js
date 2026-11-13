import {guidanceCandidates,pickVisit,rememberVisit,visitMemory,commitGuidance} from './action-card-dialogue.js';
import {aidBoundary} from './npc-concerns.js';
import {PEOPLE} from './data.js';
import {believedIdentity} from './appearance.js';
import {deckState,chronicle,stageOf} from './event-deck.js';
import {visibleBetween} from './npc-awareness.js';
import {hasFixedPost} from './npc-posts.js';
import {clockText} from './world-clock.js';

// Action cards share the deck and causal ledger, but settle only at physical contact.
export const ACTION_TEMPLATES=Object.freeze({
 food:{card:'aid',title:'送来吃食',duration:1.6},
 heal:{card:'aid',title:'上前救治',duration:4},
 guide:{card:'route',title:'上前提点',duration:0},
 revenge:{card:'echo',title:'结伴寻仇',duration:0}
});
const name=id=>PEOPLE.find(p=>p.id===id)?.name||'故人';
const point=q=>({x:q.x,z:q.z});
const distance=(a,b)=>a&&b?Math.hypot(a.x-b.x,a.z-b.z):Infinity;
const clear=(s,a,b,obstacles)=>!!a&&!!b&&visibleBetween(a,b,obstacles,s.ecosystem?.objects);
const hostile=n=>n?.awareness?.caseOpen||['fight','warn','flee','search','investigate'].includes(n?.awareness?.state);
const relation=(s,id,subject)=>subject==='player'?(s.people[id]?.relation||0):(s.appearance?.relations?.[id+':'+subject]||0);
const faction=(s,id)=>s.people[id]?.faction||PEOPLE.find(p=>p.id===id)?.faction;
export function actionCardState(s){const a=deckState(s).actions??={};a.used??={};a.attempts??={};a.active??=null;a.lastDay??=0;a.nextAt??=0;a.visits??={};
 if(!a.food){const prior=deckState(s).cards.filter(c=>c.actionTemplate==='food');a.food={handled:prior.length>0,lastDay:prior.length?Math.max(...prior.map(c=>c.day)):null};}
 // Unfinished automatic presentations from earlier v2 saves now await consent.
 const e=a.active;if(e&&!e.interactionVersion){e.interactionVersion=1;if(!e.settled&&['announce','listen','act'].includes(e.phase)){e.phase='waiting';e.elapsed=0;e.age=0;}}
 return a;}
export function actionParticipant(s,id){const e=s.deck?.actions?.active;return !!e&&e.members.includes(id);}
export function rescueDebt(s,id,subject=believedIdentity(s,id)){const n=s.people[id];return n?.rescueDebts?n.rescueDebts.filter(d=>!d.paid&&d.subject===subject).length+(subject==='player'?n.rescueDebtLegacy||0:0):(subject==='player'?n?.favorOwed||0:0);}
const contactPoint=e=>({x:e.lastSeen.x+(e.contactOffset?.x??1.1),z:e.lastSeen.z+(e.contactOffset?.z??.3)});
function fit(s,id){const n=s.people[id];return !!n&&n.hp>0&&!n.restraint&&!n.inCustody&&!n.drowning&&!n.burning&&!(n.stunnedUntil>(s.npcClock||0))&&!(n.sickUntil>(s.ecosystem?.time||0))&&!['sleep','doze','escape'].includes(n.life?.activity);}
function free(s,id,reserved){const n=s.people[id];return fit(s,id)&&!n.concern&&!hostile(n)&&!n.fear&&!(n.muteUntil>(s.npcClock||0))&&!reserved?.has(id)&&!hasFixedPost(s,id)&&id!==s.watch?.holder&&id!==s.watch?.incoming&&!['escort','qinghe-journey'].includes(n.life?.activity)&&!['collect','serve','relieve'].includes(n.life?.activity)&&!s.factionDiscipline?.reports?.some(r=>r.npc===id&&r.status==='pending');}
function sees(s,id,positions,obstacles,radius=12){const q=positions[id],p=s.player,n=s.people[id],d=distance(q,p);return d<=radius&&clear(s,q,p,obstacles)&&(d<.2||((p.x-q.x)*Math.sin(n.facing||0)+(p.z-q.z)*Math.cos(n.facing||0))/d>=.25);}
function combatNearby(s,positions){return !!s.complaint||Object.entries(s.people).some(([id,n])=>hostile(n)&&distance(positions[id],s.player)<12);}
function foodFor(s,id){return s.ecosystem?.items.find(i=>i.location==='npc:'+id&&i.type==='food'&&!i.drink&&i.hp>0&&i.discovered&&!i.knownPoisonBy?.includes(id));}
function medicineFor(s,id){return s.ecosystem?.items.find(i=>i.location==='npc:'+id&&['bandage','medicine'].includes(i.type)&&!i.storyId&&i.hp>0);}
function grudgeFor(s,id){const subject=believedIdentity(s,id);if(relation(s,id,subject)>-15)return null;
 return [...(s.chronicle?.deeds||[])].reverse().find(d=>d.valence==='crime'&&(d.witnesses?.includes(id)||d.target===id&&d.subject)&&
  (d.identities?.[id]||d.subject||'player')===subject&&!s.deck?.actions?.used['revenge:'+id+':'+d.id+':'+subject]);
}
// This read is also the preview: it never rolls, transfers, or creates a card.
export function actionCandidates(s,positions,obstacles=[],reserved=new Set()){
 if(s.chapterVersion!==2||s.player.hp<=0||s.player.bedRest||s.event?.gate?.phase==='prison'||combatNearby(s,positions))return [];
 const out=[],a=actionCardState(s),foodReady=!a.food.handled&&(a.food.lastDay==null||s.day-a.food.lastDay>=3);
 for(const id of Object.keys(positions)){
  if(!free(s,id,reserved)||!sees(s,id,positions,obstacles))continue;
  const subject=believedIdentity(s,id),r=relation(s,id,subject),aidAllowed=!aidBoundary(s,id,subject,positions,obstacles);
  if(aidAllowed&&id==='tea'&&s.player.hp<40&&r>-15&&medicineFor(s,id)&&!Object.entries(positions).some(([other,pos])=>other!==id&&s.people[other]?.hp<s.player.hp&&distance(pos,positions[id])<8&&clear(s,pos,positions[id],obstacles)))out.push({template:'heal',who:id,subject,item:medicineFor(s,id).id});
  if(foodReady&&aidAllowed&&s.player.satiety<=20&&r>=0&&(r>=8||['tea_host','old_constable','tea','inn'].includes(id))&&foodFor(s,id))out.push({template:'food',who:id,subject,item:foodFor(s,id).id});
  if(aidAllowed&&r>=0&&(s.people[id].metPlayer||visitMemory(s,{who:id,subject})?.count)&&guidanceCandidates(s,id).length)out.push({template:'guide',who:id,subject});
  const cause=grudgeFor(s,id),group=faction(s,id);
  if(!cause||!['青竹会','赤砂帮'].includes(group))continue;
  const allies=Object.keys(positions).filter(other=>other!==id&&free(s,other,reserved)&&faction(s,other)===group&&relation(s,other,subject)<15&&distance(positions[id],positions[other])<16&&clear(s,positions[id],positions[other],obstacles)).slice(0,2);
  if(allies.length)out.push({template:'revenge',who:id,subject,cause:cause.id,causeTitle:cause.title,causeText:cause.text,allies,key:'revenge:'+id+':'+cause.id+':'+subject});
 }
 return out.sort((a,b)=>['heal','food','revenge','guide'].indexOf(a.template)-['heal','food','revenge','guide'].indexOf(b.template)||distance(positions[a.who],s.player)-distance(positions[b.who],s.player));
}
function deed(s,e,title,text,extra={}){const c=chronicle(s),d={id:++c.seq,day:s.day,clock:clockText(s),at:s.day*1000+s.time,title,text,target:e.who,subject:e.subject,cause:e.cause,valence:'deed',witnesses:[e.who],...extra};c.deeds.push(d);c.deeds=c.deeds.slice(-80);return d;}
function remember(s,id,text){const n=s.people[id];n.memories??=[];n.memories.push(text);n.memories=n.memories.slice(-12);}
function phase(sim,e,value){e.phase=value;e.elapsed=0;sim.save();}
function report(sim,e,text){const record=deed(sim.s,e,ACTION_TEMPLATES[e.template].title,text),card=deckState(sim.s).cards.find(c=>c.id===e.cardId);if(card){card.deed=record.id;if(e.template!=='guide'||card.event==='action:guide')card.lead=text;}sim.emit('sandbox',{text,dialogue:[],ai:false});}
function leave(sim,e,reason){if(e.phase==='depart')return;e.outcome??=reason;e.departed=[];
 if(!e.settled)report(sim,e,e.template==='guide'?name(e.who)+(reason==='declined'?'收住了话头，告辞离开。':'的来访中断，尚未谈完。'):e.withdrawal?name(e.who)+(e.withdrawal.reason==='known-harm'?'因先前'+(e.withdrawal.kind==='tamper'?'动过'+name(e.withdrawal.target)+'的吃喝':'对'+name(e.withdrawal.target)+'动手')+'的事，收回了援助。':'顾着'+name(e.withdrawal.target)+'的安危，停下了对你的援助。'):reason==='declined'?'你婉拒了'+name(e.who)+'的'+(e.template==='food'?'吃食':'救治')+'，对方收好东西离开。':name(e.who)+'的来访中断，'+(e.template==='revenge'?'同行者散去。':'未交付物品或完成救治。'));
 const card=deckState(sim.s).cards.find(c=>c.id===e.cardId);if(card)card.outcome=e.outcome;phase(sim,e,'depart');}
function sameIdentity(s,e){return believedIdentity(s,e.who)===e.subject;}
export function startActionCard(sim,candidate,positions,obstacles=[],reserved=new Set()){
 const s=sim.s,a=actionCardState(s);if(a.active||a.lastDay===s.day)return null;
 const c=actionCandidates(s,positions,obstacles,reserved).find(c=>c.template===candidate.template&&c.who===candidate.who&&c.item===candidate.item&&c.cause===candidate.cause);if(!c)return null;
 const d=deckState(s),def=ACTION_TEMPLATES[c.template],e={...c,interactionVersion:1,members:[c.who,...(c.allies||[])],recruited:[],phase:c.template==='revenge'?'recruit':'approach',elapsed:0,age:0,cardId:++d.seq,origins:{},lastSeen:point(s.player),seenAt:s.npcClock||0,damage:0};
 for(const id of e.members)e.origins[id]=point(positions[id]);
 if(e.template==='guide'){const pick=pickVisit(s,e);e.topic=pick.topic?.id;e.cause=deed(s,e,'再度相逢',name(e.who)+'见到你，想说一件尚未谈过的事。',{cause:null}).id;e.causeTitle='当面提点';}
 if(!e.cause)e.cause=deed(s,e,e.template==='heal'?'看见重伤':'看见饥饿',name(e.who)+(e.template==='heal'?'见你伤重，取出随身伤药。':'见你饿得发虚，拿出随身吃食。'),{cause:null,hp:s.player.hp,satiety:s.player.satiety}).id;
 e.causeTitle??=e.template==='heal'?'亲眼见你伤重':'亲眼见你饿得发虚';
 a.active=e;a.lastDay=s.day;if(e.template==='food'){a.food.handled=true;a.food.lastDay=s.day;}if(e.key)a.used[e.key]=true;
 d.cards.push({id:e.cardId,day:s.day,at:s.day*1000+s.time,clock:clockText(s),card:def.card,title:def.title,stage:stageOf(s),speaker:e.who,subject:e.subject,event:'action:'+e.template,actionTemplate:e.template,cause:e.cause,urgent:true,ai:false,line:'',lead:e.causeTitle});d.cards=d.cards.slice(-60);
 sim.save();return e;
}
export function actionLine(s,e,beat){
 if(e.template==='revenge'){const cause=e.causeTitle==='被人看见'?e.causeText:e.causeTitle;return beat==='recruit'?'那回'+cause+'的事，我咽不下这口气。随我去讨个说法。':beat==='done'?'这笔旧账，今日到此为止。':'那回'+cause+'的事，我可记着。今日带了同伴来，咱们当面算账！';}
 if(beat==='cancel')return '你既要走，我便不拦着。';
 if(beat==='start'){const pick=pickVisit(s,e,e.dialogueChoice);return e.opening||pick.opening?.line||'';}
 if(e.template==='guide')return '话就说到这儿，你自己拿主意。';
 if(e.template==='food')return beat==='done'?'吃的收好了，我先忙去了。':'瞧你饿得发虚。这份'+(s.ecosystem.items.find(i=>i.id===e.item)?.name||'干粮')+'给你，先垫垫肚子。';
 return beat==='done'?(e.healed<=8?'先替你简单包扎。前头欠的药钱，得记着还。':'包扎好了，药钱先欠着。下回帮我研一碗伤药。'):(s.people[e.who].rescueDebts?.some(d=>d.subject===e.subject)?'又见你伤成这样。别动，我替你看看。':'你伤得不轻。先别动，我替你包扎。');
}
// One read-only predicate serves the world marker, interaction entry and response validation.
export function pendingActionCard(s,id,positions,obstacles=[]){const e=s.deck?.actions?.active;
 if(!e||e.who!==id||e.phase!=='waiting'||e.settled||s.player.hp<=0||s.player.bedRest||s.complaint||s.event?.gate?.phase==='prison'||!fit(s,id)||s.people[id].muteUntil>(s.npcClock||0)||!sameIdentity(s,e)||e.members.some(k=>!fit(s,k)||hostile(s.people[k]))||combatNearby(s,positions))return null;
 if(e.template!=='revenge'&&aidBoundary(s,id,e.subject,positions,obstacles))return null;
 return distance(positions[id],s.player)<=3.3&&clear(s,positions[id],s.player,obstacles)?e:null;
}
function aidAvailable(s,e){if(e.template==='guide')return guidanceCandidates(s,e.who).some(t=>t.id===e.topic);const i=s.ecosystem?.items.find(i=>i.id===e.item);
 return !!i&&i.location==='npc:'+e.who&&i.hp>0&&(e.template==='food'?s.player.satiety<=20&&!i.knownPoisonBy?.includes(e.who):s.player.hp<40);
}
export function actionCardChoices(s,id,cardId,positions,obstacles=[]){const e=pendingActionCard(s,id,positions,obstacles);if(!e||e.cardId!==cardId||e.template==='guide')return [];
 const choice=(id,label,extra={})=>({action:{id,label},preview:{certain:true,...extra}});
 return [choice('action_card_accept',e.template==='revenge'?'那就领教。':e.template==='food'?'多谢，我收下了。':'有劳你替我包扎。',e.template!=='revenge'&&!aidAvailable(s,e)?{blocked:true,reason:'眼下已无需救急，或对方手中的东西已不在了。'}:{}),
  ...(e.template==='revenge'?[]:[choice('action_card_decline',e.template==='food'?'心意领了，吃的你留着吧。':'多谢好意，我自己处理。')]),choice('action_card_later','暂不回应。')];
}
function beginAction(sim,e){e.contact=point(sim.s.player);phase(sim,e,e.template==='revenge'?'combat':'act');
 if(e.template==='revenge'){e.settled=true;report(sim,e,name(e.who)+'为「'+e.causeTitle+'」召来'+e.recruited.map(name).join('、')+'，当面动手。');sim.save();}
}
export function answerActionCard(sim,id,cardId,answer,positions,obstacles=[]){const s=sim.s,e=pendingActionCard(s,id,positions,obstacles),entry=actionCardChoices(s,id,cardId,positions,obstacles).find(c=>c.action.id===answer);
 if(!e||!entry||entry.preview.blocked)return {error:'眼前情形已经变了，先看看对方。'};
 if(answer==='action_card_later')return {deferred:true};
 if(answer==='action_card_decline'){leave(sim,e,'declined');return {dialogue:[{id:'player',text:entry.action.label},{id,text:'好，那你多保重。'}]};}
 e.accepted=true;e.age=0;s.people[id].metPlayer=true;
 const card=deckState(s).cards.find(c=>c.id===cardId);if(card)card.line=actionLine(s,e,'start');
 if(distance(positions[id],s.player)>1.8){e.lastSeen=point(s.player);e.seenAt=s.npcClock||0;phase(sim,e,'approach');}else beginAction(sim,e);
 return {dialogue:[{id:'player',text:entry.action.label}]};
}
export function openActionVisit(sim,e){
 const context=JSON.stringify([e.template==='guide'?'direct-guide-v2':null,stageOf(sim.s),!!sim.s.facts.enteredCity,sim.s.player.z<21,e.template==='guide'?guidanceCandidates(sim.s,e.who).map(t=>t.id):[]]);
 if(e.dialogueLocked&&e.openingContext===context)return actionLine(sim.s,e,'start');
 const pick=pickVisit(sim.s,e,e.dialogueChoice);e.opening=pick.opening?.line;e.topic=pick.topic?.id;e.dialogueAI=pick.ai;e.dialogueLocked=true;e.openingContext=context;sim.save();return actionLine(sim.s,e,'start');
}
export function heardActionVisit(sim,e,line){
 rememberVisit(sim.s,e,line);const card=deckState(sim.s).cards.find(c=>c.id===e.cardId);if(card){card.line=line;card.ai=!!e.dialogueAI;}sim.save();
}
export function beginActionGuidance(sim,id,cardId,positions,obstacles=[]){
 const e=pendingActionCard(sim.s,id,positions,obstacles);if(!e||e.cardId!==cardId||e.template!=='guide')return null;
 const line=openActionVisit(sim,e),topic=guidanceCandidates(sim.s,id).find(t=>t.id===e.topic);
 if(!topic||!line){leave(sim,e,'conditions-changed');return null;}
 e.telling=true;e.tellToken=(e.tellToken||0)+1;sim.save();
 return {token:e.tellToken,dialogue:[{id,text:line,verbatim:true},...(topic.thought?[{id:'player',text:topic.thought}]:[])]};
}
export function finishActionGuidance(sim,id,cardId,positions,obstacles=[],cancelled=false,token){
 const e=sim.s.deck?.actions?.active;if(!e||e.cardId!==cardId||e.who!==id||!e.telling||token!==e.tellToken)return null;e.telling=false;
 if(cancelled||!pendingActionCard(sim.s,id,positions,obstacles)){sim.save();return null;}
 const card=commitGuidance(sim,e);if(!card){sim.save();return null;}heardActionVisit(sim,e,e.opening);e.settled=true;report(sim,e,name(id)+'当面提起「'+card.title+'」。');leave(sim,e,'completed');return card;
}
function settleAid(sim,eco,e,positions,obstacles){const s=sim.s,p=s.player,item=eco.s.items.find(i=>i.id===e.item);
 if(e.settled||aidBoundary(s,e.who,e.subject,positions,obstacles)||!fit(s,e.who)||!sameIdentity(s,e)||distance(positions[e.who],p)>2.1||!clear(s,positions[e.who],p,obstacles)||!item||item.location!=='npc:'+e.who||item.hp<=0)return false;
 if(e.template==='food'&&(p.satiety>20||item.knownPoisonBy?.includes(e.who))||e.template==='heal'&&p.hp>=40)return false;
 e.settled=true;const n=s.people[e.who];n.metPlayer=true;
 let text;
 if(e.template==='food'){eco.transfer(item,'player','gift',[e.who]);item.discovered=true;item.provenance.history.at(-1).cause=e.cause;text=name(e.who)+'因见你饥饿，递来'+item.name+'；吃食已收入行囊。';}
 else {eco.transfer(item,'consumed','treatment',[e.who]);item.provenance.history.at(-1).cause=e.cause;e.healed=Math.min(100-p.hp,rescueDebt(s,e.who,e.subject)>=2?8:30);p.hp+=e.healed;n.rescues=(n.rescues||0)+1;n.rescueDebtLegacy??=n.rescueDebts?0:n.favorOwed||0;n.favorOwed=(n.favorOwed||0)+1;n.rescueDebts??=[];n.rescueDebts.push({cause:e.cause,card:e.cardId,subject:e.subject,paid:false});text=name(e.who)+'见你重伤，耗用一份伤药包扎，气血 +'+e.healed+'；欠下一份伤药，可帮她研药偿还。';}
 remember(s,e.who,text);report(sim,e,text);phase(sim,e,'thanks');return true;
}
export function actionCardStep(sim,eco,dt,positions,{obstacles=[],reserved=new Set(),say=()=>false,blocked=false,armed=false,hit=()=>0,contactOffset={x:1.1,z:.3}}={}){
 const s=sim.s;if(s.chapterVersion!==2)return;const a=actionCardState(s),now=s.npcClock||0;
 if(s.player.satiety>=45&&a.food.handled){a.food.handled=false;sim.save();}
 if(blocked)return;
 let e=a.active;
 if(!e){if(now<a.nextAt||a.lastDay===s.day||armed)return;a.nextAt=now+2;
  const candidates=actionCandidates(s,positions,obstacles,reserved),c=candidates[0];if(!c)return;
  if(c.template==='revenge'){const key=c.key+':'+s.day;if(a.attempts[key])return;const roll=sim.rng();a.attempts[key]={roll,chance:.35};sim.save();if(roll>=.35)return;}
  const begun=startActionCard(sim,c,positions,obstacles,reserved);if(begun){begun.contactOffset=contactOffset;sim.save();}return;
 }
 e.elapsed+=dt;if(e.phase!=='waiting')e.age+=dt;
 for(const id of e.members)if(positions[id])Object.assign(s.people[id],point(positions[id]));
 if(e.phase==='depart'){
  if(e.members.every(id=>!fit(s,id)||e.departed.includes(id))||e.elapsed>20){a.active=null;a.nextAt=now+20;sim.save();}return;
 }
 if(!e.settled&&e.template!=='revenge'){const boundary=aidBoundary(s,e.who,e.subject,positions,obstacles);if(boundary){e.withdrawal=boundary;leave(sim,e,boundary.reason);return;}}
 if(!fit(s,e.who)||!positions[e.who]||s.player.hp<=0||s.player.bedRest||!sameIdentity(s,e)||e.phase!=='waiting'&&e.age>75||s.complaint||s.event?.gate?.phase==='prison'){
  leave(sim,e,'interrupted');return;
 }
 if(e.template!=='revenge'&&(armed||combatNearby(s,positions)||hostile(s.people[e.who])||s.people[e.who].fear)){leave(sim,e,'danger');return;}
 if(e.template==='revenge'&&e.phase!=='combat'&&e.members.some(id=>!fit(s,id)||s.people[id].concern||hostile(s.people[id]))){leave(sim,e,'interrupted');return;}
 const q=positions[e.who],p=s.player,visible=sees(s,e.who,positions,obstacles,14);
 if(visible){e.lastSeen=point(p);e.seenAt=now;}
 if(e.phase==='recruit'){
  const other=e.allies.find(id=>!e.recruited.includes(id));if(!other){phase(sim,e,'approach');return;}
  if(distance(q,positions[other])<2.3&&clear(s,q,positions[other],obstacles)){
   e.recruited.push(other);remember(s,other,name(e.who)+'当面说起「'+e.causeTitle+'」，邀我同行。');
   // The ally learns only the leader's account, never the player's hidden identity.
   s.people[other].actionGrudges??=[];s.people[other].actionGrudges.push({cause:e.cause,subject:e.subject,source:e.who,kind:'told'});
   if(distance(q,p)<8)say({id:e.who,text:actionLine(s,e,'recruit')});sim.save();
  }return;
 }
 if(e.phase==='approach'){
  if(now-e.seenAt>8||distance(q,e.lastSeen)>18){leave(sim,e,'lost');return;}
  if(distance(q,p)<=1.8&&(e.template==='revenge'||distance(q,contactPoint(e))<.45)&&clear(s,q,p,obstacles)){if(e.accepted)beginAction(sim,e);else phase(sim,e,'waiting');}return;
 }
 if(e.phase==='waiting'){if(distance(q,p)>18)leave(sim,e,'walked-away');return;}
 if(['act','thanks'].includes(e.phase)&&e.template!=='revenge'){
  if(distance(q,p)>2.5||!clear(s,q,p,obstacles)||distance(p,e.contact||p)>1.2){say({id:e.who,text:actionLine(s,e,'cancel')});leave(sim,e,'walked-away');return;}
 }
 if(e.phase==='act'&&e.elapsed>=ACTION_TEMPLATES[e.template].duration){if(!settleAid(sim,eco,e,positions,obstacles))leave(sim,e,'conditions-changed');return;}
 if(e.phase==='thanks'){const line=actionLine(s,e,'done');if(say({id:e.who,text:line})){e.speechTime=Math.max(4.2,line.length*.14)+.7;phase(sim,e,'farewell');}return;}
 if(e.phase==='farewell'&&e.elapsed>=e.speechTime){leave(sim,e,'completed');return;}
 if(e.phase==='combat'){
  if(s.player.hp<=20||e.elapsed>18||now-e.seenAt>7){say({id:e.who,text:actionLine(s,e,'done')});leave(sim,e,'finished');return;}
  e.hits??={};for(const id of [e.who,...e.recruited]){if(!fit(s,id)||!positions[id]||believedIdentity(s,id)!==e.subject)continue;
   if(distance(positions[id],p)<1.8&&clear(s,positions[id],p,obstacles)&&now>=(e.hits[id]||0)){e.hits[id]=now+1.5;e.damage+=hit(id)||0;sim.save();if(p.hp<=20)break;}
  }
 }
}
// Real path targets. Once sight is lost, only the last observed position is pursued.
export function actionTarget(s,id,positions){const e=s.deck?.actions?.active;if(!e||!e.members.includes(id))return null;
 if(e.phase==='depart')return {point:e.origins[id],stop:.4};
 if(e.phase==='recruit')return id===e.who?{point:positions[e.allies.find(k=>!e.recruited.includes(k))]||positions[id],stop:1.8}:e.recruited.includes(id)?{point:positions[e.who],stop:2.4}:{point:positions[id],stop:.4};
 if(e.phase==='approach'&&e.template!=='revenge')return {point:contactPoint(e),stop:.22};
 if(['approach','combat'].includes(e.phase))return {point:id===e.who||e.phase==='combat'?e.lastSeen:positions[e.who],stop:e.phase==='combat'?1.3:id===e.who?1.6:2.5};
 return {point:positions[id],stop:.4};
}
