import {identityRelationship} from './identity-network.js';
import {currentFace,believedIdentity,appearanceState,appearanceTime,disguisePreview,checkDisguise,disguiseObserverBlock,identityName,changeRelation,needsDisguiseCheck} from './appearance.js';
import {visibleBetween} from './npc-awareness.js';
import {addCausalDeed} from './item-meaning.js';
import {placePayment} from './cash-transfers.js';
import {learn,meet} from './factions.js';

export const COURT_CHEST='court-supply-chest';
export const identityAccounts=s=>s.identityAccounts??={recognitions:{},receipts:{},grants:{}};
export const identityConversationActive=(s,id)=>s.chapterVersion===2&&!!identityRelationship(currentFace(s),id)&&believedIdentity(s,id)===currentFace(s);
const pair=(s,id)=>currentFace(s)+':'+id;
const stamp=(s,id,kind)=>pair(s,id)+':'+kind;
const context=eco=>({positions:eco.positions,obstacles:eco.obstacles||[],player:eco.sim.s.player});
const receipt=(s,id,kind)=>identityAccounts(s).receipts[stamp(s,id,kind)];
const manifest=(eco,location)=>eco.items(location).find(i=>i.storyId==='convoy-list'&&i.hp>0);
const moneyLimit=(face,id)=>['traveler','inspector'].includes(face)?80:face==='gate_guard'?6:face==='gate_merchant'?10:12;
function paymentLine(face,id,amount){
 if(id==='inspector')return `王爷，${amount} 文放在案边，请收好。顾某以私钱垫付，记作王府借支；这笔之外，眼下再无余款。`;
 if(id==='fu')return face==='traveler'?`王爷，这是小的随身 ${amount} 文，给您放在这里。还请记着是符祥垫的，小的也得留个账。`:`顾大人，随身押运钱 ${amount} 文，都放在这里了。数目请当面点清，免得回头短了账。`;
 if(id==='traveler')return `这 ${amount} 文先拿去周转。${face==='fu'?'符管事，经手的钱与名册都要说得清。':'顾大人，钱有去处，案也该有下文。'}我记着这笔借支。`;
 if(id==='tea_host')return `赵掌柜，${amount} 文放这儿了。这是买米炭的本钱，回头记得还，我可再挪不出第二笔。`;
 if(id==='gate_relief')return `韩校尉，我只凑得 ${amount} 文，先给您放这里。是我自己的钱，回头还请还我。`;
 return `赵掌柜，${amount} 文在这里。同行互相周转可以，这笔先记清，不能一借再借。`;
}

export function recognizedIdentity(s,id){const r=identityAccounts(s).recognitions[pair(s,id)];return !!r&&r.serial===s.player.face?.serial&&believedIdentity(s,id)===currentFace(s);}
// Call only after the actual recognition line was heard in full, or an explicit
// reply was resolved. Cancelled speech never reveals a hidden identity.
export function confirmIdentityRecognition(sim,id){
 const s=sim.s,face=currentFace(s),edge=identityRelationship(face,id);
 if(!edge||face==='player'||believedIdentity(s,id)!==face||disguiseObserverBlock(s,id))return;
 const accepted=appearanceState(s).checks[id];if(!accepted||accepted.serial!==s.player.face?.serial)return;
 const a=identityAccounts(s);a.recognitions[pair(s,id)]={serial:s.player.face.serial,at:appearanceTime(s)};meet(sim,id);
 if(edge.royal){
  const source=identityName(id)+'当面称谓与谈话';s.facts.princeRoyal=true;
  // Gu and Fu's greeting names the rank, but not the alias; do not invent it.
  if(id==='traveler'&&face==='inspector')s.facts.princeAlias=true;
  s.facts.royalRecognitionEvidence??={source,day:s.day,observer:id,subject:face};meet(sim,'traveler');
 }
 sim.save();
}
export function finishIdentityDialogue(sim,id,result){
 if(result.identityRecognition)confirmIdentityRecognition(sim,id);
 const info=result.identityClue,s=sim.s;
 if(!info||result.clueHeard||!result.success||currentFace(s)!==info.face||s.player.face?.serial!==info.serial||believedIdentity(s,id)!==info.face)return;
 result.clueHeard=true;
 if(info.kind==='ledger'){
  const ledger=s.ecosystem?.items.find(i=>i.type==='ledger'&&i.hp>0);s.facts.taxLedgerLead=true;s.quests??={};
  s.quests.ledger??={id:'ledger',title:'花石纲副账',status:s.facts.ledgerDelivered?'complete':'active',source:identityName(id)+'当面口述',objective:s.facts.ledgerDelivered?'副账已递交核验':ledger?.location==='player'?'携带已有副账，交给锦衣客或顾钦差核验':'向旧账房追查副账实物',note:ledger?.location==='player'?'实物在行囊，尚需核验。':'口述是线索，不能代替账本。'};
 }
 const first=!s.intelligence?.clues?.[info.clue];learn(sim,info.clue,identityName(id)+'将你认作'+identityName(info.face)+'时的口述');
 if(first)s.intelligence.clues[info.clue].text=result.text;
 remember(sim,id,info.kind,identityName(id)+'向所认定的'+identityName(info.face)+'谈及线索：'+result.text);sim.save();
}

export function identityOpportunityOptions(sim,id){
 const s=sim.s,face=currentFace(s),edge=identityRelationship(face,id);
 if(s.chapterVersion!==2||!edge||believedIdentity(s,id)!==face)return [];
 const options=[],add=(kind,label,extra={})=>options.push({id:'if_identity_'+kind,label,mode:'contact',kind:'listen',story:true,stat:'charm',...extra});
 if(!recognizedIdentity(s,id)){add('greet','让对方认清面貌，接着说下去');return options;}
 for(const kind of edge.offers){
  if(receipt(s,id,kind)&&!(kind==='stores'&&identityAccounts(s).grants[COURT_CHEST]?.serial!==s.player.face?.serial))continue;
  const amount=Math.min(moneyLimit(face,id),Math.max(0,Math.floor(s.people[id]?.purse||0)));
  if(kind==='advance'){
   if(!amount)continue;
   add(kind,face==='traveler'?`先替我备 ${amount} 文盘缠`:face==='inspector'&&id==='fu'?`把 ${amount} 文押运钱交来核账`:`借我 ${amount} 文周转`,{amount});
  }else if(kind==='stores')add(kind,'堂内物资箱，我要取用');
  else if(kind==='manifest'){if(s.ecosystem?.items.some(i=>i.storyId==='convoy-list'&&i.location==='npc:'+id&&i.hp>0))add(kind,'把花石纲名册交给我');}
  else if(kind==='handover'){if(s.ecosystem?.items.some(i=>i.storyId==='convoy-list'&&i.location==='player'&&i.hp>0))add(kind,'把押纲名册交给你查验');}
  else if(kind==='ledger')add(kind,'把副账的下落说清楚');
  else if(kind==='destination')add(kind,'这趟纲运到底替谁办差？');
  else if(kind==='tax')add(kind,'说说关口税课文书的来处');
  else if(kind==='overreach')add(kind,id==='tea_host'?'应奉局办差，先从茶钱里支用':'应奉局要用，堂内公物拨我一些');
 }
 const debt=receipt(s,id,'advance');
 if(debt&&!debt.repayment&&s.player.money>=debt.amount)add('repay',`归还先前的 ${debt.amount} 文`,{amount:debt.amount});
 if(Object.entries(identityAccounts(s).receipts).some(([k,r])=>k.startsWith(pair(s,id)+':')&&!r.reviewed)&&!receipt(s,id,'recall'))add('recall','问起先前经手的钱物');
 return options;
}
export function identityOpportunityPreview(sim,id,a,eco){
 const s=sim.s,n=s.people[id],live=identityOpportunityOptions(sim,id).find(x=>x.id===a?.id);
 let reason=!live?'这件事已办过，或当前身份与物品已改变。':disguiseObserverBlock(s,id);
 if(!reason&&(s.player.hp<=0||n.awareness?.caseOpen||['fight','warn','flee','investigate','search'].includes(n.awareness?.state)||n.sickUntil>(s.ecosystem?.time||0)))reason='先处理眼前的状况。';
 const q=eco?.positions[id];
 if(!reason&&(!q||Math.hypot(s.player.x-q.x,s.player.z-q.z)>3.5||!visibleBetween(s.player,q,eco.obstacles||[],eco.s.objects)))reason='先到对方跟前说话。';
 if(!reason&&live.amount!==a.amount)reason='对方的钱数已变，请重新商量。';
 const preview=!reason?disguisePreview(s,id,{force:true,context:context(eco)}):null;
 if(!reason&&preview?.certain&&preview.chance===0)reason=preview.reason;
 if(reason)return {blocked:true,certain:true,chance:0,reason};
 if(!needsDisguiseCheck(s,id,{force:true,context:context(eco)}))return {certain:true,chance:100,reason:'对方刚核对过身份'};
 return preview;
}
function remember(sim,id,kind,text,extra={}){
 const s=sim.s,subject=currentFace(s),key=stamp(s,id,kind),r={subject,observer:id,serial:s.player.face.serial,at:appearanceTime(s),...extra};
 identityAccounts(s).receipts[key]=r;
 const deed=addCausalDeed(s,{key:'identity:'+key,title:'借身份行事',text,target:id,subject,witnesses:[id]});r.cause=deed.id;
 const n=s.people[id];n.memories??=[];n.memories.push(text);n.memories=n.memories.slice(-12);return r;
}
export function resolveIdentityOpportunity(sim,eco,id,action){
 const s=sim.s,a=identityOpportunityOptions(sim,id).find(x=>x.id===action);if(!a)return {error:'这件事已办过，或身份已经改变。'};
 const check=identityOpportunityPreview(sim,id,a,eco);if(check.blocked)return {error:check.reason};
 const face=currentFace(s),edge=identityRelationship(face,id),kind=action.slice('if_identity_'.length);
 const result=check.certain?{success:true,roll:null,check}:checkDisguise(sim,id,{context:context(eco)});
 if(result.error)return result;
 let text='你的言行对不上。先把这张假面卸了！',changes=[],identityClue=null;
 if(result.success){
  if(kind==='greet')text=edge.greeting;
  else if(kind==='advance'){
   const q=eco.positions[id],pile=placePayment(sim,eco,{payer:id,payee:'player',amount:a.amount,x:q.x+.5,z:q.z+.4,stand:q,reason:identityName(id)+'认作'+identityName(face)+'所付的盘缠'});
   if(!pile)return {error:'对方已拿不出这笔钱。'};
   s.people[id].payingUntil=eco.s.time+1.2;
   text=paymentLine(face,id,a.amount);
   remember(sim,id,kind,identityName(id)+'认作'+identityName(face)+'，将 '+a.amount+' 文放下待其领取。',{amount:a.amount,itemId:pile.id});
  }else if(kind==='stores'){
   identityAccounts(s).grants[COURT_CHEST]={subject:face,issuer:id,serial:s.player.face.serial,at:appearanceTime(s)};
   text=face==='traveler'?'王爷，堂内右手的物资箱，钱袋、衣物和药都请取用。我记作王府领用；箱中没有的，眼下可调不来。':'顾大人，堂内右手的物资箱由您支配，钱袋、衣物和药都在里面。';
   remember(sim,id,kind,identityName(id)+'准许'+identityName(face)+'领取六扇门物资箱现存物品。');
  }else if(kind==='manifest'||kind==='handover'){
   const item=manifest(eco,kind==='manifest'?'npc:'+id:'player');if(!item)return {error:'名册已不在原处。'};
   eco.transfer(item,kind==='manifest'?'player':'npc:'+id,'identity-handover',[id]);
   text=kind==='manifest'?'名册在此，请收好。这份只记纲运，查税钱还得核副账。':'名册留下，我会逐项核对。收到名册不等于查清了税账，你经手的事仍要问。';
   const r=remember(sim,id,kind,identityName(id)+'认作'+identityName(face)+'，当面'+(kind==='manifest'?'交出':'收到')+'花石纲名册。',{itemId:item.id});item.provenance.history.at(-1).cause=r.cause;
   changes=[(kind==='manifest'?'获得：':'交出：')+item.name];
  }else if(['ledger','tax','destination'].includes(kind)){
   const clue=kind==='destination'?'patron':kind;
   const ledger=eco.s.items.find(i=>i.type==='ledger'&&i.hp>0),heldLedger=ledger?.location==='npc:'+id;
   text=kind==='ledger'?(heldLedger?'副账已经交到我这里，正在核对。账目有无缺口，要对原数再说。':'旧账房经手过税课副账，要追账可问他。我手里没有那本实物，不能凭一句话定案。'):kind==='tax'?'关口催办的税课公文出自东街税课司。文书从那里来，是否有人借机中饱，还要核账。':'花石纲归应奉局朱勔总领。临溪税课向这边输送钱粮，名册只记纲运，要查钱数还得找副账。';
   identityClue={kind,clue,face,serial:s.player.face.serial};
  }else if(kind==='overreach'){
   text=id==='tea_host'?'符管事，茶钱是我的本钱，不是应奉局的钱。这回我说清楚：不借，也不白送。':'符管事，应奉局的名头管不到六扇门公物。账还没查清，倒先来支东西，这件事顾某记下了。';
   const before=appearanceState(s).relations[id+':'+face]||0;changeRelation(sim,id,-2,face);const delta=(appearanceState(s).relations[id+':'+face]||0)-before;
   changes=delta?[identityName(id)+'对符祥的好感 '+delta]:[];
   if(delta)sim.emit('actorDeltas',[{id,label:'对符祥好感',delta}]);
   remember(sim,id,kind,identityName(id)+'拒绝符祥索取钱物，对符祥的好感 '+delta+'。');
  }else if(kind==='repay'){
   const debt=receipt(s,id,'advance'),q=eco.positions[id];
   const pile=placePayment(sim,eco,{payer:'player',payee:id,amount:debt.amount,x:q.x+.5,z:q.z+.4,stand:q,reason:'归还冒名所借盘缠'});
   if(!pile)return {error:'身上已不足这笔钱。'};
   debt.repayment=pile.id;text='先放在这里，待我亲手收好再销账。';remember(sim,id,kind,identityName(face)+'放下 '+debt.amount+' 文，待'+identityName(id)+'实际收取。',{itemId:pile.id});
  }else if(kind==='recall'){
   const debt=receipt(s,id,'advance'),stores=receipt(s,id,'stores'),list=receipt(s,id,'manifest')||receipt(s,id,'handover');
   text=debt?(debt.repayment?eco.s.items.find(i=>i.id===debt.repayment)?.location==='collected'?'还来的钱我已收好，这笔账清了。眼下不再往外支钱。':'还钱得等我亲手收好，这笔账先留着。':`先前 ${debt.amount} 文仍记在您的名下。钱放过一次，可不能再领一回。`):stores?'物资领用记在您的名下。箱中剩下多少就是多少，没有第二份。':list?'那本花石纲名册经谁的手，我记得清楚。名册不是副账，不能拿来结税案。':'先前的话我记着。线索要落在实物上，不能只拿称谓作数。';
   remember(sim,id,kind,identityName(id)+'向'+identityName(face)+'核对先前的钱物与口述。');
  }
 }
 const r={...result,presentation:'dialogue',handledPresentation:true,type:'npc',actionId:action,eventId:'identity:'+face+':'+id+':'+kind,label:a.label,kind:'listen',motion:'talk',changes,text,dialogue:[{id:'player',text:kind==='greet'?'是我。有些事，想当面同你谈。':a.label},{id,text}],authored:true,causalRecorded:true,...(identityClue?{identityClue}:{}),...(kind==='greet'&&result.success?{identityRecognition:id}:{})};
 s.history.push(r);sim.emit('result',r);sim.save();return r;
}

// An order is tied to the accepted face and this application of makeup. It is
// not a permanent faction membership or a permit for every object in town.
export function courtChestAccess(s,eco){
 const face=currentFace(s),grant=identityAccounts(s).grants[COURT_CHEST];
 if(!grant||grant.subject!==face||grant.serial!==s.player.face?.serial||believedIdentity(s,grant.issuer)!==face)return false;
 const blocked=disguisePreview(s,grant.issuer,{context:context(eco)});
 if(blocked?.certain&&blocked.chance===0)return false;
 return true;
}
