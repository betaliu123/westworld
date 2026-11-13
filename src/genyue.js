import {factionRep} from './reputation.js';
import {believedIdentity,appearanceState,disguisePreview} from './appearance.js';
import {factionStanding} from './faction-discipline.js';
import {wantedProfile} from './wanted-records.js';
import {visibleBetween} from './npc-awareness.js';
import {npcName} from './npc-names.js';
import {addCausalDeed} from './item-meaning.js';

export const GENYUE_REPUTATION=50,GENYUE_FARE=1000;
const original=s=>s.ecosystem?.items.find(i=>i.type==='ledger'&&i.location==='player'&&i.hp>0);
const knownSource=(s,id)=>npcName(s,id);
const book=s=>{s.genyue??={offers:{},passes:{}};s.genyue.offers??={};s.genyue.passes??={};return s.genyue;};
const rep=(s,faction,id)=>{const subject=believedIdentity(s,id);return subject==='player'?factionRep(s,faction):appearanceState(s).reputations[subject]?.factions?.[faction]||0;};
const choice=(key,label,extra={})=>({id:'ch_gy_'+key,label,mode:'contact',kind:'listen',presentation:'dialogue',story:true,...extra});
export function courtRouteBlock(s,id='inspector'){
 const subject=believedIdentity(s,id);
 return wantedProfile(s,id)||subject==='player'&&s.wanted>0?'案子尚未了结，不能出荐书。':'';
}
export function genyueRequirements(s,route){
 const id=route==='court'?'inspector':'gang_boss',subject=believedIdentity(s,id),faction=route==='court'?'court':'gang';
 const referral=subject==='player'&&(s.facts.career==='court'||s.facts.courtTokenPresented||s.facts.constableReferral||s.people.thief?.custodyDelivered)||s.ecosystem?.items.some(i=>i.location==='player'&&i.hp>0&&i.referral==='court'&&(i.subject||'player')===subject);
 const contribution=subject==='player'&&(s.facts.convoyPeace||s.facts.yanReleased||s.facts.career==='gang');
 const standing=factionStanding(s,faction,subject);
 const blocked=['restricted','expelled'].includes(standing.status)?'门内委任已被暂停。':route==='court'?courtRouteBlock(s,id):'';
 return {id,subject,reputation:rep(s,faction,id),referral:!!referral,contribution:!!contribution,blocked};
}
// Only a completed conversation or an existing physical receipt reveals an offer.
export function syncGenyue(s){
 if(s.chapterVersion!==2||!s.facts.enteredCity)return;
 const b=book(s),d=s.chapter?.done||{};
 for(const [id,heard]of [['traveler',s.facts.royalLedgerOfferKnown||s.facts.princeCommission],['fu',d.fu_ledger_offer],['inspector',d.genyue_court_offer],['gang_boss',d.genyue_gang_offer]]){
  if(heard){b.offers[id]??={source:id,day:s.day};b.offers[id][['inspector','gang_boss'].includes(id)?'regular':'ledger']=true;}
 }
 for(const id of Object.keys(s.ledgerCase?.offers||{})){b.offers[id]??={source:id,day:s.day};b.offers[id].ledger=true;}
 for(const pass of Object.values(b.passes)){b.offers[pass.recipient]??={source:pass.recipient,day:pass.day};b.offers[pass.recipient].regular=true;}
 const delivery=s.ledgerCase?.delivery;
 if(delivery){b.offers[delivery.recipient]??={source:delivery.recipient,day:delivery.day};b.offers[delivery.recipient].ledger=true;}
 s.quests??={};const fresh=!s.quests.genyue,q=s.quests.genyue??={id:'genyue',day:s.day};
 q.title='赴艮岳';q.kind='main';q.source='临溪寻路';q.status=s.facts.demoComplete?'complete':'active';
 const passes=Object.values(b.passes),issued=delivery?.rewarded||passes.length>0;
 if(s.facts.demoComplete){q.objective='赴艮岳的门路已定';q.note=s.chapter?.ending?.text||'这一卷到此，可暂留临溪。';}
 else if(issued){
  const valid=[...(delivery?.rewarded?[{...delivery,id:delivery.pass}]:[]),...passes.map(p=>({...p,id:p.item}))].find(p=>s.ecosystem?.items.some(i=>i.id===p.id&&i.hp>0&&i.location==='player'));
  q.objective=valid?'携凭据向引路人确认启程':'取回赴艮岳凭据';q.note=valid?'可暂留临溪。':'名额仍在，须取回原凭据。';
 }else if(b.focus==='ledger'&&!delivery){q.objective=original(s)?'原账在手，选择托付之人':s.facts.taxLedgerLead||s.facts.prisonerOriginalKnown?'向县狱旧账房追查副账':'打听花石纲副账的下落';q.note='原账只交一方；也可另寻门路。';}
 else {q.objective='在临溪打听赴艮岳的门路';q.note='';}
 if(fresh&&s.trackedQuest!==null&&(s.trackedQuest===undefined||!s.quests[s.trackedQuest]||s.quests[s.trackedQuest].status!=='active'))s.trackedQuest='genyue';
 if(s.quests.royal&&delivery){s.quests.royal.status=delivery.route==='court'?'complete':'closed';s.quests.royal.objective=delivery.route==='court'?'原账已交查案一方':'原账另有所托，这条献账门路已关闭';}
 if(!s.facts.demoComplete&&['ledger','royal'].includes(s.trackedQuest)&&s.quests[s.trackedQuest]?.status!=='active')s.trackedQuest='genyue';
}
export function genyueRoutes(s){
 if(s.chapterVersion!==2||!s.facts.enteredCity)return [];
 const offers=s.genyue?.offers||{},d=s.ledgerCase?.delivery,rows=[],leads=s.deck?.leads||[];
 for(const [id,event,title,route]of [['inspector','court_hiring','六扇门荐举','court'],['gang_boss','gang_den','赤砂帮运石队','gang']]){
  const rumor=leads.find(l=>l.event===event),known=offers[id]?.regular;if(!known&&!rumor)continue;
  const r=genyueRequirements(s,route);let detail='赴苑的事，可当面打听。';
  if(known)detail=route==='court'?`声望 ${r.reputation}/${GENYUE_REPUTATION} · ${r.referral?'已有引荐':'待引荐'}${r.blocked?' · '+r.blocked:''}`:`船资 ${s.player.money}/${GENYUE_FARE} 文；或声望 ${r.reputation}/${GENYUE_REPUTATION}、${r.contribution?'已有帮中人情':'一份帮中人情'}`;
  if(s.genyue?.passes?.[route])detail='名额已定，携凭据确认启程';
  rows.push({id,title,detail,source:knownSource(s,known?id:rumor.source),rumor:!known});
 }
 for(const [id,o]of Object.entries(offers)){
  if(!o.ledger)continue;
  const route=['traveler','inspector'].includes(id)?'court':id==='fu'?'yingfeng':id==='qing'?'qingzhu':'gang',closed=!!d&&d.route!==route;
  const title={traveler:'锦衣客的托付',inspector:'六扇门查账',fu:'花鸟使的买卖',qing:'青竹会核账',gang_boss:'赤砂帮核工',chi:'赤砂帮核工'}[id];
  const detail=closed?'原账另有所托':d?'凭书已得':original(s)?'原账在手，尚未交付':'寻找花石纲副账';
  rows.push({id,title,detail,closed,source:knownSource(s,id),ledger:true});
 }
 return rows;
}
export function genyueOptions(s,id){
 if(s.chapterVersion!==2||!s.facts.enteredCity||s.facts.demoComplete)return [];
 const b=s.genyue,delivery=s.ledgerCase?.delivery,list=[];
 if(['traveler','fu'].includes(id)&&b?.offers?.[id]&&!delivery&&!original(s))list.push(choice('seek','我去打听副账的下落'));
 const route=id==='inspector'?'court':id==='gang_boss'?'gang':null;
 if(!route)return list;
 const pass=b?.passes?.[route];
 if(pass)return [choice('depart_'+route,'携凭据，确认赴艮岳')];
 // Asking is not a key: already qualified people can request a recommendation directly.
 if(route==='court'&&(b?.offers?.[id]?.regular||genyueRequirements(s,route).reputation>=GENYUE_REPUTATION))list.push(choice('claim_court','请开赴艮岳荐书'));
 if(route==='gang'&&(b?.offers?.[id]?.regular||genyueRequirements(s,route).reputation>=GENYUE_REPUTATION)){
  list.push(choice('favor_gang','凭帮中人情，求一个名额'));
  if(b?.offers?.[id]?.regular)list.push(choice('buy_gang',`付 ${GENYUE_FARE} 文，买运石队名额`));
 }
 return list;
}
export function genyuePreview(sim,id,a,eco){
 const s=sim.s,n=s.people[id],p=s.player,now=s.npcClock||0,route=id==='inspector'?'court':'gang',r=genyueRequirements(s,route),q=eco?.positions?.[id]||(Number.isFinite(n?.x)?n:null);
 let reason=!n||n.hp<=0||n.restraint||n.inCustody||n.drowning||n.stunnedUntil>now||n.muteUntil>now||['sleep','doze'].includes(n.life?.activity)?'对方眼下无法应答。':p.hp<=0?'先养好伤。':n.awareness?.caseOpen||['fight','flee','warn'].includes(n.awareness?.state)?'先处理眼前的冲突。':'';
 if(!reason&&eco&&(!q||Math.hypot(q.x-p.x,q.z-p.z)>3.3||!visibleBetween(p,q,eco.obstacles||[],s.ecosystem?.objects)))reason='走到对方面前再谈。';
 const recognition=!reason&&disguisePreview(s,id,{context:{positions:eco?.positions||{},obstacles:eco?.obstacles||[],player:p}});
 if(recognition?.certain&&recognition.chance===0)reason='先把冒名的事说清。';
 if(!reason&&a.id!=='ch_gy_seek'){
  const subject=believedIdentity(s,id),relation=subject==='player'?n.relation:appearanceState(s).relations[id+':'+subject]||0;
  reason=r.blocked|| (relation< -15?'对方不愿为你安排。':'');
  if(a.id.startsWith('ch_gy_depart_')){const pass=s.genyue?.passes?.[route];if(!pass||pass.subject!==subject)reason='名额记在另一身份下。';else if(!s.ecosystem?.items.some(i=>i.id===pass.item&&i.hp>0&&i.location==='player'))reason='须携带原凭据。';}
  else if(s.genyue?.passes?.[route])reason='名额已经给过，不能重复领取。';
  else if(a.id==='ch_gy_buy_gang'){if(p.money<GENYUE_FARE)reason=`船资还差 ${GENYUE_FARE-p.money} 文。`;}
  else if(r.reputation<GENYUE_REPUTATION)reason=`${route==='court'?'六扇门':'赤砂帮'}声望 ${r.reputation}/${GENYUE_REPUTATION}。`;
  else if(route==='court'&&!r.referral)reason='还需引荐信物，或实际交案的功劳。';
  else if(route==='gang'&&!r.contribution)reason='还需一份帮中人情：脚夫工钱或燕七引荐。';
 }
 return {certain:true,chance:reason?0:100,blocked:!!reason,reason,score:0};
}
export function resolveGenyue(sim,eco,id,action){
 syncGenyue(sim.s);const s=sim.s,a=genyueOptions(s,id).find(a=>a.id===action);if(!a)return {error:'这条门路眼下办不成。'};
 const check=genyuePreview(sim,id,a,eco);if(check.blocked)return {error:check.reason};
 const b=book(s),route=id==='inspector'?'court':'gang';let text,changes=[],follow=[];
 if(action==='ch_gy_seek'){b.focus='ledger';s.trackedQuest='genyue';text=id==='fu'?'找到原账就拿来见我。账若给了旁人，这场买卖便不作数。':'原账找到后拿来给我。交到谁手上，你想清楚再定。';}
 else if(action.startsWith('ch_gy_depart_')){
  s.facts.demoComplete=true;s.facts.genyueRoute=route;b.passes[route].departed=true;
  s.chapter.ending={title:route==='court'?'奉荐赴苑':'随工赴苑',text:route==='court'?'顾钦差已为你开出荐书，赴艮岳的差事有了着落。':'赤砂堂已在运石名册中留下你的名额，赴艮岳的门路定下了。'};
  text=s.chapter.ending.text;
 }else{
  const subject=believedIdentity(s,id),name=route==='court'?'六扇门赴苑荐书':'赤砂帮运石队通行票';
  if(action==='ch_gy_buy_gang'){s.player.money-=GENYUE_FARE;npcPurse(s,id,GENYUE_FARE);changes.push('盘缠 −'+GENYUE_FARE+' 文');}
  const item=eco.create(name,'document','npc:'+id,{material:'paper',ownerId:id,discovered:true,subject,genyuePass:true,route});eco.transfer(item,'player','granted',[id]);
  b.passes[route]={item:item.id,recipient:id,subject,day:s.day,paid:action==='ch_gy_buy_gang'};
  changes.push('获得：'+name);text=route==='court'?'荐书给你。凭你的功劳与引荐，我荐你赴艮岳当差。':'名额给你留定，票收好。随的是运石队，官面上的案子还得你自己了结。';follow=['gy_depart_'+route];
 }
 syncGenyue(s);const result={type:'npc',presentation:'dialogue',day:s.day,actionId:action,eventId:'genyue:'+action,label:a.label,kind:'listen',motion:'talk',roll:null,check,success:true,text,changes,dialogue:[{id,text}],follow,authored:true,causalRecorded:true};
 addCausalDeed(s,{key:'genyue:'+action+':'+id,title:a.label,text,target:id,subject:believedIdentity(s,id)});s.history.push(result);sim.emit('result',result);if(s.facts.demoComplete)sim.emit('chapterComplete',{route});sim.save();return result;
}
function npcPurse(s,id,amount){s.people[id].purse=(s.people[id].purse||0)+amount;}
