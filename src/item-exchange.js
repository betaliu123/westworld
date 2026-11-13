import {PEOPLE} from './data.js';
import {believedIdentity,appearanceState,disguisePreview,disguiseObserverBlock} from './appearance.js';
import {visibleBetween} from './npc-awareness.js';
import {giveItem} from './npc-actions.js';
import {presentReferral} from './faction-career.js';
import {itemMeaning,meaningCheck} from './item-meaning.js';
import {ledgerRoute,ledgerOptions,ledgerPreview,resolveLedger,LEDGER_ROUTES} from './ledger-case.js';
import {chapterResolve} from './chapter.js';
import {identityOpportunityOptions,identityOpportunityPreview,resolveIdentityOpportunity} from './identity-opportunities.js';
import {identityCheck} from './arrival-check.js';
import {admitRoute,visitGate} from './gate-scene.js';
import {observeItem,knownItemLoss,linkItemReports} from './item-observations.js';
import {ITEM_LINES} from './item-response-lines.js';
import {wantedProfile} from './wanted-records.js';
import {requestApprenticeship,BEGGAR_NEWS} from './apprenticeship.js';

export const ITEM_TASKS={ch_ledger_commit:'ledger',ch_return_ring:'ring',ch_list_show:'manifest',g_present:'entry',if_identity_handover:'handover',ap_medicine_give:'medicine'};
export function itemTask(action){return action?.startsWith('ap_news_')?action:ITEM_TASKS[action]||null;}
export const exchangeItem=(eco,key)=>eco.items('player').find(i=>i.hp>0&&(i.id===key||key?.startsWith('story:')&&(i.storyId===key.slice(6)||key==='story:ring'&&i.type==='ring')));
const isManifest=i=>i?.storyId==='convoy-list';
const isRoyal=i=>i?.credential==='royal-badge';
const subjectRelation=(s,id)=>believedIdentity(s,id)==='player'?s.people[id].relation:(s.appearance?.relations?.[id+':'+believedIdentity(s,id)]||0);
export function exchangeAccess(sim,eco,id,{recognition=true}={}){
 const s=sim.s,n=s.people[id],q=eco.positions[id];
 if(s.player.hp<=0||!n||disguiseObserverBlock(s,id))return '对方现在无法看物或接物。';
 if(n.awareness?.caseOpen||['fight','warn','flee'].includes(n.awareness?.state))return '先处理眼前的冲突。';
 if(!q||Math.hypot(s.player.x-q.x,s.player.z-q.z)>3.3)return '走近对方再递物。';
 if(!visibleBetween(s.player,q,eco.obstacles||[],eco.s.objects))return '中间有遮挡，无法递物。';
 const check=recognition&&disguisePreview(s,id,{context:{positions:eco.positions,obstacles:eco.obstacles||[],player:s.player}});
 if(check?.certain&&check.chance===0)return '对方认出了冒名，先把身份说清。';
 return '';
}
function matches(item,task){return !task||(task.startsWith('ap_news_')?item?.type==='food':({medicine:item?.storyId==='du-medicine',ledger:item?.type==='ledger',ring:item?.type==='ring',manifest:isManifest(item),handover:isManifest(item),entry:item?.documentId==='merchant-pass'||isRoyal(item)})[task]);}
function gateRecipient(s,id){return ['gate_guard','gate_relief'].includes(id)&&id===(s.watch?.holder||'gate_guard');}
function royalReason(sim,eco,id,item){
 const s=sim.s;if(!gateRecipient(s,id))return '此刻不是我值关，你得找当值的人验牌。';
 if(knownItemLoss(s,id,item))return ITEM_LINES.royal_lost;
 if(s.facts.enteredCity)return '';
 if(s.event?.type!=='gate'||Math.hypot(s.player.x,s.player.z-24)>5)return '须到关前验牌，才能登记放行。';
 const owner=eco.positions.traveler;
 if(owner&&!disguiseObserverBlock(s,'traveler')&&Math.hypot(owner.x-s.player.x,owner.z-s.player.z)<5&&visibleBetween(owner,s.player,eco.obstacles||[],eco.s.objects)&&item.provenance?.history.some(h=>h.method==='stolen'))return ITEM_LINES.royal_owner;
 if(wantedProfile(s,id))return '先把眼前的案由说清，腰牌不能抵罪。';
 return '';
}
export function exchangePreview(sim,eco,id,key,mode='show',{task=null,answer=null}={}){
 const item=exchangeItem(eco,key),reason=exchangeAccess(sim,eco,id)||(!item?'这件东西已经不在行囊里。':'');
 if(reason)return {certain:true,chance:0,blocked:true,reason};
 if(mode==='show'&&isRoyal(item)&&['gate_guard','gate_relief'].includes(id)){const reason=royalReason(sim,eco,id,item);return {certain:true,chance:reason?0:100,blocked:false,reason};}
 if(mode==='show'&&item.documentId==='merchant-pass'&&gateRecipient(sim.s,id)&&!sim.s.facts.enteredCity)return identityCheck(sim.s);
 if(mode==='gift'&&answer==='found'&&itemMeaning(sim.s,id,item)?.kind==='return')return meaningCheck(sim.s,item,answer);
 if(mode==='gift'&&isManifest(item)&&id==='traveler'){
  const a=identityOpportunityOptions(sim,id).find(a=>a.id==='if_identity_handover');
  if(a)return identityOpportunityPreview(sim,id,a,eco);
 }
 return {certain:true,chance:100,blocked:false,reason:'',mismatch:!matches(item,task)};
}
function feedback(sim,eco,id,item,mode,text,extra={}){
 const o=observeItem(sim,id,item,mode);linkItemReports(sim,eco.positions,eco.obstacles||[]);
 const result={item:item.name,text,success:!extra.rejected,roll:null,changes:[],observation:o.cause,...extra};sim.save();return result;
}
const values={food:2,clothing:5,hat:3,personal:5,book:6,instrument:8,flute:8,cargo:8};
const tradable=i=>!!i&&i.hp>0&&values[i.type]&&!i.storyId&&!i.credential&&!i.badge&&!i.referral&&!i.ledgerPass&&!i.paymentId;
const value=i=>Math.max(1,Math.floor((values[i.type]||1)*Math.min(1,i.hp/(i.max||30))));
export function tradeQuote(sim,eco,id,key,{task=null}={}){
 const item=exchangeItem(eco,key),error=exchangeAccess(sim,eco,id)||(!item?'这件东西已经不在行囊里。':'');if(error)return {error};
 const meaning=itemMeaning(sim.s,id,item);if(meaning?.kind==='return')return {offers:[],text:meaning.line,recognized:true};
 if(item.type==='ledger'&&ledgerRoute(id)){
  const route=LEDGER_ROUTES[ledgerRoute(id)],check=ledgerPreview(sim,id,{id:'ch_ledger_commit'},eco,item);
  return {recipient:id,key:item.id,subject:believedIdentity(sim.s,id),offers:check.blocked?[]:[{id:'ledger-route',ledger:true,label:route.pass}],text:check.blocked?check.reason:route.offer};
 }
 if(id==='beggar'&&item.type==='food'){
  const offers=BEGGAR_NEWS.filter(n=>!sim.s.facts['beggarNews:'+n.id]&&(!task||task==='ap_news_'+n.id)).slice(0,3).map(n=>({id:'ap_news_'+n.id,news:true,label:n.label.replace('拿一份干粮，问','关于')+'的消息'}));
  return {recipient:id,key:item.id,subject:believedIdentity(sim.s,id),offers,text:offers.length?'一份吃食，换一条消息。你想问哪处？':ITEM_LINES.trade_refuse};
 }
 if(!tradable(item)||subjectRelation(sim.s,id)<-15)return {text:ITEM_LINES.trade_refuse,offers:[]};
 const price=value(item),offers=[];
 if((sim.s.people[id].purse||0)>=price)offers.push({id:'coins',price,label:price+' 文'});
 const swaps=eco.items('npc:'+id).filter(i=>tradable(i)&&!['wornOutfit','hat','flute','cape'].some(k=>sim.s.people[id][k]===i.id)&&i.name!==item.name&&value(i)<=price).slice(0,2);
 for(const i of swaps)offers.push({id:i.id,item:i.id,label:i.name});
 return {recipient:id,key:item.id,subject:believedIdentity(sim.s,id),offers,text:offers.length?'这件我用得上，你看这样换可好？':ITEM_LINES.trade_refuse};
}
export function exchange(sim,eco,id,key,mode,{task=null,answer=null,quote=null,offer=null,staged=false}={}){
 const check=exchangePreview(sim,eco,id,key,mode,{task,answer});if(check.blocked)return {error:check.reason};
 const item=exchangeItem(eco,key),s=sim.s;
 if(!['show','gift','trade'].includes(mode))return {error:'请选择出示、赠送或交易。'};
 if(!matches(item,task))return feedback(sim,eco,id,item,mode,ITEM_LINES.wrong_item,{rejected:true,reaction:'wrong',task});
 if(mode==='trade'){
  const live=tradeQuote(sim,eco,id,key,{task});
  if(!offer)return feedback(sim,eco,id,item,mode,live.text,{quote:live,rejected:!live.offers.length,recognized:live.recognized,reaction:live.offers.length||live.recognized?null:'trade_refuse'});
  const selected=live.offers?.find(o=>o.id===offer),prior=quote?.offers?.find(o=>o.id===offer);
  if(quote?.key!==item.id||quote.recipient!==id||quote.subject!==believedIdentity(s,id)||!selected||!prior||JSON.stringify(selected)!==JSON.stringify(prior))return {error:'钱物或报价已变，请重新议价。'};
  if(selected.news){observeItem(sim,id,item,mode);return requestApprenticeship(sim,eco,id,selected.id,{submittedItem:item.id});}
  if(selected.ledger){observeItem(sim,id,item,mode);return giveItem(sim,eco,id,item.id,'truth',{staged});}
  if(item.lastTrade?.recipient===id&&item.lastTrade.history===item.provenance?.history?.length)return {error:'这件物品已经成交。'};
  const received=selected.item&&eco.items('npc:'+id).find(i=>i.id===selected.item);
  if(selected.item&&!received)return {error:'对方已没有这件物品，请重新议价。'};
  const result=feedback(sim,eco,id,item,mode,selected.price?`钱物点清，${selected.price} 文收好。`:`说定了，用这件${received.name}换。`);
  eco.transfer(item,'npc:'+id,'traded',[id]);item.lastTrade={recipient:id,history:item.provenance.history.length};
  if(received)eco.transfer(received,'player','bartered',[id]);else{s.people[id].purse-=selected.price;s.player.money+=selected.price;}
  item.provenance.history.at(-1).cause=result.observation;result.changes=['交出：'+item.name,received?'获得：'+received.name:'盘缠 +'+selected.price];sim.save();return result;
 }
 if(mode==='show'){
  if(isRoyal(item)&&['gate_guard','gate_relief'].includes(id)){
   const reason=royalReason(sim,eco,id,item);
   const text=reason||(s.facts.enteredCity?'这块腰牌我看过了，持牌人的面貌也记下了。':ITEM_LINES.royal_pass);
   const result=feedback(sim,eco,id,item,mode,text,{rejected:!!reason,...(reason===ITEM_LINES.royal_owner?{dialogue:[{id:'traveler',text:'这块腰牌是我的。我没有交给你。'},{id,text:reason}]}:{})});
   if(!reason&&!s.facts.enteredCity&&gateRecipient(s,id)){admitRoute(sim,'royal-token');sim.save();}
   return result;
  }
  if(item.documentId==='merchant-pass'&&gateRecipient(s,id)&&!s.facts.enteredCity){observeItem(sim,id,item,mode);visitGate(sim,id);return sim.resolve(sim.event.id,'g_present');}
  if(isManifest(item)&&id==='qinghe'){
   observeItem(sim,id,item,mode);if(s.chapter?.done.list_show)return feedback(sim,eco,id,item,mode,ITEM_LINES.manifest_seen,{follow:['qinghe_alternative']});
   return chapterResolve(sim,eco,id,'ch_list_show',{submittedItem:item.id});
  }
  const referral=presentReferral(sim,eco,id,item);if(referral)return feedback(sim,eco,id,item,mode,referral.text,{...referral,follow:['court_join']});
  if(item.type==='ledger'&&ledgerRoute(id)){
   observeItem(sim,id,item,mode);const a=ledgerOptions(s,id).find(a=>a.id==='ch_ledger_offer');
   if(a)return resolveLedger(sim,eco,id,a.id);
   return feedback(sim,eco,id,item,mode,ITEM_LINES.ledger_show,{follow:['ledger_commit','ledger_decline']});
  }
  const meaning=itemMeaning(s,id,item);
  return feedback(sim,eco,id,item,mode,meaning?.kind==='return'?meaning.line:ITEM_LINES.show_unknown,{reaction:meaning?null:'unknown',recognized:!!meaning});
 }
 if(task==='entry')return feedback(sim,eco,id,item,mode,ITEM_LINES.keep_credential,{rejected:true});
 if(item.storyId==='du-medicine'&&id==='old_constable'){
  observeItem(sim,id,item,mode);return requestApprenticeship(sim,eco,id,'ap_medicine_give',{submittedItem:item.id});
 }
 if(task?.startsWith('ap_news_')&&id==='beggar'){
  observeItem(sim,id,item,mode);return requestApprenticeship(sim,eco,id,task,{submittedItem:item.id});
 }
 if(isManifest(item)&&id==='qinghe'){
  const r=exchange(sim,eco,id,key,'show',{task:'manifest'});if(r.error)return r;
  eco.transfer(item,'npc:'+id,'gifted',[id]);sim.save();return {...r,text:ITEM_LINES.manifest_gift,dialogue:[{id,text:ITEM_LINES.manifest_gift}]};
 }
 if(isManifest(item)&&id==='traveler'&&identityOpportunityOptions(sim,id).some(a=>a.id==='if_identity_handover')){
  observeItem(sim,id,item,mode);return resolveIdentityOpportunity(sim,eco,id,'if_identity_handover',{submittedItem:item.id});
 }
 // Keep owned credentials when the recipient only needs to verify them.
 if(item.referral||item.credential)return feedback(sim,eco,id,item,mode,ITEM_LINES.keep_credential,{rejected:true});
 const meaning=itemMeaning(s,id,item);
 if(meaning?.kind==='ledger'){const p=ledgerPreview(sim,id,{id:'ch_ledger_commit'},eco,item);if(p.blocked)return {error:p.reason};}
 if(meaning?.kind==='return'&&!answer)return {needsOrigin:true,itemKey:item.id,line:meaning.line,task};
 const seen=observeItem(sim,id,item,mode);const r=giveItem(sim,eco,id,item.id,answer,{staged});
 if(r.error)return feedback(sim,eco,id,item,mode,r.error,{rejected:true,reaction:'refused'});
 if(item.location==='npc:'+id&&item.provenance?.history?.length)item.provenance.history.at(-1).cause??=seen.cause;sim.save();return {...r,success:true};
}

export function itemReactionContext(sim,id,result){
 if(!result.reaction)return null;
 const s=sim.s,subject=believedIdentity(s,id);
 return {mode:'item_reaction',speaker:{id,name:PEOPLE.find(p=>p.id===id)?.name,title:PEOPLE.find(p=>p.id===id)?.title,relation:subjectRelation(s,id)},
  item:result.item,action:result.reaction,settled:{transferred:false,taskComplete:false,text:result.text},
  // No inventory contents, poison tags, true owner, hidden face or theft history.
  allowed:[{id:'decline',line:result.text},{id:'clarify',line:'这件东西与眼前的事有什么关系？你说说来意。'}],subject};
}
export function acceptItemReaction(context,ai){
 const choice=context?.allowed.find(a=>a.id===ai?.decision);if(!choice)return null;
 const text=ai.line;
 if(typeof text!=='string'||text.length<4||text.length>60||/[A-Za-z0-9<>]|玩家|系统|检定|好感|任务|偷|贼|假扮|原主|有毒|下毒|放行|进去|收下|拿走|送你|给你|赠你|报官|王爷|亲王/.test(text))return {text:choice.line,decision:choice.id};
 return {text:text.trim(),decision:choice.id};
}
